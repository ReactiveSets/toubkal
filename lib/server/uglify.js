/*  uglify.js
    
    Minify javascript content using uglifyjs
    
    ----
    
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
"use strict";

var ugly               = require( 'uglify-js' )
  , rs                 = require( '../core/stateful.js' )
  , RS                 = rs.RS
  , extend             = RS.extend
  , Transactions       = RS.Transactions
  , Transaction        = Transactions.Transaction
  , Options            = Transactions.Options
  , Set                = RS.Set
  , path_to_uri        = RS.path_to_uri
  , RS_log             = RS.log
  , log                = RS_log.bind( null, 'uglify' )
  , pretty             = RS_log.pretty
  , source_map         = require( 'source-map')
  , path               = require('path')
  , SourceMapConsumer  = source_map.SourceMapConsumer
  , SourceMapGenerator = source_map.SourceMapGenerator
  
    // Replaced @ by # out of concern for IE issues with conditional statements
    // Check uglify issue: https://github.com/mishoo/UglifyJS2/issues/310
    // Also check: https://code.google.com/p/dart/issues/detail?id=11195
  , source_mapping_s   = '//# sourceMappingURL=/'
;

/* ----------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

function minified_path( source_path ){
  var parsed = path.parse( source_path );
  
  delete parsed.base;
  
  parsed.name += '-min';
  
  return path.format( parsed );
} // minified_path()

rs
  /* --------------------------------------------------------------------------
      @pipelet uglify_each( options )
      
      @short Minifies source files separately (unbundled)
      
      @parameters
      - **options** \\<Object>: optional, pipelet alter() options plus uglify
        options:
        - **warnings** \\<Boolean>: warn when dropping unsued code, see
          documentation of [UglifyJS 2](https://github.com/mishoo/UglifyJS2).
      
      @source
      - **path** \\<String>: source file path
      - **uri** \\<String>: optional, default is built as pipelet to_uri()
      - **content** \\<String or Object>: source file content
      - **source_map** \\<String>: source map from source file, as JSON String
        or Object
      - **ast** \\<String or Object>: optional SpiderMonkey AST as JSON String
        or Object
      - **minified_path** \\<String>: optional, the path of the minified file
      - **source_map_path** \\<String>: optinal, the path of the emitted source
        source map file
      
      @emits
      All source attributes plus:
      - **ast** \\<Object>: parsed JSON UglifyJS AST tree
      - **minified_path** \\<String>: from source, or built by adding ```"-min"```
        to source ```"path"``` file name (before extention), e.g.
        ```"toubkal-min.js"```
      - **source_map_path** \\<String>: from source or built by adding
        ```".map"``` to ```"minified_path"```, e,g, ```"toubkal-min.js.map"```
      - **source** \\<String>: minified source code, if ```ast```
      - **source_map** \\<String>: source map
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
      This pipelet is not currently used, it is meant to become part of
      a build pipeline that will allow:
      - Incremental parsing of bundles, file by file, much faster on
        individual file updates because it parses only the update file.
      
      - Input source maps by file.
      
      - Bundling and source map merhing using pipelet javascript_bundle().
      
      - Replace pipelet uglify() by a composition.
      
      - Implement pipelet minify() as a composition that uses
        pipelet acorn() to parse source files, minify using uglify_each(),
        and extract documentation using pipelet parse_documentation(),
        pipelet documentation_markdown(), and pipelet markdown().
  */
  .Compose( 'uglify_each', function( source, options ) {
    return source.alter( uglify_file, options );
    
    function uglify_file( file ) {
      var source_path     = file.path
        , source_uri      = file.uri || path_to_uri( source_path )
        , source_map      = file.source_map
        , content         = file.content
        , ast             = file.ast
        , name            = file.minified_path   = file.minified_path   || minified_path( source_path )
        , source_map_path = file.source_map_path = file.source_map_path || name + '.map'
        , source_length
        , source
        , output
        , code
        , map
      ;
      
      if ( ast ) {
        source_length = file.source_length;
        
        // convert SpiderMonkey AST to uglify's AST
        source = ugly.AST_Node.from_mozilla_ast( ast );
      } else if( content ) {
        source = {};
        
        source_length = content.length;
        source[ source_uri ] = content;
      }
      
      if ( source ) {
        try {
          output      = ugly.minify( source, {
            compress: { warnings: _options.warnings },
            
            // ToDo: specify inline source map
            sourceMap: { filename: source_uri, url: '/' + source_map }
          } );
          
          code        = output.code;
          map         = output.map;
          
          if ( code ) {
            de&&ug( 'name: '  + name
              + '\n  source      length: ' + source_length
              + '\n  minified    length: ' + code.length
              + ' (' + Math.round( 100 * ( code.length / source_length ) ) + '%)'
              + '\n  source map  length: ' + map.length
              + ' (' + Math.round( 100 * ( map.length / source_length ) ) + '%)'
              + '\n  source map content: ' + map.substr( 0, 100 ) + ' ...'
            );
            
            output.code = new String( code );
            output.map  = new String( map  );
            
            return extend( output, file );
          }
        
        } catch( e ) {
          if ( i < l ) {
            log( 'error, file:', file.path, '- Error:' + e. e.stack );
          } else {
            log( 'error:', e, e.stack );
          }
          
          // ToDo: in production, trigger an alarm
        }
      } // if source
      
      // de&&ug( 'no content for name: ' + name );
    } // uglify_file()
  } ) // uglify_each()
  
  /* --------------------------------------------------------------------------
      @pipelet javascript_bundle( options )
      
      @short Bundles JavaScript files, merging source maps
      
      @parameters
      - **options** \\<Object>: optional:
        - **warnings** \\<Boolean>: warn when dropping unsued code, see
          documentation of [UglifyJS 2](https://github.com/mishoo/UglifyJS2).
      
      @source
      - **path** \\<String>: source file path
      
      - **uri** \\<String>: optional, default is built as pipelet to_uri()
      
      - **content** \\<String or Object>: source file content
      
      - **source_map** \\<String or Object>: source map from source file, as
        JSON.
      
      - **source_map_path** \\<String>: optinal, the path of the emitted source
        source map file.
      
      - **ast** \\<Object>: parsed JSON UglifyJS AST tree
      - **minified_path** \\<String>: from source, or built by adding ```"-min"```
        to source ```"path"``` file name (before extention), e.g.
        ```"toubkal-min.js"```
      - **source** \\<String>: minified source code, if ```ast```
      - **source_map** \\<String>: source map
      
      @description
      This is a @@stateful, @@greedy, @@synchronous on complete pipelet.
      
      This pipelet is a work in progress.
      
      See Also:
      - Pipelet acorn() to parse source files.
      - Pipelet uglify_each() to minify individual javascript files.
  */
  .Compose( 'javascript_bundle', function( source, options ) {
    var output_map_path        = options.output_map_path
      , output_map_dir         = path.dirname( output_map_path )
      , source_mapping_reg_exp = new RegExp( '^' + source_mapping_s )
    ;
    
    return source
      .group()
      
      .flat_map( function( bundle ) {
        var content     = bundle.content // group
          , source_maps = []
          , output_map  = new SourceMapGenerator( { file: bundle.path } )
          , offset      = 0
          , lines       = 0
        ;
        
        bundle.content = content
          // ToDo order bundle
          .sort( function( a, b ) { return a.order - b.order } )
          
          .map( function( source ) {
            if ( source.is_js ) {
              var content = source.content.replace( source_mapping_reg_exp, '' );
              
              lines = ( content.match( /\n/g ) || [] ).length + 1;
              
              return content;
            }
            
            source.lines = lines; lines = 0;
            source.map = new SourceMapConsumer( source_map.content );
            source_maps.push( source );
          } )
          
          .join()
        ;
        
        // ToDo: merge source maps
        source_maps.forEach( function( source_map ) {
          var source_map_dir = path.dirname( source_map.path );
          
          source_map.map.eachMapping( function( _ ) {
            output_map.addMapping( {
              original : { line: _.originalLine, column: _.originalColumn },
              generated: { line: _.generatedLine + offset, column: _.generatedColumn },
              source   : path.relative( output_map_dir, path.join( source_map_dir, _.source ) )
            } );
          } );
          
          offset += source_map.lines;
        } );
        
        // ToDo make output and output_map values
        return [ content, output_map ];
      } )
    ;
  } ) // javascript_bundle()
  
  /* --------------------------------------------------------------------------
      @pipelet minify( options )
      
      @short Minifies source files, emit bundle and extracted documentation
      
      @parameters
      - **options** \\<Object>: optional:
        - **warnings** \\<Boolean>: warn when dropping unsued code, see
          documentation of [UglifyJS 2](https://github.com/mishoo/UglifyJS2).
      
      @source
      - **path** \\<String>: source file path
      
      - **uri** \\<String>: optional, default is built as pipelet to_uri()
      
      - **content** \\<String or Object>: source file content
      
      - **source_map** \\<String or Object>: source map from source file, as
        JSON.
      
      - **source_map_path** \\<String>: optinal, the path of the emitted source
        source map file.
      
      @emits
      All source attributes plus:
      - **ast** \\<Object>: parsed JSON UglifyJS AST tree
      - **minified_path** \\<String>: from source, or built by adding ```"-min"```
        to source ```"path"``` file name (before extention), e.g.
        ```"toubkal-min.js"```
      - **source_map_path** \\<String>: from source or built by adding
        ```".map"``` to ```"minified_path"```, e,g, ```"toubkal-min.js.map"```
      - **source** \\<String>: minified source code, if ```ast```
      - **source_map** \\<String>: source map
      
      @description
      This is a @@stateful, @@greedy, @@synchronous pipelet.
      
      This pipelet is a work in progress, it requires
      pipelet javascript_bundle() that is not yet implemented.
      
      Uses:
      - Pipelet acorn() to parse source files
      - Pipelet uglify_each() to minify individual javascript files,
      - Pipelet parse_documentation() to parse documentation from comments
      - Pipelet documentation_markdown() to generate markdown documentation
      - Pipelet markdown() to geneate html documentation.
  */
  .Compose( 'minify', function( source, options ) {
    var parsed = source
          .acorn( otpions )
      
      , bundle = parsed
          .uglify_each( options )
          .javascript_bundle( options )
          .set_flow( 'bundle' )
      
      , documentation = parsed
          .parse_documentation()
          .optimize()
          .auto_increment( { attribute: 'order' } )
          .documentation_markdown()
          .markdown()
          .set()
          .set_flow( 'documentation' )
    ;
    
    return rs.union( [ bundle, documentation ] );
  } ) // minify()
