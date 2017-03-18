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
  
  var RS        = rs.RS
    , extend    = RS.extend
    , Code      = RS.Code
    , Loggable  = RS.Loggable
    , Greedy    = RS.Greedy
    , Set       = RS.Set
    , Options   = RS.Transactions.Options
    , get_name  = RS.get_name
    , clone     = extend.clone
    , de        = false
    , log       = RS.log.bind( null, 'aggregate' )
    , ug        = ug
    , default_s = 'default'
    , push      = [].push
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
      if ( dimensions.length ) {
        // ToDo: review possible injection attacks, and mitigate any
        // ToDo: restrict dimension ids to [0-9_a-zA-Z]+ implement as RS.Code static method
        var ids      = dimensions.map( function( d ) { return d.id } )
          , key_code = '"#" + v[ "' + ids.join( '" ] + "#" + v[ "' ) + '" ]'
        ;
        
        var code = new Code( '_group' )
          ._function( 'this.aggregate._group', null, [ 'values' ] )
            ._var( 'groups = {}', 'keys = []', 'i = -1', 'v', 'k', 'g' )
            
            ._while( 'v = values[ ++i ]' )
              ._if( 'g = groups[ k = ' + key_code + ' ]' )
                .add( 'g.push( v )' )
                .add( 'continue' )
              .end()
              
              .add( 'groups[ k ] = [ v ]' )
              .add( 'keys.push( k )' )
            .end()
            
            .add( 'return { groups: groups, keys: keys };' )
          .end( '_group()' )
        ;
        
        eval( code.get() );
      } else
        this.aggregate._group = function( values ) { return values }
      ;
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
    
    that.values = null;
  } // Aggregate_Measures()
  
  function get_values( that ) {
    return that.values || ( that.values = [] );
  } // get_values()
  
  Loggable.subclass( 'Aggregate_Measures', Aggregate_Measures, {
    // ToDo: review possible injection attacks, and mitigate any
    build_reduce_groups: function( measures, dimensions ) {
      var ml              = measures.length
        , dl              = dimensions.length
        , many_measures   = ml > 1
        , many_dimensions = dl > 1
        , ids             = []
        , dimension_ids   = []
        , measures_vars   = []
        , init_measures   = []
        , first           = ''
        , operations
        , i
        , m
        , measure_var
        , u, v
        , id
        , d
        , inner, last
        , vars
        , code
        , indent
      ;
      
      if ( ml ) {
        operations = {};
        
        for ( i = -1; m = measures[ ++i ]; ) {
          ids.push( id = m.id );
          
          /* m: { id: 'price', type: 'sum', of: 'Price', default: 0, init: 0, no_null: false }
             
             All attributes are optional except id which must be unique. Optional attributes
             have the defaut values shown above.
          */
          
          operations[ m.type || ( m.type = 'sum' ) ] = true;
          
          switch( m.type ) {
            case 'max':
              default_measure( m, -Infinity );
              
              m.init = [];
            break;
            
            case 'min':
              default_measure( m, +Infinity );
              
              m.init = [];
            break;
            
            case 'sum':
              default_measure( m, 0 );
              
              m.init = 0;
            break;
            
            default:
              // ToDo: emit error
              log( get_name( that, 'build_reduce_groups' ) + 'unsupported measure type:', m.type );
              
              continue;
          }
          
          measure_var = '_' + id;
          
          dl && measures_vars.push( measure_var );
          
          init_measures.push( measure_var + ' = ' + m.init );
          
          // Unrolled while content generation
          
          /* Access current value v:
                     g[ ++i ].Price  -- only one measure, when l == 1
             ( o = g[ ++i ] ).Price  -- only the first measure, when i == 0
                            o.Price  -- next iterations
          */
          v = 'v = ' + ( many_measures ? 0 == i ? '( o = g[ ++i ] ).' : 'o.' : 'g[ ++i ].' ) + ( m.of || id );
          
          // if values can be null or undefined, use default value
          m.no_null || ( v = '( u == ( ' + v + ' ) ? ' + m[ default_s ] + ' : v )' );
          
          switch( m.type ) {
            case 'sum':
              first += '_' + id + ' += ' + v;
              
              many_measures
                ? first += ';'
                
                : inner = '+ ' + v
              ;
            
            break;
            
            case 'max':
            case 'min':
              if ( many_measures )
                first += ' _' + id + '.push( ' + v + ' );'
                
              else {
                first = '_' + id + '.push( ' + v;
                
                inner = ', ' + v;
                
                last = ' )';
              }
          } // end switch m.type
        } // end for all measures
      } // end if at least one measure
      
      // Generate variables
      vars = dl ? [ 'hash = {}', 'keys = groups.keys', 'j = -1', 'key', 'g' ] : [];
      
      if ( many_dimensions || many_measures ) vars.push( 'o' );
      
      if ( ml ) {
        //operations.max && vars.push( 'max = Math.max' );
        //operations.min && vars.push( 'min = Math.min' );
        
        push.apply( vars, dl ? measures_vars : init_measures );
        
        vars.push( dl ? 'l' : 'l = g.length', dl ? 'i' : 'i = -1', 'v', 'u' );
      }
      
      vars.push( dl ? 'out = []': 'out' );
      
      // Generate function _reduce_groups()
      code = new Code()
        ._function( 'this.aggregate._reduce_groups', null, [ dl ? 'groups' : 'g' ] )
          ._var( vars )
          
          dl && code
          .add( 'groups = groups.groups', 1 )
          
          ._while( 'key = keys[ ++j ]' )
          
            .add( 'g = groups[ key ]', 1 );
            
            // aggregate measures
            if ( ml ) {
              dl && code.add( init_measures.join( ',' ) + ', l = g.length, i = -1', 1 );
              
              code.unrolled_while( first, inner, last );
            }
            
            // output group
            code
            .line( dl ? 'out.push( hash[ key ] = {' : 'out = {' );
              // Add dimensions' coordinates
              indent = '  ';
              
              if ( dl )
                for ( i = -1; d = dimensions[ ++i ]; )
                  code.line( indent + d.id + ': '
                    + ( i == 0 ? ( many_dimensions ? '( o = g[ 0 ] )' : 'g[ 0 ]' ) : 'o' )
                    + '.' + d.id + ','
                  );
              
              else
                code.line( indent + 'id: 1,' );
              
              // Add aggregated measures
              if ( ml )
                for ( i = -1; ( id = ids[ ++i ] ) !== u; )
                  code.line( indent + id + ': _' + id + ',' );
            
            code
            .line( indent + '_count: ' + ( ml ? 'l' : 'g.length' ) )
            .add( ( dl ? '} )' : '}' ), 1 );
          
          dl && code.end(); // end while dimensions
          
          code.add( 'return { groups: ' + ( dl
            ? 'out, keys: keys, hash: hash }'
            : '[ out ], keys: [ "1" ], hash: { 1: out } }'
          ) )
        .end( '_reduce_groups()' )
      ;
      
      console.log( code.get() );
      
      eval( code.get() );
      
      function default_measure( measure, value ) {
        if ( typeof measure[ default_s ] != 'number' ) measure[ default_s ] = value;
      }
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
        , measures = get_values( that )
      ;
      
      push.apply( measures, clone( added_measures ) );
      
      that._update_measures( measures, options );
    }, // Aggregate_Measures.._add()
    
    _remove: function( removed_measures, options ) {
      var that     = this
        , measures = get_values( that )
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
        , measures = get_values( that )
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
      - **measures** (Pipelet or Array of Objects): optional.
        If no measure is defined, only ```_count``` is computed.
        Measure ```_count```, always computed, counts the number of source
        values in each dimension group.
        Each measure is defined by attributes:
        - **id** (String): measure attribute name
        
        - **of** (String): source attribute name, default is the value
        of ```id```.
        
        - **type** (String): optional, tells how this measures aggregates
        values. Possible values are:
          - ```"sum"```: (default) Sum all values.
          - ```"min"```: Compute the minimum value
            (WIP, not tested, no updtae support)
          - ```"max"```: Compute the maximum value
            (WIP, not tested, no update support)
        
        - **default** (Number): A default value for the aggregate when
        a value is ```null``` or ```undefined``` and option ```no_null```
        is falsy.
        The default value of which depends on type:
          - ```"sum"```: 0
          - ```"min"```: +Infinity
          - ```"max"```: -Infinity
        
        - **no_null** (Boolean):
          - ```true```: source dataflow should not countain any ```null```
          or ```undefined``` values.
          This is a performance optimization allowing to compute sums faster.
          
          - ```false```: (default), ```null``` and ```undefined``` values are
          replaced with ```default``` value.
      
      - **dimensions** (Pipelet or Array of Objects): optional.
        If no dimension is defined, a single group with ```{ id: 1 }``` is
        emitted, aggregating all source values.
        Each dimension is defined by attributes:
        - **id** (String): source attribute name
      
      - **options** (Object): optional @@pipelet:set() options.
      
      @examples
      - Count the number of cities per state as well as total
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
      
      - Count population and number of cities in entire cities
      set:
      
        ```javascript
        cities
          .aggregate( [ { id: "population" } ], [] )
        ;
        ```
        
        Which emits:
        - **id**: always ```1```
        - **population**: sum of population values for all cities
        - **_count**: total number of cities
      
      - Count the number of cities in the entire cities set:
      
        ```javascript
        cities
          .aggregate( [], [] )
        ;
        ```
        
        Which emits:
        - **id**: always ```1```
        - **_count**: total number of cities
      
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
    
    // ToDo: allow measures and dimensions to be null or undefined, replace by []
    
    that._add_input( dimensions, Greedy.Input, name + '-dimensions', _dimensions );
    that._add_input( measures  , Greedy.Input, name + '-measures'  , _measures   );
  } // Aggregate()
  
  Set.Build( 'aggregate', Aggregate, {
    _get: function() {
      var aggregates = this._aggregates;
      
      return aggregates && aggregates.groups || [];
    }, // Aggregate..get()
    
    _dimensions_changed: function( dimensions, options ) {
      var that            = this
        , measures        = that._measures
        , measures_values = measures.values
      ;
      
      // If this is the first time, during initialization, measures values are not defined yet
      if ( measures_values ) {
        measures.build_reduce_groups( measures_values, dimensions );
        
        that._input._fetch( function( values ) {
          var aggregates = that._aggregates
            , removes    = aggregates && aggregates.groups
          ;
          
          that._aggregates = aggregates = that._aggregate( values );
          
          that.__emit_operations( aggregates.groups, removes, 0, options );
        } );
      }
    }, // Aggregate.._dimensions_changed()
    
    _measures_changed: function( measures, options ) {
      var that       = this
        , aggregates = that._aggregates
      ;
      
      that._build_merge( measures );
      
      that._input._fetch( function( values ) {
        var b  = that._aggregates = that._aggregate( values )
          , h0
          , h1
        ;
        
        if ( aggregates ) {
          // there were previous aggregates, emit an update of all groups
          h0 = aggregates.hash;
          h1 = b.hash;
          
          that.__emit_update(
            b.keys.map( function( key ) { return [ h0[ key ], h1[ key ] ] } ),
            options
          );
        } else
          // ToDo: add test for no previous aggregates on measures change
          that.__emit_add( b.groups, options )
        ;
      } );
    }, // Aggregate.._measures_changed()
    
    /* ------------------------------------------------------------------------
       Aggregate.._aggregate( values )
       
       This is a low-level method used by _add / _remove / _update to
       calculate aggregates of an array of values.
       
       Aggregates are calculated by reducing values into groups of values
       according to dimensions then reducing each object group into aggregates
       according to measures.
       
       These aggregates are then typically merged into the aggregate's
       previous aggregates, or removed from these if the action is _remove(),
       updates are not currently handled by this method.
       
       This function should not be used directly but could be overloaded by
       derived classes to change its behavior.
       
       Parameters:
         - values: an array of values to aggregate measures by dimensions.
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
          
          , keys1    = aggregates.keys
          , h1       = aggregates.hash
          
          , k1
          
          , g0, g1
          
          , adds     = []
          , removes  = []
          , updates  = []
          
          , i, j, k
          
          , m, id, kl, v0, v1
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
                      v0 = g0[ id ].slice( 0 );
                      v1 = g1[ id ];
                      
                      for ( k = 0, kl = v0.length; ++k < kl; )
                        v0.splice( v1.indexOf( v0[ k ] ), 1 )
                      ; 
                    break;
                  }
                } // end for all measures
              break;
            } // end switch operation
            
            // locate position of k1 in keys0 (which should also be the position of g0 in groups)
            j = keys0.indexOf( k1 );
            
            if ( g1._count ) {
              updates.push( [ g0, g1 ] );
              
              h0[ k1 ] = groups[ j ] = g1;
            } else {
              // The are no-more any upstream values, remove this group
              removes.push( g0 );
              
              delete h0[ k1 ];
              
              keys0 .splice( j, 1 );
              groups.splice( j, 1 );
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
            add_group( groups, keys0, h0, k1, g1 );
            
            // emit an add() operation for this group
            adds.push( g1 );
          }
        }
        
        // log( 'emit_operations', adds, removes, updates );
        
        this.__emit_operations( adds, removes, updates, options );
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
      
      that.__emit_add( a.groups, options );
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
        , measures = get_values( that._measures )
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
          
          add_group( groups, keys1, h1, k0, g0 );
        }
      }
      
      // Merge with previous aggregates
      // log( 'merge a1:', a1 );
      
      that._merge( a1, options, 'add' );
    } // Aggregate.._update()
  } ); // Aggregate instance methods
  
  /* --------------------------------------------------------------------------
    @function add_group( groups, keys, hashes, key, group )
    
    @short Helper for @@method:Aggregate.._merge() and
    @@method:Aggregate.._update().
    
    @parameters
    - **groups** (Array of groups): ```group``` will be pushed to it.
    - **keys** (Array of String): ```key``` will be pushed to it.
    - **hashes** (Object): groups by key, ```{ key: group }``` will be added
      to it.
    - **key** (String): group's key, indexing hashes.
    - **group** (Object): to push to ```groups``` and to ```hashes```
      indexed by ```key```
  */
  function add_group( groups, keys, hashes, key, group ) {
    groups.push( hashes[ key ] = group );
    
    keys.push( key );
  } // add_group()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.Aggregate         = Aggregate;
  Aggregate.Dimensions = Aggregate_Dimensions;
  Aggregate.Measures   = Aggregate_Measures;
  
  return rs;
} ); // aggregate.js
