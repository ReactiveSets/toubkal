/*  lap_timer.js
    
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

/* --------------------------------------------------------------------------------------
    Lap Timer
    
      For node and the browser
    
    Install
    
      npm install lap_timer
    
    Use
    
      // Get Lap Timer factory
      var Lap_Timer = require( 'lap_timer' );
      
      // Get and start a lap timer
      var timer = Lap_Timer();
      
      // Do something ...
      
      timer(); // returns milliseconds since timer started
      
      // Do something ...
      
      timer(); // returns milliseconds since previous lap
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'lap_timer', function() {
  "use strict";
  
  return function( first ) {
    var last;
    
    // initialize lap timer
    lap_timer( first );
    
    return lap_timer;
    
    function lap_timer( next ) {
      var previous = last;
      
      return ( last = next || new Date() ) - previous;
    }
  } // Lap_Timer()
} ); // lap_timer.js
