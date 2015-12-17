/*  url_pattern.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
( 'url_pattern', [ '../core/pipelet', [ 'UrlPattern', 'url-pattern' ] ], function( rs, Url_Pattern ) {
  'use strict';
  
  var RS     = rs.RS
    , extend = RS.extend
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'url pattern' );
  
  /* -------------------------------------------------------------------------------------------
     source.url_pattern( attribute, pattern, options )
     
     Match pattern against string from input.
     
     Return the extracted values if it matches or null otherwise.
     
     For details: https://github.com/snd/url-pattern
     
     Parameters:
     - attribute : the attribute name to parse, default 'url'
     
     - pattern : 
     
     - options :
     
     Example: 
     
     
  */
  var toString = Object.prototype.toString
    , slice    =  Array.prototype.slice
  ;
  
  rs.Compose( 'url_pattern', function( source, attribute, pattern, options ) {
    var pattern_string, pattern_options;
    
    // set attribute default value to url
    if( ! attribute ) attribute = 'url';
    
    var type = toString.call( pattern );
    
    switch( type ) {
      case '[object Array]'  :
        var regexp = slice.call( pattern, 1 );
        
        if( toString.call( regexp ) === '[object RegExp]' ) {
          pattern = new Url_Pattern( regexp, slice.call( pattern, 2 ) );
        } else {
          this._error(
            'url_pattern() composition',
            'first element of Array must be a regular expression, found: ' + toString.call( regexp )
          ); // this._error()
        }
      break;
      
      case '[object String]' :
        pattern = new Url_Pattern( pattern, options );
      break;
      
      default: this._error( 'url_pattern() composition', 'pattern must be a String or Array, found: ' + type );
    } // switch()
    
    return source
      .map( function( value ) {
        var v = pattern.match( value[ attribute ] );
        
        if( v ) return extend( {}, value, v )
      } )
    ;
  } ); // url_pattern()
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // url_pattern.js
