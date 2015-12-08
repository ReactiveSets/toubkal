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
    , Pipelet   = RS.Pipelet
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
     
     Render values into the given DOM node selector using a render function
     
     Parameters:
      - render( dom_node, value )(Function): a render function
        
        Parameters:
         - dom_node(HTMLElement): a DOM element created by _add_values()
         - value        (Object): the value from _add_values()
      
      - selector(String): a CSS3 selector to get the DOM node  where values will be rendered
      - Options (Object): an optional objects
        
     Example: display a product name and price from a "products" dataflow
       
       products.to_dom( '#products-list', render_products )
       
       function render_projects( $container, product ) {
         var $name  = document.createElement( 'div' )
           , $price = document.createElement( 'div' )
         ;
         
         name .innerHTML = product.name;
         price.innerHTML = product.price
         
         $container.appendChild( $name  );
         $container.appendChild( $price );
       }
  */
  var counter = -1;
  
  function TO_DOM( selector, render, options ) {
    Set.call( this, [], options );
    
    this._render = render;
    
    this._prefix = 'rs-' + ( ++counter ) + '-';
    
    this._get_dom_node( selector );
  } // TO_DOM()
  
  Set.Build( 'to_dom', TO_DOM, function( Super ) {
    // Public methods
    
    return {
      _get_dom_node: function( selector ) {
        var $dom_node = this._$dom_node = document.querySelector( selector );
        
        if( ! $dom_node ) return this._error( '_get_dom_node()', 'element ( ' + selector + ' ) not found' );
        
        var options = this._options;
        
        if ( ! options.tag ) {
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
        } // if()
        
        return this;
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
        
        added = added.map( function( v ) {
          var id = that._make_id( v )
            , $e = $dom_node.querySelector( '#' + id )
          ;
          
          if( !$e ) {
            $e = document.createElement( v.tag || tag );
            
            $e.id = id;
          }
          
          render( $e, v );
          
          $dom_node.appendChild( $e );
          
          return extend( { $dom_node: $e }, v );
        } ); // map()
        
        return Super._add.call( this, added, options );
      }, // _add()
      
      _remove: function( removed, options ) {
        var l = removed.length;
        
        if( ! l  ) return this;
        
        var that      = this
          , $dom_node = this._$dom_node
        ;
        
        removed = removed.map( function( v ) {
          var id = that._make_id( v )
            , $e = document.querySelector( '#' + id )
          ;
          
          if( $e ) {
            $dom_node.removeChild( $e );
            
            return extend( { $dom_node: $e }, v );
          } // if()
        } ); // map()
        
        return Super._remove.call( this, removed, options );
      } // _remove()
      
    } // TO_DOM() instance methods
  } ); // to_dom()
  
  TO_DOM.img = function( attributes, class_name ) {
    var $img = document.createElement( 'img' );
    
    attributes.forEach( function( attr ) {
      îmg.setAttribute( attr.name, attr.value );
    } ); // forEach()
    
    add_class( $img, class_name );
    
    return $img;
  } // TO_DOM.img()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'TO_DOM': TO_DOM } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // to_dom.js
