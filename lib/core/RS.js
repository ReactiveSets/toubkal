/*  RS.js
    
    Copyright (c) 2013-2017, Reactive Sets
    
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
( 'RS', [ 'javascript', 'console_logger', 'lazy_logger', 'extend', 'subclass', 'loggable', 'code', 'event_emitter', 'value_equals', 'object_diff', 'timestamp_string', 'picker' ].map( function( d ) { return '../util/' + d } ).concat(
[ [ 'uuid', 'node-uuid' ] ] ),
function(  javascript,   Console_Logger,   Lazy_Logger,   extend,   subclass,   Loggable,   Code,   Event_Emitter,   value_equals,   object_diff,   timestamp_string,   picker, uuid ) {
  'use strict';
  
  var win32    = typeof process == 'object' && process && process.platform == 'win32'
    , create   = Object.create
    , extend_2 = extend._2
    , logger   = Lazy_Logger( 'rs' )
    , log      = logger.set_log_level( 5 )
    , toString = {}.toString
    
    , RS       = {
        'win32'           : win32,
        'in_browser'      : new Function( 'return typeof window=="object"&&this===window' )(),
        'uuid'            : uuid,
        'valid_uuid_v4'   : /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        'extend'          : extend,
        'stack'           : stack,
        'subclass'        : subclass,
        'Loggable'        : Loggable,
        'Code'            : Code,
        'Event_Emitter'   : Event_Emitter,
        'value_equals'    : value_equals,
        'object_diff'     : object_diff,
        'timestamp_string': timestamp_string,
        'picker'          : picker,
        'identity'        : identity,
        'Dictionary'      : Dictionary,
        'get_name'        : get_name,
      }
  ;
  
  extend_2( RS, javascript );
  
  /* --------------------------------------------------------------------------
      @function RS.stack()
      
      @short Get current stack trace, if available
      
      @returns
      (Array of Strings):
        - [] if stack trace is not available.
        
        - Each entry string corresponds to a stack frame in the format
          provided by the current JavaScript engine.
        
        - **toString()** (Function): for implicit type conversion, returns
          the stack trace as a string starting with a new line and separated
          stack trace entries by new lines.
  */
  Error.stackTraceLimit = Infinity;
  
  var new_line = '\n';
  
  function stack() {
    try {
      throw new Error()
    
    } catch( e ) {
      var stack = e.stack;
      
      stack = typeof stack == 'string'
        ? stack.split( new_line ).slice( 2 )
        : []
      ;
      
      if ( win32 ) stack = stack.map( win32_path_to_uri );
      
      stack.toString = function() {
        return this.length
          ? new_line + this.join( new_line )
          : ' no stack trace'
      }
      
      return stack
    }
  } // stack()
  
  function win32_path_to_uri( path ) {
    return path.replace( /\\/g, '/' )
  } // to_uri_path()
  
  /* --------------------------------------------------------------------------
      @function RS.get_name( object, method )
      
      @short Provide the name of a method in object
      
      @parameters
      - **object** (Object): optional instance on which method is called.
      
      - **method** (String): optional method name.
      
      @returns (String)
      
      @description
      This function is an attribute of the global @@global:RS object.
      
      If object is defined and object has a *_get_name()* property,
      such as @@class:Loggable, call ```object._get_name()``` with *method*
      as a parameter.
      
      Otherwise call ```Object.prototype.toString.call( object )```,
      ignoring *method* parameter.
  */
  function get_name( o, method ) {
    return o && o._get_name ? o._get_name( method ) : toString.call( o );
  } // get_name()
  
  /* --------------------------------------------------------------------------
     _log( message ), deprecated, use logger instead
     
     Date-stamped non-persistant log for debugging and profiling sent to
     console.log() if available.
     
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
    
    _log.pretty = function pretty( o, spaces ) {
      return JSON.stringify( o, void 0, spaces || '  ' );
    };
  }
  
  /* --------------------------------------------------------------------------
     module exports
  */
  return extend_2( RS, {
    'logger'        : logger,
    'log'           : _log // deprecated
  } )
  
  /* --------------------------------------------------------------------------
     nil_function()
  */
  function nil_function() {}
  
  /* --------------------------------------------------------------------------
     identity()
  */
  function identity( v ) { return v }
  
  /* --------------------------------------------------------------------------
     Dictionary()
  */
  function Dictionary() { return create( null ) }
} ); // RS.js
