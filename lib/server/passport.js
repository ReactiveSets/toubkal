/*  passport.js
    
    ----
    
    Copyright (C) 2013, 2014, Connected Sets

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

!function( exports ) {
  var XS       = require(  '../join.js'  ).XS
    , passport = require(     'passport'    )
    , url      = require(       'url'       )
    
    , xs       = XS.xs
    , Pipelet  = XS.Pipelet
    , Set      = XS.Set
    , log      = XS.log
    
    , extend   = XS.extend
    , uuid_v4  = XS.uuid_v4
    
    , slice    = Array.prototype.slice
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  
  var de = true;
  
  function ug( m ) {
    log( "xs passport, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Common Strategies
     
     A list of the common passport authentication strategies. 
     
     Each object of the set should contain attributes :
      - npm_module : the passport strategy npm module, it allow to join with the strategies list from the config file
      
      - lookup_user: the strategy verify function. It calls a function, passed as parameter, with the provider profile and done
  */
  
  var common_strategies = xs
    .set( [
      
      // TWitter Strategy
      { npm_module : 'passport-twitter',
        lookup_user: function( lookup_and_create, token, token_secret, profile, done ) {
          lookup_and_create( profile, done );
        }
      },
      
      // Facebook Strategy
      { npm_module : 'passport-facebook',
        lookup_user: function( lookup_and_create, access_token, refresh_token, profile, done ) {
          lookup_and_create( profile, done );
        }
      }
    ] )
  ;
  
  /* -------------------------------------------------------------------------------------------
     Passport_Strategies( users, options )
     
     Process strategies to configure Passport. It's read the config file, and then join the result with 
     the common strategies.
     
     Parameters: 
      - users: the Users DataBase
      - an optional object
     
     The strategy definition from the config file should be as below:
     
        {
          "pipelet": "passport_strategies",
          "npm_module": "passport-facebook",
          "name": "facebook",
          "credentials": {
              "clientID"    : "***************"
            , "clientSecret": "********************************"
            , "callbackURL" : "http://example.com/passport/facebook/callback"
          }
        }
     
     See passport documentation for more details: http://passportjs.org/guide/
     
     Which:
      - pipelet     : the pipelet name that use the configuration
      - npm_module  : the passport strategy npm module name, which allow to require the module
      - name        : the strategy name, necessary for passport autentication routes processing
      - credentials : application credentials
     
  */
  
  function Passport_Strategies( users, options ) {
    Pipelet.call( this, options );
    
    var passport_strategies = xs
      // read the config files
      .configuration( options )
      
      // get passport strategies credentials
      .filter( [ { pipelet: 'passport_strategies' } ] )
      
      // join with the common strategies
      .join( common_strategies, [ [ 'npm_module', 'npm_module' ] ], join_strategies )
    ;
    
    this._users = users;
    
    return this.__add_source( passport_strategies );
    
    // join strategies 
    function join_strategies( config_strategy, common_strategy ) {
      return extend( common_strategy, config_strategy );
    } // join_strategies()
    
  } // Passport_Strategies()
  
  /* -------------------------------------------------------------------------------------------
     .passport_strategies( users, options )
  */
  
  Pipelet.Build( 'passport_strategies', Passport_Strategies, function( Super ) {
    return {
      // ToDo: refactor _user_lookup_and_create() to manage users identities
      _user_lookup_and_create: function() {
        var users = this._users;
        
        return function( profile, done ) {
          var _profile = profile._json
            , _query   = [ { flow: 'user_profile', provider_id : _profile.id } ]
          ;
          
          // fetch user profiles
          users._fetch_all( lookup_and_create, _query );
          
          function lookup_and_create( user_profiles ) {
            var l = user_profiles.length;
            
            if( l == 0 ) {
              // no user matched, create a new user
              var uuid     = uuid_v4()
                , new_user = { id: uuid, flow: 'user_profile', provider_id: _profile.id, name: _profile.name, photo: _profile.profile_image_url }
              ;
              
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
        ;
        
        if( caller === 'remove' ) return strategies;
        
        for( var i = -1; ++i < strategies.length; ) {
          var that       = this
            , strategy   = strategies[ i ]
            , Strategy   = require( strategy.npm_module )[ strategy.Strategy || 'Strategy' ]
            , parameters = []
            
            , user_lookup = function() {
                var args = slice.call( arguments, 0 );
                
                args.unshift( that._user_lookup_and_create() );
                
                strategy.lookup_user.apply( strategy, args );
              } // user_lookup()
          ;
          
          strategy.credentials && parameters.push( strategy.credentials );
          
          parameters.push( user_lookup );
          
          out.push( extend( {}, strategy, { Strategy: Strategy, parameters: parameters } ) );
        }
        
        return out;
      } // __transform()
    };
  } ); // Passport_Strategies instance methods
  
  /* -------------------------------------------------------------------------------------------
     Passport( options )
     
     Pipelet passport() configures passport authentication strategies already processed in passport_strategies(), and also
     initialize the application routes.
     
     It's emit a event allowing to configure an Express application
     
  */
  
  var that;
  
  function Passport( users, options ) {
    options = extend( { base_route: '/passport' }, options );
    
    Set.call( this, [], options );
    
    that = this;
    
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
    
    return this._initialize_routes();
  } // Passport()
  
  /* -------------------------------------------------------------------------------------------
     .passport( options )
  */
  
  Set.Build( 'passport', Passport, function( Super ) { return {
    _initialize_routes: function() {
      var base_route = this._options.base_route;
      
      this._passport_routes    = [];
      
      this._application_routes = [
        {
          path   : base_route + '/login',
          method : 'GET',
          
          handler: function( request, response, next ) {
            if( request.isAuthenticated() ) return response.redirect( base_route + '/profile' );
            
            response.end(
                '<a href="' + base_route + '/facebook">Login with Facebook</a> | '
              + '<a href="' + base_route + '/twitter">Login with Twitter</a>'
            );
          }
        },
        
        {
          path   : base_route + '/logout',
          method : 'GET',
          
          handler: function( request, response, next ) {
            request.logout();
            
            de&&ug( 'logout(), session: ' + log.s( request.session ) );
            
            response.redirect( base_route + '/login' );
          }
        },
        
        {
          path   : base_route + '/profile',
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
        }
      ];
      
      return this;
    }, // _initialize_routes()
    
    _make_passport_routes: function() {
      var routes     = that._routes = {}
        , base_route = that._options.base_route
        , redirects  = { successRedirect: base_route + '/profile', failureRedirect: base_route + '/login' }
        , all_routes = that._application_routes.concat( that._passport_routes )
        , len        = all_routes.length
      ;
      
      for( var i = -1; ++i < len; ) {
        var route   = all_routes[ i ]
          , path    = route.path
          , method  = route.method || 'GET'
          , handler = route.handler
        ;
        
        if( routes[ path ] !== undefined ) {
          de&&ug( 'route: ' + path + ' is already defined' );
          
          continue;
        }
        
        if( ! handler ) handler = passport.authenticate( route.strategie_name );
        
        routes[ path ] = { method: method, handler: handler };
        
        if( route.callbackURL ) {
          routes[ route.callbackURL ] = { method: method, handler: passport.authenticate( route.strategie_name, redirects ) };
        }
      } // for()
      
      // empty application and passport routes
      that._application_routes = [];
      that._passport_routes    = [];
      
      return function( request, response, next ) {
        var pathname = url.parse( request.url ).pathname
          , method   = request.method
          , route    = routes[ pathname ]
        ;
        
        if( ! route ) return next();
        
        if( route.method !== method ) return next();
        
        de&&ug( 'router middleware, session id: ' + request.sessionID + ', pathname: ' + pathname + ', method: ' + method
          + ', session: ' + log.s( request.session )
        );
        
        response.redirect = function( url ) {
          de&&ug( 'redirecting to : ' + url );
          
          response.writeHead( 302, { location: url } );
          
          response.end();
        };
        
        route.handler( request, response, next );
      }
    }, // _make_passport_routes()
    
    _add: function( strategies, options ) {
      var l = strategies.length;
      
      if( ! l ) return this;
      
      Super._add.call( this, strategies, options );
      
      var make_constructor_apply = XS.make_constructor_apply
        , passport_routes        = this._passport_routes
        , base_route             = this._options.base_route
      ;
      
      for( var i = -1; ++i < l; ) {
        var strategy       = strategies[ i ]
          , Strategy_apply = make_constructor_apply( strategy.Strategy )
          , strategy_name  = strategy.name
          , parameters     = strategy.parameters
          , credentials    = parameters[ 0 ]
            
            // the credentials change according to the strategie protocol: OpenID / Oauth ( 1.x and 2.x )
          , callbackURL    = url.parse( credentials.callbackURL || credentials.returnURL ).pathname
        ;
        
        if( strategy_name ) {
          passport.use( strategy_name, new Strategy_apply( parameters ) );
        } else {
          passport.use( new Strategy_apply( parameters ) );
        }
        
        passport_routes.push( { path: base_route + '/' + strategy_name, strategie_name: strategy_name, callbackURL: callbackURL } );
      } // for()
      
      this._emit_event( 'middleware', [ passport, this._make_passport_routes ] );
      
      return this;
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
          de&&ug( 'Cannot unuse strategy : ' + strategy.npm_module );
          
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
  
  XS.add_exports( {
      Passport            : Passport
    , Passport_Strategies : Passport_Strategies
    , Common_Strategies   : common_strategies
  } );
  
  de&&ug( "module loaded" );
} ( this ); // passport.js
