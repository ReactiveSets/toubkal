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
    , Greedy     = XS.Greedy
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
            , http_server
          ;
          
          if ( end_point.key && end_point.cert ) {
            http_server = https.createServer( { key: end_point.key, cert: end_point.cert } );
          } else if ( end_point.pfx )  {
            http_server = https.createServer( { pfx: end_point.pfx } );
          } else {
            http_server = http.createServer();
          }
          
          var listening = false;
          
          http_server.listen = function() {
            if ( ! listening ) {
              listening = true;
              
              http.Server.prototype.listen.call( http_server, port, ip_address );
            }
            
            return this;
          };
          
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
            http_server: http_server,
            
            toJSON: function() {
              return {
                ip_address : ip_address,
                port       : port,
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
        servers.forEach( function( server ) { server.http_server.listen() } );
        
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
          if ( filter( request ) ) {
            de&&ug( 'virtual server request emited, url: ' + request.url );
            
            that.emit( 'request', request, response );
          }
        },
        
        'checkContinue': function( request, response ) {
          filter( request ) && that.emit( 'checkContinue', request, response );
        },
        
        'checkExpectations': function( request, response ) {
          filter( request ) && that.emit( 'checkExpectations', request, response );
        },
        
        'connect': function( request, socket, head ) {
          filter( request ) && that.emit( 'connect', request, socket, head );
        },
        
        'upgrade': function( request, socket, head ) {
          filter( request ) && that.emit( 'upgrade', request, socket, head );
        }
      }; // _listeners
      
      this.upstream_http_server = null;
      this.listening = false;
      
      return this;
    } // Virtual_Server()
    
    util.inherits( Server, http.Server );
    
    XS.extend_2( Server.prototype, {
      toJSON: function() {
        return {
          upstream_http_server: this.upstream_http_server && 'bound',
          listening : this.listening
        };
      },
      
      listen: function() {
        if ( this.upstream_http_server && ! this.listening ) {
          this.listening = true;
          
          this.upstream_http_server.listen();
        }
        
        return this;
      }, // listen()
      
      bind: function( http_server ) {
        var name = 'Virtual HTTP Server..bind()';
        
        de&&ug( name );
        
        this.upstream_http_server = http_server;
        
        var listeners = {}
          , _listeners = this._listeners
          , that = this
        ;
        
        name += ', ';
        
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
      }, // bind()
      
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
      
      return http_server ? server.bind( http_server ) : server;
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
          var http_server = virtual_http.createServer( filter );
          
          http_server.bind( upstream_server.http_server );
          
          servers.push( extend( {}, upstream_server, { http_server: http_server } ) );
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
  
  /* -------------------------------------------------------------------------------------------
     HTTP_Router()
     
     A high-performance, simple http request router that handles more than just http 'request'
     events but also 'checkContinue', 'connect', and 'upgrade' enabling to implement any type
     of server, including websockets servers using 'upgrade' and proxy servers using 'connect'.
     
     Support for 'checkContinue' allows to implement more efficient error handling on large http
     PUT or POST requests.
     
     This is not a pipelet but a standard class, used by serve_http_servers() so it could be
     exported as an external module. However, this should be done only when the API will be
     finalized.
  */
  function HTTP_Router() {
    if ( ! this instanceof HTTP_Router ) return new HTTP_Router();
    
    var that   = this
      , routes = this._routes = {
          'request'          : [],
          'checkContinue'    : [],
          
          // Experimental checkExpectations handler, check:
          //   https://github.com/joyent/node/issues/4651
          //   https://github.com/alFReD-NSH/node/commit/322716053f4cd2130a7d5bb30f0a48ebcd69d9d9
          'checkExpectations': [],
          
          'connect'          : [],
          'upgrade'          : []
        }
    ;
    
    this.listeners = {};
    
    this.all_listeners = {
      'request'          : make_request_checkContinue_listener( 'request'           ),
      'checkContinue'    : make_request_checkContinue_listener( 'checkContinue'     ),
      'checkExpectations': make_request_checkContinue_listener( 'checkExpectations' ),
      'connect'          : make_connect_upgrade_listener      ( 'connect'           ),
      'upgrade'          : make_connect_upgrade_listener      ( 'upgrade'           )
    };
    
    return this;
    
    function make_request_checkContinue_listener( handler_name ) {
      var _routes = routes[ handler_name ];
      
      return request_checkContinue_listener;
      
      function request_checkContinue_listener( request, response ) {
        var handlers = route( request, _routes )
          , index = -1
          , method = request.method
        ;
        
        return next();
        
        function next( error ) {
          if ( error ) return that[ '500' ]( error, request, response );
          
          var handler = handlers[ ++index ];
          
          if ( handler ) {
            if ( ! handler.methods || handler.methods[ method ] ) {
              try {
                handler.handler( request, response, next );
              } catch( e ) {
                next( e );
              }
            } else {
              next()
            }
          } else {
            that[ '404' ]( request, response );
          }
        }
      } // request_checkContinue_listener()
    } // make_request_checkContinue_listener()
    
    function make_connect_upgrade_listener( handler_name ) {
      var _routes = routes[ handler_name ];
      
      return connect_upgrade_listener;
      
      function connect_upgrade_listener( request, socket, head ) {
        var handlers = route( request, _routes )
          , index = -1
        ;
        
        return next();
        
        function next( error ) {
          if ( error ) {
            de&&ug( 'HTTP_Router(), error: ' + log.s( error ) );
            
            return socket.close();
          }
          
          var handler = handlers[ ++index ];
          
          if ( handler ) {
            if ( ! handler.methods || handler.methods[ method ] ) {
              try {
                handler.handler( request, socket, head, next );
              } catch( e ) {
                next( e );
              }
            } else {
              next()
            }
          } else {
            socket.close();
          }
        }
      } // connect_upgrade_listener()
    } // make_connect_upgrade_listener()
    
    function route( request, routes ) {
      var url = request.url;
      
      // ToDo: optimization, implement some sort or path tree lookup
      for( var i = -1, route; route = routes[ ++i ]; ) {
        var base_url = route.base_url;
        
        if ( url.substr( 0, base_url.length ) == base_url ) return route.handlers;
      }
      
      return [];
    } // route()
  } // HTTP_Router()
  
  extend( HTTP_Router.prototype, {
    set: function( http_handlers ) {
      var that = this;
      
      for ( var handler_name in http_handlers ) set_http_handler( handler_name );
      
      return this;
      
      function set_http_handler( handler_name ) {
        that.listeners[ handler_name ] = that.all_listeners[ handler_name ];
        
        var _routes = that._routes[ handler_name ]
          , handler = http_handlers[ handler_name ]
          , methods = handler.methods
          , routes  = handler.routes
        ;
        
        switch ( typeof methods ) {
          case 'undefined':
          break;
          
          case 'string':
            methods = [ methods ];
          // pass-through
          
          case 'object':
            if ( methods instanceof Array ) {
              handler = extend_2( {}, handler );
              
              var _methods = handler.methods = {};
              
              methods.forEach( function( method ) { _methods[ method ] = true; } );
              
              break;
            }
          // pass-through
          
          default:
            throw new Error( 'HTTP_Router..set(): methods must be a String or an Array of Strings' );
        }
        
        switch( typeof routes ) {
          case 'undefined':
            routes = '/';
          // pass-through
          
          case 'string':
            routes = [ routes ];
          // pass-through
          
          case 'object':
            if ( routes instanceof Array ) {
              routes.forEach( function( route ) {
                for ( var i = -1, _route; _route = _routes[ ++i ]; ) {
                  if ( _route.base_url == route ) break;
                }
                
                if ( _route ) {
                  _route.handlers.push( handler );
                } else {
                  // ToDo: binary insert instead push plus sort bellow
                  _routes.push( { base_url: route, handlers: [ handler ] } );
                }
              } );
              
              _routes.sort( function( a, b ) {
                return a.base_url > b.base_url ? -1
                  :  ( a.base_url < b.base_url ?  1: 0 );
              } );
              
              de&&ug( 'HTTP_Router..set_http_handler(), routes: ' + log.s( _routes ) );
              
              break;
            }
          // pass-through
          
          default:
            throw new Error( 'HTTP_Router..set(): routes must be a String or an Array of Strings' );
        }
      } // set_http_handler()
    }, // set()
    
    unset: function( http_handlers ) {
      var that = this;
      
      for ( var handler_name in http_handlers ) unset_http_handler( handler_name );
      
      return this;
      
      function unset_http_handler( handler_name ) {
        var _routes = that._routes [ handler_name ]
          , handler = http_handlers[ handler_name ]
          , routes  = handler.routes
        ;
        
        switch( typeof routes ) {
          case 'undefined':
            routes = '/';
          // pass-through
          
          case 'string':
            routes = [ routes ]
          // pass-through
          
          case 'object':
            if ( routes instanceof Array ) {
              routes.forEach( function( route ) {
                for ( var i = -1, _route; _route = _routes[ ++i ]; ) {
                  if ( _route.base_url == route ) break;
                }
                
                if ( _route ) {
                  var handlers = _route.handlers
                    , p        = handlers.indexOf( handler )
                  ;
                  
                  if ( p != -1 ) {
                    handlers.splice( p, 1 );
                    
                    if ( handlers.length == 0 ) _routes.splice( i, 1 );
                  } else {
                    // ToDo: this should not happen, send error
                  }
                } else {
                  // ToDo: this should not happen, send error 
                }
              } );
              
              _routes.sort( function( a, b ) {
                return a.base_url > b.base_url ? -1 : ( a.base_url < b.base_url ? 1 : 0 );
              } );
              
              break;
            }
          // pass-through
          
          default:
            throw new Error( 'HTTP_Router..set(): routes must be a String or an Array of Strings' );
        }
        
        if ( _routes.length == 0 ) that.listeners[ handler_name ] = null;
      } // unset_http_handler()
    }, // unset()
    
    '404': function( request, response ) {
      de&&ug( 'HTTP_Router(), not found, url: ' + request.url );
      
      var content = '<p>Not Found: ' + request.url + '</p>';
      
      response.setHeader( 'Content-Length', content.length );
      
      response.writeHead( 404, 'Not Found' );
      
      response.end( content );
    }, // 404
    
    '500': function( error, request, response ) {
      var message = '<p>Internal Server Error</p>'
        , name    = error.name
        , m       = error.message
        , stack   = error.stack
      ;
      
      if ( name  ) message += '<p>Error Name: '    + name + '</p>';
      if ( m     ) message += '<p>Error Message: ' + m    + '</p>';
      
      de&&ug( 'HTTP_Router(), url: ' + request.url + ', error' + message );
      
      if ( stack ) {
        console.log( stack );
        
        message += '<p>Stack Trace:</p><ul>';
        
        stack
          .split( '\n' )
          
          .forEach( function( line ) {
            message += '<li>' + line + '</li>';
          } )
        ;
        
        message += '</ul>'
      }
      
      response.setHeader( 'Content-Length', message.length );
      
      response.writeHead( 500, 'Internal Server Error' );
      
      response.end( message );
    } // 500
  } ); // HTTP_Router()
  
  /* --------------------------------------------------------------------------
     serve_http_servers( http_handlers [, options ] )
     
     ToDo: http_handlers should be a dataflow
     
     Provide request handler for a number of http servers using HTTP_Router()
     to efficiently route requests to various handlers.
     
     When serve_http_servers() is invoked several times on the same
     http_servers, all handlers share the same instance of HTTP_Router. This
     allows efficient routing and code modularity. This is possible because
     serve_http_servers() modifies upstream values provided by http_servers
     to keep track of instances of HTTP_Router by adding a 'router'
     attribute.
     
     Usage: http_servers upstream flow comes from http_servers() or
       virtual_http_servers():
       
         http_servers
           .serve_http_servers( http_handlers, options )
         ;
       
     Parameters:
     
       - http_handlers:
       
         - (Function): a handler for the 'request' listener only. Equivalent to
           defining http_handlers as {
             'request': { 'handler': http_handlers }
           }
         
         - (Object): which values are Objects with the following attributes:
         
           - handler (Function): a function which signature depends on the
             key of each http_handlers's attributes:
               'request'      : function( request, response      , next )
               'checkContinue': function( request, response      , next )
               'connect'      : function( request, socket  , head, next )
               'upgrade'      : function( request, socket  , head, next )
           
           - methods: (Array of strings) HTTP methods processed by this
             handler, default matches any method.
             
           - routes: default is options.routes or '/':
           
             - (String): the beginning of matching urls
             
             - (Array of String): An array of beginnings for matching urls
              
       - options (optional Object):
       
         - routes: default routes for http_handlers, which default to [ '/' ]
         
         
         - methods: default HTTP methods for http_handlers, default is
           undefined which matches any method.
           
           
     Examples:
       A basic server handling requests for all routes and all HTTP methods:
       
         http_servers.serve_http_servers( handler );
         
         function handler( request, response, next ) {
           // your code to handle request here
           
           next(); // Call next only if this request is not handled by this handler
         }
       
       
       A server handling GET and HEAD methods only for the /javascript base url:
       
         http_servers
           .serve_http_servers( handler, { methods: [ 'GET', 'HEAD' ], routes: '/javascript' } )
         ;
       
       
       A server handling the POST method for the /application and /login routes:
       
         http_servers
           .serve_http_servers( handler, { methods: 'POST', routes: [ '/application', '/login' ] } )
         ;
       
       
       A more complex server handling 'request', 'checkContinue', and 'upgrade' listeners:
       
         var http_handlers = {
           'request': {
             'handler': request_handler,
             'methods': [ 'GET', 'HEAD', 'POST' ],
             'routes' : [ '/application', '/login', '/javascript' ]
           },
           
           'checkContinue': {
             'handler': check_continue_handler,
             'methods': [ 'POST', 'PUT' ],
             'routes' : [ '/application', '/uploads' ]
           },
           
           'upgrade': {
             'handler': websockets_handler,
             'methods': 'GET',
             'routes' : '/sockets'
           }
         };
         
         http_servers.serve_http_servers( http_handlers );
       
       
       Using multiple instances of serve_http_servers() and a Connect application:
       
         var connect = require( 'connect' )
           , app = connect()
           
           // Make a handler that ignores next so that connect handles its own errors
           , handler = function( req, res ) { app( req, res ) }
         ;
         
         http_servers
           .serve_http_servers( handler ) // using connect, using the default route (all routes not handled bellow)
           
           .serve_http_servers( request_handler, { routes: [ '/application', '/login', '/javascript' ] } )
           
           .serve_http_servers( { 'handler': check_continue_handler, routes: [ '/application', '/uploads' ] } )
           
           .serve_http_servers( { 'handler': websockets_handler, 'routes' : '/sockets' } )
         ;
         
         // This handler is called for urls starting with '/application', '/login', or '/javascript'
         function request_handler( request, response, next ) {
           // your code to handle request here
           
           next(); // Call next only if this request is not handled by this handler
         }
         
         // This handler is called on header 'Expect: 100-Continue' for urls starting with '/application', or '/uploads'
         function check_continue_handler( request, response, next ) {
           // your code to handle Expect header here
           
           next(); // Call next only if this request is not handled by this handler
         }
         
         // This handler is called on header 'Connection: Upgrade' for urls starting with '/sockets'
         function upgrade_handler( request, socket, head, next ) {
           // code to handle websocket here
           
           next(); // Call next only if this request is not handled by this handler
         }
         
         // Configure your connect app
  */
  function Serve_HTTP_Servers( http_handlers, options ) {
    options = Greedy.call( this, options )._options;
    
    if ( typeof http_handlers == 'function' ) {
      http_handlers = {
        'request': { 'handler': http_handlers }
      };
    }
    
    var default_routes  = options.routes
      , default_methods = options.methods
    ;
    
    if ( default_routes || default_methods ) {
      Object.keys( http_handlers ).forEach( function( handler ) {
        handler = http_handlers[ handler ];
        
        handler.routes  || ( handler.routes  = default_routes  );
        handler.methods || ( handler.methods = default_methods );
      } );
    }
    
    this._http_handlers = http_handlers;
    
    de&&ug( this._get_name( 'Serve_HTTP_Servers' ) + 'http_handlers: ' + log.s( http_handlers ) );
    
    return this;
  } // Serve_HTTP_Servers()
  
  Greedy.Build( 'serve_http_servers', Serve_HTTP_Servers, {
    _add: function( servers, options ) {
      var that = this
        , http_handlers = this._http_handlers
      ;
      
      servers.forEach( add_server );
      
      return this.__emit_add( servers, options );
      
      function add_server( server ) {
        de&&ug( that._get_name( 'add_server' ) + 'server: ' + log.s( server ) + ', http_handlers: ' + log.s( http_handlers )  );
        
        var router   = server.router || ( server.router = new HTTP_Router() )
          , listeners = router.listeners
          , _listeners = server.listeners || ( server.listeners = {} )
          , http_server = server.http_server
        ;
        
        router.set( http_handlers );
        
        Object
          .keys( listeners )
          
          .forEach( function( listener ) {
            if ( ! _listeners[ listener ] ) {
              _listeners[ listener ] = true;
              
              http_server.on( listener, listeners[ listener ] );
            }
          } )
        ;
      } // add_server()
    }, // _add()
    
    _remove: function( servers ) {
      var http_handlers = this._http_handlers;
      
      servers.forEach( remove_server );
      
      return this.__emit_remove( servers );
      
      function remove_server( server ) {
        var router = server.router;
        
        if ( router ) {
          var listeners = router.listeners
            , _listeners = server.listeners
            , http_server = server.http_server
          ;
          
          router.unset( http_handlers );
          
          Object
            .keys( _listeners )
            
            .forEach( function( listener ) {
              if ( ! listeners[ listener ] ) {
                _listeners[ listener ] = false;
                
                http_server.removeListener( listener, _listeners[ listener ] );
              }
            } )
          ;
        }
      } // remove_server()
    } // _remove()
  } ); // serve_http_servers()
  
  /* --------------------------------------------------------------------------
     files.serve( http_servers [, options] )
     
     Todo: API change, replace http_servers by an application pipelet.
     
     Parameters:
       - options:
         - routes:
           (String): the beginning of the url served by this pipelet
           (Array of String): An array of url beginnings served by this pipelet
         
         - max_age: Cache control, default max age is Serve.max_age (1 hour) to
           avoid fetching the same asset twice in the same session, yet allow
           frequent updates.
           
           When the file ages, the cache is then controled by the Etag which,
           if the file has not changed will return a 304 setting up a new
           max-age in the Cache-Control header.
  */
  function Serve( http_servers, options ) {
    var options = Greedy.call( this, options )._options
      , that = this
    ;
    
    this._files = {};
    
    this._max_age = options.cache_control_max_age || Serve.max_age;
    
    http_servers.serve_http_servers( {
      'request': {
        'handler': handler,
        'methods': [ 'GET', 'HEAD' ],
        'routes' : options.routes
      }
    } );
    
    return this;
    
    function handler( request, response, next ) {
      that.handler( request, response, next );
    }
  } // Serve()
  
  // Class attributes
  Serve.max_age = 3600;
  
  var compressible = require( 'compressible' );
  
  Greedy.Build( 'serve', Serve, {
    handler: function request_handler( request, response, next ) {
      var __
        , that = this
        , parsed_url = url.parse( request.url )
        , pathname   = parsed_url.pathname
        
        , file = this._files[ pathname ]
            || ( pathname.charAt( pathname.length - 1 ) === '/'
              ?  this._files[ pathname + 'index.html' ]
              || this._files[ pathname + 'index.htm'  ]
              : __
            )
      ;
      
      if ( file ) {
        var content = file.content
          , mime_type = file.mime_type
          , etag = file.etag
        ;
        
        if ( ! etag ) {
          // Generate Etag
          if ( content === __ ) return get_content();
          
          file.etag = etag = crypto.createHash( 'sha1' ).update( content ).digest( 'base64' );
          
          de&&ug( 'Serve.handler(), pathname: ' + pathname + ' generate etag: ' + etag );
        }
        
        // Cache control, This header must be set even on 304, not modified responses.
        //
        // File option max_age allows to overide default max-age in seconds.
        // option cache_control allows to overide the default 'public' value. Check other
        // possible values with cache-response-directive from
        // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
        response.setHeader( 'Cache-Control'
          , ( file.cache_control || 'public' ) + ', max-age=' + ( file.max_age || this._max_age )
        );
        
        if ( request.headers[ 'if-none-match' ] == etag ) {
          de&&ug( 'Serve.handler(), pathname: ' + pathname + ', 304 Not Modified' );
          
          return send( 'Not Modified', 304 );
        }
        
        // Set headers
        mime_type && response.setHeader( 'Content-Type', mime_type );
        
        // Set Etag Header
        response.setHeader( 'ETag', etag );
        
        if ( compressible( mime_type ) ) {
          var encodings = request.headers[ 'accept-encoding' ];
          
          if ( encodings ) {
            // Content encoding negociation
            
            if ( encodings.match( /\bgzip\b/ ) ) {
              if ( content === __ ) return get_content();
              
              return file.gzip    ? gzip_send   ( __, file.gzip    ) : zlib.gzip   ( content, gzip_send    );
              
            } else if ( encodings.match( /\bdeflate\b/ ) ) {
              if ( content === __ ) return get_content();
              
              return file.deflate ? deflate_send( __, file.deflate ) : zlib.deflate( content, deflate_send );
            }
          }
        }
        
        if ( content === __ ) return get_content();
        
        de&&ug( 'Serve.handler(), found pathname: ' + pathname + ', mime: ' + mime_type + ', content length: ' + content.length );
        
        return send( content );
      }
      
      return next();
      
      function get_content() {
        if ( typeof file.get_content == 'function' ) {
          return file.get_content( function( error, content ) {
            if ( error ) return send_error( "<p>Unable to get content for " + pathname + "</p>" );
            
            file.content = content;
            
            that.request_handler( request, response, next );
          } )
        }
        
        return send_error( "<p>No content not available for " + pathname + "</p>" );
      } // get_content()
      
      function deflate_send( error, deflate ) {
        if ( error ) return send_error( '<p>Internal Error: cannot deflate content</p>' );
        
        // Cache deflate content
        file.deflate = deflate;
        
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
        
        // Cache gzip content
        file.gzip = gzip;
        
        de&&ug( 'Serve.handler(), found pathname: ' + pathname
          + ', mime: ' + mime_type
          + ', gzip content length: ' + gzip.length
          + ' (' + Math.round( 100 * gzip.length / content.length ) + '%)'
        );
        
        response.setHeader( 'Content-Encoding', 'gzip' );
        
        send( gzip );
      } // gzip_send()
      
      function send( content, head ) {
        response.setHeader( 'Vary', 'Accept-Encoding' ); // For caches
        
        response.setHeader( 'Content-Length', content.length );
        
        response.writeHead( head || ( head = 200 ) );
        
        if ( head == 200 && request.method == 'HEAD' ) {
          response.end();
        } else {
          response.end( content );
        }
      } // send()
      
      function send_error( error, error_code ) {
        error = error || '<p>Internal Server Error</p>';
        error_code = error_code || 500;
        
        de&&ug( 'Serve.handler(), pathname: ' + pathname + ', error code: ' + error_code + ', error: ' + error );
        
        send( error, error_code );
      } // send_error()
    }, // handler()
    
    _add: function( files, options ) {
      for ( var i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ], uri = file.uri || ( '/' + file.path );
        
        var mime_type = file.mime_type = file.mime_type || mime.lookup( uri );
        
        this._files[ uri ] = file;
        
        de&&ug( this._get_name( '_add' ) + 'uri: ' + uri + ', mime type: ' + mime_type );
      }
      
      return this.__emit_add( files, options );
    }, // _add()
    
    _remove: function( files, options ) {
      for ( var u, i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ];
        
        this._files[ file.uri || ( '/' + file.path ) ] = u;
      }
      
      return this.__emit_remove( files, options );
    } // _remove()
  } ); // Serve instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    'HTTP_Servers': HTTP_Servers,
    'Serve'       : Serve
  } );
  
  de&&ug( "module loaded" );
} )( this ); // http.js
