/*  last.js
    
    A set with a single value of the last value added to the source.
    
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
    , Pipelet    = XS.Pipelet
    , Query      = XS.Query
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
    
    // This pipelet is stateful and lazy
    
    // State
    this._last = null;
    
    return this;
  } // Last()
  
  /* -------------------------------------------------------------------------------------------
     .last( options )
  */
  Pipelet.Build( 'last', Last, {
    fetch: function( receiver, query ) {
      var values = this._last ? [ this._last ] : [];
      
      if ( query ) values = new Query( query ).generate().filter( values );
      
      // if ( query ) values = Query.filter_values( query, values );
      
      receiver( values, true );
      
      return this;
    }, // fetch()
    
    add: function( values ) {
      var l = values.length;
      
      if ( l ) {
        var v = values[ l - 1 ];
        
        if ( this._last ) {
          this.emit_update( [ [ this._last, v ] ] );
        } else {
          this.emit_add( [ v ] );
        }
        
        this._last = v;
      }
      
      return this; 
    }, // add()
    
    remove: function() {
      return this;
    }, // remove()
  } ); // Last instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Last' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // last.js
