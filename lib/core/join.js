/*  join.js
    
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
    Distributable incremental joins.
*/    
( this.undefine || require( 'undefine' )( module, require ) )()
( 'join', [ './order' ], function( rs ) {
  'use strict';
  
  var RS               = rs.RS
    , extend           = RS.extend
    , extend_2         = RS.extend
    , Code             = RS.Code
    , safe_attribute   = Code.safe_attribute
    , safe_dereference = Code.safe_dereference
    , Plug             = RS.Plug
    , Plug_p           = Plug.prototype
    , Pipelet          = RS.Pipelet
    , Order            = RS.Order
    , Greedy           = RS.Greedy
    , is_array         = RS.is_array
    , log              = RS.log.bind( null, 'join' )
    , log_s            = RS.log.s
    , ug               = log
    , de               = false
  ;
  
  /* --------------------------------------------------------------------------
      Joins are a major feature of relational databases, and a consequence of
      normalization.
      
      Most charded, and so-called NoSQL, databases try to avoid joins favoring
      denormalized schemas. The idea of building applications with no joins at
      all is very attractive and provides for simplified programming while
      greatly simplifying charded database implementations.
      
      However, many applications cannot be practically designed with no joins
      at all, and in some cases, the resulting duplication of data can become
      detrimental to desirable network performance especially over the
      internet between a mobile client and a server.
      
      For these reasons, Toubkal comes with a full set of inner, left, right
      and full outer joins that can be used both server-side for complex
      applications, and client-side to optimize network performance and data
      caching or simply out of design and productivity considerations.
      
      Toubkal joins are incrementally updated for maximum performances on
      updates.
  */
  
  /* --------------------------------------------------------------------------
      @pipelet join( b, on, merge, options )
      
      @short Joins source and ```b``` sets ```on``` condition, using ```merge()```
      
      @parameters
      - b              (Pipelet): dataflow to join with ```a``` (source dataflow)
      
      - on (Array of conditions): define which values of ```a``` should be merged with values of ```b```.
                                  See conditions definition bellow.
      
      - merge         (Function): function( a_value, b_value ), called to merge matching values
                                  from ```a``` and ```b```. See below for important details.
      
      - options: (Object):
        - key (Array of Strings): the list of attributes of merged values that define unique output
                                  values, defaults to ```a``` key.
        
        - left         (Boolean): all values from ```a``` will produce at least one merged value even if
                                  there are no matching value in ```b```. Defaults to false.
        
        - right        (Boolean): all values from ```b``` will produce at least one merged value even if
                                  there are no matching value in ```a```. Defaults to false.
        
        - outer        (Boolean): means full outer join, simulataneously "right" and "left" join,
                                  this is a shortcut for "left" and "right" set to true. Defaults
                                  to false.
        
        - no_filter (Boolean): when true, prevents join() from filtering
          ```a``` with ```b```. Defaults to false which means that if possible
          join() will filter ```a``` with ```b``` in order to reduce the
          amount of data subscribed from ```a```. Filtering is done only if
          the join is either an inner or right join, i.e. no filtering is
          done if the this is a left or full outer join.
        
        - concurrent (Object): if ```a``` and ```b``` are @@concurrent,
          their @@tag MUST be specified using this option, e.g.:
          
          ```javascript
            a.join( b, [ 'id' ] { concurrent: { tag_name: true } };
          ```
      
      @examples
      
      - 1. Add employee's first name and last name to all sales from the "sales" dataflow for which
        employee id is found in the "employees" dataflow.
        
        ```javascript
          sales.join( employees, [ [ 'employee_id', 'id' ] ], function( sale, employee ) {
          
            if ( employee ) { // may be undefined because this is a left join
              return employee ? extend( {
                employee_first_name: employee.first_name,
                employee_last_name : employee.last_name
              }, sale ) : sale;
            }
            
            return sale;
            
          }, { key: [ 'id' ], left: true } )
        ```
        
        The unique key is comprised only of the sales "id" because output values are still sales.
      
      - 2. For employees of the "employees" dataflow which have sales, output sales with employee
        first and last name.
        
        ```javascript
          sales.join( employees, [ [ 'employee_id', 'id' ] ], function( sale, employee ) {
          
            return extend( {
              employee_first_name: employee.first_name,
              employee_last_name : employee.last_name
            }, sale );
            
          }, { key: [ 'id' ] )
        ```
        
        The main difference in the definition of this join with the previous example, is that this
        is an inner join (options left is not defined). Therefore "employee" of the merge function
        is always defined and does not need to be tested.
        
        The performance profile of this join is also significantly different than in the previous
        example as sales are subscribed-to only for existing employees reducing the amount of data
        pulled from the "sales" dataflow.
      
      - 3. For all sales and all employees, output sales with employees' first and last name when
        available or employees with no sales:
        
        ```javascript
          sales.join( employees, [ [ 'employee_id', 'id' ] ], function( sale, employee ) {
          
            if ( employee ) { // may be undefined because this is a left join
              return extend( {
                employee_first_name: employee.first_name,
                employee_last_name : employee.last_name
              }, sale );
            }
            
            return sale;
            
          }, { key: [ 'id', 'employee_id' ], outer: true )
        ```
        
        This is now an outer join, employees are not (and cannot be) used to filter sales.
        
        Key attributes now include "employee_id" to garanty unicity of the join output values
        for employees with no sales.
        
        In the merge function:
        - Employee's presence must be tested.
        
        - Sale's presence does not need to be tested because extend() allows undefined parameters,
          and sale id can be undefined since the output of join() can emit at most one non-matching
          output value per input value.
        
      - 4. For all employees, get sales, or no sales:
        
        ```javascript
          sales.join( employees, [ [ 'employee_id', 'id' ] ], function( sale, employee ) {
          
            if ( employee ) { // may be undefined because this is a left join
              return extend( {
                employee_first_name: employee.first_name,
                employee_last_name : employee.last_name
              }, sale );
            }
            
            return sale;
            
          }, { key: [ 'id', 'employee_id' ], right: true )
        ```
        
        This is a right join, filtering sales by existing employees.
        
        Key attributes include "employee_id" to garanty unicity of the join output values
        for employees with no sales.
      
      @description
      
      Joins ```a``` (source) and ```b``` dataflows using merge() much like SQL joins
      would merge records from two tables.
      
      The type of join is defined in options, default is an inner join.
      
      ### On conditions
      
      The ```on``` condition is an Array of and-conditions, i.e. all conditions must be met for the
      on condition to succeed. Each condition applies to individual attributes of the source set
      or the 'b' set. A condition can be specified as:
      - A string representing the name of an attribute present in both 'a' and 'b'. The
        condition matches for all values for which the attribute name has the same value in
        'a' and 'b'.
        
      - An Array of two attribute names, where the first element is an attribute name in 'a'
        and the second an attribute name in 'b'. The condition matches for values where there
        the values of these respective attributes in 'a' and 'b' are equal.
      
      ### Merge function
      
      The merge() function is called when there is a match on the join condition or no match for
      outer joins requiring values from ```a```, ```b```, or ```a``` and ```b``` to be merged into output values.
      
      The signature of merge() is:
      
      ```javascript
        ( Object a_value, Object b_value ) -> Object merged_value
      ```
      
      Where:
      - a_value is an Object from ```a```
      - b_value is an Object from ```b```
      
      Merged values returned by merge() must have a unique key to allow remove and update
      operations or when the join is a left, right or full outer join. The only case where merged
      values do not require a unique key is on inner joins where both ```a``` and ```b``` never remove
      values.
      
      !!! Warning: merge() should not mutate a_value or b_value. Mutating a_value or b_value
      will produce side-effects that would most likely cause incorrect future results.
      
      The function merge() must be purely functional, i.e. given the same parameter values it
      should always return the same value.
      
      On an inner join (options left, right, and outer are falsy), both a_value and b_value will
      always be defined, and merge() will be called at least once for each unique tupple in ```a```
      and ```b``` as defined by conditions.
      
      On a left join, b_value may be undefined if there is no match in ```b``` for a value of ```a```.
      
      On a right join, a_value may be undefined if there is no match in ```a``` for a value of ```b```.
      
      On outer joins a_value or b_value maybe undefined but at least one of them will be defined.
      
      When a_value or b_value is undefined, merge() returned values must remain consistent with the
      output schema of the join, i.e. values should have the same unique key as when both a_value
      and b_value are defined. However an attribute of that key may be null or undefined as long as
      this does not break the uniqueness of output values defined by key attributes.
      
      ### Memory usage
      
      Join is stateless on its output and stateful on its inputs meaning it does not need any
      cache on its inputs.
      
      An output cache is usually not necessary unless downstream dataflow graph is updated at a
      high rate requiring many fetch() operations which will run a bulk join from ```a``` and ```b```.
      
      ### Performance profile
      
      Semantically speaking, ```a``` and ```b``` along with corresponding
      left and right options and ```merge()``` parameters' order, can be
      swapped, i.e. join() can be considered commutative, semantically.
      
      However, swapping has a significantly different performance profile
      because:
      - ```b``` WILL BE used as a filter of ```a``` when this is not a left
        join and unless option no_filter is true
      - ```a``` IS NEVER used as a filter of ```b```
      
      This ```b``` filter does more than in-place filtering, it is also a
      dynamic query that subscribe to a subset of the ```a``` dataflow.
      
      Therefore when ```a``` is filtered by ```b```, while ```a``` holds a
      much larger dataset than ```b```, the amount of data subscribed from
      ```a``` may be significantly reduced, improving both latency,
      cpu-usage, and if ```a``` is accessed over a network, bandwidth
      usage.
      
      Converselly, if ```b``` is a larger dataset than ```a``` performances
      may be lower than if ```b``` is not used as a filter.
      
      Rules of thumb:
      - Just as with pipelet filter(), where the source dataflow is filtered
        using a datafow as first parameter, the source dataflow of join(),
        may be filtered only by its first parameter.
        
      - In order to optimally benefit from automatic subscription filters,
        one should usually use the larger dataset as a source of the join
        (the ```a``` dataflow) and the smaller dataset as a filter
        parameter (the ```b``` dataflow) of the join.
      
      - If a dataflow graph already filters the ```a``` dataflow or when
        automatic filtering is undesired for any reason, use option
        ```"no_filter"``` to disable filtering.
      
      ### Implementation
      
      To simplify the implementation we split the join between two sets into
      two half-joins. Each half join maintains an ordered representation of
      one of the sets which is used as a filter to the other set.
      Pipelet union() is then used to merge the two half-joins into the
      joined output.
  */
  rs.Compose( 'join', function( a, b, on, merge, options ) {
    var merge_type = typeof merge;
    
    merge_type == 'function' ||
      fatal( 'expected merge() to be a function, got a(n) ' + merge_type + ', merge: ' + log_s( merge ) )
    ;
    
    options = extend_2( {}, options );
    
    if( options.outer ) {
      options.left = true;
      options.right = true;
    }
    
    var rs         = a.namespace()
    
      , left       = !!options.left
      , right      = !!options.right
      
      , a_parsed   = parse_conditions( on, 0 )
      , b_parsed   = parse_conditions( on, 1 )
      
      , name       = options.name
      //, debug      = name == 'books_authors'
      , fork_tag
      , tag        = options.tag
      , concurrent = options.concurrent
    ;
    
    // Transactions tag and concurrent options will be used only by union
    delete options.tag;
    delete options.concurrent;
    
    if ( ! options.no_filter && ! left ) {
      // Dynamically filter a with b
      
      /*
        When b is updated, a is first be modified by filter(), which may get
        the left half join to emit then the right half join may further emit.
        
        Therefore, an update on b may result in a transaction fork that
        needs to be synchronized back at the output union.
      */
      
      if( ! Object.keys( concurrent || {} ).length ) {
        // a and b are not yet concurrently tagged upstream
        b = b.pass_through( { fork_tag: fork_tag = name } );
        
        concurrent = {}; // Don't add fork_tag yet, it is not concurrent in filter() bellow
      }
      
      a = a
        .filter(
        
          b.map( function( value ) { // ToDo: use modified pick (handling aliases): b.pick( b_parsed._attributes )
            var v = {}
              , attributes = b_parsed._attributes
              , i = -1
              , attribute
            ;
            
            while( attribute = attributes[ ++i ] )
              v[ attribute[ 0 ] ] = value[ attribute[ 1 ] ]
            ;
            
            return v;
          }, { name: name + '-filter_map' } )
          
          ,
          
          { name: name + '-filter', concurrent: concurrent }
        )
      ;
      
      if( fork_tag ) {
        // a and b are not concurrently tagged upstream
        // but now they will be at union() bellow using fork_tag
        concurrent = {};
        concurrent[ fork_tag ] = true;
      }
    } // if ! no_filter && ! left
    
    var options_a = extend( {}, options, { name: name + '-left' , all: left , other_all: right } )
      , options_b = extend( {}, options, { name: name + '-right', all: right, other_all: left  } )
      , options_u = extend( {}, options, { name: name + '-union', tag: fork_tag } )
      
      , a_locator = a
        //.debug( debug && name + '-a' )
        .join_locator( b_parsed, extend( {}, options, { name: name + '-left_locator'  } ) )
        
      , b_locator = b
        //.debug( debug && name + '-b' )
        .join_locator( a_parsed, extend( {}, options, { name: name + '-right_locator' } ) )
      
        // half-joins require their source to be an "up-to-date" locator
        // !!! Warning half_join() is strongly coupled with join_locator() OO fashion, cannot be easily distributed
      , _a = a_locator
        .half_join( a_locator, 0, b_locator, merge, options_a )
        //.debug( debug && name + ' left half'  )
      
      , _b = b_locator
        .half_join( b_locator, 1, a_locator, merge, options_b )
        //.debug( debug && name + ' right half' )
      
      , union = rs.union( [ _a, _b ], options_u )
    ;
    
    // ToDo: implement routing of concurrent by Controllet
    return concurrent
      ? union.pass_through( { concurrent: concurrent, name: name + '-concurrent-pass_through' } )
      : union
    ;
    
    function parse_conditions( on, position ) {
      var organizer  = []
        , attributes = []
        , renames    = 0
        , type
        , l
      ;
      
      is_array( on ) || bad_parameter( 'conditions to be an Array, got a(n) ' + Object.prototype.toString.call( on ) );
      
      ( l = on.length ) || bad_parameter( 'at least one condition' );
      
      for ( var i = -1; ++i < l; ) {
        var c = on[ i ], id1, id2;
        
        switch( typeof c) {
          case 'string':
            id1 = id2 = c;
            
            c = { id: c };
          break;
          
          case 'object':
            if ( is_array( c ) ) {
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
          bad_parameter( 'String or Object or Array for condition: ' + log_s( c ) );
        }
        
        organizer.push( c );
        
        attributes.push( [ id1, id2 ] );
      } // for all conditions
      
      var parsed = { organizer : organizer, _attributes: attributes };
      
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
          return safe_attribute( a[ 0 ] ) + ': v' + safe_dereference( a[ 1 ] )
        } )
        
        .join( ', ' ) + ' }'
      ;
      
      var locate = new Code( '_locate' )
      
        ._function( 'this._locate', null, [ 'values', 'options' ] )
          ._var( 'v', 'out = []', 'l = values.length', 'i = -1' )
          
          .unrolled_while( 'out.push( ' + attributes, ', ' + attributes, ')' )
          
          .add( 'return this.locate( out.sort( this.sorter ), options ).map( function( v ) { v.o = v.o.__v; return v } )' )
        .end()
        
        //.trace()
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
  
  function Half_Join_Output_Source( pipelet, transform, name ) {
    var that = this;
    
    Plug.call( that, pipelet, { name: name + '-output_source' } );
    
    that.source = pipelet._input;
    
    that._transform = transform;
  }
  
  Plug.subclass( 'Half_Join_Output_Source', Half_Join_Output_Source, {
    _fetch: function( receiver ) {
      Plug_p._fetch.call( this, receiver );
    },
    
    update_upstream_query: function() {}
  } );
  
  /* -------------------------------------------------------------------------------------------
      half_join( source_locator, position, locator, merge, output, options )
      
      Parameters:
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
    var that      = this
      , output
      , transform
    ;
    
    Greedy.call( that, options );
    
    output = that._output;
    
    that._source_locator = source_locator;
    that._position       = position;
    that._locator        = locator;
    that._merge          = merge;
    
    if ( position ) {
      // This is the right half
      if ( that._options.all ) {
        // This is a right outer join or a full outer join
        // We need to fetch right values which have no left match
        transform = non_matching;
      } else {
        // This is an inner join or a left outer join
        // We do not need to provide any right value because all matching right values will be included from the left half-join
        output.fetch_unfiltered = nul_fetch;
      }
    } else {
      // This is the left half
      transform = matching;
    }
    
    if ( transform )
      output.source = new Half_Join_Output_Source( that, transform, options.name );
    ;
    
    function nul_fetch( receiver ) {
      receiver( [], true );
    } // nul_fetch()
    
    function non_matching( values ) {
      var ___
        , merge     = that._merge
        , position  = that._position
        , locations = that._locator._locate( values )
        , l         = locations.length
        , i         = -1
        , out       = []
      ;
      
      while ( ++i < l ) {
        var _l = locations[ i ];
        
        if ( _l.position === ___ ) {
          var v = _l.o;
          
          var merge_without_match = position ? merge( ___, v ) : merge( v );
          
          out.push( merge_without_match );
        }
      }
      
      return out;
    } // non_matching()
    
    function matching( values ) {
      var ___
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
          var merge_without_match = position ? merge( ___, v ) : merge( v );
          
          out.push( merge_without_match );
        }
      }
      
      return out;
    } // matching()
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
      
      this.__emit_operations( adds, u, updates, options );
      
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
      
      this.__emit_operations( u, removes, updates, options );
      
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
