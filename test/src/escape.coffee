###
    Copyright (c) 2013-2019, Reactive Sets

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

escape = require '../../lib/util/escape.js'

# ----------------------------------------------------------------------------------------------
# escape() test suite
# -------------------

describe 'escape():', ->
  it 'should throw if called without parameters', ->
    expect( () -> escape() ).to.throwException()
  
  it 'should throw if called with non-string first parameter', ->
    expect( () -> escape( {} )( '' ) ).to.throwException()
  
  it 'should throw if called with non-string second parameter', ->
    expect( () -> escape( '' )( {} ) ).to.throwException()
  
  it 'should escape a string', ->
    expect( escape( '"' )( 'this is \\ a "string to quote"' ) ).to.be.eql 'this is \\\\ a \\"string to quote\\"'
