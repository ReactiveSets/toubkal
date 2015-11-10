/*  express.js
    
    ----
    
    Copyright (C) 2013, 2015, Reactive Sets

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

/* -------------------------------------------------------------------------------------------
   Express pipelets
*/
'use strict';

var url      = require( 'url' )
  , session  = require( 'express-session' )
  
  , rs       = require( '../core/pipelet.js' )
  , RS       = rs.RS
  
  , Compose  = RS.Pipelet.Compose
  , Set      = RS.Set
  , subclass = RS.subclass
  , extend   = RS.extend
  
  , Store    = session.Store
  
  , log      = RS.log.bind( null, 'express' )
  , de       = true
  , ug       = log
;

/* -------------------------------------------------------------------------------------------
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
Compose( 'content_route', function( source, _route, options ) {
  return source.alter( function( route ) {
    route.id = _route;
    
    route.handler = function( request, response, next ) {
      response.end( route.content );
    }
  } );
} ); // content_route()

/* -------------------------------------------------------------------------------------------
   session_store( location, options )
   
   Session store dataflow.
   
   This is a multiton stateful greedy pipelet. If location is undefined or "local", it is
   synchronous, if location is defined and not "local" it is asynchronous. There is one
   sigleton per location.
   
   Parameters:
   - location (String): address of session store server, default is "local" meaning local
     in-memory set(), e.g. example.com:8000
   - options (optional Object): options are evaluated on the first instanciation of each
     singleton:
     - traces (Boolean): if true, trace input and output, default is false.
   
   ToDo: implement expiration timeouts.
*/
var session_stores = {};

Compose( 'session_store', function( source, location, options ) {
  location = location || 'local';
  
  if ( session_stores[ location ] ) return session_stores[ location ];
  
  var name          = location + ' session store '
    , traces        = options.traces
    , store_input   = traces ? rs.trace( name + 'input' ) : rs
    , store
  ;
  
  if ( location == 'local' ) {
    store = store_input
      .set( [], { name: name } )
    ;
  } else {
    store = store_input
      .socket_io_server( { location: location } )
    ;
  }
  
  var store_output  = traces && store.trace( name + 'output' )
    , session_store = traces ? rs.encapsulate( store_input, store_output ) : store
  ;
  
  session_stores[ location ] = session_store;
  
  session_store._add_source( source );
  
  return session_store;
} ); // session_store()

/* -------------------------------------------------------------------------------------------
   Express_Session_Store( store_pipelet )
   
   An express session store using a pipelet to retrieve and store sessions.
   
   Parameters:
   - store_pipelet (Pipelet): a stateful pipelet to store and retrieve sessions.
   
   Typical usage:
   
     var rs              = require( 'toubkal' )
       , application     = require( 'express' )()
       , session         = require( 'express-session' )
       
       , store_dataflow  = rs.session_store( 'sessions.example.com:8000' )
       
       , store           = new rs.RS.Express_Session_Store( store_dataflow )
       , session_options = {
           key: 'rs_sid',
           secret: 'some secret',
           saveUninitialized: true,
           resave: false,
           store: store
         }
     ;
     
     application
       .use( session( session_options ) )
     ;
*/
function Express_Session_Store( store_pipelet ) {
  Store.call( this );
  
  this.store = store_pipelet;
} // Express_Session_Store()

RS.Express_Session_Store = Express_Session_Store;

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

/* -------------------------------------------------------------------------------------------
   express_route( options )
   
   Reactive router with express middleware
   
   This is a singleton stateful synchronous greedy pipelet.
   
   Parameters:
   - options (Object):
     - name  (String): debugging name, set on first call to singleton
   
   Express middleware:
   
   app.use( rs.express_route()._router() );
   
   input routes have the following attributes:
   - id (String): absolute pathname for the route
   - handler (Function): express handler, signature:
     handler( request, response, next )
*/
var express_route_singleton;

function Express_Route( options ) {
  if ( express_route_singleton ) return express_route_singleton;
  
  express_route_singleton = this;
  
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
      
      if ( ! handler
        || 'GET' !== request.method
      ) return next();
      
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
} } ); // express_route()

/* -------------------------------------------------------------------------------------------
   module exports
*/
RS.add_exports( {
  'Express_Session_Store': Express_Session_Store,
  'Express_Route': Express_Route
} );

de&&ug( "module loaded" );

// express.js
