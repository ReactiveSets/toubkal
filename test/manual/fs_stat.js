require( "toubkal" )
  
  .once()
  
  .flat_map( function( _ ) { return [
    { path: 'test'  }, // a file that exists
    { path: 'test1' }, // a file that does not exists
    { path: {} }       // an invalid path value, yieding a TypeError
  ] } )
  
  .fs_stat()
  
  .trace( 'fs_stat' )
  
  .greedy()
;
