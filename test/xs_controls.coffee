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
utils   = require( './xs_tests_utils.js' )

browser = new Browser( { silent: true } )
expect  = this.expect || utils.expect
check   = this.check  || utils.check
# xs      = this.xs     || utils.xs

# ----------------------------------------------------------------------------------------------
# xs URL unit test suite
# ----------------------------------------------------------------------------------------------

describe 'Controls Test Suite', ->
  describe 'Checkbox()', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'checkbox set should be empty', ( done ) ->
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'checkbox element name attribute should be "charts"', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).name ).to.be 'charts'
    
    it 'after checkbox_source._add( { id: true } ), checkbox set should be equal { id: true }', ( done ) ->
      browser.window.checkbox_source._add [ { id: true } ]
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: true } ]
    
    it 'checkbox element should be checked', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked ).to.be true
    
    it 'checkbox element should be disabled', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).disabled ).to.be true
    
    it 'checkbox label should be equal to "Charts"', ->
      expect( browser.query( '#checkbox label' ).innerHTML ).to.be 'Charts'
    
    it 'after checkbox_source._add( { id: false, label: "No Charts" } ), checkbox set should be equal to { id: false, label: "No Charts" }', ( done ) ->
      browser.window.checkbox_source._add [ { id: false, label: 'No Charts' } ]
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false, label: 'No Charts' } ]
    
    it 'checkbox element should not be checked, and label equal to "Charts"', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked   ).to.be false
      expect( browser.query( '#checkbox label'                  ).innerHTML ).to.be 'Charts'
    
    it 'checkbox element should not be disabled', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).disabled ).to.be false
    
    it 'after checkbox uncheck, checkbox set should be equal to { id: false }', ( done ) ->
      browser.uncheck( '#checkbox input[type="checkbox"]' )
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false, label: 'No Charts' } ]
    
    it 'checkbox should be unchecked, and label equal to "Charts"', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked   ).to.be false
      expect( browser.query( '#checkbox label'                  ).innerHTML ).to.be 'Charts'
    
    it 'after checkbox check, checkbox set should be equal to { id: true }', ( done ) ->
      browser.check( '#checkbox input[type="checkbox"]' )
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: true } ]
    
    it 'checkbox should be checked', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked   ).to.be true
    
    it 'after checkbox_source clear and add { id: false }, checkbox set should be equal to { id: false } ', ( done ) ->
      browser.window.checkbox_source._notify [
        { action: 'clear' }
        { action: 'add' , objects: [ { id: false } ] }
      ]
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false } ]
    
    it 'checkbox element should not be checked', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked ).to.be false
    
    it 'checkbox element should be disabled', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).disabled ).to.be true
    
    it 'checkbox label should be equal to "Charts"', ->
      expect( browser.query( '#checkbox label' ).innerHTML ).to.be 'Charts'
  
  # ------------------------- Drop_Down() ----------------------------------------------------------------------------------
  
  describe 'Drop_Down():', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'drop_down set should be empty', ( done ) ->
      drop_down = browser.window.drop_down
      
      drop_down._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'drop_down element name attribute should be "drop_down" ( option "name" not provided )', ->
      expect( browser.query( '#drop_down select' ).name ).to.be 'drop_down'
    
    it 'after drop_down_source._add( 8 objects ), drop_down set should be equal to { id: 3, label: "France" }', ( done ) ->
      browser.window.drop_down_source._add [
        { id: 1, label: 'USA'        }
        { id: 2, label: 'Morocco'    }
        { id: 3, label: 'France'     }
        { id: 4, label: 'Japan'      }
        { id: 5, label: 'Spain'      }
        { id: 6, label: 'Portugal'   }
        { id: 8, label: 'Madagascar' }
      ]
      
      drop_down = browser.window.drop_down
      
      drop_down._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 3, label: 'France' } ]
      
    it 'drop_down element should contain 8 options element', ->
      expect( browser.query( '#drop_down select' ).length ).to.be 7
    
    it 'drop_down selectedindex should be 0', ->
      expect( browser.query( '#drop_down select' ).selectedIndex ).to.be 0
    
    it 'after drop_down_source._remove( 2 objects ), drop_down set should be equal to { id: 4, label: "Japan" }', ( done ) ->
      browser.window.drop_down_source._remove [
        { id: 3, label: 'France' }
        { id: 5, label: 'Spain'  }
      ]
      
      drop_down = browser.window.drop_down
      
      drop_down._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 4, label: 'Japan' } ]
    
    it 'drop_down element should contain 6 options element', ->
      expect( browser.query( '#drop_down select' ).length ).to.be 5
    
    ###
    it 'after drop_down_source._update( 3 objects ), drop_down set should be equal to { id: 8, label: "Madagascar" }', ( done ) ->
      browser.window.drop_down_source._update [
        [ { id: 6, label: 'Portugal'   }, { id: 5, label: 'Germany' } ]
        [ { id: 8, label: 'Madagascar' }, { id: 8, label: 'Madagascar', selected: true } ]
        [ { id: 4, label: 'Japan'      }, { id: 4, label: 'Italy' } ]
      ]
      
      drop_down = browser.window.drop_down
      
      drop_down._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 8, label: 'Madagascar' } ]
    ###
    
    it 'after select "Morocco", drop_down element should be equal to { id: 2, label: "Morocco" }', ( done ) ->
      browser.select( 'drop_down', 'Morocco' )
      
      drop_down = browser.window.drop_down
      
      drop_down._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 2, label: 'Morocco' } ]
    
    it 'drop_down selectedindex should be 2', ->
      expect( browser.query( '#drop_down select' ).selectedIndex ).to.be 2
  
  # ------------------------- Radio() ---------------------------------------------------------------------------------------
  
  describe 'Radio():', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'radio set should be empty', ( done ) ->
      radio = browser.window.radio
      
      radio._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'after radio_source._add( 6 objects ), radio set should be equal to [ { id: 1, label: "Islam", selected: true } ]', ( done ) ->
      browser.window.radio_source._add [
        { id: 1, label: "Islam"       , selected: true }
        { id: 2, label: "Christianity" }
        { id: 3, label: "Judaism"      }
        { id: 6, label: "Satanism"     }
        { id: 7, label: "Atheism"      }
        { id: 8, label: "Rastafari"    }
      ]
      
      radio = browser.window.radio
      
      radio._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 1, label: "Islam", selected: true } ]
    
    it 'radio container should contain 6 radio inputs', ->
      expect( browser.queryAll( '#radio input' ).length ).to.be 6
    
    it 'radio elements name should be "radio"', ->
      radios = browser.queryAll( '#radio input' )
      
      expect( radios[ 0 ].name ).to.be 'radio'
      expect( radios[ 1 ].name ).to.be 'radio'
      expect( radios[ 2 ].name ).to.be 'radio'
      expect( radios[ 3 ].name ).to.be 'radio'
      expect( radios[ 4 ].name ).to.be 'radio'
      expect( radios[ 5 ].name ).to.be 'radio'
    
    it 'radio with label "Islam" should be checked', ->
      expect( browser.queryAll( '#radio input' )[ 2 ].checked ).to.be true
    
    it 'after radio_source._remove( 2 objects ), expect radio set to be empty ( selected value is removed )', ( done ) ->
      browser.window.radio_source._remove [
        { id: 6, label: "Satanism" }
        { id: 1, label: "Islam", selected: true }
      ]
      
      radio = browser.window.radio
      
      radio._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'radio container should contain 4 radio inputs', ->
      expect( browser.queryAll( '#radio input' ).length ).to.be 4
    
    it 'no radio should be checked', ->
      expect( browser.query( '#radio input:checked' ) ).to.be null
    
    it 'after radio_source._add( { id: 5, label: "Hinduism", selected: true } ), radio set should be equal to { id: 5, label: "Hinduism", selected: true }', ( done ) ->
      browser.window.radio_source._add [ { id: 5, label: 'Hinduism', selected: true } ]
      
      radio = browser.window.radio
      
      radio._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 5, label: 'Hinduism', selected: true } ]
    
    it 'radio container should contain 6 radio inputs, and radio with label "Hinduism" should be checked', ->
      expect( browser.queryAll( '#radio input' ).length ).to.be 5
      expect( browser.queryAll( '#radio input' )[ 2 ].checked ).to.be true
    
    ###
    it 'after radio_source._update( 3 objects ), expect radio set to be equal to { id: 4, label: "Rastafari", selected: true }', ( done ) ->
      browser.window.radio_source._update [
        [ { id: 8, label: "Rastafari" }, { id: 4, label: "Rastafari", selected: true } ]
        [ { id: 5, label: "Hinduism"  }, { id: 5, label: "Buddhism" } ]
        [ { id: 7, label: "Atheism"   }, { id: 7, label: "Islam"    } ]
      ]
      
      radio = browser.window.radio
      
      radio._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 4, label: 'Rastafari', selected: true } ]
    ###
    
    it 'after "Christianity" radio check, radio set should be equal to  { id: 2, label: "Christianity"  }', ( done ) ->
      browser.choose( '#radio input[value="2"]' )
      
      radio = browser.window.radio
      
      radio._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: 2, label: 'Christianity'  } ]
    
    it 'radio with label "Christianity" should be checked', ->
      expect( browser.queryAll( '#radio input' )[ 1 ].checked ).to.be true
  
  # ------------------------- Checkbox_Group() ------------------------------------------------------------------------------
  
  describe 'Checkbox_Group()', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/xs_controls.html', done
    
    it 'checkbox_group set should be empty', ( done ) ->
      checkbox_group = browser.window.checkbox_group
      
      checkbox_group._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.empty()
    
    it 'after checkbox_group_source._add( objects ), checkbox_group set should be equal to result', ( done ) ->
      browser.window.checkbox_group_source._add [
        { id: 1, label: "Photography"            , selected: true }
        { id: 2, label: "Fishing"                                 }
        { id: 3, label: "Playing Computer Games"                  }
        { id: 4, label: "Traveling"              , selected: true }
        { id: 5, label: "Cooking"                                 }
        { id: 6, label: "Stamp / Coin Collection", selected: true }
      ]
      
      browser.window.checkbox_group._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, label: "Photography"            , selected: true }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
          { id: 4, label: "Traveling"              , selected: true }
        ]
    
    it 'checkbox_group container should contain 6 checkboxes', ->
      expect( browser.queryAll( '#checkbox_group input' ).length ).to.be 6
    
    it 'checkbox elements name should be "checkbox_group"', ->
      checkboxes = browser.queryAll( '#checkbox_group input' )
      
      expect( checkboxes[ 0 ].name ).to.be 'checkbox_group'
      expect( checkboxes[ 1 ].name ).to.be 'checkbox_group'
      expect( checkboxes[ 2 ].name ).to.be 'checkbox_group'
      expect( checkboxes[ 3 ].name ).to.be 'checkbox_group'
      expect( checkboxes[ 4 ].name ).to.be 'checkbox_group'
      expect( checkboxes[ 5 ].name ).to.be 'checkbox_group'
    
    it 'checkboxes with label "Photography", "Stamp / Coin Collection" and "Traveling" should be checked', ->
      expect( browser.queryAll( '#checkbox_group input' )[ 2 ].checked ).to.be true
      expect( browser.queryAll( '#checkbox_group input' )[ 4 ].checked ).to.be true
      expect( browser.queryAll( '#checkbox_group input' )[ 5 ].checked ).to.be true
    
    it 'after checkbox_group_source._remove( 2 objects ), checkbox_group set should be equal to result', ( done )->
      browser.window.checkbox_group_source._remove [
        { id: 3, label: "Playing Computer Games"                 }
        { id: 4, label: "Traveling"             , selected: true }
      ]
      
      browser.window.checkbox_group._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, label: "Photography"            , selected: true }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
        ]
    
    it 'checkbox_group container should contain 4 checkboxes', ->
      expect( browser.queryAll( '#checkbox_group input' ).length ).to.be 4
    
    it 'checkboxes with label "Photography" and "Stamp / Coin Collection" should be checked', ->
      expect( browser.queryAll( '#checkbox_group input' )[ 2 ].checked ).to.be true
      expect( browser.queryAll( '#checkbox_group input' )[ 3 ].checked ).to.be true
    
    ###
    it 'after checkbox_group_source._update( objects ), checkbox_group should be equal to result', ( done )->
      browser.window.checkbox_group_source._update [
        [ { id: 3, label: "Playing Computer Games"  }, { id: 3, label: "Playing Video Games"                   } ]
        [ { id: 7, label: "Pottery", selected: true }, { id: 7, label: "Pottery"             , selected: false } ]
        [ { id: 8, label: "Gardening"               }, { id: 8, label: "Gardening and Plants", selected: true  } ]
      ]
      
      browser.window.checkbox_group._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 8, label: "Gardening and Plants"   , selected: true }
          { id: 1, label: "Photography"            , selected: true }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
        ]
    ###
    ###
    it 'after "Cooking" check and "Stamp / Coin Collection" uncheck, checkbox_group set should be equal to result', ( done ) ->
      browser
        # .check  ( '#checkbox_group input[value="5"]' )
        .uncheck( '#checkbox_group input[value="6"]' )
      
      browser.window.checkbox_group._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          #{ id: 5, label: "Cooking"                     }
          { id: 1, label: "Photography", selected: true }
        ]
    
    it 'checkboxes with label "Photography" and "Cooking" should be checked', ->
      expect( browser.queryAll( '#checkbox_group input' )[ 0 ].checked ).to.be true
      expect( browser.queryAll( '#checkbox_group input' )[ 2 ].checked ).to.be true
    ###
    