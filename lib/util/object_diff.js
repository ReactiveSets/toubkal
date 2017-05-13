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
      @function object_diff( old_value, new_value, set, remove )
      
      @short Walk through differences of object attributes
      
      @examples
      ```javascript
      rs.RS.object_diff( { a: 1, b: 1, d: 1 }, { a: 1, c: 1, d: 2 }, set, remove );
      
      function set( property, new_value, old_value ) {
        console.log( 'set', property, new_value, old_value );
      }
      
      function remove( property, old_value ) {
        console.log( 'remove', property, old_value );
      }
      
      // remove b 1
      // set c 1
      // set d 2 1
      
      ```
      @parameters
      - **new_value** (Object): optional, new value to compare with *old_value*.
      
      - **old_value** (Object): optional, old value to compare with *new_value*.
      
      - **set** (Function): optional, set property value that was
        either not present or has or has changed, signature:
        *set( property, new_value, old_value )*:
        - **property** (String): the name of property to set.
        
        - **new_value**: new property value.
        
        - **old_value**: optional, old property value if any.
      
      - **remove** (Function): optional, to remove property value found
        in *old_value* Object and not found in *new_value* Object. Signature:
        *remove( property, old_value )*:
        - **property** (String): name of removed property.
        
        - **old_value**: old property value.
  */
  function object_diff( old_value, new_value, set, remove ) {
    remove && old_value && Object.keys( old_value ).forEach( function( p ) {
      new_value && new_value.hasOwnProperty( p ) || remove( p, old_value[ p ] )
    } );
    
    set && new_value && Object.keys( new_value ).forEach( function( p ) {
      old_value && value_equals( new_value[ p ], old_value[ p ] ) || set( p, new_value[ p ], old_value && old_value[ p ] )
    } );
  } // object_diff()
} ); // object_diff.js
