###
    xs_core.coffee

    Copyright (C) 2013, 2014, Connected Sets

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
# xs test utils
# -------------

utils = require( './tests_utils.js' ) if require?
expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
log    = this.log    || utils.log
xs     = this.xs     || utils.xs

XS      = xs.XS
extend  = XS.extend
uuid_v4 = XS.uuid_v4

slice = Array.prototype.slice

# ----------------------------------------------------------------------------------------------
# Check sorted pipelet content
# ----------------------------

check_set_content = ( done, source, values ) ->
  source._fetch_all ( _values ) ->
    check done, () ->
      expect( _values.sort ( a, b ) -> a.id - b.id ).to.be.eql values
  
# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

if require?
  require '../../lib/code.js'

Pipelet = XS.Pipelet
Set     = XS.Set

# ----------------------------------------------------------------------------------------------
# Some constants
# --------------

valid_uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

# ----------------------------------------------------------------------------------------------
# xs unit test suite
# ------------------

Query = XS.Query

describe 'Query & Query_Tree test suite:', ->
  describe 'Query.Error()', ->
    Query_Error = Query.Error
    
    e = new Query_Error 'message'
    
    it 'should be a Query_Error', ->
      expect( e ).to.be.a Query_Error
      expect( e ).to.be.a Error
      
    it 'should have a message', ->
      expect( e.message ).to.be 'message'
    
    it 'should have a stack', ->
      expect( e.stack ).to.be.a 'string'
  
  describe 'Query.evaluate()', ->
    evaluate = Query.evaluate
    
    user = {
      flow: 'user'
      
      id: 1
      
      profile: {
        first_name: 'Alice'
        
        favorite_colors: [ 'green', 'blue' ]
        
        options: { busy: true }
      }
      
      sales: 100
      
      count: 5
      
      fruits: [ 'orange', 'pear', 'tomato' ]
      
      text: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    }
    
    describe '==', ->
      it 'user.id == 1 -> true', ->
        expect( Query.evaluate user, 'id', [ "==", 1 ] ).to.be true
      
      it 'user.id == 2 -> false', ->
        expect( Query.evaluate user, 'id', [ "==", 2 ] ).to.be false
      
      it 'user.profile == { first_name: "Alice", favorite_colors: [ "green", "blue" ] } -> true', ->
        expect( Query.evaluate user, 'profile', [ "==", {
          first_name: "Alice"
          
          favorite_colors: [ 'green', 'blue' ]
          
          options: { busy: true }
        } ] ).to.be true
      
      it 'user.profile == { first_name: "Bob", favorite_colors: [ "green", "blue" ] } -> false', ->
        expect( Query.evaluate user, 'profile', [ "==", {
          first_name: "Bob"
          
          favorite_colors: [ 'green', 'blue' ]
          
          options: { busy: true }
        } ] ).to.be false
      
      it 'user.profile == { last_name: "Alice" } -> false', ->
        expect( Query.evaluate user, 'profile', [ "==", { last_name: "Alice" } ] ).to.be false
      
      it 'user.profile == {} -> false', ->
        expect( Query.evaluate user, 'profile', [ "==", {} ] ).to.be false
      
      it 'user.fuits == [ "orange", "pear", "tomato" ] -> true', ->
        expect( Query.evaluate user, 'fruits', [ "==", [ '$', [ "orange", "pear", 'tomato' ] ] ] ).to.be true
    
    describe 'Object expression', ->
      it 'user.profile: { first_name: "Alice" } -> true', ->
        expect( Query.evaluate user, 'profile', { first_name: "Alice" } ).to.be true
      
      it 'user.profile: { first_name: "Bob" } -> false', ->
        expect( Query.evaluate user, 'profile', { first_name: "Bob" } ).to.be false
      
      it 'user.profile: { first_name: "Alice", last_name: "" } -> false', ->
        expect( Query.evaluate user, 'profile', { first_name: "Alice", last_name: '' } ).to.be false
      
      it 'user.profile: { first_name: [ "==", "Alice" ] } -> true', ->
        expect( Query.evaluate user, 'profile', { first_name: [ "==", "Alice" ] } ).to.be true
      
      it 'user.profile: { first_name: [ "==", "Bob" ] } -> false', ->
        expect( Query.evaluate user, 'profile', { first_name: [ "==", "Bob" ] } ).to.be false
      
      it 'user.profile: { first_name: "Alice", favorite_colors: [ "green", "blue" ] } -> true', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          favorite_colors: [ '==', [ '$', [ "green", "blue" ] ] ]
        } ).to.be true
      
      it 'user.profile: { first_name: "Alice", favorite_colors: [ "green" ] } -> false', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Bob"
          
          favorite_colors: [ '==', [ '$', [ "green", "blue" ] ] ]
        } ).to.be false
      
      it 'user.profile: { first_name: "Alice", favorite_colors: [ "green" ] } -> false', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          favorite_colors: [ '==', [ '$', [ "green" ] ] ]
        } ).to.be false
      
      it 'user.profile: { first_name: "Alice", favorite_colors: { 0: "green" } } -> true', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          favorite_colors: { 0: "green" }
        } ).to.be true
      
      it 'user.profile: { first_name: "Alice", favorite_colors: [ "green", "blue" ] } -> true', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          favorite_colors: [ '==', [ '$', [ "green", "blue" ] ] ]
          
          options: { busy: true }
        } ).to.be true
      
      it 'user.profile: { first_name: "Alice", options: { busy: true } } -> true', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          options: { busy: true }
        } ).to.be true
      
      it 'user.profile: { first_name: "Alice", _options: { busy: true } } -> false', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          _options: { busy: true }
        } ).to.be false
      
      it 'user.profile: { first_name: "Alice", options: { busy: false } } -> false', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          options: { busy: false }
        } ).to.be false
      
      it 'user.profile: { first_name: "Alice", options: { more: {} } } -> false', ->
        expect( Query.evaluate user, 'profile', {
          first_name: "Alice"
          
          options: { more: {} }
        } ).to.be false
      
      it 'user.profile: [ { more: { busy: true } }, [ ".", "first_name" ], "==", "Alice" ] -> true', ->
        expect( Query.evaluate user, 'profile', [
          { options: { busy: true } }
          
          [ '.', 'first_name' ], '==', "Alice"
        ] ).to.be true
      
      it 'user.profile: [ [ { more: { busy: true } }, ".", "first_name" ], "==", "Alice" ] -> true', ->
        expect( Query.evaluate user, 'profile', [
          [ { options: { busy: true } }, '.', 'first_name' ], '==', "Alice"
        ] ).to.be true
      
      it 'user.profile: [ { more: { busy: false } }, [ ".", "first_name" ], "==", "Alice" ] -> false', ->
        expect( Query.evaluate user, 'profile', [
          { options: { busy: false } }
          
          [ '.', 'first_name' ], '==', "Alice"
        ] ).to.be false
      
    describe '!=', ->
      it 'user.id != 1 -> false', ->
        expect( Query.evaluate user, 'id', [ "!=", 1 ] ).to.be false
      
      it 'user.id != 2 -> true', ->
        expect( Query.evaluate user, 'id', [ "!=", 2 ] ).to.be true
      
    describe '>', ->
      it 'user.id > 0 -> true', ->
        expect( Query.evaluate user, 'id', [ ">", 0 ] ).to.be true
      
      it 'user.id > 1 -> false', ->
        expect( Query.evaluate user, 'id', [ ">", 1 ] ).to.be false
      
    describe '<', ->
      it 'user.id < 1 -> false', ->
        expect( Query.evaluate user, 'id', [ "<", 1 ] ).to.be false
      
      it 'user.id < 2 -> true', ->
        expect( Query.evaluate user, 'id', [ "<", 2 ] ).to.be true
      
    describe 'progressivity of < operator', ->
      it '0 < user.id < 2 -> true', ->
        expect( Query.evaluate user, 'id', [ [ '$', 0 ], "<", [], "<", 2 ] ).to.be true
      
      it '1 < user.id < 2 -> false', ->
        expect( Query.evaluate user, 'id', [ [ '$', 1 ], "<", [], "<", 2 ] ).to.be false
      
      it '0 < user.id < 1 -> false', ->
        expect( Query.evaluate user, 'id', [ [ '$', 0 ], "<", [], "<", 1 ] ).to.be false
      
    describe '>=', ->
      it 'user.id >= 1 -> true', ->
        expect( Query.evaluate user, 'id', [ ">=", 1 ] ).to.be true
      
      it 'user.id >= 2 -> false', ->
        expect( Query.evaluate user, 'id', [ ">=", 2 ] ).to.be false
      
    describe '<=', ->
      it 'user.id <= 0 -> false', ->
        expect( Query.evaluate user, 'id', [ "<=", 0 ] ).to.be false
      
      it 'user.id <= 1 -> true', ->
        expect( Query.evaluate user, 'id', [ "<=", 1 ] ).to.be true
    
    describe '[ "_", attribute ]', ->
      it 'count == 5 -> true', ->
        expect( Query.evaluate user, 'sales', [ [ '_', 'count' ], '==', 5 ] ).to.be true
      
      it 'count != 5 -> false', ->
        expect( Query.evaluate user, 'sales', [ [ '_', 'count' ], '!=', 5 ] ).to.be false
      
    describe '[ "_", attribute, sub-attribute ]', ->
      it 'profile.first_name == "Alice" -> true', ->
        expect( Query.evaluate user, 'sales', [ [ '_', 'profile', 'first_name' ], '==', 'Alice' ] ).to.be true
      
      it 'profile.first_name != "Alice" -> false', ->
        expect( Query.evaluate user, 'sales', [ [ '_', 'profile', 'first_name' ], '!=', 'Alice' ] ).to.be false
    
    describe 'Testing existance', ->
      it 'flow -> true', ->
        expect( Query.evaluate user, 'flow', [] ).to.be true
      
      it '_ -> false', ->
        expect( Query.evaluate user, '_', [] ).to.be false
      
      describe 'using [ "_", attribute, sub-attribute ]', ->
        it 'flow -> true', ->
          expect( Query.evaluate user, 'sales', [ '_', 'flow' ] ).to.be true
        
        it 'not_defined -> false', ->
          expect( Query.evaluate user, 'sales', [ '_', 'not_defined' ] ).to.be false
        
        it 'profile.first_name -> true', ->
          expect( Query.evaluate user, 'sales', [ '_', 'profile', 'first_name' ] ).to.be true
        
        it 'profile.last_name -> false', ->
          expect( Query.evaluate user, 'sales', [ '_', 'profile', 'last_name' ] ).to.be false
        
      describe 'using [ ".", sub-attribute ]', ->
        it 'profile.first_name -> true', ->
          expect( Query.evaluate user, 'profile', [ '.', 'first_name' ] ).to.be true
        
        it 'profile.last_name -> false', ->
          expect( Query.evaluate user, 'profile', [ '.', 'last_name' ] ).to.be false
    
    describe 'Testing non-existance', ->
      describe 'using failed', ->
        it '_ failed -> true', ->
          expect( Query.evaluate user, '_', [ 'failed' ] ).to.be true
        
        it 'flow failed -> false', ->
          expect( Query.evaluate user, 'flow', [ 'failed' ] ).to.be false
        
        describe 'using [ ".", sub-attribute ]', ->
          it 'profile.last_name failed -> true', ->
            expect( Query.evaluate user, 'profile', [ [ '.', 'last_name' ], 'failed' ] ).to.be true
          
          it 'profile.first_name failed -> false', ->
            expect( Query.evaluate user, 'profile', [ [ '.', 'first_name' ], 'failed' ] ).to.be false
      
      describe 'using "!"', ->
        it '! _ -> true', ->
          expect( Query.evaluate user, '_', [ '!', [] ] ).to.be true
        
        it '! flow -> false', ->
          expect( Query.evaluate user, 'flow', [ '!', [] ] ).to.be false
        
        describe 'using [ ".", sub-attribute ]', ->
          it '! profile.last_name -> true', ->
            expect( Query.evaluate user, 'profile', [ '!', [ '.', 'last_name' ] ] ).to.be true
          
          it '! profile.first_name -> false', ->
            expect( Query.evaluate user, 'profile', [ '!', [ '.', 'first_name' ] ] ).to.be false
      
    describe '[ ".", sub-attribute ]', ->
      it 'profile.first_name == "Alice" -> true', ->
        expect( Query.evaluate user, 'profile', [ [ '.', 'first_name' ], '==', 'Alice' ] ).to.be true
      
      it 'profile.first_name != "Alice" -> false', ->
        expect( Query.evaluate user, 'profile', [ [ '.', 'first_name' ], '!=', 'Alice' ] ).to.be false
      
    describe '[ "$", value ]', ->
      it '5 == 5 -> true', ->
        expect( Query.evaluate user, 'sales', [ [ '$', 5 ], '==', 5 ] ).to.be true
      
      it '5 != 5 -> false', ->
        expect( Query.evaluate user, 'sales', [ [ '$', 5 ], '!=', 5 ] ).to.be false
      
    describe 'Arithmetic operators', ->
      describe '+', ->
        it 'id + 0 == 1 -> true', ->
          expect( Query.evaluate user, 'id', [ '+', 0, '==', 1 ] ).to.be true
        
        it 'id + 2 == 3 -> true', ->
          expect( Query.evaluate user, 'id', [ '+', 2, '==', 3 ] ).to.be true
        
        it 'id + 1 == 3 -> false', ->
          expect( Query.evaluate user, 'id', [ '+', 1, '==', 3 ] ).to.be false
        
        it 'id + 1 + 1 == 3 -> true', ->
          expect( Query.evaluate user, 'id', [ '+', 1, '+', 1, '==', 3 ] ).to.be true
      
      describe '-', ->
        it 'id - 0 == 1 -> true', ->
          expect( Query.evaluate user, 'id', [ '-', 0, '==', 1 ] ).to.be true
        
        it 'id - 2 == -1 -> true', ->
          expect( Query.evaluate user, 'id', [ '-', 2, '==', -1 ] ).to.be true
        
        it 'id - 1 == -1 -> false', ->
          expect( Query.evaluate user, 'id', [ '-', 1, '==', -1 ] ).to.be false
        
        it 'id - 1 - 1 == -1 -> true', ->
          expect( Query.evaluate user, 'id', [ '-', 1, '-', 1, '==', -1 ] ).to.be true
      
      describe '*', ->
        it 'id * 0 == 0 -> true', ->
          expect( Query.evaluate user, 'id', [ '*', 0, '==', 0 ] ).to.be true
        
        it 'id * 1 == 1 -> true', ->
          expect( Query.evaluate user, 'id', [ '*', 1, '==', 1 ] ).to.be true
        
        it 'id * 2 == 2 -> true', ->
          expect( Query.evaluate user, 'id', [ '*', 2, '==', 2 ] ).to.be true
        
        it 'id * 2 * 3 == 6 -> true', ->
          expect( Query.evaluate user, 'id', [ '*', 2, '*', 3, '==', 6 ] ).to.be true
      
      describe '/', ->
        describe 'division by zero', ->
          it '5 / 0 == Infinity -> true', ->
            expect( Query.evaluate user, 'id', [ [ '$', 5 ], '/', [ '$',  0 ], '==',  Infinity ] ).to.be true
          
          it '5 / -0 == -Infinity -> true', ->
            expect( Query.evaluate user, 'id', [ [ '$', 5 ], '/', [ '$', -0 ], '==', -Infinity ] ).to.be true
        
        it '3 / 1 == 3 -> true', ->
          expect( Query.evaluate user, 'id', [ [ '$', 3 ], '/', 1, '==', 3 ] ).to.be true
        
        it '3 / 2 == 1.5 -> true', ->
          expect( Query.evaluate user, 'id', [ [ '$', 3 ], '/', 2, '==', 1.5 ] ).to.be true
        
        it '36 / 2 / 3 == 6 -> true', ->
          expect( Query.evaluate user, 'id', [ [ '$', 36 ], '/', 2, '/', 3, '==', 6 ] ).to.be true
        
        it 'sales / count == 20 -> true', ->
          expect( Query.evaluate user, 'sales', [ '/', [ '_', 'count' ], '==', 20 ] ).to.be true
        
        it 'sales / count != 20 -> false', ->
          expect( Query.evaluate user, 'sales', [ '/', [ '_', 'count' ], '!=', 20 ] ).to.be false
        
        it 'sales / ( 0 != count ) == 20 -> true', ->
          expect( Query.evaluate user, 'sales', [ '/', [ [ '$', 0 ], '!=', [ '_', 'count' ] ], '==', 20 ] ).to.be true
        
        it 'sales / ( 5 != count ) == 20 -> false', ->
          expect( Query.evaluate user, 'sales', [ '/', [ [ '$', 5 ], '!=', [ '_', 'count' ] ], '==', 20 ] ).to.be false
      
      describe '%', ->
        it '3 % 1 == 0 -> true', ->
          expect( Query.evaluate user, 'id', [ [ '$', 3 ], '%', 1, '==', 0 ] ).to.be true
        
        it '3 % 2 == 1 -> true', ->
          expect( Query.evaluate user, 'id', [ [ '$', 3 ], '%', 2, '==', 1 ] ).to.be true
        
        it '5 % 3 == 2 -> true', ->
          expect( Query.evaluate user, 'id', [ [ '$', 5 ], '%', 3, '==', 2 ] ).to.be true
        
        it '5 % 0 == NaN -> true', ->
          expect( Query.evaluate user, 'id', [ [ '$', 5 ], '%', 0, '==', NaN ] ).to.be true
    
    describe '!', ->
      it '! ( id > 0 ) -> false', ->
        expect( Query.evaluate user, 'id', [ "!", [ ">", 0 ] ] ).to.be false
      
      it '! ( id > 1 ) -> true', ->
        expect( Query.evaluate user, 'id', [ "!", [ ">", 1 ] ] ).to.be true
    
    describe '||', ->
      it 'id > 10 || id < 5 -> true', ->
        expect( Query.evaluate user, 'id', [ ">", 10, "||", "<", 5 ] ).to.be true
      
      it 'id > 0 || id < 0 -> true', ->
        expect( Query.evaluate user, 'id', [ ">", 0, "||", "<", 0 ] ).to.be true
      
      it 'id > 10 || id < 1 -> false', ->
        expect( Query.evaluate user, 'id', [ ">", 10, "||", "<", 1 ] ).to.be false
    
    describe '&&', ->
      it 'user.id > 0 && user.id < 2 -> true', ->
        expect( Query.evaluate user, 'id', [ ">", 0, '&&', [ "<", 2 ] ] ).to.be true
      
      it 'user.id > 1 && user.id < 2 -> false', ->
        expect( Query.evaluate user, 'id', [ ">", 1, '&&', [ "<", 2 ] ] ).to.be false
      
      it 'user.id > 0 && user.id < 1 -> false', ->
        expect( Query.evaluate user, 'id', [ ">", 0, '&&', [ "<", 1 ] ] ).to.be false
      
      it 'user.id > 0 && user.id < 2 && sales == 100 -> true', ->
        expect( Query.evaluate user, 'id', [ ">", 0, '&&', [ "<", 2 ], '&&', [ [ '_', 'sales' ], '==', 100 ] ] ).to.be true
      
      it 'user.id > 0 && user.id < 2 && sales != 100 -> false', ->
        expect( Query.evaluate user, 'id', [ ">", 0, '&&', [ "<", 2 ], '&&', [ [ '_', 'sales' ], '!=', 100 ] ] ).to.be false
    
    describe 'Implicit and', ->
      describe 'Using []', ->
        it 'user.id ( > 0 ( == 1 ) ) -> true', ->
          expect( Query.evaluate user, 'id', [ ">", 0, [ "==", 1 ] ] ).to.be true
        
        it 'user.id ( > 0 ( == 0 ) ) -> false', ->
          expect( Query.evaluate user, 'id', [ ">", 0, [ "==", 0 ] ] ).to.be false
        
        it 'user.id ( > 1 ( == 1 ) ) -> false', ->
          expect( Query.evaluate user, 'id', [ ">", 1, [ "==", 1 ] ] ).to.be false
      
      describe 'Progressive', ->
        it 'user.id ( > 0 == 0 ) ) -> true', ->
          expect( Query.evaluate user, 'id', [ ">", 0, "==", 0 ] ).to.be true
        
        it 'user.id ( > 0 == 1 ) ) -> false', ->
          expect( Query.evaluate user, 'id', [ ">", 0, "==", 1 ] ).to.be false
        
        it 'user.id ( > 1 == 1 ) ) -> false', ->
          expect( Query.evaluate user, 'id', [ ">", 1, "==", 1 ] ).to.be false
    
    describe '&& !', ->
      it 'user.id > 1 && ! ( user.id >= 2 ) -> false', ->
        expect( Query.evaluate user, 'id', [ '>', 1, '&&', [ '!', [ '<', 2 ] ] ] ).to.be false
    
    describe '|| with !', ->
      it 'user.id > 0 || $ false -> true', ->
        expect( Query.evaluate user, 'id', [ '>', 0, '||', '$', false ] ).to.be true
      
      it 'user.id > 0 || ( ! true ) -> true', ->
        expect( Query.evaluate user, 'id', [ '>', 0, '||', [ '!', true ] ] ).to.be true
      
      it 'user.id > 0 || ! true -> true', ->
        expect( Query.evaluate user, 'id', [ '>', 0, '||', '!', true ] ).to.be true
    
    describe 'failed', ->
      it 'id > 1 failed -> true', ->
        expect( Query.evaluate user, 'id', [ '>', 1, 'failed' ] ).to.be true
      
      it 'id > 0 failed -> false', ->
        expect( Query.evaluate user, 'id', [ '>', 0, 'failed' ] ).to.be false
      
      it 'id > 1 failed id < 5 -> true', ->
        expect( Query.evaluate user, 'id', [ '>', 1, 'failed', '<', 5 ] ).to.be true
      
      it 'id > 1 failed id < 1 -> false', ->
        expect( Query.evaluate user, 'id', [ '>', 1, 'failed', '<', 1 ] ).to.be false
      
      it 'id > 0 failed id < 5 -> false', ->
        expect( Query.evaluate user, 'id', [ '>', 0, 'failed', '<', 5 ] ).to.be false
      
      it 'id > 0 failed || -> true', ->
        expect( Query.evaluate user, 'id', [ '>', 0, 'failed', '||' ] ).to.be true
      
      it 'id > 1 failed == 1 -> true', ->
        expect( Query.evaluate user, 'id', [ '>', 1, 'failed', '==', 1 ] ).to.be true
    
    describe 'Switching default attribute value using __ attribute', ->
      it 'profile .first_name == "Alice" && ( ( __ id ) && .first_name == "Alice" failed && id > 0 && id < 2 ) ) -> true', ->
        expect( Query.evaluate user, 'profile', [ 
          [ '.', 'first_name' ], '==', 'Alice',
          '&&', [
            '&&', [ '__', 'id' ],
            '&&', [ [ '.', 'first_name' ], '==', 'Alice' ],
            'failed',
            '&&', [ '>', 0 ]
            '&&', [ '<', 2 ]
          ]
        ] ).to.be true
    
    describe 'Regular Expressions', ->
      describe 'RegExp, regular expression constructor', ->
        it '( RegExp "test" ) == /test/ -> true', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test" ], "==", /test/ ] ).to.be true
        
        it '( RegExp "test" ) == "test" -> false', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test" ], "==", "test" ] ).to.be false
        
        it '( RegExp "test" ) == /tes/ -> false', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test" ], "==", /tes/ ] ).to.be false
        
        it '( RegExp "test", "g" ) == /test/g -> true', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test", "g" ], "==", /test/g ] ).to.be true
        
        it '( RegExp "test", "g" ) == /test/i -> false', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test", "g" ], "==", /test/i ] ).to.be false
        
        it '( RegExp "test", "i" ) == /test/i -> true', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test", "i" ], "==", /test/i ] ).to.be true
        
        it '( RegExp "test", "i" ) == /test/ -> false', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test", "i" ], "==", /test/ ] ).to.be false
        
        it '( RegExp "test", "m" ) == /test/m -> true', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test", "m" ], "==", /test/m ] ).to.be true
        
        it '( RegExp "test", "m" ) == /test/g -> false', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test", "m" ], "==", /test/g ] ).to.be false
      
        it '( RegExp "test", "gim" ) == /test/gim -> true', ->
          expect( Query.evaluate user, 'id', [ [ 'RegExp', "test", "gim" ], "==", /test/gim ] ).to.be true
      
      describe 'match', ->
        it 'text match "dolor" -> true', ->
          expect( Query.evaluate user, "text", [ 'match', "dolor" ] ).to.be true
        
        it 'text match "dolor" == 12 -> true', ->
          expect( Query.evaluate user, "text", [ 'match', "dolor", "==", 12 ] ).to.be true
        
        it 'text match "Dolor" -> false', ->
          expect( Query.evaluate user, "text", [ 'match', "Dolor" ] ).to.be false
        
        it 'text match ( RegExp "Dolor", "i" ) -> true', ->
          expect( Query.evaluate user, "text", [ 'match', [ "RegExp", "Dolor", "i" ] ] ).to.be true
      
      describe 'last_index', ->
        it 'text match "dolor" == 12, last_index == 0 -> true', ->
          expect( Query.evaluate user, "text", [ 'match', "dolor", "==", 12, "last_index", '==', 0 ] ).to.be true
        
        it 'text match ( RegExp "dolor", "g" ) == 12, last_index == 17 -> true', ->
          expect( Query.evaluate user, "text", [ 'match', [ "RegExp", "dolor", "g" ], "==", 12, "last_index", '==', 17 ] ).to.be true
        
        it 'text match ( RegExp "dolor", "g" ) == 12, last_index == 17, ( match ) -> true', ->
          expect( Query.evaluate user, "text", [ 'match', [ "RegExp", "dolor", "g" ], "==", 12, "last_index", '==', 17, [ "match" ] ] ).to.be true
        
        it 'text match /dolor/g == 12, last_index == 17, ( match ) == 104, last_index == 109 -> true', ->
          expect( Query.evaluate user, "text", [
            'match', /dolor/g, "==", 12
            'last_index', '==', 17
            [ 'match' ], '==', 104
            'last_index', '==', 109
          ] ).to.be true
      
      describe 'groups', ->
        it 'text match /(d.*?r).*?in/g == 12" -> true', ->
          expect( Query.evaluate user, "text", [
            'match', /(d.*?r).*?in/g, '==', 12
          ] ).to.be true
        
        it 'text match /(d.*?r).*?in/g, group "index" == 12" -> true', ->
          expect( Query.evaluate user, "text", [
            'match', /(d.*?r).*?in/g
            'groups', 'index', '==', 12
          ] ).to.be true
        
        it 'text match /(d.*?r).*?in/g, group "length" == 2" -> true', ->
          expect( Query.evaluate user, "text", [
            'match', /(d.*?r).*?in/g
            'groups', 'length', '==', 2
          ] ).to.be true
        
        it 'text match /(d.*?r).*?in/g, group 0 == "dolor sit amet, consectetur adipisicin" -> true', ->
          expect( Query.evaluate user, "text", [
            'match', /(d.*?r).*?in/g
            'groups', 0, '==', "dolor sit amet, consectetur adipisicin"
          ] ).to.be true
        
        it 'text match /(d.*?r).*?in/g, group 1 == "dolor" -> true', ->
          expect( Query.evaluate user, "text", [
            'match', /(d.*?r).*?in/g
            'groups', 1, '==', "dolor"
          ] ).to.be true
      
      describe 'split', ->
        it 'text split /,/" -> true', ->
          expect( Query.evaluate user, "text", [ 'split', ',' ] ).to.be true
        
        it 'text split /,/ == 5" -> true', ->
          expect( Query.evaluate user, "text", [ 'split', ',', '==', 5 ] ).to.be true
        
        it 'text split /,/ groups 1 == " consectetur adipisicing elit" -> true', ->
          expect( Query.evaluate user, "text", [
            'split', ',', 'groups', 1, '==', ' consectetur adipisicing elit'
          ] ).to.be true
    
    describe 'in, contains', ->
      it '"orange" in [ "$", [ "pear", "orange", "banana" ] ] -> true', ->
        expect( Query.evaluate user, "text", [
          [ '$', "orange" ], 'in', [ '$',[ "pear", "orange", "banana" ] ]
        ] ).to.be true
      
      it '"orange" in [ "$", [ "pear", "orange", "banana" ] ] == 1" -> true', ->
        expect( Query.evaluate user, "text", [
          [ '$', "orange" ], 'in', [ '$', [ "pear", "orange", "banana" ] ], '==', 1
        ] ).to.be true
      
      it '"tomato" in [ "$", [ "pear", "orange", "banana" ] ] -> false', ->
        expect( Query.evaluate user, "text", [
          [ '$', "tomato" ], 'in', [ '$', [ "pear", "orange", "banana" ] ]
        ] ).to.be false
      
      it '"tomato" in user.fruits -> true', ->
        expect( Query.evaluate user, "fruits", [ [ '$', "tomato" ], 'in', [] ] ).to.be true
      
      it '"apple" in user.fruits -> false', ->
        expect( Query.evaluate user, "apple", [ [ '$', "tomato" ], 'in', [] ] ).to.be false
      
      it '"apple" in user.fruits == 2 -> false', ->
        expect( Query.evaluate user, "apple", [ [ '$', "tomato" ], 'in', [], "==", 2 ] ).to.be false
      
      it '[ "tomato", "pear" ] in user.fruits -> true', ->
        expect( Query.evaluate user, "fruits", [ [ '$', [ "tomato", "pear" ] ], 'in', [] ] ).to.be true
      
      it '[ "tomato", "apple" ] in user.fruits -> false', ->
        expect( Query.evaluate user, "fruits", [ [ '$', [ "tomato", "apple" ] ], 'in', [] ] ).to.be false
      
      it '[ "apple", "tomato" ] in user.fruits -> false', ->
        expect( Query.evaluate user, "fruits", [ [ '$', [ "apple", "tomato" ] ], 'in', [] ] ).to.be false
      
      it '[ "tomato", "pear" ] in user.fruits == 1 -> true', ->
        expect( Query.evaluate user, "fruits", [ [ '$', [ "tomato", "pear" ] ], 'in', [], "==", 1 ] ).to.be true
      
      it 'user.fruits contains [ "tomato", "pear" ] -> true', ->
        expect( Query.evaluate user, "fruits", [ 'contains', [ '$', [ "tomato", "pear" ] ] ] ).to.be true
      
    describe 'Date Object', ->
      it "[ 'Date', 2014, 4, 9, 10, 56 ] year == 2014 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56 ], 'year', '==', 2014
        ] ).to.be true
      
      it "2014 year == 2014 -> false", ->
        expect( Query.evaluate user, "id", [
          [ '$', 2014 ], 'year', '==', 2014
        ] ).to.be false
      
      it "[ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], 'value', '==', 1399632985432 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], 'value', '==', 1399632985432
        ] ).to.be true
      
      it "[ 'Date', 1399632985432 ], 'value', '==', 1399632985432 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 1399632985432 ], 'value', '==', 1399632985432
        ] ).to.be true
      
      it "user.date == [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ] -> true", ->
        user = { date: new Date( Date.UTC( 2014, 4, 9, 10, 56, 25, 432 ) ) }
        
        expect( Query.evaluate user, "date", [
          '==', [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ]
        ] ).to.be true
      
      it "user.date value == 1399629385432 -> true", ->
        user = { date: new Date(  Date.UTC( 2014, 4, 9, 10, 56, 25, 432 ) ) }
        
        expect( Query.evaluate user, "date", [
          'value', '==', 1399632985432
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56 ] month == 4 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56 ], 'month', '==', 4
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56 ] day == 9 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56 ], 'day', '==', 9
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56 ] hours == 10 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56 ], 'hours', '==', 10
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56 ] minutes == 56 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56 ], 'minutes', '==', 56
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56, 25 ] seconds == 25 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56, 25 ], 'seconds', '==', 25
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56, 25, 432 ] milliseconds == 432 -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], 'milliseconds', '==', 432
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56, 25, 432 ] < [ 'Date' ] -> true", ->
        expect( Query.evaluate user, "id", [
          [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], '<', [ 'Date' ]
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], '-' [ 'Date', 2014, 4, 10, 10, 56, 25, 432 ] == -86400000 -> true", ->
        expect( Query.evaluate user, "id", [
            [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ]
          '-'
            [ 'Date', 2014, 4, 10, 10, 56, 25, 432 ]
          '=='
            -86400000
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56, 25, 432 ] time == [ 'Date', 1970, 0, 1, 10, 56, 25, 432 ] -> true", ->
        expect( Query.evaluate user, "id", [
            [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], 'time'
          '=='
            [ 'Date', 1970, 0, 1, 10, 56, 25, 432  ]
        ] ).to.be true
      
      it "[ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], 'time' - [ [ 'Date', 2014, 4, 10, 10, 56, 26, 432 ], 'time' ] == -1000 -> true", ->
        expect( Query.evaluate user, "id", [
            [ 'Date', 2014, 4, 9, 10, 56, 25, 432 ], 'time'
          '-'
            [ [ 'Date', 2014, 4, 10, 10, 56, 26, 432 ], 'time' ]
          '==', -1000
        ] ).to.be true
  
  describe 'Query():', ->
    q = q1 = null
    
    it 'new Query( [] ) should create an empty query', ->
      q = new Query [];
      
      expect( q.query   ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
      
    it 'new Query() should create an empty query', ->
      q = new Query();
      
      expect( q.query   ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    
    
    it 'Query..add() should allow to "or" two empty queries', ->
      q = new Query( [] )
      
      expect( q.add( [] ).query ).to.be.eql []
      expect( q.adds ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should add query to empty query', ->
      expect( q.add( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql []
      
    it 'Query..add() should OR two queries', ->
      expect( q.add( [ { flow: 'user' } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
      
    it 'Query..add() should OR two queries and result in optimized query', ->
      expect( q.add( [ { flow: 'group', id: 1465 } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should not duplicate existing expressions', ->
      expect( q.add( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query.add() should remove an expression if a new less restrictive is or-ed', ->
      q.add( [ { flow: 'post', id: 1 }, { flow: 'post' } ] )
      
      expect( q.query ).to.be.eql [ { flow: 'group' }, { flow: 'user' }, { flow: 'post' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' }, { flow: 'post', id: 1 }, { flow: 'post' } ]
      expect( q.removes ).to.be.eql [ { flow: 'post', id: 1 } ]
    
    it 'new Query( query ) should self optimize and not alter parameter query', ->
      query = [ { flow: 'group' }, { flow: 'group' }, { flow: 'user' }, { flow: 'group' }, { flow: 'user' } ]
      
      q = new Query( query )
      
      expect( q.query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( query ).to.be.eql [ { flow: 'group' }, { flow: 'group' }, { flow: 'user' }, { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should optimize more than one left expression per less restrictive right expression', ->
      q1 = [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      
      q = new Query( q1 ).add [ flow: 'group' ]
      
      expect( q.query   ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 }, { flow: 'group' } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
    
    it 'should not have alterned Query() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
    
    
    
    it 'Query..and() should allow to "and" two empty queries', ->
      q = new Query []
      
      expect( q.and( [] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should remain empty after "and" query to empty query', ->
      expect( q.and( [ { flow: 'group' } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should not change query after "and" query with same query', ->
      expect( q.add( [ { flow: 'group' } ] ).and( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should AND two queries', ->
      expect( q.and( [ { id: 26 } ] ).query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' } ]
    
    it 'Query..and() with one false sub term should AND two queries', ->
      q.add( [ { flow: 'group', id: 27 } ] ).and( [ { id: 26 } ] )
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 27 } ]
      
    it 'Query..discard_operations() should empty adds and removes', ->
      q.discard_operations()
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() with only one false sub term should AND two queries to result in an empty query', ->
      expect( q.and( [ { id: 27 } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 } ]
    
    it 'Query..and() with two AND propositions should AND two queries and produce two propositions', ->
      q1 = [ { id: 26 }, { id: 27 } ]
      q.add( [ { flow: 'group' } ] ).and q1
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group' } ]
    
    it 'should not have alterned and() parameter query', ->
      expect( q1 ).to.be.eql [ { id: 26 }, { id: 27 } ]
      
    it 'Query..and() with two AND propositions with more terms than original should AND two queries and produce one proposition', ->
      q.discard_operations()
      
      q1 = [ { flow: 'group', id: 27 }, { flow: 'user', id: 234 } ]
      q.add( [ { flow: 'group' } ] ).and q1
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 27 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 }, { flow: 'group' } ]
    
    it 'should not have alterned and() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 27 }, { flow: 'user', id: 234 } ]
      
    
    
    it 'Query..remove() should allow to "remove" two empty queries', ->
      q = new Query( [] )
      
      expect( q.remove( [] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..remove() should remain empty after "remove" query to empty query', ->
      expect( q.add( [ { flow: 'group' } ] ).remove( [ { flow: 'group' } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' } ]
    
    it 'Query..remove() should raise a Query.Error after "remove" from empty query', ->
      expect( () -> new Query( [] ).remove( [ { flow: 'group' } ] ).query )
        .to.throwException ( e ) -> expect( e ).to.be.a Query.Error
    
    it 'Query..remove() should raise a Query.Error after "remove" with not-found query', ->
      expect( () -> new Query( [ { flow: 'group', id: 1 } ] ).remove( [ { flow: 'group' } ] ).query )
        .to.throwException ( e ) -> expect( e ).to.be.a Query.Error
    
    it 'Query..remove() should raise a Query.Error after "remove" with not-found query', ->
      expect( () -> new Query( [ { flow: 'group' } ] ).remove( [ { flow: 'group', id: 1 } ] ).query )
        .to.throwException ( e ) -> expect( e ).to.be.a Query.Error
    
    it 'Query..remove() should remove two queries after "remove"', ->
      q = new Query( [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ] ).remove [
          { flow: 'group', id: 2 }
          { flow: 'user', id: 3 }
        ]
      
      expect( q.query ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 3 }
        ]
      expect( q.adds ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ]
      expect( q.removes ).to.be.eql [
          { flow: 'group', id: 2 }
          { flow: 'user', id: 3 }
        ]
      
    it 'Query..remove() should remove expressions after "remove" even if removed out of order', ->
      q1 = [
        { flow: 'user', id: 2 }
        { flow: 'group', id: 3 }
        { flow: 'user', id: 4 }
        { flow: 'group', id: 1 }
        { flow: 'user', id: 1 }
        { flow: 'user', id: 3 }
      ]
      
      q = new Query( [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ] ).remove q1
        
      expect( q.query ).to.be.eql [
          { flow: 'group', id: 2 }
        ]
      expect( q.adds ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ]
      expect( q.removes ).to.be.eql [
          { flow: 'user', id: 2 }
          { flow: 'group', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'user', id: 1 }
          { flow: 'user', id: 3 }
        ]
    
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [
          { flow: 'user', id: 2 }
          { flow: 'group', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'user', id: 1 }
          { flow: 'user', id: 3 }
        ]
      
    it 'should not remove an expression which was previously optimized-out by add()', ->
      q.discard_operations()
      
      q.add    [ { flow: 'group' } ]
      
      expect( q.optimized ).to.be.eql [ { flow: 'group', id: 2 } ]
      
      q1 = [ { flow: 'group', id: 2 } ]
      
      q.remove q1
      
      expect( q.query     ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.optimized ).to.be.eql []
    
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 2 } ]
    
    it 'should recover expression previously optimized-out by add() when removing the less restrictive operation', ->
      q = new Query [ { flow: 'group', id: 2 } ]
      
      expect( q.query     ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.removes   ).to.be.eql []
      expect( q.optimized ).to.be.eql []
      
      # add less restrictive expression than { flow: 'group', id: 2 }
      q.add [ { flow: 'group' } ] 
      
      expect( q.query     ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.optimized ).to.be.eql [ { flow: 'group', id: 2 } ]
      
      # remove less restrictive operation
      q1 = [ { flow: 'group' } ]
      
      q.remove [ { flow: 'group' } ]
      
      # expects more restrictive expression { flow: 'group', id: 2 } to be recovered
      expect( q.query     ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' }, { flow: 'group', id: 2 } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' } ]
      expect( q.optimized ).to.be.eql []
      
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group' } ]
    
    
    
    it 'generate() should generate a filter() function', ->
      q = new Query( [ { flow: 'group' }, { flow: 'user', id: 231 } ] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
      
    it 'filter() should filter an Array of Objects', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
      ]
    
    it 'should generate a filter for a query with no or-terms', ->
      q = new Query( [] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
    
    it 'should filter everything, this is the nul-filter', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql []
    
    it 'should generate a filter for a query with one or-terms having no and terms', ->
      q = new Query( [ {} ] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
    
    it 'should filter nothing, this is a pass-through filter', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ]
    
    
    it 'differences() should returns adds and removes', ->
      q = new Query [
        { flow: 'stores', id: 1 }
        { flow: 'stores', id: 2 }
        { flow: 'stores', id: 3 }
      ]
      
      q1 = [
        { flow: 'stores', id: 3 }
        { flow: 'stores', id: 4 }
        { flow: 'stores', id: 5 }
      ]
      
      differences = q.differences q1
      
      expect( q1 ).to.be.eql [
        { flow: 'stores', id: 3 }
        { flow: 'stores', id: 4 }
        { flow: 'stores', id: 5 }
      ]
      
      expect( q.query ).to.be.eql [
        { flow: 'stores', id: 1 }
        { flow: 'stores', id: 2 }
        { flow: 'stores', id: 3 }
      ]
      
      expect( differences ).to.be.eql [
        [
          { flow: 'stores', id: 1 }
          { flow: 'stores', id: 2 }
        ]
        
        [
          { flow: 'stores', id: 4 }
          { flow: 'stores', id: 5 }
        ]
      ]
    
    
  describe 'Query_Tree()', ->
    tree = new XS.Query_Tree()
    
    Input = Pipelet.Input
    
    subscriber_1 = new Input( {}, 'subscriber_1' )
    subscriber_2 = new Input( {}, 'subscriber_2' )
    subscriber_3 = new Input( {}, 'subscriber_3' )
    
    it 'Pipelet() should allow to create a top query tree node', ->
      expect( tree.top ).to.be.eql {
        branches   : {}
        keys       : []
        subscribers: []
      }
    
    it 'Adding a query should generate a query tree', ->
      expect( tree
        .add( [ { flow: 'user' } ], subscriber_1 )
        .top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
            }
          }
        }
        keys       : [ "flow" ]
        subscribers: []
      }
      
    it 'Adding an empty OR-term should add subscriber to the root of the tree - i.e. unfiltered', ->
      expect( tree
        .add( [ {} ], subscriber_2 )
        .top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
            }
          }
        }
        keys       : [ "flow" ]
        subscribers: [ subscriber_2 ]
      }
      
    it 'Adding an additional query should expand the query tree', ->
      expect( tree
        
        .add( [
          { flow: 'user' }
          { flow: 'group', id: 527 }
          { id: 521, flow: 'group' }
          { id: 425 }
        ], subscriber_3 )
        
        .top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1, subscriber_3 ]
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
            }
          }
        }
        keys       : [ "flow", "id" ]
        subscribers: [ subscriber_2 ]
      }
      
    it 'Remove a query should shrink the query tree', ->
      expect( tree
        .remove( [ {} ], subscriber_2 )
        .top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1, subscriber_3 ]
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
      }
      
    it 'Remove another query should shrink the query tree further', ->
      expect( tree
        .remove( [ { flow: 'user' } ], subscriber_3 )
        .top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
      }
      
    it 'Remove another query should shrink the query tree even further', ->
      expect( tree
        .remove( [ { flow: 'user' } ], subscriber_1 )
        .top
      ).to.be.eql {
        branches: {
          "flow": {
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
      }
      
    it 'Add and Remove empty queries should not change anything', ->
      expect( tree
        .add( [] ).remove( [] )
        .top
      ).to.be.eql {
        branches: {
          "flow": {
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
      }
      
    it 'Remove another query should shrink the query tree even further', ->
      expect( tree
        
        .remove( [
          { flow: 'group', id: 521 }
          { id: 527, flow: 'group' }
        ], subscriber_3 )
        
        .top
      ).to.be.eql {
        branches: {
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
            }
          }
        }
        keys      : [ "id" ]
        subscribers: []
      }
      
    it 'Remove the last record, should empty the query tree', ->
      expect( tree
        .remove( [ { id: 425 } ], subscriber_3 )
        .top
      ).to.be.eql {
        branches  : {}
        keys      : []
        subscribers: []
      }
      
  describe 'Query_Tree routing:', ->
    output = new XS.Pipelet()._output
    
    tree = output.tree
    
    subscriber_1 = xs.set( [], { name: 'subscriber_1' } )
    subscriber_2 = xs.set( [], { name: 'subscriber_2' } )
    subscriber_3 = xs.set( [], { name: 'subscriber_3' } )
    subscriber_4 = xs.set( [], { name: 'subscriber_4' } )
    
    tree.add [ { flow: 'user', id: 123 } ], subscriber_1._input
    
    tree.add [ { flow: 'user', id: 345 } ], subscriber_2._input
    
    tree.add [ {} ], subscriber_3._input
    
    tree.add [ { id: 123 }, { flow: 'user' } ], subscriber_4._input
    
    output.emit 'add', [
      { flow: 'group' }
      { id: 123 }
      { flow: 'user', id: 123 }
      { flow: 'user', id: 345 }
    ]
    
    it 'Should allow to emit an add operation filtered by a query to the first subscriber', ( done ) ->
      subscriber_1._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 123 }
        ]
        
    it 'Should emit other values to the second subscriber', ( done ) ->
      subscriber_2._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 345 }
        ]
      
    it 'Should emit all values to the third subscriber', ( done ) ->
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
          { id: 123 }
          { flow: 'user', id: 123 }
          { flow: 'user', id: 345 }
        ]

    it 'Should not duplicate or reorder values emited to fourth subscriber', ( done ) ->
      subscriber_4._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { id: 123 }
          { flow: 'user', id: 123 }
          { flow: 'user', id: 345 }
        ]

    it "should alter first recepient's set", ( done ) ->
      output.emit 'remove', [ { flow: 'user', id: 123 } ]
      
      subscriber_1._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
        
    it "should not alter second subscriber's set", ( done ) ->
      subscriber_2._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 345 }
        ]
    
    it 'Third subscriber set should have two record less after removing one more record', ( done ) ->
      output.emit 'remove', [ { id: 123 } ]
      
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
          { flow: 'user', id: 345 }
        ]
      
    it 'Second subscriber be empy after removing one more record', ( done ) ->
      output.emit 'remove', [ { flow: 'user', id: 345 } ]
      
      subscriber_2._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
      
    it 'And third subscriber should have only one record left', ( done ) ->
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
        ]
      
    it 'third subscriber should be empty after removing last record', ( done ) ->
      output.emit 'remove', [ { flow: 'group' } ]
      
      subscriber_3._fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
      
    it '_clear should clear all records from all subscribers', ( done ) ->
      tree.add [ { flow: 'user', id: 123 } ], subscriber_1._input
      
      tree.add [ { flow: 'user', id: 345 } ], subscriber_2._input
      
      tree.add [ {} ], subscriber_3._input
      
      tree.add [ { id: 123 }, { flow: 'user' } ], subscriber_4._input
      
      output.emit 'add', [
        { flow: 'group' }
        { id: 123 }
        { flow: 'user', id: 123 }
        { flow: 'user', id: 345 }
      ]
      
      output.emit 'clear'
      
      count = 4
      all_values = []

      fetched = ( values ) ->
        all_values.push( values )
        
        --count || check done, () ->
          expect( all_values ).to.be.eql [ [], [], [], [] ]

      subscriber_1._fetch_all fetched
      subscriber_2._fetch_all fetched
      subscriber_3._fetch_all fetched
      subscriber_4._fetch_all fetched
      
