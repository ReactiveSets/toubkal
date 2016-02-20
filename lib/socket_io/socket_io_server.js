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
  
  var RS    = rs.RS
    , Set   = RS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'socket_io_server' );
  
  /* --------------------------------------------------------------------------
     socket_io_state_changes()
  */
  var state_change_id = 0
    , state_changes_name = 'socket_io_state_changes'
    , state_changes = rs
        .map(
          function( value ) {
            return {
              flow      : state_changes_name,
              id        : ++state_change_id,
              timestamp : timestamp_string(),
              address   : value.address,
              connected : value.state == 'connected',
              state     : value.state
            };
          },
          
          { name: state_changes_name }
        )
  ;
  
  rs.Compose( state_changes_name, { singleton: true }, function( __, options ) {
      return state_changes
        .set( [], { name: options.name } )
      ;
    } ) // socket_io_state_changes()
    
    .socket_io_state_changes()
  ;
  
  /* --------------------------------------------------------------------------
      socket_io_server( [ options ] )
      
      Connects to a server set using socket_io_clients()
      
      This is an assynchronous, stateless, pipelet.
      
      This is a multiton which singletons are indexed by options.location, i.e.
      there is one instance per location. Other options can only be set while
      creating the instance, at the first invocation of socket_io_server()
      
      Parameters:
      - options (Object): options for Socket_IO_Crossover()
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
  */
  var singletons = {};
  
  function Socket_IO_Server( options ) {
    // This is a multiton, one instance per location
    var address = ( options && options.location ) || ( location.protocol + '//' + location.host )
      , that    = singletons[ address ]
    ;
    
    if ( that ) return that; // return already running singleton
    
    // Register new singleton instance
    that = singletons[ this._address = address ] = this;
    
    var connection = { state: 'disconnected' }, previous_id;
    
    de&&ug( 'connecting to ' + address );
    
    that._disconnect( connection.state );
    
    var socket = io.connect( address, { transports: options.transports || [ 'xhr-polling', 'polling', 'websocket' ] } )
      .on( 'connect', function() {
        de&&ug( 'received connect' );
        
        connection.state = 'connected';
        
        socket.emit( 'rs_connection', connection );
        
        that._connect( connection.state );
      } )
      
      .on( 'disconnect', function() {
        de&&ug( 'received disconnect' );
        
        that._disconnect( connection.state = 'disconnected' );
      } )
      
      .on( 'reconnect', function() {
        de&&ug( 'received reconnect, previous connection id:', previous_id );
      } )
      
      .on( 'rs_connection', function( _connection ) {
        // Received after 'connect' on a reconnection.
        de&&ug( 'received rs_connection, connection:', _connection, ', previous connection id:', previous_id );
        
        var _id = _connection.id;
        
        if ( previous_id ) {
          if ( previous_id == _id ) {
            de&&ug( 'reconnection with the same id' ); 
          } else {
            de&&ug( 'reconnection with a new id' );
            
            that._resubmit_query(); // this will only get us new operations, not lost data since last session
            
            /*
                ToDo: re-fetch values through a unique multi-flow cache that will remove duplicates and output changes...
                
                We should also consider an optimization to fetch some terms partially, when a strict order is used for
                retrieved values.
                
                Alternatively we could send a stale signal downstream, allowing possible caches to fetch according to
                their own caching pollicies.
                
                Possible stale policies:
                - discard all data and fetch using current query (clear() + fetch())
                - do nothing (could be appropriate for a form)
                - fetch using current query, ignore duplicates (unique() would do this)
                - fetch operations from a given Lamport clock
                - fetch data from a known ordered attribute
            */
          }
        }
        
        connection = _connection;
        previous_id = _id;
      } )
    ;
    
    Socket_IO_Crossover.call( that, socket, options );
  } // Socket_IO_Server()
  
  Socket_IO_Crossover.Build( 'socket_io_server', Socket_IO_Server, function( Super ) {
    return {
      _connect: function( state ) {
        add_state_change( this, state );
        
        Super.connect.call( this );
      },
      
      _disconnect: function( state ) {
        add_state_change( this, state );
        
        Super.disconnect.call( this );
      }
    };
    
    function add_state_change( that, state ) {
      state_changes._input.add( [ {
        address  : that._address,
        state    : state
      } ] );
    } // add_state_change()
  } ); // socket_io_server()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Socket_IO_Server': Socket_IO_Server } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // socket_io_server.js
