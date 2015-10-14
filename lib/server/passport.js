/*  passport.js
    
    ----
    
    Copyright (C) 2013, 2015, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
"use strict";

var passport = require( 'passport'      )
  , url      = require( 'url'           )
  
  , rs       = require( '../core/join.js' )
  , RS       = rs.RS
  , Pipelet  = RS.Pipelet
  , Set      = RS.Set
  , log      = RS.log
  
  , extend   = RS.extend
  , uuid_v4  = RS.uuid.v4
  
  , slice    = Array.prototype.slice
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true, ug = log.bind( null, 'passport' );

/* -------------------------------------------------------------------------------------------
   Common Strategies
   
   A list of the common passport authentication strategies to join with configuration.
   
   Each object of the set should contain attributes :
   - id (String): unique identifier, must match that of configuration file, composed of the
                  prefix "passport_strategies#" followed by the strategy "name" attribute
                  in configuration.
                  
   - lookup_user: the strategy verify function. It calls a function, passed as parameter,
     with the provider profile and done()
*/
var common_strategies = rs
  .set( [
    
    // TWitter Strategy
    { id  : 'passport_strategies#twitter',
      lookup_user: function( lookup_and_create, token, token_secret, profile, done ) {
        lookup_and_create( profile, done );
      }
    },
    
    // Facebook Strategy
    { id  : 'passport_strategies#facebook',
      lookup_user: function( lookup_and_create, access_token, refresh_token, profile, done ) {
        lookup_and_create( profile, done );
      }
    },
    
    // Google Oauth Strategy
    { id  : 'passport_strategies#google-oauth',
      Strategy   : 'OAuth2Strategy',
      lookup_user: function( lookup_and_create, access_token, refresh_token, profile, done ) {
        lookup_and_create( profile, done );
      }
    },
    
    // GitHub Strategy
    { id  : 'passport_strategies#github',
      lookup_user: function( lookup_and_create, access_token, refresh_token, profile, done ) {
        lookup_and_create( profile, done );
      }
    }
  ] )
;

/* -------------------------------------------------------------------------------------------
   rs.passport_strategies( users, callback_url, options )
   
   Process strategies to configure Passport. Reads configuration then joins
   passport_strategies with common strategies.
   
   Usage:
     rs.passport_strategies( users_database )
       .passport( users_database )
       ._output.on( 'middleware', app_config )
     ;
   
   Parameters: 
   - users       (Pipelet): Users database (read/write)
   - callback_url (String): Default callback base url after authentification
   - options      (Object):
     - filepath       (String): configuration file path, defaults to ~/config.rs.json
     - base_directory (String): if filepath is not an absolute directory
   
   Example of strategy definition from the configiguration file:
   
      {
        "id": "passport_strategies#facebook",
        "pipelet": "passport_strategies",
        "module": "passport-facebook",
        "name": "facebook",
        
        "credentials": {
            "clientID"    : "***************"
          , "clientSecret": "********************************"
          , "callbackURL" : "http://example.com/passport/facebook/callback",
        }
      }
   
   See passport documentation for more details: http://passportjs.org/guide/
   
   Where attributes should be set as follows:
   - id          (String): A unique identifier, starting with "passport_strategies#" ending with strategy name
   - pipelet     (String): "passport_strategies"
   - module      (String): npm module for passport strategy
   - name        (String): the strategy name, necessary for passport authentication routes processing
   - credentials (Object): strategy-specific credentials:
     - required credential attributes per specific strategy documentation
     - callbackURL (optional String): defaults to callback_url + '/' + strategy.name + '/callback'
*/
function Passport_Strategies( users, callback_url, options ) {
  Pipelet.call( this, options );
  
  var passport_strategies = rs
    // read the config files
    .configuration( options )
    
    // get passport strategies credentials
    .filter( [ { pipelet: 'passport_strategies' } ] )
    
    // Left join with common strategies
    .join( common_strategies, [ 'id' ], merge_strategy, { left: true } )
    
    .trace( 'strategies' )
  ;
  
  this._users = users;
  
  this._add_source( passport_strategies );
  
  return this;
  
  function merge_strategy( configuration, common ) {
    var strategy = extend( {}, common, configuration )
      , credentials = strategy.credentials = extend( {}, common && common.credentials, configuration.credentials );
    ;
    
    if ( ! strategy.lookup_user ) {
      strategy.lookup_user = function( lookup_and_create, token, token_secret, profile, done ) {
        lookup_and_create( profile, done );
      }
    }
    
    if ( ! credentials.callbackURL ) {
      credentials.callbackURL = callback_url + '/' + strategy.name + '/callback';
    }
    
    // Prevent credentials from being accidentally traced with JSON.stringify()
    credentials.toJSON || Object.defineProperty( credentials, 'toJSON', { value: credentials_toJSON } );
    
    return strategy;
    
    function credentials_toJSON() {
      var o = {};
      
      for ( var p in credentials ) {
        if ( p == 'callbackURL' ) {
          o[ p ] = credentials[ p ]
        } else {
          o[ p ] = '***';
        }
      }
      
      return o;
    } // credentials_toJSON()
  } // merge_strategy()
} // Passport_Strategies()

