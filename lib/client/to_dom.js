/*  to_dom.js
    
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
( 'to_dom', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS          = rs.RS
    , Transaction = RS.Transactions.Transaction
    , Set         = RS.Set
    , Greedy      = RS.Greedy
    , extend      = RS.extend
    , object_diff = RS.object_diff
    , log         = RS.log.bind( null, 'to_dom.js' )
    , ug          = log
    , de          = false
  ;

  /* --------------------------------------------------------------------------
      @pipelet $to_dom( selector, options )
      
      @short Render source values into parent DOM nodes.
      
      @parameters
      - **selector**: optional parent node selector
        - (String): a CSS3 selector to get the DOM node where values will be
          rendered
        
        - (Pipelet): a dataflow which state has zero or one value, and which
          attribute ```$node``` is a reference to the parent node for source
          values. When added, all children nodes are rendered and emitted,
          when removed, all children nodes are removed.
        
        - (HTMLElement): HTMLElement instance
        
        - (Object): non-pipelet with a $node property
        
        - (falsy): source values should contain a ```$node``` attribute.
      
      - **options** (Object):
        - **name** (String): @@class:Loggable name for this pipelet, default
          is "to_dom"
        
        - **key** (Array): pipelet @@key
        
        - **tag** (String): transactions' synchronization tag
        
        - **html_tag** (String): value containers tag name, default is
          calculated from parent node's tag name:
          
          Parent node      | Child node
          -----------------|-------------------------------------------------------------
          **\\<tr>**       | **\\<th>** if **\\<tr>** parent is     a **\\<thead>**
          **\\<tr>**       | **\\<td>** if **\\<tr>** parent is not a **\\<thead>**
          **\\<ul>**       | **\\<li>**
          **\\<ol>**       | **\\<li>**
          **\\<select>**   | **\\<options>**
          **\\<optgroup>** | **\\<options>**
          **\\<datalist>** | **\\<options>**
          **\\<form>**     | **\\<input>**
          **\\<table>**    | **\\<tr>**
          **\\<thead>**    | **\\<tr>**
          **\\<tbody>**    | **\\<tr>**
          **\\<tfoot>**    | **\\<tr>**
          **\\<colgroup>** | **\\<col>**
          **\\<nav>**      | **\\<a>**
          **\\<menu>**     | **\\<button>**
          **\\<map>**      | **\\<array>**
          Any other tag    | **\\<div>**
      
      @source
      - attributes of the @@key (see option key), defining values @@identity
      
      - **id** (String): optional, used to set the *id* property of created
        HTML elements. See description section bellow regarding how
        HTML elements ids are built from this id attribute.
      
      - **$node** (HTMLElement): optional reference to parent node, default is
        defined by the ```selector``` parameter of this pipelet. If present
        it can be used to calculate element tag (see bellow).
      
      - **tag** (String): optional name of tag to create element, default is
        calculated depending on the presence of ```$node``` source
        attribute:
        - present: tag is calculated from ```$node``` as parent tag
        - abscent: tag is calculated from node found using parameter
          ```selector``` as parent node.
        
        Tag calculation is the same as for option ```html_tag``` above.
      
      - **content** (String): optional element content, added by setting
        the innerHTML property of the created Element.
      
      - **attributes** (Object): optional DOM Element attributes, or
        properties:
        
        - When setting attributes, behavior is complex using either
          ```Element..setAttribute( property_name, value )``` or
          directly setting a property of the Element Object using
          ```Element.property_name = value```.
          
          Most of the times these are equivalent, but not always,
          so in these cases it is important to understand the rules
          and consequences:
          
          - The *style* attribute is always set by setting a property
            of ```Element.style``` Object, e.g.:
            ```Element.style.color = "green"```.
            
            To do so, if the style value is a *string* it is first
            parsed into an Object of property / value pairs.
            
            So providing the stlyle attribute directly as an Object
            is more efficient because no parsing is required.
          
          - For attributes other than *style*, if the added property
            value is a String or if its name starts with *"data-"*
            [(data-* global attributes -- MDM)](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*),
            it is set using ```Element.setAttribute()```, otherwise it
            is set by setting the Element property directly.
            
            In particular this allows to force all Boolean values to
            be set as properties. This is essential for some properties
            such as *checked* of an *HTMLInputElement*
            [(HTMLInputElement -- MDM)](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement)
            which can otherwise be desynchronized with the attribute
            value after a user has clicked on the corresponding checkbox.
            In this case, setting the property allows to effectively
            change the value of the *checked* property while using
            ```Element.setAttribute()``` would only set the value of
            the attribute.
            
            Consequently these attributes set as properties instead
            of *setAttribute()* may not be seen if one attempts to read
            property values using
            ```Element.getAttribute( property_name )```, or
            ```Element.hasAttribute( property_name )```, or
            ```Element.attributes``` property.
            
            For more information on the differences between elements
            attributes and properties check this article:
            [Attributes and properties -- javascript.info](https://javascript.info/dom-attributes-and-properties).
        
        - When removing attributes, if the Element has a property of the
          same name and of boolean type, it is set to the value *"false"*,
          otherwise it is removed using
          ```Element.removeAttribute( property_name )```.
      
      @emits
      - all source attributes except *$node*, implying that this pipelet
        has the same key as its source.
      
      - **$node** (HTMLElement): of the created element. This is a child
        Element of either the *selector $node* or the *source $node*.
      
      @examples
      - Render list of all "tablet" products from a server "products"
        dataflow into parent #products-list. For each tablet, display
        name, price, and a delete button:
        
        ```javascript
          rs
            .socket_io_server()
            
            .filter( [ { flow: 'products', line: 'tablets' } ] )
            
            .order( [ { id: 'name' } ] ) // by ascending name
            
            // first to_dom renders a <div> for name and price
            .$to_dom( rs.once().$query_selector( '#products-list' ) )
            
            // build two <p> elements for name and price and a delete button
            .flat_map( function( tablet ) {
              return [ 'name', 'price', 'delete' ].map( function( attribute, i ) {
                return {
                  id     : tablet.id + '-' + attribute,
                  order  : i,
                  tag    : 'p',
                  content: i < 2 ? tablet[ attribute ] : 'Delete',
                  $node  : v.$node
                }
              } )
            } )
            
            .optimize() // only update name or price if only one of them was updated on server
            
            .order( [ { id: 'order' } ] )
            
            .$to_dom() // no selector necessary as parent node comes from source data
            
            .filter( [ { order: 2 } ] )
            
            .$on( 'click' )
            
            .map( function( _ ) {
              // .. handle click event
            } )
          ;
        ```
        Using:
        - Pipelet $query_selector()
        - Pipelet $on()
        - Pipelet socket_io_server()
        - Pipelet filter()
        - Pipelet order()
        - Pipelet flat_map()
        - Pipelet optimize()
        - Pipelet map()
      
      @description
      This is a @@synchronous, @@stateful, @@greedy pipelet.
      
      This pipelet never attempts to read the DOM. When fetched
      if fetches upstream values and adds the *$node* attribute.
      
      Duplicates are not re-added into the DOM, but are emitted,
      allowing to edit a DOM tree optionally built on the server
      either to reduce latency or for SEO purposes.
      
      If source values come ordered using an upstream pipelet
      order(), which is the recommanded pattern, they will be
      rendered in such sort order. This ordering is optimally
      performed thanks to locations and moves provided with
      @@[operations]operation options.
      
      Emitted values include the ```$node``` attribute of added
      HTML elements. This attribute may be used downstream of
      ```$to_dom()``` to create grand-children nodes or listen
      to events using pipelet $on().
      
      DOM ```"id"``` attributes are set to allow removal, and
      dupicates detection, they may also be used as html bookmarks
      or references in CSS rules and are set by the following
      process:
      
      1) A unique identifier is built from source values attributes
        defined by the set key (see option key).
      
      2) If the identifier is not a string, or is an empty string,
        ```"id"``` is set to:
          - the name of the pipelet (```"to_dom"``` by default),
          - followed by ```"-"```,
          - followed by a locally unique number,
          - followed by ```"-"```,
          - followed by the identifier from step 1 above,
          
          e.g. ```"to_dom-16-5"```.
      
      3) If the identifier is a non-empty string, starting with a
        numeric character or a space, ```"id"``` is prepended
        with the underscore character ```"_"```.
        
        e.g. ```"_4a7ef56"```
      
      4) If the identifier is a non-empty string, starting with a
        non-numeric and not-a-space character, id is the identifier
        built from step 1 above, e.g. ```"image_details"```.
      
      5) Characters not in the class ```[_\\-0-9a-zA-Z]``` are
        replaced by the underscore character.
  */
  var counter = 0; // instance counter
  
  function $TO_DOM( selector, options ) {
    var that = this
      , name = options.name + '#' + ++counter
    ;
    
    options = extend( {}, options, { name: name } );
    
    // Make output stateless, using fetch() _transform() to retrieve $node attribute
    that._output = that._output || new Greedy.Output( that, options );
    that._output._transform = fetch_transform;
    
    // ToDo: Instead of a set, use a transform allowing to distingish between adds and removes
    // For now, use Set that calls derived _add_value(), _remove_value(), and _update_value()
    Set.call( that, [], options );
    
    that._prefix = 'to_dom-' + counter + '-';
    
    that._$node = null;
    that._$new_node = null;
    
    switch( typeof selector ) {
      case 'string':
        that._$node = document.querySelector( selector )
          || that._emergency( '$TO_DOM', 'selector not found:' + selector )
        ;
      break;
      
      case 'object':
        // ToDo: implement transaction union tag synchronization between selector input and to_dom() main input
        if ( selector )
          if ( selector.$node )
            that._$node = selector.$node;
          else if ( RS.is_DOM( selector ) )
            that._$node = selector;
          else
            that._add_input( selector, Greedy.Input, name + ' selector', {
              _add   : set_node,
              _remove: clear_node,
              _update: update_node
            } )
    }
    
    get_tag();
    
    function get_tag() {
      that._tag = options.html_tag || that._get_tag( that._$node );
    } // get_tag()
    
    function clear_node( values, options ) {
      that._$new_node = null;
      
      update( options );
    } // clear_node()
    
    function set_node( values, options ) {
      var $node = values.length && values[ 0 ].$node;
      
      if ( $node ) that._$new_node = $node;
      
      update( options );
    } // set_node()
    
    function update_node( updates, options ) {
      var value = updates.length && updates[ 0 ][ 1 ]
        , $node = value && value.$node
      ;
      
      if ( $node ) that._$new_node = $node;
      
      update( options );
    } // update_node()
    
    // update node only at the end of selector change transaction
    function update( options ) {
      var _t = options && options._t;
      
      if ( _t && _t.more ) return;
      
      if ( that._$node === that._$new_node ) {
        // Only forward end of transactions
        if ( _t ) that._add( [], options );
        
        return;
      }
      
      if ( options && ( options.locations || options.moves ) ) {
        options = extend( {}, options );
        
        delete options.locations;
        delete options.moves;
      }
      
      // need to update all children nodes, this can only be done by removing them all then adding them back
      that
        ._input
        .fetch_all( function receiver( values ) {
          switch( ( ( that._$new_node ? 2 : 0 ) + ( that._$node ? 1 : 0 ) ) * ( values.length ? 1 : 0 ) ) {
            case 3: // that._$new_node && that._$node && values.length
              // Need to update all nodes in a transaction
              // de&&ug( that._get_name( 'update selector' ), 3, values );
              
              var t = new Transaction( 2, options );
              
              that._remove( values, t.next_options() );
              
              // !!! Set new node only after removal of previous values, otherwise elements cannot be removed
              set_new_node()
              
              that._add( values, t.next_options() );
            break;
            
            case 2: // that._$new_node && values.length
              //de&&ug( that._get_name( 'update selector' ), 2, values );
              
              set_new_node()
              
              that._add( values, options );
            break;
            
            case 1: // that._$node && values.length
              // de&&ug( that._get_name( 'update selector' ), 1, values );
              
              that._remove( values, options );
            // pass-through
            case 0: // ! that._$new_node && ! that._$node || ! values.length
              // !!! Set that._$node to null only after removal of values, otherwise elements cannot be removed
              // de&&ug( that._get_name( 'update selector' ), 0, values );
              
              set_new_node()
          }
          
          function set_new_node() {
            if ( that._$node = that._$new_node )
              // Setup new default tag, only if new node is not null
              get_tag()
            ;
          } // set_new_node()
        } ) // receiver()
      ;
    } // update()
    
    // Synchronous transform for Output.._fetch()
    function fetch_transform( values ) {
      var out   = []
        , i     = -1
        , value
        , $node
      ;
      
      while ( value = values[ ++i ] )
        if ( $node = that._get_node( value ).$node )
          out.push( extend( {}, value, { $node: $node } ) );
      
      return out;
    } // fetch_transform()
  } // $TO_DOM()
  
  Set.Build( '$to_dom', $TO_DOM, function( Super ) {
     
    // Public methods
    return {
      _get_tag: function( $node ) {
        var tag = 'div';
        
        if( $node ) {
          tag = {
            TR: 'td', // will turn into 'th' bellow if <tr> parent node is <thead>
            
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
          
          if( tag == 'td' && $node.parentNode.tagName == 'THEAD' ) tag = 'th';
        }
        
        return tag;
      }, // _get_tag()
      
      _get_node: function( value ) {
        var $parent = value.$node || this._$node
          , key     = this._identity( value )
          , id      = key.slice( 1 ) // remove first '#' from identity
        ;
        
        // id must be composed of characters allowed by querySelector()
        id = id
          .replace( /[^_\-0-9a-zA-Z]/g, '_' )
          .replace( /^([^_a-zA-Z])/, '_$1' )
        ;
        
        return {
          $parent: $parent,
          key    : key,
          id     : id,
          $node  : $parent && $parent.querySelector( '#' + id )
        };
      }, // _get_node()
      
      _update_value: function( t, removed, added, move ) {
        var that    = this
          , node    = that._get_node( added )
          , $node   = node.$node
          , $parent = node.$parent
          , name    //= de && that._get_name( '_update_value' )
          
            // Workaround a Chrome bug that does not update style properties
            // http://stackoverflow.com/questions/32980358/li-marker-character-color-not-updating-in-chrome
          , redraw  = false
          , from
          , to
          , $at
        ;
        
        if ( ! $node
          || removed.tag != added.tag
          || node.key != this._identity( removed )
        ) {
          // This should not happen, but if it does, splitting the update will work
          that._remove_value( t, removed );
          that.   _add_value( t, added  , false, move && move.to   );
          
          return;
        }
        
        if ( removed.content !== added.content ) {
          de&&ug( name, 'update content:', added.content );
          
          $node.innerHTML = added.content || '';
        }
        
        object_diff( removed.attributes, added.attributes, set_attribute, remove_attribute );
        
        if ( move && ( from = move.from ) != ( to = move.to ) ) {
          // "to" is the insert location after "from" is removed
          // We need "to" to be the insert location before "from" is removed
          to > from && ++to;
          
          $at = $parent.children[ to ] || null;
          
          de&&ug( name, 'move from:', from, 'to:', to, '$node:', $node, '$at:', $at );
          
          $parent.insertBefore( $node, $at );
        } else if ( redraw ) {
          // This is a hack to force a redraw when Chrome does not update css properties
          // ToDo: check if we still need this hack with the latests versions of Chrome
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
        
        t.emit_nothing(); // we emit only one operation with update()
        
        t.update( [ [ removed, added ] ] )
        
        function set_attribute( a, added, removed ) {
          set_node_attribute( name, $node, a, added, removed );
        } // set_attribute()
        
        function remove_attribute( a ) {
          //de&&ug( name, 'remove_attribute:', a, ', getAttribute():', $node.getAttribute( a ), ', property value:', $node[ a ] );
          
          if ( typeof $node[ a ] == "boolean" ) {
          
            $node[ a ] = false
          
          } else {
            if ( a == 'style' ) redraw = true;
            
            $node.removeAttribute( a )
          
          }
          
          //de&&ug( name, 'after remove attribute:', a, ', type:', typeof $node[ a ], ', getAttribute():', $node.getAttribute( a ), $node[ a ] );
        } // remove_attribute()
      }, // _update_value()
      
      _add_value: function( t, value, emit_now, location ) {
        var that       = this
          , name       //= de && that._get_name( '_add_value' )
          , node       = that._get_node( value )
          , $parent    = node.$parent
          , $node      = node.$node
          , attributes = value.attributes
        ;
        
        if ( $parent ) {
          if ( ! $node ) {
            $node = document.createElement( value.tag || ( value.$node ? that._get_tag( $parent ) : that._tag ) );
            
            $node.id = node.id;
            
            if ( value.content ) $node.innerHTML = value.content;
            
            attributes && Object.keys( attributes )
              
              .forEach( function( a ) {
                set_node_attribute( name, $node, a, attributes[ a ] );
              } )
            ;
            
            var $at = typeof location == 'number' && $parent.children[ location ] || null;
            
            //de&&ug( name, 'insert before, content:', value.content, 'location:', location, 'at: ', $at && $at.innerHTML );
            
            $parent.insertBefore( $node, $at );
          }
          
          // Emit values directly, don't store value into Set's state
          t.add( [ extend( {}, value, { $node: $node } ) ] );
        } else {
          de&&ug( name, 'no parent' );
          
          t.emit_nothing();
        }
      }, // _add_value()
      
      _remove_value: function( t, value ) {
        var node = this._get_node( value )
          , $node = node.$node
        ;
        
        de&&ug( this._get_name( '_remove_value' ), 'value: ', value, '$node:', $node );
        
        $node && node.$parent.removeChild( $node );
        
        if ( $node ) {
          // Emit values directly, don't remove value from Set's state
          t.remove( [ extend( {}, value, { $node: $node } ) ] );
        } else {
          t.emit_nothing();
        }
      } // _remove_value()
    } // $TO_DOM() instance methods
  } ); // $to_dom()
  
  function set_node_attribute( name, $node, a, added, removed ) {
    if ( a == 'style' ) {
      // when removed is undefined, parse_style( removed ) returns {}
      object_diff( parse_style( removed ), parse_style( added ), set_style, remove_style )
    
    } else if ( typeof added == 'string' || a.slice( 0, 5 ) == 'data-' ) {
      //name && ug( name, 'set_node_attribute:', a, added, ', getAttribute():', $node.getAttribute( a ), ', property value:', $node[ a ] );
      
      $node.setAttribute( a, added )
      
      //name && ug( name, 'after setAttribute(), getAttribute():', $node.getAttribute( a ), ', property value:', $node[ a ] );
    
    } else {
      // do not use setAttribute, set as a node property to prevent desynchronization with property values
      // e.g. once the checked property is set after clicking, only setting the property will work, setAttribute() no-longer works
      $node[ a ] = added
      
      //name && ug( name, 'after setting node property:', a, ', value:', added, $node[ a ] );
    }
    
    function set_style( p, added ) {
      redraw = true;
      
      //name && ug( name, 'set style property:', p, added );
      
      $node.style[ p ] = added;
    } // set_style()
    
    function remove_style( p ) {
      redraw = true;
      
      //name && ug( name, 'remove style property:', p );
      
      $node.style[ p ] = '';
    } // remove_style()
  } // set_node_attribute()
  
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
  RS[ '$TO_DOM' ] = $TO_DOM;
  
  return rs;
} ); // to_dom.js
