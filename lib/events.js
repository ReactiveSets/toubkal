/*  events.js

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
  var XS, uuid;
  
  if ( typeof require === 'function' ) {
    XS = require( './pipelet.js' ).XS;
    
    uuid = require( 'node-uuid' ).uuid;
    
    require( './code.js'    );
  } else {
    XS = exports.XS;
  }
  
  var xs          = XS.xs
    , log         = XS.log
    , extend      = XS.extend
    , Code        = XS.Code
    , Pipelet     = XS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs events.js, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     events_metadata()
     
     add events informations :
     
       - uuid_v4  : uuid
       - model    : event model -> 'event'
       - name     : event name
     
  */
  XS.Compose( 'events_metadata', function( source, options ) {
    return source
      .timestamp()
      .alter( function( event ) {
        event = extend( {}, event );
        
        var others = options.others
          , name   = options.name
        ;
        
        if( others ) event      = extend( {}, others );
        if(  name  ) event.name = name;
        
        event.model   = 'event'
        event.uuid_v4 = uuid.v4();
        
        return event;
      } )
    ;
  } );
  
  /* -------------------------------------------------------------------------------------------
     Timestamp()
     
     add an attribute 'timestamp' if not exist.
     
     example: '2013/09/25 15:17:53.909'
     
  */
  XS.Compose( 'timestamp', function( source, options ) {
    return source
      .alter( function( object ) {
        if( object.timestamp ) return object;
        
        object = extend( {}, object );
        
        var date     = new Date
          , year     = "" + date.getFullYear()
          , month    = "" + ( date.getMonth() + 1 )
          , day      = "" + date.getDate()
          , hour     = "" + date.getHours()
          , minutes  = "" + date.getMinutes()
          , seconds  = "" + date.getSeconds()
          , ms       = "" + date.getMilliseconds()
        ;
        
        if ( month  .length < 2 ) month    = "0" + month
        if ( day    .length < 2 ) day      = "0" + day;
        if ( hour   .length < 2 ) hour     = "0" + hour;
        if ( minutes.length < 2 ) minutes  = "0" + minutes;
        if ( seconds.length < 2 ) seconds  = "0" + seconds;
        
        switch( ms.length ) {
          case 2: ms =  "0" + ms; break;
          case 1: ms = "00" + ms; break;
        } // switch()
        
        object.timestamp = year + '/' + month + '/' + day + ' ' + hour + ':' + minutes + ':' + seconds + '.' + ms;
        
        return object;
      } )
    ;
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  de&&ug( "module loaded" );
} )( this ); // events.js