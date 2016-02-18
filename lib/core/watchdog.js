/*  watchdog.js
    
    Copyright (c) 2013-2016, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'watchdog', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS      = rs.RS
    , log     = RS.log
    , extend  = RS.extend
    , Pipelet = RS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log.bind( null, 'watchdog' );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet watchdog( flow, timeout, options )
      
      @short Goes up on add operations, Goes down on timeout
      
      @parameters:
        - flow (String): emiited values flow attribute, default is 'watchdog'
        - timeout (Number): watchdog timeout in miliseconds, default 10000 (10 seconds)
        - options (Object):
          - up   (String): emitted values "state" attribute when going up  , default is 'up'
          - down (String): emitted values "state" attribute when going down, default is 'down'
      
      @emits:
        - flow     (String): flow parameter value
        - state    (String): up or down, see options up and down
        - time       (Date): when state changed
        - uptime   (Number): number of milliseconds state was up before going down
        - downtime (Number): number of milliseconds state was down before going up
  */
  function Watchdog( flow, timeout, options ) {
    var that = this;
    
    Pipelet.call( that, extend( {}, options, { key: [ 'flow', 'time' ] } ) );
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    that._flow    = flow         || 'watchdog';
    that._timeout = timeout      || 10000;
    that._up      = options.up   || 'up';
    that._down    = options.down || 'down';
    
    that._state   = null;
    
    that._arm();
    
    function fetch_unfiltered( receiver ) {
      var state = that._state;
      
      receiver( state ? [ state ] : [], true );
    } // fetch_unfiltered()
  } // Watchdog()
  
  Pipelet.Build( 'watchdog', Watchdog, {
    _arm: function() {
      var that = this;
      
      that._timer && clearTimeout( that._timer );
      
      that._timer = setTimeout( function() {
        // current state is either undefined or up
        
        var state = {
          flow : that._flow,
          state: that._down,
          time : new Date()
        };
        
        if ( that._state ) {
          state.uptime = state.time - that._state.time;
          
          that.__emit_update( [ [ that._state, state ] ] );
        } else {
          that.__emit_add( [ state ] );
        }
        
        that._state = state;
        
        de&&ug( 'down: ' + log.s( state ) );
      }, that._timeout );
      
      de&&ug( '_arm(), state: ' + log.s( that._state ) );
    }, // _arm()
    
    _add: function() {
      var that = this
        , state = that._state
      ;
      
      if ( state && state.state == that._up ) {
        de&&ug( '_add(), state is aleady up' );
      } else {
        // state is either not defined or down
        
        state = {
          flow : that._flow,
          state: that._up,
          time : new Date()
        }
        
        if ( that._state ) {
          state.downtime = state.time - that._state.time;
          
          that.__emit_update( [ [ that._state, state ] ] );
        } else {
          that.__emit_add( [ state ] );
        }
        
        that._state = state;
        
        de&&ug( '_add(), new state, up: ' + log.s( state ) );
      }
      
      that._arm();
    }, // _add()
    
    _remove: function() {
    }, // _remove()
    
    _update: function() {
      this._add();
    } // _update()
  } ); // Watchdog instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Watchdog': Watchdog } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // watchdog.js
