// watch.js

var xs      = require( '../lib/pipelet.js' )
  , XS      = xs.XS
  , log     = XS.log
  , extend  = XS.extend
;

require( '../lib/filter.js' );
require( '../lib/server/http.js' );
require( '../lib/server/socket_io_clients.js' );
require( '../lib/server/file.js' );

var directories = xs
  .set( [
//      { path: 'test' },
      { path: 'test' },
      { path: 'test' }
    ], { key: [ 'path' ] }
  )
  .watch_directories()
;

directories
  .filter( function( entry ) {
    return entry.type == 'file' && entry.path.match( /html$/ )
  } )
  
  .trace( 'html files' )
  .set()
;

setTimeout( remove_directories, 10000 );

function remove_directories() {
  directories
    ._remove( [ 
//      { path: 'test' },
//      { path: 'test' },
      { path: 'test' },
      { path: 'test' }
    ] )
  ;
}
