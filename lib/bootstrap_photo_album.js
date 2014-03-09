/*  bootstrap_photo_album.js

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
    
    , extend       = XS.extend_2
    
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
  Pipelet.Compose( 'bootstrap_photo_album', function( source, photos_matrix_node, carousel_node, options ) {
    var query           = options.query
      , album           = options.album_name || 'bootstrap_photo_album'
      , carousel_events = xs.pass_through() // tmp pipelet for graph loop
      , thumbnails_events, _carousel
      
      , carousel_options = extend( { input_events: thumbnails_events }, options.carousel_options )
    ;
    
    // set flow options
    options.images_flow              || ( options.images_flow              = album + '_images'     );
    options.thumbnails_flow          || ( options.thumbnails_flow          = album + '_thumbnails' );
    
    // set event names
    options.photo_matrix_events_name || ( options.photo_matrix_events_name = album + '_select'     );
    options.carousel_events_name     || ( options.carousel_events_name     = album + '_carousel'   );
    
    // filter
    if( query ) {
      thumbnails_events = source.filter( query.alter( { flow: options.thumbnails_flow } ), { name: 'thumbnails_filter' } );
      _carousel         = source.filter( query.alter( { flow: options.images_flow     } ), { name: 'carousel_filter' } );
    } else {
      thumbnails_events = source.flow( options.thumbnails_flow );
      _carousel         = source.flow( options.images_flow     );
    }
    
    return thumbnails_events = thumbnails_events
      // .to_uri()
      .trace( 'thumbnails after filter' )
      .order( [ { id: 'id' } ] )
      .load_images()
      // .trace( 'thumbnails after load images' )
      .bootstrap_photos_matrix( photos_matrix_node, { input_events: carousel_events } )
      .events_metadata( { name: options.photo_matrix_events_name } )
    ;
    
    _carousel
      //.to_uri()
      .trace( 'images after filter' )
      .order( [ { id: 'id' } ] )
      //.load_images()
      //.trace( 'images after load images' )
      .bootstrap_carousel( carousel_node, carousel_options )
      ._add_destination( carousel_events )
      .union( [ thumbnails_events ] )
    ;
  } );
  
  /* -------------------------------------------------------------------------------------------
     Bootstrap_Photos_Matrix()
  */
  function Bootstrap_Photos_Matrix( photos_matrix_node, options ) {
    Load_Images.call( this, options );
    
    this._style = extend( { image: 'img-responsive img-thumbnail' }, options.style );
    
    this._set_photos_matrix_node( photos_matrix_node );
    /*
    if( options.input_events ) {
      options.input_events._on( 'add', function( values, options ) {
        de&&ug( "Bootstrap_Photos_Matrix input_event: " + log.s( values ) );
        
        this.set_selected_photo( values[ 0 ].current_index || 0 );
        
      }, this );
    }
    */
    return this;
  } // Bootstrap_Photos_Matrix()
  
  Load_Images.Build( 'bootstrap_photos_matrix', Bootstrap_Photos_Matrix, {
    _set_photos_matrix_node: function( photos_matrix_node ) {
      var that = this;
      
      if( XS.is_DOM( photos_matrix_node ) ) {
        // add css class for custom style
        add_class( photos_matrix_node, 'xs-photo-matrix' );
        
        // add event listner
        photos_matrix_node.onclick = onclick;
        
        this._$photos_matrix_node = photos_matrix_node;
      } else {
        throw( 'the node is not a DOM element' );
      }
      
      return this;
      
      function onclick( e ) {
        if( e.target.nodeName !== 'IMG' ) return;
        
        var index = $( e.target.parentNode ).index()
          , image = that.a[ index ]
        ;
        
        that.__emit_add( [ { image_id: image.id, current_index: index } ] );
      }
    }, // set_photos_matrix_node()
    
    _set_selected_photo: function( index ) {
      var $containers = this._$photos_matrix_node.childNodes;
      
      if( ! containers.length ) return this;
      
      // remove previous selection
      for( var i = $containers.length; i; ) remove_class( $containers[ --i ].firstChild, 'active' );
      
      add_class( $containers[ index ].firstChild, 'active' );
      
      return this;
    }, // set_selected_photo()
    
    _add_value: function( transaction, value ) {
      var uri = value.uri;
      
      if( ! uri ) {
        de&&ug( '_add_value(), missing attribute uri' );
        
        transaction.emit_nothing();
        
        return this;
      }
      
      // ToDo: not sur if it's necessary
      // test if value is already added
      if( this.index_of( { id: value.id } ) !== -1 ) {
        de&&ug( '_add_value(), value already added, value: ' + log.s( value ) );
        
        return this;
      }
      
      de&&ug( '_add_value(), value: ' + log.s( value ) );
      
      Set.prototype._add_value.call( this, transaction, value, true ); // emit now
      
      var $container = document.createElement( 'div' )
        , $image     = this._get_image_from_uri( uri ) // || this._create_new_image( uri )
      ;
      
      $image = $image ? $image.cloneNode() : this._create_new_image( uri );
      
      add_class( $image, this._style.image );
      
      // ToDo: implement thumbnail metadata : [ title, auto, date, description ]
      
      $container               .appendChild(   $image   );
      this._$photos_matrix_node.appendChild( $container );
      
      return this;
    }, // _add_value()
    
    _remove_value: function( transaction, value ) {
      // ToDo: add tests for remove
      
      var $photos_matrix_node = this._$photos_matrix_node
        , $container          = $photos_matrix_node.childNodes[ 0 ]
      ;
      
      for( $container = $photos_matrix_node.childNodes[ 0 ]
        ; $container.getElementsByTagName( 'img' )[ 0 ] && $container.getElementsByTagName( 'img' )[ 0 ].getAttribute( 'xs_uri' ) !== value.uri
        ; $container = $container.nextSibling
      );
      
      if( $container ) {
        de&&ug( '_remove_value(), value: ' + log.s( value ) );
        
        Set.prototype._remove_value.call( this, transaction, value );
        
        $photos_matrix_node.removeChild( $container );
      } else {
        transaction.emit_nothing();
      }
      
      return this;
    } // _remove_value()
  } ); // Bootstrap_Photos_Matrix() instance methods
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Bootstrap_Photos_Matrix' ] ) );
  
  de&&ug( 'module loaded' );
} )( this ); // bootstrap_photo_album.js