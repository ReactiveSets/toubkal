/*  object_diff.js
    
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
( 'object_diff', [ './value_equals' ], function( value_equals ) {
  'use strict';
  
  return object_diff;
  
  /* --------------------------------------------------------------------------
      @function object_diff( added, removed, set, remove )
      
      @short Walk through differences of object attributes
      
      @examples
      ```javascript
      rs.RS.object_diff( { a: 1, c: 1, d: 2 }, { a: 1, b: 1, d: 1 }, set, remove );
      
      function set( property, added, removed ) {
        console.log( 'set', property, added, removed );
      }
      
      function remove( property, removed ) {
        console.log( 'remove', property, removed );
      }
      
      // remove b 1
      // set c 1
      // set d 2 1
      
      ```
      @parameters
      - **added** (Object): optional new value.
      
      - **removed** (Object): optional old value.
      
      - **set** (Function): optional, set new property value that was
        either not present or has or has changed, signature:
        *set( property, added, removed )*:
        - **property** (String): the name of the property set.
        
        - **added**: added property value.
        
        - **removed**: optional, old property value if any.
      
      - **remove** (Function): optional, to remove property value found
        in *removed* Object and not found in *added* Object. Signature:
        *remove( property, removed )*:
        - **property** (String): the name of the property removed.
        
        - **removed**: removed property value.
  */
  function object_diff( added, removed, set, remove ) {
    remove && removed && Object.keys( removed ).forEach( function( p ) {
      added && added.hasOwnProperty( p ) || remove( p, removed[ p ] )
    } );
    
    set && added && Object.keys( added ).forEach( function( p ) {
      removed && value_equals( added[ p ], removed[ p ] ) || set( p, added[ p ], removed && removed[ p ] )
    } );
  } // object_diff()
} ); // object_diff.js
