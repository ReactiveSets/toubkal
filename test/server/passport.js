// passport.js

var rs  = require( 'toubkal' )
  
  , logger        = require(     'morgan'      )
  , cookie_parser = require(  'cookie-parser'  )
  , body_parser   = require(   'body-parser'   )
  , session       = require( 'express-session' )
  
;

require( 'toubkal/lib/server/passport.js' );

var RS  = rs.RS
  , log = RS.log
  , de  = true
  
  , extend = RS.extend
;

function ug( message ) { log( 'passport, ' + message ) }

module.exports = function( express, session_options, application, base_route ) {
  RS.notifications = rs.set();
  
  var input                 = rs.pass_through()
    
    , user_profile          = input.flow( 'user_profile'          ).set()
    , user_provider_profile = input.flow( 'user_provider_profile' ).set()
    , user_provider_email   = input.flow( 'user_provider_email'   ).set( [], { key: [ 'user_id', 'provider_id' ] } )
    
    , output                = rs.union( [ user_profile, user_provider_profile, user_provider_email ] )
    
    , users_database        = rs.encapsulate( input, output )
  ;
  
  rs
    .passport_strategies( users_database )
    
    .passport( users_database )
    
    ._output.on( 'middleware', app_config )
  ;
  
  function app_config( passport, passport_routes ) {
    application
      .use( logger()                   ) // request logger middleware
      .use( cookie_parser()            ) // cookie parser
      .use( body_parser()              ) // extensible request body parser
      .use( session( session_options ) ) // session management
      .use( passport.initialize()      )
      .use( passport.session()         )
      .use( passport_routes()          )
    ;
  } // app_config()
  
} // module.exports
