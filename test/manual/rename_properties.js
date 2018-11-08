require( "toubkal" )
  
  .set( [ { id: 1, name: "jack" } ] )
  
  .trace( 'source', { fetch: true } )
  
  .rename_properties( { first_name: 'name' } )
  

  .trace( 'renamed', { fetch: true } ) // [ { id: 1, first_name: "jack" } ]
  
  .filter( [ { first_name: 'jack' } ] )
  
  .greedy()
;
