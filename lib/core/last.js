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
  
  var RS            = rs.RS
    , Greedy        = RS.Greedy
    , safe_identity_code = RS.Pipelet.safe_identity_code
    , value_equals  = RS.value_equals
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet last( options )
      
      @short Holds the last value from @@adds-only operations
      
      @parameters
      - **options** (Object): @@class:Pipelet options plus:
        - **output_key** (Array of Strings): output values key, this allow
          to handle multiple last values
      
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
      
      When a chunck of values is received, if option **output_key** is not  provided,
      a maximum of one operation is emitted for the last value of this chunk,
      otherwise, it emits an operation of the last values by the ouput key.
      
      @see_also
      - Pipelet adds()
      - Pipelet removes()
      
      @to_do
      - ToDo: add tests for last()
  */
  function Last( options ) {
    var that = this;
    
    Greedy.call( that, options );
    
    // State
    that._last = [];
    that._last_by_identity = {};
    
    // Intermediate state within transactions
    that._last_chunck = [];
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    function fetch_unfiltered( receiver ) {
      var last = [];
      
      if( options.output_key ) {
        var last_by_identity = that._last_by_identity;
        
        for( var p in last_by_identity ) {
          last.push( last_by_identity[ p ] );
        }
      } else {
        last = that._last;
      }
      
      receiver( last, true );
    }
  } // Last()
  
  Greedy.Build( 'last', Last, {
    _make_identity: function( value ) {
      return ( new Function( 'o', 'return ' + safe_identity_code( this._options.output_key ) ) )( value )
    }, // _make_identity()
    
    _add: function( values, options ) {
      var that = this
        , output_key = that._options.output_key
        , _t   = options && options._t
        , l
        , last
        , v
      ;
      
      // last value by identity
      if( output_key ) {
        var chunk_by_identity = {}
          , l = values.length
        ;
        
        // build an object of chunk by identity
        for( var i = -1; ++i < l; ) {
          v = values[ i ];
          
          chunk_by_identity[ that._make_identity( v ) ] = v;
        } // for()
        
        // if no transaction or end of transaction
        if ( ! _t || ! _t.more ) {
          // This is the last chunk
          if( Object.keys( chunk_by_identity ).length ) {
            var adds    = []
              , updates = []
            ;
            
            for( var p in chunk_by_identity ) {
              last = that._last_by_identity[ p ];
              
              that._last_by_identity[ p ] = v = chunk_by_identity[ p ];
              
              last
                ? value_equals( last, v ) || updates.push( [ last, v ] )
                
                : adds.push( v )
              ;
            } // for()
            
            // console.log( 'adds'   , adds.length   , options, values );
            // console.log( 'updates', updates.length, options, values );
            
            that.__emit_operations( adds, [], updates, options );
            
            // clear chunks
            chunk_by_identity = {};
          } else if ( _t && _t.forks )
            that.__emit_add( [], options )
          ;
        } // if( ! _t || ! _t.more )
      } else {
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
            */
            that._last = [ v = values[ l - 1 ] ];
            
            last
              ? value_equals( last, v ) || that.__emit_update( [ [ last, v ] ], options )
              
              : that.__emit_add( [ v ], options )
          
          } else if ( _t && _t.forks )
            that.__emit_add( [], options )
          ;
        }
      } // if( output_key ) ... else {}
    }, // _add()
    
    _remove: function( values, options ) {
      // forward end-of-transactions
      this._add( [], options );
    }, // _remove()
    
    _update: function( updates, options ) {
      var that        = this
        , output_key  = that._options.output_key
        , _t          = options && options._t
        , l           = updates.length
      ;
      
      // last value by identity
      if( output_key ) {
        var _updates = [];
        
        for( var i = -1; ++i < l; ) {
          var update_add = updates[ i ][ 1 ]
            , last       = that._last_by_identity[ that._make_identity( update_add ) ]
          ;
          
          if( last ) {
            _updates.push( [ last, update_add ] );
          }
        } // for()
        
        _updates.length && that.__emit_update( _updates, options );
        
        /*
        var chunk_by_identity = {};
        
        // build an object of chunk by identity
        for( var i = -1; ++i < l; ) {
          var update_add = updates[ i ][ 1 ];
          
          chunk_by_identity[ that._make_identity( update_add ) ] = update_add;
        } // for()
        
        console.log( 'updates', updates, chunk_by_identity, options );
        
        if ( ! _t || ! _t.more ) {
          // This is the last chunk
          if( Object.keys( chunk_by_identity ).length ) {
            var updates = [];
            
            for( var p in chunk_by_identity ) {
              var last = that._last_by_identity[ p ]
                , v    = chunk_by_identity[ p ]
              ;
              
              if( last && ! value_equals( last, v ) ) {
                that._last_by_identity[ p ] = v;
                
                updates.push( [ last, v ] )
              }
            } // for()
            
            that.__emit_update( updates, options );
            
            // adds.length    && that.__emit_add   ( adds   , options );
            // updates.length && that.__emit_update( updates, options );
            
            chunk_by_identity = {};
          } else if ( _t && _t.forks )
            that.__emit_add( [], options )
          ;
        } // if( ! _t || ! _t.more )
        else {
          console.log( 'else', updates, options );
        }
        */
      } else {
        // add last value and/or forward end-of-transactions
        that._add( l ? [ updates[ l - 1 ][ 1 ] ] : [], options );
      }
      
      //-----------------
      // old code
      // this._add( l ? [ updates[ l - 1 ][ 1 ] ] : [], options );
    } // _update()
  } ); // Last instance methods
  
  return rs;
} ); // last.js
