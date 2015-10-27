// passport.js

/* -------------------------------------------------------------------------------------------
   Express Application for Passport
*/
var rs                 = require( 'toubkal'         )
  , express            = require( 'express'         )
  , logger             = require( 'morgan'          )
  , cookie_parser      = require( 'cookie-parser'   )
  , body_parser        = require( 'body-parser'     )
  , session            = require( 'express-session' )
  , passport           = require( 'passport'        )
  
  , application        = express()
  , session_store      = new session.MemoryStore()
  , session_options    = { key: 'rs_sid', secret: 'fudge', store: session_store }
  
  // Make a handler that does not receive the next() parameter, because errors will be
  // handled by express
  , handler = function( request, response ) { application( request, response ) }
  
  , passport_route = '/passport'
  
  , RS  = rs.RS
  , log = RS.log.bind( null, 'passport' )
  , de  = true
  , ug  = log
  
  , extend = RS.extend
  
  , base_url = 'http://localhost:8080';
;

require( 'toubkal/lib/server/passport.js' );

application
  .use( logger()                   ) // request logger middleware
  .use( cookie_parser()            ) // cookie parser
  .use( body_parser()              ) // extensible request body parser
  .use( session( session_options ) ) // manage sessions
  .use( passport.initialize()      )
  .use( passport.session()         )
;

// Define in-memory database
var schemas = rs.set( [
  { id: 'user_profile' },
  { id: 'user_provider_profile', key: [ 'user_id', 'provider_id' ] },
  { id: 'user_provider_email' }
] );

var database;

RS.Pipelet.Compose( 'database', function( source, options ) {
  // ToDo: add singleton option to RS.Pipelet.Compose()
  database = database || rs.dispatch( schemas, function( source, options ) {
    var flow = this.id;
    
    return source
      .flow( flow, { key: this.key } )
      // .mysql( flow, this.columns )
      .set( [] )
      .flow( flow )
    ;
  } );
  
  return database._add_source( source );
} );

// Passport user profiles
rs
  .database()
  
  .flow( 'user_profile' )
  
  .passport_profiles()
  
  .alter( function( user ) {
    // New user profile from provider profile
    var _ = user.profile;
    
    var profile = {
      flow         : 'user_profile',
      id           : user.id,
      provider_name: user.provider_name,
      provider_id  : user.provider_id,
      name         : _.displayName,
      emails       : _.emails,
      photo        : _.photos[ 0 ].value
    };
    
    de&&ug( 'new user profile:', user );
    
    return profile;
  }, { no_clone: true } )
  
  .database()
;

rs
  .passport_strategies_configuration( base_url + passport_route )
  
  .passport_strategies()
  
  .trace( 'strategies' )
  
  .passport_routes( application, { base_route: passport_route } )
;

module.exports = function( http_servers ) {
  // Bind express Application to base url route '/passport'
  http_servers
    .serve_http_servers( handler, { routes: passport_route } )
  ;
  
  return get_session( session_options );
} // module.exports

function get_session( session_options ) {
  var ug                 = log.bind( null, 'get_session(),' )
  //, uid2               = require( 'uid2' )
    , cookie_parser      = require( 'cookie-parser' )( session_options.secret )
  ;
  
  return function( request, next ) {
    cookie_parser( request, null, function( error ) {
      if ( error ) return next( error );
      
      _get_session( request, next );
    } );
  };
  
  function _get_session( request, next ) {
    var rs_sid = request.signedCookies[ session_options.key ];
    
    de&&ug( 'rs_sid:', rs_sid );
    
    var session_store = session_options.store;
    
    session_store.get( rs_sid, function( error, _session ) {
      if ( error ) {
        de&&ug( 'error getting session from store:', error );
        
        return next( error );
      }
      
      request.sessionStore = session_store;
      
      if ( _session ) {
        de&&ug( 'create session in request, _session:', _session );
        
        request.sessionID = rs_sid;
        
        _session = session_store.createSession( request, _session );
        
      /*
      } else {
      
        de&&ug( 'no session, create empty session' );
        
        if ( ! rs_sid ) {
          rs_sid = uid2( 24 );
          
          de&&ug( 'no rs_sid, generate:', rs_sid );
          
          // ToDo: Need to setup cookie on response.end that needs to be captured in socket.io handshake, cannot be done here
        }
        
        request.sessionID = rs_sid;
        
        _session = new session.Session( request );
        _session.cookie = new session.Cookie( {} );
        
        _session = session_store.createSession( request, _session );
      */
      }
      
      next( null, _session );
    } )
  } // _get_session()
} // get_session()
