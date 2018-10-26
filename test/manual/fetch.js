// testing pipelets fetch() and update_fetched()

var rs = require( 'toubkal' );

rs
  .Singleton( 'test_database', function( source, options ) {
    
    return source
      .set( [
        { id: 1, a: 'previous a for id 1' },
        { id: 2, a: 'previous a for id 2' },
        { id: 3, a: 'a for id 3'          }
      ] )
    ;
  } )
  
  .once( 1 )
  
  .flat_map( function( _ ) { return [
    { id: 1, a: 'new a for id 1' },
    { id: 2, a: 'new a for id 2' },
    { id: 4, a: 'a for id 2'     },
    { id: 5, a: 'a for id 3'     }
  ] } )
  
  .fetch( rs.test_database(), { id: '.id' } )
  
  .update_fetched()
  
  .test_database()
  
  .trace( 'database' )
  
  .greedy()
;
