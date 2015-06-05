/*  value_equals.js
    
    The MIT License (MIT)
    
    Copyright (c) 2015, Reactive Sets
    
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
( 'value_equals', [], function() {
  'use strict';
  
  return equals;
  
  /* -------------------------------------------------------------------------------------------
     equals( a, b )
     
     Returns true is a is equal to b, false otherwise.
     
     Equality is defined recursively as:
       - Identical scalars, undefined, null, functions, using the strict equality operator "==="
       - Arrays with the same number of elements of "equal" value
       - Objects with the same number of attributes having "equal" values, not necessarily in
         the same order.
     
     ToDo: add tests for value_equals.
  */
  function equals( a, b ) {
    var i, p, keys;
    
    if ( a === b ) return true;
    
    if ( typeof a != 'object' || typeof b != 'object' ) return false;
    
    if ( a instanceof Array ) { // Test Arry first, for higher efficiency comparison
      if ( ! ( b instanceof Array ) ) return false;
      
      i = a.length;
      
      if ( i != b.length ) return false;
      
      while ( i-- ) {
        if ( ! equals( a[ i ], b[ i ] ) ) return false;
      }
    } else {
      keys = Object.keys( a )
        , i = keys.length
      ;
      
      // Properties order could be enforced, possibly using an option with 
      // if ( equals( keys, Object.keys( b ) ) return false
      
      if ( i != Object.keys( b ).length ) return false;
      
      while ( i-- ) {
        p = keys[ i ];
        
        // Undefined attribute values allowed and checked
        if ( ! equals( a[ p ], b[ p ] ) ) return false;
      }
    }
    
    return true;
  } // equals()
} ); // value_equals.js
