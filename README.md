# Connected Sets

[![Build Status](https://travis-ci.org/ConnectedSets/ConnectedSets.png?branch=master)](https://travis-ci.org/ConnectedSets/ConnectedSets)

Connected Sets ( **XS** ) is a high-efficiency, scalable, realtime web application framework aiming at massively
reducing servers environmental footprint and improving mobile clients battery life by making an optimal use of
server, network and client resources.

#### Ecosystem
XS backend runs on **Node.js** providing a scalable database, web server, validation, and authorizations.

On the frontend, XS provides reactive controls and views driven by dataflows.
XS can optionally be coupled with any other framework but we recommend using reactive libraries such as
**AngularJS**, **Bacon.js**, **React**, which model is the closest to XS.

For layout, we recommand **Bootstrap** for responsive HTML5 applications and we use it for our Carousel and Photo Albums.

For DOM manipulation one can use any library, or none at all, as XS core has zero dependencies.

XS can either be used to improve existing applications on the backend or frontend, or as a full backend-and-frontend
framework for new projects.

#### Dataflow Programming Model
XS intuitive **dataflow** programming model allows to very significantly decrease development time of complex
realtime applications. This combination of runtime high-efficiency and reduction in programming complexity should
allow to greatly reduce the cost of running greener startups.

XS applications are programmed using an intuitive and consice declarative dataflow programming model.

At the lower level, XS **Pipelets** use a JavaScript functional programming model eliminating callback hell.

Everything in XS is a pipelet, greatly simplifying the programming of highly reactive applications. Authorizations are
also managed using pipelets, allowing instant changes all the way to the UI without ever requiring page refreshes.

#### Integrated database and model
XS features a chardable document database with joins, aggregates, filters and transactions with eventual consistency allowing
both normalized and denormalized schemes.

#### Performances
Capable of handling millions of operations per second, XS is particularly well suited for low-power devices such as
tablets and smartphones.

Highest performances are provided thanks to Just-In-Time code generators delivering performances only available to
compiled languages such as C or C++. Unrolling nested loops provide maximum performance while in turn allowing
JavaScript JIT compilers to generate code that may be executed optimally in microprocessors' pipelines.

Incremental query execution allows to split large datasets into optimal chunks of data rendering data to
end-users' interface with low-latency, dramatically improving end-user experience. Data changes update dataflows in
real-time, on both clients and servers (using socketio by default).

Incremental aggregates allow to deliver realtime OLAP cubes suitable for realtime data analysis and reporting
over virtually unlimited size datasets.

### Documentation
This readme provides a short introcution to Connected Sets.

The bulk of the documentation is currently embedded in the code of ````lib/pipelet.js```` for the core as well as individual pipelets' sources.

Eventually we plan on extracting and completing this documentation to provide the following manuals:

- An Introduction to ConnectedSets (featuring a tutorial)
- ConnectedSets Application Architect Manual
- ConnectedSets Pipelet Developper's Guide
- Individual Reference Manuals for each module

### Installation

From npm, latest release:
```bash
npm install excess
```

Some image manipulation pipelets require ImageMagick that [you can download here](http://www.imagemagick.org/script/binary-releases.php.).

## Demonstration Site
A [demonstration and beta test site is available here](http://www.castorcad.com/).

The source code for this deminstration site is in the GitHub repository [ConnectedSets / demo](https://github.com/ConnectedSets/demo).

## Example

Application retrieving sales and employees from a server, aggregates these by year and displays the results
incrementally in an html table (a * indicates that a pipelet is not yet implemented or is work in progress).

This example also shows how to produce in realtime minified `all.css` and `all-min.js`. All assets content
is prefetched in this example for maximum performance. The less css compiler is also used to compile in real
time .less files. The same could be done to compile coffee script or use any other code compiler.

### index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    
    <title>Connected Sets - Aggregate Sales by Year and Employee</title>
    
    <link rel="stylesheet" href="all.css" />
    
    <script src="all-min.js"></script>
  </head>
  
  <body>
    <div id="sales_table"></div>
    
    <script>client()</script>
  </body>
</html>
```

### javacript/client.js

```javascript
"use strict";

function client() {
  var xs = XS.xs                  // the start object for XS fluent interface
    , extend = XS.extend          // used to merge employees and sales
    , sales = [{ id: 'sales'}];   // Aggregate sales measures
    , by_year = [{ id: 'year' }]; // Aggregate dimensions
    
    // Table columns order by year and employee name
    , by_year_employee = [ { id: 'year' }, { id: 'employee_name' } ]
    
    // Define table displayed columns
    , columns = [
      { id: 'year'         , label: 'Year'          }, // First column
      { id: 'employee_name', label: 'Employee Name' },
      { id: 'sales'        , label: 'Sales $'       }
    ]
  ;
  
  var server = xs.socket_io_server(); // exchange dataflows with server using socket.io
  
  // Get employees from server
  var employees = server.flow( 'employee' ); // filter values which "flow" attribute equals 'employee'
  
  // Produce report after joining sales and employees
  server
    .flow( 'sale' )
    .join( employees, merge, { left: true } ) // this is a left join
    .aggregate( sales, by_year )
    .order( by_year_employee )
    .table( 'sales_table', columns )
  ;
  
  // Merge function for sales and employees
  // Returns sales with employee names coming from employee flow
  function merge( sale, employee ) {
      // Employee can be undefined because this is a left join
      if ( employee ) return extend( { employee_name: employee.name }, sale )
      
      return sale
  }
}
```

### server.js

```javascript
var xs = require( 'excess' ); // this is the target API, not currently available

var servers = xs
  .set( [ // Define http servers
    { port:80, ip_address: '0.0.0.0' } // this application has only one server
    { port:443, ip_address: '0.0.0.0', key: 'key string', cert: 'cert string' }
    // See also "Setting up free SSL on your Node server" http://n8.io/setting-up-free-ssl-on-your-node-server/
  ] )
  .http_servers() // start http servers
;

// Merge and mimify client javascript assets in realtime
var all_min_js = xs
  .set( [ // Define the minimum set of javascript files required to serve this client application
    { name: 'excess/lib/xs.js'        },
    { name: 'excess/lib/pipelet.js'   },
    { name: 'excess/lib/filter.js'    },
    { name: 'excess/lib/join.js'      },
    { name: 'excess/lib/aggregate.js' },
    { name: 'excess/lib/order.js'     },
    { name: 'excess/lib/table.js'     }
  ], { auto_increment: true } ) // Use auto_increment option to keep track of files order
  
  .require_resolve()            // Resolve node module paths
  
  .union( xs.set( [             // Add other javascript assets
    { name: 'javascript/client.js', id: 8 } // client code must be loaded after excess
  ] ) )
  
  .watch()                      // Retrieves files content with realtime updates
  
  .order( [ { id: 'id' } ] )    // Order files by auto_increment order before minifying
  
  .uglify( 'all-min.js' )       // Minify in realtime using uglify-js
;

var all_css = xs
  .set( [
    { name: 'css/*.less' }, // these will be compiled
    { name: 'css/*.css'  }  // these will only be merged
  ] )
  .glob()                  // * Retrrieves files list with realtime updates (watching the css directory)
  .watch()                 // Retrieves files content with realtime updates
  .less_css( 'all.css' )   // * Compile .less files using less css compiler, merge all
;

xs.set( [ // Other static assets to deliver to clients
    { name: 'index.html'      }
  ] )
  .watch()                 // Retrieves file content with realtime updates
  .union(                  // Add other compiled assets
    [ all-min.js, all.css ]
  )
  .serve( servers )        // Deliver up-to-date compiled and mimified assets to clients
;

// Start socket servers on all servers using socket.io
var clients = servers.socket_io_clients(); // Provide a dataflow of socket.io client connections

xs.file( 'database.json' ) // * The log of all database transactions
  .parse_JSON()            // Parse to JavaScript Objects
  .transactions_to_sets()  // * Transform log into a stream of sets

  .dispatch( clients, function( source, options ) { // Serve realtime content to all socket.io clients
    return source
      .plug( this.socket ) // Insert socket dataflow to exchage data with this client
    ;
  } )
;
```

## Start server

```bash
node server.js
```

# Releases

Version 0.2.0 - ETA October 2013

  Goals:

    - Request / Response dataflows using optimized Query Trees
    - Dynamic Authorizations Query Dataflow
    - Watch directory metadata flow

  Features already developped:

    - Virtual Hosts w/ optimized routing
    
  New pipelets (available now):
  
  Pipelet                   | Short Description                              
  --------------------------|------------------------------------------------
  encapsulate()             | Hide a graph of pipelets behind one pipelet
  require_resolve()         | Resolve node module files absolute path
  timestamp()               | Add timestamp attribute
  events_metadata()         | Add events metadata attributes
  auto_increment()          | Add auto-increment attribute
  set_flow()                | Add flow attribute
  to_uri()                  | Transforms a relative file name into a DOM uri
  thumbnails()              | Image thumbnails using ImageMagick
  load_images()             | Load images in the DOM one at a time
  bootstrap_carousel()      | Bootstrap responsive images carousel 
  bootstrap_photos_matrix() | Bootstrap responsive photo matrix
  bootstrap_photo_album()   | Bootstrap responsive photo album
  
Version 0.1.0 - April 8th 2013:

  Features:
  
    - Core Database engine with order / aggregates / join / union, and much more
    - Automated tests
    - Dataflows between clients and server using socket.io
    - DOM Tables w/ realtime updates
    - DOM Controls as dataflows: Drop-Down / Radio / Checkboxes
    - DOM Forms with client-side and server-side validation
    - Realtime Minification using Uglify w/ source maps
    - HTTP(s) servers
    - File watch w/ realtime updates
    - JSON Configuration Files w/ realtime updates

  Pipelet                   | Short Description                              
  --------------------------|------------------------------------------------
  set()                     | Base stateful pipelet
  filter()                  | Filters a dataflow
  order()                   | Order a set
  ordered()                 | Follow an ordered set (typically derived)
  aggregate()               | Aggregates measures along dimensions (GROUP BY)
  join()                    | Joins two dataflows
  watch()                   | Dataflow updated on file content changes
  uglify()                  | Minifies a dataflow of files into a bundle, using [Uglify JS 2](https://github.com/mishoo/UglifyJS2)
  dispatch()                | Dispatches dataflows to a dataflow of branches
  http_servers()            | A dataflow of http servers
  serve()                   | Serve a dataflow of resources contents to http (or other) servers
  socket_io_clients()       | A dataflow server for socket.io clients
  socket_io_server()        | A dataflow client for socket.io server
  table()                   | DOM table bound to incoming dataflows
  form()                    | DOM Form using fields dataflow, emiting submited forms
  form_validate()           | Client and server form validation
  checkbox()                | DOM input checkbox
  checkbox_group()          | DOM input chexbox group
  radio()                   | DOM radio button
  drop_down()               | DOM drop-down menu
  send_mail()               | Send emails from email dataflow
  configuration()           | Dataflow of application configuration parameters
  parse_JSON()              | JSON dataflow to parsed JSON dataflow
  
# Licence

    Copyright (C) 2013, Connected Sets

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