/* -------------------------------------------------------------------------------------------
   passport_strategies( users, options )
*/
Pipelet.Build( 'passport_strategies', Passport_Strategies, function( Super ) {
  return {
    // ToDo: refactor _user_lookup_and_create() to manage users identities
    _user_lookup_and_create: function( strategy_name ) {
      var users = this._users;
      
      return function( profile, done ) {
        // ToDo: provide an example of the provider profile structure
        de&&ug( 'provider profile: ' + log.s( profile, null, ' ' ) );
        
        var _profile = profile._json
          , _query   = [ { flow: 'user_profile', provider_name: strategy_name, provider_id : _profile.id } ]
        ;
        
        // fetch user profiles
        users._fetch_all( lookup_and_create, _query );
        
        function lookup_and_create( user_profiles ) {
          var l = user_profiles.length;
          
          if( l == 0 ) {
            // no user matched, create a new user
            var new_user = {
              flow: 'user_profile',
              id: uuid_v4(),
              provider_name: strategy_name,
              provider_id: _profile.id,
              name: _profile.name,
              photo: _profile.profile_image_url
            };
            
            users._add( [ new_user ] );
            
            de&&ug( 'user_create_and_lookup(), new user: ', log.s( new_user ) );
            
            return done( null, new_user );
          } else if( l === 1 ) {
            // user found
            var user_profile = user_profiles[ 0 ];
            
            de&&ug( 'user_create_and_lookup(), user: ', log.s( user_profile ) );
            
            return done( null, user_profile );
          } else {
            // 
            return done( new Error( 'many user profiles for the provider profile id: ' + profile.id ) );
          }
        }
      }
    }, // user_create_and_lookup()
    
    __transform: function( strategies, options, caller ) {
      var users = this._users
        , out   = []
        , that  = this
      ;
      
      if( caller === 'remove' ) return strategies;
      
      strategies.forEach( function( strategy ) {
        de&&ug( that._get_name( '__transform' ) + ', strategy:', strategy.name );
        
        try {
          var Strategy = require( strategy.module )[ strategy.Strategy || 'Strategy' ];
        } catch( e ) {
          log( that._get_name( '__transform' ) + 'Error:', e, ', strategy:', strategy.name, ', npm module:', strategy.module );
          
          return;
        }
        
        var parameters = [];
        
        strategy.credentials && parameters.push( strategy.credentials );
        
        parameters.push( user_lookup );
        
        out.push( extend( {}, strategy, { Strategy: Strategy, parameters: parameters } ) );
        
        function user_lookup() {
          var args = slice.call( arguments, 0 );
          
          args.unshift( that._user_lookup_and_create( strategy.name ) );
          
          strategy.lookup_user.apply( strategy, args );
        } // user_lookup()
      } );
      
      return out;
    } // __transform()
  };
} ); // Passport_Strategies instance methods

