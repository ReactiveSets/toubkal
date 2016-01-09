/*  animation_frames.js
    
    Copyright (c) 2013-2016, Reactive Sets

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
undefine()( 'animation_frames', [ '../core/pipelet' ], function( rs ) {
  /* -------------------------------------------------------------------------------------------
      animation_frames( options )
      
      Emits "animation_frame" events.
      
      Emitted values have the following attributes:
      - flow    (String): 'animation_frame'
      - id      (Number): always 1
      - native (Boolean): true if requestAnimationFrame is available
      - animation_frame (DOMHighResTimeStamp): native, time when callbacks queued by
        requestAnimationFrame begin to fire.
      
      This is a singleton, stateful, source, adds-only pipelet. State is last event.
      
      Parameters:
      - options (Object): Set options, key is forced to [ 'id' ]
      
      Check https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
      
      See animation_frames_polyfill() if polyfill is needed.
  */
  var flow = 'animation_frame' // also used for key attribute name
    , singleton = { singleton: true }
    , state = { flow: flow, id: 1 }
    , request_animation_frame = window.requestAnimationFrame
    , RequestAnimationFrame = 'RequestAnimationFrame'
  ;
  
  function not_native() {
    return ! ( state.native = typeof request_animation_frame == 'function' );
  } // not_native()
  
  return rs.Compose( flow + 's', singleton, function( source, options ) {
    options.key = [ 'id' ];
    
    not_native() && [ 'o', 'webkit', 'moz', 'ms' ]
      .filter( function( vendor ) {
        request_animation_frame = window[ vendor + RequestAnimationFrame ];
        
        return not_native();
      } )
    ;
    
    var set = rs.set( [ state ], options );
    
    not_native()
      ? rs.RS.log( RequestAnimationFrame, 'not available' )
      : request_animation_frame( animate )
    ;
    
    return set;
    
    function animate( repaint ) {
      state[ flow ] = repaint;
      
      set.__emit_add( [ state ] );
      
      request_animation_frame( animate );
    } // animate()
  } ) // animation_frames()
  
  /* -------------------------------------------------------------------------------------------
      animation_frames_polyfill( options )
      
      Emits "animation_frame" events.
      
      Polyfill based on beat() if requestAnimationFrame() is not available.
      
      Emitted values have the following attributes:
      - flow    (String): 'animation_frame'
      - id      (Number): always 1
      - native (Boolean): false if this is implemented with beat(), true otherwise
      - animation_frame:
        - (DOMHighResTimeStamp): native, time when callbacks queued by requestAnimationFrame
          begin to fire.
        - (Number): not native, Date..getTime() timestamp when event was scheduled to fire
      
      This is a singleton, stateful, source, adds-only pipelet. State is last event.
      
      Parameters:
      - options (Object): Set options, key is forced to [ 'id' ]
      
      Check https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
      
      Polyfill inspired by:
        http://www.paulirish.com/2011/requestanimationframe-for-smart-animating
        http://creativejs.com/resources/requestanimationframe
  */
  .Compose( flow + 's_polyfill', singleton, function( source, options ) {
    var animation_frames = rs.animation_frames( options );
    
    return not_native() ?
      rs
        .beat( 17 )
        
        .map( function() {
          state[ flow ] = new Date().getTime()
          
          return state;
        }, animation_frames._options )
        
      : animation_frames
    ;
  } ); // animation_frames_polyfill()
} ); // animation_frames.js
