/*  lap_timer.js
    
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
    
    
    Advanced Use
    
      var intermediate = timer.get_last(); // returns date Object of last lap
      
      var initial_start = timer.get_first(); // returns date Object when lap timer was created
      
      timer.reset(); // resets timer to now
      
      // Do something ...
      
      timer(); // returns milliseconds since timer was reset
      
      timer.reset( initial_start ); // resets timer to original start time
      
      // Do something ...
      
      timer(); // returns milliseconds since original start timer
      
      // Get another independent timer, but with same start time
      var other_timer = Lap_Timer( initial_start );
      
      // Do something ...
      
      other_timer() // returns milliseconds since initial start timer
      
      // Do something ...
      
      timer() // returns milliseconds since previous lap for this timer, independant of other_timer
      
      other_timer( intermediate ); // returns milliseconds between intermediate and initial_start
      
      // Do something ...
      
      other_timer(); // returns milliseconds between now and intermediate
*/
!function( exports ) {
  "use strict";
  
  if ( typeof require === 'function' ) {
    module.exports = Lap_Timer;
  } else {
    exports.Lap_Timer = Lap_Timer;
  }
  
  function Lap_Timer( first ) {
    var _first, _last;
    
    lap_timer.get_last  = get_last;
    lap_timer.get_first = get_first;
    lap_timer.reset     = reset;
    
    return lap_timer.reset( first );
    
    function lap_timer( next ) {
      next || ( next = new Date() );
      
      var milliseconds = next - _last;
      
      _last = next;
      
      return milliseconds;
    }
    
    function get_last() {
      return _last;
    }
    
    function get_first() {
      return _first;
    }
    
    function reset( first ) {
      _last = _first = first || new Date();
      
      return this;
    }
  } // Lap_Timer()
}( this ); // lap_timer.js
