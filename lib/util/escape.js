/*
    Copyright (c) 2013-2019, Reactive Sets

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
( 'escape', [ './javascript' ], function( javascript ) {
  'use strict';
  
  var is_string = javascript.is_string;
  
  /* --------------------------------------------------------------------------
      @function escape( character_class, replacer )( string )
      
      @manual programmer
      
      @short Escapes character_class in string
      
      @parameters
      - **character_class** \\<String>: RegExp character class to
        escape. Escape character "\\\\" will be added so there is
        no need to specify it, unless *replacer* is provided.
      
      - **replacer** \\<String>: optional replacer for ```string.replace()```.
        See [String..replace()](
          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
        )
      
      - **string** \\<String>: to escape
      
      @examples
      ```javascript
        var escape_double_quotes = escape( '"' );
        
        escape_double_quotes( 'this is a "string to quote"' );
        
        // returns 'this is a \\\\"string to quote\\\\"'
        
        var escape_bash_single_quotes = escape( "'", "'\\\\"'\\\\"'" );
        
        escape_bash_single_quotes( "this is \\\\ a 'string to escape'" )
        
        // returns "this is \\\\ a '\\\\"'\\\\"'string to escape'\\\\"'\\\\"'"
      ```
      
      @returns
      \\<String>: escaped string.
      
      @throws
      - if *character_class* or *string* parameter is not a \\<String>
      
      @description
      The escape() is a function that returns a function, hence
      the signature showing parameters not separated by commas but
      by an additional function call.
      
      The goal is to enable caching of the regular expression
      created from *character_class*.
  */
  return function( character_class, replacer ) {
    if ( ! is_string( character_class ) )
      throw( new Error(
        'excape() parameter must be string, found: ' + javascript.class_of( character_class )
      ) );
    
    var regular_expression
      = new RegExp( "[" + character_class + ( replacer ? "" : "\\\\" ) + "]", "g" )
    ;
    
    replacer = replacer || "\\$&";
    
    return function( string ) {
      
      return string.replace( regular_expression, replacer );
    }
  } // function excape()
} );
