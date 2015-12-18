/*  require_resolve.js
    
    Copyright (C) 2013-2015, Reactive Sets

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

var rs       = require( '../core/transforms.js' )
  , RS       = rs.RS
  , extend_2 = RS.extend._2
  , log      = RS.log.bind( null, 'require_resolve()' )
;

/* -------------------------------------------------------------------------------------------
    require_resolve( options )
    
    Resolve node_module names for watch(), and make uri for uglify() source map and
    http_server serve().
    
    This is a stateless, synchronous, greedy pipelet.
    
    Source attributes:
    - name (String): module name e.g. 'mocha'. If a module cannot be resolved, there is no
      output for this module. eventually an error could be sent in the global error
      dataflow.
    
    Destination attributes: all attributes from source plus:
    - path (String): absolute module file path
    - uri  (String): '/node_modules/' + name
    
    Parameters:
    - options (Object): pipelet options, key is forced to [ 'path' ]
*/
rs.Compose( 'require_resolve', function( source, options ) {
  options.key = [ 'path' ];
  
  return source
    .map( resolve, options )
  ;
  
  function resolve( module ) {
    var name = module.name;
    
    try {
      return extend_2( {
        path: require.resolve( name ),
        uri: '/node_modules/' + name
      }, module );
    } catch( e ) {
      log( 'cannot resolve:', name, '- error:', e );
      
      // ToDo: emit error in global error dataflow, instead of throwing
      throw e;
    }
  } // resolve()
} ); // require_resolve()

// require_resolve.js
