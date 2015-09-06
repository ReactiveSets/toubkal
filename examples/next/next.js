( this.undefine || require( 'undefine' )( module, require ) )()
( 'next_test', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  var images = rs.set( [ { flow: 'images', id: '1', last: 0 } ] );
  
  var trigger = new rs.RS.Pipelet();
  
  var out = images
    .trace( 'images' )
    .next( trigger.set_flow( 'trigger' ), function( image, trigger ) {
      trigger.id = image.last += 1;
    } )
    .trace( 'next' )
  ;
  
  out
    .flow( 'images' )
    ._add_destination( images )
  ;
  
  out
    .flow( 'trigger' )
    .trace( 'trigger' )
    .greedy()
  ;
  
  var tid = '--------- pseudo transaction -----------';
  
  trigger
    ._add( [{}] )
    ._add( [{}] )
  //  ._add( [{},{}], { _t: { id: tid, more: true } } )
  //  ._add( [], { _t: { id: tid } } )
  ;
} );
