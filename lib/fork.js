/*  fork.js

      xs.xxx.subclass()
      xs.set()

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
    log( "xs fork, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     Base()
     
     The base class of every XS objects. Mainly provides a .subclass() to
     make subclasses. Each such subclass also provides a .subclass() method.
     
     Base.subclass( name, class, methods )
     
     Generic datalet class builder. Makes class a subclass of This class and
     defines xs[ name ] using methods.factory. This is just a helper to
     make it easier to implement the usual pattern for data flow node classes.
     
     Usage: -- implementers --
        function Count( source, name ) {
          this.count = 0;
          this.name = name || source.name;
          this.set_source( source );
          return this;
        } // class Count
        xs.broadcast.subclass( "count", Count, {
          factory: function( name ) {
            return new Count( this, name )
          },
          delta: function( d ) {
            if( !d ) return
            this.count += d;
            this.connections_add( [ { name: this.name, count: this.count } ] );
            return this;
          },
          add:    function( o ) { return this.delta( ((o & o.length) || 0) );},
          remove: function( o ) { return this.delta(-((o & o.length) || 0) );}
        })
        
     Usage: -- users --
       var a_fool = set.count().trace() // trace number of items in set
  */
  
  var xs = {}; // forward definition. Becomes XS.the_void asap.
  
  function Base(){}
  
  extend( Base.prototype, {
    
    toString:  function() { return "XS/" + this.name; },
    
    subclass:  function( name, klass, methods ){
      subclass( this, klass );
    
      extend( klass.prototype, methods );
    
      Base[ name ] = {
        xsclass: klass,
      
        subclass: function() {
          return Base.subclass.apply( klass, arguments );
        }
      };
    
      Base.prototype[ name ]   = xs[ name ] = methods.factory;
      methods.factory.subclass = klass.subclass = Base[ name ].subclass;
      methods.factory.xsclass  = klass;
    
      return klass;
    } // Base.subclass()
    
  }); // class Base
  Base.subclass = Base.prototype.subclass;
  
  
  /* --------------------------------------------------------------------------
     Fork()
     
     A Fork has one upstream source and is the source of many downstream Forks.
  */
  function Fork( options ) {
    this.options = options = options || {};
    
    this.key = options.key || [ "id" ];
    
    // downstream forks.
    this.forks = [];
    
    this.source = undefined; // No source yet
    
    return this;
  } // Fork()
  
  extend( Fork.prototype, {
    /* ------------------------------------------------------------------------
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
       
       Add objects to this fork then notify downstream forks.
       
       This method should only be called by the source fork.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is typically overloaded by derived classes, the default behavior
       is to only notify downstream forks.
       
       Parameters:
         added: Array of object values to add
    */
    add: function( added ) {
      return this.forks_remove()( added );
    }, // add()
    
    /* ------------------------------------------------------------------------
       forks_add( added )
       
       Notify downsteam forks about added objects.
       
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
    
    /* ------------------------------------------------------------------------
       update( updated )
       
       Updates objects from this fork then notify downstream forks.
       
       This method should only be called by the source fork.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is typically overloaded by derived classes, the default behavior
       is to only notify downstream forks using forks_update().
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
    */
    update: function( updated ) {
      return this.forks_update( updated );
    }, // update()
    
    /* ------------------------------------------------------------------------
       forks_update( updated )
        
       Notify downsteam forks of updated object values.
       
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
    
    /* ------------------------------------------------------------------------
       remove( removed )
       
       Removes objects from this fork then notify downstream forks.
       
       This method should only be called by the source fork.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is typically overloaded by derived classes, the default behavior
       is to only notify downstream forks using forks_remove().
       
       Parameters:
         removed: Array of object values to remove
    */
    remove: function( removed ) {
      return this.forks_remove( removed );
    }, // remove()
    
    /* ------------------------------------------------------------------------
       forks_remove( removed )
       
       Notify downsteam forks of removed object.
       
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
    
    /* ------------------------------------------------------------------------
       clear()
       
       Clears the content of this Fork and downstream forks.
       
       clear() is usually called when an update requires to clear the state of all
       downstream objects. This is typically done when:
         - when a stream is no longer needed and memory can be reclaimed;
         - all or most values will change and it is more efficient to clear;
         - the state of downstream objects cannot be updated incremetally;
       .
    */
    clear: function(){ return this.forks_clear(); },
    
    /* ------------------------------------------------------------------------
       forks_clear()
       
       Notify downsteam forks that all object values should be cleared.
       
       This method is typically called by clear() for clearing downstream objects.
       
       Users should not call this method directly.
    */
    forks_clear: function() {
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].clear();
      
      return this;
    }, // forks_clear()
    
    /* ------------------------------------------------------------------------
       set_source( source )
       
       Connect and/or disconnect from upstream source fork.
       
       The content of the source is then "added" to this fork using this.add().
       
       Parameters:
         source (optional): the source fork or any other object to connect to.
         
           If source is an not an instance of Fork, it's content is only added
           to the current fork using this.add(). It is typically an Array but
           could be any other object type that this.add() supports such as a
           function.
           
           If undefined, the current source fork is only removed from its source
           if any.
    */
    set_source: function( source ) {
      var u, s = this.source;
      
      if ( s ) {
        if ( s instanceof Fork ) {
          // disconnect from upstream source fork
          var forks = s.forks
            , p = forks.indexOf( this )
          ;
          
          if ( p === -1 ) throw new Error( "Fork, set_source(), this not found in this.source" );
          
          forks.splice( p, 1 );
        }
        
        this.source = u;
        
        // After disconnection from its source, all downstream forks should be cleared
        // New content will be provided if this is attached to a new source
        this.clear();
      }
      
      if ( source 
        // ToDo: JHR, not needed: && ! source.is_void
      ) {
        // Remember the source of this Fork
        this.source = source;
        
        // ToDo: JHR, use duck typing? ie if ( source.fetch ) ...
        if ( source instanceof Fork ) {
          // ToDo: JHR, this breaks encapsulation. for example, void has no forks
          // ToDo: pipelet should refuse to have more than one destination
          source.destination = this;
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
        throw new Error( 'A Fork can only have a single source' );
      }
      
      // Remember the source of this downstream Fork
      destination.source = this;
      
      this.destination = destination;
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
    
    // deprecated, use fork.set_source() instead
    disconnect: function( fork ) {
      if ( fork.source !== this ) throw new Error( "This is not the source of fork, cannot be disconnected" );
      
      fork.set_source();
      /*
      var index = this.forks.indexOf( fork );
      if ( index  >= 0 ) {
        this.forks.splice( index, 1 );
        // ToDo: target should be notified that it's source was disconnected
        if( fork.source === this ) { fork.source = null }
      }
      return this;
      */
      return this;
    }, // disconnect()
    
    // deprecated, use destination.set_source( this )
    to: function( destination ) {
      destination.set_source( this );
      
      return this;
    }, // to()
    
    /* This is now an alias of disconnect()
    not_to: function( fork   ) {
      if ( fork.source !== this ) throw new Error( "This is not the source of fork, cannot be disconnected" );
      
      fork.set_source();
      
      return this;
    }, // not_to()
    */
    
    /* This is now an alias of set_source()
    from: function( source ) {
      return this.set_source( source );
    }, // from()
    */
    
    // deprecated, use set_source() instead
    not_from: function( source ) {
      if ( this.source !== source ) throw new Error( "Source is not the source of this fork, cannot be disconnected" );
      
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
  } ); // Fork instance methods
  
  // Deprecated Instance Methods aliases
  Fork.prototype.connect = Fork.prototype.to; // deprecated, use destination.set_source( this ) instead
  Fork.prototype.from    = Fork.prototype.set_source; // deprecated, use set_source( source ) instead
  Fork.prototype.not_to  = Fork.prototype.disconnect; // deprecated, use set_source() instead
  
  Fork.prototype.factory = function(){ return this };
  Fork.prototype.factory.subclass = Base.prototype.subclass;
  Base.subclass( "datalet", Fork, Fork.prototype );
  Base.subclass( "pipelet", Fork, Fork.prototype );
  
  /* --------------------------------------------------------------------------
    XS.xs, aka XS.the_void
    XS.xs is both an empty source and a /dev/null type of sink.
     
    The xs singleton object is a void source used to provide a fluid interface.
    
    Example:
      Publish a sales dataset from a 'sales' file:
      
      xs.file( 'sales' ).publish();
      
      The xs objects acts a namespace for XS chainable pipelets. Without the xs
      object, one would have to write the following less fluid code where the
      xs namespace is not explicit and requiring the new operator on a class to
      create the fist pipelet of a chain:
      
      new File( 'sales' ).publish();
      
      The, on the client side:
      
      var a_subscriber = xs.subscribe( 'sales' );

   */

  var Datalet = Fork;
  
  function The_Void() {
    Datalet.call( this );
    this.is_void = true;
    // All objects have a source, the void included!
    this.source  = this;
    // All objects have connections. But the_void don't track them.
    this.forks       = [];
    this.destination = this;
    return this;
  }
  
  var noop     = function(){};
  var identity = function(){ this.source = null; return this; };
  
  // Make sure that The void, ie xs, implements notify/add/update/... properly.
  xs.datalet.subclass( "end", The_Void, {
    factory:    function(){ return XS.the_void; },
    toString:   function(){ return "void"; },
    get:        noop,
    set_source: identity,
    _to:        noop,
    _from:      noop,
    disconnect: identity,
    notify:     identity,
    add:        identity,
    update:     identity,
    remove:     identity,
    clear:      identity
  });
  
  // A singleton that can be both an inactive source or an inactive destination
  // ToDo: JHR, make XS be the void itself, so that require( "excess" ).xxx()
  // is equivalent to require( "excess" ).xs.xxx()
  XS.the_void = new The_Void();
  extend( XS.the_void, xs);
  xs = XS.the_void;
     
  
/* -------------------------------------------------------------------------------------------
     Set( a [, options] )
  */
  Fork.prototype.set = function( a, options ) {
    // Add a new downsteam Set to This Fork and initialize it with the
    // content, if any, of This Fork.
    
    // ToDo: JHR, should send this instead of null, ctor would figure out
    var s = new Set( a, extend( { key: this.key }, options ) );
    
    // ToDo: JHR, move this to constructor
    s.set_source( this );
    //this.connect( s );
    // ToDo: JHR, ? this.add( s.get() );
    
    return s;
  }; // set()
  
  // ToDo: JHR, fix same issue elsewhere (Ordered_Set, etc), or, better,
  // use xs.datalet.subclass( "set", Set, {methods} )
  XS.set = xs.set = Fork.prototype.set;
  
  function Set( a, options ) {
    // Constructor for a new Set with some initial content
    // ToDo: initial content should be either an array or an existing source
    // JV: if you have an initial source, use: source.set( options )
    
    options = Fork.call( this, options ).options;
    
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
    
    a && this.add( a );
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
    
    return this;
  } // Set()
  
  subclass( Fork, Set );
  
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
      // Add items to the set and notify downsteam Forks.
      push.apply( this.a, objects );
      
      return this.forks_add( objects );
    }, // add()
    
    update: function( objects ) {
      // Update items in the set and notify downsteam Forks.
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
      // Remove items from the set and notify downsteam Forks
      for ( var i = -1, l = objects.length, removed = []; ++i < l; ) {
        var o = objects[ i ]
          , p = this.index_of( o )
          , a = this.a
        ;
        
        // ToDo: JHR, benchmark this optimization, maybe calling a.splice()
        // in all case is actualy fast. Rule of thumb: the less javascript
        // code and the more using builtins, the better.
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
      // to make index_of() even more efficient.
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
        var field = key[ 0 ] // ToDo: JHR, duplicate var for field, already defined
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
  
  /* --------------------------------------------------------------------------
     FXXX(): template for data flow destination.
     It connects to a source, builds an empty .out Set and leaves it up for the
     derived class to decide what to do when an add/update/remove operation
     happens.
  */
  function FXXX( source, options ) {
    // Constructor for a destination that depends on what happens to a source
    
    Fork.call( this, options );
    
    this.out = new Set( [], { key: source.key } );
    
    source.connect( this );
    
    return this;
  } // FXXX()
  
  subclass( Fork, FXXX );
  
  extend( FXXX.prototype, {
    add: function( objects ) {
      // Called when items were added to the source
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      // Called when items were removed from the source
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      // Called when items were update inside the source
      
      return this;
    } // update()
  } ); // FXXX instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  // JHR, ToDo, Datalet base class, Pipelet sub class, not using this hack,
  // but using .subclass() instead.
  XS.Datalet = XS.datalet = xs.Datalet = xs.datalet = Fork;
  XS.Pipelet = XS.pipelet = xs.Pipelet = xs.pipelet = Fork;
  
  eval( XS.export_code( 'XS', [ 'Fork', 'Set', 'xs' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // fork.js
