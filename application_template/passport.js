/* passport.js
   -----------

   Express Application for Passport
   
   Copyright (c) 2018, Reactane, all rights reserved.
*/
module.exports = function( http_servers, rs ) {
  'use strict';
  
  var RS           = rs.RS
    , uuid_v4      = RS.uuid.v4
    , toString     = Object.prototype.toString
    , extend       = RS.extend
    , value_equals = RS.value_equals
    , timestamp_string = RS.timestamp_string
    
    , application  = require( 'express'         )()
    , session      = require( 'express-session' )
    , passport     = require( 'toubkal/node_modules/passport' )
    
    , session_options = {
        key: 'rs_sid',
        secret: 'bazinga', // ToDo: get express-session secret from configuration
        saveUninitialized: true,
        resave: false
      }
    
    , passport_route = '/passport'
  ;
  
  session_options.store = new RS.Express_Session_Store( rs.session_store() );
  
  require( 'toubkal/lib/server/passport.js' );
  
  application
    .use( session( session_options ) )
    .use( passport.initialize()      )
    .use( passport.session()         )
    
    .use( rs.express_route()._router() )
    
    .get( passport_route + '/logout', function( request, response, next ) {
      request.logout();
      
      response.redirect( '/' );
    } )
    
    .get( '/passport/profile', function( request, response, next ) {
      response.redirect( '/' );
    } )
  ;
  
  // User and user profile creation
  rs
    
    .database()
    
    .flow( 'users_providers' )
    
    .passport_profiles() // login events, adds-only
    
    .trace( 'new or updated provider profile' )
    
    .map( function( user_provider ) {
      var profile = user_provider.profile // may be null on update#remove with former users_providers table
        , _       = profile ? profile._json : { emails: [ { value: '' } ] }
        , photo   = _.picture || _.image || { data: {} }
        , name    = _.name || {}
        , display_name = profile.displayName
        , emails  = profile.emails || _.emails
      ;
      
      if( toString.call( name ) === '[object String]' ) {
        var parts = name.match( /(\S+)(\s+)?(.*)/ );
        
        name = { givenName: parts ? parts[ 1 ] : name };
        
        if( parts && parts[ 3 ] ) name.familyName = parts[ 3 ];
      }
      
      if( display_name ) {
        display_name = display_name.split( ' ' );
        
        name = { givenName: display_name[ 0 ], familyName: display_name[ 1 ] }
      }
      
      return {
          id           : user_provider.id
        , provider_id  : user_provider.provider_id
        , provider_name: user_provider.provider_name
        
        // first and last name
        , first_name   : _.firstName || _.first_name || name.givenName
        , last_name    : _.lastName  || _.last_name  || name.familyName
        
        // email and photo
        // ToDo: handle missing email address, and maybe multiple email addresses in emails Array
        , email        : ( _.emailAddress || _.email   || ( emails.length && emails[ 0 ].value || '' )  ).trim() // trim email
        , photo        :   _.pictureUrl   || _.avatar_url   || photo.url || ( photo.data && photo.data.url )
        
        , user_id      : user_provider.user_id // available on updated profiles
        , profile      : profile
        , previous_profile: user_provider.previous_profile
      };
    } )
    
    // Fetch user from database to create one if none exist, or associate with profile
    .fetch( rs.database(), function( profile ) {
      var user_id = profile.user_id
        , query   = { flow: 'users' }
      ;
      
      if( user_id ) {
        // On updates, there is always a user_id in the user profile
        // but not always an email if previous profile was not recorded in the previous version of the users_profile table
        // so we must use the user_id to fetch user
        query.id = user_id;
      } else {
        query.email = profile.email;
      }
      
      return [ query ];
    } )
    
    // Create new user profile and possibly a new user
    .map( function( _ ) {
      var users            = _.values
        , users_provider   = _.source
        , new_profile      = JSON.stringify( users_provider.profile )
        , previous_profile = JSON.stringify( users_provider.previous_profile )
        , adds             = []
        , updates          = []
        , new_user
        , previous_user
        , user_id
      ;
      
      switch( users.length ) {
        case 0 : // No user found: create new user (and user_provider bellow)
          var timestamp = timestamp_string();
          
          new_user = set_new_user_profile_attributes( { flow: 'users', id: uuid_v4(), timestamp: timestamp } );
          
          adds.push( new_user );
        break;
        
        default:
          // ToDo: multiple users share the same email, emit warning
        
        // fall-through, will associate this profile with first fetched user
        
        case 1: // Found one user
          previous_user = users[ 0 ];
          
          new_user = set_new_user_profile_attributes( extend( {}, previous_user ) );
          
          value_equals( previous_user, new_user ) || updates.push( [ previous_user, new_user ] );
        break;
      } // switch()
      
      users_provider = {
          flow         : 'users_providers'
        , id           : users_provider.id
        , user_id      : new_user.id
        , provider_id  : users_provider.provider_id
        , provider_name: users_provider.provider_name
        , profile      : new_profile
      };
      
      if( previous_profile ) {
        if( previous_profile != new_profile ) {
          updates.push( [ extend( {}, users_provider, { profile: previous_profile } ), users_provider ] );
        }
      } else {
        adds.push( users_provider );
      }
      
      return { updates: updates, adds: adds };
      
      function set_new_user_profile_attributes( new_user ) {
        new_user.first_name = users_provider.first_name;
        new_user.last_name  = users_provider.last_name;
        new_user.email      = users_provider.email;
        new_user.photo      = users_provider.photo
        
        return new_user;
      } // set_new_user_profile_attributes()
    } )
    
    .emit_operations()
    
    .delivers( [ 'users', 'users_providers' ] )
    
    .database()
  ;
  
  rs
    .passport_strategies_configuration( passport_route )
    
    .passport_strategies()
    
    .passport_strategies_routes()
    
    .express_route()
  ;
  
  
  
  // Bind express Application to base url route '/passport'
  http_servers
    .serve_http_servers( handler, { routes: [ '/', passport_route ], methods: [ 'GET', 'POST' ] } )
  ;
  
  return session_options;
  
  // serve_http_servers() handler that does not receive the next() 
  // parameter, because errors will be handled by express
  function handler( request, response, next ) {
    application( request, response, next )
  }

}; // module.exports

