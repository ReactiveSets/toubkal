/*
    Licence
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'main', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  // --------------------------------------------------------------------------
  // database schema
  var schema = [
    { id: 'login_strategies' },
    { id: 'profile' },
    { id: 'todos'   }
  ];
  
  // dataflows Array for pipelet delivers()
  var dataflows = schema.map( function( _ ) { return _.id } );
  
  // main pipeline:
  // database cache ==> application ==> database cache
  //                                ==> socket.io server ==> database cache
  rs
    .database_cache( rs.set( schema ), {
      synchronizing: rs.socket_io_synchronizing()
    } )
    
    // untag transactions from socket_io_synchronizing()
    .pass_through( { untag: 'synchronizing' } )
    
    // Filter-out early non-cached dataflows queries and fetches comming from application routes
    .delivers( dataflows )
    
    // application
    .route( rs.url_route(), 'body' )
    
    .delivers( dataflows )
    
    .set_reference( 'updates' )
    
    .database_cache()
    
    // also send application updates to socket.io server
    .reference( 'updates' )
    
    .trace( 'to socket_io_server', { all: true } )
    
    .socket_io_server()
    
    .database_cache()
  ;
} ); // module.export
