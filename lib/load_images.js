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
       uri          : image source
       title*       : image title
       description* : image description
       style*       : custom css classes
       
       ( * ) : optional attributes
       
       ToDo: options: number_to_load : number of images to load in //, default is 1
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
        
        // create images container if it not exist
        dom_node = document.createElement( 'div' );
        
        dom_node.id = 'xs_preloaded_images';
        dom_node.style.display = 'none';
        
        // insert the container at first
        document.body.insertBefore( dom_node, body.childNodes[ 0 ] );
      }
      
      this.preloaded_images = dom_node;
      
      return this;
    }, // set_node()
    
    // ToDo: this function is unused, should it be kept?
    get_loaded_image: function( uri ) {
      var preloaded = this.preloaded_images
        , image     = preloaded && preloaded.childNodes[ 0 ]
      ;
      
      while( image ) {
        if( image.src === uri ) {
          break;
        } else {
          image = image.nextSibling;
        }
      }
      
      return image;
    },
    
    add: function( added, options ) {
      var l = added.length;
      
      if( l === 0 ) return this;
      
      var dom_node     = this.preloaded_images
        , options_more, that = this, i = -1
      ;
      
      if ( l > 1 ) {
        // more than one image, requires a transaction
        options = XS.no_more( options_more = XS.more( options ) );
      }
      
      load_image();
      
      return this;
      
      // load_image()
      function load_image() {
        var value;
        
        if( ! ( value = added[ ++i ] ) ) {
          // ToDo: this is currently unecessary and could duplicate an end of transaction
          that.emit_add( [], options ); // no more
          
          return;
        }
        
        var image = document.createElement( 'img' );
        
        if( value.uri ) {
          image.src = value.uri;
          
          image.onerror = onerror;
          image.onload  = onload;
        } else {
          de&&ug( 'image source is not defined, image id : ' + value.id );
          
          // ToDo: if it's not defined, should it be added?
          // Not adding would make remove() more complex but this might be what needs to be done
          Set.prototype.add.call( that, [ value ], i < l ? options_more : options );
          
          load_image();
        }
        
        return;
        
        // error handler
        function onerror() {
          de&&ug( 'failure to load image: ' + log.s( value ) );
          
          // ToDo: if there is an error, should it be added?
          // Not adding would make remove() more complex but this might be what needs to be done
          Set.prototype.add.call( that, [ value ], i < l ? options_more : options );
          
          load_image();
        } // onerror()
        
        // load handler
        function onload() {
          dom_node.appendChild( image );
          
          de&&ug( 'image: ' + log.s( value ) );
          
          // ToDo: shouldn't it be i + 1 < l ? What if l == 1, and i == 0 (the first and only element), what should it be?
          // The other option would be ++i < l, requiring to initialize i to zero in add()
          // Yet another option is --count, where count is initialized to l in add()
          // Note that this could explain an end of transaction bug since the no_more condition with a transaction id would be sent twice
          // The first one would work, but the second would fail to locate the transaction
          Set.prototype.add.call( that, [ value ], i < l ? options_more : options );
          
          load_image();
        } // onload()
      } // load_image()
    }, // add()
    
    remove: function( removed, options ) {
      var l = removed.length;
      
      if( l === 0 ) return this;
      
      var dom_node     = this.preloaded_images
        , image        = dom_node.childNodes[ 0 ]
        , options_more = XS.more( options )
        , count        = removed.length
      ;
      
      for( var i = l; i; ) {
        var value = removed[ --i ];
        
        while( image ) {
          if( image.src === value.uri ) {
            dom_node.removeChild( image );
            
            break;
          } // end if
          
          image = image.nextSibling;
        } // end while loop
        
        Set.prototype.remove.call( this, [ value ], --count ? options_more : options );
      } // end for loop
      
      return this;
    }, // remove()
    
    // Consider removing this update that is not handling transactions properly, or fix it, if this is worth the effort 
    update: function( updates, options ) {
      var l = updates.length;
      
      if( l === 0 ) return this;
      
      var dom_node = this.preloaded_images
        , image    = dom_node.childNodes[ 0 ]
      ;
      
      for( var i = updates.length; i; ) {
        var u  = updates[ --i ], u0 = u[ 0 ], u1 = u[ 1 ];
        
        while( image ) {
          if( u0.uri === image.src && u0.uri !== u1.uri ) {
            this
              .remove( [ u0 ], options )
              .add   ( [ u1 ], options )
            ;
            
            break;
          } // end if
          
          image = image.nextSibling;
        } // end while loop
        
        Set.prototype.update.call( this, [ [ u0, u1 ] ], options );
      } // end for loop()
      
      return this;
    } // update()
  } ); // Load_Images instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Load_Images' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // load_images.js
