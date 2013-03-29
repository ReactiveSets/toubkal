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

var client_min = xs.set( [
    { name: 'test/javascript/es5.js'    },
    { name: 'test/javascript/json2.js'  },
    
    { name: 'lib/xs.js'                 },
    { name: 'lib/code.js'               },
    { name: 'lib/pipelet.js'            },
    { name: 'lib/filter.js'             },
    { name: 'lib/order.js'              },
    { name: 'lib/aggregate.js'          },
    { name: 'lib/join.js'               },
    
    { name: 'test/xs_tests.js'          }
  ], { auto_increment: true }  ) // will auto-increment the id attribute starting at 1
  .watch()
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'lib/xs-min.js', { warnings: false } )
;

var mocha_expect = xs.set( [
    { name: 'test/javascript/mocha.js'  },
    { name: 'test/javascript/expect.js' }
  ], { auto_increment: true }  ) // will auto-increment the id attribute starting at 1
  .watch()
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect-min.js' )
;


var image = xs.set( [
    { name: 'test/css/images/ok.png' }
  ] )
  .watch()
;

xs.set( [
    { name: 'test/index.html'           },
    { name: 'test/index-min.html'       },
    { name: 'test/css/mocha.css'        }
  ] )
  .watch()
  .union( [ client_min, mocha_expect, image ] )
  .serve( servers )
;
