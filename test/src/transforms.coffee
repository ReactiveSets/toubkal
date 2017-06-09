###
    transforms.coffee
    
    Copyright (c) 2013-2017, Reactive Sets

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
# rs test utils
# -------------

unless this.expect?
  utils  = require './tests_utils.js'
  require '../../lib/core/filter.js'
  require '../../lib/core/transforms.js'

expect = this.expect || utils.expect
check  = this.check  || utils.check
rs     = this.rs     || utils.rs
clone  = rs.RS.extend.clone

Expected_Operations = this.Expected_Operations || utils.Expected_Operations

# ----------------------------------------------------------------------------------------------
# Test File pipelets
# ------------------

describe 'transforms', ->
  describe 'attribute_to_value():', ->
    source = rs
      .set [
        { id: 1, content: { adjective: 'strong' } }
        { id: 2, content: { adjective: 'weak'   } }
      ]
      
    adjectives = null
    
    it 'should provide adjectives', ( done ) ->
      adjectives = source
        .attribute_to_value( { key: [ 'adjective' ] } )
        .set()
      
      adjectives._fetch_all ( adjectives ) -> check done, () ->
        expect( adjectives ).to.be.eql [
          { adjective: 'strong' }
          { adjective: 'weak'   }
        ]
        
    it 'should allow to remove adjective containers', ( done ) ->
      source._remove [ { id: 2, content: { adjective: 'weak'   } } ]
      
      adjectives._fetch_all ( adjectives ) -> check done, () ->
        expect( adjectives ).to.be.eql [ { adjective: 'strong' } ]
  
  describe 'value_to_attribute():', ->
    adjectives = rs.set [
      { id: 1, adjective: 'strong' }
      { id: 2, adjective: 'weak'   }
    ]
    
    it 'should embed adjectives in content attribute', ( done ) ->
      adjectives
        .value_to_attribute()
        ._fetch_all ( values )  -> check done, () ->
          expect( values ).to.be.eql [
            { id: 1, content: { id: 1, adjective: 'strong' } }
            { id: 2, content: { id: 2, adjective: 'weak'   } }
          ]
    
    it 'should embed adjectives in content attribute and add defaults attributes', ( done ) ->
      adjectives
        .value_to_attribute( { defaults: { flow: 'adjective' } } )
        ._fetch_all ( values )  -> check done, () ->
          expect( values ).to.be.eql [
            { flow: 'adjective', id: 1, content: { id: 1, adjective: 'strong' } }
            { flow: 'adjective', id: 2, content: { id: 2, adjective: 'weak'   } }
          ]
  
  describe 'attribute_to_values()', ->
    source = rs.set( [
      {
        id: 1
        
        content: [
          { city: 'Paris'     }
          { city: 'Marseille' }
        ]
      }
      
      {
        id: 2
        
        content: [
          { city: 'Lille' }
          { city: 'Caen'  }
        ]
      }
    ] )
    
    cities = null
    
    it 'should get cities', ( done ) ->
      cities = source
        .attribute_to_values( { key: [ 'city' ] } )
        .set()
      
      cities._fetch_all ( values ) ->
        check done, () ->
          expect( values ).to.be.eql [
            { city: 'Paris'     }
            { city: 'Marseille' }
            { city: 'Lille'     }
            { city: 'Caen'      }
          ]
          
    it 'should allow to remove content', ( done ) ->
      source._remove [
        {
          id: 2
          
          content: [
            { city: 'Lille'     }
            { city: 'Caen'      }
          ]
        }
      ]
      
      cities._fetch_all ( values ) ->
        check done, () ->
          expect( values ).to.be.eql [
            { city: 'Paris'     }
            { city: 'Marseille' }
          ]
  
  describe 'values_to_attribute()', ->
    cities = [
      { city: 'Paris'     }
      { city: 'Marseille' }
      { city: 'Lille'     }
      { city: 'Caen'      }
    ]
    
    source = null
    value = null
    
    values_to_attribute_tests = ( flavor ) ->
      flavor = if flavor then ' (' + flavor + ')' else ''
      
      it 'should embed all cities into a value with content attribute' + flavor, ->
        source = rs.set cities, { key: [ 'city' ] }
        
        value = source.values_to_attribute()
        
        value = value.set() if flavor is 'on a set'
        
        value._fetch_all ( values ) ->
          expect( values ).to.be.eql [
            { id: 1, content: [
              { city: 'Paris'     }
              { city: 'Marseille' }
              { city: 'Lille'     }
              { city: 'Caen'      }
            ] }
          ]
      
      it 'should allow to add two cities' + flavor, ->
        source._add [
          { city: 'Bordeaux'  }
          { city: 'Bastia'    }
        ]
        
        value._fetch_all ( values ) ->
          expect( values ).to.be.eql [
            { id: 1, content: [
              { city: 'Paris'     }
              { city: 'Marseille' }
              { city: 'Lille'     }
              { city: 'Caen'      }
              { city: 'Bordeaux'  }
              { city: 'Bastia'    }
            ] }
          ]
      
      it 'should allow to remove three cities' + flavor, ->
        source._remove [
          { city: 'Bordeaux'  }
          { city: 'Marseille' }
          { city: 'Caen'      }
        ]
        
        value._fetch_all ( values ) ->
          expect( values ).to.be.eql [
            { id: 1, content: [
              { city: 'Paris'     }
              { city: 'Lille'     }
              { city: 'Bastia'    }
            ] }
          ]
      
      it 'should allow to update a city' + flavor, ->
        source._update [ [
          { city: 'Lille'     }
          { city: 'Lyon'      }
        ] ]
        
        value._fetch_all ( values ) ->
          expect( values ).to.be.eql [
            { id: 1, content: [
              { city: 'Paris'     }
              { city: 'Bastia'    }
              { city: 'Lyon'      }
            ] }
          ]
      
      it 'should allow to remove last three cities' + flavor, ->
        source._remove [
          { city: 'Paris'     }
          { city: 'Bastia'    }
          { city: 'Lyon'      }
        ]
        
        value._fetch_all ( values ) ->
          expect( values ).to.be.eql []
      
      it 'should allow to add last three cities back' + flavor, ->
        source._add [
          { city: 'Paris'     }
          { city: 'Bastia'    }
          { city: 'Lyon'      }
        ]
        
        value._fetch_all ( values ) ->
          expect( values ).to.be.eql [ { id: 1, content: [
            { city: 'Paris'     }
            { city: 'Bastia'    }
            { city: 'Lyon'      }
          ] } ]
      
      it 'should allow to remove last three cities again' + flavor, ->
        source._remove [
          { city: 'Paris'     }
          { city: 'Bastia'    }
          { city: 'Lyon'      }
        ]
        
        value._fetch_all ( values ) ->
          expect( values ).to.be.eql []
    
    values_to_attribute_tests()
    values_to_attribute_tests( 'on a set' )

  describe 'pick()', ->
    source   = null
    picked   = null
    filter   = null
    filtered = null
    set      = null
    
    describe 'Array expression pick( [ "name", "age" ] )', ->
      it 'should pick name and age from source set', ( done ) ->
        source = rs.set [
          { flow: 'users', id: 1, name: 'Joe' , age: 76 }
          { flow: 'users', id: 2, name: 'Jill', age: 45 }
          { flow: 'users', id: 3              , age: 56 }
          { flow: 'users', id: 4                        }
        ]
        
        expression = [ "name", "age" ]
        picked = source.pick( expression, { key: expression, allow_empty: true } )
        
        picked._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Joe' , age: 76 }
            { name: 'Jill', age: 45 }
            {               age: 56 }
            {                       }
          ]
      
      it 'should have picked input lazy', ->
        expect( picked._input.future_query ).to.be null
      
      it 'should emit only one value when filtered for name: "Jill"', ( done ) ->
        filter   = picked.filter( [ { name: 'Jill' } ] )
        filtered = filter.greedy()
        
        filtered._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Jill', age: 45 }
          ]
      
      it 'should have made picked input subscribing to Jill only', ->
        expect( picked._input.future_query.query ).to.be.eql [ { name: 'Jill' } ]
      
      it 'should allow to remove user 3 and Jill, unfiltered', ( done ) ->
        source._remove [
          { flow: 'users', id: 3              , age: 56 }
          { flow: 'users', id: 2, name: 'Jill', age: 45 }
        ]

        picked._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Joe' , age: 76 }
            {                       }
          ]
      
      it 'should have removed Jill from filtered set', ( done ) ->
        filtered._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql []
      
      it 'should allow to add Jill back with a new age', ( done ) ->
        source._add [
          { flow: 'users', id: 2, name: 'Jill', age: 46 }
        ]
        
        picked._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Joe' , age: 76 }
            {                       }
            { name: 'Jill', age: 46 }
          ]
      
      it 'should also have Jill in filtered set', ( done ) ->
        filtered._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Jill', age: 46 }
          ]
      
      it "should allow to update Joe's age", ( done ) ->
        source._update [
          [
            { flow: 'users', id: 1, name: 'Joe' , age: 76 }
            { flow: 'users', id: 1, name: 'Joe' , age: 77 }
          ]
        ]
        
        picked._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            {                       }
            { name: 'Jill', age: 46 }
            { name: 'Joe' , age: 77 }
          ]
      
      it 'should not have altered filtered set with Jill', ( done ) ->
        filtered._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Jill', age: 46 }
          ]
      
      it 'should get all values when connected to greedy set destination ', ( done ) ->
        set = picked.set()
        
        set._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            {                       }
            { name: 'Jill', age: 46 }
            { name: 'Joe' , age: 77 }
          ]
      
      it 'should have made picked input greedy', ->
        expect( picked._input.future_query.query ).to.be.eql [ {} ]
      
      it 'should allow to disconnect greedy set', ->
        set._remove_source( picked )
      
      it 'should have emptied the set', (done) ->
        set._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql []
      
      it 'should have made picked input subscribing to Jill only again', ->
        expect( picked._input.future_query.query ).to.be.eql [ { name: 'Jill' } ]
      
      it 'should allow to disconnect filter', ->
        filter._remove_source( picked )
      
      it 'should filtered should now return an empty set when fetched', (done) ->
        filtered._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql []
      
      it 'should have made picked input lazy again', ->
        expect( picked._input.future_query.query ).to.be.eql []
    
    describe 'Object expression, pick( { id: ".user.id", order: ".order_id", name: ".user.name" } )', ->
      it 'should pick 5 values, with id, order from order_id, and name from user object in values', ( done ) ->
        source = rs.set [
          { flow: 'users', order_id: 10, user: { id: 1, name: 'Joe' , age: 76 } }
          { flow: 'users', order_id: 11, user: { id: 2, name: 'Jill', age: 45 } }
          { flow: 'users', order_id: 12, user: { id: 3              , age: 56 } }
          { flow: 'users', order_id: 13, user: {                              } }
          { flow: 'users', order_id: 14                                         }
          { flow: 'users'                                                       }
        ]
        
        picked = source.pick( { id: ".user.id", order: ".order_id", name: ".user.name" } )
        
        picked._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { id: 1, order: 10, name: 'Joe'  }
            { id: 2, order: 11, name: 'Jill' }
            { id: 3, order: 12               }
            {        order: 13               }
            {        order: 14               }
          ]
      
      it 'should be lazy', () ->
        expect( picked._input.future_query ).to.be null
    
    describe 'Using greedy option', ->
      it 'should pick 5 values, with id, order from order_id, and name from user object in values', ( done ) ->
        source = rs.set [
          { flow: 'users', order_id: 10, user: { id: 1, name: 'Joe' , age: 76 } }
          { flow: 'users', order_id: 11, user: { id: 2, name: 'Jill', age: 45 } }
          { flow: 'users', order_id: 12, user: { id: 3              , age: 56 } }
          { flow: 'users', order_id: 13, user: {                              } }
          { flow: 'users', order_id: 14                                         }
          { flow: 'users'                                                       }
        ]
        
        picked = source.pick( { id: ".user.id", order: ".order_id", name: ".user.name" }, { greedy: true } )
        
        picked._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { id: 1, order: 10, name: 'Joe'  }
            { id: 2, order: 11, name: 'Jill' }
            { id: 3, order: 12               }
            {        order: 13               }
            {        order: 14               }
          ]
      
      it 'should be greedy', () ->
        expect( picked._input.future_query.query ).to.be.eql [ {} ]
  
  describe 'filter_pick()', () ->
    expected        = new Expected_Operations()
    projects        = null
    images          = null
    images_projects = null
    request         = null
    requested       = null
    store           = null
    
    it 'should allow to fetch no projects when not connected with downstream greedy pipelet', ( done ) ->
      projects = rs.set [
        { flow: "project", id: 1 }
        { flow: "project", id: 2 }
        { flow: "project", id: 4 }
        { flow: "project", id: 5 }
      ]
      
      images = rs.set [
        { id: 10, project_id: 1 }
        { id: 11, project_id: 1 }
        { id: 12, project_id: 1 }
        { id: 13, project_id: 2 }
        { id: 14, project_id: 2 }
        { id: 15, project_id: 3 }
        { id: 16, project_id: 3 }
        { id: 17, project_id: 3 }
        { id: 18, project_id: 3 }
      ]
      
      images_projects = projects.filter_pick( images, { flow: "project", id: ".project_id" } )
      request   = rs.set()
      requested = images_projects.filter request
      store     = requested.store()
      
      images_projects._fetch_all ( fetched ) -> check done, () ->
        expect( fetched ).to.be.eql []
    
    it 'should allow to get one project when request has one project', ( done ) ->
      request._add( [ id: 2 ] )
      
      images_projects._fetch_all ( fetched ) -> check done, () ->
        expect( fetched ).to.be.eql [
          { flow: "project", id: 2 }
        ]
    
    it 'should allow to fetch one operation from store', ->
      expected.add 0, [ { flow: "project", id: 2 } ]
      
      store._output._fetch expected.receiver( 1 )
    
    it 'should not get project id 4 even when requested', ( done ) ->
      request._add( [ id: 4 ] )
      
      images_projects._fetch_all ( fetched ) -> check done, () ->
        expect( fetched ).to.be.eql [
          { flow: "project", id: 2 }
        ]
    
    it 'should not have emmitted any additional operation', ->
      store._output._fetch expected.receiver( 1 )
    
    it 'should allow to remove an image from project 2 without emitting any change', ( done ) ->
      images._remove [ { id: 14, project_id: 2 } ]
      
      images_projects._fetch_all ( fetched ) -> check done, () ->
        expect( fetched ).to.be.eql [
          { flow: "project", id: 2 }
        ]
    
    it 'should not have emmitted any additional operation', ->
      store._output._fetch expected.receiver( 1 )
    
    it 'should allow to remove last image from project 2, emitting one project remove', (done ) ->
      images._remove [ { id: 13, project_id: 2 } ]
      
      images_projects._fetch_all ( fetched ) -> check done, () ->
        expect( fetched ).to.be.eql []
    
    it 'should have emmitted a remove operation', ->
      expected.add 1, [ { flow: "project", id: 2 } ]
      
      store._output._fetch expected.receiver( 2 )
      
      
      
