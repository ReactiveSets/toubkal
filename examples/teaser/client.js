"use strict";

var xs = XS.xs

  // Define table displayed columns
  , columns = xs.set( [
      { id: 'year'         , label: 'Year'          	}, // First column
      { id: 'item'         , label: 'Sales'       	}  // Second column
    ] )
    
  // Organizer to order incoming sales data
  , by_date = xs.set( [ { id: 'date' } ] )
  
  , $ = XS.$ // from selector.js
;

function client() {
  xs.socket_io_server()                    // exchange dataflows with server using socket.io
    .flow( 'sales' )                       // Select sales dataflow
    .order( by_date )                      // Order by date
    .trace( 'ordered sales' )
    .table( $( '#sales_table' ), columns ) // Display table
  ;
}
