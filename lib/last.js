/*  last.js
    
    A set with a single value of the last value added to the source.
    
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
    log( "xs last, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Last( options )
  */
  function Last( options ) {
    Pipelet.call( this, options );
    
    return this;
  } // Last()
  
  /* -------------------------------------------------------------------------------------------
     .last( options )
  */
  Pipelet.Build( 'last', Last, {
    fetch: function( receiver ) {
      receiver( this.last ? [ this.last ] : [], true );
      
      return this;
    }, // fetch()
    
    add: function( values ) {
      var l = values.length;
      
      if ( l ) {
        var v = values[ l - 1 ];
        
        if ( this.last ) {
          this.emit_update( [ [ this.last, v ] ] );
        } else {
          this.emit_add( [ v ] );
        }
        
        this.last = v;
      }
      
      return this; 
    }, // add()
    
    remove: function() {
      return this;
    }, // remove()
    
    update: function( updates ) {
      var l = updates.length;
      
      if ( l ) this.add( [ updates[ l ][ 1 ] ] );
      
      return this;
    }, // update()
  } ); // Last instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Last' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // last.js
