// passport.js

/* -------------------------------------------------------------------------------------------
   Express Application for Passport
*/
var rs                 = require( 'toubkal'         )
  , application        = require( 'express'         )()
  , session            = require( 'express-session' )
  , passport           = require( 'passport'        )
  
  , Compose            = rs.RS.Pipelet.Compose
  
    // ToDo: get session_options from configuration
  , session_options    = {
      key: 'rs_sid',
      secret: 'fudge',
      saveUninitialized: true,
      resave: false
    }
  
  , base_url           = 'http://localhost:8080'
  , passport_route     = '/passport'
;

session_options.store = new rs.RS.Express_Session_Store( rs.session_store() );

application
  .use( session( session_options ) )
  .use( passport.initialize()      )
  .use( passport.session()         )
  
  .use( rs.express_route()._router() )
  
  .get( '/passport/logout', function( request, response, next ) {
    var base_route = passport_route;
    
    request.logout();
    
    response.redirect( base_route + '/login' );
  } )
  
  .get( '/passport/profile', function( request, response, next ) {
    var base_route = passport_route;
    
    if( ! request.isAuthenticated() ) return response.redirect( '/passport/login' );
    
    var user = request.user
      , res  = '<p><a href="'  + base_route       + '/logout">logout</a></p>'
          + '<p><img src="'    + user.photo       + '" /></p>'
          + '<p>Name: '        + user.name        + '</p>'
          + '<p>User ID: '     + user.id          + '</p>'
          + '<p>Provider ID: ' + user.provider_id + '</p>'
    ;
    
    response.end( res );
  } )
;

// Define in-memory database singleton
!function() {
  var schemas = rs.set( [
    { id: 'user_profile' },
    { id: 'user_provider_profile', key: [ 'user_id', 'provider_id' ] },
    { id: 'user_provider_email' }
  ] );
  
  var database; // singleton
  
  Compose( 'database', function( source, options ) {
    // ToDo: add singleton option to Compose()
    database = database || rs.dispatch( schemas, function( source, options ) {
      var flow = this.id;
      
      return source
        .flow( flow, { key: this.key || [ 'id' ] } )
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
  
  .map( function( user ) {
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
  } )
  
  .trace( 'new user profiles' )
  
  .database()
;

var login_menu = rs
  .passport_strategies()
  
  // Don't do anything if this is just a credentials change
  .operations_optimizer()
  
  // Set order attribute to name if not present
  .alter( function( strategy ) { strategy.order = strategy.order || strategy.name } )
  
  // All strategies into content attribute
  .values_to_attribute()
  
  // Sort strategies in content by order attribute
  .content_order( 'order' )
  
  // Render html in content attribute from strategies
  .content_transform( function( strategies ) {
    return '' +
      '<html>\n' +
      '  <head>\n' +
      '    <style>li {list-style-type: none;}</style>\n' +
      '  </head>\n' +
      
      '  <body>\n' +
      '    <ul>\n' +
      '      <li>Login using your account at</li>\n' +
            
            strategies
              .map( function( strategy ) {
                var name = strategy.display_name || strategy.name
                  , path = '/passport/' + strategy.name
                ;
                
                return '      <li><a href="' + path + '">' + name + '</a></li>\n'
              } )
              
              .join( '' )
            +
      '    </ul>\n' +
      '  <body>\n' +
      '</html>\n'
    ;
  } )
  
  .content_route( '/passport/login' )
;

rs
  .passport_strategies_configuration( base_url + passport_route )
  
  .trace( 'configured strategies' )
  
  .passport_strategies()
  
  .trace( 'initialized strategies' )
  
  .passport_strategies_routes()
  
  .union( [ login_menu ] )
  
  .express_route()
;

module.exports = function( http_servers ) {
  // Bind express Application to base url route '/passport'
  http_servers
    // ToDo: make a pipelet to serve an express application
    .serve_http_servers( handler, { routes: passport_route } )
  ;
  
  return session_options;
} // module.exports

// serve_http_servers() handler that does not receive the next()
// parameter, because errors will be handled by express
function handler( request, response ) {
  application( request, response )
}
