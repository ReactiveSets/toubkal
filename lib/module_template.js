/*  pipelet_name.js
    
    ----
    
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
"use strict";

!function( exports ) {
  var XS = exports.XS;
  
  if ( ! XS ) {
    // Should be under node, unless missing pipelet.js script prior to this one
    XS = require( './pipelet.js' ).XS;
    
    // Require other xs modules
    require( './code.js'    );
  }
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Code       = XS.Code
    , Pipelet    = XS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs pipelet_name, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Pipelet_Name( parameter_1, options )
  */
  function Pipelet_Name( parameter_1, options ) {
    Pipelet.call( this, options );
    
    return this;
  } // Pipelet_Name()
  
  /* -------------------------------------------------------------------------------------------
     .pipelet_name( parameter_1, options )
  */
  Pipelet.Build( 'pipelet_name', Pipelet_Name, {
  } ); // Pipelet_Name instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Pipelet_Name' ] ) );
  
  de&&ug( "module loaded" );
} ( this ); // pipelet_name.js
