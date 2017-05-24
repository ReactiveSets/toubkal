/*  last.js
    
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
    
    ---
    
    A set with a single value of the last value added to the source.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'last', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , Greedy       = RS.Greedy
    , value_equals = RS.value_equals
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet last( options )
      
      @short Holds the last value from @@adds-only operations
      
      @parameters
      - **options** (Object): @@class:Pipelet options.
      
      @examples
      - provide last event from a stream of add-only parsed url events:
      
        ```javascript
        rs
          .url_events()      // adds-only stream with a "url" attribute
          .url_parse()       // parses "url" attribute into url components
          .url_pattern( .. ) // parses hash using a pattern
          .last()            // set containing the last parsed url
        ;
        ```
        
        Using:
        - Pipelet url_events()
        - Pipelet url_parse()
        - Pipelet url_pattern()
      
      @description
      This is a @@stateful, @@synchronous, @@greedy pipelet. Current
      state has zero or one value.
      
      Forwards downstream the "last value" from upstream dataflow.
      
      This does not provide the last value based on some order.
      "Last value" means the last value received from the last received
      add or update @@operation\. Removes are ignored, so the last value
      is never removed and can only be replaced by a new added value.
      
      First emits an @@add operation, subsequently emits @@update
      operations to update the last value.
      
      If a new last value is the same a previously, it emits nothing.
      
      If a chunck of values is received, a maximum of one operation
      is emitted for the last value of this chunk.
      
      @see_also
      - Pipelet adds()
      - Pipelet removes()
      
      @to_do
      - ToDo: add tests for last()
      - ToDo: handle multiple values from key
  */
  function Last( options ) {
    var that = this;
    
    Greedy.call( that, options );
    
    // State
    that._last = [];
    
    // Intermediate state within transactions
    that._last_chunck = [];
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    function fetch_unfiltered( receiver ) {
      receiver( that._last, true );
    }
  } // Last()
  
  Greedy.Build( 'last', Last, {
    _add: function( values, options ) {
      var that = this
        , _t   = options && options._t
        , l
        , last
        , v
      ;
      
      if ( values.length ) that._last_chunck = values;
      
      if ( ! _t || ! _t.more ) {
        // This is the last chunk
        values = that._last_chunck;
        that._last_chunck = [];
        
        if ( l = values.length ) {
          last = that._last[ 0 ];
          
          /*
            !!!Warning: Set new state before calling that.__emit_xxx().
            
            If during emission, a pipelet is added downstream
            synchronously, it will fetch the current state which will
            be delayed by Plug.._fetch() finding its "emitting" flag set.
            This will prevent the new pipelet from receiving this
            emitted operation. Right after emission, the delayed
            fetch will resume and it MUST find the new state.
            
            The above is disabled for now so we set _last[] after emitting!
          */
          v = values[ l - 1 ];
          
          last
            ? value_equals( last, v ) || that.__emit_update( [ [ last, v ] ], options )
            
            : that.__emit_add( [ v ], options )
          ;
          
          that._last = [ v ]
        
        } else if ( _t && _t.forks )
          that.__emit_add( [], options )
        ;
      }
    }, // _add()
    
    _remove: function( values, options ) {
      // forward end-of-transactions
      this._add( [], options );
    }, // _remove()
    
    _update: function( updates, options ) {
      var l = updates.length;
      
      // add last value and/or forward end-of-transactions
      this._add( l ? [ updates[ l - 1 ][ 1 ] ] : [], options );
    } // _update()
  } ); // Last instance methods
  
  return rs;
} ); // last.js
