Connected Sets Excess
=====================

This is a work in progress, not ready for beta testing yet.

[![Build Status](https://travis-ci.org/ConnectedSets/ConnectedSets.png?branch=master)](https://travis-ci.org/ConnectedSets/ConnectedSets)

Excess (XS) is a high-efficiency, scalable, realtime web application framework aiming at massively reducing servers environmental footprint while improving mobile clients battery life by making an optimal use of server, network and client resources.

Using a dataflow programming model for XS pipelet programmers and a fluent interface for XS application architects, XS features a built-in chardable document database with joins, aggregates, filters and transactions with eventual consistency.

Everything in XS is a pipelet, including models, controllers, and views, greatly simplifying the programming of highly interactive applications.

Authorizations are also managed using pipelets, allowing instant changes all the way to the UI without ever requiring page refreshes. Likewise, application code can be upgraded without requiring refreshes, every change becomes realtime.

XS intuitive Architect DSL allows to decrease development time of complex realtime applications by a factor of 10.

Example of application that retrieves sales and employees from a server, aggregates these by year and displays the results incrementally in an html table:

    // client.js
    var xs = XS.xs, extend = XS.extend;
    
    var sales = [{ id: 'sales'}];
    
    var by_year = [{ id: 'year' }];
    
    var by_year_employee = [
      { id: 'year' },
      { id: 'employee_name' }
    ];
    
    var employees = xs.server().model( 'employees' );
    
    var columns = [
      { id: 'year', label: 'Year' },
      { id: 'employee_name', label: 'Employee Name' },
      { id: 'sales', label: 'Sales $' }
    ];
    
    xs.server()
      .model( 'sales' )
      .join( employees, merge, { left: true } ) // this is a left join
      .aggregate( sales, by_year )
      .order( by_year_employee )
      .table( 'sales', columns )
    ;
    
    function merge( sale, employee ) {
        if ( employee ) return extend( { employee_name: employee.name }, sale )
        return sale
    }

This is the server code:

    // server.js
    var xs = require( 'excess/lib/xs.js' ).XS.xs;
    require( 'excess/lib/file.js' );
    require( 'excess/lib/clients.js' );
    
    xs.file( 'database.json' )
      .parse_JSON()
      .clients()
    ;

Capable of handling millions of records per second, XS is particularly well suited for low-power devices such as tablets and smartphones as well as less-efficient or older JavaScript engines.

XS is a no-compromise database, providing all required primitives for the most demanding applications including filters, ordered sets, aggregates, and joins allowing both normalized and denormalized schemes.

Highest performances are provided thanks to,Just-In-Time code generators delivering performances only available to compiled languages such as C or C++. Unrolling nested loops provide maximum performance while in turn allowing JavaScript JIT compilers to generate code that may be executed optimally in microprocessors' pipelines.

Incremental execution of queries allows to split large datasets into optimal chunks of data rendering data to end-users' interface with low-latency, dramatically improving end-user experience. Data changes update Connected Sets in real-time, both in clients and servers, using push technology.

Incremental aggregates allow to deliver real-time OLAP cubes suitable for real-time data analysis and reporting over virtually unlimited size datasets.

Data model
=========

XS implements a data flow mechanism where data items flow from pipelet to pipelet in a data graph where each pipelet processes adds, removes, and updates incrementally before passing on to downstream pipelets.

For example, the pipelet filter( condition ), filters incrementally it's source set according to "condition".

Licence
=======
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
