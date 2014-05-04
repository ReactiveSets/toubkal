###
    xs_core.coffee

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

###

# ----------------------------------------------------------------------------------------------
# xs test utils
# -------------

utils = require( './xs_tests_utils.js' ) if require?
expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
log    = this.log    || utils.log
xs     = this.xs     || utils.xs

XS      = xs.XS
extend  = XS.extend
uuid_v4 = XS.uuid_v4

slice = Array.prototype.slice

# ----------------------------------------------------------------------------------------------
# Check sorted pipelet content
# ----------------------------

check_set_content = ( done, source, values ) ->
  source._fetch_all ( _values ) ->
    check done, () ->
      expect( _values.sort ( a, b ) -> a.id - b.id ).to.be.eql values
  
# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

if require?
  require '../../lib/code.js'

Pipelet = XS.Pipelet
Set     = XS.Set

# ----------------------------------------------------------------------------------------------
# Some constants
# --------------

valid_uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

# ----------------------------------------------------------------------------------------------
# xs unit test suite
# ------------------

describe 'Query & Query_Tree test suite:', ->
  describe 'Query.Error()', ->
    Query_Error = XS.Query.Error
    
    e = new Query_Error 'message'
    
    it 'should be a Query_Error', ->
      expect( e ).to.be.a Query_Error
      expect( e ).to.be.a Error
      
    it 'should have a message', ->
      expect( e.message ).to.be 'message'
    
    it 'should have a stack', ->
      expect( e.stack ).to.be.a 'string'
  
  describe 'Query():', ->
    Query = XS.Query
    
    q = q1 = null
    
    it 'new Query( [] ) should create an empty query', ->
      q = new Query [];
      
      expect( q.query   ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
      
    it 'new Query() should create an empty query', ->
      q = new Query();
      
      expect( q.query   ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    
    
    it 'Query..add() should allow to "or" two empty queries', ->
      q = new Query( [] )
      
      expect( q.add( [] ).query ).to.be.eql []
      expect( q.adds ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should add query to empty query', ->
      expect( q.add( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql []
      
    it 'Query..add() should OR two queries', ->
      expect( q.add( [ { flow: 'user' } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
      
    it 'Query..add() should OR two queries and result in optimized query', ->
      expect( q.add( [ { flow: 'group', id: 1465 } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should not duplicate existing expressions', ->
      expect( q.add( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query.add() should remove an expression if a new less restrictive is or-ed', ->
      q.add( [ { flow: 'post', id: 1 }, { flow: 'post' } ] )
      
      expect( q.query ).to.be.eql [ { flow: 'group' }, { flow: 'user' }, { flow: 'post' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' }, { flow: 'post', id: 1 }, { flow: 'post' } ]
      expect( q.removes ).to.be.eql [ { flow: 'post', id: 1 } ]
    
    it 'new Query( query ) should self optimize and not alter parameter query', ->
      query = [ { flow: 'group' }, { flow: 'group' }, { flow: 'user' }, { flow: 'group' }, { flow: 'user' } ]
      
      q = new Query( query )
      
      expect( q.query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( query ).to.be.eql [ { flow: 'group' }, { flow: 'group' }, { flow: 'user' }, { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should optimize more than one left expression per less restrictive right expression', ->
      q1 = [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      
      q = new Query( q1 ).add [ flow: 'group' ]
      
      expect( q.query   ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 }, { flow: 'group' } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
    
    it 'should not have alterned Query() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
    
    
    
    it 'Query..and() should allow to "and" two empty queries', ->
      q = new Query []
      
      expect( q.and( [] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should remain empty after "and" query to empty query', ->
      expect( q.and( [ { flow: 'group' } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should not change query after "and" query with same query', ->
      expect( q.add( [ { flow: 'group' } ] ).and( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should AND two queries', ->
      expect( q.and( [ { id: 26 } ] ).query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' } ]
    
    it 'Query..and() with one false sub term should AND two queries', ->
      q.add( [ { flow: 'group', id: 27 } ] ).and( [ { id: 26 } ] )
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 27 } ]
      
    it 'Query..discard_operations() should empty adds and removes', ->
      q.discard_operations()
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() with only one false sub term should AND two queries to result in an empty query', ->
      expect( q.and( [ { id: 27 } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 } ]
    
    it 'Query..and() with two AND propositions should AND two queries and produce two propositions', ->
      q1 = [ { id: 26 }, { id: 27 } ]
      q.add( [ { flow: 'group' } ] ).and q1
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group' } ]
    
    it 'should not have alterned and() parameter query', ->
      expect( q1 ).to.be.eql [ { id: 26 }, { id: 27 } ]
      
    it 'Query..and() with two AND propositions with more terms than original should AND two queries and produce one proposition', ->
      q.discard_operations()
      
      q1 = [ { flow: 'group', id: 27 }, { flow: 'user', id: 234 } ]
      q.add( [ { flow: 'group' } ] ).and q1
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 27 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 }, { flow: 'group' } ]
    
    it 'should not have alterned and() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 27 }, { flow: 'user', id: 234 } ]
      
    
    
    it 'Query..remove() should allow to "remove" two empty queries', ->
      q = new Query( [] )
      
      expect( q.remove( [] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..remove() should remain empty after "remove" query to empty query', ->
      expect( q.add( [ { flow: 'group' } ] ).remove( [ { flow: 'group' } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' } ]
    
    it 'Query..remove() should raise a Query.Error after "remove" from empty query', ->
      expect( () -> new Query( [] ).remove( [ { flow: 'group' } ] ).query )
        .to.throwException ( e ) -> expect( e ).to.be.a Query.Error
    
    it 'Query..remove() should raise a Query.Error after "remove" with not-found query', ->
      expect( () -> new Query( [ { flow: 'group', id: 1 } ] ).remove( [ { flow: 'group' } ] ).query )
        .to.throwException ( e ) -> expect( e ).to.be.a Query.Error
    
    it 'Query..remove() should raise a Query.Error after "remove" with not-found query', ->
      expect( () -> new Query( [ { flow: 'group' } ] ).remove( [ { flow: 'group', id: 1 } ] ).query )
        .to.throwException ( e ) -> expect( e ).to.be.a Query.Error
    
    it 'Query..remove() should remove two queries after "remove"', ->
      q = new Query( [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ] ).remove [
          { flow: 'group', id: 2 }
          { flow: 'user', id: 3 }
        ]
      
      expect( q.query ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 3 }
        ]
      expect( q.adds ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ]
      expect( q.removes ).to.be.eql [
          { flow: 'group', id: 2 }
          { flow: 'user', id: 3 }
        ]
      
    it 'Query..remove() should remove expressions after "remove" even if removed out of order', ->
      q1 = [
        { flow: 'user', id: 2 }
        { flow: 'group', id: 3 }
        { flow: 'user', id: 4 }
        { flow: 'group', id: 1 }
        { flow: 'user', id: 1 }
        { flow: 'user', id: 3 }
      ]
      
      q = new Query( [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ] ).remove q1
        
      expect( q.query ).to.be.eql [
          { flow: 'group', id: 2 }
        ]
      expect( q.adds ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ]
      expect( q.removes ).to.be.eql [
          { flow: 'user', id: 2 }
          { flow: 'group', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'user', id: 1 }
          { flow: 'user', id: 3 }
        ]
    
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [
          { flow: 'user', id: 2 }
          { flow: 'group', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'user', id: 1 }
          { flow: 'user', id: 3 }
        ]
      
    it 'should not remove an expression which was previously optimized-out by add()', ->
      q.discard_operations()
      
      q.add    [ { flow: 'group' } ]
      
      expect( q.optimized ).to.be.eql [ { flow: 'group', id: 2 } ]
      
      q1 = [ { flow: 'group', id: 2 } ]
      
      q.remove q1
      
      expect( q.query     ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.optimized ).to.be.eql []
    
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 2 } ]
    
    it 'should recover expression previously optimized-out by add() when removing the less restrictive operation', ->
      q = new Query [ { flow: 'group', id: 2 } ]
      
      expect( q.query     ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.removes   ).to.be.eql []
      expect( q.optimized ).to.be.eql []
      
      # add less restrictive expression than { flow: 'group', id: 2 }
      q.add [ { flow: 'group' } ] 
      
      expect( q.query     ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.optimized ).to.be.eql [ { flow: 'group', id: 2 } ]
      
      # remove less restrictive operation
      q1 = [ { flow: 'group' } ]
      
      q.remove [ { flow: 'group' } ]
      
      # expects more restrictive expression { flow: 'group', id: 2 } to be recovered
      expect( q.query     ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' }, { flow: 'group', id: 2 } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' } ]
      expect( q.optimized ).to.be.eql []
      
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group' } ]
    
    
    
    it 'generate() should generate a filter() function', ->
      q = new Query( [ { flow: 'group' }, { flow: 'user', id: 231 } ] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
      
    it 'filter() should filter an Array of Objects', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
      ]
    
    it 'should generate a filter for a query with no or-terms', ->
      q = new Query( [] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
    
    it 'should filter everything, this is the nul-filter', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql []
    
    it 'should generate a filter for a query with one or-terms having no and terms', ->
      q = new Query( [ {} ] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
    
    it 'should filter nothing, this is a pass-through filter', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ]
    
    
    it 'differences() should returns adds and removes', ->
      q = new Query [
        { flow: 'stores', id: 1 }
        { flow: 'stores', id: 2 }
        { flow: 'stores', id: 3 }
      ]
      
      q1 = [
        { flow: 'stores', id: 3 }
        { flow: 'stores', id: 4 }
        { flow: 'stores', id: 5 }
      ]
      
      differences = q.differences q1
      
      expect( q1 ).to.be.eql [
        { flow: 'stores', id: 3 }
        { flow: 'stores', id: 4 }
        { flow: 'stores', id: 5 }
      ]
      
      expect( q.query ).to.be.eql [
        { flow: 'stores', id: 1 }
        { flow: 'stores', id: 2 }
        { flow: 'stores', id: 3 }
      ]
      
      expect( differences ).to.be.eql [
        [
          { flow: 'stores', id: 1 }
          { flow: 'stores', id: 2 }
        ]
        
        [
          { flow: 'stores', id: 4 }
          { flow: 'stores', id: 5 }
        ]
      ]
    
    
  describe 'Query_Tree()', ->
    tree = new XS.Pipelet()
    
    subscriber_1 = xs.set( [], { name: 'subscriber_1' } )
    subscriber_2 = xs.set( [], { name: 'subscriber_2' } )
    subscriber_3 = xs.set( [], { name: 'subscriber_3' } )
    
    it 'Pipelet() should allow to create a top query tree node', ->
      expect( tree.query_tree_top ).to.be.eql {
        branches   : {}
        keys       : []
        subscribers: []
        subscribers_values: []
      }
    
    it 'Adding a query should generate a query tree', ->
      expect( tree
        .__query_tree_add( [ { flow: 'user' } ], subscriber_1 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
              subscribers_values: []
            }
          }
        }
        keys       : [ "flow" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Adding an empty OR-term should add subscriber to the root of the tree - i.e. unfiltered', ->
      expect( tree
        .__query_tree_add( [ {} ], subscriber_2 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
              subscribers_values: []
            }
          }
        }
        keys       : [ "flow" ]
        subscribers: [ subscriber_2 ]
        subscribers_values: []
      }
      
    it 'Adding an additional query should expand the query tree', ->
      expect( tree
        
        .__query_tree_add( [
          { flow: 'user' }
          { flow: 'group', id: 527 }
          { id: 521, flow: 'group' }
          { id: 425 }
        ], subscriber_3 )
        
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1, subscriber_3 ]
              subscribers_values: []
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys       : [ "flow", "id" ]
        subscribers: [ subscriber_2 ]
        subscribers_values: []
      }
      
    it 'Remove a query should shrink the query tree', ->
      expect( tree
        .__query_tree_remove( [ {} ], subscriber_2 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1, subscriber_3 ]
              subscribers_values: []
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove another query should shrink the query tree further', ->
      expect( tree
        .__query_tree_remove( [ { flow: 'user' } ], subscriber_3 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
              subscribers_values: []
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove another query should shrink the query tree even further', ->
      expect( tree
        .__query_tree_remove( [ { flow: 'user' } ], subscriber_1 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Add and Remove empty queries should not change anything', ->
      expect( tree
        .__query_tree_add( [] ).__query_tree_remove( [] )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove another query should shrink the query tree even further', ->
      expect( tree
        
        .__query_tree_remove( [
          { flow: 'group', id: 521 }
          { id: 527, flow: 'group' }
        ], subscriber_3 )
        
        .query_tree_top
      ).to.be.eql {
        branches: {
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove the last record, should empty the query tree', ->
      expect( tree
        .__query_tree_remove( [ { id: 425 } ], subscriber_3 )
        .query_tree_top
      ).to.be.eql {
        branches  : {}
        keys      : []
        subscribers: []
        subscribers_values: []
      }
      
  describe 'Query_Tree routing:', ->
    tree = new XS.Pipelet()
    
    subscriber_1 = xs.set( [], { name: 'subscriber_1' } )
    subscriber_2 = xs.set( [], { name: 'subscriber_2' } )
    subscriber_3 = xs.set( [], { name: 'subscriber_3' } )
    subscriber_4 = xs.set( [], { name: 'subscriber_4' } )
    
    tree.__query_tree_add [ { flow: 'user', id: 123 } ], subscriber_1
    
    tree.__query_tree_add [ { flow: 'user', id: 345 } ], subscriber_2
    
    tree.__query_tree_add [ {} ], subscriber_3
    
    tree.__query_tree_add [ { id: 123 }, { flow: 'user' } ], subscriber_4
    
    tree.__query_tree_emit 'add', [
      { flow: 'group' }
      { id: 123 }
      { flow: 'user', id: 123 }
      { flow: 'user', id: 345 }
    ]
    
    it 'Should allow to emit an add operation filtered by a query to the first subscriber', ( done ) ->
      subscriber_1._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 123 }
        ]
        
    it 'Should emit other values to the second subscriber', ( done ) ->
      subscriber_2._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 345 }
        ]
      
    it 'Should emit all values to the third subscriber', ( done ) ->
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
          { id: 123 }
          { flow: 'user', id: 123 }
          { flow: 'user', id: 345 }
        ]

    it 'Should not duplicate or reorder values emited to fourth subscriber', ( done ) ->
      subscriber_4._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { id: 123 }
          { flow: 'user', id: 123 }
          { flow: 'user', id: 345 }
        ]

    it "should alter first recepient's set", ( done ) ->
      tree.__query_tree_emit 'remove', [ { flow: 'user', id: 123 } ]
      
      subscriber_1._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
        
    it "should not alter second subscriber's set", ( done ) ->
      subscriber_2._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 345 }
        ]
    
    it 'Third subscriber set should have two record less after removing one more record', ( done ) ->
      tree.__query_tree_emit 'remove', [ { id: 123 } ]
      
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
          { flow: 'user', id: 345 }
        ]
      
    it 'Second subscriber be empy after removing one more record', ( done ) ->
      tree.__query_tree_emit 'remove', [ { flow: 'user', id: 345 } ]
      
      subscriber_2._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
      
    it 'And third subscriber should have only one record left', ( done ) ->
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
        ]
      
    it 'third subscriber should be empty after removing last record', ( done ) ->
      tree.__query_tree_emit 'remove', [ { flow: 'group' } ]
      
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
      
    it '_clear should clear all records from all subscribers', ( done ) ->
      tree.__query_tree_add [ { flow: 'user', id: 123 } ], subscriber_1
      
      tree.__query_tree_add [ { flow: 'user', id: 345 } ], subscriber_2
      
      tree.__query_tree_add [ {} ], subscriber_3
      
      tree.__query_tree_add [ { id: 123 }, { flow: 'user' } ], subscriber_4
      
      tree.__query_tree_emit 'add', [
        { flow: 'group' }
        { id: 123 }
        { flow: 'user', id: 123 }
        { flow: 'user', id: 345 }
      ]
      
      tree.__query_tree_emit 'clear'
      
      count = 4
      all_values = []

      fetched = ( values ) ->
        all_values.push( values )
        
        --count || check done, () ->
          expect( all_values ).to.be.eql [ [], [], [], [] ]

      subscriber_1._fetch_all fetched
      subscriber_2._fetch_all fetched
      subscriber_3._fetch_all fetched
      subscriber_4._fetch_all fetched
      
