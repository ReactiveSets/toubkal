/*  lazy_logger.js
    
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

/* --------------------------------------------------------------------------------------
   Lazy Logger
   
   A JavaScript logger library lazily generating logs using queries and the progressive
   && operator.
   
   - Logs are only generated if consumed, i.e. if queried.
   - Queries drive log generation.
   - More efficient than filtering-out unecessarily generated logs.
   - Also helps minifiers remove testing-only logs
   
   Less is more. In this case using less cpu when unused, allows programmers to keep
   more logs into the code allowing more in-production proactive debugging.
   
   Lazy_Logger( realm [, emit, query ] )
   
   Returns a logger() Function and Object to emit logs from a realm.
   
   Lazy_Logger() can be invoqued with or without new.
   
   Parameters:
   - realm (String): a name for logs emitted by this logger(). It could be
     anything that the application defines but this is intended to be used
     as a module or class name.
     
     Toubkal's reactive dataflow modules define the realm as pipelet
     type names.
   
   - emit (Optional Function): to emit logs, signature is:
       emit( log ), default is Lazy_Logger.to_console()
     
     Where the log parameter is a JavaScript object with the following
     attributes:
     
     - flow     (String): always 'log'. Intended to deferentiate with
       other event flows in a dataflow system.
     
     - _timestamp (Date): when the log object was created.
     
     - _level  (Integer): this log level, based on syslog levels, see full definition
       in the "Log Levels" section bellow.
       
     - _realm   (String): this log's realm (the first parameter of Lazy_Logger()
     
     - _name    (String): the name of the instance
     
     - _method  (String): the name of the logged instance method
     
     - zero or more additional logged attributes and associated values
     
     Example of log Object that may be emitted:
       {
         flow      : 'log',                     // logs dataflow name
         _timestamp: '2014/04/21 21:32:12.038', // when the log was generated
         _level    : 6,                         // Information
         _realm    : 'order',                   // the pipelet name
         _name     : 'books by author',         // pipelet instance name
         _method   : '_add',                    // instance method order.._add()
         count     : 5                          // one additional log attribute
       }
       
       When directed to console.log(), this log may be formatted on a single line as:
       
         2015/04/28 09:32:47.111 #6 order[ books by author ]._add() - count: 5
         
       Most importantly these log Objects can be consumed by a downstream
       log consumers.
       
       The log dataflow can be filtered to not only restrict the amount of
       log displayed but also the amount of logs actually generated using
       a query as defined by the query parameter bellow.
     
   - query: (Optional Array of Objects) initial log query. For a defintion
     of log queries, refer to the "Log Query" section bellow.
     
     The default query is defined by log.query_default() defined bellow.
   
   Returns:
   - logger( ... ) (Function Object) which is invoqued to attempt the emission of logs.
     The full definition of logger() is found in the section "Invoquing logger" bellow.
     
     The logger() Function is also used as an Object which exposes the following
     additional methods:
     
     - valueOf(): Overloads Object.valueOf() to get the supremum log level that this
       realm may emit. When zero, no log can be emitted.
       
       Typically used to test if the log level is higher than the current log e.g.:
         logger > 5 && ...
       
       Returns supremum of highest log level.
     
     - reset(): resets the current log value.
       
       Returns logger.
     
     - set_log_level( level ): sets the maximum log level that this realm can emit. This
       method may be used only when query_add() and query_remove() are not used to
       control emited logs, because set_log_level() also clears all previous queries
       using query_clear().
       
       Returns logger.
     
     - query_default(): Sets the query to its default value which specifies that this
       will emit Logs for any instance and any method at level below or equal to
       Lazy_Logger.default_log_level, which is initially set to 5 (Notice).
       
       Returns logger.
     
     - query_clear(): sets the query to discard all logs.
       
       Returns logger.
     
     - query_add( query ): adds and-expressions to the query.
       
       Adding an expression will typically increase the volume of logs emitted by this
       logger unless previously added expressions already allow as many logs.
       
       For the definition of queries see bellow.
       
       Returns logger.
     
     - query_remove( query ): removes and-expressions to the query.
     
       Removing an expression will typically decrease the volume of logs emitted by
       this logger.
       
       For the definition of queries see bellow.
       
       Returns logger.
   
   Log Levels:
     Log levels are defined per RFC 5424 (syslog) severity levels with some extended
     levels. Some descriptions bellow are from or edited from
       http://en.wikipedia.org/wiki/Syslog#Severity_levels
     
     This section of the documentation is therefore licenced under the terms available at:
       http://en.wikipedia.org/wiki/Wikipedia:Text_of_Creative_Commons_Attribution-ShareAlike_3.0_Unported_License
     :
     
     0: Emergency, system is unusable:
          A "panic" condition usually affecting multiple apps/servers/sites. At this
          level it would usually notify all tech staff on call.
     
     1: Alert, action must be taken immediately:
          Should be corrected immediately, therefore notify staff who can fix the
          problem. An example would be the loss of a primary ISP connection.
     
     2: Critical:
          Should be corrected immediately, but indicates failure in a secondary system,
          an example is a loss of a backup ISP connection.
     
     3: Error:
          Non-urgent failures, these should be relayed to developers or admins. Each item
          must be resolved within a given time.
     
     4: Warning:
          Warning messages, not an error, but indication that an error will occur if
          action is not taken, e.g. file system 85% full - each item must be resolved
          within a given time.
     
     5: Notice, normal but significant condition:
          Events that are unusual but not error conditions - might be summarized in an
          email to developers or admins to spot potential problems - no immediate action
          required.
     
     6: Informational:
          Normal operational messages - may be harvested for reporting, measuring
          throughput, etc. - no action required.
     
     7: Debuging:
          Information useful to developers for debugging the application.
     
     8: Verbose debugging (not specified in RFC 5424):
          Additional information for developpers to diagnose harder issues.
     
     9: Extensive debugging (not specified in RFC 5424):
          Full debugging information for developpers to diagnose the hardest issues, all
          data is dumped to the exception of passwords and other secret keys and
          credentials.
   
   Log Query:
     Log queries are defined using Arrays of JavaScript Objects defining
     Or-expressions - i.e. [ e1 or e2 ... or ei ... ]
     
     Each expression is an and expression defined using a JavaScript Object
     which attribute/value pairs define and-terms
     - i.e. { t1 and t3 ... and ti ... }
     
     The following terms are processed by this logger Function to filter the
     logs that can be emited with it:
     
     - flow    (String): the queried dataflow, should be 'log' or not
       provided, otherwise the query term will be ignored.
     
     - _realm  (String): the real of the consumed log. If not specified the
       expression means "For Any Realm".
     
     - _level (Integer or Array): the level at or bellow which logs are consumed.
       
       It can be specified with an integer or using a "bellow or equal" comparison
       expression - e.g. to specify "_level <= 5", provide the Array [ '<=', 5 ]
       
       If any other expression is provided, _level is set to the default provided in
       Lazy_Logger.default_log_level.
     
     - _name   (String): the name of the instance for which logs are consumed. If not
       specified, the expresion stands for "For Any Other Instance"
     
     - _method (String): the name of the method for which logs are consumed. If not
       specified, the expression means "For Any Other Method".
     
     - other terms are not currently used to filter logs but could be used by a
       downstream dataflow filter.
   
   Invoquing logger( level, name, method, values ... )
   
   Parameters:
   
   - level (Integer): This log level
   
   - name   (String): A name, that could be anything defined by the application but is
     intended to be an instance name.
     
   - method (String): Intended to be an instance method name, but could be anything
     defined by the application.
     
   - values ...: All other parameters are log values defined as JavaScript Objects
     defined by the application which attribute/value pairs will be merged into emited
     log Object.
     
     If attribute name that is already used in the log Object the new value will be
     discarded silently and the the previous value will remain, so care should be taken
     in choosing attribute names, at least to avoid collisions, one should avoid names
     starting with '_' and the attribute 'flow' should be reserved.
     
     If the Object is an instance of Array, it will be merged into the log Object with
     the attribute name "values" if it is the first value, or "values_1" if it is the
     second value, and "values_i" if it is the (i)th value.
     
     If a value is not an Object and because each value must be tagged with an attribute
     name, this name may be generated by logger() for the following non-Object types as
     determined by typeof:
     
     - (string): the attribute name will be "message" the first time, "message_1" if it
       is the second value, and "message_i" for the (i)th value.
       
     - (number): the attribute name will be "value", then "value_1" ...
     
     - (function): the function will be invoked with the following signature:
     
         fn( log, position )
       
       Where:
       - log (Object): is the current log Object being prepared for emission.
       
       - position (Integer): 0 if the function is the first value, 1 the if it is the
         second and so forth.
   
   Invocation of logger()
     The logger() function object is used to attempt the emission of logs in the most
     efficient possible way, especially when the specified log is not consumed. E.g.:
     
       logger
         && logger > 6
         && logger( 6, 'user', '__transform' )
         && logger( { count: 5, id: 3 } )
       ;
     
     If allowed by the current query, this would emit a log such as:
       {
         flow      : 'log',                     // log dataflow name
         _timestamp: '2014/04/21 21:32:12.038', // when the log was generated
         _level    : 6,                         // log level specified while calling logger()
         _realm    : 'order',                   // the realm used to invoque Lazy_Logger()
         _name     : 'user',                    // an instance name
         _method   : '__transform',             // a method name
         count     : 5,                         // from log( { count: 5, id: 3 } )
         id        : 3                          // from log( { count: 5, id: 3 } )
       }
       
     This log would be emited only if consumed, i.e. if a query requested this log.
     
     What makes this efficient is the use of the progressive && operator that will
     evaluate the next term only if the previous returned true.
     
     The combination "&& logger( ... )" provides for a progressive evaluation of logger
     parameters which are gathered as the function progresses as long as logger() returns
     true.
     
     The first (optional) term "logger" is used to allow the removal of all log code by
     a minifier if logger is defined to false or 0 instead of an instance returned by
     Lazy_Logger().
     
     The second optional term "logger > 6" uses "logger" as an Object which valueOf()
     returns the supremum log level that this logger may emit. If this level is above 6,
     the logger may progress to the next evaluation.
     
     The third term "logger( 6, 'user', '__transform' )" is mandatory and provides
     logger() with its first 3 parameters ( level, name, and method ) and returns true if
     the query accepts logs below level 7 for the instance 'user' of the log realm for
     the method '__transform'.
     
     Only if this third term succeeds will the last invocation of logger() proceed. This
     is typically where heavier log code might be required but the execution of such
     heavier code will only happen if the log is consumed, reducing the run-time use of
     logs in a production environement.
     
     In order to give more flexibility to programmers, the logger function can be
     invoqued up to four times for each log, each time providing one of the parameters to
     logger(). The example bellow would be semantically equivalent to the previous one,
     emitting the same log under the same query conditions:
     
       logger
         && logger > 6
         && logger( 6 )
         && logger( 'user' )
         && logger( '__transform' )
         && logger( { count: 5, id: 3 } )
       ;
     
     Although semantically equivalent, it may be faster to execute when logs are not
     consumed by the current query. This is because after the evaluation of each
     parameter logger() is allowed to return false, cancelling the evaluation of
     subsequent terms.
     
     The second and third terms are semantically redundant but because valueOf() will
     execute quite faster than logger( 6 ), it is more efficient whenever the highest
     consumed log level is less than 6.
     
     But there is no obligation to do so and for lower levels, such as errors that are
     very likeley to be consumed, it would be more efficient to use the following form:
     
       logger
         && logger( 3, 'user', '__transform' )
         && logger( 'Bad Request' )
       ;
     
     Acually, in this case it probably makes sense to invoque logger() only once as all
     errors should most-likely be consumed:
     
       logger( 3, 'user', '__transform', 'Bad Request' )
     
     Note that in this last example we have also omitted the first "logger" term meaning
     that this code cannot be removed by a minifier and may require another Lazy_Logger
     to differentiate it from other logs that may be removed by a minifier. In which case
     it would be more appropriate to call this logger domain "error" as in the following
     example:
     
       var error = Lazy_Logger( ... );
       
       ...
       
       error( 3, 'user', '__transform', 'Bad Request' )
*/
( this.undefine || require( 'undefine' )( module, require ) )( { global: 'Lazy_Logger' } )
( 'lazy_logger', [ './console_logger', './timestamp_string' ], function( Console_Logger, timestamp_string ) {
  'use strict';
  
  var lap_timer        = Console_Logger.lap_timer
    , lap_timer_string = Console_Logger.lap_timer_string
    , toString         = Object.prototype.toString
    
    , de = false
    , ug = de && Console_Logger().bind( null, 'lazy_logger' )
  ;
  
  // Lazy_Logger Public Class Attributes
  Lazy_Logger.to_console_parameters = to_console_parameters;
  
  Lazy_Logger.any_other_instance = 'Any Other Instance';
  Lazy_Logger.any_other_method   = 'Any Other Method';
  Lazy_Logger.default_log_level  = 5;
  
  if ( typeof console != "object" || typeof console.log != "function" ) {
    // This virtual machine has no console.log function
    Lazy_Logger.to_console = function() {};
  } else {
    Lazy_Logger.to_console = function( emitted_log ) {
      var diff = lap_timer( emitted_log._timestamp );
      
      diff > 1 && console.log( lap_timer_string( diff ) );
      
      console.log.apply( console, to_console_parameters( emitted_log ) );
    };
  } // Lazy_Logger.to_console()
  
  return Lazy_Logger;
  
  function Lazy_Logger( realm, emit, query ) {
    // logger private instance attributes
    var ___
      
      // Compiled Query:
      , _log_level
      , _all_log_levels
      
      , _instance_levels
      , _all_instance_levels
      
      , _methods_instance_levels
      , _all_methods_instance_levels
      
      // Current logger state
      , _gathered // number of gathered parameters to logger()
      , _log      // gathered log object
      , _level    // gathered level
      , _name     // gathered name
      , _method   // gathered method
    ;
    
    logger.valueOf       = valueOf;
    logger.reset         = reset;
    logger.set_log_level = set_log_level;
    logger.query_default = query_default;
    logger.query_clear   = query_clear;
    logger.query_add     = query_add;
    logger.query_remove  = query_remove;
    
    logger
      .query_default()
      .reset()
    ;
    
    emit || ( emit = Lazy_Logger.to_console );
    
    if ( query ) {
      logger
        .query_clear()
        .query_add( query )
      ;
    }
    
    return logger;
    
    function logger() {
      var l = arguments.length
        , i = -1
        , argument
      ;
      
      de&&ug( 'logger', { arguments: arguments, _gathered: _gathered, _log: _log } );
      
      while ( ++i < l ) {
        var value = arguments[ i ];
        
        // Arguments order: level, name, method, object
        switch( ++_gathered ) {
          case 1: // level
            de&&ug( 'logger( level )', value );
            
            if ( _log_level < value ) return reset();
            
            _level = value;
          break;
          
          case 2: // instance name
            de&&ug( 'logger( instance_name )', value );
            
            if ( typeof value == 'object' ) {
              // ToDo: Document and test direct use of instance 
              // Assume that this is a reference to an instance
              value = typeof value._get_name == 'function'
                ? value._get_name()
                : value.toString()
              ;
            }
            
            if ( no_log_for_instance( _instance_levels, value ) ) return reset();
            
            _name = value;
          break;
          
          case 3: // method
            de&&ug( 'logger( method )', value );
            
            var instance_levels =  _methods_instance_levels[ value ];
            
            if ( no_log_for_instance( instance_levels, _name ) ) {
              // Now try with any_other_method
              instance_levels = _methods_instance_levels[ Lazy_Logger.any_other_method ];
              
              if ( no_log_for_instance( instance_levels, _name ) ) return reset();
            }
            
            _method = value;
          break;
          
          default:
            de&&ug( 'logger( message )', value );
            
            var object_position = _gathered - 4
              , trailer = object_position > 0 ? '_' + object_position : ''
            ;
            
            if ( object_position == 0 ) {
              // This is the first object logged, add log meta data
              _log = {
                flow       : 'log',
                _timestamp : new Date(),
                _level     : _level,
                _realm     : realm,
                _name      : _name,
                _method    : _method
              };
            }
            
            switch( typeof value ) {
              case 'object':
                if ( toString.call( value ) === '[object Array]' ) {
                  _log[ 'values' + trailer ] = value;
                } else {
                  for ( var p in value ) {
                    _log[ p ] || ( _log[ p ] = value[ p ] );
                  }
                }
              break;
              
              case 'string':
                _log[ 'message' + trailer ] = value;
              break;
              
              case 'number':
                _log[ 'value' + trailer ] = value;
              break;
              
              case 'function': // a function to directly alter the _log object
                value( _log, object_position );
              break;
            }
          break;
        } // switch( ++_gathered )
      } // while argument
      
      de&&ug( 'logger(), _gathered', _gathered );
      if ( _gathered >= 4 ) {
        de&&ug( 'logger(), emit' );
        
        emit( _log );
        
        logger.reset();
      }
      
      return true;
      
      function no_log_for_instance( instance_levels, instance_name ) {
        de&&ug( "logger.no_log_for_instance()", { instance_levels: instance_levels, instance_name: instance_name } );
        
        if ( ! instance_levels ) return true;
        
        var level = instance_levels[ instance_name ];
        
        if ( typeof level == 'number' && level >= _level ) return false;
        
        // Now try with any_other_instance
        level = instance_levels[ Lazy_Logger.any_other_instance ];
        
        if ( typeof level != 'number' ) return true;
        
        de&&ug( "logger.no_log_for_instance()", { log_level: _log._level, level: level } );
        
        return level < _level;
      } // no_log_for_instance()
      
      function reset() {
        logger.reset();
        
        return false;
      }
    } // logger()
    
    // logger() instance methods
    
    /* ----------------------------------------------------------------------------------
       valueOf()
       
       Returns the supremum of the log level (log_level + 1) of the highest log level of
       all query terms.
       
       valueOf() is called implicitly by the JavaScript interpretor when the log Object
       is used as an operand in arythmetic or comparison expressions.
       
       This allows to use "logger" as an integer in expressions such as:
         logger > 5
    */
    function valueOf() {
      return _log_level + 1;
    } // valueOf()
    
    // reset(), resets logger's state
    function reset() {
      de&&ug( 'logger.reset()' );
      
      // No argument gathered yet
      _gathered = 0;
      
      _log = {};
      
      return this;
    } // reset()
    
    function set_log_level( level ) {
      de&&ug( 'logger.set_log_level(): ' + level );
      
      return this
        .query_clear()
        .query_add( [ { _level: level } ] )
      ;
    } // set_log_level()
    
    function query_default() {
      de&&ug( 'logger.query_default()' );
      
      return this.set_log_level( Lazy_Logger.default_log_level );
    } // query_default()
    
    function query_clear() {
      de&&ug( 'logger.query_clear()' );
      
      _log_level                   = -1;
      _all_log_levels              = [];
      
      _instance_levels             = {};
      _all_instance_levels         = {};
      
      _methods_instance_levels     = {};
      _all_methods_instance_levels = {};
      
      return this;      
    } // query_clear()
    
    // Filter-out query terms that are not for this log realm
    function query_filter( term ) {
      var flow = term.flow;
      
      if ( flow && flow != 'log' ) return false; // This term is not for a log dataflow
      // flow is 'log' or not defined
      
      var _realm = term._realm;
      
      if ( _realm && _realm != realm ) return false; // There is a realm and it does not match this logger's realm
      // Has no realm or real is this logger's realm
      
      return true;
    } // query_filter()
    
    // Retrieve requested level from term
    function get_term_level( term ) {
      var level = term._level;
      
      if ( typeof level == 'object' && level != null && level.length == 2 && level[ 0 ] == '<=' ) {
        // Bellow of equal expression: [ '<=', level ]
        level = level[ 1 ];
      }
      
      if ( typeof level != 'number' ) {
        level = Lazy_Logger.default_log_level;
      }
      
      return level;
    } // get_term_level()
    
    function query_add( query ) {
      if ( ! query ) return this;
      
      query
        .filter( query_filter )
        
        .forEach( function( term ) {
          // Set _log_level
          var term_level = get_term_level( term );
          
          if ( term_level > _log_level ) _log_level = term_level;
          
          _all_log_levels.push( term_level );
          
          // Set _instance_levels[ name ]
          var name = term._name || Lazy_Logger.any_other_instance;
          
          set_instance_levels( _instance_levels, name, term_level, _all_instance_levels );
          
          // Set _methods_instance_levels[ method ][ name ]
          var method = term._method || Lazy_Logger.any_other_method
            , instance_levels = _methods_instance_levels[ method ]
          ;
          
          if ( ! instance_levels ) {
            instance_levels = _methods_instance_levels[ method ] = {};
                          _all_methods_instance_levels[ method ] = {};
            }
          
          set_instance_levels( instance_levels, name, term_level, _all_methods_instance_levels[ method ] );
          
          return;
          
          function set_instance_levels( instance_levels, name, term_level, all_instance_levels ) {
            if ( ! instance_levels[ name ] || term_level > instance_levels[ name ] ) {
              instance_levels[ name ] = term_level;
            }
            
            ( all_instance_levels[ name ] || ( all_instance_levels[ name ] = [] ) ).push( term_level );
          }
        } ) // for all expressions to add
      ;
      
      de&&ug( 'logger.query_add()', {
        _log_level                  : _log_level,
        _instance_levels            : _instance_levels,
        _methods_instance_levels    : _methods_instance_levels,
        _all_log_levels             : _all_log_levels,
        _all_instance_levels        : _all_instance_levels,
        _all_methods_instance_levels: _all_methods_instance_levels
      } );
      
      return this;
    } // query_add()
    
    function query_remove( query ) {
      if ( ! query ) return this;
      
      // Assume that remove terms were previously added using query_add()
      
      query
        .filter( query_filter )
        
        .forEach( function( term ) {
          // Remove level from _all_log_levels[]
          var term_level = get_term_level( term );
          
          _log_level = remove_level( _all_log_levels, term_level, _log_level );
          
          // Remove level from _all_instance_levels[]
          var name = term._name || Lazy_Logger.any_other_instance;
          
          remove_instance_level( _instance_levels, _all_instance_levels, name, term_level );
          
          // Remove level from _all_methods_instance_levels[ method ]
          var method = term._method || Lazy_Logger.any_other_method;
          
          remove_instance_level( _methods_instance_levels[ method ], _all_methods_instance_levels[ method ], name, term_level );
          
          if ( Object.keys( _methods_instance_levels[ method ] ).length == 0 ) {
            delete     _methods_instance_levels[ method ];
            delete _all_methods_instance_levels[ method ];
          }
          
          return;
          
          function remove_instance_level( levels, all_instance_levels, name, term_level ) {
            var level = levels[ name ] = remove_level( all_instance_levels[ name ], term_level, levels[ name ] );
            
            if ( level == -1 ) {
              // No more levels for this name
              // Delete name from levels[] and all_instance_levels[]
              delete              levels[ name ];
              delete all_instance_levels[ name ];
            }
          } // remove_instance_level()
          
          function remove_level( levels, term_level, level ) {
            if ( term_level == level ) {
              // Remove highest level for these levels
              levels.sort( levels_organizer );
              levels.pop(); // remove the last one which should be level
              
              var l = levels.length;
              
              return l ? levels[ l - 1 ] : -1;
            } else {
              levels.splice( levels.indexOf( term_level ), 1 );
              
              return level; // unchanged
            }
            
            // Sorting log levels in ascending order
            function levels_organizer( a, b ) {
              return a < b ? -1 : a > b ? 1 : 0;
            }
          } // remove_level()
        } ) // for all expressions to remove
      ;
      
      de&&ug( 'logger.query_remove()', {
        _log_level                  : _log_level,
        _instance_levels            : _instance_levels,
        _methods_instance_levels    : _methods_instance_levels,
        _all_log_levels             : _all_log_levels,
        _all_instance_levels        : _all_instance_levels,
        _all_methods_instance_levels: _all_methods_instance_levels
      } );
      
      return this;
    } // query_remove()
  } // Lazy_Logger()
  
  function to_console_parameters( t ) {
    var parameters = [
        timestamp_string( t._timestamp )
      + ' #' + t._level
      + ' ' + t._realm
      + '[ ' + t._name
      + ' ].' + t._method + '()'
    ];
    
    for( var p in t ) {
      switch( p ) {
        case 'flow':
        case '_realm':
        case '_timestamp':
        case '_level':
        case '_name':
        case '_method':
        break;
        
        default:
          parameters.push( '- ' + p + ':', t[ p ] );
      }
    }
    
    return parameters;
  } // to_console_parameters()
} ); // lazy_logger.js
