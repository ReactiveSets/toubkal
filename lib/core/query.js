/*  query.js
    
    Copyright (c) 2013-2018, Reactane
    
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

/* -------------------------------------------------------------------------------------------
    Queries:
    -------
    
    Queries allow to fetch, and subscribe to, subsets from upstream pipelets dataflows,
    reducing both upstream bandwidth requirements and latencies.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'query', [ './RS' ], function( RS ) {
  'use strict';
  
  // ToDo: split into Query and Query_Tree, export as seperate repository
  
  var _log             = RS.log
    , log              = _log.bind( null, 'query' )
    , pretty           = _log.pretty
    , subclass         = RS.subclass
    , Loggable         = RS.Loggable
    , get_name         = RS.get_name
    , extend           = RS.extend
    , extend_2         = extend._2
    , is_object        = RS.is_object
    , is_array         = RS.is_array
    , is_date          = RS.is_date
    , is_number        = RS.is_number
    , is_string        = RS.is_string
    , is_regexp        = RS.is_regexp
    , Code             = RS.Code
    , safe_value       = Code.safe_value
    , safe_identifier  = Code.safe_identifier
    , safe_dereference = Code.safe_dereference
    , equals           = RS.value_equals
    , Dictionary       = RS.Dictionary
    
    , slice            = [].slice
    , push             = [].push
    
    , toString         = {}.toString
    
    , stringify        = JSON.stringify
    , object_s         = 'object'
    
    , ___ // undefined
  ;
  
  /* --------------------------------------------------------------------------
      de&&ug()
  */
  log.s = _log.s;
  
  var de = false, ug = log;
  
  /* --------------------------------------------------------------------------
      @term query
      
      @short
      An expression to query, and subscribe to, sets
      
      @description
      A query is defined using a JavaScript Array of Objects representing an
      OR-expression where each Object is an operand of the OR-expression.
      
      Each Object itseft represents an AND-expression where each property
      is an operand of the AND expression.
      
      Queries are "injected" into Toubkal programs using Pipelet filter()
      and implemented in Class Query().
      
      For example, the Toubkal query:
      ```javascript
        [
          { flow: 'users' , id:       1092                      },
          { flow: 'stores', id:       231                       },
          { flow: 'sales' , store_id: 231, year: [ '>=', 2013 ] }
        ]
      ```
      
      Is equivalent to the following JavaScript boolean expression on a
      value *v* (parentheses added to emphasize similarity with
      corresponding Objects in the expression above):
      ```javascript
           ( v.flow === 'users'  && v.id       === 1092                  )
        || ( v.flow === 'stores' && v.id       === 231                   )
        || ( v.flow === 'sales'  && v.store_id === 231 && v.year >= 2013 )
      ```
      
      Which is also equivalent to SQL where clause:
      ```
        WHERE ( flow = "users"  AND id       = 1092                 )
           OR ( flow = 'stores' AND id       = 231                  )
           OR ( flow = 'sales'  AND store_id = 231 AND year >= 2013 )
      ```
      
      Note the use of OR and AND operators and how they relate to the
      Array of Object expression. Also note how the inequality for the
      year attribute of the *sales* dataflow is expressed.
      
      So a query is code expressed with JavaScript Arrays of Objects. With
      Toubkal, these expressions become dataflows, enabling reactive
      filters.
      
      Queries are used to retrieve, and subscribe to, subsets of values
      from source dataflows.
      
      A query can be "ORed" with another query to retrieve the union of two
      or more subsets. This is useful to merge a number of branches and build
      an optimized query for all these branches.
      
      The OR operation is provided by Query..add() which adds expressions
      into an existing query. The resulting query is optimized to remove
      redundant expressions. More details in Query..add().
      
      Query..remove() allows to do the opposite of or-operations, effecitvely
      removing or-expressions from an existing query and possibly
      de-optimizing it.
      
      A query can be "ANDed" with an other query to retrieve the intersection
      of two or more subsets. This is useful to restrict one query by another
      one when two filters are connected one downstream of the other.
      A use case if for combining an authorization query with a user
      query requesting a subset of what this user is authorized to request.
      
      "Anding" queries is provided by Query..and(). 
      
      Last, but not least, multiple queries can be combined to produce and
      maintain in realtime an optimized query tree to allow fast dispatching
      of a dataflow to many clients each with a different query filtering
      what it processes.
      
      A query is an OR-expression expressed using an Array of expressions,
      e.g. [ expression_1, expression_2, ... ]
      means "expression_1 OR expression_2".
      
      Each expression in a query is an AND-expression expressed using a
      JavaScript Object where each attribute / value pair represents a term,
      e.g. { a_1: v_1, a_2: v_2, ... }
      which means "a_1 == v_1 AND a_2 == v_2 AND ...".
      
      Terms can express more than simple equality conditions using JavaScript
      Arrays as values, e.g. year: [ '>=', 2013 ] means "year >= 2013" which
      general form is:
      
        attribute: [ operator, value ]
      
      Meaning "( attribute operator value ) == true".
      
      More complex expressions can be expressed such as the two equivalent
      expressions:
        year: [ '>=', 2009, '&&', '<=', 2012 ]
        
        year: [ 'in', 2009, 2010, 2011, 2012 ]
      
      Which both mean "year >= 2009 AND year <= 2012".
      
      The following:
        year: [ '<=', 2005, '||', '>=', 2009, '&&', '<=', 2012 ]
      
      Means "year <= 2005 OR ( year >= 2009 AND year <= 2012 )".
      
      When grouping is required, one can use additional nested Arrays, e.g.:
        year: [ [ 'in', 2009, 2010, 2011, 2012 ], '||', '<=', 2005 ]
      
      Which means "year in [ 2009, 2010, 2011, 2012 ] OR year <= 2005".
      
      When expressions involve more than one attribute, these can be
      specified using the '_' operator, e.g. "sales / count > 1000" can be
      expressed as:
      
        sales: [ "/", [ '_', 'count' ], '>', 1000 ]
      or
        count: [ [ '_', 'sales' ], '/', [], '>', 1000 ]
      
      The empty Array '[]' stands for "the current attribute's value", in the
      second example this is the value of attribute 'count'.
      
      All operators evaluation is progressive, meaning that if a subpart of
      an expression returns false, it fails the entire execution of the
      expression which will return false unless a not '!' operator transforms
      the failure into a success or an 'or' operator provides an alternate
      expression.
      
      When a comparison operation succeeds, it returns the right-most
      operand value.
      
      Progressivity allows to express things like:
      
        2005 < year < 2009
        
      as:
        year: [ '$', 2005, '<', [], '<', 2009 ]
      
      In this expression, [] means 'the value of the current attribute' which
      is 'year' in this case. [ '$', 2005 ] means "the literal value 2005".
      
      The following expression:
      
        sales / ( 0 != count ) > 1000:
      
      Means that if count is zero, the entire expression should fail and
      return false, but if count is not zero, "0 != count" is the value
      of "count". It can be expressed as:
      
        sales: [ '/', [ '$', 0, '!=', [ '_', 'count' ] ], '>', 1000 ]
      
      Regular expressions:
        text match /^[0-9]+.*test/i
      
      Is specified as:
        text: [ 'match', [ 'RegExp', '^[0-9]+.*test', 'i' ] ]
      
      If there are no options regular expressions can be spefified with
      simple string literals, e.g.:
        text match( /^[0-9]+.*test/ )
      
      Is specified as:
        text: [ 'match', '^[0-9]+.*test' ]
      
      Catching regular expressions groups is done using the 'group' operator,
      e.g.:
      
        matched = text match( /^([0-9]+)(.*)test/ )
        
        if ( matched ) { 
          matched[ 1 ] >= '1952' && matched[ 2 ] == 'magic'
        }
      
      Can be specified as:
        text: [ 'match', '^([0-9]+)(.*)test', 'group', 1, '>=', 1952, 'group', 2, '==', 'magic' ]
      
      Note that there are implicit 'AND' operators in this expression,
      because of progressivity, if a subexpression fails, the entire
      expression fails.
      
      Attributes in Object values are specified using the '.' operator, e.g.:
      
        user: [ [ '.', 'age' ], '>=', 18 ]
      
      Means user.age > 18.
      
      Note that using this method rather than the more intuitive 'user.age'
      notation for attribute names has at least two significant advantages:
      a) it is not ambiguious, therefore attributes can validly contain dots
      b) evaluation performance is maximal for the vast majority of
        attributes that would otherwise be compromised because all attributes
        would have to be searched for non-existant '.' characters.
      
      Any depth can be reached using the following notation because the '.'
      operator is greedy (i.e. consumes all expression values until the first
      closing bracket ']'):
      
        user: [ [ '.', 'profile', 'age' ], '>=', 18 ]
      
      Meaning 'user.profile.age >= 18'.
      
      The current attribute can be changed using the '__' operator:
      
        user: [ [ '__', 'user', 'profile', 'age' ], '>=', 18, [], '<', 26 ]
      
      Meaning "user.profile.age >= 18 AND user.profile.age < 26".
      
      Using progressivity, this could also be expressed as:
        user: [ [ '$', 18, ] '<=', [ '.', 'profile', 'age' ], '<', 26 ]
      
      Specifying Object and Array literal values is done using the literal
      '$' operator:
        [ '$', { ... } ]
        [ '$', [ ... ] ]
      
      Directly providing an Object in place of an operator, evaluates the
      object as an expression that may contain Array expressions, e.g.:
      
        { user: { profile: { age: [ '>=', 18 ] } } }
      
      The above Object expression succeeds if 'user' is an object containing
      a 'profile' object containing an 'age' attribute superior or equal to
      18. 'user' and 'profile' may contain other attributes. To test for
      strict equality use operator "==" instead:
      
        { user: [ "==", { profile: { age: 18 } } ] }
      
      Which means: a user object which contains ONLY a profile object which
      contains ONLY an age attribute which value is 18.
      
      Finally, developpers can implement query procedures, specified as
      functions receiving a context which is the evaluation context
      of the expression, e.g.:
      
        Query.Operator( 'mod', function( left, divider, reminder ) {
          return left % divider == reminder;
        }, options );
      
      This operator could be used as:
        { count: [ 'mod', 7, 3 ] }
      
      In "this" context, developpers have access to the following attributes:
        - value (Object): the current value evaluated
        
        - __: current default value of execution, used by default as the left
          value for all operators when there is no left value provided,
          typically at the beginning of a bracket '[' sub-expression.
        
        - regexp (RegExp): the last regular expression used
        
        - groups (Array): the last groups from the last evaluated regular
          expression, or null if there was no match or undefined if there was
          no prior regular expression evaluation.
      
      Developpers can add other custom attributes to "this" context, provided
      they prefix these attributes using a vendor prefix to prevent conflicts
      with future Toubkal operators and other developpers. To get a vendor
      prefix, make a pull request into toubkal/vendors.js, add a value to
      the vendors' set.
      
      Attempting to redefine an existing operator throws an exception.
      
      The 'options' (Object) parameter to Query.Operator() specifies:
        - greedy (Boolean): if true will consume all values up to the
          closing bracket ']' in the expression, such as used by
          operators '.', '_', and '__'.
        
        - accepts_fail (Boolean): if true, the operator accepts operands that
          may fail. This is the case for operator '!'.
        
        - literal_parameters (Boolean): if true, means that parameters should
          not be evaluated and should be provided to the operator directly.
          This is the case of operator '$' allowing to pass literal Arrays
          that should not be interpreted as expressions.
      
      All built-in operators are implemented using Query.Operator() except
      "||" and "failed" which are implemented by Query.evaluate() and as such
      can execute at a lower priority than all other operators.
      
      Geospatial or other heavy operators can therefore be provided as a
      separate module.
  */
  
  /* --------------------------------------------------------------------------
      @class Query( query, name )
      
      @manual internal
      
      @parameters
      - **query** (optional): a @@term:query
      - **name** (String): optional debugging name
      
      @description
      
      A Query is created using a set of expressions as first parameter.
      The filter code is generated using generate() generating the filter()
      method that filters Arrays of Objects.
      
      #### Other performance considerations
      Query_Tree performance is considered more important than Query
      operations performance. This is because query trees may have to route
      a large number of data events while queries themselves are expected to
      have a much lower rate of change in most applications.
  */
  function Query( query, name ) {
    var that = this;
    
    Loggable.call( that, name );
    
    // Result expressions
    that.query = [];
    that.keys  = []; // Query expressions keys cache
    
    that.history = []; // add and remove history for debugging purposes
    
    // Expressions optimized-out by Query..add()
    that.discard_optimized();
    
    // Operations resulting from operations
    that.discard_operations();
    
    // Add the initial query in an optimized way
    query && that.add( query );
  } // Query()
  
  var query_keys = Query.keys = function( query ) {
    var keys = [], i = -1, e;
    
    while( e = query[ ++i ] ) keys.push( Object.keys( e ) );
    
    return keys;
  };
  
  /* --------------------------------------------------------------------------
     Query.Error( message )
  */
  var Query_Error = Query.Error = Error;
  
  /* --------------------------------------------------------------------------
      Query.least_restrictive_keys( e0, e1, keys0, keys1 )
      
      Determines which AND-expression is the least-restricive or as restrictive, i.e. describes
      the largest set.
      
      An AND-expression is described using a JavaScript Object which attribute names and values
      determine a set of JavaScript Objects that match all attributes names and values of the
      AND-expression, e.g.:
        - The AND-expression { flow: 'stores' } describes a set where all JavaScript Objects
          have a flow attribute which value is 'stores'.
        
        - The AND-expression { flow: 'sales', month: 1 } describes the set of all JavaScript
          Objects which flow attribute is sales' AND which 'month' attribute has the value '1'.
      
      Parameters:
        - e0: the first AND-expression
        - e1: the second AND-expression
        - keys0: the keys of e0 as determined by Object.keys( e0 )
        - keys1: the keys of e1 as determined by Object.keys( e1 )
      
      !! Note that this function is not strictly symetric, if it returns keys0 the two
      AND-expressions may be strictly equal while if it returns keys1 the two expressions
      are guarantied to NOT be strictly equal.
      
      Returns:
        null : None can be determined as least restrictive. The two expressions describe
               sets that may have an intersection but none is fully included in the other or
               the expressions are too complex to determine if one set is fully included in
               the other.
               
        keys0: Expression e0 is either least restrictive, or as restrictive as e1. The set
               described by e1 is therefore fully included in the set described by e0 or
               exactly the same set.
               
        keys1: Expression e1 is the least restrictive. The set described by e0 is fully
               included in the set described by e1.
               
      Use cases:
        Toubkal Queries are OR-expressions which terms are AND-expresssions as tested by this
        function.
        
        If a query contains one AND-expression which is less restrictive than others of the
        same query, then these other expressions are redundant and may be optimized-out of
        the query, reducing the number or AND-expression in an optimized query.
        
        Optimizing queries is therefore essential to optimal performances of query filters
        and query trees.
        
        Another use case is an intelligent cache based on queries, preventing the redundant
        caching of subsets described by more restrictive queries. Several cache strategies
        can be implemented, sharing JavaScript Objects included in more than one set as
        described by more or less restrictive queries.
      
      Description
      Implemented for simple complex expressions having only one comparison
      operator such as '<', '<=', '==', '>=', '>'.
      
      For all other complex expressions, allays return null, i.e. None
      can be determined as least restrictive. 
  */
  Query.least_restrictive_keys = least_restrictive_keys;
  
  function least_restrictive_keys( e0, e1, keys0, keys1 ) {
    var k0l           = keys0.length
      , k1l           = keys1.length
      , can_swap      = 1
      , keys1_shorter = k0l > k1l
      , keys          = keys1_shorter ? keys1 : keys0
      , i             = -1
      , key, v0, v1, t0o, t1o, op_0, op_1, limit_0, limit_1
    ;
    
    keys1_shorter ? swap() : can_swap = k0l == k1l;
    
    // e0, keys0 is now always less of equally restrictive than e1, keys1
    
    while ( key = keys[ ++i ] ) {
      v0 = e0[ key ];
      v1 = e1[ key ];
      
      if ( v0 !== v1 ) {
        t0o = typeof v0 == object_s && v0;
        t1o = typeof v1 == object_s && v1;
        
        if ( t0o || t1o ) {
          if ( ! t0o ) v0 = [ '==', v0 ];
          if ( ! t1o ) v1 = [ '==', v1 ];
          
          if ( equals( v0, v1 ) ) continue; // equal complex expressions
          
          if ( is_array( v0 ) && is_array( v1 )
            && v0.length == 2 && v1.length == 2
          ) {
            // try to compare complex expressions that define comparable sets
            // ToDo: use compare_ranges()
            if ( is_string( op_0 = v0[ 0 ] )
              && is_string( op_1 = v1[ 0 ] )
              && is_number( limit_0 = v0[ 1 ] )
              && is_number( limit_1 = v1[ 1 ] )
            ) {
              // inferior: the least restrictive is the expression with the highest comparison value 
              if ( ( op_0 == '<' || op_0 == '<=' )
                && ( op_1 == '<' || op_1 == '<=' || op_1 == '==' )
              ) {
                if ( limit_0  > limit_1
                  || limit_0 == limit_1 && ( op_0 == '<=' || op_1 == '<' )
                ) continue; // v0 is least restrictive
              }
              
              else
              
              // superior: the least restrictive is the expression with the lowest comparison value
              if ( ( op_0 == '>' || op_0 == '>=' )
                && ( op_1 == '>' || op_1 == '>=' || op_1 == '==' )
              ) {
                if ( limit_0  < limit_1
                  || limit_0 == limit_1 && ( op_0 == '>=' || op_1 == '>' )
                ) continue; // v0 is least restrictive
              }
            }
          }
        }
        
        // None can be determined as least restrictive
        return null;
      }
    }
    
    return keys0; // keys of least restrictive expression 
    
    function swap() {
      var tmp;
      
      if ( can_swap ) {
        tmp = e0   ,    e0 = e1   ,    e1 = tmp;
        tmp = keys0, keys0 = keys1, keys1 = tmp;
        
        can_swap = false;
        
        return 1; // swaped()
      }
    } // swap()
  }; // Query.least_restrictive_keys()
  
  var fail // fail is the undefined value at this time, ToDo: set fail to a unique reference such as an object
    , ___ // undefined
  ;
  
  // Export fail to allow external operators to use it
  Query.fail = fail;
  
  var operators = {};
  
  /*
      ToDo: provide a method to convert native Objects such as RegExp into [ class, parameters ]
      that can be transported over JSON.
      
      Example: /test/i would be converted to its expression equivalent [ 'RegExp', 'test', 'i' ]
      by providing the following toJSON method:
      
      RegExp.prototype.toJSON = RegExp_toJSON;
      
      function RegExp_toJSON() {
        var options = '';
        
        if ( this.global     ) options += 'g';
        if ( this.ignoreCase ) options += 'i';
        if ( this.multiline  ) options += 'm';
        
        return [ 'RegExp', this.source, options ];
      }
      
      Alternatively, to avoid modifying the RegExp prototype, one could attach RegExp_toJSON
      directly to each RegExp instance:
      
      r = /test/i;
      
      r.toJSON = RegExp_toJSON;
      
      Potential problems:
      - This would not work in combination with '$' operator because the resulting Array would
      be interpreted as an Array literal. This could be documented so that users only use
      RegExp literals outside the '$' operator, or by tranforming [ '$', /test/i ] into
      [ 'RegExp', 'test', 'i' ]
      
      - Date Objects already have a toJSON() function that should not be modified. Therefore
      a solution may be to transform dates only in expressions' date literals.
      
      function Date_toJSON() {
        return [ 'Date', this.valueOf() ];
      }
      
      d = new Date();
      
      d.toJSON = Date_toJSON();
  */
  
  /* --------------------------------------------------------------------------
      Query.evaluate( value, attribute, expression )
      
      Evaluates if expression matches attribute in value.
      
      Parameters:
      - value (Object): the current value which attribute is evaluated for a
        match with expression.
      
      - attribute (String): the name of the attribute in value begin evaluated
      
      - expression:
        - Array: an expression, see definition in Query above
        - Object: an object literal, possibly including matching expressions
          (not yet implemented)
      
      Example:
        Query.evaluate(
          { flow: 'user', id: 1, profile: { name: 'Alice' } },
          
          'profile',
          
          [ [ '.', 'name' ], "==", "Alice" ]
        );
        
        // -> true
  */
  Query.evaluate = query_evaluate;
  
  function query_evaluate( value, attribute, expression ) {
    var context = new Evaluation_Context( value, attribute );
    
    return context.evaluate( expression ) === fail ? false: true;
  } // Query.evaluate()
  
  Query.Evaluation_Context = Evaluation_Context;
  
  function Evaluation_Context( value, attribute_name ) {
    var that = this;
    
    Loggable.call( that, attribute_name );
    
    ( that.reset = reset )();
    
    function reset() {
      // Current value (Object) which attribute will be evaluated
      that.value = value;
      
      that.attribute_path = attribute_name;
      
      that.regexp = null;
      that.groups = null;
      
      // Current default value of evaluation
      return that.__ = value[ attribute_name ];
    } // reset()
  } // Class Evaluation_Context() constructor
  
  Loggable.subclass( 'Evaluation_Context', Evaluation_Context, {
    get_regexp: function( r, options ) {
      try {
        r = r == ___
          ? this.regexp || fail
          : this.regexp = is_regexp( r ) ? r : new RegExp( r, options )
      
      } catch( e ) {
        log( 'get_regexp() failed:', e );
        
        r = fail
      }
      
      return r;
    }, // Evaluation_Context.get_regexp()
    
    evaluate: function( expression ) {
      var that = this
        , left = that.__
      ;
      
      if ( is_array( expression ) ) {
        var skip = false, i = 0, expression_length = expression.length;
        
        while ( i < expression_length ) {
          var first = expression[ i++ ], type = typeof first;
          
          switch( type ) {
            default:
              error( 'invalid operator type: ' + type );
            break;
            
            case object_s: // subexpression
              if ( ! skip ) left = that.evaluate( first )
            break;
            
            case 'string': // operator
              switch( first ) {
                case 'failed':
                  if ( left === fail ) {
                    // Failed, becomes success using default value or true
                    if ( ( left = that.__ ) === fail ) left = true;
                    
                    skip = false;
                  } else {
                    // Success, becomes failure, will skip until next 'failed' or '||'
                    left = fail;
                  }
                break;
                
                case '||':
                  if ( left === fail ) {
                    // Failed, try alternate using default value or true
                    if ( ( left = that.__ ) === fail ) left = true;
                    
                    skip = false;
                  } else {
                    // Success, no need to evaluate alternate, skip until next 'failed' or '||'
                    skip = true;
                  }
                break;
                
                case '&&':
                  if ( ! skip ) left = that.__ // only reset current value
                break;
                
                case 'reset':
                  if ( ! skip ) left = that.reset()
                break;
                
                default:
                  var operator = operators[ first ];
                  
                  if ( operator ) {
                    var f                  = operator[ 0 ]
                      , options            = operator[ 1 ]
                      , greedy             = 0
                      , stateful           = 0
                      , attribute_path     = 0
                      , min_parameters     = 1 // for left
                      , start              = i
                      , literal_parameters = 0
                      , accepts_fail       = 0
                      , parameters
                    ;
                    
                    if ( options ) {
                      greedy             = options.greedy;
                      stateful           = options.stateful       ? 1 : 0;
                      attribute_path     = options.attribute_path ? 1 : 0;
                      
                      // add extra parameters for state and attribute name
                      min_parameters     += stateful + attribute_path;
                      
                      literal_parameters = options.literal_parameters;
                      accepts_fail       = options.accepts_fail;
                    }
                    
                    // Calculate position of next operator in expression
                    i = greedy
                      ? expression_length
                      : i + Math.max( f.length, min_parameters ) - min_parameters
                    ;
                    
                    if ( skip && ! stateful ) break;
                    
                    parameters = expression.slice( start, i );
                    
                    parameters.unshift( left );
                    
                    attribute_path && parameters.unshift( that.attribute_path );
                    
                    if ( stateful ) {
                      // ToDo: implement stateful operator after evaluating all values
                      
                      break;
                    }
                    
                    if ( ! literal_parameters ) {
                      // Evaluate Array parameters, all others are always literals
                      var no_fail = ! accepts_fail
                        , j       = min_parameters - 1
                        , l       = parameters.length
                        , v
                      ;
                      
                      while ( ++j < l )
                        if ( is_array( v = parameters[ j ] ) ) {
                          parameters[ j ] = left = that.evaluate( v );
                          
                          if ( left === fail && no_fail ) {
                            skip = true;
                            
                            break;
                          }
                        }
                      // For all parameters
                    } // Evaluate all parameters
                    
                    if ( skip ) break;
                    
                    left = f.apply( that, parameters );
                  } else {
                    error( "unknown operator: " + first );
                  }
                break;
              } // switch operator
            break;
          } // switch typeof first
          
          if ( left === fail ) skip = true; // until the next 'or'
        } // While there are terms
      } else { // is_array( expression )
        left = that.evaluate_object( expression );
      }
      
      return left;
      
      function error( message ) {
        log( 'evaluate() error:', message
          , 'in expression', log.s( expression )
          , 'at position', i - 1
        );
        
        left = fail;
      } // error()
    }, // evaluate()
    
    evaluate_object: function( object ) {
      var that = this
        , __   = that.__ // save __
        , left = __
      ;
      
      for ( var a in object ) {
        if ( object.hasOwnProperty( a ) ) {
          var v = left[ a ], e = object[ a ];
          
          if ( v === ___ ) return fail;
          
          switch( toString.call( e ) ) {
            default:
              if ( e === v ) break;
              
              if ( e != e && v != v ) break; // NaN
              
              left = fail;
            break;
            
            case '[object Array]':
              that.__ = v;
              
              if ( that.evaluate( e ) === fail ) left = fail;
            break;
            
            case '[object Object]':
              that.__ = v;
              
              if ( that.evaluate_object( e ) === fail ) left = fail;
            break;
          }
          
          if ( left === fail ) break;
        }
      }
      
      that.__ = __; // restore __
      
      return left;
    } // evaluate_object()
  } ); // Evaluation_Context instance attributes
  
  Query.Operator = Operator;
  
  function Operator( name, f, options ) {
    if ( is_array( name ) )
      name.forEach( function ( name ) { Operator( name, f, options ) } )
    
    else {
      if ( operators[ name ] )
        throw new Query_Error( 'Operator() "' + name + '" is already defined' )
      ;
      
      operators[ name ] = slice.call( arguments, 1 );
    }
    
    return Operator
  } // Query.Operator()
  
  function Stateful_Operator( name, f, options ) {
    Operator( name, f, extend_2( { stateful: true }, options ) );
    
    return Stateful_Operator
  } // Stateful_Operator()
  
  // Operators implemented in evaluate() or reserved
  Operator
    ( [ 'failed', '||', '&&', 'reset' ] )
    
    ( '==', function( a, b ) { return equals( a, b ) ? b : fail }, { range: { b1i: 1, b2i: 1 } } )
    ( '!=', function( a, b ) { return equals( a, b ) ? fail : b } )
    
    ( '>' , function( a, b ) { return a >  b ? b : fail }, { range: { b2:  Infinity         } } )
    ( '>=', function( a, b ) { return a >= b ? b : fail }, { range: { b2:  Infinity, b1i: 1 } } )
    ( '<' , function( a, b ) { return a <  b ? b : fail }, { range: { b1: -Infinity         } } )
    ( '<=', function( a, b ) { return a <= b ? b : fail }, { range: { b1: -Infinity, b2i: 1 } } )
    
    ( '+', function( a, b ) { return a + b } )
    ( '-', function( a, b ) { return a - b } )
    ( '*', function( a, b ) { return a * b } )
    ( '/', function( a, b ) { return a / b } )
    ( '%', function( a, b ) { return a % b } )
    
    ( 'RegExp', function( _, r, options ) { return this.get_regexp( r, options ) } )
    
    ( 'match', function( text, r ) {
      r = this.get_regexp( r );
      
      var groups = this.groups = r === fail ? null : r.exec( text );
      
      return groups ? groups.index : fail
    } )
    
    ( 'last_index', function() {
      var r = this.regexp;
      
      return r ? r.lastIndex : fail
    } )
    
    ( 'groups', function( _, i ) {
      var groups = this.groups
        , s = groups && groups[ i ]
      ;
      
      return s != ___ ? s : fail
    } )
  
    ( 'split', function( text, r ) {
      var that = this;
      
      r = that.get_regexp( r );
      
      that.groups = r === fail ? null : text.split( r );
      
      return that.groups ? that.groups.length : fail
    } )
    
    ( 'length', function( left ) {
      return left && typeof left == object_s ? left.length : fail
    } )
  
    // Get value inside Object or Array from relative path to current value
    // [ '.', 'profile', 'age' ]
    ( '.', function( left ) {
      return subscript( left, arguments )
    }, { greedy: true } )
    
    // Get value from absolute path 
    // [ '_', 'user', 'profile', 'age' ]
    ( '_', function() {
      return subscript( this.value, arguments )
    }, { greedy: true } )
    
    // Change current attribute_path and current value
    // [ '__', 'user', 'profile', 'age' ]
    ( '__', function() {
      var that = this
        , a    = arguments
      ;
      
      that.attribute_path = slice.call( a, 1 );
      
      return that.__ = subscript( that.value, a )
    }, { greedy: true } )
    
    // Literal value, may be a literal Object or literal Array
    ( '$', function( _, right ) { return right }, { literal_parameters: true } )
    
    // Literal Array, similar to [ '$', [] ]
    // but allows to specify the Array with one less level of []
    // and allows expressions for individual values
    ( '$$', function() { return slice.call( arguments, 1 ) }, { greedy: true } )
    
    ( '!', function( _, right ) {
      return right === fail ? true : fail
    }, { accepts_fail : true } )
    
    // Operator 'in' greedy and can take two forms:
    // - If the first parameter is an Array, all other parameters are ignored:
    //   in [ v1, v2, ... ]
    //
    // - Otherwise all parameters constitute the Array:
    //   in v1, v2, ...
    //
    ( 'in', function( left, a0 ) {
      
      return contains( is_array( a0 ) ? a0 : slice.call( arguments, 1 ), left )
    }, { greedy: true } )
    
    ( 'contains', function( left, a ) { return contains( left, a ) } )
    
    /*
        [ 'in_set', '<=', 0, '<=<', 1, 4, '==', 5, '<<=', 9, 15, '>', 25 ]
        
        Expresses:
          left <= 0 || 1 <= left < 4 || left == 5 || 9 < left <= 15 || 25 < left
        
        In addition to the five classic single-bound comparison operators
        ==, <, <=, >=, and >, 4 additional range operators with two explicit
        bounds are supported and implemented bellow:
          <=< <=<= << <<=
        
        In the set expession, ranges must be non-intersecting and sorted by
        increasing bound values. This means that if there is an intersection
        between two or more ranges they should first be merged.
        
        If the set does not conform to the above specification, comparisons
        may fail.
    */
    ( 'in_set', function( left, a0 ) {
      
      return in_set( is_array( a0 ) ? a0 : slice.call( arguments, 1 ), left )
    }, { greedy: true } )
    
    // range operators
    ( '<=<' , function( v, a, b ) { return a <= v && v <  b || fail; }, { range: { b1i: 1         } } )
    ( '<=<=', function( v, a, b ) { return a <= v && v <= b || fail; }, { range: { b1i: 1, b2i: 1 } } )
    ( '<<',   function( v, a, b ) { return a <  v && v <  b || fail; }, { range: {                } } )
    ( '<<=',  function( v, a, b ) { return a <  v && v <= b || fail; }, { range: {         b2i: 1 } } )
    
    ( 'value', function( left ) {
      return left && typeof left == object_s && typeof left.valueOf == 'function'
        ? left.valueOf() : fail
    } )
    
    // Date operators
    ( 'Date', function( _, value ) {
      var d;
      
      switch( arguments.length ) {
        case  1: d = new Date(); break; // now
        case  2: d = new Date( value ); break; // timestamp
        
        default:
          d = new Date( Date.UTC.apply( Date, slice.call( arguments, 1 ) ) );
      }
      
      return d;
    }, { greedy: true } )
    
    ( 'year', function( date ) {
      return is_date( date ) ? date.getUTCFullYear() : fail;
    } )
    
    ( 'month', function( date ) {
      return is_date( date ) ? date.getUTCMonth() : fail;
    } )
    
    ( 'day', function( date ) {
      return is_date( date ) ? date.getUTCDate() : fail;
    } )
    
    ( 'hours', function( date ) {
      return is_date( date ) ? date.getUTCHours() : fail;
    } )
    
    ( 'minutes', function( date ) {
      return is_date( date ) ? date.getUTCMinutes() : fail;
    } )
    
    ( 'seconds', function( date ) {
      return is_date( date ) ? date.getUTCSeconds() : fail;
    } )
    
    ( 'milliseconds', function( date ) {
      return is_date( date ) ? date.getUTCMilliseconds() : fail;
    } )
    
    ( 'time', function( date ) {
      if ( is_date( date ) ) {
        date = new Date( date.valueOf() );
        
        date.setUTCFullYear( 1970 );
        date.setUTCMonth( 0 );
        date.setUTCDate( 1 );
      
      } else
        date = fail
      ;
      
      return date;
    } )
  ;
  
  function subscript( v, a ) {
    var a = slice.call( a, 1 );
    
    for ( var i = -1, l = a.length; ++i < l; ) {
      if ( v == ___ || typeof v != object_s )
        return fail
      ;
      
      v = v[ a[ i ] ];
    }
    
    return v
  } // subscript()
  
  function contains( a, left ) {
    var p;
    
    if ( is_array( left ) ) {
      var i = -1, l = left.length, first = Infinity;
      
      while ( ++i < l ) {
        p = a.indexOf( left[ i ] );
        
        if ( p == -1 ) return fail;
        
        if ( first < p ) continue;
        
        first = p;
      }
      
      return first;
    }
    
    return ( p = a.indexOf( left ) ) == -1 ? fail: p
  } // contains()
  
  function in_set( set, value ) {
    // if ( ! is_array( set ) ) return error( 'set parameter is not an Array' );
    
    if ( is_array( value ) )
      return value.every( function( value ) {
        return in_set( set, value ) !== fail
      } );
    
    var i = -1
      , l = set.length
    ;
    
    while ( ++i < l ) {
      var o_position = i // for error() if there is an error
        , operator   = set[ i ]
        , o          = operators[ operator ]
        , options    = o && o[ 1 ]
        , range      = options && options.range
      ;
      
      if ( ! range ) return error( operator + ' is not a range operator' );
      
      var bound_1    = set[ ++i ]
        , bound_2    = o[ 0 ].length > 2 ? set[ ++i ] : bound_1
        , r
      ;
      
      if ( i >= l ) return error( 'missing operand(s) for operator ' + operator );
      
      switch( operator ) {
        case '=='  : if (            value == bound_1          ) r = bound_1; break;
        case '>='  : if ( bound_1 <= value                     ) r = bound_1; break;
        case '>'   : if ( bound_1 <  value                     ) r = bound_1; break;
        case '<'   : if (                     value <  bound_2 ) r = bound_2; break;
        case '<='  : if (                     value <= bound_2 ) r = bound_2; break;
        
        case '<<'  : if ( bound_1 <  value && value <  bound_2 ) r = bound_2; break;
        case '<=<' : if ( bound_1 <= value && value <  bound_2 ) r = bound_2; break;
        case '<=<=': if ( bound_1 <= value && value <= bound_2 ) r = bound_2; break;
        case '<<=' : if ( bound_1 <  value && value <= bound_2 ) r = bound_2; break;
      }
      
      if ( r !== ___ ) return r;
      
      if ( value < bound_2 ) break; // assumes non-intersecting and sorted ranges
    }
    
    return fail;
    
    function error( message ) {
      log( 'Operator in_set,', message, 'in expression [', set, '] at position', o_position );
      
      return fail;
    } // error()
  } // in_set()
  
  /* --------------------------------------------------------------------------
      @function compare_ranges( r0, r1 )
      
      @short Compares comples expressions ranges
      
      @manual internal
      
      @parameters
      - **r0** (Array): first range
      - **r1** (Array): second range
      
      A range is defined by a range operator and one or two operands.
      Range examples:
      - ```[ '<', 5 ]``` meaning inferior to 5.
      - ```[ '<<=', 3, 10 ]``` meaning inferior to 3 and inferior or equal
        to 10.
      
      Supported range operators are:
      ```== < <= >= > <=< <=<= << <<=```
      
      @returns
      - fail: not a range operator, missing operand in a range, or invalid range
      -   -4: r0 entirely before r1
      -   -3: r0 is right before and contiguous to r1
      -   -2: r0 intersects r1 between r1 lower bound and r0 upper bound
      -   -1: r0 fully includes r1
      -    0: r0 strictly equals r1
      -    1: r0 fully included in r1
      -    2: r0 intersects r1 between r0 lower bound and r1 upper bound
      -    3: ro is right after and contiguous to r1
      -    4: r0 entirely after r1
      
      @description
      The goal is to allow to "or", "and", "sort", and "diff"
      set expressions, i.e. using "in" and "in_set" operators
      in addition to the above nine range operators.
      
      Ranges in expressions must be sorted, this allows to improve scanning
      and evaluation perforances.
      
      Empty ranges, and ranges for which the lower bound is superior to the
      upper bound, are not allowed.
      
      Returned values are chosen so that Array..sort() would sort
      ranges according to their lower bounds, or if equal according
      to their upper bounds:
      - negative values mean that e0 lower bound is before e1
        lower bound, or that e0 lower bound is equal to e1
        lower bound AND e0 upper bound is after e1 upper
        bound;
      - 0 means e0 and e1 are strictly equal;
      - Positive vlaues mean that e0 lower bound is after e1
        lower bound.
  */
  Query.compare_ranges = compare_ranges;
  
  function compare_ranges( r0, r1 ) {
    var op0       = r0[ 0 ]
      , op1       = r1[ 0 ]
      , o0        = operators[ op0 ]
      , o1        = operators[ op1 ]
      , options_0 = o0 && o0[ 1 ]
      , options_1 = o1 && o1[ 1 ]
      , range_0   = options_0 && options_0.range
      , range_1   = options_1 && options_1.range
      , params_0  = range_0 && o0[ 0 ].length
      , params_1  = range_1 && o1[ 0 ].length
    ;
    
    if ( ! range_0 && ! range_1 )
      return error( ( range_0 ? op1 : op0 ) + ' is not a range operator' );
    
    if ( r0.length < params_0 || r1.length < params_1 )
      return error( 'missing operand(s)' );
    
    var r0b1     = range_0.b1
      , r0b2     = range_0.b2
      , r1b1     = range_1.b1
      , r1b2     = range_1.b2
      , boumd_01 = r0b1 || r0[ 1 ]
      , boumd_02 = r0b2 || r0[ r0b1 ? 1 : params_0 - 1 ]
      , boumd_11 = r1b1 || r1[ 1 ]
      , boumd_12 = r1b2 || r1[ r1b1 ? 1 : params_1 - 1 ]
      , b01i     = range_0.b1i
      , b02i     = range_0.b2i
      , b11i     = range_1.b1i
      , b12i     = range_1.b2i
    ;
    
    // validate bounds
    if ( boumd_02 < boumd_01 || boumd_01 == boumd_02 && ! ( b01i && b02i ) )
      return error( 'invalid bounds in r0' );
    
    if ( boumd_12 < boumd_11 || boumd_11 == boumd_12 && ! ( b11i && b12i ) )
      return error( 'invalid bounds in r1' );
    
    // trying to evaluate most likely inequalities first
    
    // compare for extreme cases: no intersection (-3 and 3)
    if ( boumd_02 < boumd_11 ) return -4;
    if ( boumd_01 > boumd_12 ) return  4;
    
    // compare for cross bounds equalities
    if ( boumd_02 == boumd_11 )
      return boumd_01 == boumd_12
        ? 0
        : ! b02i && ! b11i
        ? -4
        : b02i != b11i
        ? -3
        : boumd_01 == boumd_02
        ? 1
        : boumd_11 == boumd_12 ? -1 : -2
      ;
    
    if ( boumd_01 == boumd_12 )
      return ! b01i && ! b12i
        ? 4
        : b01i != b12i
        ? 3
        : boumd_01 == boumd_02
        ? 1
        : boumd_11 == boumd_12 ? -1 : 2
      ;
    
    // compare partial intersection (-2 and 2) and full inclusion (-1 and 1)
    if ( boumd_01 < boumd_11 )
      return boumd_02 < boumd_12 || boumd_02 == boumd_12 && b02i < b12i
        ? -2 : -1
      ;
    
    if ( boumd_01 > boumd_11 )
      return boumd_02 > boumd_12 || boumd_02 == boumd_12 && b02i > b12i
        ?  2 :  1
      ;
    
    // now boumd_02 > boumd_11 and boumd_01 < boumd_12 and boumd_01 == boumd_11
    
    // compare for partial intersection (-2 and 2) or full inclusion (1 and -1)
    if ( boumd_02 < boumd_12 ) return b01i > b11i ? -2 :  1;
    if ( boumd_02 > boumd_12 ) return b01i < b11i ?  2 : -1;
    
    // now boumd_01 == boumd_11 && boumd_02 == boumd_12 and boumd_02 > boumd_11 and boumd_01 < boumd_12
    // all tests are now on bounds inclusions or not
    if ( b01i == b11i ) return b02i == b12i ? 0 : b02i > b12i ? -1 : 1;
    
    if ( b01i > b11i ) return b02i < b12i ? -2 : -1;
    
    // now b01i < b11i
    return b02i > b12i ? 2 : 1;
    
    function error( message ) {
      log( 'compare_ranges()', message, [ r0, r1 ] );
      
      return fail;
    }
  } // compare_ranges()
  
  // Stateful operators
  Stateful_Operator
    ( 'ascending', function( state, attribute_path, left ) {
      sort_values( 1, state, attribute_path, left )
    }, { attribute_path: true, priority: 0 } )
    
    ( 'descending', function( state, attribute_path, left ) {
      sort_values( 0, state, attribute_path, left )
    }, { attribute_path: true, priority: 0 } )
    
    ( 'limit', function( state, _, limit ) {
      state.values = state.values.slice( 0, limit )
    }, { priority: 1 } )
  ;
  
  function sort_values( ascending, state, dimension, dimensions ) {
    dimensions
      = ( is_array( dimensions ) ? dimensions : [ dimension ] )
      
      .map( function( d ) {
        return is_object( d ) /* but not an Array */ ? d : { path: d /* can be an Array decribing the path */ }
      } )
    ;
    
    var l      = dimensions.length
      , before = ascending ? -1 : +1
      , after  = ascending ? +1 : -1
    ;
    
    state.values = state.values
      
      // force all values to be non-null-Objects, ToDo: do this before all calls to stateful operators
      .map( function( v ) {
        return v && typeof v == object_s ? v : { non_object_value: v }
      } )
      
      // sort values in place
      .sort( sorter )
    ;
    
    function sorter( a, b ) {
      var i = -1;
      
      while ( ++i < l ) {
        var d       = dimensions[ i ]
          , path    = d.path
          , _before
          , _after
          , x
          , y
        ;
        
        if ( d.descending ) {
          _before = - before;
          _after  = - after ;
        } else {
          _before = before;
          _after  = after ;
        }
        
        // dereference path to get x and y values to compare
        if ( typeof path == object_s && path ) {
          x = dereference( a, path );
          y = dereference( b, path );
        } else {
          x = a[ path ];
          y = b[ path ];
        }
        
        // Use valueOf() or JSON.stringify() to get values of non-null objects, inculding Arrays and Dates
        if ( typeof x == object_s && x ) x = value_of( x );
        if ( typeof y == object_s && y ) y = value_of( y );
        
        // both x and y are now a number (including NaN), a string, null, or undefined
        
        if ( x !== y ) {
          if ( x === ___ )  return _before;
          if ( y === ___ )  return _after ;
          
          if ( x === null ) return _before;
          if ( y === null ) return _after ;
          
          if (  x  <  y  )  return _before;
          if (  x  >  y  )  return _after ;
          
          // x or y is NaN
          if ( x !== x && y !== y ) continue; // both NaN, so they are considered equal
          
          return x !== x ? _before : _after;
        }
      }
      
      // Equal through all dimensions
      return 0;
      
      function dereference( v, path ) {
        if ( is_array( path ) ) {
          for ( var i = -1, l = path.length; ++i < l; )
            if ( v && typeof v == object_s )
              v = v[ path[ i ] ]
            
            else
              return ___;
        
        } else // path is non-Array Object
          v = ___
        ;
        
        return v;
      } // dereference()
      
      function value_of( o ) {
        if ( typeof o.valueOf == 'function' ) {
          o = o.valueOf();
          
          if ( typeof o == object_s ) o = stringify( o );
        
        } else
          o = stringify( o );
        
        return o;
      } // value_of()
    } // sorter()
  } // sort_values()
  
  Loggable.subclass( 'Query', Query, {
    /* -----------------------------------------------------------------------------------------
       Query..discard_operations()
       
       Clears adds and removes from previous operations.
       
       Also used to initialize adds and removes to [] in Query constructor.
       
       @returns changes (Array): terms changed prior to discarding changes
       - 0 (Array): removed terms
       - 1 (Array): added terms
    */
    discard_operations: function() {
      var that    = this
        , changes = [ that.removes, that.adds ]
      ;
      
      that.adds    = [];
      that.removes = [];
      
      return changes;
    }, // Query..discard_operations()
    
    discard_optimized: function() {
      var that = this;
      
      that.optimized      = [];
      that.optimized_keys = [];
      
      return that;
    }, // Query..discard_optimized()
    
    /* -----------------------------------------------------------------------------------------
        Query..add( or_expressions )
        
        Add or_expressions to query, logically resulting in OR-ing query expressions.
        
        Parameters:
          - or_expressions: Array of Query expressions (or-terms)
        
        Behavior:
          Added expressions are pushed into 'adds' that may be used to produce output events of
          a Query dataflow and which may be different than the 'or_expressions' parameter because
          of query optimizations.
          
          The result is optimized to provide the least number of OR-expressions in the resulting
          query.
          
          If two queries have common terms (equal attribute and value), it can be shown that one
          of the resulting sets would be mathematically included into the other. In that case
          there is no need to keep both expressions, and the least restrictive (the one resulting
          in the largest set) is kept in the result while the other is optimized-out.
          
          When the result is optimized, expessions may be removed from the result. These
          optimized-out expressions are added to both 'removed' and 'optimized'.
          
          Optimized-out expression are memorized into instance variable 'optimized' to allow
          Query..remove() to either remove from optimized or restore optimized-out expressions
          when expressions are removed from the result query.
        
        Example:
          new Query( [ { flow: 'store' } ] ).add( [ { flow: 'user' } ] )
          
          results in the query:
            [ { flow: 'store' }, { flow: 'user' } ]
        
        Optimized Examples:
          new Query( [ { flow: 'store' } ] ).add( [ { flow: 'store', id: 1465 } ] )
            -->
            qyery    : [ { flow: 'store' } ]
            optimized: [ { flow: 'store', id: 1465 } ]
            
            adds     : [ { flow: 'store' } ]
            removes  : []
            
            The last added expression { flow: 'store', id: 1465 } is more restrictive, OR-wise,
            than the previous expression { flow: 'store' }.
            
            It is therefore not added to the result 'query' but optimized-out into 'optimized'.
            
          new Query( [ { flow: 'store', id: 1465 } ] ).add( [ { flow: 'store' } ] )
            -->
            query    : [ { flow: 'store' } ]
            optimized: [ { flow: 'store', id: 1465 } ]
            
            adds     : [ { flow: 'store', id: 1465 } , { flow: 'store' } ]
            removes  : [ { flow: 'store', id: 1465 } ]
            
            There is only one expression in the result because the last added expression is less
            restrictive, OR-wise, than the first expression which is optimized-out into
            'optimized'.
            
            Compared to the previous example, the resulting state in 'query' and 'optimized' is
            the same.
            
            One can say that add() is commutative as it should be expected.
            
            But the order of operations being different resulted in the expression
            { flow: 'store', id: 1465 } added then removed, hence the difference in 'adds' and
            'removes'.
            
            However one can easily see that that procesing these adds and removes yields the same
            result in both examples as it should be expected.
            
            In a future version, we might consider optimizing adds by removing expressions
            removed. If we implement this optimization, 'adds' and 'removes' final state would
            be strictly identical in both examples. 
    */
    add: function( q1 ) {
      // All variables with a trailing 0 correspond to the current query
      // All variables with a trailing 1 correspond to q1, the parameter query
      var that   = this
        , q0     = that.query
        , _q1    = q1.query
        , keys0s = that.keys
        , keys1s = q1.keys
        , i1 = -1
        , e1
      ;
      
      _q1 // Do not use keys1s because [].keys is the Array iterator in ECMAScript 2015
        ? q1 = _q1 // q1 is a Query
        : keys1s = query_keys( q1 ) // q1 is an Array
      ;
      
      that.history.push( [ new Date(), 'add', q1.slice() ] );
      
      while ( e1 = q1[ ++i1 ] ) {
        var keys1 = keys1s[ i1 ]
          , added = false
          , i0 = -1, e0
        ;
        
        // Optimize by adding the least number of queries to the result set
        while ( e0 = q0[ ++i0 ] ) {
          // Determine which expression, e0 or e1, may be less restrictive
          
          var keys0 = keys0s[ i0 ]
            , keys = least_restrictive_keys( e0, e1, keys0, keys1 )
          ;
          
          if ( keys ) {
            // One expression, e0 or e1, is less restrictive than the other. I.e. one expression
            // describes a set that mathematically includes the other.
            
            if ( keys === keys1 ) {
              // e1 is the least restrictive query --> Optimize-out e0
              
              // Remove e0 from result set and keys0 so that we no longer look it up
                  q0.splice( i0, 1 );
              keys0s.splice( i0--, 1 );
              
              that.removes.push( e0 );
              
              that.optimized.push( e0 );
              that.optimized_keys.push( keys0 );
              
              // There could be more expression in q0 more restrictive than e1 that would therefore need to be optimized-out
              
              // Note that, unless there is a bug in this implementation of Query, there cannot
              // exist another expression in q0 that would be less restrictive than e1 because
              // This would imply by transitivity that this other expression would also be
              // less restrictive than the current expression in q0. This cannot be if q0 is
              // already optimized and no expression is less restrictive than another one in q0.
            } else if ( keys == keys0 ) {
              // e1 is as restrictive or more restrictive than e0 --> optimize-out e1
              
              that.optimized.push( e1 );
              that.optimized_keys.push( keys1 );
              
              added = true;
              
              break; // if q0 is already optimized there should not be another expression less restrictive than e1
            } else {
              // this is a new ORed expression replacing both e0 and e1
            }
          }
        } // for all sub expression from q0
        
        // Add e1 into result query if none was less restrictive than another
        added || add( e1, keys1 );
      } // for all sub expression from q1
      
      return that;
      
      function add( e, keys ) {
            q0.push( e );
        keys0s.push( keys );
        
        that.adds.push( e );
      } // add()
      
    }, // Query..add()
    
    /* -----------------------------------------------------------------------------------------
        Query..remove( expressions )
        
        Removes expressions from query.
        
        Parameters:
          - expressions: Array of Query expressions (or-terms)
        
        Behavior:
          Removed expressions should have been added previously with Query..add() or an exception
          is triggered.
          
          If or-terms had been optimized-out of the query, these can still be removed without
          triggering an exception.
          
          If a removed expression had optimized-out other expressions, these are recovered back into
          the query.
        
        Examples:
          new Query( [ { id: 1 }, { id: 2 } ] ).remove( [ { id: 2 } ] )
          
            --> [ { id: 1 } ]
          
          new Query( [ { id: 1 }, { id: 2 } ] ).remove( [ { id: 3 } ] )
          
            --> exception
          
          new Query( [ { id: 1 }, { id: 2 } ] ).remove( [ { id: 2, name: 'test' } ] )
          
            --> exception
            
          new Query( [ { flow: "user", id: 1 } ] )
            .add   ( [ { flow: "user"        } ] ) // { flow: "user", id: 1 } is optimized-out
            .remove( [ { flow: "user", id: 1 } ] ) // no exception when removing optimized-out expression
            
            --> [ { flow: "user" } ]
            
          new Query( [ { flow: "user", id: 1 } ] )
            .add   ( [ { flow: "user"        } ] ) // { flow: "user", id: 1 } is optimized-out
            .remove( [ { flow: "user"        } ] ) // recovers { flow: "user", id: 1 }
            
            --> [ { flow: "user", id: 1 } ]
    */
    remove: function( q1 ) {
      var that   = this
        , _q1    = q1.query
        , keys1s
      ;
      
      // Make shallow copies, one level deep, of q1 and keys1s, because remove() modifies the array
      if ( _q1 ) { // q1 is a Query
        keys1s = q1.keys.slice( 0 );
        q1     = _q1.slice( 0 );
      } else { // q1 is an Array
        q1     = q1.slice( 0 );
        keys1s = query_keys( q1 );
      }
      
      that.history.push( [ new Date(), 'remove', q1.slice() ] );
      
      var optimized = that.optimized;
      
      // Atempt to remove expressions from optimized-out expressions first
      remove( optimized, that.optimized_keys, q1, keys1s );
      
      if ( q1.length ) {
        remove( that.query, that.keys, q1, keys1s, that.removes );
        
        if ( q1.length )
          throw new Query_Error( get_name( that, 'remove' )
            + 'expression not found:\n' + pretty( q1 )
            + '\n\n  history:\n' + pretty( that.history )
            + '\n'
          )
        ;
        
        if ( optimized.length ) {
          // Recover optimized expressions that may have become least restrictive after removal
          // from current query that were more restrictive
          
          // Forget reference to optimized expressions
          that.optimized      = [];
          that.optimized_keys = []; 
          
          that.add( optimized );
        }
      }
      
      return that;
      
      function remove( q0, keys0s, q1, keys1s, removes ) {
        var i0, i1, e0, e1, keys0, keys1, l1;
        
        for ( i1 = -1; e1 = q1[ ++i1 ]; ) { // for all terms to remove
          l1 = ( keys1 = keys1s[ i1 ] ).length;
          
          for ( i0 = -1; e0 = q0[ ++i0 ]; ) {
            if ( ( keys0 = keys0s[ i0 ] ).length != l1 ) continue; // these cannot be equal
            
            for ( var k = -1, key; key = keys1[ ++k ]; ) if ( e0[ key ] !== e1[ key ] ) break;
            
            if ( key ) continue; // some term did not match
            
            // all terms matched => remove e0
            keys0s.splice( i0  , 1 );
            q0    .splice( i0--, 1 );
            
            // Also remove e1 so that caller can attempt to remove remaining expressions, or
            // generate exception if some are not removed
            keys1s.splice( i1  , 1 );
            q1    .splice( i1--, 1 );
            
            removes && removes.push( e0 );
            
            break;
          }
        }
      }
    }, // Query..remove()
    
    /* -----------------------------------------------------------------------------------------
        update( updates )
        
        Update query by removing then adding terms for updates.
        
        Parameters:
        - updates (Array of updates): each update contains a removed term and an added term.
    */
    update: function( updates ) {
      var that = this;
      
      updates.forEach( function( update ) {
        that.remove( [ update[ 0 ] ] );
        that.add   ( [ update[ 1 ] ] );
      } )
    }, // Query..update()
    
    /* ------------------------------------------------------------------------
        @method Query..differences( q1 )
        
        @manual internal
        
        @short
        Finds differences between this query and q1
        
        @parameters
        - **q1**: query to look for differences with this query:
          - (Array of Objects): literal query
          - (Query): a class::Query
        
        @returns
        Array of two queries ```[ removes. adds ]```
        
        @examples
        ```javascript
          new Query( [
            { flow: 'stores', id: 1 }
            { flow: 'stores', id: 2 }
            { flow: 'stores', id: 3 }
          ] )
          
          .differences( [
            { flow: 'stores', id: 3 }
            { flow: 'stores', id: 4 }
            { flow: 'stores', id: 5 }
          ] )
          
          --> [
            [ // removes
              { flow: 'stores', id: 1 }
              { flow: 'stores', id: 2 }
            ],
            
            [ // adds
              { flow: 'stores', id: 4 }
              { flow: 'stores', id: 5 }
            ]
          ]
        ```
        
        @description
    */
    differences: function( q1 ) {
      // ToDo: add test cases for identical queries
      // ToDo: add many more test cases, we have only one test here
      var keys0s = this.keys
        , q0     = this.query
        , _q1    = q1.query
        , keys1s
        , e0
        , e1
        , keys0
        , keys1
        , i0
        , i1
        , l0
        , j
        , a
        , v0
        , v1
        , removed = []
      ;
      
      if ( _q1 ) { // q1 is a Query
        keys1s = q1.keys.slice( 0 );
        q1     = _q1.slice( 0 );
      } else { // q1 is an Array
        q1     = q1.slice( 0 );
        keys1s = query_keys( q1 );
      }
      
      for ( i0 = -1; e0 = q0[ ++i0 ]; ) {
        keys0 = keys0s[ i0 ];
        l0 = keys0.length;
        
        loop1: for ( i1 = -1; keys1 = keys1s[ ++i1 ]; )
          if ( l0 == keys1.length ) {
            e1 = q1[ i1 ];
            
            for ( j = -1; j < l0; ) {
              a = keys0[ ++j ];
              
              v0 = e0[ a ];
              v1 = e1[ a ];
              
              // ToDo: compare_ranges(), to find out differences
              // this will also require to return an Array with 4 terms,
              // requiring a lot of modifications in pipelet.js
              if ( v0 !== v1
                && ! ( typeof v0 == object_s && typeof v1 == object_s && equals( v0, v1 ) )
              ) continue loop1; // no match
            }
            
            // all terms match
            break;
          }
        
        if ( keys1 ) {
          // e1 matches e0
          // Remove e1 from q1 because it does not need to be added in q0
          q1    .splice( i1, 1 );
          keys1s.splice( i1, 1 );
        } else {
          // e0 was not found in q1
          // e0 will have to be removed from q0
          removed.push( e0 );
        }
      }
      
      return [ removed, q1 ];
    }, // Query..differences()
    
    /* -----------------------------------------------------------------------------------------
        Query..and( q1 )
        
        AND two queries. The result is optimized to provide the least number of OR-expressions in
        the resulting query.
        
        Example:
          new Query( [ { flow: 'store', id: 1465 }, { flow: 'store', id: 3678 } ] )
            .and( [ { id: 3678 } ] )
          
          results in the query:
            [ { flow: 'store', id: 3678 } ]
        
        Algorithm:
          1/ Factorize ( e01 .. OR e0n ) AND ( e11 .. OR e1m ) into n x m AND terms:
             ( e01 AND e11 ) .. OR ( e01 AND e1m ) .. OR ( e0n AND e11 ) .. OR ( e0n AND e1m )
          
          2/ To perform ei AND ej, lookup properties of ei and ej, pick the one that has the
             least number of properties, let it be ea and the other eb, then:
             - if one property of ea exists in eb but with a different value, then the result is
               always false, and no term is produced
             - if all properties of ea are either not present of have the same value in eb, then
               extend e0 with e1 to produce the ANDed expression
          
          3/ Or the result of the previous operation produced terms with previously accumulated
             results using optimized Query..add()
    */
    and: function( q1 ) {
      // All variables with a trailing 0 correspond to the current query
      // All variables with a trailing 1 correspond to q1, the parameter query
      var that   = this
        , q0     = that.query
        , _q1    = q1.query
        , keys0s = that.keys
        , keys1s = q1.keys
        , result = []
        , i0     = -1
        , e0
        , e1
      ;
      
      _q1 // Do not use keys1s because [].keys is the Array iterator in ECMAScript 2015
        ? q1 = _q1
        : keys1s = query_keys( q1 )
      ;
      
      // for all terms e0 of q0
      while ( e0 = q0[ ++i0 ] ) {
        var k0     = keys0s[ i0 ]
          , k0l    = k0.length
          , i1     = -1
          , remove = true // unless an exact maching term for e0 is found in q1
        ;
        
        // for all terms e1 of q1
        l1: // to continue from inner loop when a term cannot match because an expression is different
        
        while ( e1 = q1[ ++i1 ] ) {
          // For each (e0, e1) of the Cartesian product q0 x q1
          
          // log( 'and, (e0, e1):', e0, e1 );
          
          // Perform e0 AND e1
          var k1        = keys1s[ i1 ]
            , e1_longer = k1.length > k0l
            , i         = -1
            , different                   // considered equal until proven different
            , ka
            , ea
            , eb
            , key
            , e2
          ;
          
          // Let 'ka' be the smallest key, 'ea' the expression with the smallest key, and 'eb' that with the largest key
          if ( e1_longer ) {
            ka = k0; ea = e0; eb = e1;
          } else {
            ka = k1; ea = e1; eb = e0;
          }
          
          while ( key = ka[ ++i ] ) {
            if ( key in eb ) {
              // term is present in both expressions
              var t0 = e0[ key ], t1 = e1[ key ];
              
              if ( t0 !== t1 ) {
                var t0no = typeof t0 != object_s, t1no = typeof t1 != object_s;
                
                if ( t0no && t1no )
                  // neither t0 nor t1 are complex expressions and they are not strictly equal
                  
                  // the filter for this term would always be false, discard the entire expression
                  
                  // log( 'and, do not produce' );
                  continue l1
                ;
                
                // initialize e2 if not
                e2 = e2 || {};
                
                // AND both expressions after forcing both as complex expressions
                push.apply(
                  // First expression always evaluated on current attribute value, no additional indirection [] needed
                  // Before second expression, must reset to current attribute as it may have been changed by t0 complex expression
                  // ToDo: use 'reset' operator to do the equivalent of [ '__', key ] and also resetting regexp and groups to null
                  // Using implicit AND after reseting current value using [] ToDo: use new operator '&&' behaving like []
                  e2[ key ] =
                  
                  t0no ? [ '==', t0, [] ] : [ t0, [ '__', key ] ],
                  
                  t1no ? [ '==', t1 ] : t1
                );
                
                different = true;
                
                // log( 'different:', e2[ key ] );
              }
            } else {
              // At least one term present in one expression is not present in the other
              // Expressions can no longer be strictly equal
              different = true;
              
              // !! do not merge here, a subsequent term could be unequal
            }
          } // la: for all keys in ka
          
          if ( different ) {
            // merge different queries
            result.push( extend( {}, e0, e1, e2 ) );
          } else if ( e1_longer ) {
            // e1 is more restrictive than e0
            result.push( e1 );
          } else {
            // e0 is more restrictive than e1
            
            // We need to keep e0, don't remove it
            remove = false;
          }
        } // l1: for all terms e1 of q1
        
        if ( remove ) {
          // No exact matching term for e0 was found in q1
          keys0s.splice( i0, 1 );
          q0.splice( i0--, 1 );
          
          // log( 'and, remove e0' );
          that.removes.push( e0 );
        }
      } // l0: for all terms e0 of q0
      
      // log( 'and, add:', result );
      
      that.add( result );
      
      return that;
    }, // Query..and()
    
    /* ------------------------------------------------------------------------
        @method Query..generate()
        
        @short Generate filter() function from query.
        
        @examples
        ```javascript
          new Query(
            [
              { flow: 'store' },
              { flow: 'user', id: 231 }
            ]  
          ).generate( transform )
        ```
        
        Assuming that transform has only one parameter (is stateless and
        synchronous), and filter is stateless, generates code such as:
        ```javascript
          this.filter = function( values ) {
            var out = [];
            
            values = transform( transform );
            
            for( var i = -1, l = values.length; ++i < l;  ) {
              var v = values[ i ];
              
              var _flow = v.flow;
              
              if( _flow === "store"                ) { out.push( v ); continue; };
              if( _flow === "user" && v.id === 231 ) { out.push( v ); continue; };
            }
            
            return out;
          } // Query..filter()
        ```
        
        @description
        Generates filter() function for the current query
    */
    generate: function() {
      var that             = this
        , q                = that.query
        , l                = q.length
        , terms_counts     = {}
        , safe_vars        = []
        , safe_vars_assign = [ 'v = values[ i ]' ]
        , no_AND_term      = false
        , safe_expressions = []
        , i                = -1
        , p
        , t
        , v
        , code
        , safe_expression
      ;
      
      // Determine which terns (attributes of proposition Objects) should be cached as variables:
      //   Those which are used more than once
      // Also finds out if any term has no AND terms which would be a pass-all term condition
      while ( ++i < l ) {
        p = q[ i ];
        
        no_AND_term = true;
        
        for ( t in p ) {
          no_AND_term = false;
          
          terms_counts[ t ]
            ? ++terms_counts[ t ] == 2
              && safe_vars.push( [ '_' + t ] ) // safe because Code.._var() uses safe_identifier()
              && safe_vars_assign.push( safe_identifier( '_' + t ) + ' = v' + safe_dereference( t ) )
            
            : terms_counts[ t ] = 1
          ;
          
          v = p[ t ];
          
          if ( v && typeof v == object_s ) {
            // ToDo: complex query, determine if it is stateful (has stateful operations)
          }
        }
        
        if ( no_AND_term ) break;
      }
      
      code = new Code( get_name( that, 'generate' ) )
        ._function( 'this.filter', ___, [ 'values' ] );
        
          if ( no_AND_term ) // pass-all
            code.add( 'return values' )
          
          else if ( ! l ) // nul-filter
            code.add( 'return []' )
          
          else {
            for ( i = -1; ++i < l; ) {
              safe_expression = [];
              
              p = q[ i ];
              
              for ( t in p ) {
                v = p[ t ];
                
                safe_expression.push(
                  v && typeof v == object_s
                    // complex expression
                    ? 'query_evaluate( v, "' + safe_identifier( t ) + '" , ' + safe_value( v ) + ' )'
                    
                    // sinple equality
                    : ( terms_counts[ t ] > 1 ? safe_identifier( '_' + t ) : 'v' + safe_dereference( t ) )
                      + ' === '
                      + safe_value( v )
                );
              }
              
              safe_expressions.push( safe_expression.join( ' && ' ) );
            }
            
            code
            ._var( [ 'i=-1', 'l=values.length', 'v', 'out=[]' ].concat( safe_vars ) ) // safe
            
            // do not use unrolled while because generate is usually used for short-lived filtering
            ._while( '++i < l' )
              .add( safe_vars_assign.join( '; ' ) + '; if ( ' + safe_expressions.join( ' || ' ) + ' ) out.push( v )' ) // safe
            .end()
            
            .add( 'return out' )
          }
        
        code.end( 'Query..filter()' )
        
        //.trace()
      ;
      
      eval( code.get() );
      
      return that;
    } // Query..generate()
  } ); // Query instance methods
  
  Query.pass_all = new Query( [ {} ] ).generate();
  Query.nul      = new Query( [    ] ).generate();
  
  /* -------------------------------------------------------------------------------------------
      Query_Tree( name )
      
      Receives Query(ies) and produces an optimized decision tree to efficiently dispatch
      operations to a large number of downstream pipelets each filtered by potentially complex
      query with dozens or hundreds of terms.
      
      A trivial dispatcher evaluates sequentially each query for each operation to produce
      filtered dataflows. This works well if the number of downstream pipelets is small but when
      it becomes large with hundreds or thousands of downstream pipelets the evaluation of all
      queries for all operations becomes a major bottleneck.
      
      This is the case when the dispatcher is used to serve a dataflow to thousands of web
      socket clients, for either a successful application or a large number of applications
      sharing the same infrastructure to dispatch the same dataflows to a large number of web
      socket clients.
      
      The trivial implementation completes in O( n * t ) time, where n is the number of
      downstream clients and t the average number of terms of Query(ies).
      
      The Query_Tree implementation can reduce this evaluation time when the queries have common
      terms such as these queries:
        [ { flow: 'user', id: 5  }, { flow: 'store', id: 8 } ] for user_5
        
        [ { flow: 'user', id: 7  }, { flow: 'store', id: 8 } ] for user_7
        
        [ { flow: 'user', id: 12 }, { flow: 'store', id: 8 } ] for user_12
        
        [ { flow: 'user', id: 3  }, { flow: 'store', id: 2 } ] for user_3
        
      In this case, instead of evaluating the two queries sequentially, the Query_Tree allows to
      evaluate the 'flow' term first for both queries simultaneously, then branch out to two
      branches, one for the value 'user', the other for the value 'store'. The 'user' branch has  
      four sub-branches, for id 5, 7, 12, and 3. The 'store' branch has two sub-branches for
      id 8 and 2:
      
        { "flow": {
          "user": { "id": { "5": user_5, "7": user_7, "12": user_12, "3": user_3 } },
          
          "store": { "id": { "8": [ user_5, user_7, user_12 ], "2": user_3 } }
        } }
      
      Please note that current implementation's query tree has a different structure, that may
      (will) change in the future, and that therefore one should not rely on this structure
      in users' code.
      
      Now in the worst case scenario, finding the full list of subscribers for an operation
      requires to evaluate two terms versus 12 terms for the trivial implementation. But
      most importantly, as the number of users connected to this dispatcher increases, the
      Query_Tree will always find the list of all subscribers after evaluating two terms, versus
      ( 2 or 3 ) * n terms for the trivial dispatcher.
      
      Finding the full list of subscribers using the Query_Tree completes in O( t ) time vs
      O( n * t ) time for the trivial implementation.
      
      If one considers that the number of terms is bound only by the complexity of the
      application, then these O numbers can be understood as:
      
        O( application_complexity * number_of_connected_users )
      vs
        O( application_complexity )
      
      Obviously the second is user-scalable while the first is not.
      
      Both algorithms do not scale with application complexity which therfore must be
      dealt with raw performence. This performance is improved by merging queries
      upstream using Query..and() and Query..add(). This is particularly useful for
      authorization rules that arguably constitute the largest source of complexity for
      modern web applications.
      
      Parameters:
      - name (String): debugging name
  */
  function Query_Tree( name ) {
    var that = this;
    
    Loggable.call( that, name );
    
    that.top = new Query_Tree_Node();
    
    that.history = [];
    
    // all subscriber pipelets of all nodes
    that.subscribers = [];
  } // Query_Tree()
  
  // Nodes for Query Trees
  function Query_Tree_Node() {
    var that = this;
    
    // hashed by terms' keys, each branch is the hashed by terms' values to lead to it's sub-node
    that.branches = Dictionary();
    
    // all the term keys for the above branches
    that.keys = [];
    
    // all subscriber pipelets
    that.subscribers = [];
  } // Query_Tree_Node()
  
  var complex_expression_branch_value = '[...]';
  
  function find_complex_expression( expressions, e ) {
    // Note that Array..find() is not available in IE, so we use a loop here
    if ( expressions )
      for ( var i = -1, expression; expression = expressions[ ++i ]; )
        if ( equals( e, expression.e ) )
          return expression
  } // find_complex_expression()
  
  Loggable.subclass( 'Query_Tree', Query_Tree, {
    // Add or terms for a subscriber
    add: function( or_terms, subscriber ) {
      var that            = this
        , all_subscribers = that.subscribers
        , top             = that.top
        , i               = -1
        , or_term
      ;
      
      that.history.push( [ new Date(), get_name( subscriber ), 'add', or_terms.slice() ] );
      
      // For all OR-terms of this OR-AND query or partial query
      while ( or_term = or_terms[ ++i ] )
        // Lookup (or create) the leaf node for this OR-term
        add_term( top, or_term, Object.keys( or_term ) )
      ;
      
      return that;
      
      // Add all keys of a term, descending the tree, creating new nodes as needed
      function add_term( node, term, term_keys ) {
        var branches
          , keys
          , i
          , l
          , key
          , subscribers
          , _
        ;
        
        main:
        
        while( term_keys.length ) {
          // There are still some term keys not located in the tree
          
          branches = node.branches;
          keys     = node.keys;
          
          for ( i = -1, l = keys.length; ++i < l; )
            // Lookup this node key in the term
            if ( term.hasOwnProperty( key = keys[ i ] ) ) {
              // Found an existing node key for which there is a property in this term
              // Remove this key from term_keys
              term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in add()
              
              // Lookup branch for this key, it must exist because it is created when a key is added
              // then add value or expression to branch
              node = add_expression_to_branch( branches[ key ] );
              
              continue main;
            }
          // for all keys in node
          
          // No existing node key found in this term
          // Retreive the first key from term keys, add it to this node's keys
          keys.push( key = term_keys.shift() );
          
          // Create new branch with this key, and add value or expression
          node = add_expression_to_branch( branches[ key ] = Dictionary() );
        }
        // No more term keys to locate or create in this tree
        // We have found (or created) the leaf node for this term
        // Add this term's subscriber to this leaf
        // ToDo: assert that subscriber is not already subscribed
        subscribers = node.subscribers;
        
        subscribers.indexOf( subscriber ) < 0
          ? subscribers.push( subscriber )
          : log( get_name( that, 'add' ) + 'error,'
              //, 'or terms:', pretty( or_terms )
              , 'adding term:', pretty( term )
              , 'twice for the same subscriber:', get_name( subscriber )
              , '\n\n  history:', pretty( that.history )
              , '\n\n  stack:' + RS.stack()
            )
        ;
        
        // add subscriber to all_subscribers
        for ( i = -1; _ = all_subscribers[ ++i ]; )
          if ( subscriber === _.input ) {
            _.count++;
            
            break;
          }
        
        _ || all_subscribers.push( { input: subscriber, count: 1 } );
        
        return node; // return the leaf node
        
        function add_expression_to_branch( branch ) {
          var v = term[ key ]; // May be undefined, ToDo: add tests for undefined values
          
          return v && typeof v == object_s // complex expression
            ? add_complex_expression( v )
            
            : v === complex_expression_branch_value // escape complex_expression_branch_value
            ? add_complex_expression( [ '==', complex_expression_branch_value ] )
            
            : branch[ v ] || ( branch[ v ] = new Query_Tree_Node() )
          
          function add_complex_expression( e ) {
            var expressions = branch[ complex_expression_branch_value ]
                            = branch[ complex_expression_branch_value ] || []
              , expression  = find_complex_expression( expressions, e )
            ;
            
            expression ||
              expressions.push( expression = { e: e, child: new Query_Tree_Node() } )
            ;
            
            return expression.child
          } // add_complex_expression()
        } // add_expression_to_branch()
      } // add_term()
    }, // Query_Tree..add()
    
    remove: function( or_terms, subscriber ) {
      var that            = this
        , all_subscribers = that.subscribers
        , top             = that.top
        , position        = -1 // the name position must be seen for exception message in remove_term() closure
        , or_term
        , history
      ;
      
      that.history.push( history = [ new Date(), get_name( subscriber ), 'remove', or_terms.slice() ] );
      
      // For all OR-terms of this OR-AND query or partial query
      while ( or_term = or_terms[ ++position ] )
        remove_term( top, or_term, Object.keys( or_term ) )
      ;
      
      return that;
      
      // Remove term from sub-tree, descending the tree recursively
      // ToDo: add tests for Query_Tree..remove()
      function remove_term( node, term, term_keys ) {
        node || fatal( node + ' node' ); // occured, most-likely after wrong differences emitted removed terms
        
        // history.push( term_keys.slice() );
        
        var subscribers = node.subscribers
          , keys        = node.keys
          , branches
          , key
          , branch
          , v
          , i
          , l
          , _
        ;
        
        if ( term_keys.length ) {
          // There are still some term keys not located in the tree
          
          branches = node.branches;
          
          for ( i = -1, l = keys.length; ++i < l; )
            // Lookup this node key in the term
            if ( term.hasOwnProperty( key = keys[ i ] ) ) {
              // Found the node key for which there is a property in this term
              // Remove this key from term_keys
              term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in remove_term()
              
              // Lookup branch for this key, it must exist because it is created when a key is added
              branch = branches[ key ];
              
              v = term[ key ]; // may be undefined
              
              if ( typeof v == object_s && v )
                // this is a complex expression
                remove_complex_expression( v )
              
              else if ( v === complex_expression_branch_value )
                // escape complex_expression_branch_value
                remove_complex_expression( [ '==', v ] )
              
              else {
                // history.push( 'removing value: ' + v + ', for key: ' + key + ', of term: ' + log.s( term ) );
                
                // Lookup the sub-node for this key's value
                remove_term( branch[ v ], term, term_keys ) &&
                  // The branch is now empty, remove it
                  delete_branch( v )
              }
              
              break;
            }
          // for all node keys
          
          i == l && fatal( 'term not found' );
        } else {
          // No more term keys to locate in this tree
          // We have found the leaf node for this term
          // Remove subscriber from leaf
          var index = subscribers.indexOf( subscriber );
          
          index < 0
            && fatal( 'cannot find subscriber (' + get_name( subscriber ) + ') in tree where it was expected' )
          ;
          
          // history.push( 'at index: ' + index + ', removing subscriber: ' + subscribers.splice( index, 1 )[ 0 ]._get_name() );
          subscribers.splice( index, 1 );
          
          // remove subscriber from all_subscribers
          for ( i = -1; _ = all_subscribers[ ++i ]; )
            if ( subscriber === _.input ) {
              --_.count || all_subscribers.splice( i, 1 );
              
              break;
            }
        }
        
        // Return true if the node is now empty, false if not empty
        // It is empty if it has no subscribers and no keys
        return ! ( subscribers.length + keys.length );
        
        function remove_complex_expression( e ) {
          var expressions = branch[ complex_expression_branch_value ]
            , expression  = find_complex_expression( expressions, e )
          ;
          
          if ( ! expression )
            return fatal( 'expression not found: ' + log.s( e ) )
          ;
          
          // history.push( 'removing complex expression: ' + log.s( e ) + ', for key: ' + key + ', of term: ' + log.s( term ) );
          
          if ( remove_term( expression.child, term, term_keys ) ) {
            // no-more subscribers for this expression, remove it from expressions
            expressions.splice( expressions.indexOf( expression ), 1 );
            
            expressions.length ||
              // no-more complex expression for this branch
              delete_branch( complex_expression_branch_value )
            ;
          }
        } // remove_complex_expression()
        
        function delete_branch( v ) {
          delete branch[ v ];
          
          // history.push( 'deleted branch: ' + v );
          
          if ( ! Object.keys( branch ).length ) {
            // There are no more values in this branch, remove this branch
            delete branches[ key ];
            
            // history.push( 'deleted branches for key: ' + key );
            
            keys.splice( keys.indexOf( key ), 1 );
          }
        } // delete_branch()
        
        function fatal( message ) {
          throw new Query_Error( get_name( that, 'remove' ) + message
            + ', key: '         + key
            + ', i: '           + i
            + ', term: '        + pretty( term )
            + ', keys: '        + pretty( keys )
            + ', term_keys: '   + pretty( term_keys )
            + ', branch: '      + pretty( branch )
            //+ ', or_terms: '    + pretty( or_terms )
            + ', position: '    + position
            + ', subscribers: ' + ( subscribers && pretty( subscribers.map( function( s ) { s._get_name() } ) ) )
            + ', history: '     + pretty( that.history )
          );
        }
      } // remove_term()
    }, // Query_Tree..remove()
    
    // ToDo: optimize unfiltered routing in top node.
    // ToDo: document route()
    route: function( operation, values ) {
      var top = this.top;
      
      // Each subscriber is an object:
      //  input: subscriber Input
      //  v    : values to emit
      var subscribers = []
        , subscribers_operations
        , i, p, v, rl
      ;
      
      switch( operation ) {
        case 'update':
          for ( i = -1; v = values[ ++i ]; ) {
            route_update( top, v[ 0 ], i, 0 ); // route remove
            route_update( top, v[ 1 ], i, 1 ); // route add
          }
          
          subscribers_operations = [
            [ 'remove', [] ],
            [ 'add'   , [] ],
            [ 'update', [] ]
          ]
          
          // emit operations to all subscribers
          for ( i = -1, rl = subscribers.length; ++i < rl; ) {
            var r = subscribers[ i ], input = r.input, added = [], removed = [], updated = [];
            
            input.source_subscriber_index = 0;
            
            v = r.v;
            
            for ( var j = -1, vl = v.length; ++j < vl; ) {
              var update = v[ j ];
              
              if ( update ) {
                // there is an add, remove, or update at this position
                if ( update[ 0 ] ) {
                  if ( update[ 1 ] ) {
                    // this is an update
                    updated.push( update );
                  } else {
                    // ToDo: add tests
                    // this is a remove
                    removed.push( update[ 0 ] );
                  }
                } else {
                  // this is an add
                  // ToDo: add tests
                  added.push( update[ 1 ] );
                }
              }
            }
            
            var operations = ( removed.length && 1 ) + ( added.length && 1 ) + ( updated.length && 1 );
            
            if ( operations ) {
              var t; // a transaction reference shared between operations
              
              if ( operations > 1 ) t = { count: operations }; // ToDo: add tests
              
              if ( removed.length ) {
                subscribers_operations[ 0 ][ 1 ].push( { input: input, v: removed, t: t } );
              }
              
              if ( added.length ) {
                subscribers_operations[ 1 ][ 1 ].push( { input: input, v: added  , t: t } );
              }
              
              if ( updated.length ) {
                subscribers_operations[ 2 ][ 1 ].push( { input: input, v: updated, t: t } );
              }
            }
          } // for all subscribers
        break;
        
        case 'clear':
          // Return immediately, clear operation for all subscribers
        return [ [ operation, this.subscribers ] ];
        
        default:
          // This is an add or remove operation
          
          // Route each value independently, to accumulate values filtered by each node
          for ( i = -1; v = values[ ++i ]; ) {
            /*
              Note: pushed is an array of destination pipelets source_subscriber_index used by add_value()
              to prevent sending duplicate values to the same subscriber.
              
              These indexes start at 1, therefore the first element of the array could be uninitialized
              but this could result in an Array holding the undefined value followed by integers. In v8
              this would result in realocation of the Array. This is why we initialize pushed with the
              first element set to an integer, preventing realocation.
            */
            var pushed = [ 0 ];
            
            route( top, v, add_value );
          }
          
          subscribers_operations = [ [ operation, subscribers ] ];
        break;
      } // switch( operation )
      
      clear_source_subscriber_indexes( subscribers )
      
      return subscribers_operations;
      
      function add_value( values, value, subscriber_index ) {
        // Duplicates values may happen on queries with an intersection and therefore need to be eliminated
        
        if ( subscriber_index ) {
          if ( pushed[ subscriber_index ] ) return;
          
          pushed[ subscriber_index ] = 1;
        }
        
        values.push( value );
      } // add_value()
      
      function route_update( node, value, position, offset ) {
        route( node, value, function( values, value ) {
          // Duplicates values may happen on queries with an intersection and therefore need to be eliminated
          var update = values[ position ];
          
          // ToDo: test updates, 4 cases at least including duplicates
          if ( update ) {
            // There is already at least one of the two values set for this update
            // Duplicates are copied again at the same position and offset, preventing duplicate emissions
            update[ offset ] = value;
          } else {
            // This is the first value for this update
            values[ position ] = offset ? [ null, value ] : [ value ];
          }
        } );
      } // route_update()
      
      // Route value to node, recursively
      function route( node, value, add_value ) {
        var keys             = node.keys, key
          , branches         = node.branches
          , node_subscribers = node.subscribers
          
          , rl               = node_subscribers.length
          , i                = -1
          , input
          , subscriber_index
          , values
          , v
          , branch
          , child
          , expressions
          , expression
          , j
        ;
        
        // Add value to this node's subscribers, if not already done
        while ( ++i < rl ) {
          input = node_subscribers[ i ];
          subscriber_index = input.source_subscriber_index; // ToDo: stop using input to store source_subscriber_index
          
          // Push values into this node's subscribers
          // Except if a value was already pushed to this subscribers, preventing duplicates
          // This also guaranties that operations are sent in the same order received although this is not a requirement
          
          subscriber_index
            ? // Subscriber Input already has at least one value for this operation
              values = subscribers[ subscriber_index - 1 ].v
              
            : // Input does not have any update yet
            
              // ToDo: add a test that fails if subscriber_index local variable is not assigned bellow:
              subscriber_index
                = input.source_subscriber_index
                = subscribers.push( { input: input, v: values = [] } ) // source subscriber indexes start at 1
          ;
          
          add_value( values, value, subscriber_index );
        } // add value to all node subscribers
        
        // Lookup children nodes for possible additional matches
        for ( i = -1; key = keys[ ++i ]; )
          if ( value.hasOwnProperty( key ) ) {
            v      = value   [ key ]; // ToDo: add tests for undefined values
            branch = branches[ key ];
            child  = branch[ v ];
            
            child &&
              // We have a value for this term and this value has a child node, descend
              route( child, value, add_value )
            ;
            
            // Also route using complex expressions if any
            // ToDo: store complex expressions into node instead of the complex_expression_branch_value branch
            if ( expressions = branch[ complex_expression_branch_value ] )
              for ( j = -1; expression = expressions[ ++j ]; )
                query_evaluate( value, key, expression.e )
                  && route( expression.child, value, add_value )
          }
        // for all term keys
      } // route()
    }, // Query_Tree..route()
    
    /* ------------------------------------------------------------------------
        pause( destination )
        
        Pause emissions to destination
    */
    pause: function( destination ) {
      // ToDo: implement pause()
      return this;
    }, // Query_Tree..pause()
    
    /* ------------------------------------------------------------------------
        resume( destination )
        
        Resume emissions to destination
    */
    resume: function( destination ) {
      // ToDo: implement resume()
      return this;
    } // Query_Tree..resume()
  } ); // Query_Tree instance methods
  
  function clear_source_subscriber_indexes( subscribers ) {
    // ToDo: remove this hack
    // Clear all subscribers' source_subscriber_index in case of re-entrance
    // !! This must be done before emiting operations to prevent re-entrance issues on graph loops
    var i = -1
      , l = subscribers.length
    ;
    
    while( ++i < l )
      subscribers[ i ].input.source_subscriber_index = 0
    ;
  } // clear_source_subscriber_indexes()
  
  Query.Tree = Query_Tree;
  
  return RS.Query = Query
} ); // query.js
