/*  attribute_x_value.js

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

!function( exports ) {
  var XS = exports.XS;
  
  if ( ! XS ) {
    XS = require( './pipelet.js' ).XS;
  }
  
  var xs = XS.xs
    , extend = XS.extend
    , log = XS.log
    , Compose = XS.Compose
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;

  function ug( m ) {
    log( "xs attribute_x_value, " + m );
  } // ug()

  // ToDo: define tests for attribute_to_value() and value_to_attribute()
  Compose( 'attribute_to_value', function( source, options ) {
    var attribute_name = ( options && options.attribute_name ) || 'content';
    
    return source.alter( function( value ) {
      return value[ attribute_name ];
    } );
  } );
  
  Compose( 'value_to_attribute', function( source, options ) {
    options || ( options = {} );
    
    var attribute_name = options.attribute_name || 'content'
      , defaults = options.defaults || {}
    ;
    
    return source.alter( function( value ) {
      var v = extend( {}, defaults );
      
      v[ attribute_name ] = value;
      
      return v;
    } );
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [] ) );
  
  de&&ug( "module loaded" );
}( this );
