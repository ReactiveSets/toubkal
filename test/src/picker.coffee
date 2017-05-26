###
    picker.coffee

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

picker = this.rs && this.rs.RS.picker || require '../../lib/util/picker.js'

# ----------------------------------------------------------------------------------------------
# Picker test suite
# -----------------

describe 'RS.picker()', ->
  pick = null
  
  describe 'From Object expression', ->
    it 'should return a pick() function from expression {}', ->
      expect( pick = picker {} ).to.be.a Function
    
    it 'pick() should return an empty object from { a: 1, view: { user_id: 1 } }', ->
      expect( pick { a: 1, view: { user_id: 1 } } ).to.be.eql {}
    
    it 'should return a Function from expression { flow: "users", id: ".view.user_id", present: true }', ->
      pick = picker { flow: "users", id: ".view.user_id", present: true }
      
      expect( pick ).to.be.a Function
    
    it 'pick() should return { flow: "users", id: 1, present: true } from { a: 1, view: { user_id: 1 } }', ->
      expect( pick { a: 1, view: { user_id: 1 } } ).to.be.eql { flow: "users", id: 1, present: true }
    
    it 'pick() should return { flow: "users", present: true } from { a: 1, view: {} }', ->
      expect( pick { a: 1, view: {} } ).to.be.eql { flow: "users", present: true }
    
    it 'pick() should return { flow: "users", present: true } from { a: 1 }', ->
      expect( pick { a: 1 } ).to.be.eql { flow: "users", present: true }
  
  describe 'From Array expression', ->
    it 'should return a pick() function from expression []', ->
      expect( pick = picker [] ).to.be.a Function
    
    it 'pick() should return an empty object', ->
      expect( pick {} ).to.be.eql {}
    
    it 'should return a Function from expression [ "id", "view.user_id" ]', ->
      pick = picker [ "id", "view.user_id" ]
      
      expect( pick ).to.be.a Function
    
    it 'pick() should return { id: 1, user_id: 5 } from { id: 1, view: { user_id: 5 }', ->
      expect( pick { id: 1, view: { user_id: 5 } } ).to.be.eql { id: 1, user_id: 5 }
    
    it 'pick() should return { id: 2 } from { id: 2, view: {} }', ->
      expect( pick { id: 2, view: {} } ).to.be.eql { id: 2 }
    
    it 'pick() should return { id: 3 } from { id: 3 }', ->
      expect( pick { id: 3 } ).to.be.eql { id: 3 }
