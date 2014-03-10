/*  events.js

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
    XS = require( './xs.js' );
    
    require( './code.js'    );
    require( './pipelet.js' );
  } else {
    XS = exports.XS;
  }
  
  var xs          = XS.xs
    , log         = XS.log
    , extend      = XS.extend
    , extend_2    = XS.extend_2
    , Code        = XS.Code
    , Pipelet     = XS.Pipelet
  ;
  
  var de = true;
  
  function ug( m ) {
    log( "xs events.js, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     timestamp()
     
     Returns a timestamp string formatted as "YYYY/MM/DD hh:mm:ss.sss".
  */
  function timestamp() {
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
    
    return year + '/' + month + '/' + day + ' ' + hour + ':' + minutes + ':' + seconds + '.' + ms;
  } // timestamp()
  
  /* -------------------------------------------------------------------------------------------
     source.timestamp()
     
     Add timestamps to dataflow if not present.
     
     Timestamps are formatted as "YYYY/MM/DD hh:mm:ss.sss".
     
     Example:
     {
       timestamp: '2013/09/25 15:17:53.909'
     }
  */
  Pipelet.Compose( 'timestamp', function( source, options ) {
    return source.alter( alter_timestamp, extend_2( { no_clone: true }, options ) );
    
    function alter_timestamp( value ) {
      return value.timestamp? value : extend_2( { timestamp: timestamp() }, value );
    }
  } );
  
  /* -------------------------------------------------------------------------------------------
     source.events_metadata( options )
     
     Add events meta informations to event dataflow:
       - timestamp :
       - uuid_v4   : A version 4 uuid
       - flow      : options.set_flow || 'event'
       
     Optional attributes added:
       - name      : event name from options.name
       - other attributes: from options.other
  */
  Pipelet.Compose( 'events_metadata', function( source, options ) {
    options.key = [ 'flow', 'uuid_v4' ];
    
    var o = { flow : options.set_flow || 'event' };
    
    if ( options.name ) o.name = options.name;
    
    options.others && extend_2( o, options.others );
    
    return source.alter( alter_event, extend_2( { no_clone: true }, options ) );
    
    // ToDo: optimize with new alter() that clones values by default
    function alter_event( event ) {
      return extend( {
          timestamp: event.timestamp || timestamp(),
          uuid_v4  : XS.uuid_v4()
        }, o, event
      );
    }
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  de&&ug( "module loaded" );
} )( this ); // events.js