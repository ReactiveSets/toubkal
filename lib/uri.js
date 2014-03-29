/*  uri.js
    
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

( function( exports ) {
  var XS      = exports.XS || require( './pipelet.js' ).XS
    , xs      = XS.xs
    , log     = XS.log
    , Pipelet = XS.Pipelet
    , win32   = ( typeof process != 'undefined' && process.platform == 'win32' );
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
       - path: a file path, relative of absolute (absolute paths cannot be transformed to uri)
       
       - uri: an absolute uri to the ressource
       
       - other attributes
       
     Destination dataflow attributes:
       - uri: an absolute uri to access the resource which is either the source
         uri of the file path transformed to an absolute uri
         
       - other attributes of the source dataflow except path
  */
  Pipelet.Compose( 'to_uri', function( source, options ) {
    return source
      .alter( function( file ) {
        var _, path = file.path;
        
        delete file.path;
        
        if ( file.uri === _ && path !== _ ) {
          switch ( path.charAt( 0 ) ) {
            case '.':
              if ( path.charAt( 1 ) == '/' ) { // starts with ./
                path = path.substr( 2 );
              }
            break;
            
            default:
              if ( ! win32 || path.indexOf( ':' ) == -1 ) break;
            // pass-through
            case '/':
              de&&ug( 'to_uri(), cannot convert to uri absolute path "' + path + '"' );
              
              // ToDo: either send an error event or convert it to uri
            return; // cannot convert absolute path to uri
          }
          
          file.uri = '/' + path;
        }
      }, options )
    ;
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  de&&ug( "module loaded" );
} )( this ); // http.js
