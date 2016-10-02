/*  uri.js
    
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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'uri', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS          = rs.RS
    , extend_2    = RS.extend._2
    , path_to_uri = RS.path_to_uri
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet to_uri( options )
      
      @short Convert ```"path"``` attribute to ```"uri"```, if possible
      
      @description
      If source value already contains a uri, no conversion is attempted and
      value is emitted even is ```"path"``` attribute is missing.
      
      Does not emit values for paths for which uri cannot be determined,
      either because source attribute ```"path"``` is missing or empty,
      of if it is an absolute path.
      
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
      ### Source attributes
      - path (String): a file path, relative of absolute (absolute paths cannot be transformed to uri)
      - uri (String): an absolute uri to the ressource
      - other attributes
      
      ### Destination attributes
      - uri (String): an absolute uri to access the resource which is either the source
        uri of the file path transformed to an absolute uri
      - other attributes of the source dataflow
      
      ### See Also
      - Pipelet serve()
  */
  rs.Compose( 'to_uri', function( source, options ) {
    return source
      .map( function( file ) {
        var path = file.path
          , uri
        ;
        
        if( ! file.uri ) {
          if( path ) {
            file = extend_2( {}, file );
            
            uri = path_to_uri( path );
          }
          
          if( ! uri ) return;
          
          file.uri = uri;
        }
        
        return file;
      }, options )
    ;
  } ); // to_uri()
  
  return rs;
} ); // uri.js
