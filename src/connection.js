// connection.js

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
    log( "xs connection, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Connection()
     
     A Connection has one upstream source and is the source of many downstream Connections.
     
     ToDo: JHR. Connection is a confusing name. DataFlowNode may help.
  */
  function Connection( options ) {
    this.options = options = options || {};
    
    this.key = options.key || [ "id" ];
    
    // An array of dependent connections. See .connect()
    this.connections = [];
    
    // this.source = undefined // No source yet
    
    return this;
  } // Connection()
  
  var DataFlowNode = Connection;
  
  extend( Connection.prototype, {
        
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
    
    // Add items to this node then notify downsteam connections about
    // the effective additions.
    // Typically redefined by derived classes.
    // Default is to do store nothing and to notify downstream nodes.
    add: function( added ){ return this.connections_remove()( added) },
    
    // Update items of this node, then notify downsteam destinations about
    // the effective updates.
    // Typically redefined by derived classes.
    // Default is to do store nothing and to notify downstream nodes.
    update: function( updated ){ return this.connections_update( updated ) },
    
    // remove: function( removed )
    // Remove items from this node and notify downsteam destinations about
    // the effective removals.
    // Typically redefined by derived classes.
    // Default is to do store nothing and to notify downstream nodes.
    remove: function( removed ){ return this.connections_remove( removed ) },
    
    connections_add: function( added ) {
      // Notify downsteam destinations about some "add" operation that was done
      var connections = this.connections, l = connections.length;
      
      for ( var i = -1; ++i < l; ) connections[ i ].add( added );
      
      return this;
    }, // connections_add()
    
    connections_update: function( updated ) {
      // Notify destinations about some "update" operation that was done
      var connections = this.connections, l = connections.length;
      
      for ( var i = -1; ++i < l; ) connections[ i ].update( updated );
      
      return this;
    }, // connections_update()
    
    connections_remove: function( removed ) {
      // Notify downsteam node about some "remove" operation that was one
      var connections = this.connections, l = connections.length;
      
      for ( var i = -1; ++i < l; ) connections[ i ].remove( removed );
      
      return this;
    }, // connections_remove()
    
    connect: function( destination ) {
      // Connect a new downstream destination to this source.
      // The content of the source gets added to the downsteam destination.
    
      // ToDo: JHR, the destination should also decide if it is capable of
      // accepting a source. this requires a ._from(), to be called by the
      // source when it connects to the destination.
      // Note: I have implemented a Broadcaster node that accepts multiple
      // sources and multiple destinations.
      
      if ( destination.source ) {
        throw new Error( 'A Connection can only have a single source' );
      }
      
      // Remember the source of this downstream Connection
      destination.source = this;
      
      this.connections.push( destination );
      
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
      var targets     = this.connections;
      var len         = targets.length;
      for ( var ii = 0, item ; ii < len ; ii++ ) {
        item = targets[ ii ];
        if ( item !== target ) { new_targets.push( item ) }
        break;
      }
      this.connections = new_targets;
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
  } ); // Connection instance methods
  
  
  /* --------------------------------------------------------------------------
     DataFlowNode.subclass( name, class, methods )
     Generic pipelet class builder. Makes class a subclass of This class and
     defines DataFlowNode[name] using methods.factory. This is just a helper to
     make it easier to implement the usual pattern for data flow node classes.
     
     Usage: -- implementers --
        function Talker( source, msg ){
          this.source = source
          this.msg    = null;
          msg && this.add( [ { msg: msg } ] );
        }
        DataFlowNode.subclass( "talker", Talker, {
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
  
  DataFlowNode.subclass = function( name, klass, methods ){
    subclass( this, klass );
    extend( klass.prototype, methods );
    DataFlowNode[name] = {
      class: klass,
      subclass: function() {
        return DataFlowNode.subclass.apply( klass, arguments );
      }
    };
    DataFlowNode.prototype[name] = methods.factory;
    return klass;
  }
  
  
  /* -------------------------------------------------------------------------------------------
     Set( a [, options] )
  */
  
  Connection.prototype.set = function( options ) {
    // Add a new downsteam Set to This Connection and initialize it with the
    // content, if any, of This Connection.
    
    // ToDo: JHR, should send this instead of null, ctor would figure out
    var s = new Set( null, extend( { key: this.key }, options ) );
    
    // ToDo: JHR, move this to constructor
    this.connect( s );
    
    return s;
  } // set()
  
  function Set( a, options ) {
    // Constructor for a new Set with some initial content
    // ToDo: initial content should be either an array or an existing source
    
    options = Connection.call( this, options ).options;
    
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
  
  subclass( Connection, Set );
  
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
      // Add items to the set and notify downsteam Connections.
      push.apply( this.a, objects );
      
      return this.connections_add( objects );
    }, // add()
    
    update: function( objects ) {
      // Update items in the set and notify downsteam Connections.
      for ( var i = -1, l = objects.length, updated = []; ++i < l; ) {
        var o = objects[ i ]
          , p = this.index_of( o[ 0 ] )
        ;
        
        if ( p === -1 ) continue;
        
        this.a[ p ] = o[ 1 ];
        
        updated.push( o );
      }
      
      return this.connections_update( updated );
    }, // update()
    
    remove: function( objects ) {
      // Remove items from the set and notify downsteam Connections
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
      
      return this.connections_remove( removed );
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
     CXXX(): template for data flow destination.
     It connects to a source, builds an empty .out Set and leaves it up for the
     derived class to decide what to do when an add/update/remove operation
     happens.
  */
  function CXXX( source, options ) {
    // Constructor for a destination that depends on what happens to a source
    
    Connection.call( this, options );
    
    this.out = new Set( [], { key: source.key } );
    
    source.connect( this );
    
    return this;
  } // CXXX()
  
  subclass( Connection, CXXX );
  
  extend( CXXX.prototype, {
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
  } ); // CXXX instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Connection', 'Set' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // connection.js
