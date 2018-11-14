/*  application.js

    Licence
*/
module.exports = function( servers ) {
  'use strict';
  
  var rs = servers.create_namespace( 'template_application_name', true );
  
  servers.set_namespace( rs ); // set namespace to servers' child namespace
  
  // ---------------------------------------------------------------------------------------------------------------
  // Listen and Serve assets to http servers
  var assets = require( './assets.js' )( rs );
  
  // Listen when files are ready
  servers.http_listen( assets );
  
  // Serve assets to http servers
  assets.serve( servers, { session_options: session_options } );
  
  // ---------------------------------------------------------------------------------------------------------------
  // Database and Authentication
  require( './database.js' )( rs );
  
  var session_options = require( './passport.js' )( servers, rs );
  
  // ---------------------------------------------------------------------------------------------------------------
  // Login Strategies
  var login_strategies = rs
    
    .passport_strategies()
    
    .map( function( strategy ) {
      var name = strategy.name;
      
      return {
        id          : name,
        flow        : 'login_strategies',
        order       : strategy.order || name,
        name        : name,
        href        : '/passport/' + name,
        display_name: strategy.display_name || name,
        icon        : strategy.icon || ''
      };
    } )
    
    .optimize()
    
    .set()
  ;
  
  /* ---------------------------------------------------------------------------------------------------------------
      Sessions
  */
  var sessions = rs
    
    .session_store()
    
    .trace( 'session store content' )
    
    .passport_user_sessions()
  ;
  
  /* ---------------------------------------------------------------------------------------------------------------
      Serve to socket.io clients
  */
  var client = {};
  
  var client_module = rs
    .set( [ { path: '' } ] )
    .watch_directories( { base_directory: __dirname } )
    .filter( [ { base: 'client.js', depth: 1 } ] )
    .path_join( __dirname )
    .alter( function( _ ) { _.client = client } )
    .trace( 'client module' )
  ;
  
  rs.dispatch( client_module, function( source, options ) {
    source.require_pipeline( this, options );
  } );
  
  var clients = servers
    // ToDo: set remove_timeout to a higher production value
    .socket_io_clients( { remove_timeout: 10, session_options: session_options } )
    
    .trace( 'clients', { pick: { id: '.id', connected: '.connected' } } ) // client.socket has circular references, don't show it
    
    // Ignore updates in connected state, i.e. when client temporarily disconnects
    .pick( [ 'id', 'socket' ] ).optimize()
  ;
  
  rs
    .database()
    
    .union( [ login_strategies, sessions ] )
    
    //.trace( 'all dataflows to clients' )
    
    .dispatch( clients, function( source, options ) {
      return client.handler( source, this, options );
    }, { no_remove_fetch: true } )
    
    .pass_through() // prevents all clients outputs to connect directly to all inputs of the union bellow
    
    //.trace( 'clients to database' )
    
    .database()
  ;
  
}; // module.exports
