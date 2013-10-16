/*  pipelet.js
    
    Pipelet base classes:
      - Pipelet: the current base of all pipelet classes having one source and one
        destination
      - Fork: a Pipelet with one source and n destinations
      - Union: a Pipelet with n sources and one destination
      - Set: a stateful set implementation
    
    Also defines the 'xs' namespace for a fluid interface that acts as a singleton
    or a pseudo source.
    
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
*/

/* -------------------------------------------------------------------------------------------
   The following documentation will eventually be extracted as a separate document.
   
   What is Connected Sets?
   ----------------------
   Connected Sets is a JavaScript framework for the developpement of realtime internet
   applications.
   
   The server side runs on Node while clients is any EcmaScript 5 - compatible web browser.
   
   XS, pronounce Excess, is a shorthand for 'Connected Sets' where the X stands for Connected.
   
   Why another JavaScript framework?
   --------------------------------
   Connected Sets came out of more than ten years of experience developing realtime web
   applications where the main problems were:
     - the lack of an existing framework to develop efficiently realtime applications,
     - the complexity to handle data authorizations for multi-user enterprise applications,
       even more so in realtime,
     - the impedance mismatch between front-end, back-end programming, and the SQL language,
     - backend scalability to serve millions of users, or more,
     - high availability,
     - assynchronous programming callback hell
     - many bugs difficult to reproduce and fix due to the complexity of asynchronous
       operations.
   
   The XS framework addresses all these issues, providing high-performance and high code
   productivity through the use of a dataflow programming model running on both the server
   and web clients and providing full-featured database services available everywhere.
   
   XS was inspired by Unix(tm) pipes which provide a type of dataflow programming, and the SQL
   language that manipulates datasets very consilely and efficiently in particular with no
   loops.
   
   Definitions and Concepts:
   ------------------------
   
   Set:
   ---
   An XS Set is a collection of JavaScript Objects.
   
   A trivial implementation of a Set uses an Array of JavaScript Objects such as:
   
     [
       { id: 1, city: "New York" },
       { id: 2, city: "San Francisco" }
     ]
   
   Dataflow, and Pipelets:
   ----------------------
   Unix(tm) pipes allow a type of dataflow programming where text lines flow through programs,
   and where the output of each program produces a new set of lines, e.g.:
   
     tail -f http.log | grep wikipedia.org
   
   Where tail produces the http.log file in realtime as it is modified, and where grep filters
   the lines that contain the text "wikipedia.org" to produce the set of lines referencing
   that site in realtime.
   
   Likewise, XS uses a dataflow model where JavaScript Objects flow through Pipelets, and
   where the output of each Pipelet produces a new XS Set, e.g.:
   
     var new_york_sales_by_year = sales
       .filter( { city: "New York" } )
       .aggregate( [ { id: sales } ], [ { id: year } ] )
     ;
     
   Where:
     - 'sales' references a source dataflow (not defined in the example) providing a set of
       sales objects that evolve in realtime as new sales arise,
     - the filter() pipelet delivers a dataflow of sales from New York city,
     - the aggregate() pipelet delivers a dataflow of New York city sales by year which
       output reference is kept in the variable 'new_york_sales_by_year'.
     
   Each time sales are added to the sales dataflow, the 'new_york_sales_by_year'
   aggregates dataflow is updated in realtime. Likewise when sales are removed or
   updated, the output dataflow is updated.
   
   Style:
   ----- 
   Because a single JavaScript expression can be used to describe a significant part of
   an application we recommand the above indentation where each pipelet uses one or more
   lines starting with JavaScript operator '.' that acts as the pipe operator of the
   dataflow.
   
   Benefits:
   --------
   This is the basis of all XS applications, everything in XS is a dataflow, meaning that
   all parts of the application responds to realtime data events producing dataflows.
   Handling events is therefore at the core of the XS framwork and comes at no cost to
   application programmers.
   
   XS solves so-called callback hell because there are no callbacks required to define an
   application using this dataflow programming model where events and callbacks are handled at
   a lower level by the XS framework itself.
   
   Because every dataflow produces a set, and pipelets proccess sets, there are no need for
   loops much like SQL that processes datasets. Loops are implemented within pipelets very
   efficiently sometimes using just-in-time JavaScript code genertors.
   
   At this level, XS uses a subset of the JavaScript programming language and allows to
   describe complex realtime applications with an order of magnitude less code, greatly
   improving code productivity and maintainability.
   
   XS vs SQL:
   ---------
   XS database services are provided as pipelets. The following table shows XS counterparts to
   SQL clauses:
   
   -------------------------------------------------------------------------------------------
   | SQL      | XS Pipelet  | Pipelet behavior notes                                         |
   |------------------------|----------------------------------------------------------------|
   | Where    | filter()    | Selects a subset of objects from the source dataflow           |
   | Group By | aggregate() | Groups measures by dimensions                                  |
   | Order By | order()     |                                                                |
   | Join     | join()      | Inner, left, right, and outer joins 2 dataflows                |
   | Select   | alter()     | Outputs an altered dataflow but with same number of objects    |
   -------------------------------------------------------------------------------------------
   
   But the most fundamental difference with SQL is that XS expressions are dataflows that do
   not stop after returning a dataset, they are constantly updating, somewhat like SQL
   materialized views.
   
   Unlike SQL, XS pipelets are available everywhere to both backend server code and client
   code, so applications can be architechtured with much more flexibility i.e. filters can
   be done on the server while some aggregates mays be computed on clients allowing to
   optimize the amount of data transmitted between clients and servers. 
   
   Immutable Objects and Sets:
   --------------------------
   A set which objects are never removed nor updated, such as an events log, is said to be
   'immutable'.
   
   Significant optimizations are only possible on imutable sets, therefore application
   developpers should favor the use of immutable sets whenever possible. To specify that a
   set is imutable, the application developper sets the option 'immutable' to bollean value
   'true'.
   
   Operations:
   ----------
   Over time, the state of sets is modified by Operations that add, remove or update Objects.
   
   There are four Operations allowing to modify the state of a set: add(), remove(), update(),
   and clear():
   
     - Pipelets process the basic Operations add() and remove() coming from their source and
       produce a destination set. All sets can be defined and updated using these two
       operations.
       
     - The update() Operation is an optimization that groups a remove and an add operation
       into a single operation.
       
     - The clear() Operation empties a set but should only be used in applications as an
       optimization before re-adding a new objects. It should not be used when the order of
       operations is undefined typically in a distributed server application.
   
   These four Operations are typically not used directly by XS application developpers who
   should only assemble pipelets in order to describe applications as shown in the above
   example.
   
   On the other hand XS pipelet developpers must define these four operations by overloading
   all or some of these in derived classes of the Pipelet base class.
   
   Application vs Pipelet Developers:
   ---------------------------------
   Likewise, most of the complexity of pipelets can be ignored by application developpers but
   must be mastered by pipelet developpers. This clearly defines two profiles of developpers
   in XS projects with different skills:
     - Application developpers focus on bussiness logic. Using pipelets they benefit from the
       higher performance and enhanced productivity and simplicity provided by the XS dataflow
       model.
       
     - Pipelet developpers focus on performance of application building blocks and their
       semantic. They must master XS Pipelets complexity and guaranty quality preferably using
       automated testing. In turn this complexity eases the developement of complex realtime
       applications. While many applications can be designed using XS provided pipelets, some
       applications require the developpement of custom pipelets. Pipelet semantical design is
       an essential consideration to deliver reusable dataflow components that effectively
       simplify their documentation and the work of application developpers. 
   
   Pipelet Developpers' Guide:
   --------------------------
   
   Reserved Attribute Names:
   ------------------------
   Some objects attribute names are non-strictly reserved to simplify application developement
   by providing naming conventions. Although these are not strictly reserved at this time, we
   may decide to make these reservations more strict in future releases and therefore highly
   discourage their use for other purposes than documentated in the next sections.
   
   These reserved attribute names are:
   flow, id, version, name, uri.
   
   Many Sets per Pipelet, and the 'flow' Attribute:
   -----------------------------------------------
   Some pipelets may handle many sets simultaneously. This simplifies complex applications
   with many sets that can share some pipelets. This is typically the case for persistance,
   replication, charding, and dispatching pipelets.
   
   To differentiate between dataflows the 'flow' attribute is used, while the flow() pipelet
   allows to filter operations for a single dataflow.
   
   Remove Operation, Objects Identity, and the 'id' Attribute:
   ----------------------------------------------------------
   To remove objects from a set, objects need to have a unique identity accross the set and
   time.
   
   Object identity attributes are defined by the set's key, an array of attribute names
   which by default holds the single attribute 'id'. So by default all objects of a set must
   define a unique 'id' attribute.
   
   A key can have more than one attribute but this comes at the cost of some additional
   processing, so for large sets for which a lot of remove operations are performed, one
   should favor single attribute keys.
   
   Update Operation, and the 'version' Attribute:
   ---------------------------------------------
   The requirement for unique identity also applies to update operations because these
   include a remove and an add operation. But the additional requirement is that the add part
   of the update cannot use the same identity as the original add. This may be achieved by
   adding a 'version' attribute that is unique for each update and that is part of the
   identity. Although using a 'version' attribute is not the most efficient way to garanty
   identity uniqueness accross time, it is more convenient in many cases than changing the
   'id' attribute.
   
   The 'id' may then be seen as the object identity while the combination of the 'id' and
   'version' attributes may be understood as a unique reference to a particular value at a
   given time for each object.
   
   Transactions and the 'more' option:
   ----------------------------------
   Operations can be combined to form transactions. Operations may contain a 'more' option to
   indicate that more operations should be expected as part of a transaction. A 'no-more'
   condition is reached if the 'more' option is set to the boolean value 'false' or if the
   'more' option is not present. Therfore, by default, i.e. when no options are provided,
   operations are the final operation of a single-operation transaction.  
   
   The more option must be propagated by all pipelets and may serve two possible purposes:
     - optimize certain updates by grouping a number of operations that may take different
       paths to reach a particular pipelet. If the more option is discarded the only
       consequence should be that these optimisations could not be performed, possibly
       resulting in performance issues.
       
     - grouping a number of updates over time to provide what would be loops in a procedural
       language of a multi-threaded system. The 'more' option indicates that the loop has not
       ended while the no-more condition indicates and end of loop. If the 'more' option is
       discarded by a downstream pipelet, it would effectively break loop most likely breaking
       application logic.
   
   
   Vertical and Horizontal Distribution:
   ------------------------------------
   Pipelets can be distributed vertically or horizontally.
   
   Vertical distribution is when individual pipelets run on different processes or servers but
   each pipelet is executed entirely within the same thread.
   
   In the following example, pipelet p1 runs on thread th1, p2 on th2, ...:
   
        th1      th2      th3      th4
      -- p1 --|-- p2 --|-- p3 --|-- p4 --
   
   This is typically how unixes pipes operate.
   
   Horizontal distribution, aka charding, is when a single pipelet's execution is run over
   several threads and/or processes and/or servers.
   
   In the following example, pipelet p1 execution is distributed over three parallel threads
   or processes:
   
        |-- p1(a) --|
      --|-- p1(b) --|--
        |-- p1(c) --|
   
   Operations Order, Charding, and Antistate:
   -----------------------------------------
   To ease horizontal distribution, an important aspect of XS operations is that these can
   be executed in any order. In other words, the final state of a set does not depend on the
   order of execution of individual operations.
   
   This means that a remove or update operation can be received before its corresponding add.
   
   This allows to chard sets according to any policy that can also change over time without
   requiring to reorganize chards. The number of chards can be increased or decreased at any
   time allowing elastic charding. The only requirement is that operations be sent to one and
   only one chard.
   
   In order to compute the state of a set, one must therfore implement an antistate to
   memorize 'remove' and 'update' operations that may be received before corresponding
   'add' operations.
   
   The antistate can then be compensated by add or update operations received 'soon' after
   and therefore the antistate should be empty most of the time and can be considered
   transitional.
   
   If operations remain in the antistate for a 'long' time, this indicates either a conflict
   or the prolonged unavailability of a chard and all of its replicas.
   
   There should never exist a conflict between two adds, even if received out of order
   because the identity of objects within a set is required to be unique accross time.
   If an add is provided with the same identity as a previous add, this would therefore
   be a bug. Likewise, two removes, even if received out of order, should never refer to
   the same object. This also implies that updates should always update the identity of
   objects to allow updates out of order.
   
   Consistency, Availability, and Partition tolerence:
   --------------------------------------------------
   Consistency of distributed sets is 'eventual' and performed by conflict resolution agents,
   i.e. XS provides high availability and partition tolerence by delaying consistency.
   
   Stateless and Stateful Pipelets:
   -------------------------------
   There are two main types of pipelets: stateless pipelets that do not hold the state of
   sets, and stateful pipelets that do hold a state.
   
   Stateless pipelets are very simple to implement while stateful pipelets are more complex. 
   
   Stateless Pipelet:
   -----------------
   A Stateless pipelet does not hold any state between operations and can be seen as purely
   functional.
   
   The state of these pipelets is therefore virtual and does not require any memory to store
   objects.
   
   The memory footprint of a stateless pipelet does not depend on the size of the set it
   describes, implying that these pipelets are for the most part CPU-bound.
   
   The order in which operations are processed does not matter and it can therefore be
   distributed horizontally at any time.
   
   Examples of statefull pipelets include Fork, Union, and Filter.
   
   Forks and Union can be distributed in hierarchical trees.
   
   A Fork can be distributed into a head fork, connected to many indepedent forks.
   Likewise a Union can be distributed into many independent unions connected to a tail
   union. This hierarchy can have any depth allowing scalability to billions of branches
   over as many processes and machines as required.
   
   Stateless pipelets must implement the transform( values ) method that returns values
   as transformed or filtered. This method is then used by add(), remove(), and update()
   operation methods to produce the desintation set plus the fetch() method invoqued when
   a destination pipelet connects its source to a stateless pipelet.
   
   Stateless pipelets managing many sets simultaneously, may use the 'flow' attribute
   to process operations differently for each set.
   
   Stateful Pipelet:
   ----------------
   A Stateful pipelet maintains the state of the set either in memory, in mass storage,
   or any other API that provides a storage behavior.
   
   A stateful pipelet may be distributed horizontally if it has at least two stages: a
   map stage and a merge stage. The map stage must be able to work on a subset of the set
   accepting operations in any order. The merge stage reduces results of subsets into
   a new subset that may be further reduced in a hierachical merge until a tail merge
   produces the output set of the pipelet.
   
   Sateful pipelets must implement fetch(), add(), remove(), update(), and clear() and
   propagate their state forward using emit_xxx() methods where xxx is one of add, remove
   update, or clear.
   
   Furthermore, stateful pipelets must set their 'no_add' flag to 'false' so that build()
   will fetch their source content. This can be achieved by deriving from 'Set', a base
   class provided for stateful pipelet.
   
   Stateful pipelets must either implement an antistate or memorize all operations. The
   Set base class implements an antistate in memory.
   
   Stateful pipelets managing many sets simultaneously should manage as many anistates as
   there are sets. Each set is associated with a 'flow' and a key that allows to manage these
   antistates.
   
   Conflict Detection:
   ------------------
   A stateful pipelet may be used for detect conflicts. Conflicts happen when:
     - Two or more add operations have the same key
     - A remove or update operation does not find a matching value
   
   Conflict detection can be differentiated from unordered operations because unordered
   operations are transitional and should be compensated 'soon' after these are received.
   
   'soon' may go from milliseconds in the closed context of multi-process distribution on a
   non-overloaded single machine, to over ten minutes in a catastrophic event where all
   replicas of a chard are temporarily unavailable.
   
   Therefore conflict can be detected faster if the state of availability of all chards
   is known by the conflict detector.
   
   A conflict detection pipelet would emit 'conflicts' using enit_add(). A conflict
   contains:
     - The content of operation that led to the conflict
     - all meta-information for this operation such as user ids, timestamps, etc..
     
   Once the conflict is resolved, through add, remove, and update operations, the conflict
   detection pipelet emits a remove opetation on the conflict. All conflicts are resolved
   when the size of the resulting conflict set is zero.
   
   Conflict Resolution:
   -------------------
   Conflict resultion is performed by agents processing conflits, with or without the help
   of users of the system.
   
   The most simple and automatic conflict resolution agent reverts all conflicts
   operations:
     - add become remove
     - remove become add
     - update is reverted, i.e. previous and new values are swapped
   
   Persistance:
   -----------
   Persistance is achieved using stateful pipelets that store all operations into some mass
   storage.
   
   These operations can be stored in any order over many chards maintained by many independent
   servers.
   
   Upon storing transactions, meta-information can be added such as timestamps and user ids.
   
   Replication:
   -----------
   Replication is achieved by persisting the same set of operations over more than one set
   of chards.
   
   Initialisation and restart synchronisation between replicas may be optimized using
   timestamps allowing to fetch a subset of set.
   
   Data Versionning:
   ----------------
   Because persistance is achived by storing all operations, all previous versions of all
   objects can be reconstructed.
   
   The requirement for a unique identity enables to re-order operations on every object.
   
   Reconstruction can be done forward by processing operations in storage order, or
   backward by reverting operations in reverse storage order.
   
   Compaction and Version Discarding:
   ---------------------------------
   For performance and privacy issues, it may be desirable to dicard past versions of
   objects on all replicas. This can be achieved by several strategies:
   
   - Full compacting, by storing the current state and anti-state of a chard. Doing
     so, all meta information of the orginal operations will most likely be discarded.
   
   - Selective object(s) compacting, by combining a number of operations into either
     a single add operation corresponding to the last update for that object or the
     complete removal of all operations if the last operation is remove. This method
     can be used to preserve timestamps and other meta-data by using that of the last
     update.
   
   Snapshots:
   ---------
   A snapshot is a point-in-time copy of the a database. It can be achieved using
   operations timestamps by copying the content of all chards up to that timestamp.
   
   During snapshots, compaction must be delayed.
   
   Queries:
   -------
   This is a design and work in progress.
   
   In our initial implementation of Connected Sets when a stateful pipelet connects to its
   upstream pipelet, it automatically fetches its source content that may be filtered by
   stateless pipelets such as where().
   
   These stateless pipelets in turn fetch their upstream content but without indicating that
   these are interested only by a subset of the source content.
   
   This works fine in a local environement but if the stateless pipelet and its upstream
   pipelet are interconnected through a low-bandwidth network, such as the internet, and if
   the set's content is large it may take a long time and become wastful to fetch the entire
   source to discard most of the content.
   
   To prevent this tremendous waste of ressources, we have implemented a Query class and
   a QueryTree pipelet that still need to be integrated with fetch() and pipelets emitters.
   
   In this new design, fetch() provides a Query and pipelet emitters filter their outputs
   using a QueryTree instead of Fork.
   
   Stateless pipelets combine their queries upstream, via their fetch() while stateful
   pipelets filter their outputs using QueryTree. Stateless pipelets therfore perform
   a lazy evaluation, while staeful pipelets force content fetching.
*/

