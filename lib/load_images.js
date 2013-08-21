/*  load_images.js
    
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
    
    require( './code.js'     );
    require( './selector.js' );
  } else {
    XS = exports.XS;
  }
  
  var xs      = XS.xs
    , log     = XS.log
    , extend  = XS.extend
    , Code    = XS.Code
    , Pipelet = XS.Pipelet
    , Set     = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs load_images, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Load_Images( options )
     
     image object:
       id           : image ID
       src          : image source
       title*       : image title
       description* : image description
       style*       : custom css classes
       
       ( * ) : optional attributes
     
  */
  function Load_Images( options ) {
    Set.call( this, options );
    
    return this.set_node();
  } // Load_Images()
  
  /* -------------------------------------------------------------------------------------------
     .load_images( dom_node, options )
  */
  Set.build( 'load_images', Load_Images, {
    set_node: function() {
      var dom_node = document.getElementById( 'xs_preloaded_images' );
      
      if( ! dom_node ) {
        var body = document.body;
        
        dom_node = document.createElement( 'div' );
        
        dom_node.id = 'xs_preloaded_images';
        dom_node.style.display = 'none';
        
        document.body.insertBefore( dom_node, body.childNodes[ 0 ] );
      }
      
      this.preloaded_images = dom_node;
      
      return this;
    }, // set_node()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( l === 0 ) return this;
      
      var dom_node     = this.preloaded_images
        , options_more = XS.more( options )
        , that = this, i = -1
      ;
      
      load_image();
      
      return this;
      
      function load_image() {
        var value;
        
        if( ! ( value = added[ ++i ] ) ) {
          that.emit_add( [], options ); // no more
          
          return;
        }
        
        var image = document.createElement( 'img' );
        
        if( value.src ) {
          image.src = value.src;
        } else {
          de&&ug( 'image source is not defined, image id : ' + value.id );
        }
        
        image.onload = function() {
          dom_node.appendChild( image );
          
          de&&ug( 'image: ' + log.s( value ) );
          
          Set.prototype.add.call( that, [ value ], i < l ? options_more : options );
          
          load_image();
        }
      }
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;
      
      if( l === 0 ) return this;
      
      var dom_node     = this.preloaded_images
        , images       = dom_node.childNodes
        , options_more = XS.more( options )
        , count        = removed.length
      ;
      
      for( var i = images.length; i; ) {
        var image = images[ --i ], src = image.src;
        
        for( var j = l; j; ) {
          var value = removed[ --j ];
          
          if( value.src === src ) {
            dom_node.removeChild( image );
            
            Set.prototype.remove.call( this, [ value ], --count ? options_more : options );
          }
        }
      }
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      var l = updates.length;
      
      if( l === 0 ) return this;
      
      var dom_node = this.preloaded_images
        , images   = dom_node.childNodes
      ;
      
      for( var i = images.length; i; ) {
        var image = images[ --i ], src = image.src;
        
        for( var j = l; j; ) {
          var u  = updates[ --j ], u0 = u[ 0 ], u1 = u[ 1 ];
          
          if( u0.src === src && u0.src !== u1.src ) {
            this
              .remove( [ u0 ], options )
              .add   ( [ u1 ], options )
            ;
          }
        }
      }
      
      return this;
    } // update()
  } ); // Load_Images instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Load_Images' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // load_images.js
