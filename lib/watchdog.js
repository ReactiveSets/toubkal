/*  watchdog.js
    
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
     Watchdog( flow, timeout, options )
  */
  function Watchdog( flow, timeout, options ) {
    options = Pipelet.call( this, extend( {}, options, { key: [ 'flow', 'time' ] } ) )._options;
    
    this.flow = flow || 'watchdog';
    
    this.timeout = timeout;
    
    var u;
    
    this.up   = options.up   === u ? 'up'   : options.up  ;
    this.down = options.down === u ? 'down' : options.down;
    
    return this._arm();
  } // Watchdog()
  
  /* -------------------------------------------------------------------------------------------
     .watchdog( flow, timeout, options )
  */
  Pipelet.Build( 'watchdog', Watchdog, {
    _fetch: function( receiver ) {
      receiver( this.state ? [ this.state ] : [], true );
      
      return this;
    }, // _fetch()
    
    _arm: function() {
      var that = this;
      
      if ( this.time_out ) {
        clearTimeout( this.time_out );
      }
      
      this.time_out = setTimeout( function() {
        // current state is either undefined or up
        
        var state = {
          flow: that.flow,
          state: that.down,
          time : new Date()
        };
        
        if ( that.state ) {
          state.uptime = state.time - that.state.time;
          
          that.__emit_update( [ [ that.state, state ] ] );
        } else {
          that.__emit_add( [ state ] );
        }
        
        that.state = state;
        
        de&&ug( 'down: ' + log.s( state ) );
      }, this.timeout );
      
      de&&ug( '_arm(), state: ' + log.s( this.state ) );
      
      return this;      
    }, // _arm()
    
    _add: function() {
      var state = this.state;
      
      if ( state && state.state == this.up ) {
        de&&ug( '_add(), state is aleady up' );
      } else {
        // state is either not defined or down
        
        state = {
          flow: this.flow,
          state: this.up,
          time : new Date()
        }
        
        if ( this.state ) {
          state.downtime = state.time - that.state.time;
          
          this.__emit_update( [ [ this.state, state ] ] );
        } else {
          this.__emit_add( [ state ] );
        }
        
        this.state = state;
        
        de&&ug( '_add(), new state, up: ' + log.s( state ) );
      }
      
      return this._arm();
    }, // _add()
    
    _remove: function() {
      return this;
    }, // _remove()
    
    _update: function() {
      return this.add();
    } // _update()
  } ); // Watchdog instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Watchdog' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // watchdog.js
