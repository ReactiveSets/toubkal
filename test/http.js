/*  http.js
    
    tests for http.js
    
    ----
    
    Copyright (C) 2013, 2014, Connected Sets

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

var xs      = require( '..' )
  , XS      = xs.XS
  , log     = XS.log
  , extend  = XS.extend
;

require( '../lib/filter.js' );
require( '../lib/server/http.js' );
require( '../lib/server/socket_io_clients.js' );
require( '../lib/server/file.js' );

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true;
  
function ug( m ) {
  log( "xs tests http, " + m );
} // ug()

 
/* -------------------------------------------------------------------------------------------
   Start HTTP Servers
*/
var http_servers = xs
  .set( [
    { ip_address: '0.0.0.0' },
    { port: 8080 },
    { ip_address: '192.168.254.45' }, // bad ip address
    { port: 8043, key: '', cert: '' }, // https server usimg key and cert
    { port: 8044, pfx: '' }, // https server using pfx
  ] )
  .auto_increment()
  .http_servers()
  .virtual_http_servers( [ 'localhost', '127.0.0.1', '192.168.0.36', '146.185.152.167' ] )
  .trace( 'http servers' )
;

/* -------------------------------------------------------------------------------------------
   Express Application for Passport
*/
var express            = require( 'express' )
  , cookie             = require( 'cookie' )
  , parse_cookie       = cookie.parse
  , session            = require( 'express-session' )
  , uid2               = require( 'uid2' )
  , session_store      = new session.MemoryStore()
  , application        = express()
  , session_options    = { key: 'xs_sid', secret: 'fudge', store: session_store }
  , parseSignedCookies = require( 'cookie-parser/lib/parse.js' ).signedCookies
  // Make a handler that does not receive the next() parameter, because errors will be
  // handled by express
  , handler = function( request, response ) { application( request, response ) }
  
  , passport_route = '/passport'
;

function get_session( request, fn ) {
  var cookie = request.headers.cookie;
  
  if ( ! request.signedCookies ) {
    if ( ! request.cookies ) {
      cookie = decodeURIComponent( cookie );
      
      de&&ug( 'get_session(), decoded cookie: ' + cookie );
      
      request.cookies = cookie = parse_cookie( cookie );
      
      de&&ug( 'get_session(), parsed cookie: ' + log.s( cookie ) );
    }
    
    request.signedCookies = cookie = parseSignedCookies( cookie, session_options.secret );
    
    de&&ug( 'get_session(), signed cookie parsed: ' + log.s( cookie ) );
  }
  
  var xs_sid = request.signedCookies[ session_options.key ];
  
  de&&ug( 'get_session(), xs_sid: ' + xs_sid );
  
  session_store.get( xs_sid, function( error, _session ) {
    if ( error ) {
      de&&ug( 'get_session(), error getting session from store: ' + error );
    } else if ( _session ) {
      de&&ug( 'get_session(), create session in request' );
      
      request.sessionID = xs_sid;
      request.sessionStore = session_store;
      
      _session = session_store.createSession( request, _session );
    } else {
      de&&ug( 'get_session(), no session, create empty session' );
      
      if ( ! xs_sid ) {
        xs_sid = uid2( 24 );
        
        de&&ug( 'get_session(), no xs_sid, generate: ' + xs_sid );
        
        // ToDo: Need to setup cookie on response.end that needs to be captured in socket.io handshake, cannot be done here
      }
      
      request.sessionID = xs_sid;
      request.sessionStore = session_store;
      
      _session = new session.Session( request );
      _session.cookie = new session.Cookie( {} );
      
      _session = session_store.createSession( request, _session );
    }
    
    fn( error, _session );
  } )
} // get_session()

// Bind express Application to base url route '/passport'
http_servers
  .serve_http_servers( handler, { routes: passport_route } )
;

// Passport Application is described in ./passport.js
require( './passport.js' )( express, session_options, application, passport_route );

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/
require( '../lib/server/uglify.js' );
require( '../lib/order.js' );

// XS Dependencies
var xs_dependencies = xs
  .set( [
    { name: 'node-uuid/uuid.js'          },
  ] )
  .require_resolve()
;

