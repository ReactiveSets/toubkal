( this.undefine || require( 'undefine' )( module, require ) )()
( 'next_test', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  var images = rs.set( [ { flow: 'images', id: '1', last: 0 } ] );
  
  var trigger = new rs.RS.Pipelet();
  
  var tag = 'next';
  
  var out = images
    .trace( 'images' )
    .next( trigger.set_flow( 'trigger' ), function( image, trigger ) {
      trigger.id = ++image.last;
    }, { fork_tag: tag } )
    .trace( 'next' )
  ;
  
  out
    .flow( 'images' )
    .trace( 'images from next' )
    ._add_destination( images )
  ;
  
  out
    .flow( 'trigger' )
    .trace( 'trigger' )
    .greedy()
  ;
  
  rs.union( [
      out.flow( 'images' ),
      out.flow( 'trigger' ).delay( 200 )
    ], { tag: tag } )
    
    .trace( 'after union' )
    .greedy()
  ;
  
  var t = new rs.RS.Transactions.Transaction( null, 2 );
  
  trigger
    ._add( [{}] )
  //  ._add( [{}] )
  //  ._add( [{},{}], t.next().get_emit_options() )
  //  ._add( [], t.next().get_emit_options() )
  ;
  
  t.end();
} );
