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
    log( "xs fork, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Fork()
     
     A Fork has one upstream source and is the source of many downstream Forks.
  */
  function Fork( options ) {
    this.options = options = options || {};
    
    this.key = options.key || [ "id" ];
    
    // An array of dependent forks. See .connect()
    this.forks = [];
    
    // this.source = undefined // No source yet
    
    return this;
  } // Fork()
  
  var Connection = Fork;
  
  extend( Fork.prototype, {
        
    get: function(){
      // Return the content (an array of items) of This node.
      // Subclasses typically redefines this.
      return [];
    }, // get()
    
    notify: function( transaction, initiator ) {
    // Batch add/update/remove operations
      // ToDo: handle optional subscriber initiator
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
    
    // Add items to this node then notify downsteam forks about
    // the effective additions.
    // Typically redefined by derived classes.
    // Default is to do store nothing and to notify downstream nodes.
    add: function( added ){ return this.forks_remove()( added) },
    
    // Update items of this node, then notify downsteam destinations about
    // the effective updates.
    // Typically redefined by derived classes.
    // Default is to do store nothing and to notify downstream nodes.
    update: function( updated ){ return this.forks_update( updated ) },
    
    // remove: function( removed )
    // Remove items from this node and notify downsteam destinations about
    // the effective removals.
    // Typically redefined by derived classes.
    // Default is to do store nothing and to notify downstream nodes.
    remove: function( removed ){ return this.forks_remove( removed ) },
    
    forks_add: function( added ) {
      // Notify downsteam destinations about some "add" operation that was done
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].add( added );
      
      return this;
    }, // forks_add()
    
    forks_update: function( updated ) {
      // Notify destinations about some "update" operation that was done
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].update( updated );
      
      return this;
    }, // forks_update()
    
    forks_remove: function( removed ) {
      // Notify downsteam node about some "remove" operation that was one
      var forks = this.forks, l = forks.length;
      
      for ( var i = -1; ++i < l; ) forks[ i ].remove( removed );
      
      return this;
    }, // forks_remove()
    
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
      
      return this;
    }, // connect()
    
    disconnect: function( target ) {
      var new_targets = [];
      var targets     = this.forks;
      var len         = targets.length;
      for ( var ii = 0, item ; ii < len ; ii++ ) {
        item = targets[ ii ];
        if ( item !== target ) { new_targets.push( item ) }
        break;
      }
      this.forks = new_targets;
      // ToDo: target should be notified that it's source was disconnected
      if( target.source === this ) { target.source = null }
      return this;
    }, // disconnect()
    
    to:       function( target ) { return   this.connect(    target ); },
    not_to:   function( target ) { return   this.disconnect( target ); },
    from:     function( source ) { return source.connect(    this );   },
    not_from: function( source ) { return source.disconnect( this );   },
    
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
  
  
  /* --------------------------------------------------------------------------
     Fork.subclass( name, class, methods )
     Generic pipelet class builder. Makes class a subclass of This class and
     defines Fork[name] using methods.factory. This is just a helper to
     make it easier to implement the usual pattern for data flow node classes.
     
     Usage: -- implementers --
        function Talker( source, msg ){
          this.source = source
          this.msg    = null;
          msg && this.add( [ { msg: msg } ] );
        }
        Fork.subclass( "talker", Talker, {
          factory: function( msg ) { return new Talker( this, msg) },
          get:    function()    { return this.msg ? [ this.msg ] : []; }
          add:    function( d ) { d && d[0] && this.msg = d[0];  return this; }
          update: function( d ) { d && d[0] && this.msg = d[0];  return this; }
          remove: function( d ) { this.msg = null; return this; }
          talk: function() {
            log( "a fool talks to it's creator" );
            this.source.add( this.get() );
            return this
          }
        })
        
     Usage: -- users --
       var a_fool = obj.talker( "I'm a fool" );
       a_fool.talk();
       a_fool.add( [ { msg: "with memory issues" }, { msg: "big issues") } ] );
       a_fool.talk();
  */
  
  Fork.subclass = function( name, klass, methods ){
    subclass( this, klass );
    extend( klass.prototype, methods );
    Fork[name] = {
      class: klass,
      subclass: function() {
        return Fork.subclass.apply( klass, arguments );
      }
    };
    Fork.prototype[name] = methods.factory;
    return klass;
  }
  
  /* -------------------------------------------------------------------------------------------
     Set( a [, options] )
  */
  
  Fork.prototype.set = function( options ) {
    // Add a new downsteam Set to This Fork and initialize it with the
    // content, if any, of This Fork.
    
    // ToDo: JHR, should send this instead of null, ctor would figure out
    var s = new Set( null, extend( { key: this.key }, options ) );
    
    // ToDo: JHR, move this to constructor
    this.connect( s );
    
    return s;
  } // set()
  
  function Set( a, options ) {
    // Constructor for a new Set with some initial content
    // ToDo: initial content should be either an array or an existing source
    
    options = Fork.call( this, options ).options;
    
    // ToDo: JHR,
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
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Fork', 'Connection', 'Set' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // fork.js
