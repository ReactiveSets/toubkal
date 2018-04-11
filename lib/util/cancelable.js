/*  cancelable.js

    Copyright (c) 2013-2018, Reactive Sets

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
    , de               = true
    , ug               = log
    , is_function      = javascript.is_function
    , is_number        = javascript.is_number
    , next_tick        = javascript.next_tick
  ;
  
  return {
    liniter: cancelable_limiter,
    map    : cancelable_map
  };
  
  /* --------------------------------------------------------------------------
      @function cancelable_limiter( limit )
      
      @manual programmer
      
      @short Shared concurrent task limiter for @@[function:cancelable_map]()
      
      @parameters:
      - *linit*:
        - (Positive Number): Maximum number of concurrent tasks.
        Creates a shared cancelable limiter.
        
        - (Function): assumed to be ```get()``` from another limiter instance,
        i.e. from a shared limiter.
      
      @returns:
      - (Function): get( count, got ) -> cancel: request tasks from liniter:
        - *count* (Number): truncated to its integer part: 
          - 0: no limit
          - > 0: number of requested tasks
        
        - *got* (Function): got( canceled, provided, done ): called one or many
        times, each time there are some tasks provided, and until *count*
        is reached or until canceled:
          - *canceled*:
            - falsy: not canceled
            - truly: cancellation reason or ```"canceled"``` if no reason was
            provided for cancelation. There will be no more calls to got()
            after cancellation.
          
          - *provided* (Integer): the number of tasks provided. If this
          is less than *count*, more will be provided later when some
          tasks complete.
          
          - *done* (Function): callback when a task is complete, allowing
          to run waiting tasks if any. This callback function can be called
          several times, until all "provided" tasks are done.
          If cancelled, done is ```undefined```.
          Signature is ```done( completed )```:
            - *completed* (Integer): optional number of completed tasks,
            default is ```1```.
        
        - *cancel* (Function): call this function to cancel this
        ```get()``` request. If still waiting, function ```got()``` will be
        called one last time with the error ```"canceled"``` and 0
        for provided. Signature: ```cancel( reason )```:
          - *reason* (String): optional, default is ```"canceled"```.
      
      - unspecified: if *limit* is neither a positive integer nor a Function,
      can change without notice.
  */
  function cancelable_limiter( limit ) {
    var queue = [], ___;
    
    // countrain limit to a literal integer
    return is_number( limit ) && ( limit = limit >> 0 ) >= 0
      ? get
      : limit // assumed to be get() from another limiter instance, i.e. from a shared limiter
    ;
    
    function get( count, got, done ) { // paramenter done is ignored from API call, see bellow
      de&&ug( 'limiter#get(), count:', count, ', limit:', limit );
      
      done = this == queue ? done : instance_done; // use instance_done() if not provided by dequeue()
      
      count = is_number( count ) ? count >> 0 : 1;
      
      if ( count > 0 ) {
        var provided = limit && limit < count ? limit : count; // limit ? Math.min( limit, count ) : count
        
        limit -= done.provided = provided;
        
        de&&ug( 'limiter#get(), provided:', provided );
        
        count > provided && queue.push( [ count - provided, got, done ] );
        
        provided && got( null, provided, done );
        
        return cancel; // only used by get() API caller, discarded by instance_done()#dequeue()
      }
      
      function cancel( reason ) {
        var found;
        
        queue = queue.filter( function( _ ) {
          return _[ 1 ] != got || ! ( found = _ )
        } );
        
        if ( found ) {
          de&&ug( 'limiter#cancel():', found, reason );
          
          // notify API caller
          got( reason || 'canceled' );
        }
          // else already canceled or terminated
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
          
          This shall be tested in a CI test.
        */
        is_number( completed ) || ( completed = 1 );
        
        if ( completed < 0 )
          return error( 'negative', completed )
        ;
        
        de&&ug( 'limiter#instance_done():', { completed: completed, provided: done.provided, limit: limit } );
        
        var provided = done.provided -= completed;
        
        if ( provided < 0 ) {
          error( 'excess', -provided );
          
          completed += provided;
          
          done.provided = 0;
        }
        
        completed
          && ( limit += completed ) > 0
             // Processing dequeue() assynchronously to gather as many counts as possible
          && next_tick( dequeue )
        ;
        
        function error( message, value ) {
          log( 'limiter..get()..done(), rejected ' + message + ' completed tasks:', value )
        }
      } // instance_done()
    } // get()
    
    function dequeue() {
      while ( limit && queue.length )
        get.apply( queue, queue.shift() )
    } // dequeue()
  } // cancelable_limiter()
  
  /*
    var values = [ 1, 4, -1, 6, 7, -3, 24, 0, -8 ];
    
    var cancel = cancelable_map( values, 2, increment_delayed, done )
    
    // abort after 25 milliseconds, i.e. after only 4 source values have been processed
    setTimeout( cancel, 25 );
    
    function increment_delayed( value, next ) {
      var timeout = setTimeout( increment, 10 );
      
      return cancel;
      
      function increment( value ) {
        next( null, value + 1 )
      }
      
      function cancel() {
        clearTimeout( timeout )
        
        // next will never be called for this instance
      }
    } // increment_delayed()
    
    function done( error, values ) {
      console.log( error, values ) // canceled [ 2, 5, 0, 7 ];
    }
  */
  function cancelable_map( values, limit, f, next, cancel_on_error ) {
    var count        = values.length
      , todo         = count
      , out          = []
      , i            = -1
      , slots        = [] // 0: initialized or not-cancellable running; Function: cancellable running; 1: done; 2: cancelled
      , cancel_tasks
      , asynchronous
      , canceled
      , ___      // always undefined to test values in done() and improve minification
    ;
    
    if ( count )
      cancel_tasks = cancelable_limiter( limit )( count, map_provided )
    ;
    
    /*
      Throttle control, must work even if/when f() calls done()
      synchronously, i.e. before the loop completes.
      
      Variable limit controls the end of the loop.
      
      When all calls to done() are synchronous, call to next()
      is done after the end of the loop instead of within done()
      to reduce call stack depth.
      
      While 'i < count' is true we are synchronous with the loop
      unless count > limit.
    */
    // call next() if all calls to done() were synchronous, or there were no values
    de&&ug( 'map() end, todo:', todo );
    
    todo ? asynchronous = 1 : next( null, out );
    
    return cancel_tasks;
    
    function map_provided( error, provided, done ) {
      if ( error )
        canceled || cancel( error )
      
      else
        while ( provided-- )
          save_cancel( f( values[ ++i ], create_slot_and_done( i, done ) ) )
    } // map_provided()
    
    function cancel( reason ) {
      de&&ug( 'map#cancel()', reason );
      
      canceled = 1;
      
      if ( todo ) {
        slots = slots.map( cancel_slot );
        
        // ToDo: what should we do if some tasks are not cancelled?
        todo = -1; // prevent call to next() after loop if synchronous
        
        next( reason, out )
      }
      
      function cancel_slot( slot ) {
        // ToDo: what should we do if some slots cannot be cancelled (slot == 0)?
        
        return is_function( slot )
          ? ( slot( reason ), 2 ) // cancelled
          : slot          // 0 or 1
      } // cancel_slot()
    } // cancel()
    
    function save_cancel( cancel_function ) {
      if ( slots[ i ] === 0 // initialized, not done synchronously
        && is_function( cancel_function ) // can be cancelled with cancel_function()
      )
        slots[ i ] = cancel_function
      
      // Slots that are not cancelable may lead to memory leak if they never complete
    }
    
    // create slot and done()
    function create_slot_and_done( slot, done ) {
      // create slot as initialized
      slots[ slot ] = 0;
      
      // return done() closure bound to this specific slot, allowing to
      // verify that it is called no-more than once. It can be cancelled
      // in which case it may never be called.
      return one_done;
      
      function one_done( error, value, more ) { // ToDo: implement more, flat mapping, and incremental mapping
        if ( canceled ) return; // in case some slot could not be effectively canceled, ignore values comming later
        
        if ( ! more )
          if ( slots[ slot ] == 1 )
            // this slot is already done
            add_error( 'already done or cancelled, slot: ' + slot )
          
          else {
            slots[ slot ] = 1; // this slot is done, cannot be cancelled later
            
            --todo < 0 && add_error( 'too many calls to done' );
          }
        
        if ( error )
          de&&ug( 'map(), error:', error ),
          
          ( is_function( cancel_on_error )
            ? cancel_on_error( error )
            : cancel_on_error
          ) && cancel_tasks( error )
        
        else
          // push non-undefined values to output
          value === ___ || out.push( value )
        ;
        
        more || done();
        
        de&&ug( 'map#one_done():', { error: error, value: value, more: more, slot: slot, i: i, count: count, todo: todo, out: out } );
        
        // When terminated, call next() if call to one_done() is asynchronous with cancelable_map()
        todo || asynchronous && next( null, out );
        
        function add_error( message ) {
          error = error ? error + '; ' + message : message
        }
      } // one_done( error, value ) 
    } // create_slot_and_done()
  } // cancelable_map()  
} );
