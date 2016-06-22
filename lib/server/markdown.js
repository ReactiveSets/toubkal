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
( 'markdown', [ 'marked', [ 'hljs', 'highlight.js' ], '../core/pipelet' ], function( marked, highlight, rs ) {
  'use strict';
  
  var extend = rs.RS.extend;
  
  /* ------------------------------------------------------------------------
      @pipelet markdown( options )
      
      @short Markdown to html converter using "marked" and "highlight.js"
      
      @parameters:
        - options (Object): pipelet options and options for [marked](https://github.com/chjj/marked#options-1),
          defaults:
          - highlight (Function): use "highlight.js"
          - renderer    (Object): new marked.Renderer()
          - gfm        (Boolean): true, enable GitHub flavored markdown
          - tables     (Boolean): true, enable GFM tables
          - breaks     (Boolean): false, enable GFM line breaks
          - pedantic   (Boolean): false, strict conformance to markdown.pl
          - sanitize   (Boolean): false, sanitize the output
          - smartypants(Boolean): false, use "smart" typograhic punctuation
      
      @source:
        - markdown (String): Markdown content to convert to HTML
      
      @emits: In addition to source attributes, including parsed "content":
        - html (String): converted html content
      
      @description:
        This is a @@synchronous, @@stateless, @@greedy pipelet.
  */
  return rs.Compose( 'markdown', function( source, options ) {
    options = extend( { highlight: highlight_code }, options );
    
    return source.alter( markdown_parse, options );
    
    function markdown_parse( item ) {
      item.html = marked( item.markdown, options );
    } // markdown_parse()
  } ); // markdown()
  
  function highlight_code( code, language ) {
    var language_subset;
    
    if ( language && highlight.getLanguage( language ) ) {
      language_subset = [ language ]
    }
    
    return highlight.highlightAuto( code, language_subset ).value
  } // highlight_code()
} );
