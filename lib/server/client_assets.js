/*  client_assets.js
    
    ----
    
    Copyright (c) 2013-2020, Reactane
    
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
"use strict";

var rs             = require( 'toubkal' )
  , path           = require( 'path' )
  , RS             = rs.RS
  , extend         = RS.extend
  , log            = RS.log.bind( null, 'client_assets' )
  , is_array       = RS.is_array
  , is_string      = RS.is_string
  , class_of       = RS.class_of
  , de             = false
  , ug             = log
  , assets_options = { key: [ 'name' ] }
;

// NPM Dependencies
exports.npm_dependencies = rs.set( [
  { name: 'node-uuid/uuid.js'                           },
  { name: 'url-pattern/lib/url-pattern.js'              },
  { name: 'undefine'                                    }
], assets_options ).require_resolve();

// Toubkal core
exports.core = rs.set( [
  { name: 'toubkal/lib/util/javascript.js'                   },
  { name: 'toubkal/lib/util/escape.js'                       },
  { name: 'toubkal/lib/util/lap_timer.js'                    },
  { name: 'toubkal/lib/util/timestamp_string.js'             },
  { name: 'toubkal/lib/util/console_logger.js'               },
  { name: 'toubkal/lib/util/lazy_logger.js'                  },
  { name: 'toubkal/lib/util/extend.js'                       },
  { name: 'toubkal/lib/util/subclass.js'                     },
  { name: 'toubkal/lib/util/loggable.js'                     },
  { name: 'toubkal/lib/util/code.js'                         },
  { name: 'toubkal/lib/util/picker.js'                       },
  { name: 'toubkal/lib/util/event_emitter.js'                },
  { name: 'toubkal/lib/util/value_equals.js'                 },
  { name: 'toubkal/lib/util/object_diff.js'                  },
  { name: 'toubkal/lib/util/cancelable.js'                   },
  
  { name: 'toubkal/lib/core/RS.js'                           },
  { name: 'toubkal/lib/core/query.js'                        },
  { name: 'toubkal/lib/core/transactions.js'                 },
  { name: 'toubkal/lib/core/pipelet.js'                      },
  { name: 'toubkal/lib/core/filter.js'                       },
  { name: 'toubkal/lib/core/trace.js'                        },
  { name: 'toubkal/lib/core/store.js'                        },
  { name: 'toubkal/lib/core/dispatch.js'                     },
  { name: 'toubkal/lib/core/stateful.js'                     },
  { name: 'toubkal/lib/core/group_by.js'                     },
  { name: 'toubkal/lib/core/transforms.js'                   },
  { name: 'toubkal/lib/core/operations.js'                   },
  { name: 'toubkal/lib/core/order.js'                        },
  { name: 'toubkal/lib/core/aggregate.js'                    },
  { name: 'toubkal/lib/core/join.js'                         },
  { name: 'toubkal/lib/core/input_set.js'                    },
  { name: 'toubkal/lib/core/json.js'                         },
  { name: 'toubkal/lib/core/events.js'                       },
  { name: 'toubkal/lib/core/transactional.js'                },
  { name: 'toubkal/lib/core/next.js'                         },
  { name: 'toubkal/lib/core/validate.js'                     },
  { name: 'toubkal/lib/core/last.js'                         },
  { name: 'toubkal/lib/core/optimize.js'                     },
  { name: 'toubkal/lib/core/uri.js'                          },
  { name: 'toubkal/lib/server/url_parse.js'                  },
  { name: 'toubkal/lib/server/url_pattern.js'                }
], assets_options ).require_resolve();

// Socket.io pipelets to connect to servers
exports.socket_io = rs.set( [
  { name: 'toubkal/lib/socket_io/socket_io_crossover.js'     },
  { name: 'toubkal/lib/socket_io/socket_io_server.js'        }
], assets_options ).require_resolve();

// Bootstrap pipelets
exports.bootstrap = rs.set( [
  { name: 'toubkal/lib/bootstrap/bootstrap_carousel.js'      },
  { name: 'toubkal/lib/bootstrap/bootstrap_photo_album.js'   }
], assets_options ).require_resolve();

// Browser client pipelets
exports.ui = rs.set( [
  { name: 'toubkal/lib/client/selector.js'                   },
  { name: 'toubkal/lib/client/query_selector.js'             },
  { name: 'toubkal/lib/client/to_dom.js'                     },
  { name: 'toubkal/lib/client/on_event.js'                   },
  { name: 'toubkal/lib/client/animation_frames.js'           },
  { name: 'toubkal/lib/client/url_events.js'                 },
  { name: 'toubkal/lib/client/table.js'                      },
  { name: 'toubkal/lib/client/control.js'                    },
  { name: 'toubkal/lib/client/form.js'                       },
  { name: 'toubkal/lib/client/local_storage.js'              },
  { name: 'toubkal/lib/client/load_images.js'                }
], assets_options ).require_resolve();

exports.react = rs.set( [
  { name: 'toubkal/lib/react/react.js'                       }
], assets_options ).require_resolve();

// All toubkal assets
exports.toubkal = rs.union( [
  exports.npm_dependencies,
  exports.core,
  exports.socket_io,
  exports.ui,
  exports.bootstrap
], { key: [ 'path' ] } ); // same key as require_resolve()

exports.build = build; // deprecated, use pipelet build()

// lib/toubkal-min.js
exports.toubkal_min = function( source, options ) {
  return build( 'lib/toubkal-min.js', exports.toubkal, options );
}; // exports.toubkal_min()

var built_assets = {};

function build( name, assets, options ) {
  // This is a multiton factory, where instances are associated to name
  var key            = assets._key
    , base_directory = options && options.base_directory
  ;
  
  if ( key.length != 1 || key[ 0 ] != 'path' ) {
    log( 'Warning: build( "', name , '" ): source assets keys must be [ "path" ], found:', key, ', adding a pass_through()' );
    
    // Force key to [ 'path' ], prevents tricky bugs when caller forgets to set key to [ 'path' ]
    assets = assets.pass_through( { key: [ 'path' ] } )
  }
  
  return built_assets[ name ] || ( built_assets[ name ] = assets
    
    .auto_increment( { name: name } ) // will auto-increment the id attribute starting at 1
    
    // Update file contents in realtime
    .watch( { name: 'watch_build_' + name, base_directory: base_directory } )
    
    // Maintain up-to-date file contents in order
    .order( [ { id: 'id' } ] )
    
    .debug( options && options.debug, 'build ' + name, { pick: { 'id': '.id', 'path': '.path', 'name': '.name' } } )
    
    // Update minified toubkal-min.js and source map in realtime
    .uglify( name, { warnings: false } )
  );
} // build()

rs
  /* --------------------------------------------------------------------------
      @pipelet build( uri, options )
      
      @short Build minified bundle for web clients
      
      @parameters
      - **uri** \\<String>: uri of bundled file, e.g.
        ```"/lib/toubkal-min.js"```.
      
      - **options** \\<Object>:
        - **base_directory**: to read files from:
          - \\<String>: path to base directory
          - \\<String []>: path elements to join using ```path.join()```.
      
      @source
      - **id** \\<Number>: optional, used to order files in bundle. If
        not provided, it is set using pipelet auto_increment().
      
      - **path** \\<String>: file to read relative path to base_directory
        or absolute path.
      
      - **uri** \\<String>: uri of file for web clients.
      
      @emits
      For each file, including all source files plus bundle plus source map
      for minified bundle:
      - **uri** \\<String>: uri of file for web clients.
      
      - **content** \\<String>: file content to serve to web clients.
      
      @description
      This is a @@stateful, @@greedy, @@assynchronous @@multiton\.
      
      Files are bundled in order of source appearance by id provided
      using pipelet auto_increment()
      
      @@see_also
      - Pipelet uglify() used to ninify files
      - Pipelet build_bundles() which uses this pipelet
      - Pipelet toubkal_min() which uses this pipelet
      - Pipelet auto_increment() used to number files by order of
        appearance.
      - Pipelet order() used to order files in bundle
  */
  .Multiton( 'build',
    // multiton
    function( uri ) {
      return uri;
    },
    
    // composition
    function( source, uri, options ) {
      return build( uri, source, options );
    }
  )
  
  /* --------------------------------------------------------------------------
      @pipelet source_map_support_min( options )
      
      @short Provides minified path and uri for browser source map support
      
      @parameters
      - **options** \\<Object>: options for pipelet require_resolve()
      
      @examples
      See example in pipelet build_bundles().
      
      @source
      No source is required, but it can be used to update the name of the
      package to resolve for browser-source-map-support:
      - **uri** \\<String>: uri for browser-source-map-support, should probably
        always be ```"/lib/browser-source-map-support.js.min"``` because this
        is what *index.html* will usually require.
      
      - **name** \\<String>: name of package to resolve using
       ```require.resolve()```. Initial name is
       ```"source-map-support/browser-source-map-support.js"```.
      
      @emits
      - **path** \\<String>: resolved path to minified
        browser-source-map-support.
      
      - **uri** <String>: ```"/lib/browser-source-map-support.js.min"```.
      
      @description
      This is a @@synchronous, @@stateful, @@greedy, @@singleton
      @@generator pipelet.
      
      It may become @@asynchronous when pipelet require_resolve()
      becomes asynchronous.
      
      @@see_also
      - Pipelet require_resolve()
      - Pipelet toubkal_min()
      - Pipelet build_bundles()
      - Pipelet www_files()
  */
  .Singleton( 'source_map_support_min', function( source, options ) {
    return source
      
      .set( [ {
        name: 'source-map-support/browser-source-map-support.js',
        uri: '/lib/browser-source-map-support.min.js'
      } ], { key: [ 'uri' ] } )
      
      .require_resolve( options )
    ;
  } ) // source_map_support_min()
  
  /* --------------------------------------------------------------------------
      @pipelet toubkal_min( options )
      
      @short Emit toubkal-min.js minified bundle.
      
      @paraneters
      - **options** \\<Object>: ignored
      
      @examples
      See example in pipelet build_bundles().
      
      @source
      Ignored
      
      @emits
      Toubkal min bundle attributes by pipelet build()
      
      @description
      This is a @@singleton @@generator pipelet.
      
      @see_also
      - Pipelet source_map_support_min()
      - Pipelet build()
      - Pipelet build_bundles()
      - Pipelet www_files()
  */
  .Singleton( 'toubkal_min', exports.toubkal_min )
  
  /* --------------------------------------------------------------------------
      @pipelet build_bundles( bundle_base, www_base, options )
      
      @short Builds minified bundles from bundle_base/bundles.json
      
      @parameters
      - **bundle_base** \\<String>: base directory to locate bundle
        configuration file, e.g. ```__dirname```.
      
      - **www_base**: base directory for public files, aka www root
        directory. In can be dedined as a:
          - \\<String>: path of www base
          - \\<String []>: path elements to www base, e.g.
            ```[ __dirname, "www" ]```.
      
      - **options** \\<Object>:
        - **bundles_json** \\<String>: name of json bundle file in *bundle_base*,
          default is "bundles.json".
      
      @examples
      - Server all assets to http(s) servers, from file application.js\:
      
      ```javascript
        // servers is a dataflow of servers from pipelet http_servers()
        
        var www_base        = [ __dirname, "www" ]
          , session_options = require( './passport.js' )( servers, rs )
        ;
        
        rs
          .union(
            [ rs.www_files( www_base ),
              rs.toubkal_min(),
              rs.source_map_support_min(),
              rs.build_bundles( __dirname, www_base )
            ],
            
            { key: [ "path"] }
          )
          
          .serve( servers, { session_options: session_options } )
        ;
      ```
      
      @source
      Source operations to write to bundle json configuration. See
      description bellow for bundle format.
      
      @emits
      - bundle attributes by pipelet build()
      
      @description
      This is a @@transactional, @@stateful, @@singleton @@generator
      pipelet.
      
      Bundle configurqtion format is an \\<Object []> which properties
      are:
      - **id** \\<String>: bundle client uri, e.g.
        ```"/lib/amadeus-min.js"```.
      
      - **base_directory**: optional, relative path to files from
        *www_base*, default is ```"js"```:
        - \\<String>: relative path
        - \\<String []>: relative path elements to join using
          ```path.join()```
      
      - **files** \\<[]>: list of files from *base_directory*, may
        be defined as:
        - \\<String>: path
        - \\<String []>: path elements to join using ```path.join()```.
      
      ### Bundle example for "amadeus" application:
      
      ```javascript
      [
        {
          "id": "/lib/amadeus-min.js",
          "base_directory": "javascript",
          "files": [
            "route.js",
            "application_routes.js",
            "common-widgets.js",
            "navigation.js",
            "home-page.js",
            "signin-page.js",
            "main.js",
            "play.js"
          ]
        }
      ]
      ```
      
      This will create the reactive bundle "/lib/amadeus-min.js" from files
      which base directory is ```path.join( www_base, "javascript" )```.
      
      @see_also
      - File application.js
      - Pipelet build()
      - Pipelet toubkal_min()
      - Pipelet source_map_support_min()
      - Pipelet www_files()
      - Pipelet http_servers()
      - [Node path.join()](https://nodejs.org/api/path.html#path_path_join_paths)
  */
  .Compose( "build_bundles", function( source, bundle_base, www_base, options ) {
    var valid_bundles = source
      
      .configuration( {
        filepath      : options.bundles_json || "bundles.json",
        base_directory: bundle_base,
        flow          : "bundles"
      } )
      
      // validate bundles, join paths
      .map( function( bundle ) {
        var id             = bundle.id
          , base_directory = bundle.base_directory
          , files          = bundle.files
        ;
        
        if ( typeof id != 'string' ) {
          error( "id must be a string, found: " + class_of( id ) );
          
          return;
        }
        
        if ( base_directory == null ) {
          base_directory = "js";
        }
        
        base_directory
          = path_join_handle_errors(  base_directory, "base_directory" )
        ;
        
        if ( ! base_directory ) return;
        
        if ( ! is_array( files ) ) {
          error( "files must be an Array, found: " + class_of( files ) );
          
          return;
        }
        
        files = files.map( function( file, i ) {
          return path_join_handle_errors( file, "file " + i )
        } );
        
        if ( files.some( ( _ ) => _ == null ) ) return;
        
        return {
          id     : id,
          files : files.map( ( file ) => path.join( base_directory, file ) )
        }
        
        function path_join_handle_errors( _path, name ) {
          _path = is_array( _path ) ? _path.slice() : [ _path ];
          
          try {
            return path.join.apply( path, _path );
          
          } catch( e ) {
            error( name + ' must be a <String> or <String[]> ' + e.message );
            
            return null;
          }
        } // path_join_handle_errors()
        
        function error( message ) {
          log( "bundle " + id + " error:", message );
        }
      } )
    ;
    
    return valid_bundles
    
      .flat_map( function( bundle ) {
        var id = bundle.id;
        
        return bundle.files.map( function( file ) {
          
          return { id : id, path : file };
        } );
      }, { key: [ 'id', "path" ] } )
      
      .optimize()
      
      .dispatch(
      
        valid_bundles.pick( { id: ".id" } ).optimize(),
        
        function( source, options ) {
          var id = this.id;
          
          return source
            .filter( [ { id: id } ], { key: [ "path" ] } )
            
            .build( id, { base_directory: www_base }  )
          ;
        }
      )
    ;
  } ) // pipelet build_bundles()
  
  /* --------------------------------------------------------------------------
      @pipelet www_files( www_base, options )
      
      @short Provide all public static assets for web clients
      
      @parameters
      - **www_base**: base directory for web client files, aka www root:
        - \\<String>: path to base directory
        - \\<String []>: path elements to join to get base directory,
          typically ```[ __dirname, "www" ].
      
      - **options** \\<Object>: optional options:
        - **extensions** \\<String[]>: file extensions to emit, default is:
          ```javascript
          [
            "html", "css", "js",
            "png", "jpg", "jpeg", "ttf", "svg", "ico",
            "woff", "woff2",
            "mp3",
            "mpeg", "avi",
            "json"
          ]
          ```
        
        - **remove_extensions** \\<String[]>: file extensions to remove
          from *extensions* option.
        
        - **add_extensions** \\<String[]>: file extensions to add to
          *extensions* option.
      
      @examples
      See example in pipelet build_bundles().
      
      @source
      Ignored for now. In the future source might be used as a filter
      to emitted files.
      
      @emits
      - **path** \\<String>: relative path from *www_base*. Will be used
        to build uri downstream typically using pipelet to_uri() or
        pipelet serve().
      
      - **base_directory** \\<String>: normalized path to base directory.
      
      @description
      This is a @@stateful @@generator pipelet.
      
      Emited files are limited to those defined by option *extensions*.
      
      One can also remove or add extensions using options *remove_extensions*
      and *add_extensions*. If defined, removed extensions are processed
      first then added extensions.
      
      If after options processing there are no extensions left, then
      any extension is allowed.
      
      @see_also
      - Pipelet to_uri()
      - Pipelet serve()
      - Pipelet all_directory_entries()
      - Pipelet build_bundles()
      - Pipelet toubkal_min()
      - Pipelet source_map_support_min()
  */
  .Compose( "www_files", function( source, www_base, options ) {
    var add_extensions    = options.add_extensions
      , remove_extensions = options.remove_extensions
      , extensions        = is_array( options.extensions ) ? options.extensions : [
          "html", "css", "js",
          "png", "jpg", "jpeg", "ttf", "svg", "ico",
          "woff", "woff2",
          "mp3",
          "mpeg", "avi",
          "json"
        ]
    ;
    
    extensions = extensions.map( is_string );
    
    is_array( remove_extensions ) && remove_extensions
      
      .map( is_string )
      
      .forEach( function( extension ) {
        var p = extensions.indexOf( extension );
        
        if ( p >= 0 ) {
          extensions.splice( p, 1 );
        }
      } )
    ;
    
    is_array( add_extensions ) && add_extensions
      
      .map( is_string )
      
      .forEach( function( extension ) {
        if ( extensions.indexOf( extension ) == -1 ) {
          extensions.push( extension );
        }
      } )
    ;
    
    var filter = [ { type: "file" } ];
    
    switch( extensions.length ) {
      case 0: break;
      
      case 1:
        filter.extension = extensions[ 0 ];
      break;
      
      default:
        extensions.unshift( 'in' );
        
        filter.extension = extensions;
    }
    
    return source
      
      .namespace()
      
      .all_directory_entries( www_base, options )
      
      .filter( filter )
    ;
  } ) // pippelet www_files()
;

de&&ug( "module loaded" );
