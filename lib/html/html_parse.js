/*  html_parse.js
    
    ----
    
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
( 'html_parse', [ 'toubkal/lib/core/pipelet.js', 'htmlparser2' ], function( rs, htmlparser2 ) {
  'use strict';
  
  var parseDOM = htmlparser2.parseDOM
  //  , de = false
  //  , ug = rs.RS.log.bind( null, 'html_parse' )
  ;
  
  /* -------------------------------------------------------------------------------------------
      html_parse( options )
      
      Parse an HTML string in "content" attribute into a object tree in "dom" attribute.
      
      Using htmlparser2 (https://github.com/fb55/htmlparser2)
      
      Output format visible at: http://demos.forbeslindesay.co.uk/htmlparser2/
      
      Emit values with attribute "dom" (Array of nodes), node attributes:
      - type     (String): node type:
        - "directive": e.g. <!DOCTYPE html>
        - "text"     : e.g. "\n"
        - "tag"      : e.g. <body>
        - "script"   : e.g. <script src="/test/javascript/mocha_expect-min.js"></script>
      - name     (String): name of "tag" or "directive"
      - attribs  (Object): when type is "tag", element attributes
      - children  (Array): children nodes when type is "tag"
      - data     (String): for directive and text nodes, raw content
      - next     (Object): circular reference to next sibbling in tree
      - prev     (Object): circular reference to previous sibbling in tree
      - parent   (Object): circular reference to parent in tree
      - toJSON (Function): allows to use JSON.stringify() on node, allowing trace() pipelet
      
      This is a stateless, synchronous, greedy pipelet.
      
      Parameters:
      - options (Object): optional Pipelet options
  */
  rs.Compose( 'html_parse', html_parse );
  
  function html_parse( source, options ) {
    return source.alter( parse_file, options );
    
    function parse_file( file ) {
      try {
        traceable( file.dom = parseDOM( file.content ) );
      } catch( e ) {
        // ToDo: emit error in global error dataflow
        file.error = e;
      }
      
      // Provide toJSON() functions for each node, returning nodes without circular dependencies
      function traceable( nodes ) {
        var i = -1, node;
        
        while ( node = nodes[ ++i ] ) {
          node.toJSON = node_to_JSON( node );
          
          node.children && traceable( node.children );
        } // for each node
        
        function node_to_JSON( node ) {
          return function toJSON() {
            var v = {}, a;
            
            for ( a in node ) {
              if ( node.hasOwnProperty( a )
                && a != 'prev'
                && a != 'next'
                && a != 'parent'
              ) {
                v[ a ] = node[ a ];
              }
            }
            
            return v;
          } // toJSON()
        } // node_to_JSON()
      } // traceable()
    } // parse_file()
  } // html_parse()
  
  return rs;
} ); // html_parse.js
