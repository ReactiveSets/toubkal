/*  express.js
    
    Copyright (c) 2013-2020, Reactive Sets

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

var url       = require( 'url' )
  , express   = require( 'express' )
  , session   = require( 'express-session' )
  , parser    = require( 'body-parser' )
  , rs        = require( 'toubkal' )
  , RS        = rs.RS
  
  , Set       = RS.Set
  , subclass  = RS.subclass
  , extend    = RS.extend
  
  , Store     = session.Store
  
  , log       = RS.log.bind( null, 'express' )
  , de        = false
  , ug        = log
;

const transaction_errors_s = 'transaction_errors';
const { picker, value_equals } = RS;

rs
  /* --------------------------------------------------------------------------
      @pipelet express_application( session_options, options )
      
      @short Instanciate an express application
      
      @parameters
      - **session_options** (Object): see express-session options plus:
        - **store_location** (String): optional, default is "local", address
          to connect to remote toubkal server to reach session store.
        - **store** (express-session Store): default will be created from
          ```options.store_location```, see section emits bellow.
      
      - **options** (Object): @@Class:Pipelet() options plus:
        **base_route** (String): default is ```""```
      
      @source pipelet http_servers() instance
      
      @emits
      - **id** (integer): 1
      - **application** (Object): express instance application
      - **session_options** (Object): session_options from parameter plus:
        - **store**: from internal function Express_Session_Store() and using
          pipelet session_store() to connect to session store at
          ```session_options.store_location```.
      
      @examples
      ```javascript
      var rs              = require( 'toubkal' )
        
        , session_options = {
            key: 'rs_sid',
            secret: 'some secret',
            saveUninitialized: true,
            resave: false,
            store_location: 'sessions.example.com:8000' // optional
          }
      ;
      
      var http_servers = rs
        
        .set( [ { id: 1, ip_address: '0.0.0.0', port: 80 } ] )
        
        .http_servers()
        
        .express_application( session_options )
      ;
      
      http_servers.http_listen( assets );
      ```
      
      @description
      This is a @@singleton with one element.
      
      @see_also
      - Pipelet session_store()
      - Pipelet socket_io_server()
      - internal Function Express_Session_Store()
      - Pipelet http_servers()
      - Pipelet serve_http_servers()
      - Pipelet express_use_passport()
  */
  .Singleton( 'express_instances', function( source, options ) {
    const express_instances = source.namespace().set();
    
    const operations = source
      
      .emit_transactions()
      
      .validate_transactions( express_instances )
      
      .map( transaction => {
        const { adds, removes, updates } = transaction;
        const errors                     = transaction.errors || []
        
        transaction.adds = _.adds.map( ( _, i ) => {
          const id              = _.id;
          const application     = express();
          const session_options = _.session_options;
          
          if ( session_options ) {
            if ( ! session_options.store ) {
              // ToDo: associate session store with session_options.key and session_options.secret
              const store = rs.session_store( session_options.store_location );
              
              session_options.store = new Express_Session_Store( store );
            }
            
            application.use( session( session_options ) );
          }
          
          return { id, application, session_options };
        } );
        
        return errors.length
          ? { adds: [ { flow: transaction_errors_s, errors } ] }
          : transaction;
      } )
      
      .emit_operations()
    ;
    
    return rs.union( [
      operations.filter( _ => _.flow == transaction_errors_s ),
      operations.filter( _ => _.flow != transaction_errors_s ).through( express_instances )
    ] );
  } ) // express_instances()
  
  .Singleton( 'express_application', function( http_servers, session_options, options ) {
    // ToDo: make this accessible through express_instances() singleton
    
    const application = express();
    
    if ( session_options ) {
      if ( ! session_options.store ) {
        session_options.store = new Express_Session_Store( rs.session_store( session_options.store_location ) );
      }
      
      session_options && application.use( session( session_options ) )
    }
    
    application
      .use( parser.urlencoded( { extended: false } ) )
      .use( parser.json() )
    ;
    
    http_servers.serve_http_servers( handler,
      { routes: [ '/', options.base_route || '' ], methods: options.methods || [ 'GET', 'POST' ] }
    );
    
    return http_servers.namespace()
      
      .set( [ { id: 1, application, session_options } ] )
    ;
    
    // serve_http_servers() handler that does not receive the next()
    // parameter, because errors will be handled by express
    // ToDo: why did we add the next parameter to handler?
    function handler( request, response, next ) {
      application( request, response, next )
    }
  } ) // express_application()
;

/* ----------------------------------------------------------------------------
   content_route( route, options )
   
   Add a route and express middleware handler for a content.
   
   This is a stateless synchronous greedy pipelet.
   
   Source dataflow:
   - content (String): content to deliver
   
   Destination dataflow:
   - id (String)       : route parameter of this pipelet
   - content (String)  : from source
   - handler (Function): express middleware
   
   Example:
   
     rs.set( [ { content: 'hello, world' } ] )
       .content_route( '/hello' )
       .express_route()
     ;
*/
rs.Compose( 'content_route', function( source, _route, options ) {
  return source.alter( function( route ) {
    route.id = _route;
    
    route.handler = function( request, response, next ) {
      response.end( route.content );
    }
  } );
} ); // content_route()

