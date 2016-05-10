/*  selector.js

    Copyright (c) 2013-2016, Reactive Sets

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
undefine()( 'selector', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  /* -------------------------------------------------------------------------------------------
      @function is_DOM( $node )
      
      @short Test if $node is a DOM element
      
      @returns:
        - true : $node is     a DOM element
        - false: $node is not a DOM element
  */
  function is_DOM( $node ){
    return typeof HTMLElement == "object"
      ? $node instanceof HTMLElement
      : $node
        && typeof $node          == "object"
        && $node.nodeType        == 1
        && typeof $node.nodeName == "string"
    ;
  } // is_DOM()
  
  /* -------------------------------------------------------------------------------------------
      @function has_class( $node, css_class )
      
      @short Test if $node has css_class
      
      @returns:
        - true : $node          contains css_class
        - false: $node does not contain  css_class
  */
  function has_class( $node, css_class ) {
    return $node.className
      .split( ' ' )
      
      .indexOf( css_class ) != -1
    ;
  } // has_class()
  
  /* -------------------------------------------------------------------------------------------
      @function add_class( $node, css_class )
      
      @short Add css_class to $node
  */
  function add_class( $node, css_class ) {
    if ( ! has_class( $node, css_class ) )
      $node.className += ( $node.className ? ' ' : '' ) + css_class
    ;
  } // add_class()
  
  /* -------------------------------------------------------------------------------------------
      @function remove_class( $node, css_class )
      
      @short Remove css_class from $node
  */
  function remove_class( $node, css_class ) {
    $node.className = $node.className
      .split( ' ' )
      
      .filter( function( _class ) { return _class && _class != css_class } )
      
      .join( ' ' )
    ;
  } // remove_class()
  
  /* -------------------------------------------------------------------------------------------
      @function wrap( wrapper, $node )
  */
  function wrap( wrapper, $node ) {
    wrapper.appendChild( $node.cloneNode( true ) );
    
    document.getElementsByTagName( 'body' )[ 0 ].replaceChild( wrapper, $node );
  } // wrap()
  
  /* -------------------------------------------------------------------------------------------
      @function $( selector )
  */
  var d = document, dom_selectors = {
      '#': d.getElementById           // #id
      
    , '.': d.getElementsByClassName   // .class
    
    , '<': d.getElementsByTagName     // <p
    
    , '@': d.getElementsByName        // @name
    
    , '?': d.querySelector            // ?selectors
    
    , '+': d.querySelectorAll         // +selectors
    
    , '[': function( attribute ) {    // [attribute]
        var matches = []
          , elements = this.getElementsByTagName( '*' )
        ;
        
        attribute = attribute.substr( 0, attribute.length - 1 ); // remove leading ]
        
        for ( var i = -1, l = elements.length; ++i < l; ) {
          var e = elements[ i ];
          
          if ( e.hasAttribute( attribute ) ) matches.push( e );
        }
                
        return matches;
      }
  }; // dom_selectors{}
  
  function $( selector ) {
    return dom_selectors[ selector[ 0 ] ].call( d, selector.slice( 1 ) );
  } // $()
  
  /* -------------------------------------------------------------------------------------------
     DOM node class pipelets
  */
  rs
    /* -----------------------------------------------------------------------------------------
        @pipelet $add_class( css_class, options )
        
        @short Add or remove css_class to $node attribute if not present
        
        @description:
          Adds css class on "add" or "fetch" operation if not already present.
          
          Removes css class on "remove" operation if present.
          
          Source values provide $node attribute, which should be a DOM node. If
          none is present, nothing is done.
          
          This is a @@stateless, @@greedy, @@synchronous pipelet.
        
        @parameters:
          - css_class (String): a css class, e.g. "active"
          
          - options   (Object): @@pipelet options
        
        @emits all source values' attributes
    */
    .Compose( '$add_class', function( $source, css_class, options ) {
      return $source
        .alter( function( _, operation ) {
          _.$node
            && ( operation == 'add' || operation == 'fetch' ? add_class : remove_class )( _.$node, css_class )
          ;
        }, options )
      ;
    } ) // $add_class()
    
    /* -----------------------------------------------------------------------------------------
        @pipelet $has_class( css_class, options )
        
        @short Emits source values which have a $node attriute with css_class set
        
        @description:
          This is a @@stateless, @@greedy, @@synchronous pipelet.
        
        @parameters:
          - css_class (String): a css class, e.g. "active"
          
          - options   (Object): @@filter options
        
        @emits all source values' attributes
    */
    .Compose( '$has_class', function( $source, css_class, options ) {
      return $source
        .filter( function( _ ) {
          var $node = _.$node;
          
          return $node && has_class( $node, css_class );
        }, options )
      ;
    } ) // $has_class()
    
    /* -----------------------------------------------------------------------------------------
        @pipelet $has_not_class( css_class, options )
        
        @short Emits source values which have a $node attriute without css_class set
        
        @description:
          This is a @@stateless, @@greedy, @@synchronous pipelet.
        
        @parameters:
          - css_class (String): a css class, e.g. "active"
          
          - options   (Object): @@filter options
        
        @emits all source values' attributes
    */
    .Compose( '$has_not_class', function( $source, css_class, options ) {
      return $source
        .filter( function( _ ) {
          var $node = _.$node;
          
          return $node && ! has_class( $node, css_class );
        }, options )
      ;
    } ) // $has_not_class()
    
    /* -------------------------------------------------------------------------------------------
       module exports
    */
    .RS.add_exports( {
      'is_DOM'      : is_DOM,
      'has_class'   : has_class,
      'add_class'   : add_class,
      'remove_class': remove_class,
      'wrap'        : wrap,
      '$'           : $
    } )
  ;
  
  return $;
} ); // selector.js
