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
    , Code       = XS.Code
    , Set        = XS.Set
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
    Set.call( this, options );
    
    return this.process_options( options );
  } // Thumbnails()
  
  /* -------------------------------------------------------------------------------------------
     .thumbnails( options )
     
     A pipelet to create thumbnails form a dataset of images uri.
     
     Parameters:
       - options:
           
           path  : path to the generated thumbnail, if it's not exist, an error will be thrown
           width : width of resized image, default 250px
           height: height of resized image, default 250px
           x     : x offset for cropping, defaults to 0
           y     : y offset for cropping, defaults to 0
           suffix: thumbnail suffix
           
  */
  Set.build( 'thumbnails', Thumbnails, {
    process_options: function( options ) {
      // default options
      var width  = options.width  || 250
        , height = options.height || 250
        , suffix = options.suffix || '-' + width + 'x' + height
      ;
      
      this.options = options = extend( { width: width, height: height, x: 0, y: 0, suffix: suffix }, options );
      
      var path = options.path || ''
        , base = this.options.base_directory
      ;
      
      if( path === '' ) throw( 'path is not defined !!' );
      
      if ( base ) {
        base += '/';
      } else {
        base = './';
      }
      
      this.base   = base;
      this.path   = path;
      this.width  = options.width;
      this.height = options.height;
      this.crop_x = options.x;
      this.crop_y = options.y;
      this.suffix = options.suffix;
      
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
      
      var that   = this       , base   = this.base
        , width  = this.width , height = this.height
        , crop_x = this.crop_x, crop_y = this.crop_y
      ;
      
      for( var i = -1; ++i < l; ) {
        var image = extend( {}, added[ i ] );
        
        ( function( image ) {
          var image_name     = that.fix_filename( image.name )
            , thumbnail_name = that.get_thumbnail_name( image_name )
            , image_id       = image.id
          ;
          
          if( that.index_of( { id : image_id } ) !== -1 ) return;
          
          thumbnail( { src: image_name, dst: that.fix_filename( thumbnail_name ), x: crop_x, y: crop_y, width: width, height: height }, create_thumbnail );
          
          return;
          
          function create_thumbnail( e, thumbnail ) {
            if( e ) return error( e );
            
            de&&ug( 'thumbnail created: ' + log.s( thumbnail ) );
            
            Set.prototype.add.call( that, [ { id: image_id, name: thumbnail_name } ], options );
            
            // error()
            function error( e ) {
              de&&ug( 'Unable to create thumbnail, error ' + e )
            } // error()
            
          } // create_thumbnail()
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
    }, // remove()
    
    update: function( updates, options ) {
      var l = updates.length;
      
      if( ! l ) return this;
      
      de&&ug( 'update(), l = ' + l );
      
      for( var i = l; i; ) {
        var u        = updates[ --i ]
          , u0       = u[ 0 ]
          , u1       = u[ 1 ]
        ;
        
        this
          .remove( [ u0 ], options )
          .add   ( [ u1 ], options )
        ;
      } // for()
      
      return this;
    } // update()
  } ); // Thumbnails instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Thumbnails' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // thumbnails.js
