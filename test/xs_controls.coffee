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

browser = new Browser()
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
    
    it 'after checkbox uncheck, checkbox element should be equal to { id: false }', ( done ) ->
      browser.uncheck( '#checkbox input[type="checkbox"]' )
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false, label: 'No Charts' } ]
    
    it 'checkbox should be unchecked, and label equal to "Charts"', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked   ).to.be false
      expect( browser.query( '#checkbox label'                  ).innerHTML ).to.be 'Charts'
    
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
    
    it 'drop_down selectedindex should be 1', ->
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
    
    
