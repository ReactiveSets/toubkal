// passport.js

/* -------------------------------------------------------------------------------------------
   Express Application for Passport
*/
var rs                 = require( 'toubkal'         )
  , application        = require( 'express'         )()
  , logger             = require( 'morgan'          )
  , body_parser        = require( 'body-parser'     )
  , session            = require( 'express-session' )
  , passport           = require( 'passport'        )
  
  , session_options    = {
      key: 'rs_sid',
      secret: 'fudge', // ToDo: get express-session secret from configuration
      store: new session.MemoryStore(),
      saveUninitialized: true,
      resave: false
    }
  
  , base_url           = 'http://localhost:8080'
  , passport_route     = '/passport'
;

require( 'toubkal/lib/server/passport.js' );

application
  .use( logger()                   )
  .use( body_parser()              )
  .use( session( session_options ) )
  .use( passport.initialize()      )
  .use( passport.session()         )
;

// Define in-memory database singleton
!function() {
  var schemas = rs.set( [
    { id: 'user_profile' },
    { id: 'user_provider_profile', key: [ 'user_id', 'provider_id' ] },
    { id: 'user_provider_email' }
  ] );
  
  var database; // singleton
  
  rs.RS.Pipelet.Compose( 'database', function( source, options ) {
    // ToDo: add singleton option to Compose()
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
}() // database()

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
    
    return profile;
  }, { no_clone: true } )
  
  .trace( 'new user profiles' )
  
  .database()
;

rs
  .passport_strategies_configuration( base_url + passport_route )
  
  .trace( 'configured strategies' )
  
  .passport_strategies()
  
  .trace( 'initialized strategies' )
  
  .passport_routes( application, { base_route: passport_route } )
;

module.exports = function( http_servers ) {
  // Bind express Application to base url route '/passport'
  http_servers
    .serve_http_servers( handler, { routes: passport_route } )
  ;
  
  return session_options;
} // module.exports

// serve_http_servers() handler that does not receive the next()
// parameter, because errors will be handled by express
function handler( request, response ) {
  application( request, response )
}
