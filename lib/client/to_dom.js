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
    , log       = RS.log
  ;
  
  /* -------------------------------------------------------------------------------------------
      $to_dom( selector, render, options )
      
      Render source values into parent DOM nodes.
      
      Duplicates are not re-added into the DOM, but are emitted, allowing to edit a DOM tree
      optionally built on the server either to reduce latency or for SEO purposes.
      
      This is a synchronous, stateful, greedy pipelet.
      
      Source values' attributes:
      - tag (String): optional name of tag to create element, default is options.tag or
        calculated tag (see bellow)
      
      - $node (HTMLElement): optional reference to parent node, default is defined by
        selector parameter of the $to_dom() pipelet
      
      - content (String): optional element content, added using innerHTML
      
      Emitted values include a '$node' attribute of added and removed DOM elements. It
      may be used to invoke $to_dom() to create grand-children nodes by downstream uses
      of $to_dom().
      
      Parameters:
      - selector: optional parent node selector
        - (String): a CSS3 selector to get the DOM node where values will be rendered
        - (Pipelet): a stateful dataflow which state has one value, and which attribute
          '$node' is a reference to the parent node for source values. When added, all
          children nodes are rendered and emitted, when removed, all children nodes are
          removed.
        - (undefined or null): source values should contain a $node attribute.
      
      - render (Function ( Document document, HTMLElement $node, Object value ) -> ): optional
        rendering function for added values into container node.
        
        Parameters:
        - document   (Document): Providing access to the global document
        - $node   (HTMLElement): element created to hold added value
        - value        (Object): added value
        - $parent (HTMLElement): parent node of element once appended after render() returns
      
      - Options (Object): Pipelet options plus the following additional options:
        - tag (String): value containers tag name, default depends on parent tag name:
          tr        -> th if tr grand-parent is     a thead
          tr        -> td if tr grand-parent is NOT a thead
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
      
      Examples:
      
      - display a product list from a server "products" dataflow into parent #products-list.
        For each  product, display name and price:
        
        rs
          .socket_io_server()
          .flow( 'products' )
          .$to_dom( '#products-list', render_product )
        ;
        
        function render_project( document, $container, product ) {
          var $name  = document.createElement( 'p' )
            , $price = document.createElement( 'p' )
          ;
          
          $name .innerHTML = product.name;
          $price.innerHTML = product.price
          
          $container.appendChild( $name  );
          $container.appendChild( $price );
        }
      
      - Render list of all "tablet" products from a server "products" dataflow into parent
        #products-list. For each tablet, display name and price, using $query_selector()
        and without using a render() function to $to_dom():
        
        rs
          .socket_io_server()
          
          .filter( [ { flow: 'products', line: 'tablets' } ] )
          
          .$to_dom( rs.$query_selector( '#products-list' ) )
          
          .flat_map( function( v ) {
            return [ 'name', 'price' ].map( function( name ) {
              return {
                id     : v.id + '-' + name,
                tag    : 'p',
                content: v[ name ],
                $node  : v.$node
              }
            } )
          } )
          
          .$to_dom() // no selector necessary as it comes with source data
        ;
  */
  var counter = 0; // instance counter
  
  function $TO_DOM( selector, render, options ) {
    var that = this;
    
    Set.call( that, [], options );
    
    that._render = render;
    
    that._prefix = 'to_dom-' + ++counter + '-';
    
    that._node = null;
    
    switch( typeof selector ) {
      case 'string':
        that._get_dom_node( selector );
      break;
      
      case 'object':
        selector && selector
          ._ouptut
          .on( 'add', set_node )
          .on( 'remove', clear_node )
          .on( 'update', update_node )
          .fetch_all( set_node )
        ;
    }
    
    that._default_tag();
    
    function clear_node( done ) {
      that._$node = null;
      
      // Clear all children nodes and values
      that
        ._input
        .fetch_source_all( function receiver( values ) {
          that._remove( values );
          
          typeof done == 'function' && done();
        } )
      ;
    } // clear_node()
    
    function set_node( values ) {
      if ( that._$node = values[ 0 ].$node || null ) {
        // Add all children nodes and values
        that
          ._input
          .fetch_source_all( function receiver( values ) {
            that._add( values );
          } )
        ;
      }
    } // set_node()
    
    function update_node( updates ) {
      var value = updates[ 0 ][ 1 ];
      
      if ( value.$node != that._$node ) {
        clear_node( function() {
          set_node( [ value ] )
        } )
      }
    } // update_node()
  } // $TO_DOM()
  
  Set.Build( '$to_dom', $TO_DOM, function( Super ) {
    // Public methods
    return {
      _get_dom_node: function( selector ) {
        var $node = this._$node = document.querySelector( selector );
        
        if ( ! $node )
          return this._error( '_get_dom_node()', 'element ( ' + selector + ' ) not found' )
        ;
      }, // _get_dom_node()
      
      _default_tag: function() {
        var options = this._options
          , $node   = this._$node
          , tag     = 'div'
        ;
        
        if ( options.tag ) return;
        
        if ( $node ) {
          tag = {
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
          }[ $node.tagName ] || tag;
          
          if ( tag == 'td' && $node.parentNode.tagName == 'THEAD' ) tag = 'th';
        }
        
        options.tag = tag;
      }, // _default_tag()
      
      _make_id: function( v ) {
        return this._prefix + this.make_key( v );
      }, // _make_id()
      
      _add_value: function( t, value ) {
        var that    = this
          , $parent = value.$node || that._$node
          , id
          , $e
        ;
        
        if ( $parent ) {
          id = that._make_id( value );
          $e = $parent.querySelector( '#' + id );
          
          if ( that._b_index_of( value ) == -1 && !$e ) {
            $e = document.createElement( value.tag || that._options.tag );
            
            $e.id = id;
            
            if ( value.content ) $e.innerHTML = value.content;
            
            that._render && that._render( document, $e, value, $parent );
            
            $parent.appendChild( $e );
          }
          
          Super._add_value.call( that, t, extend( {}, value, { $node: $e } ) );
        } else {
          t.emit_nothing();
        }
      }, // _add_value()
      
      _remove_value: function( t, value ) {
        var that    = this
          , $parent = value.$node || that._$node
          , $e
        ;
        
        value = extend( {}, value );
        
        if ( $parent
          && ( $e = $parent.querySelector( '#' + that._make_id( value ) ) )
        ) {
          $parent.removeChild( $e );
          
          value.$node = $e;
        } else {
          delete value.$node;
        }
        
        Super._remove_value.call( that, t, value );
      } // _remove_value()
      
      // ToDo: implement _update_value() to only update changes on the DOM
    } // $TO_DOM() instance methods
  } ); // $to_dom()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { '$TO_DOM': $TO_DOM } );
  
  return rs;
} ); // to_dom.js
