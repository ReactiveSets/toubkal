/*  to_dom.js
    
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
( 'to_dom', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS        = rs.RS
    , Set       = RS.Set
    , extend    = RS.extend
    , add_class = RS.add_class
    , log       = RS.log
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log.bind( null, 'to DOM' );
  
  /* -------------------------------------------------------------------------------------------
      to_dom( selector, render, options )
      
      Render values into DOM node selector child using render() function.
      
      Source values may contain a 'tag' attribute which will be used instead of default
      options.tag to create value containers.
      
      Emitted values include a '$dom_node' attribute of added and removed DOM elements.
      
      Duplicates are not emitted.
      
      This is a synchronous, stateful pipelet.
      
      Parameters:
      - render (Function ( Document document, HTMLElement node, Object value ) -> ): rendering
        added values into container node.
        
        Parameters:
        - document    (Document): Providing access to the global document
        - dom_node (HTMLElement): container element for this value
        - value         (Object): added value
      
      - selector (String): a CSS3 selector to get the DOM node where values will be rendered
      
      - Options (Object): Pipelet options plus the following additional options:
        - tag (String): value containers tag name, default depends on selector's tag name:
          tr        -> th if tr parent is     a thead
          tr        -> td if tr parent is NOT a thead
          ul        -> li
          ol        -> li
          select    -> options
          optgroup  -> options
          datalist  -> options
          form      -> input
          table     -> tr
          thead     -> tr
          tbody     -> tr
          tfoot     -> tr
          colgroup  -> col
          nav       -> a
          menu      -> button
          map       -> array
          other tag -> div
      
      Example: display a product name and price from a "products" dataflow:
       
        products
          .to_dom( '#products-list', render_product )
        ;
        
        function render_project( document, $container, product ) {
          var $name  = document.createElement( 'div' )
            , $price = document.createElement( 'div' )
          ;
          
          name .innerHTML = product.name;
          price.innerHTML = product.price
          
          $container.appendChild( $name  );
          $container.appendChild( $price );
        }
  */
  var counter = -1; // TO_DOM instance counter
  
  function TO_DOM( selector, render, options ) {
    Set.call( this, [], options );
    
    this._render = render;
    
    this._prefix = 'to_dom-' + ++counter + '-';
    
    this._default_tag();
    
    this._get_dom_node( selector );
  } // TO_DOM()
  
  Set.Build( 'to_dom', TO_DOM, function( Super ) {
    // Public methods
    
    return {
      _default_tag: function() {
        var options = this._options;
        
        if ( options.tag ) return;
        
        var tag = {
          TR: 'td', // will turn into 'th' if parent node is thead
          
          UL: 'li',
          OL: 'li',
          
          SELECT: 'options',
          OPTGROUP: 'options',
          DATALIST: 'options',
          
          FORM: 'input',
          
          TABLE: 'tr',
          THEAD: 'tr',
          TBODY: 'tr',
          TFOOT: 'tr',
          COLGROUP: 'col',
          
          NAV: 'a',

          MENU: 'button',

          MAP: 'area'
        }[ $dom_node.tagName ] || 'div';
        
        if ( tag == 'td' && $dom_node.parentNode.tagName == 'THEAD' ) tag = 'th';
        
        options.tag = tag;
      }, // _default_tag()
      
      _get_dom_node: function( selector ) {
        var $dom_node = this._$dom_node = document.querySelector( selector );
        
        if ( ! $dom_node )
          return this._error( '_get_dom_node()', 'element ( ' + selector + ' ) not found' )
        ;
      }, // _get_dom_node()
      
      _make_id: function( v ) {
        return this._prefix + this.make_key( v );
      }, // _make_id()
      
      _add: function( added, options ) {
        var l = added.length;
        
        if( ! l  ) return this;
        
        var that      = this
          , render    = this._render
          , $dom_node = this._$dom_node
          , tag       = this._options.tag
        ;
        
        added = added
          .map( function( v ) {
            var id = that._make_id( v )
              , $e = $dom_node.querySelector( '#' + id )
            ;
            
            if( !$e ) {
              $e = document.createElement( v.tag || tag );
              
              $e.id = id;
              
              render( document, $e, v );
              
              $dom_node.appendChild( $e );
              
              return extend( { $dom_node: $e }, v );
            }
          } ) // map()
          
          .filter( function( v ) { return v } ) // filter-out undefined values (duplicates)
        ;
        
        return Super._add.call( this, added, options );
      }, // _add()
      
      _remove: function( removed, options ) {
        var l = removed.length;
        
        if( ! l  ) return this;
        
        var that      = this
          , $dom_node = this._$dom_node
        ;
        
        removed = removed
          .map( function( v ) {
            var id = that._make_id( v )
              , $e = $dom_node.querySelector( '#' + id )
            ;
            
            if( $e ) {
              $dom_node.removeChild( $e );
              
              return extend( { $dom_node: $e }, v );
            }
          } ) // map()
          
          .filter( function( v ) { return v } ) // filter-out undefined values (not found in DOM)
        ;
        
        return Super._remove.call( this, removed, options );
      } // _remove()
    } // TO_DOM() instance methods
  } ); // to_dom()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'TO_DOM': TO_DOM } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // to_dom.js
