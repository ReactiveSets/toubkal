/*  examples.js

    Serve all examples assets and datasets from virtual http servers
*/
module.exports = function( servers ) {
  'use strict';
  
  var rs  = require( 'toubkal' )
    , RS  = rs.RS
    , extend = RS.extend
    , log = RS.log
    , de  = true
    , ug  = log.bind( null, 'examples' )
  ;
  
  require( 'toubkal/lib/server/file.js'                 );
  require( 'toubkal/lib/socket_io/socket_io_clients.js' );
  
  /* ------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = rs.RS.log.bind( null, 'examples' );
  
  /* ------------------------------------------------------------------------------------
     Build toubkal-min.js then listen on servers
  */
  var assets = require( 'toubkal/lib/server/client_assets.js' )
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
  ;
  
  /* ------------------------------------------------------------------------------------
     Load and Serve Static Assets
  */
  rs
    .directory_entries()
    
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
  ;
  
  var database = rs.dispatch( rs.output( 'tables' ), function( source, options ) {
    return source
      .configuration( { 'filepath': this.path, 'flow': this.name, 'base_directory': __dirname  } )
    ;
  }, { single: true } );
  
  // Serve database to socket.io clients
  // ToDo: add option to dispatch() to use a union() as dispatcher instead of passthrough()
  // ToDo: or maybe, make path_through() a union() so that it becomes a controllet
  // ToDo: or just deprecate path_through() altogether
  var clients_input = rs.union( [ database, rs.output( 'tables' ) ], { name: 'clients_input' } );
  
  var clients_output = clients_input
    .dispatch( servers.socket_io_clients(), function( source, options ) {
      
      return source.through( this.socket );
    }, { single: true } )
  ;
  
  // Make encapsulated dataflow for data processors
  var clients = rs.encapsulate( clients_input, clients_output );
  
  // Require examples' data processors
  var data_processors = rs
    .directory_entries()
    
    .filter( [ { extension: 'js', depth: 2 } ] )
    
    .filter( function( file ) {
      return file.path.split( '/' ).pop() == 'data.js';
    } )
    
    .trace( 'data processors' )
  ;
  
  rs.dispatch( data_processors, function() {
    // ToDo: cleanup required when removing a data processor, need to disconnect data from database and clients
    
    var data_processor = './' + this.path;
    
    de&&ug( 'require data processor:', data_processor );
    
    require( data_processor )( database, clients );
  } );
} // module.exports
