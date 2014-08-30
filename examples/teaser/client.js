"use strict";

var xs = XS.xs

  // Define table displayed columns
  , columns = [
      { id: 'year'         , label: 'Year'          	}, // First column
      { id: 'item'         , label: 'Sales'       	}  // Second column
    ]
  , $ = XS.$ // from selector.js
;

function client() {
  xs.socket_io_server()                      // exchange dataflows with server using socket.io
    .flow( 'sales' )                         // Select sales dataflow
    .filter( [ { year: '2014' } ] )
    .order ( [ { id: 'date'   } ] )            // Order by date
    .trace( 'ordered sales' )
    .table( $( '#sales_table' ), columns )   // Display table
  ;
}
