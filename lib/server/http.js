/*  http.js
    
    Copyright (c) 2013-2017, Reactive Sets

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

var http            = require( 'http' )
  , https           = require( 'https' )
  , url             = require( 'url' )
  , fs              = require( 'fs' )
  , path            = require( 'path' )
  , mime            = require( 'mime' )
  , zlib            = require( 'zlib' )
  , crypto          = require( 'crypto' )
  , express_session = require( 'express-session' )
  , rs              = require( '../core' )
  
  , RS              = rs.RS
  , log             = RS.log.bind( null, 'http' )
  , extend          = RS.extend
  , extend_2        = extend._2
  , picker          = RS.picker
  , Greedy          = RS.Greedy
  , Set             = RS.Set
  , path_to_uri     = RS.path_to_uri
  , is_array        = RS.is_array
  , is_string       = RS.is_string
  , timestamp       = RS.timestamp_string
;

module.exports = rs;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

/* -------------------------------------------------------------------------------------------
    Define additional mime types
*/
mime.define( {
  'text/coffeescript': ['coffee'],
  'application/json' : ['map']
} );

/* ----------------------------------------------------------------------------
    @pipelet http_servers( options )
    
    @short Provides http servers from source enpoints
    
    @examples
    
    ```javascript
      rs
        // Define endpoints
        .set( [ { id: 1, ip_address: '0.0.0.0', port: 80 } ] )
        
        .http_server()
      ;
    
    ```
    
    @parameters
    - **options** (Object): optional pipelet set() options:
      - **key** (Array of String): forced to ```[ 'ip_address', 'port' ]```
    
    @source
    Endpoints attributes:
    - **ip_address** (String): IP address string, default is ```"127.0.0.1"```
    - **port** (Number): should be an integer, default is ```7001```
    - **key** (String): if provided along with ```"cert"``` attribute,
      defines ```"key"``` attribute for node HTTPS server.
    - **cert** (String): if provided along with ```"key"``` attribute,
      defines ```"cert"``` attribute for node HTTPS server.
    - **pfx** (String): attribute for node HTTPS server, only considered
      if ```"key"``` or ```"cert"``` attributes are not present.
    - all other @[HTTPS server options](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
    
    If ```"key"``` and ```"cert"``` attributes are present or the
    ```"pfx"``` attribute is present, a node HTTPS server is created,
    otherwise an HTTP server is created.
    
    @emits
    Endpoint attributes, possibly modified, plus:
    - **ip_address** (String): IP address string of created server
    
    - **port** (Number): port number of created server
    
    - **http_server**: node HTTP or HTTP server instance plus:
      - **listen** (Function): to call to start listnening to this endpoint's
        server. See pipelet http_listen() which calls this function on a
        trigger.
    
    - **toJSON** (Function): for pipelet trace(), a representation
      of the created server hiding ```"key"```, ```"cert"```, and
      ```"pfx"``` attributes and preventing cyclic references.
    
    @description
    This is a @@synchronous, @@stateful, @@greedy pipelet.
    
    ### See Also
    - Pipelet http_listen()
    - Pipelet serve()
    
*/
function HTTP_Servers( options ) {
  options = extend( {}, options, { key: [ 'ip_address', 'port' ] } );
  
  Set.call( this, [], options );
} // HTTP_Servers()

