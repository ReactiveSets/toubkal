/*  socket_io_server.js
    
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
!function() {
  if ( this.undefine && ! this.io ) {
    var that = this;
    
    this.io = { connect: function() {
      throw new Error( 'Missing <script src="/socket.io/socket.io.js"></script> before loading socket_io_server.js' );
    } };
  }
}();

( this.undefine || require( 'undefine' )( module, require ) )()( 'socket_io_server',
[ [ 'io', 'socket.io-client' ], '../core/transforms', './socket_io_crossover', '../util/timestamp_string' ],

function( io, rs, Socket_IO_Crossover, timestamp_string ) {
  'use strict';
  
  var RS  = rs.RS
    , Set = RS.Set
    , log = RS.log.bind( null, 'socket_io_server' )
    , ug  = log
    , de  = false
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet socket_io_state_changes( options )
      
      @short Socket.io connections state changes
      
      @parameters
      - options (Object):
        - name (String): debugging name for set of state changes
      
      @emits:
      - flow (String): ```"socket_io_state_changes"```
      - id (Number): unique id for each state change
      - timestamp (String): of event
      - address (String): server address
      
      - connected (Boolean):
        - ```true``` if connected at that timestamp,
        - ```false``` otherwise
      
      - same_id (Boolean):
        - ```true```: on (soft) reconnection with the same connection id, no
          resynchronization of caches is required
        - ```false```: on (hard) reconnection with a new id, requires
          resynchronization of caches
        - ```undefined```: on initial connection and disconnections
      
      - state (String): calculated from **connected** and **same_id**,
        one of:
        - ```"disconnected"```: when ```connected == false```
        - ```"connected"```: when ```connected == true```
        - ```"synchronizing"```: when ```same_id === false```
      
      @examples
      - Resynchronize a cache of ```"users"``` on reconnection with a new id:
      ```javascript
        var synchronize = rs
          
          // Get dataflow of state changes
          .socket_io_state_changes()
          
          // Get only state changes for which same_id is false
          .filter( [ { same_id: false } ] )
          
          // Display hard reconnection events in console.log()
          .trace( 'hard reconnection' )
        ;
        
        rs
          // Connect to server
          .socket_io_server()
          
          // Cache data from subscriptions bellow, resynchronize on hard reconnections
          .cache( { synchronize: synchronize } )
          
          // subscribe to 'users' dataflow
          .flow( 'users' )
          
          // display 'users' events
          .trace( 'users' )
          
          // subscribe and fetch everything
          .greedy()
        ;
      ```
      
      @description
      This is a client pipelet that can be used for:
      - monitoring state changes
      - display connection status to end-user
      - resynchronize caches on hard reconnections where the server has lost
        the context of the connection because the disconnection was too
        long.
      
      State changes are emitted by pipelet socket_io_server() on connection
      and reconnection events.
      
      This is a @@synchronous, @@greedy, @@stateful, @@adds-only @@(singleton).
      
      ### See Also
      - Pipelet socket_io_server()
      - Pipelet cache()
      - Pipelet filter()
      - Pipelet flow()
      - Pipelet trace()
      - Pipelet greedy()
  */
  var state_change_id = 0
    , state_changes_name = 'socket_io_state_changes'
    , state_changes = rs
        .map(
          function( v ) {
            var same_id   = v.same_id
              , connected = v.connected
            ;
            
            return {
              flow      : state_changes_name,
              id        : ++state_change_id,
              timestamp : timestamp_string(),
              address   : v.address,
              connected : connected,
              same_id   : same_id,
              state     : same_id === false
                        ? 'synchronizing'
                        : connected ? 'connected' : 'disconnected'
            };
          },
          
          { name: state_changes_name }
        )
  ;
  
  rs.Singleton( state_changes_name, function( source, options ) {
      return source
        .through( state_changes )
        
        .set( [], { name: options.name } )
      ;
    } ) // socket_io_state_changes()
    
    .socket_io_state_changes()
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet socket_io_server( options )
      
      @short Connects to a server built using pipelet socket_io_clients()
      
      @parameters
      - options (Object): options for @@class:Socket_IO_Crossover()
        - location (String):
          Default is location.protocol + '//' + location.host
          
        - transports (Array of Strings):
          Default to [ 'xhr-polling', 'polling', 'websocket' ].
          
          The order of transports is relevant, e.g. if 'websocket' is
          specified first, 'polling' is ignored.
          
          Supported transports are:
          - 'websocket'
          - 'xhr-polling': deprecated use with socket.io version 0.9.16
          - 'polling'    : equivalent to 'xhr-polling' for version 1.x
      
      @examples
      - Get the ```"sales"``` dataflow from server, trace to console.log
      all events:
        ```javascript
          rs
            // connect to server
            .socket_io_server()
            
            // subscribes to the sales dataflow
            .flow( 'sales' )
            
            // trace sales events to console.log()
            .trace( 'sales' )
            
            // subscribe and fetch all
            .greedy()
          ;
        ```
      
      - Same thing with cache resynchronization on hard reconnections:
        ```javascript
          var synchronize = rs
            .socket_io_state_changes()
            
            .filter( [ { same_id: false } ] )
          ;
          
          rs
            // connect to server
            .socket_io_server()
            
            // subscribes to the sales dataflow
            .flow( 'sales' )
            
            // cache sales, rynsynchronized on hard reconnections
            .cache( { synchronize: synchronize } )
            
            // trace events to console.log()
            .trace()
            
            // subscribe and fetch all
            .greedy()
          ;
        ```
      
      @description
      This is a client pipelet to connect to a Toubkal server over
      socket.io.
      
      This is an @@asynchronous, @@stateless, @@lazy @@(multiton).
      
      Singletons are indexed by options.location, i.e. there is one
      instance per location. Other options can only be set while
      creating each instance, at the first invocation of socket_io_server()
      
      ### See Also
      - Pipelet socket_io_state_changes()
      - Pipelet socket_io_clients()
      - Pipelet cache()
      - Class @@class:Socket_IO_Crossover()
      - Pipelet filter()
      - Pipelet flow()
      - Pipelet trace()
      - Pipelet greedy()
  */
  var singletons = {};
  
  function Socket_IO_Server( options ) {
    // This is a multiton, one instance per location
    var address     = ( options && options.location ) || ( location.protocol + '//' + location.host )
      , that        = singletons[ address ]
      , previous_id
    ;
    
    if ( that ) return that; // return already running singleton
    
    that = this;
    
    // Register new singleton instance
    singletons[ that._address = address ] = that;
    
    de&&ug( 'connecting to ' + address );
    
    var socket = io.connect( address, { transports: options.transports || [ 'xhr-polling', 'polling', 'websocket' ] } )
      .on( 'connect', function() { // also emitted on reconnections
        de&&ug( 'received connect' );
        
        that._tx_connection( { id: previous_id } );
        
        // If this is a reconnection, wait for "rs_connection" from server to connect
        if( ! previous_id ) {
          that._connect();
          
          add_state_change( that, true /* connected */ );
        }
      } )
      
      .on( 'disconnect', function() {
        de&&ug( 'received disconnect' );
        
        that._disconnect();
        
        add_state_change( that, false /* connected */ );
      } )
      
      /*
      // We don't need the reconnect event for now as we always receive a connect event on reconnections as well
      // The reconnect event happens before connect but we don't care about speed on reconnections
      // Is the state of the connection already good enough to send, we don't know because documentation does
      // say much about the state of connection on the reconnect event
      // So, to avoid potential issues, we ignore this event for now
      .on( 'reconnect', function() {
        de&&ug( 'received reconnect, previous connection id:', previous_id );
      } )
      */
      
      .on( 'rs_connection', function( rs_connection ) {
        // Server is sending its last_tx position and the connection id
        de&&ug( 'received "rs_connection", connection:', rs_connection, ', previous connection id:', previous_id );
        
        // ToDo: check rs_connection.protocol_version
        
        var id      = rs_connection.id
          , same_id = previous_id == id
        ;
        
        if ( previous_id ) {
          de&&ug( 'reconnection with ' + ( same_id ? 'the same' : 'a new' ) + ' id' );
          
          // If this is a hard-reconnection, cleanup sending queue and resubmit queries
          same_id || that._resubmit_query(); // this will allow to receive operations from previous queries
          
          /*
            Using socket_io_state_changes(), on same_id == false, caches
            can be resynchronized by:
            - fetching current state on server
            - fetching current content of cache
            - diffing server and chache content
            - apply differences to cache
            - this can be implemented using:
              ```javascript
                var synchronize = rs
                  .socket_io_state_changes()
                  
                  .filter( [ { same_id: false } ] )
                ;
                
                rs.socket_io_server()
                  .flow( 'users' )
                  
                  .cache( { synchronize: synchronize } )
                  // ..
                ;
              ```
            
            Other synchronizations strategies can be implemented depending
            on the type, size and utilization of source sets.
          */
          
          that._connect();
          
          add_state_change( that, true /* connected */, same_id );
        }
        
        previous_id = id;
      } )
    ;
    
    Socket_IO_Crossover.call( that, socket, options );
    
    // Emit disconnected state change for this socket
    add_state_change( that, false /* connected */ );
  } // Socket_IO_Server()
  
  Socket_IO_Crossover.Build( 'socket_io_server', Socket_IO_Server );
  
  function add_state_change( that, connected, same_id ) {
    state_changes._add( [ {
      address  : that._address,
      connected: connected,
      same_id  : same_id
    } ] );
  } // add_state_change()
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // socket_io_server.js
