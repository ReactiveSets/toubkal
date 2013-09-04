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
  log( "xs images processing tests, " + m );
} // ug()
  
/* -------------------------------------------------------------------------------------------
   Start HTTP Servers
*/
var servers = xs.set( [
    { ip_address: '0.0.0.0', port: 8012 },
    // { port: 8043, key: '', cert: '' }, // https server usimg key and cert
  ], { auto_increment: true } )
  .http_servers()
;

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/
require( '../lib/server/uglify.js' );
require( '../lib/order.js' );
require( '../lib/thumbnails.js' );

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
    { name: 'lib/order.js'               },
    
    // xs socket.io
    { name: 'lib/socket_io_crossover.js' },
    { name: 'lib/socket_io_server.js'    },
    
    // xs client
    { name: 'lib/selector.js'            }
    //{ name: 'lib/thumbnails.js'          }
  ], { auto_increment: true, name: 'javascript assets' }  ) // will auto-increment the id attribute starting at 1
  
  // Update file contents in realtime
  .watch()
  
  // Maintain up-to-date file contents in order
  .order( [ { id: 'id' } ] )
  
  // Update minified xs-min.js and source map in realtime  
  .uglify( 'lib/xs-min.js', { warnings: false } )
;

var tests_min = xs.set( [
    { name: 'node_modules/mocha/mocha.js'         },
    { name: 'node_modules/expect.js/expect.js'    },
  ], { auto_increment: true }  ) // will auto-increment the id attribute starting at 1
  .watch()
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect_tests-min.js' )
;

var images = xs
  .set( [
    { name: 'test/images/14.jpg' },
    { name: 'test/images/15.jpg' },
    { name: 'test/images/16.jpg' },
    { name: 'test/images/17.jpg' }
  ], { auto_increment: true } )
;

var thumbnails = images
  .watch()
  .thumbnails( { path: 'test/images/thumbnails/', width: 500, height: 500 } )
;

xs.set( [
    { name: 'test/gallery.html'         },
    { name: 'test/xs_gallery_tests.js'  },
    { name: 'node_modules/mocha/mocha.css' },
  ] )
  .union( [ images, thumbnails ] )
  .watch()
  .union( [ xs_min, tests_min ] )
  .serve( servers )
;
