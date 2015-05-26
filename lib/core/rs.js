/*  rs.js
    
    Copyright (C) 2013-2015, Reactive Sets
    
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
( 'RS', [ '../util/console_logger', '../util/lazy_logger', '../util/extend' ],
  function(        Console_Logger,           Lazy_Logger,           extend )
{
  'use strict';
  
  var RS       = { 'add_exports': add_exports }
    , create   = Object.create
    , extend_2 = extend._2
    , logger   = Lazy_Logger( 'rs' )
    , log      = logger.set_log_level( 6 ); // set to false to remove all log code after minification
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
    
    _log.pretty = function( o ) {
      return JSON.stringify( o, void 0, '  ' );
    };
  }
  
  subclass( null, Root );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'extend'                : extend,
    'extend_2'              : extend_2,
    'logger'                : logger,
    'log'                   : _log, // deprecated
    'subclass'              : subclass,
    'Root'                  : Root,
    'make_constructor_apply': make_constructor_apply,
    'Dictionary'            : Dictionary
  } );
  
  log && log( 6, '_', 'global', 'module loaded' );
  
  return RS;
  
  /* -------------------------------------------------------------------------------------------
     nil_function()
  */
  function nil_function() {}
  
  /* -------------------------------------------------------------------------------------------
     subclass( base, derived [, methods] )
     
     Creates a derived class from a base class.
     
     Parameters:
     - base (Function): Base class constructor, or null if this is a top class
     - derived (Function): Derived class constructor
     - methods:
       - (Object): methods for derived prototype
       - (Function): Function that returns methods Object as above, signature:
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
  
  // Add tests for Dictionary
  function Dictionary() {
    return create( null );
  }
  
  /* -------------------------------------------------------------------------------------------
     RS.add_exports( exports )
     
     Exports 'exports' attributes into RS.
     
     Parameters:
       exports (Object): attributes to export into RS.
     
     Example:
     // fibonacci.js
     
     ( function( exports ) {
       var RS = exports.RS || require( 'rs.js' );
       
       // Trivial implementation of Fibonacci number calculator
       function fibonacci( n ) {
         if ( n === 0 || n === 1 ) return n;
         
         return fibonacci( n - 1 ) + fibonacci( n - 2 );
       }
       
       // Export fibonacci() into the RS namespace
       RS.add_exports( { fibonacci: fibonacci } );
     } )( this );
     
     // fibonacci_search.js
     var RS = this.exports.RS || require( 'rs.js' );
     
     RS.log( 'Fibonacci of 5 is', RS.fibonacci( 5 ) );
  */
  function add_exports( attributes ) {
    extend_2( this, attributes );
    
    log && log( 6, '_', 'add_exports', Object.keys( attributes ) );
    
    return this;
  } // add_exports()
} ); // rs.js
