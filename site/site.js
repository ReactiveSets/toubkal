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
  
  var rs          = servers.create_namespace( 'site', true ) // child namespace
    , RS          = rs.RS
    , extend      = RS.extend
    , log         = RS.log.bind( null, 'site' )
    , de          = true
    , ug          = log
    , assets      = require( 'toubkal/lib/server/client_assets.js' )
    , toubkal     = assets.toubkal
    , toubkal_min // = assets.toubkal_min()
    , react_js    = assets.react.watch()
    , scope       = {}
  ;
  
  toubkal = toubkal
    .auto_increment()
    .watch( { name: 'toubkal assets' } )
  ;
  
  toubkal_min = toubkal
    .order( [ { id: 'id' } ] )
    .uglify( 'lib/toubkal-min.js', { warnings: false } )
    
    /*
    .group( function( _ ) { return {} } )
    .map( function( _ ) {
      return {
        path: 'lib/toubkal-min.js',
        
        content: _.content
          .map( function( file ) { return file.content } )
          .join( '\n' )
        }
    } )
    */
  ;
  
  var client_parsed = toubkal.acorn()
    
    , server_parsed = require( 'toubkal/lib/modules_files' )
        .modules_files()
        .require_resolve()
        .watch()
        .acorn()
  ;
  
  var documentation = client_parsed.union( [ server_parsed ] )
    .parse_documentation()
    .optimize()
    .auto_increment( { attribute: 'order' } )
    .documentation_markdown()
    .markdown()
    .set_flow( 'documentation' )
  ;
  
  // servers is the virtual servers used by site.js only
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
    
    .map( function( table ) {
      var path = table.path
        , flow = path.split( '.' )
      ;
      
      flow.pop(); // remove 'json' extension
      
      flow = flow.join( '.' ); // e.g. datasets/sales
      
      return { flow: '/table', 'name': flow, 'path': path };
    } )
    
    .optimize()
    
    .trace( 'database tables' )
    
    .flow( '/table' )
    
    .set_output( 'tables', scope )
    
    // socket.io clients
    .Singleton( 'clients', function( source, options ) {
      return source
        .optimize( { key: [ 'flow', 'id' ] } )
        
        //.trace( 'to clients' )
        
        .dispatch( servers.socket_io_clients(), function( source, options ) {
          
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
    
    .optimize() // make updates
    
    // filter-out non-assets fetches
    .flow( 'assets' )
    
    .clients()
  ;
  
  documentation.through( rs.clients() );
  
  // Serve database to socket.io clients
  rs
    .Singleton( 'database', function( source, tables, options ) {
      return source
        .dispatch( tables, function( source, options ) {
          var flow = this.name;
          
          return source
            .flow( flow + '_updates' )
            
            .configuration( { 'filepath': this.path, 'flow': flow, 'base_directory': __dirname  } )
            
            //.trace( 'table ' + flow )
            .set_flow( flow )
          ;
        } )
      ;
    } )
    
    .log_namespace( 'after singleton' )
    
    .database( rs.output( 'tables', scope ) )
    
    .clients()
  ;
  
  // Require data processors
  rs
    .directory_entries()
    
    .filter( [ { extension: 'js', depth: 2 } ] )
    
    .filter( function( file ) {
      return file.path.split( '/' ).pop() == 'data.js';
    } )
    
    .trace( 'data processors' )
    
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