/* -------------------------------------------------------------------------------------------
   Pipelet Design Guidelines
   
   Introduction
     Pipelet design is an essential process that helps reuseability but can also constrain the
     architecture of applications. As such it is important to think about this part of the
     design even more carefully than the implementation. The later is easier to fix that the
     specification of components once they are reused in applications.
   
   Behavior
     Each pipelet should have a clear and simple behavior. More complex behaviors can be built
     easiy using Compose().
     
     Always prefer stateless pipelets, using alter() when performances are not critical.
     Stateless pipelets can be distributed easily and have the smallest memory footprint.
     
     Design stateful pipelets only when there is no other option.
     
   Naming
     Arguably, the most important part of pipelet design is to give it a good name.
     
     It should have the following qualities: be descriptive, non-deceptive, and easy to
     remember.
     
     If the name is hard to come-by, it may be because either the pipelet is doing too many
     things and should be split into several pipelets, or that its behavior is not clear.
     Therefore naming difficulties can help reconsider the actual service provided by the
     pipelet.
     
     In addition to that the name should be prefixed with the name of the module to prevent
     collisions, e.g. bootstrap_carousel() for the carousel pipelet of the bootstrap module.
     
   Parameters and Options
     All optional parameters should go into the last parameter object of the pipelet, the
     'options' parameter that is also handled by set_default_options().
     
     No mandatory parameters should be included into the options parameter.
     
   Pipelet Options vs Independant Pipelets
     Instead of using options, anything that can be implemented as a pipelet should be,
     unless there are significant performance issues. Options should be reserved for things
     that cannot be implemented as pipelet or when significant performance issues require
     merging features into the same pipelet.
     
     Example, at some point we had a set_flow option for set(). This option is supposed to
     be used on few pipelets, but yet was cluttering the code for set(). By extracting the
     code into a set_flow() pipelet, the clutter has been removed, performance improved for
     all other sets, maintainability was improved and this was implemented in fewer lines
     of code, all of this at the expense of reduced performance that is deemed not
     essential at this time.
     
   Documentation
     No pipelet is reusable unless it is properly documented.
     
     The documentaiton shoud include:
       - the name of the pipelet as a function with its parameters
       - the description of all parameters, documenting defaults for optional parameters
       - the description of the expected incoming dataflow
       - the description of outgoing dataflow
*/

