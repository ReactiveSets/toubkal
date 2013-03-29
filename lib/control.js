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

  var log      = XS.log
    , subclass = XS.subclass
    , extend   = XS.extend
    , Code     = XS.Code
    , Pipelet  = XS.Pipelet
    , Order    = XS.Order
    , Ordered  = XS.Ordered
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
  function Control( node, options ) {
    this.init( node, options );
    
    Ordered.call( this, this.options );
    
    return this;
  } // Control()
  
  Ordered.subclass( Control, {
    init: function( node, options ) {
      this
        .set_node( node )
        .process_options( options )
      ;
      
      return this;
      // return this.bind();
    }, // init()
    
    set_node: function( node ) {
      if( XS.is_DOM( node ) ) {
        this.node = node;
      } else {
        throw( "node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    set_name: function( name ) {
      var node    = this.node
        , option_name = this.options.name
        , node_name   = node.getAttribute( "name" )
        , node_id     = node.getAttribute( "id"   )
      ;
      
      if( node_id ) node_id += "_";
      
      this.name = option_name || node_name || node_id || name;
      
      return this;
    }, // set_name()
    
    process_options: function( options ) {
      this.options = options = extend( {}, options );
      
      return this;
    } // process_options
  } ); // Control()
  
  /* -------------------------------------------------------------------------------------------
     Single_Choice()
  */
  
  function Single_Choice( node, options ) {
    return Control.call( this, node, options );
  } // Single_Choice()
  
  Control.subclass( Single_Choice, {
    init: function( node, options ) {
      Control.prototype.init.call( this, node, options );
      
      if( typeof this.draw === "function" ) this.draw();
      if( typeof this.bind === "function" ) this.bind();
      
      return this;
    }, // init()
    
    fetch: function( receiver ) {
      var v = this.value;
      
      receiver( v ? [ v ] : v, true );
      
      return this;
    }, // fetch()
    
    add: function( added, options ) {
      de&&ug( "Single_Choice..add(), added: " + log.s( added ) );
      
      var previous = this.value;
      
      this.insert_at( added, options );
      
      var v = this.get_value();
      
      if ( previous !== v ) {
        if ( previous ) {
          // ToDo: provide test
          this.emit_update( [ [ previous, v ] ] );
        } else {
          this.emit_add( [ v ] );
        }
      }
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      de&&ug( "Single_Choice..remove(), removed: " + log.s( removed ) );
      
      var previous = this.value;
      
      this.remove_from( removed, options );
      
      var v = this.get_value();
      
      if ( previous !== v ) {
        v ? this.emit_update( [ [ previous, v ] ] ) : this.emit_remove( [ previous ] );
      }
      
      // ToDo: this.select_node();
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      de&&ug( "Single_Choice..update(), updates: " + log.s( updates ) );
      
      var previous = this.value;
      
      this.update_from_to( updates, options );
      
      var v = this.get_value();
      
      if ( previous !== v ) {
        if ( previous ) {
          if ( v ) {
            this.emit_update( [ [ previous, v ] ] );
          } else {
            // ToDo: provide test
            this.emit_remove( [ previous ] );
          }
        } else {
          // ToDo: provide test
          this.emit_add( [ v ] );
        }
      }
      
      return this;
    } // update()
  } ); // Single_Choice()
  
  /* -------------------------------------------------------------------------------------------
     Multiple_Choice()
  */
  function Multiple_Choice( node, options ) {
    return Control.call( this, node, options );
  } // Multiple_Choice()
  
  Control.subclass( Multiple_Choice, {
    fetch: function( receiver ) {
      receiver( this.values, true );
      
      return this;
    }, // fetch()
    
    add: function( added, options ) {
      de&&ug( "Multiple_Choice..add(), added: " + log.s( added ) );
      
      var previous = this.values;
      
      this.insert_at( added, options );
      
      var values = this.get_values();
      
      if( previous ) this.emit_remove( previous );
      
      this.emit_add( values );
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      de&&ug( "Multiple_Choice..remove(), removed: " + log.s( removed ) );
      
      var previous = this.values;
      
      this.remove_from( removed, options );
      
      var values = this.get_values();
      
      if( previous.length ) this.emit_remove( previous );
      if( values.length   ) this.emit_add   ( values   );
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      de&&ug( "Multiple_Choice..update(), updates: " + log.s( updates ) );
      
      var previous = this.values;
      
      this.update_from_to( updates, options );
      
      var values = this.get_values();
      
      if( previous.length ) this.emit_remove( previous );
      if( values.length   ) this.emit_add   ( values   );
      
      return this;
    } // update()
  } ); // Multiple_Choice()
  /* -------------------------------------------------------------------------------------------
     Control.Checkbox()
  */
  Control.Checkbox = function( node, options ) {
    de&&ug( "new Control.Checkbox()" );
    
    Single_Choice.call( this, node, options );
    
    return this;
  }; // Control.Checkbox()
  
  Single_Choice.build( 'checkbox', Control.Checkbox, {
    draw: function() {
      this.node.innerHTML = '<input type="checkbox" /><label></label>';
      
      this.checkbox = this.node.getElementsByTagName( "input" )[ 0 ];
      this.label    = this.node.getElementsByTagName( "label" )[ 0 ];
      
      return this;
    }, // draw
    
    bind: function() {
      var that = this;
      
      this.checkbox.onclick = function() {
        var previous = that.value
          , value    = that.get_value()
        ;
        
        if( previous !== value ) {
          previous ? that.emit_update( [ [ previous, value ] ] ) : that.emit_add( [ value ] );
        }
      };
      
      return this;
    }, // bind
    
    get_value: function() {
      var a = this.a
        , v = a[ this.index_of( { id: this.checkbox.checked } ) ]
        , l = a.length
      ;
      
      de&&ug( "Checkbox..get_value(), value: " + log.s( v ) );
      
      this.checkbox.disabled = a.length < 2;
      
      return this.value = v;
    }, // get_value()
    
    insert_: function( at, value ) {
      if( typeof value.id !== "boolean" ) throw( "Only boolean values are allowed" );
      
      var l = this.a.length;
      
      if( l === 2 ) return this;
      
      if( l === 0 || value.selected ) {
        this.checkbox.checked = value.id;
        this.label.innerHTML  = this.options.label || value.label;
      }
      
      Single_Choice.prototype.insert_.call( this, at, value );
      
      return this;
    }, // insert_()
    
    remove_: function( from, value ) {
      Single_Choice.prototype.remove_.call( this, from, value );
      
      var a = this.a;
      
      this.checkbox.checked = a.length ? a[ 0 ].id : false;
      this.label.innerHTML  = a.length ? this.options.label || a[ 0 ].label : "";
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      Single_Choice.prototype.update_.call( this, at, value );
      
      var u0 = value[ 0 ]
        , u1 = value[ 1 ]
        , v  = this.value
      ;
      
      if( v.id === u0.id ) {
        if( u0.id    !== u1.id    ) this.checkbox.checked = u1.id;
        if( u0.label !== u1.label ) this.label.innerHTML  = this.options.label || u1.label
      }
      
      return this;
    } // update_()
  } ); // Control.Checkbox()
  
  /* -------------------------------------------------------------------------------------------
     Control.Checkbox_Group()
  */
  Control.Checkbox_Group = function( node, options ) {
    de&&ug( "new Control.Checkbox_Group()" );
    
    Multiple_Choice.call( this, node, options );
    
    return this;
  }; // Control.Checkbox_Group()
  
  Multiple_Choice.build( 'checkbox_group', Control.Checkbox_Group, {
    get_values: function() {
      var inputs = this.node.getElementsByTagName( "input" )
        , a      = this.a
        , values = []
      ;
      
      for( var i = inputs.length; i; ) if( inputs[ --i ].checked ) values.unshift( a[ i ] );
      
      de&&ug( "Checkbox_Group..get_values(), values: " + log.s( values ) );
      
      return this.values = values;
    }, // get_value()
    
    insert_: function( at, value ) {
      var that  = this
        , node  = this.node
        , div   = document.createElement( "div"   )
        , label = document.createElement( "label" )
        , input = document.createElement( "input" )
      ;
      
      input.setAttribute( "type", "checkbox" );
      input.value     = value.id;
      label.innerHTML = value.label;
      
      input.onclick = click;
      
      div.appendChild( input );
      div.appendChild( label );
      
      if( value.selected ) input.checked = true;
      
      node.insertBefore( div, node.childNodes[ at ] || null );
      
      Multiple_Choice.prototype.insert_.call( this, at, value );
      
      return this;
      
      function click() {
        var v = that.a[ that.index_of( { id : to_value( this.value ) } ) ];
        
        this.checked ? that.emit_add( [ v ] ) : that.emit_remove( [ v ] );
      }
    }, // insert_()
    
    remove_: function( from, value ) {
      var node = this.node;
      
      node.removeChild( node.childNodes[ from ] );
      
      Multiple_Choice.prototype.remove_.call( this, from, value );
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      var div = this.node.childNodes[ at ]
        , u0  = value[ 0 ]
        , u1  = value[ 1 ]
      ;
      
      if( u0.id    !== u1.id    ) div.firstChild.value    = u1.id;
      if( u0.label !== u1.label ) div.lastChild.innerHTML = u1.label;
      
      div.firstChild.checked = u1.selected;
      
      Multiple_Choice.prototype.update_.call( this, at, value );
      
      return this
    } // update_()
  } ); // Control.Checkbox_Group()
  
  /* -------------------------------------------------------------------------------------------
     Control.Radio()
  */
  var Radio = Control.Radio = function( node, options ) {
    de&&ug( "new Control.Radio()" );
    
    Single_Choice.call( this, node, options );
    
    this.set_name( "radio_" + ( Radio.count++ ) );
    
    return this;
  }; // Control.Radio()
  
  Radio.count = 0;
  
  Single_Choice.build( 'radio', Radio, {
    get_value: function() {
      var inputs = this.node.getElementsByTagName( "input" )
        , a      = this.a
        , v
      ;
      
      for( var i = inputs.length; i; ) {
        if( ! inputs[ --i ].checked ) continue;
        
        v = a[ i ];
        
        break;
      }
      
      de&&ug( "Radio..get_value(), value: " + log.s( v ) );
      
      return this.value = v;
    }, // get_value(): 
    
    insert_: function( at, value ) {
      var that  = this
        , node  = this.node
        , div   = document.createElement( "div"   )
        , radio = document.createElement( "input" )
        , label = document.createElement( "label" )
      ;
      
      label.innerHTML = value.label || value.id;
      
      radio.setAttribute( "name", this.name );
      radio.setAttribute( "type", "radio"   );
      radio.value = value.id;
      
      radio.onclick = click;
      
      div .appendChild( radio );
      div .appendChild( label );
      
      if( value.selected ) radio.checked = true;
      
      node.insertBefore( div, node.childNodes[ at ] || null );
      
      Single_Choice.prototype.insert_.call( this, at, value )
      
      return this;
      
      function click() {
        var previous = that.value
          , value    = that.get_value()
        ;
        
        if( previous !== value ) {
          previous ? that.emit_update( [ [ previous, value ] ] ) : that.emit_add( [ value ] );
        }
      }
    }, // insert_()
    
    remove_: function( from , value ) {
      var u, node = this.node;
      
      node.removeChild( node.childNodes[ from ] );
      
      Single_Choice.prototype.remove_.call( this, from, value )
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      var div = this.node.childNodes[ at ]
        , u0  = value[ 0 ]
        , u1  = value[ 1 ]
      ;
      
      if( u0.id    !== u1.id    ) div.firstChild.value    = u1.id;
      if( u0.label !== u1.label ) div.lastChild.innerHTML = u1.label;
      
      if( u1.selected ) div.firstChild.checked = true;
      
      Single_Choice.prototype.update_.call( this, at, value )
      
      return this;
    } // update_()
  } ); // Control.Radio()
  
  /* -------------------------------------------------------------------------------------------
     Control.Drop_Down()
  */
  var Drop_Down = Control.Drop_Down = function( node, options ) {
    de&&ug( "new Control.Drop_Down()" );
    
    Single_Choice.call( this, node, options );
    
    this.set_name( "drop_down_" + ( Drop_Down.count++ ) );
    
    return this;
  }; // Control.Drop_Down()
  
  Drop_Down.count = 0;
  
  Single_Choice.build( 'drop_down', Drop_Down, {
    draw: function() {
      var select = document.createElement( "select" );
      
      select.name = this.name;
      
      this.node.appendChild( this.select = select );
      
      return this;
    }, // draw()
    
    bind: function() {
      var that = this;
      
      this.select.onchange = function() {
        var previous = that.value
          , value    = that.get_value()
        ;

        if( previous !== value ) {
          previous ? that.emit_update( [ [ previous, value ] ] ) : that.emit_add( [ value ] );
        }
      }
      
      return this;
    }, // bind()
    
    get_value : function() {
      var a = this.a
        , v = a[ this.select.selectedIndex ]
      ;
      
      if( ! this.value && ! v.selected ) v = a[ this.select.selectedIndex = 0 ];
      
      de&&ug( "Drop_Down..get_value(), value: " + log.s( v ) );
      
      return this.value = v;
    }, // get_value()
    
    insert_: function( at, value ) {
      var select = this.select
        , option = document.createElement( "option" )
      ;
      
      option.innerHTML = value.label || value.id;
      option.value     = value.id;
      
      if( value.selected ) option.selected = true;
      
      select.insertBefore( option, select.childNodes[ at ] || null );
      
      Single_Choice.prototype.insert_.call( this, at, value );
      
      return this;
    }, // insert_()
    
    remove_: function( from , value ) {
      this.select.remove( from );
      
      Single_Choice.prototype.remove_.call( this, from, value )
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      var option = this.select.options[ at ]
        , u0  = value[ 0 ]
        , u1  = value[ 1 ]
      ;
      
      if( u0.id    !== u1.id    ) option.value     = u1.id;
      if( u0.label !== u1.label ) option.innerHTML = u1.label;
      
      if( u1.selected ) option.selected = true;
      
      Single_Choice.prototype.update_.call( this, at, value )
      
      return this;
    } // update_()
  } ); // Control.Drop_Down()
  
  /* -------------------------------------------------------------------------------------------
  */
  
  function to_value( v ) {
    return isNaN( parseInt( v ) ) ? v : parseInt( v );
  }
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Control' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // control.js
