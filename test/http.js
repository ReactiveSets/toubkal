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
*/
var servers = xs.set( [
    { id: 1, ip_address: '0.0.0.0' },
    { id: 1, port: 8080 }
  ] )
  .http_servers()
;

xs.set( [
    { name: 'test/index.html'           },
    { name: 'this file does not exists' },
    { name: 'test/control.html'         }
  ] )
  .watch()
  //.serve( servers )
;

require( '../lib/server/uglify.js' );

xs.set( [
    { name: 'lib/xs.js' }
  ] )
  .watch()
  .uglify( 'all-min.js' )
;
