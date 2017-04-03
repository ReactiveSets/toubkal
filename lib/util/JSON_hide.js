/*
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
( 'JSON_hide', function() {
  "use strict";
  
  return JSON_hide;
  
  /* --------------------------------------------------------------------------
    @function JSON_hide( object, replacer )
    
    @short Hide object leaf attribute values from JSON.stringify()
    
    @parameters
    - **object**:
      - (Object): which propeties will be hidden from ```JSON.stringify()```
      - (other type or ```null``` or object already has a ```toJSON```
      property): do not attempt to add ```toJSON()``` property.
    
    - **replacer** (String): optional replacer string to hide leaf values,
    default is ```"***"```.
    
    @returns object: with added ```toJSON()``` property.
    
    @examples
    ```javascript
      var JSON_hide = require( 'toubkal/lib/util/JSON_hide' );
      
      var o = { a: 1, b: [ 1, 2, { c: "c" } ] };
      
      JSON_hide( o );
      
      console.log( JSON.stringify( o ) );
      
      // Displays to console:
      //   {"a":"***","b":["***","***",{"c":"***"}]}
    ```
    
    @description
    The main goal of this function is to prevent accidentally writing
    credentials to logs generated using ```JSON.stringify()``` as well as
    transport mechanisms relying on ```JSON.stringify()``` from accidentally
    leaking credientials out of a server.
    
    Sets non-enumerable, non-configurable, non-writable object property
    ```toJSON()``` to ```object``` if not already defined.
    
    ```toJSON()``` returns a representation of object that hides leaf
    (non-Object and non-Array) attribute values by replacing them
    with ```replacer```, but preserves the structure of objects.
    
    Requires **ECMAScript 5** for
    [Object.defineProperty](
      https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    )
    and
    [Array.isArray](
      https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    )
    
    ### See Also
    - Pipelet configuration()
    - Pipelet trace()
    - Pipelet json_stringify()
  */
  function JSON_hide( object, replacer ) {
    replacer = replacer || "***";
    
    if ( object && typeof object == 'object' && ! object.toJSON ) {
      var hidden = hide( object );
      
      Object.defineProperty( object, 'toJSON', { value: toJSON } );
    }
    
    return object;
    
    function toJSON() {
      return hide( object )
    }
    
    function hide( value ) {
      if ( Array.isArray( value ) ) return value.map( hide );
      
      if ( typeof value != 'object' ) return replacer;
      
      var o = {}
        , p
      ;
      
      for ( p in value ) o[ p ] = hide( value[ p ] );
      
      return o;
    } // hide()
  } // JSON_hide()
} );
