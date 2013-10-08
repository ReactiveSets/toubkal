/*  uglify.js
    
    Minify javascript content using uglifyjs
    
    ----
    
    Copyright (C) 2013, Connected Sets

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
  Set.call( this, options );
  
  if ( location === u || location.length === 0 ) throw new Error( 'uglify(), undefined or empty location' );
  
  this.location = location;
  this.source_map = location + '.map';
  
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
Set.build( 'uglify', Uglify, {
  uglify: function() {
    var that = this;
    
    // Fetch files from source to get the files in order if these are ordered
    // this is because the order of assets is most of the time relevant
    this._fetch_source_all( function( files ) {
      try {
        // ToDo: find last modified file time to add to stat info for generated content
        for ( var i = -1, l = files.length, content, filenames = [], ast, source_length = 0; ++i < l; ) {
          var file = files[ i ];
          
          if ( content = file.content ) {
            filenames.push( file.name );
            
            source_length += content.length;
            
            ast = ugly.parse( content, { filename: file.uri || ( '/' + file.name ), toplevel: ast } );
          }
        }
        
        var name = that.location, source_map = that.source_map;
        
        if ( ast ) {
          // Compress
          ast.figure_out_scope();
          ast = ast.transform( ugly.Compressor( { warnings: that.options.warnings } ) );
          
          // Mangle
          ast.figure_out_scope();
          ast.compute_char_frequency();
          ast.mangle_names();
          
          // Output                        
          var map = ugly.SourceMap( { file: name } );
          
          var code = ugly.OutputStream( { source_map: map } );
          
          ast.print( code );
          
          // ToDo: Check uglify issue: https://github.com/mishoo/UglifyJS2/issues/310
          // Also check: https://code.google.com/p/dart/issues/detail?id=11195
          code = code.toString() + '\n/*\n//@ sourceMappingURL=/' + source_map + '\n*/',
            
          map = map.toString();
          
          var minified_length = code.length;
          
          de&&ug( 'uglify(), name: '  + name
            + ', source length: '     + source_length
            + ', minified length: '   + minified_length
            + ' (' + Math.round( 100 * ( minified_length / source_length ) ) + '%)'
            + ', source map length: ' + map.length
            + ' (' + Math.round( 100 * ( map.length / source_length ) ) + '%)'
            + ', filenames: ' + log.s( filenames )
            //+ ', source map content: ' + map.substr( 0, 100 ) + ' ...'
          );
        } else {
          de&&ug( 'uglify(), no content for name: ' + name );
        }
        
        var previous = that.uglified;
        
        if ( previous ) {
          Set.prototype.remove.call( that, previous, { more: source_length != 0 } );
          
          that.uglified = u;
        }
        
        if ( ast ) {
          Set.prototype.add.call( that, that.uglified = [
            { name: name      , content: code },
            { name: source_map, content: map , mime_type: 'application/json' }
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
  
  add: function( files ) {
    Set.prototype.add.call( this, files );
    
    return this.uglify();
  }, // add()
  
  remove: function( files ) {
    Set.prototype.remove.call( this, files );
    
    return this.uglify();
  }, // remove()
  
  update: function( updates ) {
    Set.prototype.update.call( this, updates );
    
    return this.uglify();
  } // update()
} ); // Uglify instance methods

/* --------------------------------------------------------------------------
   module exports
*/
eval( XS.export_code( 'XS', [ 'Uglify' ] ) );

de&&ug( "module loaded" );
