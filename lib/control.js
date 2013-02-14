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
    , Pipelet     = XS.Pipelet
    , Set         = XS.Set
    , Ordered_Set = XS.Ordered_Set
    , Order       = XS.Order
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
    
    // Ordered_Set.call( this, [], organizer, options );
    Pipelet.call( this, options );
    
    return this;
  } // Control()
  
  subclass( Pipelet, Control );
  
  extend( Control.prototype, {
    transform: function( values ) {
      var out   = []
        , l     = values.length
        , index = this.selected_index
      ;
      
      for( var i = -1; ++i < l; ) {
        i === index && out.push( values[ i ] );
      }
      
      return out;
    }, // transform()
    
    init: function( node, options ) {
      this
        .set_node( node )
        .process_options( options )
      ;
      
      return this;
      // return this.bind();
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
    } // process_options
  } ); // Control()
  
  /* -------------------------------------------------------------------------------------------
     Single_Choice()
  */
  
  function Single_Choice( node, options ) {
    return Control.call( this, node, options );
  } // Single_Choice()
  
  subclass( Control, Single_Choice );
  
  extend( Single_Choice.prototype, {
    init: function( node, options ) {
      Control.prototype.init.call( this, node, options );
      
      if( typeof this.draw === "function" ) this.draw();
      if( typeof this.bind === "function" ) this.bind();
      
      // return this.draw().bind();
      return this;
    } // init()
  } ); // Single_Choice()
  
  /* -------------------------------------------------------------------------------------------
     Multiple_Choice()
  */
  
  function Multiple_Choice( node, options ) {
    return Control.call( this, node, options );
  } // Multiple_Choice()
  
  subclass( Control, Multiple_Choice );
  
  extend( Multiple_Choice.prototype, {} ); // Multiple_Choice()
  
  /* -------------------------------------------------------------------------------------------
     Control.Checkbox()
  */
  Pipelet.prototype.checkbox = function( node, options ) {
    return new Control.Checkbox( node, extend( { key: this.key }, options ) ).set_source( this );
  };
  
  Control.Checkbox = function( node, options ) {
    de&&ug( "new Control.Checkbox()" );
    
    Single_Choice.call( this, node, options );
    
    return this;
  }; // Control.Checkbox()
  
  subclass( Single_Choice, Control.Checkbox );
  
  extend( Control.Checkbox.prototype, {
    draw: function() {
      this.node.innerHTML = '<input type="checkbox" /><label></label>';
      
      this.checkbox = this.node.getElementsByTagName( "input" )[ 0 ];
      this.label    = this.node.getElementsByTagName( "label" )[ 0 ];
      
      return this;
    }, // draw
    
    bind: function() {
      de&&ug( "Checkbox::bind()" );
      
      var that = this;
      
      this.checkbox.onclick = function() {
        var s = that.source.get();
        
        that.update( [ [ that.get()[ 0 ], s[ s[ 0 ].id === this.checked ? 0 : 1 ] ] ] );
      };
      
      return this;
    }, // bind
    
    add: function( objects ) {
      de&&ug( "Checkbox::add(), objects: " + log.s( objects ) );
      
      var s = ( this.source && this.source.get() ) || []
        , a = this.get() || []
        , o = this.options
        , l = objects.length
        , v = {}
      ;
      
      this.checkbox.disabled = s.length < 2;
      
      if( a.length !== 0 || l === 0 ) return this;
      
      switch( l ) {
        case 1:
          v = objects[ 0 ];
        break;

        case 2:
          v = o.default_value || objects[ objects[ 0 ].id === false ? 0 : 1 ];
        break;
      }
      
      if( typeof v.id !== "boolean" ) throw( "Only boolean values are allowed" );
      
      Ordered_Set.prototype.add.call( this, [ v ] );
      
      this.checkbox.checked = v.id;
      this.label.innerText  = o.label || v.label;
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      de&&ug( "Checkbox::remove(), objects: " + log.s( objects ) );
      
      var a       = this.get()
        , s       = this.source.get()
        , ol      = objects.length
        , options = this.options
        , checked = false
        , label   = ""
      ;
      
      if( ol === 0 ) return this;
      
      this.checkbox.disabled = true;
      
      for( var i = ol, removed = []; i; ) {
        var o = objects[ --i ];
        
        if( o.id !== a[ 0 ].id ) continue;
        
        removed.push( o );
      }
      
      Ordered_Set.prototype.remove.call( this, removed );
      
      if( s.length !== 0 ) {
        checked = s[ 0 ].id;
        label   = options.label || s[ 0 ].label;
        
        if( a.length === 0 ) Ordered_Set.prototype.add.call( this, s );
      }
      
      this.checkbox.checked = checked;
      this.label.innerText  = label;
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      de&&ug( "Checkbox::update(), objects: " + log.s( updates ) );
      
      var a        = this.get()
        , o        = this.options
        , ul       = updates.length
        , checkbox = this.checkbox
        , label    = this.label
      ;
      
      if( a.length === 0 || ul === 0 ) return this;
      
      for( var i = ul, updated = [], a = a[ 0 ]; i; ) {
        var u  = updates[ --i ]
          , u0 = u[ 0 ]
          , u1 = u[ 1 ]
        ;
        
        if( typeof u1.id !== "boolean" ) throw( "Only boolean values are allowed" );
        
        if( a.id !== u0.id || u0.label === u1.label ) continue;
        
        checkbox.checked = u1.id;
        label.innerText  = o.label || u1.label;
        
        updated.push( u );
      }
      
      Ordered_Set.prototype.update.call( this, updated );
      
      return this;
    } // update()
  } ); // Control.Checkbox()
  
  /* -------------------------------------------------------------------------------------------
     Control.Checkbox_Group()
  */
  Pipelet.prototype.checkbox_group = function( node, options ) {
    return new Control.Checkbox_Group( node, extend( { key: this.key }, options ) ).set_source( this );
  };
  
  Control.Checkbox_Group = function( node, options ) {
    de&&ug( "new Control.Checkbox_Group()" );
    
    Multiple_Choice.call( this, node, options );
    
    return this;
  }; // Control.Checkbox_Group()
  
  subclass( Multiple_Choice, Control.Checkbox_Group );
  
  extend( Control.Checkbox_Group.prototype, {
    add: function( objects ) {
      de&&ug( "Checkbox_Group::add(), objects: " + log.s( objects ) );
      
      var that  = this
        , node  = this.node
        , added = []
        , l     = objects.length
      ;
      
      for( var i = -1; ++i < l; ) {
        var o = objects[ i ]
          , div      = document.createElement( "div"   )
          , label    = document.createElement( "label" )
          , checkbox = document.createElement( "input" )
        ;
        
        label.innerText = o.label;
        
        checkbox.setAttribute( "type", "checkbox" );
        checkbox.setAttribute( "name", o.id       );
        
        if( o.checked ) {
          checkbox.checked = true;
          added.push( o );
        }
        
        checkbox.onclick = toggle;
        
        div.appendChild( checkbox );
        div.appendChild( label    );
        node.appendChild( div     );
      }
      
      Ordered_Set.prototype.add.call( this, added );
      
      return this;
      
      // toggle
      function toggle() {
        var s = that.source.get(), l = s.length;
        
        for( var i = l; i; ) {
          var o = s[ --i ];
          
          if( o.id == this.getAttribute( "name" ) ) {
            this.checked ? Ordered_Set.prototype.add.call( that, [ o ] ) : Ordered_Set.prototype.remove.call( that, [ o ] );
          }
        }
      } // toggle()
    }, // add()
    
    remove: function( objects ) {
      de&&ug( "Checkbox_Group::remove, objects: " + log.s( objects ) );
      
      var node       = this.node
        , checkboxes = node.getElementsByTagName( "input" )
        , len        = objects.length
        , cl         = checkboxes.length
      ;
      
      for( var i = cl; i; ) {
        for( var j = len, checkbox = checkboxes[ --i ]; j; ) {
          if( checkbox.getAttribute( "name" ) == objects[ --j ].id ) node.removeChild( checkbox.parentNode );
        }
      }
      
      Ordered_Set.prototype.remove.call( this, objects );
      
      return this;
    }, // remove
    
    update: function( updates ) {
      de&&ug( "Checkbox_Group::update, updates: " + log.s( updates ) );
      
      var node       = this.node
        , checkboxes = node.getElementsByTagName( "input" )
        , labels     = node.getElementsByTagName( "label" )
        , removed    = []
        , added      = []
        , len        = updates.length
        , cl         = checkboxes.length
      ;
      
      for( var i = cl; i; ) {
        for( var j = len, checkbox = checkboxes[ --i ]; j; ) {
          var u  = updates[ --j ]
            , u0 = u[ 0 ]
            , u1 = u[ 1 ]
          ;
          
          if( checkbox.getAttribute( "name" ) == u0.id ) {
            if( u0.checked !== u1.checked ) checkbox.checked      = u1.checked;
            if( u0.label   !== u1.label   ) labels[ i ].innerText = u1.label;
            
            ! u1.checked ? removed.push( u0 ) : added.push( u0 );
          }
        }
      }
      
      Ordered_Set.prototype.remove.call( this, removed );
      Ordered_Set.prototype.add   .call( this, added   );
      Ordered_Set.prototype.update.call( this, updates );
      
      return this;
    } // updates
  } ); // Control.Checkbox_Group()
  
  /* -------------------------------------------------------------------------------------------
     Control.Radio()
  */
  Pipelet.prototype.radio = function( node, options ) {
    return new Control.Radio( node, extend( { key: this.key }, options ) ).set_source( this );
  };
  
  Control.Radio = function( node, options ) {
    de&&ug( "new Control.Radio()" );
    
    Single_Choice.call( this, node, options );
    
    return this;
  }; // Control.Radio()
  
  subclass( Single_Choice, Control.Radio );
  
  extend( Control.Radio.prototype, {
    add: function( objects, options ) {
      de&&ug( "Radio::add(), objects: " + log.s( objects ) );
      
      var that      = this
        , node      = this.node
        , locations = options && options.locations
        , len       = ( locations && locations.length ) || objects.length
        , index     = this.selected_index
        , value     = this.value
      ;
      
      if( ! len ) return this;
      
      for( var i = len; i; ) {
        var o        = objects[ --i ]
          , div      = document.createElement( "div"   )
          , radio    = document.createElement( "input" )
          , label    = document.createElement( "label" )
          , location = ( locations && locations[ i ] ) || 0
        ;
        
        label.innerText = o.label;
        
        radio.setAttribute( "name", o.id    );
        radio.setAttribute( "type", "radio" );
        
        if( o.checked ) {
          index = location || i;
          radio.checked = true;
        }
        
        div .appendChild( radio );
        div .appendChild( label );
        node.insertBefore( div, node.childNodes[ location ] );
      }
      
      if( index === undefined ) index = 0;
      if( value === undefined ) value = objects[ index ];
      
      this.selected_index = index;
      
      this.value = value;
      
      Control.prototype.add.call( this, objects );
      
      return this;
      
      // toggle
      function toggle() {
        var s = that.source.get()
          , p = that.get()[ 0 ]
          , l = s.length
        ;
        
        // deselect previous value
        if( p !== undefined ) {
          for( var i = l, radios = that.node.getElementsByTagName( "input" ); i; ) {
            var radio = radios[ --i ];
            
            if( p.id != radio.getAttribute( "name" ) ) continue;
            
            radio.checked = false;
            
            break;
          }
        }
        
        for( var i = l; i; ) {
          var o = s[ --i ];
          
          if( o.id != this.getAttribute( "name" ) ) continue;
          
          if( p ) Ordered_Set.prototype.remove.call( that, [ p ] )
          
          Ordered_Set.prototype.add.call( that, [ o ] );
          
          break;
        }
      } // toggle()
    }, // add()
    
    remove: function( objects, options ) {
      de&&ug( "Radio::remove, objects: " + log.s( objects ) );
      
      var that      = this
        , node      = this.node
        , divs      = node.childNodes
        , locations = options && options.locations
        , len       = locations.length
        , index     = this.selected_index
      ;
      
      if( ! len ) return this;
      
      for( var i = -1; ++i < len; ) node.removeChild( divs[ locations[ i ] ] );
      
      Control.prototype.remove.call( this, objects );
      
      return this;
    }, // remove
    
    update: function( updates, options ) {
      de&&ug( "Radio::update, updates: " + log.s( updates ) );
      
      var node = this.node
        , moves  = options && options.move
        , len    = moves.length
        , index  = 0
        , value  = this.value
      ;
      
      if( ! len ) return this;
      
      for( var i = len, divs = node.getElementsByTagName( "div" ); i; ) {
        var move  = moves[ --i ]
          , from  = move.from
          , to    = move.to
          , u     = updates[ i ]
          , u0    = u[ 0 ]
          , u1    = u[ 1 ]
          , div   = divs[ from ]
          , radio = div.firstChild
          , label = div.lastChild
        ;
        
        if( u0.id    !== u1.id    ) radio.setAttribute( "name", u1.id );
        if( u0.label !== u1.label ) label.innerText = u1.label;
        
        if( u1.checked ) {
          index = to;
          value = u1;
        }
        
        if( from !== to ) {
          node.removeChild ( div );
          node.insertBefore( div, divs[ to ] );
          
          console.log( "here", div, from, to );
        }
      }
      
      this.selected_index = index;
      
      this.value = value;
      
      Control.prototype.update.call( this, updates );
      
      return this;
    } // updates
  } ); // Control.Radio()
  
  /* -------------------------------------------------------------------------------------------
     Control.Drop_Down()
  */
  Pipelet.prototype.drop_down = function( node, options ) {
    return new Control.Drop_Down( node, extend( { key: this.key }, options ) ).set_source( this );
  };
  
  Control.Drop_Down = function( node, options ) {
    de&&ug( "new Control.Drop_Down()" );
    
    Single_Choice.call( this, node, options );
    
    return this;
  }; // Control.Drop_Down()
  
  subclass( Single_Choice, Control.Drop_Down );
  
  extend( Control.Drop_Down.prototype, {
    draw: function() {
      this.node.appendChild( this.select = document.createElement( "select" ) );
      
      return this;
    }, // draw()
    
    bind: function() {
      var that = this;
      
      this.select.onchange = function() {
        that.selected_index = this.selectedIndex;
        
        that.fetch( function( values ) {
          if ( values.length === 0 ) return;
          
          var v = values[ 0 ];
          
          if ( that.value ) {
            that.emit_update( [ [ that.value, v ] ] );
          } else {
            that.emit_add( values );
          }
          
          that.value = v;
        } );
      };
      
      return this;
    }, // bind()
    
    add: function( objects, options ) {
      de&&ug( "Drop_Down::add(), objects: " + log.s( objects ) );
      
      var that   = this
        , select = this.select
      ;
      
      if( ! objects.length ) return this;
      
      Order.insert_at( objects, options, function( i, o ) {
        var option = document.createElement( "option" );
        
        option.innerText = o.label || o.id;
        option.value     = o.id;
        
        select.add( option, select.options[ i ] );
        
        if( o.selected ) {
          option.selected = true;
          that.value      = o;
        }
      } );
      
      this.selected_index = select.selectedIndex;
      
      Control.prototype.add.call( this, objects );
      
      return this;
    }, // add()
    
    remove: function( objects, options ) {
      de&&ug( "Drop_Down::remove, objects: " + log.s( objects ) );
      
      var that   = this
        , select = this.select
        , index  = this.selected_index
      ;
      
      if( ! objects.length ) return this;
      
      Order.remove_from( objects, options, function( i, o ) {
        select.remove( i );
      } );
      
      this.selected_index = select.selectedIndex;
      
      if( index !== this.selected_index ) {
        this.fetch( function( values ) {
          if ( values.length === 0 ) return;
          
          that.value = values[ 0 ];
        } );
      }
      
      Control.prototype.remove.call( this, objects );
      
      return this;
    }, // remove
    
    update: function( updates, options ) {
      de&&ug( "Drop_Down::update, updates: " + log.s( updates ) );
      
      var that   = this
        , select = this.select
        , index  = this.selected_index
      ;
      
      if( ! updates.length ) return this;
      
      Order.update_from_to( updates, options, function( i, o ) {
        var option = document.createElement( "option" );

        option.innerText = o.label || o.id;
        option.value     = o.id;

        select.add( option, select.options[ i ] );

        if( o.selected ) {
          option.selected = true;
          that.value      = o;
        }
      }, function( i, o ) {
        select.remove( i );
      } );
      
      this.selected_index = select.selectedIndex;
      
      Control.prototype.update.call( this, updates );
      
      return this;
    } // updates
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
