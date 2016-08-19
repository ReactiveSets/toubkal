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
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'events' );
  
  /* --------------------------------------------------------------------------
      @pipelet timestamp( options )
      
      @short Add timestamp to values if not present.
      
      @parameters:
      - options (Object): @@pipelet:alter() options
      
      @emits: all @@source attributes plus:
      - timestamp (String) formatted as ```"YYYY/MM/DD hh:mm:ss.sss"```,
        example: ```{ timestamp: "2013/09/25 15:17:53.909" }```
      
      @description:
      This is a @@stateless, @@synchronous, @@greedy pipelet.
      
      **Important**: because timestamp() is @@stateless, it should not be
      fetched more than once because the timestamp would be regenerated
      on fetch() and the source values with the same @@identity would
      end-up with different timestamps. If @@stateful operation is
      desired, add a @@pipelet:set() @@downstream of timestamp():
      ```javascript
        source
          .timestamp()
          .set()
        ;
      ```
  */
  rs.Compose( 'timestamp', function( source, options ) {
    return source.alter( add_timestamp, options );
    
    function add_timestamp( value ) {
      value.timestamp = value.timestamp || timestamp_string();
    }
  } ); // timestamp()
  
  /* --------------------------------------------------------------------------
      @pipelet events_metadata( options )
      
      @short Add @@identity, timestamp and other metadata to event @@dataflow
      
      @parameters:
      - options (Object): @@pipelet options
        - set_flow (String): optional, emitted flow attribute value, default
          is ```"event"```
        - name (String): optional, emitted event name
        - other (Object): optional, additional emitted static attributes
      
      @emits: all @@source attributes plus:
      - id        (String): A version 4 @@uuid
      - timestamp (String): added if not present
      - flow      (String): options.set_flow if present, or ```"event"```
      - name      (String): event name from options.name if present
      - other attributes: from options.other Object if present
      
      @description:
      Pipelet @@key is forced to ```[ 'id' ]```.
      
      This is a @@stateless, @@synchronous, @@greedy pipelet.
      
      **Important**: because events_metadata() is @@stateless, it should
      not be fetched more than once because id and timestamp attributes
      would be regenerated on fetch() and the source values with the
      same @@identity would end-up with different timestamps. If
      @@stateful operation is desired, add a @@pipelet:set()
      @@downstream of events_metadata():
      ```javascript
        source
          .events_metadata()
          .set()
        ;
      ```
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
  
  /* --------------------------------------------------------------------------
      @pipelet once( timeout, options )
      
      @short Emits a one-time event (empty value) after timeout milliseconds
      
      @parameters:
      - timeout (Integer): optional milliseconds to emit beat, defaults to
        emitting event immediately
      - options (Object): @@pipelet:set options.
      
      @description:
      This is a @@stateful pipelet that contains no value initially (an
      enpry set ```[]```) then one beat (one empty value ```[ {} ]```).
      
      It ignores all @@source @@(value)s and never @@(subscribe)s to
      @@upstream @@(event)s.
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
  
  /* --------------------------------------------------------------------------
      @pipelet beat( interval, options )
      
      @short Emits beats at interval milliseconds if ```interval > 0```.
      
      @parameters:
      - interval (Integer): milliseconds between beats, beat starts if
        ```interval > 0````
      - options (Object): @@pipelet:set options.
      
      @@emits: @@source attributes plus:
      - interval (Integer): start interval or source values intervals
      
      @description:
      Start and stop can be controlled by @@upstream @@{event)s.
      
      This is an @@asynchronous, @@stateful, @@greedy, @@(adds-only) pipelet.
      
      On @@remove @@(operation)s, regardless of @@source attributes, beat()
      stops.
      
      On @@add operations, beat() restarts with attribute ```"interval"```
      value if positive.
      
      When starting, a first beat is emmitted immadiately if
      ```interval > 0```, followed by beats at interval milliseconds.
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
      var l = values.length;
      
      l && start_stop_beat( this, values[ l - 1 ] );
    }, // _add()
    
    _remove: function( values, options ) {
      start_stop_beat( this );
    } // _remove()
  } );
  
  /* --------------------------------------------------------------------------
      @pipelet throttle( throttle, options )
      
      @short Emits last received @@source @@value before throttle events
      
      @parameters:
      - throttle (Pipelet): @@(adds-only) pipelet emitting throttle events
      - options (Object): optional Greedy pipelet options
      
      @emits:
      - id      (Integer): starts at one, incremented for each throttled event
      - last     (Object): the value of the last source event
      - throttle (Object): the value from the throttle dataflow that triggered
        the event
      
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
      
      - Throttle window resize events with requestAnimationFrame(), discarding
        throttle values:
      
        ```javascript
        rs
          .$window_size()
          .throttle( rs.animation_frames() )
          .map( function( _ ) { return _.last } )
          .trace( 'resized' )
          .greedy()
        ;
        ```
      
      @description:
      If multiple values are received from upstream source in a single "add"
      operation, thr last value is kept, and all other values are discarded.
      
      Source events are throttled by throttle dataflow events and until the
      previous throttled event has completed its synchronous operation, i.e.
      when emit() has returned:
      
      ```
      source __ a _ b ________________ c _ d _ e _ f _ g _________________ h _______________
      
      throttle _________|___________|___________|___________|___________|___________|_______
      
      emit      _______ b _____________________ e _____________________ g _________ h ______
      
      emit returns ___________|_________________________________|______________|____________
      
                        ______                  ________________        _______
      busy _____________      __________________                ________       _____________
      ```
      
      This is an @@asynhronous, @@greedy, @@stateful, @@(adds-only) pipelet.
      
      On its throttle dataflow it is @@greedy and @@synchronous as it emits on
      throttle events.
      
      When fetched, throttle() will emit the last throttled value, if any.
  */
  function Throttle( throttle, options ) {
    var that  = this
      , state = []
      , id    = 0
      , idle  = 1
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
          idle = 0;
          
          state[ 0 ] = {
            id       : ++id,
            last     : last = that._last,
            throttle : values[ 0 ]
          };
          
          that.__emit_add( state );
          
          // Allow more source event to proceed, only after emit has returned
          // i.e. after downstream synchronous operations have completed
          idle = 1;
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
  
  /* --------------------------------------------------------------------------
      @pipelet throttle_last( throttle, options )
      
      @short Emit last received @@source @@value before throttle events,
      without throttle events
      
      @parameters:
      - throttle (Pipelet): adds-only pipelet emitting throttle events
      - options (Object): optional Greedy pipelet options
      
      @examples:
      
      - Throttle window resize events with requestAnimationFrame():
      
        ```javascript
        rs
          .$window_size()
          .throttle_last( rs.animation_frames() )
          .trace( 'resized' )
          .greedy()
        ;
        ```
      
      @description:
      Using the @@throttle() pipelet, only emit the last received value.
      
      This is an @@asynhronous, @@greedy, @@stateful, @@(adds-only) pipelet.
      
      On the throttle dataflow it is @@greedy and @@synchronous as it emits
      on throttle events.
  */
  rs
    .Compose( 'throttle_last', function( source, throttle, options ) {
      return source
        .throttle( throttle, options )
        
        .map( function( _ ) { return _.last }, options )
      ;
    } )
  ;
  
  de&&ug( 'module loaded' );
} ); // events.js
