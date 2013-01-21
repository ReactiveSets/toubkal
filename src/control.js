/*  control.js

    Copyright (C) 2013, Connected Sets

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
    XS = require( './xs.js' ).XS;
    require( './ordered_set.js' );
  } else {
    XS = exports.XS;
  }

  var log         = XS.log
    , subclass    = XS.subclass
    , extend      = XS.extend
    , Code        = XS.Code
    , Fork        = XS.Fork
    , Set         = XS.Set
    , Ordered_Set = XS.Ordered_Set
  ;

  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;

  function ug( m ) {
    log( "xs control, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Control()
  */
  
  function Control( node, organizer, options ) {
    this.init( node, options );
    
    Ordered_Set.call( this, [], organizer, options );
    
    return this;
  } // Control()
  
  subclass( Ordered_Set, Control );
  
  extend( Control.prototype, {
    init: function( node, options ) {
      this
        .set_node( node )
        .process_options( options )
        //.get_default_value()
      ;
      
      if( typeof this.draw === "function" ) this.draw();
      
      return this.bind();
    }, // init()
    
    set_node: function( node ) {
      if(
           typeof HTMLElement === "object" ? node instanceof HTMLElement
        : node && typeof node === "object" && node.nodeType === 1 && typeof node.nodeName === "string"
      ) {
        this.node = node;
      } else {
        throw( "node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    process_options: function( options ) {
      this.options = options = extend( {}, options );
      
      return this;
    }, // process_options
    
    bind: function() {
      return this;
    }, // bind()
    /*
    get_default_value: function() {
      var options       = this.options
        , values        = this.get()
        , default_value = options.default_value
        , value         = values && values[ 0 ]
      ;
      
      this.value = default_value === undefined ? values : default_value;
      
      return this;
    }, // get_default_value()
    */
    get_value: function() {
      return this;
    }, // get_value()
    
    set_value: function( v ) {
      this.value = v;
      
      return this;
    }, // set_value()
    
    update: function() {
      this.get_value();
      this.set_value( this.value );
    } // update()
  } );
  
  /* -------------------------------------------------------------------------------------------
     Control.Checkbox()
  */
  Fork.prototype.checkbox = function( node, organizer, options ) {
    var control = new Control.Checkbox( node, organizer, options );
    
    this.connect( control );
    
    return control;
  };
  
  Control.Checkbox = function( node, organizer, options ) {
    de&&ug( "new Control.Checkbox()" );
    
    Control.call( this, node, organizer, options );
    
    return this;
  }; // Control.Checkbox()
  
  subclass( Control, Control.Checkbox );
  
  extend( Control.Checkbox.prototype, {
    /*
    get_default_value: function() {
      Control.prototype.get_default_value.call( this );
      
      var a = this.get();
      
      if( this.value === undefined ) this.value = a && a[ 0 ] || { id: false };
      
      return this;
    }, // get_default_value()
    */
    bind: function() {
      var that = this;
      
      this.checkbox.onclick = function() {
        that.update();
      };
      
      return this;
    }, // bind
    
    get_value: function() {
      var a = this.get();
      
      this.value = a[ 0 ].id === this.node.getElementsByTagName( "input" )[ 0 ].checked ? a[ 0 ] : a[ 1 ];
      
      de&&ug( "Checkbox::get_value(), value: " + log.s( this.value ) );
      
      return this;
    }, // get_value()
    
    set_value: function( v ) {
      Control.prototype.set_value.call( this, v );
      
      de&&ug( "Checkbox::set_value(), value: " + log.s( this.value ) );
      
      this.checkbox.checked = v.id;
      this.label.innerText  = this.options.label || v.label;
      
      return this;
    }, // set_value()
    
    draw: function() {
      this.node.innerHTML = '<input type="checkbox" /><label></label>';
      
      this.checkbox = this.node.getElementsByTagName( "input" )[ 0 ];
      this.label    = this.node.getElementsByTagName( "label" )[ 0 ];
      
      return this;
    }, // draw
    
    add: function( objects ) {
      Ordered_Set.prototype.add.call( this, objects );
      
      var a  = this.get()
        , v  = this.value
        , al = a.length
        
        , disable = true
        , label   = "No Label"
      ;
      
      switch( al ) {
        case 1:
          v = a[ 0 ];
        break;
        
        case 2:
          disable = false;
          
          if( v === undefined ) v = this.options.default_value || ( a[ 0 ].id === false ? a[ 0 ] : a[ 1 ] );
        break;
      }
      
      this.checkbox.disabled = ! v || al === 1 ? true : false;
      this.label.innerText   = v ? v.label : "No Label";
      v && this.set_value( v );
      
      return this;
    } // add()
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Control' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // control.js
