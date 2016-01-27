###
    transforms.coffee
    
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
