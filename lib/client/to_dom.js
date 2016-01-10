/*  to_dom.js
    
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
        
        - (Pipelet): a dataflow which state has one value, and which attribute '$node' is a
          reference to the parent node for source values. When added, all children nodes are
          rendered and emitted, when removed, all children nodes are removed.
        
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
    
    // Make output stateless, using __transform() with _fetch() to retrieve $node attribute
    that._output = that._output || new Greedy.Output( that, options.name );
    
    // Use Set that allows to call _add_value() and _remove_value()
    Set.call( that, [], options );
    
    that._prefix = 'to_dom-' + counter + '-';
    
    that._node = null;
    
    switch( typeof selector ) {
      case 'string':
        that._$node = document.querySelector( selector )
          || that._error( '$TO_DOM', 'selector not found:' + selector )
        ;
      break;
      
      case 'object':
        selector && that._add_input( selector, Greedy.Input, options.name + ' selector', {
          _add   : set_node,
          _remove: clear_node,
          _update: update_node
        } )
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
        // ToDo: implement a transaction
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
          , key     = this.make_key( value )
          , id      = this._prefix + key;
        ;
        
        return {
          $parent: $parent,
          key    : key,
          id     : id,
          $node  : $parent && $parent.querySelector( '#' + id )
        };
      }, // _get_node()
      
      // Transform is called by Pipelet.Output.._fetch() only
      __transform: function( values ) {
        var that = this;
        
        return values.map( function( value ) {
          return extend( {}, value, { $node: that._get_node( value ).$node } );
        } );
      }, // __transform()
      
      _update_value: function( t, removed, added ) {
        var node  = this._get_node( added )
          , $node = node.$node
        ;
        
        if ( ! $node
          || removed.tag != added.tag
          || node.key != this.make_key( removed )
        ) {
          // This should not happen, but if it does, splitting the update will work
          this._remove_value( t, removed );
          this.   _add_value( t, added   );
          
          return;
        }
        
        if ( removed.content !== added.content ) {
          de&&ug( 'update content:', added.content );
          
          $node.innerHTML = added.content || '';
        }
        
        // Workaround a Chrome bug that does not update style properties
        // http://stackoverflow.com/questions/32980358/li-marker-character-color-not-updating-in-chrome
        var redraw = false;
        
        object_diff( added.attributes, removed.attributes, set_attribute, remove_attribute );
        
        if ( redraw ) {
          // This is a hack to force a redraw when Chrome does not update css properties
          var visibility = $node.style.visibility;
          
          if ( visibility != 'hidden' ) {
            $node.style.visibility = 'hidden';
            
            // Restore visibility 100 miliseconds later to force redraw
            setTimeout( function() { $node.style.visibility = visibility }, 100 );
          }
        }
        
        // Emit removed node, because a children may be removed downstream
        removed = extend( {}, removed, { $node: $node } );
        added   = extend( {}, added  , { $node: $node } );
        
        t.emit_nothing(); // we emit only one operation with __emit_update()
        
        t.__emit_update( [ [ removed, added ] ] )
        
        function set_attribute( a, added, removed ) {
          if ( a == 'style' ) {
            object_diff( parse_style( added ), parse_style( removed ), set_style, remove_style );
          } else {
            // ToDo: implement class object
            
            de&&ug( 'set attribute:', a, added );
            
            $node.setAttribute( a, added );
          }
        } // set_attribute()
        
        function remove_attribute( a ) {
          redraw = true;
          
          de&&ug( 'remove attribute:', a );
          
          $node.removeAttribute( a )
        } // remove_attribute()
        
        function set_style( p, added ) {
          redraw = true;
          
          de&&ug( 'set style property:', p, added );
          
          $node.style[ p ] = added;
        } // set_style()
        
        function remove_style( p ) {
          redraw = true;
          
          de&&ug( 'remove style property:', p );
          
          $node.style[ p ] = '';
        } // remove_style()
      }, // _update_value()
      
      _add_value: function( t, value ) {
        var that       = this
          , name       = de && that._get_name( '_add_value' )
          , node       = that._get_node( value )
          , $parent    = node.$parent
          , $node      = node.$node
          , attributes = value.attributes
        ;
        
        if ( $parent ) {
          if ( ! $node ) {
            de&&ug( name, 'creating and appending child:', value, ', transaction: ', t );
            
            $node = document.createElement( value.tag || that._tag );
            
            $node.id = node.id;
            
            if ( value.content ) $node.innerHTML = value.content;
            
            attributes && Object.keys( attributes ).forEach( function( a ) {
              if ( a == 'style' ) {
                extend( $node.style, parse_style( attributes[ a ] ) );
              } else {
                $node.setAttribute( a, attributes[ a ] )
              }
            } );
            
            var emit_options = t.emit_options
              , locations = emit_options && emit_options.locations
            ;
            
            if ( locations ) {
              // ToDo: fix Transaction that provides the locations of previous remove instead of add
              var location = locations[ 0 ];
              
              de&&ug( 'insert before:', location, $parent.children[ location ] );
              
              $parent.insertBefore( $node, $parent.children[ location ] );
              
              // deleting emit_options.locations will delete them or the entire transaction
              // ToDo: find a mechanism allowig multiple location changes
              // ToDo: handle moves
              delete emit_options.locations;
            } else {
              $parent.appendChild( $node );
            }
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
    } // $TO_DOM() instance methods
  } ); // $to_dom()
  
  function object_diff( added, removed, set, remove ) {
    removed && Object.keys( removed ).forEach( function( p ) {
      ( added && added.hasOwnProperty( p ) ) || remove( p, removed[ p ] )
    } );
    
    added && Object.keys( added ).forEach( function( p ) {
      ( removed && added[ p ] === removed[ p ] ) || set( p, added[ p ], removed && removed[ p ] )
    } );
  } // object_diff()
  
  function parse_style( style ) {
    switch( typeof style ) {
      case 'undefined':
      case 'object':
      return style || {};
    }
    
    var _style = {};
    
    style.split( ';' ).forEach( function( v ) {
      v = v.split( ':' );
      
      var a     = trim( v[ 0 ] )
        , value = trim( v[ 1 ] )
      ;
      
      if ( a ) _style[ a ] = value || '';
      
      function trim( s ) {
        return s && s
          .replace(/^[\s\uFEFF\xA0]+/ , '' )
          .replace( /[\s\uFEFF\xA0]+$/, '' )
        ;
      }
    } );
    
    return _style;
  } // parse_style()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { '$TO_DOM': $TO_DOM } );
  
  return rs;
} ); // to_dom.js
