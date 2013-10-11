/*  http.js
    
    tests for http.js
    
    ----
    
    Copyright (C) 2013, Connected Sets

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

var XS = require( '../lib/server/http.js' ).XS
  , xs         = XS.xs
  , log        = XS.log
  , extend     = XS.extend
;

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
var servers = xs.set( [
    { ip_address: '0.0.0.0' },
    { port: 8080 },
    { port: 8043, key: '', cert: '' }, // https server usimg key and cert
    { port: 8044, pfx: '' }, // https server using pfx
  ] )
  .auto_increment()
  .http_servers()
;

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/
require( '../lib/server/uglify.js' );
require( '../lib/order.js' );

var xs_min = xs
  // Define JavaScript Assets to minify
  .set( [
    // IE8- compatibility
    { name: 'test/javascript/es5.js'     },
    { name: 'test/javascript/json2.js'   },
    
    // xs core
    { name: 'lib/xs.js'                  },
    { name: 'lib/code.js'                },
    { name: 'lib/pipelet.js'             },
    { name: 'lib/filter.js'              },
    { name: 'lib/order.js'               },
    { name: 'lib/aggregate.js'           },
    { name: 'lib/join.js'                },
    
    // xs socket.io
    { name: 'lib/socket_io_crossover.js' },
    { name: 'lib/socket_io_server.js'    },
    
    // Third-party client libraries
    { name: 'test/javascript/uuid.js'    },
    
    // xs client
    { name: 'lib/selector.js'            },
    { name: 'lib/table.js'               },
    { name: 'lib/control.js'             },
    { name: 'lib/form.js'                },
    { name: 'lib/load_images.js'         }
  ], { name: 'javascript assets' }  )
  
  .auto_increment() // will auto-increment the id attribute starting at 1
  
  // Update file contents in realtime
  .watch()
  
  // Maintain up-to-date file contents in order
  .order( [ { id: 'id' } ] )
  
  // Update minified xs-min.js and source map in realtime  
  .uglify( 'lib/xs-min.js', { warnings: false } )
;

var node_modules_js = xs.set( [
    { name: 'mocha/mocha.js'      },
    { name: 'expect.js/expect.js' }
  ] )
  .require_resolve()
;

var tests_min = xs
  .union( [ node_modules_js, xs.set( [ { name: 'test/xs_tests.js' } ] ) ] )
  .auto_increment() // will auto-increment the id attribute starting at 1
  .watch()
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect_tests-min.js' )
;

var ui_tests_min = xs
  .union( [ node_modules_js, xs.set( [ { name: 'test/xs_ui_tests.js' } ] ) ] )
  .auto_increment() // will auto-increment the id attribute starting at 1
  .watch()
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect_ui_tests-min.js' )
;

var node_modules_css = xs.set( [ { name: 'mocha/mocha.css' } ] )
  .require_resolve()
  .watch()
;

xs.set( [
    { name: 'test/index.html'              },
    { name: 'test/index-min.html'          },
    { name: 'test/form.html'               },
    { name: 'test/xs_form_tests.js'        },
    { name: 'test/socketio.html'           },
    { name: 'test/css/mocha.css'           },
    { name: 'test/css/table.css'           },
    { name: 'test/css/images/ok.png'       },
    { name: 'test/ui.html'                 },
    { name: 'test/load_images.html'        },
    { name: 'test/css/xs_tests.css'        },
    { name: 'test/xs_load_images_tests.js' }
  ] )
  .watch( { base_directory: __dirname + '/..' } )
  .union( [ xs_min, tests_min, ui_tests_min, node_modules_css ] )
  .serve( servers, { hostname: [ 'localhost', '127.0.0.1' ] } )
;

// Socket.io Server tests
var clients = servers.socket_io_clients( { remove_timeout: 10 } );

var source_set = xs.set( [ {}, {}, {}, {} ] ).auto_increment()
  , source_1 = xs.set( [ {}, {}, {}, {}, {} ] ).auto_increment()
;

xs.union( [
    source_set.set_flow( 'source' ),
    source_1.set_flow( 'source_1' )
  ] )

  .trace( 'to socket.io clients' )
  
  .dispatch( clients, function( source, options ) {
    de&&ug( 'creating socket_io client id: ' + this.id );
    
    return source
      .plug( this.socket )
      .trace( 'from socket.io clients' )
    ;
  } )
  .set()
;

setInterval( function() {
  source_set.add( [ {} ] ); // this should add to the source of the auto_increment() pipelet of source_set
} , 10000 )
