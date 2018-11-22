###
    url.coffee

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

utils  = require( './tests_utils.js' ) unless this.expect?

expect = this.expect || utils.expect
check  = this.check  || utils.check
rs     = this.rs     || utils.rs

unless rs.url_pattern?
  require '../../lib/server/url_parse.js'
  require '../../lib/server/url_pattern.js'

# ----------------------------------------------------------------------------------------------
# URL Tests
# ---------

source = rs.last()

describe 'url', ->
  describe 'url_parse()', ->
    it 'should parse http://localhost:8080/test/automated/rs_url.html', ->
      url = rs
        
        .set( [ { id: 1, _v: 0, url: 'http://localhost:8080/test/automated/rs_url.html' } ] )
        
        .url_parse()
      ;
      
      url._fetch_all ( values ) ->
        expect( values ).to.be.eql [ {
          id      : 1
          _v      : 0
          url     : 'http://localhost:8080/test/automated/rs_url.html'
          slashes : true
          protocol: 'http:'
          host    : 'localhost:8080'
          hostname: 'localhost'
          port    : '8080'
          pathname: '/test/automated/rs_url.html'
        } ]
  
  describe 'url_pattern()', ->
    describe 'url_pattern() invalid parameters:', ->
      it 'should throw if pattern is not defined', ->
        f = -> source.url_pattern()
        
        expect( f ).to.throwException()
      
      it 'should throw if pattern is an Array, and the first element is not a RegExp', ->
        f = -> source.url_pattern( [ '/api/users/:id' ] )
        
        expect( f ).to.throwException()
    
    describe 'url_pattern( "/api/users/:id", { attribute: "content" } ):', ->
      output = source.url_pattern( '/api/users/:id', { attribute: "content" } )
      
      it 'source "/api/products/5" should yield an empty Object', ( done ) ->
        source._add [ { content: '/api/products/5' } ]
        
        output._fetch_all ( values ) -> check done, () ->
          expect( values[ 0 ] ).to.be.empty()
      
      it 'source "/api/users/10" should yield { id: 10 }', ( done ) ->
        source._add [ { content: '/api/users/10' } ]
        
        output._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { content: '/api/users/10', id: '10' }
          ]
    
    describe 'url_pattern( [ /^\/api\/([^\/]+)(?:\/(\d+))?$/, resource, id ], { attribute: "content" } ):', ->
      output = source.url_pattern( [ /^\/api\/([^\/]+)(?:\/(\d+))?$/, 'resource', 'id' ], { attribute: "content" } )
      
      it 'source "/apiiii/users/10" should be empty', ( done ) ->
        source._add [ { content: '/apiiii/users/10' } ]
        
        output._fetch_all ( values ) -> check done, () ->
          expect( values[ 0 ] ).to.be.empty()
      
      it 'source "/api/users/10" should extract { resource: users, id: 10 }', ( done ) ->
        source._add [ { content: '/api/users/10' } ]
        
        output._fetch_all ( values ) -> check done, () ->
          expect( values ).to.be.eql [
            { content: '/api/users/10', resource: 'users', id: '10' }
          ]
