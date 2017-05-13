###
    object_diff.coffee

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

utils = require( './tests_utils.js' ) unless this.expect?

expect = this.expect || utils.expect
check  = this.check  || utils.check
rs     = this.rs     || utils.rs

object_diff = rs && rs.RS.object_diff || require '../../lib/util/object_diff.js'

result = null

diff = ( a, b ) ->
  result = []
  object_diff a, b, set, remove

set = ( property, added, removed ) ->
  result.push [ 'set', property, added, removed ]

remove = ( property, removed ) ->
  result.push [ 'remove', property, removed ]

# ----------------------------------------------------------------------------------------------
# object_diff test suite
# ----------------------

describe 'Walking though differences using object_diff()', ->
  it 'should allow to add all attributes, when removed is undefined', ->
    diff undefined, { a: 1, c: 1, d: 2 }
    
    expect( result ).to.be.eql [
      [ "set", "a", 1, undefined ]
      [ "set", "c", 1, undefined ]
      [ "set", "d", 2, undefined ]
    ]
  
  it 'should remove all attributes if added is undefined', ->
    diff { a: 1, b: 1, d: 1 }
    
    expect( result ).to.be.eql [
      [ "remove", "a", 1 ]
      [ "remove", "b", 1 ]
      [ "remove", "d", 1 ]
    ]
  
  it 'should allow to remove and set attributes', ->
    diff { a: 1, b: 1, d: 1 }, { a: 1, c: 1, d: 2 }
    
    expect( result ).to.be.eql [
      [ "remove", "b", 1 ]
      [ "set", "c", 1, undefined ]
      [ "set", "d", 2, 1 ]
    ]
  
  it 'should allow to set attributes if remove function is undefined', ->
    remove = undefined
    
    diff { a: 1, b: 1, d: 1 }, { a: 1, c: 1, d: 2 }
    
    expect( result ).to.be.eql [
      [ "set", "c", 1, undefined ]
      [ "set", "d", 2, 1 ]
    ]
  
  it 'should allow to set attributes if remove function is undefined', ->
    set = undefined
    
    diff { a: 1, b: 1, d: 1 }, { a: 1, c: 1, d: 2 }
    
    expect( result ).to.be.eql []
