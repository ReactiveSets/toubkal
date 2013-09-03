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
  */
  Set.build( 'thumbnails', Thumbnails, {
    process_options: function( options ) {
      this.options = options = extend( { width: 250, height: 250, x: 0, y: 0, suffix: '-thumbnail' }, options );
      
      var path = options.path || '';
      
      if( path === '' ) throw( 'path is not defined !!' );
      
      this.path   = path;
      this.width  = options.width;
      this.height = options.height;
      this.crop_x = options.x;
      this.crop_y = options.y;
      this.suffix = options.suffix;
      
      return this;
    }, // set_path()
    
    get_thumbnail_name: function( objects, i ) {
      var src  = objects[ i ].name
        , name = src.substring( src.lastIndexOf( '/' ) + 1, src.lastIndexOf( '.' ) )
        , ext  = src.substring( src.lastIndexOf( '.' ) + 1, src.length             )
      ;
      
      return this.path + name + this.suffix + '.' + ext;
    },
    
    add: function( added, options ) {
      var l = added.length;
      
      if( ! l ) return this;
      
      de&&ug( 'add(), l = ' + l );
      
      var that   = this
        , path   = this.path
        , width  = this.width , height = this.height
        , crop_x = this.crop_x, crop_y = this.crop_y
      ;
      
      for( var i = l; i; ) {
        var image = added[ --i ]
          , src   = image.name
          , dst   = this.get_thumbnail_name( added, i )
        ;
        
        // continue if the thumbnail is already created
        if( this.index_of( { name : dst } ) !== -1 ) continue;
        
        thumbnail( {
            src   : src   , dst   : dst   ,
            x     : crop_x, y     : crop_y,
            width : width , height: height
          }, function( e, thumbnail ) {
            if( e ) {
              de&&ug( 'thumbnail creation failed, ' + e );
            } else {
              de&&ug( 'thumbnail created: ' + log.s( thumbnail ) );
              
              Set.prototype.add.call( that, [ { name: path + thumbnail.name } ], options );
            }
          }
        );
      } // for()
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;

      if( ! l ) return this;

      de&&ug( 'remove(), l = ' + l );
      
      var thumbnails = [], i = l;
      
      while( i-- ) {
        var name = this.get_thumbnail_name( removed, i );
        
        thumbnails.unshift( { name: name } );
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
