/*  thumbnails.js
    
    ----
    
    Copyright (C) 2013, 2014, Reactive Sets

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
  var rs         = require( '../pipelet.js' )
    , EI         = require(   'easyimage'   )
    , path       = require(      'path'     )
    , fs         = require(       'fs'      )
    
    , RS         = rs.RS
    
    , Pipelet    = RS.Pipelet
    , File_Set   = RS.File_Set
    
    , log        = RS.log
    , extend_2   = RS.extend_2
    
    , thumbnail  = EI.thumbnail
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "rs thumbnails, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Thumbnails( options )
     
     Creates thumbnails from a dataset of images path.
     
     The input is processed to add the directory path ( if defined ) where the thumbnails will be created,
     and make the thumbnail name.
     
     The thumbnail is created using method 'thumbnail' of the EasyImage NPM Module.
     
     Parameters:
       - options:
         - path          : (string) the directory path where the thumbnails will be created, if it's :
                            - not defined, it will be created in the source image current directory.
                            - not exist, the directory is automatically created. 
         
         - base_directory: (string) absolute base directory, typically provided using __dirname
         
         - width         : (int) width of the resized image, default 250px
         - height        : (int) height of the resized image, default 250px
         
         - x             : (int) x offset for cropping, defaults to 0
         - y             : (int) y offset for cropping, defaults to 0
         
         - suffix        : (string) thumbnail suffix, default is '-<width>x<height>',
                           e.g. '-250x250'
     
     Example :
     
       var images = rs
         
         .set( [ 
             { path: '/images/01.jpg' }
           , { path: '/images/02.jpg' }
           , { path: '/images/03.jpg' }
           , { path: '/images/04.jpg' }
           , { path: '/images/05.jpg' }
         ] )
       ;
       
       var thumbnails = images.thumbnails( { path: 'thumbnails/small/', width: 250, height: 180 } );
       
       which produced :
       
       [
           { path: '/images/thumbnails/small/01-250xheight.jpg' }
         , { path: '/images/thumbnails/small/02-250xheight.jpg' }
         , { path: '/images/thumbnails/small/03-250xheight.jpg' }
         , { path: '/images/thumbnails/small/04-250xheight.jpg' }
         , { path: '/images/thumbnails/small/05-250xheight.jpg' }
       ]
  */
  
  Pipelet.Compose( 'thumbnails', function( source, options ) {
    // set default options
    options = extend_2( { width: 250, height: 250, x: 0, y: 0 }, options );
    
    var images_source  = source
      , thumbnails_dir = options.path || ''
      
      // default options
      , width   = options.width
      , height  = options.height
      , suffix  = options.suffix || ( options.suffix = '-' + width + 'x' + height )
    ;
    
    return source
      
      // make thumbnails path
      .alter( function( file ) {
        var image_path = file.image_path = file.path  // image source path
          , extension  = path.extname( image_path )   // image extension
        ;
        
        file.path = path.normalize( path.dirname( image_path ) + '/' + thumbnails_dir + '/' )
          + path.basename( image_path, extension )
          + suffix + extension
        ;
      } )
      
      // create thumbnails directory
      .make_base_directories( options )
      
      // create thumbnails
      ._thumbnails( options )
    ;
  } ); // Pipelet.Compose()
  
  function _Thumbnails( options ) {
    File_Set.call( this, options );
    
    this._path   = options.path;
    this._width  = options.width;
    this._height = options.height;
    this._crop_x = options.x;
    this._crop_y = options.y;
    this._suffix = options.suffix;
    
    return this;
  } // _Thumbnails()
  
  /* -------------------------------------------------------------------------------------------
     _thumbnails( options )
  */
  File_Set.Build( '_thumbnails', _Thumbnails, function( Super ) { return {
    _add_value: function( transaction, file ) {
      var that   = this
        , width  = this._width , height = this._height
        , crop_x = this._crop_x, crop_y = this._crop_y
        
        , image_path     = this._get_path( file.image_path )
        , thumbnail_path = this._get_path( file.path       )
      ;
      
      de&&ug( '_add_value(), image path: ' + image_path + ', thumbnail path: ' + thumbnail_path );
      
      // easyimage.thumbnail() options
      var t = {
          src   : image_path
        , dst   : thumbnail_path
        , x     : crop_x
        , y     : crop_y
        , width : width
        , height: height
      };
      
      // create thumbnail if it doesn't exist, else emit_value()
      fs.exists( t.dst, ensure_thumbnail );
      
      return this;
      
      function ensure_thumbnail( exist ) {
        if( exist ) {
          // if it exists emit value
          de&&ug( '_add_value(), thumbnail already exist, path: ' + t.dst );
          
          emit_value( file );
        } else {
          // create thumbnail
          thumbnail( t, create_thumbnail );
        }
      } // ensure_thumbnail()
      
      function create_thumbnail( e, thumbnail ) {
        if( e ) return error( e );
        
        de&&ug( 'thumbnail created: ' + log.s( thumbnail ) );
        
        emit_value( file );
      } // create_thumbnail()
      
      function error( e ) {
        de&&ug( 'Unable to create thumbnail ' +  log.s( t ) + ', error: ' + e );
        
        transaction.emit_nothing();
      } // error()
      
      function emit_value( value ) {
        de&&ug( '_add_value(), emit_value(), value: ' + log.s( value ) );
        
        Super._add_value.call( that, transaction, value, /* emit_now */ true );
      } // emit_value()
    }, // _add_value()
    
    _remove_value: function( t, file ) {
      var that = this, thumbnail_path = this._get_path( file.path );
      
      de&&ug( '_remove_value(), path: ' + thumbnail_path );
      
      // If removing images while thumbnail is created, the set's anti-state will take care of the problem
      return Super._remove_value.call( this, t, file );
    } // _remove_value()
  } ; } ); // _Thumbnails instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  // RS.add_exports( { Thumbnails: Thumbnails } );
  
  de&&ug( "module loaded" );
} )( this ); // thumbnails.js
