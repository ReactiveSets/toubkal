/*  query_selector.js
    
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

// The null module, always returns a null reference, ToDo: hard-code this in undefine()
( this.undefine || require( 'undefine' )( module, require ) )()( 'null', [], function() { return null } );

( this.undefine || require( 'undefine' )( module, require ) )()
( 'query_selector', [ '../core/pipelet', [ 'null', 'css-select' ] ], function( rs, css_select ) {
  'use strict';
  
  var RS        = rs.RS
    , Set       = RS.Set
    , extend    = RS.extend
  ;
  
  /* -------------------------------------------------------------------------------------------
      $query_selector( selector, attributes, options )
      
      Finds and return the first element that matches selector parameter.
      
      Emitted values contains source attributes extended with parameter 'attributes'
      if defined
      
      This is a synchronous, stateless, greedy pipelet.
      
      Parameters:
      - selecror  (String): a CSS3 selector to get the DOM node 
      - attributes(Object): optional additional attributes to emit.
      - options   (Object): Pipelet options
      
      Example: render list of all "tablet" products names and prices
        
      rs
        .Singleton( '$products, function( $selector, options ) {
          return rs
            .socket_io_server()
            .flow( 'products' )
            .filter( $selector.alter( remove_dom_node ) )
            .$to_dom( $selector )
          ;
          
          function remove_dom_node( value ) {
            delete value.$dom_node;
          }
        } )
        
        .$query_selector( '#products-list', { line: 'tablets' } )
        
        .$products()
        
        .flat_map( function( v ) {
          return [
            { id: v.id + '-name' , tag: 'p', content: v.name , $dom_node: v.$dom_node },
            { id: v.id + '-price', tag: 'p', content: v.price, $dom_node: v.$dom_node }
          ]
        } )
        
        .$to_dom() // no selector necessary as it comes with the data
      ;
  */
  return rs.Compose( '$query_selector', function( source, selector, attributes, options ) {
    return source
      .map( function( v ) {
        var $root = v.dom /* from html_parse() */ || v.$node // from $query_selector() or $to_dom()
            
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
