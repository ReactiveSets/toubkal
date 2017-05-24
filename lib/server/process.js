/*  process.js
    ----
    
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

var rs       = require( '../core/pipelet.js' )
  , RS       = rs.RS
  , extend   = RS.extend
  , extend_2 = extend._2
  , log      = RS.log.bind( null, 'process' )
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

module.exports = rs;

/* -------------------------------------------------------------------------------------------
    @pipelet process_argv( options )
    
    @short The set of command line arguments.
    
    @description:
      This is a @@stateful, @@read-only, @@singleton pipelet.
      
      The source is only used as a @@namespace.
    
    @parameters:
      - options (Object): @@set options
    
    @emits:
      - id (Integer): 1
      - argv (Array of Strings): command line arguments
*/
rs.Compose( 'process_argv', { singleton: true }, function( source, options ) {
  return source
    .namespace()
    .set( [ { id: 1, argv: process.argv.slice() } ], options )
  ;
} ); // argv()
