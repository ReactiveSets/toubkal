/*  url_events.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'url_events' );
  
  /* -------------------------------------------------------------------------------------------
      url_events( options )
      
      Emits url change events.
      
      This is a singleton, stateful, source, add-only pipelet.
      
      The state has a single value containing the attribute "url" with the most recent value
      of document.location.href.
      
      This state is updated each time a change is detected either using window.onhashchange()
      or testing document.location.href for changes at each animation_frames() pipelet tick.
      
      Typical usage is:
        rs
          .url_events()
          .url_parse()
          .last()
        ;
      
      Where last() transforms a stream of url adds into url updates.
  */
  function URL_Events( options ) {
    options.key = [ 'id' ];
    
    Pipelet.call( this, options );
    
    this._output._fetch = fetch;
    
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
    
    function fetch( receiver ) {
      receiver( [ state ], true );
    } // _fetch()
  } // URL_Events()
  
  Pipelet
    .Build( 'url_events', URL_Events )
    .singleton()
  ;
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'URL_Events': URL_Events } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // url_events.js
