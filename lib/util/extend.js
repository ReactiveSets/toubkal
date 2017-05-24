/*  extend.js
    
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
( 'extend', [ './lazy_logger' ], function( Lazy_Logger ) {
  'use strict';
  
  // ToDo: rename module to something less generic, to prevent collisions with other extend() modules
  var logger   = Lazy_Logger( 'extend' )
    , log      = logger.set_log_level( 5 ) // set to false to remove all log code after minification
    , toString = Object.prototype.toString
  ;
  
  return set();
  
  /* -------------------------------------------------------------------------------------------
     extend   ( destination [, source [, source ... ] ] )
     extend._2( destination [, source ] )
     
       Shallow copy properties of source objects to a destination object.
       
       extend._2() is an optimized version of extend() that requires one non-null destination and
       one optional source object.
       
       Parameters:
         destination: returned object that will be augmented or ammended from source object
           own properties.
           With extend(): if null or undefined, destination will be set to a new object.
           With extend._2(): destination must be a non-null object or an exception will be thrown.

         source: object(s) which own properties are copied into destination.
           With extend(): If null or undefined, source is ignored
           With extend._2(): zero or one source object
           
       Optimizations:
         If Object.prototype does not hold enumerable properties, optimized versions of extend()
         and extend._2() are provided that do not test if properties are owned.
         
         If Object.prototype holds at least one enumerable property, extend._2() equals the
         safe, non-optimized version extend() which verifies if each property is owned.
         
         This would be the case if prior to loading extend.js, a library would augment
         Object.prototype without using Object.defineProperty() or defining a property using
         Object.defineProperty() with a descriptor setting 'enumerable' to 'true'.
       
     extend.clone( value )
     extend.object_clone( object )
       Returns a deep copy of a value.
       
       object_clone( object ) works only on objects.
     
     extend.all_keys( object )
       Returns all properties of object including those of the prototype chain.
     
     extend.set()
       Sets defaults versions of extend(), extend._2(), extend.clone(),
       extend.object_clone() after checking if Object.prototype and Array.prototype have
       been altered.
       
       Returns new extend() Function and Object;
     
     extend.safe( destination [, source [, source ... ] ] )
     extend.fast( destination [, source [, source ... ] ] )
     
     extend._2.safe( destination [, source ] )
     extend._2.fast( destination [, source ] )
     
     extend.safe_clone( value )
     extend.fast_clone( value )
     
     extend.safe_object_clone( object )
     extend.fast_object_clone( object )
     
       Fast and safe versions of extend(), extend._2(), extend.clone(), extend.object_clone().
       
       Safe versions always check hasOwnProperty() while the fast versions do not.
    
    ToDo: extend, provide tests for all extend and clone functions
  */
  function set() {
    var extend;
    
    if ( check_enumerable_properties( {}, 'Object' ) ) {
      // Extend and clone must test if properties are owned or not
      extend    = safe_extend;
      extend._2 = safe_extend;
      
      extend.clone        = safe_clone;
      extend.object_clone = safe_object_clone;
    } else {
      // Extend is safe without tesing if properties are owned
      extend    = fast_extend;
      extend._2 = fast_extend_2;
      
      if ( check_enumerable_properties( [], 'Array'  ) ) {
        extend.clone        = safe_clone;
        extend.object_clone = safe_object_clone;
      } else {
        extend.clone        = fast_clone;
        extend.object_clone = fast_object_clone;
      }
    }
    
    extend.safe = safe_extend;
    extend.fast = fast_extend;
    
    extend._2.safe = safe_extend;
    extend._2.fast = fast_extend_2;
    
    extend.safe_clone = safe_clone;
    extend.fast_clone = fast_clone;
    
    extend.safe_object_clone = safe_object_clone;
    extend.fast_object_clone = fast_object_clone;
    
    extend.all_keys = all_keys;
    
    extend.set = set;
    
    return extend;
  } // set()
  
  function check_enumerable_properties( object, name ) {
    var keys = all_keys( object );
    
    if ( keys.length ) {
      logger( 4 // warning
        , '_', 'factory'
        , 'Some library added to ' + name + '.prototype these enumerable proerties, using safe extend or clone'
        , keys
      );
      
    } else {
      log && log( 6, '_', 'factory', 'No added enumerable properties in ' + name + '.prototype, using fast extend or clone' );
      
    }
    
    return keys.length;
  } // check_enumerable_properties()
  
  function all_keys( object ) {
    var p, keys = [];
    
    for ( p in object ) keys.push( p );
    
    return keys;
  } // all_keys()
  
  // Safe version, tests hasOwnProperty()
  function safe_extend( d ) {
    d || ( d = {} );
    
    for ( var i = 0, l = arguments.length, s; ++i < l; )
      if ( s = arguments[ i ] )
        for ( var p in s )
          if ( s.hasOwnProperty( p ) )
            d[ p ] = s[ p ];
            
    return d;
  } // safe_extend()
  
  // Fast extend, does not check hasOwnProperty()
  function fast_extend( d ) {
    d || ( d = {} );
    
    for ( var i = 0, l = arguments.length, s; ++i < l; )
      if ( s = arguments[ i ] )
        for ( var p in s )
          d[ p ] = s[ p ];
        
    return d;
  } // fast_extend()
  
  function fast_extend_2( d, s ) {
    for ( var p in s ) d[ p ] = s[ p ];
    
    return d;
  } // fast_extend_2()
  
  // Safe deep clone of value
  function safe_clone( value ) {
    return typeof value == 'object' && value ? safe_object_clone( value ) : value;
  } // safe_clone()
  
  // Fast deep clone of value
  function fast_clone( value ) {
    return typeof value == 'object' && value ? fast_object_clone( value ) : value;
  } // fast_clone()
  
  function safe_object_clone( object ) {
    var clone = toString.call( object ) == '[object Array]' ? [] : {}
      , p
      , value
    ;
    
    for ( p in object ) {
      if ( object.hasOwnProperty( p ) ) {
        value = object[ p ];
        
        // Duplicate fast_clone() code for performances
        clone[ p ] = typeof value == 'object' && value ? safe_object_clone( value ) : value;
      }
    }
    
    return clone;
  } // safe_object_clone()
  
  function fast_object_clone( object ) {
    var clone = toString.call( object ) == '[object Array]' ? [] : {}
      , p
      , value
    ;
    
    for ( p in object ) {
      value = object[ p ];
      
      // Duplicate fast_clone() code for performances
      clone[ p ] = typeof value == 'object' && value ? fast_object_clone( value ) : value;
    }
    
    return clone;
  } // fast_object_clone()
  
} ); // extend.js
