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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'toubkal_react', [ '../core/input_set', [ 'React', 'react' ] ], function( rs, React ) {
  'use strict';
  
  var RS        = rs.RS
    , Input_Set = RS.Input_Set
    , extend    = RS.extend
    , is_server = typeof window == 'undefined'
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */ 
  var de = true, ug = RS.log.bind( null, 'react' );
  
  /* -------------------------------------------------------------------------------------------
      react( dom_node, render, options )
      
      Renders a set into the DOM using Facebook React
      
      Parameters:
        - dom_node : DOM element where to mount the React component
        - render   : React component render method
        - options  : optional Object:
          - component_name: React component name
          - inputs: Object which attribute define each input, default is { 'values': 'self' }
            - ToDo: complete documentation of inputs option
  */
  function _React( dom_node, render, options ) {
    if ( typeof render !== 'function' ) throw new Error( 'render function is undefined' );
    
    options = options || {};
    
    var that = this
      , initial_state = initialize_inputs()
      , instance
      , react_component = create_component()
    ;
    
    return this;
    
    function initialize_inputs() {
      var inputs = options.inputs || { 'values': that }
        , initial_state = {}
      ;
      
      Object.keys( inputs ).forEach( initialize_input );
      
      return initial_state;
      
      function initialize_input( input_name  ) {
        // ToDo: initialize as Input Ports, instead of input pipelets
        var input = inputs[ input_name ];
        
        initial_state[ input_name ] = [];
        
        if ( input === that || input === 'self' ) {
          Input_Set.call( that, set_state );
        } else {
          // Alter inputs[ input_name ] to make it a pipelet
          if ( input instanceof Array ) input = inputs[ input_name ] = rs.set( columns );
          
          input.input_set( set_state );
        }
        
        function set_state( state ) {
          if ( is_server ) {
            de&&ug( 'renderToString():', React.renderToString( instance ) );
          } else {
            react_component.set( input_name, state );
          }
        } // set_state()
      } // initialize_input()
    } // initialize_inputs()
    
    function create_component() {
      var Component_Class = React.createClass( {
        displayName: options.component_name || this._get_name(),
        
        getInitialState: function() {
          de&&ug( 'getInitialState():', initial_state );
          
          return initial_state;
        }, // getInitialState()
        
        set: function( state_name, state ) {
          de&&ug( 'setState()' );
          
          this.state[ state_name ] = state;
          
          this.setState( this.state );
        }, // set()
        
        render: render
      } );
      
      instance = React.createElement( Component_Class, options.props );
      
      return React.render( instance, dom_node );
    } // create_component()
  } // _React()
  
  Input_Set.Build( 'react', _React ); // _React instance methods
  
  /* -------------------------------------------------------------------------------------------
     react_table( dom_node, columns, options )
  */
  function React_Table( dom_node, columns, options ) {
    var that = this;
    
    var react_opts = {
      component_name : 'React_Table',
      
      inputs: { 'rows': this, 'columns': columns }
    };
    
    return _React.call( this, dom_node, render_table, extend( options, react_opts ) );
    
    function render_table() {
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
    } // render_table()
  } // React_Table()
  
  _React.Build( 'react_table', React_Table );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'React': _React, 'React_Table': React_Table } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // react.js
