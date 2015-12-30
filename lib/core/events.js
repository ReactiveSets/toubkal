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
( 'events', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS               = rs.RS
    , extend           = RS.extend
    , Set              = RS.Set
    , timestamp_string = RS.timestamp_string
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'events' );
  
  /* -------------------------------------------------------------------------------------------
     source.timestamp()
     
     Statelessly add timestamps to dataflow if not present.
     
     Timestamps are formatted as "YYYY/MM/DD hh:mm:ss.sss".
     
     Important: because this is stateless, it should not be fetched more than once because the
     timestamp would be regenerated on fetch() so the same values would end-up with different
     timestamps. If stateful operation is desired, add a set() downstream of events_metadata()
     
     Example:
     {
       timestamp: '2013/09/25 15:17:53.909'
     }
  */
  rs.Compose( 'timestamp', function( source, options ) {
    return source.alter( add_timestamp, options );
    
    function add_timestamp( value ) {
      value.timestamp = value.timestamp || timestamp_string();
    }
  } ); // timestamp()
  
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
     different ids and timestamps. If stateful operation is desired, add a set() downstream
     of events_metadata()
  */
  rs.Compose( 'events_metadata', function( source, options ) {
    var o = extend( { flow : options.set_flow || 'event' }, options.others );
    
    if ( options.name ) o.name = options.name;
    
    return source.map( map_event, extend( {}, options, { key: [ 'id' ] } ) );
    
    function map_event( event ) {
      var value = { id: RS.uuid.v4() };
      
      event.timestamp || ( value.timestamp = timestamp_string() );
      
      return extend( value, o, event );
    }
  } ); // events_metadata()
  
  /* -------------------------------------------------------------------------------------------
     once( timeout, options )
     
     Emit a one-time event (empty value) after timeout milliseconds.
     
     This is a stateful pipelet that contains zero then one beat (empty value).
     
     Parameters:
     - timeout (Integer): optional milliseconds to emit beat, defaults to immediately
     - options (Object): Set options.
  */
  rs.Compose( 'once', function( source, timeout, options ) {
    var once = rs.set( [], options );
    
    if ( timeout ) {
      setTimeout( emit_beat, timeout );
    } else {
      emit_beat();
    }
    
    return once;
    
    function emit_beat() {
      once._add( [ {} ] );
    } // emit_beat()
  } ); // once()
  
  /* -------------------------------------------------------------------------------------------
     beat( interval, options )
     
     Emit beats at interval milliseconds if interval > 0.
     
     Start / stop controlled by upstream pipelets.
     
     This is a stateful, greedy, adds-only pipelet.
     
     Parameters:
     - interval (Integer): milliseconds between beats, beat starts if > 0
     - options (Object): Set options.
     
     On remove operations, regardless of source attributes, beat() stops.
     
     On add operations, beats() restarts with attribute "interval" value if positive.
     
     When starting, a first beat is emmitted immadiately, followed by beats at
     intervals.
     
     Emitted values are empty if started with interval > 0, added values otherwise.
  */
  function Beat( interval, options ) {
    Set.call( this, [], options );
    
    start_stop_beat( this, interval && { interval: interval } );
  } // Beat()
  
  function start_stop_beat( that, value ) {
    that._interval && clearInterval( that._interval );
    that._interval = null;
    
    if ( ( that._state = value || null ) && value.interval > 0 ) {
      that._interval = setInterval( emit_beat, value.interval );
      
      emit_beat();
    }
    
    function emit_beat() {
      that.__emit_add( that.a = [ that._state ] );
    } // emit_beat()
  } // start_stop_beat()
  
  Set.Build( 'beat', Beat, {
    _add: function( values, options ) {
      start_stop_beat( this, values[ values.length - 1 ] );
    }, // _add()
    
    _remove: function( values, options ) {
      start_stop_beat( this );
    } // _remove()
  } );
  
  de&&ug( 'module loaded' );
} ); // events.js
