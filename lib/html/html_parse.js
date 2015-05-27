/*  html_parse.js
    
    ----
    
    Copyright (C) 2013, 2014, Reactive Sets

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
!function( exports ) {
  "use strict";
  
  var rs          = exports.rs || require( 'toubkal/lib/core/pipelet.js' )
    , htmlparser2 = require( 'htmlparser2' )
    , parseDOM    = htmlparser2.parseDOM
    , RS          = rs.RS
    , Pipelet     = RS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'html parse' );
  
  /* -------------------------------------------------------------------------------------------
     HTML_Parse( options )
  */
  
  function HTML_Parse( options ) {
    return Pipelet.call( this, options );
  } // HTML_Parse()
  
  /* -------------------------------------------------------------------------------------------
     html_parse( options )
     
     parse an HTML string into a object tree, using module htmlparser2 ( https://github.com/fb55/htmlparser2 )
     
  */
  
  Pipelet.Build( 'html_parse', HTML_Parse, function( Super ) {
    return {
      __transform: function( values, options, caller ) {
        var out = []
          , len = values.length
        ;
        
        if( len    === 0        ) return out;
        if( caller === 'remove' ) return values;
        
        for( var i = -1; ++i < len; ) {
          out.push( parseDOM( values[ i ].content ) )
        } // for()
        
        de&&ug( '__transform()..', ', values: ', out.length );
        
        return out;
      } // __transofm()
    };
  } ); // HTML_Parse instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'HTML_Parse': HTML_Parse } );
  
  de&&ug( "module loaded" );
} ( this ); // html_parse.js
