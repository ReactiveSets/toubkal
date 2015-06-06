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
  
  /* -----------------------------------------------------------------------------------------
     equals( a, b )
     
     Returns true if a and b are identical, false otherwise.
     
     Parameters:
       a (Any type): value to compare to b
       b (Any type): value compared to a
     
     Design Choices:
       'a' is considered equal to 'b' if all scalar values in a and b are strictly equal as
       compared with JavaScript operator '==='.
       
       This means that 0 and -0 are considered equal while this is not exactly the case.
       
       NaN is handled properly.
       
       If a and b are non-Array Objects, the order of occurence of attributes is considered
       irrelevant, e.g. { a: 1, b: 2 } is considered equal to { b: 2, a: 1 }.
       
       Cyclic objects are not supported out of performance considerations and will throw:
         RangeError: Maximum call stack size exceeded
  */
  function equals( a, b ) {
    if ( a === b ) return true; // strick equality, end of story, but note that 0 === -0
    
    return _equals( a, b );
    
    function _equals( a, b ) {
      var s, l, p, x, y;
      
      // NaN, the only value not equal to itself!
      if ( a !== a && b !== b ) return true;
      
      // They should have the same Object.toString() signature
      if ( ( s = toString.call( a ) ) !=  toString.call( b ) ) return false;
      
      switch( s ) {
        default:
          return a.valueOf() === b.valueOf();
        
        case '[object Number]':
          a = +a;
          b = +b;
          
          return a == b || ( a !== a && b !== b );
        
        case '[object RegExp]':
          return a.source   == b.source
            && a.global     == b.global
            && a.ignoreCase == b.ignoreCase
            && a.multiline  == b.multiline
            && a.lastIndex  == b.lastIndex
          ;
        
        case '[object Function]':
          return false; // functions should be strictly equal because of closure context
        
        case '[object Array]':
          if ( ( l = a.length ) != b.length ) return false;
          // Both have as many elements
          
          while ( l-- ) {
            if ( ( x = a[ l ] ) === ( y = b[ l ] ) || _equals( x, y ) ) continue;

            return false;
          }
          
          return true;
        // [object Array]
        
        case '[object Object]':
          l = 0; // counter of 'a' own properties
          
          for ( p in a ) {
            if ( a.hasOwnProperty( p ) ) {
              l += 1;
              
              if ( ( x = a[ p ] ) === ( y = b[ p ] ) || _equals( x, y ) ) continue;
              
              return false;
            }
          }
          
          // Check if 'b' has as many own properties as 'a'
          for ( p in b ) {
            if ( b.hasOwnProperty( p ) && --l < 0 ) return false;
          }
          
          return l == 0;
        // [object Object]
      } // switch toString.call( a )
    } // _equals()
  } // equals()
} ); // value_equals.js
