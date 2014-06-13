###
    xs_control_tests.coffee

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
# xs control unit test suite
# ------------------------

# include modules
XS = if require? then ( require '../../lib/xs.js' ).XS else this.XS

if require?
  require '../../lib/code.js'
  require '../../lib/pipelet.js'
  require '../../lib/filter.js'
  require '../../lib/order.js'
  require '../../lib/aggregate.js'
  require '../../lib/table.js'
  require '../../lib/form.js'

xs = XS.xs

organizer = xs.set( [ id: 'label' ] )

validate_name = ( value, field ) ->
  r = { valid: true, message: 'Valide' }
  
  r = { valid: false, message: field.label + ' is empty' } if value is ''
  
  return r

fields = xs
  .set(
    [
      { id: 'flow', type: 'hidden', value: 'user_profile' }
      
      { id: 'id'   , type: 'hidden', value: { type: 'UUID' } }
      
      { id: 'gender', type: 'radio', label: 'Gender', mandatory: true, value: xs.set( [
          { id: 0, label: 'Female', selected: true }
          { id: 1, label: 'Male' }
        ] ).order( organizer )
      }
      
      { id: 'name' , type: 'text' , label: 'Full Name' , validate: validate_name, mandatory: true }
      
      { id: 'email', type: 'email', label: 'Email'     , mandatory: true }
      
      { id: 'phone', type: 'phone', label: 'Phone Number'     , mandatory: true }
      
      { id: 'address', type: 'text_area', label: 'Address', cols: 30, rows: 5, mandatory: true }
      
      { id: 'country', type: 'drop_down', label: 'Country', mandatory: true, value: xs.set( [
          { id: 1, label: "USA"        }
          { id: 2, label: "Morocco"    }
          { id: 3, label: "France"     }
          { id: 4, label: "Japan"      }
          { id: 5, label: "Spain"      }
          { id: 6, label: "Portugal"   }
          { id: 8, label: "Madagascar" }
        ] ).order( organizer )
      }
      
      { id: 'hobby', type: 'checkbox', label: 'Hobbies', value: xs.set( [
          { id: 1, label: "Photography"            , selected: true }
          { id: 2, label: "Fishing"                                 }
          { id: 3, label: "Playing Computer Games"                  }
          { id: 4, label: "Traveling"              , selected: true }
          { id: 5, label: "Cooking"                                 }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
        ] ).order( organizer )
      }
    ],
    
    { name: 'Fields Set' }
  )
  .auto_increment( { attribute: 'order' } )
  
  .order( [ { id: 'order' } ] )

xs.form( document.getElementById( 'form' ), 'user_profile', fields )
  .socket_io_server()
