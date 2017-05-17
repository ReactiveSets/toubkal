/*  store.js
    
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
( 'store', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS     = rs.RS
    , Greedy = RS.Greedy
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet store( options )
      
      @short Store operations history
      
      @parameters
      - **options** (Object): @@class:Pipelet options.
      
      @description
      This is a @@stateful, @@greedy, @@synchronous pipelet.
      
      A base pipelet for operations storage as a building block for:
      - full versions history caches
      - persistant storage
      - testing operations emitted by tested pipelets
      
      @see_also
      - Pipelet set()
      - Pipelet unique()
  */
  function Store( options ) {
    var that = this;
    
    Greedy.call( that, options );
    
    // State: a collection of operations
    var operations = that._operations = [];
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    function fetch_unfiltered( receiver ) {
      var i = -1
        , l
        , operation
        , no_more
      ;
      
      // allow operations to grow while fetching
      while ( ++i < ( l = operations.length ) ) {
        operation = operations[ i ];
        
        no_more = i == l - 1;
        
        receiver( operation[ 1 ], no_more, operation[ 0 ] );
        
        if ( no_more ) return;
      }
      
      // there are no operations
      // ToDo: Output._fetch(): allow values to be undefined, allowing to mean no-operations
      receiver( [], true );
    } // fetch_unfiltered()
  } // Store()
  
  Greedy.Build( 'store', Store, {
    // Overload this method to implement 
    _store: function( operation ) {
      this._operations.push( operation );
    }, // _store()
    
    _add: function( values, options ) {
      this._store( [ 0, values ] );
      
      this.__emit( 'add', values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      this._store( [ 1, values ] );
      
      this.__emit( 'remove', values, options );
    }, // _remove()
    
    _update: function( updates, options ) {
      this._store( [ 2, updates ] );
      
      this.__emit( 'update', updates, options );
    } // _update()
  } ); // Store instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.Store = Store;
  
  return rs;
} ); // store.js
