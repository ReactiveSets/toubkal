rs = require( 'toubkal/lib/core' );

rs.Singleton( 'trigger', function( source, options ) {
    return source
      .last()
      .trace( 'trigger' )
    ;
  } )
  
  .Singleton( 'target', function( source, options ) {
    return source
      .trace( 'target' )
      .set()
    ;
  } )
;

rs.trigger()
  .set()
  //.trace( 'server' )
  // removes first value before fetch
  .delay( 50 )
  // .trace( 'server', { query_update: true, fetch: true } )
  // when remove arrives here, filter ignores-it
  // if filter would trust its source, it would transmit the remove and the problem would be solved
  // so a dynamic filter must trust its source to send it atomic operations, that also improves filtering performance because filtering is not run
  // in some cases, one may not trust and enforce additional local filtering, especially when the filter is used for write authorizations from a client, the client cannot be trusted
  // but the pipelet upstream o filter will filter based on the query update, immediately, so it does not trust
  // the problems remains
  // The solution is to: 1/ send query_update immediately with fetch 2/ fetch 3/ on fetched received, apply query_update locally,
  // this could be done by transactional_fetch()
  //  .set() // prevents loss of remove, by synchronizing remove and fetch, with a copy of the state
  .filter( rs.trigger() )
  
  .dispatch( rs.trigger(), function( source, options ) {
    return source.target();
  } )
;

rs.once( 200 )
  .alter( function( v ) {
    v.id = 1;
  } )
  
  .trigger()
;

rs.once( 500 )
  .alter( function( v ) {
    v.id = 2;
  } )
  
  .trigger()
;
