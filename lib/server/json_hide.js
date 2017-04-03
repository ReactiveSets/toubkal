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
( 'json_hide', [ [ null, '../util/JSON_hide' ], '../core/pipelet' ], function( JSON_hide, rs ) {
  "use strict";
  
  return rs // only compositions beyond this line
  
  /* --------------------------------------------------------------------------
    @pipelet json_hide( attribute, options )
    
    @short Hide attribute values in downstream pipelets using [JSON.stringify()](
      https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
    )
    
    @parameters
    - **attribute** (String): optional attribute name which values should
    be an object containing properties to hide from ```JSON.stringify()```.
    Default is ```"credentials"```.
    
    - **options** (Object): optional @@pipelet:alter() options, plus:
      - **replacer** (String): optional replacer string to hide leaf values,
      default is ```"***"```.
    
    @examples
    ```javascript
      rs
        .set( [ { credentials: { password: "secret password" } } ] )
        .json_hide()
        .trace()
        .greedy()
      ;
      
      /* ------------------
        Displays to console:
        
        2017/04/03 21:29:20.149 - Trace( #129 )..fetched(),  {
          "operation": "add",
          "values": [
            {
              "credentials": {
                "password": "***"
              }
            }
          ],
          "destination": "Greedy.Input( greedy (at [eval]:1:79 ) #35 )",
          "query": [
            {}
          ],
          "query_changes": [
            [],
            [
              {}
            ]
          ]
        }
      *\/
    ```
    
    @description
    This is a @@stateless, @@greedy, @@synchronous, server-only pipelet.
    
    The main goal of this pipelet is to prevent writing clear
    credentials to logs generated using pipelet trace() as well as
    emitting clear credentials to clients using
    pipelet socket_io_clients() and accidentally leaking credientials
    out of the server.
    
    Uses @@function:JSON_hide() to set *non-enumerable, non-configurable,
    non-writable* object property ```toJSON()``` to values' attribute if
    not already defined.
    
    ```toJSON()``` returns a representation of object that hides leaf
    (non-Object and non-Array) attribute values by replacing them
    with ```options.replacer```, while preserving the structure of
    objects.
    
    ```toJSON()``` is used by ```JSON.stringify()``` to replace
    attribute values by an alternate reprentation.
    
    Pipelets using ```JSON.stringify()``` such as @@pipelet:trace()
    and @@pipelet:socket_io_clients() will not leak values of attributes
    protected by this pipelet.
    
    Requires **ECMAScript 5** for
    [Object.defineProperty](
      https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
    )
    and
    [Array.isArray](
      https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    )
    
    ### See Also
    - Pipelet trace()
    - Pipelet socket_io_clients()
    - Pipelet configuration()
    - Pipelet json_stringify()
    - Function @@function:JSON_hide()
  */
  .Compose( 'json_hide', function( source, attribute, options ) {
    attribute = attribute || 'credentials';
    
    var replacer = options.replacer;
    
    return source.alter( hide, options );
      
    function hide( value ) {
      JSON_hide( value[ attribute ], replacer )
    }
  } )
} );
