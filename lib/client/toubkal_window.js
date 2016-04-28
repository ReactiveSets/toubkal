/*  toubkal_window.js
    
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
undefine()( 'toubkal_window', [ 'window', '../core/pipelet' ], function( window, rs ) {
  var RS      = rs.RS
    , extend  = RS.extend
    , Pipelet = RS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
      @pipelet window_size( options )
      
      @short Provide a dataflow of window size change events
      
      @description:
        This is a singleton, synchronous, stateful, lazy, adds-only pipelet. When fetched, it
        will emit its last value. Source events are ignored and it never subscribes to any
        source events.
      
      @parameters:
        - options (Object): optional pipelet options.
      
      @emits:
        - id     (Integer): starts at 1, incremented on each change
        - width  (Integer): last value of window.innerWidth
        - height (Integer): last value of window.innerHeight
      
      @example:
        - Throttle high-frequency window resize events using animation_frame():
        
          ```javascript
          rs
            .window_size()
            .throttle( rs.animation_frame() )
            .map( function( _ ) { return _.last } )
            .trace( 'window_size' )
            .greedy()
          ;
          ```
  */
  function $Window_Size( options ) {
    var that   = this
      , id     = 0
      , last
      , output
    ;
    
    set_last();
    
    Pipelet.call( that, extend( {}, options, { key: [ 'id' ] } ) );
    
    output = that._output;
    
    output.fetch_unfiltered = fetch_unfiltered;
    
    // prevent fetch and query updates propagation upstream
    output.source = null;
    
    window.addEventListener( 'resize', resize );
    
    function resize() {
      set_last();
      
      output.emit( 'add', [ last ] );
    } // resize()
    
    function set_last() {
      last = {
        id    : ++id,
        width : window.innerWidth,
        height: window.innerHeight
      }
    } // new_size()
    
    function fetch_unfiltered( rx ) {
      rx( [ last ], true );
    } // fetch_unfiltered()
  } // $Window_Size()
  
  Pipelet
    .Build( 'window_size', $Window_Size, {
      _add   : nil_function,
      _remove: nil_function,
      _update: nil_function,
      _clear : nil_function
    } )
  
    .singleton()
  ;
  
  function nil_function() {}
  
  return rs;
} ); // toubkal_window.js
