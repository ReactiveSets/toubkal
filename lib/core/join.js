/*  join.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
    Distributable incremental joins.
    
    ---
    
    Joins are a major feature of relational databases, and a consequence of normalization.
    
    Most charded, and so-called NoSQL, databases try to avoid joins favoring denormalized
    schemas. The idea of building applications with no joins at all is very attractive
    and provides for simplified programming while greatly simplifying charded database
    implementations.
    
    However, many applications cannot be practically designed with no joins at all, and
    in some cases, the resulting duplication of data can become detrimental to desirable
    network performance especially over the internet between a mobile client and a server.
    
    For these reasons, Toubkal comes with a full set of inner, left, right and full outer
    joins that can be used both server-side for complex applications, and client-side to
    optimize network performance and data caching or simply out of design and productivity
    considerations.
    
    Toubkal joins are incrementally updated for maximum performances on updates.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'join', [ './order' ], function( rs ) {
  'use strict';
  
  var RS      = rs.RS
    , extend  = RS.extend
    , Code    = RS.Code
    , Pipelet = RS.Pipelet
    , Order   = RS.Order
    , Greedy  = RS.Greedy
    , Query   = RS.Query
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, log = RS.log, ug = log.bind( null, 'join' );
  
  /* -------------------------------------------------------------------------------------------
     a.join( b, on, merge, options )
     
     Join a and b dataflows using merge(). The type of join is defined in options, default is
     inner join.
     
     Join is stateless on its output and stateful on its inputs meaning it does not need any
     cache on its inputs. An output cache is usually not necessary unless downstream dataflow
     graph is updated at a high rate requiring many fetch().
     
     Parameters:
     - b (Pipelet): to join with 'a' (the source)
     
     - on (Array of conditions): the condition of the join, conditions definition bellow
     
     - merge (Function): function( a_value, b_value ) where a_value is an Object from the 'a'
       set, and b_value is an Object from the 'b' set that match the join condition.
       
       For a left join, b_value may be undefined, likewise, a_value may be undefined for
       a right join.
       
       The merge function must return an Object for the destination set and should
       alter neither a_value nor b_value. Altering a_value or b_value will produce
       side-effects on upstream dataflows.
         
     - options: (Object):
       - key (Array of Strings): Mandatory, the key for merged values
       
       - left  (Boolean): all values from a will produce at least one merged value even if
                there are no matching value in b
                
       - right (Boolean): all values from b will produce at least one merged value even if
                there are no matching value in a
                
       - outer (Boolean): means right and left join
     
     The 'on' condition is an Array of and-conditions, i.e. all conditions must be met for the
     on condition to succeed. Each condition applies to individual attributes of the source set
     or the 'b' set. A condition can be specified as:
     - A string representing the name of an attribute present in both 'a' and 'b'. The
       condition matches for all values for which the attribute name has the same value in
       'a' and 'b'.
       
     - An Array of two attribute names, where the first element is an attribute name in 'a'
       and the second an attribute name in 'b'. The condition matches for values where there
       the values of these respective attributes in 'a' and 'b' are equal.
         
     Example: add employee's first name and last name to sales from employee_id left joined on
       employee's id:
       
       sales.join( employees, [ [ 'employee_id', 'id' ] ], function( sale, employee ) {
         if ( employee ) { // may be undefined because this is a left join
           return extend( {
             employee_first_name: employee.first_name,
             employee_last_name : employee.last_name
           }, sale );
         }
         
         return sale;
       }, { key: [ 'id', 'employee_id' ], left: true } )
     
     Implementation:
     --------------
     To simplify the implementation we split the join between two sets into two half-joins.
     Each half join maintains an ordered representation of one of the sets which is used
     as a filter to the other set. A Union of these two half-joins provides for join.
     
     ToDo: use filter() from one of the sets to load the other set only partially.
     Doing so would allow to to have only one of the sets to be stateful as well as
     improve network efficiency, loading only the filtered portion of the other set.
  */
  Pipelet.Compose( 'join', function( a, b, on, merge, options ) {
    var type = typeof merge;
    
    type === 'function' || fatal( 'expected merge() to be a function, got a(n) ' + type + ', merge: ' + log.s( merge ) );
    
    if ( options.outer ) options = extend( { left: true, right: true }, options );
    
    var name = options.name
    
      , left  = !!options.left
      , right = !!options.right
      
      , options_a = extend( {}, options, { name: name + '_left' , all: left , other_all: right } )
      , options_b = extend( {}, options, { name: name + '_right', all: right, other_all: left  } )
      
      , a_parsed = parse_conditions( on, 0 )
      , b_parsed = parse_conditions( on, 1 )
      
      , a_locator = a.join_locator( b_parsed, options_a )
      , b_locator = b.join_locator( a_parsed, options_b )
      
        // half-joins require their source to be an "up-to-date" locator
        // !!! Warning half_join() is strongly coupled with join_locator() OO fashion, cannot be easily distributed
      , _a = a_locator
        //.trace( name + ' left half'  )
        .half_join( a_locator, 0, b_locator, merge, options_a )
        
      , _b = b_locator
        //.trace( name + ' right half' )
        .half_join( b_locator, 1, a_locator, merge, options_b )
      
      , union = rs.union( [ _a, _b ], extend( {}, options, { name: name + '_union' } ) )
    ;
    
    return union;
    
    function parse_conditions( on, position ) {
      var organizer  = []
        , attributes = []
        , renames = 0
        , type = toString.call( on )
        , l = on.length
      ;
      
      type !== '[object Array]' && bad_parameter( 'conditions to be an Array, got a(n) ' + type );
      
      l || bad_parameter( 'at least one condition' );
      
      for ( var i = -1; ++i < l; ) {
        var c = on[ i ], id1, id2;
        
        switch( typeof c) {
          case 'string':
            id1 = id2 = c;
            
            c = { id: c };
          break;
          
          case 'object':
            if ( c instanceof Array ) {
              id1 = c[ position ^ 1 ];
              id2 = c[ position     ];
              
              /* Object identifiers are not documented and not tested, so the following code is commented-out for now
              
              // Providing objects allows to specify a descending order which has consequences on the order of output operations
              // Although this does not guaranty the strict order of the joined set which always remains unordered.
              // If order() organizers had other attributes in the future this feature may become useful and fully exposed
              
              if ( typeof id2 == 'object' ) id2 = id2.id;
              
              if ( typeof id1 == 'object' ) {
                c = id1;
                
                id1 = id1.id;
              } else {
                c = { id: id1 };
              }
              */
              
              ( type = typeof id1 ) === 'string' || bad_identifier();
              ( type = typeof id2 ) === 'string' || bad_identifier();
              
              c = { id: id1 };
              
              if ( id1 != id2 ) ++renames;
              
              break;
            /* Commented-out for the same reason as above } else {
              id1 = id2 = c.id;*/
            }
          
          default:
          bad_parameter( 'String or Object or Array for condition: ' + log.s( c ) );
        }
        
        organizer.push( c );
        
        attributes.push( [ id1, id2 ] );
      } // for all conditions
      
      var parsed = { organizer : organizer };
      
      if ( renames ) parsed.attributes = attributes;
      
      de&&ug( 'parse_conditions(), parsed:', parsed );
      
      return parsed;
      
      function bad_identifier() {
        bad_parameter( 'identifier to be a string, got a(n) ' + type + ', in condition: [ '+ c.join( ', ' ) + ' ]' )
      }
      
      function bad_parameter( message ) {
        fatal( 'parse conditions, expected ' + message );
      }
    } // parse_conditions()
    
    function fatal( message ) {
      throw new Error( 'join(), ' + message );
    }
  } ); // join()
  
  /* -------------------------------------------------------------------------------------------
     join_locator( parsed_conditions, options )
     
     Parameters:
     - parsed_conditions (Object):
       - organizer (Array of Objects): for order(), each object contains:
         - id (String): attribute name to order by
                                       
       - attributes (optional Array or Array):
         - 0 (String): attribute name in source
         - 1 (String): attribute name in values to locate
  */
  function Join_Locator( parsed_conditions, options ) {
    Order.call( this, parsed_conditions.organizer, options );
    
    this._make_locate( parsed_conditions.attributes );
  } // Join_Locator()
  
  Order.Build( 'join_locator', Join_Locator, {
    _make_locate: function( attributes ) {
      if ( ! attributes ) return;
      
      // Some attributes need to be renamed before locate is called
      attributes = '{ __v: ( v = values[ ++i ] ), ' + attributes
        .map( function( a ) {
          return a[0] + ': v.' + a[ 1 ]
        } )
        
        .join( ', ' ) + ' }'
      ;
      
      var locate = new Code( '_locate' )
      
        ._function( 'this._locate', null, [ 'values', 'options' ] )
          ._var( 'v', 'out = []', 'l = values.length', 'i = -1' )
          
          .unrolled_while( 'out.push( ' + attributes, ', ' + attributes, ')' )
          
          .add( 'return this.locate( out.sort( this.sorter ), options ).map( function( v ) { v.o = v.o.__v; return v } )' )
        .end()
      ;
      
      eval( locate.get() );
      
      //de&&ug( 'join.._locate: ' + this._locate );
    }, // _make_locate()
    
    _locate: function( values, options ) {
      // Shallow copy values before sort
      // de&&ug( this._get_name( '__locate' ) + ', values:', values, ', options:', options );
      
      return this.locate( values.slice( 0 ).sort( this.sorter ), options ); 
    } // _locate()
  } ); // join_locator()
  
  /* -------------------------------------------------------------------------------------------
     half_join( source_locator, position, locator, merge, output, options )
     
     Paramters:
     - source_locator (Join_Locator): the source locator, used as an Object for _locate()
                                      !!! Warning: strong coupling required
                                      
     - position            (Integer): 0 for left half, 1 for right half
     
     - locator        (Join Locator): the other locator, used as an Object for _locate()
                                      !!! Warning: strong coupling required
     
     - merge              (Function): see join() for details
     
     - options              (Object): pipelet options:
       - all (Boolean): true if this half is an outer join and should include all incomming
                        values even when there is no match on locator
  */
  function Half_Join( source_locator, position, locator, merge, options ) {
    Greedy.call( this, options );
    
    var that = this;
    
    that._source_locator = source_locator;
    that._position       = position;
    that._locator        = locator;
    that._merge          = merge;
    
    that._output._fetch = pick_fetch();
    
    function pick_fetch() {
      var fetch;
      
      if ( position ) {
        // This is the right half
        if ( that._options.all ) {
          // This is a right outer join or a full outer join
          // We need to fetch right values which have no left match
          fetch = non_matching_fetch;
        } else {
          // This is an inner join or a left outer join
          // We do not need to provide any right value because all matching right values will be included from the left half-join
          fetch = nul_fetch;
        }
      } else {
        fetch = left_fetch;
      }
      
      return fetch;
    } // pick_fetch()
    
    function nul_fetch( receiver ) {
      receiver( [], true );
    } // nul_fetch()
    
    function non_matching_fetch( receiver, query ) {
      var filter = query && ( new Query( query ).generate().filter );
      
      that._input.fetch_source( non_matching );
      
      function non_matching( values, no_more ) {
        var u
          , merge     = that._merge
          , position  = that._position
          , locations = that._locator._locate( values )
          , l         = locations.length
          , i         = -1
          , out       = []
        ;
        
        while ( ++i < l ) {
          var _l = locations[ i ];
          
          if ( _l.position === u ) {
            var v = _l.o;
            
            var merge_without_match = position ? merge( u, v ) : merge( v );
            
            out.push( merge_without_match );
          }
        }
        
        if ( filter ) out = filter( out );
        
        receiver( out, no_more );
      } // non_matching()
    } // non_matching_fetch()
    
    function left_fetch( receiver, query ) {
      var filter = query && ( new Query( query ).generate().filter );
      
      that._input.fetch_source( matching );
      
      function matching( values, no_more ) {
        var u
          , merge     = that._merge
          , position  = that._position
          , all       = that._options.all
          , locations = that._locator._locate( values, { all: true } )
          , l         = locations.length
          , i         = -1
          , out       = []
        ;
        
        while ( ++i < l ) {
          var _l      = locations[ i ]
            , v       = _l.o
            , matches = _l.all_matches
          ;
          
          if ( matches ) {
            for ( var j = -1, ml = matches.length; ++j < ml; ) {
              var match = matches[ j ]
                , merged = position ? merge( match, v ) : merge( v, match )
              ;
              
              out.push( merged );
            }
          } else if ( all ) {
            var merge_without_match = position ? merge( u, v ) : merge( v );
            
            out.push( merge_without_match );
          }
        }
        
        if ( filter ) out = filter( out );
        
        receiver( out, no_more );
      } // matching()
    } // left_fetch()
  } // Half_Join()
  
  Greedy.Build( 'half_join', Half_Join, {
    _add: function( values, options ) {
      var u
        , all        = this._options.all
        , other_all  = this._options.other_all
        , merge      = this._merge
        , position   = this._position
        , source     = this._source_locator
        , locations  = this._locator._locate( values, { all: true } )
        , l          = locations.length
        , _locations = options && options.locations
        , i          = -1
        , match_keys = {}
        , adds       = []
        , updates    = []
      ;
      
      if ( _locations ) delete options.locations;
      
      // de&&ug( get_name( this ) + 'options locations:', _locations );
      
      // Merge joined values
      while ( ++i < l ) { // all locations
        var _l      = locations[ i ]
          , value   = _l.o
          , matches = _l.all_matches
        ;
        
        if ( matches ) {
          var j  = -1
            , ml = matches.length
          ;
          
          while ( ++j < ml ) {
            var match            = matches[ j ]
              , merged           = position ? merge( match, value ) : merge( value, match )
            ;
            
            if ( other_all // The other half join requires all
                 // Find out if we need to remove merge_match_only before adding back merged value and match
              && first_seen( match_keys, match )
              && ( ! _locations // source set was empty, all matches had previously no match
                || source._locate( [ match ], { all: true                } )[ 0 ].all_matches.length
                  == ( l == 1 ? 1 :
                   source._locate( [ match ], { all: true, state: values } )[ 0 ].all_matches.length
                  )
              )
            ) {
              // There was previously no match so we had merge_match_only added and it must now be removed
              var merge_match_only = position ? merge( match ) : merge( u, match );
              
              // de&&ug( get_name( this ) + ', merge_match_only:', merge_match_only, ', match', match );
              
              updates.push( [ merge_match_only, merged ] );
            } else {
              adds.push( merged );
            }
          } // while there are matches
        } else if ( all ) { // no match
          var merge_without_match = position ? merge( u, value ) : merge( value );
          
          adds.push( merge_without_match );
        }
      } // while there are locations
      
      // ToDo: transactions
      updates.length && this.__emit_update( updates, options );
      adds   .length && this.__emit_add   ( adds   , options );
      
      return this;
      
      function get_name( that ) {
        return that._get_name( '_add' );
      }
    }, // _add()
    
    _remove: function( values, options ) {
      var u
        , equals     = RS.value_equals
        , all        = this._options.all
        , other_all  = this._options.other_all
        , merge      = this._merge
        , position   = this._position
        , source     = this._source_locator
        , locations  = this._locator._locate( values, { all: true } )
        , l          = locations.length
        , _locations = options && options.locations
        , i          = -1
        , match_keys = {}
        , removes    = []
        , updates    = []
      ;
      
      if ( _locations ) delete options.locations;
      
      // Merge joined values
      while ( ++i < l ) { // all locations
        var _l      = locations[ i ]
          , value   = _l.o
          , matches = _l.all_matches
        ;
        
        if ( matches ) {
          var j  = -1
            , ml = matches.length
          ;
          
          while ( ++j < ml ) {
            var match            = matches[ j ]
              , merged           = position ? merge( match, value ) : merge( value, match )
            ;
            
            // de&&ug( get_name( this ) + 'removed merge:', merged );
            
            if ( other_all
              && first_seen( match_keys, match )
              && ! ( source.a.length // don't bother locating if there are no more values in source state
                && source._locate( [ match ], { all: true } )[ 0 ].all_matches
              )
            ) {
              // There are no-longer any match on source for this match
              // We need to add back merge_match_only
              var merge_match_only = position ? merge( match ) : merge( u, match );
              
              updates.push( [ merged, merge_match_only ] );
            } else {
              removes.push( merged );
            }
          } // while there are matches
        } else if ( all ) { // no match
          var merge_without_match = position ? merge( u, value ) : merge( value );
          
          removes.push( merge_without_match );
        }
      } // while there are locations
      
      // ToDo: transactions
      removes.length && this.__emit_remove( removes, options );
      updates.length && this.__emit_update( updates, options );
      
      return this;
      
      function get_name( that ) {
        return that._get_name( '_remove' );
      }
    } // _remove()
  } ); // Half_Join instance methods
  
  /* ----------------------------------------------------------------------------------------------
     first_seen( keys, value )
     
     Test if this is the first time that Object value has been seen as memorized in keys.
     
     Assumes that all values have the same schema for this keys and that all attributes in these
     values are in the same order.
     
     Helper function used by half_join.._add() and half_join.._remove()
     
     Parameters:
     - keys  (Object): value keys already seen
     - value (Object): tested object which key will be computed as the concatenation of all its
                       attributes values to form a "unique" key if a) all values have the same
                       schema and b) all attributes in values are in the same order.
     
     Returns Boolean:
     - true : Object value key was not in keys and was added to keys
     - false: Object value key was already in keys
  */
  function first_seen( keys, v ) {
    var p, key = '';
    
    for( p in v ) key += '#' + v[ p ];
    
    return keys[ key ] ? false : keys[ key ] = true;
  } // first_seen()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Half_Join': Half_Join
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // join.js