// lib/xs-min.js
var xs_min = xs
  .union( [ xs_dependencies, xs.set( [
    // IE compatibility
    { path: 'test/javascript/es5.js'       },
    { path: 'test/javascript/json2.js'     },
    
    // xs core
    { path: 'lib/xs.js'                    },
    { path: 'lib/code.js'                  },
    //{ path: 'lib/trace_domain.js'          },
    { path: 'lib/query.js'                 },
    { path: 'lib/transactions.js'          },
    { path: 'lib/pipelet.js'               },
    { path: 'lib/filter.js'                },
    { path: 'lib/order.js'                 },
    { path: 'lib/aggregate.js'             },
    { path: 'lib/join.js'                  },
    
    // xs utilities
    { path: 'lib/json.js'                  },
    { path: 'lib/uri.js'                   },
    { path: 'lib/events.js'                },
    { path: 'lib/transforms.js'            },
    
    // xs socket.io
    { path: 'lib/socket_io_crossover.js'   },
    { path: 'lib/socket_io_server.js'      },
    
    // xs client
    { path: 'lib/selector.js'                },
    { path: 'lib/client/animation_frames.js' },
    { path: 'lib/client/url.js'              },
    { path: 'lib/table.js'                   },
    { path: 'lib/control.js'                 },
    { path: 'lib/form.js'                    },
    { path: 'lib/load_images.js'             },
    
    // bootstrap
    { path: 'lib/bootstrap_carousel.js'    },
    { path: 'lib/bootstrap_photo_album.js' },
  ] ) ] )
  
  .auto_increment( { name: 'javascript assets' } ) // will auto-increment the id attribute starting at 1
  
  // Update file contents in realtime
  .watch()
  
  // Maintain up-to-date file contents in order
  .order( [ { id: 'id' } ] )
  
  // Update minified xs-min.js and source map in realtime  
  .uglify( 'lib/xs-min.js', { warnings: false } )
;

// Listen when lib/xs-min.js is ready
http_servers.http_listen( xs_min );

var xs_core_min = xs
  .union( [ xs_dependencies, xs.set( [
    { path: 'lib/xs.js'                    },
    { path: 'lib/code.js'                  },
    { path: 'lib/query.js'                 },
    { path: 'lib/transactions.js'          },
    { path: 'lib/pipelet.js'               },
    { path: 'lib/filter.js'                },
    { path: 'lib/order.js'                 },
    { path: 'lib/aggregate.js'             },
    { path: 'lib/join.js'                  },
    { path: 'lib/last.js'             }
  ] ) ] )
  .auto_increment( { name: 'xs core' } )
  .watch()
  .order( [ { id: 'id' } ] )
  .uglify( 'lib/xs_core-min.js', { warnings: false } )
;

var xs_ui_min = xs
  .set( [
    { path: 'lib/selector.js'                },
    { path: 'lib/uri.js'                     },
    { path: 'lib/events.js'                  },
    
    { path: 'lib/client/animation_frames.js' },
    { path: 'lib/load_images.js'             },
    
    { path: 'lib/bootstrap_photo_album.js'   },
    { path: 'lib/bootstrap_carousel.js'      },
    
    { path: 'lib/client/url.js'              },
    { path: 'lib/table.js'                   },
    { path: 'lib/control.js'                 },
    { path: 'lib/form.js'                    }
  ] )
  
  .auto_increment( { name: 'xs ui' } )
  
  .watch()
  
  .order( [ { id: 'id' } ] )
  
  .uglify( 'lib/xs_ui-min.js', { warnings: false } )
;

var pipelet_min = xs.set( [
    { id: 1, path: 'lib/xs.js'           },
    { id: 2, path: 'lib/code.js'         },
    { id: 3, path: 'lib/query.js'        },
    { id: 4, path: 'lib/transactions.js' },
    { id: 1, path: 'lib/pipelet.js'      }
  ] )
  .watch()
  .uglify( 'lib/pipelet-min.js', { warnings: false } )
;

var mocha_css = xs
  .set( [ { name: 'mocha/mocha.css' } ] )
  .require_resolve()
  .watch()
;

