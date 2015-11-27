/*  socket_io_clients.js
    
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
'use strict';

var socketio            = require( 'socket.io' )
  , uuid                = require( 'node-uuid' )
  , rs                  = require( '../core/pipelet.js' )
  , Socket_IO_Crossover = require( './socket_io_crossover.js' )
  , express_session     = require( 'express-session' )
  
  , RS                  = rs.RS
  , log                 = RS.log.bind( null, 'socket_io_clients' )
  , extend              = RS.extend
  , Set                 = RS.Set
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

/* --------------------------------------------------------------------------
   http_servers.socket_io_clients( [ options ] )
   
   Associate a number of http servers to socket.io servers, emits socket.io
   clients for each socket.io client connection.
   
   Options:
   - remove_timeout (Integer): in seconds, timeout to remove a connection
       after a disconnection, waiting for a reconnection. Default is 1
       minute.
   
   - no_minification (Bolean): do not minify socket io client
   
   - no_etag         (Bolean): do not generate etags for socket io client
   
   - no_gzip         (Bolean): do not gzip socket io client
   
   - transports       (Array): defaults to [ 'websocket', 'xhr-polling' ]
       where each item is a transport name string, supported transports are:
         - 'websocket'
         - 'flashsocket'
         - 'htmlfile'
         - 'xhr-polling'
         - 'jsonp-polling'
       
       Check socket.io documentation for more details about these transports.
       
   - socket_io_log_level (Integer): defaults to 1
   
   - session_options (Object): to initialize expess-session middleware and
       retrieve session information and passport user id.
*/
function Socket_IO_Clients( options ) {
  // Emits connections which key is the connection "id"
  // 1 minute default remove timeout
  options = extend( { remove_timeout: 1 * 60 }, options, { key: [ 'id' ] } );
  
  this._socket_io_servers = {};
  
  if ( options.session_options ) {
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
      var u, options = that._options, connections = {};
      
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
            , options.socket_io_log_level === u ? 1 : options.socket_io_log_level
          );
          
          options.transports || ( options.transports = [ 'websocket', 'xhr-polling' ] );
          
          de&&ug( 'io.configure(), transports', options.transports );
          
          io.set( 'transports', options.transports );
          
          io.set( 'authorization', function ( handshake, callback ) {
            get_session( handshake );
            
            // Authorize right-away, allow session fetching while handshake completes
            callback( null /* error */, true /* authorized */ );
          } );
        } else { // v1.x
          // client is delivered uncompressed with no cache, no minification
          // to get optimized client use socket.io CDN or use project build chain
          
          io.use( function( socket, callback ) {
            get_session( socket.request );
            
            // Authorize right-away, allow session fetching while handshake completes
            callback();
          } )
        }
        
        function get_session( handshake, callback ) {
          var name = 'get_session:';
          
          de&&ug( name, handshake.headers );
          
          if ( that._express_session ) {
            var response = {};
            
            that._express_session( handshake, response, function( error ) {
              if ( error ) {
                log( name, 'error', error );
                
                return;
              }
              
              var session = handshake.session;
              
              if ( session ) {
                var passport = session.passport
                  , user_id  = passport && passport.user // ToDo: this is passport-specific, use passport-session middleware
                ;
                
                handshake.user_id = user_id;
              }
              
              de&&ug( name, 'session', session, '- session id:', handshake.sessionID, '- response:', response, '- user_id', user_id );
            } );
          }
        } // get_session()
      } // configure()
      
      var socket_io_server = {
        connections: connections,
        
        server: io.sockets.on( 'connection', on_connection )
      };
      
      de&&ug( 'socket.io server bound to address ' + address );
      
      return socket_io_server;
      
      function on_connection( socket ) {
        de&&ug( 'on_connection(), received connection request, handshake:', socket.handshake );
        
        // ToDo: attempt to retrieve passport user id from session
        
        var u, connection, disconnection_timeout;
        
        socket
          .on( 'disconnect'   , on_disconnect    )
          .on( 'rs_connection', on_rs_connection )
        ;
        
        return;
        
        function on_disconnect() {
          if ( connection ) {
            connection.socket.disconnect(); // force emited operations to be queued until reconnection
            
            var timeout = options.remove_timeout;
            
            de&&ug( get_name() + 'connection ' + connection.id + ' disconnected' + ', remove timeout (seconds): ' + timeout );
            
            if ( timeout ) {
              // ToDo: evaluate possibility of a DOS attack abusing disconnection timeout
              disconnection_timeout = setTimeout( remove_connection, timeout * 1000 );
              
              update_connection( { state: 'disconnected' } );
            } else {
              remove_connection();
            }
          } else {
            de&&ug( get_name() + 'non-active connection disconnected' );
          }
          
          function remove_connection() {
            de&&ug( get_name() + 'connection ' + connection.id + ' removed' );
            
            Set.prototype._remove.call( that, [ connection ] );
            
            connection.socket.close();
            
            connection = disconnection_timeout = u;
          } // remove_connection()
          
          function get_name() { return 'on_disconnect(), ' }
        } // on_disconnect()
        
        function on_rs_connection( _connection ) {
          var u, id = _connection.id;
          
          if ( id ) {
            // Reconnection
            if ( connection = connections[ id ] ) {
              // We have a reference to this connection, allow reconnection
              de&&ug( get_name() + 'accept rs_connection as a reconnection:', _connection );
              
              if ( disconnection_timeout ) {
                clearTimeout( disconnection_timeout );
                
                disconnection_timeout = u;
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
            update_connection( { state: 'connected' } );
          } else {
            id = uuid.v1();
            
            connections[ id ]
              = connection
              = {   id: id
                  , state: 'connected'
                  , socket: new Socket_IO_Crossover( socket, { name: id } )
                }
            ;
            
            de&&ug( get_name() + 'created new connection, id: ' + id );
            
            Set.prototype._add.call( that, [ connection ] );
          }
          
          // Acknowledge connection request, providing connection id
          socket.emit( 'rs_connection', { id: id, state: 'connected' } );
          
          connection.socket.connect(); // allow rs socket crossover to emit operations
          
          function get_name() { return 'on_rs_connection(), ' }
        } // on_rs_connection()
        
        function update_connection( attributes ) {
          var updated = extend( {}, connection, attributes );
          
          // ToDo: implement update
          that._transaction( 2, {}, function( t ) {
            Set.prototype._remove_value.call( that, t, connection );
            Set.prototype._add_value   .call( that, t, updated    );
          } );
          
          connection = updated;
        } // update_connection()
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
