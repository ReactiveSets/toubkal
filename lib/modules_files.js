/*
  modules_files.js
  
  Copyright (c) 2013-2018, Reactive Sets
  
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

var rs = module.exports = require( './core.js' )
  , RS = rs.RS
;

require( './server/file.js' );

rs
  /* --------------------------------------------------------------------------
      @pipelet modules_files( options )
      
      @short @@Singleton of toubkal modules' files from
      ```toubkal/lib/modules.json```
      
      @parameters
      - **options**: @@pipelet:configuration() options
        - **filepath** (String): default is ```lib/modules.json"```
        - **flow** (String): default is "modules"
      
      @emits
      - **name** (String): name for require() in toubkal/lib
      - **module** (String): module id
      - **dependencies** (Array) module dependencies if any
      
      @description
      Configuration in ```toubkal/lib/modules.json``` values:
      - **id** (String): the name of the module, e.g. ```"server"```
      - **files** (Array): files definitions:
        (String): module file name
        (Object):
          - **module** (String): module file name in module
          - **dependencies** (Array of Strings): npm dependencies
      
      @see_also
      - Pipelet require_resolve()
  */
  .Singleton( 'modules_files', function( source, options ) {
    return source
      .namespace()
      
      .configuration( RS.extend( { filepath: __dirname + '/modules.json', flow: 'modules' }, options ) )
      
      .flat_map( toubkal_lib_names, { key: [ 'name' ] } )
      
      .optimize()
    ;
    
    function toubkal_lib_names( module ) {
      return module.files
        .map( function( file ) {
          var is_object = typeof file == 'object'
            , filename  = is_object ? file.module : file
            , out       = { module: module.id, name: 'toubkal/lib/' + module.id + '/' + filename }
          ;
          
          if ( is_object && file.dependencies ) {
            out.dependencies = file.dependencies;
          }
          
          return out;
        } )
      ;
    } // toubkal_lib_names()
  } ) // pipelet modules_files()
;
