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
    , extend        = RS.extend
    , item_re       = /^(\s*)@([^@]\S*)\s+([a-zA-Z][._a-zA-Z0-9]*)(.*)/
    , attribute_re  = /^(\s*)@([^@][_a-zA-Z]*):?\s*(.*)/
    , empty_line_re = /^\s*$/
    , top_level     = [ 'term', 'namespace', 'flow', 'pipelet', 'function', 'class', 'class_method', 'method' ]
    , one_liners    = [ 'manual', 'section', 'api', 'short' ]
    , multiline     = [ 'parameters', 'source', 'emits', 'returns', 'description', 'examples', 'is_a', 'throws' ]
    , item_tags     = one_liners.concat( multiline )
  ;
  
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
        - id         (String): type + "#" + name, e.g. "pipelet#acorn"
        - type       (String): e.g. "pipelet", "term", "class"
        - name       (String): name of documented item e.g. "acorn"
        - signature  (String): optional function or pipelet parameters signature e.g. "( options )"
        - module     (String): optional source uri || path
        - range       (Array): optional comment range
        - short      (String): optional short description
        - parameters  (Array): optional parameters
        - source      (Array): optional pipelet source attributes
        - emits       (Array): optional pipelet emited attributes
        - returns     (Array): optional function or method returned value
        - description (Array): optional description
        - examples    (Array): optional examples
        - is_a        (Array): optional class parents
        - throws      (Array): optional list of conditions that throw errors
        - manual     (String): optional manuals: introduction, manual, reference, guide, programmer, internal
        - section    (String): optional manual section
        - api        (String): optional API maturity: experimental, alpha, beta, stable, deprecated
        - other      (Object): optional other documentation item attributes.
      
      @description:
        This is a @@synchronous, @@statless, @@greedy pipelet.
      
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
  return rs.Compose( 'parse_documentation', function( source, options ) {
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
              
              empty_line_re.test( line ) || attribute.push( line );
            } else if ( attribute ) {
              var l = indent;
              
              while ( l-- && line.charAt( 0 ) == ' ' ) line = line.substr( 1 );
              
              attribute.push( line ); // can be a blank line
            }
          } else if ( state = item_re.exec( line ) ) {
            // First line with a documentation tag
            indent          = state[ 1 ].length;
            
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
  } ); // parse_documentation()
  
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