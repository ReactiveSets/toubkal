/*  gallery.js
    
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
    , Load_Images = XS.Load_Images
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs gallery, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Gallery( dom_node, options )
     
     input dataset: 
     [
       { id: 1, name: 'images/01.jpg', tumbnail: 'images/tumbnails/01-tumbnail.jpg' },
       { id: 1, name: 'images/02.jpg', tumbnail: 'images/tumbnails/02-tumbnail.jpg' },
       { id: 1, name: 'images/03.jpg', tumbnail: 'images/tumbnails/03-tumbnail.jpg' },
       { id: 1, name: 'images/04.jpg', tumbnail: 'images/tumbnails/04-tumbnail.jpg' },
       { id: 1, name: 'images/05.jpg', tumbnail: 'images/tumbnails/05-tumbnail.jpg' }
     ]
     
  */
  function Gallery( dom_node, options ) {
    Load_Images.call( this, options );
    
    return this.set_node( dom_node );
  } // Gallery()
  
  /* -------------------------------------------------------------------------------------------
     .gallery( dom_node, options )
  */
  Load_Images.build( 'gallery', Gallery, {
    set_node: function( dom_node ) {
      if( XS.is_DOM( node ) ) {
        this.gallery_container = dom_node;
        
        XS.add_class( dom_node, 'xs-gallery' );
      } else {
        throw( "the node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( ! l ) return this;
      
      Set.prototype.add.call( this, added, options );
      
      var preloaded         = this.preloaded_images
        , gallery_container = this.gallery_container
      ;
      
      for( var i = -1; ++i < l; ) {
        var value       = added[ i ]
          , item        = document.createElement( 'div' )
          , image       = this.get_loaded_image ( value.name )
          , thumbnail   = document.createElement( 'img' )
          , caption     = document.createElement( 'div' )
          , title       = document.createElement( 'h3'  )
          , description = document.createElement( 'p'   )
        ;
        
        XS.add_class( item   , 'item'            );
        XS.add_class( caption, 'gallery-caption' );
        
        if( ! image ) {
          image = document.createElement( 'img' );

          image.src = value.name;
        }
        
        thumbnail.src = value.thumbnail;
        
        item.appendChild( thumbnail );
        
        if( value.title ) {
          title.innerHTML = value.title;
          
          caption.appendChild( title );
        }
        
        if( value.description ) {
          description.innerHTML = value.description;
          
          caption.appendChild( description );
        }
        
        item.appendChild( caption );
        
        gallery_container.appendChild( item );
      } // for()
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;
      
      if( ! l ) return this;
      
      Set.prototype.remove.call( this, removed, options );
      
      var gallery_container = this.gallery_container;
      
      for( var i = l; i; ) {
        var src  = removed[ --i ].name
          , item = gallery_container.childNodes[ 0 ]
        ;
        
        while( item ) {
          if( item.getElementsByTagName( 'img' )[ 0 ].src === src ) {
            gallery_container.removeChild( item );
            
            break;
          }
          
          item = item.nextSibling;
        } // while()
      } // for()
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      var l = updates.length;
      
      if( ! l ) return this;
      
      Set.prototype.update.call( this, updates, options );

      var gallery_container = this.carousel_inner
        , item              = gallery_container.childNodes[ 0 ]
      ;
      
      for( var i = l; i; ) {
        var u  = updates[ --i ]
          , u0 = u[ 0 ]
          , u1 = u[ 1 ]
        ;
        
        while( item ) {
          // find the item to update
          if( item.getElementsByTagName( 'img' )[ 0 ].src === u0.name ) {
          
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
  } ); // Gallery instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Gallery' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // gallery.js
