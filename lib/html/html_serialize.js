/*  html_serialize.js
    
    ----
    
    Copyright (C) 2013, 2014, Reactive Sets

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
!function( exports ) {
  "use strict";
  
  var rs        = exports.rs || require( 'toubkal/lib/core/pipelet.js' )
    , serialize = require( 'htmlparser2/node_modules/domutils' ).getOuterHTML // ToDo: allow client-side
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = rs.RS.log.bind( null, 'html_serialize' );
  
  /* -------------------------------------------------------------------------------------------
     html_serialize( options )
     
     serialize an htmlparse2 object into HTML string using getOuterHTML() function from htmlparser2/domutils
     
  */
  rs.Compose( 'html_serialize', function( source, options ) {
    return source.alter( function( value ) {
      try {
        de&&ug( value.dom );
        
        value.content = serialize( value.dom );
      } catch( e ) {
        value.error   = e;
        value.content = null;
      }
    } );
  } ); // html_serialize()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  de&&ug( "module loaded" );
} ( this ); // html_serialize.js
