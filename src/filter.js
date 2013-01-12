// filter.js

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    
    require( './code.js' );
    require( './connection.js' );    
  } else {
    XS = exports.XS;
  }
  
  var log        = XS.log
    , extend     = XS.extend
    , subclass   = XS.subclass
    , Code       = XS.Code
    , Connection = XS.Connection
    , Set        = XS.Set
  ;
  
  var push = Array.prototype.push
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs filter, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Filter()
  */
  Connection.prototype.filter = function( filter, options ) {
    var f = new Filter( this, filter, extend( { key: this.key }, options ) );
    
    var out = new Set( [], { key: this.key } );
    
    f.connect( out )
    
    return out; // ToDo: Filter should not build a set
  } // filter()
  
  function Filter( set, filter, options ) {
    Connection.call( this, options );
    
    this.filter = filter;
    
    set.connect( this );
    
    return this;
  } // Filter()
  
  subclass( Connection, Filter );
  
  extend( Filter.prototype, {
    filter_objects: function( objects ) {
      var filter = this.filter = Code.decompile( this.filter )
        , vars = [ 'i = -1', 'l = objects.length', 'out = []', 'o' ]
        , first
      ;
      
      switch( typeof filter ) {
        case 'object': // { parameters: [ 'o' ], code: 'o.country === "Morocco"', condition: '' }
          var p = filter.parameters[ 0 ];
          
          if ( p !== void 0 ) {
            first = p + ' = objects[ ++i ]; ' + filter.code + ' if ( ' + filter.condition + ' ) out.push( ' + p + ' );';
            
            break;
          }
          
          filter = this.filter;
        // fall-through
        
        case 'function':
          vars.push( 'f = filter' );
          
          first = 'if ( f( o = objects[ ++i ] ) ) out.push( o );';
        break;
      }
      
      eval( new Code()
        ._function( 'this.filter_objects', null, [ 'objects' ] )
          ._var( vars )
          
          .unrolled_while( first )
          
          .add( 'return out' )
        .end( 'Filter.filter_objects()' )
        .get()
      );
      
      return this.filter_objects( objects );
    }, // filter_objects()
    
    get: function() {
      return this.source ? this.filter_objects( this.source.get() ) : [];
    }, // get()
    
    add: function( objects ) {
      var added = this.filter_objects( objects );
      
      added.length && this.connections_add( added );
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      var removed = this.filter_objects( objects );
      
      removed.length && this.connections_remove( removed );
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      var filter = this.filter;
      
      switch( typeof filter ) {
        case 'object':
          filter = filter.f;
        // fall-through
        
        case 'function':
          this.update = function( updates ) {
            var l = updates.length, f = filter, removed = [], updated = [], added = [];
            
            for ( var i = -1; ++i < l; ) {
              var u = updates[ i ];
              
              if ( f( u[ 0 ] ) ) {
                if ( f( u[ 1 ] ) ) {
                  updated.push( u );
                } else {
                  removed.push( u[ 0 ] );
                }
              } else if ( f( u[ 1 ] ) ) {
                added.push( u[ 1 ] );
              }
            }
            
            removed.length && this.connections_remove( removed );
            updated.length && this.connections_update( updated );
            added  .length && this.connections_add   ( added   );
            
            return this;
          };
          
          return this.update( updates );
        break;
      }
    } // update()
  } ); // Filter instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Filter' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // filter.js
