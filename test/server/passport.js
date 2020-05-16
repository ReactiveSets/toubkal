// passport.js

/* -------------------------------------------------------------------------------------------
   Express Application for Passport
*/
var rs                 = require( 'toubkal'         )
  
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

// Initialize express application and passport middleware
rs
  .express_application( session_options )

  .express_use_passport( passport_route )
;


var logout_profile_routes = rs
  
  .set( [
    {
      id: '/passport/logout',
      
      handler: function( request, response, next ) {
        var base_route = passport_route;
        
        request.logout();
        
        response.redirect( base_route + '/login' );
      }
    },
    
    {
      id: '/passport/profile',
      
      handler: function( request, response, next ) {
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
      }
    }
  ] )
;

rs
  // Define schemas
  .Singleton( 'schemas', function( source, options ) {
    return source.set( [
      { id: 'user_profile' },
      { id: 'user_provider_profile', key: [ 'user_id', 'provider_id' ] },
      { id: 'user_provider_email' }
    ] );
  } ) // define schemas()
  
  // Define in-memory database
  .Singleton( 'sets_database', function( source, schemas, options ) {
    return source
      .dispatch( schemas, function( source, options ) {
        var flow = this.id;
        
        return source
          .flow( flow, { key: this.key || [ 'id' ] } )
          // .mysql( flow, this.columns )
          .set( [] )
          //.trace( flow )
          .flow( flow, { name: flow + ' (setflow)' } )
        ;
      } )
    ;
  } ) // define sets_database()
  
  .sets_database( rs.schemas() )
  
  .flow( 'user_profile' )
  
  .passport_profiles( rs.passport_instance() )
  
  //.trace( 'logged-in user profiles' )
  
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
      photo        : _.photos && _.photos[ 0 ].value || _._json && _._json.avatar_url
    };
    
    return profile;
  } )
  
  .trace( 'new user profiles' )
  
  .flow( 'user_profile' ) // filters-out non-user_profile query updates
  
  .sets_database()
;

var login_menu = rs
  
  .passport_strategies( rs.passport_instance() )
  
  // Don't do anything if this is just a credentials change
  .optimize()
  
  // Set order attribute to name if not present
  .alter( function( strategy ) { strategy.order = strategy.order || strategy.name } )
  
  // All strategies into content attribute
  .group()
  
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
  
  //.trace( 'configured strategies' )
  
  .passport_strategies( rs.passport_instance() )
  
  //.trace( 'initialized strategies' )
  
  .passport_strategies_routes( rs.passport_instance() )
  
  // ToDo: add a union to express route input
  .union( [ logout_profile_routes, login_menu ] )
  
  .express_route()
;

module.exports = function( http_servers ) {
  // Bind express Application to base url route '/passport'
  http_servers.dispatch( rs.express_application(), function( source, options ) {
    var application = this.application;
    
    source
      .serve_http_servers( handler, { routes: passport_route } )
    ;
    
    // serve_http_servers() handler that does not receive the next()
    // parameter, because errors will be handled by express
    function handler( request, response ) {
      application( request, response )
    }
  } );

  http_servers
    // ToDo: make a pipelet to serve an express application
    .serve_http_servers( handler, { routes: passport_route } )
  ;
  
  // serve_http_servers() handler that does not receive the next()
  // parameter, because errors will be handled by express
  function handler( request, response ) {
    application( request, response )
  }
} // module.exports
