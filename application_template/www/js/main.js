/*  
  main.js
  -------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'main', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var RS               = rs.RS
    , extend           = RS.extend
    , socket_io_server = rs.socket_io_server()
    
    , de    = false
    , ug    = RS.log.bind( null, 'main.js' )
  ;
  
  // --------------------------------------------------------------------------------------------
  // database cache
  var schema = [
    { id: 'login_strategies' },
    { id: 'profile' }
  ];
  
  var database_cache = socket_io_server
    
    .database_cache( rs.set( schema ), { synchronizing: rs.socket_io_synchronizing() } )
    
    .pass_through( { tag: 'synchronizing' } )

    // Filter-out early non-cached dataflows queries and fetches comming from application
    .delivers( schema.map( function( _ ) { return _.id } ) )
  ;
  
  // --------------------------------------------------------------------------------------------
  // login strategies or user profile
  var strategies_or_profile = socket_io_server.strategies_or_profile();
  
  // --------------------------------------------------------------------------------------------
  // URL events
  var url = rs.url_pipelet();
  
  // --------------------------------------------------------------------------------------------
  // application routes
  var routes = rs.set();
  
  // --------------------------------------------------------------------------------------------
  // display pages and emit to server
  database_cache
    
    .dispatch( routes, function( source, options ) {
      var page  = this
        , route = routes[ page.id ]
      ;
      
      return source[ route.pipelet_name ]( page.$node );
    } )
    
    .pass_through()
    
    .socket_io_server()
  ;
} ); // module.export
