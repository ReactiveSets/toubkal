/*  html_parse.js
    
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
  
  var rs          = exports.rs || require( 'toubkal/lib/core/pipelet.js' )
    , htmlparser2 = require( 'htmlparser2' )
    , parseDOM    = htmlparser2.parseDOM
    , RS          = rs.RS
    , Pipelet     = RS.Pipelet
    , extend_2    = RS.extend_2
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'html parse' );
  
  /* -------------------------------------------------------------------------------------------
     html_parse( options )
     
     parse an HTML string into a object tree, using module htmlparser2 ( https://github.com/fb55/htmlparser2 )
     
  */
  
  Pipelet.Compose( 'html_parse', function( source, options ) {
    return source.alter( function( value ) {
      var out = {};
      
      try {
        out.dom = parseDOM( value.content );
      } catch( e ) {
        out.error = e;
      }
      
      return extend_2( out, value );
    }, { no_clone: true } );
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  de&&ug( "module loaded" );
} ( this ); // html_parse.js
