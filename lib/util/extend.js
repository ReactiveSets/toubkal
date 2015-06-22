/*  extend.js
    
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
( 'extend', [ './lazy_logger' ], function( Lazy_Logger ) {
  "use strict";
  
  // ToDo: rename module to something less generic, to prevent collisions with other extend() modules
  var logger = Lazy_Logger( 'extend' )
    , log = logger.set_log_level( 6 ) // set to false to remove all log code after minification
  ;
  
  /* -------------------------------------------------------------------------------------------
     extend   ( destination [, source [, source ... ] ] )
     extend._2( destination [, source ] )
     
     Copy properties of source objects to a destination object.
     
     extend_2() is an optimized version of extend() that requires one non-null destination and
     one optional source object.
     
     Parameters:
       destination: returned object that will be augmented or ammended from source object
         own properties.
         With extend(): if null or undefined, destination will be set to a new object.
         With extend_2(): destination must be a non-null object or an exception will be thrown.

       source: object(s) which own properties are copied into destination.
         With extend(): If null or undefined, source is ignored
         With extend_2(): zero or one source object
         
     Optimizations:
       If Object.prototype does not hold enumerable properties, optimized versions of extend()
       and extend_2() are provided that do not test if properties are owned.

       If Object.prototype holds at least one enumerable property, extend_2() equals the
       non-optimized version extend() which verifies if each property is owned.

       This would be the case if prior to loading extend.js, a library would augment
       Object.prototype without using Object.defineProperty() or defining a property using
       Object.defineProperty() with a descriptor setting 'enumerable' to 'true'.
  */
  var p, x = {}, object_enumerable_proerties = [], extend;
  
  for ( p in x ) object_enumerable_proerties.push( p );
  
  if ( object_enumerable_proerties.length ) {
    logger( 4 // warning
      , '_', 'factory'
      , 'Some library added to Object.prototype these enumerable proerties, using safe extend'
      , object_enumerable_proerties
    );
    
    // Extend must test if properties are owned or not
    extend    = safe_extend;
    extend._2 = safe_extend;
  } else {
    log && log( 6, '_', 'factory', 'No added enumerable properties in Object.prototype, using fast extend' );
    
    // Extend is safe without tesing if properties are owned
    extend    = fast_extend;
    extend._2 = fast_extend_2;
  }
  
  extend.safe = safe_extend;
  extend.fast = fast_extend;
  
  extend._2.safe = safe_extend;
  extend._2.fast = fast_extend_2;
  
  extend.clone   = clone;
  
  return extend;
  
  // Safe version, tests hasOwnProperty()
  function safe_extend( d ) {
    d || ( d = {} );
    
    for ( var i = 0, l = arguments.length, s; ++i < l; )
      if ( s = arguments[ i ] )
        for ( var p in s )
          if ( s.hasOwnProperty( p ) )
            d[ p ] = s[ p ];
            
    return d;
  } // extend()
  
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
  
  // deep clone of object
  function clone( o ) {
    if( typeof o !== 'object' || o === null ) return o;
    
    var r = o instanceof Array ? [] : {};
    
    for( p in o )
      if( o.hasOwnProperty( p ) ) 
        r[ p ] = clone( o[ p ]);
    
    return r;
  } // clone()
  
} ); // extend.js
