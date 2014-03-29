/*
    init_controls.js

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
  
  , organizer       = [ { id: 'label' } ]
  , checkbox_source = xs.order( organizer )
  , checkbox        = checkbox_source.checkbox( document.getElementById( 'checkbox' ), { label: 'Charts', name: 'charts', selected_value: false } )
;

exports.checkbox        = checkbox;
exports.checkbox_source = checkbox_source;

} ) ( this );