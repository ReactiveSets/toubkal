/*  json.js
    
    ----
    
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
  var XS = exports.XS;
  
  if ( ! XS ) {
    XS = require( './pipelet.js' ).XS;
  }
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Code       = XS.Code
    , Pipelet    = XS.Pipelet
    , Compose    = Pipelet.Compose
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs json, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     source.json_parse( options )
     
     Parses one JSON content field from a dataflow.
     
     If there is a parsing error, the destination field will containt a value with these
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
  function JSON_Parse( options ) {
    options = Pipelet.call( this, options )._options;
    
    this.source_field = options.source_field || 'content';
    
    this.destination_field = options.destination_field || this.source_field;
    
    return this;
  } // JSON_Parse()
  
  /* -------------------------------------------------------------------------------------------
     source.json_parse( options )
  */
  Pipelet.Build( 'json_parse', JSON_Parse, {
    __transform: function( values ) {
      var source_field = this.source_field
        , destination_field = this.destination_field
        , out = []
        , l = values.length
        , u
      ;
      
      for ( var i = -1; ++i < l; ) {
        var v = extend( {}, values[ i ] );
        
        out.push( v );
        
        try {
          v[ destination_field ] = JSON.parse( v[ source_field ] );
        } catch( e ) {
          // ToDo: JSON_Parse() add test when JSON.parse() throws
          v[ destination_field ] = u;
          
          // ToDo: send to out-of-band global error dataflow
          ug( log.s( { flow: 'error', pipelet: 'json_parse', error: '' + e } ) );
        }
      }
      
      return out;
    } // __transform()
  } ); // JSON_Parse instance methods
  
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
    options = extend( { source_field: 'content' }, options );
    
    var source_field      = options.source_field
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
          v[ destination_field ] = u;
          
          // ToDo: send to out-of-band global error dataflow
          ug( log.s( { flow: 'error', pipelet: 'json_stringify', error: '' + e } ) );
        }
      }, options )
    ;
  } ); // json_stringify()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [] ) );
  
  de&&ug( "module loaded" );
} )( this ); // json.js
