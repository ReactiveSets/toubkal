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
    , de     = false
    , ug     = RS.log.bind( null, 'store' )
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet store( options )
      
      @short Store operations history
      
      @description
      A base pipelet for operations storage as a building block for:
      - operations caches
      - persistant storage
      
      This is a @@stateful, @@greedy, @@synchronous pipelet.
  */
  function Store( options ) {
    var that = this;
    
    Greedy.call( that, options );
    
    // State: a collection of operations
    var operations = that._operations = [];
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    function fetch_unfiltered( receiver ) {
      // allow operations to grow while fetching
      for ( var i = -1; operation = operations[ ++i ]; )
        receiver( operation[ 1 ], false, operation[ 0 ] )
      ;
      
      // there really are no more operations at this time
      receiver( [], true );
    } // fetch_unfiltered()
  } // Store()
  
  Greedy.Build( 'store', Store, {
    // Overload this method to implement 
    _store: function( operation ) {
      this.operations.push( operation );
    }, // _store()
    
    _add: function( values, options ) {
      this._store( [ 0, values ] );
      
      this._emit( 'add', values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      this._store( [ 1, values ] );
      
      this._emit( 'remove', values, options );
    }, // _remove()
    
    _update: function( updates, options ) {
      this._store( [ 2, updates ] );
      
      this._emit( 'update', updates, options );
    } // _update()
  } ); // Store instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Store': Store
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // store.js
