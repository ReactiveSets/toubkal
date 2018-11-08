/*
  server.js
   
  Copyright (c) 2013-2017, Reactive Sets

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

var rs = module.exports = require( './core' );

require_directory( './server', [
  'file',
  'child_process',
  'exif',
  'require',
  'toubkal_acorn',
  'parse_documentation',
  'markdown.js',
  'uglify',
  'http',
  { module: 'mailer', dependencies: [ 'nodemailer2' ] },
  'passport',
  'express',
  'thumbnails',
  'json_hide'
] );

require_directory( './socket_io', [ 'socket_io_clients', 'socket_io_server' ] );

function require_directory( directory, modules ) {
  modules
    .forEach( function( module ) {
      var parameters = [ rs ];
      
      if ( typeof module == 'object' ) {
        var dependencies = module.dependencies;
        
        if ( dependencies ) {
          parameters.push.apply( parameters,
            dependencies.map(
              function( dependency ) {
                return require( dependency );
              }
            )
          );
        }
        
        module = module.module;
      }
      
      module = require( directory + '/' + module );
      
      if ( typeof module == 'function' ) module.apply( null, parameters );
    } )
  ;
} // require_directory()

// server.js
