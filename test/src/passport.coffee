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
  describe 'Unautheticated', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/test/automated/rs_passport.html', done
      
    it 'body element should have an "a" element, with ID equal to "test-strategy"', ->
      expect( browser.queryAll( '#sign-in a#test-strategy' ).length ).to.be 1
    
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
  
  describe 'Auhtenticated', ->
    before ( done ) ->
      browser.visit 'http://localhost:8080/passport/test-strategy/callback', ->
        browser.visit 'http://localhost:8080/test/automated/rs_passport.html', done
      
    it 'body element should have an "a" element, with ID equal to "logout"', ->
      expect( browser.queryAll( '#profile a#logout' ).length ).to.be 1
    
    it 'user profile should be equal to result', ( done ) ->
      browser.window.profile._fetch_all ( values ) -> check done, ->
        value = values[ 0 ]
        
        expect( value.flow          ).to.be.eql 'user_profile'
        expect( value.provider_name ).to.be.eql 'test-strategy'
        expect( value.provider_id   ).to.be.eql '007'
        expect( value.name          ).to.be.eql 'Khalifa Nassik'
        expect( value.photo         ).to.be.eql 'https://lh5.googleusercontent.com/-jebMPOHkFlU/AAAAAAAAAAI/AAAAAAAAAGU/AFElBGJysOE/photo.jpg?sz=50'
        expect( value.emails        ).to.be.eql [
          {
            value: 'knassik@gmail.com',
            type: 'account'
          }
        ]
