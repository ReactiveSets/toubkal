/*
  server.js
   
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
'use strict';

module.exports = require( './core' );

require_directory( './server', [
  'file',
  'require_resolve',
  'uglify',
  'http',
  'mailer',
  'passport',
  'express',
  'thumbnails'
] );

require_directory( './socket_io', [ 'socket_io_clients', 'socket_io_server' ] );

function require_directory( directory, modules ) {
  modules
    .forEach( function( module ) {
      require( directory + '/' + module );
    } )
  ;
} // require_directory()

// server.js
