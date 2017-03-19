var rs = require( 'toubkal' );

rs
  .set( [
    { id: 1, path: 'src', content: "var a='test'; f( a, 'test' ); function f(){}" }
  ] )
  
  .uglify( 'test' )
  
  .trace( 'ugly' )
  
  .greedy()
;