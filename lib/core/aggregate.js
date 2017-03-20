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
  
  var RS              = rs.RS
    , extend          = RS.extend
    , Code            = RS.Code
    , Loggable        = RS.Loggable
    , Greedy          = RS.Greedy
    , Set             = RS.Set
    , Options         = RS.Transactions.Options
    , get_name        = RS.get_name
    , safe_string     = Code.safe_string
    , safe_identifier = Code.safe_identifier
    , clone           = extend.clone
    , de              = false
    , log             = RS.log.bind( null, 'aggregate' )
    , ug              = ug
    , default_s       = 'default'
    , push            = [].push
  ;
  
  /* --------------------------------------------------------------------------
      Aggregate_Dimensions()
      
      Dimensions Input
  */
  function Aggregate_Dimensions( aggregate, options ) {
    var that = this;
    
    Loggable.call( that, options.name );
    
    that.aggregate = aggregate;
    
    that.input = null;
  } // Aggregate_Dimensions()
  
  Loggable.subclass( 'Aggregate_Dimensions', Aggregate_Dimensions, {
    set_input: function( input ) {
      this.input = input;
    }, // Aggregate_Dimensions..set_input()
    
    fetch_safe: function( receiver ) {
      this.input.fetch_all( function( dimensions ) {
        receiver( dimensions.map( function( d ) { return safe_string( d.id ) } ) )
      } );
    }, // Aggregate_Dimensions..fetch_safe()
    
    build_group: function( safe_dimensions ) {
      if ( safe_dimensions.length ) {
        var safe_key_code = '"#" + v[ ' + safe_dimensions.join( ' ] + "#" + v[ ' ) + ' ]';
        
        var code = new Code( get_name( this, 'build_group' ) )
          ._function( 'this.aggregate._group', null, [ 'values' ] )
            ._var( 'groups = {}', 'keys = []', 'i = -1', 'v', 'k', 'g' )
            
            ._while( 'v = values[ ++i ]' )
              ._if( 'g = groups[ k = ' + safe_key_code + ' ]' )
                .add( 'g.push( v )' )
                .add( 'continue' )
              .end()
              
              .add( 'groups[ k ] = [ v ]' )
              .add( 'keys.push( k )' )
            .end()
            
            .add( 'return { groups: groups, keys: keys };' )
          .end( '_group()' )
          
          //.trace()
        ;
        
        eval( code.get() );
      } else {
        this.aggregate._group = function( values ) { return values }
      }
    } // Aggregate_Dimensions..build_group()
  } ); // Aggregate_Dimensions instance methods  
  
  var p = Aggregate_Dimensions.prototype;
  
  p._add = p._remove = p._update = function( _, options ) {
    if ( ! Options.has_more( options ) ) {
      var that = this;
      
      that.fetch_safe( function( safe_dimensions ) {
        that.build_group( safe_dimensions );
        
        that.aggregate._dimensions_changed( safe_dimensions, options );
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
    build_reduce_groups: function( measures, safe_dimensions ) {
      // ToDo: add tests for generated code safety against injection attacks
      
      var name               = get_name( this, 'build_reduce_groups' )
        
        // variables verified safe for evaluation
        // !!! keep these safe at all time by only combining with other safe variables
        , safe_ids           = []
        , safe_measures      = []
        , safe_measures_init = []
        , safe_first         = ''
        , safe_init
        , safe_measure
        , safe_value
        , safe_id
        , safe_dimension
        , safe_inner
        , safe_last
        , safe_vars
        , safe_code
        , safe_indent
        
        // other variables not safe for evaluation
        , ml                 = measures.length
        , dl                 = safe_dimensions.length
        , many_measures      = ml > 1 // ToDo: add test for many measures
        , many_dimensions    = dl > 1 // ToDo: add test for many dimensions
        , operations
        , i
        , measure
        , measure_id
        , measure_type
        , ___
      ;
      
      if ( ml ) {
        operations = {};
        
        for ( i = -1; measure = measures[ ++i ]; ) {
          safe_ids.push( safe_string( measure_id = measure.id ) );
          
          /* m: { id: 'price', type: 'sum', of: 'Price', default: 0, init: 0, no_null: false }
             
             All attributes are optional except id which must be unique. Optional attributes
             have the defaut values shown above.
          */
          
          operations[ measure_type = measure.type = measure.type || 'sum' ] = true;
          
          switch( measure_type ) {
            case 'max':
              safe_default_measure( measure, -Infinity ); // safe
              
              safe_init = []; // safe
            break;
            
            case 'min':
              safe_default_measure( measure, +Infinity ); // safe
              
              safe_init = []; // safe
            break;
            
            case 'sum':
              safe_default_measure( measure, 0 ); // safe
              
              safe_init = 0; // safe
            break;
            
            default:
              // ToDo: emit error
              log( name + 'unsupported measure type:', measure_type );
              
              continue;
          }
          
          safe_measures.push( safe_measure = safe_identifier( '_' + measure_id ) ); // safe
          
          safe_measures_init.push( safe_measure + ' = ' + safe_init ); // safe
          
          // Unrolled while content generation
          
          /* Access current value v:
                     g[ ++i ].Price  -- only one measure, when l == 1
             ( o = g[ ++i ] ).Price  -- only the first measure, when i == 0
                            o.Price  -- next iterations
          */
          safe_value = 'v = '
            + ( many_measures ? 0 == i ? '( o = g[ ++i ] )' : 'o' : 'g[ ++i ]' )
            + '[ ' + safe_string( measure.of || measure_id ) + ' ]'
          ; // safe
          
          // if values can be null or undefined, use default value
          measure.no_null || ( safe_value = '( u == ( ' + safe_value + ' ) ? ' + measure[ default_s ] + ' : v )' ); // safe
          
          switch( measure_type ) {
            case 'sum':
              safe_first += safe_measure + ' += ' + safe_value; // safe
              
              many_measures
                ? safe_first += ';' // safe
                
                : safe_inner = '+ ' + safe_value // safe
              ;
            break;
            
            case 'max':
            case 'min':
              if ( many_measures )
                safe_first += safe_measure + '.push( ' + safe_value + ' );' // safe
              
              else {
                safe_first = safe_measure + '.push( ' + safe_value; // safe
                
                safe_inner = ', ' + safe_value; // safe
                
                safe_last = ' )'; // safe
              }
          } // end switch m.type
        } // end for all measures
      } // end if at least one measure
      
      // Generate variables
      safe_vars = dl ? [ 'hash = {}', 'keys = groups.keys', 'j = -1', 'key', 'g' ] : []; // safe
      
      if ( many_dimensions || many_measures ) safe_vars.push( 'o' ); // safe
      
      if ( ml ) {
        //operations.max && safe_vars.push( 'max = Math.max' );
        //operations.min && safe_vars.push( 'min = Math.min' );
        
        push.apply( safe_vars, dl ? safe_measures : safe_measures_init ); // safe
        
        safe_vars.push( dl ? 'l' : 'l = g.length', dl ? 'i' : 'i = -1', 'v', 'u' ); // safe
      }
      
      safe_vars.push( dl ? 'out = []': 'out' ); // safe
      
      // Generate function _reduce_groups()
      safe_code = new Code( name )
        ._function( 'this.aggregate._reduce_groups', null, [ dl ? 'groups' : 'g' ] ) // safe
          ._var( safe_vars ) // safe
          
          dl && safe_code
          .add( 'groups = groups.groups', 1 ) // safe
          
          ._while( 'key = keys[ ++j ]' ) // safe
          
            .add( 'g = groups[ key ]', 1 ); // safe
            
            // aggregate measures
            if ( ml ) {
              dl && safe_code.add( safe_measures_init.join( ',' ) + ', l = g.length, i = -1', 1 ); // safe
              
              safe_code.unrolled_while( safe_first, safe_inner, safe_last ); // safe
            }
            
            // output group
            safe_code
            .line( dl ? 'out.push( hash[ key ] = {' : 'out = {' ); // safe
              // Add dimensions' coordinates
              safe_indent = '  ';
              
              if ( dl )
                for ( i = -1; safe_dimension = safe_dimensions[ ++i ]; )
                  safe_code.line( safe_indent
                    + safe_dimension + ': '
                    + ( i
                        ? 'o'
                        : many_dimensions ? '( o = g[ 0 ] )' : 'g[ 0 ]'
                      )
                    + '[ ' + safe_dimension + ' ]'
                    + ','
                  ); // safe
              
              else
                safe_code.line( safe_indent + 'id: 1,' ); // safe
              
              // Add aggregated measures
              if ( ml )
                for ( i = -1; ( safe_id = safe_ids[ ++i ] ) !== ___; )
                  safe_code.line( safe_indent + safe_id + ': ' + safe_measures[ i ] + ',' ); // safe
            
            safe_code
            .line( safe_indent + '_count: ' + ( ml ? 'l' : 'g.length' ) ) // safe
            
            .add( ( dl ? '} )' : '}' ), 1 ); // safe
          
          dl && safe_code.end(); // end while dimensions
          
          safe_code.add( 'return { groups: ' + ( dl
            ? 'out, keys: keys, hash: hash }'
            : '[ out ], keys: [ "1" ], hash: { 1: out } }'
          ) ) // safe
        .end( '_reduce_groups()' )
        
        //.trace()
      ;
      
      eval( safe_code.get() );
      
      function safe_default_measure( measure, value ) {
        if ( typeof measure[ default_s ] != 'number' ) measure[ default_s ] = value; // safe
      }
    }, // Aggregate_Measures..build_reduce_groups()
    
    _update_measures: function( measures, options ) {
      if ( ! Options.has_more( options ) ) {
        var that = this;
        
        that.aggregate._dimensions.fetch_safe( function( safe_dimensions ) {
          that.build_reduce_groups( measures, safe_dimensions );
          
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
          .aggregate( [ { id: "population" } ] )
        ;
        ```
        
        Which emits:
        - **id**: always ```1```
        - **population**: sum of population values for all cities
        - **_count**: total number of cities
      
      - Count the number of cities in the entire cities set:
      
        ```javascript
        cities
          .aggregate()
        ;
        ```
        
        Which emits:
        - **id**: always ```1```
        - **_count**: total number of cities
      
      @description
      This is a @@stateful, @@synchronous, @@greedy pipelet.
      
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
    
    that._group         = null; // Function generated by Aggregate_Dimensions()
    that._reduce_groups = null; // Function generated by Aggregate_Measures()
    
    that._dimensions = _dimensions = new Aggregate_Dimensions( that, options );
    that._measures   = _measures   = new Aggregate_Measures  ( that, options );
    
    that._add_input( dimensions || [], Greedy.Input, name + '-dimensions', _dimensions );
    that._add_input( measures   || [], Greedy.Input, name + '-measures'  , _measures   );
  } // Aggregate()
  
  Set.Build( 'aggregate', Aggregate, {
    _get: function() {
      var aggregates = this._aggregates;
      
      return aggregates && aggregates.groups || [];
    }, // Aggregate..get()
    
    _dimensions_changed: function( safe_dimensions, options ) {
      var that            = this
        , measures        = that._measures
        , measures_values = measures.values
      ;
      
      // If this is the first time, during initialization, measures values are not defined yet
      if ( measures_values ) {
        measures.build_reduce_groups( measures_values, safe_dimensions );
        
        that._input._fetch( function( values ) {
          var aggregates = that._aggregates
            , removes    = aggregates && aggregates.groups
          ;
          
          // ToDo: emit key change, should be used by a downstream set
          
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
          
          , all_default
          
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
            all_default = 1; // to account for anti-removes
            
            switch( operation ) {
              case 'add': // can also remove groups using negative counts on updates
                g1._count += g0._count;
                
                for ( j = -1; ++j < ml; ) {
                  m = measures[ j ];
                  id = m.id;
                  
                  switch( m.type ) {
                    case 'sum':
                      if ( ( g1[ id ] += g0[ id ] ) != m[ default_s ] ) all_default = 0;
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
                      if ( ( g1[ id ] = g0[ id ] - g1[ id ] ) != m[ default_s ] ) all_default = 0;
                    break;
                    
                    case 'max':
                    case 'min':
                      // remove all values from g0[ id ] that are found in g1[ id ]
                      v0 = g0[ id ].slice( 0 );
                      v1 = g1[ id ];
                      
                      for ( k = 0, kl = v0.length; ++k < kl; )
                        v0.splice( v1.indexOf( v0[ k ] ), 1 )
                      ;
                      
                      if ( v0.length ) all_default = 0;
                    break;
                  }
                } // end for all measures
              break;
            } // end switch operation
            
            // locate position of k1 in keys0 (which should also be the position of g0 in groups)
            j = keys0.indexOf( k1 );
            
            if ( g1._count || ! all_default  ) {
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
                g1._count = -g1._count;
                
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
