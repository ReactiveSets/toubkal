/*  code.js

    Copyright (c) 2013-2017, Reactive Sets

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
( 'code', [ './extend', './javascript', './console_logger' ], function( extend, javascript, Console_Logger ) {
  "use strict";
  
  var slice    = [].slice
    , is_array = javascript.is_array
    , de       = false
    , log      = Console_Logger()
    , ug       = log.bind( null, 'code' )
  ;
  
  /* -------------------------------------------------------------------------------------------
     Pretty JavaScript code generator
     
     ToDo: prefix all code primitives with '_' for consistency
  */
  function Code( name ) {
    var that = this;
    
    that.name = name;
    that.code = '';
    that.indent = '  ';
    that.blocs = [];
    
    return that;
  } // Code()
  
  extend( Code.prototype, {
    trace: function() {
      var that = this;
      
      ug( "name:", that.name + "code:\n" + that.code );
      
      return that;
    }, // trace()
    
    get: function() {
      de&&ug( "Code:\n" + this.code );
      
      return this.code;
    }, // get()
    
    eval: function() {
      var that = this;
      
      de&&ug( "Code.eval: name: " + that.name + 'code:\n' + that.code );
      
      return eval( that.code );
    }, // eval()
    
    line: function( line, new_lines ) {
      var that = this, ___;
      
      if ( line != ___ )
        that.code += that.indent + line + '\n';
      
      if ( new_lines )
        while ( new_lines-- )
          that.code += '\n';
      
      return that;
    }, // add()
    
    add: function( statement, new_lines ) {
      return this.line( statement + ';', new_lines );
    }, // add()
    
    comment: function( comment ) {
      return this.line( '// ' + comment );
    }, // comment()
    
    begin: function( code ) {
      var that = this;
      
      that.line( code + ' {' );
      
      that.blocs.push( code );
      
      that.indent += '  ';
      
      return that;
    }, // begin()
    
    end: function( comment ) {
      var that = this
        , code = that.blocs.pop()
        , ___
      ;
      
      if ( code == ___ )
        throw new Code.Syntax_Error( "Missing matching opening block" )
      ;
      
      that.indent = that.indent.substr( 2 );
      
      code = comment
        ? '} // ' + ( comment === true ? code : comment )
        : '}'
      ;
      
      return that.line( code, 1 );
    }, // end()
    
    _if: function( expression ) {
      return this.begin( 'if ( ' + expression + ' ) ' );
    }, // _if()
    
    _else: function( expression ) {
      var that = this
        , ___
      ;
      
      if ( ! that.blocs.length )
        throw new Code.Syntax_Error( "Missing matching opening block" )
      ;
      
      that.indent = that.indent.substr( 2 );
      
      that.line( '} else ' + ( expression ? 'if ( ' + expression + ' ) {' : '{' ) );
      
      that.indent += '  ';
      
      return that;
    }, // _else()
    
    _while: function( expression ) {
      return this.begin( 'while ( ' + expression + ' ) ' );
    }, // _while()
    
    _for: function( init, condition, step ) {
      return this.begin( 'for( ' + ( init || '' ) + '; ' + ( condition || '' ) + '; ' + ( step || '' ) + ' )' );
    }, // _for()
    
    _function: function( lvalue, name, safe_parameters ) {
      var code = '';
      
      if ( lvalue ) code += lvalue + ' = ';
      
      code += 'function';
      
      if ( name ) code += ' ' + name;
      
      code += safe_parameters ? '( ' + safe_parameters.join( ', ' ) + ' )' : '()';
      
      return this.begin( code )
    }, // _function()
    
    _var: function( vars ) {
      if ( typeof vars == 'string' ) vars = slice.call( arguments, 0 );
      
      return vars.length
          ? this.add( 'var ' + vars.map( make_var ).join( ', ' ), 1 )
          : this
      ;
      
      function make_var( _var ) {
        if ( ! is_array( _var ) ) _var = _var.split( /=/ );
        
        return safe_identifier( ( '' + _var[ 0 ] ).trim() ) // ToDo: add tests for code injection safety
             + ( _var.length > 1 ? ' = ' + ( '' + _var[ 1 ] ).trim() : '' )
      }
    }, // _var()
    
    safe_vars_from_object: function( object_name, attributes ) {
      if ( ! is_array( attributes ) )
        throw new Code.Error( "Missing attributes, must be an Array" )
      ;
      
      return this._var( attributes.map( function( a ) {
        return [
          '_' + a, // will be transformed into a safe identifier by _var()
          
          object_name + safe_dereference( a )
        ]
      } ) );
    }, // safe_vars_from_object()
    
    /* unrolled_while( first, inner, last, options )
      
      Generates an unrolled while loop.
      
      Parameters:
        - first: the first line of the body of the unfolded loop. This code must increment the
          variable 'i' - e.g. 'if ( a[ ++i ].id === _id'
          
        - inner (optional): the inner line of the body, default is to use the first line of body.
          This code must increment the variable 'i' - e.g. '|| a[ ++i ].id === _id'
        
        - last (optional): the last line of the body, default is empty string, this code must
          NOT increment the variable 'i' - e.g. ') return i'
          
        - options:
          - count: the number of iterations unrolled, default is calculated based on
            the string size of the inner statement.
          - index: the name of the index variable, default is 'i'
          - len  : the name of the length variable, default is 'l'
      
      The code generated requires that:
        - the variable 'l' contains the total number of iterations
        - the variable 'i' is the start index minus 1
        - i is incremented by the code provided as parameters
      
      Generated code creates the intermediate variable 'ul'.
      
      Example 1:
        _var( 'removed = []', 'i = -1', 'l = objects.length', 'o' )
        .unrolled_while( 'o = objects[ ++i ];  if ( o.country === "Morocco" ) removed.push( o );' )
        
        Generates:
          var ul = l - l % 2 - 1;

          while( i < ul ) {
            o = objects[ ++i ];  if ( o.country === "Morocco" ) removed.push( o );
            o = objects[ ++i ];  if ( o.country === "Morocco" ) removed.push( o );
          }
          
          ul = l - 1;
          while( i < ul ) {
            o = objects[ ++i ];  if ( o.country === "Morocco" ) removed.push( o );
          }
      
      Example 2:
        unrolled_while( 'if ( a[ ++i ].id === _id', '|| a[ ++i ].id === _id', ') return i' )
        
        Generates:
          var ul = l - l % 9 - 1;

          while( i < ul ) {
            if ( a[ ++i ].id === _id
              || a[ ++i ].id === _id
              || a[ ++i ].id === _id
              || a[ ++i ].id === _id
              || a[ ++i ].id === _id
              || a[ ++i ].id === _id
              || a[ ++i ].id === _id
              || a[ ++i ].id === _id
              || a[ ++i ].id === _id
            ) return i;
          }
          
          ul = l - 1;
          while( i < ul ) {
            if ( a[ ++i ].id === _id ) return i;
          }
      
    */
    unrolled_while: function( first, inner, last, options ) {
      options = options || {};
      
      inner || ( inner = first );
      
      var that               = this
        , count              = options.count || 200 / inner.replace( / */g, '' ).length >> 0
        , i                  = options.index || 'i'
        , l                  = options.l     || 'l'
        , inner_is_statement
      ;
      
      if ( inner.charAt( inner.length - 1 ) === ';' )
        inner_is_statement = true
      ;
      
      if ( count > 1 ) {
        var indent = '\n  ' + that.indent;
        
        that
          ._if( l + ' >= ' + count )
            ._var( 'ul = ' + l + ' - ' + l + ' % ' + count + ' - 1' )
            
            .begin( 'while( ' + i + ' < ul )' );
            
              if ( inner_is_statement )
                that
                  .line( first )
                  .repeat( count - 1, inner )
                  .line( last )
                ;
              
              else
                that.add( first + repeat( count - 1, inner, indent + '  ' ) + indent + ( last || '' ) )
              ;
              
            that
            .end()
          .end()
          
          .add( 'ul = ' + l + ' - 1' )
        ;
      } else
        that._var( 'ul = ' + l + ' - 1' );
      
      that
        .begin( 'while( ' + i + ' < ul )' )
          [ inner_is_statement ? 'line' : 'add' ]( first + ( last ? ' ' + last : '' ) )
        .end()
      ;
      
      return that;
      
      function repeat( count, code, indent ) {
        var c = '';
        
        for ( var i = -1; ++i < count; )
          c += indent + code;
        
        return c;
      }
    }, // unrolled_while()
    
    repeat: function( count, code ) {
      for ( var i = -1; ++i < count; )
        this.line( code )
      ;
      
      return this;
    } // repeat()
  } ); // Code instance methods
  
  Code.prototype._else_if = Code.prototype._else;
  
  // return safe string for evaluation
  var string_delimitor = '"'
    , escape           = '\\'
    , safe_reg_exp     = RegExp( '([' + escape + escape + string_delimitor + '])', 'g' )
  ;
  
  // ToDo: add test suite for Code.safe_string()
  function safe_string( s ) {
    return string_delimitor
        + ( '' + s ).replace( safe_reg_exp, escape + '$1' )
        + string_delimitor
  }
  
  // return safe id for evaluation
  // ToDo: add test suite for Code.safe_identifier()
  function safe_identifier( s ) {
    return ( '' + s )
      .replace( /([^0-9_a-zA-Z])/g, '_' )
      .replace( /(^[0-9])/, '_$1' )
  }
  
  function safe_attribute( attribute_name ) {
    return safe_identifier( attribute_name ) == attribute_name
      ? attribute_name
      : safe_string( attribute_name )
  }
  
  // ToDo add test suite for Code.safe_dereference()
  function safe_dereference( attribute_name ) {
    return safe_identifier( attribute_name ) == attribute_name // ToDo: replace by RegExp test, after implementing test suite
        ? '.' + attribute_name
        : '[ ' + safe_string( attribute_name ) + ' ]'
  } // safe_dereference()
  
  function safe_value( value ) {
    var ___;
    
    return '' +
      ( value === ___ || value !== value
        ? value
        : JSON.stringify( value )
      )
  } // safe_value()
  
  Code.is_array         = is_array;
  Code.safe_value       = safe_value;
  Code.safe_string      = safe_string;
  Code.safe_identifier  = safe_identifier;
  Code.safe_attribute   = safe_attribute;
  Code.safe_dereference = safe_dereference;
  
  de&&ug( "module loaded" );
  
  return Code;
} ); // code.js
