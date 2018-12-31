/*
    Copyright (c) 2013-2018, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
module.exports = function( servers, module ) {
  'use strict';
  
  var path        = require( 'path' )
    , application = module.application
    , module_name = application.name || path.dirname( module.path ).split( path.sep ).slice( -1 )[ 0 ]
    , www_base    = [ __dirname, application.www || 'www' ]
    , rs          = servers.create_namespace( module_name, true )
    , RS          = rs.RS
    , log         = RS.log.bind( null, module_name )
  ;
  
  log( 'starting application:', application );
  
  servers.set_namespace( rs ); // set namespace to servers' child namespace
  
  require( './database.js' )( rs );
  
  /* --------------------------------------------------------------------------
      Authentication with passport
  */
  var session_options = require( './passport.js' )( servers, rs );
  
  var providers = rs
    
    .passport_strategies()
    
    .map( function( strategy ) {
      var name = strategy.name;
      
      return {
        id   : name,
        order: strategy.order || name,
        name : name,
        href : '/passport/' + name,
        label: strategy.display_name || name,
        icon : strategy.icon || ''
      };
    } )
    
    .group( function() {
      return {
        id: 'providers',
        flow: 'providers'
      }
    } )
    
    .optimize()
    
    .set()
  ;
  
  /* --------------------------------------------------------------------------
      Sessions
  */
  var sessions = rs
    
    .session_store()
    
    //.trace( 'session store content' )
    
    .passport_user_sessions()
  ;
  
  // Listen when toubkal min is ready
  servers.http_listen( rs.toubkal_min() );
  
  /* --------------------------------------------------------------------------
      Serve all assets to servers
  */
  rs
    .union(
      [ rs.www_files( www_base ), 
        rs.toubkal_min(),
        rs.source_map_support_min(),
        rs.build_bundles( __dirname, www_base )
      ],
      
      { key: [ "path"] }
    )
    
    .serve( servers, { session_options: session_options } )
  ;
  
  /* --------------------------------------------------------------------------
      Serve dataflows to socket.io clients
  */
  var client = {};
  
  var client_module = rs
    .set( [ { path: '' } ] )
    .directory_entries( __dirname )
    .filter( [ { type: 'file', base: 'client.js', depth: 1 } ] )
    .path_join( __dirname )
    .alter( function( _ ) { _.client = client } )
    //.trace( 'client module' )
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
    
    .union( [ providers, sessions ] )
    
    //.trace( 'all dataflows to clients' )
    
    .dispatch( clients, function( source, options ) {
      return client.handler( source, this, options );
    }, { no_remove_fetch: true } )
    
    .pass_through() // prevents all clients outputs to connect directly to all inputs of the union bellow
    
    //.trace( 'clients to database' )
    
    .database()
  ;
}; // module.exports
