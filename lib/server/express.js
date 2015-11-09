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

// ToDo: document content_order()
Compose( 'content_order', function( source, organizer, options ) {
  return source.content_sort( function( a, b ) {
    a = a[ organizer ];
    b = b[ organizer ];
    
    return +( a  >  b )
        || +( a === b ) - 1
    ;
  }, options );
} ); // content_order()

// ToDo: document content_sort()
Compose( 'content_sort', function( source, sorter, options ) {
  return source.content_alter( function( content ) {
    return content.sort( sorter );
  }, options );
} ); // content_order()

// ToDo: document content_alter()
Compose( 'content_alter', function( source, transform, options ) {
  var content = options.content || 'content'
    , object_clone = extend.object_clone
  ;
  
  return source
    .alter( function( value ) {
      value[ content ] = transform( object_clone( value[ content ] ) );
    } )
  ;
} ); // content_alter()

// ToDo: document content_route()
Compose( 'content_route', function( source, _route, options ) {
  return source.alter( function( route ) {
    route.id = _route;
    
    route.handler = function( request, response, next ) {
      response.end( route.content );
    }
  } );
} );

// ToDo: document session_store()
var session_stores = {};

Compose( 'session_store', function( source, location, options ) {
  location = location || 'local';
  
  if ( session_stores[ location ] ) return session_stores[ location ];
  
  var store_input        = rs.trace( 'session store input' )
    , store_output       = store_input.set( [] ).trace( 'session store output' )
    , session_store      = rs.encapsulate( store_input, store_output )
  ;
  
  session_stores[ location ] = session_store;
  
  session_store._add_source( source );
  
  return session_store;
} ); // session_store()

// ToDo: document Session_Store
// ToDo: rename Session_Store into Express_Session_Store
function Session_Store( store_pipelet ) {
  Store.call( this );
  
  this.store = store_pipelet;
} // Session_Store()

RS.Session_Store = Session_Store;

subclass( Store, Session_Store, {
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
      done( 'Session_Store()..get(), ' + message + ', id: ' + id );
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
} ); // Session_Store()

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
  'Session_Store': Session_Store,
  'Express_Route': Express_Route
} );

de&&ug( "module loaded" );

// express.js
