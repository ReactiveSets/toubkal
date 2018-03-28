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
( 'cancelable', [ './javascript' ], function( javascript ) {
  'use strict';
  
  var log              = Console_Logger().bind( null, 'cancelable' )
    , de               = false
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
        (Number): Maximum number of concurrent tasks.
          If limit is a positive integer, will create a shared cancelable
          limiter. Otherwise returns undefined.
        
        (Function): assumed to be get() from another limiter instance,
          i.e. from a shared limiter.
      
      @returns:
      - (Function): get( count, got ) -> cancel: request tasks from liniter:
        - *count* (Positive integer): number of requested tasks
        
        - *got* (Function): got( error, provided, next ): called one or many
          times, each time there are some tasks provided, and until *count*
          is reached or until canceled:
          - *error* (null or String): ```"canceled"``` if it was canceled.
            There will be no more calls after an error.
          
          - *provided* (Integer): the number of tasks provided for now. If
            this is less than count, more will be provided later.
            If canceled, this will be 0.
        
        - *cancel* (Function): cancel(): call this function to cancel this
          ```get()``` request. If still waiting, function ```got()``` will be
          called one last time with the error ```"canceled"``` and 0
          for provided.
      
      - undefined: if *limit* is neither a positive integer nor a Function
  */
  function cancelable_limiter( limit ) {
    var queue = [];
    
    if ( is_function( limit ) )
      // assumed to be get() from another limiter instance, i.e. from a shared limiter
      return limit
    ;
    
    if ( is_number( limit ) ) {
      // countrain limit to a literal integer
      limit = limit >> 0;
      
      if ( linit > 0 ) return get
    }
    
    function get( count, got, next ) {
      count = ( is_number( count ) ? count : 1 ) >> 0;
      
      if ( count > 0 ) {
        var provided = limit > count ? count : limit;
        
        limit -= provided;
        
        next = this == queue && next; // ignore next if not provided by instance_next()
        
        count > provided && queue.push( [ count - provided, got, next || instance_next ] );
        
        provided && got( null, provided, next || instance_next );
        
        if ( ! next ) return cancel;
      }
      
      function cancel() {
        queue = queue.filter( function( _ ) {
          if ( _[ 1 ] != got ) return 1;
          
          // found
          instance_next( _[ 0 ] ); // may only modify queue on next tick 
          
          got( 'canceled', 0 ); // no next
        } );
      }
      
      function instance_next( done_count ) {
        is_number( done_count ) || ( done_count = 1 );
        
        if ( done_count < 0 )
          return error( 'negative', done_count )
        ;
        
        provided -= done_count;
        
        if ( provided < 0 ) {
          error( 'excess', -provided );
          
          done_count += provided;
          
          provided = 0;
        }
        
        if ( done_count ) {
          limit += done_count;
          
          // allways processing assynchronously dequeue()
          // allows to gather as many counts as possible
          // while reducing call stack depth
          next_tick( dequeue );
        }
        
        function dequeue() {
          while ( queue.length )
            get.apply( queue, queue.shift() )
        } // dequeue()
        
        function error( message, value ) {
          log( 'limiter..get()..next(), rejected ' + message + ' count returned:', value )
        }
      } // instance_next()
    } // get()
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
    
    function done( values ) {
      console.log( values ) // [ 2, 5, 0, 7 ];
    }
  */
  function cancelable_map( values, limit, f, next, cancel_on_error ) {
    var count    = values.length
      , todo     = count
      , out      = []
      , i        = -1
      , slots    = [] // 0: initialized or not-cancellable running; Function: cancellable running; 1: done; 2: cancelled
      , canceled
      , ___      // always undefined to test values in done() and improve minification
    ;
    
    if ( count ) {
      /*
        Throttle control, must work even if/when f() calls done()
        synchronously, i.e. before the loop completes.
        
        Variable limit controls the end of the loop.
        
        When all calls to done() are synchronous, call to next()
        is done after the end of the loop instead of within done()
        to reduce call stack depth.
        
        While 'i < limit' is true we are synchronous with the loop.
      */
      limit && limit < count || ( limit = count );
      
      while ( ++i < limit ) save_cancel( f( values[ i ], create_slot_and_done( i ) ) )
    }
    
    // call next() if all calls to done() were synchronous, or there were no values
    todo || next( out )
    
    return cancel;
    
    function cancel() {
      if ( ! canceled ) {
        canceled = true;
        
        if ( todo ) {
          // set todo to the number of ongoing instances of f()
          // todo -= count - i - 1;
          
          slots = slots.map(
            function( slot ) {
              // ToDo: what should we do if some slots cannot be cancelled (slot == 0)?
              
              return is_function( slot )
                ? ( slot(), 2 ) // cancelled
                : slot          // 0 or 1
            }
          );
          
          // ToDo: what should we do if there are still some todo, i.e. some not cancelled?
          todo = 0; // force call to next() after loop if synchronous
          
          if ( i < limit )
            // synchronous, set count and limit to last, next() will be called after loop
            count = limit = i + 1;
          
          else {
            // asynchronous, set count past last
            count = i;
            
            next( out )
          }
        }
      }
    } // cancel()
    
    function save_cancel( cancel_function ) {
      if ( slots[ i ] === 0 // initialized, not done synchronously
        && is_function( cancel_function ) // can be cancelled with cancel_function()
      )
        slots[ i ] = cancel_function
      
      // Slots that are not cancelable may lead to memory leak if they never complete
    }
    
    // create slot and done()
    function create_slot_and_done( slot ) {
      // create slot as initialized
      slots[ slot ] = 0;
      
      // return done() closure bound to this specific slot, allowing to
      // verify that it is called no-more than once. It can be cancelled
      // in which case it may never be called.
      return done;
      
      function done( error, value ) {
        if ( canceled ) return;
        
        if ( slots[ slot ] == 1 )
          // this slot is already done
          add_error( 'already done or cancelled, slot: ' + slot )
        
        else {
          slots[ slot ] = 1; // this slot is done, cannot be cancelled later
          
          --todo < 0 && add_error( 'too many calls to done' );
        }
        
        if ( error ) {
          if ( is_function( cancel_on_error ) )
            cancel_on_error( error ) && cancel();
          
          else {
            de&&ug( 'cancelable_map(), error:', error );
            
            cancel_on_error && cancel();
          }
        
        } else
          value === ___ || out.push( value );
        
        if ( i < limit )
          // the loop has not ended yet, because this call to done() was synchronous
          limit < count && ++limit; // extend the end of loop if limited
        
        else
          // the loop has already ended, because this call to done() was asynchronous
          if ( todo )
            // call f() one more time if limited
            // warning: code duplicated with loop to reduce call stack depth
            i < count && save_cancel( f( values[ i++ ], create_slot_and_done( i ) ) )
          
          else
            next( out );
        
        function add_error( message ) {
          error = error ? error + '; ' + message : message
        }
      } // done( error, value ) 
    } // create_slot_and_done()
  } // cancelable_map()
} );
