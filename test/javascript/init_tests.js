/*
    init_tests.js

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

*/

( function( exports ) {
var xs = exports.XS.xs
  
  , $body           = document.body
  , $checkbox       = document.createElement( 'div' )
  , $drop_down      = document.createElement( 'div' )
  , $radio          = document.createElement( 'div' )
  , $checkbox_group = document.createElement( 'div' )
  , $form           = document.createElement( 'div' )
  
  , organizer       = [ { id: 'label' } ]
  
  , charts_source    = xs.order( organizer )
  , countries_source = xs.order( organizer )
  , religions_source = xs.order( organizer )
  , hobbies_source   = xs.order( organizer )
  , form_fields      = xs
      .set( [
          { order: 0, id: 'flow'   , type: 'hidden'   , value: 'user_profile' }
        , { order: 1, id: 'id'     , type: 'hidden'   , value: { type: 'UUID' } }
        , { order: 2, id: 'name'   , type: 'text'     , label: 'Full Name' , mandatory: true }
        , { order: 4, id: 'address', type: 'text_area', label: 'Address'   , mandatory: true, cols: 30, rows: 5 }
        
        // , { id: 'email', type: 'email', label: 'Email'     , mandatory: true }
        // , { id: 'phone', type: 'phone', label: 'Phone Number'     , mandatory: true }
        // , { id: 'gender', type: 'radio', label: 'Gender', mandatory: true, value: xs.set( [ { id: 0, label: 'Female', selected: true }, { id: 1, label: 'Male' } ] ).order( organizer ) }
        
        /*
        , { id: 'country', type: 'drop_down', label: 'Country', mandatory: true, value: xs.set( [
              { id: 1, label: "USA"        }
            , { id: 2, label: "Morocco"    }
            , { id: 3, label: "France"     }
            , { id: 4, label: "Japan"      }
            , { id: 5, label: "Spain"      }
            , { id: 6, label: "Portugal"   }
            , { id: 8, label: "Madagascar" }
          ] ).order( organizer ) }
          
        , { id: 'hobby', type: 'checkbox', label: 'Hobbies', value: xs.set( [
            , { id: 1, label: "Photography"            , selected: true }
            , { id: 2, label: "Fishing"                                 }
            , { id: 3, label: "Playing Computer Games"                  }
            , { id: 4, label: "Traveling"              , selected: true }
            , { id: 5, label: "Cooking"                                 }
            , { id: 6, label: "Stamp / Coin Collection", selected: true }
          ] ).order( organizer ) }
        */
      ] )
      
      .auto_increment( { attribute: 'order' } )
      
      .order( [ { id: 'order' } ] )
;

$checkbox.id       = 'charts';
$drop_down.id      = 'countries';
$radio.id          = 'religions';
$checkbox_group.id = 'hobbies';

$body.appendChild( $checkbox       );
$body.appendChild( $drop_down      );
$body.appendChild( $radio          );
$body.appendChild( $checkbox_group );
$body.appendChild( $form           );

exports.charts    = charts_source.checkbox( $checkbox, { label: 'Charts', control_name: 'charts', selected_value: false } );
exports.countries = countries_source.drop_down( $drop_down );
exports.religions = religions_source.radio( $radio );
exports.hobbies   = hobbies_source.checkbox_group( $checkbox_group );
exports.form      = xs.form( $form, 'user_profile', form_fields, {} );

exports.charts_source    = charts_source;
exports.countries_source = countries_source;
exports.religions_source = religions_source;
exports.hobbies_source   = hobbies_source;

exports.form_fields      = form_fields;

} ) ( this );