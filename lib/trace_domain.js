/*  trace_domain.js
    
    Copyright (C) 2013, 2014, Connected Sets

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
  if ( typeof require === 'function' ) {
    module.exports = Trace_Domain;
  } else {
    exports.Trace_Domain = Trace_Domain;
  }
  
  var log = console.log;
  
  /* --------------------------------------------------------------------------
     Trace_Domain( realm, emit [, query ] )
     
     Returns a trace() Function Object to emit traces from a realm.
     
     Trace_Domain() can be invoqued with or without new.
     
     Parameters:
     - realm (String): a name for traces emitted by this trace(). It could be
       anything that the application defines but this is intended to be used
       as a class name in an object-oriented system.
       
       Connected Sets' reactive dataflow modules define the realm as pipelet
       type names.
     
     - emit (Function): to emit traces, signature is:
         emit( trace )
       
       Where the trace parameter is a JavaScript object with the following
       attributes:
       
       - flow     (String): always 'trace'. Intended to deferentiate with
         other event flows in a dataflow system.
       
       - _timestamp (Date): when the trace object was created.
       
       - _level  (Integer): this trace level, see definition in the
         "Trace Levels" section bellow.
         
       - _realm   (String): this trace's realm (the first parameter of Trace_Domain()
       
       - _name    (String): the name of the instance
       
       - _method  (String): the name of the traced instance method
       
       - zero or more additional traced attributes and associated values
       
       Example of trace Object that may be emitted:
         {
           flow      : 'trace',                   // traces dataflow name
           _timestamp: '2014/04/21 21:32:12.038', // when the trace was generated
           _level    : 6,                         // Information
           _realm    : 'order',                   // the pipelet name
           _name     : 'books by author',         // pipelet instance name
           _method   : '_add',                    // instance method order.._add()
           count     : 5                          // one additional trace attribute
         }
         
         When directed to console.log(), this trace may be formatted on a sigle
         line as:
         
           2014/04/21 21:32:12.038 - 6, books by author( order ).._add(), count: 5
         
         Most importantly these trace Objects can be consumed by a downstream
         trace consumers.
         
         The trace dataflow can be filtered to not only restrict the amount of
         trace displayed but also the amount of traces actually generated using
         a query as defined by the query parameter bellow.
       
     - query: (Optional Array of Objects) initial trace query. For a defintion
       of trace queries, refer to the "Trace Query" section bellow.
       
       The default query is defined by the trace method query_default() defined
       bellow.
     
     Returns:
     - trace( ... ) (Function Object) which is invoqued to attempt the emission
       of traces. The full definition of trace is found in the section
       "Invoquing trace" bellow.
       
       The trace Function is also used as an Object which exposes the following
       additional methods:
       
       - valueOf(): Overloads Object.valueOf() to get the highest trace level
         that this realm may emit.
         
         Typically used to test if the trace level is higher than the current
         trace e.g.:
           trace >= 5 && ...
         
         Returns said highest trace level.
       
       - reset(): resets the current trace value.
         
         Returns trace.
       
       - set_level( level ): sets the highest trace level that this real
         should emit. This method may be used if query_add() is not used to
         limit emited traces.
         
         Returns trace.
       
       - query_default(): Sets the query to its default value which specifies
         that this will emit traces for any instance and any method at level
         Trace_Domain.default_trace_level, which is initially set to 5
         (Notice).
         
         Returns trace.
       
       - query_clear(): after this the trace level is set to zero (no trace
         can be emited) and the query is set to discard all traces.
         
         Returns trace.
       
       - query_add( query ): adds and-expressions to the trace query. For the
         definition of queries see bellow.
         
         Returns trace.
       
       - query_remove( query ): removes and-expressions to the trace query. For
         the definition of queries see bellow.
         
         This method is not yet implemented. To remove and-expressions, one
         should use trace.query_clear().query_add( new_query ) instead.
         
         Returns trace.
     
     Trace Levels:
       Trace levels are defined per RFC 5424 (syslog) severity levels with
       some extended levels. Some descriptions bellow are from or edited from
         http://en.wikipedia.org/wiki/Syslog#Severity_levels
       
       This section is therefore licenced under the terms available at
         http://en.wikipedia.org/wiki/Wikipedia:Text_of_Creative_Commons_Attribution-ShareAlike_3.0_Unported_License
       :
       
       0: Emergency, system is unusable:
            A "panic" condition usually affecting multiple apps/servers/sites.
            At this level it would usually notify all tech staff on call.
       
       1: Alert, action must be taken immediately:
            Should be corrected immediately, therefore notify staff who can fix
            the problem. An example would be the loss of a primary ISP
            connection.
       
       2: Critical:
            Should be corrected immediately, but indicates failure in a
            secondary system, an example is a loss of a backup ISP connection.
       
       3: Error:
            Non-urgent failures, these should be relayed to developers or admins.
            Each item must be resolved within a given time.
       
       4: Warning:
            Warning messages, not an error, but indication that an error will
            occur if action is not taken, e.g. file system 85% full - each item
            must be resolved within a given time.
       
       5: Notice, normal but significant condition:
            Events that are unusual but not error conditions - might be
            summarized in an email to developers or admins to spot potential
            problems - no immediate action required.
       
       6: Informational:
            Normal operational messages - may be harvested for reporting,
            measuring throughput, etc. - no action required.
       
       7: Debuging:
            Information useful to developers for debugging the application, not
            useful during operations.
       
       8: Verbose debugging (not specified in RFC 5424):
            Additional information for developpers to diagnose harder issues.
       
       9: Extensive debugging (not specified in RFC 5424):
            Full debugging information for developpers to diagnose the hardest
            issues, all data is dumped to the exception of passwords and other
            secret keys and credentials.
     
     Trace Query:
       Trace queries are Arrays of JavaScript Objects defining Or-expressions
       - i.e. [ e1 or e2 ... or ei ... ]
       
       Each expression is an and expression defined using a JavaScript Object
       which attribute/value pairs define and-terms
       - i.e. { t1 and t3 ... and ti ... }
       
       The following terms are processed by this trace Function to filter the
       traces that can be emited with it:
       
       - flow    (String): the queried dataflow, should be 'trace' or not
         provided, otherwise the query term will be ignored.
       
       - _level (Integer): the level at or bellow which traces are consumed.
         
         It can be specified with an integer or using a query expression which
         can only be a "bellow or equal" comparison expression - e.g.
         "_level <= 5" which would be specified using the Array [ '<=', 5 ]
         
         If any other expression is provided, _level is set to the default
         provided in Trace_Domain.default_trace_level which is initially set
         to 5 (Notice).
       
       - _realm  (String): the real of the consumed trace. If not specified the
         expression means "For Any Realm".
       
       - _name   (String): the name of the instance for which traces are
         consumed. If not specified, the expresion stands for
         "For Any Other Instance"
       
       - _method (String): the name of the method for which traces are consumed.
         If not specified, the expression means "For Any Other Method".
       
       - other terms are not used to filter traces but should be used by a
         downstream dataflow filter.
     
     Invoquing trace( level, name, method, values ... )
     
     Parameters:
     
     - level (Integer): This trace level
     
     - name   (String): A name, that could be anything defined by the
       application but is intended to be an instance name.
       
     - method (String): Intended to be an instance method name, but could be
       anything defined by the application.
       
     - values ...: All other parameters are trace values defined as JavaScript
       Objects defined by the application which attribute/value pairs will be
       merged into the emited trace Object.
       
       If attribute name that is already used in the trace Object the new
       value will be discarded silently and the the previous value will remain,
       so care should be taken in choosing attribute names, at least to avoid
       collisions, one should avoid names starting with '_' and the attribute
       'flow' should be reserved.
       
       If the Object is an instance of Array, it will be merged into the trace
       Object with the attribute name "values" if it is the first value, or
       "values_1" if it is the second value, and "values_i" if it is the (i)th
       value.
       
       If a value is not an Object and because each value must be tagged
       with an attribute name, this name may be generated by trace() for the
       following non-Object types as determined by typeof:
       
       - (string): the attribute name will be "message" the first time,
         "message_1" if it is the second value, and "message_i" for the (i)th
         value.
         
       - (number): the attribute name will be "value", then "value_1" ...
       
       - (function): the function will be invoked with the following signature:
       
           fn( trace, value_number )
         
         Where:
         - trace (Object): is the current trace Object being prepared for
           emission.
         
         - value_number: is 0 if the function is the first value, 1 the if it
           is the second and so forth.
     
     Invocation of trace()
       The trace() function object is used to attempt the emission of traces in
       the most efficient possible way, especially when the specified trace is
       not consumed. E.g.:
       
         trace >= 6
           && trace( 6, 'user', '__transform' )
           && trace( { count: 5, id: 3 } )
         ;
       
       This would emit a trace such as:
         {
           flow      : 'trace',                   // trace dataflow name
           _timestamp: '2014/04/21 21:32:12.038', // when the trace was generated
           _level    : 6,                         // trace level specified while calling trace
           _realm    : 'order',                   // the realm used to invoque Trace_Domain()
           _name     : 'user',                    // an instance name
           _method   : '__transform',             // a method name
           count     : 5,                         // from trace( { count: 5, id: 3 } )
           id        : 3                          // from trace( { count: 5, id: 3 } )
         }
         
       This trace would be emited only if consumed, i.e. if a query
       and-expression accepted this trace.
       
       What makes this efficient is the use of the processive && operator that
       will evaluate the next term only if the previous returned true.
       
       The combination "&& trace( ... )" provides for a progressive evaluation
       of trace parameters which are gathered as the function progresses as long
       as trace() returns true.
       
       The first term "trace >= 6" uses "trace" as an Object which valueOf()
       returns the highest trace level that this trace may emit. If this level
       is above or equal to 6, the trace may progress to the next evaluation.
       
       The second term "trace( 6, 'user', '__transform' )" provides trace()
       with its first 3 parameters ( level, name, and method ) and returns
       true if the trace query accepts traces at or below level 6 for the
       instance 'user' of the trace realm for the method '__transform'.
       
       Only if this second term succeeds will the last invocation of trace()
       proceed. This is typically where heavier trace code might be required
       but the execution of such heavier code will only happen if the trace
       is consumed, greatly reducing the run-time use of traces in a
       production environement.
       
       In order to give more flexibility to programmers, the trace function can
       be invoqued up to four times for each trace, each time providing one
       of the parameters to trace(). The example bellow would be semantically
       equivalent to the previous one, emitting the same trace under the same
       query conditions:
       
         trace >= 6
           && trace( 6 )
           && trace( 'user' )
           && trace( '__transform' )
           && trace( { count: 5, id: 3 } )
         ;
       
       Although semantically equivalent, it may be faster to execute when
       traces are not consumed by the current query. This is because after
       the evaluation of each parameter trace() is allowed to return false,
       cancelling the evaluation of the later terms.
       
       The first two terms are semantically redundant but because valueOf()
       will execute quite faster than trace( 6 ), it is more efficient
       whenever the highest consumed trace level is less than 6.
       
       But there is no obligation to do so and for lower levels, such as
       errors that are very likeley to be consumed, it would be more
       efficient to use the following form:
       
         trace( 3 )
           && trace( 'user' )
           && trace( '__transform' )
           && trace( 'Bad Request' )
         ;
       
       Acually, in this case it probably makes sense to invoque trace() only
       once as errors should be consumed:
       
         trace( 3, 'user', '__transform', 'Bad Request' )
  */
  function Trace_Domain( realm, emit, query ) {
    // trace private instance attributes
    var ___
      
      // Compiled Query, this is the default:
      , _trace_level
      , _all_trace_levels
      
      , _instance_levels
      , _all_instance_levels
      
      , _methods_instance_levels
      , _all_methods_instance_levels
      
      // Current trace state
      , _gathered // number of gathered parameters to trace()
      , _trace    // gathered trace object
      , _level    // gathered level
      , _name     // gathered name
      , _method   // gathered method
    ;
    
    trace.valueOf       = valueOf;
    trace.reset         = reset;
    trace.set_level     = set_level;
    trace.query_default = query_default;
    trace.query_clear   = query_clear;
    trace.query_add     = query_add;
    trace.query_remove  = query_remove;
    
    trace
      .query_default()
      .reset()
    ;
    
    if ( query ) {
      trace
        .query_clear()
        .query_add( query )
      ;
    }
    
    return trace;
    
    function trace() {
      var l = arguments.length
        , i = -1
        , argument
      ;
      
      // ToDo: make these logs traces
      log( 'trace', { arguments: arguments, _gathered: _gathered, _trace: _trace } );
      
      while ( ++i < l ) {
        var value = arguments[ i ];
        
        // Arguments order: level, name, method, object
        switch( ++_gathered ) {
          case 1: // level
            if ( _trace_level < value ) return reset();
            
            _level = value;
          break;
          
          case 2: // instance name
            if ( typeof value == 'object' ) {
              // Assume that this is a reference to an instance
              value = typeof value._get_name == 'function'
                ? value._get_name()
                : value.toString()
              ;
            }
            
            if ( no_trace_for_instance( _instance_levels, value ) ) return reset();
            
            _name = value;
          break;
          
          case 3: // method
            var instance_levels =  _methods_instance_levels[ value ];
            
            if ( no_trace_for_instance( instance_levels, _name ) ) {
              // Now try with any_other_method
              instance_levels = _methods_instance_levels[ Trace_Domain.any_other_method ];
              
              if ( no_trace_for_instance( instance_levels, _name ) ) return reset();
            }
            
            _method = value;
          break;
          
          default:
            var object_position = _gathered - 4
              , trailer = object_position > 0 ? '_' + object_position : ''
            ;
            
            if ( object_position == 0 ) {
              // This is the first object traced, add trace meta data
              _trace = {
                flow       : 'trace',
                _timestamp : new Date(),
                _level     : _level,
                _realm     : realm,
                _name      : _name,
                _method    : _method
              };
            }
            
            switch( typeof value ) {
              case 'object':
                if ( value instanceof Array ) {
                  _trace[ 'values' + trailer ] = value;
                } else {
                  for ( var p in value ) {
                    _trace[ p ] || ( _trace[ p ] = value[ p ] );
                  }
                }
              break;
              
              case 'string':
                _trace[ 'message' + trailer ] = value;
              break;
              
              case 'number':
                _trace[ 'value' + trailer ] = value;
              break;
              
              case 'function': // a function to directly alter the _trace object
                value( _trace, object_position );
              break;
            }
          break;
        } // switch( ++_gathered )
      } // while argument
      
      if ( _gathered >= 4 ) {
        emit( _trace );
        
        trace.reset();
      }
      
      return true;
      
      function no_trace_for_instance( instance_levels, instance_name ) {
        log( "no_trace_for_instance", { instance_levels: instance_levels, instance_name: instance_name } );
        
        if ( ! instance_levels ) return true;
        
        var level = instance_levels[ instance_name ];
        
        if ( typeof level == 'number' && level >= _level ) return false;
        
        // Now try with any_other_instance
        level = instance_levels[ Trace_Domain.any_other_instance ];
        
        if ( typeof level != 'number' ) return true;
        
        log( "no_trace_for_instance", { _trace_level: _trace._level, level: level } );
        
        return level < _level;
      } // no_trace_for_instance()
      
      function reset() {
        trace.reset();
        
        return false;
      }
    } // trace()
    
    // trace() instance methods
    function valueOf() {
      return _trace_level;
    } // valueOf()
    
    function reset() {
      _gathered = 0;
      
      _trace = {};
      
      return this;
    } // reset()
    
    function set_level( level ) {
      _trace_level = level;
      
      return this;
    } // set_level()
    
    function query_default() {
      this.query_clear();
      
      _trace_level       = Trace_Domain.default_trace_level;
      _all_trace_levels  = [ _trace_level ];
      
      var any_other_instance = Trace_Domain.any_other_instance
        , any_other_method   = Trace_Domain.any_other_method
      ;
      
      _instance_levels[ any_other_instance ] = _trace_level;
      
      _all_instance_levels[ any_other_instance ] = [ _trace_level ];
      
      _methods_instance_levels[ any_other_method ] = {};
      _methods_instance_levels[ any_other_method ][ any_other_instance ] = _trace_level;
      
      _all_methods_instance_levels[ any_other_method ] = {};
      _all_methods_instance_levels[ any_other_method ][ any_other_instance ] = [ _trace_level ];
      
      return this;
    } // query_default()
    
    function query_clear() {
      _trace_level                 = 0;
      _all_trace_levels            = [];
      
      _instance_levels             = {};
      _all_instance_levels         = {};
      
      _methods_instance_levels     = {};
      _all_methods_instance_levels = {};
      
      return this;      
    } // query_clear()
    
    function query_filter( term ) {
      var flow = term.flow;
      
      if ( flow && flow != 'trace' ) return false; // This term is not for a trace dataflow
      // flow is 'trace' or not defined
      
      var _realm = term._realm;
      
      if ( _realm && _realm != realm ) return false; // There is a realm and it does not match this trace realm
      // Has no realm or real is this trace domain's realm
      
      return true;
    } // query_filter()
    
    function query_level( term ) {
      var level = term._level;
      
      if ( typeof level == 'object' && level != null && level.length == 2 && level[ 0 ] == '<=' ) {
        // Bellow of equal expression: [ '<=', level ]
        level = level[ 1 ];
      }
      
      if ( typeof level != 'number' ) {
        level = Trace_Domain.default_trace_level;
      }
      
      return level;
    } // query_level()
    
    function query_add( query ) {
      if ( ! query ) return this;
      
      query
        .filter( query_filter )
        
        .forEach( function( term ) {
          // Set _trace_level
          var level = query_level( term );
          
          _all_trace_levels.push( level );
          
          level > _trace_level && ( _trace_level = level );
          
          // Set _instance_levels[ name ]
          var name = term._name || Trace_Domain.any_other_instance;
          
          set_instance_levels( _instance_levels, name, level, _all_instance_levels );
          
          // Set _methods_instance_levels[ method ][ name ]
          var method = term._method || Trace_Domain.any_other_method
            , instance_levels = _methods_instance_levels[ method ]
          ;
          
          if ( ! instance_levels ) {
            instance_levels = _methods_instance_levels[ method ] = {};
                          _all_methods_instance_levels[ method ] = {};
          }
          
          set_instance_levels( instance_levels, name, level, _all_methods_instance_levels[ method ] );
          
          return;
          
          function set_instance_levels( instance_levels, name, level, all_instance_levels ) {
            if ( ! instance_levels[ name ] || level > instance_levels[ name ] ) {
              instance_levels[ name ] = level;
            }
            
            ( all_instance_levels[ name ] || ( all_instance_levels[ name ] = [] ) ).push( level );
          }
        } ) // for all expressions to add
      ;
      
      log( 'query_add()', {
        _trace_level                : _trace_level,
        _instance_levels            : _instance_levels,
        _methods_instance_levels    : _methods_instance_levels,
        _all_trace_levels           : _all_trace_levels,
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
          // Remove level from _all_trace_levels[]
          var level = query_level( term );
          
          _trace_level = remove_level( _all_trace_levels, level, _trace_level );
          
          // Remove level from _all_instance_levels[]
          var name = term._name || Trace_Domain.any_other_instance;
          
          remove_instance_level( _instance_levels, _all_instance_levels, name, level );
          
          // Remove level from _all_methods_instance_levels[ method ]
          var method = term._method || Trace_Domain.any_other_method;
          
          remove_instance_level( _methods_instance_levels[ method ], _all_methods_instance_levels[ method ], name, level );
          
          if ( Object.keys( _methods_instance_levels[ method ] ).length == 0 ) {
            delete     _methods_instance_levels[ method ];
            delete _all_methods_instance_levels[ method ];
          }
          
          return;
          
          function remove_instance_level( levels, all_instance_levels, name, level ) {
            var level = levels[ name ] = remove_level( all_instance_levels[ name ], level, levels[ name ] );
            
            if ( level == 0 ) {
              // No more levels for this name
              // Delete name from levels[] and all_instance_levels[]
              delete              levels[ name ];
              delete all_instance_levels[ name ];
            }
          } // remove_instance_level()
          
          function remove_level( levels, level, trace_level ) {
            if ( level == trace_level ) {
              // Remove highest level for these levels
              levels.sort( trace_level_sorter );
              levels.pop(); // remove the last one which should be level
              
              var l = levels.length;
              
              return l ? levels[ l - 1 ] : 0;
            } else {
              levels.splice( levels.indexOf( level ), 1 );
              
              return trace_level; // unchanged
            }
            
            // Sorting trace levels in ascending order
            function trace_level_sorter( a, b ) {
              return a < b ? -1 : a > b ? 1 : 0;
            }
          } // remove_level()
        } ) // for all expressions to remove
      ;
      
      log( 'query_remove()', {
        _trace_level                : _trace_level,
        _instance_levels            : _instance_levels,
        _methods_instance_levels    : _methods_instance_levels,
        _all_trace_levels           : _all_trace_levels,
        _all_instance_levels        : _all_instance_levels,
        _all_methods_instance_levels: _all_methods_instance_levels
      } );
      
      return this;
    } // query_remove()
  } // Trace_Domain()
  
  // Trace_Domain Public Class Attributes
  Trace_Domain.any_other_instance  = 'Any Other Instance';
  Trace_Domain.any_other_method    = 'Any Other Method';
  Trace_Domain.default_trace_level = 5;
} )( this ); // trace_domain.js
