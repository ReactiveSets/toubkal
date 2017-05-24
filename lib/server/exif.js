/*  exif.js
    
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
'use strict';

var piexif     = require( 'piexifjs' )
  , rs         = require( '../core/pipelet.js' )
;

module.exports = rs

  /* --------------------------------------------------------------------------
      @pipelet piexif_parse( options )
      
      @short Parses content EXIF using the piexifjs library
      
      @parameters:
        - options (Object): pipelet options
      
      @source:
        - content (String or Buffer): image content optionally containing EXIF
        - encoding (String): content encoding, no value means content is a
          buffer, prefers "binary"
      
      @emits: all source attributes plus:
        - exif (Object): parsed EXIF data, if any
      
      @description:
        This is a @@stateless, @@synchronous, @@greedy pipelet.
  */
  .Compose( 'piexif_parse', function( source, options ) {
    return source
      .alter( function( _ ) {
        var content = _.content;
        
        if ( _.encoding != 'binary' )
          content = content.toString( 'binary' )
        ;
        
        try {
          _.exif = piexif.load( content );
        } catch( e ) {}
      }, options )
  } ) // piexif_parse()
  
  /* --------------------------------------------------------------------------
      @pipelet piexif_insert( options )
      
      @short Inserts EXIF into content, using the piexifjs library
      
      @parameters:
        - options (Object): pipelet options
      
      @source:
        - content (String or Buffer): image content
        - encoding (String): content encoding, no value means content is a
          Buffer, prefers "binary"
        - exif (Object): EXIF data
      
      @emits: all source attributes plus:
        - content  (String): content with inserted EXIF data
        - encoding (String): "binary"
      
      @description:
        This is a @@stateless, @@synchronous, @@greedy pipelet.
  */
  .Compose( 'piexif_insert', function( source, options ) {
    return source
      .alter( function( _ ) {
        var exif = piexif.dump( _.exif );
        
        if ( _.encoding != 'binary' )
          _.content = _.content.toString( _.encoding = 'binary' )
        ;
        
        piexif.insert( exif, _.content );
      }, options )
    ;
  } ) // piexif_insert()
;
