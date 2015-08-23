###
    subclass.coffee

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

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------
subclass = this.rs && this.rs.RS.subclass

unless subclass?
  subclass = require '../../lib/util/subclass.js'

# ----------------------------------------------------------------------------------------------
# subclass test suite
# -------------------

describe 'subclass():', ->
  it 'subclass() should be a function', ->
    expect( subclass ).to.be.a 'function'
  
  Animal = ( name ) -> @name = name
  
  a = new Animal 'Sam'
  
  it 'a should be an instance of Animal', ->
    expect( a ).to.be.an Animal
    
  Snake = ( name ) ->
  
  subclass( Animal, Snake );
  
  s = new Snake( "Barry the Snake" )
  
  it 's should be an instance of Snake', ->
    expect( s ).to.be.a Snake
  
  it 's should be an instance of Animal', ->
    expect( s ).to.be.an Animal
  
  it 'a should not be an instance of Snake', ->
    expect( a ).to.not.be.a Snake
