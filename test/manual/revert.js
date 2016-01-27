rs = require( 'toubkal/lib/core' );

var initial_state = [ { id: 1 }, { id: 3 } ];

rs.set( [ { id : 1 }, { id : 2 } ] )
  .delay( 10 )
  .trace( 'before', { _fetch: true } )
  .revert( initial_state )
  .trace( 'after', { _fetch: true } )
  .greedy()
;
