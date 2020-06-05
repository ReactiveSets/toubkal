( this.undefine || require( 'undefine' )( module, require ) )()
( 'next_test', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  var tag = 'next';
  
  // Set and display counter set
  rs
    .Singleton( 'counters', function( source, options ) {
      options.key = [ 'id' ];
      
      return source
        .flow( 'counters', options )
        .set( [ { id: '1', last: 25, description: 'starts at 25' } ] )
        .set_flow( 'counters' )
        .trace( 'counters' )
      ;
    } )
    
    .counters()
    .order( [ { id: 'id' } ] )
    .table( rs.RS.$( '#next' ), [ { id: 'id' }, { id: 'description' }, { id: 'last' } ] )
  ;
  
  // Define trigger every second
  rs
    .Singleton( 'trigger', function( source, options ) {
      return source
        .set_flow( 'trigger' )
      ;
    } )
    
    .beat( 1000 )
    //.once( 1000 )
    .trigger()
  ;
  
  // Define crankshaft to update counters
  rs  
    .Multiton( 'crankshaft', function( tag ) { return tag }, function( source, tag, options ) {
      return source
        .next( rs.trigger(), function( counter, trigger ) {
          trigger.id = ++counter.last;
        }, { fork_tag: tag } )
        .trace( 'crankshaft' )
      ;
    } )
    
    .counters()
    .crankshaft( tag )
    .flow( 'counters' )
    .trace( 'counters from next' )
    .counters()
  ;
  
  // Trace triggers updated by crankshaft
  rs
    .crankshaft( tag )
    .flow( 'trigger' )
    .trace( 'trigger' )
    .greedy()
  ;
  
  // Test-out transaction synchronization on tag
  rs
    .union( [
      rs.crankshaft( tag ).flow( 'counters' ),
      rs.crankshaft( tag ).flow( 'trigger' ).delay( 200 )
    ], { untag: tag } )
    
    .trace( 'after union' )
    .greedy()
  ;
} );
