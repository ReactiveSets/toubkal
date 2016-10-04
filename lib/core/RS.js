/*  RS.js
    
    Copyright (c) 2013-2016, Reactive Sets
    
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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'RS', [ 'console_logger', 'lazy_logger', 'extend', 'subclass', 'loggable', 'code', 'event_emitter', 'value_equals', 'timestamp_string', 'picker' ].map( function( d ) { return '../util/' + d } ).concat(
[ [ 'uuid', 'node-uuid' ] ] ),
function(  Console_Logger,   Lazy_Logger,   extend,   subclass,   Loggable,   Code,   Event_Emitter,   value_equals,   timestamp_string,   picker, uuid ) {
  'use strict';
  
  var RS       = {
        'add_exports'     : add_exports,
        'uuid'            : uuid,
        'valid_uuid_v4'   : /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        'extend'          : extend,
        'subclass'        : subclass,
        'Loggable'        : Loggable,
        'Code'            : Code,
        'Event_Emitter'   : Event_Emitter,
        'value_equals'    : value_equals,
        'timestamp_string': timestamp_string,
        'picker'          : picker,
        'Dictionary'      : Dictionary,
        'is_array'        : is_array,
        'is_date'         : is_date,
        'get_name'        : get_name,
      }
    
    , create   = Object.create
    , extend_2 = extend._2
    , logger   = Lazy_Logger( 'rs' )
    , log      = logger.set_log_level( 5 ) // set to false to remove all log code after minification
    , toString = Object.prototype.toString
  ;
  
  Error.stackTraceLimit = Infinity;

  /* -------------------------------------------------------------------------------------------
      @function get_name( object, method )
      
      @short Provide the name of a method in object
      
      @parameters:
      - object (Object): optional instance on which method is called
      
      - method (String): method name
      
      @returns (String)
      
      @description:
      This function is an attribute of the global @@global:RS object.
      
      If object is defined and object has a _get_name() method, such as @@class:Loggable,
      call this _get_name() method on object with method as a parameter.
      
      Otherwise call ```toString.call( object )```, ignoring method parameter.
  */
  function get_name( o, method ) {
    return o && o._get_name ? o._get_name( method ) : toString.call( o );
  } // get_name()
  
  /* -------------------------------------------------------------------------------------------
     _log( message ), deprecated, use logger instead
     
     Date-stamped non-persistant log for debugging and profiling sent to console.log() if
     available.
     
     Example output:
       2013/01/12 08:39:52.698 - rs, module loaded
     
     Parameters:
       message (string): message to display
    ---
    
    _log.s( object [, replacer [, space] ] )
    
    Deprecated, logger uses plain objects, but one must provide toJSON() functions with no
    recursive structure.
    
    Object serializer for log based on JSON.Stringify() if console.log() if available.
    
    If console.log() is not available, _log.s() returns undefined so this function should not
    be used as a general purpose shortcut for JSON.Stringify().
  */
  var _log;
  
  if ( typeof console != "object" || typeof console.log != "function" ) {
    // Browsers that do not have a console.log()
    _log = nil_function;
    _log.s = _log.pretty = _log;
  } else {
    _log = Console_Logger();
    
    _log.s = JSON.stringify;
    
    _log.pretty = function pretty( o ) {
      return JSON.stringify( o, void 0, '  ' );
    };
  }
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'logger'        : logger,
    'log'           : _log // deprecated
  } );
  
  log && log( 6, '_', 'global', 'module loaded' );
  
  return RS;
  
  /* -------------------------------------------------------------------------------------------
     nil_function()
  */
  function nil_function() {}
  
  /* -------------------------------------------------------------------------------------------
     Dictionary()
  */
  function Dictionary() {
    return create( null );
  }
  
  /* -------------------------------------------------------------------------------------------
      @function is_array( value ) -> Boolean
      
      @short returns true if value is a JavaScript Array
      
      @return (Boolean): true if value is a JavaScript Array, false otherwise
      
      @manual programmer
  */
  function is_array( value ) {
    return toString.call( value ) == '[object Array]';
  } // is_array()
  
  /* -------------------------------------------------------------------------------------------
      @function is_date( value ) -> Boolean
      
      @short returns true if value is a JavaScript Date object
      
      @return (Boolean): true if value is a JavaScript Date object, false otherwise
      
      @manual programmer
  */
  function is_date( value ) {
    return toString.call( value ) == '[object Date]';
  } // is_date()
  
  /* -------------------------------------------------------------------------------------------
     RS.add_exports( exports )
     
     Exports 'exports' attributes into RS.
     
     Parameters:
       exports (Object): attributes to export into RS.
     
     Example: define module fibonacci, export it to RS.
     
     ( this.undefine || require( 'undefine' )( module, require ) )()
     ( 'fibonacci', [ './RS' ], function( RS ) {
       RS.add_exports( { 'fibonacci': fibonacci } );
       
       return fibonacci;
       
       // Naive and slow recursive implementation of Fibonacci number calculator
       function fibonacci( n ) {
         if ( n < 0 ) return;
         
         if ( n < 2 ) return n;
         
         return fibonacci( n - 2 ) + fibonacci( n - 1 );
       }
     } );
     
     // fibonacci_search.js
     RS.log( 'Fibonacci of 5 is', RS.fibonacci( 5 ) );
  */
  function add_exports( attributes ) {
    extend_2( this, attributes );
    
    log && log( 6, '_', 'add_exports', Object.keys( attributes ) );
    
    return this;
  } // add_exports()
} ); // RS.js