/* -------------------------------------------------------------------------------------------
   passport( options )
   
   Configures Passport authentication strategies already processed in passport_strategies(),
   initializes the application routes.
   
   The output emits event 'middleware' to configure an Express application which signature is
   middleware( passport, make_passport_routes() ) each time strategies are added.
   
   Parameters:
   - options (optional Object):
     - base_route (String): default is '/passport'
*/
function Passport( users, options ) {
  options = extend( { base_route: '/passport' }, options );
  
  Set.call( this, [], options );
  
  this._passport_routes = [];
  this._routes          = {};
  
  passport.serializeUser( function( user, done ) {
    de&&ug( 'passport.serializeUser(), user : ' + log.s( user ) );
    
    done( null, user.id );
  } );
  
  passport.deserializeUser( function( user_id, done ) {
    users._fetch_all( function ( user_profiles ) {
      var user = user_profiles[ 0 ];
      
      if( ! user ) return done( new Error( 'user with id: ' + user_id + ' not found' ) );
      
      de&&ug( 'passport.deserializeUser(), user: ' + log.s( user ) );
      
      return done( null, user );
    }, [ { flow: 'user_profile', id: user_id } ] );
  } );
  
  return this;
} // Passport()

/* -------------------------------------------------------------------------------------------
   passport() instance methods
*/
Set.Build( 'passport', Passport, function( Super ) { return {
  _add: function( strategies, options ) {
    var l = strategies.length;
    
    if( ! l ) return this;
    
    Super._add.call( this, strategies, options );
    
    var make_constructor_apply = RS.subclass.make_constructor_apply
      , passport_routes        = this._passport_routes
      , base_route             = this._options.base_route
      , routes                 = this._routes
    ;
    
    for( var i = -1; ++i < l; ) {
      var strategy       = strategies[ i ]
        , Strategy_apply = make_constructor_apply( strategy.Strategy )
        , strategy_name  = strategy.name
        , strategy_route = base_route + '/' + strategy_name
        , parameters     = strategy.parameters
        , credentials    = parameters[ 0 ]
          
          // the credentials change according to the strategie protocol: OpenID / Oauth ( 1.x and 2.x )
        , callbackURL    = url.parse( credentials.callbackURL || credentials.returnURL ).pathname
      ;
      
      try {
        var strategy_processor = new Strategy_apply( parameters );
      } catch( e ) {
        log( this._get_name( '_add' ) + 'Error processing strategy:', e, ', strategy_name:', strategy_name );
        
        continue;
      }
      
      if( strategy_name ) {
        passport.use( strategy_name, strategy_processor );
      } else {
        passport.use( strategy_processor );
      }
      
      if( ! routes[ strategy_route ] ) {
        passport_routes.push( {
          path: strategy_route,
          strategie_name: strategy_name,
          scope: strategy.scope,
          callbackURL: callbackURL
        } );
      }
    } // for()
    
    this._output._emit_event( 'middleware', [ passport, make_passport_routes.bind( this ) ] );
    
    return this;
    
    function make_passport_routes() {
      var routes = get_routes.call( this );
      
      de&&ug( 'passport routes', this._passport_routes );
      
      // router middleware
      return function passport_routes( request, response, next ) {
        var pathname = url.parse( request.url ).pathname
          , method   = request.method
          , route    = routes[ pathname ]
        ;
        
        if ( ! route
          || route.method !== method
        ) return next();
        
        de&&ug( 'router middleware, session id: ' + request.sessionID
          + ', pathname: ' + pathname
          + ', method: ' + method
          + ', session: ' + log.s( request.session )
        );
        
        // Provide redirect help method into Object response
        response.redirect = redirect;
        
        route.handler( request, response, next );
        
        function redirect( url ) {
          de&&ug( 'redirecting to : ' + url );
          
          this.writeHead( 302, { location: url } );
          
          this.end();
        } // redirect()
      } // passport_routes()
      
      function get_routes() {
        var routes          = this._routes
          , base_route      = this._options.base_route
          , redirects       = { successRedirect: base_route + '/profile', failureRedirect: base_route + '/login' }
          , passport_routes = this._passport_routes
          , len             = passport_routes.length
          , login_routes    = ''
        ;
        
        for( var i = -1; ++i < len; ) {
          var route   = passport_routes[ i ]
            , path    = route.path
            , method  = route.method || 'GET'
            , handler = route.handler
            , name    = route.strategie_name
            , scope   = route.scope
            , options = {} // passport authentication options
          ;
          
          // build the login routes
          // ToDo: find out another way to build athentication routes
          login_routes += '<a href="' + path + '">Login with ' + name + '</a> ';
          
          if( routes[ path ] !== undefined ) {
            de&&ug( 'route: ' + path + ' is already defined' );
            
            continue;
          }
          
          if( scope ) options.scope = scope;
          
          if( ! handler ) handler = passport.authenticate( name, options );
          
          routes[ path ] = { method: method, handler: handler };
          
          if( route.callbackURL ) {
            routes[ route.callbackURL ] = { method: method, handler: passport.authenticate( name, redirects ) };
          }
        } // for()
        
        // 
        routes[ base_route + '/login' ] = {
          method : 'GET',
          
          handler: function( request, response, next ) {
            if( request.isAuthenticated() ) return response.redirect( base_route + '/profile' );
            
            response.end( login_routes );
          }
        };
        
        routes[ base_route + '/logout' ] = {
          method : 'GET',
          
          handler: function( request, response, next ) {
            request.logout();
            
            de&&ug( 'logout(), session: ' + log.s( request.session ) );
            
            response.redirect( base_route + '/login' );
          }
        };
        
        //
        routes[ base_route + '/profile' ] = {
          method : 'GET',
          
          handler: function( request, response, next ) {
            if( ! request.isAuthenticated() ) return response.redirect( base_route + '/login' );
            
            var user = request.user
              , res  = '<p><a href="'  + base_route       + '/logout">logout</a></p>'
              
                  + '<p><img src="'    + user.photo       + '" /></p>'
                  + '<p>Name: '        + user.name        + '</p>'
                  + '<p>User ID: '     + user.id          + '</p>'
                  + '<p>Provider ID: ' + user.provider_id + '</p>'
            ;
            
            response.end( res );
          }
        };
        
        
        // empty application and passport routes
        // this._passport_routes    = [];
        
        return this._routes = routes;
      } // get_routes()
    } // make_passport_routes()
  }, // _add()
  
  _remove: function( strategies, options ) {
    var l = strategies.length;
    
    if( ! l ) return this;
    
    Super._remove.call( this, strategies, options );
    
    var base_route = this._options.base_route
      , routes     = this._routes
    ;
    
    for( var i = -1; ++i < l; ) {
      var strategy      = strategies[ i ]
        , strategy_name = strategy.name
        , credentials   = strategy.credentials
        , callbackURL   = url.parse( credentials.callbackURL || credentials.returnURL ).pathname
      ;
      
      if( ! strategy_name ) {
        de&&ug( 'Cannot unuse strategy : ' + strategy.module );
        
        continue;
      }
      
      // unuse passport strategy
      passport.unuse( strategy_name );
      
      // delete strategy routes
      delete routes[ base_route + '/' + strategy_name ];
      delete routes[ callbackURL                      ];
    }
    
    return this;
  } // _remove()
} } ); // Passport instance methods

/* --------------------------------------------------------------------------
   module exports
*/

RS.add_exports( {
    'Passport'            : Passport
  , 'Passport_Strategies' : Passport_Strategies
  , 'Common_Strategies'   : common_strategies
} );

de&&ug( "module loaded" );

// passport.js
