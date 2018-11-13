/*  assets.js
    ---------
    
    Application assets
    
    Licence
*/
module.exports = function( rs ) {
  'use strict';
  var extend        = rs.RS.extend
  var path          = require( 'path' )
    , www           = { base_directory: path.join( __dirname, 'www' ), debug: true }
    , client_assets = require( 'toubkal/lib/server/client_assets.js' )
  ;
  
  // -------------------------------------------------------------------------------------------
  // Load and Serve Assets
  var toubkal_min = client_assets.toubkal_min() // js/toubkal-min.js
    , map_support = rs.source_map_support_min()
  ;
  
  var app_js_files = [
        'url.js',
        'utils.js',
        'widgets.js',
        'main.js'
      ]
      
      .map( function( v ) {
        return { path: typeof v === 'string' ? 'js/' + v : v.base_dir + v.filename }
      } )
  ;
  
  var app_min = rs
    .set( app_js_files, { key: [ 'path' ] } )
    
    .build( 'lib/app-min.js', www )
  ;
  
  return rs
    .Singleton( 'directory_entries', function( source, options ) {
      return source
        .watch_directories( extend._2( { base_directory: __dirname }, options ) )
        
        .filter( ignore )
      ;
      
      function ignore( entry ) {
        return entry.extension.slice( -1 )  != '~' 
            && entry.base.substring( 0, 1 ) != '.'
        ;
      }
    } )
    
    .set( [ { path: '' } ] )
    
    .directory_entries( www )
    
    .filter( [ { type: 'directory' } ] )
    
    .directory_entries()
    
    .filter( [
      { extension: 'json' },
      { extension: 'html' },
      { extension: 'css'  },
      { extension: 'js'   },
      { extension: 'png'  },
      { extension: 'jpg'  },
      { extension: 'jpeg' },
      { extension: 'svg'  }
    ] )
    
    .watch( www )
    
    .union( [ toubkal_min, map_support, app_min ] )
  ;
}; // module.export
