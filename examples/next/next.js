( this.undefine || require( 'undefine' )( module, require ) )()
( 'next_test', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  var tag = 'next';
  
  rs
    .Singleton( 'counters', function( source, options ) {
      options.key = [ 'id' ];
      
      return source
        .flow( 'counters', options )
        .set( [ { id: '1', last: 25, description: 'starts at 25' } ] )
        .set_flow( 'counters' )
      ;
    } )
    
    .counters()
    .order( [ { id: 'id' } ] )
    .table( rs.RS.$( '#next' ), [ { id: 'id' }, { id: 'description' }, { id: 'last' } ] )
    
    .Singleton( 'trigger', function( source, options ) {
      return source
        .set_flow( 'trigger' )
      ;
    } )
  ;
  
  var out = rs
    .counters()
    .trace( 'counters' )
    .next( rs.trigger(), function( image, trigger ) {
      trigger.id = ++image.last;
    }, { fork_tag: tag } )
    .trace( 'next' )
  ;
  
  out
    .flow( 'counters' )
    .trace( 'counters from next' )
    .counters()
  ;
  
  out
    .flow( 'trigger' )
    .trace( 'trigger' )
    .greedy()
  ;
  
  rs.union( [
      out.flow( 'counters' ),
      out.flow( 'trigger' ).delay( 200 )
    ], { tag: tag } )
    
    .trace( 'after union' )
    .greedy()
  ;
  
  rs
    .beat( 1000 )
    .trigger()
  ;
} );
