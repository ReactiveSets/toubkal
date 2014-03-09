/*  bootstrap_carousel.js
    
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
  
  if ( typeof require === 'function' ) {
    XS = require( './pipelet.js' ).XS;
    
    require( './code.js'    );
  } else {
    XS = exports.XS;
  }
  
  var xs          = XS.xs
    , log         = XS.log
    , extend      = XS.extend
    , Code        = XS.Code
    , Pipelet     = XS.Pipelet
    , Set         = XS.Set
    , Load_Images = XS.Load_Images
    
    , has_class    = XS.has_class
    , add_class    = XS.add_class
    , remove_class = XS.remove_class
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs bootstrap carousel, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Bootstrap_Carousel( dom_node, options )
  */
  function Bootstrap_Carousel( bootstrap_carousel_node, options ) {
    Load_Images.call( this, options );
    
    return this
      ._process_options             (         options        )
      ._set_bootstrap_carousel_nodes( bootstrap_carousel_node )
      //._set_events_handlers()
    ;
  } // Bootstrap_Carousel()
  
  /* -------------------------------------------------------------------------------------------
     .bootstrap_carousel( dom_node, options )
  */
  Load_Images.Build( 'bootstrap_carousel', Bootstrap_Carousel, {
    _process_options: function( options ) {
      var default_options = {
          transition: 'slide'
        , interval  : 6000
        , pause     : 'hover'
        , cycle     : true
        , indicators: false
        , controls  : true
        , play      : false
        , download  : false
      };
      
      this.options = options = extend( default_options, options );
      
      // Bootstrap Carousel plugin options
      this._carousel_options = {
          interval  : options.interval
        , pause     : options.pause
        , wrap      : options.cycle
      };
      
      this._initialize_first_item = true;
      this._start_carousel        = true;
      this._is_device             = ( /iPhone|iPad|Android/i ).test( navigator.userAgent ); // for Smartfones and tablets
      
      /*
      if( options.input_events ) {
        options.input_events._on( 'add', function( values, options ) {
          $( this.bootstrap_carousel ).carousel( values[ 0 ].current_index );
        }, this );
      }
      */
      return this;
    }, // process_options
    
    _set_bootstrap_carousel_nodes: function( dom_node ) {
      if( ! XS.is_DOM( dom_node ) ) {
        throw( "node is not a DOM element" );
        
        return this;
      }
      
      var that    = this
        , options = this.options
        , $inner  = document.createElement( 'div' )
      ;
      
      add_class( dom_node , 'carousel ' + options.transition );
      add_class( $inner   , 'carousel-inner'                 );
      
      // ToDo: add carousel indicators
      
      dom_node.appendChild( $inner );
      
      // carousel controls
      if( options.controls && ! this._is_device ) dom_node.appendChild( make_carousel_controls() );
      
      this._$carousel = dom_node;
      this._$inner    = $inner;
      
      return this;
      
      function make_carousel_controls() {
        var $controls = document.createElement( 'div' )
          , $left     = document.createElement(  'a'  )
          , $right    = document.createElement(  'a'  )
          , $play     = document.createElement(  'a'  )
          , $download = document.createElement(  'a'  )
        ;
        
        add_class( $controls, 'carousel-controls' );
        
        // carousel navigation
        add_class( $left , 'carousel-control left'  );
        add_class( $right, 'carousel-control right' );
        
        $left .setAttribute( 'data-slide', 'prev' );
        $right.setAttribute( 'data-slide', 'next' );
        
        $left .innerHTML = '<span class="glyphicon glyphicon-chevron-left" ></span>';
        $right.innerHTML = '<span class="glyphicon glyphicon-chevron-right"></span>';
        
        $left.href = $right.href = '#' + dom_node.id;
        
        $controls.appendChild( $left );
        
        // carousel play / pause
        if( options.play ) {
          add_class( $play, 'carousel-control play' );
          
          $play.innerHTML = '<span class="glyphicon glyphicon-play"></span>';
          
          $controls.appendChild( $play );
        }
        
        // append navigation right control
        $controls.appendChild( $right );
        
        // carousel image download
        if( options.download ) {
          add_class( $download, 'carousel-control download' );
          
          $download.innerHTML = '<span class="glyphicon glyphicon-save"></span>';
          
          $controls.appendChild( $download );
        }
        
        return that._$controls = $controls;
      }
    }, // _set_bootstrap_carousel_node()
    /*
    _set_events_handlers: function() {
      var that      = this
        , carousel  = this.bootstrap_carousel
        , _inner    = this.carousel_inner
        , _controls = this.carousel_controls
        , timer     = null, display_controls = false
      ;
      
      Hammer( carousel ).on( 'drag', function( e ) {
        switch( e.gesture.direction ) {
          case 'left' : $( carousel ).carousel( 'next' );
          case 'right': $( carousel ).carousel( 'prev' );
        }
        
        e.gesture.stopDetect();
      } );
      
      if( ( /iPhone|iPad|Android/i ).test( navigator.userAgent ) ) return this;
      
      $( carousel )
        .click     ( click )
        
        .mousemove (   mousemove   )
        .mouseleave( hide_controls )
      ;
      
      $( _controls )
        .mouseenter( function() { display_controls = true;  } )
        .mouseleave( function() { display_controls = false; } )
      ;
      
      // keyboard left and right navigation
      $( exports ).keyup( keyup );
      
      return this;
      
      // event handler on keyup
      function keyup( e ) {
        var key_code  = e.keyCode
          , index     = $( '.active', carousel ).index()
          , len       = $( '.item', carousel ).length
          , direction = ''
        ;
        
        
        switch( key_code ) {
          case 37: // left arrow
            index     = index === 0 ? len - 1 : index - 1;
            direction = 'left';
          break;
          
          case 39: // right arrow
            index     = index === len - 1 ? 0 : index + 1;
            direction = 'right';
          break;
          
          default: return;
        }
        
        if( that.options.input_events ) {
          var image = that.a[ index ];
          
          that.__emit_add( [ { image_id: image.id, direction: direction, current_index: index } ] );
        } else {
          $( carousel ).carousel( index );
        }
      }
      
      // event handler on click
      function click( e ) {
        var $this   = $( this )
          , $target = $( e.target )
        ;
        
        if( $target.hasClass( 'icon-play' ) ) {
          de&&ug( 'set_events_handlers()..click -> play' );
          
          $this.carousel( 'cycle' );
          
          $target
            .addClass   ( 'icon-pause' )
            .removeClass( 'icon-play'  )
          ;
          
          return;
        }
        
        if( $target.hasClass( 'icon-pause' ) ) {
          de&&ug( 'set_events_handlers()..click -> pause' );
          
          $this.carousel( 'pause' );
          
          $target
            .removeClass( 'icon-pause' )
            .addClass   ( 'icon-play'  )
          ;
          
          return;
        }
      }
      
      // event handler on mouse move
      function mousemove() {
        show_controls();
        
        if( ! display_controls ) timer = setTimeout( hide_controls, 1500 );
      } // mousemove()
      
      // show controls 
      function show_controls() {
        clearTimeout( timer );
        
        $( _controls ).fadeIn( 400 );
      } // show_controls()
      
      // hide controls
      function hide_controls() {
        $( _controls ).fadeOut( 1000 );
      } // hide_controls()
    }, // set_events_handlers()
    */
    _add_value: function( transaction, value ) {
      var uri = value.uri;
      
      if( ! uri ) {
        de&&ug( '_add_value(), missing attribute uri' );
        
        transaction.emit_nothing();
        
        return this;
      }
      
      // test if value is already added
      if( this.index_of( { id: value.id } ) !== -1 ) {
        de&&ug( '_add_value(), value already added, value: ' + log.s( value ) );
        
        return this;
      }
      
      de&&ug( '_add_value(), value: ' + log.s( value ) );
      
      Set.prototype._add_value.call( this, transaction, value, true ); // emit now
      
      var that   = this
        , $inner = this._$inner
        , $item  = document.createElement  ( 'div' )
        , $image = this._get_image_from_uri(  uri  )
      ;
      
      add_class( $item, 'item' );
      
      if( this._initialize_first_item ) {
        add_class( $item, 'active' );
        
        delete this._initialize_first_item;
      }
      
      $image = $image ? $image.cloneNode() : this._create_new_image( uri );
      
      $item.appendChild( $image );
      
      this._add_caption( value, $item );
      
      $inner.appendChild( $item );
      
      this._start_carousel && this._fetch_all( inistialize_carousel );
      
      return this;
      
      function inistialize_carousel( values ) {
        if( values.length < 2 ) return;
        
        de&&ug( '_inistialize_carousel(), options: ' + log.s( that._carousel_options ) );
        
        $( that._$carousel ).carousel( that._carousel_options );
        
        delete that._start_carousel;
      } // _inistialize_carousel()
    }, // _add_value()
    
    _remove_value: function( transaction, value ) {
      // ToDo: add tests for remove
      
      var $inner = this._$inner, $item, $image;
      
      for( $item = $inner.childNodes[ 0 ]
        ; ( $image = $item.getElementsByTagName( 'img' )[ 0 ] ) && $image.getAttribute( 'xs_uri' ) !== value.uri
        ; $item = $item.nextSibling
      );
      
      if( $item ) {
        de&&ug( '_remove_value(), value: ' + log.s( value ) );
        
        Set.prototype._remove_value.call( this, transaction, value );
        
        $inner.removeChild( $item );
      } else {
        transaction.emit_nothing();
      }
      
      return this;
    }, // _remove_value()
    
    _add_caption: function( value, $node ) {
      var title       = value.title
        , date        = value.date
        , author      = value.author
        , description = value.description
      ;
      
      if( ! title && ! date && ! author && ! description ) return this;
      
      var $caption = document.createElement( 'div' );
      
      title       && this._add_title      ( title      , $caption );
      date        && this._add_date       ( date       , $caption );
      author      && this._add_author     ( author     , $caption );
      description && this._add_description( description, $caption );
      
      $node.appendChild( $caption );
      
      // return this;
    }, // _add_caption
    
    _add_title: function( title, $node ) {
      var $title = document.createElement( 'h3' );
      
      $title.innerHTML = title;
      
      add_class( $title, 'item-title' );
      
      $node.appendChild( $title );
      
      return this;
    }, // _add_title()
    
    // add date
    _add_date: function( date, $node ) {
      var $date = document.createElement( 'div' );
      
      $date.innerHTML = date;
      
      add_class( $date, 'item-date' );
      
      $node.appendChild( $date );
      
      return this;
    }, // _add_date()
    
    _add_author: function( author, $node ) {
      var $author = document.createElement( 'div' );
      
      $author.innerHTML = author;
      
      add_class( $author, 'item-author' );
      
      $node.appendChild( $author );
      
      return this;
    }, // add_author()
    
    _add_description: function( description, $node ) {
      var $description = document.createElement( 'p' );
      
      $description.innerHTML = description;
      
      add_class( $description, 'item-author' );
      
      $node.appendChild( $description );
      
      return this;
    } // add_description()
  } ); // Bootstrap_Carousel instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Bootstrap_Carousel' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // bootstrap_carousel.js
