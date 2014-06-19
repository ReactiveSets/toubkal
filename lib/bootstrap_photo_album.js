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
    , Query        = XS.Query
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
    var query            = options.query
      , album            = options.album_name || 'bootstrap_photo_album'
      , order_id         = options.order_id   || [ { id: 'id' } ]
      , _carousel_events = xs.pass_through() // tmp pipelet for graph loop
      , thumbnails_events, carousel_events, _carousel
    ;
    
    options = extend( { play: true, download: false, auto_start: false }, options );
    
    // set flow options
    options.images_flow              || ( options.images_flow              = album + '_images'     );
    options.thumbnails_flow          || ( options.thumbnails_flow          = album + '_thumbnails' );
    
    // set event names
    options.photo_matrix_events_name || ( options.photo_matrix_events_name = album + '_select'     );
    options.carousel_events_name     || ( options.carousel_events_name     = album + '_carousel'   );
    
    // filter
    if( query ) {
      thumbnails_events = source.filter( query.alter( { flow: options.thumbnails_flow } ), { name: 'thumbnails_filter' } );
      _carousel         = source.filter( query.alter( { flow: options.images_flow     } ), { name: 'carousel_filter'   } );
    } else {
      thumbnails_events = source.flow( options.thumbnails_flow );
      _carousel         = source.flow( options.images_flow     );
    }
    
    thumbnails_events = thumbnails_events
      
      .order( order_id )
      
      .load_images()
      
      .bootstrap_photos_matrix( photos_matrix_node, extend( { input_events: _carousel_events }, options ) )
      
      .events_metadata( { name: options.photo_matrix_events_name } )
    ;
    
    carousel_events = _carousel
      
      .order( order_id )
      
      .load_images()
      
      .bootstrap_carousel( carousel_node, extend( { input_events: thumbnails_events }, options ) )
      
      .events_metadata( { name: options.carousel_events_name } )
    ;
    
    carousel_events._output._add_destination( _carousel_events._input )
    
    return xs.union( [ carousel_events, thumbnails_events ] );
    
    // ToDo: return input_output object
  } );
  
  /* -------------------------------------------------------------------------------------------
     Bootstrap_Photos_Matrix()
  */
  function Bootstrap_Photos_Matrix( photos_matrix_node, options ) {
    options = Load_Images.call( this, options )._options;
    
    // global options for css classes
    this._css_classes = extend( { images: 'img-responsive img-thumbnail' }, options.css_classes );
    
    this._thumbnails_count = 0;
    
    this._set_photos_matrix_node( photos_matrix_node );
    
    this._input_events_port;
    
    var that = this;
    
    if ( options.input_events ) {
      var p = this._input_events_port = new Pipelet( { name: options.name + '_input_events' } )
        , input = p._input
      ;
      
      p._add = select_image;
      
      input.query = Query.pass_all;
      
      p._add_source( options.input_events );
    }
    
    return this;
    
    function select_image( values ) {
      var value = values[ 0 ];
      
      if( ! value ) return;

      de&&ug( 'input events, value: ' + log.s( value ) );

      that._set_selected_photo( value.index || 0 );
    } // select_image()
  } // Bootstrap_Photos_Matrix()
  
  Load_Images.Build( 'bootstrap_photos_matrix', Bootstrap_Photos_Matrix, {
    _set_photos_matrix_node: function( photos_matrix_node ) {
      if( ! XS.is_DOM( photos_matrix_node ) ) {
        throw( 'the node is not a DOM element' );

        return this;
      }
      
      var that = this;
      
      // add css class for custom style
      add_class( photos_matrix_node, 'xs-photo-matrix' );
      
      // add event listner
      photos_matrix_node.onclick = onclick;
      
      this._$photos_matrix_node = photos_matrix_node;
      
      return this;
      
      function onclick( e ) {
        if( e.target.nodeName !== 'IMG' ) return;
        
        var index = $( $( e.target ).parents()[ 1 ] ).index();
        
        that.__emit_add( [ extend( { index: index }, that.a[ index ] ) ] );
        
        that._set_selected_photo( index );
      }
    }, // set_photos_matrix_node()
    
    _set_selected_photo: function( index ) {
      var $containers = this._$photos_matrix_node.childNodes;
      
      if( ! $containers.length ) return this;
      
      // remove previous selection
      for( var i = $containers.length; i; ) remove_class( $containers[ --i ], 'active' );
      
      $containers[ index ] && add_class( $containers[ index ], 'active' );
      
      return this;
    }, // set_selected_photo()
    
    _add_value: function( transaction, value ) {
      var uri = value.uri, max_thumbnails = this._options.max_thumbnails;
      
      if( ! uri ) {
        de&&ug( '_add_value(), missing attribute uri' );
        
        transaction.emit_nothing();
        
        return this;
      }
      
      if( max_thumbnails && ++this._thumbnails_count > max_thumbnails ) return this;
      
      de&&ug( '_add_value(), value: ' + log.s( value ) );
      
      Set.prototype._add_value.call( this, transaction, value, true ); // emit now
      
      var $container  = document.createElement( 'div' )
        , $image      = this._get_image_from_uri( uri )
        , title       = value.title
        , description = value.description
        
        , css_classes        = this._css_classes
        , images_classes     = css_classes.images
        , containers_classes = css_classes.containers || ""
      ;
      
      images_classes     += ' ' + ( value.css_classes && value.css_classes.images     || '' );
      containers_classes += ' ' + ( value.css_classes && value.css_classes.containers || '' );
      
      $image = $image ? $image.cloneNode() : this._create_new_image( uri );
      
      add_class( $image    , images_classes     );
      add_class( $container, containers_classes );
      
      // ToDo: implement thumbnail metadata : [ title, auto, date, description ]
      
      var $div = document.createElement( 'div' );
      
      $div.appendChild( $image );
      
      $container.appendChild( $div );
      
      if( title ) {
        var $title = document.createElement( 'div' );
        
        $title.innerHTML = title;
        
        add_class( $title, 'item-title' );
        
        $container.appendChild( $title );
      }
      
      if( description ) {
        var $description = document.createElement( 'p' );
        
        $description.innerHTML = description;
        
        add_class( $description, 'item-description' );
        
        $container.appendChild( $description );
      }
      
      this._$photos_matrix_node.appendChild( $container );
      
      return this;
    }, // _add_value()
    
    _remove_value: function( transaction, value ) {
      // ToDo: add tests for remove
      
      // ToDo: when option max_thumbnails is setuped, replace the removed value(s)
      
      var $photos_matrix_node = this._$photos_matrix_node, $container, $image;
      
      for( $container = $photos_matrix_node.childNodes[ 0 ]
        ; ( $image = $container.getElementsByTagName( 'img' )[ 0 ] ) && $image.getAttribute( 'xs_uri' ) !== value.uri
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