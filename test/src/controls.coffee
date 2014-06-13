###
    xs_controls.coffee

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
# ----------------------------------------------------------------------------------------------

Browser = require( 'zombie' )
utils   = require( './tests_utils.js' )

browser = new Browser( { silent: true } )
expect  = this.expect || utils.expect
check   = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# xs URL unit test suite
# ----------------------------------------------------------------------------------------------

describe 'Controls Test Suite', ->
  describe 'Checkbox():', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'charts should be empty', ( done ) ->
      browser.window.charts._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'checkbox element name attribute should be "charts"', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).name ).to.be 'charts'
    
    it 'after charts_source._add( { id: true } ), charts should be equal { id: true }', ( done ) ->
      browser.window.charts_source._add [ { id: true } ]
      
      browser.window.charts._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: true } ]
    
    it 'checkbox element should be checked', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).checked ).to.be true
    
    it 'checkbox element should be disabled', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).disabled ).to.be true
    
    it 'checkbox label should be equal to "Charts"', ->
      expect( browser.query( '#charts label' ).innerHTML ).to.be 'Charts'
    
    it 'after charts_source._add( { id: false, label: "No Charts" } ), charts should be equal to { id: false, label: "No Charts" }', ( done ) ->
      browser.window.charts_source._add [ { id: false, label: 'No Charts' } ]
      
      browser.window.charts._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false, label: 'No Charts' } ]
    
    it 'checkbox element should not be checked, and label equal to "Charts"', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).checked   ).to.be false
      expect( browser.query( '#charts label'                  ).innerHTML ).to.be 'Charts'
    
    it 'checkbox element should not be disabled', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).disabled ).to.be false
    
    it 'after checkbox uncheck, charts should be equal to { id: false }', ( done ) ->
      browser.uncheck( '#charts input[type="checkbox"]' )
      
      browser.window.charts._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false, label: 'No Charts' } ]
    
    it 'checkbox should be unchecked, and label equal to "Charts"', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).checked   ).to.be false
      expect( browser.query( '#charts label'                  ).innerHTML ).to.be 'Charts'
    
    it 'after checkbox check, charts should be equal to { id: true }', ( done ) ->
      browser.check( '#charts input[type="checkbox"]' )
      
      browser.window.charts._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: true } ]
    
    it 'checkbox should be checked', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).checked   ).to.be true
    
    it 'after charts_source clear and add { id: false }, charts should be equal to { id: false } ', ( done ) ->
      browser.window.charts_source._notify [
        { action: 'clear' }
        { action: 'add' , objects: [ { id: false } ] }
      ]
      
      browser.window.charts._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false } ]
    
    it 'checkbox element should not be checked', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).checked ).to.be false
    
    it 'checkbox element should be disabled', ->
      expect( browser.query( '#charts input[type="checkbox"]' ).disabled ).to.be true
    
    it 'checkbox label should be equal to "Charts"', ->
      expect( browser.query( '#charts label' ).innerHTML ).to.be 'Charts'
  
  # ------------------------- Drop_Down() ----------------------------------------------------------------------------------
  
  describe 'Drop_Down():', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'countries should be empty', ( done ) ->
      browser.window.countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'drop_down element name attribute should be "countries" ( option "name" not provided )', ->
      expect( browser.query( '#countries select' ).name ).to.be 'countries'
    
    it 'after countries_source._add( 8 objects ), countries should be equal to { id: 3, label: "France" }', ( done ) ->
      browser.window.countries_source._add [
        { id: 1, label: 'USA'        }
        { id: 2, label: 'Morocco'    }
        { id: 3, label: 'France'     }
        { id: 4, label: 'Japan'      }
        { id: 5, label: 'Spain'      }
        { id: 6, label: 'Portugal'   }
        { id: 8, label: 'Madagascar' }
      ]
      
      browser.window.countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 3, label: 'France' } ]
      
    it 'drop_down element should contain 8 options element', ->
      expect( browser.query( '#countries select' ).length ).to.be 7
    
    it 'drop_down selectedindex should be 0', ->
      expect( browser.query( '#countries select' ).selectedIndex ).to.be 0
    
    it 'after countries_source._remove( 2 objects ), countries should be equal to { id: 4, label: "Japan" }', ( done ) ->
      browser.window.countries_source._remove [
        { id: 3, label: 'France' }
        { id: 5, label: 'Spain'  }
      ]
      
      browser.window.countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 4, label: 'Japan' } ]
    
    it 'drop_down element should contain 6 options element', ->
      expect( browser.query( '#countries select' ).length ).to.be 5
    
    
    it 'after countries_source._update( 3 objects ), countries should be equal to { id: 8, label: "Madagascar" }', ( done ) ->
      browser.window.countries_source._update [
        [ { id: 6, label: 'Portugal'   }, { id: 5, label: 'Germany' } ]
        [ { id: 8, label: 'Madagascar' }, { id: 8, label: 'Madagascar', selected: true } ]
        [ { id: 4, label: 'Japan'      }, { id: 4, label: 'Italy' } ]
      ]
      
      browser.window.countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 8, label: 'Madagascar', selected: true } ]
    
    
    it 'after select "Morocco", drop_down element should be equal to { id: 2, label: "Morocco" }', ( done ) ->
      browser.select( 'countries', 'Morocco' )
      
      browser.window.countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 2, label: 'Morocco' } ]
    
    it 'drop_down selectedindex should be 2', ->
      expect( browser.query( '#countries select' ).selectedIndex ).to.be 3
  
  # ------------------------- Radio() ---------------------------------------------------------------------------------------
  
  describe 'Radio():', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'religions should be empty', ( done ) ->
      browser.window.religions._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'after religions_source._add( 6 objects ), religions should be equal to [ { id: 1, label: "Islam", selected: true } ]', ( done ) ->
      browser.window.religions_source._add [
        { id: 1, label: "Islam"       , selected: true }
        { id: 2, label: "Christianity" }
        { id: 3, label: "Judaism"      }
        { id: 6, label: "Satanism"     }
        { id: 7, label: "Atheism"      }
        { id: 8, label: "Rastafari"    }
      ]
      
      browser.window.religions._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 1, label: "Islam", selected: true } ]
    
    it 'radio container should contain 6 radio inputs', ->
      expect( browser.queryAll( '#religions input' ).length ).to.be 6
    
    it 'radio elements name should be "religions"', ->
      radios = browser.queryAll( '#religions input' )
      
      expect( radios[ 0 ].name ).to.be 'religions'
      expect( radios[ 1 ].name ).to.be 'religions'
      expect( radios[ 2 ].name ).to.be 'religions'
      expect( radios[ 3 ].name ).to.be 'religions'
      expect( radios[ 4 ].name ).to.be 'religions'
      expect( radios[ 5 ].name ).to.be 'religions'
    
    it 'radio with label "Islam" should be checked', ->
      expect( browser.queryAll( '#religions input' )[ 2 ].checked ).to.be true
    
    it 'after religions_source._remove( 2 objects ), expect religions to be empty ( selected value is removed )', ( done ) ->
      browser.window.religions_source._remove [
        { id: 6, label: "Satanism" }
        { id: 1, label: "Islam", selected: true }
      ]
      
      browser.window.religions._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'radio container should contain 4 radio inputs', ->
      expect( browser.queryAll( '#religions input' ).length ).to.be 4
    
    it 'no radio should be checked', ->
      expect( browser.query( '#religions input:checked' ) ).to.be null
    
    it 'after religions_source._add( { id: 5, label: "Hinduism", selected: true } ), religions should be equal to { id: 5, label: "Hinduism", selected: true }', ( done ) ->
      browser.window.religions_source._add [ { id: 5, label: 'Hinduism', selected: true } ]
      
      browser.window.religions._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 5, label: 'Hinduism', selected: true } ]
    
    it 'radio container should contain 6 radio inputs, and radio with label "Hinduism" should be checked', ->
      expect( browser.queryAll( '#religions input' ).length ).to.be 5
      expect( browser.queryAll( '#religions input' )[ 2 ].checked ).to.be true
    
    it 'after religions_source._update( 3 objects ), expect religions to be equal to { id: 4, label: "Rastafari", selected: true }', ( done ) ->
      browser.window.religions_source._update [
        [ { id: 8, label: "Rastafari" }, { id: 4, label: "Rastafari", selected: true } ]
        [ { id: 5, label: "Hinduism"  }, { id: 5, label: "Buddhism" } ]
        [ { id: 7, label: "Atheism"   }, { id: 7, label: "Islam"    } ]
      ]
      
      browser.window.religions._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 4, label: 'Rastafari', selected: true } ]
    
    it 'after "Christianity" radio check, religions should be equal to  { id: 2, label: "Christianity"  }', ( done ) ->
      browser.choose( '#religions input[value="2"]' )
      
      browser.window.religions._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 2, label: 'Christianity'  } ]
    
    it 'radio with label "Christianity" should be checked', ->
      expect( browser.queryAll( '#religions input' )[ 1 ].checked ).to.be true
  
  # ------------------------- Checkbox_Group() ------------------------------------------------------------------------------
  
  describe 'Checkbox_Group()', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'hobbies should be empty', ( done ) ->
      browser.window.hobbies._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'after hobbies_source._add( objects ), hobbies should be equal to result', ( done ) ->
      browser.window.hobbies_source._add [
        { id: 1, label: "Photography"            , selected: true }
        { id: 2, label: "Fishing"                                 }
        { id: 3, label: "Playing Computer Games"                  }
        { id: 4, label: "Traveling"              , selected: true }
        { id: 5, label: "Cooking"                                 }
        { id: 6, label: "Stamp / Coin Collection", selected: true }
        { id: 7, label: "Pottery"                , selected: true }
        { id: 8, label: "Gardening"                               }
      ]
      
      browser.window.hobbies._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, label: "Photography"            , selected: true }
          { id: 7, label: "Pottery"                , selected: true }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
          { id: 4, label: "Traveling"              , selected: true }
        ]
    
    it 'checkbox_group container should contain 6 checkboxes', ->
      expect( browser.queryAll( '#hobbies input' ).length ).to.be 8
    
    it 'checkbox elements name should be "hobbies"', ->
      checkboxes = browser.queryAll( '#hobbies input' )
      
      expect( checkboxes[ 0 ].name ).to.be 'hobbies'
      expect( checkboxes[ 1 ].name ).to.be 'hobbies'
      expect( checkboxes[ 2 ].name ).to.be 'hobbies'
      expect( checkboxes[ 3 ].name ).to.be 'hobbies'
      expect( checkboxes[ 4 ].name ).to.be 'hobbies'
      expect( checkboxes[ 5 ].name ).to.be 'hobbies'
      expect( checkboxes[ 6 ].name ).to.be 'hobbies'
      expect( checkboxes[ 7 ].name ).to.be 'hobbies'
    
    it 'checkboxes with label "Photography", "Stamp / Coin Collection" and "Traveling" should be checked', ->
      expect( browser.queryAll( '#hobbies input' )[ 3 ].checked ).to.be true
      expect( browser.queryAll( '#hobbies input' )[ 5 ].checked ).to.be true
      expect( browser.queryAll( '#hobbies input' )[ 6 ].checked ).to.be true
      expect( browser.queryAll( '#hobbies input' )[ 7 ].checked ).to.be true
    
    it 'after hobbies_source._remove( 2 objects ), hobbies should be equal to result', ( done )->
      browser.window.hobbies_source._remove [
        { id: 3, label: "Playing Computer Games"                 }
        { id: 4, label: "Traveling"             , selected: true }
      ]
      
      browser.window.hobbies._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, label: "Photography"            , selected: true }
          { id: 7, label: "Pottery"                , selected: true }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
        ]
    
    it 'checkbox_group container should contain 6 checkboxes', ->
      expect( browser.queryAll( '#hobbies input' ).length ).to.be 6
    
    it 'checkboxes with label "Photography" and "Stamp / Coin Collection" should be checked', ->
      expect( browser.queryAll( '#hobbies input' )[ 3 ].checked ).to.be true
      expect( browser.queryAll( '#hobbies input' )[ 4 ].checked ).to.be true
      expect( browser.queryAll( '#hobbies input' )[ 5 ].checked ).to.be true
    
    it 'after hobbies_source._update( objects ), hobbies should be equal to result', ( done )->
      browser.window.hobbies_source._update [
        [ { id: 3, label: "Playing Computer Games"  }, { id: 3, label: "Playing Video Games"                   } ]
        [ { id: 7, label: "Pottery", selected: true }, { id: 7, label: "Pottery"             , selected: false } ]
        [ { id: 8, label: "Gardening"               }, { id: 8, label: "Gardening and Plants", selected: true  } ]
      ]
      
      browser.window.hobbies._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 8, label: "Gardening and Plants"   , selected: true }
          { id: 1, label: "Photography"            , selected: true }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
        ]
    
    it 'after "Cooking" check and "Stamp / Coin Collection" uncheck, hobbies should be equal to result', ( done ) ->
      browser
        .check  ( '#hobbies input[value="5"]' )
        .uncheck( '#hobbies input[value="6"]' )
      
      browser.window.hobbies._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 5, label: "Cooking"                                 }
          { id: 8, label: "Gardening and Plants"   , selected: true }
          { id: 1, label: "Photography"            , selected: true }
        ]
    
    it 'checkboxes with label "Photography" and "Cooking" should be checked', ->
      expect( browser.queryAll( '#hobbies input' )[ 2 ].checked ).to.be true
      expect( browser.queryAll( '#hobbies input' )[ 3 ].checked ).to.be true
  