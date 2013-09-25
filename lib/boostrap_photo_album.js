/*  boostrap_photo_album.js

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
  var XS;
  
  if( typeof require === 'function' ) {
    XS = require( './xs.js' );
    
    require( './code.js'    );
    require( './pipelet.js' );
  } else {
    XS = exports.XS;
  }
  
  var xs = XS.xs
    , log         = XS.log
    , extend      = XS.extend
    , Code        = XS.Code
    , Pipelet     = XS.Pipelet
    , Selector    = XS.Selector
    , Load_Images = XS.Load_Images
    
    , add_class   = XS.add_class
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs form.js, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Boostrap_Photo_Album()
  */
  XS.Compose( 'boostrap_photo_album', function( source, photos_matrix_node, carousel_node, options ) {
    // Set model options
    var album = options.album_name;
    
    if ( album ) {
      options.thumbnails_model          || ( options.thumbnails_model          = album + '_thumbnails'       );
      options.images_model              || ( options.images_model              = album + '_images'           );
      
      options.photo_matrix_events_model || ( options.photo_matrix_events_model = album + '_select_event'     );
      options.carousel_events_model     || ( options.carousel_events_model     = album + '_carousel_event'   );
    } else {
      options.thumbnails_model          || ( options.thumbnails_model          = 'images_thumbnails'         );
      options.images_model              || ( options.images_model              = 'images'                    );
      
      options.photo_matrix_events_model || ( options.photo_matrix_events_model = 'photo_matrix_select_event' );
      options.carousel_events_model     || ( options.carousel_events_model     = 'carousel_event'            );
    }
    
    // photo album graph
    var carousel_events = xs.pipelet(); // tmp pipelet for graph loop
    
    var thumbnails_events = source
      .model( options.thumbnails_model )
      .load_images()
      .boostrap_photos_matrix( photos_matrix_node, {
        input_events: carousel_events,
        output_events_model: options.photo_matrix_events_model
      } )
    ;
    
    return source
      .model( options.images_model )
      .load_images()
      .boostrap_carousel( carousel_node, {
        input_events: thumbnails_events,
        output_events_model: options.carousel_events_model
      } )
      .plug( carousel_events )
    ;
  } );
  
  /* -------------------------------------------------------------------------------------------
     Boostrap_Photos_Matrix()
  */
  function Boostrap_Photos_Matrix( photos_matrix_node, options ) {
    Load_Images.call( this, options );
    
    return this.set_photos_matrix_node( photos_matrix_node );
  } // Boostrap_Photos_Matrix()
  
  Load_Images.build( 'boostrap_photos_matrix', Boostrap_Photos_Matrix, {
    set_photos_matrix_node: function( photos_matrix_node ) {
      var that = this;
      
      if( XS.is_DOM( photos_matrix_node ) ) {
        this.photos_matrix_node = photos_matrix_node;
        
        // add css class for custom style
        add_class( photos_matrix_node, 'xs-photo-matrix' );
        
        // add event listner
        photos_matrix_node.onclick = click_handler;
      } else {
        throw( 'the node is not a DOM element' );
      }
      
      return this;
      
      function click_handler( e ) {}
    }, // set_photos_matrix_node()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( ! l ) return this;
      
      Set.prototype.add.call( this, added, options );
      
      var loaded_images_node = this.preloaded_images
        , photos_matrix_node = this.photos_matrix_node
        , create_dom_element = document.createElement
        , get_loaded_image   = this.get_loaded_image
        , emited_objects     = []
      ;
      
      for( var i = l; i; ) {
        var object     = added[ --i ]
          , image_name = object.name
          , container  = create_dom_element(    'div'   )
          , image      = get_loaded_image  ( image_name )
        ;
        
        // provide option for bootstrap css class
        // add_class( container, 'provided_classes' )
        
        if( ! image ) {
          image     = create_dom_element( 'img' );
          image.src = image_name;
        }
        add_class( image, 'img-responsive img-thumbnail' );
        
        container         .appendChild ( image        );
        photos_matrix_node.insertBefore( container, 0 );
      } // for()
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;
      
      if( ! l ) return this;
      
      Set.prototype.remove.call( this, removed, options );
      
      var photos_matrix_node = this.photos_matrix_node
        , container          = photos_matrix_node.childNodes[ 0 ]
      ;
      
      while( container ) {
        var image = container.getElementsByTagName( 'img' )[ 0 ];
        
        for( var i = l; i; ) {
          if( removed[ --i ].name !== image.name ) continue;
          
          photos_matrix_node.removeChild( container );
        } // for()
        
        container = container.nextSibling;
      } // while()
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      var l = updates.length;
      
      if( l === 0 ) return this;
      
      Set.prototype.update.call( this, updates, options );
      
      var photos_matrix_node = this.photos_matrix_node
        , container          = photos_matrix_node.childNodes[ 0 ]
      ;
      
      while( container ) {
        var image = container.getElementsByTagName( 'img' )[ 0 ];
        
        for( var i = l; i; ) {
          var u     = updates[ --i ]
            , u0    = u[ 0 ]
            , u1    = u[ 1 ]
            , name0 = u[ 0 ].name
            , name1 = u[ 1 ].name
          ;
          
          if( name0 !== image.name ) continue;
          
          if( name0 !== name1 ) {
            var new_image = this.get_loaded_image( name1 );
            
            if( ! new_image ) {
              new_image     = document.createElement( 'img' );
              new_image.src = name1
            }
            add_class( new_image, 'img-responsive img-thumbnail' );
            
            container.replaceChild( new_image, image );
          }
        } // for()
        
        container = container.nextSibling;
      } // while()
      
      return this;
    } // update()
  } ); // Boostrap_Photos_Matrix() instance methods
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [] ) );
  
  de&&ug( 'module loaded' );
} )( this ); // boostrap_photo_album.js
/* 
use case :

  xs.socket_io_server()
    .boostrap_photo_album( "album_1_matrix", "album_1_carousel", { album: 'album_1' } )
  ;

*/