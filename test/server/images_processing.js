/*  images_processing.js
    
    tests for http.js
    
    ----
    
    Copyright (c) 2013-2016, Reactive Sets

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

var rs = require( 'toubkal/lib/core/filter.js' )
  , RS         = rs.RS
  , log        = RS.log
;

require( 'toubkal/lib/server/file.js' );
require( 'toubkal/lib/server/thumbnails.js' );
require( 'toubkal/lib/server/http.js' );
require( 'toubkal/lib/socket_io/socket_io_clients.js' );

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true, ug = log.bind( null, 'images_processing.js tests' );

/* -------------------------------------------------------------------------------------------
   Start HTTP Servers
*/
var servers = rs.set( [
    { id: 1, ip_address: '0.0.0.0', port: 8012 }
    // { port: 8043, key: '', cert: '' }, // https server usimg key and cert
  ] )
  .http_servers()
;

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/
var assets = require( 'toubkal/lib/server/client_assets.js' )
  , toubkal_min = assets.toubkal_min()
;

servers.http_listen( toubkal_min );

var images = rs
  .set( [
    { path: 'test/images/14.jpg' },
    { path: 'test/images/15.jpg' },
    { path: 'test/images/16.jpg' },
    { path: 'test/images/17.jpg' }
  ] )
  .set_flow( 'gallery_images' )
  .auto_increment()
;

var thumbnails = images
  .thumbnails( { path: 'test/images/thumbnails/', width: 150, height: 150 } )
  .set_flow( 'gallery_thumbnails' )
;

rs.set( [
    { path: 'test/bootstrap_photo_album.html'            },
    { path: 'test/javascript/jquery-1.10.2.min.js'       },
    { path: 'test/javascript/jquery-1.10.2.min.map'      },
    { path: 'test/javascript/jquery.mobile-1.3.2.min.js' },
    { path: 'test/bootstrap/css/bootstrap.css'           },
    { path: 'test/bootstrap/js/bootstrap.js'             }
  ] )
  .union( [ images, thumbnails ] )
  .watch( { base_directory: __dirname + '/..' } )
  .union( [ toubkal_min ] )
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
