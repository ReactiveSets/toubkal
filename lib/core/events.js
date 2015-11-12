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
    , Compose          = RS.Pipelet.Compose
    , Set              = RS.Set
    , timestamp_string = RS.timestamp_string
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'events' );
  
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
     different ids and timestamps. If stateful operation is desired, add a set() downstream
     of events_metadata()
  */
  Compose( 'events_metadata', function( source, options ) {
    var o = extend( { flow : options.set_flow || 'event' }, options.others );
    
    if ( options.name ) o.name = options.name;
    
    return source.map( map_event, extend( {}, options, { key: [ 'id' ] } ) );
    
    function map_event( event ) {
      var value = { id: RS.uuid.v4() };
      
      event.timestamp || ( value.timestamp = timestamp_string() );
      
      return extend( value, o, event );
    }
  } );
  
  /* -------------------------------------------------------------------------------------------
     once( timeout, options )
     
     Emit a one-time event (empty value) after timeout milliseconds.
     
     This is a stateful pipelet that contains zero then one beat (empty value).
     
     Parameters:
     - timeout (Integer): milliseconds to emit beat
     - options (Object): Set options.
  */
  Compose( 'once', function( source, timeout, options ) {
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
     
     Emit beats (empty values) at interval milliseconds. Start / stop is controlled by upstream
     pipelets.
     
     This is a stateful pipelet which fetched state is always empty. To count the number of
     beast since startup, use aggregate().
     
     Parameters:
     - interval (Integer): milliseconds between beats, beat starts if > 0
     - options (Object): Set options.
     
     On remove operations, beat() stops.
     On add operations, beats() restarts with the non-zero attribute "interval" value.
  */
  function Beat( interval, options ) {
    Set.call( this, [], options );
    
    this._interval = null;
    
    this._start( interval );
  } // Beat()
  
  Set.Build( 'beat', Beat, {
    _start: function( interval ) {
      if ( interval && interval > 0 ) {
        
        if ( this._interval ) clearInterval( this._interval );
        
        var that = this;
        
        this._interval = setInterval( emit_beat, interval );
      }
      
      return this;
      
      function emit_beat() {
        that.__emit_add( [ {} ] );
      } // emit_beat()
    }, // start()
    
    _add: function( values, options ) {
      var that = this;
      
      values.forEach( function( value ) {
        that._start( value.interval );
      } );
      
      return this;
    }, // _add()
    
    _remove: function( values, options ) {
    
      if ( this._interval ) {
        clearInterval( this._interval );
        
        this._interval = null;
      }
      
      return this;
    } // _remove()
  } );
  
  de&&ug( 'module loaded' );
} ); // events.js
