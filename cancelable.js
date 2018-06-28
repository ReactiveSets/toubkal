#!node

var cancelable = require( './lib/util/cancelable' )
  , log        = require( './lib/util/console_logger' )().bind( null, 'cancelable_test' )
  , limiter    = cancelable.limiter
  , map        = cancelable.map
  , values     = [ 1, 4, -1, 6, 7, -3, 24, 0, -8 ]
  , limit      = limiter( 2 ) // shared limiter
  , delay      = 100
;

setTimeout( round( 0 ), delay * 10.5 );

round( 1 );
round( 2 );

function round( round ) {
  var debug  = log.bind( null, 'round ' + round + ',' )
    , cancel = map( values, limit, increment_delayed, done )
  ;
  
  return verbose_cancel;
  
  function increment_delayed( value, next ) {
    // return debug( 'synchronous increment:', value ), next( 0, value, 1 ), next( 0, value + 1 );
    
    var timeout = setTimeout( increment, delay );
    
    return cancel;
    
    function increment() {
      debug( 'increment:', value );
      
      //next( 0, value, 1 ); // flat map current source value
      next( 0, value + 1 );
    }
    
    function cancel( reason ) {
      debug( 'cancel():', reason, ', value:', value );
      
      clearTimeout( timeout ); // effectively cancelling the call to increment()
      
      next( reason ); // effectively canceled
    }
  } // increment_delayed()
  
  function done( error, values ) {
    debug( 'done():', error, values ) // [ 2, 5, 0, 7 ];
  }
  
  function verbose_cancel() {
    debug( 'cancelling' );
    
    cancel( 'timeout' );
    
    debug( 'canceled' )
  } // verbose_cancel()
} // round()