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
    , Query       = XS.Query
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
      ._set_events_handlers()
    ;
  } // Bootstrap_Carousel()
  
  /* -------------------------------------------------------------------------------------------
     .bootstrap_carousel( dom_node, options )
  */
  Load_Images.Build( 'bootstrap_carousel', Bootstrap_Carousel, {
    _process_options: function( options ) {
      var default_options = {
          transition: 'slide'
        , interval  : 6000    // delay between automatically cycling
        , pause     : true    // prevent the cycling of the carousel on mouseenter and resumes the cycling of the carousel on mouseleave.
        , cycle     : true    // whether the carousel should cycle continuously or have hard stops
        , indicators: false   // add carousel indicators
        , controls  : true    // add controls menu
        , play      : false   // add button play / pause
        , download  : false   // add button download
        , auto_start: false    // prevent carousel from auto-cycling
      };
      
      this._options = options = extend( default_options, options );
      
      // Bootstrap Carousel plugin options
      this._carousel_options = {
          interval  : options.auto_start ? options.interval : 0
        , pause     : options.pause
        , wrap      : options.cycle
      };
      
      this._start_carousel = true;
      this._is_device      = ( /iPhone|iPad|Android/i ).test( navigator.userAgent ); // for Smartphones and tablets
      
      return this;
    }, // process_options
    
    _set_bootstrap_carousel_nodes: function( dom_node ) {
      if( ! XS.is_DOM( dom_node ) ) {
        throw( "node is not a DOM element" );
        
        return this;
      }
      
      var that       = this
        , options    = this._options
        , $inner     = document.createElement( 'div' )
        , auto_start = options.auto_start
      ;
      
      add_class( dom_node , 'carousel ' + options.transition + ( auto_start ? ' play' : ' pause' ) );
      
      auto_start || dom_node.setAttribute( 'data-interval', 0 );
      
      add_class( $inner, 'carousel-inner' );
      
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
          add_class( $play, 'carousel-control play_pause' );
          
          // ToDo: test auto start carousel
          $play.innerHTML = '<span class="glyphicon glyphicon-' + ( auto_start ? 'pause' : 'play' ) + '"></span>';
          
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
    
    _set_events_handlers: function() {
      var that         = this
        , options      = this._options
        , input_events = options.input_events
        , $carousel    = $( this._$carousel )
        , $inner       = $( this._$inner    )
        , $controls    = $( this._$controls )
        , $exports     = $(     exports     )
      ;
      
      if( this._is_device ) {
        Hammer( this._$carousel )
          .on( 'drag', function( e ) {
            switch( e.gesture.direction ) {
              case 'left' : $carousel.carousel( 'next' );
              case 'right': $carousel.carousel( 'prev' );
            }
            
            e.gesture.stopDetect();
          } )
          .on( 'tap', function(e ) {
            carousel_play_pause();
            
            e.gesture.stopDetect();
          } )
        ;
      } else {
        $controls.click( carousel_play_pause );
        $exports .keyup(        keyup        );
      }
      
      $carousel.on( 'slide.bs.carousel', slide )
      
      input_events && input_events._on( 'add', function( values ) { move_to( values[ 0 ].index ) }, this );
      
      return this;
      
      function move_to( index ) {
        $carousel.carousel( index );
      }
      
      function slide( e ) {
        var index = $( e.relatedTarget || e.fromElement ).index()
          , image = that.a[ index ]
        ;
        
        that.__emit_add( [ extend( { index: index }, that.a[ index ] ) ] );
      }
      
      function keyup( e ) {
        var index     = $( '.active', $carousel ).index()
          , l         = $( '.item'  , $carousel ).length
          , direction = ''
        ;
        
        switch( e.keyCode ) {
          case 32: // space bar
            carousel_play_pause( e );
          break;
          
          case 37: // left arrow
            index     = index === 0 ? l - 1 : index - 1;
            direction = 'left';
          break;
          
          case 39: // right arrow
            index     = index === l - 1 ? 0 : index + 1;
            direction = 'right';
          break;
          
          default: return;
        }
        
        move_to( index );
      } // keyup()
      
      function carousel_play_pause( e ) {
        if( e.type === 'click' && ! $( e.target ).parent().hasClass( 'play_pause' ) ) return;
        
        var $target = $( '.glyphicon-play, .glyphicon-pause', $controls );
        
             if( $carousel.hasClass( 'play'  ) ) _pause( $target );
        else if( $carousel.hasClass( 'pause' ) )  _play( $target );
      } // carousel_play_pause()
      
      function _play( $target ) {
        de&&ug( 'carousel play' );
        
        $target  .removeClass( 'glyphicon-play' ).addClass( 'glyphicon-pause' );
        $carousel.removeClass(     'pause'      ).addClass(       'play'      );
        
        $carousel.carousel( 'cycle' );
        
        return;
      } // _play()
      
      function _pause( $target ) {
        de&&ug( 'carousel pause' );
        
        $target.removeClass( 'glyphicon-pause' ).addClass( 'glyphicon-play'  );
        $carousel.removeClass(      'play'     ).addClass(      'pause'      );
        
        $carousel.carousel( 'pause' );
        
        return;
      } // _pause()
    }, // _set_events_handlers()
    
    _add_value: function( transaction, value ) {
      var uri = value.uri;
      
      if( ! uri ) {
        de&&ug( '_add_value(), missing attribute uri' );
        
        transaction.emit_nothing();
        
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
      
      $inner.childNodes.length ||add_class( $item, 'active' );
      
      $image = $image ? $image.cloneNode() : this._create_new_image( uri );
      
      $item.appendChild( $image );
      
      this._add_caption( value, $item );
      
      $inner.appendChild( $item );
      
      this._start_carousel && this._fetch_all( inistialize_carousel );
      
      return this;
      
      function inistialize_carousel( values ) {
        if( values.length < 2 ) return;
        
        var $carousel = that._$carousel;
        
        de&&ug( '_inistialize_carousel(), options: ' + log.s( that._carousel_options ) + ', auto_start: ' + that._options.auto_start );
        
        $( $carousel ).carousel( that._carousel_options );
        
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
        , city        = value.city
        , description = value.description
      ;
      
      if( ! title && ! date && ! city && ! description ) return this;
      
      var $caption = document.createElement( 'div' );
      
      add_class( $caption, 'carousel-caption' );
      
      title       && this._add_title      ( title      , $caption );
      date        && this._add_date       ( date       , $caption );
      city        && this._add_city       ( city       , $caption );
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
    
    _add_city: function( city, $node ) {
      var $city = document.createElement( 'div' );
      
      $city.innerHTML = city;
      
      add_class( $city, 'item-city' );
      
      $node.appendChild( $city );
      
      return this;
    }, // add_city()
    
    _add_description: function( description, $node ) {
      var $description = document.createElement( 'p' );
      
      $description.innerHTML = description;
      
      add_class( $description, 'item-description' );
      
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