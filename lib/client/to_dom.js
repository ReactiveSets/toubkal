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
    , Greedy    = RS.Greedy
    , extend    = RS.extend
    , ug        = RS.log
    , de        = false
  ;
  
  /* -------------------------------------------------------------------------------------------
      $to_dom( selector, options )
      
      Render source values into parent DOM nodes.
      
      Duplicates are not re-added into the DOM, but are emitted, allowing to edit a DOM tree
      optionally built on the server either to reduce latency or for SEO purposes.
      
      This is a synchronous, stateless, greedy pipelet. Although stateless from
      a pipelet standpoint, not storing node values, it has side-effects on the DOM
      which are technicaly stateful.
      
      Source values' attributes:
      - tag (String): optional name of tag to create element, default is options.tag or
        calculated tag (see bellow)
      
      - $node (HTMLElement): optional reference to parent node, default is defined by
        selector parameter of the $to_dom() pipelet
      
      - content (String): optional element content, added using innerHTML
      
      - attributes (Object): optional element attributes
      
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
      
      Example:
      
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
  
  function $TO_DOM( selector, options ) {
    var that = this;
    
    options.name += '#' + ++counter;
    
    // Make output stateful, using __transform() to retrieve $node attribute
    that._output = that._output || new Greedy.Output( that, options.name );
    
    // Use Set that allows to call _add_value() and _remove_value()
    Set.call( that, [], options );
    
    that._prefix = 'to_dom-' + counter + '-';
    
    that._node = null;
    
    switch( typeof selector ) {
      case 'string':
        that._$node = document.querySelector( selector )
          || this._error( '$TO_DOM', 'selector not found:' + selector )
        ;
      break;
      
      case 'object':
        selector && selector
          ._output
          .on( 'add', set_node )
          .on( 'remove', clear_node )
          .on( 'update', update_node )
          .fetch_all( set_node )
        ;
    }
    
    that._default_tag();
    
    function clear_node( done ) {
      // Clear all children nodes and values
      that
        ._input
        .fetch_source_all( function receiver( values ) {
          that._remove( values );
          
          // !!! Set that._$node to null only after removal of values, otherwise elements cannot be removed
          that._$node = null;
          
          typeof done == 'function' && done();
        } )
      ;
    } // clear_node()
    
    function set_node( values ) {
      if ( values.length && ( that._$node = values[ 0 ].$node || null ) ) {
        that._default_tag();
        
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
      _default_tag: function() {
        var options = this._options
          , $node   = this._$node
          , tag     = 'div'
        ;
        
        if ( this._tag = options.tag ) return;
        
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
        
        this._tag = tag;
      }, // _default_tag()
      
      _get_node: function( value ) {
        var $parent = value.$node || this._$node
          , id      = this._prefix + this.make_key( value );
        ;
        
        return {
          $parent: $parent,
          id     : id,
          $node  : $parent && $parent.querySelector( '#' + id )
        };
      }, // _get_node()
      
      // Transform is called by Greedy.Output.._fetch() only
      __transform: function( values ) {
        var that = this;
        
        return values.map( function( value ) {
          return extend( {}, value, { $node: that._get_node( value ).$node } );
        } );
      }, // __transform()
      
      _add_value: function( t, value ) {
        var that    = this
          , name    = de && that._get_name( '_add_value' )
          , node    = that._get_node( value )
          , $parent = node.$parent
          , $node   = node.$node
        ;
        
        if ( $parent ) {
          if ( ! $node ) {
            de&&ug( name, 'creating and appending child:', value );
            
            $node = document.createElement( value.tag || that._tag );
            
            $node.id = node.id;
            
            if ( value.content ) $node.innerHTML = value.content;
            
            extend( $node, value.attributes );
            
            $parent.appendChild( $node );
          }
          
          // Emit values directly, don't store value into Set's state
          t.__emit_add( [ extend( {}, value, { $node: $node } ) ] );
        } else {
          de&&ug( name, 'no parent' );
          
          t.emit_nothing();
        }
      }, // _add_value()
      
      _remove_value: function( t, value ) {
        var node = this._get_node( value )
          , $node = node.$node
        ;
        
        $node && node.$parent.removeChild( $node );
        
        /*
           Never emit removed $node so that downstream pipelets don't attempt to
           remove children of this child which is no-longer in the document.
           
           This is questionable because it means that emitted removes don't match
           emitted adds.
        */
        if ( value.$node ) {
          value = extend( {}, value );
          
          delete value.$node;
        }
        
        // Emit values directly, don't store value into Set's state
        t.__emit_remove( [ value ] );
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
