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
     http_servers.socket_io_clients( [, options ] )
     
     Associate a number of http servers to socket.io servers, emits socket.io
     clients for each socket.io client connection.
     
     Options:
       - no_minification: (Bolean) do not minify socket io client
       
       - no_etag        : (Bolean) do not generate etags for socket io client
       
       - no_gzip        : (Bolean) do not gzip socket io client
       
       - transports: (Array) defaults to [ 'websocket' ] where each item is a transport
           name string, supported transports are:
             - 'websocket'
             - 'flashsocket'
             - 'htmlfile'
             - 'xhr-polling'
             - 'jsonp-polling'
             
           Check socket.io documentation for more details about these transports.
           
       - socket_io_log_level: (Integer) defaults to 1
  */
  function Socket_IO_Clients( options ) {
    this.socket_io_servers = {};
    
    return Set.call( this, options );
  }
  
  Set.build( 'socket_io_clients', Socket_IO_Clients, {
    add: function( servers ) {
      var that = this;
      
      for ( var i = -1, l = servers.length, out = []; ++i < l; ) {
        var server = servers[ i ];
        
        var address = server.ip_address + ':' + server.port;
        
        if ( this.socket_io_servers[ address ] ) {
          log( 'error, socket_io_clients(), address ' + address + ' is aleady bound to a socket io server' )
          
          continue;
        }
        
        start_server( address );  
      }
      
      return this;
      
      function start_server( address ) {
        var u, options = that.options, connections = {};
        
        var io = socketio.listen( server.server );
        
        io.configure( function() {
          options.no_minification || io.enable( 'browser client minification' );
          options.no_etag         || io.enable( 'browser client etag' );
          options.no_gzip         || io.enable( 'browser client gzip' );
          
          io.set( 'log level'
            , options.socket_io_log_level === u ? 1 : options.socket_io_log_level
          );
          
          io.set( 'transports', options.transports || [ 'websocket' ] );
        } );
        
        var socket_io_server = that.socket_io_servers[ address ] = {
          connections: connections,
          
          server: io.sockets
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
                  }, 1 * 3600 * 1000 ); // 1 hour
                  
                  update_connection( { state: 'disconnected' } );
                  
                  connection.socket.disconnect(); // force emited operations to be queued until reconnection
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
                  
                  connections[ id ] = connection = { id: id, state: 'connected', socket: new XS.Socket_IO_Crossover( socket ) };
                  
                  de&&ug( 'socket_io_server(), created new connection, id: ' + id );
                  
                  Set.prototype.add.call( that, [ connection ] );
                }
                
                // Acknowledge connection request, providing connection id
                socket.emit( 'xs_connection', { id: id, state: 'connected' } );
                
                connection.socket.connect(); // allow xs socket crossover to emit operations
              } ) // on xs_connection
              
              function update_connection( attributes ) {
                var updated = extend( {}, connection, attributes );
                
                Set.prototype.update.call( that, [ [ connection, updated ] ] );
                
                connection = updated;
              } // update_connection()
            } ) // on connection
        };
        
        de&&ug( 'socket_io_clients(), socket.io server bound to address ' + address );
      }
    }, // add()
    
    remove: function( servers ) {
      return this;
    }, // remove()
     
    update: function( updates ) {
      return this;
    }, // update()
  } ); // Socket_IO_Clients instance methods
  
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
     files.serve( http_servers [, options] )
     
     options:
       - hostname:
         (string) a host name this server is responding to. This can be used
           for virtual hosting.
           
         (array of strings): the list of hostnames this server is responding
           to.
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
      var options = that.options, hostname = options.hostname;
      
      if ( hostname ) {
        var host = request.headers && request.headers.host;
        
        if ( ! host ) return;
        
        host = host.split( ':' )[ 0 ];
        
        if ( typeof hostname === 'string' ) {
          if ( host !== hostname ) return;
        } else if ( typeof hostname === 'object' ) {
          if ( hostname.indexOf( host ) == -1 ) return;
        } else {
          throw new Error( 'options.hostname should be a string or an Array' );
        }
      }
      
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
        
        // Cache control, set default max age to 30 days to avoid fetching the same asset
        // twice in the same page load. For each page loads, cache is then controled by
        // Etag. This header must be set even on 304, not modified responses.
        //
        // File option max_age allows to overide default max-age in seconds.
        // option cache_control allows to overide the default 'public' value. Check other
        // possible values with cache-response-directive from
        // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9 
        response.setHeader( 'Cache-Control', ( file.cache_control || 'public' ) + ', max-age=' + ( file.max_age || 30 * 86400 )  );
        
        if ( request.headers[ 'if-none-match' ] == etag ) {
          de&&ug( 'Serve.handler(), pathname: ' + pathname + ', 304 Not Modified' );
          
          return send( '', 304 );
        }
        
        // Set headers
        mime_type && response.setHeader( 'Content-Type', mime_type );
        
        // Set Etag Header
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
