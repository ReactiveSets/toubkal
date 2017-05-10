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
( 'picker', [ './code' ], function( Code ) {
  'use strict';
  
  var is_array = Code.is_array;
  
  return picker;
  
  /* --------------------------------------------------------------------------
      @function picker( expression )
      
      @short Returns a pure function to transform *Object* values.
      
      @parameters:
      - **expression**: describes returned *pick( value )* function behavior
        with the following specification:
        - (Object): each property defines the name of a property of
          objects returned by *pick( value )*:
          
          Each property value can be:
          - a string starting with the dot character describing a path in
            *value*.
            
            E.g. ```".view.user_id"``` to pick the value of *user_id*
            of property *view* in *value*.
            
            If an attribute is undefined the corresponding attribute
            is not included in the returned object.
            
            Null values are included.
          
          - any other value to define a static value, e.g. ```1```.
        
        - (Array): attributes names to pick. This form does not allow to
          set static values, only allowing to pick existing attribute values:
          - (String): attribute name which may describe a path in source
            value if it starts with a dot character (see above).
          
          - (Array):
            - 0 (String): output attribute name.
            - 1 (String): source attribute name or path description if it
              starts with a dot character (see above).
      
      @returns ```Function( Object ) -> Object```
      
      @examples:
      - Build pick() returning a static *flow* attribute with value "user",
        the *id* attribute picked from attribute ```view.user_id```, and
        a static *present* attribute with boolean value true:
        
        ```javascript
          var picker = RS.picker
            , pick   = picker( { flow: "users", id: ".view.user_id", present: true } )
          ;
          
          pick( { a: 1, view: { user_id: 1 } } ); // { flow: "users", id: 1, present: true }
          pick( { a: 1, view: {} } );             // { flow: "users", present: true }
          pick( { a: 1 } );                       // { flow: "users", present: true }
        ```
        Picker expression:
        
        ```javascript
          { flow: "users", id: ".view.user_id", present: true }
        ```
        
        Specifies that objects returned by *pick( value )* will have attributes:
        - **flow**: with string value ```"users"```.
        
        - **id**: which value will be picked in the attribute
          ```"user_id"``` in the Object attribute ```"view"``` of
          the source *Object*, unless an attribute is undefined.
        
        - **present**: with boolean value true.
      
      - Pick attributes *id*, and *user_id* from *view* Object, using
        *Array* form:
        ```javascript
          var pick = RS.picker( [ "id", "view.user_id" ] );
          
          pick( { id: 1, view: { user_id: 5 } } ); // { id: 1, user_id: 5 }
          pick( { id: 2, view: {} } );             // { id: 2 }
          pick( { id: 3 } );                       // { id: 3 }
        ```
      
      @see_also
      - Pipelet pick()
      - Pipelet filter_pick()
      - Pipelet trace()
      - Pipelet fetch_first()
  */
  function picker_array_to_object( attributes ) {
    var expression = {};
    
    attributes.forEach( function( attribute ) {
    
      if ( typeof attribute == 'string' )
        attribute = [ attribute.split( '.' ).pop(), attribute ];
      
      if ( is_array( attribute ) )
        expression[ attribute[ 0 ] ] = '.' + attribute[ 1 ];
    } )
    
    return expression;
  } // picker_array_to_object()
  
  function picker( expression ) {
    if ( is_array( expression ) )
      expression = picker_array_to_object( expression );
    
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
