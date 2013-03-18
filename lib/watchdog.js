/*  watchdog.js
    
    ----
    
    Copyright (C) 2013, Connected Sets

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

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './pipelet.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Pipelet    = XS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs watchdog, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Watchdog( model, timeout, options )
  */
  function Watchdog( model, timeout, options ) {
    options = Pipelet.call( this, extend( {}, options, { key: [ 'model', 'time' ] } ) ).options;
    
    this.model = model || 'watchdog';
    
    this.timeout = timeout;
    
    var u;
    
    this.up   = options.up   === u ? 'up'   : options.up  ;
    this.down = options.down === u ? 'down' : options.down;
    
    return this.arm();
  } // Watchdog()
  
  /* -------------------------------------------------------------------------------------------
     .watchdog( model, timeout, options )
  */
  Pipelet.build( 'watchdog', Watchdog, {
    fetch: function( receiver ) {
      receiver( this.state ? [ this.state ] : [], true );
      
      return this;
    }, // fetch()
    
    arm: function() {
      var that = this;
      
      if ( this.time_out ) {
        clearTimeout( this.time_out );
      }
      
      this.time_out = setTimeout( function() {
        // current state is either undefined or up
        
        var state = {
          model: that.model,
          state: that.down,
          time : new Date()
        };
        
        if ( that.state ) {
          state.uptime = state.time - that.state.time;
          
          that.emit_update( [ [ that.state, state ] ] );
        } else {
          that.emit_add( [ state ] );
        }
        
        that.state = state;
        
        de&&ug( 'down: ' + log.s( state ) );
      }, this.timeout );
      
      de&&ug( 'arm(), state: ' + log.s( this.state ) );
      
      return this;      
    }, // arm()
    
    add: function() {
      var state = this.state;
      
      if ( state && state.state == this.up ) {
        de&&ug( 'add(), state is aleady up' );
      } else {
        // state is either not defined or down
        
        state = {
          model: this.model,
          state: this.up,
          time : new Date()
        }
        
        if ( this.state ) {
          state.downtime = state.time - that.state.time;
          
          this.emit_update( [ [ this.state, state ] ] );
        } else {
          this.emit_add( [ state ] );
        }
        
        this.state = state;
        
        de&&ug( 'add(), new state, up: ' + log.s( state ) );
      }
      
      return this.arm();
    }, // add()
    
    remove: function() {
      return this;
    }, // remove()
    
    update: function() {
      return this.add();
    } // update()
  } ); // Watchdog instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Watchdog' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // watchdog.js
