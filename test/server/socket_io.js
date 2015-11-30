'use strict';

require( 'toubkal/lib/socket_io/socket_io_server' )
  .socket_io_server( { location: 'http://localhost:8080', transports: [ 'websocket' ] } )
  .trace( 'test' )
  .greedy()
;
