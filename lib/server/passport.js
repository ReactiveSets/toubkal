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
  var XS       = require( '../pipelet.js' ).XS
    , passport = require(    'passport'   )
    , xs       = XS.xs
    , Pipelet  = XS.Pipelet
    , Set      = XS.Set
    , log      = XS.log
    
    , extend   = XS.extend
    , uuid_v4  = XS.uuid_v4
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  
  var de = true;
  
  function ug( m ) {
    log( "xs passport, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Commun Strategies
     
     It's a set which contain a list of the commun authentication strategies.
  */
  
  var Commun_Strategies = xs
    .set( [
      
      { id         : 'passport-local',
        lookup_user: function( users, username, password, done ) {
          var query = [ { flow: 'user_profile', username: username } ];
          
          users._fetch( function( values ) {
            var user = values[ 0 ];
            
            if( ! user                     ) return done( null, false, { message: 'Unknown user: ' + username } );
            if( user.password !== password ) return done( null, false, { message: 'Invalid Password'          } );
            
            de&&ug( 'lookup_user(), strategie: passport-local, user: ' + log.s( user ) );
            
            return done( null, user );
          }, query );
        } // lookup_user()
      },
      
      { id         : 'passport-twitter',
        lookup_user: function( users, token, token_secret, profile, done ) {
          user_create_and_lookup( users, profile, done );
        }
      },
      
      { id         : 'passport-facebook',
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
    
    this._users = users;
    
    return this;
  }
  
  /* -------------------------------------------------------------------------------------------
     .passport_strategies( users, options )
  */
  
  Pipelet.Build( 'passport_strategies', Passport_Strategies, function( Super ) {
    return {
      __transform: function( strategies, options ) {
        var users = this._users
          , out   = []
        ;
        
        for( var i = -1; ++i < strategies.length; ) {
          var strategy    = strategies[ i ]
            , Strategy    = require( strategy.package || strategy.id )[ strategy.Strategy || 'Strategy' ]
            , parameters  = []
            , user_lookup = function() {
                var args = Array.prototype.slice.call( arguments, 0 );
                
                args.unshift( users );
                
                strategy.lookup_user.apply( strategy, args );
              } // user_lookup()
          ;
          
          strategy.credentials && parameters.push( strategy.credentials );
          
          parameters.push( user_lookup );
          
          out.push( extend( {}, strategy, { Strategy: Strategy, parameters: parameters } ) );
        }
        
        de&&ug( '__transform(), values: ' + log.s( out ) );
        
        return out;
      } // __transform()
    };
  } ); // Passport_Strategies instance methods
  
  /* -------------------------------------------------------------------------------------------
     Passport( users, options )
     
     It's an authentication pipelet using Passport module ( see documentation: http://passportjs.org/ )
     
     It takes as input a strategies dataset which contain:
     
       - id          : the strategy id ( 'passport-facebook', 'passport-twitter', 'passport-google', etc... )
       - credentials : the strategy credentials
     
     Parameters:
       - users: database users
       - an optional object
  */
  
  function Passport( options ) {
    return Set.call( this, [], options );
  } // Passport()
  
  /* -------------------------------------------------------------------------------------------
     .passport( options )
  */
  
  Set.Build( 'passport', Passport, function( Super ) { return {
    _add: function( strategies, options ) {
      var l = strategies.length;
      
      if( ! l ) return this;
      
      // Super._add.call( this, strategies, options );
      
      var out = [];
      
      for( var i = -1; ++i < l; ) {
        var strategy       = strategies[ i ]
          , Strategy_apply = XS.make_constructor_apply( strategy.Strategy )
        ;
        
        if( strategy.provider ) {
          passport.use( strategy.provider, new Strategy_apply( strategy.parameters ) );
        } else {
          passport.use( new Strategy_apply( strategy.parameters ) );
        }
        
        out.push( passport );
      }
      
      this.__emit_add( out );
      
      return this;
    }, // _add()
    
    _remove: function( strategies, options ) {
      
      return this;
    } // _remove()
  } } ); // Passport instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  XS.add_exports( {
      Passport            : Passport
    , Passport_Strategies : Passport_Strategies
    , Commun_Strategies   : Commun_Strategies
  } );
  
  de&&ug( "module loaded" );
} ( this ); // passport.js
