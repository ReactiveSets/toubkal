/*  last.js
    
    A set with a single value of the last value added to the source.
    
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
    , Greedy     = XS.Greedy
    , Query      = XS.Query
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs last, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     last( options )
     
     Forwards downstream the last value of its upstream dataflow.
     
     Limitation:
       There is a single last state memorized in this pipelet. So if several downstream pipelet
       wish to have a last value but for different queries, one should use several last()
       instances.
     
     Examples:
       last_sale = sales.last();
  */
  function Last( options ) {
    this._output || ( this._output = new Last.Output( this, 'last_out' ) );
    
    Greedy.call( this, options );
    
    // State
    this._last = null;
  } // Last()
  
  Last.Output = Greedy.Output.subclass(
    function( p, name ) { Greedy.Output.call( this, p, name ) }, {
    
    _fetch: function( receiver, query ) {
      var last = this.pipelet._last
        , values = last ? [ last ] : []
      ;
      
      if ( query && values.length ) values = new Query( query ).generate().filter( values );
      
      receiver( values, true );
      
      return this;
    } // _fetch()
  } );
  
  Greedy.Build( 'last', Last, {
    _add: function( values, options ) {
      var l = values.length;
      
      if ( l ) {
        var last = this._last
          , v = this._last = values[ l - 1 ]
        ;
        
        if ( last ) {
          this.__emit_update( [ [ last, v ] ], options );
        } else {
          this.__emit_add( [ v ], options );
        }
      }
      
      return this;
    }, // _add()
    
    _remove: function() {
      return this;
    }, // _remove()
  } ); // Last instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    'Last': Last
  } );
  
  de&&ug( "module loaded" );
} )( this ); // last.js
