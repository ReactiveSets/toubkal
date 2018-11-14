/*  
  main.js
  -------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'main', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  // --------------------------------------------------------------------------------------------
  // database schema
  var schema = [
    { id: 'login_strategies' },
    { id: 'profile' },
    { id: 'todos'   }
  ];
  
  // dataflows
  var dataflows = schema.map( function( _ ) { return _.id } );
  
  rs
    .socket_io_server()
    
    .database_cache( rs.set( schema ), { synchronizing: rs.socket_io_synchronizing() } )
    
    .pass_through( { tag: 'synchronizing' } )

    // Filter-out early non-cached dataflows queries and fetches comming from application
    .delivers( dataflows )
    
    .route( rs.url_route(), 'body' )
    
    .delivers( dataflows )
    
    .set_output( 'updates' )
    
    .socket_io_server()
  ;
  
  rs
    .output( 'updates' )
    
    // .database_cache()
  ;
  
  return rs;
  
} ); // module.export
