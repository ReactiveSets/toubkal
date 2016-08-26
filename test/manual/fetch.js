rs = require( 'toubkal' );

rs
  .Singleton( 'store', function( source, options ) {
    return source
      .set( [
        { id: 1, a: 'test' }
      ] )
    ;
  } )
  
  .Singleton( 'fetch_and_update', function( source, store, query, options ) {
    return source
      .fetch( store, query, options )
      .update_fetched()
      //.trace( 'after update_fetched' )
    ;
  } )
  
  .fetch_and_update( rs.store(), function( v ) { return [ { id: v.id } ] } )
  
  .store()
  //.flat_map( function( _ ) { return [ _ ] } )
  //.map( function( _ ) { return _ } )
  //.alter( function( _ ) {} )
  //.filter( function( v ) { return false } )
  //.split_updates()
  //.optimize()
  .trace( 'fetch_and_update' )
  
  .greedy()
;

rs.fetch_and_update()._add( [ { id: 1, b: 'this is b' } ] );
