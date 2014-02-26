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
  var http     = require( 'http'      );
  var https    = require( 'https'     );
  var url      = require( 'url'       );
  var mime     = require( 'mime'      );
  var zlib     = require( 'zlib'      );
  var crypto   = require( 'crypto'    );
  
  var XS = require( '../pipelet.js' ).XS;
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Code       = XS.Code
    , Pipelet    = XS.Pipelet
    , Set        = XS.Set
  ;
  
  var win32      = ( process.platform == 'win32' );
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs http, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Define additional mime types
  */
  mime.define( {
    'text/coffeescript': ['coffee'],
    'application/json' : ['map']
  } );
  
  /* -------------------------------------------------------------------------------------------
     HTTP_Server_Handler()
  */
  function HTTP_Server_Handler() {
    var that = this;
    
    this.handlers = [];
    
    this.listener = listener;
    
    return this;
    
    function listener( request, response ) {
      var handlers = that.handlers
        , l = handlers.length
        , host = request.headers && request.headers.host
      ;
      
      if ( host ) host = host.split( ':' )[ 0 ];
      
      if ( l ) {
        for( var i = -1; ++i < l; ) {
          var handler = that.handlers[ i ]
            , hostname = handler.options && handler.options.hostname
          ;
          
          if ( hostname ) {
            if ( ! host ) continue;
            
            de&&ug( 'HTTP_Server_Handler.listener(), host: ' + host + ', hostname: ' + hostname );
            
            if ( typeof hostname === 'string' ) {
              if ( host !== hostname ) continue;
            } else if ( typeof hostname === 'object' ) {
              if ( hostname.indexOf( host ) == -1 ) continue;
            } else {
              throw new Error( 'options.hostname should be a string or an Array' );
            }
          }
          
          handler.handler.call( this, request, response, handler.context );
          
          return;
        }
      }
      
      that.handler.call( this, request, response );
    }
  } // HTTP_Server_Handler()
  
  extend( HTTP_Server_Handler.prototype, {
    handler: function( request, response ) {
      de&&ug( 'HTTP_Server_Handler.handler(), url: ' + request.url );
      
      response.writeHead( 200 );
      response.end( '<p>No content available at this time</p>' );
      
      return this;
    },
    
    set: function( handler ) {
      this.handlers.push( handler );
      
      return this;
    },
    
    unset: function( handler ) {
      var h = this.handlers.indexOf( handler );
      
      if ( h != -1 ) this.handlers.splice( h, 1 );
      
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
    Set.call( this, [], extend( {}, options, { key: [ 'ip_address', 'port' ] } ) );
    
    return this;
  } // HTTP_Servers()
  
  Set.Build( 'http_servers', HTTP_Servers, {
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
    
    _remove_value: function( t, end_point ) {
      de&&ug( '_remove_value(), end point: ' + log.s( end_point ) );
      
      var p = this._index_of( end_point );
      
      if ( p != -1 ) {
        end_point = this.a[ p ];
        
        end_point.server.close();
        
        return Set.prototype._remove_value.call( this, t, end_point );
      } else {
        de&&ug( '_remove_value(), endpoint not found' );
      }
    } // _remove_value()
  } ); // HTTP_Servers instance methods
  
  /* --------------------------------------------------------------------------
     http_servers.serve_http_servers( handler, context [, options ] )
     
     Provide request handler for a number of http servers, a context for this
     handler and routing options for this handler.
     
     Options:
       - hostname, from serve() pipelet:
         (string) a host name this server is responding to. This can be used
           for virtual hosting.
           
         (array of strings): the list of hostnames this server is responding
           to.
  */
  function Serve_HTTP_Servers( handler, context, options ) {
    Pipelet.call( this, options );
    
    this._lazy = false; // this is stateful
    
    this.handler = { handler: handler, context: context, options: options };
    
    return this;
  } // Serve_HTTP_Servers()
  
  Pipelet.Build( 'serve_http_servers', Serve_HTTP_Servers, {
    add: function( servers ) {
      for ( var i = -1, l = servers.length; ++i < l; ) {
        var server = servers[ i ];
        
        server.handler.set( this.handler );
      }
      
      return this.emit_add( servers );
    }, // add()
    
    remove: function( servers ) {
      for ( var i = -1, l = servers.length; ++i < l; ) {
        var server = servers[ i ];
        
        server.handler.unset( this.handler );
      }
      
      return this.emit_remove( servers );
    }, // remove()
    
    update: function( updates ) {
      var updates = Pipelet.split_updates( updates );
      
      this.remove( updates.removes );
      this.add   ( updates.adds    );
      
      return this;
    } // update()
  } ); // serve_http_servers()
  
  /* --------------------------------------------------------------------------
     files.serve( http_servers [, options] )
     
     options:
       - hostname:
           (string) a host name this server is responding to. This can be used
           for virtual hosting.
           
           (array of strings): the list of hostnames this server is responding
           to.
        
       - cache_control_max_age: Cache control, default max age is 1 hour to avoid fetching
           the same asset twice in the same session, yet allow frequent updates.
           
           When the file ages, the cache is then controled by the Etag which, if the file
           has not changed will return a 304 setting up a new max-age in the Cache-Control
           header.
  */
  function Serve( http_servers, options ) {
    Pipelet.call( this, options );
    
    this.files = {};
    
    this.max_age = this.options.cache_control_max_age || 3600;
    
    http_servers.serve_http_servers( this.handler, this, this.options );
    
    return this;
  } // Serve()
  
  Pipelet.Build( 'serve', Serve, {
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
        
        // Cache control, This header must be set even on 304, not modified responses.
        //
        // File option max_age allows to overide default max-age in seconds.
        // option cache_control allows to overide the default 'public' value. Check other
        // possible values with cache-response-directive from
        // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
        response.setHeader( 'Cache-Control', ( file.cache_control || 'public' ) + ', max-age=' + ( file.max_age || that.max_age )  );
        
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
        var file = files[ i ], uri = file.uri || ( '/' + file.name );
        
        var mime_type = file.mime_type = file.mime_type || mime.lookup( uri );
        
        this.files[ uri ] = file;
        
        de&&ug( 'Serve.add(), uri: ' + uri + ', mime type: ' + mime_type );
      }
      
      return this.emit_add( files, options );
    }, // add()
    
    remove: function( files, options ) {
      for ( var u, i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ];
        
        this.files[ file.uri || ( '/' + file.name ) ] = u;
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
