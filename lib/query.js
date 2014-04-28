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
   ToDo: update Query documentaion with latests developments
   
   This works fine in a local environement but if the stateless pipelet and its upstream
   pipelet are interconnected through a low-bandwidth network, such as the internet, and if
   the set's content is large it may take a long time and become wastful to _fetch the entire
   source to discard most of the content.
   
   To prevent this tremendous waste of ressources, we have implemented a Query class and
   a Query_Tree pipelet.
   
   _fetch() provides a Query and pipelet emitters filter their outputs using a Query_Tree.
   
   Stateless pipelets combine their queries upstream, via their _fetch().Stateless pipelets
   therfore perform a lazy evaluation, while stateful pipelets force content fetching.
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
    , extend     = XS.extend
    , extend_2   = XS.extend_2
    , Code       = XS.Code
  ;
  
  var create = Object.create;
  
  function Dictionary() {
    return create( null );
  }
  
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
         { flow: 'stores', id: 231  }
       ]
       
       Is equivalent to the JavaScript boolean expression on a value 'v':
         ( v.flow === 'users' &&  v.id === 1092 ) || ( v.flow === 'stores' && v.id === 231 )
       
       Which is also equivalent to an SQL-where clause:
         ( flow = 'users' AND id = 1092 ) OR ( flow = 'stores' AND id = 231 )
     
     So a query is code expressed with sets of JavaScript objects. With Connected Sets, these
     expressions become dataflows, which can enable realtime dynamic filters as implemented in
     filter.js.
     
     Queries are used by Pipelet..__fetch_source() to retrieve subsets of values from source
     dataflows and Pipelet.__emit() to filter emitted operations to downstream pipelets.
     
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
     
     First version queries do not support:
       - Nested attributes that we may implement using the dot notation e.g. 'a1.a2.a3',
       
       - Non-strict-equality comparison such as 'not', 'greater than', etc, that we may
         implement using object values, e.g. v: { $gt: 5, $lt: 10, $not: 7 } which would mean:
         v > 5 AND v < 10 AND v !== 7
         
       - Regular expressions, that we may implement using objects e.g. { $matches: '' }
       
       - OR sub-expressions nested within AND sub-expressions, which can already be expressed
         with OR-AND expressions. However a compiler might reduce other arbitrarily nested
         expressions into the base OR-AND form that is well suited for optimized query
         arithmetics.
         
       - Strings such as SQL-where expressions that a compiler might compile to a valid OR-AND
         query or other representations such as abstract syntax trees.
         
       - More complex arithmetics that would involve more than one attribute per term, e.g.
         sales < costs. These might be better expressed using SQL-like expressions rather than
         trying to describe every possible query using objects.
         
     Roadmap:
       We do not currently have a roadmap specific for query features but work on queries will
       likely become the highest priority once basic routing and authorizations are finalized.
       
       The highest priority for a new operator may be to implement the 'greater than' operator,
       to be able to _fetch data past a certain date, or after a certain monotically increasing
       identifier. This might be required to implement replication, and recovering after a
       reconnection without requesting to retransmit every data previously received.
       
       This in turn should allow to easily implement 'less than', 'greater than or equal', and
       'less than or equal operators'.
       
       After this, the 'not' operator is considered highest in priority at this time but this
       could change based on actual applications being developped.
     
     Performance considerations:
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
    }
    
    return keys; // keys of least restrictive expression 
  } // Query.least_restrictive_keys()
  
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
          .remove( [ { flow: "user", id: 1 } ] ) // no excpetion when removing optimized-out expression
          
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
        
        if ( q1.length ) throw new Error( 'Query..remove() could not find expressions to remove: ' + log.s( q1 ) );
        
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
    // !!! All initialization code should be in __init_query_tree(), because this is also called
    // by the Pipelet constructor
    this.__init_query_tree();
    
    return Pipelet.call( this, options );
  } // Query_Tree()
  
  // Nodes for Query Trees
  function Query_Tree_Node() {
    // hashed by terms' keys, each branch is the hashed by terms' values to lead to it's sub-node
    this.branches = Dictionary();
    
    // all the term keys for the above branches
    this.keys = [];
    
    // all subscriber pipelets
    this.subscribers = [];
    
    // all subscribers values as they are accumulated
    this.subscribers_values = [];
    
    return this;
  } // Query_Tree_Node()
  
  extend_2( Query_Tree.prototype, {
    // !!! All initialization code goes here, because this is also called by the Pipelet constructor
    __init_query_tree: function() {
      // Initialize all query tree properties here to avoid modifying v8 hidden classes
      // ToDo: prefix attributes w/ underscores
      this.query_tree_top = new Query_Tree_Node();
      
      this.transactions           = Dictionary(); // ongoing transactions
      this.source_transactions    = Dictionary(); // incomming transactions by source
      
      this.source_subscriber_index = 0; // incomming subscriber index in current operation
      
      return this;
    }, // __init_query_tree()
    
    // Add or terms for a subscriber
    __query_tree_add: function( or_terms, subscriber ) {
      var that = this
        , top = that.query_tree_top
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
            , branch, key, u, v = u
          ;
          
          for( var i = -1; key = keys[ ++i ]; ) {
            // Lookup this node key in the term
            if ( ( v = term[ key ] ) === u ) continue; // Not found, keep looking
            
            // Found an existing node key for which there is a property in this term
            // Remove this key from term_keys
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in __query_tree_add()
            
            // Lookup branch for this key, it must exist because it is created when a key is added
            branch = branches[ key ];
            
            // Lookup the sub-node for this value or create one if none exists
            node = branch[ v ] || ( branch[ v ] = new Query_Tree_Node() );
            
            break;
          }
          
          if ( v !== u ) continue;
          
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
    }, // __query_tree_add()
    
    __query_tree_remove: function( or_terms, subscriber ) {
      var that = this
        , top = that.query_tree_top
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
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in __query_tree_add()
            
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
          
          if ( v === u ) throw new Error( that._get_name( 'Query_Tree()..remove' ) + 'term not found' );
        } else {
          // No more term keys to locate or create in this tree
          // We have found the leaf node for this term
          // Remove subscriber from leaf
          var index = subscribers.indexOf( subscriber );
          
          // ToDo: this exception was seen: add tests, reproduce and fix
          if ( index == -1 ) {
            throw new Error(
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
    }, // __query_tree_remove()
    
    // ToDo: optimize unfiltered routing in top node.
    __query_tree_emit: function( operation, values, options ) {
      // Get no_more and transaction_id from options
      var more, transaction_id, transaction;
      
      if ( options ) {
        more           = options.more;
        transaction_id = options.transaction_id;
        
        if ( transaction_id ) {
          transaction = this.transactions[ transaction_id ] || ( this.transactions[ transaction_id ] = [] );
        }
      }
      
      var top = this.query_tree_top;
      
      // Each subscriber is an object:
      //  p: subscriber pipelet
      //  v: values to emit
      var subscribers = [], i, p, v, rl;
      
      switch( operation ) {
        case 'update':
          for ( i = -1; v = values[ ++i ]; ) {
            route_update( this, more && transaction, transaction_id, top, subscribers, v[ 0 ], i, 0 ); // route remove
            route_update( this, more && transaction, transaction_id, top, subscribers, v[ 1 ], i, 1 ); // route add
          }
          
          more || this._end_transaction( transaction, transaction_id, options );
          
          // emit operations to all subscribers
          for ( i = -1, rl = subscribers.length; ++i < rl; ) {
            var r = subscribers[ i ], p = r.p, added = [], removed = [], updated = [];
            
            p.source_subscriber_index = 0;
            
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
                    // this is a remove
                    removed.push( update[ 0 ] );
                  }
                } else {
                  // this is an add
                  added.push( update[ 1 ] );
                }
              }
            }
            
            var operations = ( removed.length && 1 ) + ( added.length && 1 ) + ( updated.length && 1 )
              , options_more
            ;
            
            // ToDo: __query_tree_emit()#_update(): test transaction w/ nesting
            var t = new Query_Tree.Transaction( operations, options );
            
            removed.length && p._remove( removed, t.next().get_emit_options() );
            added  .length && p._add   ( added  , t.next().get_emit_options() );
            updated.length && p._update( updated, t.next().get_emit_options() );
          }
        return this;
        
        case 'clear':
          route_clear( top, subscribers );
          
          more || this._end_transaction( transaction, transaction_id, options );
          
          // emit _clear to all subscribers
          for ( i = -1, rl = subscribers.length; ++i < rl; ) {
            p = subscribers[ i ];
            
            p.source_subscriber_index = 0;
            
            p._clear( options );
          }
        return this;
      }
      
      // This is an add or remove operation
      
      // Route each value independently, to accumulate filtered node.subscribers_values in each node
      // Note: the last parameter of route_value() is pushed, an array of destination pipelets
      //   source_subscriber_index used to prevent sending duplicate values to each pipelets.
      //   These indexes start at 1, therefore the first element of the array could be uninitialized
      //   but this could result in an Array holding the undefined value followed by integers. In v8
      //   this would result in realocation of the Array. This is why we initialize pushed with the
      //   first element set to an integer, preventing realocation.
      for ( i = -1; v = values[ ++i ]; ) {
        route_value( this, more && transaction, transaction_id, top, subscribers, v, [ 0 ] );
      }
      
      more || this._end_transaction( transaction, transaction_id, options );
      
      // Emit accumulated values in subscribers[] from previous loop
      subscribers_emit( subscribers );
      
      return this;
      
      // Emit accumulated values to subscribers
      function subscribers_emit( subscribers ) {
        var i, l, r, _operation = '_' + operation;
        
        // Clear all subscribers' source_subscriber_index in case of re-entrance
        // !! This must be done before emiting operations to prevent re-entrance issues on graph loops
        for ( i = -1, l = subscribers.length; ++i < l; ) {
          subscribers[ i ].p.source_subscriber_index = 0;
        }
        
        // Emit all subscribers' values
        for ( i = -1, l = subscribers.length; ++i < l; ) {
          r = subscribers[ i ];
          
          r.p[ _operation ]( r.v, options );
        }
      } // subscribers_emit()
      
      // Route value, recursively
      function route_value( that, transaction, transaction_id, node, subscribers, value, pushed ) {
        var keys             = node.keys, key
          , branches         = node.branches
          , node_subscribers = node.subscribers
          
          , rl               = node_subscribers.length
          , i, v, child
          , ___
        ;
        
        // Push value into this node's subscribers
        // Except if this value was already pushed to some subscribers, preventing duplicates
        // This also guaranties that operations are sent in the same order received although this is not a requirement
        // Duplicates may happen on queries with an intersection
        // This also simplifies emission greatly at a the higher cost of this loop that depends on the number of subscribers
        // for this operation
        for( i = -1; ++i < rl; ) {
          var p = node_subscribers[ i ]
            , subscriber_index = p.source_subscriber_index
          ;
          
          if ( subscriber_index ) {
            // This pipelet already has at least one value for this operation
            if ( pushed[ subscriber_index ] ) continue; // this pipelet is already marked for this value, do not duplicate
            
            pushed[ subscriber_index ] = 1;
            
            subscribers[ subscriber_index - 1 ].v.push( value );
          } else {
            // This pipelet does not yet have any value from this operation
            subscribers.push( { p: p, v: [ value ] } );
            
            // This value is now pushed once, meorize it to avoid duplication later in the tree
            pushed[ p.source_subscriber_index = subscribers.length ] = 1; // pushed[] indexes start at 1
            
            if ( transaction ) {
              // there is an ongoing transaction with more operations to come after the current operation
              that.__add_destination_to_transaction( transaction, p, transaction_id );
            }
          }
        }
        
        // Lookup child nodes for possible additional matches
        for( i = -1; key = keys[ ++i ]; ) {
          if ( ( v = value[ key ] ) !== ___ && ( child = branches[ key ][ v ] ) ) {
            // We have a value for this term and this value has a child node, descend
            route_value( that, transaction, transaction_id, child, subscribers, value, pushed );
          }
          // Keep looking for other possible matches
        } // for all term keys
      } // route_value()
      
      // Route update, recursively
      function route_update( that, transaction, transaction_id, node, subscribers, value, position, offset ) {
        var keys             = node.keys, key
          , branches         = node.branches
          , node_subscribers = node.subscribers
          
          , rl               = node_subscribers.length
          , i, v, u, child
        ;
        
        // Push value into this node's subscribers at position and offset
        // Except if this value was already pushed to some subscribers, preventing duplicates
        // This also guaranties that operations are sent in the same order received although this is not a requirement
        // Duplicates may happen on queries with an intersection
        for( i = -1; ++i < rl; ) {
          var p = node_subscribers[ i ]
            , subscriber_index = p.source_subscriber_index
          ;
          
          if ( subscriber_index ) {
            // This pipelet already has at least one update value for this operation
            v = subscribers[ subscriber_index - 1 ].v;
          } else {
            // This pipelet does not have any update yet
            subscribers.push( { p: p, v: v = [] } );
            
            p.source_subscriber_index = subscribers.length; // source subscriber indexes start at 1
            
            if ( transaction ) {
              // there is an ongoing transaction with more operations to come after the current operation
              that.__add_destination_to_transaction( transaction, p, transaction_id );
            }
          }
          
          // ToDo: test updates, 4 cases at least including duplicates
          if ( v[ position ] ) {
            // there is already one of the two values set
            // duplicates are copied at the same position and offset, preventing duplicates
            v[ position ][ offset ] = value;
          } else if ( offset ) {
            // first value at position 1
            v[ position ] = v = [ u, value ];
          } else {
            // first value at position 0
            v[ position ] = [ value ];
          }
        }
        
        // Lookup child nodes for possible additional matches
        for( i = -1; key = keys[ ++i ]; ) {
          if ( ( v = value[ key ] ) !== u && ( child = branches[ key ][ v ] ) ) {
            // We have a value for this term and this value has a child node, descend
            route_update( that, transaction, transaction_id, child, subscribers, value, position, offset );
          }
          // Keep looking for other possible matches
        } // for all term keys
      } // route_update()
      
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
          var p = node_subscribers[ i ]
            , subscriber_index = p.source_subscriber_index
          ;
          
          if ( subscriber_index ) continue; 
          
          // This pipelet is not marked for clearing yet
          subscribers.push( p );
          
          p.source_subscriber_index = subscribers.length;
        }
        
        for( i = -1; key = keys[ ++i ]; ) {
          var branch = branches[ key ];
          
          for ( var value in branch ) route_clear( branch[ value ], subscribers );
        }
      } // route_clear()
    }, // __query_tree_emit()
    
    __add_destination_to_transaction: function( transaction, p, transaction_id ) {  
      // Check if this destination pipelet has its source_transactions set for this 
      var source_transactions = p.source_transactions
        , source_transaction  = source_transactions[ transaction_id ]
        , j, sl
      ;
      
      // ToDo: make sure this gets tested as well as every branch of this complex section of code
      if ( source_transaction ) {
        // lookup source_transaction to find out if it has source
        for ( j = -1, sl = source_transaction.length; ++j < sl; ) {
          if ( source_transaction[ j ].source === this ) return this; // already added
        }
        // That source has not yet emited any value to this destination for this transaction
      } else {
        // This transaction has not been started yet at this destination pipelet
        
        // There may be more than one source emiting data to the same destination during the same transaction if the
        // dataflow graph is not a strict tree but has loops or forks followed by unions.
        source_transaction = source_transactions[ transaction_id ] = [];
      }
      
      // Memorize the position at this source for this transaction to allow fast removal from source
      source_transaction.push( { source: this, position: transaction.length } );
      
      // Add destination into the list of pipelets that have received data for this transaction and source
      transaction.push( p );
      
      return this;
    }, // __add_destination_to_transaction()
    
    _end_transaction: function( transaction, transaction_id, options ) {
      if ( ! transaction ) return; // this is not a transaction
      
      delete this.transactions[ transaction_id ]; // was the reference to transaction
      
      var l = transaction.length;
      
      if ( l ) {
        // this is the end of a transaction
        // ToDo: provide tests for transaction termination
        
        // terminate this transaction for all destination pipelets except those which are set to send data
        // as marked by a non-zero source_subscriber_index
        for ( var i = -1, p; ++i < l; ) {
          p = transaction[ i ];
          
          // Remove this source from p.source_transactions
          var source_transactions = p.source_transactions
            , source_transaction = source_transactions[ transaction_id ]
            , sl = source_transaction.length
            , not_found = true
            , j
          ;
          
          de&&ug( 'end_transaction(), transaction id: ' + transaction_id + ', source_transaction length: ' + sl );
          
          for ( j = -1; ++j < sl; ) {
            if ( source_transaction[ j ].source === this ) {
              delete source_transactions[ source_transaction ];
              
              not_found = false;
              
              break;
            }
          }
          
          if ( not_found ) {
            try {
              throw new Error( 'Expected to find this source as a source_transaction' );
            } catch( e ) {
              exception( e, '__query_tree_emit()/end_transaction()' );
            }
          }
          
          if ( p.source_subscriber_index ) continue; // the transaction will terminate in the subscribers emit
          
          // Terminate the transaction
          p._add( [], options );
        }
      }
      
      return this;
    }, // _end_transaction()
    
    _end_source_transactions: function() {
      // ToDo: implement and call on _remove_destination()
      var source_transactions = this.source_transactions
        , transaction_id, source_transaction
      ;
      
      for ( transaction_id in source_transactions ) {
        source_transaction = source_transactions[ transaction_id ];
        
        source = source_transaction.source;
        
        transaction = source.transactions[ transaction_id ];
        
        transaction.splice( source_transaction.position, 1 );
        
        if ( transaction.length == 0 ) delete source.transactions[ transaction_id ];
        
        this._add( [], { transaction_id: transaction_id } );
      }
      
      this.source_transactions = Dictionary();
      
      return this;
    }, // _end_source_transactions()
    
    /* ------------------------------------------------------------------------
       query_tree_pause( destination )
       
       Pause __emit_xxx to destination
    */
    query_tree_pause: function( destination ) {
      // ToDo: implement query_tree_pause()
      return this;
    }, // query_tree_pause()
    
    /* ------------------------------------------------------------------------
       query_tree_resume( destination )
       
       Resume __emit_xxx to destination
    */
    query_tree_resume: function( destination ) {
      // ToDo: implement query_tree_resume()
      return this;
    } // query_tree_resume()
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
