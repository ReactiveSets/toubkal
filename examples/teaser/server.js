/*  server.js

    The MIT License (MIT)
    
    Copyright (c) 2013-2017, Reactive Sets
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.    
*/

"use strict";

var rs = require( 'toubkal' );

require( 'toubkal/lib/core/order.js' );
require( 'toubkal/lib/server/file.js' );
require( 'toubkal/lib/server/uglify.js' );
require( 'toubkal/lib/server/http.js' );
require( 'toubkal/lib/socket_io/socket_io_clients.js' );

var servers = rs
  .set( [ // Define http servers
    { port: '8080', ip_address: '127.0.0.1' } // this application has only one server
  ] )
  
  .http_servers() // start http servers
;

// Merge and mimify all toubkal client javascript assets in realtime
var toubkal_min = require( 'toubkal/lib/server/client_assets' ).toubkal_min();

// Listen when toubkal-min.js is ready
servers.http_listen( toubkal_min );

// Other static assets
rs.set( [
    { path: 'index.html' },
    { path: 'table.css'  },
    { path: 'client.js'  }
  ] )
  
  .watch( { base_directory: __dirname } ) // Retrieves file content with realtime updates
  
  .union( [ toubkal_min ] )
  
  .serve( servers ) // Deliver up-to-date compiled and mimified assets to clients
;

// Start socket servers on all http servers using socket.io
var clients = servers.socket_io_clients(); // Provide a dataflow of socket.io client connections

var sales = rs
  .configuration( { filepath: 'sales.json', flow: 'teaser/sales', base_directory: __dirname } ) // The sales dataflow 
  
  .alter( function( sale ) {
    sale.year = parseInt( sale.date.slice( 0, 4 ), 10 );
  } )
;

sales
  .dispatch( clients, client )  // Serve 64k simultaneous user connexions over one core
;

function client ( source ) {
  
  var socket = this.socket;     // Socket to exchange data with web browser

  source                        // Dataflows from the database through dispatch()
    ._add_destination( socket ) // Send data to web browser
  ;

  return socket;
}
