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
  
  var rs                 = servers.create_namespace( 'examples', true ) // child namespace
    , RS                 = rs.RS
    , extend             = RS.extend
    , log                = RS.log.bind( null, 'examples' )
    , de                 = true
    , ug                 = log
    , assets             = require( 'toubkal/lib/server/client_assets.js' )
    , toubkal_min        = rs.toubkal_min()
    , react_js           = assets.react.watch()
    , source_map_support = rs.source_map_support_min()
    , scope              = {}
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
    } ) // directory_entries()
    
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
    
    .union( [ toubkal_min, source_map_support, react_js ] )
    
    // Serve assets to http servers
    .serve( servers )
  ;
  
  // Socket.io client
  var client = {};
  
  var client_module = rs
    .directory_entries()
    .filter( [ { base: 'client.js', depth: 1 } ] )
    .path_join( __dirname )
    .alter( function( _ ) { _.client = client } )
    .trace( 'client module' )
  ;
  
  rs.dispatch( client_module, function( source, options ) {
    source.require_pipeline( this, options );
  } );
  
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
    
    .alter( function( _ ) { _.module = 'table' } )
    
    .set_output( 'tables', scope )
    
    // socket.io clients
    .Singleton( 'clients', function( source, module, options ) {
      return source
        .optimize( { key: [ 'flow', 'id' ] } )
        
        .trace( 'to clients' )
        
        .dispatch( servers.socket_io_clients().pick( [ 'id', 'socket' ] ).optimize(), function( source, options ) {
          
          return client.handler( source, this, options );
        }, { name: 'clients' } )
        
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
    
    .filter( [
      { base: 'data.js', depth: 2 },
      { type: 'file', directory: 'pipelines', extension: 'js' }
    ] )
    
    // Make absolute path for pipelet require_pipeline()
    .path_join( __dirname )
    
    .union( [ rs.output( 'tables', scope ), rs.set( [ { path: 'clients', module: 'clients' } ] ) ] )
    
    .trace( 'required pipelines' )
    
    .set_output( 'modules', scope )
  ;
  
  // Application loop
  rs
    .dispatch( rs.output( 'modules', scope ), module, { name: 'application loop', loop: true } )
  ;
  
  function module( source, options ) {
    de&&ug( 'start module:', this, 'options:', options );
    
    return source[ this.module || 'require_pipeline' ].call( source, this, options );
  } // module()
} // module.exports
