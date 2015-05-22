/*  client.js

    The MIT License (MIT)

    Copyright (c) 2013-2015, Reactive Sets

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
  
  var rs = RS.rs
    
    // Define table displayed columns
    , columns = [
        { id: 'date'    , label: 'Date'     }, // First column
        { id: 'item'    , label: 'Item'     }, // Second column
        { id: 'quantity', label: 'Quantity' }  // Third column
      ]
      
    , $ = RS.$ // from selector.js
  ;
  
  rs.socket_io_server()                      // exchange dataflows with server using socket.io
    
    .flow( 'teaser/sales' )                  // Select sales dataflow
    
    .filter( [ { year: 2014 } ] )            // Only pull sales for the year 2014
    
    .order ( [ { id: 'date'   } ] )          // Order by date
    
    .trace( 'ordered sales' )                // Display pulled sales in console.log
    
    .table( $( '#sales_table' ), columns )   // Display table
  ;
}();
