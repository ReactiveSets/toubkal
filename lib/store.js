/*  store.js
    
    A base pipelet for operations storage as a building block for:
    - operations caches
    - persistant storage
    
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
    xs = require( './pipelet.js' ).xs;
  } else {
    xs = exports.xs;
  }
  
  var XS         = xs.XS
    , log        = XS.log
    , extend     = XS.extend
    , Greedy     = XS.Greedy
    , Query      = XS.Query
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "store, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     store( options )
  */
  function Store( options ) {
    this._output || ( this._output = new Store.Output( this, 'store-out' ) );
    
    Greedy.call( this, options );
    
    this._chunk_size = 1000;
    
    // State: a collection of operations
    this._operations = [];
  } // Store()
  
  Store.Output = Greedy.Output.subclass(
    function( p, name ) { Greedy.Output.call( this, p, name ) }, {
    
    fetch_operations: function( receiver, query ) {
      var operations = this.pipelet._operations
        , i
      ;
      
      if ( query ) {
        var filter = new Query( query ).generate().filter
          , filtered = []
          , operation
        ;
        
        for ( i = -1; operation = operations[ ++i ]; ) {
          var values = filter( operation[ 1 ] );
          
          if ( values.length ) [
            filtered.push( [ operation[ 0 ], values, operation[ 2 ] ]
          }
        }
        
        operations = filtered;
      }
      
      var l = operations.length
        , chunk_size = this._chunk_size
        , chunks = Math.floor( l / chunk_size )
        , last_chunk_size = l - chunks * chunk_size
      ;
      
      for ( i = 0; chuncks--; ) {
        // JavaScript evaluation order guaranties that the first i has the initial value
        receiver( operations.slice( i, i += chunk_size ) );
      }
      
      receiver( operations.slice( i ), true );
      
      return this;
    } // fetch_operations()
  } );
  
  Greedy.Build( 'store', Store, {
    // Overload this method to implement 
    _store: function( operation ) {
      // ToDo: fill indexes
      this.operations.push( operation );
      
      return this;
    }, // _store()
    
    _add: function( values, options ) {
      return this._store( [ 'add', values, options ] );
    }, // _add()
    
    _remove: function( values, options ) {
      return this._store( [ 'remove', values, options ] );
    }, // _remove()
    
    _update: function( updates, options ) {
      return this._store( [ 'update', updates, options ] );
    }, // _update()
  } ); // Store instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    'Store': Store
  } );
  
  de&&ug( "module loaded" );
} )( this ); // store.js
