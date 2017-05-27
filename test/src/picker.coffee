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
    
    it 'pick() should return undefined from { a: 1, view: { user_id: 1 } }', ->
      expect( pick { a: 1, view: { user_id: 1 } } ).to.be undefined
    
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
    
    it 'pick() should return undefined from {}', ->
      expect( pick {} ).to.be undefined
    
    it 'should return a Function from expression [ "id", "view.user_id" ]', ->
      pick = picker [ "id", "view.user_id" ]
      
      expect( pick ).to.be.a Function
    
    it 'pick() should return { id: 1, user_id: 5 } from { id: 1, view: { user_id: 5 } }', ->
      expect( pick { id: 1, view: { user_id: 5 } } ).to.be.eql { id: 1, user_id: 5 }
    
    it 'pick() should return { id: 2 } from { id: 2, view: {} }', ->
      expect( pick { id: 2, view: {} } ).to.be.eql { id: 2 }
    
    it 'pick() should return { id: 3 } from { id: 3 }', ->
      expect( pick { id: 3 } ).to.be.eql { id: 3 }
    
    it 'pick() should return undefined from {}', ->
      expect( pick {} ).to.be undefined
    
    it 'should return a Function from expression [ "id", [ "user", "view.user_id" ] ]', ->
      pick = picker [ "id", [ "user", "view.user_id" ] ]
      
      expect( pick ).to.be.a Function
    
    it 'pick() should return { id: 1, user_id: 5 } from { id: 1, view: { user_id: 5 } }', ->
      expect( pick { id: 1, view: { user_id: 5 } } ).to.be.eql { id: 1, user: 5 }
    
    it 'pick() should return { id: 2 } from { id: 2, view: {} }', ->
      expect( pick { id: 2, view: {} } ).to.be.eql { id: 2 }
    
    it 'pick() should return { id: 3 } from { id: 3 }', ->
      expect( pick { id: 3 } ).to.be.eql { id: 3 }

describe 'RS.picker.inverse_expression()', ->
  inverse_picker_expression = picker.inverse_expression
  
  describe 'From Object expression', ->
    it 'should return undefined from expression {}', ->
      expect( inverse_picker_expression {} ).to.be undefined
    
    it 'should return undefined from expression { flow: "users", id: ".view.user_id", present: true }', ->
      expect( inverse_picker_expression { flow: "users", id: ".view.user_id", present: true } ).to.be undefined
    
    it 'should return { id: ".id", user_id: ".user" } from expression { id: ".id", user: ".user_id" }', ->
      expect( inverse_picker_expression { id: ".id", user: ".user_id" } ).to.be.eql { id: ".id", user_id: ".user" }
    
    it 'should return { id: ".id" } from expression { flow: "user", id: ".id", user: ".view.user_id" }', ->
      expect( inverse_picker_expression { flow: "user", id: ".id", user: ".view.user_id" } ).to.be.eql { id: ".id" }
  
  describe 'From Array expression', ->
    it 'should return undefined from expression []', ->
      expect( inverse_picker_expression [] ).to.be undefined
    
    it 'should return { id: ".id" } from expression [ "id", "view.user_id" ]', ->
      expect( inverse_picker_expression [ "id", "view.user_id" ] ).to.be.eql { id: ".id" }
    
    it 'should return a { id: ".id", user_id: ".user" } from expression [ "id", [ "user", "user_id" ] ]', ->
      expect( inverse_picker_expression [ "id", [ "user", "user_id" ] ] ).to.be.eql { id: ".id", user_id: ".user" }

describe 'RS.picker.filter_pick_keys()', ->
  inverse_picker_expression = picker.inverse_expression
  filter_pick_keys          = picker.filter_pick_keys
  
  describe 'From Object expression', ->
    it 'should return [ "id", "user" ] from piker expression { id: ".id", user: ".user_id" }', ->
      expect( filter_pick_keys inverse_picker_expression { id: ".id", user: ".user_id" } ).to.be.eql [ "id", "user" ]
    
    it 'should return [ "id" ] from picker expression { flow: "user", id: ".id", user: ".view.user_id" }', ->
      expect( filter_pick_keys inverse_picker_expression { flow: "user", id: ".id", user: ".view.user_id" } ).to.be.eql [ "id" ]
  
  describe 'From Array expression', ->
    it 'should return [ "id" ] from expression [ "id", "view.user_id" ]', ->
      expect( filter_pick_keys inverse_picker_expression [ "id", "view.user_id" ] ).to.be.eql [ "id" ]
    
    it 'should return a [ "id", "user" ] from expression [ "id", [ "user", "user_id" ] ]', ->
      expect( filter_pick_keys inverse_picker_expression [ "id", [ "user", "user_id" ] ] ).to.be.eql [ "id", "user" ]

describe 'RS.picker.inverse()', ->
  pick = null
  inverse_picker = picker.inverse
  
  describe 'From Object expression', ->
    it 'should return undefined from expression {}', ->
      expect( pick = inverse_picker {} ).to.be undefined
    
    it 'should return undefined from expression { flow: "users", id: ".view.user_id", present: true }', ->
      pick = inverse_picker { flow: "users", id: ".view.user_id", present: true }
      
      expect( pick ).to.be undefined
    
    it 'should return a pick function from expression { id: ".id", user: ".user_id" }', ->
      pick = inverse_picker { id: ".id", user: ".user_id" }
      
      expect( pick ).to.be.a Function
    
    it 'pick() should return { id: 1 } from { id: 1, user_id: 1 }', ->
      expect( pick { id: 1, user_id: 1 } ).to.be.eql { id: 1 }
    
    it 'pick() should return { user_id: 1 } from { user: 1, a: 1 }', ->
      expect( pick { user: 1, a: 1 } ).to.be.eql { user_id: 1 }
    
    it 'pick() should return { id: 2, user_id: 3 } from { id: 2, user: 3, a: 4 }', ->
      expect( pick { id: 2, user: 3, a: 4 } ).to.be.eql { id: 2, user_id: 3 }
  
  describe 'From Array expression', ->
    it 'should return undefined from expression []', ->
      expect( pick = inverse_picker [] ).to.be undefined
    
    it 'should return a pick function from expression [ "id", "view.user_id" ]', ->
      pick = inverse_picker [ "id", "view.user_id" ]
      
      expect( pick ).to.be.a Function
    
    it 'pick() should return { id: 1 } from { id: 1, user_id: 5 }', ->
      expect( pick { id: 1, user_id: 5 } ).to.be.eql { id: 1 }
    
    it 'pick() should return { id: 2 } from { id: 2 }', ->
      expect( pick { id: 2 } ).to.be.eql { id: 2 }
    
    it 'pick() should return undefined from {}', ->
      expect( pick {} ).to.be undefined
    
    it 'should return a Function from expression [ "id", [ "user", "user_id" ] ]', ->
      pick = inverse_picker [ "id", [ "user", "user_id" ] ]
      
      expect( pick ).to.be.a Function
    
    it 'pick() should return { id: 1, user_id: 5 } from { id: 1, user: 5, a: 1 }', ->
      expect( pick { id: 1, user: 5, a: 1 } ).to.be.eql { id: 1, user_id: 5 }
    
    it 'pick() should return { id: 2 } from { id: 2 }', ->
      expect( pick { id: 2 } ).to.be.eql { id: 2 }
