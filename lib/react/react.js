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
  
  var RS        = exports.rs.RS
    , Input_Set = RS.Input_Set
    , extend_2  = RS.extend._2
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */ 
  var de = true, ug = RS.log.bind( null, 'toubkal react' );
  
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
    
    return Input_Set.call( this, options.state_name || 'values', create_component(), options );
    
    function create_component() {
      var component = React.createClass( {
        displayName: options.component_name || this._get_name(),
        
        getInitialState: function() {
          de&&ug( 'getInitialState()' );
          
          return options.initial_state || { values: [] };
        }, // getInitialState()
        
        set: function( state_name, values ) {
          var o = {}; o[ state_name ] = values;
          
          this.setState( extend_2( this.state, o ) );
        }, // set()
        
        render: render
      } );
      
      return React.render( React.createElement( component, options.props ), dom_node );
    } // create_component()
  } // Toubkal_React()
  
  Input_Set.Build( 'toubkal_react', Toubkal_React ); // Toubkal_React instance methods
  
  /*--------------------------------------------------------------------------------------
      React_Table()
  */
  
  function React_Table( dom_node, columns, options ) {
    var that = this;
    
    if( columns instanceof Array ) columns = rs.set( columns );
    
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
      state_name     : 'rows'
    };
    
    Toubkal_React.call( this, dom_node, render, extend_2( options, react_opts ) );
    
    columns.input_set( 'columns', this._state );
    
    return this;
  } // React_Table()
  
  Toubkal_React.Build( 'react_table', React_Table );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Toubkal_React': Toubkal_React } );
  
  de&&ug( "module loaded" );
}( this ); // react.js
