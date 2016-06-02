/*  picker.js

    The MIT License (MIT)

    Copyright (c) 2013-2016, Reactive Sets
    
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
( 'picker', function() {
  'use strict';
  
  return picker;
  
  /* --------------------------------------------------------------------------
      @function picker( expression )
      
      @short Builds a pick( object ) function from expression
      
      @parameters:
        - expression (Object): to build function pick( object ), see
          description bellow for details.
      
      @returns function( Object ) -> Object
      
      @example:
        ```javascript
        var pick = picker( { flow: 'users', id: '.view.user_id' } );
        
        pick( { a: 1, view: { user_id: 1 } } ); // { flow: 'users', id: 1 }
        ```
      
      @description:
        Returns a pure function to transform objects into other objects.
        
        The "expression" Object parameter describes what the returned
        pcik() function does with the following specification:
        
        Each attribute defines the name of an attribute in the Object
        returned by pick().
        
        The value of returned attributes is defined by either a static
        value of a string starting with the dot (".") character in which
        case is specifies a path into the pick() object parameter allowing
        to specify any value inside nested objects.
        
        If an attribute value is undefined (not present or which value
        is undefined) in the parameter object, the corresponding attribute
        is not included in the returned object. However, null values are
        included.
        
        In the above example, the expression:
        
          ```javascript
          { flow: 'users', id: '.view.user_id' }
          ```
        
        Specifies that objects returned by pick() will have:
          - a "flow" attribute with the string value "users"
          
          - an "id" attribute which value will be picked in the attribute
            "user_id" in the Object attribute "view" of the source Object,
            unless an attribute is undefined.
  */
  function picker( expression ) {
    // ToDo: compile expression into an optimized compiled function
    
    return pick;
    
    function pick( object ) {
      var p, v, a, ___, picked = {};
      
      for ( p in expression ) {
        v = expression[ p ];
        
        if ( typeof v == 'string' && v.charAt( 0 ) == '.' ) {
          a = object;
          
          v
            .split( '.' )
            
            .forEach( function( name ) { if ( name ) a = a ? a[ name ] : ___ } )
          ;
          
          if ( a === ___ ) continue;
          
          v = a;
        }
        
        picked[ p ] = v;
      }
      
      return picked;
    } // pick()
  } // picker()
} );
