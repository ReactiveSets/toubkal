/*  validate.js
    
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
( 'validate', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS          = rs.RS
    , Pipelet     = RS.Pipelet
    , email_regex = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/
    , phone_regex = /^\+?[0-9 \-\(\)]+$/
  ;
  
  /* -------------------------------------------------------------------------------------------
      @pipelet validate( form_fields, options )
      
      @emits errors, if any, attributes:
        - flow (String): input flow + '_errors'
        - from (Object): input value
        - errors (Array): for each field having errors, Object attributes:
          - field (Object): from form_fields
          - errors (Array): error codes (Strings), built-in errors:
            'is_mandatory': mandatory field is missing
            'invalid': field has an invalid value
  */
  function Validate( form_fields, options ) {
    var that = this;
    
    Pipelet.call( that, options );
    
    if ( RS.is_array( form_fields ) ) {
      that._fields = form_fields;
    } else {
      // ToDo: use _add_input()
      var output = form_fields._output;
      
      output.on( 'complete', fetch_fields );
      
      fetch_fields();
    }
    
    that._output._transform = that.__transform.bind( that );
    
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
        , errors = []
      ;
      
      values = values.filter( function( form ) {
        var _errors = that._validate( form );
        
        if ( _errors )
          errors.push( { flow: form.flow + '_errors', form: form, errors: _errors } )
        ;
        
        return ! _errors;
      } );
      
      if ( errors.length && caller == 'add' ) {
        // ToDo: Emit to global error dataflow instead
        
        that.__emit_add( errors );
      }
      
      return values;
    }, // __transform()
    
    // process and validate form values; return errors
    _validate: function( form ) {
      var that   = this
        , fields = that._fields
        , errors = []
      ;
      
      fields.forEach( function( field ) {
        var value = form[ field.id ]
          , _errors = that._validate_mandatory( field, value );
        ;
        
        if ( ! _errors ) {
          switch( field.type ) {
            case 'email'     : _errors = that._validate_regex( email_regex, field, value ); break;
            case 'phone'     : _errors = that._validate_regex( phone_regex, field, value ); break;
          }
        }
        
        _errors && errors.push( { field: field, errors: _errors } );
      } )
      
      if ( errors.length ) return errors;
    }, // _validate()
    
    _validate_regex: function( regex, field, value ) {
      return value != null
          && value !== ''
          && ! regex.test( value )
          && [ 'invalid' ]
      ;
    }, // _validate_regex()
    
    _validate_mandatory: function( field, value ) {
      return field.mandatory
          && ( value == null || value === '' )
          && [ 'is_mandatory' ]
      ;
    } // _validate_mandatory()
  } ); // validate() instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Validate': Validate } );
  
  return rs;
} ); // validate.js
