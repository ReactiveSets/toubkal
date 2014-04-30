// passport.js

var xs  = require( '..'  )
  , XS  = xs.XS
  , log = XS.log
  , de  = true
  
  , extend = XS.extend
;

function ug( message ) { log( 'passport routes, ' + message ) }

module.exports = function( passport, base_route ) {
  return {
    '/passport/login': { method: 'GET'
      , handler: function( request, response, next ) {
          if( request.isAuthenticated() ) {
            response.redirect( '/passport/profile' );
          } else {
            response.end( '<a href="/passport/facebook">Login with Facebook</a> | <a href="/passport/twitter">Login with Twitter</a>' );
          }
        }
    },
    
    '/passport/profile': { method: 'GET'
      , handler: function( request, response, next ) {
          
          if( request.isAuthenticated() ) {
            var user = request.user
              , res  = '<p><a href="'  + base_route + '/logout">logout</a></p>'
                  
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
          
          response.redirect( base_route + '/login' );
        }
    },
    
    '/passport/twitter': { method: 'GET'
      , handler: passport.authenticate( 'twitter' )
    },
    
    '/passport/twitter/callback': { method: 'GET'
      , handler: passport.authenticate( 'twitter', { successRedirect: base_route + '/profile', failureRedirect: base_route + '/login' } )
    },
    
    '/passport/facebook': { method: 'GET'
      , handler: passport.authenticate( 'facebook' )
    },
    
    '/passport/facebook/callback': { method: 'GET'
      , handler: passport.authenticate( 'facebook', { successRedirect: base_route + '/profile', failureRedirect: base_route + '/login' } )
    }
  };
} // module.exports
