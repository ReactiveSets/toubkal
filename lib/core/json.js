/*
    Copyright (c) 2013-2018, Reactive Sets

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
( 'json', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS         = rs.RS
    , log        = RS.log.bind( null, 'json' )
    , extend_2   = RS.extend._2
    , array_n    = RS.array_n
  ;
  
  return rs // only compositions beyond this line
  
  /* --------------------------------------------------------------------------
      @pipelet json_parse( options )
      
      @short Parses JSON content field
      
      @parameters
      - **options** \\<Object>: optional @@class:Pipelet options, plus:
        - **source_field** \\<String>: the name of the source field to parse,
          defaults to ```"content"```.
        
        - **destination_field** \\<String>: the name of the parsed field,
          defaults to ```options.source_field```.
        
        - **reviver** \\<Function>: a reviver, for more information check
          [JSON.parse()](
            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
          )
        
        - **strict** \\<Boolean>: default false, if true, the parser
          conforms strictly to the [JSON specification](https://json.org/)
          and only uses ```JSON.parse()```.
          
          Otherwise, before calling ```JSON.parse()```, the parser will
          relax syntax checking by fixing source content:
          
          - removing block comments starting with /* and ending with *\/
          
          - removing comments starting with // and ending at the end of lines.
          
          - adding double quotes to non-quoted Object keys, e.g.
            ```{ id: 1 }``` becomes ```{ "id": 1 }``` before parsing.
          
          - removing [trailing commas](
              https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Trailing_commas
            ) in Arrays and Objects
      
      @source
      - \[*source_field*] \\<String>: to parse.
      
      @emits
      - all source attributes.
      
      - \[*destination_field*]: parsed JSON, or null on error.
      
      - **error** \\<Object>: if an error occurs, attributes:
        
        - message \\<String>: ```JSON.parse()``` caught error message.
        
        - pipelet \\<String>: name of pipelet where error occured.
        
        - input \\<String>: JSON input string, if non-strict, this is the
          "fixed" input string. See option *strict* above.
        
        - position \\<Number>: zero-based character position where the
          error occured.
        
        - line \\<Number>: one-based line number where the error occured,
          if non-strict, this is always 1.
        
        - column \\<Number>: zero-based column where the error occured
          in line.
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
      When an error occurs the console displays the exact location
      where the error occured in input.
      
      @see_also
      - Pipelet json_stringify()
      - Pipelet configuration()
  */
  .Compose( 'json_parse', function( source, options ) {
    options = options || {};
    
    var source_field      = options.source_field      || 'content'
      , destination_field = options.destination_field || source_field
      , reviver           = options.reviver
      , strict            = options.strict
    ;
    
    return source.alter( function( value ) {
      var content = value[ source_field ]
        , input
      ;
      
      try {
      
        value[ destination_field ] = content
        
          ? JSON.parse( input = strict ? content : relax( content ), reviver )
          
          : input
      
      } catch( e ) {
        // ToDo: provide line and column for the error
        // ToDo: json_parse() add test when throws
        var message      = e.message
          , position     = /position ([0-9]+)/.exec( message )
          , line_number
          , column
          , input_lines
          , before_lines
          , column_array
          , error_index
          , indent
        ;
        
        value[ destination_field ] = null;
        
        e = value.error = {
          message : message,
          pipelet : options.name,
          input   : input
        };
        
        if ( position ) {
          e.position = position = +( position[ 1 ] );
          
          line_number = 0;
          
          input
            .split( '\n' )
            
            .every( function( line ) {
              var l = line.length;
              
              line_number += 1;
              
              if ( l < position ) {
                position -= l + 1; // + 1 for newline eaten by split()
                
                return 1
              }
              
              column = position
              
              // terminate every() now
            } )
          ;
          
          e.line   = line_number;
          e.column = column;
        }
        
        log( 'JSON.parse() error:', e );
        
        input_lines  = input.split( '\n' );
        before_lines = input_lines.slice( 0, line_number );
        column_array = array_n( column + 1 );
        error_index  = '\n  error: ';
        indent       = '\n' + array_n( error_index.length ).join( ' ' );
        
        console.log( '\nShowing error in input:\n',
          indent + before_lines.join( indent ),
          indent + column_array.join( ' ' ) + '^',
          error_index + column_array.join( '_' ) + '|'
        );
        
        line_number < input_lines.length
          && console.log( indent, indent + input_lines.slice( line_number ).join( indent ) )
        ;
      }
    } );
    
    function relax( content ) {
      var stack            = []
        , in_block_comment = 0
        , in_cpp_comment   = 0
        , in_string        = 0
        , in_object        = 0
        , in_array         = 0
        , expect_key       = 0
        , quote_added      = 0
        , out              = ''
        , i                = -1
        , l                = content.length
        , c
        , next
      ;
      
      while ( ++i < l ) {
        c    = content[ i ];
        next = content[ i + 1 ] || '';
        
        if ( in_cpp_comment ) {
          if ( c == '\n' ) in_cpp_comment = 0
        
        } else if ( in_block_comment ) {
          if ( c == '*' && next == '/' ) {
            in_block_comment = 0;
            
            i += 1
          }
        
        } else if ( in_string ) {
          out += c;
          
          if ( c == '\\' ) {
            out += next;
            
            i += 1
          
          } else if ( c == '"' )
            in_string = 0
        
        } else {
        
          switch( c ) {
            case '"':
              // start of string or expect_key
              in_string = 1;
            break;
            
            case '/':
              // maybe start of comment
                if ( next == '*' ) i += 1, in_block_comment = 1
              else
                if ( next == '/' ) i += 1, in_cpp_comment   = 1 
            break;
            
            case ' ':
            case '\t':
            case '\n':
              // remove spaces
              c = '';
            break;
            
            case '{':
            case '[':
              stack.push( in_array, in_object );
              
              in_array  = c == '[';
              in_object = expect_key = c == '{';
            break;
            
            case '}':
            case ']':
              in_object = stack.pop();
              in_array  = stack.pop();
              
              expect_key = 0;
              
              if ( out.slice( -1 ) == ',' )
                // remove trailing comma
                out = out.slice( 0, -1 )
            break;
            
            case ',':
              if ( in_object ) expect_key = !0;
            break;
            
            case ':':
              expect_key = 0;
              
              if ( quote_added ) {
                c = '"' + c;
                
                quote_added = 0
              }
            break;
            
            default:
              if ( expect_key && ! quote_added ) {
                quote_added = 1;
                
                c = '"' + c
              }
          }
          
          if ( ! in_block_comment && ! in_cpp_comment )
            out += c;
          
          /*
          1 && console.log( {
            c               : c,
            next            : next,
            in_block_comment: in_block_comment,
            in_cpp_comment  : in_cpp_comment,
            in_string       : in_string,
            in_object       : in_object,
            in_array        : in_array,
            expect_key      : expect_key,
            quote_added     : quote_added
          } );
          //*/
        } // end else
      
      } // while there are characters
      
      //console.log( out );
      
      return out;
    } // relax()
  } ) // json_parse()
  
  /* --------------------------------------------------------------------------
      @pipelet json_stringify( options )
      
      @short Stringifies JSON source field into a string to destination field
      
      @parameters
      - **options** \\<Object>: optional, attributes:
        
        - **source_field** \\<String>: the name of the source field to
        stringify, defaults to ```"content"```.
        
        - **destination_field** \\<String>: the name of the parsed field,
        defaults to ```options.source_field```.
        
        - **replacer** \\<Function>: optional JSON.parse replacer function,
        for more information check
        [JSON.stringify](
          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
        ).
        
        - **include** \\<String []>: optional exclusive list of
        atributes to stringify. Ignored if ```options.replacer``` is
        provided.
        
        - **exclude** \\<String []>: optional list of atributes
        to NOT stringify. Ignored if ```options.replacer``` or
        ```options.include``` is provided.
        
        - **space** \\<String>: spaces to pretty output
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
      @see_also
      - Pipelet json_parse()
      - Function @@function:JSON_hide()
  */
  .Compose( 'json_stringify', function( source, options ) {
    options = options || {};
    
    var source_field      = options.source_field      || 'content'
      , destination_field = options.destination_field || source_field
      , replacer          = options.replacer
      , include           = options.include
      , exclude           = options.exclude
      , space             = options.space
      , u
    ;
    
    if ( ! replacer ) {
      if ( include ) {
        replacer = include;
      } else if ( exclude ) {
        replacer = function( key, value ) {
          return exclude.indexOf( key ) != -1 ? u : value;
        }
      }
    }
    
    return source
      .alter( function( v ) {
        try {
          v[ destination_field ]
            = JSON.stringify( v[ source_field ], replacer, space )
            + ( space ? '\n' : '' )
        
        } catch( e ) {
          // ToDo: json_stringify() add test when throws
          v.error = { message: e.message, code: e.code, pipelet: options.name };
          
          v[ destination_field ] = null;
        }
      } )
    ;
  } ) // json_stringify()
} ); // json.js
