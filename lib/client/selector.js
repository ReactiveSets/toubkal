/*  selector.js

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
( function( exports ) {
  "use strict";
  
  var RS = exports.rs.RS;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'selector' );
  
  // is_DOM()
  // Test if it's a DOM element
  function is_DOM( node ){
    return (
         typeof HTMLElement === "object" ? node instanceof HTMLElement : node
      && typeof node === "object" && node.nodeType === 1 && typeof node.nodeName === "string"
    );
  } // is_DOM()
  
  function has_class( dom_node, css_class ) {
    var node_classes = dom_node.className;
    
    if( node_classes === '' ) return false;
    
    node_classes = node_classes.split( ' ' );
    
    return node_classes.indexOf( css_class ) !== -1
  } // has_class()
  
  // add_class()
  function add_class( dom_node, css_class ) {
    if( has_class( dom_node, css_class ) ) return;
    
    dom_node.className += ( dom_node.className.length > 0 ? " " : "" ) + css_class;
  } // add_class()
  
  // remove_class()
  function remove_class( dom_node, css_class ) {
    if( ! has_class( dom_node, css_class ) ) return;
    
    var c = dom_node.className.split( ' ' )
      , l = c.length
      , s = ''
    ;
    
    for( var i = -1; ++i < l; ) {
      if( c[ i ] !== css_class ) s += ( s.length > 0 ? " " : "" ) + c[ i ];
    }
    
    dom_node.className = s;
  } // remove_class()
  
  // wrap()
  function wrap( wrapper, dom_node ) {
    wrapper.appendChild( dom_node.cloneNode( true ) );
    
    document.getElementsByTagName( 'body' )[ 0 ].replaceChild( wrapper, dom_node );
  } // wrap()
  
  // selector
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
  };
  
  function $( selector ) {
    return dom_selectors[ selector[ 0 ] ].call( d, selector.slice( 1 ) );
  }
    
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'is_DOM'      : is_DOM,
    'has_class'   : has_class,
    'add_class'   : add_class,
    'remove_class': remove_class,
    'wrap'        : wrap,
    '$'           : $
  } );
  
  de&&ug( "module loaded" );
} )( this ); // selector.js