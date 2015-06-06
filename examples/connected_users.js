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
  
  // Define columns to display in table
  var columns = [
    { id: 'first_name'	, label: 'First Name'	},	// First column
    { id: 'last_name'	, label: 'Last Name'	},	// Second column
    { id: 'city'	, label: 'City'		},	// Third column
    { id: 'country'	, label: 'Country'	}	// Fourth column
 ];
  
  // Use the global object rs, to start a dataflow
  rs
    // Connect to socket.io server to exchange dataflows
    .socket_io_server()
    
    // Pull teaser/connected users dataflow
    .flow( 'teaser/connected_users_refreshed' )
    
    // Limit pulled sales to some years
//    .filter( [
//     { year: 2014 },
//      { year: 2013 }
//    ] )
    
    // Order users by first then last name
    .order ( [	
		{ id: 'last_name'   } 
	   ] )
    
    // Log connected users to console.log()
    .trace( 'ordered connected users' )
    
    // Display table in #sales_table div
    .table( rs.RS.$( '#connected_users_table' ), columns )
  ;
}();
