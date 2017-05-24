/*  animation_frames.js
    
    Copyright (c) 2013-2017, Reactive Sets

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
      @pipelet animation_frames( options )
      
      @short Emits "animation_frame" events
      
      @description:
        This is a singleton, stateful, source, adds-only pipelet. State is last event.
        
        Check https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
        
        See animation_frames_polyfill() if polyfill is needed.
      
      @parameters:
       - options (Object): Set options, key is forced to [ 'id' ]
      
      @emits:
        - flow    (String): 'animation_frame'
        - id      (Number): always 1
        - native (Boolean): true if requestAnimationFrame is available
        - animation_frame (DOMHighResTimeStamp): native, time when callbacks queued by
          requestAnimationFrame begin to fire.
  */
  var flow = 'animation_frame' // also used for key attribute name
    , state = { flow: flow, id: 1 }
    , RequestAnimationFrame = 'RequestAnimationFrame'
    , request_animation_frame
  ;
  
  function active( _request_animation_frame ) {
    request_animation_frame = window[ _request_animation_frame ] || request_animation_frame;
    
    return state.native = typeof request_animation_frame == 'function';
  } // active()
  
  return rs
  
  .Singleton( flow + 's', function( source, options ) {
    options.key = [ 'id' ];
    
    active( 'requestAnimationFrame' ) && [ 'o', 'webkit', 'moz', 'ms' ]
      .some( function( vendor ) {
        return active( vendor + RequestAnimationFrame );
      } )
    ;
    
    var rs  = source.namespace()
      , set = rs.set( [ state ], options )
    ;
    
    active()
      ? request_animation_frame( animate )
      : rs.RS.log( RequestAnimationFrame, 'not available' )
    ;
    
    return set;
    
    function animate( repaint ) {
      state[ flow ] = repaint;
      
      set.__emit_add( [ state ] );
      
      request_animation_frame( animate );
    } // animate()
  } ) // animation_frames()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet animation_frames_polyfill( options )
      
      @short Emits "animation_frame" events, polyfilled if requestAnimationFrame() not available
      
      @description:
        Polyfill based on beat( 17 ) if requestAnimationFrame() is not available.
        
        This is a singleton, stateful, source, adds-only pipelet. State is last event.
        
        Check https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
        
        Polyfill inspired by:
          http://www.paulirish.com/2011/requestanimationframe-for-smart-animating
          http://creativejs.com/resources/requestanimationframe
      
      @parameters:
        - options (Object): Set options, key is forced to [ 'id' ]
      
      @emits:
        - flow    (String): 'animation_frame'
        - id      (Number): always 1
        - native (Boolean): false if this is implemented with beat(), true otherwise
        - animation_frame:
          - (DOMHighResTimeStamp): native, time when callbacks queued by requestAnimationFrame
            begin to fire.
          - (Number): not native, Date..getTime() timestamp when event was scheduled to fire
  */
  .Singleton( flow + 's_polyfill', function( source, options ) {
    var rs               = source.namespace()
      , animation_frames = rs.animation_frames( options )
    ;
    
    return active() ? animation_frames :
      rs
        .beat( 17 )
        
        .map( function() {
          state[ flow ] = new Date().getTime()
          
          return state;
        }, animation_frames._options )
      ;
  } ); // animation_frames_polyfill()
} ); // animation_frames.js
