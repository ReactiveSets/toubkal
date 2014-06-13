###
    xs_url_tests.coffee

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

browser = new Browser( { debug: true } )
expect  = this.expect || utils.expect
check   = this.check  || utils.check
xs      = this.xs     || utils.xs
that    = this

# ----------------------------------------------------------------------------------------------
# xs URL unit test suite
# ----------------------------------------------------------------------------------------------

describe 'URL Test', ->
  before ( done ) ->
    browser.visit 'http://localhost:8080/test/xs_ui.html', done
  
  it '', ( done ) ->
    url = browser.window.url_with_no_options
    
    url._fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [ {
        href    : 'http://localhost:8080/test/xs_ui.html'
        slashes : true
        protocol: 'http:'
        host    : 'localhost:8080'
        hostname: 'localhost'
        port    : '8080'
        pathname: '/test/xs_ui.html'
      } ]
