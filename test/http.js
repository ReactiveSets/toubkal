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
    { id: 1, ip_address: '0.0.0.0' },
    { id: 1, port: 8080 }
  ] )
  .http_servers()
;

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/
xs.set( [
    { name: 'test/index.html'           },
    { name: 'test/css/mocha.css'        },
    { name: 'test/javascript/es5.js'    },
    { name: 'test/javascript/mocha.js'  },
    { name: 'test/javascript/chai.js'   },
    { name: 'lib/xs.js'                 },
    { name: 'lib/code.js'               },
    { name: 'lib/pipelet.js'            },
    { name: 'lib/filter.js'             },
    { name: 'lib/order.js'              },
    { name: 'lib/aggregate.js'          },
    { name: 'lib/join.js'               },
    { name: 'test/xs_tests.js'          }
  ] )
  .watch()
  .serve( servers )
;

require( '../lib/server/uglify.js' );

xs.set( [
    { name: 'lib/xs.js' }
  ] )
  .watch()
  .uglify( 'all-min.js' )
;
