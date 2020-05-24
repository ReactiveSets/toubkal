###
    passport.coffee

    Copyright (c) 2013-2020, Reactive Sets

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
# ----------------------------------------------------------------------------------------------

Browser = require( 'zombie' )
utils   = require( './tests_utils.js' )

browser = new Browser( { silent: true } )
expect  = this.expect || utils.expect
check   = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# Passport unit test suite
# ----------------------------------------------------------------------------------------------

describe 'Passport Test Suite', ->
  before ( done ) ->
    browser.visit 'http://localhost:8080/test/automated/rs_passport.html', done
    
  it 'body element should have a "div" element, with ID equal to "social-signin"', ->
    expect( browser.queryAll( '#social-signin' ).length ).to.be 1
  
  it 'user profile should be empty', ( done ) ->
    browser.window.profile._fetch_all ( values ) -> check done, ->
      expect( values ).to.be.empty()
  
  it 'providers should be equal to result', ( done ) ->
    browser.window.providers._fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          flow: 'providers',
          href: '/passport/test-strategy',
          icon: 'test-strategy',
          id: 'test-strategy',
          label: 'Test Strategy',
          name: 'test-strategy',
          order: 1
        }
      ]
