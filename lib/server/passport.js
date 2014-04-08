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
     Passport Strategies
     
     It's a set which contain a list of the commun authentication strategies.
  */
  
  var passport_strategies = xs
    .set( [
      {
        id   : 'passport-twitter',
        check: function( token, token_secret, profile, done ) {
          
        }
      }
    ] )
  ;
  
  /* -------------------------------------------------------------------------------------------
     Passport( options )
  */
  
  function Passport( options ) {
    Set.call( this, options );
    
    return this;
  } // Passport()
  
  /* -------------------------------------------------------------------------------------------
     .passport( options )
     
     It's an authentication pipelet using Passport module ( see documentation: http://passportjs.org/ )
     
     It takes as input a strategies dataset which contain:
     
       - id          : the strategy id ( 'passport-facebook', 'passport-twitter', 'passport-google', etc... )
       - credentials : 
  */
  
  Set.Build( 'passport', Passport, {
    _add: function( strategies, options ) {
      var l = strategies.length;
      
      if( ! l ) return this;
      
      for( var i = -1; ++i < l; ) {
        var strategy = strategies[ i ]
          , Strategy = require( strategy.id ).Strategy;
        ;
        
        passport.use( new Strategy( strategy.credentials, strategy.check ) );
      }
      
      return this;
    }, // _add()
    
    _remove: function( strategies, options ) {
      
      return this;
    } // _remove()
  } ); // Passport instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  
  XS.add_exports( {
      Passport           : Passport
    , passport_strategies: passport_strategies
  } );
  
  de&&ug( "module loaded" );
} ( this ); // passport.js
