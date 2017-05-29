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

javascript = this.rs && this.rs.RS || require '../../lib/util/javascript.js'

is_array = javascript.is_array

# ----------------------------------------------------------------------------------------------
# javascript test suite
# ---------------------

describe 'javascript.is_array', ->
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
