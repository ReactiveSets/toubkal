/*  animation_frames.js
    
    ----
    
    Copyright (C) 2013, 2014, Connected Sets

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

!function( exports ) {
  var XS = exports.XS;
  
  if ( ! XS ) {
    // Should be under node, unless missing pipelet.js script prior to this one
    XS = require( '../pipelet.js' ).XS;
    
    // Require other xs modules
    require( '../code.js'    );
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
  var de = false;
  
  function ug( m ) {
    log( "xs animation frames, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Animation_Frames( options )
  */
  
  var animation_frames;
  
  function Animation_Frames( options ) {
    if( animation_frames ) return animation_frames;
    
    options.key = [];
    
    Set.call( this, [], options );
    
    var request_animation_frame = window.requestAnimationFrame;
    
    if( typeof request_animation_frame === 'function' ) {
      var that = this;
      
      Set.prototype.add.call( this, [ { animation_frames: true } ], options );
      
      request_animation_frame( animation_frame );
    }
    
    return animation_frames = this;
    
    function animation_frame( repaint ) {
      that.__emit_add( [ { repaint: repaint } ] );
      
      request_animation_frame( animation_frame );
    }
  } // Animation_Frames()
  
  /* -------------------------------------------------------------------------------------------
     .animation_frames( options )
  */
  Set.Build( 'animation_frames', Animation_Frames, {} ); // Animation_Frames instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Animation_Frames' ] ) );
  
  de&&ug( "module loaded" );
} ( this ); // animation_frames.js
