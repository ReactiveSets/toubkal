/*  http.js
    
    tests for http.js
    
    ----
    
    Copyright (c) 2013-2020, Reactive Sets

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
"use strict";

var rs      = require( 'toubkal' )
  , RS      = rs.RS
  , log     = RS.log
  , extend  = RS.extend
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true, ug = log.bind( null, 'test server,' );

/* -------------------------------------------------------------------------------------------
   Start HTTP Servers
*/
var http_servers = rs
  .set( [
    //{ ip_address: '0.0.0.0' },
    { ip_address: '0.0.0.0', port: 8080 },
    { ip_address: '::1', port: 8080 }
    //{ ip_address: '192.168.254.45' }, // bad ip address
    //{ port: 8043, key: '', cert: '' }, // https server usimg key and cert
    //{ port: 8044, pfx: '' }, // https server using pfx
  ] )
  .auto_increment()
  .http_servers()
  .virtual_http_servers( [ '::1', 'localhost', '127.0.0.1', '192.168.0.36', '146.185.152.167', 'ourika.rocks' ] )
  //.trace( 'http servers' )
;

// Passport Application is described in ./passport.js
require( './passport.js' )( http_servers );

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/

// /lib/toubkal-socket_io-ui-bootstrap-min.js
var toubkal_min = rs.toubkal_min( { socket_io: true, ui: true, bootstrap: true } )
  , map_support = rs.source_map_support_min()
;

// Listen when /lib/toubkal-socket_io-ui-bootstrap-min.js is ready
http_servers.http_listen( toubkal_min );

var mocha_css = rs
  .set( [ { name: 'mocha/mocha.css' } ] )
  .require_resolve()
  .watch()
;

var mocha_expect = rs.set( [
    { name: 'mocha/mocha.js' },
    { name: 'expect.js'      }
  ] )
  .require_resolve()
  .auto_increment() // will auto-increment the id attribute starting at 1
  .watch()
;

var mocha_expect_min = mocha_expect
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect-min.js' )
;

// HTML test pages
var html_tests = rs  
  .set( [
    { path: 'test' },
    { path: 'test/manual' },
    { path: 'test/automated' }
   ] )
  
  .watch_directories()
  
  //.trace( 'watch_directory test' )
  
  .filter( [
    { type: 'file', extension: 'html' },
    { type: 'file', extension: 'js'   }
  ] )
;

// JavaScript test files
var javascript_files = rs
  .set( [ { path: 'test/javascript' } ] )  
  
  .watch_directories()
  
  .filter( [ { type: 'file', extension: 'js' } ] )
;

// CSS and images for tests
var css_tests = rs
  .set( [ { path: 'test/css' }, { path: 'test/css/images' } ] )
  
  .watch_directories()
  
  .filter( [ { type: 'file' } ] )
;

var tests = rs
  .union( [ html_tests, javascript_files, css_tests ] )
  
  .watch( { base_directory: __dirname + '/../..' } )
;


var coffee_files = rs
  .set( [ { path: 'test/src' } ] )
  
  .watch_directories()
  
  .filter( [ { type: 'file', extension: 'coffee' } ] )
;

var coffee_source = coffee_files
  .watch( { base_directory: __dirname + '/../..' } )
;

var test_lib = rs
  .set( [ { path: 'test/lib' } ] )
  
  .watch_directories()
;

var compiled_coffee = test_lib
  .filter( [ { type: 'file', extension: 'js' } ] )
  
  .watch( { base_directory: __dirname + '/../..' } )
  
  .alter( function( v ) {
    // Fix Coffee-script sourceMappingURL
    v.content = v.content
      .replace( /\/\/@ sourceMappingURL=/, '//# sourceMappingURL=' )
    ;
  } )
;

var source_maps = test_lib
  .filter( [ { type: 'file', extension: 'map' } ] )
  
  .watch( { base_directory: __dirname + '/../..' } )
  
  .alter( function( v ) {
    // Fix Coffee-script source map
    v.content = v.content
      .replace( /"sourceRoot": ".."/, '"sourceRoot": ""' )
    //  .replace( /test\\\\/, '' )
    //  .replace( /test[\/]/, '' )
    ;
  } )
;

// Serve assets to http servers
tests.serve( http_servers, { routes: '/test' } );

