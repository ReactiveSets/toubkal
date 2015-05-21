/*  inupt_set.js
    
    The MIT License (MIT)
    
    Copyright (c) 2013-2015, Reactive Sets
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

!function( exports ) {
  "use strict";
  
  var RS       = exports.RS
    , Set      = RS.Set
    , extend_2 = RS.extend_2
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */ 
  var de = true, ug = RS.log.bind( null, 'input set' );
  
  /*--------------------------------------------------------------------------------------------
      Input_Set()
  */
  
  function Input_Set( name, state, options ) {
    Set.call( this, [], options );
    
    this._state = state;
    
    this._state_name = name;
    
    return this;
  } // Toubkal_react_Component()
  
  Set.Build( 'input_set', Input_Set, function( Super ) {  
    function change( caller, values, options ) {
      de&&ug( 'Input_Set..' + caller + '(), values: ', values.length );
      
      Super[ caller ].call( this, values, options );
      
      if ( options && options._t && options._t.more ) return this;
      
      this._state.set( this._state_name, this.a );
      
      return this;
    } // change()
    
    return {
      _add: function( values, options ) {
        return change.call( this, '_add', values, options );
      }, // _add()  
      
      _remove: function( values, options ) {
        return change.call( this, '_remove', values, options );
      } // _remove()
    }
  } ); // Input_Set() instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { Input_Set: Input_Set } );
  
  de&&ug( "module loaded" );
}( this ); // inupt_set.js
