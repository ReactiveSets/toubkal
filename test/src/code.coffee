###
    code.coffee

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

Code = this.rs && this.rs.RS.Code || require '../../lib/util/code.js'

# ----------------------------------------------------------------------------------------------
# Code test suite
# ---------------

describe 'Code():', ->
  f = code = new Code( 'Code Test' )
    ._function( 'f', null, [] )
      .add( 'var i' )
      ._for( 'i = -1', ' ++i < 10' )
      .end()
      .add( 'return i' )
    .end()
    .get()
  
  eval code
  
  i = f()
  
  it 'f should be a function', ->
    expect( f ).to.be.a 'function'
  
  it 'i should be equal to 10', ->
    expect( i ).to.be.eql 10
  
  test = 'a[ ++i ] === n'
  
  g = code = new Code( 'Test unfolded while' )
    ._function( 'g', null, [ 'n' ] )
      ._var( [ 'a = [ 34, 65, 98, 8, 52, 10, 21, 13, 1, 90, 14 ]', 'l = a.length', 'i = -1' ] )
      .unrolled_while( 'if ( ' + test, '|| ' + test, ') return i' )
      .add( 'return -1' )
    .end( '' )
    .get()
  ;
  
  eval code
  
  it 'the index of 34 should be 0', ->
    expect( g( 34 ) ).to.be.eql 0

  it 'the index of 52 should be 4', ->
    expect( g( 52 ) ).to.be.eql 4

  it 'the index of 90 should be 9', ->
    expect( g( 90 ) ).to.be.eql 9

  it 'the index of 1 should be 8', ->
    expect( g( 1 ) ).to.be.eql 8