rs.union( [ mocha_expect_min, mocha_css, compiled_coffee, source_maps, coffee_source ] )
  .serve( http_servers, { routes: '/test' } ) // ToDo: test serve() with default route ('/') does not work
;

rs.union( [ mocha_expect ] )
  .serve( http_servers, { routes: '/node_modules' } )
;

var clients = http_servers.dispatch( rs.express_application(), function( source, options ) {
  var session_options = this.session_options;
  
  if ( ! session_options ) throw 'need session_options';
  
  // The following union is replaced by the series of _add_source() calls after serve() only for testing purposes
  // of self-unions of pipelets. The prefered form is remains using an explicit Union.
  // rs.union( [ toubkal_core_min, toubkal_ui_min, toubkal_min ] )
  rs.serve( source, { routes: [ '/lib', '/node_modules' ], session_options: session_options } )
    ._input
    .insert_source_union()     // adding a union as the source of rs.serve() input, for testing purposes
    ._add_source( map_support )
    ._add_source( toubkal_min )
  ;
  
  // Socket.io Server tests
  return source
    .socket_io_clients( { remove_timeout: 10, session_options: session_options } )
    
    // Ignore updates in connected state, i.e. when client temporarily disconnects
    // ToDo: allow updates with dispatch
    .pick( [ 'id', 'socket' ] ).optimize()
  ;
} );

// ToDo: add authorizations test
function client( source, options ) {
  de&&ug( 'creating socket_io client id: ' + this.id );
  
  var rs     = source.namespace()
    , input  = this.socket
    , socket = input.socket
    , sid    = socket.sid
  ;
  
  de&&ug( 'client() sid:', sid );
  
  // Get reactive authenticated user from session id
  // Build user profile query with it
  var user_profile_query = source
    .filter( [ { flow: 'user_sessions', id: sid } ] )
    
    //.trace( 'client user session ' + sid, { all: true } )
    
    //.set()
    
    .map( function( user_session ) {
      return { flow: 'user_profile', id: user_session.user_id }
    } )
    
    .trace( 'user profile query' )
  ;
  
  // Read Authorizations
  var can_read = rs
    .union( [
      // public dataflows
      rs.set( [
        { flow: 'client_set' },
        { flow: 'source'     },
        { flow: 'providers'  }
      ] ),
      
      // Current authenticated user profile, if any
      user_profile_query
    ] )
    .trace( 'can_read-' + sid, { all: true } )
  ;
  
  return source
    .filter( can_read, { filter_keys: [ 'flow' ] } )
    
    .trace( 'client read', { all: true } )
    
    .through( input )
  ;
} // client()

var client_filter = rs
  .once( 15000 ) // in 15 seconds
  
  .alter( function( value ) {
    extend( value, { flow: 'client_set', id: 2 } );
  } )
  
  .set( [
    { flow: 'client_set', id: 1 },
    { flow: 'client_set', id: 3 }
  ] )
;

var source_set = rs
  .beat( 10000 ) // every 10 seconds
  .union( [ rs.set( [ {}, {}, {}, {} ] ) ] )
  .events_metadata()
  .auto_increment( { attribute: 'order' } )
  .set()
  .set_flow( 'source', { name: 'source (setflow)' } )
;

var source_1 = rs
  .set( [ {}, {}, {}, {}, {} ] )
  .events_metadata()
  .auto_increment( { attribute: 'order' } )
  .set()
  .set_flow( 'source_1', { name: 'source_1 (setflow)' } )
;

var sessions = rs
  .session_store()
  //.trace( 'before passport_user_sessions', { all: true } )
  .passport_user_sessions()
  //.trace( 'after passport_user_sessions', { all: true } )
;

var providers = rs

  .passport_strategies()

  .map( function( strategy ) {
    var name = strategy.name;

    return {
        flow : 'providers'
      , id   : name
      , name : name
      , href : '/passport/' + name
      , order: strategy.order        || name
      , icon : strategy.icon         || ''
      , label: strategy.display_name || name
    };
  } )

  .optimize()

  .set()
;


rs.union( [ source_set, source_1, sessions, rs.sets_database(), providers ] )
  
  //.trace( 'to socket.io clients', { all: true } ) // acts as the dispatcher (no_encapsulate: true)
  
  .dispatch( clients, client, { no_encapsulate: true } )
  
  //.trace( 'from socket.io clients' )
  
  .filter( client_filter )
  
  .set()
;
