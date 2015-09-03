( this.undefine || require( 'undefine' )( module, require ) )()
( 'next_test', [ 'rs' ], function( rs ) {
  var global = rs.union();
  
  var trigger = new rs.RS.Pipelet();
  
  var out = global
    .set( [ { flow: 'images', id: '1', last: 0 } ] )
    .trace( 'images' )
    .next( trigger.set_flow( 'trigger' ), function( image, trigger ) {
      trigger.id = image.last += 1;
    } )
  ;
  
  out
    .flow( 'images' )
    ._add_destination( global )
  ;
  
  out
    .flow( 'trigger' )
    .trace( 'trigger' )
    .greedy()
  ;
  
  trigger
    ._add( [{},{}] )
  ;
} );
