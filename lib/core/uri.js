/*  uri.js
    
    Copyright (c) 2013-2017, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'uri', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , extend_2 = RS.extend._2
    , win32    = RS.win32
  ;
  
  RS.path_to_uri = path_to_uri;
  
  function path_to_uri( path ) {
    path = path || '';
    
    if( win32 ) path = path.replace( /\\/g, '/' );
    
    switch ( path.charAt( 0 ) ) {
      case '.':
        if( path.charAt( 1 ) == '/' ) // starts with ./
          path = path.substr( 2 )
        
      break;
      
      default:
        if ( ! win32 || path.indexOf( ':' ) == -1 ) break;
      // pass-through
      case '/':
      // Absolute path
      return // cannot convert to uri an absolute path
    }
    
    return '/' + path;
  } // path_to_uri()
  
  /* --------------------------------------------------------------------------
      @pipelet to_uri( options )
      
      @short Converts file *path* source attribute to *uri*, when possible
      
      @parameters
      - **options** (Object): @@class:Pipelet options.
      
      @source
      - **path** (String): optional file path, relative or absolute
        (absolute paths cannot be transformed to uri). Win32 paths
        are supported on *Node.js* for *Windows*.
      
      - **uri** (String): optional uri to the ressource
      
      @emits
      - **uri** (String): uri to access the resource which is
        either the source *uri* or source *path* transformed to an
        absolute uri.
      
      - all other source attributes
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
      If source value already contains a *uri*, no conversion is attempted
      and value is emitted even if the *path* attribute is missing.
      
      Does not emit values for paths for which uri cannot be determined,
      either because *path* source attribute is missing or empty,
      of if it is an absolute path.
      
      When used on the server, to transform absolute paths to relative paths
      use pipelet path_relative() before *to_uri()*:
      
      ```javascript
        source
          .path_relative( from )
          .to_uri()
        ;
      ```
      
      @see_also
      - Pipelet serve()
  */
  return rs.Compose( 'to_uri', function( source, options ) {
    return source
      .map( function( file ) {
        var path
          , uri
        ;
        
        if ( ! file.uri ) {
          if ( path = file.path ) uri = path_to_uri( path );
          
          if ( ! uri ) return; // does not emit a value
          
          file = extend_2( {}, file );
          
          file.uri = uri
        }
        
        return file
      }, options )
  } ) // to_uri()
} ); // uri.js
