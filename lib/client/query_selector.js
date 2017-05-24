/*  query_selector.js
    
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
( 'query_selector', [ '../core/pipelet', [ 0, 'css-select' ] ], function( rs, css_select ) {
  'use strict';
  
  var RS        = rs.RS
    , Set       = RS.Set
    , extend    = RS.extend
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet $query_selector( selector, attributes, options )
      
      @short Emits first element that matches CSS3 selector
      
      @parameters
      - selector  (String): CSS3 selector to lookup DOM node 
      - attributes(Object): optional additional attributes to emit.
      - options   (Object): Pipelet options
      
      @emits
      Source attributes plus ```"$node"``` attribute extended with parameter
      ```"attributes"``` object if defined.
      
      @examples
      - render list of all ```"tablet"``` products names and prices
        ```html
          <body>
            <div id:"products-list"></div>
          </body>
        ```
        
        ```javascript
          rs
            // Connect to server
            .socket_io_server()
            
            // Subscribe to products dataflow for "tablet" line
            .filter( [ { flow: 'products', line: 'tablets' } ] )
            
            // Add $node, if found, otherwise emit nothing
            .$query_selector( '#products-list' )
            
            .$to_dom()
            
            .flat_map( function( v ) {
              return [
                { id: v.id + '-name' , content: v.name  },
                { id: v.id + '-price', content: v.price }
              ].map( function( _ ) {
                _.tag = 'p';
                _.$node = v.$node
                
                return _;
              } )
            } )
            
            .$to_dom()
          ;
        ```
      
      @description
      This is a @@synchronous, @@stateless, @@greedy pipelet.
      
      ### See Also
      - Pipelet $to_dom()
      - Pipelet flat_map()
      - Pipelet socket_io_server()
      - Pipelet filter()
      
      ### To-Do List
      - ToDo: document server usage with pipelet html_parse()
  */
  return rs.Compose( '$query_selector', function( source, selector, attributes, options ) {
    return source
      .map( function( v ) {
        var $root = v.$node /* from $query_selector() or $to_dom() */ || v.dom /* from html_parse() */
            
          , $node = css_select
              ? css_select.selectOne( selector, $root )
              : ( $root || document ).querySelector( selector )
        ;
        
        // Emit nothing if $node is not found
        if ( $node ) return extend( {}, v, { $node: $node }, attributes );
      }, options )
    ;
  } );
} ); // query_selector.js
