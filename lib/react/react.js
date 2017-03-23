/*  react.js
    
    The MIT License (MIT)
    
    Copyright (c) 2013-2016, Reactive Sets
    
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
( 'toubkal_react', [ '../core/input_set', [ 'React', 'react' ], [ 'ReactDOM', 'react-dom' ] ], function( rs, React, ReactDOM ) {
  'use strict';
  
  var RS        = rs.RS
    , Input_Set = RS.Input_Set
    , extend    = RS.extend
    , is_server = typeof window == 'undefined'
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */ 
  var de = false, ug = RS.log.bind( null, 'react' );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet react( dom_node, render, options )
      
      @short Renders a set into the DOM using the React library
      
      @parameters
      - dom_node : DOM element where to mount the React component
      - render   : React component render method
      - options  : optional Object:
        - component_name: React component name
        - inputs: Object which attribute define each input, default is { 'values': 'self' }
          - ToDo: complete documentation of inputs option
  */
  function React_Pipelet( dom_node, render, options ) {
    if ( typeof render !== 'function' ) throw new Error( 'render function is undefined' );
    
    options = options || {};
    
    var that = this
      , inputs = options.inputs || { 'values': this }
      , input_names = Object.keys( inputs )
      , initial_state = {}
      , react_instance
      , react_component
    ;
    
    // !! The order of the following three initializations is important
    input_names.forEach( initialize_input_state );
    
    react_component = create_component();
    
    input_names.forEach( set_input );
    
    // !! Input_Set.call( this, set_state ) called by one of set_input() invocations
    
    return this;
    
    function initialize_input_state( input_name  ) {
      initial_state[ input_name ] = [];
    } // initialize_input_state()
    
    function set_input( input_name ) {
      de&&ug( 'set_input(), name: ' + input_name );
      
      // ToDo: initialize as Input Ports, instead of input pipelets
      var input = inputs[ input_name ];
      
      if ( input === that || input === 'self' ) {
        Input_Set.call( that, set_state, options );
      } else {
        ( RS.is_array( input ) ? rs.set( input ) : input )
          .input_set( set_state )
        ;
      }
      
      function set_state( state ) {
        if ( is_server ) {
          de&&ug( 'renderToString():', React.renderToString( react_instance ) );
        } else {
          react_component.set( input_name, state );
        }
      } // set_state()
    } // set_input()
    
    function create_component() {
      de&&ug( 'create_component()' );
      
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
      
      react_instance = React.createElement( Component_Class, options.props );
      
      return ReactDOM.render( react_instance, dom_node );
    } // create_component()
  } // React_Pipelet()
  
  Input_Set.Build( 'react', React_Pipelet ); // React_Pipelet instance methods
  
  /* -------------------------------------------------------------------------------------------
      @pipelet react_table( dom_node, columns, options )
      
      @short Responsive table using React
      
      @parameters
      - dom_node (HTMLElement)
      - columns (Pipelet): which values attributes are:
        - id: column identifier
        - label: column name
  */
  function React_Table( dom_node, columns, options ) {
    var that = this;
    
    options = extend( {}, options, {
      component_name : 'React_Table',
      
      inputs: { 'rows': that, 'columns': columns }
    } );
    
    return React_Pipelet.call( that, dom_node, render_table, extend( options, options ) );
    
    function render_table() {
      var state   = this.state
        , columns = state.columns
        , rows    = state.rows.map( react_tr )
        , headers = columns.map( react_th )
        , thead   = React.createElement( 'thead', null, headers )
        , tbody   = React.createElement( 'tbody', null, rows    )
      ;
      
      return React.createElement( 'table', { className: options.class_name || '' }, thead, tbody );
      
      function react_th( column ) {
        return React.DOM.th( { key: that._identity( column ), scope: 'col' }, column.label )
      } // react_th()
      
      function react_tr( r ) {
        var td = columns.map( react_td );
        
        return React.DOM.tr( { key: that._identity( r ) }, td );
        
        function react_td( c, i ) {
          var o = { key: that._identity( c ), 'aria-label': c.label };
          
          if( i == 0 ) o.scope = 'row';
          
          return React.DOM.td( o, r[ c.id ] )
        } // react_td()
      } // react_tr()
    } // render_table()
  } // React_Table()
  
  React_Pipelet.Build( 'react_table', React_Table );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'React': React_Pipelet, 'React_Table': React_Table } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // react.js
