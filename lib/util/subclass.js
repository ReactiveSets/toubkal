/*  subclass.js

    The MIT License (MIT)

    Copyright (c) 2013-2015, Reactive Sets

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
  
  var create   = Object.create
    , extend_2 = extend._2
    , de       = true
    , ug       = Console_Logger().bind( null, 'subclass' );
  ;
  
  subclass( null, Root );
  
  subclass.Root = Root;
  subclass.make_constructor_apply = make_constructor_apply;
  
  de&&ug( 'module loaded' );
  
  return subclass;
  
  /* -------------------------------------------------------------------------------------------
     subclass( base, derived [, methods] )
     
     Creates a derived class from a base class.
     
     Parameters:
     - base (Function): Base class constructor, or null if this is a top class
     - derived (Function): Derived class constructor
     - methods:
       - (Object): methods and attributes for derived prototype
       - (Function): prototyper Function that returns a prototype Object as above, signature:
         methods( base.prototype )
     
     Returns derived altered properties:
     - prototype includes base.prototype at the top of its chain.
     - sublcass() a class method to derive from derived class
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
    
    return prototype.constructor = derived;
  } // subclass()
  
  function Root() {}
  
  /* -------------------------------------------------------------------------------------------
     make_constructor_apply( constructor )
     
     Transform a constructor into a constructor that can be called with an array instead of a
     parameter list.
     
     Example: make a person constructor that can be called with an Array
     
       function person( first_name, last_name ) {
         this.first_name = first_name;
         this.last_name = last_name;
         
         return this;
       }
       
       var person_apply = make_constructor_apply( person );
       
       var joe = new person_apply( [ 'Joe', 'Cash' ] );
       
       console.log( joe.first_name ) // displays Joe
  */
  function make_constructor_apply( constructor ) {
    function constructor_apply( a ) {
      var u;
      
      // Pretend this object was created using new constructor()
      this.constructor = constructor;

      // Call constructor as new would have
      var r = constructor.apply( this, a );

      // Return this if constructor did not return anything
      return r === u ? this: r;
    }
    
    constructor_apply.prototype = constructor.prototype;
    
    return constructor_apply;
  } // make_constructor_apply()
} ); // subclass.js
