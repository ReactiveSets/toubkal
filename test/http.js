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
  ], { auto_increment: true } )
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
    { name: 'lib/control.js'             },
    { name: 'lib/form.js'                }
  ], { auto_increment: true, name: 'javascript assets' }  ) // will auto-increment the id attribute starting at 1
  
  // Update file contents in realtime
  .watch()
  
  // Maintain up-to-date file contents in order
  .order( [ { id: 'id' } ] )
  
  // Update minified xs-min.js and source map in realtime  
  .uglify( 'lib/xs-min.js', { warnings: false } )
;

var tests_min = xs.set( [
    { name: 'test/javascript/mocha.js'  },
    { name: 'test/javascript/expect.js' },
    { name: 'test/xs_tests.js'          }
  ], { auto_increment: true }  ) // will auto-increment the id attribute starting at 1
  .watch()
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect_tests-min.js' )
;

xs.set( [
    { name: 'test/index.html'           },
    { name: 'test/index-min.html'       },
    { name: 'test/form.html'            },
    { name: 'test/xs_form_tests.js'     },
    { name: 'test/socketio.html'        },
    { name: 'test/css/mocha.css'        },
    { name: 'test/css/images/ok.png'    }
  ] )
  .watch()
  .union( [ xs_min, tests_min ] )
  .serve( servers )
;

// Socket.io Server tests
var clients = servers.socket_io_clients();

xs.set( [
    { model: 'source', id: 1 },
    { model: 'source', id: 2 },
    { model: 'source', id: 3 },
    { model: 'source', id: 4 }
  ] )
  
  .trace( 'to socket.io clients' )
  
  .map_reduce( clients, function( source, client ) {
    de&&ug( 'creating socket_io client id: ' + client.id );
    
    return source.plug( client.socket ).set();
  } )
  
  .trace( 'from socket.io clients' )
;
