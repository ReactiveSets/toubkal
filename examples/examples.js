/*  examples.js

    Serve all examples assets and datasets from virtual http servers
*/
module.exports = function( servers ) {
  'use strict';
  
  var rs     = require( 'toubkal' )
    , RS     = rs.RS
    , extend = RS.extend
    , log    = RS.log.bind( null, 'examples' )
    , de     = true
    , ug     = log
    , assets = require( 'toubkal/lib/server/client_assets.js' )
    , toubkal_min = assets.toubkal_min()
    , react_js = assets.react.watch()
  ;
  
  // Listen when lib/toubkal-min.js is ready
  servers.http_listen( toubkal_min );
  
  /* ------------------------------------------------------------------------------------
     Watch all directories from here
  */
  rs
    .Singleton( 'directory_entries', function( source, options ) {
      return source
        .watch_directories( extend._2( { base_directory: __dirname } ) )
        
        .filter( ignore_temporary_files )
      ;
      
      function ignore_temporary_files( entry ) {
        return entry.extension.slice( -1 )  != '~'
            && entry.base.substring( 0, 2 ) != '.#'
        ;
      }
    } )
    
    .set( [ { path: '' } ] )
    
    .directory_entries()
    
    .filter( [ { type: 'directory' } ] )
    
    .directory_entries()
  
    /* ------------------------------------------------------------------------------------
       Load and Serve Static Assets
    */
    .set_output( 'assets' )
    
    .filter( [
      { extension: 'html' },
      { extension: 'css'  },
      { extension: 'js'   },
      { extension: 'json' }
    ] )
    
    .watch( { base_directory: __dirname } )
    
    .union( [ toubkal_min, react_js ] )
    
    // Serve assets to http servers
    .serve( servers )
  ;
  
  /* ------------------------------------------------------------------------------------
     The database, made of all found json files
  */
  rs
    .directory_entries()
    
    .filter( [ { extension: 'json' } ] )
    
    .map( function( table ) {
      var path = table.path
        , flow = path.split( '.' )
      ;
      
      flow.pop(); // remove 'json' extension
      
      flow = flow.join( '.' ); // e.g. datasets/sales
      
      return { flow: '/table', 'name': flow, 'path': path };
    } )
    
    .optimize()
    
    .trace( 'database tables' )
    .set_output( 'tables' )
    
    // socket.io clients
    .Singleton( 'clients', function( source, options ) {
      return source
        .dispatch( servers.socket_io_clients(), function( source, options ) {
          
          return source.through( this.socket );
        }, { single: true } )
      ;
    } )
    
    .clients()
  ;
  
  rs.output( 'assets' )
    .filter( [
      { extension: 'html' },
      { extension: 'css'  },
      { extension: 'js'   },
    ] )
    
    .to_uri()
    
    .filter( function( a ) {
      return [ '/server.js', '/examples.js' ].indexOf( a.uri ) == -1
        && 'data.js' != a.base
      ;
    } )
    
    .map( function( a ) {
      return {
        flow: 'assets', id: a.uri, size: a.size, mtime: a.mtime
      }
    }, { key: [ 'id' ] } )
    
    .optimize() // make updates
    
    // filter-out non-assets fetches
    .flow( 'assets' )
    
    .clients()
  ;
  
  // Serve database to socket.io clients
  // ToDo: add option to dispatch() to use a union() as dispatcher instead of passthrough()
  // ToDo: or maybe, make path_through() a union() so that it becomes a controllet
  // ToDo: or just deprecate path_through() altogether
  rs
    .Singleton( 'database', function( source, tables, options ) {
      return rs
        .dispatch( tables, function( source, options ) {
          var flow = this.name;
          
          return source
            .configuration( { 'filepath': this.path, 'flow': flow, 'base_directory': __dirname  } )
            .trace( 'table ' + flow )
            .flow( flow )
          ;
        } )
      ;
    } )
    
    .database( rs.output( 'tables' ) )
    
    .clients()
  ;
  
  // Require examples' data processors
  rs
    .directory_entries()
    
    .filter( [ { extension: 'js', depth: 2 } ] )
    
    .filter( function( file ) {
      return file.path.split( '/' ).pop() == 'data.js';
    } )
    
    .trace( 'data processors' )
    .set_output( 'data_processors' )
  ;
  
  rs.dispatch( rs.output( 'data_processors' ), function() {
    // ToDo: cleanup required when removing a data processor, need to disconnect data from database and clients, and remove from require cache
    // ToDo: allow to hot-reload data-processor
    
    var data_processor = './' + this.path
      , path = require.resolve( data_processor )
    ;
    
    de&&ug( 'require data processor:', data_processor );
    
    delete require.cache[ path ];
    
    require( path )( rs.database(), rs.clients() );
  } );
} // module.exports
