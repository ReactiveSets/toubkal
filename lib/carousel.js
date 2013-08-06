/*  carousel.js
    
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
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Code       = XS.Code
    , Pipelet    = XS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs carousel, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     .carousel( dom_node, options )
  */
  
  XS.Compose( 'carousel',
    function( source, dom_node, options ) {
      var carousel = source.carousel_process( dom_node, options )
        , carousel_inner_dom = dom_node.getElementsByTagName( 'div' )[ 0 ]
      ;
      
      options = extend( { image_style: 'item' }, options );
      
      return carousel
        .load_images   ( carousel_inner_dom, options )
        .trace         (       'Loaded images'       )
        .carousel_inner( carousel_inner_dom, options )
        .trace         (       'Carousel out'       )
      ;
    }
  );
  
  /* -------------------------------------------------------------------------------------------
     .carousel_Process( dom_node, options )
  */
  
  function Carousel_Process( dom_node, options ) {
    Pipelet.call( this, options );
    
    this
      .process_options( options  )
      .set_node       ( dom_node )
    ;
    
    return this;
  } // Carousel_Process()
  
  Pipelet.build( 'carousel_process', Carousel_Process, {
    set_node: function( dom_node, options ) {
      if( XS.is_DOM( dom_node ) ) {
        var carousel_inner       = document.createElement( 'div' )
          , carousel_css_style = 'carousel'
          , options              = this.options
        ;
        
        carousel_css_style += ' ' + options.transition;
        
        XS.add_class( dom_node      , carousel_css_style );
        XS.add_class( carousel_inner, 'carousel-inner'   );
        
        dom_node.appendChild( carousel_inner );
        
        // carousel controls
        if( options.controls ) {
          var left  = document.createElement( 'a' )
            , right = document.createElement( 'a' )
          ;
          
          XS.add_class( left , 'carousel-control left'  );
          XS.add_class( right, 'carousel-control right' );
          
          left .innerHTML = '&lsaquo;';
          right.innerHTML = '&rsaquo;';
          
          left .setAttribute( 'data-slide', 'prev' );
          right.setAttribute( 'data-slide', 'next' );
          
          left.href = right.href = '#' + dom_node.id;
          
          dom_node.appendChild( left  );
          dom_node.appendChild( right );
        }
      } else {
        throw( "node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    process_options: function( options ) {
      this.options = options = extend( { transition: 'slide', indicators: true, controls: true, image_style: 'item' }, options );
      
      return this;
    } // process_options
  } ); // Carousel_Process instance methods
  
  /* -------------------------------------------------------------------------------------------
     .carousel_Inner( dom_node, options )
  */
  
  function Carousel_Inner( dom_node, options ) {
    Pipelet.call( this, options );
    
    this.set_node( dom_node );
    
    return this;
  } // Carousel_Inner()
  
  Pipelet.build( 'carousel_inner', Carousel_Inner, {
    set_node: function( dom_node, options ) {
      if( XS.is_DOM( dom_node ) ) {
        this.node = dom_node;
      } else {
        throw( "node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( l === 0 ) return this;
      
      var node  = this.node
        , items = node.childNodes
        , len   = items.length
      ;
      
      for( var i = len; i; ) {
        var item = items[ --i ], image_id = item.getAttribute( 'image_id' );
        
        for( var j = l; j; ) {
          if( added[ --j ].id == image_id ) {
            var carousel_caption = document.createElement   ( 'div' )
              , title            = item.getElementsByTagName(  'h3' )[ 0 ]
              , description      = item.getElementsByTagName(  'p'  )[ 0 ]
            ;
            
            XS.add_class( carousel_caption, 'carousel-caption' );
            
            item.appendChild( carousel_caption );
            
            carousel_caption.appendChild(    title    );
            carousel_caption.appendChild( description );
          }
        }
      }
      
      XS.add_class( items[ 0 ], 'active' );
      
      this.emit_add( added, options );
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      this.emit_remove( removed, options );
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      this.emit_update( updates, options );
      
      return this;
    } // update()
  } ); // Carousel_Inner instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Carousel_Process', 'Carousel_Inner' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // carousel.js
