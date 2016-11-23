var rs     = require( 'toubkal/lib/core' )
  , RS     = rs.RS
  , extend = RS.extend
;

var a = rs.set( [
  { id: 1, a: 1 }
] );

var b = rs.set( [
  { id: 1, b: 1 }
] );

var c = a
  .join( b, [ 'id' ], function( a, b ) { return extend( {}, a, b ) }, { _no_filter: true } )
  
  .trace( 'join' ).greedy()
;

b._update( [ [
  { id: 1, b: 1 },
  { id: 1, b: 2 }
] ] );
  
