###
    url_pattern.coffee

    Copyright (C) 2013-2015, Reactive Sets

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
  require '../../lib/client/url_pattern.js'

# ----------------------------------------------------------------------------------------------
# Test HTML_Parse()
# -----------------

source = rs.last()

describe 'url_pattern():', ->
  
  describe 'url_pattern() invalid parameters:', ->
    it 'should throw if attribute is not defined', ->
      f = -> source.url_pattern( null, '/api/users/:id' )
      
      expect( f ).to.throwException()
    
    it 'should throw if pattern is not defined', ->
      f = -> source.url_pattern( 'content' )
      
      expect( f ).to.throwException()
    
    it 'should throw if pattern is an Array, and the first element is not a RegExp', ->
      f = -> source.url_pattern( 'content', [ '/api/users/:id' ] )
      
      expect( f ).to.throwException()
    
  describe 'url_pattern( content, /api/users/:id ):', ->
    output = source.url_pattern( 'content', '/api/users/:id' )
    
    it '/api/products/5 should be empty', ( done ) ->
      source._add [ { content: '/api/products/5' } ]
      
      output._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.empty
    
    it '/api/users/10 should extract { id: 10 }', ( done ) ->
      source._add [ { content: '/api/users/10' } ]
      
      output._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { content: '/api/users/10', id: '10' }
        ]
    
  describe 'url_pattern( content, [ /^\/api\/([^\/]+)(?:\/(\d+))?$/, resource, id ] ):', ->
    output = source.url_pattern( 'content', [ /^\/api\/([^\/]+)(?:\/(\d+))?$/, 'resource', 'id' ] )
    
    it '/apiiii/users/10 should be empty', ( done ) ->
      source._add [ { content: '/apiiii/users/10' } ]
      
      output._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.empty
    
    it '/api/users/10 should extract { resource: users, id: 10 }', ( done ) ->
      source._add [ { content: '/api/users/10' } ]
      
      output._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { content: '/api/users/10', resource: 'users', id: '10' }
        ]
    
