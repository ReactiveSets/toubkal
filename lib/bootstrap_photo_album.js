/*  bootstrap_photo_album.js

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
  
  var xs           = XS.xs
    , log          = XS.log
    , extend       = XS.extend
    , Code         = XS.Code
    , Pipelet      = XS.Pipelet
    , Set          = XS.Set
    , Selector     = XS.Selector
    , Load_Images  = XS.Load_Images
    
    , add_class    = XS.add_class
    , remove_class = XS.remove_class
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs bootstrap photo album, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Bootstrap_Photo_Album()
  */
  XS.Compose( 'bootstrap_photo_album', function( source, photos_matrix_node, carousel_node, options ) {
    // Set flow options
    var album = options.album_name;
    
    if ( album ) {
      options.thumbnails_flow          || ( options.thumbnails_flow         = album + '_thumbnails' );
      options.images_flow              || ( options.images_flow             = album + '_images'     );
      
      options.photo_matrix_events_name || ( options.photo_matrix_events_name = album + '_select'     );
      options.carousel_events_name     || ( options.carousel_events_name     = album + '_carousel'   );
    } else {
      options.thumbnails_flow          || ( options.thumbnails_flow         = 'images_thumbnails'   );
      options.images_flow              || ( options.images_flow             = 'images'              );
      
      options.photo_matrix_events_name || ( options.photo_matrix_events_name = 'photo_matrix_select' );
      options.carousel_events_name     || ( options.carousel_events_name     = 'carousel'            );
    }
    
    // photo album graph
    var carousel_events = xs.pass_through(); // tmp pipelet for graph loop
    
    var thumbnails_events = source
      .flow( options.thumbnails_flow )
      .order( [ { id: 'id' } ] )
      .load_images()
      .bootstrap_photos_matrix( photos_matrix_node, { input_events: carousel_events } )
      .events_metadata( { name: options.photo_matrix_events_name } )
    ;
    
    return source
      .flow( options.images_flow )
      .order( [ { id: 'id' } ] )
      .load_images()
      .bootstrap_carousel( carousel_node, extend( { input_events: thumbnails_events }, options.carousel_options ) )
      .events_metadata( { name: options.carousel_events_name } )
      .plug( carousel_events )
      .union( [ thumbnails_events ] )
    ;
  } );
  
  /* -------------------------------------------------------------------------------------------
     Bootstrap_Photos_Matrix()
  */
  function Bootstrap_Photos_Matrix( photos_matrix_node, options ) {
    Load_Images.call( this, options );
    
    this.set_photos_matrix_node( photos_matrix_node );
    
    if( options.input_events ) {
      options.input_events.on( 'add', function( values, options ) {
        de&&ug( "Bootstrap_Photos_Matrix input_event: " + log.s( values ) );
        
        this.set_selected_photo( values[ 0 ].current_index || 0 );
        
      }, this );
    }
    
    return this;
  } // Bootstrap_Photos_Matrix()
  
  Load_Images.build( 'bootstrap_photos_matrix', Bootstrap_Photos_Matrix, {
    set_photos_matrix_node: function( photos_matrix_node ) {
      var that = this;
      
      if( XS.is_DOM( photos_matrix_node ) ) {
        // add css class for custom style
        add_class( photos_matrix_node, 'xs-photo-matrix' );
        
        // add event listner
        photos_matrix_node.onclick = click_handler;
        
        this.photos_matrix_node = photos_matrix_node;
      } else {
        throw( 'the node is not a DOM element' );
      }
      
      return this;
      
      function click_handler( e ) {
        if( e.target.nodeName !== 'IMG' ) return;
        
        var index = $( e.target.parentNode ).index()
          , image = that.a[ index ]
        ;
        
        that.emit_add( [ { image_id: image.id, current_index: index } ] );
      }
    }, // set_photos_matrix_node()
    
    set_selected_photo: function( index ) {
      var containers = this.photos_matrix_node.childNodes;
      
      if( ! containers.length ) return this;
      
      // remove previous selection
      for( var i = containers.length; i; ) remove_class( containers[ --i ].firstChild, 'active' );
      
      add_class( containers[ index ].firstChild, 'active' );
      
      return this;
    }, // set_selected_photo()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( ! l ) return this;
      
      Set.prototype.add.call( this, added, options );
      
      var loaded_images_node = this.preloaded_images
        , photos_matrix_node = this.photos_matrix_node
        , emited_objects     = []
      ;
      
      for( var i = l; i; ) {
        var object    = added[ --i ]
          , image_uri = object.uri
          , container = document.createElement( 'div' )
          , image     = this.get_loaded_image( image_uri )
        ;
        
        // provide option for bootstrap css class
        // add_class( container, 'provided_classes' )
        
        if( ! image ) {
          image     = document.createElement( 'img' );
          image.src = image_uri;
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
          if( removed[ --i ].uri !== image.uri ) continue;
          
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
          var u    = updates[ --i ]
            , u0   = u[ 0 ]
            , u1   = u[ 1 ]
            , uri0 = u[ 0 ].uri
            , uri1 = u[ 1 ].uri
          ;
          
          if( uri0 !== image.uri ) continue;
          
          if( uri0 !== uri1 ) {
            var new_image = this.get_loaded_image( uri1 );
            
            if( ! new_image ) {
              new_image     = document.createElement( 'img' );
              new_image.src = uri1
            }
            add_class( new_image, 'img-responsive img-thumbnail' );
            
            container.replaceChild( new_image, image );
          }
        } // for()
        
        container = container.nextSibling;
      } // while()
      
      return this;
    } // update()
  } ); // Bootstrap_Photos_Matrix() instance methods
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Bootstrap_Photos_Matrix' ] ) );
  
  de&&ug( 'module loaded' );
} )( this ); // bootstrap_photo_album.js