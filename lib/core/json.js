/*  json.js
    
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
( 'json', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS         = rs.RS
    , log        = RS.log.bind( null, 'json' )
    , extend_2   = RS.extend._2
  ;
  
  return rs // only compositions beyond this line
  
  /* --------------------------------------------------------------------------
      @pipelet json_parse( options )
      
      @short Parses JSON content field
      
      @parameters
      - **options** (Object): optional, attributes:
        - **source_field** (String): the name of the source field to parse,
        defaults to ```"content"```.
        
        - **destination_field** (String): the name of the parsed field,
        defaults to ```options.source_field```.
        
        - **reviver** (Function) a reviver, for more information check
        [JSON.parse()](
          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
        )
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
      If there is a parsing error, the destination field will contain a
      value with the following attributes:
        - **flow** (String): "error"
        - **pipelet** (String): "json_parse"
        - **error**: (Error) caught error, may or may not contain a
        stack trace.
      
      ### See Also
      - Pipelet json_stringify()
      - Pipelet configuration()
  */
  .Compose( 'json_parse', function( source, options ) {
    options = options || {};
    
    var source_field      = options.source_field      || 'content'
      , destination_field = options.destination_field || source_field
      , reviver           = options.reviver
      , ___
    ;
    
    return source.alter( function( v ) {
      try {
        var content = v[ source_field ];
        
        v[ destination_field ] = content ? JSON.parse( content, reviver ) : ___;
      } catch( e ) {
        // ToDo: provide line and column for the error, use either:
        // - clarinet: https://github.com/dscape/clarinet w/ error example here: https://gist.github.com/davidrapin/93eec270153d90581097
        // - JSONLint: http://jsonlint.com/
        // ToDo: json_parse() add test when throws
        e = { flow: 'error', pipelet: 'json_parse', error: e };
        
        ug( e );
        
        // ToDo: send to out-of-band global error dataflow
        extend_2( v, e );
        
        v[ destination_field ] = null;
      }
    } );
  } ) // json_parse()
  
  /* --------------------------------------------------------------------------
      @pipelet json_stringify( options )
      
      @short Stringifies JSON source field into a string to destination field
      
      @parameters
      - **options** (Object): optional, attributes:
        - **source_field** (String): the name of the source field to
        stringify, defaults to ```"content"```.
        
        - **destination_field** (String): the name of the parsed field,
        defaults to ```options.source_field```.
        
        - **replacer** (Function): optional JSON.parse replacer function,
        for more information check
        [JSON.stringify](
          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
        ).
        
        - **include** (Array or Strings): optional exclusive list of
        atributes to stringify. Ignored if ```options.replacer``` is
        provided.
        
        - **exclude** (Array or Strings): optional list of atributes
        to NOT stringify. Ignored if ```options.replacer``` or
        ```options.include``` is provided.
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
      ### See Also
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
          v[ destination_field ] = JSON.stringify( v[ source_field ], replacer, space );
        } catch( e ) {
          // ToDo: json_stringify() add test when throws
          e = { flow: 'error', pipelet: 'json_stringify', error: e };
          
          ug( e );
          
          // ToDo: send to out-of-band global error dataflow
          extend_2( v, e );
          
          v[ destination_field ] = null;
        }
      } )
    ;
  } ) // json_stringify()
} ); // json.js
