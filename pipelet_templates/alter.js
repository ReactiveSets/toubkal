/*  square.js // alter.js a template for compose alter-based pipelets
    
    Replace with your own licence bellow, default is AGPLv3
    
    Copyright (c) 2013-2016, Reactive Sets

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

/*
   The following line allows the module to be loaded universally in the browser and Node.js
   For browser-only modules it can be reduced to: this.undefine
   For Node.js-only modules it can be reduced to: require( 'undefine' )( module, require )
*/
( this.undefine || require( 'undefine' )( module, require ) )

/*
   Provide browser options Object here if desired e.g. ( { global: true, no_conflict: true } )
   
   For more information and other options, check https://www.npmjs.com/package/undefine
*/
()

/*
   AMD define call signature: ( id, dependencies?, factory )
   
   - id is mandatory and MUST be this filename without 'js' extension
   - dependencies is an optional Array of strings for each dependency
   - factory is a function defining this module
   
   More information on AMD define: https://github.com/amdjs/amdjs-api/wiki/AMD
   
   For more information and other options, check https://www.npmjs.com/package/undefine
*/
( 'square', [ 'toubkal', './square' ], function( rs, square ) {
  'use strict';
  
  var RS = rs.RS;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
     
     Set "de" to true to add log code.
     
     When "de" is false minifiers should elliminate all debugging code.
  */
  var de = false, ug = RS.log.bind( null, 'square' );
  
  /* -------------------------------------------------------------------------------------------
     square()
     
     Computes the square of 'root' attribute of values from upstream dataflow into 'square'
     attribute emitted to downstream dataflow
  */
  
  /*
     Compose( pipelet_name, function ) creates a new pipelet, which name is square()
     using function( source, options ) where source is a source dataflow and options
     are options for the square pipelet.
     
     Check Compose() documentation for options.
  */
  rs.Compose( 'square', function( source, options ) {
  
    // alter emits a modfied dataflow from the source dataflow
    return source.alter( function( value ) {
    
      // alter() provides shallow-cloned values from the source dataflow, preventing most upstream side-effects
      // modify this clone value in-place to provide the altered value
      
      // Do not try / catch unless there is a real possibility of exceptions
      try {
      
        // The square() function for this template is imported from a dependency it is purely functional
        
        value.square = square( value.root );
        
      } catch( e ) {
        de&&ug( 'Error while computing square of:', value.root );
        
        // Provide error "in-band", downstream
        value.error = e;
      }
      
      // Do not return anything, alter(), in this form, ignores returned values
      
    } /* Alter options here, check alter() documentation for details */ );
  } );
  
  de&&ug( "module loaded" );
  
  // This module re-exports rs, modified with the composed square() pipelet
  return rs;
} ); // square.js
