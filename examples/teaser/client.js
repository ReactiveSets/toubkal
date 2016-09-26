/*  client.js

    The MIT License (MIT)

    Copyright (c) 2013-2016, Reactive Sets

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
;!function() {
  "use strict";
  
  // Define columns to display in table
  var columns = [
    { id: 'date'    , label: 'Date'     }, // First column
    { id: 'item'    , label: 'Item'     }, // Second column
    { id: 'quantity', label: 'Quantity' }  // Third column
  ];
  
  // Use the global object rs, to start a dataflow
  rs
    // Connect to socket.io server to exchange dataflows
    .socket_io_server()
    
    .cache( { synchronizing: rs.socket_io_synchronizing() } )
    
    // Pull teaser/sales dataflow
    .flow( 'teaser/sales_year', { tag: 'synchronizing' } )
    
    // Limit pulled sales to some years
    .filter( [
      { year: 2014 },
      { year: 2013 }
    ] )
    
    // Order sales by date
    .order ( [ { id: 'date'   } ] )
    
    // Log sales to console.log()
    .trace( 'ordered sales' )
    
    // Display table in #sales_table div
    .table( rs.RS.$( '#sales_table' ), columns )
  ;
}();
