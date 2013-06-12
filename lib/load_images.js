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
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs load_images, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Load_Images( dom_node, options )
     
     image object:
       id           : image ID
       src          : image source
       title*       : image title
       description* : image description
       style*       : custom css classes
       
       ( * ) : optional attributes
     
  */
  function Load_Images( dom_node, options ) {
    this.set_node( dom_node );
    
    Pipelet.call( this, options );
    
    return this;
  } // Load_Images()
  
  /* -------------------------------------------------------------------------------------------
     .load_images( dom_node, options )
  */
  Pipelet.build( 'load_images', Load_Images, {
    set_node: function( node ) {
      if( XS.is_DOM( node ) ) {
        this.node = node;
      } else {
        throw( 'the node is not a DOM element' );
      }
      
      return this;
    }, // set_node()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( l === 0 ) return this;
      
      var dom_node     = this.node
        , options_more = XS.more( options )
        , that = this, i = -1
      ;
      
      load_image();
      
      return this;
      
      // load_image()
      function load_image() {
        var container   = document.createElement( 'div' )
          , image       = document.createElement( 'img' )
          , title       = document.createElement(  'h3' )
          , description = document.createElement(  'p'  )
          , value       = added[ ++i ]
        ;
        
        if( ! value ) {
          that.emit_add( [], options ); // no more
          
          return;
        }
        
        if( value.src ) {
          image.src = value.src;
        } else {
          throw( 'image source is not defined' );
        }
        
        if( value.id ) {
          container.setAttribute( 'image_id', value.id );
        } else {
          throw( 'image ID is not defined' );
        }
        
        if( value.title ) {
          title.innerHTML = value.title;
          image.title     = value.title;
        }
        
        if( value.description ) description.innerHTML = value.description;
        
        container.appendChild(    title    );
        container.appendChild(    image    );
        container.appendChild( description );
        
        dom_node.insertBefore( container, null );
        
        image.onload = function() {
          de&&ug( 'laod image: ' + log.s( value ) );
          
          that.emit_add( [ value ], i < l ? options_more : options );
          
          load_image();
        };
      } // load_image()
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;
      
      if( l === 0 ) return this;
      
      var dom_node     = this.node
        , containers   = dom_node.childNodes
        , options_more = XS.more( options )
        , count        = removed.length
      ;
      
      for( var i = containers.length; i; ) {
        var container = containers[ --i ], id = container.getAttribute( 'image_id' );
        
        for( var j = l; j; ) {
          var value = removed[ --j ];
          
          if( value.id == id ) {
            dom_node.removeChild( containers[ i ] );
            
            this.emit_remove( [ value ], --count ? options_more : options );
          }
        }
      }
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      var l = updates.length;
      
      if( l === 0 ) return this;
      
      var node       = this.node
        , containers = node.childNodes
      ;

      for( var i = containers.length; i; ) {
        var container   = containers[ --i ]
          , title       = container.getElementsByTagName( 'h3'  )
          , image       = container.getElementsByTagName( 'img' )
          , description = container.getElementsByTagName(  'p'  )
          , id          = container.getAttribute( 'image_id' )
        ;

        for( var j = l; j; ) {
          var u  = updates[ --j ]
            , u0 = u[ 0 ]
            , u1 = u[ 1 ]
          ;

          if( u0.id == id ) {
            if( u0.title !== u1.title ) {
              title.innerHTML = u1.title;
              image.title     = u1.title;
            }
            
            if( u0.description !== u1.description ) description.innerHTML = u1.description;
          }
        }
      }
      
      this.emit_update( updates )
      
      return this;
    } // update()
  } ); // Load_Images instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Load_Images' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // load_images.js
