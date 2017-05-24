/*  require.js
    
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

var rs     = require( '../core/transforms.js' )
  , RS     = rs.RS
  , extend = RS.extend
  , log    = RS.log.bind( null, 'require' )
  , de     = false
  , ug     = log
  , path   = require( 'path' )
;

/* ----------------------------------------------------------------------------
    @pipelet require_resolve( options )
    
    @short Resolve node modules ```"name"``` attribute using require.resolve()
    
    @parameters
    - options (Object): pipelet options, @@key is forced to ```[ 'path' ]```
    
    @source
    - name (String): module name e.g. ```"mocha"```. emits nothing if it
      cannot be resolved by ```require.resolve()```.
    
    - uri (String): optional
    
    @emits All source attributes plus:
    - path (String): absolute module file path returned by
      ```require.resolve()```
    
    - uri (String): if source uri is not defined, set it as
      ```"/node_modules/" + name``` + ```"path"``` extension
      if different than ```name``` extension.
    
    @description
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
        uri: module.uri || '/node_modules/' + name
      } );
    } catch( e ) {
      log( 'cannot resolve:', name, '- error:', e );
      
      // ToDo: emit error in global error dataflow
    }
  } // resolve()
} ); // require_resolve()

/* ----------------------------------------------------------------------------
    @pipelet require_pipeline( module, options )
    
    @short Load, and auto-unload, a module exporting a Toubkal @@pipeline
    
    @examples
    - Implement a server as set of components in the ```"components"```
      subdirectory. Each component will hot-reload automatically
      when its file is saved to disk:
      
      ```javascript
        // Get all file paths from the components subdirectory
        var components = rs
          .set( [ 'components' ]
          
          .watch_directories()
          
          // Make path absolute
          .path_join( __dirname )
        ;
        
        // Application loop, routing dataflows between all components
        rs.dispatch( components, require_component, { loop: true } );
        
        function require_component( source, options ) {
          return source
            .require_pipeline( this, options )
          ;
        } // require_component()
      ```
      
      #### Using
      - Pipelet set()
      - Pipelet watch_directories()
      - Pipelet path_join()
      - Pipelet dispatch() with ```"loop"``` option
    
    - Implement a hot-reload chat-store component for the above example:
      
      ```javascript
        module.export = function chat_store( source, module, options ) {
          return source
            .flow( 'chat messages updates' )
            
            // Add here message validation later, it will hot-reload
            
            .mysql( 'messages', [ 'id', 'user_id', 'message' ] )
            
            // Note that it is required to emit to a different dataflow than
            // source because this pipeline is run in a dispatch() loop
            .set_flow( 'chat messages' )
          ;
        }
      ```
      
      #### Using
      - Pipelet flow()
      - Pipelet @@[mysql](https://github.com/ReactiveSets/toubkal_mysql)()
      - Pipelet set_flow()
    
    @parameters
    - module (Object): passed to initialize pipeline as second parameter:
      - path (String): to ```require()``` module
      - other optional attributes for the component itself
    
    - options (Object): typically from dispatch, may include a @@transaction
      object, passed to initialize pipeline as thrird parameter.
    
    @description
    Attempts to load ```module.path``` using node ```require()```, if it
    succeeds, expects that the module ```exports``` is a function which
    signature is ```( source, module, options ) -> pipeline```, where:
    - source (Pipelet): the source to build a pipeline, itself the source
      of ```require_pipeline()```
    - module (Object): ```module``` parameter of ```require_pipeline()```
    - options (Object): ```options``` parameter of ```require_pipeline()```
    - pipeline (Pipelet): optionally returned pipeline that will be
      returned by ```require_pipeline()```.
    
    Instantiation of this pipelet is synchronous and will be blocking due to
    the synchronous and blocking nature of node ```require.resolve()``` and
    ```require()``` thenselves. To minimize blocking one can:
    - Require modules with a determined path, i.e. starting with ```"."```,
      ```".."```, or ```"/"```, otherwise ```require.resolve()``` will have
      to locate the module in the one of the ```node_modules``` directories
      and this most-likely will involve more blocking;
    - Preload modules required by required modules, when possible, so that
      they are already in ```require.cache```;
    - Avoid using ```require``` in loaded modules.
    
    This pipelet stateness, lazyness, and synchronousness is that of the
    returned pipeline by the module.
*/
rs.Compose( 'require_pipeline', function( source, module, options ) {
  var path     = module.path
    , resolved
  ;
  
  de&&ug( 'require_pipeline(),', path, 'options:', options );
  
  try {
    resolved = require.resolve( path );
    
    // Clear require cache on source disconnection from dispatcher
    source._input.once( 'remove_source', clear_require_cache );
    
    // Require and create pipeline
    return require( resolved )( source, module, options );
  } catch( e ) {
    // ToDo: emit error to global error dataflow
    log( 'failed to load pipeline module:', path, ', error:', e, e.stack );
  }
  
  function clear_require_cache() {
    de&&ug( 'clear_require_cache()', path );
    
    // remove from require cache to allow reload
    delete require.cache[ resolved ];
  } // clear_require_cache()
} ); // require_pipeline()

// require.js
