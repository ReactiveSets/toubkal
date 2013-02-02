/*  fork.js

    Copyright (C) 2013, Connected Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
"use strict";

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    
    require( './code.js' );
  } else {
    XS = exports.XS;
  }
  
  var log        = XS.log
    , extend     = XS.extend
    , subclass   = XS.subclass
    , Code       = XS.Code
    , u
  ;
  
  var push = Array.prototype.push
    , slice = Array.prototype.slice
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs pipelet, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Pipelet( options )
     
     A Pipelet has one upstream source and one downstream pipelet.
     
     Parameters:
       options: optional object:
         - key: unique key for values, default is [ 'id' ]
  */
  function Pipelet( options ) {
    this.options = options = options || {};
    
    this.key = options.key || [ 'id' ];
    
    this.source = this.destination = u; // No source or desination yet
    
    return this;
  } // Pipelet()
  
  var p = Pipelet.prototype;
  
  extend( p, {
    /* ------------------------------------------------------------------------
       get()
    
       Returns the current full state of this set, in the form of an Array of
       objects.
       
       This method should only be used for debugging and testing purposes and
       when the full state is known to be 'small' (can fit entirely in memory).
       
       For large sets, use fetch() instead that allows retreive the content by
       smaller increments that all fit in memory. fetch() also allows to use a
       query to filter the set.
       
       default behavior is to get the content of the source, if any, then apply
       transform() on it to return the result.
    */
    get: function() {
      var s = this.source;
      
      return s ? this.transform( s.get() ) : [];
    }, // get()
    
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       Fetches the content of the source set, possibly in chunks.
       
       Parameter:
         receiver: function that will be called for each chunk of data from
           the source.
           
           Each chunk is delivered in a array of objects.
           
           After the last chunk, the receiver is called one last time with an
           empty chunk: [].
    */
    fetch: function( receiver ) {
      var that = this, s = this.source;
      
      if ( s ) {
        s.fetch( function( values ) { receiver( that.transform( values ) ) } );
      } else {
        receiver( [] ); // No source, so this is an empty set
      }
      
      return this;
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       transform( values )
       
       Transforms an array of values into an other array of values according
       to the current pipelet role.
       
       Default is to return all values unaltered. Every pipelet should either
       implement transform() if it is stateless or fetch() if it is statefull
       and/or implement add(), remove(), and update().
       
       Paraemter:
         values: Array of values (javascript objects).
    */
    transform: function( values ) {
      return values;
    }, // transform()
    
    /* ------------------------------------------------------------------------
       notify( transaction, options )
       
       Executes a transaction, eventually atomically (everything succeeds or
       everything fails).
       
       Parameters:
         - transaction: Array of actions. Each action has attributes:
           - action: string 'add', or 'remove', or 'update'
           - objects: Array of objects for 'add' and 'remove' or updates. An update
             is an Array where the first item is the previous object value and the
             second item is the new object value

         - options: optional object of optional attributes
         
       ToDo: JV manage atomic transcations, will rollback capability
    */
    notify: function( transaction, options ) {
      var l = transaction.length;
      
      for ( var i = -1; ++i < l; ) {
        var a = transaction[ i ].action;
        
        switch( a ) {
          case 'add':
          case 'remove':
          case 'update':
            if ( this[ a ] ) break;
          // fall-through
          
          default:
            throw( new Unsuported_Action( a ) );
        }
      }
      
      for ( var i = -1; ++i < l; ) {
        var a = transaction[ i ];
        
        this[ a.action ]( a.objects );
      }
      
      return this;
    }, // notify()
    
    /* ------------------------------------------------------------------------
       add( added )
       
       Add objects to this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly
       by users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_add() of
       transformed objects by transform().
       
       Parameters:
         added: Array of object values to add
    */
    add: function( added ) {
      return this.emit_add( this.transform( added ) );
    }, // add()
    
    /* ------------------------------------------------------------------------
       emit_add( added )
       
       Notify downsteam pipelets about added objects.
       
       This method is typically called by add() after adding objects.
       
       Users should not call this method directly.
       
       Parameters:
         added: Array of added objects
    */
    emit_add: function( added ) {
      var d = this.destination;
      
      de&&ug( 'emit_add(), l: ' + added.length + ', d: ' + typeof d );
      
      d && d.add( added );
      
      return this;
    }, // emit_add()
    
    /* ------------------------------------------------------------------------
       update( updated )
       
       Updates objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_update() of
       transformed objects by transform(). This only works if transform
       always returns as many objects as its source. Otherwise, the
       programmer must also implement update().
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
    */
    update: function( updated ) {
      var previous = [], modified = [], out = [];
      
      for( var i = -1, l = updated.length; ++i < l; ) {
        var u = updated[ i ];
        
        previous.push( u[ 0 ] );
        modified.push( u[ 1 ] );
      }
      
      previous = this.transform( previous );
      modified = this.transform( modified );
      
      for( i = -1; ++i < l; ) {
        out.push( [ previous[ i ], modified[ i ] ] );
      }
      
      return this.emit_update( out );
    }, // update()
    
    /* ------------------------------------------------------------------------
       emit_update( updated )
        
       Notify downsteam pipelets of updated object values.
       
       This method is typically called by update() after updating objects.
       
       Users should not call this method directly.
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
    */
    emit_update: function( updated ) {
      var d = this.destination;
      
      d && d.update( updated );
      
      return this;
    }, // emit_update()
    
    /* ------------------------------------------------------------------------
       remove( removed )
       
       Removes objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_remove() of
       transformed objects by transform().
       
       Parameters:
         removed: Array of object values to remove
    */
    remove: function( removed ) {
      return this.emit_remove( this.transform( removed ) );
    }, // remove()
    
    /* ------------------------------------------------------------------------
       emit_remove( removed )
       
       Notify downsteam pipelets of removed object.
       
       This method is typically called by remove() after removing objects.
       
       Users should not call this method directly.
       
       Parameters:
         - removed: Array of removed object values.
    */
    emit_remove: function( removed ) {
      var d = this.destination;
      
      d && d.remove( removed );
      
      return this;
    }, // emit_remove()
    
    /* ------------------------------------------------------------------------
       clear()
       
       Clears the content of this Pipelet and downstream pipelets.
       
       clear() is usually called when an update requires to clear the state of all
       downstream objects. This is typically done when:
         - when a stream is no longer needed and memory can be reclaimed;
         - all or most values will change and it is more efficient to clear;
         - the state of downstream objects cannot be updated incremetally;
       .
    */
    clear: function(){
      return this.emit_clear();
    }, // clear()
    
    /* ------------------------------------------------------------------------
       emit_clear()
       
       Notify downsteam pipelets that all object values should be cleared.
       
       This method is typically called by clear() for clearing downstream objects.
       
       Users should not call this method directly.
    */
    emit_clear: function() {
      var d = this.destination;
      
      d && d.clear();
      
      return this;
    }, // emit_clear()
    
    /* ------------------------------------------------------------------------
       set_source( source )
       
       Connect and/or disconnect from upstream source pipelet.
       
       The content of the source is then "added" to this pipelet using this.add().
       
       Parameters:
         source (optional): the source pipelet or any other object to connect to.
         
           If source is an not an instance of Pipelet, it's content is only added
           to the current pipelet using this.add(). It is typically an Array but
           could be any other object type that this.add() supports such as a
           function.
           
           If undefined, the current source pipelet is only removed from its source
           if any.
    */
    set_source: function( source ) {
      var s = this.source;
      
      if ( s ) {
        // disconnect from upstream source pipelet
        s._remove_destination && s._remove_destination( this );
        
        this._set_source();
        
        // After disconnection from its source, all downstream pipelets should be cleared
        // New content will be provided if this is attached to a new source
        this.clear();
      }
      
      if ( source && ! source.is_void ) {
        if ( source.fetch ) {
          // ToDo: JV replace source.get() by something like source.fetch( this, query )
          // get() is not scalable to large datasets, because it returns the
          // entire set. get() should only be used on small sets, for testing
          // or on clients.
          //
          // fetch( destination, query ) will solve this issue because it will
          // allow the source to provide its content filtered and in chuncks
          // via add()
          
          // this.add( source.get() );
          
          var that = this;
          
          source.fetch( function( values ) {
            if ( values.length ) {
              that.add( values );
            } else {
              that._set_source( source );
              source._add_destination( that );
            }
          } );
        } else {
          this.add( source );
          this._set_source( source );
        }
      }
      
      return this;
    }, // set_source()
    
    /* ------------------------------------------------------------------------
       _set_source( source )
       
       Sets the source pipelet for this pipelet or remove it if source is
       undefined.
       
       This is a low-level method that should not be used by external objects
       because it does not add a destionation to the source pipelet.
       
       This method can be overloaded by derived classes to:
         - change the implementation of source
         - reject the addition by generating an exception.
         - trigger other actions on addition
       
       Paramters:
         - source: the source pipelet to add or undefined to remove the source. 
    */
    _set_source: function( source ) {
      this.source = source;
      
      return this;
    }, // _set_source()
    
    /* ------------------------------------------------------------------------
       _add_destination( destination )
       
       Adds a destination pipelet to this pipelet.
       
       This is a low-level method that should not be used by external objects
       because it does not add the source of the destination pipelet so
       added.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the addition by generating an exception.
         - trigger other actions on addition
       
       Paramters:
         - destination: the destination pipelet to add 
    */
    _add_destination: function( p ) {
      var d = this.destination;
      
      if ( d ) {
        if ( d instanceof Tee ) {
          d._add_destination( p );
        } else {
          this.destination = new Tee( this, { _implicit: true }, d, p );
        }
      } else {
        this.destination = p;
      }
      
      return this;
    }, // _add_destination()
    
    /* ------------------------------------------------------------------------
       _remove_destination( destination )
       
       Removes a destination pipelet to this pipelet.
       
       This is a low-level method that should not be used by external objects
       because it does not remove the source of the destination pipelet so
       removed.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the removal by generating an exception.
         - trigger other actions on removal
       
       Paramters:
         - destination: the destionation pipelet to remove 
    */
    _remove_destination: function( p ) {
      var u, d = this.destination;
      
      if ( d instanceof Tee ) {
        d._remove_destination( p );
      } else {
        this.destination = u;
      }
      
      return this;
    }, // _remove_destination()
    
    /* ------------------------------------------------------------------------
       Other deprecated methods to modify source and destionation
    */
    // deprecated, use pipelet.set_source() instead
    disconnect: function( p ) {
      if ( p.source !== this ) throw new Error( "This is not the source of pipelet, cannot be disconnected" );
      
      p.set_source();
      
      return this;
    }, // disconnect()
    
    // deprecated, use destination.set_source( this )
    to: function( d ) {
      d.set_source( this );
      
      return this;
    }, // to()
    
    // deprecated, use set_source() instead
    not_from: function( s ) {
      if ( this.source !== s ) throw new Error( "Source is not the source of this pipelet, cannot be disconnected" );
      
      return this.set_source();
    }, // not_from()
    
    /* ------------------------------------------------------------------------
       make_key( object )
       
       Use this.key to generate code JIT to return a unique a string for an
       object based on the key coordinates concatenation separated with '#'.
       
       Parameters:
         object: an object which key is requested.
    */
    make_key: function( o ) {
      var key = this.key, l = key.length, code = [];
      
      for ( var i = -1; ++i < l; ) code.push( 'o.' + key[ i ] );
      
      eval( new Code()
        ._function( 'this.make_key', null, [ 'o' ] )
          .add( "return '' + " + code.join( " + '#' + " ) )
        .end( 'make_key()' )
        .get()
      );
      
      return this.make_key( o );
    } // make_key()
  } ); // Pipelet instance methods
  
  // Deprecated Pipelet Instance Methods Aliases
  p.forks_add    = p.emit_add;
  p.forks_remove = p.emit_remove;
  p.forks_update = p.emit_update;
  
  p.connect      = p.to;         // use destination.set_source( this ) instead
  p.from         = p.set_source; // use set_source( source ) instead
  p.not_to       = p.disconnect; // use set_source() instead
  
  /* --------------------------------------------------------------------------
    The xs object is a void source Pipelet to provide a fluid interface with a
    namespace for other Pipelets.
    
    Example:
      Publish a sales dataset from a 'sales' file:
      
      xs.file( 'sales' ).publish();
      
      The xs objects acts a namespace for XS chainable pipelets. Without the xs
      object, one would have to write the following less fluid code where the
      xs namespace is not explicit and requiring the new operator on a class to
      create the fist pipelet of a chain:
      
      new File( 'sales' ).publish();
  */
  var xs = new Pipelet();
  
  // Prevent becoming a source of any downstream Pipelet, see Pipelet.prototype.set_source()
  xs.is_void = true;
  
  // Pipelet Class methods
  
  /* --------------------------------------------------------------------------
     Pipelet.subclass( name, class, methods )
     
     Generic pipelet class builder. Makes class a subclass of This class and
     defines Pipelet[ name ] using methods.factory. This is just a helper to
     make it easier to implement the usual pattern for data flow node classes.
     
     Usage: -- implementers --
        function Talker( msg ) {
          this.msg = undefined;
          
          msg && this.add( [ { msg: msg } ] );
          
          return this;
        } // Talker()
        
        Pipelet.subclass( "talker", Talker, {
          factory: function( msg ) {
            return new Talker( msg ).set_source( this );
          },
          
          get:    function()    { return this.msg ? [ this.msg ] : []; }
          
          add:    function( d ) { d && d[0] && this.msg = d[0]; return this; }
          update: function( d ) { d && d[0] && this.msg = d[0]; return this; }
          remove: function( d ) { this.msg = null; return this; }
          
          talk: function() {
            log( "a fool talks to it's creator" );
            
            this.source.add( this.get() );
            
            return this;
          }
        })
        
     Usage: -- users --
       var a_fool = obj.talker( "I'm a fool" );
       
       a_fool
         .talk()
         .add( [ { msg: "with memory issues" }, { msg: "big issues") } ] );
         .talk()
       ;
  */
  Pipelet.subclass = function( name, klass, methods ){
    subclass( this, klass );
    
    extend( klass.prototype, methods );
    
    Pipelet[ name ] = {
      class: klass,
      
      subclass: function() {
        return Pipelet.subclass.apply( klass, arguments );
      }
    };
    
    Pipelet.prototype[ name ] = methods.factory;
    
    return klass;
  }; // Pipelet.subclass()
  
  /* -------------------------------------------------------------------------------------------
     Tee( source [, options] [, pipelet [, pipelet [, ...]]] )
     
     Forks a source into many destinations
  */
  function Tee( source, options ) {
    var implicit = Pipelet.call( this, extend( { key: source.key }, options ) ).options._implicit;
    
    this.destinations = [];
    
    for( var i = 1; ++i < arguments.length; ) {
      var p = arguments[ i ];
      
      if ( p && p instanceof Pipelet ) {
        if ( implicit ) {
          this._add_destination( p );
        } else {
          p.set_source( this );
        }
      }
    }
    
    if ( implicit ) {
      this.source = source;
    } else {
      this.set_source( source );
    }
    
    return this;
  } // Tee()
  
  Pipelet.prototype.fork = function( options ) { // This pipelet is named fork(), though the underlying class is currently Tee
    var fork = new Tee( this, options );
    
    for( var i = 0; ++i < arguments.length; ) {
      arguments[ i ].set_source( fork );
    }
    
    return fork.set_source( this );
  } // Pipelet.prototype.fork()
  
  subclass( Pipelet, Tee );
  
  extend( p = Tee.prototype, {
    /* ------------------------------------------------------------------------
       get()
    */
    get: function() {
      var s = this.source;
      
      return s ? s.get() : [];
    }, // get()
    
    /* ------------------------------------------------------------------------
       emit_add( added )
       
       Notify downsteam pipelets about added objects.
       
       Parameters:
         added: Array of added objects
    */
    emit_add: function( added ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].add( added );
      
      return this;
    }, // emit_add()
    
    /* ------------------------------------------------------------------------
       emit_remove( removed )
       
       Notify downsteam pipelets of removed object.
       
       Parameters:
         - removed: Array of removed object values.
    */
    emit_remove: function( removed ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].remove( removed );
      
      return this;
    }, // emit_remove()
    
    /* ------------------------------------------------------------------------
       emit_update( updated )
       
       Notify downsteam pipelets of updated object values.
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
    */
    emit_update: function( updated ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].update( updated );
      
      return this;
    }, // emit_update()
    
    /* ------------------------------------------------------------------------
       emit_clear()
       
       Notify downsteam pipelets that all object values should be cleared.
    */
    emit_clear: function() {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].clear();
      
      return this;
    }, // emit_clear()
    
    _add_destination: function( d ) {
      // JHR: I don't know if you want to do that check that I added, but I had to add it
      // to understand the issue with a false positive on the sentinel end
      // mark in fetch. But maybe there exist cases where adding the same
      // destination twice makes sense...
      if( this.destinations.indexOf( d ) !== -1 ) throw new Error( "invalid, already there" );
      
      this.destinations.push( d );
      
      return this;
    }, // _add_destination()
    
    _remove_destination: function( p ) {
      var d = this.destinations;
      
      if ( ( p = d.indexOf( p ) ) === -1 ) throw new Error( "Tee, _remove_destination(), destination not found in this" );
      
      d.splice( p, 1 );
      
      return this;
    } // _remove_destination()
  } ); // Tee.prototype
  
  /* -------------------------------------------------------------------------------------------
     Set( values [, options] )
     
     Non-ordered set.
     
     Parameters:
       - values: an array of objects to set initial content.
       
       - options: optional object to provide options for Set and parent class Pipelet:
         - name: set name
         - key: unique key for each value, default is [ 'id' ]
  */
  function Set( a, options ) {
    options = Pipelet.call( this, options ).options;
    
    this.a = [];
    
    a && this.add( a )
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
    
    return this;
  } // Set()
  
  /* -------------------------------------------------------------------------------------------
     set( values [, options] )
     
     Statefull pipelet for a Set, can be used as a source, as a cache, or as a stateful base
     class.
  */
  Pipelet.prototype.set = function( a, options ) {
    return new Set( a, extend( { key: this.key }, options ) ).set_source( this );
  } // set()
  
  subclass( Pipelet, Set );
  
  /* -------------------------------------------------------------------------------------------
     Set instance methods
  */
  extend( Set.prototype, {
    /* ------------------------------------------------------------------------
       get()
       
       Returns the content of the set, an array of values as javascript objects
    */
    get: function() {
      return this.a;
    }, // get()
    
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       Fetches set content, possibly in several chunks.
       
       See Pipelet.fetch() receiver documentation.
    */
    fetch: function( receiver ) {
      var a = this.a;
      
      // JHR: Fixed. Was:
      // a && receiver( a );
      a && a.length && receiver( a );
      // Rational: when the array is empty, it looks like the sentinel to
      // end the fetch and as a result when the true sentinel is issued...
      // you get a duplicate.
      // I think that a better solution is either to export a true sentinel
      // object. ie receiver( xs.no_more )
      // BTW: this looks nicer if the callback is called "procude"
      // ie, produce( xs.no_more );
      
      receiver( [] ); // End
      
      return this;
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       clear()
       
       Clears content then notifes downsteam Pipelets.
    */
    clear: function() {
      this.a = [];
      
      return this.emit_clear();
    }, // get()
    
    /* ------------------------------------------------------------------------
       add( values )
       
       Add values to the set then notifies downsteam Pipelets.
    */
    add: function( values ) {
      push.apply( this.a, values );
      
      return this.emit_add( values );
    }, // add()
    
    /* ------------------------------------------------------------------------
       update( updates )
       
       Update set values using updates then notifes downsteam Pipelets.
       
       Parameter:
         updates: Array of updates, an update is an array of two values, the
           first is the previous value, the second is the updated value.
    */
    update: function( updates ) {
      for ( var i = -1, l = updates.length, updated = []; ++i < l; ) {
        var o = updates[ i ]
          , p = this.index_of( o[ 0 ] )
        ;
        
        if ( p === -1 ) continue;
        
        this.a[ p ] = o[ 1 ];
        
        updated.push( o );
      }
      
      return this.emit_update( updated );
    }, // update()
    
    /* ------------------------------------------------------------------------
       remove( values )
       
       Remove values from the set then notify downsteam Pipelets
    */
    remove: function( values ) {
      for ( var i = -1, l = values.length, removed = []; ++i < l; ) {
        var o = values[ i ]
          , p = this.index_of( o )
        ;
        
        if ( p === -1 ) continue;
        
        this.a.splice( p, 1 ); // could be faster on smaller arrays
        
        removed.push( o ); 
      }
      
      return this.emit_remove( removed );
    }, // remove()
    
    /* ------------------------------------------------------------------------
       index_of( value )
       
       Lookup the position of a vaue in the set's array of items.
       
       Generate optimized code using make_index_of() during first call.
       
       Returns:
         The position of the item in the set or -1 if not found.
    */
    index_of: function( v ) {
      return this.make_index_of().index_of( v ); 
    }, // index_of()
    
    /* ------------------------------------------------------------------------
       JIT Code Generator for index_of() from this.key
       
       Generated code is tied to current key. Uses unrolled while for maximum
       performance.
       
       Other possible further optimization:
         - split set array in smaller arrays,
         - create an object for fast access to individual keys, a naive
           implementation would be to use a single object but many benchmarcks
           have proven this technique very slow. A better option would be to
           use a tree possibly with hashed keys
    */
    make_index_of: function() {
      var key = this.key, l = key.length;
      
      var vars = [ 'a = this.a', 'l = a.length', 'i = -1' ];
      
      var first, inner, last;
      
      if ( l > 1 ) {
        vars.push( 'r' );
        
        var tests = [], field;
        
        for( var i = -1; ++i < l; ) {
          field = key[ i ];
          
          tests.push( ( i === 0 ? '( r = a[ ++i ] ).' : 'r.' ) + field + ' === _' + field );
        }
        
        first = 'if ( ' + tests.join( ' && ' ) + ' ) return i;';
      } else {
        field = key[ 0 ];
        
        var test = 'a[ ++i ].' + field + ' === _' + field;
        
        first = 'if ( ' + test;
        inner = '|| ' + test;
        last  = ') return i';
      }
      
      var code = new Code( 'index_of' )
        ._function( 'this.index_of', null, [ 'o' ] )
          ._var( vars )
          .vars_from_object( 'o', key ) // Local variables for key
          .unrolled_while( first, inner, last )
          .add( 'return -1' )
        .end( 'index_of()' )
        .get()
      ;
      
      eval( code );
      
      return this;
    } // make_index_of()
  } ); // Set instance methods
  
  /* -------------------------------------------------------------------------------------------
     PXXX(): template for Pipelet class definition.
  */
  function PXXX( source, options ) {
    Pipelet.call( this, options );
    
    return this;
  } // PXXX()
  
  subclass( Pipelet, PXXX );
  
  /* ------------------------------------------------------------------------
     Template pipelet
  */
  Pipelet.prototype.pxxx = function( options ) {
    return new PXXX( options ).set_source( this );
  }; // Pipelet.prototype.pxxx()
  
  extend( PXXX.prototype, {
    /* ------------------------------------------------------------------------
       add( values )
       
       Called when items were added to the source
    */
    add: function( values ) {
      return this.emit_add( values ); // forward added values
    }, // add()
    
    /* ------------------------------------------------------------------------
       remove( values )
       
       Called when items were removed from the source
    */
    remove: function( values ) {
      return this.emit_remove( values ); // forward removed values
    }, // remove()
    
    /* ------------------------------------------------------------------------
       update( updates )
       
       Called when items were updated inside the source
    */
    update: function( updates ) {
      return this.emit_update( updates ); // forward updated values
    }, // update()
    
    /* ------------------------------------------------------------------------
       clear()
       
       Called when all items should be cleared, when the source set
        was disconnected from its source and new data is expected.
    */
    clear: function() {
      return this.emit_clear(); // forward to downstream pipelets
    } // clear()
  } ); // PXXX instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  var Fork = Pipelet; // deprecated alias
  
  eval( XS.export_code( 'XS', [ 'Pipelet', 'Fork', 'Tee', 'Set', 'xs' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // fork.js
