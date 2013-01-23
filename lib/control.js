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
    /*
    var control = new Control.Checkbox( node, organizer, options );
    
    this.connect( control );
    
    return control;
    */
    return new Control.Checkbox( node, organizer, extend( { key: this.key }, options ) ).set_source( this );
  };
  
  Control.Checkbox = function( node, organizer, options ) {
    de&&ug( "new Control.Checkbox()" );
    
    Control.call( this, node, organizer, options );
    
    return this;
  }; // Control.Checkbox()
  
  subclass( Control, Control.Checkbox );
  
  extend( Control.Checkbox.prototype, {
    bind: function() {
      de&&ug( "Checkbox::bind()" );
      
      var that = this;
      
      this.checkbox.onclick = function() {
        var previous = that.value, value;
        
        Control.prototype.update.call( that );
        
        value = that.value;
        
        that.update( [ [ previous, value ] ] );
      };
      
      return this;
    }, // bind
    
    get_value: function() {
      var a = this.source.get();
      
      this.value = a[ 0 ].id === this.checkbox.checked ? a[ 0 ] : a[ 1 ];
      
      de&&ug( "Checkbox::get_value(), value: " + log.s( this.value ) );
      
      return this;
    }, // get_value()
    
    set_value: function( v ) {
      Control.prototype.set_value.call( this, v );
      
      de&&ug( "Checkbox::set_value(), value: " + log.s( this.value ) );
      
      var s = this.source;
      
      this.checkbox.disabled = s && s.get().length < 2;
      this.checkbox.checked = v !== undefined ? v.id : false;
      this.label.innerText  = this.options.label || ( v !== undefined ? v.label : "No Label" );
      
      return this;
    }, // set_value()
    
    draw: function() {
      this.node.innerHTML = '<input type="checkbox" /><label></label>';
      
      this.checkbox = this.node.getElementsByTagName( "input" )[ 0 ];
      this.label    = this.node.getElementsByTagName( "label" )[ 0 ];
      
      return this;
    }, // draw
    
    add: function( objects ) {
      de&&ug( "Checkbox::add(), objects: " + log.s( objects ) );
      
      var s = ( this.source && this.source.get() ) || []
        , l = objects.length
        , v
      ;
      
      switch( l ) {
        case 1:
          v = objects[ 0 ];
        break;
        
        case 2:
          v = this.options.default_value || ( objects[ 0 ].id === false ? objects[ 0 ] : objects[ 1 ] );
        break;
      }
      
      if( v !== undefined ) Ordered_Set.prototype.add.call( this, [ v ] );
      
      if( this.value !== undefined ) v = this.value;
      
      this.set_value( v );
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      Ordered_Set.prototype.remove.call( this, objects );
      
      this.set_value( this.source.get()[ 0 ] );
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      de&&ug( "Checkbox::update(), objects: " + log.s( updates ) );
      
      Ordered_Set.prototype.update.call( this, updates );
      
      updates.length && this.set_value( updates[ 0 ][ 1 ] );
      
      return this;
    } // update()
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Control' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // control.js
