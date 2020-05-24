/*
    test-strategy.js

    Copyright (C) 2013, 2020, Reactive Sets

    Inspired from https://github.com/jboxman/koa-passport-oauth2-testing

*/

'use strict';

const passport = require( 'passport-strategy' )
  , util       = require('util')
  , profile    = require( './test-profile'    )
;

function Strategy( name, callback ) {
  if( !name || name.length === 0 ) {
    throw new TypeError( 'DevStrategy requires a Strategy name' );
  }

  passport.Strategy.call( this );
  
  this.name  = name;
  this._profile = profile;
  
  // Callback supplied to OAuth2 strategies handling verification
  this._callback = callback;
} // Strategy

util.inherits( Strategy, passport.Strategy );

Strategy.prototype.authenticate = function() {
  this._callback( null, null, this._profile, ( error, profile ) => {
    this.success( profile );
  } );
}

module.exports = {
  Strategy
};
