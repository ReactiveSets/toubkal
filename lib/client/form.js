/*  form.js
    
    Copyright (c) 2013-2016, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'form', [ [ '../core/order', '../core' ] ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , Pipelet      = RS.Pipelet
    , Greedy       = RS.Greedy
    , Alter        = RS.Alter
    , Ordered      = RS.Ordered
    , Flat_Map     = RS.Flat_Map
    
    , extend       = RS.extend
    , extend_2     = RS.extend._2
    , add_class    = RS.add_class
    , remove_class = RS.remove_class
    
    , value_equals = RS.value_equals
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'form' );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet form( dom_node, flow, fields, options )
      
      @short Process form from a fields @@dataflow
      
      @paraneters:
        - dom_node (HTMLElement): container for the form
        - flow (String): dataflow name for source and emitted form values
        - fields (Pipelet): dataflow of form fields
        - options (Object): form pipelet options
      
      @description:
        This a @@stateful, @@greedy, @@synchronous pipelet.
      
      @todo:
        ToDo: allow fields conditional on of form values
        ToDo: get errors from global errors dataflow
        ToDo: allow error messages to be provided externally, enabing internationalization
        ToDo: insure proper disconnection of all dependent control pipelets when removed
        ToDo: refactor to use $to_dom()
  */
  rs.Compose( 'form',
    function( source, dom_node, flow, fields, options ) {
      var input = rs
        .form_display_errors( dom_node, flow, fields, options )
      ;
      
      var output = input
        .flow               (           flow                  )
        .form_process       ( dom_node, flow, fields, options )
        .validate           (                 fields, options )
        //.trace              ( 'form validate' )
        .form_display_errors( dom_node, flow, fields, options )
        .optimize()
        .form_submit        ( dom_node,               options )
        //.trace              (           'Form Submit'         )
      ;
      
      return source.encapsulate( input, output );
    }
  ); // form()
  
  /* -------------------------------------------------------------------------------------------
     form_display_errors( dom_node, flow, form_fields, options )
  */
  function Form_Display_Errors( dom_node, flow, form_fields, options ) {
    var that = this;
    
    Pipelet.call( that, options );
    
    that._$node = dom_node;
    
    that._output._transform = that.__transform.bind( that );
  } // Form_Display_Errors()
  
  Pipelet.Build( 'form_display_errors', Form_Display_Errors, {
    __transform: function( values, options, caller ) {
      var form        = values[ 0 ]
        , $form_node  = this._$node.querySelector( 'form' )
        , style       = this._options.style
        , error_style, success_style
      ;
      
      if( ! form ) return [];
      
      if( style ) {
        error_style   = style.error;
        success_style = style.success;
      }
      
      // Clear all error messages
      if( caller === 'add' ) {
        for( var $spans = $form_node.querySelectorAll( 'span' ), i = $spans.length; i; ) {
          var $span      = $spans[ --i ]
            , $container = $span.parentNode
          ;
          
          $span.innerHTML = '';
          
          if ( success_style )    add_class( $container, success_style );
          if (  error_style  ) remove_class( $container, error_style   );
        }
      }
      
      if ( form.flow == 'error' && form.errors ) {
        // display errors
        form.errors.forEach( function( error ) {
          var $form_field      = $form_node[ error.field.id ]
            , $field_container = $form_field.parentNode
            , $span            = $field_container.querySelector( 'span' )
          ;
          
          // error.errors is now an Array of error code Strings
          // ToDo: process error codes to get human readable error messages in a target language
          $span.innerHTML = error.errors.join();
          
          if( success_style ) remove_class( $field_container, success_style );
          if(  error_style  )    add_class( $field_container, error_style   );
        } );
        
        values = [];
      }
      
      return values;
    } // __transform()
  } ); // form_display_errors() instance methods
  
  /* -------------------------------------------------------------------------------------------
     values_to_fields( fields )
     
     A synchronous stateless greedy pipelet transforming an input value into many form fields.
     
     Parameters:
     - fields (Array of Objects) : to merge with input values:
       - id (String): name of source attribute which value is output in "value" attribute
         unless "value" attribute is already defined (see bellow).
       - value: forced output value, if undefined use source value which attribute name is
         defined by "id" above.
     
     Example:
     
     rs.set( [ { id: 1, full_name: 'John Muller', address: 'somewhere in the universe' } ] )
       
       .values_to_fields( [
         { id: 'id'       , type: 'hidden'                                         },
         { id: 'full_name', type: 'text'     , label: 'Full Name', mandatory: true },
         { id: 'address'  , type: 'text_area', label: 'Address'                    }
       ] )
     ;
     
     -->
     
     [
       { id: 'id'       , type: 'hidden'   , value: 1 },
       { id: 'full_name', type: 'text'     , label: 'Full Name', value: 'John Muller', mandatory: true }
       { id: 'address'  , type: 'text_area', label: 'Address'  , value: 'somewhere in the universe' }
     ]
     
     ToDo: values_to_fields(): add tests
  */
  function Values_To_Fields( fields, options ) {
    // ToDo: make it lazy by providing a query_transform() option
    Flat_Map.call( this, value_to_fields, options );
    
    function value_to_fields( value ) {
      var out = [];
      
      fields.forEach( merge );
      
      return out;
      
      function merge( field ) {
        var id = field.id
          , o  = extend_2( {}, field )
        ;
        
        if ( id ) {
          if ( ! o.value )
            o.value = value[ id ]
          ;
          
          out.push( o );
        }
      } // merge()
    } // value_to_fields()
  } // Values_To_Fields()
  
  Flat_Map.Build( 'values_to_fields', Values_To_Fields );
  
  /* -------------------------------------------------------------------------------------------
     form_process_fields( form_process, form_fields, options )
     
     ToDo: placeholder
  */
  function Form_Process_Fields( form_process, form_fields, options ) {
    Ordered.call( this, options );
    
    this._form_process = form_process;
    this._$form        = form_process._$form;
    this._fields       = form_fields;
    
    this._input.add_source( form_fields._output || form_fields ); // this fetches the fields
  } // Form_Process_Fields()
  
  Ordered.subclass( 'Form_Process_Fields', Form_Process_Fields, {
    insert_: function( at, value ) {
      var $field_container = document.createElement( 'div' )
        , $form            = this._$form
      ;
      
      $field_container.id = value.id;
      
      this._draw_form_field( $field_container, value );
      
      $form.insertBefore( $field_container, $form.childNodes[ at ] );
      
      Ordered.prototype.insert_.call( this, at, value );
    }, // insert_()
    
    remove_: function( from ) {
      var $form = this._$form;
      
      $form.removeChild( $form.childNodes[ from ] );
      
      Ordered.prototype.remove_.call( this, from );
    }, // remove_()
    
    update_: function( at, v ) {
      var $form            = this._$form
        , $previous_field  = $form.childNodes[ at ]
        , $field_container = document.createElement( 'div' )
      ;
      
      $field_container.id = v.id;
      
      this._draw_form_field( $field_container, v[ 1 ] );
      
      $form.replaceChild( $field_container, $previous_field );
      
      Ordered.prototype.update_.call( this, at, v );
    }, // update_()
    
    // draw form field
    _draw_form_field: function( container, field ) {
      var field_label = field.label
        , field_value = field.value
        , field_name  = field.id
        , field_type  = field.type
        , style       = field.style
        
        , container_style, label_style, field_style, $field_node, control
      ;
      
      if( style ) {
        container_style = style.container;
        label_style     = style.label;
        field_style     = style.field;
      }
      
      container_style && add_class( container, container_style );
      
      // draw field
      switch( field_type ) {
        default: throw( 'Unsupported type: ' + field_type );
        
        // ToDo: field_value._remove_destination() when form_process_fields() is removed
        // We could re-implement this with dispatch(), which might be easier to cleanup
        case 'radio'     : control = field_value.radio         ( container, { control_name: field_name } ); break;
        case 'checkbox'  : control = field_value.checkbox_group( container, { control_name: field_name } ); break;
        case 'drop_down' : control = field_value.drop_down     ( container, { control_name: field_name } ); break;
        
        case 'text_area':
          $field_node = document.createElement( 'textarea' );
          
          $field_node.innerHTML = field_value || '';
          
          field.cols && ( $field_node.cols = field.cols );
          field.rows && ( $field_node.rows = field.rows );
        break;
        
        case 'text' :
        case 'email':
        case 'phone':
        case 'file' :
          $field_node = document.createElement( 'input' );
          
          $field_node.type = field_type;
          
          $field_node.value = field_value || '';
        break;
        
        case 'hidden':
          $field_node = document.createElement( 'input' );
          
          $field_node.type  = 'hidden';
          $field_node.value = ! field_value || typeof field_value === 'object' ? '' : field_value;
        break;
      }
      
      if( control ) {
        var $control_node = control._$node;
        
        field_type === 'drop_down'
          ? this._add_events_handler( $control_node.querySelector   ( 'select' ), [ 'change' ] )
          : this._add_events_handler( $control_node.querySelectorAll( 'input'  ), [ 'click'  ] )
        ;
      }
      
      if( $field_node ) {
        $field_node.name = field_name;
        
        field_style && add_class( $field_node, field_style );
        
        this._add_events_handler( [ $field_node ], [ 'change', 'keyup' ] );
        
        container.appendChild( $field_node );
      }
      
      // draw field label
      if( field_label ) {
        var $label = document.createElement( 'label' );
        
        $label.innerHTML = field_label;
        
        label_style && add_class( $label, label_style );
        
        container.insertBefore( $label, container.childNodes[ 0 ] );
      }
      
      // append a span to display errors / validation messages
      if( field_type !== 'hidden' ) {
        var $span     = document.createElement( 'span' )
          , options   = this._options
          , help_text = options && options.style && options.style.help_text || ''
        ;
        
        add_class( $span, help_text );
        
        $span.style.display  = 'block';
        $span.style.fontSize = '0.9em';
        
        container.appendChild( $span );
      }
    }, // _draw_form_field()
    
    _add_events_handler: function( dom_nodes, events ) {
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
      
      function handler() {
        that._event_handler.call( that );
      }
    }, // _add_events_handler()
    
    _event_handler: function() {
      var form_process = this._form_process
        , fields       = RS.is_array( this._fields ) ? this._fields : this.a
        , previous     = form_process._form_value
        , $elements    = this._$form.elements
        , len          = $elements.length
        , form         = {}
      ;
      
      for( var i = -1; ++i < len; ) {
        var $element    = $elements[ i ]
          , field       = fields[ i ]
          , field_name  = $element.name
          , value       = $element.value
        ;
        
        switch( $element.type ) {
          case 'checkbox':
            if( ! form[ field_name ] ) form[ field_name ] = [];
            if(   $element.checked   ) form[ field_name ].push( value );
          break;
          
          case 'radio':
            if( $element.checked ) form[ field_name ] = value;
          break;
          
          case 'hidden':
            if( value === '' && typeof field.value === 'object' && field.value && field.value.type === 'UUID' ) {
              $element.value = form[ field_name ] = RS.uuid.v4();
              
              break;
            }
          
          default:
            if( field_name !== 'form_submit' ) form[ field_name ] = value || '';
        } // switch()
      } // for all form elements
      
      form_process._form_value ? form_process.__emit_update( [ [ previous, form ] ] ) : form_process.__emit_add( [ form ] );
      
      form_process._form_value = form;
    } // _event_handler()
  } ); // form_process_fields() instance methods
  
  /* -------------------------------------------------------------------------------------------
     form_process( dom_node, flow, form_fields, options )
  */
  
  function Form_Process( dom_node, flow, form_fields, options ) {
    var that = this;
    
    options = extend_2( { display_button: true }, options );
    
    Alter.call( that, transform, options )
    
    that._set_node( dom_node );
    
    that._fields = new Form_Process_Fields( that, form_fields, options );
    
    that._form_value = null;
    
    function transform( value, operation ) {
      that._form_value = operation == 'remove' ? null : value;
      
      if ( operation == 'add' ) value.flow += '_origin';
    } // transform()
  } // Form_Process()
  
  Alter.Build( 'form_process', Form_Process, {
    _set_node: function( dom_node ) {
      if( ! RS.is_DOM( dom_node ) )
        this._emergency( '_set_node()', 'node is not a DOM element' )
      ;
      
      var $form   = document.createElement( 'form'  )
        , $div    = document.createElement( 'div'   )
        , options = this._options
        , action  = options.action
        , style   = options.style
      ;
      
      $form.method = 'post';
      
      if( action ) {
        $form.action  = action;
        
        $form.enctype = 'multipart/form-data';
      }
      
      style && style.form && add_class( $form, style.form );
      
      if( options.display_button ) {
        var $button = document.createElement( 'input' );
        
        $button.type     = 'submit';
        $button.value    = options.submit_label || 'OK';
        $button.disabled = true;
        $button.name     = 'form_submit';
        
        $div .appendChild( $button );
        
        style && style.submit_button && add_class( $button, style.submit_button );
      }
      
      $form.appendChild( $div );
      
      dom_node.appendChild( this._$form = $form );
      
      this._$node = dom_node;
    } // _set_node()
  } ); // form_process() instance methods
  
  /* -------------------------------------------------------------------------------------------
     form_submit( dom_node, options )
  */
  function Form_Submit( dom_node, options ) {
    var that = this
      , prevent_submit = ! options.action
      , $form          = that._$form          = dom_node.querySelector( 'form' )
      , $submit_button = that._$submit_button = $form.form_submit
    ;
    
    Greedy.call( that, [], options );
    
    that._form_value    = null;
    that._source_origin = null;
    
    $form.onsubmit = function() {
      if( prevent_submit ) {
        var previous = that._form_value
          , value    = extend( {}, that._source_origin )
          , flow     = value.flow
          , origin   = flow.indexOf( '_origin' ) // index of _origin in the string
        ;
        
        value.flow = that._remove_origin( flow  );
        
        if( ! previous) {
          that.__emit_add( [ value ] );
        } else if( !value_equals( previous, value ) ) {
          that.__emit_update( [ [ previous, value ] ] );
        }
        
        that._form_value = value;
        
        $submit_button && that._set_submit_button_state();
        
        return false;
      }
    };
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    function fetch_unfiltered( receiver ) {
      var form_value = that._form_value;
      
      receiver( form_value ? [ form_value ]: [], true );
    } // fetch_unfiltered()
  } // Form_Submit()
  
  Greedy.Build( 'form_submit', Form_Submit, {
    _set_source_origin: function( value ) {
      var that   = this
        , flow   = value.flow
        , origin = flow.indexOf( '_origin' ) // index of _origin in the string
        , v      = extend( {}, value ) // 'flow_origin' -> 'flow'
      ;
      
      v.flow = that._remove_origin( flow );
      
      if( flow.indexOf( '_origin' ) !== -1 ) that._form_value = v;
      
      that._source_origin = value;
      
      that._set_submit_button_state();
    }, // _set_form_value()
    
    _set_submit_button_state: function() {
      var that     = this
        , previous = that._form_value
        , value    = extend( {}, that._source_origin )
        , $button  = that._$submit_button
      ;
      
      value.flow = that._remove_origin( value.flow );
      
      // ToDo: also need to disable button when valid form becomes invalid
      if( $button ) $button.disabled = value_equals( previous, value );
    }, // _set_submit_button_state()
    
    _remove_origin: function( s ) {
      var i = s.indexOf( '_origin' );
      
      return i !== -1 ? s.slice( 0, i) : s;
    }, // _remove_origin()
    
    _add: function( added ) {
      var len            = added.length
        , $submit_button = this._$submit_button
      ;
      
      len && this._set_source_origin( added[ 0 ] );
    }, // _add()
    
    _remove: function() {
    }, // _remove()
    
    _update: function( updates ) {
      var len            = updates.length
        , $submit_button = this._$submit_button
      ;
      
      len && this._set_source_origin( updates[ 0 ][ 1 ] );
    } // _update()
  } ); // form_submit() instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Values_To_Fields'   : Values_To_Fields,
    'Form_Process'       : Form_Process,
    'Form_Submit'        : Form_Submit,
    'Form_Display_Errors': Form_Display_Errors
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // form.js
