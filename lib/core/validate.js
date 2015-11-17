/*  validate.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
( 'validate', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , Pipelet      = RS.Pipelet
    , toString     = Object.prototype.toString
    , de           = false
    , ug           = RS.log.bind( null, 'validate' )
  ;
  
  /* -------------------------------------------------------------------------------------------
      validate( form_fields, options )
  */
  function Validate( form_fields, options ) {
    Pipelet.call( this, options );
    
    var that = this;
    
    if ( toString.call( form_fields ) === '[object Array]' ) {
      this._fields = form_fields;
    } else {
      var output = form_fields._output;
      
      output.on( 'complete', fetch_fields );
      
      fetch_fields();
    }
    
    return this;
    
    function fetch_fields() {
      output.fetch_all( fetched_fields );
      
      function fetched_fields( values ) {
        that._fields = values;
      } // fetched_fields()
    } // fetch_fields()
  } // Validate()
  
  Pipelet.Build( 'validate', Validate, {
    __transform: function( values, options, caller ) {
      var that   = this
        , fields = this._fields
        , errors = this._validate( fields, values[ 0 ] )
      ;
      
      if( errors ) {
        values = [];
        
        if( caller === 'add' ) this.__emit_add( [ errors ] );
      }
      
      return values;
    }, // __transform()
    
    // process and validate form values; return errors
    _validate: function( fields, form ) {
      var errors = [], len = fields.length;
      
      for( var i = -1; ++i < len; ) {
        var field    = fields[ i ]
          , name     = field.id
          , value    = form[ name ]
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
          case 'file'      :
          case 'hidden'    : continue;
        }
        
        if( ! r.valid ) errors.push( { field_name: name, message: r.message } );
      }
      
      if( errors.length ) return { form: form, flow: form.flow + '_errors', errors: errors };
    } // _validate()
  } ); // validate() instance methods
  
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
     module exports
  */
  RS.add_exports( {
    'Validate': Validate
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // validate.js

