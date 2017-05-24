/*  subclass.js

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
( 'subclass', [ '../util/console_logger', '../util/extend' ], function( Console_Logger, extend ) {
  'use strict';
  
  var extend_2 = extend._2
    , de       = false
    , ug       = Console_Logger().bind( null, 'subclass' );
  ;
  
  subclass( null, Root );
  
  subclass.Root = Root;
  //subclass.make_constructor_apply = make_constructor_apply;
  subclass.new_apply = new_apply;
  
  de&&ug( 'module loaded' );
  
  return subclass;
  
  /* -------------------------------------------------------------------------------------------
      @function subclass( base, derived [, methods] )
      
      @short Creates a derived class from a base class.
      
      @parameters:
      - base (Function): Base class constructor, or null if this is a top class
      - derived (Function): Derived class constructor
      - methods:
        - (Object): methods and attributes for derived prototype
        - (Function): prototyper Function that returns a prototype Object as above, signature:
          methods( base.prototype )
      
      @returns derived altered properties:
      - prototype includes base.prototype at the top of its chain.
      - sublcass() a class method to derive from derived class
      - parent_class: base
  */
  function subclass( base, derived, methods ) {
    var base_prototype, prototype;
    
    if ( base ) {
      base_prototype = base.prototype;
      
      derived.prototype = Object.create( base_prototype );
    }
    
    prototype = derived.prototype;
    
    if ( methods ) {
      if ( typeof methods == 'function' ) {
        // Methods is a function returning methods Object
        
        methods = methods( base_prototype );
      }
      
      extend_2( prototype, methods );
    }
    
    derived.subclass = function( derived, methods ) {
      return subclass( this, derived, methods );
    };
    
    derived.parent_class = base;
    
    return prototype.constructor = derived;
  } // subclass()
  
  function Root() {}
  
  /* -------------------------------------------------------------------------------------------
      @function new_apply( constructor, parameters )
      
      @short Create new instance of constructor applying array of parameters
      
      @description:
        Applies parameters provided as an Array to constructor, returning instance of
        constructor with behavior equivalent to the new operator which returns an instance or
        constructor() returned value if it is a non-null object.
        
        Uses Object.create(), shim not provided
      
      @parameters:
      - constructor (Function): a constructor function
      - parameters (Array): parameters to apply to constructor()
      
      @returns instance of constructor or non-null object returned by constructor()
      
      @example:
      ```javascript
        function Point( x, y ) {
          this.x = x
          this.y = y
        }
        
        var point = new_apply( constructor, [ 1, 2 ] ); // { x: 1, y: 2 }
        
        point instanceof Point; // true
      ```
      
      @manual internal
  */
  function new_apply( constructor, parameters ) {
    var object = Object.create( constructor.prototype )
      , result = constructor.apply( object, parameters )
    ;
    
    return typeof result == 'object' && result ? result : object;
  } // new_apply()
} ); // subclass.js
