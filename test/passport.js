// passport.js

var xs  = require( '..'  )
  
  , logger        = require(     'morgan'      )
  , cookie_parser = require(  'cookie-parser'  )
  , body_parser   = require(   'body-parser'   )
  , session       = require( 'express-session' )
  
;

require( '../lib/server/passport.js' );

var XS  = xs.XS
  , log = XS.log
  , de  = true
  
  , extend = XS.extend
;

function ug( message ) { log( 'passport, ' + message ) }

module.exports = function( express, session_options, application, base_route ) {
  XS.notifications = xs.set();
  
  var input                 = xs.pass_through()
    
    , user_profile          = input.flow( 'user_profile'          ).set()
    , user_provider_profile = input.flow( 'user_provider_profile' ).set()
    , user_provider_email   = input.flow( 'user_provider_email'   ).set( [], { key: [ 'user_id', 'provider_id' ] } )
    
    , output                = xs.union( [ user_profile, user_provider_profile, user_provider_email ] )
    
    , users_database        = xs.encapsulate( input, output )
  ;
  
  xs
    .passport_strategies( users_database )
    
    .passport( users_database )
    
    ._on( 'middleware', app_config )
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
