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

var ugly        = require( 'uglify-js' )
  , XS          = require( '../pipelet.js' ).XS
  , extend      = XS.extend
  , log         = XS.log
  , Transaction = XS.Transaction
  , Options     = XS.Options
  , Set         = XS.Set
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true;

function ug( m ) {
  log( "uglify, " + m );
} // ug()

/* -------------------------------------------------------------------------------------------
   uglify( location, options )
   
   Minifies source files, including source map, using U
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
    name       : location,
    keep_fargs : true // Keep function arguments which is the opposite of UglifyJS default
  }, options );
} // Uglify.default_options()

Set.Build( 'uglify', Uglify, function( Super ) { return {
  _uglify: function( options ) {
    if ( Options.has_more( options ) ) return this;
    
    var that = this, filepaths = [], source_length = 0, ast;
    
    // Fetch files from source to get the files in order if these are ordered
    // this is because the order of assets is most of the time relevant
    // Use __fetch_source instead of _fetch because files to uglify are from the source while
    // uglify() adds uglified and source map files.
    
    this._input.__fetch_source( function( files, no_more ) {
      try {
        for ( var i = -1, l = files.length; ++i < l; ) {
          var file = files[ i ], content = file.content;
          
          if ( content ) {
            filepaths.push( file.path );
            
            source_length += content.length;
            
            // ToDo: keep parsed ast for each file and re-parse only files which have changed
            ast = ugly.parse( content, { filename: file.uri || ( '/' + file.path ), toplevel: ast } );
          }
        }
        
        if ( ! no_more ) return;
        
        var name = that._location, source_map = that._source_map;
        
        if ( ast ) {
          // Compress
          ast.figure_out_scope();
          
          var _options = that._options;
          
          // ToDo: uncomment keep_fargs option and test, once available on npm because unknown options crash the Compressor, see also 
          // commit: https://github.com/mishoo/UglifyJS2/commit/ef2ef07cbd945c7a6456adedc413858145a9ed10
          // Issue : https://github.com/mishoo/UglifyJS2/issues/188
          ast = ast.transform( ugly.Compressor( { warnings: _options.warnings /*, keep_fargs: _options.keep_fargs*/ } ) );
          
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
        
        var previous = that._uglified
          , transaction = that._t
        ;
        
        if ( ast ) {
          that._uglified = [
            { path: name      , content: code },
            { path: source_map, content: map , mime_type: 'application/json' }
          ];
          
          if ( previous ) {
            transaction
              .add_operations( 1 )
              .__emit_remove( previous )
            ;
          }
          
          transaction.__emit_add( that._uglified );
        } else {
          that._uglified = null;
          
          if ( previous ) {
            transaction.__emit_remove( previous );
          } else {
            transaction.emit_nothing()
          }
        }
        
        transaction.end();
        
        // ToDo: remove the following assertion once automated test is provided
        if ( that._t ) throw new Error( '_uglify(): transaction has not ended' );
      } catch( e ) {
        de&&ug( "uglify(), error: " + e );
        
        // ToDo: in production, trigger an alarm
        
        return this;
      }
    } );
    
    return this;
  }, // _uglify()
  
  _get_transaction: function( options ) {
    // ToDo: allow simultaneous independent transactions, using this._transactions
    var t = this._t;
    
    if ( t ) return t.add_operations( 1 ).set_source_options( options );
    
    return this._t = new Transaction( 2, options )
      ._on( 'add'   , Super._add   , this )
      ._on( 'remove', Super._remove, this )
      ._on( 'ended', function() { this._t = null }, this )
    ;
  }, // _get_transaction()
  
  _add: function( files, options ) {
    this._get_transaction( options ).__emit_add( files );
    
    return this._uglify( options );
  }, // _add()
  
  _remove: function( files, options ) {
    this._get_transaction( options ).__emit_remove( files );
    
    return this._uglify( options );
  } // _remove()
} } ); // Uglify instance methods

/* --------------------------------------------------------------------------
   module exports
*/
XS.add_exports( {
  'Uglify': Uglify
} );

de&&ug( "module loaded" );
