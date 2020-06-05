/*  picker.js

    The MIT License (MIT)

    Copyright (c) 2013-2020, Reactive Sets
    
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
( 'picker', [ './javascript' ], function( javascript ) {
  'use strict';
  
  var is_string = javascript.is_string
    , is_array  = javascript.is_array
    , is_object = javascript.is_object
  ;
  
  picker.inverse            = inverse_picker;
  picker.inverse_expression = inverse_picker_expression;
  picker.filter_pick_keys   = filter_pick_keys;
  
  return picker;
  
  /* --------------------------------------------------------------------------
      @function picker( expression, options )
      
      @short Returns a pure function to transform *Object* values.
      
      @parameters
      - **expression**: describes returned *pick( value )* function behavior
        with the following specification:
        - (String): single attribute name to to pick.
        
        - (Object): each property defines the name of a property of
          objects returned by *pick( value )*:
          
          Each property value can be:
          - a string starting with the dot character describing a path in
            *value*.
            
            E.g. ```".view.user_id"``` to pick the value of *user_id*
            of property *view* in *value*.
            
            If an attribute is undefined the corresponding attribute
            is not included in the returned *Object value* - i.e.
            ```value.hasOwnProperty( attribute ) == false```.
            
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
      
      - **options** (Object): ignored if this is not a JavaScript *Object*,
        available options:
        - *allow_empty* (Boolean): default is *false*:
          - true: Allow returned *pick()* to return empty *Objects*
            ```{}```.
          
          - false: Returned *pick()* returns *undefined* instead of
            empty *Objects* ```{}```.
      
      @returns (Function( Object ) -> Object): pick( value ) to pick
      properties from value according to expression.
      
      @throws if expression is not a String, an Array, or an Object
      
      @examples
      - @@[Compose]method:Pipelet..Compose a @@greedy pipelet pick():
      
        ```javascript
        var picker = rs.RS.picker;
        
        rs.Compose( "pick", function( expression, options ) {
          return rs.map( picker( expression ), options )
        } )
        ```
      
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
      - Pipelet fetch()
      - Function inverse_picker_expression()
  */
  function picker_expression_to_object( attributes ) {
    if ( is_object( attributes ) ) return attributes;
    
    if ( is_string( attributes ) ) attributes = [ attributes ];
    
    if ( ! is_array( attributes ) )
      throw new Error( 'Expected String, Array or Object expression' )
    ;
    
    var expression = {};
    
    attributes.forEach( function( attribute ) {
      
      if ( is_string( attribute ) )
        attribute = [ attribute.split( '.' ).pop(), attribute ];
      
      if ( is_array( attribute ) )
        expression[ attribute[ 0 ] ] = '.' + attribute[ 1 ];
    } )
    
    return expression;
  } // picker_expression_to_object()
  
  function picker( _expression, options ) {
    var ___
      , allow_empty = is_object( options ) && options.allow_empty || ___
      , expression  = {}
      , p
      , v
    ;
    
    _expression = picker_expression_to_object( _expression );
    
    // ToDo: compile expression into an optimized compiled function
    
    // Pre-compute expression
    for ( p in _expression )
      if ( typeof ( v = _expression[ p ] ) == 'string' && v.charAt( 0 ) == '.' )
        expression[ p ] = { p: v.split( '.' ) }
      else
        expression[ p ] = { v: v }
    
    return pick;
    
    function pick( object ) {
      var p, v, path, i, name, picked = {}, has_property = allow_empty;
      
      for ( p in expression ) {
        v = expression[ p ];
        
        if ( path = v.p ) {
          // path
          for ( i = 0, v = object; ( name = path[ ++i ] ) && ( v = v[ name ] ); );
          
          if ( v === ___ ) continue
        
        } else
          // scalar value
          v = v.v;
        
        has_property = 1;
        
        picked[ p ] = v
      }
      
      return has_property && picked
    } // pick()
    
  } // picker()
  
  /* --------------------------------------------------------------------------
      @function inverse_picker_expression( expression )
      
      @short Returns inverse @@function:picker expression
      
      @parameters
      - **expression**: @@function:picker() expression to inverse.
        Specification:
        - (String): single attribute name to to pick.
        
        - (Object): each property defines the name of an expected property
          from a *value* in *pick( value )*:
          
          Each property value must be a string of more than one character
          starting with the dot character and having no other dot character.
          Any other property value is ignored.
          
          Examples:
          - ```{ id: ".user_id" }``` to specify attribute *user_id*:
            ```{ user_id: ".id" }```.
          
          - ```{ id: "user" }``` is ignored (value does not start with a
            dot character).
          
          - ```{ id: ".view.user_id }``` is ignored (value has more than
            one dot character).
        
        - (Array): attributes names to pick:
          - (String): attribute name. If it describes a path as interpreted
            by @@function:picker(), this attribute will be ignored. Examples:
            - ```[ "id" ]```, returns ```{ id: ".id" }```.
            
            - ```[ "user.id" ]``` returns *undefined*, ignored as it
              describes a path that cannot be inverted.
          
          - (Array):
            - 0 (String): source attribute name.
            - 1 (String): output attribute name, if it contains a path
              description as interpreted by @@function:picker(), this
              attribute will be ignored.
            
            Examples:
            - ```[ [ "id", "user_id" ] ]``` returns { user_id: ".id" }.
            
            - ```[ [ "id", "user.id" ] ]``` returns *undefined*, ignored as
              it describes a path that cannot be inverted.
      
      @returns
      - (Object): @@function:picker expression.
      
      - undefined: All attributes from *expression* were ignored.
      
      @throws if expression is not a String, an Array, or an Object
      
      @examples
      - @@[Compose]method:Pipelet..Compose a @@lazy pipelet filter_pick():
      
        ```javascript
        var RS                        = rs.RS
          , extend                    = RS.extend
          , picker                    = RS.picker
          , inverse_picker_expression = picker.inverse_expression
          , filter_pick_keys          = picker.filter_pick_keys
        ;
        
        rs.Compose( "filter_pick", function( parent, expression, options ) {
          var pick               = picker( expression )
            , inverse_expression = inverse_picker_expression( expression )
            , query_transform
            , filter_keys
          ;
          
          if ( inverse_expression ) {
            // query transform for lazy map()
            query_transform = picker( inverse_expression );
            
            // filter_keys for filter() lazy on map()
            filter_keys = filter_pick_keys( inverse_expression );
          }
          
          return rs
            .filter(
              parent.map( pick, { query_transform: query_transform } ),
              
              // make filter() lazy on map(), if possible
              extend( { filter_keys: filter_keys }, options )
            )
          ;
        } )
        ```
      
      - Build inverse *pick()* expression returning values with a *user_id*
        attribute picked from attribute *id* ignoring *flow* and *present*
        attribute of a @@function:picker() expression:
        
        ```javascript
          var expression         = { flow: "users", id: ".user_id", present: true }
            , picker             = RS.picker
            , inverse_expression = picker.inverse_expression( expression ) // { user_id: ".id" }
          ;
        ```
        
        Picker expression:
        
        ```javascript
          { flow: "users", id: ".user_id", present: true }
        ```
        
        Specifies that objects returned by
        ```inverse_picker_expression( { flow: "users", id: ".user_id", present: true } )( value )```
        will have attributes an *user_id* attribute picker from attribute *id*
        in *value*.
        
        While values returned by
        ```picker( picker.inverse_expression( { flow: "users", id: ".user_id", present: true } ) )( value )```
        will only have a *user_id* attribute if *value* has an *id* attribute,
        the *flow* and *present* parts of the expression cannot be inverted
        and are ignored.
      
      - Pick attributes *id*, and *user_id* using *Array* form:
        ```javascript
          RS.picker.inverse_expression( [ "id", "user_id" ] ); // { id: ".id", user_id: ".user_id" }
        ```
      
      - Pick attributes *id*, and *user_id* using *Array* form:
        ```javascript
          RS.picker.inverse_expression( [ "id", [ "user", "user_id" ] ] ); // { id: ".id", user_id: ".user" }
        ```
      
      @see_also
      - Function inverse_picker()
      - Function filter_pick_keys()
      - Function picker()
      - Pipelet pick()
      - Pipelet filter_pick()
  */
  function inverse_picker_expression( expression ) {
    var p, v, inverse_expression = {}, last_added;
    
    expression = picker_expression_to_object( expression );
    
    for ( p in expression )
      if ( typeof ( v = expression[ p ] ) == 'string'
        && v.length > 1
        && v.charAt( 0 ) == '.'
        && v.indexOf( '.', 1 ) == -1
      )
        // v designates a direct attribute name in destination
        inverse_expression[ last_added = v.slice( 1 ) ] = '.' + p
    
    return last_added && inverse_expression
  } // inverse_picker_expression()
  
  /* --------------------------------------------------------------------------
      @function filter_pick_keys( inverse_expression )
      
      @short Returns *filter_keys* option for pipelet filter_pick()
      
      @parameters
      - **inverse_expression** (Object): expression returned by
        @@function:inverse_picker_expression().
      
      @returns
      (Array of Strings): *filter_keys* options for pipelet filter().
      
      @examples
      See function inverse_picker_expression() example.
      
      @description
      This function is intended to build the *filter_keys* option for 
      the pipelet filter() of pipelet filter_pick() from a
      @@function:picker() expression returned by
      @@function:inverse_picker_expression().
  */
  function filter_pick_keys( inverse_expression ) {
    var filter_pick_keys = [], p;
    
    for ( p in inverse_expression )
      filter_pick_keys.push( inverse_expression[ p ].slice( 1 ) )
    
    return filter_pick_keys
  } // filter_pick_keys()
  
  /* --------------------------------------------------------------------------
      @function inverse_picker( expression, options )
      
      @short Returns an inverse pure function of function picker()
      
      @parameters
      - **expression**: describes returned *pick( value )* function behavior
        with the following specification that behaves as the inverse of
        a function returned by @@function:picker():
        - (Object): each property defines the name of an expected property
          from a *value* in *pick( value )*:
          
          Each property value can be:
          - a string of more than one character starting with the dot
            character and having no other dot character.
            
            E.g. ```".user_id"``` to return values with the attribute
            *user_id*.
            
            If the attribute is undefined the corresponding attribute
            is not included in the returned object.
            
            Null values are included.
          
          - any other value is ignored.
        
        - (Array): attributes names to pick:
          - (String): attribute name. If it describes a path as interpreted
            by @@function:picker(), this attribute will be ignored.
          
          - (Array):
            - 0 (String): source attribute name.
            - 1 (String): output attribute name, if it contains a path
              description as interpreted by @@function:picker(), this
              attribute will be ignored.
      
      - **options** (Object): @@function:picker() options.
      
      @returns
      - (Function): pick ```Function( Object ) -> Object```
      
      - undefined: @@function:inverse_picker_expression( *expression* )
        returned undefined.
      
      @examples
      - @@[Compose]method:Pipelet..Compose a @@lazy pipelet pick():
      
        ```javascript
        var picker         = rs.RS.picker
          , inverse_picker = picker.inverse
        ;
        
        rs.Compose( "pick", function( expression, options ) {
          return rs
            .map(
              picker( expression ),
              
              // make it lazy, if possible, inverse_picker() may be undefined
              { query_transform: inverse_picker( expression ) }
            )
        } )
        ```
      
      - Build *inverse_pick()* function returning values with a *user_id*
        attribute picked from attribute *id* ignoring *flow* and *present*
        attribute of a @@function:picker() expression:
        
        ```javascript
          var expression     = { flow: "users", id: ".user_id", present: true }
            , picker         = RS.picker
            , pick           = picker( expression )
            , inverse_picker = picker.inverse
            , inverse_pick   = inverse_picker( expression )
          ;
          
          pick( { a: 1, user_id: 1 } ); // { flow: "users", id: 1, present: true }
          pick( { a: 1 } );             // { flow: "users", present: true }
          
          inverse_pick( { flow: "users", id: 1, present: true } } ); // { user_id: 1 }
          inverse_pick( { flow: "users", present: true } );          // {}
        ```
        
        Picker expression:
        
        ```javascript
          { flow: "users", id: ".user_id", present: true }
        ```
        
        Specifies that values returned by
        ```picker.inverse( { flow: "users", id: ".user_id", present: true } )( value )```
        will only have a *user_id* attribute if *value* has an *id* attribute.
        The *flow* and *present* parts of the @@function:picker() expression
        cannot be inverted and are ignored.
      
      - Pick attributes *id*, and *user_id* from *view* Object, using
        *Array* form:
        ```javascript
          var expression   = [ "id", [ "user_id", "user" ] ]
            , inverse_pick = RS.picker.inverse( expression )
          ;
          
          inverse_pick( { flow: "profile", id: 1, user_id: 5 } ); // { id: 1, user: 5 }
          inverse_pick( { flow: "profile", id: 2 } );             // { id: 2 }
        ```
      
      @description
      This function is intended to build lazy pipelets such as
      @@pipelet:pick() as in the above example.
      
      Implements an equivalent to
      ```picker( inverse_picker_expression( expression ) )```.
      
      @see_also
      - Pipelet pick() uses this function to build its query transform.
      - Pipelet filter_pick().
      - Function inverse_picker_expression().
      - Function picker().
  */
  function inverse_picker( expression, options ) {
    expression = inverse_picker_expression( expression );
    
    return expression && picker( expression, options )
  } // inverse_picker()
} );
