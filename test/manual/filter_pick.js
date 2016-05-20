var rs = require( 'toubkal' );

rs
  .set( [
    { flow: 'a', id: 1, b_id: 1 },
    { flow: 'a', id: 2, b_id: 1 },
    { flow: 'a', id: 3, b_id: 3 }
  ] )
  
  .trace( 'source', { all: true } )
  
  .filter_pick( rs
    .set( [
      { flow: 'b', id: 1 },
      { flow: 'b', id: 2 },
      { flow: 'b', id: 3 }
    ] )
    
    .trace( 'parent', { all: true } )
    
    , 'a', { b_id: 'id' }
  )
  
  .trace( 'out' )
  
  .filter( [
    { b_id: 2 },
    { b_id: 1 },
    //{ id: 3 },
    //{ id: 2 },
    //{}
  ] )
  
  .greedy()
;
