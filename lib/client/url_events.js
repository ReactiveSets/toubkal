/*  url_events.js
    
    Copyright (c) 2013-2017, Reactive Sets

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
( 'url_events', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , Pipelet  = RS.Pipelet
    , de       = false
    , ug       = RS.log.bind( null, 'url_events' )
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet url_events( options )
      
      @short Emits url change events
      
      @parameters
      - **options** (Object): optional @@class:Pipelet options.
      
      @emits
      - **id** (Number): always 1.
      
      - **_v** (Number): starts at 0, incremented on each url change.
      
      - **url** (String): current url value, from ```document.location.href```.
      
      @examples
      ```javascript
        rs
          .url_events()
          .url_parse()
          .url_pattern( 'hash', pattern )
          .last() // transforms url add-only events into a stream of updates
        ;
      ```
      
      Using:
      - Pipelet url_events()
      - Pipelet url_parse()
      - Pipelet url_pattern()
      - Pipelet last()
      
      @description
      This is a @@singleton, @@stateful, source, @@add-only pipelet.
      
      State is updated each time a change is detected either using
      ```window.onhashchange()``` if available or testing
      ```document.location.href``` for changes at each tick from
      pipelet animation_frames().
      
      ToDo: url_events(): use source events to mutate document.location.href.
  */
  function URL_Events( options ) {
    options.key = [ 'id' ];
    
    Pipelet.call( this, options );
    
    this._output.fetch_unfiltered = fetch_unfiltered;
    
    var that  = this
      , state = { id: 1, _v: 0, url: document.location.href }
    ;
    
    if( typeof window.onhashchange != null ) {
      window.onhashchange = hash_change;
    } else {
      // simulate hash_change using animation_frames() pipelet
      rs
        .animation_frames()
        ._output
        .on( 'add', hash_change )
      ;
    }
    
    function hash_change() {
      var url = document.location.href
        , previous_url = state.url
      ;
      
      if ( url != previous_url ) {
        de&&ug( 'url_events(), new url:', url );
        
        state.url = url;
        state._v += 1;
        
        that.__emit_add( [ state ] );
      }
    } // hash_change()
    
    function fetch_unfiltered( receiver ) {
      receiver( [ state ], true );
    } // fetch_unfiltered()
  } // URL_Events()
  
  Pipelet
    .Build( 'url_events', URL_Events )
    .singleton()
  ;
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.URL_Events = URL_Events;
  
  return rs;
} ); // url_events.js
