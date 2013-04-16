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
    XS = require( './xs.js' ).XS;
    
    uuid = require( 'node-uuid' ).uuid;
    
    require( './code.js'    );
    require( './pipelet.js' );
    require( './order.js'   );
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
        .trace              (           'Form Submit'          )
      ;
    }
  );
  
  /* -------------------------------------------------------------------------------------------
     Form_Display_Errors()
  */
  function Form_Display_Errors( dom_node, model, form_fields, options ) {
    Pipelet.call( this, options );
    
    // ToDo: use dom_node
    this.form = dom_node.getElementsByTagName( 'form' )[ 0 ];
    
    return this;
  } // Form_Display_Errors()
  
  Pipelet.build( 'form_display_errors', Form_Display_Errors, {
    transform: function( values, options, caller ) {
      var form        = values[ 0 ]
        , form_node   = this.form
        , style       = this.options.style
        , error_style, success_style
      ;
      
      if( ! form ) return [];
      
      if( style ) {
        error_style   = style.error;
        success_style = style.success;
      }
      
      // clear error messages
      if( caller === 'add' ) {
        for( var spans = form_node.getElementsByTagName( 'span' ), i = spans.length; i; ) {
          var span      = spans[ --i ]
            , container = span.parentNode
          ;
          
          span.innerHTML = '';
          
          if( success_style ) XS.add_class( container, success_style );
          
          if(  error_style  ) {
            XS.remove_class( container, error_style   );
          } else {
            span.style.color = '';
          }
          
        }
      }
      
      if( form.model === form_node[ 'model' ].value ) return values;
      
      var errors = form.errors
        , len    = errors.length
      ;
      
      for( var i  = len; i; ) {
        var error = errors[ --i ]
          , form_field      = form_node[ error.field_name ]
          , field_container = form_field.parentNode
          , span            = field_container.getElementsByTagName( 'span' )[ 0 ]
        ;
        
        span.innerHTML = error.message;
        
        if( success_style ) XS.remove_class( field_container, success_style );
        
        if(  error_style  ) {
          XS.add_class( field_container, error_style   );
        } else {
          span.style.color = '#ff0000';
        }
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
    
    return this.add_source( this.fields = form_fields ); // this fetches the fields
  } // Form()
  
  Ordered.subclass( Form_Process_Fields, {
    insert_: function( at, value ) {
      var field_container = document.createElement( 'div' ), form = this.form;
      
      this.draw_form_field( field_container, value );
      
      form.insertBefore( field_container, form.childNodes[ at ] );
      
      return this;
    }, // insert_()
    
    remove_: function( from ) {
      var form = this.form;
      
      form.removeChild( form.childNodes[ from ] );
      
      return this;
    }, // remove_()
    
    update_: function( at, v ) {
      var previous_field  = this.form.childNodes[ at ]
        , field_container = document.createElement( 'div' )
      ;
      
      this.draw_form_field( field_container, v[ 1 ] );
      
      this.form.replaceChild( field_container, previous_field );
      
      return this;
    }, // update_()
    
    // draw form field
    draw_form_field: function( container, field ) {
      var field_label = field.label
        , field_value = field.value
        , field_name  = field.id
        , field_type  = field.type
        , style       = field.style
        
        , container_style, label_style, field_style, field_node, control
      ;
      
      if( style ) {
        container_style = style.container;
        label_style     = style.label;
        field_style     = style.field;
      }
      
      container_style && XS.add_class( container, container_style );
      
      // draw field
      switch( field_type ) {
        default: throw( 'Unsupported type: ' + field_type );
        
        case 'radio'     : control = field_value.radio         ( container, { name: field_name } ); break;
        case 'checkbox'  : control = field_value.checkbox_group( container, { name: field_name } ); break;
        case 'drop_down' : control = field_value.drop_down     ( container, { name: field_name } ); break;
        
        case 'text_area':
          field_node = document.createElement( 'textarea' );
          
          field.cols && ( field_node.cols = field.cols );
          field.rows && ( field_node.rows = field.rows );
        break;
        
        case 'text' :
        case 'email':
        case 'phone':
          field_node = document.createElement( 'input' );
          
          field_node.type = 'text';
        break;
        
        case 'hidden':
          field_node = document.createElement( 'input' );
          
          field_node.type  = 'hidden';
          field_node.value = typeof field_value === 'object' ? '' : field_value;
        break;
      }
      
      if( control ) {
        if( field_type === 'drop_down' ) {
          this.add_events_handler( control.node.getElementsByTagName( 'select' ), [ 'change' ] );
        } else {
          this.add_events_handler( control.node.getElementsByTagName( 'input' ), [ 'click' ] );
        }
      }
      
      if( field_node ) {
        field_node.name = field_name;
        
        field_style && XS.add_class( field_node, field_style );
        
        this.add_events_handler( [ field_node ], [ 'change', 'keyup' ] );
        
        container.appendChild( field_node );
      }
      
      // draw field label
      if( field_label ) {
        var label = document.createElement( 'label' );
        
        label.innerHTML           = field_label;
        label.style.verticalAlign = 'top'
        label.style.display       = 'block';
        
        label_style && XS.add_class( label, label_style );
        
        container.insertBefore( label, container.childNodes[ 0 ] );
      }
      
      // append a span to display errors / validation messages
      if( field_type !== 'hidden' ) {
        var span = document.createElement( 'span' );
        
        span.style.display  = 'block';
        span.style.fontSize = '0.9em';
        
        container.appendChild( span );
      }
      
      return this;
    }, // draw_form_field()
    
    add_events_handler: function( dom_nodes, events ) {
      var that = this;
      
      for( var i = events.length; i; ) {
        for( var j = dom_nodes.length, event = events[ --i ]; j; ) {
          var dom_node = dom_nodes[ --j ];
          
          if( dom_node.addEventListener ) {
            dom_node.addEventListener( event, handler, false );
          } else if( dom_node.attachEvent ) {
            dom_node.attachEvent ('on' + event, handler );
          }
        }
      }
      
      return this;
      
      function handler() {
        that.event_handler.call( that );
      }
    }, // add_events_handler()
    
    event_handler: function() {
      var form_process = this.form_process
        , fields       = this.fields
        , previous     = this.form_value
        , elements     = this.form.elements
        , len          = elements.length
        , form         = {}
      ;
      
      if( ! ( fields instanceof Array ) ) fields = fields.a;
      
      for( var i = -1; ++i < len; ) {
        var element     = elements[ i ]
          , field       = fields[ i ]
          , field_name  = element.name
          , value       = element.value
        ;
        
        switch( element.type ) {
          case 'checkbox':
            if( ! form[ field_name ] ) form[ field_name ] = [];
            if(   element.checked    ) form[ field_name ].push( value );
          break;
          
          case 'radio':
            if( element.checked ) form[ field_name ] = value;
          break;
          
          case 'hidden':
            if( value === '' && typeof field.value === 'object' && field.value && field.value.type === 'UUID' ) {
              element.value = form[ field_name ] = uuid.v4();
              
              break;
            }
          
          default:
            if( field_name !== 'form_submit' ) form[ field_name ] = value;
        } // switch()
      } // for all form elements
      
      previous ? form_process.emit_update( [ [ previous, form ] ] ) : form_process.emit_add( [ form ] );
      
      this.form_value = form;
    } // event_handler()
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
      var form    = document.createElement( 'form'  )
        , div     = document.createElement( 'div'   )
        , button  = document.createElement( 'input' )
        , options = this.options
        , style   = options.style
      ;
      
      form.method = 'post';
      
      button.type     = 'submit';
      button.value    = options.submit_label || 'OK';
      button.disabled = true;
      button.name     = 'form_submit';
      
      if( style && style.submit_button ) XS.add_class( button, style.submit_button );
      
      div.appendChild( button );
      
      form.appendChild( div );
      
      this.node.appendChild( this.form = form );
      
      return this;
    } // draw()
  } ); // Form_Process() instance methods
  
  /* -------------------------------------------------------------------------------------------
     Validate()
  */
  function Form_Validate( model, form_fields, options ) {
    Pipelet.call( this, options );
    
    var that = this;
    
    if( form_fields instanceof Array ) {
      this.fields = form_fields;
    } else {
      form_fields
        .on_change( function( operation, values, options ) {
          if( options && options.more ) return;
          
          that.fetch_all( fetch_fields );
        } )
        
        .fetch_all( fetch_fields )
      ;
    }
    
    return this;
    
    // fetch fields
    function fetch_fields( values ) {
      that.fields = values;
    } // fetch_fields()
    
  } // Form_Validate()
  
  Pipelet.build( 'form_validate', Form_Validate, {
    transform: function( values, options, caller ) {
      var that   = this
        , fields = this.fields
        , errors = this.validate( fields, values[ 0 ] )
      ;
      
      if( errors ) {
        values = [];
        
        if( caller === 'add' ) this.emit_add( [ errors ] );
      }
      
      return values;
    }, // transform()
    
    // process and validate form values; return errors
    validate: function( fields, form ) {
      var errors = [], len = fields.length;
      
      for( var i = -1; ++i < len; ) {
        var field    = fields[ i ]
          , name     = field.id
          , value    = form[ name ]
          , validate = field.validate
          , r
        ;
        
        if( typeof validate === 'function' ) {
          r = validate( value, field );
        } else {
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
        }
        
        if( ! r.valid ) errors.push( { field_name: name, message: r.message } );
      }
      
      if( errors.length ) return { form: form, model: form.model + '_errors', errors: errors };
    } // validate()
  } ); // Form_Validate() instance methods
  
  // text validation
  function validate_text( value, field ) {
    var result = { valid: true, message: 'Valide' };
    
    if( field.mandatory && ( value === undefined || value === null || value === '' ) ) {
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
      if( ( value === undefined || value === null || value === '' ) ) {
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
      if( ( value === undefined || value === null || value === '' ) ) {
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
    
    if( field.mandatory && ( value === undefined || value === null || value === '' ) ) {
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
    
    if( field.mandatory && ( value === undefined || value === null || value === '' ) ) {
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
      var that     = this
        , previous = this.form_value
      ;
      
      this.form.onsubmit = function() {
        previous ? that.emit_update( [ [ previous[ 0 ], form[ 0 ] ] ] ) : that.emit_add( form );
        
        that.submit_button.disabled = true;
        
        that.form_value = form;
        
        return false;
      };
      
      return this;
    }, // form_submit()
    
    add: function( added ) {
      var len = added.length;
      
      this.submit_button.disabled = len === 0;
      
      if( ! len ) return this;
      
      this.form_submit( added );
      
      return this;
    }, // add()
    
    remove: function( removed ) {
      return this;
    }, // remove()
    
    update: function( updates ) {
      var len = updates.length;
      
      this.submit_button.disabled = len === 0;
      
      if( ! len ) return this;
      
      this.form_submit( [ updates[ 0 ][ 1 ] ] );
      
      return this;
    } // update()
  } ); // Form_Submit() instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  
  eval( XS.export_code( 'XS', [ 'Form_Process', 'Form_Validate', 'Form_Submit', 'Form_Display_Errors' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // form.js
