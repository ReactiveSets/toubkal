/*  server.js
    ---------
    
    Copyright (C) 2013, Reactive Sets

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

/* -------------------------------------------------------------------------------------------
   Start HTTP Servers
*/
var rs = require( 'toubkal' );

require( 'toubkal_mysql' )( rs );

rs
  .set( [
    {
        id: 1
      , ip_address: '0.0.0.0'
      , port: 80
    }
  ] )
  
  .http_servers()
  
  .set()
  
  .virtual_http_servers( [ '127.0.0.1', 'localhost' ] )
  
  .require_pipeline( { path: __dirname + '/application' } )
;

function https_redirect( req, res ) {
  res.writeHead( 301, { Location: 'https://localhost' + req.url } );
  res.end();
} // https_redirect()

module.exports = function( servers ) {
  servers
    .http_listen( rs.set( [] ) )
    
    .serve_http_servers( https_redirect )
  ;
}
