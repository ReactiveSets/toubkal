/*  site.js

    The MIT License (MIT)
    
    Copyright (c) 2013-2020, Reactane
    
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
  
  var rs            = servers.create_namespace( 'site', true ) // child namespace
    , RS            = rs.RS
    , extend        = RS.extend
    , log           = RS.log.bind( null, 'site' )
    , de            = true
    , ug            = log
    , modules_files = require( 'toubkal/lib/modules_files' ).modules_files()
    , scope         = {}
  ;
  
  var documentation = rs
    
    .set( [ { name: 'toubkal/documentation/manuals.js' } ] )
    
    .union( [ modules_files ] )
    
    .require_resolve()
    
    .union( [ rs.toubkal_assets() ] )
    
    .pick( [ 'path' ] )
    
    .unique()
    
    .auto_increment()
    
    .watch( { name: 'all assets' } )
    
    .acorn()
    
    .parse_documentation()
    
    .optimize()
    
    .documentation_markdown()
    
    .markdown()
    
    // Pick attributes needed by client, rename "html" attribute to "content"
    .pick( [ 'id', 'order', 'type', 'name', 'signature', 'title', 'manual', [ 'content', 'html' ] ] )
    
    .optimize()
    
    //.trace( 'documentation', { pick: [ 'id', 'module', 'order' ] } )
    
    // Cache generated documentation
    .set()
    
    //.trace( 'documentation', { counts: true } )
    
    .set_flow( 'documentation' )
  ;
  
  // servers is the virtual servers used by site.js only
  // so we can set its namespace
  servers.set_namespace( rs ); // set namespace to servers' child namespace
  
  var toubkal_min = rs.toubkal_min( { name: 'documentation', socket_io: true, ui: true } ); // lib/toubkal-socket_io-ui-min.js
  
  // Listen when lib/toubkal-socket_io-ui-min.js is ready
  servers.http_listen( toubkal_min );
  
  /* ------------------------------------------------------------------------------------
     Load and Serve Static Assets
  */
  rs
    .www_files( __dirname )
    
    .set_output( 'assets', scope )
    
    .union( [ toubkal_min, rs.source_map_support_min() ] )
    
    // Serve assets to http servers
    .serve( servers )
  ;
  
  /* ------------------------------------------------------------------------------------
     The database, made of all found json files
  */
  rs
    .all_directory_entries( __dirname )
    
    .filter( [ { extension: 'json' } ] )
    
    .map( function( table ) {
      var path = table.path
        , flow = path.split( '.' )
      ;
      
      flow.pop(); // remove 'json' extension
      
      flow = flow.join( '.' ); // e.g. datasets/sales
      
      return { flow: '/table', 'name': flow, 'path': path };
    } )
    
    .set()
    
    .trace( 'database tables', { counts: true } )
    
    .delivers( '/table' )
    
    .set_output( 'tables', scope )
    
    // socket.io clients
    .Singleton( 'clients', function( source, options ) {
      return source
        .optimize( { key: [ 'flow', 'id' ] } )
        
        .trace( 'to clients', { counts: true } )
        
        .dispatch( servers.socket_io_clients().pick( [ 'id', 'socket' ] ).optimize(), function( source, options ) {
          
          return source
            .through( this.socket, options )
          ;
        }, { single: true } )
      ;
    } )
    
    .clients()
  ;
  
  // Send documentation manuals to clients
  rs
    .documentation_manuals()
    
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
      return [ '/server.js', '/site.js' ].indexOf( a.uri ) == -1
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
  
  documentation.through( rs.clients() );
  
  // Serve database to socket.io clients
  rs
    // ToDo: use toubkal database() pipelet
    .Singleton( 'site_database', function( source, tables, options ) {
      return source
        .dispatch( tables, function( source, options ) {
          var flow = this.name;
          
          return source
            .flow( flow + '_updates' )
            
            .configuration( { 'filepath': this.path, 'flow': flow, 'base_directory': __dirname  } )
            
            //.trace( 'table ' + flow, { counts: true } )
            .set_flow( flow )
          ;
        } )
      ;
    } )
    
    .log_namespace( 'after singleton' )
    
    .site_database( rs.output( 'tables', scope ) )
    
    .clients()
  ;
  
  // Require data processors
  rs
    .all_directory_entries( __dirname )
    
    .filter( [ { extension: 'js', depth: 2 } ] )
    
    .filter( function( file ) {
      return file.path.split( '/' ).pop() == 'data.js';
    } )
    
    .trace( 'data processors', { pick: { path: '.path' } } )
    
    .alter( function( pipeline ) { // hack to split updates into adds and removes to test dispatch cleanup on remove
      pipeline.pipelet = 'data_processor';
    } )
    
    .set_output( 'data_processors', scope )
  ;
  
  rs
    .Compose( 'data_processor', function( source, that, options ) {
      var data_processor = './' + that.path
        , path           = require.resolve( data_processor )
        , processor
        , output
      ;
      
      de&&ug( 'requiring data processor:', data_processor );
      
      try {
        processor = require( path );
        
        output = processor( rs, options );
      } catch( e ) {
        log( 'failed to load data processor:', data_processor, ', error:', e );
      }
      
      hijack( source._input, 'remove_source', remove );
      
      return output;
      
      function remove( output, options ) {
        de&&ug( 'removing data processor:', data_processor );
        
        processor && processor.remove && processor.remove( options );
        
        delete require.cache[ path ];
      } // remove()
      
      function hijack( that, method, f ) {
        var m =  that[ method ];
        
        that[ method ] = function() {
          var parameters = Array.prototype.slice.call( arguments, 0 );
          
          f.apply( that, parameters );
          
          m.apply( that, parameters );
        }
      } // hijack()
    } ) // data_processor() pipelet
  ;
  
  rs
    .dispatch( rs.output( 'data_processors', scope ), pipeline, { loop: true } )
  ;
  
  function pipeline( source, options ) {
    return source[ this.pipelet ].call( source, this, options );
  } // data_processor()
} // module.exports