/* ----------------------------------------------------------------------------
    @pipelet session_store( location, options )
    
    @short Session store dataflow.
    
    @parameters
    - **location** (String): address of session store server, default is
    "local" meaning local in-memory set(), e.g. example.com:8000
    - **options** (Object): options are evaluated on the first
    instanciation of each singleton:
      - **traces** (Boolean): if true, trace input and output, default
      is false.
    
    @examples
    Define @@singleton database model getting authenticated passport user
    sessions:
    ```javascript
    rs.Singleton( 'user_sessions', function( source, options ) {
      
      return source
        .namespace()
        .session_store()
        .passport_user_sessions()
      ;
    } ) // user_sessions()
    ```
    
    @description
    This is a @@multiton stateful greedy pipelet. If location is undefined
    or "local", it is synchronous, if location is defined and not "local"
    it is asynchronous. There is one singleton per location.
    
    Location only needs to be provided on first invocation which should be
    from pipelet express_application().
    
    @see_also
    - Pipelet passport_user_sessions()
    - Pipelet express_application()
    - Pipelet socket_io_server()
*/
function get_location( location ) {
  return location || 'local';
} // get_location()

rs.Multiton( 'session_store', get_location, function( source, location, options ) {
  location = get_location( location );
  
  var name   = location + ' session store '
    , traces = options.traces
    , store  = traces ? source.trace( name + 'input' ) : source
  ;
  
  if ( location == 'local' ) {
    store = store
      .set( [], { name: name } )
    ;
    
    store._output.on( 'add', function( values ) {
      values.forEach( function( value ) {
        var content = value.content
          , cookie
          , expires
        ;
        
        if ( content && ( cookie = content.cookie ) ) {
          de&&ug( 'new session id:', value.id, 'cookie:', cookie );
          
          expires = cookie.expires;
          
          if ( expires ) {
            // ToDo: implement expiration timeouts.
          }
        }
      } )
    } );
  } else {
    store = store
      .socket_io_server( { location: location } )
    ;
  }
  
  return traces ? store.trace( name + 'output' ) : store;
} ); // session_store()

/* ----------------------------------------------------------------------------
    @function Express_Session_Store( store_pipelet )
    
    @short An express session store using a pipelet to retrieve and store sessions.
    
    @manual internal
    
    @parameters
    - store_pipelet (Pipelet): a stateful pipelet to store and retrieve sessions.
    
    @see_also
    - Pipelet express_application()
*/
function Express_Session_Store( store_pipelet ) {
  Store.call( this );
  
  this.store = store_pipelet;
} // Express_Session_Store()

subclass( Store, Express_Session_Store, {
  get: function( id, done ) {
    if ( id ) {
      this.store._output.fetch_all( fetched, [ { id: id } ] );
    } else {
      error( 'id must not be null or undefined or zero' );
    }
    
    function fetched( sessions, no_more ) {
      var l = sessions && sessions.length;
      
      if ( l > 1 ) {
        error( 'more than one value returned' );
      } else {
        // clone content because express-session makes side effects on it
        done( null, l ? extend.object_clone( sessions[ 0 ].content ): null );
      }
    } // fetched()
    
    function error( message ) {
      done( 'Express_Session_Store()..get(), ' + message + ', id: ' + id );
    }
  }, // get()
  
  set: function( id, content, done ) {
    // Reduce content to something that can be transported using JSON, i.e. remove undefined values and functions
    // ToDo: implement extend.JSON_clone() that is the equivalent of JSON.parse( JSON.stringify( value ) )
    var _content = content && { 'id': id, 'content': JSON.parse( JSON.stringify( content ) ) }
      , store    = this.store
    ;
    
    this.get( id, rx );
    
    function rx( error, previous ) {
      if ( error ) return done( error );
      
      if ( previous ) {
        var _previous = { 'id': id, 'content': previous };
        
        if ( content ) {
          store._update( [ [ _previous, _content ] ] );
        } else {
          store._remove( [ _previous ] );
        }
      } else {
        if ( content ) {
          store._add( [ _content ] );
        }
      }
      
      done();
    } // rx()
  } // set()
} ); // Express_Session_Store()

/* ----------------------------------------------------------------------------
    @pipelet express_route( options )
    
    @short Reactive router with express middleware
    
    @parameters
    - **options** (Object):
      - **name**  (String): debugging name, set on first call to singleton
    
    @source
    - **id** (String): absolute pathname for the route
    - **handler** (Function): express handler, signature:
    ```handler( request, response, next )```
    
    @examples
    Express middleware:
    ```javascript
    app.use( rs.express_route()._router() );
    ```
    
    @description
    This is a @@singleton @@stateful @@synchronous @@greedy pipelet.
*/
function Express_Route( options ) {
  Set.call( this, [], { name: options.name } );
  
  // Store state in object for fast lookup by _router()
  this._routes = {};
} // Express_Route()

Set.Build( 'express_route', Express_Route, function( Super ) { return {
  _router: function() {
    de&&ug( 'router middleware initialized' );
    
    var routes = this._routes;
    
    return router;
    
    function router( request, response, next ) {
      var pathname = url.parse( request.url ).pathname
        , handler  = routes[ pathname ]
      ;
      
      if ( ! handler ) return next();
      
      de&&ug( 'router middleware, session id: ', request.sessionID
        , ', pathname:', pathname
        , ', session:' , request.session
      );
      
      // Provide tracing redirect method into Object response
      response.redirect = redirect;
      
      handler( request, response, next );
      
      function redirect( url ) {
        de&&ug( 'redirecting to : ' + url );
        
        this.writeHead( 302, { location: url } );
        
        this.end();
      } // redirect()
    } // router()
  }, // _router()
  
  _add: function( routes, options ) {
    var _routes = this._routes;
    
    routes.forEach( function( route ) {
      _routes[ route.id ] = route.handler;
    } );
    
    return Super._add.call( this, routes, options );
  }, // _add()
  
  _remove: function( routes, options ) {
    var _routes = this._routes;
    
    routes.forEach( function( route ) {
      delete _routes[ route.id ];
    } );
    
    return Super._remove.call( this, routes, options );
  }, // _remove()
} } ) // express_route()

.singleton(); // make it a singleton, instances scope is that of the source namespace

// express.js
