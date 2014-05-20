/*  query.js
    
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

/* -------------------------------------------------------------------------------------------
   Queries:
   -------
   
   Queries allow to fetch, and subscribe to, subsets from upstream pipelets dataflows,
   reducing both upstream bandwidth requirements and latencies.
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
  
  var log        = XS.log
    , subclass   = XS.subclass
    , extend     = XS.extend
    , extend_2   = XS.extend_2
    , Dictionary = XS.Dictionary
    , Code       = XS.Code
    
    , slice      = Array.prototype.slice
    , push       = Array.prototype.push
    
    , toString   = Object.prototype.toString
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs pipelet, " + m );
  } // ug()
  
  function exception( e, name ) {
    // ToDo: decode stack trace to resolve urls of minified sources with a source map
    // Alternatively open a feature request in Google and Firefox to decode such urls
    // displayed in the console.
    
    log( 'exception, Pipelet..' + name
      + ', ' + e
      + ', stack trace: ' + e.stack 
    );
    
    // ToDo: send exception to an exception datafow that can be routed to a server
  } // exception()
  
  /* -------------------------------------------------------------------------------------------
     Query( query ).
     
     A query is a set of 'OR-AND' expressions, aka or-terms, where each object is an operand of
     the OR-expression and each property of each object is an operand of the sub-AND expression.
     
     Parameters:
       - query (optional): Array or or-expression (or terms).
     
     Example, the query:
       [
         { flow: 'users' , id: 1092 },
         { flow: 'stores', id: 231  },
         { flow: 'sales' , store_id: 231, year: [ '>=', 2013 ] }
       ]
       
       Is equivalent to the JavaScript boolean expression on a value 'v':
            ( v.flow === 'users'  && v.id === 1092 )
         || ( v.flow === 'stores' && v.id === 231 )
         || ( v.flow === 'sales'  && v.store_id === 231 && v.year >= 2013 )
       
       Which is also equivalent to an SQL-where clause:
         WHERE ( flow = 'users'  AND id = 1092 )
            OR ( flow = 'stores' AND id = 231 )
            OR ( flow = 'sales'  AND store_id = 231 AND year >= 2013 )
     
     So a query is code expressed with sets of JavaScript objects. With Connected Sets, these
     expressions become dataflows, which can enable realtime dynamic filters as exposed by
     filter.js.
     
     Queries are used to retrieve subsets of values from source dataflows and to filter
     emitted operations to downstream pipelets.
     
     Query objects are created using a set of expressions as a parameter, the filter code is
     generated using generate() generating the filter() method that filters Arrays of Objects.
     
     A query can be "ORed" with an other query to result in the ORed combination of both
     queries. This is useful to merge a number of branches and build an optimized query for all
     these branches.
     
     The OR operation is provided by Query..add() which adds expressions into an existing
     query. The resulting query is optimized to remove redundant expressions. More details in
     Query..add().
     
     Query..remove() allows to do the opposite of or-operations, effecitvely removing
     or-expressions from an existing query.
     
     A query can be "ANDed" with an other query to result in the ANDed combination of both
     queries. This is useful to restrict one query by another one when two filters are connected
     one downstream of the other. A use case if for combining an authorization query with a user
     query requesting a subset of what this user is authorized to request.
     
     "Anding" queries is provided by Query..and(). 
     
     Last, but not least, multiple queries can be combined to produce and maintain in realtime
     an optimized query tree to allow fast dispatching of a dataflow to many clients each
     with a different query filtering what it processes.
     
     A query is an OR-expression expressed using an Array of expressions, e.g.
     [ expression_1, expression_2, ... ] means "expression_1 OR expression_2".
     
     Each expression in a query is an AND-expression expressed using a JavaScript Object where
     each attribute / value pair represents a term, e.g. { a_1: v_1, a_2: v_2, ... } which
     means "a_1 == v_1 AND a_2 == v_2 AND ...".
     
     Terms can express more than simple equality conditions using JavaScript Arrays as
     values, e.g. "year: [ '>=', 2013 ]" means "year >= 2013" which general form is:
     
       attribute: [ operator, value ]
       
     Meaning "( attribute operator value ) == true".
     
     More complex expressions can be expressed such as the two equivalent expressions:
       year: [ '>=', 2009, 'and', '<=', 2012 ]
       
       year: [ 'in', 2009, 2010, 2011, 2012 ]
     
     Which both mean "year >= 2009 AND year <= 2012".
     
     The following:
       year: [ '<=', 2005, 'or', [ '>=', 2009, 'and', '<=', 2012 ] ]
     
     Means "year <= 2005 OR ( year >= 2009 AND year <= 2012 )".
     
     When grouping is required, one can use additional nested Arrays, e.g.:
       year: [ [ 'in', 2009, 2010, 2011, 2012 ], 'or', '<=', 2005 ]
       
     Which means "year in [ 2009, 2010, 2011, 2012 ] OR year <= 2005".
     
     When expressions involve more than one attribute, these can be specified
     using the '_' operator, e.g. "sales / count > 1000" can be expressed as:
     
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
     
     When an operation succeeds, it returns the right-most operand value.
     
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
       text: [ 'match', [ 'regex', '^[0-9]+.*test', 'i' ] ]
     
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
     
     Note that there are implicit 'AND' operators in this expression, because
     of progressivity, if a subexpression fails, the entire expression fails.
     
     Attributes in Object values are specified using the '.' operator, e.g.:
     
       user: [ [ '.', 'age' ], '>=', 18 ]
     
     Means user.age > 18.
     
     Note that using this method rather than the more intuitive 'user.age'
     notation for attribute names has at least two significant advantages:
     a) it is not ambiguious, therefore attributes can validly contain dots
     b) evaluation performance is maximal for the vast majority of attributes
       that would otherwise be compromised because all attributes would have
       to be searched for non-existant '.' characters.
     
     Any depth can be reached using the following notation because the '.'
     operator is greedy (i.e. consumes all expression values until the first
     closing bracket ']'):
     
       user: [ [ '.', 'profile', 'age' ], '>=', 18 ]
       
     Meaning 'user.profile.age >= 18'.
     
     The current attribute can be changed using the '__' operator:
     
       user: [ [ '__', 'user', 'profile', 'age' ], '>=', 18, '<', 26 ]
     
     Meaning "user.profile.age >= 18 AND user.profile.age < 26".
     
     Using progressivity, this could also be expressed as:
       user: [ [ '$', 18, ] '<=', [ '.', 'profile', 'age' ], '<', 26 ]
     
     Specifying Object and Array literal values is done using the literal '$'
     operator:
       [ '$', { ... } ]
       [ '$', [ ... ] ]
     
     Directly providing an Object in place of an operator, evaluates the
     object as an expression that may contain Array expressions, e.g.:
     
       { user: { profile: { age: [ '>=', 18 ] } } }
     
     The above Object expression succeeds if 'user' is an object containing
     a 'profile' object containing an 'age' attribute superior or equal to 18.
     'user' and 'profile' may contain other attributes. To test for strict
     equality use operator "==" instead:
     
       { user: [ "==", { profile: { age: 18 } } ] }
     
     Which means: a user object which contains ONLY a profile object which
     contains ONLY an age attribute which value is 18.
     
     Last but not least, developpers can implement query procedures that are
     specified as functions receiving a context which is the evaluation context
     of the expression, e.g.:
     
       Query.Operator( 'mod', function( left, divider, reminder ) {
         return left % divider == reminder;
       }, options );
     
     This operator could be used as:
       { count: [ 'mod', 7, 3 ] }
     
     In "this" context, developpers have access to the following attributes:
       - value (Object): the current value evaluated
       
       - __: current default value of execution, used by default as the left
         value for all operators when there is no left value provided, typically
         at the beginning of a bracket '[' sub-expression.
       
       - regexp (RegExp): the last regular expression used
       
       - groups (Array): the last groups from the last evaluated regular
         expression, or null if there was no match or undefined if there was no
         prior regular expression evaluation.
       
     Developpers can add other custom attributes to "this" context, but it is
     highly recommended to do so by prefixing these attributes using a vendor
     prefix.
     
     Attempting to redefine an existing operator throws an exception.
     
     The 'options' (Object) parameter to Query.Operator() specifies:
       - greedy (Boolean): if true will consume all values up to the closing
         bracket ']' in the expression, such as used by operators 'in',
         'not_in', '.', '_', and '__'.
         
       - accepts_fail(Boolean): if true, the operator accepts operands that
         may have fails. This is the case for operator '!'.
         
       - literal_parameters (Boolean): if true, means that parameters should
         not be evaluated and should be provided to the operator directly. This
         is the case of operator '$' allowing to pass literal Arrays that should
         not be interpreted as expressions.
     
     All built-in operators are implemented using Query.Operator() except "||"
     and "failed" which are implemented by Query.evaluate() and as such can
     execute at a lower priority than all other operators.
     
     Geospatial or other heavy operators can therefore be provided as a
     separate module.
     
     One may implement SQL, or any other query language using built-in
     operators, but needs to consider the cost especially on the client
     side.
     
     Other performance considerations:
       Query_Tree performance is considered more important than Query operations performance.
       This is because query trees have to route a large number of data events while queries
       themselves are expected to have a much lower rate of change in most applications.
       
       To provide best query syntax while maintaining high performances might require to have
       two syntaxes: one for queries for designers, and one for queries trees which is internal
       to Connected Sets' implementation.
  */
  function Query( query ) {
    // Result expressions
    this.query = [];
    this.keys  = []; // Query expressions keys cache
    
    // Expressions optimized-out by Query..add()
    this.discard_optimized();
    
    // Operations resulting from operations
    this.discard_operations();
    
    // Add the initial query in an optimized way
    return query ? this.add( query ) : this;
  } // Query()
  
  var query_keys = Query.keys = function( query ) {
    var keys = [], i = -1, e;
    
    while( e = query[ ++i ] ) keys.push( Object.keys( e ) );
    
    return keys;
  };
  
  /* -----------------------------------------------------------------------------------------
     Query.Error( message )
     
     Custom Error class for Query.
  */
  var Query_Error = Query.Error = function( message ) {
    this.name    = 'Query_Error';
    this.message = message;
    
    if ( Error.captureStackTrace ) {
      // see Google JavaScriptStackTraceApi:
      //   http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
      Error.captureStackTrace( this, Query_Error );
    } else {
      this.stack = Error().stack;
    }
  }
  
  subclass( Error, Query_Error );
  
  /* -----------------------------------------------------------------------------------------
     Query.least_restrictive_keys( e0, e1, keys0, keys1 )
     
     Determines which AND-expression is the least-restricive or as restrictive, i.e. describes
     the largest set.
     
     An AND-expression is described using a JavaScript Object which attribute names and values
     determine a set of JavaScript Objects that match all attributes names and values of the
     AND-expression, e.g.:
       - The AND-expression { flow: 'stores' } describes a set where all JavaScript Objects
         have a flow attribute which value is 'stores'.
       
       - The AND-expression { flow: 'sales', month: 1 } describes the set of all JavaScript
         Objects which flow attribute is sales' AND whcih 'month' attribute has the value '1'.
     
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
       XS Queries are OR-expressions which terms are AND-expresssions as tested by this
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
  */
  Query.least_restrictive_keys = function( e0, e1, keys0, keys1 ) {
    var keys = keys0.length <= keys1.length ? keys0 : keys1
      , i = -1, key
    ;
    
    while ( key = keys[ ++i ] ) {
      if ( e0[ key ] !== e1[ key ] ) return null; // none is least restrictive
      
      continue;
      
      var v0 = e0[ key ], v1 = e1[ key ]
        , t0 = typeof v0, t1 = typeof v1
      ;
      
      //if ( t0 != 'object' && t1 != "object" ) {
      //} else {
      //  return null; // cannot tell which one is the least restrictive
      //}
    }
    
    return keys; // keys of least restrictive expression 
  }; // Query.least_restrictive_keys()
  
  var fail; // fail is the undefined value at this time but may be replaced by some other value in the future
  
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
  
  /* -----------------------------------------------------------------------------------------
     Query.evaluate( value, attribute, expression )
     
     Evaluates if expression matches attribute in value.
     
     Parameters:
     - value (Object): the current value which attribute is evaluated for a match with
       expression
       
     - attribute (String): the name of the attribute in value begin evaluated
     
     - expression:
       - Array: an expression, see definition in Query above
       - Object: an object literal, possibly including matching expressions (not yet
         implemented)
         
     Example:
       Query.evaluate(
         { flow: 'user', id: 1, profile: { name: 'Alice' } },
         
         'profile',
         
         [ [ '.', 'name' ], "==", "Alice" ]
       );
       
       // -> true
  */
  Query.evaluate = function( value, attribute, expression ) {
    var context = new Query.Evaluation_Context( value, attribute );
    
    return context.evaluate( expression ) === fail ? false: true;
  };
  
  Query.Evaluation_Context = function( value, attribute ) {
    // Current value (Object) which attribute will be evaluated
    this.value = value;
    
    // Current default value of evaluation
    this.__ = value[ attribute ];
  };
  
  extend_2( Query.Evaluation_Context.prototype, {
    evaluate: function( expression ) {
      var left = this.__;
      
      if ( expression instanceof Array ) {
        var skip = false, i = 0;
        
        while ( i < expression.length ) {
          var first = expression[ i++ ], type = typeof first;
          
          switch( type ) {
            default:
              throw new Query_Error( 'evaluate()'
                + ', invalid operator type: ' + type
                + ', in expression ' + log.s( expression )
                + ', at position ' + ( i - 1 )
              );
            break;
            
            case 'object': // this is a subexpression
              if ( skip ) break;
              
              left = this.evaluate( first );
            break;
            
            case 'string': // this is an operator
              switch( first ) {
                case 'failed':
                  if ( left === fail ) {
                    // Failed, becomes success using default value or true
                    if ( ( left = this.__ ) === fail ) left = true;
                    
                    skip = false;
                  } else {
                    // Success, becomes failure, will skip until next 'failed' or '||'
                    left = fail;
                  }
                break;
                
                case '||':
                  if ( left === fail ) {
                    // Failed, try alternate using default value or true
                    if ( ( left = this.__ ) === fail ) left = true;
                    
                    skip = false;
                  } else {
                    // Success, no need to evaluate alternate, skip until next 'failed' or '||'
                    skip = true;
                  }
                break;
                
                default:
                  var operator = operators[ first ];
                  
                  if ( operator ) {
                    var f = operator[ 0 ]
                      , options = operator[ 1 ] || {}
                      , start = i
                    ;
                    
                    // Calculate position of next operator in expression
                    i = options.greedy ? expression.length : i + ( f.length || 1 ) - 1;
                    
                    if ( skip ) break;
                    
                    var parameters = expression.slice( start, i );
                    
                    parameters.unshift( left );
                    
                    if ( ! options.literal_parameters ) {
                      // Evaluate all parameters
                      var no_fail = ! options.accepts_fail;
                      
                      for ( var j = 0, l = parameters.length; ++j < l; ) {
                        var v = parameters[ j ];
                        
                        if ( typeof v == 'object' && v instanceof Array ) {
                          parameters[ j ] = left = this.evaluate( v );
                          
                          if ( left === fail && no_fail ) {
                            skip = true;
                            
                            break;
                          }
                        }
                      } // For all parameters
                    } // Evaluate all parameters
                    
                    if ( skip ) break;
                    
                    left = f.apply( this, parameters );
                  } else {
                    throw new Query_Error( "evaluate(), Unknown operator: " + first );
                  }
                break;
              } // switch operator
            break;
          } // switch typeof first
          
          if ( left === fail ) skip = true; // until the next 'or'
        } // While there are terms
      } else { // expression instanceof Array
        left = this.evaluate_object( expression );
      }
      
      return left;
    }, // evaluate()
    
    evaluate_object: function( object ) {
      var __ = this.__ // save __
        , left = __
        , ___
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
              this.__ = v;
              
              if ( this.evaluate( e ) === fail ) left = fail;
            break;
            
            case '[object Object]':
              this.__ = v;
              
              if ( this.evaluate_object( e ) === fail ) left = fail;
            break;
          }
          
          if ( left === fail ) break;
        }
      }
      
      this.__ = __; // restore __
      
      return left;
    } // evaluate_object()
  } ); // Query.Evaluation_Context instance attributes
  
  var Operator = Query.Operator = function( name, f, options ) {
    if ( name instanceof Array ) {
      return name.forEach( function ( name ) { Operator( name, f, options ) } );
    }
    
    if ( operators[ name ] ) throw new Query_Error( 'Operator() "' + name + '" is already defined' );
    
    operators[ name ] = [ f, options ];
  }; // Query.Operator()
  
  // Operator implemented in evaluate() or reserved
  Operator( [ 'failed', '||' ], function() {} );
  
  /* -----------------------------------------------------------------------------------------
     equals( a, b )
     
     Returns true if a and b are identical, false otherwise.
     
     Parameters:
       a (Any type): value to compare to b
       b (Any type): value compared to a
     
     Design Choices:
       'a' is considered equal to 'b' if all scalar values in a and b are strictly equal as
       compared with JavaScript operator '==='.
       
       This means that 0 and -0 are considered equal while this is not exactly the case.
       
       NaN is handled properly.
       
       If a and b are non-Array Objects, the order of occurence of attributes is considered
       irrelevant, e.g. { a: 1, b: 2 } is considered equal to { b: 2, a: 1 }.
       
       Cyclic objects are not supported out of performance considerations and will throw:
         RangeError: Maximum call stack size exceeded
  */
  function equals( a, b ) {
    if ( a === b ) return true; // strick equality, end of story, but note that 0 === -0
    
    return _equals( a, b );
    
    function _equals( a, b ) {
      var s, l, p, x, y;
      
      // NaN is the only value not equal to itself
      if ( a !== a && b !== b ) return true;
      
      // They should have the same Object.toString() signature
      if ( ( s = toString.call( a ) ) !=  toString.call( b ) ) return false;
      
      switch( s ) {
        default:
          return a.valueOf() === b.valueOf();
        
        case '[object Number]':
          a = +a;
          b = +b;
          
          return a == b || ( a !== a && b !== b );
        
        case '[object RegExp]':
          return a.source   == b.source
            && a.global     == b.global
            && a.ignoreCase == b.ignoreCase
            && a.multiline  == b.multiline
            && a.lastIndex  == b.lastIndex
          ;
        
        case '[object Function]':
          return false; // functions should be strictly equal because of closure context
        
        case '[object Array]':
          if ( ( l = a.length ) != b.length ) return false;
          // Both have as many elements
          
          while ( l-- ) {
            if ( ( x = a[ l ] ) === ( y = b[ l ] ) || _equals( x, y ) ) continue;
            
            return false;
          }
          
          return true;
        // [object Array]
        
        case '[object Object]':
          l = 0; // counter of 'a' own properties
          
          for ( p in a ) {
            if ( a.hasOwnProperty( p ) ) {
              l += 1;
              
              if ( ( x = a[ p ] ) === ( y = b[ p ] ) || _equals( x, y ) ) continue;
              
              return false;
            }
          }
          
          // Check if 'b' has as many own properties as 'a'
          for ( p in b ) {
            if ( b.hasOwnProperty( p ) && --l < 0 ) return false;
          }
          
          return l == 0 ? true : false;
        // [object Object]
      } // switch toString.call( a )
    } // _equals()
  } // equals()
  
  Operator( '==', function( a, b ) { return equals( a, b ) ? b : fail; } );
  Operator( '!=', function( a, b ) { return equals( a, b ) ? fail : b; } );
  
  Operator( '>' , function( a, b ) { return a >  b ? b : fail; } );
  Operator( '>=', function( a, b ) { return a >= b ? b : fail; } );
  Operator( '<' , function( a, b ) { return a <  b ? b : fail; } );
  Operator( '<=', function( a, b ) { return a <= b ? b : fail; } );
  
  Operator( '+', function( a, b ) { return a + b; } );
  Operator( '-', function( a, b ) { return a - b; } );
  Operator( '*', function( a, b ) { return a * b; } );
  Operator( '/', function( a, b ) { return a / b; } );
  Operator( '%', function( a, b ) { return a % b; } );
  
  Operator( 'RegExp', function( _, r, options ) {
    var __;
    
    if ( typeof r == __ ) {
      r = this.regexp;
      
      if ( r == __ ) return fail;
    } else {
      r = this.regexp = new RegExp( r, options );
    }
    
    return r;
  } );
  
  function get_regexp( r ) {
    var ___;
    
    if ( r == ___ ) {
      r = this.regexp;
      
      if ( r == ___ ) return fail;
    } else {
      this.regexp = r instanceof RegExp ? r : r = new RegExp( r );
    }
    
    return r;
  }
  
  Operator( 'match', function( text, r ) {
    r = get_regexp.call( this, r );
    
    this.groups = r.exec( text );
    
    return this.groups ? this.groups.index : fail;
  } );
  
  Operator( 'last_index', function() {
    var r = this.regexp;
    
    return r ? r.lastIndex : fail;
  } );
  
  Operator( 'groups', function( _, i ) {
    var groups = this.groups, s, __;
    
    return groups && ( ( s = groups[ i ] ) !== __ ) ? s : fail;
  } );
  
  Operator( 'split', function( text, r ) {
    r = get_regexp.call( this, r );
    
    this.groups = text.split( r );
    
    return this.groups ? this.groups.length : fail;
  } );
  
  Operator( 'length', function( left ) {
    return left.length;
  } );
  
  // []
  Operator( undefined, function() {
    return this.__;
  } );
  
  function subscript( v, a ) {
    var ___, a = slice.call( a, 1 );
    
    for ( var i = -1, l = a.length; ++i < l; ) {
      if ( v === ___ ) return fail;
      
      v = v[ a[ i ] ];
    }
    
    return v;
  } // subscript()
  
  // [ '.', 'profile', 'age' ]
  Operator( '.', function( left ) {
    return subscript( left, arguments );
  }, { greedy: true } );
  
  // [ '_', 'user', 'profile', 'age' ]
  Operator( '_', function() {
    return subscript( this.value, arguments );
  }, { greedy: true } );
  
  // [ '__', 'user', 'profile' ]
  Operator( '__', function() {
    return this.__ = subscript( this.value, arguments );
  }, { greedy: true } );
  
  Operator( '$', function( _, right ) {
    return right;
  }, { literal_parameters: true } );
  
  Operator( '&&', function( _, right ) {
    return right;
  } );
  
  Operator( '!', function( _, right ) {
    return right === fail ? true : fail;
  }, { accepts_fail : true } );
  
  function contains( a, left ) {
    var p;
    
    if ( left instanceof Array ) {
      var i = -1, l = left.length, first = Infinity;
      
      while ( ++i < l ) {
        p = a.indexOf( left[ i ] );
        
        if ( p == -1 ) return fail;
        
        if ( first < p ) continue;
        
        first = p;
      }
      
      return first;
    }
    
    return ( p = a.indexOf( left ) ) == -1 ? fail: p;
  } // contains()
  
  Operator( 'in', function( left, a ) {
    return contains( a, left );
  } );
  
  Operator( 'contains', function( left, a ) {
    return contains( left, a );
  } );
  
  Operator( 'value', function( left ) {
    return left.valueOf();
  } );
  
  // Date operators
  Operator( 'Date', function( _, value ) {
    var d;
    
    switch( arguments.length ) {
      case  1: d = new Date(); break; // now
      case  2: d = new Date( value ); break; // timestamp
      
      default:
        d = new Date( Date.UTC.apply( Date, slice.call( arguments, 1 ) ) );
    }
    
    return d;
  }, { greedy: true } );
  
  Operator( 'year', function( date ) {
    return date instanceof Date ? date.getUTCFullYear() : fail;
  } );
  
  Operator( 'month', function( date ) {
    return date instanceof Date ? date.getUTCMonth() : fail;
  } );
  
  Operator( 'day', function( date ) {
    return date instanceof Date ? date.getUTCDate() : fail;
  } );
  
  Operator( 'hours', function( date ) {
    return date instanceof Date ? date.getUTCHours() : fail;
  } );
  
  Operator( 'minutes', function( date ) {
    return date instanceof Date ? date.getUTCMinutes() : fail;
  } );
  
  Operator( 'seconds', function( date ) {
    return date instanceof Date ? date.getUTCSeconds() : fail;
  } );
  
  Operator( 'milliseconds', function( date ) {
    return date instanceof Date ? date.getUTCMilliseconds() : fail;
  } );
  
  Operator( 'time', function( date ) {
    if ( date instanceof Date ) {
      date = new Date( date.valueOf() );
      
      date.setUTCFullYear( 1970 );
      date.setUTCMonth( 0 );
      date.setUTCDate( 1 );
      
      return date;
    } else {
      return fail;
    }
  } );
  
  
  extend_2( Query.prototype, {
    /* -----------------------------------------------------------------------------------------
       Query..discard_operations()
       
       Clears adds and removes from previous operations.
       
       Also used to initialize adds and removes to [] in Query constructor.
    */
    discard_operations: function() {
      this.adds = [];
      this.removes = [];
      
      return this;
    }, // discard_operations()
    
    discard_optimized: function() {
      this.optimized      = [];
      this.optimized_keys = [];
      
      return this;
    }, // discard_optimized()
     
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
      var that = this, q0 = this.query, keys0s = this.keys
        , keys1s, i1 = -1, e1
        , least_restrictive_keys = Query.least_restrictive_keys
      ;
      
      if ( q1 instanceof Query ) {
        keys1s = q1.keys;
        q1 = q1.query;
      } else {
        keys1s = query_keys( q1 );
      }
      
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
              
              this.removes.push( e0 );
              
              this.optimized.push( e0 );
              this.optimized_keys.push( keys0 );
              
              // There could be more expression in q0 more restrictive than e1 that would therefore need to be optimized-out
              
              // Note that, unless there is a bug in this implementation of Query, there cannot
              // exist another expression in q0 that would be less restrictive than e1 because
              // This would imply by transitivity that this other expression would also be
              // less restrictive than the current expression in q0. This cannot be if q0 is
              // already optimized and no expression is less restrictive than another one in q0.
            } else {
              // e1 is as restrictive or more restrictive than e0 --> optimize-out e1
              
              this.optimized.push( e1 );
              this.optimized_keys.push( keys1 );
              
              added = true;
              
              break; // if q0 is already optimized there should not be another expression less restrictive than e1
            }
          }
        } // for all sub expression from q0
        
        // Add e1 into result query if none was less restrictive than another
        added || add( e1, keys1 );
      } // for all sub expression from q1
      
      return this;
      
      function add( e, keys ) {
            q0.push( e );
        keys0s.push( keys );
        
        that.adds.push( e );
      } // add()
      
    }, // add()
    
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
      var keys1s;
      
      // Make shallow copies, one level deep, of q1 and keys1s, because remove() modifies the array
      if ( q1 instanceof Query ) {
        keys1s = q1.keys1s.slice( 0 );
        q1     = q1.query .slice( 0 );
      } else {
        q1 = q1.slice( 0 );
        keys1s = query_keys( q1 );
      }
      
      var optimized = this.optimized;
      
      // Atempt to remove expressions from optimized-out expressions first
      remove( optimized, this.optimized_keys, q1, keys1s );
      
      if ( q1.length ) {
        remove( this.query, this.keys, q1, keys1s, this.removes );
        
        if ( q1.length ) throw new Query_Error( 'remove() could not find expressions to remove: ' + log.s( q1 ) );
        
        if ( optimized.length ) {
          // Recover optimized expressions that may have become least restrictive after removal
          // from current query that were more restrictive
          
          // Forget reference to optimized expressions
          this.optimized      = [];
          this.optimized_keys = []; 
          
          this.add( optimized );
        }
      }
      
      return this;
      
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
    }, // remove()
    
    /* -----------------------------------------------------------------------------------------
       Query..differences( q1 )
       
       Finds differences between this query and q1
       
       Returns: [ adds, removes ]
       
       Example:
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
    */
    differences: function( q1 ) {
      var keys0s = this.keys, q0 = this.query
        , keys1s
        , e0, e1
        , keys0, keys1
        , i0, i1
        , l0
        , j, a
        , removed = []
      ;
      
      if ( q1 instanceof Query ) {
        keys1s = q1.keys .slice( 0 );
        q1     = q1.query.slice( 0 );
      } else {
        q1     = q1.slice( 0 );
        keys1s = query_keys( q1 );
      }
      
      for ( i0 = -1; e0 = q0[ ++i0 ]; ) {
        keys0 = keys0s[ i0 ];
        l0 = keys0.length;
        
        for ( i1 = -1; keys1 = keys1s[ ++i1 ]; ) {
          if ( l0 == keys1.length ) {
            e1 = q1[ i1 ];
            
            for ( j = -1; j < l0; ) {
              a = keys0[ ++j ];
              
              if ( e0[ a ] !== e1[ a ] ) break; // no match
            }
            
            if ( j < l0 ) continue; // no match
            
            // all terms match
            break;
          }
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
    }, // differences()
    
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
         1/ Factorize ( e00 .. OR e0n ) AND ( e10 .. OR e1n ) into l0 x l1 AND terms:
            ( e00 AND e10 ) .. OR ( e00 AND e1n ) .. OR ( e0n AND e10 ) .. OR ( e0n AND e1n )
            
         2/ To perform pi AND ej, lookup properties of ei and ej, pick the one that has the
            least number of properties, let it be ea and the other eb, then:
            - if one property of ea exists in eb but with a diffent value, then the result is
              always false, and no term is produced
            - if all properties of ea are either not present of have the same value in eb, then
              extend e0 with e1 to produce the ANDed expression
            
         3/ Or the result of the previous operation produced terms with previously accumulated
            results using optimized Query..add()
    */
    and: function( q1 ) {
      // All variables with a trailing 0 correspond to the current query
      // All variables with a trailing 1 correspond to q1, the parameter query
      var u, q0 = this.query, i0 = -1, e0, keys0s = this.keys
        , keys1s
        , result = []
      ;
      
      if ( q1 instanceof Query ) {
        keys1s = q1.keys;
        q1 = q1.query;
      } else {
        keys1s = query_keys( q1 );
      }
      
      while ( e0 = q0[ ++i0 ] ) {
        var k0 = keys0s[ i0 ], k0l = k0.length, i1 = -1, e1, produced = false, remove = false;
        
        while ( e1 = q1[ ++i1 ] ) {
          // Perform e0 AND e1
          var k1 = keys1s[ i1 ], k1l = k1.length, ka, ea, eb
            , produce = true, not_equal = k0l < k1l
            , i = -1, key
          ;
          
          // Let ka be the smallest key, ea the expression with the smallest key, and eb that with the largest key
          if ( not_equal ) {
            ka = k0; ea = e0; eb = e1;
          } else {
            ka = k1; ea = e1; eb = e0;
          }
          
          while ( key = ka[ ++i ] ) {
            if ( key in eb ) {
              // term is present in both expressions
              
              if ( eb[ key ] !== ea[ key ] ) {
                // the filter for this term would always be false
                produce = false;
                
                break;
              }
            } else {
              // At least one term present in one expression is not present in the other
              // Expressions can no longer be equal
              not_equal = true;
            }
          }
          
          if ( produce ) {
            produced = true;
            
            if ( not_equal ) {
              // e0 is less restrictive than e1
              // will have to remove e0
              remove = true;
              
              // add new value to result
              result.push( extend( {}, e0, e1 ) );
            }
          }
        }
        
        if ( ! produced || remove ) {
          keys0s.splice( i0, 1 );
          q0.splice( i0--, 1 );
          
          this.removes.push( e0 );
        }
      }
      
      this.add( result );
      
      return this;
    }, // and()
    
    /* -----------------------------------------------------------------------------------------
      Query..generate()
      
      Generate filter() function from query.
      
      Example:
        new Query(
          [
            { flow: 'store' },
            { flow: 'user', id: 231 }
          ]  
        ).generate()
        
        Generates code such as:
          this.filter = function( values ) {
            var out = [];
            
            for( var i = -1, l = values.length; ++i < l;  ) {
              var v = values[ i ];
              
              var _flow = v.flow;
              
              if( _flow === "store"                ) { out.push( v ); continue; };
              if( _flow === "user" && v.id === 231 ) { out.push( v ); continue; };
            } 
            
            return out;
          } // Query..filter()
    */
    generate: function() {
      var u, q = this.query, l = q.length;
      
      var terms_counts = {}, vars = [], no_and_term = false;
      
      // Determine which terns (attributes of proposition Objects) should be cached as variables:
      //   Those which are used more than once
      // Also finds out if any term has no and terms which would be a pass-all term condition
      for ( var i = -1; ++i < l; ) {
        var p = q[ i ];
        
        no_and_term = true;
        
        for ( var t in p ) {
          no_and_term = false;
          
          if ( terms_counts[ t ] ) {
            if ( ++terms_counts[ t ] == 2 ) {
              vars.push( '_' + t + ' = v.' + t )
            }
          } else {
            terms_counts[ t ] = 1;
          }
        }
        
        if ( no_and_term ) break;
      }
      
      var code = new Code()
        ._function( 'this.filter', u, [ 'values' ] );
        
          if ( no_and_term ) {
            code.add( 'return values' ); // pass-all
          } else if ( ! l ) {
            code.add( 'return []' ); // nul-filter
          } else {
            code._var( 'out = []' )
            
            ._for( 'var i = -1, l = values.length', '++i < l' )
              ._var( 'v = values[ i ]' );
              
              if ( vars.length ) code._var( vars );
              
              for ( i = -1; ++i < l; ) {
                var e = [];
                
                p = q[ i ];
                
                for ( var t in p ) {
                  var v = p[ t ];
                  
                  if ( typeof v == 'string' ) v = '"' + v + '"';
                  
                  e.push( ( terms_counts[ t ] > 1 ? '_' : 'v.' ) + t + ' === ' + v );
                }
                
                code.add( 'if( ' + e.join( ' && ' ) + ' ) { out.push( v ); continue; }' );
              }
            code.end()
            
            .add( 'return out' )
          }
          
        code.end( 'Query..filter()' )
      ;
      
      eval( code.get() );
      
      return this;
    } // generate()
  } ); // Query instance methods
  
  Query.pass_all = new Query( [ {} ] ).generate();
  Query.nul      = new Query( [    ] ).generate();
  
  /* -------------------------------------------------------------------------------------------
     Query_Tree( options )
     
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
     
     Both algorithms do not scale with application complexity which therfore must be dealt with
     raw performence. This performance is improved with ConnectedSets by merging queries
     upstream using Query..and() and Query..add(). This is particularly useful for authorization
     rules that arguably constitute the largest source of complexity for modern web
     applications.
  */
  function Query_Tree( options ) {
    this.top = new Query_Tree_Node();
  } // Query_Tree()
  
  // Nodes for Query Trees
  function Query_Tree_Node() {
    // hashed by terms' keys, each branch is the hashed by terms' values to lead to it's sub-node
    this.branches = Dictionary();
    
    // all the term keys for the above branches
    this.keys = [];
    
    // all subscriber pipelets
    this.subscribers = [];
  } // Query_Tree_Node()
  
  extend_2( Query_Tree.prototype, {
    // Add or terms for a subscriber
    add: function( or_terms, subscriber ) {
      var that = this
        , top = that.top
        , or_term
        , i = -1
      ;
      
      // For all OR-terms of this OR-AND query or partial query
      while( or_term = or_terms[ ++i ] ) {
        // Lookup (or create) the leaf node for this OR-term
        add_term( top, or_term, Object.keys( or_term ) );
      }
      
      return this;
      
      // Add all keys of a term, descending the tree, creating new nodes as needed
      function add_term( node, term, term_keys ) {
        while( term_keys.length ) {
          // There are still some term keys not located in the tree
          
          var branches = node.branches
            , keys     = node.keys
            , branch, key, ___, v = ___
          ;
          
          for( var i = -1; key = keys[ ++i ]; ) {
            // Lookup this node key in the term
            if ( ( v = term[ key ] ) === ___ ) continue; // Not found, keep looking
            
            // Found an existing node key for which there is a property in this term
            // Remove this key from term_keys
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in add()
            
            // Lookup branch for this key, it must exist because it is created when a key is added
            branch = branches[ key ];
            
            // Lookup the sub-node for this value or create one if none exists
            node = branch[ v ] || ( branch[ v ] = new Query_Tree_Node() );
            
            break;
          }
          
          if ( v !== ___ ) continue;
          
          // No existing node key found in this term
          // Retreive the first key from term keys, add it to this node's keys
          keys.push( key = term_keys.shift() );
          
          // Create new branch with this key
          branch = branches[ key ] = Dictionary();
          
          // Create sub-node for first value in this new branch
          node = branch[ v = term[ key ] ] = new Query_Tree_Node();
        }
        // No more term keys to locate or create in this tree
        // We have found (or created) the leaf node for this term
        // Add this term's subscriber to this leaf
        node.subscribers.push( subscriber );  // subscribers is always defined unless there is a bug in Query_Tree() or add_value()
        
        return node; // return the leaf node
      } // add_term()
    }, // add()
    
    remove: function( or_terms, subscriber ) {
      var that = this
        , top = that.top
        , or_term
        , position = -1 // the name position must be seen for exception message in remove_term() closure
      ;
      
      // For all OR-terms of this OR-AND query or partial query
      while( or_term = or_terms[ ++position ] ) {
        remove_term( top, or_term, Object.keys( or_term ) );
      }
      
      return this;
      
      // Remove term from sub-tree, descending the tree recursively
      function remove_term( node, term, term_keys ) {
        var subscribers = node.subscribers
          , keys       = node.keys
        ;
        
        if ( term_keys.length ) {
          // There are still some term keys not located in the tree
          
          var branches = node.branches, branch, key, u, v = u;
          
          for( var i = -1; key = keys[ ++i ]; ) {
            // Lookup this node key in the term
            if ( ( v = term[ key ] ) === u ) continue; // Not found, keep looking
            
            // Found the node key for which there is a property in this term
            // Remove this key from term_keys
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in add()
            
            // Lookup branch for this key, it must exist because it is created when a key is added
            branch = branches[ key ];
            
            // Lookup the sub-node for this key's value
            if ( remove_term( branch[ v ], term, term_keys ) ) {
              // The branch is now empty, remove it
              delete branch[ v ];
              
              if ( Object.keys( branch ).length == 0 ) {
                // There are no more values in this branch, renove this branch
                delete branches[ key ];
                
                keys.splice( keys.indexOf( key ), 1 );
              }
            }
            
            break;
          } // For all node keys
          
          if ( v === u ) throw new Query_Error( that._get_name( 'Query_Tree()..remove' ) + 'term not found' );
        } else {
          // No more term keys to locate or create in this tree
          // We have found the leaf node for this term
          // Remove subscriber from leaf
          var index = subscribers.indexOf( subscriber );
          
          // ToDo: this exception was seen: add tests, reproduce and fix
          if ( index == -1 ) {
            throw new Query_Error(
                that._get_name( 'Query_Tree()..remove' )
              + 'Cannot find subscriber (' + subscriber._get_name() + ') in tree where it was expected'
              + ', or_terms: ' + log.s( or_terms )
              + ', at position: ' + position
            );
          }
          
          subscribers.splice( index, 1 );
        }
        
        // Return true is the node is now empty, false if not empty
        // It is empty if if has no subscribers and no keys
        return ( subscribers.length + keys.length ) == 0;
      } // remove_term()
    }, // remove()
    
    // ToDo: optimize unfiltered routing in top node.
    route: function( operation, values ) {
      var top = this.top;
      
      // Each subscriber is an object:
      //  p: subscriber pipelet
      //  v: values to emit
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
          route_clear( top, subscribers );
          
          subscribers_operations = [ [ operation, subscribers ] ];
        break;
        
        default:
          // This is an add or remove operation
          
          // Route each value independently, to accumulate values filtered by each node
          for ( i = -1; v = values[ ++i ]; ) {
            /*
              Note: pushed is an array of destination pipelets source_subscriber_index used by add_value()
              to prevent sending duplicate values to each pipelets.
              
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
      
      // Clear all subscribers' source_subscriber_index in case of re-entrance
      // !! This must be done before emiting operations to prevent re-entrance issues on graph loops
      var l;
      
      for ( i = -1, l = subscribers.length; ++i < l; ) {
        subscribers[ i ].input.source_subscriber_index = 0;
      }
      
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
          , i, v, ___, child
        ;
        
        // Add value to this node's subscribers, if not already done
        for( i = -1; ++i < rl; ) {
          var input = node_subscribers[ i ]
            , subscriber_index = input.source_subscriber_index // ToDo: stop using input to store source_subscriber_index
          ;
          
          // Push values into this node's subscribers
          // Except if a value was already pushed to this subscribers, preventing duplicates
          // This also guaranties that operations are sent in the same order received although this is not a requirement
          
          if ( subscriber_index ) {
            // Subscriber Pipelet "p" already has at least one value for this operation
            v = subscribers[ subscriber_index - 1 ].v;
          } else {
            // "p" does not have any update yet
            subscribers.push( { input: input, v: v = [] } );
            
            input.source_subscriber_index = subscribers.length; // source subscriber indexes start at 1
          }
          
          add_value( v, value, subscriber_index );
        }
        
        // Lookup children nodes for possible additional matches
        for( i = -1; key = keys[ ++i ]; ) {
          v = value[ key ];
          
          if ( v === ___ ) continue;
          
          var branch = branches[ key ]
            , child  = branch[ v ]
          ;
          
          if ( child ) {
            // We have a value for this term and this value has a child node, descend
            route( child, value, add_value );
          } else {
            var expressions = branch[ '[...]' ];
            
            if ( typeof expressions == 'object' && expressions instanceof Array ) {
              var j = -1, expression, Query_evaluate = Query.evaluate;
              
              while ( expression = expressions[ ++j ] ) {
                if ( Query_evaluate( value, key, expression.e ) ) {
                  route( expression.child, value, add_value );
                }
              }
            }
          }
          
          // Keep looking for other possible matches
        } // for all term keys
      } // route()
      
      function route_clear( node, subscribers ) {
        // Lookup all subscribers to clear
        var branches         = node.branches
          , keys             = node.keys
          , node_subscribers = node.subscribers
          
          , rl = node_subscribers.length
          , i, key
        ;
        
        // Send _clear only once per subscriber pipelet
        for( i = -1; ++i < rl; ) {
          var input = node_subscribers[ i ];
          
          if ( input.source_subscriber_index ) continue; 
          
          // This pipelet is not marked for clearing yet
          subscribers.push( { input: input } );
          
          input.source_subscriber_index = subscribers.length;
        }
        
        for( i = -1; key = keys[ ++i ]; ) {
          var branch = branches[ key ];
          
          for ( var value in branch ) {
            if ( value != '[...]' ) {
              route_clear( branch[ value ], subscribers );
            } else {
              var expressions = branch[ value ];
              
              if ( typeof expressions == 'object' && expressions instanceof Array ) {
                var j = -1, expression;
                
                while ( expression = expressions[ ++j ] ) {
                  route_clear( expression.child, subscribers );
                }
              }
            }
          }
        }
      } // route_clear()
    }, // route()
    
    /* ------------------------------------------------------------------------
       pause( destination )
       
       Pause emissions to destination
    */
    pause: function( destination ) {
      // ToDo: implement pause()
      return this;
    }, // pause()
    
    /* ------------------------------------------------------------------------
       resume( destination )
       
       Resume emissions to destination
    */
    resume: function( destination ) {
      // ToDo: implement resume()
      return this;
    } // resume()
  } ); // Query_Tree instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    'Query'      : Query,
    'Query_Tree' : Query_Tree
  } );
  
  de&&ug( "module loaded" );
} )( this ); // query.js

