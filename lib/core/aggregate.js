/*  aggregate.js

    Copyright (c) 2013-2016, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'aggregate', [ './stateful' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , extend   = RS.extend
    , Code     = RS.Code
    , Loggable = RS.Loggable
    , Greedy   = RS.Greedy
    , Set      = RS.Set
    , Options  = RS.Transactions.Options
    , get_name = RS.get_name
    , clone    = extend.clone
    , de       = false
    , log      = RS.log.bind( null, 'aggregate' )
    , ug       = ug
  ;
  
  /* --------------------------------------------------------------------------
      Aggregate_Dimensions()
      
      Dimensions Input
  */
  function Aggregate_Dimensions( aggregate, options ) {
    var that = this;
    
    Loggable.call( that, options );
    
    that.aggregate = aggregate;
    
    that.input = null;
  } // Aggregate_Dimensions()
  
  Loggable.subclass( 'Aggregate_Dimensions', Aggregate_Dimensions, {
    set_input: function( input ) {
      this.input = input;
    }, // Aggregate_Dimensions..set_input()
    
    fetch_all: function( receiver ) {
      this.input.fetch_all( receiver );
    }, // Aggregate_Dimensions..fetch_all()
    
    build_group: function( dimensions ) {
      if ( ! dimensions.length )
        // ToDo: do not throw, emit error
        throw new Error( 'Aggregate_Dimensions.build_group(), needs at least one dimension' )
      ;
      
      var ids      = dimensions.map( function( d ) { return d.id } )
        , key_code = 'o[ "' + ids.join( '" ] + "_" + o[ "' ) + '" ]'
      ;
      
      var code = new Code( '_group' )
        ._function( 'this.aggregate._group', null, [ 'objects' ] )
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
        .end( '_group()' )
      ;
      
      eval( code.get() );
    } // Aggregate_Dimensions..build_group()
  } ); // Aggregate_Dimensions instance methods  
  
  var p = Aggregate_Dimensions.prototype;
  
  p._add = p._remove = p._update = function( _, options ) {
    if ( ! Options.has_more( options ) ) {
      var that = this;
      
      that.fetch_all( function( dimensions ) {
        that.build_group( dimensions );
        
        that.aggregate._dimensions_changed( dimensions, options );
      } );
    }
  }; // _add() / _remove() / _update()
  
  /* --------------------------------------------------------------------------
     Aggregate_Measures()
     
     Input for Measures
  */
  function Aggregate_Measures( aggregate, options ) {
    var that = this;
    
    Loggable.call( that, options.name );
    
    that.aggregate = aggregate;
    
    that.values = [];
  } // Aggregate_Measures()
  
  Loggable.subclass( 'Aggregate_Measures', Aggregate_Measures, {
    build_reduce_groups: function( measures, dimensions ) {
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
              // ToDo: do not throw, emit error
              throw new Error( get_name( that, 'build_reduce_groups' ) + 'unsupported aggregate type: ' + m.type  );
          } // end switch m.type
        } // end for all measures
      } // end if at least one measure
      
      var code = new Code()
        ._function( 'this.aggregate._reduce_groups', null, [ 'groups' ] )
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
        .end( '_reduce_groups()' )
      ;
      
      eval( code.get() );
    }, // Aggregate_Measures..build_reduce_groups()
    
    _update_measures: function( measures, options ) {
      if ( ! Options.has_more( options ) ) {
        var that = this;
        
        that.aggregate._dimensions.fetch_all( function( dimensions ) {
          that.build_reduce_groups( measures, dimensions );
          
          that.aggregate._measures_changed( measures, options );
        } );
      }
    }, // Aggregate_Measures.._update_measures()
    
    _add: function( added_measures, options ) {
      var that     = this
        , measures = that.values
      ;
      
      measures.push.apply( measures, clone( added_measures ) );
      
      that._update_measures( measures, options );
    }, // Aggregate_Measures.._add()
    
    _remove: function( removed_measures, options ) {
      var that     = this
        , measures = that.values
        , i        = -1
        , j
        , measure
        , m
      ;
      
      while ( measure = removed_measures[ ++i ] )
        for ( j = -1; m = measures[ ++j ]; )
          if ( measure.id == m.id ) {
            measures.splice( j, 1 );
            
            break;
          }
      
      that._update_measures( measures, options );
    }, // Aggregate_Measures.._remove()
    
    _update: function( updates, options ) {
      var that     = this
        , measures = that.values
        , i        = -1
        , j
        , update
        , m
      ;
      
      while ( update = updates[ ++i ] )
        for ( j = -1; m = measures[ ++j ]; )
          if ( update[ 0 ].id == m.id ) {
            extend( m, update[ 1 ] );
            
            break;
          }
      
      that._update_measures( measures, options );
    } // Aggregate_Measures.._update()
  } ); // Aggregate_Measures instance methods
  
  /* --------------------------------------------------------------------------
      @pipelet aggregate( measures, dimensions, options )
      
      @short Aggregates mesures from source values by dimensions
      
      @parameters
      - **measures** (Pipelet or Array of Objects): each measure is defined
        by attributes:
        - **id** (String): source attribute name
        
        - **type** (String): optional, tells how this measures aggregates
          values. Possible values are:
          - ```"sum"```: (default) Sum all values.
          - ```"min"```: Compute the minimum value (does not yet support updates)
          - ```"max"```: Compute the maximum value (does not yet support updates)
        
        - **default** (String): A default and start value for the aggregate.
          The default value of which depends on type. Note that these
          must be provided as strings, not numbers:
          - "sum": "0"
          - "min": "+Infinity"
          - "max": "-Infinity"
      
      - **dimensions** (Pipelet or Array of Objects): each dimension is
        defined by attributes:
        - **id** (String): source attribute name
      
      - **options** (Object): optional @@pipelet:set() options
      
      @examples
      Count the number of cities per state as well as total
      population by state:
      
      In SQL this typically be accomplished as:
      
      ```SQL
      SELECT state, count(*), sum( population )
      FROM cities
      GROUP BY state
      ```
      
      With aggregate() it can be accomplished as:
      
      ```JavaScript
      var population = [ { id: "population" } ]
        , by_state   = [ { id: 'state'      } ]
      ;
      
      cities
        .aggregate( population, by_state )
      ;
      ```
      
      Which emits values with the following attributes:
      - **state**: city state value
      - **population**: sum of population values for all cities in each
        unique state
      - **_count**: the number of cities in each state
      
      @description
      This is a @@synchronous, @@greedy, @@stateful pipelet.
      
      Groups source values by dimensions and compute aggregate measures
      for each group.
      
      This provides an equivalent to SQL ```GROUP BY``` clause.
  */
  function Aggregate( measures, dimensions, options ) {
    var that        = this
      , name
      , _dimensions
      , _measures
    ;
    
    Set.call( that, [], options );
    
    name = get_name( that );
    
    that._group = null; // Function generated by Aggregate_Dimensions()
    
    that._dimensions = _dimensions = new Aggregate_Dimensions( that, options );
    that._measures   = _measures   = new Aggregate_Measures  ( that, options );
    
    that._add_input( dimensions, Greedy.Input, name + '-dimensions', _dimensions );
    that._add_input( measures  , Greedy.Input, name + '-measures'  , _measures   );
  } // Aggregate()
  
  Set.Build( 'aggregate', Aggregate, {
    _get: function() {
      var aggregates = this._aggregates;
      
      return aggregates && aggregates.groups || [];
    }, // Aggregate..get()
    
    _dimensions_changed: function( dimensions, options ) {
      var that     = this
        , measures = that._measures
      ;
      
      // If this is the first time, duing initialization, measures is not defined yet
      if ( measures ) {
        measures.build_reduce_groups( measures.values, dimensions );
        
        that._rebuild_aggregates( options );
      }
    }, // Aggregate.._dimensions_changed()
    
    _measures_changed: function( measures, options ) {
      this._build_merge( measures );
      
      this._rebuild_aggregates( options );
    }, // Aggregate.._measures_changed()
    
    _rebuild_aggregates: function( options ) {
      var that = this;
      
      that._input._fetch( function( values ) {
        var aggregates = that._aggregates
          , ___
          , t
        ;
        
        if ( aggregates ) {
          // there were aggregates, remove these
          that._aggregates = ___;
          
          // get an ending transaction for 2 operations from options
          t = that._transaction( 2, options );
          
          that.__emit_remove( aggregates.groups, t.next().get_emit_options() );
          
          options = t.next().get_emit_options(); // also ends the transaction
        }
        
        that._add( values, options );
      } );
    }, // Aggregate.._rebuild_aggregates()
    
    /* ------------------------------------------------------------------------
       Aggregate.._aggregate( values )
       
       This is a low-level method used by _add / _remove / _update to
       calculate aggregates of an array of objects.
       
       Aggregates are calculated by reducing objects into groups of objects
       according to dimensions then reducing each object group into aggregates
       according to measures.
       
       These aggregates are then typically merged into the aggregate's
       previous aggregates, or removed from these if the action is _remove(),
       updates are not currently handled by this method.
       
       This function should not be used directly but could be overloaded by
       derived classes to change its behavior.
       
       Parameters:
         - values: an array of objects to aggregate measures by dimensions.
    */
    _aggregate: function( values ) {
      var reduce_groups = this._reduce_groups
        , group         = this._group
      ;
      
      return reduce_groups && group
          
          // Note: reduce_groups() and group() know their context
          && reduce_groups( group( values ) )
      ;
    }, // Aggregate.._aggregate()
    
    /* ------------------------------------------------------------------------
        Aggregate.._build_merge( measures )
        
        Builds _merge() method new measures
    */
    _build_merge: function( measures ) {
      this._merge = function( aggregates, options, operation ) {
        var ml       = measures.length
        
          , a        = this._aggregates
          , groups   = a.groups
          , keys0    = a.keys
          , h0       = a.hash
          , p0       = a.positions
          
          , keys1    = aggregates.keys
          , h1       = aggregates.hash
          
          , k1
          
          , g0, g1
          
          , added    = []
          , removed  = []
          , updates  = []
          
          , i, j, k
          
          , m, id, v0, p
        ;
        
        for ( i = -1; k1 = keys1[ ++i ]; ) {
          g0 = h0[ k1 ];
          g1 = h1[ k1 ];
          
          if ( g0 ) {
            switch( operation ) {
              case 'add': // can also remove groups using negative counts on updates
                g1._count += g0._count;
                
                for ( j = -1; ++j < ml; ) {
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
                g1._count = g0._count - g1._count;
                
                for ( j = -1; ++j < ml; ) {
                  m = measures[ j ];
                  id = m.id;
                  
                  switch( m.type ) {
                    case 'sum' :
                      g1[ id ] = g0[ id ] - g1[ id ];
                    break;
                    
                    case 'max':
                    case 'min':
                      // remove all values from g0[ id ] that are found in g1[ id ]
                      v0 = g0[ id ].slice( 0 ), v1 = g1[ id ];
                      
                      for ( k = 0, kl = v0.length; ++k < kl; ) {
                        v0.splice( v1.indexOf( v0[ k ] ), 1 ); 
                      }
                    break;
                  }
                } // end for all measures
              break;
            } // end switch operation
            
            p = p0[ k1 ];
            
            if ( g1._count ) {
              updates.push( [ g0, g1 ] );
              
              h0[ k1 ] = groups[ p ] = g1;
            } else {
              // All measures are set to zero, including counts, remove this group
              removed.push( g0 );
              
              delete h0[ k1 ];
              delete p0[ k1 ];
              
              keys0.splice( k1, 1 );
              
              groups.splice( p, 1 );
            }
          } else {
            // This group is not present in the previous aggregates
            switch( operation ) {
              case 'remove': // anti-group
                // ToDo: add tests for anti-groups
                for ( j = -1; m = measures[ ++j ]; ) {
                  id = m.id;
                  
                  switch( m.type ) {
                    case 'sum':
                      g1[ id ] = -g1[ id ];
                    break;
                    
                    case 'max':
                    case 'min':
                      g1[ id ] = { removed: g1[ id ] }; // not supported by add, ToDo: fix min/max support of anti-groups
                    break;
                  }
                }
              break;
            }
            
            // Add this new group
            add_group( groups, keys0, h0, p0, k1, g1 );
            
            added.push( g1 ); // emit an add() operation for this group
          }
        }
        
        // log( 'emit_operations', added, removed, updates );
        
        this.__emit_operations( added, removed, updates, options );
      }; // _merge()
    }, // Aggregate.._build_merge()
    
    /* ------------------------------------------------------------------------
        Aggregate.._add( values [, options ] )
    */
    _add: function( values, options ) {
      options = Options.forward( options );
      
      var that = this
        , a    = that._aggregate( values )
      ;
      
      if ( that._aggregates ) return that._merge( a, options, 'add' );
      
      // This is the first time we build or re-build aggregates
      that._aggregates = a;
      
      that.__emit_add( a.groups || [], options );
    }, // Aggregate.._add()
    
    /* ------------------------------------------------------------------------
        Aggregate.._remove( values [, options ] )
    */
    _remove: function( values, options ) {
      this._merge( this._aggregate( values ), Options.forward( options ), 'remove' )
    }, // Aggregate.._remove()
    
    /* ------------------------------------------------------------------------
        Aggregate.._update( updates [, options ] )
    */
    _update: function( updates, options ) {
      options = Options.forward( options );
      
      var that     = this
        , measures = that._measures.values
        , a0       = []
        , a1       = []
        , update
        , i
        , j
        , measure
        , id
        , k0
        , g0
        , g1
      ;
      
      // extract previous and new values in two separate arrays a0 and a1
      for ( i = -1; update = updates[ ++i ]; ) {
        a0.push( update[ 0 ] );
        a1.push( update[ 1 ] );
      }
      
      // Calculate aggregates for separate previous and new values
      a0 = that._aggregate( a0 );
      a1 = that._aggregate( a1 );
      
      // Merge previous and new values
      var keys0  = a0.keys
        , keys1  = a1.keys
        , groups = a1.groups
        , h0     = a0.hash
        , h1     = a1.hash
        , p1     = a1.positions
      ;
      
      for ( i = -1; k0 = keys0[ ++i ]; ) {
        g0 = h0[ k0 ];
        g1 = h1[ k0 ];
        
        if ( g1 ) {
          // updated group, compute measures differences
          g1._count -= g0._count;
          
          for ( j = -1; measure = measures[ ++j ]; ) {
            id = measure.id;
            
            switch ( measure.type ) {
              case 'sum':
                g1[ id ] -= g0[ id ];
              break;
              
              // ToDo: max / min
            }
          }
        } else {
          // removed group, will be added with negated values
          g0._count = -g0._count;
          
          for ( j = -1; measure = measures[ ++j ]; ) {
            id = measure.id;
            
            switch ( measure.type ) {
              case 'sum':
                g0[ id ] = -g0[ id ];
              break;
              
              // ToDo: max / min
            }
          }
          
          add_group( groups, keys1, h1, p1, k0, g0 );
        }
      }
      
      // Merge with previous aggregates
      // log( 'merge a1:', a1 );
      
      that._merge( a1, options, 'add' );
    } // Aggregate.._update()
  } ); // Aggregate instance methods
  
  /*
    add_group( groups, keys, hashes, positions, key, group )
    
    Helper function for Aggregate.._merge() and Aggregate.._update()
    
    - groups (Array of groups): group will be pushed to it
    - keys (Array of String): key will be pushed to it
    - hashes (Object): groups by key, { key: group } will be added to it
    - positions (Object): positions of groups in groups, { key: added_position } will be added to it
    - key (String): group's key, indexing hashes and positions
    - group (Object): to push to groups at new position in positions indexed by key and to add to hashes indexed by key
  */
  function add_group( groups, keys, hashes, positions, key, group ) {
    positions[ key ] = groups.push( hashes[ key ] = group ) - 1;
    
    keys.push( key );
  }
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.Aggregate         = Aggregate;
  Aggregate.Dimensions = Aggregate_Dimensions;
  Aggregate.Measures   = Aggregate_Measures;
  
  return rs;
} ); // aggregate.js
