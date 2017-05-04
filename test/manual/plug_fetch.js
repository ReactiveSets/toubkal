// manual tests for Plug.._fetch()

var rs = require( 'toubkal' )
  
  , a  = rs.set( [ { flow: 'a', id: 1 } ] )
  , b  = rs.set( [ { flow: 'b', id: 1 } ] )
  , c  = rs.set( [ { flow: 'c', id: 1 } ] )
  
  , u  = rs
          .union( [ a.delay( 100 ), b, c ], { key: [ 'flow', 'id' ] } )
          
 //         .delivers( 'a, b, c'.split( /, */ ) )
  
  , flow = 'b'
;

u.greedy();

u
//  .trace( 'trace for ' + flow, { with_queries: true } )
  .pass_through()
  .flow( flow )
  .trace( 'tail' )
  .greedy()
;

b._add( [ { flow: 'b', id: 2 } ] );
b._update( [ [ { flow: 'b', id: 1 }, { flow: 'b', id: 3 } ] ] );
b._remove( [ { flow: 'b', id: 2 } ] );