var mocha_expect = xs.set( [
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
var html_tests = xs  
  .set( [ { path: 'test' } ] )
  
  .watch_directories()
  
  .trace( 'watch_directory test' )
  
  .filter( [ { type: 'file', extension: 'html' } ] )
;

// JavaScript test files
var javascript_files = xs
  .set( [ { path: 'test/javascript' } ] )  
  
  .watch_directories()
  
  .filter( [ { type: 'file', extension: 'js' } ] )
;

// CSS and images for tests
var css_tests = xs
  .set( [ { path: 'test/css' }, { path: 'test/css/images' } ] )
  
  .watch_directories()
  
  .filter( [ { type: 'file' } ] )
;

var tests = xs
  .union( [ html_tests, javascript_files, css_tests ] )
  
  .watch( { base_directory: __dirname + '/..' } )
;


var coffee_files = xs
  .set( [ { path: 'test/src' } ] )
  
  .watch_directories()
  
  .filter( [ { type: 'file', extension: 'coffee' } ] )
;

var coffee_source = coffee_files
  .watch( { base_directory: __dirname + '/..' } )
;


var test_lib = xs
  .set( [ { path: 'test/lib' } ] )
  
  .watch_directories()
;

var compiled_coffee = test_lib
  .filter( [ { type: 'file', extension: 'js' } ] )
  
  .watch( { base_directory: __dirname + '/..' } )
  
  .alter( function( v ) {
    // Fix Coffee-script sourceMappingURL
    v.content = v.content
      .replace( /\/\/@ sourceMappingURL=/, '//# sourceMappingURL=' )
    ;
  } )
;

var source_maps = test_lib
  .filter( [ { type: 'file', extension: 'map' } ] )
  
  .watch( { base_directory: __dirname + '/..' } )
  
  .alter( function( v ) {
    // Fix Coffee-script source map
    v.content = v.content
      .replace( /"sourceRoot": ".."/, '"sourceRoot": ""' )
      .replace( /test\\\\/, '' )
      .replace( /test[\/]/, '' )
    ;
  } )
;

// Serve assets to http servers
tests.serve( http_servers, { routes: '/test' } );

xs.union( [ mocha_expect, compiled_coffee, source_maps, coffee_source ] )
  .serve( http_servers, { routes: '/test' } ) // ToDo: test serve() with default route ('/') does not work
;

xs.union( [ mocha_css, mocha_expect ] )
  .serve( http_servers, { routes: '/node_modules' } )
;

pipelet_min.serve( http_servers, { routes: '/lib' } );

// The following union is replaced by the series of _add_source() calls after serve() only for testing purposes
// of self-unions of pipelets. The prefered form is remains using an explicit Union.
// xs.union( [ xs_core_min, xs_ui_min, xs_min ] )
xs.serve( http_servers, { routes: [ '/lib', '/node_modules' ] } )
  ._input
  ._insert_source_union()     // adding a union as the source of xs.serve() input
  ._add_source( xs_core_min ) // now adding sources to that union
  ._add_source( xs_ui_min   )
  ._add_source( xs_min      )
;

// Socket.io Server tests
var clients = http_servers.socket_io_clients( { remove_timeout: 10 } );

var source_set = xs.set( [ {}, {}, {}, {} ] ).auto_increment()
  , source_1 = xs.set( [ {}, {}, {}, {}, {} ] ).auto_increment()
;

// ToDo: add authorizations test
function client( source, options ) {
  de&&ug( 'creating socket_io client id: ' + this.id );
  
  var socket = this.socket
    , input  = socket
    , output
  ;
  
  input._add_source( source );
  
  output = input.trace( 'from socket.io clients' );
  
  get_session( socket.socket.handshake, function( error, session ) {
    if ( session ) {
      session.views = ( session.views || 0 ) + 1;
      
      //session.resetMaxAge();
      session.save( function( error ) {
        if ( error ) {
          de&&ug( 'client, failed saving session, error: '
            + log.s( {
              name: error.name,
              message: error.message,
              stack: error.stack && error.stack.split( '\n' )
            } )
          );
          
          return;
        }
        
        de&&ug( 'client, saved session' + log.s( session ) );
      } );
    }
    
    de&&ug( 'client, session: ' + log.s( { error: error || 'no error', session: session || 'no session' }, null, ' ' ) );
  } );
  
  return { input: input, output: output };
} // client()

var client_filter = xs.set( [ { flow: 'client_set', id: 1 }, { flow: 'client_set', id: 3 } ] );

xs.union( [
    source_set.set_flow( 'source' ),
    source_1.set_flow( 'source_1' )
  ] )
  
  .trace( 'to socket.io clients' )
  
  .dispatch( clients, client, { no_encapsulate: true, input_output: true } )
  
  .trace( 'from dispatch' )
  
  .filter( client_filter )
  
  .set()
;

true && setInterval( function() {
  source_set._add( [ {} ] ); // this should add to the input of the auto_increment() pipelet of source_set
} , 10000 );

setTimeout( function() {
  client_filter._add( [ { flow: 'client_set', id: 2 } ] );
}, 15000 );
