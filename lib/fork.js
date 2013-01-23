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
  ;
  
  var push = Array.prototype.push;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs pipelet, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Pipelet()
     
     A Pipelet has one upstream source and is the source of many downstream Pipelets.
  */
  function Pipelet( options ) {
    this.options = options = options || {};
    
    this.key = options.key || [ "id" ];
    
    // downstream pipelets.
    this.forks = [];
    
    this.source = undefined; // No source yet
    
    return this;
  } // Pipelet()
  
  extend( Pipelet.prototype, {
    /* -----------------------------------------------------------------------------
       get()
    
       Returns the current full state of the set, in the form of an Array of
       objects.
       
       This method should only be used for debugging and testing purposes and when
       the full state is known to be 'small' (can fit entirely in memory).
       
       For large sets, use fetch() instead that allows retreive the content by
       smaller increments that all fit in memory. fetch() also allows to use a
       query to filter the set.
       
       This method must be defined by subclasses, or an exception will be triggered.
    */
    
    /* -----------------------------------------------------------------------------
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
       ToDo: JHR handle subscriber initiator option
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
    
    /* -----------------------------------------------------------------------------
       add( added )
       
       Add objects to this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method istypically overloaded by derived classes, the default behavior
       is to only notify downstream pipelets.
       
       Parameters:
         added: Array of object values to add
    */
    add: function( added ) {
      return this.forks_remove()( added );
    }, // add()
    
    /* -----------------------------------------------------------------------------
       forks_add( added )
       
       Notify downsteam pipelets about added objects.
       
       This method is typically called by add() after adding objects.
       
       Users should not call this method directly.
       
       Parameters:
         added: Array of added objects
    */
    forks_add: function( added ) {
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].add( added );
      
      return this;
    }, // forks_add()
    
    /* -----------------------------------------------------------------------------
       update( updated )
       
       Updates objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is typically overloaded by derived classes, the default behavior
       is to only notify downstream pipelets using forks_update().
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
    */
    update: function( updated ) {
      return this.forks_update( updated );
    }, // update()
    
    /* -----------------------------------------------------------------------------
       forks_update( updated )
        
       Notify downsteam pipelets of updated object values.
       
       This method is typically called by update() after updating objects.
       
       Users should not call this method directly.
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
    */
    forks_update: function( updated ) {
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].update( updated );
      
      return this;
    }, // forks_update()
    
    /* -----------------------------------------------------------------------------
       remove( removed )
       
       Removes objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is typically overloaded by derived classes, the default behavior
       is to only notify downstream pipelets using forks_remove().
       
       Parameters:
         removed: Array of object values to remove
    */
    remove: function( removed ) {
      return this.forks_remove( removed );
    }, // remove()
    
    /* -----------------------------------------------------------------------------
       forks_remove( removed )
       
       Notify downsteam pipelets of removed object.
       
       This method is typically called by remove() after removing objects.
       
       Users should not call this method directly.
       
       Parameters:
         - removed: Array of removed object values.
    */
    forks_remove: function( removed ) {
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].remove( removed );
      
      return this;
    }, // forks_remove()
    
    /* -----------------------------------------------------------------------------
       clear()
       
       Clears the content of this Pipelet and downstream pipelets.
       
       clear() is usually called when an update requires to clear the state of all
       downstream objects. This is typically done when:
         - when a stream is no longer needed and memory can be reclaimed;
         - all or most values will change and it is more efficient to clear;
         - the state of downstream objects cannot be updated incremetally;
       .
    */
    clear: function(){ return this.forks_clear(); },
    
    /* -----------------------------------------------------------------------------
       forks_clear()
       
       Notify downsteam pipelets that all object values should be cleared.
       
       This method is typically called by clear() for clearing downstream objects.
       
       Users should not call this method directly.
    */
    forks_clear: function() {
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].clear();
      
      return this;
    }, // forks_clear()
    
    /* -----------------------------------------------------------------------------
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
      var u, s = this.source;
      
      if ( s ) {
        if ( s instanceof Pipelet ) {
          // disconnect from upstream source pipelet
          var forks = s.forks
            , p = forks.indexOf( this )
          ;
          
          if ( p === -1 ) throw new Error( "Pipelet, set_source(), this not found in this.source" );
          
          forks.splice( p, 1 );
        }
        
        this.source = u;
        
        // After disconnection from its source, all downstream pipelets should be cleared
        // New content will be provided if this is attached to a new source
        this.clear();
      }
      
      if ( source && ! source.is_void ) {
        // Remember the source of this Pipelet
        this.source = source;
        
        if ( source instanceof Pipelet ) {
          source.forks.push( this );
          
          // ToDo: JV replace source.get() by something like source.fetch( this, query )
          // get() is not scalable to large datasets, because it returns the
          // entire set. get() should only be used on small sets, for testing
          // or on clients.
          //
          // fetch( destination, query ) will solve this issue because it will
          // allow the source to provide its content filtered and in chuncks
          // via add()
          this.add( source.get() );
        } else {
          this.add( source );
        }
      }
      
      return this;
    }, // set_source()
    
    /* this is now an alias of to()
    connect: function( destination ) {
      // Connect a new downstream destination to this source.
      // The content of the source gets added to the downsteam destination.
    
      // ToDo: JHR, the destination should also decide if it is capable of
      // accepting a source. this requires a ._from(), to be called by the
      // source when it connects to the destination.
      // Note: I have implemented a Broadcaster node that accepts multiple
      // sources and multiple destinations.
      
      if ( destination.source ) {
        throw new Error( 'A Pipelet can only have a single source' );
      }
      
      // Remember the source of this downstream Pipelet
      destination.source = this;
      
      this.forks.push( destination );
      
      // ToDo: replace by something like this.fetch( destination, query )
      // get() is not scalable to large datasets, because it returns the
      // entire set. get() should only be used on small sets, for testing
      // or on clients.
      //
      // fetch( destination, query ) will solve this issue because it will
      // allow the source to provide its content filtered and in chuncks
      // via add()
      destination.add( this.get() );
      
      destination.set_source( this );
      
      return this;
    }, // connect()
    */
    
    // deprecated, use pipelet.set_source() instead
    disconnect: function( pipelet ) {
      if ( pipelet.source !== this ) throw new Error( "This is not the source of pipelet, cannot be disconnected" );
      
      pipelet.set_source();
      
      return this;
    }, // disconnect()
    
    // deprecated, use destination.set_source( this )
    to: function( destination ) {
      destination.set_source( this );
      
      return this;
    }, // to()
    
    // deprecated, use set_source() instead
    not_from: function( source ) {
      if ( this.source !== source ) throw new Error( "Source is not the source of this pipelet, cannot be disconnected" );
      
      return this.set_source();
    }, // not_from()
    
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
  
  // Deprecated Instance Methods aliases
  Pipelet.prototype.connect = Pipelet.prototype.to; // deprecated, use destination.set_source( this ) instead
  Pipelet.prototype.from    = Pipelet.prototype.set_source; // deprecated, use set_source( source ) instead
  Pipelet.prototype.not_to  = Pipelet.prototype.disconnect; // deprecated, use set_source() instead
  
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
     Set( a [, options] )
  */
  Pipelet.prototype.set = function( a, options ) {
    // Add a new downsteam Set to This Pipelet and initialize it with the
    // content, if any, of This Pipelet.
    
    // ToDo: JHR, should send this instead of null, ctor would figure out
    var s = new Set( a, extend( { key: this.key }, options ) );
    
    // ToDo: JHR, move this to constructor
    this.connect( s );
    
    return s;
  } // set()
  
  function Set( a, options ) {
    // Constructor for a new Set with some initial content
    // ToDo: initial content should be either an array or an existing source
    // JV: if you have an initial source, use: source.set( options )
    
    options = Pipelet.call( this, options ).options;
    
    // ToDo: JHR, JV: I do not think this is necessary, read above
    //
    // if ( src ) {
    //   if( typeof src === 'array' ){
    //   this.a = []
    //   this.add( src)
    // } else {
    //   src.connect( this )
    // }
    // return this
    
    this.a = [];
    
    a && this.add( a )
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
    
    return this;
  } // Set()
  
  subclass( Pipelet, Set );
  
  /* -------------------------------------------------------------------------------------------
     Set instance methods
  */
  extend( Set.prototype, {
    
    get: function() {
      // Return the content of the set, an array of items. Each item is a list
      // of unique attributes/properties, aka "an object".
      return this.a;
    }, // get()
    
    add: function( objects ) {
      // Add items to the set and notify downsteam Pipelets.
      push.apply( this.a, objects );
      
      return this.forks_add( objects );
    }, // add()
    
    update: function( objects ) {
      // Update items in the set and notify downsteam Pipelets.
      for ( var i = -1, l = objects.length, updated = []; ++i < l; ) {
        var o = objects[ i ]
          , p = this.index_of( o[ 0 ] )
        ;
        
        if ( p === -1 ) continue;
        
        this.a[ p ] = o[ 1 ];
        
        updated.push( o );
      }
      
      return this.forks_update( updated );
    }, // update()
    
    remove: function( objects ) {
      // Remove items from the set and notify downsteam Pipelets
      for ( var i = -1, l = objects.length, removed = []; ++i < l; ) {
        var o = objects[ i ]
          , p = this.index_of( o )
          , a = this.a
        ;
        
        if ( p === 0 ) {
          a.shift();
        } else if ( p === a.length - 1 ) {
          a.pop();
        } else if ( p !== -1 ) {
          a.splice( p, 1 );
        } else {
          continue;
        }
        
        removed.push( o ); 
      }
      
      return this.forks_remove( removed );
    }, // remove()
    
    index_of: function( o ) {
      // Look for the position of an item in the set's array of items.
      // -1 when not found.
      return this.make_index_of().index_of( o ); 
    }, // index_of()
    
    make_index_of: function() {
      // Define index_of() to make it efficient both when comparing items and
      // when iterating over items.
      // ToDo: JHR, when the set grows, it makes sense to redefine it again
      // to make index_of() even more efficient?
      var key = this.key, l = key.length;
      
      var vars = [ 'a = this.a', 'l = a.length', 'i = -1' ];
      
      var first, inner, last;
      
      if ( l > 1 ) {
        vars.push( 'r' );
        
        var tests = [];
        
        for( var i = -1; ++i < l; ) {
          var field = key[ i ];
          
          tests.push( ( i === 0 ? '( r = a[ ++i ] ).' : 'r.' ) + field + ' === _' + field );
        }
        
        first = 'if ( ' + tests.join( ' && ' ) + ' ) return i;';
      } else {
        var field = key[ 0 ]
          , test = 'a[ ++i ].' + field + ' === _' + field
        ;
        
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
     DXXX(): template for data flow destination.
     It connects to a source, builds an empty .out Set and leaves it up for the
     derived class to decide what to do when an add/update/remove operation
     happens.
  */
  function DXXX( source, options ) {
    // Constructor for a destination that depends on what happens to a source
    
    Pipelet.call( this, options );
    
    this.out = new Set( [], { key: source.key } );
    
    source.connect( this );
    
    return this;
  } // DXXX()
  
  subclass( Pipelet, DXXX );
  
  extend( DXXX.prototype, {
    add: function( objects ) {
      // Called when items were added to the source
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      // Called when items were removed from the source
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      // Called when items were updated inside the source
      
      return this;
    }, // update()
    
    clear: function() {
      // Called when all items should be cleared, when the source set
      // was disconnected from its source and new data is expected.
      
      return this;
    } // update()
  } ); // DXXX instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  var Fork = Pipelet; // deprecated alias
  
  eval( XS.export_code( 'XS', [ 'Pipelet', 'Fork', 'Set', 'xs' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // fork.js
