/*  http.js
    
    ----
    
    Copyright (C) 2013, Connected Sets

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
  var http     = require( 'http'      );
  var https    = require( 'https'     );
  var url      = require( 'url'       );
  var mime     = require( 'mime'      );
  var zlib     = require( 'zlib'      );
  var crypto   = require( 'crypto'    );
  var socketio = require( 'socket.io' );
  var uuid     = require( 'node-uuid' );
  
  var XS = require( '../pipelet.js' ).XS;
  
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
    log( "xs http, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     HTTP_Server_Handler()
  */
  function HTTP_Server_Handler() {
    var that = this;
    
    this.listener = listener;
    
    return this;
    
    function listener( request, response ) {
      that.handler.call( this, request, response );
    }
  } // HTTP_Server_Handler()
  
  extend( HTTP_Server_Handler.prototype, {
    handler: function( request, response ) {
      de&&ug( 'HTTP_Server_Handler.handler(), url: ' + request.url );
      
      response.writeHead( 200 );
      response.end( '<p>Hello, world</p>' );
    },
    
    set: function( handler ) {
      this.handler = handler;
      
      return this;
    }
  } );
  
  /* -------------------------------------------------------------------------------------------
     end_points.http_servers()
     
     Provides a strean of http servers listening in ip address and port provided by each
     endpoints.
     
     Example:
       xs.set( [ { id: 1, ip_address: '0.0.0.0', port: 80 } ] ).http_server()
  */
  function HTTP_Servers( options ) {
    Set.call( this, extend( {}, options, { key: [ 'ip_address', 'port' ] } ) );
    
    return this;
  } // HTTP_Servers()
  
  Set.build( 'http_servers', HTTP_Servers, {
    add: function( end_points ) {
      var servers = [];
      
      for ( var i = -1; ++i < end_points.length; ) {
        var end_point  = end_points[ i ]
          , ip_address = end_point.ip_address || '127.0.0.1'
          , port       = end_point.port || 7001
          , handler    = new HTTP_Server_Handler()
          , server
        ;
        
        if ( end_point.key && end_point.cert ) {
          server = https.createServer( { key: end_point.key, cert: end_point.cert }, handler.listener );
        } else if ( end_point.pfx )  {
          server = https.createServer( { pfx: end_point.pfx                       }, handler.listener );
        } else {
          server = http.createServer(                                                handler.listener );
        }
        
        server.on( 'error', function( e ) {
          de&&ug( 'HTTP server error: ' + e );
        } );
        
        server.listen( port, ip_address );
        
        de&&ug( 'HTTP_Servers.add(): http server listening to ' + ip_address + ':' + port );
        
        servers.push( extend( {}, end_point, {
          ip_address: ip_address,
          
          port: port,
          
          handler: handler,
          
          server: server
        } ) );
      }
      
      return Set.prototype.add.call( this, servers );
    }, // add()
    
    remove: function( end_points ) {
      for ( var i = -1; ++i < end_points.length; ) {
        end_points[ i ].server.close();
      }
      
      return Set.prototype.remove.call( this, end_points );
    }, // remove()
    
    update: function( updates ) {
      var updates = Pipelet.split_updates( updates );
      
      this.remove( updates.removes );
      this.add   ( updates.adds    );
      
      return this;
    }, // update()
  } ); // HTTP_Servers instance methods
  
  /* --------------------------------------------------------------------------
     Socket_IO_Socket( socket [, options] )
  */
  function Socket_IO_Socket( socket, options ) {
    var that = this;
    
    this.socket = socket
      
      .on( 'xs_fetch', function( data ) {
        de&&ug( 'socket_io_socket(), received xs_fetch: ' + log.s( data ) );
        
        var id = data.id;
        
        that.fetch( function( values, no_more ) {
          that.send( 'xs_fetched_values', { id: id, values: values, no_more: no_more } );
        }, data.options )
      } )
      
      .on( 'xs_fetched_values', function( data ) {
        de&&ug( 'socket_io_socket(), received xs_fetched_values: ' + log.s( data ) );
        
        var id = data.id
          , receiver = Socket_IO_Socket.fetch_receivers[ id ]
        ;
        
        if ( receiver ) {
          var no_more = data.no_more;
          
          if ( no_more ) delete Socket_IO_Socket.fetch_receivers[ id ];
          
          receiver( data.values, no_more );
        } else {
          log( 'error, Socket_IO_Socket(), received xs_fetched_values with id: ' + id + ', having no matching receiver' ) 
        }
      } )
      
      .on( 'xs_add', function( data ) {
        de&&ug( 'socket_io_socket(), received xs_add: ' + log.s( data ) );
        
        that.emit_add( data.values, data.options );
      } )
      
      .on( 'xs_remove', function( data ) {
        de&&ug( 'socket_io_socket(), received xs_remove: ' + log.s( data ) );
        
        that.emit_remove( data.values, data.options );
      } )
      
      .on( 'xs_update', function( data ) {
        de&&ug( 'socket_io_socket(), received xs_update: ' + log.s( data ) );
        
        that.emit_update( data.updates, data.options );
      } )
      
      .on( 'xs_clear', function( data ) {
        de&&ug( 'socket_io_socket(), received xs_clear: ' + log.s( data ) );
        
        that.emit_add( data.options );
      } )
    ;
    
    return Pipelet.call( this, options );
  } // Socket_IO_Socket()
  
  Socket_IO_Socket.fetch_id = 0;
  Socket_IO_Socket.fetch_receivers = {};
  
  Pipelet.subclass( Socket_IO_Socket, {
    send: function( method, data ) {
      de&&ug( 'socket_io_socket(), emit: "' + method + '", ' + log.s( data ) );
      
      this.socket.emit( method, data );
      
      return this;
    }, // send()
    
    fetch: function( receiver, options ) {
      var id = ++Socket_IO_Socket.fetch_id;
      
      Socket_IO_Socket.fetch_receivers[ id ] = receiver;
      
      return this.send( 'xs_fetch', { id: id, options: options } );
    }, // fetch()
    
    add: function( values, options ) {
      return this.send( 'xs_add', { values: values, options: options } );
    }, // add()
    
    remove: function( values, options ) {
      return this.send( 'xs_remove', { values: values, options: options } );
    }, // remove()
    
    update: function( updates, options ) {
      return this.send( 'xs_update', { updates: updates, options: options } );
    }, // update()
    
    clear: function( options ) {
      return this.socket.emit( 'xs_clear', { options: options } );
    } // clear()
  } ) // Socket_IO_Socket instance methods
  
  /* --------------------------------------------------------------------------
     http_servers.socket_io_servers()
     
     Associate a number of http servers to socket.io servers, emits socket.io
     connections.     
  */
  function Socket_IO_Servers( options ) {
    this.socket_io_servers = {};
    
    return Set.call( this, options );
  } //
  
  Set.build( 'socket_io_servers', Socket_IO_Servers, {
    add: function( servers ) {
      var that = this;
      
      for ( var i = -1, l = servers.length, out = []; ++i < l; ) {
        var server = servers[ i ];
        
        var address = server.ip_address + ':' + server.port;
        
        if ( this.socket_io_servers[ address ] ) {
          log( 'error, socket_io_servers(), address ' + address + ' is aleady bound to a socket io server' )
          
          continue;
        }
        
        start_server( address );  
      }
      
      return this;
      
      function start_server( address ) {
        var connections = {};
        
        var socket_io_server = that.socket_io_servers[ address ] = {
          connections: connections,
          
          server: socketio
            .listen( server.server ).sockets
            
            .on( 'connection', function( socket ) {
              de&&ug( 'socket_io_server(), received connection request' );
              
              var u, connection, disconnection_timeout;
              
              socket.on( 'disconnect', function() {
                if ( connection ) {
                  de&&ug( 'socket_io_server(), connection ' + connection.id + ' disconnected' );
                  
                  disconnection_timeout = setTimeout( function() {
                    de&&ug( 'socket_io_server(), connection ' + connection.id + ' removed' );
                    
                    Set.prototype.remove.call( that, [ connection ] );
                    
                    connection = disconnection_timeout = u;
                  }, 24 * 3600 * 1000 ); // 1 day
                  
                  update_connection( { state: 'disconnected' } );
                } else {
                  de&&ug( 'socket_io_server(), non-active connection disconnected' );
                }
              } ) // on disconnect
              
              .on( 'xs_connection', function( _connection ) {
                var u, id = _connection.id;
                
                if ( id ) {
                  // Reconnection
                  if ( connection = connections[ id ] ) {
                    // We have a reference to this connection, allow reconnection
                    de&&ug( 'socket_io_server(), accept xs_connection as a reconnection: ' + log.s( _connection ) );
                    
                    clearTimeout( disconnection_timeout );
                    
                    disconnection_timeout = u;
                  } else {
                    // Though this could be a valid connection, we do not have its reference
                    // and must start a new connection
                    de&&ug( 'socket_io_server(), connection id not found in xs_connection: ' + log.s( _connection ) );
                  }
                } else {
                  de&&ug( 'socket_io_server(), received xs_connection request: ' + log.s( _connection ) );
                }
                
                if ( ! connection ) {
                  id = uuid.v1();
                  
                  connections[ id ] = connection = { id: id, state: 'connected', socket: new Socket_IO_Socket( socket ) };
                  
                  de&&ug( 'socket_io_server(), created new connection, id: ' + id );
                  
                  Set.prototype.add.call( that, [ connection ] );
                } else {
                  update_connection( { state: 'connected' } );
                }
                
                // Acknowledge connection request, providing connection id
                socket.emit( 'xs_connection', { id: id, state: 'connected' } );
              } ) // on xs_connection
              
              function update_connection( attributes ) {
                var updated = extend( {}, connection, attributes );
                
                Set.prototype.update.call( that, [ [ connection, updated ] ] );
                
                connection = updated;
              } // update_connection()
            } ) // on connection
        };
        
        de&&ug( 'socket_io_servers(), bound to address ' + address );
      }
    }, // add()
    
    remove: function( servers ) {
      return this;
    }, // remove()
     
    update: function( updates ) {
      return this;
    }, // update()
  } ); // Socket_IO_Servers instance methods
  
  /* --------------------------------------------------------------------------
     http_servers.serve_http_servers( handler [, options ] )
     
     Provide request handler for a number of http servers.
  */
  function Serve_HTTP_Servers( handler, options ) {
    Pipelet.call( this, options );
    
    this.no_add = false;
    
    this.handler = handler;
    
    return this;
  } // Serve_HTTP_Servers()
  
  Pipelet.build( 'serve_http_servers', Serve_HTTP_Servers, {
    add: function( servers ) {
      for ( var i = -1, l = servers.length; ++i < l; ) {
        var server = servers[ i ];
        
        server.handler.set( this.handler );
      }
      
      return this.emit_add( servers );
    }, // add()
    
    remove: function( servers ) {
      return this.emit_remove( servers );
    }, // remove()
    
    update: function( updates ) {
      var updates = Pipelet.split_updates( updates );
      
      this.remove( updates.removes );
      this.add   ( updates.adds    );
      
      return this;
    }, // update()
  } ); // serve_http_servers()
  
  /* --------------------------------------------------------------------------
     files.serve( http_servers );
  */
  function Serve( http_servers, options ) {
    Pipelet.call( this, options );
    
    var that = this;
    
    http_servers.serve_http_servers( function( request, response ) {
      that.handler.call( this, request, response, that );
    } );
    
    this.files = {};
    
    return this;
  } // Serve()
  
  Pipelet.build( 'serve', Serve, {
    handler: function( request, response, that ) {
      if ( request.method != 'GET' ) {
         de&&ug( 'Serve.handler(), bad request, only accepts GET, received: ' + request.method );
         
         return send( 'Bad Request', 400 );
      }
      
      var u, parsed_url = url.parse( request.url )
        , pathname = parsed_url.pathname
        , file = that.files[ pathname ] || ( pathname.charAt( pathname.length - 1 ) === '/'
            ?    that.files[ pathname + 'index.html' ]
              || that.files[ pathname + 'index.htm'  ]
            : u )
      ;
      
      if ( file ) {
        var content = file.content, mime_type = file.mime_type, etag = file.etag;
        
        if ( content === u ) {
          // ToDo: load content from file if undefined (large files)
          return send_error( "<p>Content not available</p>" );
        }
        
        if ( ! etag ) {
          // Generate Etag
          file.etag = etag = crypto.createHash( 'sha1' ).update( content ).digest( 'base64' );
          
          de&&ug( 'Serve.handler(), pathname: ' + pathname + ' generate etag: ' + etag );
        }
        
        if ( request.headers[ 'if-none-match' ] == etag ) {
          de&&ug( 'Serve.handler(), pathname: ' + pathname + ', 304 Not Modified' );
          
          return send( '', 304 );
        }
        
        // Set headers
        mime_type && response.setHeader( 'Content-Type', mime_type );
        response.setHeader( 'ETag', etag );
        
        var encodings = request.headers[ 'accept-encoding' ];
        
        if ( encodings ) {
          if ( encodings.match( /\bgzip\b/ ) ) {
            return file.gzip    ? gzip_send   ( u, file.gzip    ) : zlib.gzip   ( content, gzip_send    );
          } else if ( encodings.match( /\bdeflate\b/ ) ) {
            return file.deflate ? deflate_send( u, file.deflate ) : zlib.deflate( content, deflate_send );
          }
        }
        
        de&&ug( 'Serve.handler(), found pathname: ' + pathname + ', mime: ' + mime_type + ', content length: ' + content.length );
        
        return send( content );
      }
      
      return send_error( '<p>Not Found</p>', 404 );
      
      function deflate_send( error, deflate ) {
        if ( error ) send_error( '<p>Internal Error: cannot deflate content</p>' );
        
        de&&ug( 'Serve.handler(), found pathname: ' + pathname
          + ', mime: ' + mime_type
          + ', deflate content length: ' + deflate.length
          + ' (' + Math.round( 100 * deflate.length / content.length ) + '%)'
        );
        
        response.setHeader( 'Content-Encoding', 'deflate' );
        
        send( deflate );
      } // deflate_send()
      
      function gzip_send( error, gzip ) {
        if ( error ) send_error( '<p>Internal Error: cannot gzip content</p>' );
        
        de&&ug( 'Serve.handler(), found pathname: ' + pathname
          + ', mime: ' + mime_type
          + ', gzip content length: ' + gzip.length
          + ' (' + Math.round( 100 * gzip.length / content.length ) + '%)'
        );
        
        response.setHeader( 'Content-Encoding', 'gzip' );
        
        send( gzip );
      }
      
      function send( content, head ) {
        response.setHeader( 'Content-Length', content.length );
        
        response.writeHead( head || 200 );
        
        response.end( content );
      }
      
      function send_error( error, error_code ) {
        error = error || '<p>Internal Server Error</p>';
        error_code = error_code || 500;
        
        de&&ug( 'Serve.handler(), pathname: ' + pathname + ', error code: ' + error_code + ', error: ' + error );
        
        send( error, error_code );
      }
    }, // handler()
    
    add: function( files, options ) {
      for ( var i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ], location = '/' + file.name;
        
        var mime_type = file.mime_type = file.mime_type || mime.lookup( location );
        
        this.files[ location ] = file;
        
        de&&ug( 'Serve.add(), location: ' + location + ', mime type: ' + mime_type );
      }
      
      return this.emit_add( files, options );
    }, // add()
    
    remove: function( files, options ) {
      for ( var u, i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ];
        
        this.files[ '/' + file.name ] = u;
      }
      
      return this.emit_remove( files, options );
    }, // remove()
    
    update: function( updates, options ) {
      updates = Pipelet.split_updates( updates );
      
      this.remove( updates.removed, extend( options, { more: true } ) );
      this.add   ( updates.added  , options );
      
      return this;
    }, // update()
  } ); // Serve instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'HTTP_Servers', 'Serve' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // http.js
