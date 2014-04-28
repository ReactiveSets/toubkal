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

var logger        = require( 'morgan' )
  , cookie_parser = require( 'cookie-parser' )
  , body_parser   = require( 'body-parser' )
  , session       = require( 'express-session' )
;

module.exports = function( express, session_options, application, __base ) {
  XS.notifications = xs.set();
  
  var input                 = xs.pass_through()
    , user_profile          = input.flow( 'user_profile'          ).set().trace( 'user profile out' )
    , user_provider_profile = input.flow( 'user_provider_profile' ).set().trace( 'user provider profile out' )
    , user_provider_email   = input.flow( 'user_provider_email'   ).set( [], { key: [ 'user_id', 'provider_id' ] } ).trace( 'user provider email out' )
    
    , output                = xs.union( [ user_profile, user_provider_profile, user_provider_email ] )
    
    , users                 = xs.encapsulate( input, output )
  ;
  
  xs
    .configuration()
    
    .filter( [ { module: 'passport_strategies' } ] )
    
    .attribute_to_values( { attribute_name: 'strategies' } )
    
    .join( XS.Commun_Strategies, [ [ 'id', 'id' ] ], join_strategies )
    
    .passport_strategies( users )
    
    .passport()
    
    ._on( 'add', config )
  ;
  
  // config()
  function config( values ) {
    var passport = values[ 0 ];
    
    if( ! passport ) return;
    
    var application_routes = {
      '/passport/login': { method: 'GET'
        , handler: function( request, response, next ) {
            if( request.isAuthenticated() ) {
              response.redirect( '/passport/profile' );
            } else {
              response.end( '<a href="/passport/twitter">Login with Twitter</a>' );
            }
          }
      },
      
      '/passport/profile': { method: 'GET'
        , handler: function( request, response, next ) {
            
            if( request.isAuthenticated() ) {
              var user = request.user
                , res  = '<p><a href="'  + __base + '/logout">logout</a></p>'
                    
                    + '<p><img src="'    + user.photo       + '" /></p>'
                    + '<p>Name: '        + user.name        + '</p>'
                    + '<p>User ID: '     + user.id          + '</p>'
                    + '<p>Provider ID: ' + user.provider_id + '</p>'
              ;
              
              response.end( res );
            } else {
              response.redirect( '/passport/login' );
            }
          }
      },
      
      '/passport/logout': { method: 'GET'
        , handler: function( request, response, next ) {
            request.logout();
            
            de&&ug( 'logout(), session: ' + log.s( request.session ) );
            
            response.redirect( __base + '/login' );
          }
      },
      
      '/passport/twitter': { method: 'GET'
        , handler: passport.authenticate( 'twitter' )
      },
      
      '/passport/twitter/callback': { method: 'GET'
        , handler: passport.authenticate( 'twitter', { successRedirect: __base + '/profile', failureRedirect: __base + '/login' } )
      }
    };
    
    passport.serializeUser( function( user, done ) {
      de&&ug( 'passport.serializeUser(), user : ' + log.s( user ) );
      
      done( null, user.id );
    } );
    
    passport.deserializeUser( function( user_id, done ) {
      users._fetch_all( function( user_profiles ) {
        var user = user_profiles[ 0 ];
        
        if( ! user ) return done( new Error( 'user with id: ' + user_id + ' not found' ) );
        
        de&&ug( 'passport.deserializeUser(), user: ' + log.s( user ) );
        
        return done( null, user )
      }, [ { flow: 'user_profile', id: user_id } ] );
    } );
    
    application
      .use( logger()                   ) // request logger middleware
      .use( cookie_parser()            ) // cookie parser
      .use( body_parser()              ) // extensible request body parser
      .use( session( session_options ) ) // session management
      .use( passport.initialize() )
      .use( passport.session   () )
      .use( function( request, response, next ) { 
        var _url   = url.parse( request.url ).pathname
          , method = request.method
          , route  = application_routes[ _url ]
        ;
        
        if( ! route ) return next();
        
        if( route.method !== method ) return next();
        
        de&&ug( 'router middleware, session id: ' + request.sessionID + ', url: ' + _url + ', method: ' + method
          + ', session: ' + log.s( request.session )
        );
        
        response.redirect = function( url ) {
          de&&ug( 'redirecting to : ' + url );
          
          response.writeHead( 302, { location: url } );
          
          response.end();
        };
        
        route.handler.call( this, request, response, next );
      } )
    ;
  }
} // module.exports

function join_strategies( config_strategie, commun_strategie ) {
  return extend( commun_strategie, config_strategie );
}
