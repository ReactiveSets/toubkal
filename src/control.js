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

( function( exports ) {
  var XS;

  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    require( './ordered_set.js' );
  } else {
    XS = exports.XS;
  }

  var log        = XS.log
    , subclass   = XS.subclass
    , extend     = XS.extend
    , Code       = XS.Code
    , Connection = XS.Connection
    , Set        = XS.Set
    , Ordered_Set= XS.Ordered_Set
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
    Ordered_Set.call( this, [], organizer, options );
    
    this.set_node( node );
    this.process_options( options );
    this.get_default_value();
    this.set_value( this.value );
    this.get_value();
    this.bind();
    
    return this;
  } // Control()
  
  subclass( Ordered_Set, Control );
  
  extend( Control.prototype, {
    set_node: function( node ) {
      if(
           typeof HTMLElement === "object" ?  node instanceof HTMLElement : node
        && typeof node        === "object" && node.nodeType === 1 && typeof node.nodeName === "string"
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
    
    get_default_value: function() {
      var options       = this.options
        , values        = this.get()
        , default_value = options.default_value
      ;
      
      this.value = default_value === undefined ? values[ 0 ] : default_value;
      
      return this;
    }, // get_default_value()
    
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
  Connection.prototype.checkbox = function( node, organizer, options ) {
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
    get_default_value: function() {
      Control.prototype.get_default_value.call( this );
      
      if( this.value === undefined ) this.value = this.get()[ 0 ] || { id: false };
      
      return this;
    }, // get_default_value()
    
    bind: function() {
      var that = this;
      
      this.node.onclick = function() {
        that.update();
      };
      
      return this;
    }, // bind
    
    get_value: function() {
      this.value = this.node.checked;
      
      return this;
    }, // get_value()
    
    set_value: function( v ) {
      Control.prototype.set_value.call( this, v );
      
      this.node.checked = v;
      
      return this;
    } // set_value()
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Control' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // control.js
