/*  http.js
    
    ----
    
    Copyright (C) 2013, 2014, Connected Sets

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
"use strict";

( function( exports ) {
  var socketio = require( 'socket.io' );
  var uuid     = require( 'node-uuid' );
  
  var XS = require( '../pipelet.js' ).XS;
  
  require( '../socket_io_crossover.js' );
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Code       = XS.Code
    , Pipelet    = XS.Pipelet
    , Set        = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs socket_io_clients, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     http_servers.socket_io_clients( [ options ] )
     
     Associate a number of http servers to socket.io servers, emits socket.io
     clients for each socket.io client connection.
     
     Options:
       - remove_timeout : (Integer) in seconds, timeout to remove a connection after a
           disconnection, waiting for a reconnection. Default if 5 minutes.
       
       - no_minification: (Bolean) do not minify socket io client
       
       - no_etag        : (Bolean) do not generate etags for socket io client
       
       - no_gzip        : (Bolean) do not gzip socket io client
       
       - transports: (Array) defaults to [ 'websocket', 'xhr-polling' ] where each
           item is a transport name string, supported transports are:
             - 'websocket'
             - 'flashsocket'
             - 'htmlfile'
             - 'xhr-polling'
             - 'jsonp-polling'
             
           Check socket.io documentation for more details about these transports.
           
       - socket_io_log_level: (Integer) defaults to 1
  */
  function Socket_IO_Clients( options ) {
    // Emits connections which key is the connection "id"
    // 5 minutes defaut remove timeout
    options = extend( { remove_timeout: 5 * 60 }, options, { key: [ 'id' ] } );
    
    this._socket_io_servers = {};
    
    Set.call( this, [], options );
  }
  
  Set.Build( 'socket_io_clients', Socket_IO_Clients, {
    _add: function( servers ) {
      var that = this, socket_io_servers = this._socket_io_servers;
      
      for ( var i = -1, l = servers.length; ++i < l; ) {
        var server = servers[ i ];
        
        var address = server.ip_address + ':' + server.port;
        
        if ( socket_io_servers[ address ] ) {
          de&&ug( 'error, server add(), address ' + address + ' is aleady bound to a socket io server' )
          
          continue;
        }
        
        socket_io_servers[ address ] = start_server( address );
      }
      
      return this;
      
      function start_server( address ) {
        var u, options = that._options, connections = {};
        
        var io = socketio.listen( server.http_server );
        
        io.configure( function() {
          options.no_minification || io.enable( 'browser client minification' );
          options.no_etag         || io.enable( 'browser client etag' );
          options.no_gzip         || io.enable( 'browser client gzip' );
          
          io.set( 'log level'
            , options.socket_io_log_level === u ? 1 : options.socket_io_log_level
          );
          
          options.transports || ( options.transports = [ 'websocket', 'xhr-polling' ] );
          
          de&&ug( "io.configure(), transports: " + log.s( options.transports ) );
          
          io.set( 'transports', options.transports );
          
          io.set( 'authorization', function ( handshake, callback ) {
            de&&ug( 'socket.io server authorization' + log.s( handshake, null, '  ' ) );
            
            handshake.test_before_callback = Date.now();
            
            callback( null /* error */, true /* authorized */ );
            
            handshake.test_after_callback = Date.now();
          } );
        } );
        
        var socket_io_server = {
          connections: connections,
          
          server: io.sockets.on( 'connection', on_connection )
        };
        
        de&&ug( 'socket.io server bound to address ' + address );
        
        return socket_io_server;
        
        function on_connection( socket ) {
          de&&ug( 'socket_io_server(), received connection request, handshake: ' + log.s( socket.handshake, null, '  ' ) );
          
          var u, connection, disconnection_timeout;
          
          socket
            .on( 'disconnect'   , on_disconnect    )
            .on( 'xs_connection', on_xs_connection )
          ;
          
          return;
          
          function on_disconnect() {
            if ( connection ) {
              connection.socket.disconnect(); // force emited operations to be queued until reconnection
              
              var timeout = options.remove_timeout;
              
              de&&ug( 'socket_io_server(), connection ' + connection.id + ' disconnected' + ', remove timeout (seconds): ' + timeout );
              
              if ( timeout ) {
                disconnection_timeout = setTimeout( remove_connection, timeout * 1000 );
                
                update_connection( { state: 'disconnected' } );
              } else {
                remove_connection();
              }
            } else {
              de&&ug( 'socket_io_server(), non-active connection disconnected' );
            }
            
            function remove_connection() {
              de&&ug( 'socket_io_server(), connection ' + connection.id + ' removed' );
              
              Set.prototype._remove.call( that, [ connection ] );
              
              connection.socket.close();
              
              connection = disconnection_timeout = u;
            } // remove_connection()
          } // on_disconnect()
          
          function on_xs_connection( _connection ) {
            var u, id = _connection.id;
            
            if ( id ) {
              // Reconnection
              if ( connection = connections[ id ] ) {
                // We have a reference to this connection, allow reconnection
                de&&ug( 'socket_io_server(), accept xs_connection as a reconnection: ' + log.s( _connection ) );
                
                if ( disconnection_timeout ) {
                  clearTimeout( disconnection_timeout );
                  
                  disconnection_timeout = u;
                }
              } else {
                // Though this could be a valid connection, we do not have its reference
                // and must start a new connection
                de&&ug( 'socket_io_server(), connection id not found in xs_connection: ' + log.s( _connection ) );
              }
            } else {
              de&&ug( 'socket_io_server(), received xs_connection request: ' + log.s( _connection ) );
            }
            
            if ( connection ) {
              update_connection( { state: 'connected' } );
            } else {
              id = uuid.v1();
              
              connections[ id ] = connection = { id: id, state: 'connected', socket: new XS.Socket_IO_Crossover( socket, { name: id } ) };
              
              de&&ug( 'socket_io_server(), created new connection, id: ' + id );
              
              Set.prototype._add.call( that, [ connection ] );
            }
            
            // Acknowledge connection request, providing connection id
            socket.emit( 'xs_connection', { id: id, state: 'connected' } );
            
            connection.socket.connect(); // allow xs socket crossover to emit operations
          } // on_xs_connection()
          
          function update_connection( attributes ) {
            var updated = extend( {}, connection, attributes );
            
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
          de&&ug( 'remove server at address ' + address );
          
          delete socket_io_servers[ address ];
          
          continue;
        }
        
        de&&ug( 'error: remove() no server at address ' + address );
      }
      
      return this;
    } // _remove()
  } ); // Socket_IO_Clients instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Socket_IO_Clients' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // http.js
