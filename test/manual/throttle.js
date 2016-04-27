rs = require( 'toubkal' );

rs
  .beat( 100 )
  .aggregate( [], [ { id: 'interval' } ] )
  .events_metadata()
  .throttle( rs.beat( 1000 ) )
  .trace( 'throttled' )
  .greedy()
;
