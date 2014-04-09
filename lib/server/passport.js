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
      { id : 'passport-local'  /*, lookup_user: function( users, username, password, done ) {}*/ },
      { id : 'passport-twitter', lookup_user: function( users, token, token_secret, profile, done ) {
        var query = profile.emails.map( function( email ) { return { flow: 'user_email', email: email } } );
        
        users._fetch( user_emails, query );
        
        query = [ { flow: 'user_provider_profile', provider: profile.provider, provider_id: profile.id } ]
      } },
      { id : 'passport-oauth'  , strategy: 'OAuth2Strategy' }
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
          // var o = XS.extend_2( {}, strategie[ i ] );
          
          var s           = strategies[ i ]
            , Strategy    = require( s.package || s.id )[ s.Strategy || 'Strategy' ]
            , parameters  = []
            , user_lookup = function() {
                var args = arguments.slice( 0 );
                
                if( strategy.lookup_user ) {
                  args.unshift( users );
                  
                  strategy.lookup_user.apply( strategy, args );
                } else {
                  
                  users._fetch( function( values ) {
                    // ...
                    // ...
                  } );
                } // end if()
              } // user_lookup()
          ;
          
          strategy.credentials && parameters.push( strategy.credentials );
          
          parameters.push( user_lookup );
          
          out.push( extend_2( {}, { strategy: Strategy, parameters: parameters }, strategy ) );
        }
        
        return out;
      } // __transform()
    };
  } );
  
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
          // , Strategy = require( strategy.id ).Strategy;
          , Strategy_apply = xs.make_constructor_apply( strategy.strategy )
        ;
        
        if( strategy.provider ) {
          passport.use( strategy.provider, new Strategy_apply[ strategy.parameters ] );
        } else {
          passport.use( new Strategy_apply[ strategy.parameters ] );
        }
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
