require( 'toubkal/lib/core' )

  .set( [
    { id: 1 },
    { id: 2 },
    { id: 3 },
  ] )
  
  .trace( 'cache', { all: true } )
  
  .cache()
  
  .trace( 'downstream', { all: true } )
  
  .filter( [ { id: 2 } ] )
  
  .greedy()
;
