/*  events.js

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'events', [ './pipelet', '../util/timestamp_string' ], function( rs, timestamp_string ) {
  'use strict';
  
  var RS       = rs.RS
    , extend   = RS.extend
    , extend_2 = extend._2
    , Compose  = RS.Pipelet.Compose
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'events' );
  
  /* -------------------------------------------------------------------------------------------
     timestamp()
     
     Returns a timestamp string formatted as "YYYY/MM/DD hh:mm:ss.sss".
  */
  function timestamp() {
    return timestamp_string( new Date );
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
  Compose( 'timestamp', function( source, options ) {
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
  Compose( 'events_metadata', function( source, options ) {
    options.key = [ 'flow', 'uuid_v4' ];
    
    var o = { flow : options.set_flow || 'event' };
    
    if ( options.name ) o.name = options.name;
    
    options.others && extend_2( o, options.others );
    
    return source.alter( alter_event, extend_2( { no_clone: true }, options ) );
    
    // ToDo: optimize with new alter() that clones values by default
    function alter_event( event ) {
      return extend( {
          timestamp: event.timestamp || timestamp(),
          uuid_v4  : RS.uuid.v4()
        }, o, event
      );
    }
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  de&&ug( "module loaded" );
} ); // events.js
