var rs = require( 'toubkal/lib/core' );

rs
  .Compose( 'cache', function( source, options ) {
    var rs = source.namespace()
      , output = rs.pass_through( options )
    ;
    
    return source
      .filter( rs.query_updates( output ), options )
      
      .set()
      
      .union( [ output ] )
    ;
  } ) // cache()
  
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
