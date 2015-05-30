/*  console_logger.js
    
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
    Console Logger
    
      Prints its parameters to console.log() (if defined):
        - prefixed with a timestamp string
        - add time difference lines when there is more than 1 millisecond between traces
    
    
    Sample output
    
      2015/05/06 12:11:14.980 - pipelet, Pipelet.Add(): name: http_listen
      2015/05/06 12:11:14.980 - pipelet, Pipelet.Add(): name: virtual_http_servers
      2015/05/06 12:11:14.980 - pipelet, Pipelet.Add(): name: serve_http_servers
      ----------------------- + 5 milliseconds -----------------------
      2015/05/06 12:11:14.985 - pipelet, Pipelet.Add(): name: serve
    
    
    Install
    
      npm install console_logger
    
    
    Use
    
      // Get and start a logger, initialize internal lap timer
      var logger = require( 'console_logger' )();
      
      // Do something ..
      
      logger( 'hello, world!' );
    
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'console_logger', [ './lap_timer', './timestamp_string' ], function( Lap_Timer, timestamp_string ) {
  'use strict';
  
  var _lap_timer       = Console_Logger.lap_timer        = Lap_Timer();
  var lap_timer_string = Console_Logger.lap_timer_string = Lap_Timer_String();
  
  var slice = Array.prototype.slice;
  
  return Console_Logger;
  
  function Console_Logger( lap_timer ) {
    if ( typeof console != "object" || typeof console.log != "function" ) {
      // This virtual machine has no console.log function
      return function() {};
    }
    
    lap_timer || ( lap_timer = _lap_timer );
    
    console_logger.get_lap_timer = get_lap_timer;
    
    return console_logger;
    
    function console_logger() {
      var date         = new Date
        , milliseconds = lap_timer( date )
        , parameters   = slice.call( arguments, 0 )
      ;
      
      if ( milliseconds > 1 ) {
        console.log( lap_timer_string( milliseconds ) );
      }
      
      parameters.unshift( timestamp_string( date ) + ' -' );
      
      console.log.apply( console, parameters );
    } // console_logger()
    
    function get_lap_timer() {
      return lap_timer;
    }
  } // Console_Logger()
  
  // ToDo: document and test lap_timer_string()
  function Lap_Timer_String() {
    var prefix = '-----------------------'
      , suffix = prefix
    ;
    
    return function( milliseconds ) {
      var s = prefix + ' + ';
      
      if ( milliseconds > 1000 ) {
        var seconds = milliseconds / 1000 | 0;
        
        milliseconds = milliseconds % 1000;
        
        if ( seconds > 60 ) {
          var minutes = seconds / 60 | 0;
          
          seconds = seconds % 60;
          
          if ( minutes > 60 ) {
            var hours = minutes / 60 | 0;
            
            minutes = minutes % 60;
            
            if ( hours > 24 ) {
              var days = hours / 24 | 0;
              
              hours = hours % 24;
              
              plural( days, ' day' );
            }
            
            plural( hours, ' hour' );
          }
          
          plural( minutes, ' minute' );
        }
        
        plural( seconds, ' second' );
      }
      
      // Duplicate plural code here, for higher performances of most common traces
      return s + milliseconds + ' millisecond' + ( milliseconds == 1 ? ' ' : 's ' ) + suffix;
      
      function plural( n, singular ) {
        return s += n + singular + ( n == 1 ? ' ' : 's ' );
      }
    } // lap_timer_string()
  } // Lap_Timer_String()
} ); // console_logger.js
