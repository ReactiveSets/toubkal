/*  react.js
    
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
  var de = true, ug = RS.log.bind( null, 'toubkal react' );
  
  /*--------------------------------------------------------------------------------------------
      Toubkal_React_Component()
      
      update component state when _add() or _remove(), using React component method setState().
      
      Parameters:
        
        - component : React component
        - options   : optional object
            
            
  */
    
  function Toubkal_React_Component( component, options ) {
    Set.call( this, [], options );
    
    this._component = component;
    
    this._state_attribute = this._options.state_attribute || 'values';
    
    return this;
  } // Toubkal_react_Component()
  
  Set.subclass( Toubkal_React_Component, function( Super ) { return {
    _add: function( values, options ) {
      de&&ug( 'Toubkal_React_Component.._add(), values: ', values.length );
      
      Super._add.call( this, values, options );
      
      if ( options && options._t && options._t.more ) return this;
      
      var o = {}; o[ this._state_attribute ] = this.a
       
      this._component.setState( extend_2( this._component.state, o ) );
      
      return this;
    }, // _add()  
    
    _remove: function( values, options ) {
      de&&ug( 'Toubkal_React_Component.._remove(), values: ', values.length );
      
      Super._remove.call( this, values, options );
      
      if ( options && options._t && options._t.more ) return this;
      
      var o = {}; o[ this._options.state_attribute ] = this.a
       
      this._component.setState( extend_2( this._component.state, o ) );
      
      return this;
    } // _remove()
  } } ); // Toubkal_React_Component() instance methods
  
  /*--------------------------------------------------------------------------------------
      Toubkal_React()
      
      Renders a React component into the DOM
      
      Parameters:
        
        - dom_node : DOM element where to mount the React component
        - render   : React component render method
        - options  : optional object
  */
  
  function Toubkal_React( dom_node, render, options ) {
    if( typeof render !== 'function' ) throw new Error( 'render function is undefined' );
    
    var that = this;
    
    var component = React.createClass( {
      displayName: options.component_name || this._get_name(),
      
      getInitialState: function() {
        de&&ug( 'getInitialState()' );
        
        return options.initial_state || { values: [] };
      }, // getInitialState()
      
      render: function() {
        de&&ug( 'render()' );
        
        return render.call( this );
      } // render()
    } );
    
    var component = React.render( React.createElement( component, options.props ), dom_node );
    
    return Toubkal_React_Component.call( this, component, options );
  } // Toubkal_React()
  
  Toubkal_React_Component.Build( 'toubkal_react', Toubkal_React ); // Toubkal_React instance methods
  
  /*--------------------------------------------------------------------------------------
      React_Table_Columns()
  */
  
  function React_Table_Columns( component, columns, options ) {
    Toubkal_React_Component.call( this, component, options );
    
    this._add_source( columns );
    
    return this;
  } // React_Table_Columns()
  
  Toubkal_React_Component.subclass( React_Table_Columns ); // React_Table_Columns() instance methods
  
  /*--------------------------------------------------------------------------------------
      React_Table()
  */
  
  function React_Table( dom_node, columns, options ) {
    var that = this;
    
    var render = function() {
      var state   = this.state
        , columns = state.columns
        , rows    = state.rows   
      ;
      
      var thead = React.createElement( 'thead', null,
        columns.map( function( c ) { return React.DOM.th( { key: that.make_key( c ) }, c.label ) } ) // th
      ); // thead
      
      var tbody = React.createElement( 'tbody', null,
        rows.map( function( r ) {
          return React.DOM.tr( { key: that.make_key( r ) },
            columns.map( function( c ) { return React.DOM.td( { key: that.make_key( c ) }, r[ c.id ] ) } ) // td
          ) // tr
        } )
      ); // tbody
      
      return React.createElement( 'table', { className: options.class_name || '' }, thead, tbody );
    };
    
    var react_opts = {
      component_name : 'ReactTable',
      initial_state  : { columns: [], rows: [] },
      state_attribute: 'rows'
    };
    
    Toubkal_React.call( this, dom_node, render, extend_2( react_opts, options ) );
    
    new React_Table_Columns( this._component, columns, extend_2( { state_attribute: 'columns' }, options ) );
    
    return this;
  } // React_Table()
  
  Toubkal_React.Build( 'react_table', React_Table );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  // RS.add_exports( { Toubkal_React_Component: Toubkal_React_Component, Toubkal_React: Toubkal_React } );
  
  de&&ug( "module loaded" );
}( this ); // react.js
