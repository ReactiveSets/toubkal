/*  selector.js

    ----

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
*/
"use strict";

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var log = XS.log;

  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs, " + m );
  } // ug()
  
  // is_DOM()
  // Test if it's a DOM element
  function is_DOM( node ){
    return (
         typeof HTMLElement === "object" ? node instanceof HTMLElement : node
      && typeof node === "object" && node.nodeType === 1 && typeof node.nodeName === "string"
    );
  } // is_DOM()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  
  eval( XS.export_code( 'XS', [ 'is_DOM' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // selector.js