/*  thumbnails.js
    
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

( function( exports ) {
  var XS, EI;
  
  if ( typeof require === 'function' ) {
    XS = require( '../pipelet.js' ).XS;
    
    EI = require( 'easyimage' );
  } else {
    XS = exports.XS;
    EI = exports.easyimage;
  }
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , extend_2   = XS.extend_2
    , Set        = XS.Set
    , more       = XS.more
    , no_more    = XS.no_more
    , thumbnail  = EI.thumbnail
    , info       = EI.info
    
    , win32      = ( process.platform == 'win32' )
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs thumbnails, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Thumbnails( options )
  */
  function Thumbnails( options ) {
    options = Set.call( this, [], options )._options;
    
    this._options = options = extend_2( { width: 250, height: 250, x: 0, y: 0 }, options );
    
    var width   = options.width
      , height  = options.height
      , suffix  = options.suffix || ( options.suffix = '-' + width + 'x' + height )
      , path    = options.path
      , base    = options.base_directory
    ;
    
    if( ! path ) throw( 'path is not defined !!' );
    
    if ( base ) {
      base += '/';
    } else {
      base = './';
    }
    
    this.base   = base;
    this.path   = path;
    
    this.width  = width;
    this.height = height;
    
    this.crop_x = options.x;
    this.crop_y = options.y;
    
    this.suffix = suffix;
    
    return this;
  } // Thumbnails()
  
  /* -------------------------------------------------------------------------------------------
     thumbnails( options )
     
     A pipelet to create thumbnails form a dataset of images.
     
     Parameters:
       - options:
         - path          : (string) path to the generated thumbnail, if it does not exist, an
                           error will be thrown.
                           
                          ToDo: path should be really optional or become a parameter of the
                          pipelet.
         
         - base_directory: (string) absolute base directory, typically provided using __dirname
          
         - width         : (int) width of the resized image, default 250px
         - height        : (int) height of the resized image, default 250px
         
         - x             : (int) x offset for cropping, defaults to 0
         - y             : (int) y offset for cropping, defaults to 0
         
         - suffix        : (string) thumbnail suffix, default is '-<width>x<height>',
                           e.g. '-250x250'
  */
  Set.Build( 'thumbnails', Thumbnails, {
    _get_thumbnail_path: function( path ) {
      return this.path
        + path.substring( path.lastIndexOf( '/' ) + 1, path.lastIndexOf( '.' ) )
        + this.suffix
        + '.'
        + path.substring( path.lastIndexOf( '.' ) + 1 )
      ;
    }, // _get_thumbnail_path()
    
    _add_value: function( transaction, image ) {
      var that   = this
        , width  = this.width , height = this.height
        , crop_x = this.crop_x, crop_y = this.crop_y
        
        , image_path     = fix_filepath( image.path )
        , thumbnail_path = this._get_thumbnail_path( image_path )
      ;
      
      de&&ug( '_add_value(), image path: ' + image_path );
      
      var t = {
          src   : image_path
        , dst   : fix_filepath( thumbnail_path )
        , x     : this.crop_x
        , y     : this.crop_y
        , width : this.width
        , height: this.height
      };
      
      thumbnail( t, create_thumbnail );
      
      return this;
      
      function fix_filepath( filepath ) {
        var base = that.base;
        
        switch( filepath.charAt( 0 ) ) {
          case '~':
            filepath = process.env[ win32 ? 'USERPROFILE' : 'HOME' ] + filepath.substr( 1 );
          break;
          
          case '/':
          break;
          
          default:
            if ( win32 && filepath.indexOf( ':' ) !== -1 ) break;
            
            filepath = base + filepath;
        }
        
        return filepath;
      } // fix_filepath()
      
      function create_thumbnail( e, thumbnail ) {
        if( e ) return error( e );
        
        de&&ug( 'thumbnail created: ' + log.s( thumbnail ) );
        
        Set.prototype._add_value.call( that, transaction, extend( {}, image, { path: thumbnail_path } ), /* emit_now */ true );
      } // create_thumbnail()
      
      function error( e ) {
        de&&ug( 'Unable to create thumbnail ' +  log.s( t ) + ', error: ' + e );
        
        transaction.emit_nothing();
      } // error()
    }, // _add_value()
    
    _remove_value: function( t, image ) {
      var image_path  = this._get_thumbnail_path( image.path );
      
      de&&ug( '_remove_value(), image path: ' + image_path );
      
      // If removing images while thumbnail is created, the set's anti-state will take care of the problem
      return Set.prototype._remove_value.call( this, t, { id: image.id, path: image_path } );
    } // _remove_value()
  } ); // Thumbnails instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Thumbnails' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // thumbnails.js
