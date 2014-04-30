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
  var XS            = require(  '../pipelet.js'  ).XS
    , passport      = require(     'passport'    )
    , logger        = require(     'morgan'      )
    , cookie_parser = require(  'cookie-parser'  )
    , body_parser   = require(   'body-parser'   )
    , session       = require( 'express-session' )
    , url           = require(       'url'       )
    
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
     
     It's a set which contain a list of the common authentication strategies.
  */
  
  var common_strategies = xs
    .set( [
      
      { npm_module : 'passport-local',
        lookup_user: function( users, username, password, done ) {
          var query = [ { flow: 'user_profile', username: username } ];
          
          users._fetch_all( function( values ) {
            var user = values[ 0 ];
            
            if( ! user                     ) return done( null, false, { message: 'Unknown user: ' + username } );
            if( user.password !== password ) return done( null, false, { message: 'Invalid Password'          } );
            
            de&&ug( 'lookup_user(), strategie: passport-local, user: ' + log.s( user ) );
            
            return done( null, user );
          }, query );
        } // lookup_user()
      },
      
      { npm_module : 'passport-twitter',
        lookup_user: function( users, token, token_secret, profile, done ) {
          user_create_and_lookup( users, profile, done );
        }
      },
      
      { npm_module : 'passport-facebook',
        lookup_user: function( users, access_token, refresh_token, profile, done ) {
          user_create_and_lookup( users, profile, done );
        }
      }
    ] )
  ;
  
  function user_create_and_lookup( users, profile, done ) {
    var _profile = profile._json
      , _query   = [ { flow: 'user_profile', provider_id : _profile.id } ]
    ;
    
    users._fetch_all( fn, _query );
    
    function fn( user_profiles ) {
      var l = user_profiles.length;
      
      if( l == 0 ) {
        var uuid     = uuid_v4()
          , new_user = { id: uuid, flow: 'user_profile', provider_id: _profile.id, name: _profile.name, photo: _profile.profile_image_url }
        ;
        
        users._add( [ new_user ] );
        
        de&&ug( 'user_create_and_lookup(), new user: ', log.s( new_user ) );
        
        return done( null, new_user );
      } else if( l === 1 ) {
        var user_profile = user_profiles[ 0 ];
        
        de&&ug( 'user_create_and_lookup(), user: ', log.s( user_profile ) );
        
        return done( null, user_profile );
      } else {
        return done( new Error( 'many user profiles for the provider profile id: ' + profile.id ) );
      }
    }
  } // user_create_and_lookup()
  
  /* -------------------------------------------------------------------------------------------
     Passport_Strategies( users, options )
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
      __transform: function( strategies, options, caller ) {
        var users = this._users
          , out   = []
        ;
        
        if( caller === 'remove' ) return values;
        
        for( var i = -1; ++i < strategies.length; ) {
          var strategy    = strategies[ i ]
            , Strategy    = require( strategy.npm_module )[ strategy.Strategy || 'Strategy' ]
            , parameters  = []
            
            , user_lookup = function() {
                var args = slice.call( arguments, 0 );
                
                args.unshift( users );
                
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
     
     It's an authentication pipelet using Passport module ( see documentation: http://passportjs.org/ )
     
     It takes as input a strategies dataset which contain:
     
       - id          : the strategy id ( 'passport-facebook', 'passport-twitter', 'passport-google', etc... )
       - credentials : the strategy credentials
     
     Parameters:
       - an optional object
  */
  
  function Passport( users, application, routes, options ) {
    Set.call( this, [], options );
    
    var session_options = options.session
      , base_route      = options.base_route || '/passport'
    ;
    
    this._users = users;
    
    passport.serializeUser( function( user, done ) {
      de&&ug( 'passport.serializeUser(), user : ' + log.s( user ) );
      
      done( null, user.id );
    } );
    
    passport.deserializeUser( function( user_id, done ) {
      users._fetch_all( function( user_profiles ) {
        var user = user_profiles[ 0 ];
        
        if( ! user ) return done( new Error( 'user with id: ' + user_id + ' not found' ) );
        
        de&&ug( 'passport.deserializeUser(), user: ' + log.s( user ) );
        
        return done( null, user )
      }, [ { flow: 'user_profile', id: user_id } ] );
    } );
    
    var application_routes = routes( passport, base_route );
    
    // application config
    this._application = application
      .use( logger()                   ) // request logger middleware
      .use( cookie_parser()            ) // cookie parser
      .use( body_parser()              ) // extensible request body parser
      .use( session( session_options ) ) // session management
      .use( passport.initialize() )
      .use( passport.session   () )
      .use( function( request, response, next ) {
        var _url   = url.parse( request.url ).pathname
          , method = request.method
          , route  = application_routes[ _url ]
        ;
        
        if( ! route ) return next();
        
        if( route.method !== method ) return next();
        
        de&&ug( 'router middleware, session id: ' + request.sessionID + ', url: ' + _url + ', method: ' + method
          + ', session: ' + log.s( request.session )
        );
        
        response.redirect = function( url ) {
          de&&ug( 'redirecting to : ' + url );
          
          response.writeHead( 302, { location: url } );
          
          response.end();
        };
        
        route.handler.call( this, request, response, next );
      } )
    ;
    
    return this;
  } // Passport()
  
  /* -------------------------------------------------------------------------------------------
     .passport( options )
  */
  
  Set.Build( 'passport', Passport, function( Super ) { return {
    _add: function( strategies, options ) {
      var l = strategies.length;
      
      if( ! l ) return this;
      
      Super._add.call( this, strategies, options );
      
      var make_constructor_apply = XS.make_constructor_apply;
      
      var users = this._users;
      
      for( var i = -1; ++i < l; ) {
        var strategy       = strategies[ i ]
          , Strategy_apply = make_constructor_apply( strategy.Strategy )
          , strategy_name  = strategy.name
          , parameters     = strategy.parameters
        ;
        
        if( strategy_name ) {
          passport.use( strategy_name, new Strategy_apply( parameters ) );
        } else {
          passport.use( new Strategy_apply( parameters ) );
        }
      } // for()
      
      // this.__emit_add( [ passport ] );
      
      return this;
    }, // _add()
    
    _remove: function( strategies, options ) {
      var l = strategies.length;
      
      if( ! l ) return this;
      
      Super._remove.call( this, strategies, options );
      
      for( var i = -1; ++i < l; ) {
        var strategy      = strategies[ i ]
          , strategy_name = strategy.name
        ;
        
        if( ! strategy_name ) {
          de&&ug( 'Cannot unuse strategy : ' + strategy.npm_module );
          
          continue;
        }
        
        passport.unuse( strategy_name );
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
