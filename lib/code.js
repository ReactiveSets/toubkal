/*  code.js

    Copyright (C) 2013, 2014, Connected Sets

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
  } else {
    XS = exports.XS;
  }
  
  var log        = XS.log
    , extend     = XS.extend
  ;
  
  var slice = Array.prototype.slice;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false;
  
  function ug( m ) {
    log( "code, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Pretty JavaScript code generator
     
     ToDo: prefix all code primitives with '_' for consistency
  */
  function Code( name ) {
    this.name = name;
    this.code = '';
    this.indent = '  ';
    this.blocs = [];
    
    return this;
  } // Code()
  
  extend( Code.prototype, {
    trace: function() {
      ug( "name: " + this.name + ", code:\n" + this.code );
      
      return this;
    }, // trace()
    
    get: function() {
      de&&ug( "Code:\n" + this.code );
      
      return this.code;
    }, // get()
    
    eval: function() {
      de&&ug( "Code.eval: name: " + this.name + ', code:\n' + this.code );
      
      return eval( this.code );
    }, // eval()
    
    line: function( line, new_lines ) {
      if ( line !== undefined ) this.code += this.indent + line + '\n';
      
      if ( new_lines ) while( new_lines-- ) this.code += '\n';
      
      return this;
    }, // add()
    
    add: function( statement, new_lines ) {
      return this.line( statement + ';', new_lines );
    }, // add()
    
    comment: function( comment ) {
      return this.line( '// ' + comment );
    }, // comment()
    
    begin: function( code ) {
      this.line( code + ' {' );
      
      this.blocs.push( code );
      
      this.indent += '  ';
      
      return this;
    }, // begin()
    
    end: function( comment ) {
      var code = this.blocs.pop();
      
      if ( code === undefined ) throw new Code.Syntax_Error( "Missing matching opening block" );
      
      this.indent = this.indent.substr( 2 );
      
      if ( comment === true ) {
        comment = '// ' + code;
      } else if ( comment ) {
        comment = '// ' + comment;
      } else {
        comment = '';
      }
      
      return this.line( '} ' + comment, 1 );
    }, // end()
    
    _if: function( expression ) {
      return this.begin( 'if ( ' + expression + ' ) ' );
    }, // _if()
    
    _else: function( expression ) {
      if ( this.blocs.length === 0 ) throw new Code.Syntax_Error( "Missing matching opening block" );
      
      this.indent = this.indent.substr( 2 );
      
      if ( expression === void 0 ) {
        this.line( '} else {' );
      } else {
        this.line( '} else if ( ' + expression + ' ) {' );
      }
      
      this.indent += '  ';
      
      return this;
    }, // _else()
    
    _while: function( expression ) {
      return this.begin( 'while ( ' + expression + ' ) ' );
    }, // _while()
    
    _for: function( init, condition, step ) {
      return this.begin( 'for( ' + ( init || '' ) + '; ' + ( condition || '' ) + '; ' + ( step || '' ) + ' )' );
    }, // _for()
    
    _function: function( lvalue, name, parameters ) {
      var code = '';
      
      if ( lvalue ) code += lvalue + ' = ';
      
      code += 'function';
      
      if ( name ) code += ' ' + name;
      
      if ( parameters ) {
        code += '( ' + parameters.join( ', ' ) + ' )';
      } else {
        code += '()';
      }
      
      return this.begin( code );
    }, // _function()
    
    _var: function( vars ) {
      if ( typeof vars === 'string' ) vars = slice.call( arguments, 0 );
      
      return this.add( 'var ' + vars.join( ', ' ), 1 );
    }, // _var()
    
    vars_from_object: function( object, attributes ) {
      if ( typeof attributes !== "object" || ! attributes instanceof Array ) throw new Code.Error( "Missing attributes" );
      
      var l = attributes.length;
      
      if ( ! l ) return this;
      
      var vars = [];
      
      for( var i = -1; ++i < l; ) {
        var a = attributes[ i ];
        
        vars.push( '_' + a + ' = ' + object + '.' + a );
      }
      
      return this._var( vars );
    }, // vars_from_object()
    
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
      
      var count = options.count || 200 / inner.length >> 0;
      var i     = options.index || 'i';
      var l     = options.l     || 'l';
      
      if ( inner.charAt( inner.length - 1 ) === ';' ) {
        var inner_is_statement = true;
      }
      
      if ( count > 1 ) {
        var indent = '\n  ' + this.indent;
        
        this
          ._var( 'ul = ' + l + ' - ' + l + ' % ' + count + ' - 1' )
          
          .begin( 'while( ' + i + ' < ul )' );
          
            if ( inner_is_statement ) {
              this
                .line( first )
                .repeat( count - 1, inner )
                .line( last )
              ;
            } else {
              this.add( first + repeat( count - 1, inner, indent + '  ' ) + indent + ( last || '' ) );
            }
            
          this
          .end()
          
          .add( 'ul = ' + l + ' - 1' )
        ;
      } else {
        this._var( 'ul = ' + l + ' - 1' );
      }
      
      this
        .begin( 'while( ' + i + ' < ul )' )
          [ inner_is_statement ? 'line' : 'add' ]( first + ( last ? ' ' + last : '' ) )
        .end()
      ;
      
      return this;
      
      function repeat( count, code, indent ) {
        var c = '';
        
        for ( var i = -1; ++i < count; ) c += indent + code;
        
        return c;
      }
    }, // unfolded_loop()
    
    repeat: function( count, code ) {
      for ( var i = -1; ++i < count; ) this.line( code );
      
      return this;
    } // repeat()
  } ); // Code instance methods
  
  Code.prototype._else_if = Code.prototype._else;
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Code' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // code.js