Set.Build( 'http_servers', HTTP_Servers, function( Super ) {
  return {
    _add: function( end_points ) {
      var servers = []
        , count = end_points.length
        , that = this
        , name = this._get_name()
      ;
      
      end_points.forEach( function( end_point ) {
        var ip_address  = end_point.ip_address || '127.0.0.1'
          , port        = end_point.port || 7001
          , http_server = end_point.key && end_point.cert || end_point.pfx ? https.createServer( end_point ) : http.createServer()
          , listening   = false
        ;
        
        http_server.listen = function() {
          if ( ! listening ) {
            listening = true;
            
            http.Server.prototype.listen.call( http_server, port, ip_address );
          }
          
          return this;
        };
        
        http_server
          .on( 'error', function( e ) {
            log( name + ', HTTP(s) server error: ' + e );
          } )
          
          .on( 'listening', function() {
            log( name + ', HTTP(s) server listening on ' + ip_address + ':' + port );
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
      
      de&&ug( name + 'end point:', end_point );
      
      var p = this._b_index_of( end_point );
      
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

/* ----------------------------------------------------------------------------
    @pipelet http_listen( trigger, options )
    
    @short Listens to http servers when **trigger** completes a @@transaction
    
    @parameters
    - **listen_trigger** \<@class:Pipelet\>: optional, on complete, will
      trigger http listening on all source http servers.
    
    - **options** \<Object>: optional @class:Pipelet options
    
    @examples
    - Listen on HTTP servers with no delay:
    
    ```javascript
      var endpoints = rs
        
        .set( [ { id: 1, ip_address: '0.0.0.0', port: 80 } ] )
      ;
      
      endpoints
        
        .http_servers()
        
        .http_listen()
      ;
    ```
    
    - Listen to HTTP servers when all files are "ready", i.e. when
    a first complete operation is emitted by the files dataflow:
    
    ```javascript
      endpoints
        .http_servers()
        
        .http_listen( files )
      ;
    ```
    
    - Listen on HTTP servers after 1 second delay:
    
    ```javascript
      endpoints
        .http_servers()
        
        .http_listen( rs.once( 1000 ) )
      ;
    ```
    
    @description
    This is a @@stateful, @@assynchronous, @@greedy pipelet.
    
    Listens on all servers after optional trigger is received.
    
    The trigger MUST happen after this pipelet is initialized.
    It will not be triggered by state set prior to this pipelet.
    So this would never trigger listening:
    
    ```javascript
      endpoints
        .http_servers()
        
        .http_listen( rs.set( [ { id: 1 } ] ) )
      ;
    ```
    
    When servers are removed, nothing is done.
    
    ### See Also
    - Pipelet http_servers()
    - Pipelet uglify() which emits and end of transaction when minified assets
      are ready.
*/
function HTTP_Listen( listen_trigger, options ) {
  Set.call( this, [], options );
  
  this.triggered = ! listen_trigger;
  
  listen_trigger && listen_trigger
    
    .greedy()
    
    ._output.on( 'complete', function() {
      this.triggered = true;
      
      http_listen( this, this.a );
    }, this, true /* once */ )
  ;
} // HTTP_Listen()

Set.Build( 'http_listen', HTTP_Listen, function( Super ) {
  return {
    _add: function( servers, options ) {
      this.triggered && http_listen( this, servers );
      
      return Super._add.call( this, servers, options );
    }
  };
} ); // http_listen()

function http_listen( that, servers ) {
  var name = that._get_name();
  
  servers.forEach( function( server ) {
    log( name + ', requesting listen on: ' + server.ip_address + ':' + server.port );
    
    server.http_server.listen()
  } );
} // http_listen()

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
        if ( is_array( filter ) ) {
          var hostnames = {};
          
          filter.forEach( function( hostname ) {
            hostnames[ hostname ] = true;
          } );
          
          filter = function( request ) {
            var host = request.headers.host; // may be undefined
            
            return host && hostnames[ host.split( ':' )[ 0 ] ];
          }
          
          break;
        }
      // pass-through
      
      default:
        throw new Error( 'Server(), filter must be a String, Array of Strings, or Function' );
    }
    
    de&&ug( 'Server filter:', filter );
    
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
    
    return this;
  } // Virtual_Server()
  
  util.inherits( Server, http.Server );
  
  extend_2( Server.prototype, {
    toJSON: function() {
      return {
        upstream_http_server: this.upstream_http_server && 'bound',
        listening : this.listening
      };
    },
    
    listen: function() {
      if ( this.upstream_http_server && ! this.listening ) {
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
        - ToDo: a dataflow
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
        var p = that._b_index_of( upstream_server );
        
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
    
    Instance Methods:
    - set  ( http_server, http_handlers )
    - unset( http_server, http_handlers )
    
    Where:
    - http_server is an instance of node http.Server or Virtual_HTTP_Server
    
    - http_handlers is an Array of http handlers Objects with the following attributes:
    
      - event (String): a node http.Server event name, which can be:
        - 'request'
        - 'checkContinue'
        - 'checkExpectations' (Experimental, see note bellow)
        - 'connect'
        - 'upgrade'
      
      - handler (Function): a function which signature depends on the event name:
        - 'request'          : function( request, response      , next )
        - 'checkContinue'    : function( request, response      , next )
        - 'checkExpectations': function( request, response      , next )
        - 'connect'          : function( request, socket  , head, next )
        - 'upgrade'          : function( request, socket  , head, next )
      
      - methods: (Array of Strings) HTTP methods processed by this handler, default matches
        any method. Methods must be all uppercase.
        
      - routes: default is options.routes or '/':
      
        - (String): the beginning of matching urls
        
        - (Array of String): An array of beginnings for matching urls
    
    Note on 'checkExpectations' Experimental event:
      This event is a proposed addition implemented in the node fork available at
      https://github.com/alFReD-NSH/node.
      
      It allows to handle Expect Headers which value is not 100-Continue which the
      current node mishandles as a 100-Continue.
      
      See also this issue that explains in more details the problem:
        https://github.com/joyent/node/issues/4651
      
      See also commit:
        https://github.com/alFReD-NSH/node/commit/322716053f4cd2130a7d5bb30f0a48ebcd69d9d9
*/
function HTTP_Router() {
  var that          = this
  
    , all_listeners = this.all_listeners = {
        'request'          : make_request_response_listener,
        'checkContinue'    : make_request_response_listener,
        'checkExpectations': make_request_response_listener,
        'connect'          : make_request_socket_head_listener,
        'upgrade'          : make_request_socket_head_listener
      }
    
    , routes        = this.routes = {}
    , listeners     = this.listeners = {}
    
    , all_events    = Object.keys( all_listeners )
  ;
  
  // Initialize all_listeners, routes and listeners for all events
  all_events.forEach( function( event ) {
    listeners    [ event ] = null;
    all_listeners[ event ] = all_listeners[ event ]( routes[ event ] = [] );
  } );
  
  return this;
  
  function make_request_response_listener( routes ) {
    return function( request, response ) {
      var handlers = route( request, routes )
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
  } // make_request_response_listener()
  
  function make_request_socket_head_listener( routes ) {
    return function( request, socket, head ) {
      var handlers = route( request, routes )
        , index = -1
      ;
      
      return next();
      
      function next( error ) {
        if ( error ) {
          log( 'HTTP_Router(), error: ' + error );
          
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
  } // make_request_socket_head_listener()
  
  function route( request, routes ) {
    var url = request.url;
    
    // ToDo: optimization, implement some sort or path tree lookup or binary search since routes is sorted
    for( var i = -1, route; route = routes[ ++i ]; ) {
      var base_url = route.base_url;
      
      if ( url.slice( 0, base_url.length ) == base_url ) return route.handlers;
    }
    
    return [];
  } // route()
} // HTTP_Router()

extend( HTTP_Router.prototype, {
  set: function( http_server, http_handlers ) {
    var that = this;
    
    http_handlers.forEach( set_http_handler );
    
    return this;
    
    function set_http_handler( handler ) {
      var methods  = handler.methods
        , routes   = handler.routes
        , event    = handler.event
        , _routes  = that.routes[ event ]
      ;
      
      switch ( typeof methods ) {
        case 'undefined':
        break;
        
        case 'string':
          methods = [ methods ];
        // pass-through
        
        case 'object':
          if ( is_array( methods ) ) {
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
          if ( is_array( routes ) ) {
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
            
            de&&ug( 'HTTP_Router..set_http_handler(), routes:', _routes );
            
            break;
          }
        // pass-through
        
        default:
          throw new Error( 'HTTP_Router..set(): routes must be a String or an Array of Strings' );
      }
      
      if ( routes.length ) {
        var listener = that.listeners[ event ];
        
        if ( ! listener ) {
          listener = that.listeners[ event ] = that.all_listeners[ event ];
        }
        
        if ( http_server.listeners( event ).indexOf( listener ) == -1 ) {
          http_server.on( event, listener );
        }
      }
    } // set_http_handler()
  }, // set()
  
  unset: function( http_server, http_handlers ) {
    var that = this;
    
    http_handlers.forEaach( unset_http_handler );
    
    return this;
    
    function unset_http_handler( handler ) {
      var event   = handler.event
        , _routes = that._routes[ event ]
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
          if ( is_array( routes ) ) {
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
                  // This handler was already unset
                  // ToDo: this should not happen, send notice
                }
              } else {
                // This route was already unset
                // ToDo: this should not happen, send notice
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
      
      if ( _routes.length == 0 ) {
        var listener = that.listeners[ event ];
        
        if ( listener ) {
          that.listeners[ event ] = null;
          
          http_server.removeListener( event, listener );
        }
      }
    } // unset_http_handler()
  }, // unset()
  
  '404': function( request, response ) {
    de&&ug( 'HTTP_Router(), not found, url: ' + request.url );
    
    var content = '<p>Not Found: ' + request.url + '</p>';
    
    set_response_headers( response, content );
    
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
    
    log( 'HTTP_Router(), url: ' + request.url + ', error', message );
    
    if ( stack ) {
      console.log( stack );
      
      // ToDo: send to global error dataflow
      // ToDo: only display stack trace in development mode
      message += '<p>Stack Trace:</p><ul>';
      
      stack
        .split( '\n' )
        
        .forEach( function( line ) { message += '<li>' + line + '</li>' } )
      ;
      
      message += '</ul>'
    }
    
    set_response_headers( response, message );
    
    response.writeHead( 500, 'Internal Server Error' );
    
    response.end( message );
  } // 500
} ); // HTTP_Router()

function set_response_headers( response, message ) {
  response.setHeader( 'X-XSS-Protection', "1; mode=block" );
  response.setHeader( 'X-Content-Type-Options', 'nosniff' );
  response.setHeader( 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains' );
  
  message && response.setHeader( 'Content-Length', message.length );
} // set_response_headers()

/* --------------------------------------------------------------------------
    serve_http_servers( http_handlers [, options ] )
    
    Provide request handler for a number of http servers using HTTP_Router()
    to efficiently route requests to various handlers.
    
    When serve_http_servers() is invoked several times on the same
    http_servers, all handlers share the same instance of HTTP_Router. This
    allows efficient routing and code modularity. This is possible because
    serve_http_servers() modifies upstream values provided by http_servers
    to keep track of instances of HTTP_Router by adding a 'router'
    attribute.
    
    Warning: the above also means that there is a strong coupling with
    upstream http_servers.
    
    Usage: http_servers upstream flow comes from http_servers() or
      virtual_http_servers():
      
        http_servers
          .serve_http_servers( http_handlers, options )
        ;
      
    Parameters:
    
    - http_handlers:
    
      - (Function): a handler for the 'request' listener only. Equivalent to
        defining http_handlers as [ { event: 'request', 'handler': http_handlers } ]
      
      - (Array of Objects): check HTTP_Router() for the details
      
      - (Pipelet): (not implemented) a dataflow of http_handlers
      
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
      
        var http_handlers = [
          {
            'event'  : 'request'
            'handler': request_handler,
            'methods': [ 'GET', 'HEAD', 'POST' ],
            'routes' : [ '/application', '/login', '/javascript' ]
          },
          
          {
            'event'  : 'checkContinue'
            'handler': check_continue_handler,
            'methods': [ 'POST', 'PUT' ],
            'routes' : [ '/application', '/uploads' ]
          },
          
          {
            'event'  : 'upgrade'
            'handler': websockets_handler,
            'methods': 'GET',
            'routes' : '/sockets'
          }
        ];
        
        http_servers.serve_http_servers( http_handlers );
      
      
      Using multiple instances of serve_http_servers() and a Connect application:
      
        var connect = require( 'connect' )
          , app = connect()
          
          // Make a handler that ignores next so that connect handles its own errors
          , handler = function( req, res ) { app( req, res ) }
        ;
        
        http_servers
          .serve_http_servers( handler ) // using connect, using the default route (all routes not handled bellow)
          
          .serve_http_servers( request_handler, { 'routes': [ '/application', '/login', '/javascript' ] } )
          
          .serve_http_servers( [
            { 'event': 'checkContinue', 'handler': check_continue_handler, 'routes': [ '/application', '/uploads' ] },
            { 'event': 'upgrade'      , 'handler': websockets_handler    , 'routes': '/sockets' }
          ] )
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
  Greedy.call( this, options );
  
  options = this._options;
  
  switch( typeof http_handlers ) {
    case 'function':
      http_handlers = [ { 'event': 'request', 'handler': http_handlers } ];
    // pass-through
    
    case 'object':
      if ( is_array( http_handlers ) ) {
        var default_routes  = options.routes
          , default_methods = options.methods
        ;
        
        if ( default_routes || default_methods ) {
          http_handlers.forEach( function( handler ) {
            handler.routes  || ( handler.routes  = default_routes  );
            handler.methods || ( handler.methods = default_methods );
          } );
        }
        
        break;
      } else if ( http_handlers._is_a && http_handlers._is_a( 'Pipelet' ) ) {
        // ToDo: implement http handlers dataflow
        throw new Error( 'Serve_HTTP_Servers(), http_handlers pipelet not implemented' );
      }
    // pass-through
    
    default:
      throw new Error( 'Serve_HTTP_Servers(), http_handlers expected to be a function, an Array, or a Pipelet' );
    break;
  } // typeof http_handlers
  
  this._http_handlers = http_handlers;
  
  de&&ug( this._get_name( 'Serve_HTTP_Servers' ), { http_handlers: http_handlers } );
  
  // An HTTP_Router() will either be instanciated here or come from upstream
  this._router = null;
  
  return this;
} // Serve_HTTP_Servers()

Greedy.Build( 'serve_http_servers', Serve_HTTP_Servers, {
  _add: function( servers, options ) {
    var that = this
      , http_handlers = this._http_handlers
      , name
    ;
    
    de&&ug( ( name = that._get_name( '_add' ) ), { http_handlers: http_handlers }  );
    
    servers.forEach( add_server );
    
    return this.__emit_add( servers, options );
    
    function add_server( server ) {
      de&&ug( name + 'server:', picker( [ 'id', 'ip_address', 'port' ] )( server ) );
      
      // ToDo: remove strong coupling with upstream server on the "router" attribute
      var router = server.router;
      
      if ( router ) {
        // Upstream router, only add our http handlers to that upstream router
        router.set( server.http_server, http_handlers );
      } else if ( ! ( server.router = that._router ) ) {
        // No upstream router and this router is not yet initialized
        // Initialize router here and sets its http handlers
        server.router
          = that._router
          = new HTTP_Router()
          .set( server.http_server, http_handlers )
        ;
      } else {
        // No upstream router but this router was already initialized and http handlers set
      }
    } // add_server()
  }, // _add()
  
  _remove: function( servers ) {
    var http_handlers = this._http_handlers;
    
    servers.forEach( remove_server );
    
    return this.__emit_remove( servers );
    
    function remove_server( server ) {
      var router = server.router;
      
      router && router.unset( server.http_server, http_handlers );
    } // remove_server()
  } // _remove()
} ); // serve_http_servers()

/* --------------------------------------------------------------------------
    @pipelet serve( http_servers, options )
    
    @parameters
    - **http_servers** (@@class:Pipelet\): typically from
      pipelet http_servers().
    
    - **options**:
      - **routes**:
        (String): the beginning of the url served by this pipelet
        (Array of String): An array of url beginnings served by this pipelet
      
      - **cache_control_max_age** (Number): ```"Cache-Control"``` header
        ```"max-age"``` attribute, in seconds, default is
        ```RS.Serve.max_age``` (3600).
        
        When the file ages, the cache is then controled by the ```"Etag"```
        header which, if the file has not changed will return a ```304```
        response setting up a new max-age in the Cache-Control header.
      
      - **session_options** (Object): options for express-session.
        If present, invoke ```"express-session"``` middleware.
      
      - **base_directory** (String): file path base directory, for files
        which content and base_directory are not provided.
      
      - **log** (Boolean): if set to true, all incoming requests will be logged
        in "path.join( **base_directory**, 'http_serve.log' )" file. default is falsy.
    
    @source
    Served file attributes (all optional except path or uri):
    - **path**           (String): file path, must be defined unless uri and content are both provided
    - **base_directory** (String): file path base directory, used if content is not provided, defaults to ```options.base_directory```
    - **uri**            (String): served uri, defaults to ```to_uri( path )```, e.g. ```"/" + path```
    - **content**        (String): plain text content, must be defined unless path or redirect is provided
    - **mime_type**      (String): for ```"Content-type"``` header, defaults to ```mime.lookup( uri )```
    - **etag**           (String): defaults to ```crypto.createHash( 'sha1' ).update( content ).digest( 'base64' )```
    - **cache_control**  (String): defaults to ```"public"``` for ```"Cache-Control"``` header
    - **max_age**       (Integer): for ```"Cache-Control"``` header, defaults to options' ```"max_age"``` (see above)
    - **gzip**           (String): gzipped content, defaults to ```zlib.gzip()```
    - **deflate**        (String): deflated content, defaults to ```zlib.deflate()```
    - **redirect**       (Object):
      - **status**        (Integer): defaults to ```301```
      - **url**            (String): required redirect-to location url
    
    ### See Also
    - Pipelet to_uri() used to convert path to uri if possible
*/
function Serve( http_servers, options ) {
  Greedy.call( this, options );
  
  var that = this;
  
  options = this._options;
  
  this._files = {};
  
  this._max_age = options.cache_control_max_age || Serve.max_age;
  
  if ( options.session_options ) {
    var _express_session = express_session( options.session_options );
  }
  
  // Write stream to log incoming connections
  if( options.log ) {
    var base_directory = options.base_directory;
    
    if( ! base_directory ) {
      de&&ug( 'missin option base_directory' );
    } else {
      that._logstream = fs.createWriteStream( path.join( base_directory, 'http_serve.log' ), { flags: 'a' } );
    }
  }
  
  http_servers.serve_http_servers( [
    {
      'event'  : 'request',
      'handler': handler,
      'methods': [ 'GET', 'HEAD' ],
      'routes' : options.routes
    }
  ] );
  
  return this;
  
  function handler( request, response, next ) {
    if ( _express_session ) {
      _express_session( request, response, function( error ) {
        if ( error ) next( error );
        
        response.removeHeader( "x-powered-by" );
        
        that.handler( request, response, next );
      } );
    } else {
      that.handler( request, response, next );
    }
  }
} // Serve()

// Class attributes
Serve.max_age = 3600;

var compressible = require( 'compressible' );

Greedy.Build( 'serve', Serve, {
  handler: function request_handler( request, response, next ) {
    var that = this
      , parsed_url = url.parse( request.url )
      , pathname   = parsed_url.pathname
      , file = this._files[ pathname ]
      , de = true
      , logstrem = that._logstream
    ;
    
    logstrem && logstrem.write( timestamp()
      + ' http GET:'
      + ' source='   + get_ip_address()
      + ', url='     + request.url
      + ', referer=' + ( request.headers[ 'referer' ] || '' )
      + '\r\n'
    );
    
    if ( ! file ) {
      if ( pathname.charAt( pathname.length - 1 ) === '/' ) {
        file = this._files[ pathname + 'index.html' ];
      } else {
        if ( this._files[ pathname + '/index.html' ] ) {
          // pathname is a directory with missing trailing slash, requires a 301 rediect
          parsed_url.pathname += '/';
          
          file = { redirect: { url: url.format( parsed_url ) } };
        }
      }
    }
    
    // if ( pathname == '/exception' ) throw new Error( 'Exception Test' );
    
    if ( file ) {
      var redirect = file.redirect;
      
      if ( redirect ) {
        response.setHeader( 'Content-Length', 0 );
        response.writeHead( redirect.status || 301, { 'Location': redirect.url } );
        response.end();
        
        return;
      }
      
      var content     = file.content
        , mime_type   = file.mime_type
        , etag        = file.etag
        , file_path
        , read_stream
      ;
      
      if ( typeof content != 'string' ) {
        content = null; // in case content is not a string yet is truly
        
        file_path = get_file_path();
      }
      
      if ( ! etag ) {
        // Calculate Etag
        var sha1 = crypto.createHash( 'sha1' );
        
        if ( content == null ) {
          
          sha1
            
            .setEncoding( 'base64' )
            
            .on( 'finish', function() {
              file.etag = etag = sha1.read();
              
              de&&ug( 'Serve.handler(), pathname: ' + pathname + ', etag: ' + etag + ', from read stream: ' + file_path );
              
              that.handler( request, response, next );
            } )
          ;
          
          create_read_stream( file_path ).pipe( sha1 );
          
          return;
        }
        
        file.etag = etag = sha1.update( content ).digest( 'base64' );
        
        de&&ug( 'Serve.handler(), pathname: ' + pathname + ', etag: ' + etag );
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
      
      var is_head = request.method == 'HEAD'
        , encodings
        , content_encoding
      ;
      
      if ( compressible( mime_type )
        && ( encodings = request.headers[ 'accept-encoding' ] )
        && ( content_encoding = /\b(gzip|deflate)\b/.exec( encodings ) )
      ) {
        content_encoding = content_encoding[ 0 ];
        
        response.setHeader( 'Content-Encoding', content_encoding );
        response.setHeader( 'Vary', 'Accept-Encoding' ); // For caches
        
        if ( is_head ) {
          // no content
        
        } else if ( content == null ) {
          // stream content from file path through zlib
          read_stream = create_read_stream( file_path )
            
            .pipe( zlib[ content_encoding == 'gzip' ? 'createGzip' : 'createDeflate' ]() )
          ;
        
        } else if ( is_string( file[ content_encoding ] ) ) {
          // cached content_encoding
          return send( file[ content_encoding ] )
        
        } else {
          // compress in-memory content
          return zlib[ content_encoding ]( content, content_encoding_send )
        
        }
      } // if content_encoding
      
      de&&ug( 'Serve.handler(), found pathname: ' + pathname
        + ', mime: ' + mime_type
        + ( content == null
          ? ', streaming content'
          : ', content length: ' + content.length
        )
      );
      
      return send( content );
    }
    
    return next();
    
    // get the IP address from request
    function get_ip_address() {
      de&&ug( 'x-forwarded-for', request.headers[ 'x-forwarded-for' ] );
      de&&ug( 'socket remote address', request.socket.remoteAddress );
      
      return request.headers[ 'x-forwarded-for' ] || request.socket.remoteAddress;
      // return ( request.headers[ 'x-forwarded-for' ] || '' ).split( ',' ).pop() || request.socket.remoteAddress;
    } // get_ip_address()
    
    function get_file_path() {
      var file_path      = file.path
        , base_directory = file.base_directory || that._options.base_directory
      ;
      
      if ( base_directory ) {
        file_path = path.join( base_directory, file_path )
      }
      
      return file_path;
    } // get_file_path()
    
    function create_read_stream( file_path ) {
      de&&ug( 'Serve.handler(), creating read stream for file_path:', file_path );
      
      return fs
        .createReadStream( file_path )
        
        .on( 'error', function( e ) {
          log( 'Serve.handler(), Unable to read stream, file_path: ' + file_path + ', error:', e );
          
          if ( e.code == 'ENOENT' )
            send_error( "Not found", 404 );
          
          else
            send_error( "Internal Server Error: " + e.message );
        } )
      ;
    } // create_read_stream()
    
    function content_encoding_send( error, compressed_content ) {
      if ( error ) {
        return send_error( '<p>Internal Error: cannot ' + content_encoding + ' content</p>' );
      }
      
      // Cache content_encoding content
      file[ content_encoding ] = compressed_content;
      
      de&&ug( 'Serve.handler(), compressed', {
        pathname: pathname,
        mime: mime_type,
        content_encoding: content_encoding,
        encoded_content_length: compressed_content.length,
        '%': Math.round( 100 * compressed_content.length / content.length )
      } );
      
      send( compressed_content );
    } // content_encoding_send()
    
    function send( content, head ) {
      set_response_headers( response, content ); // Content-Length header not provided if no content
      
      response.writeHead( head || ( head = 200 ) );
      
      if ( head == 200 && is_head ) {
        // no content
        response.end();
      
      } else if ( content != null ) {
        // send content directly to response
        response.end( content );
      
      } else {
        // stream content to response
        ( read_stream || create_read_stream( file_path ) ).pipe( response );
      
      }
    } // send()
    
    function send_error( error, error_code ) {
      error = error || '<p>Internal Server Error</p>';
      error_code = error_code || 500;
      
      log( 'Serve.handler()', { pathname: pathname, error_code: error_code, error: error } );
      
      send( error, error_code );
    } // send_error()
  }, // handler()
  
  _add: function( files, options ) {
    var that = this;
    
    files = files.filter( function( file ) {
      var uri = file.uri || path_to_uri( file.path );
      
      if ( uri ) {
        var mime_type = file.mime_type = file.mime_type || mime.lookup( uri );
        
        that._files[ uri ] = extend_2( {}, file );
        
        de&&ug( that._get_name( '_add' ), { uri: uri, mime_type: mime_type } );
        
        return file;
      }
    } )
    
    return this.__emit_add( files, options );
  }, // _add()
  
  _remove: function( files, options ) {
    var that = this;
    
    files = files.filter( function( file ) {
      var uri = file.uri || path_to_uri( file.path );
      
      if ( uri ) {
        delete that._files[ uri ];
        
        return file;
      }
    } )
    
    return that.__emit_remove( files, options );
  } // _remove()
} ); // Serve instance methods

/* --------------------------------------------------------------------------
   module exports
*/
extend_2( RS, {
  'HTTP_Servers': HTTP_Servers,
  'HTTP_Router' : HTTP_Router,
  'Serve'       : Serve
} );

// http.js
