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
( 'aggregate', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS      = rs.RS
    , extend  = RS.extend
    , Code    = RS.Code
    , Pipelet = RS.Pipelet
    , Greedy  = RS.Greedy
    , Query   = RS.Query
    , Set     = RS.Set
    , Options = RS.Transactions.Options
    , de      = false
    , log     = RS.log.bind( null, 'aggregate' )
    , ug      = ug
  ;
  
  /* --------------------------------------------------------------------------
     Aggregate_Dimensions()
     
     ToDo: transform Aggregate_Dimensions() into an Greedy Input
  */
  function Aggregate_Dimensions( aggregate, dimensions, options ) {
    var that   = this
      , output = dimensions._output
    ;
    
    Greedy.call( that, options );
    
    that.aggregate = aggregate;
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    that.dimensions = dimensions;
    
    that._add_source( dimensions );
    
    function fetch_unfiltered( receiver ) {
      output
        ? output._fetch( receiver )
        : receiver( dimensions, true )
      ;
    } // fetch_unfiltered()
  } // Aggregate_Dimensions()
  
  Greedy.subclass( 'Aggregate_Dimensions', Aggregate_Dimensions, {
    build_group: function( dimensions, done ) {
      if ( dimensions.length == 0 )
        throw new Error( 'Aggregate_Dimensions.build_group(), needs at least one dimension' )
      ;
      
      var ids      = dimensions.map( function( d ) { return d.id } )
        , key_code = 'o[ "' + ids.join( '" ] + "_" + o[ "' ) + '" ]'
      ;
      
      var code = new Code( 'group' )
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
        .end( 'group()' )
      ;
      
      eval( code.get() );
      
      done && done.call( this, dimensions );
    } // build_group()
  } ); // Aggregate_Dimensions instance methods  
  
  var p = Aggregate_Dimensions.prototype;
  
  p._add = p._remove = p._update = function( _, options ) {
    if ( options && options._t && options._t.more ) return;
    
    var that = this;
    
    that._output.fetch_all( function( dimensions ) {
      that.build_group( dimensions, function( dimensions ) {
        that.aggregate.dimensions_changed( dimensions );
      } );
    } );
  }; // _add() / _remove() / _update()
  
  /* --------------------------------------------------------------------------
     Aggregate_Measures()
     
     ToDo: transform into an Input
  */
  function Aggregate_Measures( aggregate, measures, options ) {
    var that   = this
      , output = measures._output
    ;
    
    Greedy.call( that, options );
    
    that.aggregate = aggregate;

    that._output.fetch_unfiltered = fetch_unfiltered;
    
    that.measures = measures;
    
    that._add_source( measures );
    
    function fetch_unfiltered( receiver ) {
      output
        ? output._fetch( receiver )
        : receiver( measures, true )
      ;
    } // fetch_unfiltered()
  } // Aggregate_Measures()
  
  Greedy.subclass( 'Aggregate_Measures', Aggregate_Measures, {
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
    } // build_reduce_groups()
  } ); // Aggregate_Measures instance methods
  
  p = Aggregate_Measures.prototype;
  
  p._add = p._remove = p._update = function( _, options ) {
    if ( options && options._t && options._t.more ) return;
    
    var that = this;
    
    that._output.fetch_all( fetch_aggregates );
    
    function fetch_aggregates( measures ) {
      that.aggregate._dimensions._output.fetch_all( function( dimensions ) {
        that.build_reduce_groups( measures, dimensions, function() {
          that.aggregate.measures_changed( measures, dimensions );
        } );
      } );
    }
  }; // _add(), _remove(), _update()
  
  /* --------------------------------------------------------------------------
      @pipelet aggregate( measures, dimensions, options )
      
      @short Aggregates mesures from source values by dimensions
      
      @parameters
      - **measures** (Pipelet or Array): each measure is defined by attributes:
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
      
      - **dimensions** (Pipelet or Array): each dimension is defined by
        attributes:
        - **id** (String): source attribute name
      
      - **options** (Object): optional @@pipelet:set() options
      
      @description
      This is a @@synchronous, @@greedy, @@stateful pipelet.
      
      Groups source values by dimensions and compute aggregate measures
      for each group.
      
      This provides an equivalent to SQL ```GROUP BY``` clause.
      
      Example: Count the number of cities per state as well as total
      population by state:
      
      In SQL:
      
      ```SQL
      SELECT state, count(*), sum( population ) FROM cities GROUP BY state
      ```
      
      Which can be accomplished with ```aggregate()```:
      
      ```JavaScript
      cities.aggregate( [ { id: "population" } ], [ { id: 'state' } ] )
      ```
      
      Which emits values with the following attributes:
      - **state**: city state value
      - **population**: sum of population values for all cities in each
        unique state
      - **_count**: the number of cities in each state
  */
  function Aggregate( measures, dimensions, options ) {
    var that = this;
    
    Set.call( that, [], options );
    
    that._group = null; // Function generated by Aggregate_Dimensions()
    
    // ToDo: Aggregate_Dimensions and Aggregate_Measures should become Inputs
    that._dimensions = new Aggregate_Dimensions( that, dimensions, options );
    that._measures   = new Aggregate_Measures  ( that, measures  , options );
  } // Aggregate()
  
  function rebuild_aggregates() {
    var that = this;
    
    // ToDo: update with only differences, in a transaction
    
    if ( that.aggregates ) {
      // there were aggregates, _clear these
      // ToDo: don't use clear, use remove with transactional fetch
      that._clear();
    }
    
    that._input._fetch( function( values ) {
      // ToDo: use transactional fetch
      values && values.length && that.add( values );
    } );
  } // rebuild_aggregates()
  
  Set.Build( 'aggregate', Aggregate, {
    _get: function() {
      var aggregates = this.aggregates;
      
      return aggregates && aggregates.groups || [];
    }, // get()
    
    dimensions_changed: function( dimensions ) {
      // If this is the first time, duing initialization, measures is not defined yet
      var that      = this
        , _measures = that._measures
      ;
      
      if ( _measures ) {
        _measures._output.fetch_all( function( measures ) {
          _measures.build_reduce_groups( measures, dimensions, rebuild_aggregates.bind( that ) );
        } );
      }
    }, // dimensions_changed()
    
    measures_changed: function( measures, dimensions ) {
      this.build_merge( measures, rebuild_aggregates.bind( this ) );
    }, // measures_changed()
    
    /* ------------------------------------------------------------------------
       aggregate( values )
       
       Aggregate is a low-level method used by _add / _remove / _update to
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
    aggregate: function( values ) {
      return this.reduce_groups && this._group
        ? this.reduce_groups( this._group( values ) )
        : this
      ;
    }, // aggregate()
    
    /* ------------------------------------------------------------------------
       _clear()
    */
    _clear: function( options ) {
      this.aggregates = undefined;
      
      return this.__emit_clear( options );
    }, // _clear()
    
    /* ------------------------------------------------------------------------
        build_merge( measures, done )
        
        Builds merge() method new measures
    */
    build_merge: function( measures, done ) {
      this.merge = function( aggregates, options, operation ) {
        var ml       = measures.length
        
          , a        = this.aggregates
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
      }; // merge()
      
      done && done.call( this );
    }, // build_merge()
    
    /* ------------------------------------------------------------------------
       _add( values [, options ] )
    */
    _add: function( values, options ) {
      options = Options.forward( options );
      
      var that = this
        , a    = that.aggregate( values )
      ;
      
      if ( that.aggregates ) return that.merge( a, options, 'add' );
      
      // This is the first time we build aggregates
      that.aggregates = a;
      
      that.__emit_add( a.groups || [], options );
    }, // _add()
    
    /* ------------------------------------------------------------------------
       _remove( values [, options ] )
    */
    _remove: function( values, options ) {
      this.merge( this.aggregate( values ), Options.forward( options ), 'remove' )
    }, // _remove()
    
    /* ------------------------------------------------------------------------
       _update( updates [, options ] )
    */
    _update: function( updates, options ) {
      var that = this;
      
      that._measures._output.fetch_all( update_with_measures )
      
      function update_with_measures( measures ) {
        options = Options.forward( options );
        
        var a0      = []
          , a1      = []
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
        a0 = that.aggregate( a0 );
        a1 = that.aggregate( a1 );
        
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
        
        that.merge( a1, options, 'add' );
      } // update_with_measures()
    } // _update()
  } ); // Aggregate instance methods
  
  /*
    add_group( groups, keys, hashes, positions, key, group )
    
    Helper function for Aggregate..merge() and Aggregate.._update()
    
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
  
  Aggregate.Dimensions = Aggregate_Dimensions;
  Aggregate.Measures   = Aggregate_Measures;
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Aggregate': Aggregate
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // aggregate.js
