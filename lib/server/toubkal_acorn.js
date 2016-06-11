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
( 'toubkal_acorn', [ 'acorn', '../core/pipelet' ], function( acorn, rs ) {
  'use strict';
  
  var extend = rs.RS.extend;
  
  /* ------------------------------------------------------------------------
      @pipelet acorn( options )
      
      @short Parse javascript "content" attribute using the acorn library
      
      @parameter option (Object): options for acorn.parse(), defaults are:
        - ranges   : true
        - onComment: returned "comments" attribute Array
        - onToken  : returned "tokens" attribute Array
      
      @emits: in addition to source attributes, including parsed "content":
        - comments (Array): parsed comments
        - tokens   (Array): parsed tokens
        - ast     (Object): parsed AST
      
      @description:
        This is a @@synchronous, @@statless, @@greedy pipelet.
        
        Although acorn is a very fast parser, parsing large files may take
        a relatively long time and may introduce excessive latencies for
        real-time applications when source content is updated.
        
        This is not a a problem if source code does not change and is
        only read once during startup.
        
        To avoid excessive latencies, consider running acorn() pipelets
        in a separate process than pipelines with low-latency requirements.
  */
  return rs.Compose( 'acorn', function( source, options ) {
    return source.alter( function( module ) {
      module.comments = [];
      module.tokens   = [];
      
      module.ast = acorn
        .parse( module.content, extend( {
          // collect ranges for each node
          ranges: true,
          
          // collect comments in Esprima's format
          onComment: module.comments,
          
          // collect token ranges
          onToken: module.tokens
        }, options ) )
      ;
    } );
  } );
} );
