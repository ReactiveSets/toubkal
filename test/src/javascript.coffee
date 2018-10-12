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

class_of    = javascript.class_of
is_class    = javascript.is_class

is_array    = javascript.is_array
is_object   = javascript.is_object
is_date     = javascript.is_date
is_string   = javascript.is_string
is_function = javascript.is_function
is_number   = javascript.is_number
is_regexp   = javascript.is_regexp

next_tick   = javascript.next_tick

# ----------------------------------------------------------------------------------------------
# javascript test suite
# ---------------------

describe 'javascript.class_of( value )', ->
  it 'should return "Undefined" with no value', ->
    expect( class_of() ).to.be.eql "Undefined"
  
  it 'should return "Undefined" for undefined', ->
    expect( class_of( undefined ) ).to.be.eql "Undefined"
  
  it 'should return "Null" for null', ->
    expect( class_of( null ) ).to.be.eql "Null"
  
  it 'should return "Number" for 0', ->
    expect( class_of( 0 ) ).to.be.eql "Number"
  
  it 'should return "Number" for Infinity', ->
    expect( class_of( Infinity ) ).to.be.eql "Number"
  
  it 'should return "Number" for NaN', ->
    expect( class_of( NaN ) ).to.be.eql "Number"
  
  it 'should return "String" for ""', ->
    expect( class_of( "" ) ).to.be.eql "String"
  
  it 'should return "Object" for {}', ->
    expect( class_of( {} ) ).to.be.eql "Object"
  
  it 'should return "Array" for []', ->
    expect( class_of( [] ) ).to.be.eql "Array"
  
  it 'should return "Error" for new Error()', ->
    expect( class_of( new Error() ) ).to.be.eql "Error"
  
  it 'should return "Date" for new Date()', ->
    expect( class_of( new Date() ) ).to.be.eql "Date"
  
  it 'should return "RegExp" for /test/', ->
    expect( class_of( /test/ ) ).to.be.eql "RegExp"

describe 'javascript.is_class( _class )( value )', ->
  it 'should return true for is_class( "Object" )( {} ) ', ->
    expect( is_class( 'Object' )( {} ) ).to.be true
  
  it 'should return false for is_class( "Object" )( null ) ', ->
    expect( is_class( 'Object' )( null ) ).to.be false
  
  it 'should return true for is_class( "Null" )( null ) ', ->
    expect( is_class( 'Null' )( null ) ).to.be true

describe 'javascript.is_object( value )', ->
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

describe 'javascript.is_array( value )', ->
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

describe 'javascript.is_date( value )', ->
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

describe 'javascript.is_string( value )', ->
  it 'should return true for literal empty string', ->
    expect( is_string( '' ) ).to.be true
  
  it 'should return true for literal "hello" string', ->
    expect( is_string( 'hello' ) ).to.be true
  
  it 'should return true for String Object "hello"', ->
    expect( is_string( new String( 'hello' ) ) ).to.be true
  
  it 'should return false for undefined', ->
    expect( is_string( undefined ) ).to.be false
  
  it 'should return false for null', ->
    expect( is_string( null ) ).to.be false
  
  it 'should return false for boolean value true', ->
    expect( is_string( true ) ).to.be false
  
  it 'should return false for number 1', ->
    expect( is_string( 1 ) ).to.be false
  
  it 'should return false for an Object', ->
    expect( is_string( {} ) ).to.be false

describe 'javascript.is_function( value )', ->
  it 'should return true for a function', ->
    expect( is_function( () -> ) ).to.be true
  
  it 'should return false for undefined', ->
    expect( is_function( undefined ) ).to.be false
  
  it 'should return false for null', ->
    expect( is_function( null ) ).to.be false
  
  it 'should return false for boolean value true', ->
    expect( is_function( true ) ).to.be false
  
  it 'should return false for an Object', ->
    expect( is_function( {} ) ).to.be false

describe 'javascript.is_number( value )', ->
  it 'should return true for literal number 0', ->
    expect( is_number( 0 ) ).to.be true
  
  it 'should return true for literal number 1', ->
    expect( is_number( 1 ) ).to.be true
  
  it 'should return true for Object Number 0', ->
    expect( is_number( new Number( 0 ) ) ).to.be true
  
  it 'should return false for string literal "1"', ->
    expect( is_number( "1" ) ).to.be false
  
  it 'should return false for undefined', ->
    expect( is_number( undefined ) ).to.be false
  
  it 'should return false for null', ->
    expect( is_number( null ) ).to.be false
  
  it 'should return false for boolean value true', ->
    expect( is_number( true ) ).to.be false
  
  it 'should return false for an Object', ->
    expect( is_number( {} ) ).to.be false

describe 'javascript.is_regexp( value )', ->
  it 'should return true for literal regular expression /test/', ->
    expect( is_regexp( /test/ ) ).to.be true
  
  it 'should return false for number 1', ->
    expect( is_regexp( 1 ) ).to.be false
  
  it 'should return false for undefined', ->
    expect( is_regexp() ).to.be false
  
  it 'should return false for null', ->
    expect( is_regexp( null ) ).to.be false
  
  it 'should return false for Object {}', ->
    expect( is_regexp( {} ) ).to.be false

describe 'javascript.next_tick()', ->
  it 'should call function asynchronously', ( done ) ->
    next_tick -> check done, ->
