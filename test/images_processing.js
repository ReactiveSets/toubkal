/*  images_processing.js
    
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
  log( "xs images processing tests, " + m );
} // ug()
  
/* -------------------------------------------------------------------------------------------
   Start HTTP Servers
*/
var servers = xs.set( [
    { id: 1, ip_address: '0.0.0.0', port: 8012 },
    // { port: 8043, key: '', cert: '' }, // https server usimg key and cert
  ] )
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
    { name: 'test/javascript/es5.js'       },
    { name: 'test/javascript/json2.js'     },
    
    // Third-party client libraries
    { name: 'test/javascript/uuid.js'      },
    
    // xs core
    { name: 'lib/xs.js'                    },
    { name: 'lib/code.js'                  },
    { name: 'lib/pipelet.js'               },
    { name: 'lib/filter.js'                },
    { name: 'lib/order.js'                 },
    { name: 'lib/events.js'                },
    
    // xs socket.io
    { name: 'lib/socket_io_crossover.js'   },
    { name: 'lib/socket_io_server.js'      },
    
    // xs client
    { name: 'lib/uri.js'                   },
    { name: 'lib/selector.js'              },
    { name: 'lib/load_images.js'           },
    { name: 'lib/bootstrap_carousel.js'    },
    { name: 'lib/bootstrap_photo_album.js' }
  ], { name: 'javascript assets' } )
  .auto_increment() // will auto-increment the id attribute starting at 1
  
  // Update file contents in realtime
  .watch()
  
  // Maintain up-to-date file contents in order
  .order( [ { id: 'id' } ] )
  
  // Update minified xs-min.js and source map in realtime  
  .uglify( 'lib/xs-min.js', { warnings: false } )
;

var images = xs
  .set( [
    { name: 'test/images/14.jpg' },
    { name: 'test/images/15.jpg' },
    { name: 'test/images/16.jpg' },
    { name: 'test/images/17.jpg' }
  ] )
  .set_flow( 'gallery_images' )
  .auto_increment()
;

var thumbnails = images
  .thumbnails( { path: 'test/images/thumbnails/', width: 150, height: 150 } )
  .set_flow( 'gallery_thumbnails' )
;

xs.set( [
    { name: 'test/bootstrap_photo_album.html'            },
    { name: 'test/javascript/jquery-1.10.2.min.js'       },
    { name: 'test/javascript/jquery-1.10.2.min.map'      },
    { name: 'test/javascript/jquery.mobile-1.3.2.min.js' },
    { name: 'test/bootstrap/css/bootstrap.css'           },
    { name: 'test/bootstrap/js/bootstrap.js'             }
  ] )
  .union( [ images, thumbnails ] )
  .watch( { base_directory: __dirname + '/..' } )
  .union( [ xs_min ] )
  .serve( servers, { hostname: [ 'localhost', '127.0.0.1' ] } )
;

// Serve contact_form_fields to socket.io clients
images
  .union( [ thumbnails ] )
  
  .trace( 'to socket.io clients' )
  
  // Start socket.io server, and dispatch client connections to provide contact_form_fields and get filled contact forms
  .dispatch( servers.socket_io_clients(), function( source, options ) {
    return this.socket._add_source( source );
  } )
;
