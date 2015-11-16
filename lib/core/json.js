/*  json.js
    
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
( 'json', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS         = rs.RS
    , log        = RS.log
    , extend_2   = RS.extend._2
    , Compose    = RS.Pipelet.Compose
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log.bind( null, 'json' );
  
  /* -------------------------------------------------------------------------------------------
     json_parse( options )
     
     Parses one JSON content field from a dataflow.
     
     If there is a parsing error, the destination field will contain a value with these
     attributes:
       - flow: 'error'
       - pipelet: 'json_parse'
       - error: (String) the error message
     
     Parameters:
       - options: (Object) optional, attributes:
         - source_field: (String) the name of the source field to parse, defaults to 'content'
         - destination_field: (String) the name of the parsed field, defaults to 'source_field'
         - reviver: (Function) a reviver for JSON.parse() for more information on reviver, check:
           https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
  */
  Compose( 'json_parse', function( source, options ) {
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
  } ); // json_parse()
  
  /* -------------------------------------------------------------------------------------------
     json_stringify( options )
     
     Stringifys JSON source field into a string in destination field.
     
     options:
       - source_field: (String) the name of the source field to stringify, defaults to 'content'
       - destination_field: (String) the name of the parsed field, defaults to 'source_field'
       - replacer: (Function) a JSON.parse replacer function, for more information check:
           https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify 
       - include: (Array or Strings) exclusive list of atributes to stringify, ignored if
                  replacer provided.
       - exclude: (Array or Strings) list of atributes to NOT stringify, ignored if replacer or
                  include is provided.
  */
  Compose( 'json_stringify', function( source, options ) {
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
  } ); // json_stringify()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  de&&ug( "module loaded" );
  
  return rs;
} ); // json.js
