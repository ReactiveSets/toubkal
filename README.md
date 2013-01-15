Connected Sets
==============

Connected Sets (XS) is an Open Source High-Performance JavaScript Database for the development of real-time AJAX and Single-Page Applications using an intuitive API to decrease development time from months to weeks.

Capable of handling millions of records per second, XS is particularly well suited for low-power devices such as tablets and smartphones as well as less-efficient or older JavaScript engines.

XS is a no-compromise database, providing all required primitives for the most demanding applications including filters, ordered sets, aggregates, and joins allowing both normalized and denormalized schemes.

Highest performances are provided thanks to,Just-In-Time code generators delivering performances only available to compiled languages such as C or C++. Unrolling nested loops provide maximum performance while in turn allowing JavaScript JIT compilers to generate code that may be executed optimally in microprocessors' pipelines.

Incremental execution of queries allows to split large datasets into optimal chunks of data rendering data to end-users' interface with low-latency dramatically improving user experience. Updates and removes update Connected Sets in real-time from clients and servers using push technology.

Incremental aggregates allow to deliver real-time OLAP cubes suitable for real-time data analysis and reporting over virtually unlimited size datasets.


Data model
==========

XS implements a data flow mechanism where data items flow from node to node in a data graph where each node decide what to do with the data items it receives and what data will flow to dependent nodes. Usually a node depends on data coming from a single source node but nodes that depends on multiple sources exists too.

Some node stores data items. A Set is a node that has a key, dependent nodes and contains an array of items. When an action is performed (either add, remove or update), the set's dependent sets are notified about all the details about the action and can react as necessary.

Some special nodes, when they are notified of an action on a set or node they depend on, instead of duplicating the action on themselves, may decide to alter their own items in a different way or notify their dependant nodes or sets in special ways.

For example, a node can filter or alter the operations fired by it's source set and update a dependent set accordingly.

A few more type of nodes include ordered set, kept sorted, 


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
