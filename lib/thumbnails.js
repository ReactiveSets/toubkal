/*  thumbnails.js
    
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

( function( exports ) {
  var XS, EI;
  
  if ( typeof require === 'function' ) {
    XS = require( './pipelet.js' ).XS;
    
    require( './code.js'    );
    
    EI = require( 'easyimage' );
  } else {
    XS = exports.XS;
    EI = exports.easyimage;
  }
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , extend_2   = XS.extend_2
    , Code       = XS.Code
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
    return Set.call( this, options ).process_options();
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
  Set.build( 'thumbnails', Thumbnails, {
    process_options: function() {
      var options = this.options = extend_2( { width: 250, height: 250, x: 0, y: 0 }, this.options )
        , width   = options.width
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
    }, // set_path()
    
    fix_filename: function( filename ) {
      var base = this.base;
      
      switch( filename.charAt( 0 ) ) {
        case '~':
          filename = process.env[ win32 ? 'USERPROFILE' : 'HOME' ] + filename.substr( 1 );
        break;
        
        case '/':
        break;
        
        default:
          if ( win32 && filename.indexOf( ':' ) !== -1 ) break;
          
          filename = base + filename;
      }
      
      return filename;
    }, // fix_filename()
    
    get_thumbnail_name: function( name ) {
      return this.path
        + name.substring( name.lastIndexOf( '/' ) + 1, name.lastIndexOf( '.' ) )
        + this.suffix
        + '.'
        + name.substring( name.lastIndexOf( '.' ) + 1 )
      ;
    },
    
    add: function( added, options ) {
      var l = added.length;
      
      if( ! l ) return this;
      
      de&&ug( 'add(), l = ' + l );
      
      var that   = this
        , width  = this.width , height = this.height
        , crop_x = this.crop_x, crop_y = this.crop_y
        , options_more
      ;
      
      if ( l > 1 ) {
        // There will be a transaction
        
        // Add transaction id and more flag
        options_more = more( options );
        
        // Add transaction id for last add
        options = no_more( options_more );
      }
      
      for( var i = -1, count = l; ++i < l; ) {
        var image = extend_2( {}, added[ i ] );
        
        ( function( image ) {
          var image_name     = that.fix_filename( image.name )
            , thumbnail_name = that.get_thumbnail_name( image_name )
            , image_id       = image.id
          ;
          
          var t = {
              src: image_name
            , dst: that.fix_filename( thumbnail_name )
            , x: crop_x, y: crop_y
            , width: width, height: height
          };
          
          thumbnail( t, create_thumbnail );
          
          return;
          
          function create_thumbnail( e, thumbnail ) {
            if( e ) return error( e );
            
            de&&ug( 'thumbnail created: ' + log.s( thumbnail ) );
            
            // ToDo: shouldn't we forward the entire image value? 
            Set.prototype.add.call( that, [ { id: image_id, name: thumbnail_name } ], --count ? options_more : options );
          } // create_thumbnail()
          
          function error( e ) {
            de&&ug( 'Unable to create thumbnail ' +  log.s( t ) + ', error: ' + e );
            
            --count || Set.prototype.add.call( that, [], options );
          } // error()
        } )( image );
      } // for()
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;

      if( ! l ) return this;

      de&&ug( 'remove(), l = ' + l );
      
      var thumbnails = [], i = l;
      
      while( i-- ) {
        var value = removed[ i ]
          , name  = this.get_thumbnail_name( value.name )
        ;
        
        thumbnails.unshift( { id: value.id, name: name } );
      } // while()
      
      Set.prototype.remove.call( this, thumbnails, options );
      
      return this;
    } // remove()
  } ); // Thumbnails instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Thumbnails' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // thumbnails.js
