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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'query_selector', [ '../core/pipelet', 'css-select' ], function( rs, css_select ) {
  'use strict';
  
  var RS        = rs.RS
    , Set       = RS.Set
    , extend    = RS.extend
    , select_one= css_select.selectOne
    , log       = RS.log
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log.bind( null, 'to DOM' );
  
  /* -------------------------------------------------------------------------------------------
      $query_selector( selector, attributes, options )
      
      Finds and return the first element that matches selector parameter.
      
      Emitted values contains source attributes extended with parameter 'attributes'
      if defined
      
      Duplicates are not emitted.
      
      Parameters:
      - selecror  (String): a CSS3 selector to get the DOM node 
      - attributes(Object): additional attributes to emit. Optional
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
  function $Query_Selector( selector, attributes, options ) {
    Set.call( this, [], options );
    
    this._selector   = selector;
    this._attributes = attributes;
    
  } // $Query_Selector()
  
  Set.Build( '$query_selector', $Query_Selector, function( Super ) {
    // Public methods
    var is_server = typeof window == 'undefined';
    
    return {
      
      _add: function( added, options ) {
        var l = added.length;
        
        if( ! l  ) return this;
        
        var that       = this
          , selector   = this._selector
          , attributes = this._attributes
        ;
        
        added = added
          .map( function( v ) {
            var $root = v.dom || v.$dom_node || document;
            
            var $dom_node = is_server ? select_one( selector, $root ) : $root.querySelector( selector );
            
            if( $dom_node ) return extend( { $dom_node: $dom_node }, v );
          } ) // map()
        ;
        
        return Super._add.call( this, added, options );
      }, // _add()
      
      _remove: function( removed, options ) {
        var l = removed.length;
        
        if( ! l  ) return this;
        
        return Super._remove.call( this, removed, options );
      } // _remove()
    } // $Query_Selector() instance methods
  } ); // $query_selector()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { '$Query_Selector': $Query_Selector } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // query_selector.js
