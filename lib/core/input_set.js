/*  inupt_set.js
    
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
( 'input_set', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , Ordered  = RS.Ordered
    , has_more = RS.Transactions.Options.has_more
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'input_set' );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet input_set( emit, options )
      
      @short Emit full ordered state whenever input set changes
      
      @description:
      Source values must be ordered by @@pipelet:order().
      
      Allows to build reactive functional stateful methods on any change without the
      complexity of handling incremental adds and removes operations.
      
      Although this may increases productivity, it is at the cost of efficiency, and should
      be avoided for large sets.
      
      This is a @@stateful, @@synchronous, @@greedy pipelet.
  */
  function Input_Set( emit, options ) {
    Ordered.call( this, options );
    
    this._emit_state = emit_state;
    
    return this;
    
    function emit_state() {
      emit( this.a );
      
      return this;
    } // emit_state()
  } // Toubkal_react_Component()
  
  Ordered.Build( 'input_set', Input_Set, function( Super ) {
    // Private methods
    function change( that, caller, values, options ) {
      de&&ug( caller + '(), values:', values.length, 'options:', options );
      
      Super[ caller ].call( that, values, options );
      
      return has_more( options ) ? that : that._emit_state();
    } // change()
    
    // Public methods
    return {
      _add: function( values, options ) {
        return change( this, '_add', values, options );
      }, // _add()  
      
      _remove: function( values, options ) {
        return change( this, '_remove', values, options );
      }, // _remove()
      
      _update: function( values, options ) {
        return change( this, '_update', values, options );
      }, // _update()

      _clear: function( options ) {
        de&&ug( 'clear(), options:', options );
        
        Super.clear.call( this, options );
        
        return has_more( options ) ? this : this._emit_state();
      } // _clear()
    } // Input_Set() instance methods
  } ); // input_set()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.Input_Set = Input_Set;
  
  return rs;
} ); // inupt_set.js
