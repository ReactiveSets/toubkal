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
    filtered = null
    
    describe 'lazy pick( [ "name", "age" ] )', ->
      it 'should pick name and age from source set', ( done ) ->
        source = rs.set [
          { flow: 'users', id: 1, name: 'Joe' , age: 76 }
          { flow: 'users', id: 2, name: 'Jill', age: 45 }
          { flow: 'users', id: 3              , age: 56 }
          { flow: 'users', id: 4                        }
        ]
        
        picked = source.pick( [ 'name', 'age' ], { key: [ 'name', 'age' ] } )
        
        picked._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Joe' , age: 76 }
            { name: 'Jill', age: 45 }
            {               age: 56 }
            {                       }
          ]
      
      it 'filtered for name: "Jill", should emit only one value', ( done ) ->
        filtered = picked
          .filter( [ { name: 'Jill' } ] )
          .greedy()
        
        filtered._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { name: 'Jill', age: 45 }
          ]
      
      it 'should be lazy', ->
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
      
      it 'should remove Jill from filtered set', ( done ) ->
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
