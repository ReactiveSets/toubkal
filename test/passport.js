// passport.js

var xs  = require( '..'  )
  , url = require( 'url' )
;

require( '../lib/server/passport.js' );
require( '../lib/join.js' );

var XS  = xs.XS
  , log = XS.log
  , de  = true
  
  , extend = XS.extend
;

function ug( message ) { log( 'passport, ' + message ) }

module.exports = function( express, session_options, application, __base ) {
  XS.notifications = xs.set();
  
  var input                 = xs.pass_through()
    
    , user_profile          = input.flow( 'user_profile'          ).set()
    , user_provider_profile = input.flow( 'user_provider_profile' ).set()
    , user_provider_email   = input.flow( 'user_provider_email'   ).set( [], { key: [ 'user_id', 'provider_id' ] } )
    
    , output                = xs.union( [ user_profile, user_provider_profile, user_provider_email ] )
    
    , users_database        = xs.encapsulate( input, output )
    
    , passport_route        = require( './passport_routes.js' )
  ;
  
  xs
    .passport_strategies( users_database )
    
    .passport( users_database, application, passport_route, { session: session_options, base_route: __base } )
  ;
} // module.exports

function join_strategies( config_strategie, commun_strategie ) {
  return extend( commun_strategie, config_strategie );
}
