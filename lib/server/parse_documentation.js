/*
    The MIT License (MIT)

    Copyright (c) 2016, Reactive Sets

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'parse_documentation', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS            = rs.RS
    , log           = RS.log.bind( null, 'documentation' )
    , de            = false
    , ug            = log
    , extend        = RS.extend
    , is_array      = RS.is_array
    , item_re       = /^(\s*)@([^@]\S*)\s+(\$?[a-zA-Z][\._a-zA-Z0-9]*)(.*)/
    , attribute_re  = /^(\s*)@([^@][_a-zA-Z]*):?\s*(.*)/
    , empty_line_re = /^\s*$/
    , top_level     = [ 'manual', 'chapter', 'term', 'namespace', 'flow', 'pipelet', 'function', 'class', 'class_method', 'method' ]
    , one_liners    = [ 'manual', 'section', 'api', 'short', 'title', 'is_a' ]
    , multiline     = [ 'parameters', 'source', 'emits', 'returns', 'description', 'instance_attributes', 'examples', 'throws' ]
    , item_tags     = one_liners.concat( multiline )
    , manuals
  ;
  
  return rs // only compose and function definitions bellow
  
  /* --------------------------------------------------------------------------
      @pipelet documentation_manuals( options )
      
      @short Toubkal documentation manuals metadata (not content)
      
      @emits:
      - flow (String): "documentation_manuals"
      
      - id (String): e.g. "introduction", "glossary", "architect", "reference", "guide", "programmer", "internal"
      
      - name (String): manual's human-readable name
      
      - module (String): optional source uri || path of file module where the manual is defined
      
      - range (Array): optional comment range in module
      
      @description:
      Toubkal manuals are defined using the ```@manual``` top-level
      documentation tag using its ```@short``` tag for the manual's
      title and its ```@description``` tag for its content.
      
      This is a @@stateful, @@synchronous, @@greedy, @@singleton.
  */
  .Singleton( 'documentation_manuals', function( source, options ) {
    var documentation_manuals = source.unique();
    
    manuals = documentation_manuals._a;
    
    return documentation_manuals
      // make it unique as we update the manuals Array
      
      .set_flow( 'documentation_manuals' )
    ;
  } ) // documentation_manuals()
  
  /* --------------------------------------------------------------------------
      @pipelet parse_documentation( options )
      
      @short Emit documentation items from parsed "comments" attribute.
      
      @parameters:
        - option (Object): pipelet options, key is forced to [ 'id' ]
      
      @source:
        - uri (String): optional source module uri
        
        - path (String): source file path
        
        - comments (Array of Object): comments in acorn format:
          - value (String): comment content without comment delimiters
          
          - range (Array): optional start and stop positions, e.g.
            [ 1347, 2554 ]
      
      @emits Documentation items:
      
      Attribute name      | type   | description
      --------------------|--------|----------------------------------------------------------------------
      id                  | String | ```type + "#" + name```, e.g. ```"pipelet#acorn"```
      type                | String | top-level item e.g. ```"manual", "chapter", "pipelet", "term", "class"```
      name                | String | name of documented item e.g. ```"acorn"```
      signature           | String | optional function or pipelet parameters signature e.g. "( options )"
      module              | String | optional source ```uri``` or ```path``` attribute
      range               | Array  | optional comment range
      short               | String | optional short description
      parameters          | Array  | optional parameters
      instance_attributes | Array  | optional class attributes
      source              | Array  | optional pipelet source attributes
      emits               | Array  | optional pipelet emited attributes
      returns             | Array  | optional function or method returned value
      description         | Array  | optional description
      examples            | Array  | optional examples
      is_a                | String | optional class parents
      throws              | Array  | optional list of conditions that throw errors
      manual              | String | optional manuals, one of: ```"introduction", "glossary", "architect", "reference", "guide", "programmer", "internal"```
      section             | String | optional manual section
      api                 | String | optional API maturity, e.g.: ```"experimental", "alpha", "beta", "stable", "deprecated"```
      other               | Object | optional other documentation item attributes.
      
      @description:
        This is a @@synchronous, @@stateless, @@greedy pipelet.
        
        When item type is ```"manual"```, it is also added to
        @@pipelet:documentation_manuals() using the ```"name"``` attribute
        for manual ```"id"``` and the ```"short"``` attribute for manual
        ```"name"```.
      
      @examples:
        - Parse documentation for 3 toubkal modules:
          ```javascript
          require( "toubkal" )
            .set([
              { name: "toubkal/lib/core/pipelet"               },
              { name: "toubkal/lib/server/toubkal_acorn"       },
              { name: "toubkal/lib/server/parse_documentation" }
            ] )
            
            .require_resolve()
            .watch()
            .acorn()
            .parse_documentation()
            .optimize()
            .trace()
            .greedy()
          ;
          ```
  */
  .Compose( 'parse_documentation', function( source, options ) {
    var documentation_manuals = source
          .namespace()
          .documentation_manuals()
    ;
    
    return source.flat_map( parse_module, extend( {}, options, { key: [ 'id' ] } ) );
    
    function parse_module( module ) {
      var uri_or_path = module.uri || module.path;
      
      return module.comments.reduce( parse_comment, [] );
      
      function parse_comment( items, comment ) {
        var content = comment.value
          , range   = comment.range
        ;
        
        // Get comments containing at least one @ character
        if ( content.indexOf( '@' ) != -1 ) {
          var state
            , matches
            , other_attributes
            , attribute
            , indent
            , item = {}
          ;
          
          content.split( '\n' ).forEach( parse_line );
          
          other_attributes && Object.keys( other_attributes ).forEach( fix_tags( other_attributes ) );
          
          item_tags.forEach( fix_tags( item ) );
          
          if ( item.type == 'manual' ) {
            // ToDo: handle removes and updates
            documentation_manuals._add( [
              { id: item.name, name: item[ 'short' ], module: uri_or_path, range: range }
            ] );
          }
        }
        
        return items;
        
        function parse_line( line ) {
          if ( state ) {
            if ( matches = attribute_re.exec( line ) ) {
              attribute = matches[ 2 ];
              
              attribute =
                (   item_tags.indexOf( attribute ) != -1
                  ? item
                  : other_attributes || ( other_attributes = item.other = {} )
                )
                [ attribute ] = []
              ;
              
              line = matches[ 3 ];
              
              if ( attribute == 'manual' && manuals.indexOf( line ) < 0 ) {
                // ToDo: Emit error
                log( 'Error, unknown manual: "' + line + '"' );
                
                return;
              }
              
              empty_line_re.test( line ) || attribute.push( line );
            } else if ( attribute ) {
              var l = indent;
              
              while ( l-- && line.charAt( 0 ) == ' ' ) line = line.substr( 1 );
              
              attribute.push( line ); // can be a blank line
            }
          } else if ( state = item_re.exec( line ) ) {
            // First line with a documentation tag
            indent        = state[ 1 ].length;
            
            var type      = state[ 2 ]
              , name      = state[ 3 ]
              , signature = state[ 4 ]
            ;
            
            if ( top_level.indexOf( type ) == -1 ) {
              state = null;
            } else {
              item.id         = type + '#' + name;
              item.type       = type;
              item.name       = name;
              
              if ( signature ) item.signature = signature;
              
              if ( uri_or_path ) item.module = uri_or_path;
              
              if ( range ) item.range = range;
              
              items.push( item );
            }
          }
        } // parse_line()
      } // parse_comment()
    } // parse_module()
  } ) // parse_documentation()
  
  /* --------------------------------------------------------------------------
      @pipelet documentation_markdown( options )
      
      @short Format documentation items into markdown
      
      @parameters:
      - option (Object): pipelet options, key is forced to [ 'id' ]
      
      @examples:
      - Parse documentation for 3 toubkal modules:
        ```javascript
        require( "toubkal" )
          .set([
            { name: "toubkal/lib/core/pipelet"               },
            { name: "toubkal/lib/server/toubkal_acorn"       },
            { name: "toubkal/lib/server/parse_documentation" }
          ] )
          
          .require_resolve()
          .watch()
          .acorn()
          .parse_documentation()
          .optimize()
          .documentation_markdown()
          .trace()
          .greedy()
        ;
        ```
      
      @source: Pipelet parse_documentation() attributes.
      
      @emits Source documentation items plus:
      - markdown (String): documentation in GitHub Flavored Markdown
      
      @description
      This is a @@synchronous, @@stateless, @@greedy pipelet.
      
      Markdown is generated as follows:
      - Items are ## (h2) with type capitalized, e.g. ```"## Pipelet"```
      
      - Attributes are capitalized ### (h3), e.g. ```"### Description"```
      
      - Attribute ```"short"``` is not displayed, only its value is as
        standard text
      
      - String attributes are displayed on one line
      
      - Array attributes are displayed over multiple lines
      
      - ```"@\@[display](prefix:reference)"``` is replaced by links showing
        reference pointing to ```"[display](#prefix_reference)"```:
        - characters authorized in reference are word characters ```/\w/```
        plus the dot character ```"."```
        
        - ```"[display]"``` is optional, default is ```"[reference]"```.
        
        - ```prefix``` is optional, default is ```"term"```.
        
        - parenthesis around ```"(prefix:reference)"``` are optional, use
        them to prevent regular expression to catch unwanted characters in
        reference.
        
        - if prefix is ```"MDN"```, link to Mozilla Developer Network
        reference. Where ```reference``` must be the name of a reference
        entry such as ```JSON.stringify()```. E.g. \@\@MDN:JSON.stringify()
        is rendered as @@MDN:JSON.stringify(). This only supports global
        object references for now.
      
      - automatic links are genenated for pipelets, classes, methods, and
        class methods following the pattern
        ```[pP]ipelet |[cC]lass |[mM]ethod |[cC]lass method ```
        and followed by ```"()"```, e.g.
        ```"pipelet flow\()"``` will be transformed into markdown link
        ```"pipelet [flow](#pipelet_flow)()"```
      
      - ```"\\"``` is the escqpe character, i.e. ```"\\c"``` is replaced
        by ```"c"```
  */
  .Compose( 'documentation_markdown', function( source, options ) {
    return source.alter( function( item ) {
      var type      = item.type
        , is_manual = type == 'manual'
      ;
      
      if ( ! is_manual ) {
        item.manual = item.manual
          ||
            {
              'term'        : 'glossary',
              'class'       : 'programmer',
              'method'      : 'programmer',
              'class_method': 'programmer',
              'function'    : 'internal'
            }[ type ]
          || 'reference'
        ;
      }
      
      item.markdown = [ 'top' ]
        .concat( Object.keys( item )
          .filter( function( a ) { return item_tags.indexOf( a ) != -1 && a != 'manual' } )
        )
        .map( to_string )
        .join( '\n' )
      ;
      
      function to_string( a ) {
        var level, v;
        
        if ( is_manual ) {
          if ( a == 'top' ) {
            level = '# ';
            a     = item[ 'short' ];
            v     = ''
          } else if ( a == 'description' ) {
            level = '';
            v     = item[ a ];
            a     = '';
          } else {
            return '';
          }
        } else if ( a == 'top' ) {
          level = '## ';
          a     = capitalize( type );
          v     = item.name;
          
          if ( item.signature ) v += item.signature;
        } else if ( a == 'short' ) {
          level = '';
          v     = item[ a ];
          a     = '';
        
        } else {
          level = '### ';
          v     = item[ a ];
          a     = capitalize( a );
        }
        
        v = is_array( v ) ? '\n' + v.join( '\n' ) : ' ' + v;
        
        return level + a + v
          .replace( /@@(\[([^\]]+)\])?\(?((\w+):)?((\w|\.)+)\)?/g, link_items )
          .replace( /([pP]ipelet |[cC]lass |[mM]ethod |[cC]lass method )(\$?[\w\.]+)\(\)/g, auto_link )
          .replace( /\\(.)/g, '$1' )
        ;
        
        function capitalize( s ) {
          return s
            .replace( /(^|_|\W)(\w)/g, function( _0, boundary, first ) {
              return ( boundary == '_' ? ' ' : boundary ) + first.toUpperCase();
            } )
          ;
        } // capitalize()
        
        function link_items( _0, _1, display, _3, prefix, reference, _6 ) {
          display = display || reference;
          
          if ( prefix == 'MDN' ) {
            reference = 'https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/'
              + reference.replace( /\./g, '/' )
            ;
          
          } else {
            reference = '#' + ( prefix || 'term' ) + '_' + reference.replace( /\./g, '_' );
          
          }
          
          return '[' + display + '](' + reference + ')';
        } // link_items()
        
        function auto_link( _0, type, reference ) {
          return type + '[' + reference + '](#' + type.toLowerCase().replace( ' ', '_' ) + reference.replace( /[\$\.]/g, '_' ) + ')()';
        } // auto_link()
      } // to_string()
    } ) // alter()
  } ); // documentation_markdown()
  
  function fix_tags( section ) {
    return fix_attribute;
    
    function fix_attribute( attribute ) {
      var a = section[ attribute ]
        , l = a && a.length || 0
      ;
      
      // Remove empty lines at the end of attribute definition
      while ( l && empty_line_re.test( a[ l - 1 ] ) ) {
        a.pop();
        
        --l;
      }
      
      if ( l ) {
        if ( l == 1 && one_liners.indexOf( attribute ) != -1 ) {
          section[ attribute ] = a[ 0 ];
        }
      }
    } // fix_attribute()
  } // fix_tags()
} );
