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
    return new Filter( this, filter, options );
  } // filter()
  
  function Filter( source, filter, options ) {
    Connection.call( this, extend( { key: source.key }, options ) );
    
    this.filter = filter;
    
    source.connect( this );
    
    return this;
  } // Filter()
  
  subclass( Connection, Filter );
  
  extend( Filter.prototype, {
    filter_objects: function( objects ) {
      var filter = this.filter = Code.decompile( this.filter )
        , vars = [ '_out = []' ]
        , first, u, index = 'i', objects_variable = '_o'
      ;
      
      switch( typeof filter ) {
        case 'object': // { parameters: [ 'o' ], code: 'o.country === "Morocco"', condition: '' }
          var p = filter.parameters;
          
          if ( p.length ) {
            if ( p.length > 1 ) index = p[ 1 ];
            if ( p.length > 2 ) objects_variable = p[ 2 ];
            
            var o = p[ 0 ];
            
            vars.push( o );
            
            first = o + ' = ' + objects_variable + '[ ++' + index + ' ]; ' + filter.code + ' if ( ' + filter.condition + ' ) _out.push( ' + o + ' );';
            
            break;
          }
          
          filter = filter.f;
        // fall-through
        
        case 'function':
          vars.push( 'f = filter', 'o' );
          
          first = 'if ( f( o = _o[ ++i ], i, _o ) ) _out.push( o );';
        break;
      }
      
      vars.push( index + ' = -1', 'l = ' + objects_variable + '.length' );
      
      eval( new Code()
        ._function( 'this.filter_objects', null, [ objects_variable ] )
          ._var( vars )
          
          .unrolled_while( first, u, u, { index: index } )
          
          .add( 'return _out' )
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
              var u = updates[ i ], u0 = u[ 0 ], u1 = u[ 1 ], fu1 = f( u1 );
              
              if ( f( u0 ) ) {
                if ( fu1 ) {
                  updated.push( u );
                } else {
                  removed.push( u0 );
                }
              } else if ( fu1 ) {
                added.push( u1 );
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
