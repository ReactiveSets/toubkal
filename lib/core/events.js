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
    , Compose  = RS.Pipelet.Compose
  ;
  
  /* -------------------------------------------------------------------------------------------
     source.timestamp()
     
     Statelessly add timestamps to dataflow if not present.
     
     Timestamps are formatted as "YYYY/MM/DD hh:mm:ss.sss".
     
     Important: because this is stateless, it should not be fetched more than once because the
     timestamp would be regenerated on fetch() so the same values would end-up with different
     timestamps. If statefull operation is desired, add a set() downstream of events_metadata()
     
     Example:
     {
       timestamp: '2013/09/25 15:17:53.909'
     }
  */
  Compose( 'timestamp', function( source, options ) {
    return source.alter( add_timestamp, options );
    
    function add_timestamp( value ) {
      value.timestamp = value.timestamp || timestamp_string();
    }
  } );
  
  /* -------------------------------------------------------------------------------------------
     source.events_metadata( options )
     
     Statelessly add events meta informations to event dataflow:
       - id        : (String) A version 4 uuid
       - timestamp : (String) added if not present
       - flow      : (String) options.set_flow || 'event'
       
     Optional attributes added:
       - name      : (String) event name from options.name if present
       - other attributes: from options.other Object if present
     
     Set key is forced to [ 'id' ].
     
     Important: because this is stateless, it should not be fetched more than once because id
     and timestamp would be regenerated on fetch() so the same values would end up with
     different ids and timestamps. If statefull operation is desired, add a set() downstream
     of events_metadata()
  */
  Compose( 'events_metadata', function( source, options ) {
    var o = extend( { flow : options.set_flow || 'event' }, options.others );
    
    if ( options.name ) o.name = options.name;
    
    return source.alter( alter_event, extend( { no_clone: true, key: [ 'id' ] }, options ) );
    
    function alter_event( event ) {
      var value = { id: RS.uuid.v4() };
      
      event.timestamp || ( value.timestamp = timestamp_string() );
      
      return extend( value, o, event );
    }
  } );
  
  de&&ug( 'module loaded' );
} ); // events.js
