/*  form.js
    
    ----
    
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
  var XS, uuid;
  
  if ( typeof require === 'function' ) {
    XS = require( 'excess/lib/xs.js' ).XS;
    
    uuid = require( 'uuid' ).uuid;
    
    require( 'excess/lib/code.js'    );
    require( 'excess/lib/pipelet.js' );
  } else {
    XS = exports.XS;
    
    uuid = exports.uuid;
  }
  
  var xs      = XS.xs
    , log     = XS.log
    , extend  = XS.extend
    , Code    = XS.Code
    , Pipelet = XS.Pipelet
    , Ordered = XS.Ordered
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs form.js, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Form()
  */
  XS.Compose( 'form',
    function( source, dom_node, model, fields, options ) {
      return source
        .form_display_errors( dom_node, model, fields, options )
        .model              (           model                  )
        .form_process       ( dom_node, model, fields, options )
        .form_validate      (           model, fields, options )
        .form_display_errors( dom_node, model, fields, options )
        .form_submit        ( dom_node,                options )
      ;
    }
  );
  
  /* -------------------------------------------------------------------------------------------
     Form_Display_Errors()
  */
  function Form_Display_Errors( dom_node, model, form_fields, options ) {
    Pipelet.call( this, options );
    
    this.form = dom_node.getElementsByTagName( 'form' )[ 0 ];
    
    return this;
  } // Form_Display_Errors()
  
  Pipelet.build( 'form_display_errors', Form_Display_Errors, {
    transform: function( values, options, caller ) {
      var form      = values[ 0 ]
        , form_node = this.form
      ;
      
      if( ! form ) return [];
      
      // clear error messages
      if( caller === "add" ) {
        for( var spans = form_node.getElementsByTagName( 'span' ), i = spans.length; i; ) spans[ --i ].innerText = '';
      }
      
      if( form.model === form_node[ 'model' ].value ) return values;
      
      var errors = form.errors
        , len    = errors.length
      ;
      
      for( var i  = len; i; ) {
        var error = errors[ --i ]
          , field_container = form_node[ error.field_name ].parentNode
          , span = field_container.getElementsByTagName( 'span' )[ 0 ]
        ;
        
        span.innerText = error.message;
      }
      
      return [];
    }
  } ); // Form_Display_Errors() instance methods
  
  /* -------------------------------------------------------------------------------------------
     Form_Process_Fields()
  */
  function Form_Process_Fields( form_process, form_fields, options ) {
    Ordered.call( this, options );
    
    this.form_process = form_process;
    this.form         = form_process.form;
    
    // if( form_fields instanceof Array ) this.add( form_fields );
    
    return this.add_source( this.fields = form_fields );
  } // Form()
  
  Ordered.subclass( Form_Process_Fields, {
    insert_: function( at, v ) {
      var div     = document.createElement( 'div' )
        , form    = this.form
        , classes = v.classes
        
        , container_classes = classes && classes.container
        , label_classes     = classes && classes.label
        , input_classes     = classes && classes.input
      ;
      
      container_classes && div.setAttribute( "class", container_classes );
      
      v.label && this.label( div, v.label, label_classes );
      
      switch( v.type ) {
        case 'text'     :
        case 'email'    :
        case 'phone'    : this.input_text( div, v, input_classes ); break;
        case 'hidden'   : this.hidden    ( div, v, input_classes ); break;
        case 'radio'    : this.radio     ( div, v, input_classes ); break;
        case 'checkbox' : this.checkbox  ( div, v, input_classes ); break;
        case 'drop_down': this.drop_down ( div, v, input_classes ); break;
        case 'text_area': this.text_area ( div, v, input_classes ); break;
        
        default: throw( 'Unsupported type: ' + v.type );
      }
      
      // append a span to display errors / validation messages
      if( v.type !== 'hidden' ) {
        var span = document.createElement( 'span' );
        
        span.style.display = 'block';
        
        div.appendChild( span );
      }
      
      form.insertBefore( div, form.childNodes[ at ] );
      
      return this;
    }, // insert_()
    
    remove_: function( from ) {
      var form = this.form;
      
      form.removeChild( form.childNodes[ from ] );
      
      return this;
    }, // remove_()
    
    update_: function( at, v ) {
      var previous = this.form.childNodes[ at ]
        , div      = document.createElement( 'div' )
        
        , u0       = v[ 0 ]
        , u1       = v[ 1 ]
        , classes  = u1.classes

        , container_classes = classes && classes.container
        , label_classes     = classes && classes.label
        , input_classes     = classes && classes.input
      ;
      
      container_classes && div.setAttribute( "class", container_classes );
      
      u1.label && this.label( div, u1.label, label_classes );
      
      switch( u1.type ) {
        case 'text'     :
        case 'email'    :
        case 'phone'    : this.input_text( div, u1, input_classes ); break;
        case 'hidden'   : this.hidden    ( div, u1, input_classes ); break;
        case 'radio'    : this.radio     ( div, u1, input_classes ); break;
        case 'checkbox' : this.checkbox  ( div, u1, input_classes ); break;
        case 'drop_down': this.drop_down ( div, u1, input_classes ); break;
        case 'text_area': this.text_area ( div, u1, input_classes ); break;
        
        default: throw( 'Unsupported type: ' + u1.type );
      }
      
      // append a span to display errors / validation messages
      if( u1.type !== 'hidden' ) div.appendChild( document.createElement( 'span' ) );
      
      form.replaceChild( div, previous );
      
      return this;
    }, // update_()
    
    event_handler: function() {
      var form_process = this.form_process
        , elements     = this.form.elements
        , len          = elements.length
        , object       = {}
      ;
      
      for( var i = -1; ++i < len; ) {
        var element = elements[ i ];
        
        switch( element.type ) {
          case 'checkbox' :
            if( !object[ element.name ] ) object[ element.name ] = [];
            if( element.checked ) object[ element.name ].push( element.value );
          break;
          
          case 'radio' :
            if( element.checked ) object[ element.name ] = element.value;
          break;
          
          default:
            object[ element.name ] = element.value;
        }
      }
      
      if( elements[ 'uuid' ].value === '' ) {
        elements[ 'uuid' ].value = object.uuid = uuid.v4();
        
        form_process.emit_add( [ object ] );
      } else {
        form_process.emit_update( [ [ this.form_value, object ] ] );
      }
      
      this.form_value = object;
    }, // event_handler()
    
    label: function( dom_node, value, css_classes ) {
      var label = document.createElement( 'label' );
      
      label.innerText = value;
      label.style.verticalAlign = "top"
      label.style.display = "block";
      
      css_classes && label.setAttribute( 'class', css_classes );
      
      dom_node.appendChild( label );
    }, // label()
    
    input_text: function( dom_node, object, css_classes ) {
      var input = document.createElement( 'input' ), that = this;
      
      input.type = "text";
      input.id   = object.id
      input.name = object.name;
      
      input.onkeyup = function() {
        that.event_handler.call( that );
      };
      
      css_classes && input.setAttribute( 'class', css_classes );
      
      dom_node.appendChild( input );
    }, // input_text()
    
    text_area: function( dom_node, object, css_classes ) {
      var text_area = document.createElement( 'textarea' ), that = this;
      
      text_area.id   = object.id;
      text_area.name = object.name;
      text_area.cols = object.cols;
      text_area.rows = object.rows;
      
      text_area.onkeyup = function() {
        that.event_handler.call( that );
      };
      
      css_classes && text_area.setAttribute( 'class', css_classes );
      
      dom_node.appendChild( text_area );
    }, // text_area()
    
    drop_down: function( dom_node, object, css_classes ) {
      var select = document.createElement( 'select' )
        , values = object.values
        , that   = this
      ;
      
      select.id   = object.id;
      select.name = object.name;
      
      select.onchange = function() {
        that.event_handler.call( that );
      };
      
      for( var i = values.length; i; ) {
        var option = document.createElement( 'option' )
          , value  = values[ --i ]
        ;
        
        option.innerText = value.label;
        option.value     = value.value;
        
        if( value.selected ) option.selected = true;
        
        select.add( option, select.options[ i ] );
      }
      
      css_classes && select.setAttribute( 'class', css_classes );
      
      dom_node.appendChild( select );
    }, // drop_down()
    
    radio: function( dom_node, object, css_classes ) {
      var container = document.createElement( 'div' )
        , values    = object.values
        , that      = this
      ;
      
      container.id = object.id;
      
      for( var i = -1, l = values.length; ++i < l; ) {
        var div   = document.createElement( 'div'   )
          , input = document.createElement( 'input' )
          , label = document.createElement( 'label' )
          , value = values[ i ]
        ;
        
        label.innerText = value.label;
        
        input.type  = "radio";
        input.name  = object.name;
        input.value = value.value;
        
        input.onclick = function() {
          that.event_handler.call( that );
        };
        
        if( value.selected ) input.checked = true;
        
        div.appendChild( input );
        div.appendChild( label );
        
        container.appendChild( div );
      }
      
      css_classes && div.setAttribute( 'class', css_classes );
      
      dom_node.appendChild( container );
    }, // radio()
    
    checkbox: function( dom_node, object, css_classes ) {
      var container = document.createElement( 'div' )
        , values    = object.values
        , that      = this
      ;
      
      container.id = object.id;
      
      for( var i = -1, l = values.length; ++i < l; ) {
        var div   = document.createElement( 'div'   )
          , input = document.createElement( 'input' )
          , label = document.createElement( 'label' )
          , value = values[ i ]
        ;
        
        label.innerText = value.label;
        
        input.type  = "checkbox";
        input.name  = object.name;
        input.value = value.value;
        
        input.onclick = function() {
          that.event_handler.call( that );
        };
        
        if( value.selected ) input.checked = true;
        
        div.appendChild( input );
        div.appendChild( label );
        
        container.appendChild( div );
      }
      
      css_classes && div.setAttribute( 'class', css_classes );
      
      dom_node.appendChild( container );
    }, // checkbox()
    
    hidden: function( dom_node, object, css_classes ) {
      var input = document.createElement( 'input' );
      
      input.type  = "hidden";
      input.id    = object.id
      input.name  = object.name;
      input.value = typeof object.value === 'object' ? "" : object.value;
      
      dom_node.appendChild( input );
    } // hidden()
  } ); // Form_Process_Fields() instance methods
  
  /* -------------------------------------------------------------------------------------------
     Form_Process()
  */
  function Form_Process( dom_node, model, form_fields, options ) {
    Pipelet.call( this, options );
    
    this.set_node( dom_node );
    this.draw();
    
    this.fields = new Form_Process_Fields( this, form_fields, options );
    
    return this;
  } // Form()
  
  Ordered.build( 'form_process', Form_Process, {
    set_node: function( node ) {
      if( XS.is_DOM( node ) ) {
        this.node = node;
      } else {
        throw( 'the node is not a DOM element' );
      }
      
      return this;
    }, // set_node()
    
    draw: function() {
      this.node.appendChild( this.form = document.createElement( 'form' ) );
      
      var button = document.createElement( 'input' );
      
      button.type     = 'submit';
      button.value    = 'Save';
      button.disabled = true;
      button.name     = 'form_submit';
      
      this.form.appendChild( button );
      
      return this;
    } // draw()
  } ); // Form_Process() instance methods
  
  /* -------------------------------------------------------------------------------------------
     Validate()
  */
  function Form_Validate( model, form_fields, options ) {
    Pipelet.call( this, options );
    
    this.fields = form_fields;
    
    return this;
  } // Form_Validate()
  
  Pipelet.build( 'form_validate', Form_Validate, {
    transform: function( values, options, caller ) {
      var that   = this
        , fields = this.fields
      ;
      
      fields instanceof Array ? validate( fields ) : fields.fetch_all( validate );
      
      return values;
      
      function validate( fields ) {
        var errors = that.validate( fields, values[ 0 ] );
        
        if( errors ) {
          values = [];
          
          if( caller === "add" ) that.emit_add( [ errors ] );
        }
        
      }
    }, // transform()
    
    // process and validate form values; return errors
    validate: function( fields, form ) {
      var errors = [], len = fields.length;
      
      for( var i = -1; ++i < len; ) {
        var field = fields[ i ]
          , name  = field.name
          , value = form[ name ]
          , r
        ;
        
        switch( field.type ) {
          case 'text'      : 
          case 'text_area' : r = validate_text     ( value, field ); break;
          case 'email'     : r = validate_email    ( value, field ); break;
          case 'phone'     : r = validate_phone    ( value, field ); break;
          case 'radio'     : r = validate_radio    ( value, field ); break;
          case 'drop_down' : r = validate_drop_down( value, field ); break;
          case 'checkbox'  : r = validate_checkbox ( value, field ); break;
          case 'hidden'    : continue;
        }
        
        if( ! r.valid ) errors.push( { field_name: name, message: r.message } );
      }
      
      if( errors.length ) return { form: form, model: form.model + '_errors', errors: errors };
    } // validate()
  } ); // Form_Validate() instance methods
  
  // text validation
  function validate_text( value, field ) {
    var result = { valid: true, message: 'Valide' };
    
    if( field.mandatory && value === '' ) {
      result = { valid: false, message: field.label + ' is mandatory' };
    }
    
    return result;
  } // validate_text()
  
  // email validation
  function validate_email( value, field ) {
    var result = { valid: true, message: 'Valide' }
      , regex  = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/
    ;
    
    if( field.mandatory ) {
      if( value === '' ) {
        result = { valid: false, message: 'Email is mandatory' };
      } else if( ! regex.test( value ) ) {
        result = { valid: false, message: 'Email is not valid' };
      }
    } else if( value !== '' && ! regex.test( value ) ) {
      result = { valid: false, message: 'Email is not valid' };
    }
    
    return result;
  } // validate_email()
  
  // phone validation
  function validate_phone( value, field ) {
    var result = { valid: true, message: 'Valide' }
      , regex  = /^\+?[0-9 \-\(\)]+$/
    ;
    
    if( field.mandatory ) {
      if( value === '' ) {
        result = { valid: false, message: 'Phone Number is mandatory' };
      } else if( ! regex.test( value ) ) {
        result = { valid: false, message: 'Phone Number is not valid' };
      }
    } else if( value !== '' && ! regex.test( value ) ) {
      result = { valid: false, message: 'Phone Number is not valid' };
    }
    
    return result;
  } // validate_phone()
  
  // radio validation
  function validate_radio( value, field ) {
    var result = { valid: true, message: '' };
    
    if( field.mandatory && ( ! value || value === '' ) ) {
      result = { valid: false, message: field.label + ' is mandatory' };
    }
    
    return result;
  } // validate_radio()
  
  // checkbox validation
  function validate_checkbox( value, field ) {
    var result = { valid: true, message: '' };
    
    if( field.mandatory && ! value.length ) {
      result = { valid: false, message: field.label + ' is mandatory' };
    }
    
    return result;
  } // validate_checkbox()
  
  // drop dwon validation
  function validate_drop_down( value, field ) {
    var result = { valid: true, message: '' };
    
    if( field.mandatory && ( ! value || value === '' ) ) {
      result = { valid: false, message: field.label + ' is mandatory' };
    }
    
    return result;
  } // validate_drop_down()
  
  /* -------------------------------------------------------------------------------------------
     Form_Submit()
  */
  function Form_Submit( dom_node, options ) {
    Pipelet.call( this, options );
    
    this.form = dom_node.getElementsByTagName( 'form' )[ 0 ];
    
    this.submit_button = this.form[ 'form_submit' ];
    
    return this;
  } // Form_Submit()
  
  Pipelet.build( 'form_submit', Form_Submit, {
    form_submit: function( form ) {
      var that = this;
      
      this.form.onsubmit = function() {
        that.emit_add( form );
        
        return false;
      };
      
      return this;
    }, // form_submit()
    
    add: function( added ) {
      de&&ug( "Form_Submit..add(), added: " + log.s( added ) );
      
      var len = added.length;
      
      this.submit_button.disabled = len === 0;
      
      if( ! len ) return this;
      
      this.form_submit( added );
      
      return this;
    }, // add()
    
    remove: function( removed ) {
      de&&ug( "Form_Submit..remove(), removed: " + log.s( removed ) );
      return this;
    }, // remove()
    
    update: function( updates ) {
      de&&ug( "Form_Submit..update(), updates: " + log.s( updates ) );
      return this;
    } // update()
  } ); // Form_Submit() instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  
  function to_value( v ) {
    return v === '' || isNaN( Number( v ) ) ? v : Number( v );
  }
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  
  eval( XS.export_code( 'XS', [ 'Form_Process', 'Form_Validate', 'Form_Submit', 'Form_Display_Errors' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // form.js
