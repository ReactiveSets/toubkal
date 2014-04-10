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
    , extend_2   = XS.extend_2
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
  function HTTP_Server_Handler() {
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
          , name = de && this._get_name( '_add' )
        ;
        
        end_points.forEach( function( end_point ) {
          var ip_address = end_point.ip_address || '127.0.0.1'
            , port       = end_point.port || 7001
            , handler    = new HTTP_Server_Handler()
            , http_server
          ;
          
          if ( end_point.key && end_point.cert ) {
            http_server = https.createServer( { key: end_point.key, cert: end_point.cert } );
          } else if ( end_point.pfx )  {
            http_server = https.createServer( { pfx: end_point.pfx } );
          } else {
            http_server = http.createServer();
          }
          
          http_server
            .on( 'error', function( e ) {
              de&&ug( name + 'HTTP server error: ' + e );
            } )
            
            .on( 'listening', function() {
              de&&ug( name + 'HTTP server listening to ' + ip_address + ':' + port );
            } )
          ;
          
          servers.push( extend( {}, end_point, {
            ip_address : ip_address,
            port       : port,
            handler    : handler,
            http_server: http_server,
            
            listen     : function() {
              http_server.listen( port, ip_address )
            },
            
            toJSON: function() {
              return {
                ip_address : ip_address,
                port       : port,
                handler    : handler,
                http_server: !!http_server
              }
            }
          } ) );
          
          --count || end();
          
          function end() { Super._add.call( that, servers ) }
        } );
        
        return this;
      }, // add()
      
      _remove_value: function( t, end_point ) {
        var name = de && this._get_name( '_remove_value()' );
        
        de&&ug( name + 'end point: ' + log.s( end_point ) );
        
        var p = this._index_of( end_point );
        
        if ( p != -1 ) {
          end_point = this.a[ p ];
          
          end_point.http_server.close();
          
          return Super._remove_value.call( this, t, end_point );
        } else {
          de&&ug( name + 'endpoint not found' );
          
          t.emit_nothing()
        }
      } // _remove_value()
    } // instance attributes
  } ); // http_servers()
  
  /* --------------------------------------------------------------------------
     http_servers.http_listen( listen_trigger )
     
     Listens http_servers when listen_trigger completes a transaction.
     
     Parameters:
       - listen_trigger (Stateful Pipelet)
  */
  function HTTP_Listen( listen_trigger, options ) {
    Set.call( this, [], options );
    
    var that = this;
    
    this.triggered = false;
    
    listen_trigger._on_complete( function() {
      this.triggered = true;
      
      that._listen( that.a );
    }, this, true /* once */ );
    
    return this;
  } // HTTP_Listen()
  
  Set.Build( 'http_listen', HTTP_Listen, function( Super ) {
    return {
      _listen: function( servers ) {
        servers.forEach( function( server ) { server.listen() } );
        
        return this;
      }, // _listen_servers()
      
      _add: function( servers ) {
        this.triggered && this._listen( servers );
        
        return Super._add.call( this, servers );
      }
    };
  } ); // http_listen()
  
  /* -------------------------------------------------------------------------------------------
     virtual_http.createServer( filter [, http_server] )
     
     Returns a new virtual_http.Server filtered by filter.
     
     virtual_http.Server is an instanceof node http.Server so it can be used anywhere an
     http.Server is required.
     
     Parameters:
       - filter: can be on of:
         - (String)          : a hostname for this virtual http server
         - (Array of Strings): hostnames for this virtual server
         - (Function)        : a function to filter incomming requests that returns true if the
             request belongs to this virtual server: filter( request )
       
       - http_server: optional http.Server instance, or https.Server, can also be provided
           later using listen().
       
     Methods, attributes, and events:
       All methods, attributes and events of the class http.Server can be used. The main
       difference is the method listen() that requires an instance of http.Server, which
       includes instances of virtual_http.Server, allowing to build virtual server
       hierarchies.
     
     Example: Create two independant socket.io servers for two virtual hosts
     
       var http   = require( 'http' )
         , server = http.createServer()
       ;
      
      
       
       var virtual_http = require( 'virtual_http' )
         , example_com  = virtual_http.createServer( 'www.example.com' ).listen( server )
         , foobar_com   = virtual_http.createServer( 'www.foobar.com'  ).listen( server )
       ;
       
       var socketio       = require( 'socket.io' )
         , io_example_com = socketio.listen( example_com ); // handles socket.io requests for www.example.com
         , io_foobar_com  = socketio.listen( foobar_com  ); // handles socket.io requests for www.foobar.com
       ;
       
       server.listen( 3000 );
  */
  var virtual_http = ( function() {
    var util         = require( 'util'   )
      , http         = require( 'http'   )
      , events       = require( 'events' )
      , EventEmitter = events.EventEmitter
    ;
    
    function Server( filter ) {
      switch( typeof filter ) {
        case 'function':
        break;
        
        case 'string': // a hostname
          filter = [ filter ];
        // pass-through
        
        case 'object':
          if ( filter instanceof Array ) {
            var hostnames = {};
            
            filter.forEach( function( hostname ) {
              hostnames[ hostname ] = true;
            } );
            
            filter = function( request ) {
              var host = request.headers.host.split( ':' )[ 0 ];
              
              return hostnames[ host ];
            }
            
            break;
          }
        // pass-through
        
        default:
          throw new Error( 'Server(), filter must be a String, Array of Strings, or Function' );
      }
      
      de&&ug( 'Server filter: ' + filter );
      
      var that = this;
      
      this._listeners = {
        'listening': function() { // net.Server event
          de&&ug( 'virtual server request, listening event relayed' );
          
          that.emit( 'listening' );
        },
        
        'connection': function( socket ) {
          // Emit coonection event regardless of filter
          // All virtual servers will receive the event even if filter does not pass
          that.emit( 'connection', socket );
        },
        
        'close': function() { that.emit( 'close' ); },
        
        'error': function( error ) { that.emit( 'error', error ); }, // net.Server event
        
        'clientError': function( exception, socket ) {
          that.emit( 'clientError', exception, socket );
        },
        
        'request': function( request, response ) {
          de&&ug( 'virtual server request, url: ' + request.url );
          
          if ( filter( request ) ) {
            de&&ug( 'virtual server request emited, url: ' + request.url );
            
            that.emit( 'request', request, response );
          }
        },
        
        'checkContinue': function( request, response ) {
          filter( request ) && that.emit( 'checkContinue', request, response );
        },
        
        'connect': function( request, socket, head ) {
          filter( request ) && that.emit( 'connect', request, socket, head );
        },
        
        'upgrade': function( request, socket, head ) {
          filter( request ) && that.emit( 'upgrade', request, socket, head );
        }
      }; // _listeners
      
      return this;
    } // Virtual_Server()
    
    util.inherits( Server, http.Server );
    
    XS.extend_2( Server.prototype, {
      toJSON: function() {
        return 'Server';
      },
      
      listen: function( http_server ) {
        de&&ug( 'Virtual HTTP Server, listen()' );
        
        var listeners = {}
          , _listeners = this._listeners
          , name = 'Server(), '
          , that = this
        ;
        
        this.maxHeadersCount = http_server.maxHeadersCount;
        this.timeout         = http_server.timeout;
        
        this
          .on( 'newListener', function( event ) {
            if ( listeners[ event ] ) return; // this listener is already set
            
            var listener = _listeners[ event ];
            
            if ( listener ) {
              de&&ug( name + 'new listener for event ' + event );
              
              http_server.on( event, listeners[ event ] = listener );
            } else {
              de&&ug( name + 'not setting up listener for event ' + event );
            }
          } ) // on newListener
          
          .on( 'removeListener', function( event ) {
            var listener = listeners[ event ];
            
            if ( listener ) {
              var listeners_count = EventEmitter.listenerCount( that, event );
              
              de&&ug( name + 'remove listener: ' + event + ', listeners: ' + listeners_count );
              
              if ( listeners_count == 0 ) {
                delete listeners[ event ];
                
                http_server.removeListener( event, listener );
              }
            }
          } ) // on removeListener
        ;
        
        http_server.on( 'removeListener', function( event, listener ) {
          if ( listener === listeners[ event ] ) {
            de&&ug( name + 'remove upstream listener: ' + event );
            
            delete listeners[ event ];
            
            that.removeAllListeners( event );
          }
        } ); // on remove upstream listnerner
        
        return this;
      }, // listen()
      
      setTimeout: function( msecs, callback ) {
        de&&ug( name + 'setTimeout()' );
        
        // ToDo: implement _s.setTimeout()
        return this;
      }, // setTimeout()
      
      close: function( callback ) {
        de&&ug( name + 'close()' );
        
        // remove all listeners
        this.removeAllListeners(); // should remove listener in 'listeners'
        
        callback && s.on( 'close', callback );
        
        return this;
      } // close()
    } ); // Server() instance attributes
    
    function createServer( filter, http_server ) {
      var server = new Server( filter );
      
      return http_server ? server.listen( http_server ) : server;
    } // virtual_http_server()
    
    return {
      Server      : Server,
      createServer: createServer
    }
  } )();
  
  /* -------------------------------------------------------------------------------------------
     http_servers.virtual_http_servers( filter [, options ] )
     
     Provides virtual http servers.
     
     Parameters:
       - filter:
         - (String): a hostname for this virtual server
         - (Array of Strings): hostnames for this virtual server
         - (Function): a function to filter incomming requests that returns true if the request
           belongs to this virtual server: filter( request )
  */
  function Virtual_HTTP_Servers( filter, options ) {
    Set.call( this, [], extend( {}, options, { key: [ 'ip_address', 'port' ] } ) );
    
    this._filter = filter;
    
    return this;
  } // Virtual_HTTP_Servers()
  
  Set.Build( 'virtual_http_servers', Virtual_HTTP_Servers, function( Super ) {
    // Private attributes
    return { // Virtual_HTTP_Servers.prototype
      _add: function( upstream_servers, options ) {
        var filter = this._filter
          , servers = []
        ;
        
        upstream_servers.forEach( function( upstream_server ) {
          var http_server = virtual_http.createServer( filter )
            , handler     = new HTTP_Server_Handler()
          ;
          
          http_server
            .listen( upstream_server.http_server )
            .on( 'request', handler.listener )
          ;
          
          servers.push( extend( {}, upstream_server, {
            handler    : handler,
            http_server: http_server,
            
            listen     : function() {
              upstream_server.listen()
            }
          } ) );
        } );
        
        return Super._add.call( this, servers, options );
      }, // _add()
      
      _remove: function( upstream_servers, options ) {
        var that = this, servers = [];
        
        upstream_servers.forEach( function( upstream_server ) {
          var p = that._index_of( upstream_server );
          
          if ( p != -1 ) {
            var server = that.a[ p ];
            
            server.http_server.close();
            
            servers.push( server );
          }
        } );
        
        return Super._remove.call( this, servers, options );
      } // _remove()
    }; // Virtual_HTTP_Servers instance attributes
  } ); // virtual_http_servers()
  
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
