/*  cancelable.js

    Copyright (c) 2013-2018, Reactane

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
( 'cancelable', [ './console_logger', './javascript' ], function( Console_Logger, javascript ) {
  'use strict';
  
  var log              = Console_Logger().bind( null, 'cancelable' )
    , de               = false
    , ug               = log
    , is_function      = javascript.is_function
    , is_number        = javascript.is_number
    , is_array         = javascript.is_array
    , is_error         = javascript.is_class( 'Error' )
    , next_tick        = javascript.next_tick
    , push             = [].push
  ;
  
  return {
    limiter: cancelable_limiter,
    map    : cancelable_map
  };
  
  /* --------------------------------------------------------------------------
      @function cancelable_limiter( limit )
      
      @manual programmer
      
      @short Cancelable task limiter for @@function:cancelable_map()
      
      @parameters
      - **linit**:
        - (falsy): No limit, all requested tasks are provided immediately.
        
        - (Positive Integer): Maximum number of concurrent tasks.
        
        - (Function): Signature ```get( count, got ) -> cancel```: a
          cancelable_limiter() instance, e.g. from a shared limiter.
          
          It can also be any instance of a custom cancelable limiter such as
          a cancelable time-based or resource-based limiter.
      
      @returns Cancelable task limiter instance:
      - (Function) ```get( count, got ) -> cancel```: Request **count** tasks:
        - **count** (Integer): number of requested tasks. If zero,
        *got()* will not be called.
        
        - **got( provided, done )** (Function):
        Called zero, one, or many times, each time there are some tasks
        provided, and until **count** is reached or until canceled:
          - **provided** (Integer): the number of tasks provided. If this
          is less than **count**, more will be provided later when some
          task(s) complete.
          
          - **done( completed )** (Function): callback when a task is
          complete, allowing to run waiting tasks if any. This callback
          function can be called several times, until all "provided" tasks
          are done:
            - **completed** (Integer): optional number of completed tasks,
            default is ```1```.
        
        - **cancel** (Function): returned by get(). Call this function
        to cancel any waiting tasks for this request. After cancellation,
        got() will no-longer be called, but ongoing tasks provided by got()
        must still complete by calling done() to return all provided tasks.
      
      - (unspecified): if **limit** is neither a number nor a get()
      function. Can change without notice, i.e. whithout changing API major
      version number.
  */
  function cancelable_limiter( limit ) {
    var queue   = []
      , limited = !! limit
      , ___
    ;
    
    return is_number( limit )
      ? get
        // shared limiter: get() from another limiter instance
      : limit
    ;
    
    function get( count, got, done ) { // parameter done is ignored from API call, see bellow
      if ( count > 0 ) {
        var provided = limited && limit < count ? limit : count; // limited ? Math.min( limit, count ) : count
        
        limit -= provided; // negative if limit was zero
        
        done = this == queue ? done : instance_done; // use instance_done() if not provided by dequeue()
        
        done.provided = ( done.provided || 0 ) + provided;
        
        de&&ug( 'limiter#get():', { count: count, provided: provided, limit: limit, 'done.provided': done.provided } );
        
        count > provided && queue.push( [ count - provided, got, done ] );
        
        provided && got( provided, done );
      }
      
      // cancel(): only used by get() API caller, discarded by dequeue()
      return function() {
        queue = queue.filter( function( _ ) {
          return _[ 1 ] != got
        } );
      } // cancel()
      
      function instance_done( completed ) {
        /*
          instance_done() is always called within the context of the initial
          get() call from the API.
          
          Subsequent internal calls to get() from dequeue() receive the
          initial instance_done() from the "done" parameter.
          
          This is important so that the "provided" instance variable is
          the same for all calls to instance_done(). This allows to check
          if all calls to instance_done() return no more tasks than
          provided over all calls to got() from the initial get() API
          call.
        */
        completed = is_number( completed ) ? completed : 1;
        
        if ( completed < 0 )
          return error( 'negative', completed )
        ;
        
        var provided = done.provided -= completed;
        
        de&&ug( 'limiter#done():', { completed: completed, provided: provided, limit: limit } );
        
        if ( provided < 0 ) {
          error( 'excess', -provided );
          
          completed += provided;
          
          done.provided = 0;
        }
        
        completed
          && ( limit += completed ) > 0 // can be negative if unlimited
             // Processing dequeue() asynchronously to gather as many counts as possible
          && next_tick( dequeue )
        ;
        
        function error( message, value ) {
          log( 'limiter#done(), rejected ' + message + ' completed tasks:', value )
        }
      } // instance_done()
    } // get()
    
    function dequeue() {
      while ( limit && queue.length )
        get.apply( queue, queue.shift() )
    } // dequeue()
  } // cancelable_limiter()
  
  /* --------------------------------------------------------------------------
      @function cancelable_map( values, limit, f, done, cancel_on_error )
      
      @manual programmer
      
      @short Cancellable asynchronous map, filter, and flat map
      
      @parameters
      - **values** (\\[]): values to map over
      
      - **limit** (Integer, Function, or falsy): for
      @@function:cancelable_limiter() to limit concurrent operations.
      
      - **f** (Function): to transform values asynchronously. Signature:
      ```( value, next, i ) -> cancel```:
        
        - **value**: ```values[ i ]```
        
        - **next** (Function): to call when transformed value is available
        or when canceled.
        Signature: ```( errors, value, more ) -> undefined```:
          
          - **errors** (Error or Error\\[]): optional error(s) 
          
          - **value**: transformed value that will be emited by done() once
          all transformed values are collected.
          
          - **more** (Boolean): optional, to indicate that there are more
          values to come, calling next() at least one more time with an
          additional value. This can be used to implement an asynchronous
          flat_map().
        
        - **i** (Integer): the position of value in values.
        
        - **cancel** (Function): optional, to cancel asynchronous operation.
          When called, the current task should terminate as soon as possible
          then call *next()*.
          
          If the current task cannot be canceled, call *next()* when the
          task terminates, for the *cancelable_limiter()* instance to allow
          other task to run.
          
          Signature: ```( errors ) -> undefine```:
            - **errors** (Error\\[]): errors
      
      - **done** (Function): called when all values are collected of
      when canceled. Signature: ```( errors, values )```:
        
        - **errors** (Error\\[]): optional errors. If the
        last error is 'canceled', cancelable_map() was canceled before
        all values were processed. Errors may have a slot property if they
        result from an error while processing a particular value. The value
        if slot is i.
        
        - **values** (\\[]): all values transformed by f(), even if
        there are errors.
      
      - **cancel_on_error**: controls behavior on error(s) from *next()*:
          - When cancelling, *cancelable_map()* will cancel all ongoing
            tasks that have returned a cancel function (see above), will
            also cancel the *cancelable_limiter()* instance current
            *get()* request, and finally call *done()* with all errors
            and accumulated values if any.
          
          - When not cancelling, *cancelable_map()* will accumulate all
            errors and emit them along with all emited values when
            calling *done()*.
        
        Allowed *cancel_on_error* types are:
          - (falsy): accumulate errors, do not cancel on error
          
          - (true): cancel upon the first error(s) emitted by *next()*,
          
          - (Function): to decide if *cancelable_map()* should cancel or not.
            Signature: ```( errors, i ) -> cancel```:
            - **errors** (Error[]): list of errors while processing value
            at position *i*.
            
            - **i** (Integer): position of *value* in *values* which processing
            failed.
            
            - **cancel** (Boolean): if true, cancel
      
      @returns
      - **cancel** (Function): to cancel all ongoing tasks. May be called
        at most once. Subsequent calls will have no effect.
        
        Signature: ```( errors ) -> undefined```:
        - **errors** (Error, or Error[], or String): optional cancellation
        cause.
      
      @examples
      - All examples bellow import cancelable map and define values to iterate
      over as folows:
      
      ```javascript
        var cancelable = require( 'toubkal/lib/util/cancelable' )
          , map        = cancelable.map
          , values     = [ 1, 4, -1, 6, 7, -3, 24, 0, -8 ]
          , unlimited  = 0
        ;
      ```
      
      - Map over values synchronously:
      
      ```javascript
        map( values, unlimited, increment, done );
        
        function increment( value, next ) {
          // call next() synchronously, with no error, incrementing value
          next( null, value + 1 );
        }
        
        function done( error, values ) {
          // error is falsy
          console.log( values ) // [ 2, 5, 0, 7, 8, -2, 25, 1, -7  ];
        }
      ```
      
      - Filter-out negative values synchronously:
      
      ```javascript
        map( values, unlimited, positive, done );
        
        function positive( value, next ) {
          // call next() synchronously, with no error, incrementing value
          next( null, value > 0 ? value : undefined );
        }
        
        function done( error, values ) {
          // error is falsy
          console.log( values ) // [ 1, 4, 6, 7, 24 ];
        }
      ```
      
      - Map over values asynchronously:
      
      ```javascript
        map( values, unlimited, increment_delayed, done );
        
        function increment_delayed( value, next ) {
          setTimeout( increment, 100 );
          
          function increment\() {
            next( null, value + 1 );
          }
        }
        
        function done( error, values ) {
          // error is falsy
          console.log( values ) // [ 2, 5, 0, 7, 8, -2, 25, 1, -7  ];
        }
      ```
      
      - Cancel map after 2 asynchronous rounds, limited to 2 tasks at a time:
      
      ```javascript
        var by_2 = 2;
        
        // Cancel map after 210 milliseconds, i.e. after 4 values processed
        setTimeout(
          map( values, by_2, increment_delayed, done ),
          210
        );
        
        function increment_delayed( value, next ) {
          var timeout = setTimeout( increment, 100 );
          
          return cancel;
          
          function increment\() {
            next( null, value + 1 );
          }
          
          function cancel( reason ) {
            clearTimeout( timeout ); // effectivelly cancels increment()
            
            next( reason ); // notifies cancelable limiter of task termination
          }
        } // increment_delayed()
        
        function done( error, values ) {
          console.log( error, values ) // canceled [ 2, 5, 0, 7 ];
        }
      ```
  */
  function cancelable_map( values, limit, f, next, cancel_on_error ) {
    var count        = values.length
      , todo         = count
      , out          = []
      , i            = -1
      , slots        = [] // 0: initialized or not-cancelable running; Function: cancelable running; 1: done; 2: canceled
      , cancel_tasks = cancelable_limiter( limit )( count, map_provided )
      , all_errors   = null
      , asynchronous // initialy falsy, i.e. synchronous until this function terminated
      , canceled     // initialy fasly, set if cancel() is called.
      , ___          // always undefined to test values in done() and improve minification
    ;
    
    /*
      Throttle control, must work even if/when f() calls done()
      synchronously, i.e. before the loop in map_provided() completes.
      
      When all calls to done() are synchronous, call to next()
      is done after the end of the loop instead of within one_done()
      to reduce call stack depth.
    */
    // call next() if all calls to done() were synchronous, or there were no values
    de&&ug( 'map() end, todo:', todo );
    
    todo ? asynchronous = 1 : next( null, out );
    
    return cancel;
    
    function map_provided( provided, done ) {
      while ( provided-- )
        save_cancel( f( values[ ++i ], create_slot_and_done( i, done ), i ) )
    } // map_provided()
    
    function cancel( errors, slot ) {
      if ( ! canceled ) {
        canceled = 1;
        
        errors && add_all_errors( errors = to_errors( error, slot ), slot );
        
        add_all_errors( 'canceled', slot );
        
        de&&ug( 'map#cancel()', errors );
        
        cancel_tasks(); // always defined by cancelable_limiter() even if limit is zero
        
        if ( todo ) {
          slots = slots.map( cancel_slot );
          
          // After cancellation, additional values will be ignored
          todo = -1; // prevent call to next() after loop if synchronous
          
          next( all_errors, out )
        }
      }
      
      function cancel_slot( slot ) {
        
        return is_function( slot )
          ? ( slot( errors ), 2 ) // canceled
          : slot          // 0 (cannot be canceled) or 1 (already terminated)
      } // cancel_slot()
    } // cancel()
    
    function add_all_errors( errors, slot ) {
      push.apply( all_errors = all_errors || [], to_errors( errors, slot ) )
    } // add_all_errors()
    
    function to_errors( errors, slot ) {
      if ( errors )
        return ( is_array( errors ) ? errors : [ errors ] )
          .map( function( error ) {
            return to_error( error, slot )
          } )
    } // to_errors()
    
    function to_error( error, slot ) {
      if ( error ) {
        error = is_error( error ) ? error : new Error( error )
        
        if ( is_number( slot ) && ! is_number( error.slot ) ) error.slot = slot;
        
        return error;
      }
    } // to_error()
    
    function save_cancel( cancel_function ) {
      if ( slots[ i ] === 0 // initialized, not done synchronously
        && is_function( cancel_function ) // can be canceled with cancel_function()
      )
        slots[ i ] = cancel_function
      
      // Slots that are not cancelable may lead to memory leak if they never complete
    }
    
    // create slot and done()
    function create_slot_and_done( slot, done ) {
      // create slot as initialized
      slots[ slot ] = 0;
      
      // return one_done() closure bound to this specific slot, allowing to
      // verify that it is called no-more than once.
      return function( errors, value, more ) {
        if ( ! canceled ) {
          if ( ! more )
            if ( slots[ slot ] == 1 )
              // this slot is already done
              add_error( 'already done or canceled' )
            
            else {
              slots[ slot ] = 1; // this slot is done, cannot be canceled later
              
              --todo < 0 && add_error( 'too many calls to done' );
            }
          
          if ( errors ) {
            errors = to_errors( errors, slot );
            
            de&&ug( 'map(), errors:', errors );
            
            ( is_function( cancel_on_error )
              ? cancel_on_error( errors )
              : cancel_on_error
            ) ? cancel( errors, slot ) : add_all_errors( errors )
          }
          
          // push non-undefined values to output, even if there are errors
          value === ___ || out.push( value )
        }
        
        de&&ug( 'map#one_done():', { canceled: canceled, errors: errors, value: value, more: more, slot: slot, i: i, count: count, todo: todo, out: out } );
        
        // must call done() even if canceled or on error, task limiter is waiting for
        // all tasks to properly terminate
        more || done( 1 );
        
        // When terminated, call next() if call to one_done() is asynchronous with cancelable_map()
        todo || asynchronous && next( all_errors, out );
        
        function add_error( message ) {
          errors = to_errors( errors, slot ) || [];
          
          errors.push( to_error( message, slot ) );
        }
      } // one_done( errors, value, more ) 
    } // create_slot_and_done( slot, done )
  } // cancelable_map()  
} );
