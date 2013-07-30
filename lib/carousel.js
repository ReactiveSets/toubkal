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
      return source
        .caoursel_process(    dom_node , options    )
        .trace           ( 'after Carousel Process' )
        .load_images     (    dom_node , options    )
        .trace           (      'Loaded images'     )
        .carousel_inner  (    dom_node , options    )
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
        var carousel_wrapper   = this.carousel_wrapper = document.createElement( 'div' )
          , carousel_css_style = 'carousel'
          , options            = this.options
        ;
        
        // carousel indicators
        if( options.indicators ) {
          // var indicators =  
        }
        
        // carousel controls
        if( options.controls ) {
          
        }
        
        carousel_css_style += ' ' + options.transition;
        
        XS.add_class( this.carousel_wrapper = carousel_wrapper, carousel_css_style   );
        XS.add_Class( this.carousel_inner   = dom_node        , carousel_css_classes );
        XS.wrap     ( carousel_wrapper                        , dom_node             );
      } else {
        throw( "node is not a DOM element" );
      }

      return this;
    }, // set_node()
    
    process_options: function( options ) {
      this.options = options = extend( { transition: 'slide', indicators: false, controls: true }, options );
      
      return this;
    } // process_options
    
  } ); // Carousel_Process instance methods
  
  /* -------------------------------------------------------------------------------------------
     .carousel_Inner( dom_node, options )
  */
  
  function Carousel_Inner( dom_node, options ) {
    Pipelet.call( this, options );
    
    return this;
  } // Carousel_Inner()
  
  Pipelet.build( 'carousel_inner', Carousel_Inner, {
    add: function( added, options ) {
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      
      return this;
    } // update()
  } ); // Carousel_Inner instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  //eval( XS.export_code( 'XS', [ 'Carousel' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // carousel.js