"use strict";

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    
    require( './code.js' );
  } else {
    XS = exports.XS;
  }
  
  var log        = XS.log
    , extend     = XS.extend
    , subclass   = XS.subclass
    , Code       = XS.Code
    , u
  ;
  
  var push = Array.prototype.push
    , slice = Array.prototype.slice
    , concat = Array.prototype.concat
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs pipelet, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     more( [ options ] )
     
     Helper function to add the "more" option into optional options.
     
     Returns options Object with more set to true.
     
     Optional Parameter:
       - options: (Object)
  */
  function more( options ) {
    if ( options ) {
      if ( options.more ) return options;
      
      options = extend( {}, options );
      options.more = true;
      
      return options;
    } else {
      return { more: true };
    }
  } // more(()
  
  XS.more = more;
  
  /* -------------------------------------------------------------------------------------------
     only_more( [ options ] )
     
     Helper function to get options with only the more option set from source options.
     
     Always return an Object with a single attribute:
       - more: (Boolean):
         - true : input options had a "truly" property "more"
         - false: no input options, no property "more", or "falsy" property "more"
     
     Optional Parameter:
       - options: (Object)
  */
  function only_more( options ) {
    return options && options.more ? { more: true } : { more: false }
  } // only_more(()
  
  XS.only_more = only_more;
  
  /* -------------------------------------------------------------------------------------------
     Query Dataflow.
     
     A query is a dataflow of 'OR-AND' expressions, where each object is an operand of the OR
     expression and each property of each object is an operand of the sub-AND expression.
     
     Example: The dataflow
       [
         { flow: 'users', id: 1092 },
         { flow: 'stores', id: 231 }
       ]
       
       Will be interpreted as a query dataflow: Objects where
         ( flow === 'users' &&  id === 1092 ) || ( flow === 'stores' && id === 231 )
     
       Which is also equivalent to an SQL-where clause:
         ( flow = 'users' AND id = 1092 ) OR ( flow = 'stores' AND id = 231 )
     
     This class provides boolean arithmetic for queries. Queries are used by Pipelet..fetch() to
     retrieve a subset of values from a source dataflow and Pipelet.emit_xxx() to filter emitted
     operations.
     
     Query objects are created using a set as a parameter, the filter code is generated using
     generate() generating the filter() method that filters an Array of Objects.
     
     A query can be "ORed" with an other query to result in the ORed combination of both
     queries. This is useful to merge a number of branches and build an optimized query for all
     these branches.
     
     A query can be "ANDed" with an other query to result in the ANDed combination of both
     queries. This is useful to restrict one query by another one when two filters are connected
     one downstream of the other. A use case if for combining an authorization query with a user
     query requesting a subset of what this user is authorized to request.
     
     Last, but not least, multiple queries can be combined to produce and maintain in realtime
     an optimized decision tree to allow fast dispatching of a dataflow to many clients each
     with a different query filtering what it processes.
     
     First version queries do not support:
       - Nested attributes that we plan to implement using the dot notation e.g. 'a1.a2.a3',
       
       - Non-strict-equality comparison such as 'not', 'greater than', etc, that we plan to
         implement using object values, e.g. v: { $gt: 5, $lt: 10, $not: 7 } which would mean:
         v > 5 AND v < 10 AND v !== 7
         
       - Regular expressions, that we plan to implement using objects e.g. { $matches: '' }
       
       - OR sub-expressions nested within AND sub-expressions, which can already be expressed
         with OR-AND expressions supported from version 1. However a compiler might reduce other
         arbitrarily nested expressions into the base OR-AND form that is well suited for
         optimized query arithmetics.
         
       - Strings such as SQL-where expressions that a compiler might compile to a valid OR-AND
         query.
  */
  function Query( query ) {
    this.query = query;
    
    return this;
  } // Query()
  
  extend( Query.prototype, {
    /* -----------------------------------------------------------------------------------------
       query.or( q1 )
       
       OR two queries. The result is optimized to provide the least number of OR-expressions in
       the resulting query.
       
       Example:
         new Query( [ { flow: 'store' } ] ).or( [ { flow: 'user' } ] )
         
         results in the query:
           [ { flow: 'store' }, { flow: 'user' } ]
       
       Optimized Example:
         new Query( [ { flow: 'store', id: 1465 } ] ).or( [ { flow: 'store' } ] )
         
         results in the query:
           [ { flow: 'store' } ]
         
         There is only only one subquery because it is less restrictive, OR-wise than the other
         query.
    */
    or: function( q1 ) {
      if ( q1 instanceof Query ) q1 = q1.query;
      
      // All variables with a trailing 0 correspond to the current query
      // All variables with a trailing 1 correspond to q1, the parameter query
      var q0 = this.query, result = []
        , i0 = -1, i1 = -1, e0, e1, keys0s = []
      ;
      
      // Cache keys for query 0
      while ( e0 = q0[ ++i0 ] ) keys0s.push( Object.keys( e0 ) );
      
      while ( e1 = q1[ ++i1 ] ) {
        var keys1 = Object.keys( e1 )
          , added = false
          , i0 = -1
        ;
        
        // Optimize by adding the least number of queries to the result set
        while( e0 = q0[ ++i0 ] ) {
          var keys0 = keys0s[ i0 ], key, e
            , i = -1, p, less_restrictive = true
          ;
          
          // Based on the number of properties, determine which expression can be less restrictive, OR-wise than the other
          if ( keys0.length <= keys1.length ) {
            key = keys0; e = e0;
          } else {
            key = keys1; e = e1;
          }
          
          // Is e1 is less restrictive, OR-wise, than e0?
          while ( p = key[ ++i ] ) {
            if ( e0[ p ] !== e1[ p ] ) {
              less_restrictive = false;
              
              break;
            }
          }
          
          if ( less_restrictive ) {
            if ( e === e1 ) {
              result.push( e1 );
              
              // Remove e0 from result set and keys0 so that we no longer look it up
                 q0.splice( i0, 1 );
              keys0.splice( i0, 1 );
            }
            
            // e1 is either in result or more restrictive than e0
            added = true;
            
            break;
          }
        } // for all sub expression from q0
        
        // Add e0 and e1 into result query if none was less restrictive than another
        added || result.push( e1 );
      } // for all sub expression from q1
      
      // add result to 
      q0.push.apply( q0, result );
      
      return this;
    }, // or()
    
    /* -----------------------------------------------------------------------------------------
       query.and( q1 )
       
       AND two queries. The result is optimized to provide the least number of OR-expressions in
       the resulting query.
       
       Example:
         new Query( [ { flow: 'store', id: 1465 }, { flow: 'store', id: 3678 } ] )
           .and( [ { id: 3678 } ] )
         
         results in the query:
           [ { flow: 'store', id: 3678 } ]
           
       Algorithm:
         1/ Factorize ( p00 .. OR p0n ) AND ( p10 .. OR p1n ) into l0 x l1 AND terms:
            ( p00 AND p10 ) .. OR ( p00 AND p1n ) .. OR ( p0n AND p10 ) .. OR ( p0n AND p1n )
            
         2/ To perform pi AND pj, lookup properties of pi and pj, pick the one that has the
            least number of properties, let it be pa and the other pb, then:
            - if one property of pa exists in pb but with a diffent value, then the result is
              always false, and no term is produced
            - if all properties of pa are either not present of have the same value in pb, then
              extend pa with pb to produce the ANDed object
            
         3/ Or the result of the previous operation produced terms with previously accumulated
            results using optimized Query..or()
    */
    and: function( q1 ) {
      if ( q1 instanceof Query ) q1 = q1.query;
      
      // All variables with a trailing 0 correspond to the current query
      // All variables with a trailing 1 correspond to q1, the parameter query
      var u, q0 = this.query, result = new Query( [] ), i0 = -1, i1 = -1, p0, p1, keys0s = [], keys1s = [];
      
      // Cache keys for query 0 and 1
      while ( p0 = q0[ ++i0 ] ) keys0s.push( Object.keys( p0 ) );
      while ( p1 = q1[ ++i1 ] ) keys1s.push( Object.keys( p1 ) );
      
      for ( i0 = -1; p0 = q0[ ++i0 ]; ) {
        var k0 = keys0s[ i0 ], k0l = k0.length;
        
        for ( i1 = -1; p1 = q1[ ++i1 ]; ) {
          // Perform p0 AND p1
          var k1 = keys1s[ i1 ], k1l = k1.length, ka, pa, pb;
          
          // Let ka be the smallest key, pa the property with the smallest ket, and pb be the property with the largest key
          if ( k0 < k1 ) {
            ka = k0; pa = p0; pb = p1;
          } else {
            ka = k1; pa = p1; pb = p0;
          }
          
          for ( var i = -1, produce = true; p = ka[ ++i ]; ) {
            var t1 = pb[ p ];
            
            if ( t1 !== u && t1 !== pa[ p ] ) {
              // the result of this term is always false
              produce = false;
              
              break;
            }
          }
          
          if ( produce ) result.or( [ extend( {}, pa, pb ) ] )
        }
      }
      
      return result;
    }, // and()
    
    /* -----------------------------------------------------------------------------------------
      generate()
      
      Generate filter() function from query.
      
      Example:
        new Query(
          [
            { flow: 'store' },
            { flow: 'user', id: 231 }
          ]  
        ).generate()
        
        Generates code such as:
          this.filter = function( values ) {
            var out = [];
            
            for( var i = -1, l = values.length; ++i < l;  ) {
              var v = values[ i ];
              
              var _flow = v.flow;
              
              if( _flow === "store" ) { out.push( v ); continue; };
              if( _flow === "user" && v.id === 231 ) { out.push( v ); continue; };
            } 
            
            return out;
          } // Query..filter()
    */
    generate: function() {
      var u, q = this.query, l = q.length;
      
      if ( l === 0 ) throw new Error( 'Query..generate(), query is empty, filter would always return []' );
      
      var terms_counts = {}, vars = [];
      
      // Determine which terns (attributes of proposition Objects) should be cached as variables:
      //   Those which are used more than once
      for ( var i = -1; ++i < l; ) {
        var p = q[ i ], e = [];
        
        for ( var t in p ) {
          var count = terms_counts[ t ];
          
          if ( count ) {
            if ( ++terms_counts[ t ] == 2 ) {
              vars.push( '_' + t + ' = v.' + t )
            }
          } else {
            terms_counts[ t ] = 1;
          }
        }
      }
      
      var code = new Code()
        ._function( 'this.filter', u, [ 'values' ] )
          ._var( 'out = []' )
          
          ._for( 'var i = -1, l = values.length', '++i < l' )
            ._var( 'v = values[ i ]' );
            
            if ( vars.length ) code._var( vars );
            
            for ( i = -1; ++i < l; ) {
              var p = q[ i ], e = [];
              
              for ( var t in p ) {
                var v = p[ t ];
                
                if ( typeof v == 'string' ) v = '"' + v + '"';
                
                e.push( ( terms_counts[ t ] > 1 ? '_' : 'v.' ) + t + ' === ' + v );
              }
              
              code.add( 'if( ' + e.join( ' && ' ) + ' ) { out.push( v ); continue; }' );
            }
            
            code
          .end()
          
          .add( 'return out' )
        .end( 'Query..filter()' )
      ;
      
      eval( code.get() );
      
      return this;
    } // generate()
  } ); // Query instance methods
  
  /* -------------------------------------------------------------------------------------------
     Query_Tree( options )
     
     A Pipelet that receives Query(ies) and produces an optimized decision tree used by Fork to
     efficiently dispatch operations to a large number of downstream pipelets each filtered by
     potentially complex query with dozens or hundreds of terms.
     
     A trivial dispatcher evaluates sequentially each query for each operation to produce
     filtered dataflows. This works well if the number of downstream pipelets is small but when
     it becomes large with hundreds or thousands of downstream pipelets the evaluation of all
     queries for all operations becomes a major bottleneck.
     
     This is the case when the dispatcher is used to serve a dataflow to thousands of web
     socket clients, for either a successful application or a large number of applications
     sharing the same infrastructure to dispatch the same dataflows to a large number of web
     socket clients.
     
     The trivial implementation completes in O( n * t ) time, where n is the number of
     downstream clients and t the average number of terms of Query(ies).
     
     The Query_Tree implementation can reduce this evaluation time when the queries have common
     terms such as these queries:
       [ { flow: 'user', id: 5  }, { flow: 'store', id: 8 } ] for user_5
       
       [ { flow: 'user', id: 7  }, { flow: 'store', id: 8 } ] for user_7
       
       [ { flow: 'user', id: 12 }, { flow: 'store', id: 8 } ] for user_12
       
       [ { flow: 'user', id: 3  }, { flow: 'store', id: 2 } ] for user_3
       
     In this case, instead of evaluating the two queries sequentially, the Query_Tree allows to
     evaluate the 'flow' term first for both queries simultaneously, then branch out to two
     branches, one for the value 'user', the other for the value 'store'. The 'user' branch has  
     four sub-branches, for id 5, 7, 12, and 3. The 'store' branch has two sub-branches for
     id 8 and 2 (note that the implementation's tree has a slightly different structure):
     
       { "flow": {
         "user": { "id": { "5": user_5, "7": user_7, "12": user_12, "3": user_3 } },
         
         "store": { "id": { "8": [ user_5, user_7, user_12 ], "2": user_3 } }
       } }
     
     Now in the worst case scenario, finding the full list of recipients for an operation
     requires to evaluate two terms versus 12 terms for the trivial implementation. But
     most importantly, as the number of users connected to this dispatcher increases, the
     Query_Tree will always find the list of all recipients after evaluating two terms, versus
     ( 2 or 3 ) * n terms for the trivial dispatcher.
     
     Finding the full list of recipients using the Query_Tree completes in O( t ) time vs
     O( n * t ) time for the trivial implementation.
     
     If one considers that the number of terms is bound only by the complexity of the
     application, then these O numbers can be understood as:
     
       O( application_complexity * number_of_connected_users )
     vs
       O( application_complexity )
     
     Obviously the second is user-scalable while the first is not.
     
     Both algorithms do not scale with application complexity which therfore must be dealt with
     raw performence. This performance is improved with ConnectedSets by merging queries
     upstream using Query..and() and Query..or() as well as joins. This is particularly useful
     for authorization rules that arguably constitute the largest source of complexity for
     modern web applications.
  */
  function Query_Tree( options ) {
    this.init_query_tree();
    
    return Pipelet.call( this, options );
  } // Query_Tree()
  
  var Query_Tree_Prototype = {
    init_query_tree: function() {
      this.query_tree_top = this.new_query_tree_node();
      
      return this;
    },
    
    new_query_tree_node: function() {
      return {
        branches         : {}, // hashed by terms' keys, each branch is the hashed by terms' values to lead to it's sub-node 
        keys             : [], // all the term keys for the above branches
        recipients       : [], // all recipients
        recipients_values: [], // all recipients values as they are accumulated
        transaction_ids  : {}  // Of transactions in progress (not completed)
      };
    }, // new_query_tree_node()
    
    query_tree_add: function( or_terms, recipient ) {
      var that = this
        , top = that.query_tree_top
        , or_term
        , i = -1
      ;
      
      // For all OR-terms of this OR-AND query or partial query
      while( or_term = or_terms[ ++i ] ) {
        // Lookup (or create) the leaf node for this OR-term
        add_term( top, or_term, Object.keys( or_term ) );
      }
      
      return this;
      
      // Add all keys of a term, descending the tree, creating new nodes as needed
      function add_term( node, term, term_keys ) {
        while( term_keys.length ) {
          // There are still some term keys not located in the tree
          
          var branches = node.branches
            , keys     = node.keys
            , branch, key, u, v = u
          ;
          
          for( var i = -1; key = keys[ ++i ]; ) {
            // Lookup this node key in the term
            if ( ( v = term[ key ] ) === u ) continue; // Not found, keep looking
            
            // Found an existing node key for which there is a property in this term
            // Remove this key from term_keys
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in Query_Tree..add()
            
            // Lookup branch for this key, it must exist because it is created when a key is added
            branch = branches[ key ];
            
            // Lookup the sub-node for this value or create one if none exists
            node = branch[ v ] || ( branch[ v ] = that.new_query_tree_node() );
            
            break;
          }
          
          if ( v !== u ) continue;
          
          // No existing node key found in this term
          // Retreive the first key from term keys, add it to this node's keys
          keys.push( key = term_keys.shift() );
          
          // Create new branch with this key
          branch = branches[ key ] = {};
          
          // Create sub-node for first value in this new branch
          node = branch[ v = term[ key ] ] = that.new_query_tree_node();
        }
        // No more term keys to locate or create in this tree
        // We have found (or created) the leaf node for this term
        // Add this term's recipient to this leaf
        node.recipients.push( recipient );  // recipients is always defined unless there is a bug in Query_Tree() or add_value()
        
        return node; // return the leaf node
      } // add_term()
    }, // query_tree_add()
    
    query_tree_remove: function( or_terms, recipient ) {
      var that = this
        , top = that.query_tree_top
        , or_term
        , i = -1
      ;
      
      // For all OR-terms of this OR-AND query or partial query
      while( or_term = or_terms[ ++i ] ) {
        remove_term( top, or_term, Object.keys( or_term ) );
      }
      
      return this;
      
      // Remove term from sub-tree, descending the tree recursively
      function remove_term( node, term, term_keys ) {
        var recipients = node.recipients
          , keys       = node.keys
        ;
        
        if ( term_keys.length ) {
          // There are still some term keys not located in the tree
          
          var branches = node.branches, branch, key, u, v = u;
          
          for( var i = -1; key = keys[ ++i ]; ) {
            // Lookup this node key in the term
            if ( ( v = term[ key ] ) === u ) continue; // Not found, keep looking
            
            // Found the node key for which there is a property in this term
            // Remove this key from term_keys
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in Query_Tree..add()
            
            // Lookup branch for this key, it must exist because it is created when a key is added
            branch = branches[ key ];
            
            // Lookup the sub-node for this key's value
            if ( remove_term( branch[ v ], term, term_keys ) ) {
              // The branch is now empty, remove it
              delete branch[ v ];
              
              if ( Object.keys( branch ).length == 0 ) {
                // There are no more values in this branch, renove this branch
                delete branches[ key ];
                
                keys.splice( keys.indexOf( key ), 1 );
              }
            }
            
            break;
          } // For all node keys
          
          if ( v === u ) throw new Error( 'Query_tree..remove(), term not found' );
        } else {
          // No more term keys to locate or create in this tree
          // We have found the leaf node for this term
          // Remove recipient from leaf
          var index = recipients.indexOf( recipient );
          
          // ToDo: this exception was seen: reproduce and fix
          if ( index == -1 ) throw new Error( 'Query_tree..remove(), Cannot find receipient in tree where it was expected' );
          
          recipients.splice( index, 1 );
        }
        
        // Return true is the node is now empty, false if not empty
        // It is empty if if has no recipients and no keys
        return ( recipients.length + keys.length ) == 0;
      } // add_term()
    }, // query_tree_remove()
    
    // ToDo: optimize unfiltered routing in top node.
    query_tree_emit: function( operation, values, options ) {
      var top = this.query_tree_top;
      
      // Each recipient is an object:
      //  p: recipient pipelet
      //  v: values to emit
      var recipients = []
        , pushed // for each value, true if this recipient already has this value, to prevents duplicates
        , i, p, v, rl
      ;
      
      switch( operation ) {
        //case 'update':
        // ToDo: implement update operation.
        //return this;
        
        case 'clear':
          clear( top, options );
          
          for ( i = -1, rl = recipients.length; ++i < rl; ) {
            p = recipients[ i ];
            
            p.source_recipient_index = 0;
            
            p.clear( options );
          }
        return this;
      }
      
      // Route each value independently, to accumulate filtered node.recipients_values in each node
      for ( i = -1; v = values[ ++i ]; ) pushed = [], emit_value( top, recipients, v );
      
      // Get no_more and transaction_id from options
      var no_more, transaction_id;
      
      if ( options ) {
        no_more = ! options.more;
        transaction_id = options.transaction_id || '';
      } else {
        no_more = false;
        transaction_id = '';
      }
      
      // Emit accumulated values in recipients[] from previous loop
      recipients_emit();
      
      return this;
      
      function recipients_emit() {
        // ToDo: handle more flag and provide tests for more
        
        for ( var i = -1, l = recipients.length; ++i < l; ) {
          var r = recipients[ i ], p = r.p;
          
          p.source_recipient_index = 0;
          
          p[ operation ]( r.v, options );
        }
      } // recipients_emit()
      
      // Route value, recursively
      function emit_value( node, recipients, value ) {
        var keys            = node.keys, key
          , branches        = node.branches
          , node_recipients = node.recipients
          
          , rl              = node_recipients.length
          , i, v, child
        ;
        
        // Push value into this node's recipients
        // Except if this value was already pushed to some recipients, preventing duplicates
        // This also guaranties that operations are sent in the same order received although this is not a requirement
        // Duplicates may happen on queries with an intersection
        // This also simplifies emission greatly at a the higher cost of this loop that depends on the number of recipients
        // for this operation
        for( i = -1; ++i < rl; ) {
          var p = node_recipients[ i ]
            , recipient_index = p.source_recipient_index
          ;
          
          if ( recipient_index ) { // defined and not-zero
            // This pipelet already has at least one value
            if ( pushed[ recipient_index ] ) continue; // this pipelet is already marked for this value, do not duplicate
            
            pushed[ recipient_index ] = 1;
            
            recipients[ recipient_index - 1 ].v.push( value );
          } else {
            // This pipelet does not have any value
            recipients.push( { p: p, v: [ value ] } );
            
            pushed[ p.source_recipient_index = recipients.length ] = 1; // pushed[] indexes start at 1
          }
        }
        
        // Lookup child nodes for possible additional matches
        for( i = -1; key = keys[ ++i ]; ) {
          if ( ( v = value[ key ] ) !== u && ( child = branches[ key ][ v ] ) ) {
            // We have a value for this term and this value has a child node, descend
            emit_value( child, recipients, value );
          }
          // Keep looking for other possible matches
        } // for all term keys
      } // emit_value()
      
      /*
      // Emit accumulated values, recursive
      // Deprecated
      function emit( node, operation, no_more, transaction_id, options ) {
        var values = node.recipients_values;
        
        // Emit this operation values to this node's recipients
        if ( no_more ) {
          // This is the end of a transaction
          var transaction_ids;
          
          if ( transaction_id && ( transaction_ids = node.transaction_ids )[ transaction_id ] ) {
            // This transaction is complete
            
            // Remove transaction id from the list of transactions not completed
            delete transaction_ids[ transaction_id ];
            
            // Emit even if there are no values
            _emit( operation, values, options );
          } else if ( values.length ) {
            // Even if this transaction is not complete, emit because there are values
            _emit( operation, values, options );
          }
        } else if ( values.length ) {
          // We are in the middle of a transaction, with values to emit
          
          // Record this tranasction id as a not-completed transaction
          if ( transaction_id ) node.transaction_ids[ transaction_id ] = true;
          
          _emit( operation, values, options );
        }
        
        // Lookup all child nodes to emit
        var branches = node.branches, keys = node.keys, key, i = -1;
        
        while ( key = keys[ ++i ] ) {
          var branch = branches[ key ];
          
          for ( var value in branch )
            emit( branch[ value ], operation, no_more, transaction_id, options );
        }
        
        // Emit values to all recipients
        function _emit( operation, values, options ) {
          var recipients = node.recipients, rl = recipients.length;
          
          for ( var i = -1; ++i < rl; ) recipients[ i ][ operation ]( values, options );
          
          // Empty recipients_values for next operation
          node.recipients_values = [];
        } // _emit()
      } // emit()
      */
      
      function clear( node, options ) {
        // Lookup all recipients to clear
        var branches        = node.branches
          , keys            = node.keys
          , node_recipients = node.recipients
          
          , rl = node_recipients.length
          , i, key
        ;
        
        // Send clear only once per recipient pipelet
        for( i = -1; ++i < rl; ) {
          var p = node_recipients[ i ]
            , recipient_index = p.source_recipient_index
          ;
          
          if ( recipient_index ) continue; 
          
          // This pipelet is not marked for clearing yet
          recipients.push( p );
          
          p.source_recipient_index = recipients.length;
        }
        
        for( i = -1; key = keys[ ++i ]; ) {
          var branch = branches[ key ];
          
          for ( var value in branch ) clear( branch[ value ], options );
        }
      } // clear()
    }, // query_tree_emit()

    /* ------------------------------------------------------------------------
       query_tree_pause( destination )
       
       Pause emit_xxx to destination
    */
    query_tree_pause: function( destination ) {
      // ToDo: implement
      return this;
    }, // query_tree_pause()
    
    /* ------------------------------------------------------------------------
       query_tree_resume( destination )
       
       Resume emit_xxx to destination
    */
    query_tree_resume: function( destination ) {
      // ToDo: implement
      return this;
    } // query_tree_resume()
  }; // Query_Tree instance methods
  
  /* -------------------------------------------------------------------------------------------
     Pipelet( options )
     
     A Pipelet processes one upstream source dataflow and provides one downstream dataflow.
     
     Parameters:
       options: (Object) optional parameters
         
     This is the base class of all Pipelets, providing the low-level dataflow service for XS
     applications.
  */
  
  function Pipelet( options ) {
    this.options = options || {};
    
    this.source = this.destination = u; // No source or desination yet
    
    // Stateless pipelets do not need to add their content during add_source()
    this.no_add = true;
    
    // The more flag indicates if this pipelet is expected to emit more 'add',
    // 'remove', 'update', or 'clear' events to its downstream pipelets
    this.more = false;
    
    // Objects's key
    this.key = this.options.key;
    
    // Events listeners
    this.events = {};
    
    this.init_query_tree();
    
    return this;
  } // Pipelet()
  
  var p = Pipelet.prototype;
  
  extend( p, Query_Tree_Prototype, {
    /* ------------------------------------------------------------------------
       fetch( receiver [, query] )
       
       Fetches the content of this set, possibly in chunks.
       
       This is the stateless version, it must be overloaded by stateful
       pipelets.
       
       Parameters:
         - receiver: function that will be called for each chunk of data and
           which signature is  receiver( values, no_more ):
             - values: (Array) of values for each chunk
             
             - no_more: indicates the last chunk if truly
             
       Optional Parameters:
         - query: (Query)
    */
    fetch: function( receiver, query ) {
      var that = this;
      
      // After a first fetch, if any other source is added, fetch from that
      // source
      this.no_add = false;
      
      if ( query ) {
        var query_tree = this.query_tree;
        
        query_tree || ( query_tree = this.query_tree = this.query_tree() );
        
        query_tree.add( query, { recipient: recipient } );
        
        if ( this.query ) {
          this.query.or( query );
        } else {
          this.query = query;
        }
      }
      
      return this._fetch_source( function( values, no_more ) {
        if ( values && values.length ) values = that.transform( values, {}, 'fetch' );
        
        receiver( values, no_more );
      }, query );
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       _fetch_source( receiver )
       
       Fetches the content of this source set, possibly in chunks.
       
       This method should only be used by derived classes.
       
       Parameter:
         - receiver: (function) see fetch() for definition 
    */
    _fetch_source: function( receiver, query ) {
      var s = this.source;
      
      if ( s ) {
        s.fetch( receiver, query );
      } else {
        receiver( [], true ); // No source, so this is an empty set
      }
      
      return this;
    }, // _fetch_source()
    
    /* ------------------------------------------------------------------------
       fetch_all( [ receiver ] )
       
       Fetches the entire content of the source set.
       
       This method should only be used for debugging and testing purposes or
       when the full state is known to be 'small' (can fit entirely in memory)
       and the source fetched is always on the same thread.
       
       For large sets, use fetch() instead that allows to retreive the content
       in 'reasonable' size chunks that require less memory.
       
       Parameter:
         - receiver: (optional function) see fetch() for definition.
           
           This function must be provided if the source is not in the same
           thread. Otherwise an exception will be raised.
           
       Returns:
         Undefined: the source is not in the same process or worker thread,
           therefore the result is assynchronous and cannot be known at the
           time when fetch_all() returns.
         
         Array of values: the source is in the same process or worker thread,
           the fetch_all() method is therefore synchronous and the returned
           value contains the Array of all the values of the set.
         
       Exceptions:
         If the method is asynhronous, because the source is in a different
         process or worker thread, and no receiver function is provided, an
         exception will be raised.
         
         If a chunk is received after the last chunk was received.
    */
    fetch_all: function( receiver ) {
      var that = this, u, out;
      
      if ( this.fetch === Pipelet.prototype.fetch ) {
        // fetch has not been overloaded so this is a stateless pipelet
        // Can optimize using _fetch_source_all() to do a single transform
        this._fetch_source_all( function( values, no_more ) {
          out = that.transform( values, {}, 'fetch' );
          
          receiver && receiver( out, no_more );
        } );
      } else {
        var chunks = [];
        
        this.fetch( function( values, no_more ) {
          if ( out ) throw new Error( "Pipelet..fetch_all(): received extra chunck after no_more" );
          
          if ( values && values.length ) chunks.push( values );
          
          if ( no_more ) {
            out = concat.apply( [], chunks );
            
            receiver && receiver( out, no_more );
          }
        } );
      }
      
      if ( out === u && receiver === u ) throw new Error( "Pipelet..fetch_all() is asynchronous and no receiver function was provided" );
      
      return out;
    }, // fetch_all()
    
    _fetch_source_all: function( receiver ) {
      var chunks = [], out, u;
      
      this._fetch_source( function( values, no_more ) {
        if ( out ) throw new Error( "Pipelet..fetch_all(): received extra chunck after no_more" );
        
        if ( values && values.length ) chunks.push( values );
        
        if ( no_more ) {
          out = concat.apply( [], chunks );
          
          receiver && receiver( out, no_more );
        }
      } );
      
      if ( out === u && receiver === u ) throw new Error( "Pipelet..fetch_all() is asynchronous and no receiver function was provided" );
      
      return out;
    }, // _fetch_source_all()
    
    /* ------------------------------------------------------------------------
       transform( values, options, caller )
       
       Transforms an array of values into an other array of values according
       to the current pipelet role.
       
       Default is to return all values unaltered. Every pipelet should either
       implement transform() if it is stateless or fetch() if it is statefull
       and/or implement add(), remove(), and update().
       
       Parameters:
         - values : (Array) values to transform
         - options: (Object) from add / remove / update
         - caller : (String) the name of the function that called transform.
             current values are 'fetch', 'add', and 'remove'. Update calls the
             transform twice, first as 'remove', then as 'add'.
    */
    transform: function( values ) {
      return values;
    }, // transform()
    
    /* ------------------------------------------------------------------------
       notify( transaction [, options ] )
       
       Executes a transaction, eventually atomically (everything succeeds or
       everything fails).
       
       Parameters:
         - transaction: Array of actions. Each action has attributes:
           - action: string 'add', or 'remove', or 'update'
           - objects: Array of objects for 'add' and 'remove' or updates. An update
             is an Array where the first item is the previous object value and the
             second item is the new object value

         - options: optional object of optional attributes
    */
    notify: function( transaction, options ) {
      var l = transaction.length, i, a;
      
      if ( 0 == l ) return this;
      
      for ( i = -1; ++i < l; ) {
        a = transaction[ i ].action;
        
        switch( a ) {
          case 'add':
          case 'remove':
          case 'update':
          break;
          
          default: throw new Error( 'Pipelet..notify(), Unsuported Action: ' + a  );
        }
      }
      
      if ( l > 1 ) {
        var more = { more: true }, l1 = l - 1;
        
        if ( options ) more = options.more ? options : extend( more, options );
        
        for ( i = -1; ++i < l1; ) {
          a = transaction[ i ];
          
          this[ a.action ]( a.objects, more );
        }
      }
      
      a = transaction[ l - 1 ];
      
      this[ a.action ]( a.objects, options );
      
      return this;
    }, // notify()
    
    /* ------------------------------------------------------------------------
       add( added [, options ] )
       
       Add objects to this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly
       by users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_add() of
       transformed objects by transform().
       
       Parameters:
         added: Array of object values to add
         
         option: optional object
    */
    add: function( added, options ) {
      return this.emit_add( this.transform( added, options, 'add' ), options );
    }, // add()
    
    /* ------------------------------------------------------------------------
       emit_add( added [, options ] )
       
       Notify downsteam pipelets about added objects.
       
       This method is typically called by add() after adding objects.
       
       Users should not call this method directly.
       
       Parameters:
         added: Array of added objects
         
         option: optional object
    */
    emit_add: function( added, options ) {
      return this.emit( 'add', added, options );
    }, // emit_add()
    
    /* ------------------------------------------------------------------------
       remove( removed [, options ] )
       
       Removes objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_remove() of
       transformed objects by transform().
       
       Parameters:
         removed: Array of object values to remove
         
         option: optional object
    */
    remove: function( removed, options ) {
      return this.emit_remove( this.transform( removed, options, 'remove' ), options );
    }, // remove()
    
    /* ------------------------------------------------------------------------
       emit_remove( removed [, options ] )
       
       Notify downsteam pipelets of removed object.
       
       This method is typically called by remove() after removing objects.
       
       Users should not call this method directly.
       
       Parameters:
         - removed: Array of removed object values.
         
         option: optional object
    */
    emit_remove: function( removed, options ) {
      return this.emit( 'remove', removed, options );
    }, // emit_remove()
    
    /* ------------------------------------------------------------------------
       update( updated [, options ] )
       
       Updates objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by this pipelet source.
       
       Unless 'this' has no source, update() should not be called directly.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_update() of
       transformed objects by transform().
       
       If the transform does not return as many values as there are updates,
       this transform uses emit_remove() and emit_add() to perform the
       update.
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         option: optional object
    */
    
    /*
    update: function( updated, options ) {
      var l = updated.length
        , removed, added
        , more_options = more( options )
        , u
      ;
      
      if ( l === 1 ) {
        var update = updated[ 0 ];
        
        removed = this.transform( [ update[ 0 ] ], more_options, 'remove' );
        added   = this.transform( [ update[ 1 ] ], more_options, 'add'    );
        
        if ( removed.length === 1 && added.length === 1 ) {
          return this.emit_update( [ [ removed[ 0 ], added[ 0 ] ] ], options );
        }
      } else {
        updated = Pipelet.split_updates( updated );
        
        removed = this.transform( updated.removed, more_options, 'remove' );
        added   = this.transform( updated.added  , more_options, 'add'    );
        
        if ( removed.length === l && added.length === l ) {
          var out = [];
          
          for( var i = -1; ++i < l; ) {
            out.push( [ removed[ i ], added[ i ] ] );
          }
          
          return this.emit_update( out, options );
        }
      }
      
      return this.emit_operations( added, removed, u, options );
    }, // update()
    */
    
    /* ------------------------------------------------------------------------
       update( updated [, options ] )
       
       Updates objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by this pipelet source.
       
       Unless 'this' has no source, update() should not be called directly.
       
       This method can be overloaded by derived classes, typically for
       performance reasons.
       
       This default version is meant to be semantically correct regardless for
       all pipelets. Each update is excuted in the order of appearance, as
       a remove() followed by an add().
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         option: optional object
    */
    update: function( updates, options ) {
      var l = updates.length;
      
      if ( l ) {
        for ( var i = -1, options_more = more( options ); ++i < l; ) {
          var update = updates[ i ];
          
          this.remove( [ update[ 0 ] ], options_more );
          this.add   ( [ update[ 1 ] ], options_more );
        }
      }
      
      if ( ! ( options && options.more ) ) this.emit_add( [], options ); // dummy add to transmit no-more option
      
      return this;
    }, // update()
    
    /* ------------------------------------------------------------------------
       emit_update( updated [, options ] )
        
       Notify downsteam pipelets of updated object values.
       
       This method is typically called by update() after updating objects.
       
       Users should not call this method directly.
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         option: optional object
    */
    emit_update: function( updated, options ) {
      return this.emit( 'update', updated, options );
    }, // emit_update()
    
    /* ------------------------------------------------------------------------
       clear( [ options ] )
       
       Clears the content of this Pipelet and downstream pipelets.
       
       clear() is usually called when an update requires to clear the state of all
       downstream objects. This is typically done when:
         - when a stream is no longer needed and memory can be reclaimed;
         - all or most values will change and it is more efficient to clear;
         - the state of downstream objects cannot be updated incremetally;
       .
       
       Parameters:
         option: optional object
    */
    clear: function( options ){
      return this.emit_clear( options );
    }, // clear()
    
    /* ------------------------------------------------------------------------
       emit_clear( [ options ] )
       
       Notify downsteam pipelets that all object values should be cleared.
       
       This method is typically called by clear() for clearing downstream objects.
       
       Users should not call this method directly.

       Parameters:
         option: optional object
    */
    emit_clear: function( options ) {
      return this.emit( 'clear', void 0, options );
    }, // emit_clear()
    
    /* ------------------------------------------------------------------------
       emit( event_name, ... )
       
       Emit an event.
       
       If the event_name is one of add, remove, update, or clear, the event
       is propagated to downstream pipelets. The full signature of emit is
       then:
         emit( 'add'   , added    , options )
         emit( 'remove', removed  , options )
         emit( 'update', updates  , options )
         emit( 'clear'            , options )
       
       All other events are not propagated to downstream pipelets and therefore
       must be listened directly on the pipelet using on( event_name, listener )
       .
       
       Parameters:
         - event_name: (String) the name of the event
         - ...: other parameters to send to all listeners
    */
    emit: function( event_name, values, options ) {
      var events = this.events, listeners, l, a = slice.call( arguments, 1 ), name;
      
      de&&( name = 'emit( "' + event_name + '" )' + ( this.options.name ? ', name: ' + this.options.name : '' ) );
      
      switch( event_name ) {
        case 'add': case 'remove': case 'update': case 'clear':
          var more = this.more = options && options.more || false
          //  , d = this.destination
          ;
          
          de&&ug( name
            + ( values ? ', l: ' + values.length : '' )
            + ', more: ' + more
          );
          
          try {
            // !! emit even if values.length == 0 to transmit more flag to downstream pipelets
            // d && d[ event_name ].apply( d, a );
            this.query_tree_emit( event_name, values, options );
          } catch( e ) {
            exception( e )
          }
      } // switch event_name
      
      emit_event();
      
      if ( ! more ) {
        // emit 'complete' event
        event_name = 'complete';
        
        a = [];
        
        emit_event();
      }
      
      return this;
      
      function emit_event() {
        if ( ( listeners = events[ event_name ] ) && ( l = listeners.length ) ) {
          de&&ug( name + ', listeners count: ' + l );
          
          try {
            for( var i = -1; ++i < l; ) {
              var listener = listeners[ i ];
              
              if ( listener.once ) {
                de&&ug( 'removing "once" event listener for event ' + event_name + ', position: ' + i ); 
                
                listeners.splice( i--, 1 );
                
                l -= 1;
              }
              
              listener.listener.apply( listener.that, a );
            }
          } catch( e ) {
            exception( e )
          }
        }
      } // emit_event()
      
      function exception( e ) {
        // ToDo: decode stack trace to resolve urls of minified sources with a source map
        // Alternatively open a feature request in Google and Firefox to decode such urls
        // displayed in the console.
        
        log( 'exception, Pipelet..' + name
          + ', ' + e
          + ', stack trace: ' + e.stack 
        );
        
        // ToDo: send exception to an exception datafow that can be routed to a server
      }
    }, // emit()
    
    /* ------------------------------------------------------------------------
       emit_operations( added, removed, updates [, options ] )
       
       Emits a number of operations ( add / remove / update ) handling the
       "more" option appropriately to guaranty that:
         1 - Multiple operations of the same batch are grouped using the option
             more
         2 - When there is nothing more to be expected, notify downstream
             pipelets if necessary
       
       Parameters:
         - added: (Array) of added values. Can be undefined to specify that
           there is nothing to add.
         
         - removed: (Array) of removed values. Can be undefined to specify that
           this is nothing to remove.
         
         - updates: (Array) of updeted values. Can be undefined to specify that
           this is nothing to update.
         
         - options: (Object) additional options to send to downstream pipelets:
           - more: (Boolean) true if more operations are comming, false if this
             is the last operation of a number of operations
    */
    emit_operations: function( added, removed, updates, options ) {
      var operations = [];
      
      removed && removed.length && operations.push( 'remove' );
      added   && added  .length && operations.push( 'add'    );
      updates && updates.length && operations.push( 'update' );
      
      var l = operations.length
        , more = options && options.more || false
      ;
      
      if ( l ) {
        var that = this, i;
        
        if ( l > 1 ) {
          // There is more than one operation, these need to be emited with
          // the more option set, except the last one that will be emited
          // with unmodified upstream options
          var options_more = XS.more( options )
            , l1 = l -1
          ;
          
          for ( i = -1; ++i < l1; ) emit( options_more );
        } else {
          i = 0
        }
        
        // The last emit should be done with upstream options, so that if
        // the more option is specified uptream, it is transmited
        emit( options );
        
      } else if ( this.more && ! more ) {
        // There is nothing more to send, but the last time we indicated to
        // downstream pipelets that they should expect more, so we now need
        // to notify these that there is indeed nothing more to be expected
        
        // To do this we emit a dummy add() with no options, which means no
        // more.
        this.emit_add( [] );
      }
      
      return this;
      
      function emit( options ) {
        // Note: use emit_xxx() and not emit( 'xxx' ) to allow derived classes
        // to overload emit_xxx() individually.
        // This limitation might be removed in the future if we only allow
        // emit() to be overloaded. ToDo: reconsider this before version 1.0
        switch( operations[ i ] ) {
          case 'add'   : return that.emit_add   ( added  , options ); 
          case 'remove': return that.emit_remove( removed, options );
          case 'update': return that.emit_update( updates, options );
        }
      } // emit()
    }, // emit_operations()
    
    /* ------------------------------------------------------------------------
       on( event_name, listener [, that] [, once] )
       
       once( event_name, listener [, that] )
       
       on_change( listener [, that] )
       
       Set a 'classic' event listener.
       
       !! Warning: This event handling method should not be used by architects
       and works only locally - i.e. it will not be sent to a remote agent. It
       is meant only for pipelet programmers to facilitate implementation or
       testing purposes.
       
       Parameters:
         - event_name: (String) the name of the event.
             
             'change' is a shortcut to set event listeners for 'add', 'remove',
             'update', and 'clear' operations simultaneously. on_change() is a
             shortcut for on( 'change', ..).
             
             The event listener is then called with the following signatures:
               listener( 'add'   , values , options )
               listener( 'remove', values , options )
               listener( 'update', updates, options )
               listener( 'clear' , void 0 , options )
             
         - listener: (Function) will be called with the parameters emited by
             emit(), see emit() for more information.
             
         - that: (Object) optional, the context to call the listener, if not
             specified the context is this pipelet instance or in the case
             of the event 'change', the context of the pipelet created by
             on().
             
         - once: (Boolean) optional, if true, the event listener will be
             removed right before the first emit on this event. This parameter is
             ignored is the event name is 'change'.
    */
    on: function( event_name, listener, that, once ) {
      if ( event_name == 'change' ) {
        this.on( 'add'   , function( v, o ) { listener.call( this, "add"   , v, o ) }, that );
        this.on( 'remove', function( v, o ) { listener.call( this, "remove", v, o ) }, that );
        this.on( 'update', function( v, o ) { listener.call( this, "update", v, o ) }, that );
        this.on( 'clear' , function( v, o ) { listener.call( this, "clear" , v, o ) }, that );
        
        return this;
        // ToDo: remove this comment: return this.on_change( listener, that );
      }
      
      var events = this.events
        , listeners = events[ event_name ] || ( events[ event_name ] = [] )
      ;
      
      listeners.push( { listener: listener, that: that || this, once: once } );
      
      de&&ug( 'on()'
        + ', event "' + event_name + '"'
        + ', name: "' + ( this.options.name || '' ) + '"'
        + ', listeners: ' + listeners.length
        + ', once: ' + once
      );
      
      return this;
    }, // on()
    
    once: function( event_name, listener, that ) {
      return this.on( event_name, listener, that, true );
    }, // once()
    
    on_change: function( listener, that ) {
      return this.on( 'change', listener, that );
      
      /* ToDo: fully retire this code and maybe the function on_change() once everything is tested.
      
      de&&ug( 'on_change()'
        + ', name: "' + ( this.options.name || '' ) + '"'
      );
      
      var p = new Pipelet( this.options );
      
      that || ( that = p );
      
      p.add = function( values, options ) {
        listener.call( that, 'add', values, options );
        
        return this;
      };
      
      p.remove = function( values, options ) {
        listener.call( that, 'remove', values, options );
        
        return this;
      };
      
      p.update = function( updates, options ) {
        listener.call( that, 'update', updates, options );
        
        return this;
      };
      
      p.clear = function( options ) {
        listener.call( that, 'clear', options );
        
        return this;
      };
      
      p.add_source( this, { no_add: true } );
      
      return this;
      //*/
    }, // on_change()
    
    /* ------------------------------------------------------------------------
       _subscribe( destination, query )
       
       fetches data, then updates query tree to add this destination. This
       precise sequence guaranties that the destination is synchronized with
       its sources even if these are remote.
       
       The source of 'destination' must already be set to this using
       _add_source().
       
       Parameters:
         destination: the destination pipelet requesting the subscription
         query      : the Query object that filters this dataflow
         
    */
    _subscribe: function( destination, query ) {
      var that = this;
      
      this.fetch( function( values, no_more ) {
         if ( no_more ) {
           destination.add( values, { no_more: true } );
           
           // This replaces _add_destination()
           that.query_tree_add( query, destination );
         } else if ( values && values.length ) {
           destination.add( values );
         }
      }, query );
      
      return this;
    }, // _subscribe()
    
    /* ------------------------------------------------------------------------
       source.plug( pipelet ).
       
       This is a high-level function for architects. The flow is from the
       source to the pipelet:
       
       source ---> pipelet
       
       Plug a source into a destination pipelet. 
       
       Returns destination pipelet.
    */
    plug: function( pipelet, options ) {
      if ( pipelet.no_add ) options = extend( { no_add: true }, options );
      
      return pipelet.add_source( this, options );
    }, // plug()
    
    /* ------------------------------------------------------------------------
       source.unplug( pipelet ).
       
       This is a high-level function for architects. The broken flow is from
       the source to the pipelet:
       
       source --x--> pipelet
       
       Plug a source into a destination pipelet. 
       
       Returns destination pipelet.
       
       Parameters:
         - pipelet: (Pipelet) the destination pipelet to unplug
         - options:
           - no_fetch: do not fetch the source to remove
    */
    unplug: function( pipelet, options ) {
      return pipelet.remove_source( this, options );
    }, // unplug()
    
    /* ------------------------------------------------------------------------
       add_source( source [, options ] )
       
       Unless option 'no_add' is true, the content of the source is fetched and
       added to this pipelet, possibly assynchonously.
       
       This pipelet is then connected to the upstream 'source' pipelet. If data
       fetching from the previous step is asynchronous.
       
       Parameters:
         - source: (Object) to add as a source to this pipelet.
             
             If source is a Pipelet or an Object providing a fetch() function
             and unless option no_add is true, the content is fetched from the
             source and added to this pipelet using this.add().
             
             If source is an not an instance of Pipelet and does not have a
             fetch() function, it's content is only added to the current
             pipelet using this.add(). It can be an Array but could be any
             other object type that this.add() supports such as a function.
           
         - options: (Object):
           - no_add: (Bollean) if true, do not fetch() and add() values from
               source.
               
               Stateless pipelets do not usually need to fetch their source at
               this stage, because these do not hold a state, unless these are
               already connected to a downstream pipelet. Specifying no_add as
               true prevents this otherwise usless and wastful data fetching.
               
               This is also used by _add_destination() to prevent adding values
               to the first destionation while creating a fork() for a second
               destination.
               
       ToDo: add option for query
    */
    add_source: function( source, options ) {
      if ( source.is_void ) return this;
      
      var that = this, connected;
      
      // Add the source now so that, if a downsteam pipelet trys to fetch()
      // before this pipelet has finished fetching, that a new fetch be
      // requested to this source.
      this._add_source( source );
      
      if ( ! ( options && options.no_add ) ) {
        // Add data from source
        if ( source.fetch ) {
          // ToDo: process options for fetch queries, allowing stateful pipelets to specify a query 
          source.fetch( function( values, no_more ) {
            if ( values && values.length ) that.add( values );
            
            if ( no_more ) {
              if ( connected ) {
                throw new Error( 'Pipelet.add_source(), add_destination(): already connected, no_more received twice from fetch()' );
              }
              connected = true;
              
              // Now that all existing data is fetched, we can finalize
              // the connexion to allow further operations from source to be
              // forwarded to this pipelet.
              add_source_destination();
            }
          } );
          
          return this;
        }
        
        // This source does not provide a fetch method, it could be:
        // - An Array of JavaScript Objects
        // - any other value that this pipelet accepts in add()
        this.add( source );
      } else {
        // Don't fetch data from source, this will be done later
        
        // ToDo: this probably means that we do not need data from the source yet
        // This should be done later, vhen this.fetch is called by a downstream
        // Pipelet, that requires the data.
        //
        // This is a sort of lazy evaluation, allowing downstream pipelets to
        // specify filters for a future fetch, enabling a keep optimization when
        // the source pipelet is accessed over a network.
        //
        // To Accomplish this we could set a flag here for fetch, or listen to a
        // fetch event once:
        // this.once( 'fetch', add_source_destination )
        //
        // Using an event may sound overkill but it allows to encapsulate all
        // connection code into this method.
        //
        // Then return to prevent adding to source this pipelet as a destination
        // return this;
      }
      
      return add_source_destination();
      
      function add_source_destination() {
        source._add_destination && source._add_destination( that );
        
        return that;
      }
    }, // add_source()
    
    /* ------------------------------------------------------------------------
       _add_source( source )
       
       Sets the source pipelet for this pipelet or remove it if source is
       undefined.
       
       This is a low-level method that should not be used by external objects
       because it does not add a destination to the source pipelet.
       
       This method can be overloaded by derived classes to:
         - change the implementation of source
         - reject the addition by generating an exception.
         - trigger other actions on addition
       
       Paramters:
         - source: the source pipelet to add or undefined to remove the source.
    */
    _add_source: function( source ) {
      var s = this.source;
      
      if ( s ) {
        if ( ! ( s instanceof Union ) ) {
          this.source = s = xs
            .union()
            ._add_destination( this )
            ._add_source( s )
          ;
        }
        s._add_source( source );
      } else {
        this.source = source;
      }
      
      return this;
    }, // _add_source()
    
    /* ------------------------------------------------------------------------
       _add_destination( destination )
       
       Adds a destination pipelet to this pipelet.
       
       This is a low-level method that should not be used by external objects
       because it does not add the source of the destination pipelet so
       added.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the addition by generating an exception.
         - trigger other actions on addition
       
       Parameters:
         - destination: the destination pipelet to add 
    */
    _add_destination: function( destination ) {
      this.query_tree_add( [ {} ], destination );
      /* ToDo: remove deprecated code
      var u, d = this.destination;
      
      if ( d ) {
        if ( ! ( d instanceof Fork ) ) {
          // Create a fork then add current destination
          this.destination = u;
          d = ( this.fork( u, { no_add: true } ) )._add_destination( d );
        }
        d._add_destination( destination );
      } else {
        this.destination = destination;
      }
      */
      return this;
    }, // _add_destination()
    
    /* ------------------------------------------------------------------------
       remove_source( source, options )
       
       Disconnects an upstream source pipelet from this pipelet.
       
       Calls low-level _remove_destination() and _remove_source() to remove the
       bidirectional link between the two pipelets.
       
       ToDo: add test cases.
       
       ToDo: remove pending fetches between source and destination
       
       Parameters:
         - source: (Pipelet) the source pipelet to remove
         - options:
           - no_fetch: do not fetch the source to remove values from
                       destination
       
       ToDo: tests for remove_soure and unplug
    */
    remove_source: function( source, options ) {
      // disconnect from upstream source pipelet
      source._remove_destination && source._remove_destination( this );
      
      this._remove_source( source );
      
      if ( ! ( options && options.no_fetch ) && typeof source.fetch == 'function' ) {
        var that = this;
        
        source.fetch( function( values, no_more ) {
          that.remove( values, { more: ! no_more } );
        } );
      }
      
      return this;
    }, // remove_source()
    
    /* ------------------------------------------------------------------------
       _remove_source( source )
       
       Removes an upstream source pipelet from this pipelet.
       
       This is a low-level method that should not be called directly but can be
       overloaded.
       
       Parameters:
         - source: (Pipelet) to remove from this pipelet
         
       Exception:
         - source is not a source of this pipelet
    */
    _remove_source: function( p ) {
      var u, s = this.source;
      
      if ( s ) {
        if ( s instanceof Union ) {
          s._remove_source( p );
        } else {
          this.source = u;
        }
      } else {
        throw new Error( 'Pipelet._remove_source( source ), source is not this.source' );
      }
      
      return this;
    }, // _remove_source()
    
    /* ------------------------------------------------------------------------
       _remove_destination( destination )
       
       Removes a destination pipelet to this pipelet.
       
       This is a low-level method that should not be used by external objects
       because it does not remove the source of the destination pipelet so
       removed.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the removal by generating an exception.
         - trigger other actions on removal
       
       Paramters:
         - destination: the destionation pipelet to remove 
         
       Exception:
         - destination is not a known destination of this pipelet
    */
    _remove_destination: function( destination ) {
      this.query_tree_remove( [ {} ], destination );
      /*  ToDo: remove deprecated code
      var u, d = this.destination;
      
      if ( d ) {
        if ( d instanceof Fork ) {
          d._remove_destination( destination );
        } else {
          this.destination = u;
        }
      } else {
        throw new Error( 'Pipelet._remove_destination( destination ), destination is not this.destination' );
      }
      */
      return this;
    } // _remove_destination()
  } ); // Pipelet instance methods
  
  /* --------------------------------------------------------------------------
    ToDo: xs should be returned directly by require as the module. XS should be
    an attribute of xs, instead of the opposite.
    
    The xs object is a void source Pipelet to provide a fluid interface with a
    namespace for other Pipelets.
    
    Example:
      Publish a sales dataset from a 'sales' file:
      
      xs.file( 'sales' ).publish();
      
      The xs objects acts a namespace for XS chainable pipelets. Without the xs
      object, one would have to write the following less fluid code where the
      xs namespace is not explicit and requiring the new operator on a class to
      create the fist pipelet of a chain:
      
      new File( 'sales' ).publish();
  */
  var xs = new Pipelet();
  
  // Prevent becoming a source of any downstream Pipelet, see Pipelet.prototype.add_source()
  xs.is_void = true;
  
  // Pipelet Class methods
  
  /* -------------------------------------------------------------------------------------------
     Pipelet.split_updates( updates )
     
     Split updates into removed and added arrays. Use this function to process updates as if
     these were removals followed by additions into a set.
     
     Parameters:
       - updates: (Array) updates where an update is an Array of two values:
         - position 0: a previous value, corresponding to a removal
         - position 1: a new value corresponding to an addition 
     
     Returns an object with attributes:
       - removed: (Array of values)
       - added  : (Array of values)
  */
  Pipelet.split_updates = function( updates ) {
    var l = updates.length, update;
    
    if ( l === 0 ) return { removed: [], added: [] };
    
    if ( l === 1 ) {
      update = updates[ 0 ];
      
      return { removed: [ update[ 0 ] ], added: [ update[ 1 ] ] };
    }
    
    var removed = [], added = [];
    
    for( var i = -1; ++i < l; ) {
      update = updates[ i ];
      
      removed.push( update[ 0 ] );
      added  .push( update[ 1 ] );
    }
    
    return { removed: removed, added: added };
  }; // split_updates()
   
  /* -------------------------------------------------------------------------------------------
     ToDo: rename add() into Add().
     
     Pipelet.Add( name, pipelet )
     
     Add a pipelet method to the Pipelet base class.
     
     Parameters:
       - name   : (string) the name of the pipelet
       - pipelet: (function) the method.
  */
  Pipelet.Add = function( name, pipelet ) {
    if ( Pipelet.prototype[ name ] ) throw new Error( 'Pipelet.Add(), attribute "' + name + '" already used' );
    
    de&&ug( 'Pipelet.Add(): name: ' + name );
    
    return Pipelet.prototype[ name ] = pipelet;
  };
  
  /* -------------------------------------------------------------------------------------------
     Pipelet.set_default_options( source, parameters, f )
     
     Set default options for pipelet parameters.
     
     Returns an Array of parameters with default options as the last parameter.
     
     Parameters:
       - f          : (function) Pipelet constructor or composition function which last parameter
                      must always be options
       - source     : (Pipelet instance) source pipelet
       - parameters : (arguments) from pipelet invocation, the last of which is considered options
                      if is at the same position as the options parameter of f (f.length - 1)
  */
  Pipelet.set_default_options = function( f, source, parameters, defaults ) {
    parameters = slice.call( parameters, 0 );
    
    var options = extend( { key: source.key || [ 'id' ] }, defaults ) // Default options
      , l = parameters.length
      , u
    ;
    
    if ( typeof f === 'function' && f.length !== u ) {
      if ( l === f.length ) {
        l -= 1;
        
        var last = parameters[ l ];
        
        if ( typeof last !== 'object' ) {
          error( 'expected last parameter to be an object but found ' + typeof last );
        }
        
        parameters[ l ] = extend( options, last );
      } else if ( l < f.length ) {
        // Set options as last expected parameter of constructor or composition
        parameters[ f.length - 1 ] = options;
      } else {
        error( 'too many parameters provided for pipelet, expected ' + f.length + ' parameters max' );
      }
    } else {
      // ToDo: remove if not triggered in IE7+
      error( 'deprecated, must be called with function having function.length property' );
      
      /*
      if ( l ) {
        var last = parameters[ --l ];
        
        if ( typeof last === 'object'
          && ! ( last instanceof Array )
          && ! ( last instanceof Pipelet )
        ) {
          parameters[ l ] = extend( options, last );
        } else {
          parameters.push( options );
        }
      } else {
        parameters = [ options ];
      }
      */
    }
    
    // de&&ug( 'set_default_options(), options: ' + log.s( parameters[ f.length - 1 ] ) );
    
    return parameters;
    
    function error( message ) {
      throw new Error( 'set_default_options(), ' + message );
    }
  }; // Pipelet.set_default_options()
  
  /* --------------------------------------------------------------------------
     Pipelet.subclass( constructor [, methods ] )
     
     - Makes constructor a subclass of This class
     - Add methods to constructor's prototype, if any
     - Add subclass() and build() class methods to constructor
     
     Parameters:
       - constructor: (function) a Pipelet constructor
     
     Optional Parameters:
       - methods    : (object) methods for the constructor's class
     
     Usage:
       Set.subclass( Order );
  */
  Pipelet.subclass = function( constructor, methods ) {
    subclass( this, constructor );
    
    // Allows build and subclass to be used by subclass
    constructor.build = Pipelet.build;
    constructor.subclass = Pipelet.subclass;
    
    methods && extend( constructor.prototype, methods );
  }; // Pipelet.subclass()
  
  /* --------------------------------------------------------------------------
     ToDo: build() should start with a capital letter as in Build().
     
     Pipelet.build( name, constructor [, methods [, pipelet ] ] ] )
     
     Pipelet builder:
       - Makes constructor a subclass of This class using This.subclass()
       - defines Pipelet[ name ] using generated code or pipelet function
       - add methods to constructor's prototype, if any
     
     Parameters:
       - name         : (string) the name of the pipelet
       - constructor  : (function) a Pipelet constructor which signature is:
         - parameters : 0 to n required parameters either Pipelet instances or
                        non-objects (numbers, strings, functions, booleans,
                        null, undefined)
         - options    : (object) optional parameters, will extend default
                        options
     
     Optional Parameters:
       - methods      : (object) methods for the constructor's class
       - pipelet      : (function) the pipelet function creating an instance
                        of the constructor's class.
       
     Example: a 'from_usa' pipelet that filters values which country attribute
     is 'USA'.
     
     Programmer:
        function From_USA( options ) {
          return Pipelet.call( this, options );
        }
        
        Pipelet.build( "from_USA", From_USA,
          { transform: function( values ) {
              var usa_values = [];
              
              for ( var i = 0; i < values.length; ) {
                var v = values[ i++ ];
                
                if ( v.country === 'USA' ) usa_values.push( v );
              }
              
              return usa_values;
            }
          } // methods
        );
        
     Architect Usage, displays sales from usa in a table:
       xs.file( 'sales' ).from_USA().table( '#sales_from_usa' );
  */
  Pipelet.build = function( name, constructor, methods, pipelet ) {
    this.subclass( constructor, methods );
    
    if ( pipelet === u ) {
      pipelet = ( function() {
        var constructor_apply = XS.make_constructor_apply( constructor );
        
        return function pipelet() {
          var a = arguments;
          
          de&&ug( 'pipelet.' + name + '(), parameters count: ' + a.length );
          
          a = Pipelet.set_default_options( constructor, this, a, { name: name } );
          
          var that = new constructor_apply( a ), options = that.options;
          
          // WIP: use _subscribe() instead of add_source()
          //that._add_source( this );
          
          //if ( that.no_add || options.no_add ) return;
          
          //return this._subscribe();
          
          if ( that.no_add ) options = extend( { no_add: true }, options );
          
          return that.add_source( this, options );
        } // pipelet()
      } )();
    }
    
    Pipelet.Add( name, pipelet );
    
    return constructor;
  }; // Pipelet.build()
  
  /* -------------------------------------------------------------------------------------------
     Compose( name, composition )
     
     Build a pipelet from one or more pipelets in order to provide a reusable component.
     
     If the composition uses more than one pipelet, it is highly recommanded to use Compose with
     xs.encapsulate() to prevent possible surprises (see Warning bellow).
     
     Parameters:
       - name        : (string) the name of the pipelet
       
       - composition : (function) this is the constructor for the composed pipelet that should
           usually return an output Pipelet instance instead of this.
           
           The constructor is called with the following parameters:
             - source    : (pipelet) the input Pipelet instance to this pipelet
             - parameters: optional parameters to the pipelet coming from the invocation of
                           the pipelet
             - options   : comming from the pipelet options augmented with default options, see
                           important warning bellow !
     
     !!! Important Warning regarding the "options" parameter:
     -------------------------------------------------------
       The composition MUST define an "option" parameter, otherwise difficult-to-debug
       exceptions will occur such as '... has no method ...'.
       
       Because minification can optimize the options parameter out, programmers MUST use the
       options parameter in at least one function call, typically to pass the options to another
       pipelet.
       
       The example bellow will not have this issue because the options parameter is used in the
       filter() and aggregate() pipelets.
       
       We highly recommand testing all code minified to prevent this kind of surprise in
       production.
       
     !!! Warning regarding the output of a multi-pipelet composition:
     ---------------------------------------------------------------
       The output of the composition is the pipelet returned by the composition.
       
       This is fine in most cases but if the composition has multiple pipelets and one
       attempts to connect additional sources to the composition these will effectively
       connect to the last pipelet of the composition:
       
         source ---> composition inner pipelets --->|
                                                    | ---> last pipelet ----> destination 
                             additional sources --->|
       
       This is most likely not what one wants. What one wants is the following graph:
       
         source             --->|
                                | ---> composition pipelets ----> destination 
         additional sources --->|
       
       To prevent this issue, the composition should be encapsulated into a single pipelet
       either because it is composed of only one pipelet or using the pipelet
       encapsulate( in, out ) that allows to hide a complex graph of two or more pipelets
       behind a single encapsulated pipelet.
     
     Example: Compose a filter with an aggregate:
     -------
       1/ Create the composition constructor using source as the first mandatory parameter and
       options as the last that can be shared between all pipelets of the composition:
         
         function aggregate_from( source, from, measures, dimensions, options ) {
           return source
             .filter   ( from, options )
             .aggregate( measures, dimensions, options )
           ;
         }
       
       2/ Build the pipelet, providing its name:
       
         XS.Compose( 'aggregate_from', aggregate_from );
       
       3/ Use composed aggregate_from() to aggregates sales yearly from usa:
       
         xs.flow( 'sales' )
           .aggregate_from( [{ country: 'USA'}], [{ id: 'sales'}], [{ id: 'year'}] )
         ;
  */
  function Compose( name, composition ) {
    var constructor_apply = XS.make_constructor_apply( composition );
    
    if ( composition.length < 2 ) {
      throw new Error( 'Composition must have at least two parameters: a source and options' )
    }
    
    return Pipelet.Add( name, function() {
      var a = slice.call( arguments, 0 );
      
      a.unshift( this ); // add source pipelet as first parameter
      
      a = Pipelet.set_default_options( composition, this, a, { name: name } );
      
      return new constructor_apply( a );
    } );
  } // Compose()
  
  /* -------------------------------------------------------------------------------------------
     encapsulate( input, output, options )
     
     A pipelet to group a graph of pipelets into a single pipelet which input operations are
     redirected to the 'input' pipelet and where output methods, such as fetch(), are redirected to
     the 'output' pipelet.
     
     This is typically used with compositions of more than one pipelet.
     
     Parameters:
       - input: the input pipelet of the graph to encapsulate
       - output: the ouput pipelet of the graph
       - options: these are pipelet options, the most important of which is no_add that should
         be set to false if the graph is stateful and requires fetching its source data upon
         connexion.
     
     Example using the aggregate_from() composition from above:
     -------
     
     XS.Compose( 'aggregate_from', function( source, from, measures, dimensions, options ) {
       var input  = xs.filter( from, options )
         , output = input.aggregate( measures, dimensions, options )
       ;
       
       // Set no_add option to false to force data fetching for aggregate is a stateful
       // pipelet. Still, using extend allows users of the composition to set no_add to
       // true. This could be useful if the composition is part of a bigger encapsulation
       return source.encapsulate( input, output, XS.extend( { no_add: false }, options ) );
     } )
     
     Implementation
     --------------
     This implementation redirects the methods that tie pipelets together so that all
     subsequent method invocations are done directly to/from input or output pipelets
     with no overhead.
     
     However, as users may still hold references to the encapsulated pipelet, many other
     methods have to be redirected too.
     
     Some methods are not redirected because these should never be called by an outside
     user. To prevent silent bugs, these are redirected to null to trigger exceptions
     as early as possible.
     
     The table bellow shows all pipelet's methods redictions:
     
     Pipelet Method          Redirection    Notes
     ------------------------------------------------------------------------------------
     fetch                 this --> output
     fetch_all             this --> output
     
     _fetch_source             null         Called by fetch()
     _fetch_source_all         null         Called by fetch_all()
     
     transform                 null         Called by add(), remove(), and update()
     
     notify                this --> input
     
     add                   this --> input
     remove                this --> input
     update                this --> input
     clear                 this --> input
     
     emit_add                  null         Called by add(), remove(), and update()
     emit_remove               null         Called by add(), remove(), and update()
     emit_update               null         Called by add(), remove(), and update()
     emit_clear                null         Called by add(), remove(), and update()
     
     emit                      null         Called by emit_xxx()
     emit_operations           null         Called by deprecated update()
     
     on                    this --> output
     once                      none         Calls on()
     on_change                 none         Calls on()
     
     plug                  this --> output
     unplug                this --> output
     _add_destination      this --> output
     _remove_destination   this --> output
     
     add_source            this --> input     
     remove_source         this --> input
     _add_source           this --> input
     _remove_source        this --> input
     
     ToDo: handle subsribe and query_tree methods which should be redirected to output.
  */
  function Encapsulate( input, output, options ) {
    this.input  = input;
    this.output = output;
    
    return Pipelet.call( this, options );
  } // Encapsulate()
  
  Pipelet.build( 'encapsulate', Encapsulate, {
    // Input operations
    notify: function( transaction, options ) {
      this.input.notify( transaction, options );
      
      return this;
    },
    
    add: function( values, options ) {
      this.input.add( values, options );
      
      return this;
    },
    
    remove: function( values, options ) {
      this.input.remove( values, options );
      
      return this;
    },
    
    update: function( updates, options ) {
      this.input.update( updates, options );
      
      return this;
    },
    
    clear: function( options ) {
      this.input.clear( options );
      
      return this;
    },
    
    // Responding to output fetching
    fetch: function() {
      this.output.fetch.apply( this.output, arguments );
      
      return this;
    },
    
    fetch_all: function() {
      this.output.fetch_all.apply( this.output, arguments );
      
      return this;
    },
    
    // Setting output event listeners
    on: function( event_name, listener, that, once ) {
      this.output.on( event_name, listener, that, once );
      
      return this;
    },
    
    // Pluging / Unpluging output
    plug: function( pipelet, options ) {
      return this.output.plug( pipelet, options );
    },
    
    unplug: function( pipelet, options ) {
      return this.output.unplug( pipelet, options );
    },
    
    _add_destination: function( pipelet ) {
      this.output._add_destination( pipelet );
      
      return this;
    },
    
    _remove_destination: function( pipelet ) {
      this.output._remove_destination( pipelet );
      
      return this;
    },
    
    // Input source addition and removal
    add_source: function( source, options ) {
      this.input.add_source( source, options );
      
      return this;
    },
    
    _add_source: function( source ) {
      this.input._add_source( source );
      
      return this;
    },
    
    remove_source: function( source ) {
      this.input.remove_source( source );
      
      return this;
    },
    
    _remove_source: function( source, options ) {
      this.input._remove_source( source, options );
      
      return this;
    },
    
    // Forbidden methods
    _fetch_source    : null,
    _fetch_source_all: null,
    transform        : null,
    emit_add         : null,
    emit_remove      : null,
    emit_update      : null,
    emit_clear       : null,
    emit             : null,
    enit_operations  : null
  } ); // Encapsulate instance methods
  
  /* -------------------------------------------------------------------------------------------
     pass_through( [ options ] )
     
     A pipelet used as a temporary variable for graphs with loops.
     
     Exemple:
       var tmp = xs.pass_through()
  */
  function Pass_Trough( options ) {
    return Pipelet.call( this, options );
  } // Pass_Trough()
  
  Pipelet.build( 'pass_through', Pass_Trough, {
    add: function( values, options ) {
      return this.emit( "add", values, options );
    },
    
    remove: function( values, options ) {
      return this.emit( "remove", values, options );
    },
    
    update: function( updates, options ) {
      return this.emit( "update", updates, options );
    }
  } );
  
  /* -------------------------------------------------------------------------------------------
     Fork( destinations, options )
     
     Fork is now replaced by query trres in Pipelet
     
     Forks a source into many destinations.
     
     Parameters:
       - destinations : (Array of Pipelets) initial destination pipelets
       - options      : (Object)
  */
  /*
  function Fork( destinations, options ) {
    Pipelet.call( this, options );
    
    this.destinations = [];
    
    if ( destinations ) {
      for( var i = -1; ++i < destinations.length; ) {
        var p = destinations[ i ];
        
        if ( p && p instanceof Pipelet ) p.add_source( this );
      }
    }
    
    return this;
  } // Fork()
  
  Pipelet.build( 'fork', Fork, {
    /* ------------------------------------------------------------------------
       emit_add( added [, options ] )
       
       Notify downsteam pipelets about added objects.
       
       Parameters:
         - added: Array of added objects
         
         - options: optional object
    /
    emit_add: function( added, options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].add( added, options );
      
      return this;
    }, // emit_add()
    
    /* ------------------------------------------------------------------------
       emit_remove( removed [, options ] )
       
       Notify downsteam pipelets of removed object.
       
       Parameters:
         - removed: Array of removed object values.
         
         - options: optional object
    /
    emit_remove: function( removed, options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].remove( removed, options );
      
      return this;
    }, // emit_remove()
    
    /* ------------------------------------------------------------------------
       emit_update( updated [, options ] )
       
       Notify downsteam pipelets of updated object values.
       
       Parameters:
         - updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         - options: optional object
    /
    emit_update: function( updated, options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].update( updated, options );
      
      return this;
    }, // emit_update()
    
    /* ------------------------------------------------------------------------
       emit_clear( [ options ] )
       
       Notify downsteam pipelets that all object values should be cleared.
       
       Parameters:
         - options: optional object
    /
    emit_clear: function( options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].clear( options );
      
      return this;
    }, // emit_clear()
    
    _add_destination: function( d ) {
      if ( this.destinations.indexOf( d ) !== -1 ) throw new Error( "Fork, _add_destination(), invalid destination: already there" );
      
      this.destinations.push( d );
      
      return this;
    }, // _add_destination()
    
    _remove_destination: function( p ) {
      var d = this.destinations;
      
      if ( ( p = d.indexOf( p ) ) === -1 ) throw new Error( "Fork, _remove_destination(), destination not found in this" );
      
      d.splice( p, 1 );
      
      return this;
    } // _remove_destination()
  } ); // Fork.prototype
  */
  
  /* -------------------------------------------------------------------------------------------
     Union( sources, options )
     
     Forwards many sources to one destination
  */
  function Union( sources, options ) {
    Pipelet.call( this, options );
    
    this.sources = [];
    
    if ( sources ) {
      for( var i = -1; ++i < sources.length; ) {
        var p = sources[ i ];
        
        if ( p && p instanceof Pipelet ) this.add_source( p );
      }
    }
    
    return this;
  } // Union()
  
  Pipelet.build( 'union', Union, {
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       ToDo: add test cases
    */
    fetch: function( receiver ) {
      var that = this, sources = this.sources, l = sources.length;
      
      // After a first fetch, if any other source is added, fetch from that
      // source
      this.no_add = false;
      
      if ( l ) {
        for ( var i = -1, count = l; ++i < l; ) {
          var source = sources[ i ];
          
          if ( source.fetch ) {
            fetch( source );
          } else {
            // Source should be an array of objects
            receiver( source, ! --count );
            
            count || resume_all_sources();
          }
        }
      } else {
        end();
      }
      
      return this;
      
      function fetch( source ) {
        source.fetch( function( values, no_more ) {
          var complete = false;
          
          if ( no_more ) {
            complete = true;
            
            if ( values && values.length ) {
              receiver( values, ! --count );
            } else {
              --count || end();
            }
            
            if ( count ) {
              // There are still sources which fetch is not complete
              // Pause this source from emitting
              source.query_tree_pause( that );
            } else {
              // All sources fetches are now complete
              resume_all_sources();
            }
          } else {
            if ( complete ) throw new Error( 'Union..fetch(), source sent more content after completing' );
            
            values && values.length && receiver( values );
          }
        } )
      } // fetch()
      
      function resume_all_sources( source ) {
        for ( var i = -1, l = sources.length; ++i < l; ) {
          var source = sources[ i ];
          
          source.query_tree_resume( that );
        }
      } // resume_all_sources()
      
      function end() {
        receiver( [], true );
      } // end()
    }, // fetch()
    
    _add_source: function( source ) {
      if ( this.sources.indexOf( source ) !== -1 ) throw new Error( "Union, _add_source(), invalid source: already there" );
      
      this.sources.push( source );
      
      return this;
    }, // _add_source()
    
    _remove_source: function( source ) {
      var s = this.sources;
      
      if ( ( source = s.indexOf( source ) ) === -1 ) throw new Error( "Union, _remove_source(), source not found in this" );
      
      s.splice( source, 1 );
      
      return this;
    } // _remove_source()
  } ); // Union.prototype
  
  /* -------------------------------------------------------------------------------------------
     source.dispatch( branches, branch_dataflow [, options ] )
     
     This pipelet is a basic building block for managing parralellism with Connected Sets.
     
     It dispatches a source dataflow over a dynamic number of branch dataflows, then gathers the
     outputs of these dataflows back together to produce the dispatcher's destination dataflow:
     
                                      branches
                                      dataflow
                                         |
                                         V
                                Branches Controller
                           -----------------------------
                           |             |             |
                           V             |             V
                      Dispatcher         |         Gatherer
                      query tree         |        xs.union()
                           |             V             |
                           |---> branch dataflow 0 --->|
                           |             |             |
                source     |             V             |     destination
             ------------->|---> branch dataflow i --->|------------------>
               dataflow    |             |             |       dataflow
                           |             V             |
                           |---> branch dataflow n --->|
     
     
     The 'branches' dataflow controls setup and tear-down of branches and provides a context for
     each branch. When a branch is added in branches, the controller calls branch_dataflow() to
     create a new dataflow between the dispatcher and the gatherer. When a branch is removed,
     the controller tears-down the branch datafow between the dispatcher and the gatherer.
     
     The 'branches' control dataflow usually provides socket dataflows to allow branches to
     comunicate with remote processes but it can be anything else, or nothing at all other than
     unique identifiers for branches.
     
     Applications:
       - Dispatch a server dataflow to a number of clients connecting to the server with some
         socket protocol such as WebSockets, socket.io, or plain Unix sockets. Client dataflows
         are then gathered back together on the server to produce 'this' destination dataflow.
         
         Each branch serves a client that is created when it connects to the server, and torn-
         down when the client disconnects.
         
       - Distribute a workload horizontally over multiple processes, servers, or worker
         threads in a Map/Reduce pattern controlled by 'branches'. The dispatcher 'maps'
         incoming operations to each branch using filters and 'reduces' the outputs of these
         branches back into 'this' destination dataflow.
         
         Each branch defines the dataflow that starts when a new proccess is added to the
         branches control dataflow and stops when its entry is removed from branches.
         
       - Control elastic charding where each branch controls a chard. Chard attributes may
         determine on which device they are, a path on the device, a process id, a machine url.
     
     Dispatching is implemented as efficiently as can be using the source query tree, while
     gathering together uses xs.union().
     
     Parameters:
       - branches: (Pipelet) controls branches creation and removal. Each add operation spawns
           the creation of a new branch, calling branch_dataflow(), while remove operations
           tear-down branches. Each branch has attributes:
             - id: (scalar) mandatory unique identifier for the branch
             - any other attribute provided to branch_dataflow() to provide a context for each
               branch.
         
       - branch_dataflow: function( source, options ), a function that is called when each branch
           is created and which processes the incoming dataflow from the source. It creates a
           dataflow and returns its destination, or undefined if it does not provide a
           destination dataflow. Its destination is then gathered back together to produce the
           dispatcher's destination dataflow.
           
           The branch_dataflow() function is called with the following parameters:
             - source : (Pipelet) the source dataflow for this branch
             - options: (Object) the options of this dispatch pipelet providing global
               options to all branches.
           
           'This' context of branch_dataflow() is the branch that spawned this pipelet from
           branches.
           
           the return value of the branch dataflow can be either the output pipelet or an
           input-output Object, see option input_output for information about the later.

       - options: (Object) the following are all performance options for very large dispachers
           with thousands of simultaneously active branches. For maximum performances one should
           use options 'no_encapsulate' with either 'single' or 'input_output'.
           
         - no_encapsulate: (Boolean) true if the dispatecher should not use an encapsulate()
             pipelet. This improves performances by removing a dispatcher and using the source
             query tree as the dispatcher, remove an otherwise required pass_through() pipelet.
             
         - single: (Boolean) true if the the branch dataflow is made of a single pipelet or
             uses an encapsulated pipelet.
             
             Using this option allows to improve performances by removing the requirement for
             a pass-through pipelet between the source and the input of the branch.
             
         - input_output: (Boolean) true of the branch dataflow returns an input-output object.
             
             This option also allows to improve performances for multi-pipelet branches
             because it removes the need for both pass_through() and encapsulate() pipelets.
             
             The input-output Object should provided the following attributes:
               - input : (Pipelet) input pipelet of the branch
               - output: (Pipelet) output pipelet of the branch  
     
     Example:
       A trivial socket.io server with no authentication or authorizations, delivering the
       content of a database to a number of web clients, and allowing these clients to
       update that same database. In this example, branches are socket.io clients:
       
         // HTTP Servers and socket.io clients dataflow
         var clients = xs
           .set( [
              { ip_address: '0.0.0.0', port: 80  }
              { ip_address: '0.0.0.0', port: 443, key: '...', cert: '...' }
            ] )
            
           .http_servers()      // start http and https servers
           
           .socket_io_clients() // emits a dataflow of socket.io client sockets
         ;
         
         // Database dataflow
         xs.database()
           
           .trace( 'database changes to clients' )
           
           .dispatch( clients, client_dataflow )
           
           .trace( 'database changes from clients' )
           
           .database()
         ;
         
         // Create a client dataflow
         function client_dataflow( source, options ) {
           return source
             .plug( this.socket ) // plug dispatcher's source into socket.io client socket
           ;
         }
       
       Note that to add proper authorizations, one would only need to filter the source and
       output to and from clients sockets. 
  */
  function Dispatch( source, branches, branch_dataflow, options ) {
    this.branch_dataflow = branch_dataflow;
    
    this.branches = {};
    
    var that = this
      , no_encapsulate = options && options.no_encapsulate
      , dispatcher = this.dispatcher = no_encapsulate ? source : xs.pass_through( options )
      , gatherer   = this.gatherer   = xs.union( options )
    ;
    
    this.options = options || {};
    
    branches
      .fetch( function( branches ) { that.create_branches( branches ) } )
      
      .on( 'add'   , this.create_branches, this )
      .on( 'remove', this.remove_branches, this )
      // Ignore updates for now
      // ToDo: use updates to notify branches of some changes without tearing-down the branch,
      // possibly using the input_output object to provide a branch instance update function
      .on( 'clear' ,
        function() {
          this.remove_branches( Object.keys( this.branches ) );
        }, this
      )
    ;
    
    if ( no_encapsulate ) return gatherer;
    
    return source.encapsulate( dispatcher, gatherer, options );
  } // Dispatch()
  
  extend( Dispatch.prototype, {
    create_branches: function( new_branches ) {
      var branches = this.branches
        , options = this.options
        , input_output = options.input_output
        , input
      ;
      
      for ( var i = -1, l = new_branches.length; ++i < l; ) {
        var branch = new_branches[ i ], id = branch.id;
        
        if ( branches[ id ] ) throw new Error( 'error, Dispatch()..create_branches(), branch: ' + id + ', already exists' );
        
        de&&ug( 'Dispatch()..create_branches(), id: ' + id + ', options: ' + log.s( options ) );
        
        if ( options.single || input_output ) {
          input = this.dispatcher;
        } else {
          input = this.dispatcher.pass_through( options )
        }
        
        var output = this.branch_dataflow.call( branch, input, options );
        
        if ( input_output ) {
          branches[ id ] = output;
          
          output = output.output;
        } else {
          branches[ id ] = { input: input, output: output };
        }
        
        output && output.plug( this.gatherer );
      } // for all added branches
      
      return this;
    }, // create_branches()
    
    remove_branches: function( removed_branches ) {
      for( var i = -1, l = removed_branches.length, branches = this.branches, id, branch; ++i < l; ) {
        branch = branches[ id = removed_branches[ i ].id ];
        
        if ( branch ) {
          de&&ug( 'Dispatch()..remove_branch(), id: ' + id );
          
          // Unplug using no_fetch because there will be no response to this fetch
          branch.output && branch.output.unplug( this.gatherer, { no_fetch: true } );
          
          // Unplug using no_fetch because there is nowhere to send removes to
          branch.input && this.dispatcher.unplug( branch.input, { no_fetch: true } );
          
          delete branches[ id ];
        } else {
          log( 'error, Dispatch..remove_branch(), branch: ' + id + ', does not exist' );
        }
      }
      
      return this;
    } // remove_branches()
  } );
  
  Compose( 'dispatch', Dispatch );
  
  /* -------------------------------------------------------------------------------------------
     source.alter( transform [, options] )
     
     Alters a set by altering all values by transform().
     
     Parameters:
       - transform: (Function) a function which signature is:
           transform( value [, position [, values [, options ] ] ] )
           
           tranform must return one object for each source object.
           
           transform should not alter source objects.
           
       - options: (Object)
       
     Example: alters a source dataflow of stocks to produce a dataflow of PE ratios.
       var pe_ratios = stocks
         .alter( function( stock ) {
           return { ticker: stock.ticker, pe_ratio: stock.price / stock.earnings };
         } )
       ;
  */
  function Alter( transform, options ) {
    de&&ug( 'alter(), tranform: ' + transform + ', options: ' + log.s( options ) );
    
    Pipelet.call( this, options );
    
    if ( typeof transform != 'function' ) throw new Error( 'Alter(): transform must be a function' );
    
    var l = transform.length; // the number of requested parameters by transform()
    
    if ( l < 1 ) throw new Error( 'Alter(): transform must use at least one parameter' );
    
    // Build parameter list according to the number of parameters requested by transform
    var parameters = [ 'values[ ++i ]', 'i', 'values', 'options' ].slice( 0, l ).join( ', ' );
    
    var code = new Code()
      ._function( 'this.transform', void 0, [ 'values', 'options' ] )
        ._var( 'i = -1', 'l = values.length', 'r = []', 't = transform' )
        
        .unrolled_while( 'r.push( t( ' + parameters + ' ) );' )
        
        .add( 'return r' )
      .end( 'Alter..transform()' )
    ;
    
    eval( code.get() );
    
    return this;
  } // Alter()
  
  Pipelet.build( 'alter', Alter );
  
  /* -------------------------------------------------------------------------------------------
     set( [values, [options]] )
     
     Non-ordered set.
     
     Parameters:
       - values: optional array of objects to set initial content.
       
       - options: optional object to provide options for Set and parent class Pipelet:
         - name: set name
         
         - key: Objects identity attributes, default is [ 'id' ]
  */
  function Set( a, options ) {
    var u;
    
    if ( options === u ) {
      options = a;
      a = u;
    }
    
    //de&&ug( 'set(), options: ' + log.s( options ) );
    
    options = Pipelet.call( this, options ).options;
    
    this.no_add = false; // stateful pipelet needs to add content
    
    this.key = options.key || [ 'id' ];
    
    this.a = []; // The current state of the set
    this.b = []; // Anti-state, used to store removes waiting for adds and conflict resolution
    
    a && a.length && this.add( a );
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
    
    return this;
  } // Set()
  
  Pipelet.build( 'set', Set, {
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       Fetches set content, possibly in several chunks.
       
       See Pipelet.fetch() for receiver documentation.
    */
    fetch: function( receiver ) {
      receiver( this.a, true );
      
      return this;
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       clear()
       
       Clears content then notifes downsteam Pipelets.
    */
    clear: function() {
      this.a = [];
      
      return this.emit_clear();
    }, // get()
    
    /* ------------------------------------------------------------------------
       add( values )
       
       Add values to the set then notifies downsteam Pipelets.
    */
    add: function( values, options ) {
      var i, l = values.length, v;
      
      if ( this.b.length ) {
        // There are values in the antistate b, waiting for an add or
        // update, or conflict resolution
        var added = [];
        
        for ( i = -1; ++i < l; ) {
          var p = this._index_of( v = values[ i ] );
          
          if ( p === -1 ) {
            this.a.push( v );
            
            added.push( v );
          } else {
            // Remove this add from the anti-state
            this.b.splice( p, 1 );
          }
        }
        
        values = added;
      } else {
        push.apply( this.a, values );
      }
      
      return values.length ? this.emit_add( values, options ) : this;
    }, // add()
    
    /* ------------------------------------------------------------------------
       update( updates )
       
       Update set values using updates then notifes downsteam Pipelets.
       
       Parameter:
         updates: Array of updates, an update is an array of two values, the
           first is the previous value, the second is the updated value.
    */
    update: function( updates, options ) {
      for ( var i = -1, l = updates.length, updated = [], added = []; ++i < l; ) {
        var o = updates[ i ]
          , r = o[ 0 ], v = o[ 1 ]
          , p = this.index_of( r )
        ;
        
        if ( p == -1 ) {
          // This update may come before an add
          p = this._index_of( v );
          
          if ( p == -1 ) {
            this.a.push( v );
            
            added.push( v );
          } else {
            // There is a remove in the anti-state waiting for this add
            this.b.slice( p, 1 );
          }
          
          this.b.push( r );
          
          continue;
        }
        
        this.a[ p ] = v;
        
        updated.push( o );
      }
      
      // ToDo: not tested
      added  .length && this.emit_add   ( added  , updated.length ? more( options ) : options );
      updated.length && this.emit_update( updated,                                    options );
      
      return this;
    }, // update()
    
    /* ------------------------------------------------------------------------
       remove( values )
       
       Remove values from the set then notify downsteam Pipelets
    */
    remove: function( values, options ) {
      for ( var i = -1, l = values.length, removed = []; ++i < l; ) {
        var v = values[ i ]
          , p = this.index_of( v )
        ;
        
        if ( p === -1 ) {
          // Not found: add to anti-state
          this.b.push( v );
        } else {
          this.a.splice( p, 1 ); // could be faster on smaller arrays
          
          removed.push( v );
        }
      }
      
      return this.emit_remove( removed, options );
    }, // remove()
    
    /* ------------------------------------------------------------------------
       index_of( value )
       
       Lookup the position of a value in the set's current state.
       
       Generate optimized code using make_index_of() during first call.
       
       Returns:
         The position of the value in the set or -1 if not found.
    */
    index_of: function( v ) {
      return this.make_index_of( 'a', 'index_of' ).index_of( v ); 
    }, // index_of()
    
    /* ------------------------------------------------------------------------
       _index_of( value )
       
       Lookup the position of a vaue in the set's anti-state.
       
       Generate optimized code using make_index_of() during first call.
       
       Returns:
         The position of the value in the set or -1 if not found.
    */
    _index_of: function( v ) {
      return this.make_index_of( 'b', '_index_of' )._index_of( v ); 
    }, // _index_of()
    
    /* ------------------------------------------------------------------------
       make_index_of( state, method )
        
       JIT Code Generator for index_of() from this.key
       
       Generated code is tied to current key. Uses unrolled while for maximum
       performance.
       
       Parameters:
         - state: (string) 'a' or 'b' to reference the current state or anti-
                  state of the set.
         - method: (string) the name of the method to generate
       
       Other possible further optimization:
         - split set array in smaller arrays,
         - create an object for fast access to individual keys, a naive
           implementation would be to use a single object but many benchmarcks
           have proven this technique very slow. A better option would be to
           use a tree possibly with hashed keys
    */
    make_index_of: function( state, method ) {
      var key = this.key, l = key.length;
      
      var vars = [ 'a = this.' + state, 'l = a.length', 'i = -1' ];
      
      var first, inner, last;
      
      if ( l > 1 ) {
        vars.push( 'r' );
        
        var tests = [], field;
        
        for( var i = -1; ++i < l; ) {
          field = key[ i ];
          
          tests.push( ( i === 0 ? '( r = a[ ++i ] ).' : 'r.' ) + field + ' === _' + field );
        }
        
        first = 'if ( ' + tests.join( ' && ' ) + ' ) return i;';
      } else {
        field = key[ 0 ];
        
        var test = 'a[ ++i ].' + field + ' === _' + field;
        
        first = 'if ( ' + test;
        inner = '|| ' + test;
        last  = ') return i';
      }
      
      var code = new Code( method )
        ._function( 'this.' + method, null, [ 'o' ] )
          ._var( vars )
          .vars_from_object( 'o', key ) // Local variables for key
          .unrolled_while( first, inner, last )
          .add( 'return -1' )
        .end( method + '()' )
        .get()
      ;
      
      eval( code );
      
      return this;
    }, // make_index_of()
    
    /* ------------------------------------------------------------------------
       make_key( object )
       
       Use this.key to generate code JIT to return a unique a string for an
       object based on the key coordinates concatenation separated with '#'.
       
       Parameters:
         object: an object which key is requested.
    */
    make_key: function( o ) {
      var key = this.key, l = key.length, code = [];
      
      for ( var i = -1; ++i < l; ) code.push( 'o.' + key[ i ] );
      
      eval( new Code()
        ._function( 'this.make_key', null, [ 'o' ] )
          .add( "return '' + " + code.join( " + '#' + " ) )
        .end( 'make_key()' )
        .get()
      );
      
      return this.make_key( o );
    } // make_key()
  } ); // Set instance methods
  
  /* -------------------------------------------------------------------------------------------
     unique_set( [values], [options] )
     
     A set which values are unique and for which duplicates are discarded.
     
     ToDo: add tests
  */
  function Unique_Set( values, options ) {
    return Set.call( this, values, options );
  }
  
  Set.build( 'unique_set', Unique_Set, {
    add: function( values, options ) {
      for ( var i = -1, l = values.length, added= []; ++i < l; ) {
        var v = values[ i ];
        
        if ( this.index_of( v ) != -1 ) {
          de&&ug( "unique_set, add() discard duplicate, identity:" + this.make_key( v ) );
        } else {
          added.push( v );
        }
      }
      
      return Set.prototype.add.call( this, added, options );
    } // add()
  } ); // Unique_Set instance methods
  
  /* -------------------------------------------------------------------------------------------
     set_flow( flow_name, options )
     
     Parameters:
       - flow_name: (String) the name of the flow to set for objects of this dataflow. All
         values added or removed are altered to add the attrinute 'flow' with this string.
         
         Values which already have a flow will be modified as the flow name always replaces
         any prior flow name.
         
     Example:
     
       xs.set( [
           { fist_name: 'Joe'    , last_name: 'Black'   },
           { fist_name: 'William', last_name: 'Parrish' },
           { fist_name: 'Susan'  , last_name: 'Parrish' }
         ] )
         .setflow( 'roles' )
       ;
     
       Will produce the set:
         [
           { fist_name: 'Joe'    , last_name: 'Black'  , flow: 'role' },
           { fist_name: 'William', last_name: 'Parrish', flow: 'role' },
           { fist_name: 'Susan'  , last_name: 'Parrish', flow: 'role' }
         ]
  */
  Compose( 'set_flow', function( source, flow, options ) {
    de&&ug( 'set_flow(), flow: ' + flow + ', options: ' + log.s( options ) );
    
    return source.alter( function( v ) {
      var o = {}, p; for ( p in v ) o[ p ] = v[ p ];
      
      o.flow = flow;
      
      return o;
    }, options );
  } );
  
  /* -------------------------------------------------------------------------------------------
     auto_increment( options )
     
     Used as a convenience for typically small sets that need to be ordered or need some
     arbitrary key.
     
     ! Important Limitation: This will work only on dataflows with no remove or update
       operation. A remove would not be able to find the original auto-incremented value.
     
     options:
       - attribute: (String) the name of the attribute auto-incremented for each add operation.
           Default is the first attribute of the identity key or 'id' if there is no key.
       
       - start: (Integer) used to initialize the auto-increment value. The default is zero
           which will start at 1 because auto-increment value is pre-incremented. If a value
           comes with an auto-incement attribute value it is not modified and if it is
           superior to the last auto-increment value it used as the last. 
   */
  Compose( 'auto_increment', function( source, options ) {
    de&&ug( 'auto_increment(), options: ' + log.s( options ) );
    
    var attribute = options.attribute || ( options.key[ 0 ] || 'id' )
      , last      = options.start     || 0
    ;
    
    de&&ug( 'auto_increment(), attribute: ' + attribute + ', start: ' + last );
    
    var input = xs.alter( function( v ) {
      var o = {}, p; for ( p in v ) o[ p ] = v[ p ];
      
      var ai = o[ attribute ];
      
      if ( ai ) {
        if ( ai > last ) last = ai;
      } else {
        o[ attribute ] = ++last;
      }
      
      return o;
      }, options
    );
    
    // Use a set() on the output to prevent re-incrementation through fetch().
    
    // Use option no_add to prevent unecessary fetching now, fetching will be done using
    // encapsulate()
    var output = input.set( { no_add: true } );
    
    // Set option 'no_add' to false as this is effectively a statefull pipelet with the above
    // set()
    
    // ToDo: find a better solution for fetching data when a source connects
    return source.encapsulate( input, output, extend( { no_add: false }, options ) );
  } ); // auto_increment()
  
  /* -------------------------------------------------------------------------------------------
     trace( name, options )
     
     Trace all operations: add / remove / update / clear / fetch / fetch results.
     
     Parameters:
       - name: (String) a name for all traces.
       - options: (Object) optional attributes:
         - counts_only: only provide counts of values from operations
         - include: (Array of Strings), attributes to include, exclusively
         - exclude: (Array of Strings), attributes to exclude from the trace. This option is
           ignored if option include is provided.
  */
  function Trace( name, options ) {
    options = Pipelet.call( this, options ).options;
    
    this.name = name;
    
    var include = options.include, exclude = options.exclude, u;
    
    if ( include ) {
      this.replacer = include;
    } else if ( options.exclude ) {
      this.replacer = function( key, value ) {
        return exclude.indexOf( key ) != -1 ? u : value; 
      }
    }
    
    return this.log( 'new Trace(): ' + log.s( { include: include, exclude: exclude } ) );
  } // Trace()
  
  Pipelet.build( 'trace', Trace, {
    log: function( method, object ) {
      var u, s = 'xs ' + this.name + ', ' + method;
      
      if ( object ) {
        if ( this.options.counts_only ) {
          object.count = object.values ? object.values.length : 0;
          
          object.values = u;
        }
        
        s += ', ' + JSON.stringify( object, this.replacer, '  ' );
      }
      
      log( s );
      
      return this;
    }, // log()
    
    _fetch_source: function( receiver ) {
      var u, s = this.source, that = this;
      
      if ( s ) {
        s.fetch( function( values, no_more ) {
          that.log( 'fetch(), sending: ', { values: values, no_more: no_more } );
          
          receiver( values, no_more );
        } );
      } else {
        this.log( 'fetch(), no source, sending: ', { values: [], no_more: true } );
        
        receiver( [], true ); // No source, so this is an empty set
      }
      
      return this;
    }, // _fetch_source()
    
    add: function( values, options ) {
      this.log( 'add()', { values: values, options: options } );
      
      return this.emit_add( values, options );
    }, // add()
    
    remove: function( values, options ) {
      this.log( 'remove()', { values: values, options: options } );
      
      return this.emit_remove( values, options );
    }, // remove()
    
    update: function( updates, options ) {
      this.log( 'update()', { updates: updates, options: options } );
      
      return this.emit_update( updates, options );
    }, // update()
    
    clear: function( options ) {
      this.log( 'clear()', options ? { options: options } : options );
      
      return this.emit_clear( options );
    } // clear()
  } );
  
  /* -------------------------------------------------------------------------------------------
     source.delay( delay, options )
     
     Intented Purposes:
       - Simultate a distant pipelet by introducing a delay in all operations and fetch().
       - Test assynchronous behavior of pipelets.
     
     Parameters:
       - delay: (Int) the delay in miliseconds
  */
  function Delay( delay, options ) {
    this.delay = delay;
    
    de&&ug( 'new Delay(): delay: ' + delay + ' ms' )
    
    return Pipelet.call( this, options );
  } // Delay
  
  Pipelet.build( 'delay', Delay, {
    _fetch_source: function( receiver ) {
      var that = this, delay = this.delay;
      
      // Get a delayed receiver
      var _receiver = function( values, no_more ) {
        setTimeout( function() {
          receiver( values, no_more )
        }, delay )
      }
       
      // Delay the call to _fetch_source() to simultate a full round-trip to a server
      setTimeout( function() {
        Pipelet.prototype._fetch_source.call( that, _receiver )
      }, delay );
      
      return this;
    }, // _fetch_source()
    
    add: function( values, options ) {
      var that = this;
      
      setTimeout( function() {
        that.emit_add( values, options )
      }, this.delay );
      
      return this;
    }, // add()
    
    remove: function( values, options ) {
      var that = this;
      
      setTimeout( function() {
        that.emit_remove( values, options )
      }, this.delay );
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      var that = this;
      
      setTimeout( function() {
        that.emit_update( updates, options )
      }, this.delay );
      
      return this;
    }, // update()
    
    clear: function( options ) {
      var that = this;
      
      setTimeout( function() {
        that.emit_clear( options )
      }, this.delay )
      
      return this;
    } // clear()
  } );
  
  if ( false ) { ( function() { // minifier can remove this sample code
    /* -------------------------------------------------------------------------------------------
       PXXX(): template for Stateful Pipelet class definition.
    */
    function PXXX( options ) {
      Pipelet.call( this, options );
      
      return this;
    } // PXXX()
    
    /* ------------------------------------------------------------------------
       Derive Pipelet
       Build pipelet method pxxx() for fluent interface
       Define instance methods
    */
    Pipelet.build( 'pxxx', PXXX, {
      /* ------------------------------------------------------------------------
         add( values )
         
         Called when items were added to the source
      */
      add: function( values, options ) {
        // add values to internal state
        
        return this.emit_add( values, optons ); // forward added values
      }, // add()
      
      /* ------------------------------------------------------------------------
         remove( values )
         
         Called when items were removed from the source
      */
      remove: function( values, options ) {
        // remove values from internal state
        
        return this.emit_remove( values, options ); // forward removed values
      }, // remove()
      
      /* ------------------------------------------------------------------------
         update( updates )
         
         Called when items were updated inside the source
      */
      update: function( updates, options ) {
        // update internal state from updates
        
        return this.emit_update( updates, options ); // forward updated values
      }, // update()
      
      /* ------------------------------------------------------------------------
         clear()
         
         Called when all items should be cleared, when the source set
         was disconnected from its source and new data is expected.
      */
      clear: function( options ) {
        // clear internal state
        
        return this.emit_clear( options ); // forward to downstream pipelets
      } // clear()
    } ); // PXXX instance methods
  } )(); } // end if false
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [
    'xs', 'Compose', 'Encapsulate', 'Pipelet', 'Union', 'Dispatch', 'Alter', 'Set', 'Unique_Set', 'Trace', 'Delay', 'Query', 'Query_Tree'
  ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // pipelet.js
