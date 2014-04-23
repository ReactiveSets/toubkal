// passport.js

var xs  = require( '..'  )
  , url = require( 'url' )
;

// require( '../lib/server/passport.js' );
// require( '../lib/join.js' );

var XS  = xs.XS
  , log = XS.log
  , de  = true
  
  , extend = XS.extend
;

function ug( message ) { log( 'passport, ' + message ) }

var logger          = require( 'morgan' )
  , cookie_parser   = require( 'cookie-parser' )
  , body_parser     = require( 'body-parser' )
  , session         = require( 'express-session' )
  , passport        = require( 'passport' )
  , TwitterStrategy = require( 'passport-twitter' ).Strategy
;

module.exports = function( express, session_options, application, __base ) {
  passport.serializeUser( function( user, done ) {
    de&&ug( 'passport.serializeUser(), user: ' + log.s( user ) );
    
    done( null, user );
  } );
  
  passport.deserializeUser( function( user, done ) {
    de&&ug( 'passport.deserializeUser(), user' + log.s( user ) );
    
    done( null, user );
  } );
  
  passport.use(
    new TwitterStrategy( {
        consumerKey   : 'srpPDY5XOggG8iBjO1qOU2i7A'
      , consumerSecret: 'yBDPnmATAf1AwBrr2hvRqI683gXotnIS8VttzGFBwdAPmeDHmx'
      , callbackURL   : 'http://146.185.152.167:7001/passport/twitter/callback'
    },
    
    function( token, tokenSecret, profile, done ) {
      de&&ug( 'new TwitterStrategy(), verify(): ' + log.s( profile ) );
      
      return done( null, profile );
    } )
  );
  
  application
    .use( logger()                   ) // request logger middleware
    .use( cookie_parser()            ) // cookie parser
    .use( body_parser()              ) // extensible request body parser
    .use( session( session_options ) ) // session management
    .use( passport.initialize() )
    .use( passport.session   () )
  ;
  
  var application_routes = {
    '/passport/twitter': { method: 'GET'
      , handler: passport.authenticate( 'twitter' )
    },
    
    '/passport/twitter/callback': { method: 'GET'
      , handler: ( function() {
          var fn = passport.authenticate( 'twitter', { successRedirect: __base + '/profile', failureRedirect: __base + '/login' } )
          
          return function( request, response, next ) {
            de&&ug( 'passport.authenticate with options' );
            console.log( "request._passport: ", request._passport );
            
            fn( request, response, next );
          }
        } )()
    }
  };
  
  application
    .use( function( request, response, next ) { 
      var _url   = url.parse( request.url ).pathname
        , method = request.method
        , route  = application_routes[ _url ]
      ;
      
      console.log( response.redirect );
      
      if( ! route ) return next();
      
      if( route.method !== method ) return next();
      
      de&&ug( 'router middleware, session id: ' + request.sessionID + ', url: ' + _url + ', method: ' + method
        + ', session: ' + log.s( request.session )
      );
      
      response.redirect = function( url ) {
        de&&ug( 'redirecting to : ' + url );
        
        response.writeHead( 302, { location: url } )
        response.end()
      };
      
      route.handler.call( this, request, response, next );
    } )
  ;
  
  /*
  XS.notifications = xs.set();
  
  var input                 = xs.pass_through()
    , user_profile          = input.flow( 'user_profile'          ).set()
    , user_provider_profile = input.flow( 'user_provider_profile' ).set()
    , user_provider_email   = input.flow( 'user_provider_email'   ).set( [], { key: [ 'user_id', 'provider_id' ] } )
    
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
  
  function config( values ) {
    var passport = values[ 0 ];
    
    if( ! passport ) return;
    
    
    user_profile._fetch_all( function( values ) { console.log( values ); } );
  } // config()
  */
  
  /*
  */
  
  // application is an instance of the connect framework
  /*
  /*
  application
    .use( connect.logger        ()                  ) // request logger middleware
    .use( connect.cookieParser  ()                  ) // cookie parser
    .use( connect.bodyParser    ()                  ) // extensible request body parser
    .use( connect.methodOverride()                  ) // faux HTTP method support
    .use( connect.session       ( session_options ) ) // session management
    // .use( passport.initialize() )
    // .use( passport.session   () )
  ;
  
  
  function router( request, response, next ) {
    de&&ug( 'router middleware' );
    
    var url    = request.url
      , method = request.method
      , message
    ;
    
    switch( method ) {
      case 'GET':
             if( url === '/passport/login'  ) message = '<a href="/auth/twitter">Login with Twitter</a>';
        else if( url === '/passport/signup' ) message = 'Registration Form';
        else if( url === '/passport/logout' ) message = 'Logout';
      break;
      
      case 'POST':
             if( url === '/passport/login'  ) message = 'Authentify user';
        else if( url === '/passport/signup' ) message = 'Create new User';
      break;
    }
    
    console.log( 'url: ', url, ', method: ', method, ', message: ', message );
    
    response.end( message );
  }
  
  
  
  application.use( function( request, response, next ) {
    de&&ug( 'url: ' + request.url );
    
    next();
  } );
  */
} // module.exports

function join_strategies( config_strategie, commun_strategie ) {
  return extend( commun_strategie, config_strategie );
}
