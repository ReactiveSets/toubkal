/*  socket_io_clients.js
    
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
'use strict';

var socketio            = require( 'socket.io' )
  , uuid                = require( 'node-uuid' )
  , rs                  = require( '../core/pipelet.js' )
  , Socket_IO_Crossover = require( './socket_io_crossover.js' )
  , express_session     = require( 'express-session' )
  
  , RS                  = rs.RS
  , log                 = RS.log.bind( null, 'socket_io_clients' )
  , extend              = RS.extend
  , extend_2            = extend._2
  , Set                 = RS.Set
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

/* ----------------------------------------------------------------------------
    @pipelet socket_io_clients( options )
    
    @short Emits clients' connnections, using [socket.io](http://socket.io/)
    
    @parameters
    - options (Object): pipelet options:
      - remove_timeout (Integer): in seconds, timeout to remove a connection
        after a disconnection, waiting for a reconnection. Default is 1
        minute.
      
      - session_options (Object): [options for expess-session](https://github.com/expressjs/session#sessionoptions)
        middleware and to retrieve session identification to emit client
        "sid" attribute.
      
      - Additional options for socket.io version 0.9.16, ignored in version 1.x+:
        - no_minification (Boolean): do not minify socket io client
        
        - no_etag         (Boolean): do not generate etags for socket io client
        
        - no_gzip         (Boolean): do not gzip socket io client
        
        - transports       (Array): defaults to ```[ 'websocket', 'xhr-polling' ]```
            where each item is a transport name string, supported transports are:
            - ```"websocket"```
            - ```"flashsocket"```
            - ```"htmlfile"```
            - ```"xhr-polling"```
            - ```"jsonp-polling"```
            
            Check socket.io documentation for more details about these transports.
            
        - socket_io_log_level (Integer): defaults to 1
    
    @emits
    Clients' connections:
    - id (String): unique client identifier
    - state (String): ```"connected"```, or ```"disconnected"```
    - socket (@@class:Socket_IO_Crossover\): to communicate with the remote
      client. This is a reference to the actual Socket_IO_Crossover instance,
      so be careful to not mutate it, or keep references beyond disconnection
      that may cause memory leaks. Signifcant attributes are:
      - socket (Object): [socket.io Socket](http://socket.io/docs/server-api/#socket)
        with the additional attribute:
        - sid (String): if options "session_options" is provided
    
    @examples
    - A basic http server for socket_io_clients() testing purposes
    ```javascript
      var servers = rs
        .set( [ { id: 1, ip_address: '0.0.0.0', port: 8080 } ] )
        
        .http_servers()
      ;
      
      servers.http_listen();
    ```
    
    - A basic database with one dataflow for testing purposes
    ```javascript
      rs
        .Singleton( 'database', function( source, options ) {
          return source
            // subscribe to change events which flow attribute is "chat_messages"
            .flow( 'chat_messages', { key: [ 'id' ] } ) // force key, regardless of source's
            
            // in-memore store, indexed by chat messages "id" attribute
            .set()
            
            // optimize to fetch the above set only for subscribers requesting flow attribute "chat_messages"
            .delivers( 'chat_messages' )
          ;
        } )
    ```
    
    - Serving chat messages to all connected socket.io clients to a server
    ```javascript
      rs
        .database()
        
        .trace( 'database dataflow to clients' )
        
        .dispatch( servers.socket_io_clients(), client_composition )
        
        .trace( 'database change events from clients' )
        
        .database()
      ;
      
      function client_composition( source, options ) {
        var client = this.socket
          , sid    = client.socket.sid // if "session_options" is used
        ;
        
        return source
          // Add read-authorizations filters here, limits clients subscriptions
          .flow( 'chat_messages' ) // only allow chat messages to clients
          
          .through( client, options )
          
          // Add write-authorizations filters here, discards unauthorized changes
          .flow( 'chat_messages' ) // only allow chat messages from clients
        ;
      }
    ```
    
    @description
    Associate a number of http servers to socket.io servers, emits socket.io
    clients for each socket.io client connection.
    
    Tested with socket.io version 0.9.16 and 1.3.7+.
    
    This is an @@asynchronous, @@stateless, @@greedy pipelet.
    
    ### See Also
    - Pipelet http_servers()
    - Pipelet http_listen()
    - Pipelet set()
    - Pipelet flow()
    - Pipelet delivers()
    - Pipelet dispatch()
    - Method @@method:Pipelet..through()
    - Method @@method:Pipelet..Singleton()
    - Pipelet trace()
*/
function Socket_IO_Clients( options ) {
  // Emits connections which key is the connection "id"
  // 1 minute default remove timeout
  options = extend( { remove_timeout: 1 * 60 }, options, { key: [ 'id' ] } );
  
  this._socket_io_servers = {};
  
  if ( options.session_options ) {
    // ToDo: we only need session id, not the session itself, use cookie parser from express session to get session id
    this._express_session = express_session( options.session_options );
  } else {
    this._express_session = null;
  }
  
  Set.call( this, [], options );
} // Socket_IO_Clients()

