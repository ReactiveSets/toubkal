###
    javascript.coffee

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

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check

javascript = '../../lib/util/javascript'

if this.rs
  # using undefine
  require [ javascript ], ( js ) -> javascript = js

else
  # under node
  javascript = require javascript

is_array  = javascript.is_array
is_object = javascript.is_object
is_date   = javascript.is_date
next_tick = javascript.next_tick

# ----------------------------------------------------------------------------------------------
# javascript test suite
# ---------------------

describe 'javascript.is_object()', ->
  it 'should return true for an empty Object', ->
    expect( is_object( {} ) ).to.be true
  
  it 'should return true for an Object with one property', ->
    expect( is_object( { a: false } ) ).to.be true
  
  it 'should return false for undefined', ->
    expect( is_object( undefined ) ).to.be false
  
  it 'should return false for null', ->
    expect( is_object( null ) ).to.be false
  
  it 'should return false for boolean value true', ->
    expect( is_object( true ) ).to.be false
  
  it 'should return false for number 1', ->
    expect( is_object( 1 ) ).to.be false
  
  it 'should return false for an empty Array', ->
    expect( is_object( [] ) ).to.be false
  
  it 'should return false for an Array of two values', ->
    expect( is_object( [ 1, "test" ] ) ).to.be false

describe 'javascript.is_array()', ->
  it 'should return false for undefined', ->
    expect( is_array( undefined ) ).to.be false
  
  it 'should return false for null', ->
    expect( is_array( null ) ).to.be false
  
  it 'should return false for boolean value true', ->
    expect( is_array( true ) ).to.be false
  
  it 'should return false for number 1', ->
    expect( is_array( 1 ) ).to.be false
  
  it 'should return false for an Object', ->
    expect( is_array( {} ) ).to.be false
  
  it 'should return true for an empty Array', ->
    expect( is_array( [] ) ).to.be true
  
  it 'should return true for an Array of two values', ->
    expect( is_array( [ 1, "test" ] ) ).to.be true

describe 'javascript.is_date()', ->
  it 'should return false for undefined', ->
    expect( is_date( undefined ) ).to.be false

  it 'should return false for null', ->
    expect( is_date( null ) ).to.be false
  
  it 'should return false for boolean value true', ->
    expect( is_date( true ) ).to.be false
  
  it 'should return false for number 1', ->
    expect( is_date( 1 ) ).to.be false
  
  it 'should return false for an Object', ->
    expect( is_date( {} ) ).to.be false
  
  it 'should return false for an empty Array', ->
    expect( is_date( [] ) ).to.be false
  
  it 'should return true for a Date', ->
    expect( is_date( new Date() ) ).to.be true

describe 'javascript.next_tick()', ->
  it 'should call function asynchronously', ( done ) ->
    next_tick -> check done, ->