;

/* ----------------------------------------------------------------------------
    @pipelet uglify( location, options )
    
    @short Minifies source JavaScript assets, including source map
    
    @parameters
    - **location** \\<String>: uri of minified asset, e.g.
      ```"lib/toubkal-min.js"```. Also used to build source map file
      location by adding ```".map"```.
    
    - **options** \\<Object>: 
      - **warnings** \\<Boolean>: warn when dropping unsued code, see
        documentation of [UglifyJS 3](https://github.com/mishoo/UglifyJS2).
    
    @description
    This pipelet minifies assets an generates source map on complete, using
    [UglifyJS 3](https://github.com/mishoo/UglifyJS2).
    
    This is a @@stateful, @@greedy, @@synchronous on complete pipelet.
*/
function Uglify( location, options ) {
  if ( ! location ) throw new Error( 'uglify(), undefined or empty location' );
  
  Set.call( this, [], options );
  
  this._location = location;
  this._source_map = location + '.map';
  
  // Last uglified content
  this._uglified = null;
  
  // Ongoing transaction for this location
  this._t = null;
  
  return this;
} // Uglify()

Uglify.default_options = function( location, options ) {
  return extend( {
    name       : location
  }, options );
} // Uglify.default_options()

Set.Build( 'uglify', Uglify, function( Super ) { return {
  _uglify: function( options ) {
    if ( Options.has_more( options ) ) return;
    
    var that          = this
      , filepaths     = []
      , sources       = {}
      , source_length = 0
      , _options      = that._options
      , de            = true
    ;
    
    // Fetch files from source to get the files in order if these are ordered
    // this is because the order of assets is most of the time relevant
    // Use _input._fetch instead of _fetch because files to uglify are from the source while
    // uglify() adds uglified and source map files.
    
    this._input._fetch( function( files, no_more ) {
      // ToDo: allow incremental parsing, and use files' source maps
      // See https://github.com/tarruda/powerbuild/blob/master/src/bundle.coffee line #132
      // And https://github.com/tarruda/powerbuild/blob/master/src/traverse-dependencies.coffee line #108
      // Implement this as part of a new lower granularity pipeline
      var name
        , source_map
        , output
        , code
        , map
        , previous
        , transaction
      ;
      
      files.forEach( function( file ) {
        var content = file.content;
        
        if ( content ) {
          filepaths.push( file.path );
          
          content = content.replace( /\(\s*this.undefine\s*\|\|\s*require\(\s*['"]undefine['"]\s*\)\(\s*module,\s*require\s*\)\s*\)/, "undefine" );
          
          source_length += content.length;
          
          sources[ file.uri || path_to_uri( file.path ) ] = content;
        }
      } );
      
      if ( ! no_more ) return;
      
      try {
        name        = that._location;
        source_map  = that._source_map;
        
        output      = ugly.minify( sources, {
          compress: { warnings: _options.warnings },
          
          sourceMap: { filename: name, url: '/' + source_map }
        } );
        
        code        = output.code;
        map         = output.map;
        previous    = that._uglified;
        transaction = that._t;
        
        if ( code ) {
          de&&ug( 'name: '  + name
            + '\n  source      length: ' + source_length
            + '\n  minified    length: ' + code.length
            + ' (' + Math.round( 100 * ( code.length / source_length ) ) + '%)'
            + '\n  source map  length: ' + map.length
            + ' (' + Math.round( 100 * ( map.length / source_length ) ) + '%)'
            + '\n  source map content: ' + map.substr( 0, 100 ) + ' ...'
            + '\n  filepaths: ', pretty( filepaths, '    ' )
          );
          
          that._uglified = [
            { path: name      , content: code },
            { path: source_map, content: map , mime_type: 'application/json' }
          ];
          
          if ( previous ) {
            transaction
              .add_operations( 1 )
              .remove( previous )
            ;
          }
          
          transaction.add( that._uglified );
        } else {
          // de&&ug( 'no content for name: ' + name );
          
          that._uglified = null;
          
          if ( previous ) {
            transaction.remove( previous );
          } else {
            transaction.emit_nothing();
          }
        }
        
        // ToDo: remove the following assertion once automated test is provided
        if ( that._t ) throw new Error( 'transaction has not ended' );
      } catch( e ) {
        log( 'error:', e, e.stack );
        
        // ToDo: in production, trigger an alarm
      }
    } );
  }, // _uglify()
  
  _get_transaction: function( options ) {
    // ToDo: allow simultaneous independent transactions, using this._transactions
    var t = this._t;
    
    if ( t ) return t
      .add_operations( 1 )
      .set_source_options( options )
    ;
    
    return this._t = new Transaction( 2, options )
      .on( 'add'   , Super._add   , this )
      .on( 'remove', Super._remove, this )
      .on( 'ended', function() { this._t = null }, this )
    ;
  }, // _get_transaction()
  
  _add: function( files, options ) {
    this._get_transaction( options ).add( files );
    
    this._uglify( options );
  }, // _add()
  
  _remove: function( files, options ) {
    this._get_transaction( options ).remove( files );
    
    this._uglify( options );
  }, // _remove()
  
  _update: function( updates, options ) {
    this._get_transaction( options ).update( updates );
    
    this._uglify( options );
  } // _update()
} } ); // Uglify instance methods
