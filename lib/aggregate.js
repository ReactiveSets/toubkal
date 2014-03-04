/*  aggregate.js

    Copyright (C) 2013, 2014, Connected Sets

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
    , Query    = XS.Query
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
    
    this._query = Query.pass_all;
    
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
    } // build_group()
  } ); // Aggregate_Dimensions instance methods  
  
  var p = Aggregate_Dimensions.prototype;
  
  p.add = p.remove = p.update = function( _, options ) {
    if ( options && options.more ) return this;
    
    var that = this;
    
    return this.fetch_all( function( dimensions ) {
      that.build_group( dimensions, function( dimensions ) {
        that.aggregate.dimensions_changed( dimensions );
      } );
    } );
  }; // add() / remove() / update()
  
  /* -------------------------------------------------------------------------------------------
     Aggregate_Measures()
  */
  function Aggregate_Measures( aggregate, measures, options ) {
    Pipelet.call( this, options );
    
    this._query = Query.pass_all;
    
    this.aggregate = aggregate;
    
    return this.add_source( this.measures = measures || [] );
  } // Aggregate_Measures()
  
  Pipelet.subclass( Aggregate_Measures, {
    fetch: function( receiver ) {
      if ( this.measures instanceof Set ) return this.measures.fetch( receiver );
      
      receiver( this.measures, true );
      
      return this;
    }, // fetch()
    
    build_reduce_groups: function( measures, dimensions, done ) {
      var u, i, m, ids = [], id
        , d, dimension_ids = []
        , dl = dimensions.length
        , vars = [ 'keys = groups.keys', 'positions = {}', 'key', 'out = []', 'hash = {}', 'v', 'u' ]
        , init_measures = ''
        , first = '', inner, last
        , l = measures.length
      ;
      
      if ( dl > 1 ) vars.push( 'o' );
      
      if ( l ) {
        var operations = {};
        
        for ( i = -1; m = measures[ ++i ]; ) {
          ids.push( id = m.id );
          
          operations[ m.type || ( m.type = 'sum' ) ] = true;
          
          switch( m.type ) {
            case 'max':
              m[ 'default' ] = '-Infinity';
              m.init = '[]';
            break;
            
            case 'min':
              m[ 'default' ] = '+Infinity';
              m.init = '[]';
            break;
            
            case 'sum':
              m.init = m[ 'default' ] = '0';
            break;
          }
          
          vars.push( id = '_' + id );
          
          init_measures += id + ' = ' + m.init + '; ';
        }
        
        //operations.max && vars.push( 'max = Math.max' );
        //operations.min && vars.push( 'min = Math.min' );
        
        var single = 1 == l;
        
        for ( i = -1; m = measures[ ++i ]; ) {
          /* m: { id: 'price', type: 'sum', of: 'Price', init: 0, no_undefined: false }
             
             All attributes are optional except id which must be unique. Optional attributes
             have the defaut values shown above.
          */
          id = m.id;
          
          /* Access current value v:
                     g[ ++i ].Price  -- only one measure, when l == 1
             ( o = g[ ++i ] ).Price  -- only the first time, when i == 0
                            o.Price  -- next iterations
          */
          var v = 'v = ' + ( single ? 'g[ ++i ].' : 0 == i ? '( o = g[ ++i ] ).' : 'o.' ) + ( m.of || id );
          
          // if values can be null or undefined, use zero by default
          m.no_undefined || ( v = '( u === ( ' + v + ' ) ? ' + m[ 'default' ] + ' : v )' );
          
          switch( m.type ) {
            case 'sum':
              first += ' _' + id + ' += ' + v;
              
              if ( single ) {
                inner = '+ ' + v;
              } else {
                first += ';';
              }
            break;
            
            case 'max':
            case 'min':
              if ( single ) {
                first = '_' + id + '.push( ' + v;
                
                inner = ', ' + v;
                
                last = ' )';
              } else {
                first += ' _' + id + '.push( ' + v + ' );';
              }
            break;
            
            default:
              throw new Error( 'Aggreggate..build_reduce_groups(), unsupported aggregate type: ' + m.type  );
          } // end switch m.type
        } // end for all measures
      } // end if at least one measure
      
      var code = new Code()
        ._function( 'this.aggregate.reduce_groups', null, [ 'groups' ] )
          ._var( vars )
          
          .add( 'groups = groups.groups', 1 )
          
          ._for( 'var j = -1', 'key = keys[ ++j ]' )
            ._var( 'g = groups[ key ]', 'i = -1', 'l = g.length' );
            
            if ( measures.length ) {
              code
                //.add( 'i = -1', 1 )
                
                .line( init_measures, 1 )
                
                .unrolled_while( first, inner, last )
              ;
            }
            
            code
            .add( 'positions[ key ] = j', 1 )
            
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
          
          .add( 'return { groups: out, keys: keys, positions: positions, hash: hash }' )
        .end( 'reduce_groups()' )
      ;
      
      eval( code.get() );
      
      done && done.call( this, measures, dimensions );
      
      return this;
    } // build_reduce_groups()
  } ); // Aggregate_Measures instance methods
  
  p = Aggregate_Measures.prototype;
  
  p.add = p.remove = p.update = function( _, options ) {
    if ( options && options.more ) return this;
    
    var that = this;
    
    return this.fetch_all( fetch_aggregates );
    
    function fetch_aggregates( measures ) {
      that.aggregate.dimensions.fetch_all( function( dimensions ) {
        that.build_reduce_groups( measures, dimensions, function() {
          that.aggregate.measures_changed( measures, dimensions );
        } );
      } );
    }
  }; // add(), remove(), update()
  
  /* -------------------------------------------------------------------------------------------
     Aggregate()
  */
  function Aggregate( measures, dimensions, options ) {
    Set.call( this, [], options );
    
    this.dimensions = new Aggregate_Dimensions( this, dimensions, options );
    this.measures   = new Aggregate_Measures  ( this, measures  , options );
    
    return this;
  } // Aggregate()
  
  Set.Build( 'aggregate', Aggregate, {
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
    clear: function( options ) {
      this.aggregates = undefined;
      
      return this.emit_clear( options );
    }, // clear()
    
    /* -------------------------------------------------------------------------------------------
       fetch()
    */
    fetch: function( receiver ) {
      receiver( this.aggregates ? this.aggregates.groups || [] : [], true );
      
      return this;
    }, // fetch()
    
    /* -------------------------------------------------------------------------------------------
       merge( aggregates [, options ] )
       
       Merge new aggregates with current aggregates.
       
       This method should not be called directly, it is called by add / remove / update after
       aggregating an array of objects.
       
       This method can also be used to reduce distributed aggregates.
       
       This method is built dynamically by built_merge() on measures changes.
    */
    build_merge: function( measures, done ) {
      // ToDo: generate code for measures loop
      this.merge = function( aggregates, options, operation ) {
        var ml       = measures.length
        
          , a        = this.aggregates
          , groups   = a.groups
          , keys0    = a.keys
          , h0       = a.hash
          , p0       = a.positions
          
          , keys1    = aggregates.keys
          , l        = keys1.length
          
          , h1       = aggregates.hash
          
          , added    = []
          , removed  = []
          , updates  = []
          , u, i, j, m, id
        ;
        
        for ( i = -1; ++i < l; ) {
          var k1 = keys1[ i ]
            , g0 = h0[ k1 ]
            , g1 = h1[ k1 ]
          ;
          
          if ( g0 ) {
            var all_zeros = false;
            
            switch( operation ) {
              case 'add':
              case 'update':
                g1._count += g0._count;
                
                for ( var j = -1; ++j < ml; ) {
                  m = measures[ j ];
                  id = m.id;
                  
                  switch( m.type ) {
                    case 'sum':
                      g1[ id ] += g0[ id ];
                    break;
                    
                    case 'max':
                    case 'min':
                      g1[ id ] = g1[ id ].concat( g0[ id ] );
                    break;
                  }
                }
              break;
              
              case 'remove':
                all_zeros = true; // for now, if any measure is not zero, set it to false
                
                if ( g1._count = g0._count - g1._count ) all_zeros = false;
                
                for ( j = -1; ++j < ml; ) {
                  m = measures[ j ];
                  id = m.id;
                  
                  switch( m.type ) {
                    case 'sum' :
                      if ( g1[ id ] = g0[ id ] - g1[ id ] ) all_zeros = false;
                    break;
                    
                    case 'max':
                    case 'min':
                      // remove all values from g0[ id ] that are found in g1[ id ]
                      var v0 = g0[ id ].slice( 0 ), v1 = g1[ id ];
                      
                      for ( var k = 0, kl = v0.length; ++k < kl; ) {
                        v0.splice( v1.indexOf( v0[ k ] ), 1 ); 
                      }
                    break;
                  }
                } // end for all measures
              break;
            } // end switch operation
            
            var p = p0[ k1 ];
            
            if ( all_zeros ) {
              // All measures are set to zero, including counts, remove this group
              removed.push( g0 );
              
              h0[ k1 ] = p0[ k1 ] = u;
              
              keys0.splice( k1, 1 );
              
              groups.splice( p, 1 );
            } else {
              updates.push( [ g0, g1 ] );
              
              h0[ k1 ] = groups[ p ] = g1;
            }
          } else {
            // This group is not present in the previous aggregates
            switch( operation ) {
              case 'remove': // Need to negate all measures, at least for sums
                for ( j = -1; ++j < ml; ) {
                  m = measures[ j ].id;
                  
                  switch( m.type ) {
                    case 'sum':
                      g[ m ] = -g[ m ];
                    break;
                    
                    case 'max':
                    case 'min':
                      g[ m ] = { removed: g[ m ] };
                    break;
                  }
                }
              break;
            }
            
            // Add this new group
            p0[ k1 ] = groups.length; // add position
            
            groups.push( h0[ k1 ] = g1 ); // set hash and add group
            
            keys0.push( k1 ); // add key
            
            added.push( g1 ); // emit an add() operation for this group
          }
        }
        
        return this.emit_operations( added, removed, updates, options );
      }; // merge()
      
      done && done.call( this );
      
      return this;
    }, // build_merge()
    
    /* -------------------------------------------------------------------------------------------
       add( values [, options ] )
    */
    add: function( values, options ) {
      options = XS.only_more( options );
      
      var a = this.aggregate( values );
      
      if ( this.aggregates ) return this.merge( a, options, 'add' );
      
      this.aggregates = a;
      
      return this.emit_add( a.groups || [], options );
    }, // add()
    
    /* -------------------------------------------------------------------------------------------
       remove( values [, options ] )
    */
    remove: function( values, options ) {
      var that = this;
      
      this.measures.fetch_all( function( measures ) {
        that.merge( that.aggregate( values ), XS.only_more( options ), 'remove' )
      } );
      
      return this;
    }, // remove()
    
    /* -------------------------------------------------------------------------------------------
       update( updates [, options ] )
    */
    update: function( updates, options ) {
      options = XS.only_more( options );
      
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
      
      // Merge previous and new values
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
            
            switch( m.type ) {
              case 'sum':
                g1[ m ] -= g0[ m ];
              break;
              
              // ToDo: max / min
            }
          }
        } else {
          for ( var j = -1, ml = measures.length; ++j < ml; ) {
            var m = measures[ j ].id;
            
            switch( m.type ) {
              case 'sum':
                g0[ m ] = -g0[ m ];
              break;
              
              // ToDo: max / min
            }
          }
          groups.push( h1[ k0 ] = g0 );
          
          keys1.push( k0 );
        }
      }
      
      // Merge with previous aggregates
      return this.merge( a1, options, 'update' );
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
