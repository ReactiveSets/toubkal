/*  javascript.js

    The MIT License (MIT)

    Copyright (c) 2013-2017, Reactive Sets

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'javascript', function() {
  "use strict";
  
  var toString = {}.toString;
  
  return {
    is_object: is_object,
    is_array : Array.isArray || is_array,
    is_date  : is_date
  }
  
  /* --------------------------------------------------------------------------
      @function is_object( value ) -> Boolean
      
      @manual programmer
      
      @short Returns *true* if *value* is a non-*null* JavaScript *Object*
      
      @returns
      (Boolean):
      - *true*: *value* is a JavaScript *Object* and is not *null*
      - *false*: *value* is not a JavaScript *Object* or is *null*
      
      @examples
      ```javascript
      
      var is_object = rs.RS.is_object;
      
      is_object( {}        ); // true
      is_object( null      ); // false
      is_object( undefined ); // false
      is_object( []        ); // false
      is_object( true      ); // false
      is_object( 1         ); // false
      
      ```
      
      @see_also
      - Function is_array()
      - Function is_date()
  */
  function is_object( value ) {
    return toString.call( value ) == '[object Object]'
  } // is_object()
  
  /* -------------------------------------------------------------------------------------------
      @function is_array( value ) -> Boolean
      
      @manual programmer
      
      @short Returns *true* if *value* is a JavaScript *Array*
      
      @returns (Boolean):
      - *true*: *value* is a JavaScript *Array*
      - *false*: otherwise
      
      @examples
      ```javascript
      
      var is_array = rs.RS.is_array;
      
      is_array( []        ); // true
      is_array( [ 1, 2 ]  ); // true
      is_array( undefined ); // false
      is_array( null      ); // false
      is_array( true      ); // false
      is_array( 1         ); // false
      is_array( {}        ); // false
      
      ```
      
      @see_also
      - Function is_object()
      - Function is_date()
  */
  function is_array( value ) {
    return toString.call( value ) == '[object Array]';
  } // is_array()
  
  /* --------------------------------------------------------------------------
      @function is_date( value ) -> Boolean
      
      @manual programmer
      
      @short Returns *true* if *value* is a JavaScript *Date Object*
      
      @returns
      (Boolean):
      - true: *value* is a JavaScript *Date Object*
      - false: *value* is not a JavaScript *Date Object*
      
      @examples:
      ```javascript
      var is_date = rs.RS.is_date;
      
      is_date( new Date() ); // true
      is_date();             // false
      is_date( null );       // false
      is_date( {} );         // false
      is_date( [] );         // false

      ```
      
      @see_also
      - Function is_object()
      - Function is_array()
  */
  function is_date( value ) {
    return toString.call( value ) == '[object Date]'
  } // is_date()
} ); // code.js
