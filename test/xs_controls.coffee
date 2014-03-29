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
    
    it 'checkbox should be empty', ( done ) ->
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
      expect( browser.query( '#checkbox label' ).innerHTML ).to.be "Charts"
    
    it 'after checkbox_source._add( { id: false, label: "No Charts" } ), checkbox set should be equal to { id: false, label: "No Charts" }', ( done ) ->
      browser.window.checkbox_source._add [ { id: false, label: "No Charts" } ]
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false, label: "No Charts" } ]
    
    it 'checkbox element should not be checked, and label equal to "Charts"', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked   ).to.be false
      expect( browser.query( '#checkbox label'                  ).innerHTML ).to.be "Charts"
    
    it 'checkbox element should not be disabled', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).disabled ).to.be false
    
    it 'after checkbox uncheck, checkbox element should be equal to { id: false }', ( done ) ->
      browser.uncheck( '#checkbox input[type="checkbox"]' )
      
      checkbox = browser.window.checkbox
      
      checkbox._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [ { id: false, label: "No Charts" } ]
    
    it 'checkbox should be unchecked, and label equal to "Charts"', ->
      expect( browser.query( '#checkbox input[type="checkbox"]' ).checked   ).to.be false
      expect( browser.query( '#checkbox label'                  ).innerHTML ).to.be "Charts"
    
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
      expect( browser.query( '#checkbox label' ).innerHTML ).to.be "Charts"
    