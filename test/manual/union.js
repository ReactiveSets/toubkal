var rs = require( 'toubkal/lib/core' );

rs
  .set( [ { id: 1 } ] )
  .union( [ rs.set( [ { id: 2 } ] ) ] )
  .trace()
  .set()
  .greedy()
;
