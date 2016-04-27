/*  events.js

    Copyright (c) 2013-2016, Reactive Sets

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
    , Greedy           = RS.Greedy
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
  
  /* -------------------------------------------------------------------------------------------
      @pipelet throttle( throttle, options )
      
      @short Throttles source events by throttle events
      
      @description:
        Source events are throttled by throttle dataflow events and until the previous
        throttled event has completed its synchronous operation, i.e. when emit() has
        returned:
        
        ```
        source __ a _ b ________________ c _ d _ e _ f _ g _________________ h _______________
        
        throttle _________|___________|___________|___________|___________|___________|_______
        
        emit      _______ b _____________________ e _____________________ g _________ h ______
        
        emit returns ___________|_________________________________|______________|____________
        
                          ______                  ________________        _______
        busy _____________      __________________                ________       _____________
        ```
        
        This is an asynhronous, greedy, stateful, adds-only pipelet. On its
        throttle dataflow it is greedy and synchronous as it emits on throttle events.
        
        When fetched, provide the last emitted throttled value. Initial state before the first
        throttle event is an empty set.
      
      @parameters:
        - throttle (Pipelet): adds-only pipelet emitting throttle events
        - options (Object): optional Greedy pipelet options
      
      @emits:
        - id      (Integer): starts at one, incremented for each throttled event
        - last     (Object): the value of the last source event
        - throttle (Object): the value from the throttle dataflow that triggered the event
      
      @examples:
        
        - Throttle millisecond events every second:
        
          ```javascript
          rs
            .beat( 1 )
            .throttle( rs.beat( 1000 ) )
            .trace( 'throttled every second' )
            .greedy()
          ;
          ```
        
        - Throttle window resize events with requestAnimationFrame():
        
          ```javascript
          rs
            .$window_size()
            .throttle( rs.animation_frames() )
            .trace( 'resized' )
            .greedy()
          ;
          ```
  */
  function Throttle( throttle, options ) {
    var that  = this
      , state = []
      , id    = 0
      , idle  = true
      , last  = that._last = null
    ;
    
    Greedy.call( that, extend( {}, options, { key: [ 'id' ] } ) );
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    that._add_input( throttle, Greedy.Input, 'throttle-input', {
      _add: function( values, options ) {
        if ( idle
          && values.length
          && that._last !== last
        ) {
          idle = false;
          
          state[ 0 ] = {
            id       : ++id,
            last     : last = that._last,
            throttle : values[ 0 ]
          };
          
          that.__emit_add( state );
          
          idle = true;
        }
      } // _add()
    } );
    
    function fetch_unfiltered( rx ) {
      rx( state, true );
    } // fetch_unfiltered()
  } // Throttle()
  
  Greedy.Build( 'throttle', Throttle, {
    _add: function( values ) {
      var l = values.length;
      
      if ( l )
        this._last = extend( {}, values[ l - 1 ] )
      ;
    }, // _add()
    
    // Ignore removes
    _remove: function() {
    }, // _remove()
    
    _update: function( updates ) {
      var l = updates.length;
      
      if ( l )
        this._last = extend( {}, updates[ l - 1 ][ 1 ] )
      ;
    } // _update()
  } ); // throttle()
  
  de&&ug( 'module loaded' );
} ); // events.js
