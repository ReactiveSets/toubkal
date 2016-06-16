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
  
  var extend = rs.RS.extend;
  
  /* ------------------------------------------------------------------------
      @pipelet parse_documentation( options )
      
      @short Parse source "comments" attribute to emit documentation.
      
      @parameter option (Object):
      
      @emits: in addition to source attributes:
        - documentation_items (Array)
        
      @description:
        This is a @@synchronous, @@statless, @@greedy pipelet.
  */
  return rs.Compose( 'parse_documentation', function( source, options ) {
    return source.alter( function( module ) {
      var items = module.documentation_items = [];
      
      module.comments.forEach( function( comment ) {
        var content = comment.value;
        
        // Get block comments containing at least one @ character
        if ( comment.type == 'Block' && content.indexOf( '@' ) != -1 ) {
          items.push( content );
        }
      } )
    } );
  } );
} );
