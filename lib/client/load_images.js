/*  load_images.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
undefine()( 'load_images', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS      = rs.RS
    , extend  = RS.extend
    , Set     = RS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = de && RS.log.bind( null, 'load_images' );
  
  /* -------------------------------------------------------------------------------------------
     load_images( options )  ToDo: change name to throttled_image_load() or other more descriptive name
     
     Load images in the DOM, throttled, one by one, or loading_max by loading_max at a time.
     
     Options:
       - node_id (String): DOM node id of the div where images are loaded, default is 'rs_load_images'
       - display (String): images style display, default is 'none'
       - loading_max (Integer): maximum number of images loading simultaneously, default is 1
     
     Forced options:
       - key (Array of Strings): forced to [ 'path' ]
     
     image object:
       uri : image source
  */
  function Load_Images( options ) {
    // Set default options, force key to 'path'
    options = extend( { // Default options, set if not defined
        node_id    : 'rs_load_images',
        display    : 'none',
        loading_max: 1
      },
      
      options,
      
      // Forced options, overiding existing options
      { key: [ 'path' ] }
    );
    
    Set.call( this, [], options );
    
    this._loading_count = 0;
    this._loading_max   = options.loading_max;
    this._next_images_parameters = [];
    
    return this._set_node();
  } // Load_Images()
  
  var Set_proto        = Set.prototype
    , Set_add_value    = Set_proto._add_value
    , Set_remove_value = Set_proto._remove_value
  ;
  
  /* -------------------------------------------------------------------------------------------
     .load_images( options )
  */
  Set.Build( 'load_images', Load_Images, {
    _set_node: function() {
      var options = this._options
        , node_id = options.node_id
      ;
      
      var $node = document.getElementById( node_id );
      
      if( ! $node ) {
        var body = document.body;
        
        // create images container if it does not exist
        $node = document.createElement( 'div' );
        
        $node.id = node_id;
        
        $node.style.display = options.display;
        
        // insert the container at the beginning of body 
        document.body.insertBefore( $node, body.childNodes[ 0 ] );
      }
      
      this._$node = $node;
      
      return this;
    }, // _set_node()
    
    _get_image_from_uri: function( uri ) {
      var image;
      
      for(image = this._$node.childNodes[ 0 ]
        ; image && image.getAttribute( 'rs_uri' ) != uri
        ; image = image.nextSibling
      );
      
      return image;
    }, // _get_image_from_uri()
    
    _load_next_image: function() {
      var parameters;
      
      while ( this._loading_count < this._loading_max
        &&  ( parameters = this._next_images_parameters.shift() )
      ) {
        this._load_image.apply( this, parameters );
      }
      
      return this;
    }, // _load_next_image()
    
    _add_value: function( transaction, value ) {
      if ( this._loading_count >= this._loading_max ) {
        de&&ug( '_add_value(): throttle image' ); 
        
        this._next_images_parameters.push( [ transaction, value ] );
      } else {
        this._load_image( transaction, value );
      }
      
      return this;
    }, // _add_value()
    
    _load_image: function( transaction, value ) {
      de&&ug( '_load_next_image():', value );
      
      var that  = this
        , $node = this._$node
      ;
      
      that._loading_count += 1;
      
      if( value.uri ) {
        // Find out if image is already loaded or loading
        var image = this._get_image_from_uri( value.uri );
        
        if ( image ) {
          // ToDo: add test for image already loaded
          var previous_onload = image.onload;
          
          image.onload = onload;
          
          that._load_next_image();
        } else {
          image = this._create_new_image( value.uri );
          
          image.onerror = onerror;
          image.onload  = onload;
          
          $node.appendChild( image );
        }
      } else {
        de&&ug( 'image uri is not defined, image id:', value.id );
        
        onerror()
      }
      
      return;
      
      function onerror() {
        that._loading_count -= 1;
        
        if ( image ) {
          de&&ug( 'image failed to load, image id:', value.id );
          
          $node.removeChild( image );
        }
        
        transaction.emit_nothing();
        
        that._load_next_image();
      }
      
      function onload( e ) {
        that._loading_count -= 1;
        
        previous_onload && previous_onload( e );
        
        de&&ug( 'image:', value );
        
        image.setAttribute( 'loaded', 1 );
        
        Set_add_value.call( that, transaction, extend( { $dom_node: image.cloneNode() }, value ), true ); // true: emit_now
        
        previous_onload || that._load_next_image();
      }
    }, // _load_image()
    
    _create_new_image: function( uri ) {
      de&&ug( '_create_new_image(), uri:', uri );
      
      var image = document.createElement( 'img' );
      
      image.setAttribute( 'rs_uri', image.src = uri );
      
      return image;
    }, // _create_new_image()
    
    _remove_value: function( transaction, value ) {
      var image = this._get_image_from_uri( value.uri );
      
      if ( image ) {
        var loaded = image.getAttribute( 'loaded' );
        
        de&&ug( '_remove_value(), loaded_count:', loaded );
        
        if ( loaded ) {
          Set_remove_value.call( this, transaction, extend( { $dom_node: image.cloneNode() }, value ), true );
        } else {
          // ToDo: Add test for remove while image is loading
          // this image was loading, can therefore load one more image
          // will call this._load_next_image() after removing image div bellow
          transaction.emit_nothing();
        }
        
        // ToDo: should we really remove the image from the DOM? This is just a cache.
        // Unless this is used by a derived class to actually manage another DOM element
        // There is at least one legitimate use: to abort loading an image which has not yet fully loaded
        // But does this prevent the trigerring of onload() and onerror() events on the image?
        // If it does, the count for the add transaction would never reach zero, preventing the completion
        // of the transaction
        this._$node.removeChild( image );
        
        loaded || this._load_next_image();
      } else {
        transaction.emit_nothing();
      }
      
      return this;
    } // _remove_value()
  } ); // Load_Images instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Load_Images': Load_Images } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // load_images.js
