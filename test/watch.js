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

var entries = xs
  .set( [
      { path: 'test' },
      { path: 'test' },
      { path: 'test' }
    ], { key: [ 'path' ] }
  )
  .watch_directories()
;

var files = entries
  .filter( [ { type: 'file' } ] )
;

files
  .filter( [ { type: 'file' } ] )
  
  .filter( function( _ ) {
    return _.path.match( /html$/ );
  } )
  
  .trace( 'html files' )
  
  .set()
;

entries
  .filter( [ { type: 'directory' } ] )
  .trace( 'directories' )
  .set()
;

files
  .filter( [ { type: 'file', path: 'test/watch.js' } ] )
  .trace( 'watch.js' )
  .set()
;

files
  .filter( [ { path: 'test/watch.js' } ] )
  .trace( 'watch.js 2' )
  .set()
;

files
  .filter( function( _ ) {
    return _.path.match( /js$/ );
  } )
  
  .trace( 'javascript files' )
  .set()
;

setTimeout( remove_directories, 10000 );

function remove_directories() {
  entries
    ._remove( [ 
      { path: 'test' },
      { path: 'test' },
      { path: 'test' },
      { path: 'test' }
    ] )
  ;
}
