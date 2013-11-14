/*  bootstrap_carousel.js
    
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
      .process_options             (         options        )
      .set_bootstrap_carousel_nodes( bootstrap_carousel_node )
      .set_events_handlers()
    ;
  } // Bootstrap_Carousel()
  
  /* -------------------------------------------------------------------------------------------
     .bootstrap_carousel( dom_node, options )
  */
  Load_Images.build( 'bootstrap_carousel', Bootstrap_Carousel, {
    process_options: function( options ) {
      var default_options = {
          transition: 'slide'
        , indicators: false
        , interval  : 5000
        , pause     : 'hover'
        , controls  : true
      };
      
      this.options = options = extend( default_options, options );
      
      if( options.input_events ) {
        options.input_events.on( 'add', function( values, options ) {
          $( this.bootstrap_carousel ).carousel( values[ 0 ].current_index );
        }, this );
      }
      
      return this;
    }, // process_options
    
    set_bootstrap_carousel_nodes: function( dom_node ) {
      if( XS.is_DOM( dom_node ) ) {
        var carousel_inner     = document.createElement( 'div' )
          , carousel_css_style = 'carousel'
          , options            = this.options
        ;
        
        carousel_css_style += ' ' + options.transition;
        
        // ToDo: add carousel indicators
        // carousel indicators
        if( options.indicators ) {}
        
        add_class( dom_node      , carousel_css_style );
        add_class( carousel_inner, 'carousel-inner'   );
        
        dom_node.appendChild( carousel_inner );
        
        // carousel controls
        if( options.controls ) {
          var controls      = options.controls
            , controls_node = document.createElement( 'div' )
            , left_node     = document.createElement(  'a'  )
            , right_node    = document.createElement(  'a'  )
          ;
          
          // controls container
          // controls_node.style.display = 'none'
          add_class( controls_node, 'carousel-controls' );
          
          // controls next and previous
          add_class( left_node , 'carousel-control left'  );
          add_class( right_node, 'carousel-control right' );
          
          left_node .innerHTML = '<span class="icon-prev"></span>';
          right_node.innerHTML = '<span class="icon-next"></span>';
          
          left_node .setAttribute( 'data-slide', 'prev' );
          right_node.setAttribute( 'data-slide', 'next' );
          
          left_node.href = right_node.href = '#' + dom_node.id;
          
          controls_node.insertBefore( left_node , controls_node.childNodes[ 0 ] || null );
          controls_node.insertBefore( right_node, controls_node.childNodes[ 1 ] || null );
          
          // control pause / play
          if( controls.play ) {
            var play_node = document.createElement( 'a' );
            
            add_class( play_node, 'carousel-control' );
            
            play_node.innerHTML = '<span class="icon-pause"></span>';
            
            controls_node.insertBefore( play_node, controls_node.childNodes[ 1 ] || null );
          }
          
          // control photo matrix
          if( controls.play ) {
            var matrix_node = document.createElement( 'a' );
            
            add_class( matrix_node, 'carousel-control' );
            
            matrix_node.innerHTML = '<span class="icon-matrix"></span>';
            
            controls_node.insertBefore( matrix_node, controls_node.childNodes[ 0 ] || null );
          }
          
          // control download
          if( controls.download ) {
            var download_node = document.createElement( 'a' );
            
            add_class( download_node, 'carousel-control' );
            
            download_node.innerHTML = '<span class="icon-download"></span>';
            
            controls_node.appendChild( download_node  );
          }
          
          dom_node.appendChild( controls_node );
        }
        
        this.bootstrap_carousel = dom_node;
        this.carousel_inner     = carousel_inner;
        this.carousel_controls  = controls_node;
      } else {
        throw( "node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    set_events_handlers: function() {
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
        .click( click )
        
        .mousemove (   mousemove   )
        .mouseleave( hide_controls )
      ;
      
      $( _controls )
        .mouseenter( function() { display_controls = true;  } )
        .mouseleave( function() { display_controls = false; } )
      ;
      
      return this;
      
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
    
    add: function( added, options ) {
      var l = added.length, that = this;
      
      if( l === 0 ) return this;
      
      Set.prototype.add.call( this, added, options );
      
      var preloaded          = this.preloaded_images
        , bootstrap_carousel = this.bootstrap_carousel
        , carousel_inner     = this.carousel_inner
      ;
      
      for( var i = -1; ++i < l; ) {
        var value       = added[ i ]
          , item        = document.createElement( 'div' )
          , image       = this._get_image_from_uri( value.uri )
          , caption     = document.createElement( 'div' )
          , title       = document.createElement( 'h3'  )
          , description = document.createElement( 'p'   )
        ;
        
        add_class( item   , 'item'             );
        add_class( caption, 'carousel-caption' );
        
        if( ! this.init_item ) {
          add_class( item, 'active' );
          
          this.init_item = true;
        }
        
        if( ! image ) {
          image = document.createElement( 'img' );
          
          image.src = value.uri;
        }
        
        item.appendChild( image );
        
        if( value.title ) {
          title.innerHTML = value.title;
          
          caption.appendChild( title );
        }
        
        if( value.description ) {
          description.innerHTML = value.description;
          
          caption.appendChild( description );
        }
        
        item.appendChild( caption );
        
        carousel_inner.appendChild( item );
      }
      
      if( ! this.init_carousel ) this.fetch_all( start_carousel );
      
      return this;
      
      function start_carousel( values ) {
        if( values.length >= 2 ) {
          $( bootstrap_carousel ).carousel( that.options );
          
          $( bootstrap_carousel ).on( 'slide.bs.carousel', function ( e ) {
            var index = $( e.relatedTarget || e.fromElement ).index()
              , image = that.a[ index ]
            ;
            
            that.emit_add( [ { image_id: image.id, direction: e.direction, current_index: index } ] );
          } );
          
          that.init_carousel = true;
        } // if()
      } // start_carousel()
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;
      
      if( l === 0 ) return this;
      
      Set.prototype.remove.call( this, removed, options );
      
      var carousel_inner = this.carousel_inner;
      
      for( var i = l; i; ) {
        var uri = removed[ --i ].uri
          , item = carousel_inner.childNodes[ 0 ]
        ;
        
        while( item ) {
          if( item.getElementsByTagName( 'img' )[ 0 ].src === uri ) {
            carousel_inner.removeChild( item );
            
            break;
          }
          
          item = item.nextSibling;
        }
      }
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      var l = updates.length;
      
      if( l === 0 ) return this;
      
      Set.prototype.update.call( this, updates, options );
      
      var carousel_inner = this.carousel_inner
        , item           = carousel_inner.childNodes[ 0 ]
      ;
      
      for( var i = l; i; ) {
        var u  = updates[ --i ]
          , u0 = u[ 0 ]
          , u1 = u[ 1 ]
        ;
        
        while( item ) {
          // find the item to update
          if( item.getElementsByTagName( 'img' )[ 0 ].src === u0.uri ) {
            
            this
              .remove( [ u0 ], options )
              .add   ( [ u1 ], options )
            ;
            
            break;
          }
          
          item = item.nextSibling;
        } // end while loop
      } // end for loop
      
      return this;
    } // update()
  } ); // Bootstrap_Carousel instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Bootstrap_Carousel' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // bootstrap_carousel.js
