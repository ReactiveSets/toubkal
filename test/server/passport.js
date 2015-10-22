// passport.js

/* -------------------------------------------------------------------------------------------
   Express Application for Passport
*/
var rs                 = require( 'toubkal'                    )
  , express            = require( 'express'                    )
  , logger             = require( 'morgan'                     )
  , cookie_parser      = require( 'cookie-parser'              )
  , parseSignedCookies = require( 'cookie-parser/lib/parse.js' ).signedCookies
  , body_parser        = require( 'body-parser'                )
  , session            = require( 'express-session'            )
  , passport           = require( 'passport'                   )
  , cookie             = require( 'cookie'                     )
  , uid2               = require( 'uid2'                       )
  
  , application        = express()
  , parse_cookie       = cookie.parse
  , session_store      = new session.MemoryStore()
  , session_options    = { key: 'rs_sid', secret: 'fudge', store: session_store }
  
  // Make a handler that does not receive the next() parameter, because errors will be
  // handled by express
  , handler = function( request, response ) { application( request, response ) }
  
  , passport_route = '/passport'
  
  , RS  = rs.RS
  , log = RS.log
  , de  = true
  , ug  = log.bind( null, 'passport' )
  
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
  
  return get_session;
} // module.exports

function get_session( request, fn ) {
  var cookie = request.headers.cookie;
  
  if ( ! request.signedCookies ) {
    if ( ! request.cookies ) {
      cookie = decodeURIComponent( cookie );
      
      de&&ug( 'get_session(), decoded cookie: ' + cookie );
      
      request.cookies = cookie = parse_cookie( cookie );
      
      de&&ug( 'get_session(), parsed cookie: ' + log.s( cookie ) );
    }
    
    request.signedCookies = cookie = parseSignedCookies( cookie, session_options.secret );
    
    de&&ug( 'get_session(), signed cookie parsed: ' + log.s( cookie ) );
  }
  
  var rs_sid = request.signedCookies[ session_options.key ];
  
  de&&ug( 'get_session(), rs_sid: ' + rs_sid );
  
  session_store.get( rs_sid, function( error, _session ) {
    if ( error ) {
      de&&ug( 'get_session(), error getting session from store: ' + error );
    } else if ( _session ) {
      de&&ug( 'get_session(), create session in request, _session:', _session );
      
      request.sessionID = rs_sid;
      request.sessionStore = session_store;
      
      _session = session_store.createSession( request, _session );
    /*
    } else {
    
      de&&ug( 'get_session(), no session, create empty session' );
      
      if ( ! rs_sid ) {
        rs_sid = uid2( 24 );
        
        de&&ug( 'get_session(), no rs_sid, generate: ' + rs_sid );
        
        // ToDo: Need to setup cookie on response.end that needs to be captured in socket.io handshake, cannot be done here
      }
      
      request.sessionID = rs_sid;
      request.sessionStore = session_store;
      
      _session = new session.Session( request );
      _session.cookie = new session.Cookie( {} );
      
      _session = session_store.createSession( request, _session );
    */
    }
    
    fn( error, _session );
  } )
} // get_session()
