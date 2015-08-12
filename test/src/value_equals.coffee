###
    value_equals.coffee

    Copyright (C) 2013, 2015, Reactive Sets

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

# ----------------------------------------------------------------------------------------------
# Require tested module
# ---------------------
value_equals = require '../../lib/util/value_equals.js'

# ----------------------------------------------------------------------------------------------
# value_equals test suite
# -----------------------

describe 'Comparing values using value_equals()', ->
  describe 'undefined', ->
    it 'undefined should equal undefined', ->
      expect( value_equals( undefined, undefined ) ).to.be true
      
    it 'undefined should not equal null', ->
      expect( value_equals( undefined, null ) ).to.be false
      
    it 'undefined should not equal 0', ->
      expect( value_equals( undefined, 0 ) ).to.be false
      
    it 'undefined should not equal ""', ->
      expect( value_equals( undefined, '' ) ).to.be false
      
    it 'undefined should not equal false', ->
      expect( value_equals( undefined, false ) ).to.be false
      
  describe 'null', ->
    it 'null should equal null', ->
      expect( value_equals( null, null ) ).to.be true
      
    it 'null should not equal undefined', ->
      expect( value_equals( null, undefined ) ).to.be false
      
    it 'null should not equal 0', ->
      expect( value_equals( null, 0 ) ).to.be false
      
    it 'null should not equal ""', ->
      expect( value_equals( null, '' ) ).to.be false
      
    it 'null should not equal false', ->
      expect( value_equals( null, false ) ).to.be false
      
  describe 'Numbers', ->
    describe 'NaN', ->
      it 'NaN should equal NaN', ->
        expect( value_equals( NaN, NaN ) ).to.be true
        
      it 'new Number( NaN ) should equal new Number( NaN )', ->
        expect( value_equals( new Number( NaN ), new Number( NaN ) ) ).to.be true
        
      it 'NaN should equal new Number( NaN )', ->
        expect( value_equals( NaN, new Number( NaN ) ) ).to.be true
        
      it 'NaN should not equal 0', ->
        expect( value_equals( NaN, 0 ) ).to.be false
        
      it 'NaN should not equal undefined', ->
        expect( value_equals( NaN, undefined ) ).to.be false
        
    describe '0 and -0', ->
      it '0 should equal 0', ->
        expect( value_equals( 0, 0 ) ).to.be true
        
      it '0 should not equal -0', ->
        expect( value_equals( 0, -0 ) ).to.be false
        
      it '-0 should equal -0', ->
        expect( value_equals( -0, -0 ) ).to.be true
        
      it 'new Number( 0 ) should equal new Number( 0 )', ->
        expect( value_equals( new Number( 0 ), new Number( 0 ) ) ).to.be true
        
      it 'new Number( -0 ) should equal new Number( -0 )', ->
        expect( value_equals( new Number( -0 ), new Number( -0 ) ) ).to.be true
        
      it 'new Number( 0 ) should not equal new Number( -0 )', ->
        expect( value_equals( new Number( 0 ), new Number( -0 ) ) ).to.be false
        
      it '0 should equal new Number( 0 )', ->
        expect( value_equals( 0, new Number( 0 ) ) ).to.be true
        
      it '0 should not equal new Number( -0 )', ->
        expect( value_equals( 0, new Number( -0 ) ) ).to.be false
        
      it '0 should not equal new Number( -0 )', ->
        expect( value_equals( 0, new Number( -0 ) ) ).to.be false
        
      it '0 should not equal 1', ->
        expect( value_equals( 0, 1 ) ).to.be false
        
      it '0 should not equal "0"', ->
        expect( value_equals( 0, "0" ) ).to.be false
        
      it '0 should not equal ""', ->
        expect( value_equals( 0, "" ) ).to.be false
        
      it '0 should not equal false', ->
        expect( value_equals( 0, false ) ).to.be false
        
    describe 'Infinity and -Infinity', ->
      it 'Infinity should equal Infinity', ->
        expect( value_equals( Infinity, Infinity ) ).to.be true
        
      it 'Infinity should equal new Number( Infinity )', ->
        expect( value_equals( Infinity, new Number( Infinity ) ) ).to.be true
        
      it 'new Number( Infinity = should equal new Number( Infinity )', ->
        expect( value_equals( new Number( Infinity ), new Number( Infinity ) ) ).to.be true
        
      it '-Infinity should equal -Infinity', ->
        expect( value_equals( -Infinity, -Infinity ) ).to.be true
        
      it '-Infinity should not equal Infinity', ->
        expect( value_equals( -Infinity, Infinity ) ).to.be false
        
    describe 'Other numbers', ->
      it '1 should equal 1', ->
        expect( value_equals( 1, 1 ) ).to.be true
        
      it 'new Number( 1 ) should equal new Number( 1 )', ->
        expect( value_equals( new Number( 1 ), new Number( 1 ) ) ).to.be true
        
      it '1 should equal new Number( 1 )', ->
        expect( value_equals( 1, new Number( 1 ) ) ).to.be true
        
      it '1 should not equal "1"', ->
        expect( value_equals( 1, "1" ) ).to.be false
        
      it '1 should not equal true', ->
        expect( value_equals( 1, true ) ).to.be false
        
  describe 'Strings', ->
    it '"" should equal ""', ->
      expect( value_equals( "", "" ) ).to.be true
      
    it 'new String( "" ) should equal new String( "" )', ->
      expect( value_equals( new String( "" ), new String( "" ) ) ).to.be true
      
    it '"" should equal new String( "" )', ->
      expect( value_equals( "", new String( "" ) ) ).to.be true
      
    it '"test" should equal "test"', ->
      expect( value_equals( "test", "test" ) ).to.be true
      
    it 'new String( "test" ) should equal new String( "test" )', ->
      expect( value_equals( new String( "test" ), new String( "test" ) ) ).to.be true
      
    it '"test" should equal new String( "test" )', ->
      expect( value_equals( "test", new String( "test" ) ) ).to.be true
      
    it '"" should not equal "test"', ->
      expect( value_equals( "", "test" ) ).to.be false
      
    it '"test" should not equal "TEST"', ->
      expect( value_equals( "test", "TEST" ) ).to.be false
      
  describe 'Booleans', ->
    it 'true should equal true', ->
      expect( value_equals( true, true ) ).to.be true
      
    it 'true should equal new Boolean( true )', ->
      expect( value_equals( true, new Boolean( true ) ) ).to.be true
      
    it 'new Boolean( true ) should equal new Boolean( true )', ->
      expect( value_equals( new Boolean( true ), new Boolean( true ) ) ).to.be true
      
    it 'true should not equal false', ->
      expect( value_equals( true, false ) ).to.be false
      
    it 'false should equal false', ->
      expect( value_equals( false, false ) ).to.be true
      
    it 'false should equal new Boolean( false )', ->
      expect( value_equals( false, new Boolean( false ) ) ).to.be true
      
    it 'new Boolean( false ) should equal new Boolean( false )', ->
      expect( value_equals( new Boolean( false ), new Boolean( false ) ) ).to.be true
      
    it 'false should not equal 0', ->
      expect( value_equals( false, 0 ) ).to.be false
      
    it 'false should not equal ""', ->
      expect( value_equals( false, '' ) ).to.be false
      
    it 'false should not equal null', ->
      expect( value_equals( false, null ) ).to.be false
      
  describe 'Regular Expressions', ->
    it '/./ should equal /./', ->
      expect( value_equals( /./, /./ ) ).to.be true
      
    it '/./ should equal new RegExp( "." )', ->
      expect( value_equals( /./, new RegExp( '.' ) ) ).to.be true
      
    it '/./ should not equal /test/', ->
      expect( value_equals( /./, /test/ ) ).to.be false
      
    it '/test/ should not equal /test/i', ->
      expect( value_equals( /test/, /test/i ) ).to.be false
      
    it '/test/i should not equal /test/i', ->
      expect( value_equals( /test/i, /test/i ) ).to.be true
      
    it '/test/ should not equal /test/g', ->
      expect( value_equals( /test/, /test/g ) ).to.be false
      
    it '/test/g should not equal /test/g', ->
      expect( value_equals( /test/g, /test/g ) ).to.be true
      
    it '/test/ should not equal /test/m', ->
      expect( value_equals( /test/, /test/m ) ).to.be false
      
    it '/test/m should not equal /test/m', ->
      expect( value_equals( /test/m, /test/m ) ).to.be true
      
  describe 'Arrays', ->
    it '[] should equal []', ->
      expect( value_equals( [], [] ) ).to.be true
      
    it '[] should not equal [ 1 ]', ->
      expect( value_equals( [], [ 1 ] ) ).to.be.fasle
      
    it '[ 2 ] should equal [ 2 ]', ->
      expect( value_equals( [ 2 ], [ 2 ] ) ).to.be true
      
    it '[ 2 ] should not equal [ 1 ]', ->
      expect( value_equals( [ 2 ], [ 1 ] ) ).to.be false
      
    it '[ 2, [] ] should equal [ 2, [] ]', ->
      expect( value_equals( [ 2, [] ], [ 2, [] ] ) ).to.be true
      
    it '[ 2, [] ] should not equal [ 2 ]', ->
      expect( value_equals( [ 2, [] ], [ 2 ] ) ).to.be false
      
    it '[ 0 ] should not equal [ -0 ]', ->
      expect( value_equals( [ 0 ], [ -0 ] ) ).to.be false
      
    it '[ 0 ] should equal [ 0 ]', ->
      expect( value_equals( [ 0 ], [ 0 ] ) ).to.be true
      
    it '[ 2, [] ] should not equal [ 2, [ 2 ] ]', ->
      expect( value_equals( [ 2, [] ], [ 2, [ 2 ] ] ) ).to.be false
      
  describe 'Objects', ->
    it '{} should equal {}', ->
      expect( value_equals( {}, {} ) ).to.be true
      
    it '{ a: 1 } should equal { a: 1 }', ->
      expect( value_equals( { a: 1 }, { a: 1 } ) ).to.be true
      
    it '{ a: 1 } should not equal { b: 1 }', ->
      expect( value_equals( { a: 1 }, { b: 1 } ) ).to.be false
      
    it '{ a: 0 } should equal { a: 0 }', ->
      expect( value_equals( { a: 0 }, { a: 0 } ) ).to.be true
      
    it '{ a: 0 } should not equal { a: -0 }', ->
      expect( value_equals( { a: 0 }, { a: -0 } ) ).to.be false
      
    it '{ a: 1 } should not equal { a: 1, b: 1 }', ->
      expect( value_equals( { a: 1 }, { a: 1, b: 1 } ) ).to.be false
      
    it '{ a: 1, b: 1 } should not equal { a: 1 }', ->
      expect( value_equals( { a: 1, b: 1 }, { a: 1 } ) ).to.be false
      
    it '{ a: 1, b: 2 } should equal { a: 1, b: 2 }', ->
      expect( value_equals( { a: 1, b: 2 }, { a: 1, b: 2 } ) ).to.be true
      
    it '{ a: 1, b: 2 } should not equal { a: 1, b: 3 }', ->
      expect( value_equals( { a: 1, b: 2 }, { a: 1, b: 3 } ) ).to.be false
      
    it '{ a: 1, b: 2 } should not equal { b: 1, a: 2 }', ->
      expect( value_equals( { a: 1, b: 2 }, { b: 1, a: 2 } ) ).to.be false
      
    it '{ a: 1 } should not equal { a: 1, b: undefined }', ->
      expect( value_equals( { a: 1 }, { a: 1, b: undefined } ) ).to.be false
      
    it '{ a: 1, b: undefined } should equal { a: 1, b: undefined }', ->
      expect( value_equals( { a: 1, b: undefined }, { a: 1, b: undefined } ) ).to.be true
      
    it '{ a: 1, b: 2 } should equal { b: 2, a: 1 } (properties order is irrelevent)', ->
      expect( value_equals( { a: 1, b: 2 }, { b: 2, a: 1 } ) ).to.be true
      
    it '{ a: 1, b: {} } should equal { a: 1, b: {} }', ->
      expect( value_equals( { a: 1, b: {} }, { a: 1, b: {} } ) ).to.be true
      
    it '{ a: 1, b: { c: [ {}, 1, "" ] } } should equal { a: 1, b: { c: [ {}, 1, "" ] } }', ->
      expect( value_equals( { a: 1, b: { c: [ {}, 1, "" ] } }, { a: 1, b: { c: [ {}, 1, "" ] } } ) ).to.be true
      
    it '{ a: 1, b: { c: [ {}, 1, "" ] } } should not equal { a: 1, b: { c: [ {}, 1, "", true ] } }', ->
      expect( value_equals( { a: 1, b: { c: [ {}, 1, "" ] } }, { a: 1, b: { c: [ {}, 1, "", true ] } } ) ).to.be false
      
 