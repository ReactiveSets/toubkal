// aggregator.js

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
    , Connection = XS.Connection
    , Set        = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs aggregator, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Aggregator_Dimensions()
  */
  function Aggregator_Dimensions( aggregator, dimensions, options ) {
    Connection.call( this, options );
    
    this.aggregator = aggregator;
    this.dimensions = dimensions;
    
    if ( dimensions instanceof Set ) {
      dimensions.connect( this );
    } else {
      this.add( dimensions );
    }
    
    return this;
  } // Aggregator_Dimensions()
  
  subclass( Connection, Aggregator_Dimensions );
  
  extend( Aggregator_Dimensions.prototype, {
    get: function() {
      return this.dimensions instanceof Set ? this.dimensions.get() : this.dimensions;
    }, // get()
    
    make_group: function( dimensions ) {
      dimensions = this.get();
      
      if ( dimensions.length === 0 ) throw new Error( 'Aggregator_Dimensions.make_group(), needs at least one dimension' );
      
      for ( var ids = [], i = -1, d; d = dimensions[ ++i ]; ) ids.push( d.id );
      
      var key_code = 'o[ "' + ids.join( '" ] + "_" + o[ "' ) + '" ]';
      
      var code = new Code( 'group' )
        ._function( 'this.aggregator.group', null, [ 'objects' ] )
          ._var( 'groups = {}', 'keys = []', 'i = -1', 'o', 'k', 'g' )
          
          ._while( 'o = objects[ ++i ]' )
            ._if( 'g = groups[ k = ' + key_code + ' ]' )
              .add( 'g.push( o )' )
              .add( 'continue' )
            .end()
            
            .add( 'groups[ k ] = [ o ]' )
            .add( 'keys.push( k )' )
          .end()
          
          .add( 'return { groups: groups, keys: keys };' )
        .end( 'group()' )
      ;
      
      eval( code.get() );
      
      return this;
    }, // make_group()
    
    add: function( dimensions ) {
      return this.make_group( dimensions );
    }, // add()
    
    remove: function( dimensions ) {
      return this.make_group();
    }, // remove()
    
    update: function( dimension_updates ) {
      return this.make_group();
    } // update()
  } ); // Aggregator_Dimensions instance methods  
  
  /* -------------------------------------------------------------------------------------------
     Aggregator_Measures()
  */
  function Aggregator_Measures( aggregator, measures, options ) {
    Connection.call( this, options );
    
    this.aggregator = aggregator;
    this.measures   = measures;
    
    if ( measures instanceof Set ) {
      measures.connect( this );
    } else {
      this.add( measures );
    }
    
    return this;
  } // Aggregator_Measures()
  
  subclass( Connection, Aggregator_Measures );
  
  extend( Aggregator_Measures.prototype, {
    get: function() {
      return this.measures instanceof Set ? this.measures.get() : this.measures;
    }, // get()
    
    build_reduce_groups: function( measures ) {
      measures = this.get();
      
      var u, i, m, ids = [], id, first, inner
        , d, dimensions = this.aggregator.dimensions.get()
        , dimension_ids = []
        , vars = []
        , init_measures = '';
      ;
      
      if ( measures.length ) {
        for ( i = -1; m = measures[ ++i ]; ) {
          ids.push( id = m.id );
          vars.push( id = '_' + id );
          init_measures += id + ' = 0; ';
        }
        
        id = ids[ i = 0 ];
        
        if ( measures.length === 1 ) {
          inner = '( g[ ++i ].' + id + ' || 0 )';
          first = '_' + id + ' += ' + inner;
          inner = '+ ' + inner;
        } else {
          first = '_' + id + ' += ( o = g[ ++i ] ).' + id + ' || 0;';
          
          for ( ; ( id = ids[ ++i ] ) !== u; ) {
            first += ' _' + id + ' += o.' + id + ' || 0;';
          }
        }
      }
      
      var code = new Code()
        ._function( 'this.aggregator.reduce_groups', null, [ 'groups' ] )
          ._var( 'keys = groups.keys', 'key', 'out = []', 'o' )
          ._var( vars )
          
          .add( 'groups = groups.groups' )
          
          ._for( 'var j = -1', 'key = keys[ ++j ]' );
            
            if ( measures.length ) {
              code
                ._var( 'g = groups[ key ]', 'i = -1', 'l = g.length' )
                
                .line( init_measures )
                
                .unrolled_while( first, inner )
              ;
            }
            
            code
            .add( 'o = groups[ key ][ 0 ]', 1 )
            
            .line( 'out.push( {' );
              var indent = '    ';
              for ( i = -1; d = dimensions[ ++i ]; ) {
                code.line( indent + d.id + ': o.' + d.id );
                indent = '  , ';
              }
              
              for ( i = -1; ( id = ids[ ++i ] ) !== u; ) {
                code.line( indent + id + ': _' + id );
                indent = '  , ';
              }
            
            code.line( '} );' )
          .end()
          
          .add( 'return { groups: out, keys: keys }' )
        .end( 'aggregate()' )
      ;
      
      eval( code.get() );
      
      return this;
    }, // build_reduce_groups()
    
    add: function( measures ) {
      return this.build_reduce_groups( measures );
    }, // add()
    
    remove: function( measures ) {
      return this.build_reduce_groups();
    }, // remove()
    
    update: function( measure_updates ) {
      return this.build_reduce_groups();
    } // update()
  } ); // Aggregator_Measures instance methods  
  
  /* -------------------------------------------------------------------------------------------
     Aggregator()
  */
  Connection.prototype.aggregate = function( measures, dimensions, options ) {
    var a = new Aggregator( measures, dimensions, options );
    
    this.connect( a );
    
    return a;
  }; // Connection.prototype.aggregate()
  
  function Aggregator( measures, dimensions, options ) {
    Set.call( this, options );
    
    this.dimensions = new Aggregator_Dimensions( this, dimensions, options );
    this.measures   = new Aggregator_Measures  ( this, measures  , options );
    
    return this;
  } // Aggregator()
  
  subclass( Set, Aggregator );
  
  extend( Aggregator.prototype, {
    aggregate: function( objects ) {
      this.groups = this.reduce_groups( this.group( objects ) );
      
      return this;
    }, // aggregate()
    
    get: function() {
      var g = this.groups;
      
      return g ? g.groups : g;
    }, // get()
    
    add: function( objects ) {
      return this.aggregate( objects );
    }, // add()
    
    remove: function( objects ) {
      return this;
    }, // remove()
    
    update: function( updates ) {
      return this;
    } // update()
  } ); // Aggregator instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Aggregator', 'Aggregator_Dimensions', 'Aggregator_Measures' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // aggregator.js
