/*  uglify.js
    
    Minify javascript content using uglifyjs
    
    ----
    
    Copyright (C) 2013, 2014, Connected Sets

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

var u
  , ugly   = require( 'uglify-js' )
;

var XS = require( '../pipelet.js' ).XS;

var xs         = XS.xs
  , log        = XS.log
  , extend     = XS.extend
  , Code       = XS.Code
  , Set        = XS.Set
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true;

function ug( m ) {
  log( "xs uglify, " + m );
} // ug()

/* -------------------------------------------------------------------------------------------
   Uglify( location, options )
*/
function Uglify( location, options ) {
  var u, options = Set.call( this, [], options )._options;
  
  // Keep function arguments by default, which is the opposite as UglifyJS default
  if ( options.keep_fargs === u ) options.keep_fargs = true;
  
  if ( location === u || location.length === 0 ) throw new Error( 'uglify(), undefined or empty location' );
  
  this._location = location;
  this._source_map = location + '.map';
  
  return this;
} // Uglify()

/* -------------------------------------------------------------------------------------------
   delay( duration )
   
   delay a function execution by duration miliseconds, typically for testing purposes.

Function.prototype.delay = function( duration ) {
  var f = this, slice = Array.prototype.slice;
  
  return function() {
    var that = this, a = slice.call( arguments, 0 );
    
    setTimeout( function() {
      f.apply( that, a );
    }, duration );
  }
}
*/

/* -------------------------------------------------------------------------------------------
   source().uglify( location, options )
*/
Set.Build( 'uglify', Uglify, {
  uglify: function() {
    var that = this, filepaths = [], source_length = 0, ast;
    
    // Fetch files from source to get the files in order if these are ordered
    // this is because the order of assets is most of the time relevant
    // Use __fetch_source instead of _fetch because files to uglify are from the source while
    // uglify() adds uglified and source map files.
    
    // ToDo: keep parsed ast for each file and re-parse only files which have changed
    this.__fetch_source( function( files, no_more ) {
      try {
        // ToDo: find last modified file time to add to stat info for generated content
        for ( var i = -1, l = files.length; ++i < l; ) {
          var file = files[ i ], content = file.content;
          
          if ( content ) {
            filepaths.push( file.path );
            
            source_length += content.length;
            
            ast = ugly.parse( content, { filename: file.uri || ( '/' + file.path ), toplevel: ast } );
          }
        }
        
        if ( ! no_more ) return;
        
        var name = that._location, source_map = that._source_map;
        
        if ( ast ) {
          // Compress
          ast.figure_out_scope();
          
          var options = that._options;
          
          // ToDo: uncomment keep_fargs option and test, once available on npm because unknown options crash the Compressor, see also 
          // commit: https://github.com/mishoo/UglifyJS2/commit/ef2ef07cbd945c7a6456adedc413858145a9ed10
          // Issue : https://github.com/mishoo/UglifyJS2/issues/188
          ast = ast.transform( ugly.Compressor( { warnings: options.warnings /*, keep_fargs: options.keep_fargs*/ } ) );
          
          // Mangle
          ast.figure_out_scope();
          ast.compute_char_frequency();
          ast.mangle_names();
          
          // Output
          
          // ToDo: add support for input source maps using a method such as
          // https://github.com/edc/mapcat or when UglifyJS2 fixes this
          //
          // UglifyJS issues:
          //   - https://github.com/substack/node-browserify/issues/395
          //   - https://github.com/mishoo/UglifyJS2/issues/145
          //   - https://github.com/mishoo/UglifyJS2/issues/151
          // Another, perhaps better, option would be to develop a mapcat() pipelet use as a preprocessor to uglify()
          // because uglify can use a single input source map.
          // Note that mapcat does not supprot currenlty the mixing of compiled and non-compiled sources:
          //   - https://github.com/edc/mapcat/issues/6
                    
          var map = ugly.SourceMap( { file: name } );
          
          var code = ugly.OutputStream( { source_map: map } );
          
          ast.print( code );
          
          // Replaced @ by # out of concern for IE issues with conditional statements
          // Check uglify issue: https://github.com/mishoo/UglifyJS2/issues/310
          // Also check: https://code.google.com/p/dart/issues/detail?id=11195
          code = code.toString() + '\n/*\n//# sourceMappingURL=/' + source_map + '\n*/',
            
          map = map.toString();
          
          var minified_length = code.length;
          
          de&&ug( 'uglify(), name: '  + name
            + ', source length: '     + source_length
            + ', minified length: '   + minified_length
            + ' (' + Math.round( 100 * ( minified_length / source_length ) ) + '%)'
            + ', source map length: ' + map.length
            + ' (' + Math.round( 100 * ( map.length / source_length ) ) + '%)'
            + ', filepaths: ' + log.s( filepaths )
            //+ ', source map content: ' + map.substr( 0, 100 ) + ' ...'
          );
        } else {
          de&&ug( 'uglify(), no content for name: ' + name );
        }
        
        var previous = that.uglified;
        
        // ToDo: use transaction
        if ( previous ) {
          Set.prototype._remove.call( that, previous, { more: source_length != 0 } );
          
          that.uglified = u;
        }
        
        if ( ast ) {
          Set.prototype._add.call( that, that.uglified = [
            { path: name      , content: code },
            { path: source_map, content: map , mime_type: 'application/json' }
          ] );
        }
      } catch( e ) {
        de&&ug( "uglify(), error: " + e );
        
        // ToDo: in production, trigger an alarm
        
        return;
      }
    } );
    
    return this;
  }, // uglify()
  
  _add: function( files, options ) {
    Set.prototype._add.call( this, files, options );
    
    if ( options && options.more ) return this;
    
    return this.uglify();
  }, // _add()
  
  _remove: function( files, options ) {
    Set.prototype._remove.call( this, files, options );
    
    if ( options && options.more ) return this;
    
    return this.uglify();
  } // _remove()
} ); // Uglify instance methods

/* --------------------------------------------------------------------------
   module exports
*/
eval( XS.export_code( 'XS', [ 'Uglify' ] ) );

de&&ug( "module loaded" );
