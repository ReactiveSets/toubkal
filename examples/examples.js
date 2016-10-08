/*  examples.js

    The MIT License (MIT)

    Copyright (c) 2013-2016, Reactive Sets

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
module.exports = function( servers ) {
  'use strict';
  
  var rs          = servers.create_namespace( 'examples', true ) // child namespace
    , RS          = rs.RS
    , extend      = RS.extend
    , log         = RS.log.bind( null, 'examples' )
    , de          = true
    , ug          = log
    , assets      = require( 'toubkal/lib/server/client_assets.js' )
    , toubkal_min = assets.toubkal_min()
    , react_js    = assets.react.watch()
    , scope       = {}
  ;
  
  // servers is the virtual servers used by examples.js only
  // so we can set its namespace
  servers.set_namespace( rs ); // set namespace to servers' child namespace
  
  // Listen when lib/toubkal-min.js is ready
  servers.http_listen( toubkal_min );
  
  /* ------------------------------------------------------------------------------------
     Watch all directories from here
  */
  rs
    .Singleton( 'directory_entries', function( source, options ) {
      return source
        .watch_directories( extend._2( { base_directory: __dirname } ) )
        
        .filter( ignore_temporary_files )
      ;
      
      function ignore_temporary_files( entry ) {
        return entry.extension.slice( -1 )  != '~'
            && entry.base.substring( 0, 2 ) != '.#'
        ;
      }
    } )
    
    .set( [ { path: '' } ] )
    
    .directory_entries()
    
    .filter( [ { type: 'directory' } ] )
    
    .directory_entries()
    
    /* ------------------------------------------------------------------------------------
       Load and Serve Static Assets
    */
    .set_output( 'assets', scope )
    
    .filter( [
      { extension: 'html' },
      { extension: 'css'  },
      { extension: 'js'   },
      { extension: 'json' }
    ] )
    
    .watch( { base_directory: __dirname } )
    
    .union( [ toubkal_min, react_js ] )
    
    // Serve assets to http servers
    .serve( servers )
  ;
  
  /* ------------------------------------------------------------------------------------
     The database, made of all found json files
  */
  rs
    .directory_entries()
    
    .filter( [ { extension: 'json' } ] )
    
    .to_uri()
    
    .map( function( table ) {
      var path = table.path
        , flow = table.uri.slice( 1 ).split( '.' )
      ;
      
      flow.pop(); // remove 'json' extension
      
      flow = flow.join( '.' ); // e.g. datasets/sales
      
      return { flow: '/table', 'name': flow, 'path': path };
    } )
    
    .optimize()
    
    .set()
    
    .trace( 'database tables' )
    
    .delivers( '/table' )
    
    .alter( function( _ ) { _.module = 'table' } )
    
    .set_output( 'tables', scope )
    
    // socket.io clients
    .Singleton( 'clients', function( source, module, options ) {
      return source
        .optimize( { key: [ 'flow', 'id' ] } )
        
        .trace( 'to clients' )
        
        .dispatch( servers.socket_io_clients(), function( source, options ) {
          
          return source
            .through( this.socket, options )
          ;
        }, { single: true } )
        
        .delivers( 'chat/chat_message_updates' )
      ;
    } )
    
    .clients()
  ;
  
  rs.output( 'assets', scope )
    .filter( [
      { extension: 'html' },
      { extension: 'css'  },
      { extension: 'js'   },
    ] )
    
    .to_uri()
    
    .filter( function( a ) {
      return [ '/server.js', '/examples.js' ].indexOf( a.uri ) == -1
        && 'data.js' != a.base
      ;
    } )
    
    .map( function( a ) {
      return {
        flow: 'assets', id: a.uri, size: a.size, mtime: a.mtime
      }
    }, { key: [ 'id' ] } )
    
    .set()
    
    // filter-out non-assets fetches
    .delivers( 'assets' )
    
    .clients()
  ;
  
  // Define table module
  rs
    .Compose( 'table', function( source, table, options ) {
      var flow = table.name;
      
      return source
        .flow( flow + '_updates' )
        
        .configuration( { 'filepath': table.path, 'flow': flow, 'base_directory': __dirname  } )
        
        .trace( 'table ' + flow )
        .set_flow( flow )
      ;
    } )
  ;
  
  // Require examples' data processors
  rs
    .directory_entries()
    
    .filter( [ { base: 'data.js', depth: 2 } ] )
    
    .alter( function( _ ) { _.module = 'require_pipeline' } )
    
    .trace( 'required pipelines' )
    
    .union( [ rs.output( 'tables', scope ), rs.set( [ { path: 'clients', module: 'clients' } ] ) ] )
    
    .set_output( 'modules', scope )
    
    // ToDo: move require_pipeline() to lib/server/require.js
    .Compose( 'require_pipeline', function( source, module, options ) {
      var uri  = RS.path_to_uri( module.path )
        , name
        , path
      ;
      
      if( uri ) {
        name = '.' + uri;
        
        de&&ug( 'require_pipeline(),', name, 'options:', options );
        
        try {
          path = require.resolve( name );
          
          console.log( path, module.path );
          
          // Clear require cache on source disconnection from dispatcher
          source._input.once( 'remove_source', clear_require_cache );
          
          // Require and create pipeline
          return require( path )( source, module, options );
        } catch( e ) {
          // ToDo: emit error to global error dataflow
          log( 'failed to load pipeline module:', name, ', error:', e, e.stack );
        }
      }
      
      function clear_require_cache() {
        de&&ug( 'clear_require_cache()', name );
        
        // remove from require cache to allow reload
        delete require.cache[ path ];
      } // clear_require_cache()
    } ) // require_pipeline()
  ;
  
  // Application loop
  rs
    .dispatch( rs.output( 'modules', scope ), module, { loop: true } )
  ;
  
  function module( source, options ) {
    de&&ug( 'start module:', this, 'options:', options );
    
    return source[ this.module ].call( source, this, options );
  } // module()
} // module.exports
