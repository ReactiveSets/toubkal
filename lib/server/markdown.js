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
( 'markdown', [ 'markdown-it', [ 'hljs', 'highlight.js' ], '../core/pipelet' ], function( markdown_it, highlight, rs ) {
  'use strict';
  
  var extend = rs.RS.extend;
  
  /* ------------------------------------------------------------------------
      @pipelet markdown( options )
      
      @short Markdown to html converter using "markdown_it" and "highlight.js"
      
      @parameters:
        - options (Object): pipelet options and options for [markdown_it](https://github.com/markdown-it/markdown-it#init-with-presets-and-options),
          defaults:
          - html: **true**
          - highlight (Function): use "highlight.js"
      
      @source:
        - markdown (String): Markdown content to convert to HTML
      
      @emits: In addition to source attributes, including parsed "markdown":
        - html (String): html content
      
      @description:
        This is a @@synchronous, @@stateless, @@greedy pipelet.
        
        To insert end-of-comment-block in higkighted code, use ```*\\/``` which
        will be replaced by ```*\/```
  */
  return rs.Compose( 'markdown', function( source, options ) {
    options = extend( { html: true, highlight: highlight_code }, options );
    
    return source.alter( markdown_parse, options );
    
    function markdown_parse( item ) {
      item.html = markdown_it( options ).render( item.markdown );
    } // markdown_parse()
  } ); // markdown()
  
  function highlight_code( code, language ) {
    var language_subset;
    
    code = code.replace( /\\(.)/g, '$1' );
    
    if ( language && highlight.getLanguage( language ) ) {
      language_subset = [ language ]
    }
    
    return highlight.highlightAuto( code, language_subset ).value
  } // highlight_code()
} );
