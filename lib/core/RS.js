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
( 'RS', [ 'console_logger', 'lazy_logger', 'extend', 'subclass', 'loggable', 'code', 'event_emitter', 'value_equals', 'timestamp_string' ].map( function( d ) { return '../util/' + d } ).concat(
[ [ 'uuid', 'node-uuid' ] ] ),
function(  Console_Logger,   Lazy_Logger,   extend,   subclass,   Loggable,   Code,   Event_Emitter,   value_equals,   timestamp_string, uuid ) {
  'use strict';
  
  var RS       = {
        'add_exports'     : add_exports,
        'uuid'            : uuid,
        'extend'          : extend,
        'subclass'        : subclass,
        'Loggable'        : Loggable,
        'Code'            : Code,
        'Event_Emitter'   : Event_Emitter,
        'value_equals'    : value_equals,
        'timestamp_string': timestamp_string,
        'Dictionary'      : Dictionary
      }
      
    , create   = Object.create
    , extend_2 = extend._2
    , logger   = Lazy_Logger( 'rs' )
    , log      = logger.set_log_level( 5 ); // set to false to remove all log code after minification
  ;
  
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
