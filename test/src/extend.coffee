###
    extend.coffee

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

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------
extend = this.rs && this.rs.RS.extend || require '../../lib/util/extend.js'

clone = extend.clone

# ----------------------------------------------------------------------------------------------
# extend test suite
# -----------------

describe 'extend', ->
  describe 'extend()', ->
    it 'should be a function', ->
      expect( extend ).to.be.a 'function'
    
    o1 = 
      id: 1
      name: 'khalifa'
    
    o2 = 
      email: 'knassik@gmail.com'
    
    o3 =
      country: 'Morocco'
      name: 'khalifa nassik'
      email: 'khalifan@gmail.com'

    _o1 = clone o1
    _o2 = clone o2
    _o3 = clone o3

    result = undefined
    
    it 'should be identity, i.e. extend( object ) should be strictly equal to object', ->
      result = extend o1
      
      expect( result ).to.be o1
    
    it 'should modify o1 in extend( o1, o2 )', ->
      result = extend o1, o2
      
      expect( o1 ).to.be.eql( { id: 1, name: 'khalifa', email: 'knassik@gmail.com' } )

    it 'should return o1', ->
      expect( result ).to.be o1
    
    it 'should not modify o2', ->
      expect( o2 ).to.be.eql _o2
    
    it 'should modify o1 after extend( o1, o2, o3 )', ->
      o1 = clone _o1 # restore o1 original value

      result = extend o1, o2, o3
      
      expect( o1 ).to.be.eql( { id: 1, name: 'khalifa nassik', email: 'khalifan@gmail.com', country: 'Morocco' } ) and
      expect( result ).to.be o1
    
    it 'should not have modified o2', ->
      expect( o2 ).to.be.eql _o2

    it 'should not have modified o3', ->
      expect( o3 ).to.be.eql _o3

    it 'should return {} in extend( null )', ->
      expect( extend( null ) ).to.be.eql {}

    it 'should return {} in extend( undefined )', ->
      expect( extend( undefined ) ).to.be.eql {}

    it 'should return {} in extend( null, null )', ->
      expect( extend( null, null ) ).to.be.eql {}

    it 'should return {} in extend( undefined, undefined )', ->
      expect( extend( undefined, undefined ) ).to.be.eql {}

    it 'should return o3 clone in extend( null, null, null, o3, null )', ->
      result = extend null, null, null, o3, null
      
      expect( result ).to.be.eql( o3 ) and expect( result ).to.not.be o3

    it 'should return o3 clone in extend( undefined, undefined, undefined, o3, undefined )', ->
      result = extend( undefined, undefined, undefined, o3, undefined )

      expect( result ).to.be.eql( o3 ) and expect( result ).to.not.be o3

  describe 'extend_2():', ->
    extend_2 = extend._2
    
    it 'should be a function', ->
      expect( extend_2 ).to.be.a 'function'

    it 'should not be extend()', ->
      expect( extend_2 ).to.not.be extend
    
    o1 = 
      id: 1
      name: 'khalifa'
    
    o2 = 
      email: 'knassik@gmail.com'
    
    _o1 = clone o1
    _o2 = clone o2

    result = undefined
    
    it 'should be identity, i.e. extend_2( object ) should be strictly equal to object', ->
      result = extend_2 o1
      
      expect( result ).to.be o1
    
    it 'should modify o1 in extend_2( o1, o2 )', ->
      result = extend_2 o1, o2
      
      expect( o1 ).to.be.eql( { id: 1, name: 'khalifa', email: 'knassik@gmail.com' } )

    it 'should return o1', ->
      expect( result ).to.be o1
    
    it 'should not modify o2', ->
      expect( o2 ).to.be.eql _o2
    
    it 'should return object in extend_2( object, null )', ->
      expect( extend_2( o2, null ) ).to.be o2

    it 'should return object in extend_2( object, undefined )', ->
      expect( extend_2( o2, undefined ) ).to.be o2

    it 'should return null in extend_2( null )', ->
      expect( extend_2( null ) ).to.be null

    it 'should return undefined in extend_2( undefined )', ->
      expect( extend_2( undefined ) ).to.be undefined

    it 'should return null in extend_2( null, null )', ->
      expect( extend_2( null, null ) ).to.be null

    it 'should return undefined in extend_2( undefined, undefined )', ->
      expect( extend_2( undefined, undefined ) ).to.be undefined

    it 'should return null in extend_2( null, undefined )', ->
      expect( extend_2( null, undefined ) ).to.be null

    it 'should return undefined in extend_2( undefined, null )', ->
      expect( extend_2( undefined, null ) ).to.be undefined

    it 'should throw in extend_2( null, o2 )', ->
      f = -> extend_2 null, o2

      expect( f ).to.throwException()

    it 'should throw in extend_2( undefined, o2 )', ->
      f = -> extend_2 undefined, o2

      expect( f ).to.throwException()