Set.Build( 'socket_io_clients', Socket_IO_Clients, {
  _add: function( servers ) {
    var that = this, socket_io_servers = this._socket_io_servers;
    
    for ( var i = -1, l = servers.length; ++i < l; ) {
      var server = servers[ i ];
      
      var address = server.ip_address + ':' + server.port;
      
      if ( socket_io_servers[ address ] ) {
        // ToDo: emit error
        log( '_add(), error, server add(), address ' + address + ' is aleady bound to a socket io server' )
        
        continue;
      }
      
      socket_io_servers[ address ] = start_server( address );
    }
    
    return this;
    
    function start_server( address ) {
      var options                     = that._options
        , connections                 = {}
        , connections_previous_values = {}
      ;
      
      var io = socketio.listen( server.http_server );
      
      if ( typeof io.configure == 'function' ) {
        io.configure( configure );
      } else {
        configure();
      }
      
      function configure() {
        if ( typeof io.enable == 'function' ) { // v0.9.16
          options.no_minification || io.enable( 'browser client minification' );
          options.no_etag         || io.enable( 'browser client etag' );
          options.no_gzip         || io.enable( 'browser client gzip' );
          
          io.set( 'log level'
            , options.socket_io_log_level == null ? 1 : options.socket_io_log_level
          );
          
          options.transports || ( options.transports = [ 'websocket', 'xhr-polling' ] );
          
          de&&ug( 'io.configure(), transports', options.transports );
          
          io.set( 'transports', options.transports );
          
          io.set( 'authorization', function ( handshake, callback ) {
            get_session_id( handshake, function() {} );
            
            // Authorize right-away, allow session fetching while handshake completes
            callback( null /* error */, true /* authorized */ );
          } );
        } else { // v1.x
          // client is delivered uncompressed with no cache, no minification
          // to get optimized client use socket.io CDN or use project build chain
          
          io.use( function( socket, next ) {
            get_session_id( socket.request, function( error, sid ) {
              error || ( socket.sid = sid );
            } );
            
            // Authorize right-away, allow session fetching while handshake completes
            next();
          } )
        }
        
        function get_session_id( request, next ) {
          if ( that._express_session ) {
            var name = 'get_session_id:';
            
            that._express_session( request, {}, function( error ) {
              if ( error ) {
                // ToDo: emit error in errors() dataflow
                log( name, 'error', error );
                
                return next( error );
              }
              
              var sid = request.sessionID;
              
              de&&ug( name, 'sid:', sid );
              
              next( null, sid );
            } );
          }
        } // get_session_id()
      } // configure()
      
      var socket_io_server = {
        connections: connections,
        
        server: io.sockets.on( 'connection', on_connection )
      };
      
      de&&ug( 'socket.io server bound to address ' + address );
      
      return socket_io_server;
      
      function on_connection( socket ) {
        var handshake = socket.handshake;
        
        de&&ug( 'on_connection(), received connection request, handshake:', handshake );
        
        if ( that._express_session ) {
          socket.sid || ( socket.sid = handshake && handshake.sessionID );
        }
        
        var connection = null;
        
        socket
          .on( 'disconnect'   , on_disconnect    )
          .on( 'rs_connection', on_rs_connection )
        ;
        
        return;
        
        function on_disconnect() {
          if( connection ) {
            var timeout = options.remove_timeout
              , count   = --connection.count
            ;
            
            de&&ug( get_name() + 'connection ' + connection.id + ' disconnected' + ( count ? ', remains ' + count + ' sockets using this connection' : ', remove timeout (seconds): ' + timeout ) );
            
            if( count ) return;
            
            connection.socket.disconnect(); // force emited operations to be queued until reconnection
            
            if( timeout ) {
              var timeout_object = connection.timeout_object;
              
              // ToDo: evaluate possibility of a DOS attack abusing disconnection timeout
              if( timeout_object ) {
                de&&ug( get_name() + 'clear previous timeout object:', timeout_object );
                
                clearTimeout( timeout_object );
              }
              
              connection.timeout_object = timeout_object = setTimeout( remove_connection, timeout * 1000 );
              
              de&&ug( get_name() + 'new setTimeout( remove_connection ) object:', timeout_object );
              
              update_connection( { state: 'disconnected' } );
            } else {
              remove_connection();
            }
          } else {
            // ToDo: send to error dataflow
            log( get_name() + 'non-active connection disconnected' );
          }
          
          function remove_connection() {
            var id = connection.id;
            
            de&&ug( get_name() + 'connection ' + id + ' removed' );
            
            connection.timeout_object = null;
            
            connection.socket.close();
            
            delete connections[ id ];
            
            connection = null;
            
            // Get previously emitted value to emit remove
            var removed_value = connections_previous_values[ id ];
            
            delete connections_previous_values[ id ];
            
            Set.prototype._remove.call( that, [ removed_value ], { no_fetch: true } ); // do not fetch, socket is closed
          } // remove_connection()
          
          function get_name() { return 'on_disconnect(), ' }
        } // on_disconnect()
        
        function on_rs_connection( _connection ) {
          var id = _connection.id;
          
          if ( id ) {
            // Reconnection
            if ( connection = connections[ id ] ) {
              var timeout_object = connection.timeout_object;
              
              // We have a reference to this connection, allow reconnection
              de&&ug( get_name() + 'accept rs_connection as a reconnection:', _connection );
              
              if ( timeout_object ) {
                de&&ug( get_name() + 'clearTimeout, timeout_object:', timeout_object );
                
                clearTimeout( timeout_object );
                
                connection.timeout_object = null;
              }
            } else {
              // Though this could be a valid connection, we do not have its reference
              // and must start a new connection
              de&&ug( get_name() + 'connection id not found in rs_connection:', _connection );
            }
          } else {
            de&&ug( get_name() + 'received rs_connection request:', _connection );
          }
          
          if ( connection ) {
            ++connection.count;
            
            // disconnect and terminate previous socket
            connection.socket.socket.disconnect();
            
            // replace previous socket with new socket to allow to emit and receive operations
            connection.socket._init_socket( socket );
            
            update_connection( { state: 'connected' } );
          } else {
            id = uuid.v1();
            
            connections[ id ]
              = connection
              = {
                  id            : id,
                  state         : 'connected',
                  count         : 1,
                  timeout_object: null,
                  socket        : new Socket_IO_Crossover( socket, { name: id } ).set_namespace( that )
                }
            ;
            
            connections_previous_values[ id ] = extend_2( {}, connection );
            
            de&&ug( get_name() + 'created new connection, id: ' + id );
            
            Set.prototype._add.call( that, [ copy_connection() ] ); // ToDo: this may be too early before sending rs_connection and connecting socket
          }
          
          // Acknowledge connection request, providing connection id
          socket.emit( 'rs_connection', { id: id, state: 'connected' } );
          
          connection.socket.connect(); // allow to emit and emit queued operations while disconnected
          
          function get_name() { return 'on_rs_connection(), ' }
        } // on_rs_connection()
        
        function update_connection( attributes ) {
          extend_2( connection, attributes );
          
          var id             = connection.id
            , previous_value = connections_previous_values[ id ]
            , update         = [ previous_value, copy_connection() ]
          ;
          
          de&&ug( 'update_connection(), update:', update );
          
          that._update( [ update ] );
        } // update_connection()
        
        function copy_connection() {
          // Keep a shallow copy of connection value to emit downstream
          // !!! Note that this will not prevent Socket_IO_Crossover instance and it's socket.io instance to change or be altered downstream
          return connections_previous_values[ connection.id ] = extend_2( {}, connection );
        } // copy_connection()
      } // on connection()
    } // start_server()
  }, // _add()
  
  _remove: function( servers ) {
    var socket_io_servers = this._socket_io_servers;
    
    for ( var i = -1, l = servers.length; ++i < l; ) {
      var server = servers[ i ];
      
      var address = server.ip_address + ':' + server.port;
      
      if ( socket_io_servers[ address ] ) {
        de&&ug( '_remove() server at address ' + address );
        
        delete socket_io_servers[ address ];
        
        continue;
      }
      
      // ToDo: emit error
      log( 'error: remove() no server at address ' + address );
    }
    
    return this;
  } // _remove()
} ); // Socket_IO_Clients instance methods

/* --------------------------------------------------------------------------
   module exports
*/
RS.add_exports( { 'Socket_IO_Clients': Socket_IO_Clients } );

de&&ug( "module loaded" );

module.exports = rs;

// socket_io_clients.js
