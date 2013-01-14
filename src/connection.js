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
     
     A Connection depends on one or many source Connection (the last added
     being called "the source") and may have dependent connections.
     
     ToDo: JHR. Connection is a confusing name. DataFlowNode or Node or
     DataNeuron or Neuron or Cell or DataCell may help.
  */
  function Connection( options ) {
    this.options = options = options || {};
    
    this.key = options.key || [ "id" ];
    
    // An array of dependent connections. See .connect()
    this.connections = [];
    
    // this.source = null // No source yet
    
    return this;
  } // Connection()
  
  extend( Connection.prototype, {
    
    //get: function(){
    // Return the content (an array of items) of This connection.
    // Subclasses typically redefines this.
    //  return []
    //}, // get()
    
    notify: function( transaction ) {
    // Batch add/update/remove operations
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
    
    // add: function( added ){}
    // Add items to this Connection and notify dependent connections about
    // the effective additions.
    // Defined by derived classes
    
    // update: function( updated )
    // Update items of this Connection and notify dependent connections about
    // the effective updates
    // Defined by derived classes
    
    // remove: function( removed )
    // Remove items from this Connection and notify dependent connections about
    // the effective removals.
    
    connections_add: function( added ) {
    // Notify dependent connections about some "add" operation that was done
      var connections = this.connections, l = connections.length;
      
      for ( var i = -1; ++i < l; ) connections[ i ].add( added );
      
      return this;
    }, // connections_add()
    
    connections_update: function( updated ) {
    // Notify dependent Connections about some "update" operation that was done
      var connections = this.connections, l = connections.length;
      
      for ( var i = -1; ++i < l; ) connections[ i ].update( updated );
      
      return this;
    }, // connections_update()
    
    connections_remove: function( removed ) {
    // Notify dependent Connections about some "remove" operation that was one
      var connections = this.connections, l = connections.length;
      
      for ( var i = -1; ++i < l; ) connections[ i ].remove( removed );
      
      return this;
    }, // connections_remove()
    
    connect: function( connection ) {
    // Connect a new dependent Connection to This Connection.
    // "the source" for the added Connection becomes This Connection.
    // The content of This Connections gets added to the dependent Connection.
    
      // Remember last source for this dependent Connection
      connection.source = this;
      
      this.connections.push( connection );
      
      connection.add( this.get() );
      
      return this;
    }, // connect()
    
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
  
  /* -------------------------------------------------------------------------------------------
     Set( a [, options] )
  */
  
  Connection.prototype.set = function( options ) {
  // Add a new dependent Set to This Connection and initialize it with the
  // content, if any, of This Connection.
    var s = new Set( extend( { key: this.key }, options ) );
    
    this.connect( s );
    
    return s;
  } // set()
  
  function Set( a, options ) {
  // Constructor for a new Set with some initial content
    options = Connection.call( this, options ).options;
    
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
    
    connect: function( connection ) {
    // ToDo: JHR. This is a duplicate of Connection.connect(), get rid of it?
      connection.source = this;
      
      this.connections.push( connection );
      
      connection.add( this.get() );
      
      return this;
    }, // connect()
    
    add: function( objects ) {
    // Add items to the set and notify dependents.
      push.apply( this.a, objects );
      
      return this.connections_add( objects );
    }, // add()
    
    update: function( objects ) {
    // Update items in the set and notify dependents.
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
    // Remove items from the set and notify dependents
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
    // ToDo: JHR, when the set grows, would it make sense to redefine again
    // again to make index_of() even more efficient?
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
     CXXX(): template for Connection
  */
  function CXXX( set, options ) {
  // Constructor for a connection that depends on what happens to it's
  // initally empty initial original source Set (remembered as .out)
  // ToDo: JHR, that the "input" set would be called "out" is confusing. Maybe
  // "in" or "set" or "origin" or "pipe" or "channel" or "conduit" or "tube"...
  // "out" makes sense from the point of view of the source not from the point
  // of view of the dependent object itself. 
    Connection.call( this, options );
    
    this.out = new Set( [], { key: set.key } );
    
    set.connect( this );
    
    return this;
  } // CXXX()
  
  subclass( Connection, CXXX );
  
  extend( CXXX.prototype, {
    add: function( objects ) {
    // Called when items were added to the original set
      return this;
    }, // add()
    
    remove: function( objects ) {
    // Called when items were removed from the original set
      return this;
    }, // remove()
    
    update: function( updates ) {
    // Called when items were update inside the original set
      return this;
    } // update()
  } ); // CXXX instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Connection', 'Set' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // connection.js
