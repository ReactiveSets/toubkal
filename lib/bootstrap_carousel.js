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
      .process_options            (         options        )
      .set_bootstrap_carousel_nodes( bootstrap_carousel_node )
    ;
  } // Bootstrap_Carousel()
  
  /* -------------------------------------------------------------------------------------------
     .bootstrap_carousel( dom_node, options )
  */
  Load_Images.build( 'bootstrap_carousel', Bootstrap_Carousel, {
    process_options: function( options ) {
      this.options = options = extend( { transition: 'slide', indicators: false, controls: true, interval: 5000 }, options );
      
      if( options.input_events ) {
        options.input_events.on_change( function( operation, values, options ) {
          $( this.bootstrap_carousel ).carousel( values[ 0 ].current_index );
        }, this );
      }
      
      return this;
    }, // process_options
    
    set_bootstrap_carousel_nodes: function( dom_node ) {
      // Load_Images.prototype.set_node.call( this );
      
      if( XS.is_DOM( dom_node ) ) {
        var carousel_inner     = document.createElement( 'div' )
          , carousel_css_style = 'carousel'
          , options            = this.options
        ;
        
        carousel_css_style += ' ' + options.transition;
        
        // ToDo: add carousel indicators
        // carousel indicators
        if( options.indicators ) {}
        
        XS.add_class( dom_node      , carousel_css_style );
        XS.add_class( carousel_inner, 'carousel-inner'   );
        
        dom_node.appendChild( carousel_inner );
        
        // carousel controls
        if( options.controls ) {
          var controls = document.createElement( 'div' )
            , left     = document.createElement(  'a'  )
            , right    = document.createElement(  'a'  )
          ;
          
          XS.add_class( controls, 'carousel-controls'      );
          XS.add_class( left    , 'carousel-control left'  );
          XS.add_class( right   , 'carousel-control right' );
          
          left .innerHTML = '&lsaquo;';
          right.innerHTML = '&rsaquo;';
          
          left .setAttribute( 'data-slide', 'prev' );
          right.setAttribute( 'data-slide', 'next' );
          
          left.href = right.href = '#' + dom_node.id;
          
          controls.appendChild( left  );
          controls.appendChild( right );
          
          dom_node.appendChild( controls );
        }
        
        this.bootstrap_carousel = dom_node;
        this.carousel_inner     = carousel_inner;
      } else {
        throw( "node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
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
          , image       = this.get_loaded_image ( value.uri )
          , caption     = document.createElement( 'div' )
          , title       = document.createElement( 'h3'  )
          , description = document.createElement( 'p'   )
        ;
        
        XS.add_class( item   , 'item'             );
        XS.add_class( caption, 'carousel-caption' );
        
        if( ! this.init_item ) {
          XS.add_class( item, 'active' );
          
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
          $( bootstrap_carousel ).carousel( { interval: that.options.interval } );
          
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
