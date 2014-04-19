// passport.js

xs = require( '..' );

// require( '../lib/server/passport.js' );
// require( '../lib/join.js' );

var XS  = xs.XS
  , log = XS.log
  , de  = true
  
  , extend = XS.extend
;

function ug( message ) { log( 'passport, ' + message ) }

var passport = require( 'passport' ), TwitterStrategy = require('passport-twitter').Strategy;

module.exports = function( connect, session_options, application, __base ) {
  passport.serializeUser( function( user, done ) {
    done( null, user );
  } );
  
  passport.deserializeUser( function( obj, done ) {
    done( null, obj );
  } );
  
  passport.use(
    new TwitterStrategy( {
        consumerKey   : 'srpPDY5XOggG8iBjO1qOU2i7A'
      , consumerSecret: 'yBDPnmATAf1AwBrr2hvRqI683gXotnIS8VttzGFBwdAPmeDHmx'
      , callbackURL   : "/passport/auth/twitter/callback"
    },
    
    function( token, tokenSecret, profile, done ) {
      process.nextTick( function () {
        return done( null, profile);
      } );
    } )
  );
  
  application
    .use( connect.logger        ()                  ) // request logger middleware
    .use( connect.cookieParser  ()                  ) // cookie parser
    .use( connect.bodyParser    ()                  ) // extensible request body parser
    .use( connect.methodOverride()                  ) // faux HTTP method support
    .use( connect.session       ( session_options ) ) // session management
    .use( passport.initialize() )
    .use( passport.session   () )
    .use( function( request, response, next ) { 
      de&&ug( 'router middleware, session id: ' + request.sessionID );
      
      var url    = request.url
        , method = request.method
        , message
      ;
      
      switch( method ) {
        case 'GET':
               if( url === __base + '/login'        ) message = '<a href="/passport/auth/twitter">Login with Twitter</a>';
          else if( url === __base + '/signup'       ) message = 'Registration Form';
          else if( url === __base + '/logout'       ) message = 'Logout';
          else if( url === __base + '/error'        ) message = 'Error';
          
          else if( url === __base + '/auth/twitter' ) {
            passport.authenticate( 'twitter', function( error, user, info ) {
              if( error ) { return next( error ); }
              
              if( !user ) { return response.redirect( __base + '/error' ); }
              
              request.logIn( user, function( err ) {
                if( err ) { return next( err ); }
                
                return response.redirect( __base + '/account' );
              } );
            } )( request, response, next );
          }
        break;
        
        case 'POST':
               if( url === __base + '/login'  ) message = 'Authentify user';
          else if( url === __base + '/signup' ) message = 'Create new User';
        break;
      }
      
      response.end( message );
    } )
  ;
  
  
  
  



  // application is an instance of the connect framework
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
    
    passport.serializeUser( function( user, done ) {
      done( null, user );
    } );
    
    passport.deserializeUser( function( user, done ) {
      done( null, obj );
    } );
    
    application
      .use( connect.logger        ()                  ) // request logger middleware
      .use( connect.cookieParser  ()                  ) // cookie parser
      .use( connect.bodyParser    ()                  ) // extensible request body parser
      .use( connect.methodOverride()                  ) // faux HTTP method support
      .use( connect.session       ( session_options ) ) // session management
      .use( passport.initialize() )
      .use( passport.session   () )
      // .use( connect.router( router ) )
      .use( function( request, response, next ) { 
        de&&ug( 'router middleware' );
        
        var url    = request.url
          , method = request.method
          , __base = '/passport'
          , message
        ;
        
        switch( method ) {
          case 'GET':
                 if( url === __base + '/login'        ) message = '<a href="/passport/auth/twitter">Login with Twitter</a>';
            else if( url === __base + '/signup'       ) message = 'Registration Form';
            else if( url === __base + '/logout'       ) message = 'Logout';
            else if( url === __base + '/error'        ) message = 'Error';
            
            else if( url === __base + '/auth/twitter' ) {
              passport.authenticate( 'twitter', function( error, user, info ) {
                if( error ) { return next( error ); }
                
                if( !user ) { return response.redirect( __base + '/error' ); }
                
                request.logIn( user, function( err ) {
                  if( err ) { return next( err ); }
                  
                  return response.redirect( __base + '/account' );
                } );
              } )( request, response, next );
            }
          break;
          
          case 'POST':
                 if( url === __base + '/login'  ) message = 'Authentify user';
            else if( url === __base + '/signup' ) message = 'Create new User';
          break;
        }
        
        // console.log( 'url: ', url, ', method: ', method, ', message: ', message );
        
        response.end( message );
      } )
    ;
    
    
  } // config()
  
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
