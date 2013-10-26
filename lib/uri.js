/*  uri.js
    
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
  var XS = exports.XS || require( './pipelet.js' ).XS
    , xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , win32      = ( typeof process != 'undefined' && process.platform == 'win32' );
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs uri, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     to_uri()
     
     Transforms a file dataflow into a uri dataflow.
     
     Source dataflow attributes:
       - name: a file path, relative of absolute (absolute paths cannot be transformed to uri)
       
       - uri: an absolute uri to the ressource
       
       - other attributes
       
     Destionation dataflow attributes:
       - uri: an absolute uri to access the resource which is either the source
         uri of the file name transformed to an absolute uri
         
       - other attributes of the source dataflow except name
  */
  XS.Compose( 'to_uri', function( source, options ) {
    return source
      .alter( function( file ) {
        var u, name = file.name;
        
        delete file.name;
        
        if ( file.uri === u && name !== u ) {
          switch ( name.charAt( 0 ) ) {
            case '.':
              if ( name.charAt( 1 ) == '/' ) { // starts with ./
                name = name.substr( 2 );
              }
            break;
            
            default:
              if ( ! win32 || name.indexOf( ':' ) == -1 ) break;
            // pass-through
            case '/':
              de&&ug( 'to_uri(), cannot convert to uri absolute path "' + name + '"' );
              
              // ToDo: either send an error event or convert it to uri
            return; // cannot convert absolute path to uri
          }
          
          file.uri = '/' + name;
        }
      }, options )
    ;
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [] ) );
  
  de&&ug( "module loaded" );
} )( this ); // http.js
