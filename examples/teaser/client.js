/*  client.js
    
    Copyright (C) 2013, 2014, Reactive Sets
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

function client() {
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
    
    .flow( 'sales' )                         // Select sales dataflow
    
    .filter( [ { year: 2014 } ] )            // Only pull sales for the year 2014
    
    .order ( [ { id: 'date'   } ] )          // Order by date
    
    .trace( 'ordered sales' )                // Display pulled sales in console.log
    
    .table( $( '#sales_table' ), columns )   // Display table
  ;
}
