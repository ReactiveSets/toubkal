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
    , Query      = XS.Query
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
  function HTTP_Server_Handler( endpoint ) {
    var that      = this
      , hosts     = this._hosts = {}
    ;
    
    this.listener = listener;
    
    return this;
    
    function listener( request, response ) {
      var host = request.headers.host.split( ':' )[ 0 ]
        , handler = hosts[ host ]
      ;
      
      return handler
        ? handler.handler.call( that, request, response, next )
        : next()
      ;
      
      function next() {
        that[ '404' ]( request, response );
      }
    }
  } // HTTP_Server_Handler()
  
  extend( HTTP_Server_Handler.prototype, {
    '404': function( request, response ) {
      de&&ug( 'HTTP_Server_Handler.handler(), url: ' + request.url );
      
      response.writeHead( 404 );
      response.end( '<p>Not Found</p>' );
      
      return this;
    }, // handler()
    
    set: function( handler ) {
      var hostname = handler.options && handler.options.hostname
        , hosts = this._hosts
      ;
      
      if ( hostname ) {
        if ( typeof hostname === 'string' ) {
          hosts[ hostname ] = handler;
        } else if ( typeof hostname === 'object' ) {
          hostname.forEach( function( h ) { hosts[ h ] = handler; } );
        } else {
          throw new Error( 'options.hostname should be a string or an Array' );
        }
      } else {
        throw new Error( 'HTTP_Server_Handler..set() requires hostname option' );
      }
      
      return this;
    }, // set()
    
    unset: function( handler ) {
      var hostname = handler.options && handler.options.hostname
        , hosts = this._hosts
      ;
      
      if ( hostname ) {
        if ( typeof hostname === 'string' ) {
          delete hosts[ hostname ];
        } else if ( typeof hostname === 'object' ) {
          hostname.forEach( function( h ) { delete hosts[ h ]; } );
        }
      }
      
      return this;
    } // unset()
  } ); // HTTP_Server_Handler() instance attributes
  
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
  
  Set.Build( 'http_servers', HTTP_Servers, function( Super ) {
    return {
      _add: function( end_points ) {
        var servers = []
          , count = end_points.length
          , that = this
        ;
        
        end_points.forEach( function( end_point ) {
          var ip_address = end_point.ip_address || '127.0.0.1'
            , port       = end_point.port || 7001
            , handler    = new HTTP_Server_Handler( end_point )
            , server
          ;
          
          if ( end_point.key && end_point.cert ) {
            server = https.createServer( { key: end_point.key, cert: end_point.cert } );
          } else if ( end_point.pfx )  {
            server = https.createServer( { pfx: end_point.pfx } );
          } else {
            server = http.createServer();
          }
          
          server
            .on( 'request', handler.listener )
            
            .on( 'error', function( e ) {
              de&&ug( 'HTTP server error: ' + e );
              
              --count || end()
            } )
            
            .listen( port, ip_address, function() {
              de&&ug( 'HTTP_Servers._add(): http server listening to ' + ip_address + ':' + port );
              
              servers.push( extend( {}, end_point, {
                ip_address: ip_address,
                port      : port,
                handler   : handler,
                server    : server,
                
                toJSON: function() {
                  return {
                    ip_address: ip_address,
                    port      : port,
                    handler   : handler,
                    server    : !!server
                  }
                }
              } ) );
              
              --count || end()
            } )
          ;
          
          function end() { Super._add.call( that, servers ) }
        } );
        
        return this;
      }, // add()
      
      _remove_value: function( t, end_point ) {
        de&&ug( '_remove_value(), end point: ' + log.s( end_point ) );
        
        var p = this._index_of( end_point );
        
        if ( p != -1 ) {
          end_point = this.a[ p ];
          
          end_point.server.close();
          
          return Super._remove_value.call( this, t, end_point );
        } else {
          de&&ug( '_remove_value(), endpoint not found' );
          
          t.emit_nothing()
        }
      } // _remove_value()
    } // instance attributes
  } ); // HTTP_Servers()
  
  /* --------------------------------------------------------------------------
     http_servers.serve_http_servers( handler [, options ] )
     
     Provide request handler for a number of http servers.
     
     Options:
       - hostname, from serve() pipelet:
         (string) a host name this server is responding to. This can be used
           for virtual hosting.
           
         (array of strings): the list of hostnames this server is responding
           to.
  */
  function Serve_HTTP_Servers( handler, options ) {
    Pipelet.call( this, options );
    
    this._query = Query.pass_all;
    
    this._handler = { handler: handler, options: options };
    
    return this;
  } // Serve_HTTP_Servers()
  
  Pipelet.Build( 'serve_http_servers', Serve_HTTP_Servers, {
    __update_upstream_query: function() { return this; },
    
    _add: function( servers ) {
      for ( var i = -1, l = servers.length; ++i < l; ) {
        var server = servers[ i ];
        
        server.handler.set( this._handler );
      }
      
      return this.__emit_add( servers );
    }, // _add()
    
    _remove: function( servers ) {
      for ( var i = -1, l = servers.length; ++i < l; ) {
        var server = servers[ i ];
        
        server.handler.unset( this._handler );
      }
      
      return this.__emit_remove( servers );
    } // _remove()
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
    var options = Pipelet.call( this, options )._options
      , that = this
    ;
    
    // Stateful pipelet
    this._query = Query.pass_all;
    
    // State, ToDo: use leading underscore
    this.files = {};
    
    this.max_age = options.cache_control_max_age || 3600;
    
    http_servers.serve_http_servers( handler, options );
    
    return this;
    
    function handler( request, response, next ) {
      that.handler( request, response, next );
    }
  } // Serve()
  
  Pipelet.Build( 'serve', Serve, {
    __update_upstream_query: function() { return this; },
    
    handler: function( request, response, next ) {
      if ( request.method != 'GET' ) return next();
      
      var u, parsed_url = url.parse( request.url )
        , pathname = parsed_url.pathname
        , file = this.files[ pathname ] || ( pathname.charAt( pathname.length - 1 ) === '/'
            ?    this.files[ pathname + 'index.html' ]
              || this.files[ pathname + 'index.htm'  ]
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
        response.setHeader( 'Cache-Control', ( file.cache_control || 'public' ) + ', max-age=' + ( file.max_age || this.max_age )  );
        
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
      
      return next();
      
      function deflate_send( error, deflate ) {
        if ( error ) return send_error( '<p>Internal Error: cannot deflate content</p>' );
        
        de&&ug( 'Serve.handler(), found pathname: ' + pathname
          + ', mime: ' + mime_type
          + ', deflate content length: ' + deflate.length
          + ' (' + Math.round( 100 * deflate.length / content.length ) + '%)'
        );
        
        response.setHeader( 'Content-Encoding', 'deflate' );
        
        send( deflate );
      } // deflate_send()
      
      function gzip_send( error, gzip ) {
        if ( error ) return send_error( '<p>Internal Error: cannot gzip content</p>' );
        
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
    
    _add: function( files, options ) {
      for ( var i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ], uri = file.uri || ( '/' + file.path );
        
        var mime_type = file.mime_type = file.mime_type || mime.lookup( uri );
        
        this.files[ uri ] = file;
        
        de&&ug( this._get_name( '_add' ) + 'uri: ' + uri + ', mime type: ' + mime_type );
      }
      
      return this.__emit_add( files, options );
    }, // _add()
    
    _remove: function( files, options ) {
      for ( var u, i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ];
        
        this.files[ file.uri || ( '/' + file.path ) ] = u;
      }
      
      return this.__emit_remove( files, options );
    } // _remove()
  } ); // Serve instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'HTTP_Servers', 'Serve' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // http.js
