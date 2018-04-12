var cancelable = require( './lib/util/cancelable' )
  , log        = require( './lib/util/console_logger' )().bind( null, 'cancelable_test' )
  , limiter    = cancelable.limiter
  , map        = cancelable.map
  , values     = [ 1, 4, -1, 6, 7, -3, 24, 0, -8 ]
  , cancel     = map( values, 2, increment_delayed, done )
;

// abort after 290 milliseconds, i.e. after only 4 source values have been processed
setTimeout( function() { log( 'cancelling' ); cancel( 'timeout' ); log( 'canceled' ) }, 290 );

function increment_delayed( value, next ) {
  // log( 'synchronous increment:', value ); return next( null, value + 1 );
  
  //
  var timeout = setTimeout( increment, 100 );
  
  return cancel;
  
  function increment() {
    log( 'increment:', value );
    
    next( 0, value, 1 );
    next( 0, value + 1 );
  }
  
  function cancel( reason ) {
    log( 'cancel():', reason );
    
    clearTimeout( timeout )
    
    next( reason );
  }
} // increment_delayed()

function done( error, values ) {
  log( 'done():', error, values ) // [ 2, 5, 0, 7 ];
}
