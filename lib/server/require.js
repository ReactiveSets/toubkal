/*  require.js
    
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

var rs     = require( '../core/transforms.js' )
  , RS     = rs.RS
  , extend = RS.extend
  , log    = RS.log.bind( null, 'require' )
  , path   = require( 'path' )
;

/* -------------------------------------------------------------------------------------------
    @pipelet require_resolve( options )
    
    @short Resolve node modules from "name" attribute using require.resolve()
    
    @parameters:
      - options (Object): pipelet options, key is forced to [ 'path' ]
    
    @source:
      - name (String): module name e.g. 'mocha'. Throws if a module cannot be resolved.
    
    @emits All source attributes plus:
      - path (String): absolute module file path
      - uri  (String): '/node_modules/' + name + extension optionally added by require.resolve()
    
    @description:
      This is a @@stateless, @@synchronous, @@greedy pipelet.
*/
rs.Compose( 'require_resolve', function( source, options ) {
  options.key = [ 'path' ];
  
  return source.map( resolve, options );
  
  function resolve( module ) {
    var name      = module.name
      , resolved
      , extension
    ;
    
    try {
      resolved  = require.resolve( name );
      extension = path.extname( resolved );
      
      // add extension optionally added by require.resolve()
      if ( extension != path.extname( name ) ) name += extension;
      
      return extend( {}, module, {
        path: resolved,
        uri: '/node_modules/' + name
      } );
    } catch( e ) {
      log( 'cannot resolve:', name, '- error:', e );
      
      // ToDo: emit error in global error dataflow, instead of throwing
      throw e;
    }
  } // resolve()
} ); // require_resolve()

// require.js
