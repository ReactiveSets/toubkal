/*  animation_frames.js
    
    ----
    
    Copyright (C) 2013-2015, Reactive Sets

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
!function( exports ) {
  "use strict";

  var RS  = exports.RS
    , Set = RS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'animation frames' );
  
  /* -------------------------------------------------------------------------------------------
     rs.animation_frames( options )
     
     Emits "animation_frame" events if window.requestAnimationFrame is a Function, uses a
     a polyfill based on setTimeout otherwise.
     
     Emitted values have the following attributes:
     - flow (String): 'animation_frame'
     - animation_frame:
       - (Boolean): true, window.requestAnimationFrame is a Function, no event sent yet
       - (Boolean): false, window.requestAnimationFrame is a NOT available
       - (DOMHighResTimeStamp): the current time when callbacks queued by requestAnimationFrame
         begin to fire.
     
     Check https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
     
     Polyfill inspired by:
       http://www.paulirish.com/2011/requestanimationframe-for-smart-animating
       http://creativejs.com/resources/requestanimationframe
  */
  var animation_frames; // singleton
  
  function Animation_Frames( options ) {
    if ( animation_frames ) return animation_frames;
    
    var flow = 'animation_frame'; // also used for key attribute name
    
    options || ( options = {} );
    options.key = [ flow ];
    
    Set.call( this, [], options );
    
    var request_animation_frame = window.requestAnimationFrame
      ,  cancel_animation_frame = window.cancelAnimationFrame
    ;
    
    if ( ! request_animation_frame ) {
      var vendors = [ 'ms', 'moz', 'webkit', 'o' ], i = vendors.length;
      
      while( i ) {
        var vendor = vendors[ --i ];
        
        request_animation_frame = window[ vendor + 'RequestAnimationFrame' ];
        
        if ( request_animation_frame ) {
          cancel_animation_frame =
               window[ vendor + 'CancelAnimationFrame' ]
            || window[ vendor + 'CancelRequestAnimationFrame' ]
          ;
          
          break;
        }
      }
      
      if ( ! request_animation_frame ) { // still not available
        ug( 'warning, requestAnimationFrame not available, using polyfill instead' );
        
        var last_time = new Date().getTime();
        
        request_animation_frame = function( callback ) {
          var now = new Date().getTime()
            , timeout = now - last_time
          ;
          
          timeout >= 4 || ( timeout = 4 );
          
          last_time = now + timeout;
          
          return setTimeout( function() {
            callback( last_time );
          }, timeout );
        };
        
        cancel_animation_frame = clearTimeout;
      } else if ( ! cancel_animation_frame ) {
        cancel_animation_frame = function() {};
      }
    }
    
    var requestAnimationFrame_available = ( typeof request_animation_frame === 'function' )
      , that = this
      , state = { flow: flow }
    ;
    
    state[ flow ] = requestAnimationFrame_available;
    
    Set.prototype._add.call( this, [ state ], options );
    
    request_animation_frame( animation_frame );
    
    return animation_frames = this;
    
    function animation_frame( repaint ) {
      state[ flow ] = repaint;
      
      that.__emit_add( [ state ] );
      
      request_animation_frame( animation_frame );
    }
  } // Animation_Frames()
  
  Set.Build( 'animation_frames', Animation_Frames, {} ); // Animation_Frames instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { Animation_Frames: Animation_Frames } );
  
  de&&ug( "module loaded" );
} ( this ); // animation_frames.js
