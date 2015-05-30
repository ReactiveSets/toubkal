/*  square.js // alter.js a template for compose alter-based pipelets
    
    Replace with your own licence bellow, default is AGPLv3
    
    Copyright (C) 2013, 2015, Reactive Sets

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

// Do not change the following line, it allows to work in the browser and Node.js
( this.undefine || require( 'undefine' )( module, require ) )

/*
   Provide browser options Object here if desired e.g. { global: true, no_conflict: true }
   
   For more information and other options, check https://www.npmjs.com/package/undefine
*/
()

/*
   AMD define( id, dependencies?, factory )
   
   - id is mandatory and must be this filename without the js extension
   - dependencies is an optional Array of strings for each dependency
   - factory is a function defining this module
   
   More information on AMD define: https://github.com/amdjs/amdjs-api/wiki/AMD
*/
( 'square', [ 'toubkal', './square' ], function( rs, square ) {
  'use strict';
  
  var RS      = rs.RS
    , Compose = RS.Pipelet.Compose
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'square' );
  
  /* -------------------------------------------------------------------------------------------
     square()
     
     Computes the square of 'root' attribute of values into 'square' attribute
  */
  Compose( 'square', function( source, options ) {
    return source.alter( function( value ) {
      try {
        value.square = square( value.root );
      } catch( e ) {
        log( 'Error while computing square of:', value.root );
        
        value.error = e;
      }
    } );
  } );
  
  de&&ug( "module loaded" );
  
  // This module exports a modified rs
  return rs;
} ); // square.js
