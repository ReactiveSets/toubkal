/*
  xs.js:
    XS: Connected Set namespace definition:
      extend()      : Copy own properties of source objects to a destination object 
      log()         : Date-stamped non-persistqnt log for debugging and profiling sent to console.log() if available.
      log.s()       : Object serializer for log based on JSON.Stringify() if console.log() if available.
      subclass()    : Simple subclassing one-liner
      export_code() : Generate pretty code to export public attributes into a namespace
  
  
    Copyright (C) 2013, Connected Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
"use strict";

( function( exports ) {
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     nil_function()
  */
  function nil_function() {}
  
  /* -------------------------------------------------------------------------------------------
     extend( destination, source [, source ... ] )
     
     Copy own properties of source objects to a destination object.
     
     Parameters:
       destination: returned object that will be augmented or ammended from source object
         own properties. If null or undefined, destination will be set to a new object.
         
       source: object(s) which own properties are copied into destination. If null or
         undefined, source is ignored
  */
  function extend( d ) {
    d = d || {};
    
    for ( var i = 0, l = arguments.length; ++i < l; ) {
      var s = arguments[ i ];

      if ( s ) for ( var p in s ) if ( s.hasOwnProperty( p ) ) d[ p ] = s[ p ];
    }
    
    return d;
  } // extend()
  
  /* -------------------------------------------------------------------------------------------
     log( message )
     
     Date-stamped non-persistqnt log for debugging and profiling sent to console.log() if
     available.
     
     Example output:
       2013/01/12 08:39:52.698 - xs, module loaded
    
    ---
    
    log.s( object [, replacer [, space] ] )
    
    Object serializer for log based on JSON.Stringify() if console.log() if available.
    
    If console.log() is not available, log.s() returns undefined so this function should not
    be used as a general purpose shortcut for JSON.Stringify().
  */
  var log;
  
  if ( typeof console != "object" || typeof console.log != "function" ) {
    // Browsers that do not have a console.log()
    log = nil_function;
    log.s = nil_function;
  } else {
    log = function( message ) {
      var date = new Date
        , year     = "" + date.getFullYear()
        , month    = "" + ( date.getMonth() + 1 )
        , day      = "" + date.getDate()
        , hour     = "" + date.getHours()
        , minutes  = "" + date.getMinutes()
        , seconds  = "" + date.getSeconds()
        , ms       = "" + date.getMilliseconds()
      ;
      
      if ( month  .length < 2 ) month    = "0" + month
      if ( day    .length < 2 ) day      = "0" + day;
      if ( hour   .length < 2 ) hour     = "0" + hour;
      if ( minutes.length < 2 ) minutes  = "0" + minutes;
      if ( seconds.length < 2 ) seconds  = "0" + seconds;
      
      switch( ms.length ) {
        case 2: ms =  "0" + ms; break;
        case 1: ms = "00" + ms; break;
      }
      
      console.log( year + '/' + month + '/' + day
        + ' ' + hour + ':' + minutes + ':' + seconds + '.' + ms
        + ' - ' + message
      );
    } // log()
    
    log.s = JSON.stringify;
  }
  
  /* -------------------------------------------------------------------------------------------
     subclass( base, f )
     
     Simple subclassing one-liner.
     
     Returns f which prototype has been alterted to include base.prototype at the top of its
     chain.
  */
  function subclass( base, f ) {
    return ( f.prototype = Object.create( base.prototype ) ).constructor = f;
  } // subclass()
  
  /* -------------------------------------------------------------------------------------------
     export_code( namespace, exports )
     
     Generate pretty code to export public attributes into a namespace.
     
     Parameters:
       namespace: string, will be set as an object property of the global 'exports' object if
         namespace is not already defined in 'exports'.
         
       exports: array of symbols to export in namespace.
       
     Requires an existing 'exports' object in the scope of evaluation. 'exports' is tyically
     provided by the following module pattern that works in web browsers as well as in node:
     
     // fibonacci.js
     ( function( exports ) {
       if ( typeof( require ) === 'function' ) {
         var XS = require( 'xs.js' ).XS;
       }
       
       // Trivial implementation of Fibonacci number calculator
       function fibonacci( n ) {
         if ( n === 0 || n === 1 ) return n;
         
         return fibonacci( n - 1 ) + fibonacci( n - 2 );
       }
       
       // Export fibonacci() into the Math namespace
       eval( XS.export_code( 'Math', [ 'fibonacci' ] ) );
     } )( this );
     
     --
     
     // fibonacci_search.js
     
     if ( typeof( require ) === 'function' ) {
       var XS = require( 'xs.js' ).XS;
       var Math = require( 'fibonacci.js' ).Math;
     }
     
     XS.log( 'Fibonacci of 5 is ' + Math.fibonacci( 5 ) );
  */
  function export_code( namespace, exports ) {
    var max = Math.max.apply( Math, exports.map( function( v ) { return v.length } ) );
    
    for ( var s = '', i = -1; ++i < max; ) s += ' ';
    
    exports.unshift(
      '\n  var _' + namespace + ' = exports.' + namespace + ' = typeof( ' + namespace + ' ) === "object" ? ' + namespace + ' : {};\n'
    );
    
    var export_code = exports.reduce(
      function( r, f ) {
        return r + '\n  _' + namespace + '.' + ( f + s ).substr( 0, max ) + " = " + f + ';'
      }
    );
    
    de&&ug( "exports:" + export_code );
    
    return export_code;
  } // export_code()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( export_code( 'XS', [ 'extend', 'log', 'subclass', 'export_code' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // xs.js
