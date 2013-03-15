###
    xs_control_tests.coffee

    Copyright (C) 2013, Connected Sets

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
# xs control unit test suite
# ------------------------

# include modules
XS = if require? then ( require '../lib/xs.js' ).XS else this.XS

if require?
  require '../lib/code.js'
  require '../lib/pipelet.js'
  require '../lib/filter.js'
  require '../lib/order.js'
  require '../lib/aggregate.js'
  require '../lib/table.js'
  require '../lib/form.js'

chai = require 'chai' if require?
chai?.should()

xs = XS.xs

fields = xs.set( [
  { id: 'model', name: 'model' , type: 'hidden', value: 'user_profile' }
  { id: 'id'   , name: 'uuid', type: 'hidden', value: { type: 'UUID' } }
  { id: 'gender', name: 'gender', type: 'radio', label: 'Gender', values: [
    { value: 0, label: 'Female', selected: true }
    { value: 1, label: 'Male' }
  ], mandatory: true }
  { id: 'name' , name: 'name' , type: 'text' , label: 'Full Name' , mandatory: true }
  { id: 'email', name: 'email', type: 'email', label: 'Email'     , mandatory: true }
  { id: 'phone', name: 'phone', type: 'phone', label: 'Phone Number'     , mandatory: true }
  { id: 'address', name: 'address', type: 'text_area', label: 'Address', cols: 30, rows: 5, mandatory: true }
  { id: 'country', name: 'country', type: 'drop_down', label: 'Country', values: [
    { value: 1, label: "USA"        }
    { value: 2, label: "Morocco"    }
    { value: 3, label: "France"     }
    { value: 4, label: "Japan"      }
    { value: 5, label: "Spain"      }
    { value: 6, label: "Portugal"   }
    { value: 8, label: "Madagascar" }
  ], mandatory: true }
  { id: 'hobby', name: 'hobby', type: 'checkbox', label: 'Hobbies', values: [
      { value: 1, label: "Photography"            , selected: true }
      { value: 2, label: "Fishing"                                 }
      { value: 3, label: "Playing Computer Games"                  }
      { value: 4, label: "Traveling"              , selected: true }
      { value: 5, label: "Cooking"                                 }
      { value: 6, label: "Stamp / Coin Collection", selected: true }
    ]
  }
], { name: 'Fields Set', auto_increment: 'order' } ).order( [ { id: 'order' } ] )

form = xs.form( document.getElementById( 'form' ), 'user_profile', fields )
