/*  aggregate.js

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
  
  var log      = XS.log
    , extend   = XS.extend
    , subclass = XS.subclass
    , Code     = XS.Code
    , Pipelet  = XS.Pipelet
    , Set      = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs aggregate, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Aggregate_Dimensions()
  */
  function Aggregate_Dimensions( aggregate, dimensions, options ) {
    Pipelet.call( this, options );
    
    this.aggregate = aggregate;
    
    return this.add_source( this.dimensions = dimensions );
  } // Aggregate_Dimensions()
  
  Pipelet.subclass( Aggregate_Dimensions, {
    fetch: function( receiver ) {
      if ( this.dimensions instanceof Set ) return this.dimensions.fetch( receiver );
      
      receiver( this.dimensions, true );
      
      return this;
    }, // fetch()
    
    build_group: function( dimensions, done ) {
      if ( dimensions.length === 0 ) throw new Error( 'Aggregate_Dimensions.build_group(), needs at least one dimension' );
      
      for ( var ids = [], i = -1, d; d = dimensions[ ++i ]; ) ids.push( d.id );
      
      var key_code = 'o[ "' + ids.join( '" ] + "_" + o[ "' ) + '" ]';
      
      var code = new Code( 'group' )
        ._function( 'this.aggregate.group', null, [ 'objects' ] )
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
      
      done && done.call( this, dimensions );
      
      return this;
    }, // build_group()
  } ); // Aggregate_Dimensions instance methods  
  
  var p = Aggregate_Dimensions.prototype;
  
  p.add = p.remove = p.update = function() {
    var that = this;
    
    this.fetch_all( function( dimensions ) {
      that.build_group( dimensions, function( dimensions ) {
        that.aggregate.dimensions_changed( dimensions );
      } );
    } );
  };
  
  /* -------------------------------------------------------------------------------------------
     Aggregate_Measures()
  */
  function Aggregate_Measures( aggregate, measures, options ) {
    Pipelet.call( this, options );
    
    this.aggregate = aggregate;
    
    return this.add_source( this.measures = measures );
  } // Aggregate_Measures()
  
  Pipelet.subclass( Aggregate_Measures, {
    fetch: function( receiver ) {
      if ( this.measures instanceof Set ) return this.measures.fetch( receiver );
      
      receiver( this.measures, true );
            
      return this;
    }, // fetch()
    
    build_reduce_groups: function( measures, dimensions, done ) {
      var u, i, m, ids = [], id, first, inner
        , d, dimension_ids = []
        , dl = dimensions.length
        , vars = [ 'keys = groups.keys', 'key', 'out = []', 'hash = {}' ]
        , init_measures = ''
      ;
      
      if ( dl > 1 ) vars.push( 'o' );
      
      if ( measures.length ) {
        for ( i = -1; m = measures[ ++i ]; ) {
          ids.push( id = m.id );
          vars.push( id = '_' + id );
          init_measures += id + ' = 0; ';
        }
        
        m = measures[ i = 0 ];
        id = m.id;
        
        if ( measures.length === 1 ) {
          inner = 'g[ ++i ].' + id;
          
          if ( ! m.no_nulls ) inner = '( ' + inner + ' || 0 )';
          
          first = '_' + id + ' += ' + inner;
          inner = '+ ' + inner;
        } else {
          first = '_' + id + ' += ( o = g[ ++i ] ).' + id + ( m.no_nulls ? ';' : ' || 0;' );
          
          while ( m = measures[ ++i ] ) {
            id = m.id;
            
            first += ' _' + id + ' += o.' + id + ( m.no_nulls ? ';' : ' || 0;' );
          }
        }
      }
      
      var code = new Code()
        ._function( 'this.aggregate.reduce_groups', null, [ 'groups' ] )
          ._var( vars )
          
          .add( 'groups = groups.groups' )
          
          ._for( 'var j = -1', 'key = keys[ ++j ]' )
            ._var( 'g = groups[ key ]', 'i = -1', 'l = g.length' );
            
            if ( measures.length ) {
              code
                ._var( 'i = -1' )
                
                .line( init_measures )
                
                .unrolled_while( first, inner )
              ;
            }
            
            code
            //.add( 'o = g[ 0 ]', 1 )
            
            .line( 'out.push( hash[ key ] = {' );
              // Add dimensions' coordinates
              var indent = '    ';
              for ( i = -1; d = dimensions[ ++i ]; ) {
                code.line( indent + d.id + ': '
                  + ( i == 0 ? ( dl > 1 ? '( o = g[ 0 ] )' : 'g[ 0 ]' ) : 'o' )
                  + '.' + d.id
                );
                
                indent = '  , ';
              }
              
              // Add aggregated measures
              for ( i = -1; ( id = ids[ ++i ] ) !== u; ) {
                code.line( indent + id + ': _' + id );
                indent = '  , ';
              }
            
            code.line( indent + '_count: l' )
            .line( '} );' )
          .end()
          
          .add( 'return { groups: out, keys: keys, hash: hash }' )
        .end( 'reduce_groups()' )
      ;
      
      eval( code.get() );
      
      done && done.call( this, measures, dimensions );
      
      return this;
    }, // build_reduce_groups()
  } ); // Aggregate_Measures instance methods
  
  p = Aggregate_Measures.prototype;
  
  p.add = p.remove = p.update = function() {
    var that = this;
    
    return this.fetch_all( fetch_aggregates );
    
    function fetch_aggregates( measures ) {
      that.aggregate.dimensions.fetch_all( function( dimensions ) {
        that.build_reduce_groups( measures, dimensions, function() {
          that.aggregate.measures_changed( measures, dimensions );
        } );
      } );
    }
  };
  
  /* -------------------------------------------------------------------------------------------
     Aggregate()
  */
  function Aggregate( measures, dimensions, options ) {
    Set.call( this, options );
    
    this.dimensions = new Aggregate_Dimensions( this, dimensions, options );
    this.measures   = new Aggregate_Measures  ( this, measures  , options );
    
    return this;
  } // Aggregate()
  
  Set.build( 'aggregate', Aggregate, {
    dimensions_changed: function( dimensions ) {
      // If this is the first time, duing initialization, measures is not defined yet
      var that = this, measures = this.measures;
      
      if ( measures ) {
        measures.fetch_all( function( measures ) {
          measures.build_reduce_groups( measures, dimensions, function() {
            that.rebuild_aggregates();
          } );
        } );
      }
      
      return this;
    }, // dimensions_changed()
    
    measures_changed: function( measures, dimensions ) {
      var that = this;
      
      this.build_merge( measures, function() {
        that.rebuild_aggregates();
      } );
      
      return this;
    }, // measures_changed()
    
    rebuild_aggregates: function() {
      if ( this.aggregates ) {
        // there were aggregates, clear these, notifying 
        this.clear();
      }
      
      var that = this;
      
      this._fetch_source( function( values ) {
        values && values.length && that.add( values );
      } );
      
      return this;
    }, // rebuild_aggregates()
    
    /* -------------------------------------------------------------------------------------------
       aggregate( values )
       
       Aggregate is a low-level method used by add / remove / update to calculate aggregates
       of an array of objects.
       
       Aggregates are calculated by reducing objects into groups of objects according to
       dimensions then reducing each object group into aggregates according to measures.
       
       These aggregates are then typically merged into the aggregate's previous aggregates,
       or removed from these if the action is remove(), updates are not currently handled by
       this method.
       
       This function should not be used directly but could be overloaded by derived classes
       to change its behavior.
       
       Parameters:
         - values: an array of objects to aggregate measures by dimensions.
    */
    aggregate: function( values ) {
      return this.reduce_groups && this.group
        ? this.reduce_groups( this.group( values ) )
        : this
      ;
    }, // aggregate()
    
    /* -------------------------------------------------------------------------------------------
       clear()
    */
    clear: function() {
      this.aggregates = undefined;
      
      return this.emit_clear();
    }, // clear()
    
    /* -------------------------------------------------------------------------------------------
       fetch()
    */
    fetch: function( receiver ) {
      receiver( this.aggregates.groups, true );
      
      return this;
    }, // fetch()
    
    /* -------------------------------------------------------------------------------------------
       merge( aggregates, options )
       
       Merge new aggregates with current aggregates.
       
       This method should not be called directly, it is called by add / remove / update after
       aggregating an array of objects.
       
       This method can also be used to reduce distributed aggregates.
       
       This method is built dynamically by built_merge() on measures changes.
    */
    build_merge: function( measures, done ) {
      var ml = measures.length;
      
      // ToDo: generate code for measures loop
      this.merge = function( aggregates ) {
        var a        = this.aggregates
          , groups   = a.groups
          , keys0    = a.keys
          , h0       = a.hash
          , keys1    = aggregates.keys
          , h1       = aggregates.hash
          , added    = []
          , removed  = []
          , updates  = []
        ;
        
        for ( var i = -1, l = keys1.length; ++i < l; ) {
          var k1 = keys1[ i ]
            , g0 = h0[ k1 ]
            , g1 = h1[ k1 ]
          ;
          
          if ( g0 ) {
            if ( g1 ) {
              if ( g1._count += g0._count ) {
                for ( var j = -1; ++j < ml; ) {
                  var m = measures[ j ].id;
                  
                  g1[ m ] += g0[ m ];
                }
                
                updates.push( [ g0, g1 ] );
              } else {
                removed.push( g0 );
              }
            } else {
              removed.push( g0 );
            }
          } else {
            groups.push( h0[ k1 ] = g1 );
            keys0.push( k1 );
            
            added.push( g1 );
          }
        }
        
        added  .length && this.emit_add   ( added   );
        removed.length && this.emit_remove( removed );
        updates.length && this.emit_update( updates );
        
        return this;
      }; // merge()
      
      done && done.call( this );
      
      return this;
    }, // build_merge()
    
    /* -------------------------------------------------------------------------------------------
       add()
    */
    add: function( values ) {
      var a = this.aggregate( values );
      
      if ( this.aggregates ) return this.merge( a );
      
      this.aggregates = a;
      
      return this.emit_add( a );
    }, // add()
    
    /* -------------------------------------------------------------------------------------------
       remove( values )
    */
    remove: function( values ) {
      var that = this;
      
      this.measures.fetch_all( function( measures ) {
        var a = that.aggregate( values )
          , keys = a.keys
          , hash = a.hash
        ;
        
        // Calculate opposite of all measures
        for ( var i = -1, l = keys.length; ++i < l; ) {
          var g = hash[ keys[ i ] ];
          
          for ( var j = -1, ml = measures.length; ++j < ml; ) {
            var m = measures[ j ].id;
            
            g[ m ] = -g[ m ];
          }
          
          g._count = -g._count; 
        }
        
        that.merge( a )
      } );
      
      return this;
    }, // remove()
    
    /* -------------------------------------------------------------------------------------------
       update( updates )
    */
    update: function( updates ) {
      var a0 = [], a1 = [];
      
      // extract the previous and new values in two separate arrays
      for ( var i = -1, l = updates.length; ++i < l; ) {
        var u = updates[ i ];  
        
        a0.push( u[ 0 ] );
        a1.push( u[ 1 ] );
      }
      
      // Calculate aggregates for separate previous and new values
      a0 = this.aggregate( a0 );
      a1 = this.aggregate( a1 );
      
      // Merge the previous and new values
      var keys0 = a0.keys
        , keys1 = a1.keys
        , groups = a1.groups
        , h0 = a0.hash
        , h1 = a1.hash
      ;
      
      for ( i = -1; ++i < l; ) {
        var k0 = keys0[ i ]
          , k1 = keys1[ i ]
          , g0 = h0[ k0 ]
          , g1 = h1[ k1 ]
        ;
        
        if ( k0 === k1 ) {
          for ( var j = -1, ml = measures.length; ++j < ml; ) {
            var m = measures[ j ].id;
            
            g1[ m ] -= g0[ m ];
          }
        } else {
          for ( var j = -1, ml = measures.length; ++j < ml; ) {
            var m = measures[ j ].id;
            
            g0[ m ] = -g0[ m ];
          }
          groups.push( h1[ k0 ] = g0 );
          keys1.push( k0 );
        }
      }
      
      // Merge with previous aggregates
      return this.merge( a1 );
    } // update()
  } ); // Aggregate instance methods
  
  Aggregate.Dimensions = Aggregate_Dimensions;
  Aggregate.Measures   = Aggregate_Measures;
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Aggregate' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // aggregate.js
