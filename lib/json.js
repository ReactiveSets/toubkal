/*  json.js
    
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
    XS = require( './pipelet.js' ).XS;
    
    require( './code.js'    );
  } else {
    XS = exports.XS;
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
    log( "xs json, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     source.parse_JSON( options )
     
     Parses one JSON content field from a dataflow.
     
     If there is a parsing error, the destination field will containt a value with these
     attributes:
       - flow: 'json_parse_error'
       - error: (String) the error message
     
     Parameters:
       - options: (Object) optional, attributes:
         - source_field: (String) the name of the source field to parse, defaults to 'content'
         - destination_field: (String) the name of the parsed field, defaults to 'source_field'
  */
  function Parse_JSON( options ) {
    Pipelet.call( this, options );
    
    this.source_field = options.source_field || 'content';
    
    this.destination_field = options.destination_field || this.source_field;
    
    return this;
  } // Parse_JSON()
  
  /* -------------------------------------------------------------------------------------------
     source.parse_JSON( options )
  */
  Pipelet.build( 'parse_JSON', Parse_JSON, {
    transform: function( values ) {
      var source_field = this.source_field
        , destination_field = this.destination_field
        , out = []
        , l = values.length
      ;
      
      for ( var i = -1; ++i < l; ) {
        var v = extend( {}, values[ i ] );
        
        out.push( v );
        
        try {
          v[ destination_field ] = JSON.parse( v[ source_field ] );
        } catch( e ) {
          // ToDo: send to a global exception dataflow
          
          v[ destination_field ] = { flow: 'json_parse_error', error: '' + e };
        }
      }
      
      return out;
    }
  } ); // Parse_JSON instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Parse_JSON' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // json.js
