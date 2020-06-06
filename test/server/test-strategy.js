/*
    test-strategy.js

    Copyright (C) 2013, 2020, Reactive Sets

    Inspired from https://github.com/jboxman/koa-passport-oauth2-testing, licence: ISC
*/

'use strict';

const passport = require( 'passport-strategy' )
  , util       = require( 'util' )
  , profile    = require( './test-profile' )
;

function Strategy( name, callback ) {
  if ( !name || name.length === 0 ) {
    throw new TypeError( 'Test strategy requires a strategy name' );
  }

  passport.Strategy.call( this );
  
  this.name  = name;
  
  // Callback supplied to OAuth2 strategies handling verification
  this._callback = callback;
} // Strategy

util.inherits( Strategy, passport.Strategy );

Strategy.prototype.authenticate = function( request, options ) {
  this._callback( null, null, profile, ( error, profile ) => {
    this.success( profile );
  } );
}

module.exports = {
  Strategy
};
