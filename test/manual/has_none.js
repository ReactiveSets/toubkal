require( 'toubkal/lib/core' )
  .Singleton( 'source', function( source, options ) {
    return source.set( [ { id : 2 } ] )
  } )
  
  .source()
//  .trace( 'source' )
  .delay( 10 )
  .has_none()
  .trace( 'has_none', { all: false } )
  .greedy()
  
  // --------------------
  .namespace()
  .once( 1000 )
  .flat_map( function( _ ) { return [ { id: 2 } ] } )
//  .trace( 'once' )
  .revert()
  .source()
  
  // ------------------------
  .namespace()
  //.once( 2000 )
  .flat_map( function( _ ) { return [ { id: 5 } ] } )
  .source()
;


