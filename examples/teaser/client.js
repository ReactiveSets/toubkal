"use strict";

function client() {
  var xs = XS.xs
    
    // Define table displayed columns
    , columns = [
        { id: 'date'    , label: 'Date'     }, // First column
        { id: 'item'    , label: 'Item'     }, // Second column
        { id: 'quantity', label: 'Quantity' }  // Third column
      ]
      
    , $ = XS.$ // from selector.js
  ;
  
  xs.socket_io_server()                      // exchange dataflows with server using socket.io
    
    .flow( 'sales' )                         // Select sales dataflow
    
    .filter( [ { year: 2014 } ] )            // Only pull sales for the year 2014
    
    .order ( [ { id: 'date'   } ] )          // Order by date
    
    .trace( 'ordered sales' )                // Display pulled sales in console.log
    
    .table( $( '#sales_table' ), columns )   // Display table
  ;
}
