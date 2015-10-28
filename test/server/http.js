/*  http.js
    
    tests for http.js
    
    ----
    
    Copyright (C) 2013, 2014, Reactive Sets

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

var client_assets = require( 'toubkal/lib/server/client_assets.js' );

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
    { port: 8080 },
    { ip_address: '::1', port: 8080 }
    //{ ip_address: '192.168.254.45' }, // bad ip address
    //{ port: 8043, key: '', cert: '' }, // https server usimg key and cert
    //{ port: 8044, pfx: '' }, // https server using pfx
  ] )
  .auto_increment()
  .http_servers()
  .virtual_http_servers( [ '::1', 'localhost', '127.0.0.1', '192.168.0.36', '146.185.152.167' ] )
  .trace( 'http servers' )
;

// Passport Application is described in ./passport.js
var session_options = require( './passport.js' )( http_servers );

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/

// lib/toubkal-min.js
var toubkal_min = client_assets.toubkal_min();

// Listen when lib/toubkal-min.js is ready
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
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect-min.js' )
  .union( [ mocha_css ] )
;

// HTML test pages
var html_tests = rs  
  .set( [
    { path: 'test' },
    { path: 'test/manual' },
    { path: 'test/automated' }
   ] )
  
  .watch_directories()
  
  .trace( 'watch_directory test' )
  
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

rs.union( [ mocha_expect, compiled_coffee, source_maps, coffee_source ] )
  .serve( http_servers, { routes: '/test' } ) // ToDo: test serve() with default route ('/') does not work
;

rs.union( [ mocha_css, mocha_expect ] )
  .serve( http_servers, { routes: '/node_modules' } )
;

// The following union is replaced by the series of _add_source() calls after serve() only for testing purposes
// of self-unions of pipelets. The prefered form is remains using an explicit Union.
// rs.union( [ toubkal_core_min, toubkal_ui_min, toubkal_min ] )
rs.serve( http_servers, { routes: [ '/lib', '/node_modules' ] } )
  ._input
  .insert_source_union()     // adding a union as the source of rs.serve() input
//  ._add_source( toubkal_core_min ) // now adding sources to that union
//  ._add_source( toubkal_ui_min )
  ._add_source( toubkal_min )
;

// Socket.io Server tests
var clients = http_servers.socket_io_clients( { remove_timeout: 10, session_options: session_options } );

// ToDo: add authorizations test
function client( source, options ) {
  de&&ug( 'creating socket_io client id: ' + this.id );
  
  var socket  = this.socket
    , input   = socket
    , user_id = socket.socket.handshake.user_id
    , output
  ;
  
  de&&ug( 'client(), user id:', user_id );
  
  input._add_source( source );
  
  output = input.trace( 'from socket.io clients' );
  
  return { input: input, output: output };
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
  .auto_increment()
  .set_flow( 'source' )
;

var source_1 = rs
  .set( [ {}, {}, {}, {}, {} ] )
  .auto_increment()
  .set_flow( 'source_1' )
;

rs.union( [ source_set, source_1 ] )
  
  .trace( 'to socket.io clients' )
  
  .dispatch( clients, client, { no_encapsulate: true, input_output: true } )
  
  .trace( 'from dispatch' )
  
  .filter( client_filter )
  
  .set()
;
