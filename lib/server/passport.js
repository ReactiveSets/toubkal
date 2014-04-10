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
  var XS       = require( './pipelet.js' ).XS
    , passport = require(   'passport'   )
    , log      = XS.log
    , Set      = XS.Set
    
    , extend_2 = XS.extend_2
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
  
  var commun_strategies = xs
    .set( [
      { id         : 'passport-local',
        lookup_user: function( users, username, password, done ) {
          var query = [ { flow: 'user_profile', username: username } ];
          
          users._fetch( function( values ) {
            var user = values[ 0 ];
            
            if( ! user                     ) return done( null, false, { message: 'Unknown user: ' + username } );
            if( user.password !== password ) return done( null, false, { message: 'Invalid Password'          } );
            
            return done( null, user );
          }, query );
        } // lookup_user()
      },
      
      { id         : 'passport-twitter',
        lookup_user: function( users, token, token_secret, profile, done ) {
          var user_profile  = users.flow(      'user_profile'     )
            , user_email    = users.flow(      'user_email'       )
            , user_provider = users.flow( 'user_provider_profile' )
            
            , query         = [ { provider: profile.provider, id: profile.id } ]
          ;
          
          // test if there is a profile in the user provider profile flow
          // if not found, create new entries for 'user_provider_profile', 'user_email' and 'user_profile' flows
          if( user_provider.index_of( { id: profile.id } ) === -1 ) {
            var uuid          = XS.uuid_v4()
                
                // user provider profile record
              , _user_provider = extend_2( { user_id: uuid }, profile )
                
                // user emails record
              , _user_emails   = profile.emails
                  .map( function( email ) {
                    return { user_id: uuid, flow: 'user_email', email: email }
                  } )
                
                // user profile record
              , _user_profile  = {
                    id        : uuid
                  , first_name: profile.name.givenName
                  , last_name : profile.name.familyName
                  , photos    : profile.photos
                }
            ;
            
            user_provider._add( [ _user_provider ] );
            user_email   ._add(      _emails       );
            user_profile ._add( [ _user_profile  ] );
            
            // ToDo: add photos in user photos flow
            
            return done( null, _user_profile );
          } else {
            user_provider._fetch( function( values ) {
              if( values.length > 1 ) return done( new Error( 'User with many provider profiles' ) );
              
              var _user_provider = values[ 0 ];
              
              // return authenticated user if it exist
              user_profile._fetch( function( values ) {
                var _user_profile = values[ 0 ];
                
                if( ! _user_profile ) return done( null, false, { message: 'Unknown user: ' + log.s( profile ) } );
                
                return done( null, _user_profile );
              }, [ { id: user_provider.user_id } ] ); // user_profile._fetch()
              
            }, query ); // user_provider._fetch()
            
          } // end if()
          
        } // lookup_user()
      }
    ] )
  ;
  
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
          var s           = strategies[ i ]
            , Strategy    = require( s.package || s.id )[ s.Strategy || 'Strategy' ]
            , parameters  = []
            , user_lookup = function() {
                var args = arguments.slice( 0 );
                
                args.unshift( users );
                
                strategy.lookup_user.apply( strategy, args );
              } // user_lookup()
          ;
          
          strategy.credentials && parameters.push( strategy.credentials );
          
          parameters.push( user_lookup );
          
          out.push( extend_2( {}, { Strategy: Strategy, parameters: parameters }, strategy ) );
        }
        
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
  
  function Passport( users, options ) {
    Set.call( this, options );
    
    this._users = users;
    
    return this;
  } // Passport()
  
  /* -------------------------------------------------------------------------------------------
     .passport( users, options )
  */
  
  Set.Build( 'passport', Passport, function( Super ) { return {
    var users = this._users;
    
    _add: function( strategies, options ) {
      var l = strategies.length;
      
      if( ! l ) return this;
      
      for( var i = -1; ++i < l; ) {
        var strategy = strategies[ i ]
          , Strategy_apply = xs.make_constructor_apply( strategy.Strategy )
        ;
        
        if( strategy.provider ) {
          passport.use( strategy.provider, new Strategy_apply[ strategy.parameters ] );
        } else {
          passport.use( new Strategy_apply[ strategy.parameters ] );
        }
        
        // this.__emit_add( [ passport ] );
      }
      
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
    , Commun_trategies    : Commun_trategies
  } );
  
  de&&ug( "module loaded" );
} ( this ); // passport.js
