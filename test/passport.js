// passport.js

xs = require( '..' );

var XS = xs.XS
  , log = XS.log
  , de = true
;

function ug( message ) { log( 'passport, ' + message ) };

module.exports = function( connect, application ) {
  // application is an instance of the connect framework
  
  application.use( function( request, response, next ) {
    de&&ug( 'url: ' + request.url );
    
    next();
  } );
} // module.exports
