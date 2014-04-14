// passport.js

xs = require( '..' );

var XS = xs.XS
  , log = XS.log
  , de = true
;

function ug( message ) { log( 'passport, ' + message ) };

module.exports = function( application ) {
  // application is an instance of a connect-compatible framework
  
  application.use( function( request, response, next ) {
    de&&ug( 'url: ' + request.url );
    
    next();
  } );
} // module.exports
