/*  url.js
    
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

!function( exports ) {
  var XS = exports.XS;
  /*
  if ( ! XS ) {
    // Should be under node, unless missing pipelet.js script prior to this one
    XS = require( './pipelet.js' ).XS;
    
    // Require other xs modules
    require( './code.js'    );
  }
  */
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
    log( "xs url, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     URL_Events( get_events, options )
  */
  
  var url_events;
  
  function URL_Events( get_events, options ) {
    if( url_events ) return url_events;
    
    options.key = [];
    
    Pipelet.call( this, options );
    
    var that = this;
    
    if( this.url === undefined ) {
      this.url = document.location.href; 
      
      this.emit_add( [ { url: this.url } ] ); // ToDo: this would typically do nothing because most likely no other pipelet is yet connected downtream
    }
    
    // ToDo: implement onhashchange()
    
    get_events.on( 'add', function( value, options ) {
      var url = document.location.href;
      
      if( that.url === url ) return;
      
      that.url = url;
      
      that.emit_add( [ { url: url } ] );
      
      return;
    } );
    
    return url_events = this;
  } // URL_Events()
  
  /* -------------------------------------------------------------------------------------------
     url_events( get_events, options )
  */
  Pipelet.build( 'url_events', URL_Events, {
    // ToDo: fetch() should return the current url
    // ToDo: add() should modify the current url
  } ); // URL_Events instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'URL_Events' ] ) );
  
  de&&ug( "module loaded" );
} ( this ); // url.js