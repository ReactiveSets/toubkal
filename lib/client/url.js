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
  
  function URL_Events( options ) {
    if( url_events ) return url_events;
    
    options.key = [];
    
    Pipelet.call( this, options );
    
    var that = this;
    
    this.url = document.location.href;
    
    if( typeof exports.onhashchange !== undefined ) {
      exports.onhashchange = function() {
        hash_change( document.location.href );
      };
    } else {
      xs
        .animation_frames()
        .on( 'add', function() {
          var url = document.location.href;
          
          if( that.url !== url ) hash_change( url );
        } )
      ;
    }
    
    return url_events = this;
    
    function hash_change( url ) {
      de&&ug( 'hash_change(), url : ' + url );
      
      that.url = url;
      
      that.emit_add( [ { url: url } ] );
    }
  } // URL_Events()
  
  /* -------------------------------------------------------------------------------------------
     url_events( get_events, options )
  */
  Pipelet.build( 'url_events', URL_Events, {
    fetch: function( receiver ) {
      
      return receiver( [ { url: this.url } ] );
    }, // fetch()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( l === 0 ) return this;
      
      for( var i = -1, url = this.url; ++i < l; ) {
        var value = added[ i ].url;
        
        if( value && value !== url ) this.emit_add( [ { url: this.url = value } ] );
      }
      
      return this;
    } // add()
  } ); // URL_Events instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'URL_Events' ] ) );
  
  de&&ug( "module loaded" );
} ( this ); // url.js