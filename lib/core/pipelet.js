/*  pipelet.js
    
    Copyright (c) 2013-2016, Reactive Sets
    
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
    
    ---
    
    Pipelet core classes:
      - Plug / Input / Output
      - Pipelet: the current base of all pipelet classes having one input and one
        output plug
      - Controllet
      - Union: a Pipelet with n sources and one destination
      - Set: a stateful set implementation
      - Dispatch
      - Trace, Delay
    
    Also defines the 'rs' namespace for a fluid interface that acts as a singleton
    or a pseudo source.
*/

/* -------------------------------------------------------------------------------------------
   The following documentation will eventually be extracted as a separate document.
   
   What is Toubkal?
   ----------------------
   Toubkal is a JavaScript framework for the developpement of realtime internet
   applications.
   
   The server side runs on Node while clients is any EcmaScript 5 - compatible web browser.
   
   RS, is an acronym for Reactive Sets, the underlying technology of Toubkal.
   
   Why another JavaScript framework?
   --------------------------------
   Toubkal came out of more than ten years of experience developing realtime web
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
   
   The Toubkal framework addresses all these issues, providing high-performance and high code
   productivity through the use of a dataflow programming model running on both the server
   and web clients and providing full-featured database services available everywhere.
   
   Toubkal was inspired by Unix(tm) pipes which provide a type of dataflow programming, and the SQL
   language that manipulates datasets very consilely and efficiently in particular with no
   loops.
   
   Definitions and Concepts:
   ------------------------
   
   Set:
   ---
   A Toubkal Set is a collection of JavaScript Objects.
   
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
   
   Likewise, Toubkal uses a dataflow model where JavaScript Objects flow through Pipelets, and
   where the output of each Pipelet produces a new Toubkal Set, e.g.:
   
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
   an application we recommend the above indentation where each pipelet uses one or more
   lines starting with JavaScript operator '.' that acts as the pipe operator of the
   dataflow.
   
   Benefits:
   --------
   This is the basis of all Toubkal applications, everything in Toubkal is a reactive
   dataflow, meaning that all parts of the application responds to realtime data events
   producing dataflows. Handling events is therefore at the core of the Toubkal framwork
   and comes at no cost to application programmers.
   
   Toubkal solves so-called callback hell because there are no callbacks required to define an
   application using this dataflow programming model where events and callbacks are handled at
   a lower level by the Toubkal framework itself.
   
   Because every dataflow produces a set, and pipelets proccess sets, there are no need for
   loops much like SQL that processes datasets. Loops are implemented within pipelets very
   efficiently sometimes using just-in-time JavaScript code genertors.
   
   At this level, Toubkal uses a subset of the JavaScript programming language and allows to
   describe complex realtime applications with an order of magnitude less code, greatly
   improving code productivity and maintainability.
   
   Toubkal vs SQL:
   ---------
   Toubkal database services are provided as pipelets. The following table shows Toubkal
   counterparts to SQL clauses:
   
   -------------------------------------------------------------------------------------------
   | SQL      | Toubkal Pipelet | Pipelet behavior notes                                     |
   |----------------------------|------------------------------------------------------------|
   | Where    | filter()        | Selects a subset of objects from the source dataflow       |
   | Group By | aggregate()     | Groups measures by dimensions                              |
   | Order By | order()         |                                                            |
   | Join     | join()          | Inner, left, right, and outer joins 2 dataflows            |
   | Select   | alter()         | Outputs an altered dataflow but with same number of objects|
   -------------------------------------------------------------------------------------------
   
   But the most fundamental difference with SQL is that Toubkal expressions are dataflows
   that do not stop after returning a dataset, they are constantly updating, somewhat like
   SQL materialized views.
   
   Unlike SQL, Toubkal pipelets are available everywhere to both backend server code and
   client code, so applications can be architechtured with much more flexibility i.e. filters
   can be done on the server while some aggregates mays be computed on clients allowing to
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
   
   There are four Operations allowing to modify the state of a set: _add(), _remove(),
   _update(), and _clear():
   
     - Pipelets process the basic Operations _add() and _remove() coming from their source
       and produce a destination set. All sets can be defined and updated using these two
       operations.
       
     - The _update() Operation is an optimization that groups a remove and an add operation
       into a single operation.
       
     - The _clear() Operation empties a set but should only be used in applications as an
       optimization before re-adding a new objects. It should not be used when the order of
       operations is undefined typically in a distributed server application.
   
   These four Operations are typically not used directly by Toubkal application developpers
   who should only assemble pipelets in order to describe applications as shown in the above
   example.
   
   On the other hand Toubkal pipelet developpers must define these four operations by
   overloading all or some of these in derived classes of the Pipelet base class.
   
   Application vs Pipelet Developers:
   ---------------------------------
   Likewise, most of the complexity of pipelets can be ignored by application developpers but
   must be mastered by pipelet developpers. This clearly defines two profiles of developpers
   in Toubkal projects with different skills:
     - Application developpers focus on bussiness logic. Using pipelets they benefit from the
       higher performance and enhanced productivity and simplicity provided by the Toubkal
       dataflow model.
       
     - Pipelet developpers focus on performance of application building blocks and their
       semantic. They must master Toubkal Pipelets complexity and guaranty quality preferably
       using automated testing. In turn this complexity eases the developement of complex realtime
       applications. While many applications can be designed using Toubkal provided pipelets, some
       applications require the developpement of custom pipelets. Pipelet semantical design is
       an essential consideration to deliver reusable dataflow components that effectively
       simplify their documentation and the work of application developpers. 
   
   Pipelet Developpers' Guide:
   --------------------------
   
   Reserved Value Attributes:
   -------------------------
   Some value attributes are non-strictly reserved to simplify application developement by
   providing naming conventions. Although these are not strictly reserved at this time, we
   may decide to make these reservations more strict in future releases and therefore
   highly discourage their use for other purposes than documentated in the next sections.
   
   These attributes are metadata required to manage sets but are not mandatory. These are
   required only for some dataflows.
   
   Currently reserved value attributes are:
   - flow: the name of the dataflow/set. It is required when the dataflow may be mixed with
     other dataflows to uniquely identify objects.
     
   - id  : the object identifier in this dataflow. It is required when there is more than
     one object in a set, 
     
   - _v  : the version of this object's value. It is required when an object may hold
     multiple values over time, allowing to uniquelly identify values and manage
     out-of-order operations.
     
   - _t  : a timestamp when the value was created
   
   - any other two letters attributes or attributes starting with the chararcter '_'.
     Future candidates include:
     - _b: a branch or chard identifier where values are routed to and from.
     - _o: an operation order allowing to retrieve values from a certain point
   
   Many sets per Pipelet, and the 'flow' Attribute:
   -----------------------------------------------
   Some pipelets may handle many sets simultaneously. This simplifies complex applications
   with many sets that can share some pipelets. This is typically the case for persistance,
   replication, charding, and dispatching pipelets.
   
   To differentiate between dataflows the 'flow' attribute is used, while the flow() pipelet
   allows to query operations for a single dataflow. The set_flow() pipelet allows to set
   the flow attribute.
   
   The combination of 'flow' and 'id' attributes uniquelly identifies objects whie the
   combination of 'flow', 'id', and '_v' uniquely identify values.
   
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
   
   Transactions with options 'more' and 'transaction_id':
   -----------------------------------------------------
   Operations can be combined to form transactions. Operations may contain a 'more' option to
   indicate that more operations should be expected as part of a transaction. A 'no-more'
   condition is reached if the 'more' option is set to the boolean value 'false' or if the
   'more' option is not present. Therefore, by default, i.e. when no options are provided,
   operations are the final operation of single-operation transactions.
   
   To differentiate between multiple transactions going on simultaneously in the same flow,
   the option 'transaction_id' must be set to a UUIDv4 value.
   
   The 'more' option along with its 'transaction_id' option must be propagated by all pipelets
   and may serve two possible purposes:
     - optimize certain updates by grouping a number of operations that may take different
       paths to reach a particular pipelet.
       
       If the more option is discarded the only consequence should be that these optimisations
       could not be performed, possibly resulting in performance issues.
       
     - grouping a number of operations over time to provide the equivalent of loops in a
       procedural language of a multi-threaded system. The 'more' option indicates that the
       loop has not ended while the no-more condition indicates and end of loop.
       
       If the 'more' option is discarded by a downstream pipelet, it would effectively break
       the loop, most likely breaking application logic.
   
   There is currently no meachanism to abort or rollback a transaction but any operation can
   be reverted using a 'remove' for each 'add' and an 'add' for each 'remove'.
   
   Helper function help manage options:
     - RS.options_forward( options ): get transaction options from options
   
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
   To ease horizontal distribution, an important aspect of Toubkal operations is that these can
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
   the same value. This also implies that updates should always update the identity of
   objects to allow updates out of order.
   
   Consistency, Availability, and Partition tolerence:
   --------------------------------------------------
   Consistency of distributed sets is 'eventual' and performed by conflict resolution agents,
   i.e. Toubkal provides high availability and partition tolerence by delaying consistency.
   
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
   
   Examples of stateful pipelets include Fork, Union, and Filter.
   
   Forks and Union can be distributed in hierarchical trees.
   
   A Fork can be distributed into a head fork, connected to many indepedent forks.
   Likewise a Union can be distributed into many independent unions connected to a tail
   union. This hierarchy can have any depth allowing scalability to billions of branches
   over as many processes and machines as required.
   
   Stateless pipelets must implement the __transform( values ) method that returns values
   as transformed or filtered. This method is then used by _add(), _remove(), and _update()
   operation methods to produce the desintation set plus the _fetch() method invoqued when
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
   
   Sateful pipelets must implement _fetch(), _add(), _remove(), _update(), and _clear() and
   propagate their state forward using __emit_xxx() methods where xxx is one of add, remove
   update, or clear.
   
   Furthermore, stateful pipelets must set '_input.query' to a non-null query so that
   their source content is fetched upon connection with source pipelets.
   
   This can be achieved by deriving from 'Set', a base class provided for stateful
   pipelet.
   
   Stateful pipelets must either implement an antistate or memorize all operations. The
   Set base class implements an antistate in memory.
   
   Stateful pipelets managing many sets simultaneously should manage as many anistates as
   there are sets. Each set is associated with a 'flow' and a key that allows to manage these
   antistates.
   
   Conflict Resolution / Convergence:
   ---------------------------------
   Stateful pipelets are responsible for resolving conflicts related to the final
   state of a set. The same set should show the same final state even when operations
   are received out of order.
   
   Stateless pipelets cannot resolve conflict process conflicting operations just
   like any other operation.
   
   Conflicts happen when:
     - Two or more add operations have the same key
     - A remove or update operation does not find a matching value
     - Other conditions specific to the semantic of a particular set
   
   Conflict detection can be differentiated from unordered operations because unordered
   operations are transitional and should be compensated 'soon' after these are received.
   
   'soon' may go from milliseconds in the closed context of multi-process distribution on a
   non-overloaded single machine, to many minutes or hours in a catastrophic event where all
   replicas of a chard are temporarily unavailable.
   
   Therefore conflict can be detected faster if the state of availability of all chards
   is known.
   
   One possible strategy for conflict resolution reverts all conflicting operations:
     - adds becomes removes
     - removes becomes adds
     - updates are reverted, i.e. previous and new values are swapped
   
   Persistance:
   -----------
   Persistance is achieved using stateless pipelets that store all operations into some mass
   storage.
   
   These operations can be stored in any order over many chards maintained by many independent
   servers.
   
   Upon storing transactions, meta-information can be added such as timestamps and user ids.
   
   Replication:
   -----------
   Replication is achieved by persisting the same set of operations over more than one set
   of chards.
   
   Initialisation and restart synchronisation between replicas may be optimized using
   vector clocks allowing to _fetch a subset of set.
   
   Data Versionning:
   ----------------
   Because persistence is achieved by storing all operations, all previous versions of all
   objects can be reconstructed.
   
   The requirement for a unique identity enables to re-order operations on every object.
   
   Reconstruction can be done forward by processing operations in storage order, or
   backward by reverting operations in reverse storage order.
   
   Compaction and Version Discarding:
   ---------------------------------
   For performance and privacy issues, it may be desirable to discard past versions of
   objects on all replicas. This can be achieved by several strategies:
   
   - Full compacting, by storing the current state and anti-state of a chard. Doing
     so, all meta information of the original operations will most likely be discarded.
   
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
     easily using Compose().
     
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
     
   Pipelet Options vs Independent Pipelets
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
     
     The documentation should include:
       - the name of the pipelet as a function with its parameters
       - the description of all parameters, documenting defaults for optional parameters
       - the description of the expected incoming dataflow
       - the description of outgoing dataflow
*/
( this.undefine || require( 'undefine' )( module, require ) )
( { global: 'rs', no_conflict: true } )
( 'pipelet', [ './RS', './query', './transactions' ], function( RS, Query, Transactions ) {
  'use strict';
  
  var Code                   = RS.Code
    , Event_Emitter          = RS.Event_Emitter
    , Query_Tree             = Query.Tree
    , Transaction            = Transactions.Transaction
    , Input_Transactions     = Transactions.Input_Transactions
    , Output_Transactions    = Transactions.Output_Transactions
    , Options                = Transactions.Options
    , options_forward        = Options.forward
    , log                    = RS.log.bind( null, 'pipelet' )
    , extend                 = RS.extend
    , extend_2               = extend._2
    , is_array               = RS.is_array
    , subclass               = RS.subclass
    , Loggable               = RS.Loggable
    , Root                   = subclass.Root
    , new_apply              = subclass.new_apply
  ;
  
  var push     = Array.prototype.push
    , slice    = Array.prototype.slice
    , concat   = Array.prototype.concat
    , toString = Object.prototype.toString
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug( message )
     
     Logs an error message if de is true.
  */
  var de = false, ug = log;
  
  /* -------------------------------------------------------------------------------------------
     Plug( pipelet, name )
     
     Base class for Input and Output plugs.
     
     Input plugs are meant to receive data events from Output plugs.
     
     A Plug is an Event_Emitter.
     
     Parameters:
     - pipelet (Object): a reference to the pipelet this plug is attached to.
       A pipelet must provide a _get_name( method ) method.
       
     - name (String): the name for this plug, used in traces
  */
  var plugs = 0; // for debugging purposes
  
  function Plug( pipelet, name ) {
    var that = this;
    
    Event_Emitter.call( that, name + ' #' + ++plugs );
    
    that.pipelet = pipelet;
    that.name    = name;
    
    // Upstream source
    that.source = null;
  } // Plug()
  
  Event_Emitter.subclass( 'Plug', Plug, {
    /* ------------------------------------------------------------------------
       error( method, message, then )
       
       ToDo: emit error trace.
       
       Reports errors to error dataflow then throws.
       
       Parameters:
         - method (String): the name of the method where the error occurred
         
         - message (String): an error message
         
         - then (Function): optional, call then() with Error instance,
           otherwise throw Error.
    */
    error: function( method, message, then ) {
      message = this._get_name( method ) + message;
      
      var error = new Error( message );
      // ToDo: report error to global error dataflow or error output
      
      if ( then )
        then( error )
      else
        throw error
      ;
    }, // error()
    
    /* ------------------------------------------------------------------------
        @method Plug..update_upstream_query( changes, destination )
        
        @short Update upstream source query with minimum changes.
        
        @description:
          Apply query changes to local query, find minimum set of changes
          calling @@Plug.._update_query(), if there are any changes apply
          them upstream calling source.update_upstream_query().
        
        @parameters:
        - changes (Array): changed query terms:
          - 0 (Array): query terms to remove
          - 1 (Array): query terms to add
        
        - destination (Plug): subscriber
    */
    update_upstream_query: function( changes, destination ) {
      var that   = this
        , source = that.source
      ;
      
      changes = that._update_query( changes, destination );
      
      de&&ug( that._get_name( 'update_upstream_query' ) + 'changes:', changes, '\n  source:', source && source._get_name() );
      
      source
        && changes[ 0 ].length + changes[ 1 ].length
        && source.update_upstream_query( changes, that )
      ;
    }, // Plug..update_upstream_query()
    
    // Virtual Plug.._update_query( changes )
    
    /* ------------------------------------------------------------------------
        @method Plug.._fetch( receiver, query, update_query, destination, options )
        
        @short Fetches data from source then updates local queries.
        
        @description:
          This method should not be called directly but may be overloaded.
          
          API in progress: this method is replacing the old _fetch(), providing 
          dditional services that could not be implemented with _fetch() API.
          
          Features (WIP):
          
          - Forward-compatible with the old _fetch() during a transition
            period. Eventually compatibility will be discarded;
            
          - Emits adds, removes and updates;
          
          - Operations options, e.g. with transactions;
          
          - Synchronization between fetch() and query updates to prevent
            dataloss or duplicates, waiting for pending transactions to
            complete;
          
          - Query to specify a starting point for desired operations, allowing
            reconnections and optimized replication;
          
          - Track pending fetches to allow disconnections to either wait-for-
            completion-of or discard pending fetches;
            
          .
        
        @parameters:
        - receiver (Function): signature receiver( adds, no_more, removes, updates, options ):
          - adds (Array): values added. Empty Array if no values are added.
          
          - no_more: if falsy, more operations will come later, if truly
            this is the last chunk for this fetch.
            
          - removes (Array): optional values removed.
          - updates (Array): optional updated values.
          - options (Object): optional
            - _t: a transaction object when values were added, removed or updated
            - clock: A Lamport Clock for the last value of this operation
          
        - query (optional Array of Objects): see Output.._fetch() for
          definition
        
        - query_changes (Array): optional query update once values are fetched
        
        - destination (Plug): optional plug for _update_query()
        
        - options (Object):
          - clock: Lamport clock after which to start fetching values
    */
    _fetch: function( receiver, query, query_changes, destination ) {
      var that             = this
        , name             = de && that._get_name( "_fetch" )
        , transform        = that._transform
        , query_transform  = that._query_transform
        , _query           = query
        , _query_changes   = query_changes
        , _update_query    = query_changes && that._update_query
        , source
        , filter
      ;
      
      // Tell _do_not_fetch() that sources must now be fetched when further connected to upstream pipelets
      // This may no-longer be necessary
      if ( that.no_fetch === true ) that.no_fetch = false;
      
      if ( that.fetch_unfiltered ) {
        if ( filter = query && new Query( query ).generate().filter )
          transform = function( options ) { return filter } // ignore options
        ;
        
        that.fetch_unfiltered( transform || _update_query ? rx : receiver );
      } else if ( source = that.source ) {
        de&&ug( name, 'query:', query );
        
        if ( query_transform ) {
          _query = query && transform_query( query );
          
          _query_changes = query_changes && query_changes.map( transform_query );
        }
        
        if ( transform )
          transform = function( options ) {
            return function( values ) {
              return that._transform( values, options, 'fetch' );
            }
          }
        ;
        
        source._fetch( transform || _update_query ? rx : receiver, _query, _query_changes, that );
      } else {
        de&&ug( name, 'no source' );
        
        rx( [], true ); // No source, so this is an empty set
      }
      
      function rx( adds, no_more, removes, updates, options ) {
        // Apply changes on local query, synchronized with receiver() call bellow
        _update_query && _update_query.call( that, query_changes, destination );
        
        var al = adds    && adds   .length || 0
          , rl = removes && removes.length || 0
          , ul = updates && updates.length || 0
          , _transform
        ;
        
        // transform results if any
        if ( transform ) {
          _transform = transform( options );
          
          if ( al ) adds    = _transform( adds    ), al = adds   .length;
          if ( rl ) removes = _transform( removes ), rl = removes.length;
          if ( ul ) updates = update    ( updates ), ul = updates.length; // may push to adds, removes, update al and rl
        }
        
        // emit transformed results
        if ( no_more || al + rl + ul )
          receiver( adds, no_more, removes, updates, options )
        ;
        
        function update( updates ) {
          return updates
            .reduce( function( updates, update ) {
              var _removes = _transform( [ updates[ 0 ] ] )
                , _adds    = _transform( [ updates[ 1 ] ] )
                , _rl      = _removes.length
                , _al      = _adds   .length
              ;
              
              if ( _rl == 1 && _al == 1 ) {
                updates.push( [ _removes[ 0 ], _adds[ 0 ] ] );
              } else {
                if ( _al ) al = push.apply( adds    = adds    || [], _adds    );
                if ( _rl ) rl = push.apply( removes = removes || [], _removes );
              }
              
              return updates;
            }, [] )
          ;
        }
      } // rx()
      
      function transform_query( query ) {
        return query
          .reduce( function( terms, term ) {
            term = query_transform( term );
            
            term && terms.push( term );
            
            return terms;
          }, [] )
        ;
      }
    }, // Plug.._fetch()
    
    /* ------------------------------------------------------------------------
       Plug..fetch_all( receiver, query )
       
       Fetches the entire content of set.
       
       This method should only be used for debugging and testing purposes or
       when the full state is known to be 'small' (can fit entirely in memory)
       and the source fetched is always on the same thread.
       
       For large sets, use _fetch() instead that allows to retrieve the content
       in 'reasonable' size chunks that require less memory.
       
       Parameters:
         - receiver (optional Function): see _fetch() for definition.
           
           This function must be provided if source responds asynchronously
           to _fetch(). Otherwise an error will be thrown.
           
           !!! Warning:
           It is highly recommended to always provide the receiver function
           to future-proof programs. Not using a receiver should only be used
           for testing when source is known to be synchronous.
           
         - query (optional Array of Objects): see _fetch() for definition.
           
       Returns:
         Undefined: the source did not respond synchronously to _fetch()
           therefore the result cannot be known at the time when fetch_all()
           returns.
         
         Array of values: the source responded synchronously to _fetch() and
           this are the values fetched.
         
       Exceptions:
         If the method is asynchronous, and no receiver function is provided.
         
         If a chunk is received after the last chunk was received.
    */
    fetch_all: function( receiver, query ) {
      var that   = this
        , p      = that.pipelet
        , chunks = []
        , out
      ;
      
      de&&ug( that._get_name( 'fetch_all' ) + 'query:', query );
      
      that._fetch( rx_concat, query );
      
      out || receiver || error( 'is asynchronous and no receiver function was provided' );
      
      return out;
      
      function rx_concat( values, no_more ) {
        out && error( 'received extra chunck after no_more' );
        
        values && values.length && chunks.push( values );
        
        if ( no_more ) {
          out = concat.apply( [], chunks );
          
          receiver && receiver.call( p, out );
        }
      } // rx_concat()
      
      function error( message ) {
        that.error( 'fetch_all', message )
      } // error()
    } // Plug..fetch_all()
  } ); // Plug instance methods
  
  /* -------------------------------------------------------------------------------------------
      @class Input( pipelet, name [, tag, input_transactions] )
      
      @short An input plug.
      
      @parameters:
       - pipelet (Pipelet): input owner
       - name     (String): for Loggable
       - tag      (String): input transactions tag
       - input_transactions (Input_Transactions): shared with other inputs
      
      @manual programmer
  */
  function Input( p, name, tag, input_transactions ) {
    name = name || 'in';
    
    Plug.call( this, p, name );
    
    // Source query for upstream pipelet
    this.query = null;
    
    // Tells _do_not_fetch() to not fetch data when connected to an upstream pipelet
    // Set to true by _fetch() on first fetch, and by stateful pipelets
    this.no_fetch = true;
    
    // Incoming subscriber index in current operation, updated by Query_Tree methods
    this.source_subscriber_index = 0;
    
    this.transactions = input_transactions || new Input_Transactions( name );
    
    // ToDo: inputs should allow multiple tags and branches count should be related to a tag
    this.tag = tag || null;
    
    this.branches = 0;
  } // Input()
  
  Plug.subclass( 'Input', Input, {
    /* ------------------------------------------------------------------------
        @method Input..set_tag( tag )
        
        @short Sets input transactions' tag.
        
        @description:
          This may be called by an upstream @@Controllet to apply controllet's
          input tag to all its destinations, the controllet, appearing as the
          synchronization point from a programmer's perspective.
        
        @parameter tag (String): transaction tag from an upstream fork tag
          dispatching operations over a number of concurrent pipelets. If there
          is no tag, no concurrent transaction joins at this input.
    */
    set_tag: function( tag ) {
      tag && this.transactions.set_tag( this.tag = tag );
    }, // Input..set_tag()
    
    /* ------------------------------------------------------------------------
        @method Input..add_branches( count )
        
        @short Add or remove input transactions' branches.
        
        @parameters count (Integer): positive to add, negative to remove.
    */
    add_branches: function( count ) {
      this.branches += count;
      
      this.transactions.add_branches( count );
      
      de&&ug( this._get_name( 'add_branches' ) + 'added ' + count + ' branches, total branches: ' + this.branches );
    }, // Input..add_branches()
    
    add: function( added, options ) {
      this.pipelet._add( added, options );
      
      return this; // ToDo: remove return this in all operations methods
    }, // Input..add()
    
    remove: function( removed, options ) {
      this.pipelet._remove( removed, options );
      
      return this;
    }, // Input..remove()
    
    update: function( updated, options ) {
      this.pipelet._update( updated, options );
      
      return this;
    }, // Input..update()
    
    clear: function( options ) {
      this.pipelet._clear( options );
      
      return this;
    }, // Input..clear()
    
    // ToDo: remove deprecated, never used Input..notify()
    notify: function( transaction, options ) {
      this.pipelet._notify( transaction, options );
      
      return this;
    }, // Input..notify()
    
    /* ------------------------------------------------------------------------
        @method Input..add_source( source, options, then )
        
        @short Subscribe this input to source.
        
        @description:
        Adds a source to this pipelet:
        
          source ----> this
        
        The content of the source is then fetched and added to this pipelet
        unless this pipelet is lazy, instance flag no_fetch is true or option
        no_fetch is provided.
        
        @parameters:
        - source: (Array of Objects, or Output) to add as a source to this
          Input.
        
        - options (Optional Object):
          - no_fetch (Boolean): do not fetch data from source to add values to this
            pipelet.
          - _t (Object): a transaction object to fetch initial data
        
        - then (Function): optional function called when subscription is
          fully updated, including possible assynchronous fetches.
    */
    add_source: function( source, options, then ) {
      var that           = this
        , pipelet        = that.pipelet
        , source_pipelet = source.pipelet
      ;
      
      // Set namespace even if source is void, because it provides the namespace
      source_pipelet
        && pipelet.set_namespace
        && pipelet.set_namespace( source_pipelet )
      ;
      
      if ( ! source.is_void ) {
        if ( source._transactional_fetch ) {
          // This is an Output
          
          return that
            ._add_source             ( source ) // may throw if source already added
            ._add_source_destination ( source )
            ._add_source_branches    ( source )
            ._add_source_subscription( source, options, then )
          ;
        } else if ( is_array( source ) ) {
          // This should be an Array of objects
          that
            ._add_source             ( source )
            ._update_source_array    ( source, options )
          ;
        } else {
          that._source_error( 'add_source', source, then );
        }
      } // ! source.is_void
      
      then && then()
      
      return that;
    }, // Input..add_source()
    
    /* ------------------------------------------------------------------------
        @method Input..remove_source( source, options, then )
        
        @short Unsubscribe this input from source.
        
        @description:
          Cuts the connection between upstream source pipelet and this pipelet.
          
            source --x--> this
          
          The content of source is then fetched and removed from this pipelet
          unless this pipelet is lazy or option no_fetch is provided.
        
        @parameters:
        - source: (Array of Objects, or Output) the source to remove
        
        - options:
          - no_fetch: do not _fetch the source to remove values from destination
        
        - then (Function): optional function called when subscription is
          fully updated, including possible assynchronous fetches.
       
       ToDo: tests for remove_source and remove_destination
    */
    remove_source: function( source, options, then ) {
      var that = this;
      
      if ( ! source.is_void ) {
        // options = extend_2( { operation: 'remove' }, options );
        
        if ( source._transactional_fetch ) {
          // We have an Output object
          that
            ._remove_source_subscription( source, options, function() {
              // ToDo: (optionally) wait for pending fetches to complete or kill pending fetches
              de&&ug( that._get_name( 'remove_source' ) + 'removed source subscription, options:', options );
              
              that
                ._remove_source             ( source ) // may throw if source not that source
                ._remove_source_branches    ( source )
                ._remove_source_destination ( source )
                ._transactions_remove_source( source )
              ;
              
              then && then();
            } )
          ;
          
          return that;
        } else if ( is_array( source ) ) {
          // Array of Objects
          that
            ._update_source_array       ( source, options, true )
            ._remove_source             ( source )
          ;
        } else {
          that._source_error( 'remove_source', source, then );
        }
      } // ! source.is_void
      
      then && then();
      
      return that;
    }, // Input..remove_source()
    
    /* ------------------------------------------------------------------------
       Input.._source_error( function_name, source, then )
       
       Private helper method for add_source() and remove_source().
       
       Throws a bad source type Error for function_name.
    */
    _source_error: function( function_name, source, then ) {
      // ToDo: add_source() and remove_source(), add test for bad source type
      this.error( function_name,
        'expected instance of Output or Array, got a ' +
        ( source._get_name ? source._get_name() : toString.call( source ) ),
        then
      );
    }, // Input.._source_error()
    
    /* ------------------------------------------------------------------------
       Input.._add_source_destination( output )
       
       Adds this input as a destination for output.
       
       This is a low-level method called by add_source() that should not be
       called directly.
       
       Parameters:
         - output (Output): the source output to add this destination input.
    */
    _add_source_destination: function( output ) {
      output._add_destination( this );
      
      return this;
    }, // Input.._add_source_destination()
    
    /* ------------------------------------------------------------------------
       Input.._remove_source_destination( output )
       
       Removes this input as a destination from output.
       
       This is a low-level method called by remove_source() that should not be
       called directly.
       
       Parameters:
         - output (Output): the source output to remove this destination input.
    */
    _remove_source_destination: function( output ) {
      output._remove_destination( this );
      
      return this;
    }, // Input.._remove_source_destination()
    
    /* ------------------------------------------------------------------------
        @method Input.._add_source_branches( source )
        
        @short Adds as many branches as source reports
        
        @parameter source (Output), providing branches_count() method.
    */
    _add_source_branches: function( source ) {
      this.add_branches( source.branches_count() );
      
      return this;
    }, // Input.._add_source_branches()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_branches( source )
        
        @short Removes as many branches as source reports
        
        @parameter source (Output), providing branches_count() method.
    */
    _remove_source_branches: function( source ) {
      this.add_branches( - source.branches_count() );
      
      return this;
    }, // Input.._remove_source_branches()
    
    /* ------------------------------------------------------------------------
       Input.._add_source( source )
       
       Sets the source output for this input plug.
       
       This is a low-level method that should not be used by external objects
       because it does not add a destination to the source pipelet.
       
       Parameters:
         - source (Output or Array of Objects): the source output to add or
           undefined to remove the source.
    */
    _add_source: function( source ) {
      var s = this.source;
      
      s && this.error( '_add_source', 'already has a source: ' + ( s._get_name ? s._get_name() : typeof s ) );
      
      this.source = source;
      
      return this;
    }, // Input.._add_source()
    
    /* ------------------------------------------------------------------------
       Input.._remove_source( source )
       
       Removes an upstream source output from this input.
       
       This is a low-level method that should not be called directly.
       
       Parameters:
         - source (Output or Array of Objects): to remove from this input
       
       Exception:
         - source is not a source of this input
    */
    _remove_source: function( p ) {
      this.source !== p && this.error( '_remove_source', 'expected ' + ( this.source && this.source._get_name() ) + ' instead of ' + p._get_name() );
      
      this.source = null;
      
      return this;
    }, // Input.._remove_source()
    
    /* ------------------------------------------------------------------------
        Input.._update_source_array( source, options, remove )
        
        Add or remove source data unless this._do_not_fetch( options )
        
        Parameters:
        - source (Array): added or removed directly to this pipelet
        
        - options (Optional Object):
          - no_fetch (Boolean): don't do anything, return immediately
          
          - _t (Object): a transaction Object
        
        - remove (Boolean): true to remove, falsy to add
    */
    _update_source_array: function( source, options, remove ) {
      var that = this;
      
      options = that._fetch_option( options );
      
      if ( ! ( options && options.no_fetch ) ) { // Don't add or remove anything
        de&&ug( that._get_name( '_update_source_array' ) + 'source:', typeof source );
        
        var q = that.query;
        
        if ( q ) source = q.filter( source );
        
        that[ remove ? 'remove' : 'add' ]( source, options_forward( options ) );
      }
      
      return that;
    }, // Input.._update_source_array()
    
    /* ------------------------------------------------------------------------
        @method Input.._add_source_subscription( source, options )
        
        @short Add source query and fetch.
        
        @parameters:
        - source (Output): to subscribe to
        
        - options (Object):
          - _t (Object): transaction object
          
          - no_fetch (Boolean): do not fetch if true.
        
        - then (Function): optional function called when subscription is
          fully updated, including possible assynchronous fetches.
    */
    _add_source_subscription: function( source, options, then ) {
      var that  = this
        , q     = that.query
      ;
      
      that._update_subscription( [ [], q && q.query ], that._fetch_option( options ), source, then );
      
      return that;
    }, // Input.._add_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_subscription( source, options )
        
        @short Fetch then remove source query.
        
        @parameters:
        - source (Output): subscribed to
        
        - options (Object):
          - _t (Object): transaction object
          
          - no_fetch (Boolean): do not fetch if true.
        
        - then (Function): optional function called when subscription is
          fully updated, including possible assynchronous fetches.
    */
    _remove_source_subscription: function( source, options, then ) {
      var that  = this
        , q     = that.query
      ;
      
      that._update_subscription( [ q && q.query, [] ], that._fetch_option( options ), source, then );
      
      return that;
    }, // Input.._remove_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Input.._fetch_option( options )
        
        @short Provide option no_fetch if pipelet is lazy or not yet fetching.
        
        @parameter options (Object): optional
        - no_fetch (Boolean): do not fetch if true
        - _t (Object): a transaction object
        
        @returns new options with no_fetch set to true or original options
    */
    _fetch_option: function( options ) {
      if ( this.is_lazy() || this.no_fetch )
        options && options.no_fetch
          || ( options = extend_2( { no_fetch: true }, options ) )
      ;
      
      return options;
    }, // Input.._fetch_option()
    
    /* ------------------------------------------------------------------------
        @method Input.._update_subscription( changes, options, source, then )
        
        @short Manages data subcription changes in a transaction.
        
        @description:
          Fetches source, updates data, and update upstream query.
        
        @parameters:
        - changes (Array):
          0: removes (Array): removed subscription query terms
          1: adds    (Array): added subscription query terms
        
        - options (Object):
          - no_fetch (Boolean): do not fetch source
          - _t (Object): upstream transaction requesting subscription changes
          
        - source (Output): optional source, default is this.source
        
        - then (Function): optional function called when subscription is
          fully updated, including possible assynchronous fetches.
    */
    _update_subscription: function( changes, options, source, then ) {
      var input = this;
      
      if ( source || ( source = input.source ) ) {
        de&&ug( input._get_name( '_update_subscription' ), 'changes:', changes, ', source:', source._get_name() );
        
        source._update_subscription( input, changes, options, then );
      } else {
        then && then();
      }
    }, // Input.._update_subscription()
    
    /* ------------------------------------------------------------------------
       Input.._transactions_remove_source( output )
       
       Removes a source output from all source transactions, if any.
       
       This method is called by this.remove_source( source ) to cleanup
       unterminated transactions from a source.
       
       !!! Warning:
       Unterminated transactions from a source should not happen when the
       source is disconnected, unless the termination is forced immediate or
       due to a network problem.
       
       The current behavior is to terminate the transaction, later a warning
       condition will be emitted, and later-on unterminated transactions
       should most-likely be rolled-back, especially at network boundaries
       when non-recoverable disconnections occur, e.g. in socket_io_crossover
       ongoing transactions may be memorized to allow rolling them back at least
       on subscription updates.
       
       Parameters:
       - output (Output): the source output being removed.
       
       Returns this;
       
       ToDo: add tests for _transactions_remove_source()
    */
    _transactions_remove_source: function( output ) {
      var that = this;
      
      that.transactions
        .remove_source( output.transactions )
        
        .forEach( function( _t ) {
          // Terminate transaction at this input
          
          // ToDo: add warning condition, removing pipelet connection in the middle of a transaction.
          RS.log( 'notice:', that._get_name( '_transactions_remove_source' )
            + 'removing pipelet connection in the middle of transaction, _t:', _t
          );
          
          // ToDo: Transactions allow handling of canceled flag in downstream pipelets
          // ToDo: add test for cancelled transaction by _transactions_remove_source()
          that.add( [], { _t: extend( { canceled: true }, _t ) } );
        } )
      ;
      
      return this;
    }, // Input.._transactions_remove_source()
    
    /* ------------------------------------------------------------------------
       Input..insert_source_union( [ name ] )
       
       Inserts a union as a source of this, switching a previous source of this
       if any.
       
       Parameters:
         name (Optional String): a pipelet name for the inserted union. The
           default name is composed from the name of this pipelet.
         
       Returns:
         The inserted union.
    */
    insert_source_union: function( name ) {
      var that     = this
        , rs       = that.pipelet.namespace()
        , no_fetch = { no_fetch: true } // Will just switch the connexion between source and union
        , source   = that.source
      ;
      
      de&&ug( that._get_name( 'insert_source_union' )
        + 'source: ' + ( source && source._get_name ? source._get_name() : typeof source )
      );
      
      if ( source ) {
        that.remove_source( source, no_fetch );
      } else {
        source = rs;
      }
      
      return rs
        .union( [], { name: name || ( that._get_name() + ' (union)' ) } )
        
        ._add_source( source, no_fetch )
        
        ._add_destination( that )
      ;
    }, // Input..insert_source_union()
    
    /* ------------------------------------------------------------------------
        @method Input..is_lazy()
        
        @short True if input is not querying anything from upstream.
        
        @description:
          An input is considered lazy if it has no query of its query is empty.
        
        @returns (Boolean) true if lazy, false if not lazy.
    */
    is_lazy: function() {
      var q = this.query;
      
      return ! ( q && q.query.length );
    }, // Input..is_lazy()
    
    /* ------------------------------------------------------------------------
        @method Input.._update_query( changes )
        
        @short Update input query with minimum changes.
        
        @description:
          Apply changes to input query, return minimum set of changes.
        
        @parameter changes (Array)
          - 0 (Array): query terms to remove
          - 1 (Array): query terms to add
        
        @returns changes (Array):
          0 (Array): query terms removed
          1 (Array): query terms added
    */
    _update_query: function( changes ) {
      var removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , rl      = removes.length
        , al      = adds.length
        , q
      ;
      
      if ( rl + al ) {
        q = this.query = this.query || new Query( [] );
        
        rl && q.remove( removes ); // would throw if there were any removes and there were no query before
        al && q.add   ( adds    );
        
        changes = q.discard_operations();
      }
      
      return changes;
    } // Input.._update_query()
  } ); // Input instance methods
  
  /* -------------------------------------------------------------------------------------------
     Output( pipelet, name )
     
     An output plug.
     
     Parameters:
     - pipelet (Pipelet): output owner
     - name (String): for Loggable
  */
  function Output( pipelet, name ) {
    name = name || 'out';
    
    Plug.call( this, pipelet, name );
    
    // Destinations, downstream inputs
    this.destinations = [];
    
    // Output transactions
    this.transactions = new Output_Transactions( name );
    
    // Output Query Tree router
    this.tree = new Query_Tree( name );
  } // Output()
  
  Plug.subclass( 'Output', Output, {
    /* ------------------------------------------------------------------------
        @method Output..branches_count()
        
        @short Reports the number of branches this output provides.
        
        @description:
          By default a pipelet has one branch, for its own output.
          
          @@Controllet.Outputs overload this method.
        
        @return count (Integer), the number of branches this output provides.
    */
    branches_count: function() {
      return 1;
    }, // Output.._branches_count()
    
    /* ------------------------------------------------------------------------
        @method Output..add_destination( destination, options, then )
        
        @short Add a subscriber.
        
        Adds a destination input to this source output:
        
          this output ---> destination input
          
        The content of the this output is then fetched and added to destination
        input unless destination is lazy or has instance flag no_fetch set to
        true or option no_fetch is provided.
        
        @parameters:
          - destination: (Input) the destination input
          
          - options (Optional Object):
            - no_fetch: do not fetch the source to remove
            - _t (Object): transaction object
          
          - then (Function): optional, called when subscription is complete
    */
    add_destination: function( destination, options, then ) {
      var that = this;
      
      de&&ug( that._get_name( 'add_destination' ) + 'destination: ' + destination._get_name() );
      
      destination.add_source( that, options, then );
      
      return that;
    }, // Output..add_destination()
    
    /* ------------------------------------------------------------------------
        Output..remove_destination( destination, options, then )
        
        Removes a destination input from this output:
        
          this output --x--> destination input
        
        The content of this output is then fetched and removed from destination
        input unless destination is lazy or option no_fetch is provided.
        
        Parameters:
          - destination: (Input) the destination input to remove_destination
          
          - options (Optional Object):
            - no_fetch: do not fetch the source to remove
            - _t (Object): transaction object
          
          - then (Function): optional, called when subscription is complete
    */
    remove_destination: function( destination, options, then ) {
      destination.remove_source( this, options, then );
      
      return this;
    }, // Output..remove_destination()
    
    /* ------------------------------------------------------------------------
       Output.._add_destination( input )
       
       Adds a destination input to this output.
       
       This is a low-level method that should not be used by external objects.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destination(s) (done by Controllet.Output)
         - reject the addition by generating an exception.
         - trigger other actions on addition
         - redirect to another another pipelet (done by Encapsulate)
       
       Parameters:
         - input (Input): the destination input to add
         
       Exception:
         - input is already added to this output's destinations
    */
    _add_destination: function( input ) {
      var destinations = this.destinations
        , position = destinations.indexOf( input )
      ;
      
      position != -1 && this.error( '_add_destination', 'already added, input: ' + input._get_name() );
      
      destinations.push( input );
      
      return this;
    }, // Output.._add_destination()
    
    /* ------------------------------------------------------------------------
       Output.._remove_destination( input )
       
       Removes a destination input from this output plug.
       
       This is a low-level method that should not be used by external objects.
       
       Parameters:
         - input: the destination input to remove from this output destinations
         
       Exception:
         - input is not a known destination of this output
    */
    _remove_destination: function( input ) {
      var destinations = this.destinations
        , position = destinations.indexOf( input )
      ;
      
      position == -1 && this.error( '_remove_destination', 'not found, destination: ' + input._get_name() );
      
      destinations.splice( position, 1 );
      
      return this;
    }, // Output.._remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Output.._update_subscription( input, changes, options, then )
        
        @short Manages data subcription changes in a transaction.
        
        @description:
          Fetches source, updates data on input, and update upstream query.
        
        @parameters:
        - input (Input): subscriber updating its subscription
        
        - changes (Array):
          0: removes (Array): removed subscription query terms
          1: adds    (Array): added subscription query terms
        
        - options (Object):
          - no_fetch (Boolean): do not fetch source
          - _t (Object): upstream transaction requesting subscription changes
        
        - then (Function): optional, called after subcription has updated.
    */
    _update_subscription: function( input, changes, options, then ) {
      var source  = this
        , removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , rl      = removes && removes.length ? 1 : 0
        , al      = adds    && adds   .length ? 1 : 0
        , count   = al + rl
        , fetch   = options && options.no_fetch ? 0 : 1
        , _count  = fetch * count + 1
        , _then   = then && function() { --_count || then() }
      ;
      
      options = extend_2( {}, options );
      
      if ( rl * fetch ) {
        options.operation = 'remove';
        options.count = count;
        
        // ToDo: provide changes to _transactional_fetch
        source._transactional_fetch( input, removes, options, _then );
      }
      // ToDo: updating upstream queries through source.update_upstream_query() must be synchronized with source._fetch()
      
      // Update upstream query trees and queries
      count && source.update_upstream_query( changes, input );
      
      de&&ug( source._get_name( '_update_subscription' ) + 'updated query, count:', count )
      
      _then && _then();
      
      al * fetch
        // ToDo: add test to verify that second fetch uses transaction
        
        && source._transactional_fetch( input, adds, options, _then )
      ;
    }, // Output.._update_subscription()
    
    /* ------------------------------------------------------------------------
        @method Output.._transactional_fetch( destination, query, options, then )
        
        @short Group one or more fetch in a transaction.
        
        @description:
          Fetch data for a receiver pipelet, limited by an optional query and
          possibly within a transaction defined in options.
        
        @parameters:
        - destination (Input): towards which adds (and eventually
          other operations) are emitted
        
        - query (Optional Array of AND-expressions): limiting returned
          operations.
        
        - options (Object): mutable options object:
          - _t (Object): a transaction object:
            - id (String): transaction id of a larger transaction this
              fetch is part of.
            
            - more (optional Boolean): true if this fetch is part of a
              larger ongoing transaction.
            
            - other optional transaction attributes
          
          - operation (String): "add" or "remove", default is "add".
            
            This option is deleted after use, so that the default operation
            for a possible follow-up call to _transactional_fetch() becomes
            "add", typically after a "remove".
          
          - count (Integer): the number of fetch operations, including this
            one, that are to be executed in a transaction. Default is 1. If
            count is greater than 1, options.transaction will be set for the
            next call to _transactional_fetch().
            
            This option is deleted after use.
          
          - transaction (Transaction): transaction set by previous call to
            _transactional_fetch().
            
            See also 'count' options.
        
        - next (Function): optional, called after fetch completes.
    */
    _transactional_fetch: function( destination, query, options, next ) {
      var that = this
        , transactions = that.pipelet._transactions // ToDo: or should it be plain Transaction instances as with _route()?
        , transaction
        , ended = false
        , count = 1
        , operation = "add"
        , o, _t
        , name = de && that._get_name( '_transactional_fetch#receiver' )
      ;
      /*
        ToDo: _transactional_fetch(): allow synchronization of fetch with query updates:
        - Upstream query updates will be done as fetch receivers proceed back to downstream
          requesting pipelet.
          
        - Assuming that fetch and other operations travel without changes in order, this will
          allow synchronization, maintaining dataflow consistency over asynchronous networks.
          
          This may be challenged by delayed transactions that only emit when complete. If a fetch
          happens in the middle of such a transaction, synchronization would no-longer be effective.
          
          So when fetched values arrive at a pipelet the solution is to also delay sending fetch
          response until all transactions are complete.
          
          Likewise as fetch results travel downstream towards its destination, it may be further
          delayed until other transactions complete at each intermediate step.
          
          This could be done naively by delaying all fetches until all transactions at a pipelet
          are complete.
          
          But this could lead to starvation if many transactions happen at that pipelet and are
          interlaced, there could always exist one or more ongoing transactions preventing fetches
          from delivering data.
          
          To prevent such stravation, a fetch might be delayed conditionally depending on the
          content of delayed transactions in progress matching fetch query.
      */
      
      if ( options.operation ) {
        operation = options.operation;
        
        delete options.operation;
      }
      
      if ( options.count ) {
        count = options.count;
        
        delete options.count;
      }
      
      if ( options.transaction ) {
        transaction = options.transaction;
        
        o = transaction.get_emit_options();
      } else if ( count != 1 ) {
        get_options( 2 );
        
        options.transaction = transaction;
      }
      
      /*
         ToDo: instruct fetch about desired synchronized query updates
      */
      this._fetch( receiver, query );
      
      function receiver( values, no_more ) {
        ended &&
          that.error( '_transactional_fetch',
            'already ended, no_more received twice from _fetch()'
          )
        ;
        
        de&&ug( name, { values: values.length, no_more: no_more } );
        
        if ( no_more ) {
          ended = true;
          
          if ( count == 1 ) {
            // This is the last emission of the last fetch
            get_options( 1 );
            
            transactions.end_transaction( transaction );
          }
        } else if ( values.length ) {
          // There will be at least 2 emissions
          o || get_options( 2 );
        } else {
          // Nothing to emit
          return;
        }
        
        _t = o && o._t;
        
        if ( values.length || ( _t && _t.id ) )
          destination[ operation ]( values, o )
        ;
        
        no_more && next && next();
      } // receiver()
      
      function get_options( count ) {
        transaction || ( transaction
          = transactions.get_transaction( count, { _t: options._t } )
        );
        
        o = transaction.next().get_emit_options();
      } // get_options()
    }, // Output.._transactional_fetch()
    
    /* ------------------------------------------------------------------------
        @method Output.._update_query( changes, destination )
        
        @short Update local query tree with changes for destination.
        
        @parameter changes (Array)
          - 0 (Array): query terms to remove from query tree
          - 1 (Array): query terms to add to query tree
        
        @returns changes (Array): unaltered changes parameter.
    */
    _update_query: function( changes, destination ) {
      var removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , tree    = this.tree
      ;
      
      removes.length && tree.remove( removes, destination );
      adds   .length && tree.add   ( adds   , destination );
      
      return changes;
    }, // Input.._update_query()
    
    /* ------------------------------------------------------------------------
       Output..emit( event_name, ... )
       
       Emits an event.
       
       A "complete" event is also emitted when emitted objects delimit the end
       of a transaction, or are not part of any transaction.
       
       Parameters:
         - event_name: (String) the name of the event
         - ...: other parameters to send to all listeners
       
       If the event_name is one of "add", "remove", "update", or "clear", the
       event is propagated to downstream pipelets. The full signature of emit
       for these events is:
         emit( 'add'   , added    , options )
         emit( 'remove', removed  , options )
         emit( 'update', updates  , options )
         emit( 'clear'            , options )
       
       Where:
       - added   (Array of Objects): array of values to add
       - removed (Array of Objects): array of values to remove
       - updated (Array of Arrays of two Objects): array of updates
       - options (Object): optional, the following attributes are processed:
         - _t: a transaction object
       
       All other events, including "complete", are not propagated to
       downstream pipelets and can be listened directly on the pipelet using
       on().
    */
    emit: function( event_name, values, options ) {
      var fork_tag = this.pipelet._fork_tag;
      
      if ( fork_tag ) options = Options.add_fork_tag( options, fork_tag );
      
      var _t, more;
      
      if ( options && ( _t = options._t ) ) {
        more = _t.more;
      }
      
      de&&ug(
          this._get_name( 'emit' )
        +   'event_name: ' + event_name
        + ', values: '     + ( values && values.length )
        + ', options:'     , options
      );
      
      if ( more
        && values // not clear
        && !values.length
      ) {
        // There is more to come, but nothing to actually send, we'll wait for follow-up data
        return this;
      }
      
      // !! emit even if values.length == 0 to transmit no-more and fork tags to downstream pipelets
      this.destinations.length && this._route( event_name, values, _t, options );
      
      this._emit_event( event_name, [ values, options ] );
      
      more || this._emit_event( 'complete', [ options ] );
      
      return this;
    }, // Output..emit()
    
    /* ------------------------------------------------------------------------
       Output.._route( event_name, values, _t, options )
       
       Route an event to downstream pipelets using output query tree router.
       
       Properly terminates transactions emitting to downstream pipelet the
       minimum number of operations, and synchronizing transactions in
       coordination with downstream pipelets.
       
       Parameters:
       - event_name: (String) the name of the event (add, remove, update,
         clear)
         
       - values (optional Array of Object)
       
       - _t (optional transaction Object): from options
       
       - options (optional options Object)
       
       ToDo: add transactions tests for _route()
    */
    _route: function( operation, values, _t, options ) {
      var name                   = de && this._get_name( '_route' )
        , transactions           = this.transactions
        , end_of_transaction
        , terminated_inputs
        , subscribers_operations
      ;
      
      _t
        && ( end_of_transaction = ! _t.more )
        && _t.forks
        && ( terminated_inputs = [] ) // will collect terminated inputs
      ;
      
      if ( operation == 'clear' || values.length ) { // tree.route() returns no subscribers_operations when no values
        subscribers_operations = this.tree.route( operation, values ); // ToDo: tree.route(): do not emit empty operations
        
        /* subscribers_operations: (Array of Arrays), operations:
           - 0: (String) operation 'add', 'remove', 'update', or 'clear'
           - 1: (Array of Objects), for each subscriber input:
             - input: (Input) destination of this subscriber
             - v: (optional Array of Objects) values to emit for 'add', 'remove', and 'update'
             - t: (optional Object) transaction information:
               - count: (Integer, 2 or 3) number of operations in an update transaction for this destination
        */
        if ( subscribers_operations.length ) {
          de&&ug( name + 'subscribers_operations count:', subscribers_operations.length );
          
          // Emit accumulated values to subscribers
          subscribers_operations.forEach( emit_subscribers_operation );
        } // subscribers_operations.length
      }
      
      if ( end_of_transaction ) {
        /*
          This transaction terminates, we need to notify downstream pipelets of this termination
          
          If there is a fork tag, terminated_inputs is defined, and all downstream pipelets must
          be notified unless they have already been notified above.
          
          Otherwise (if no fork tag is in _t), only notify downstream pipelets which have
          already received something from this transaction and are therefore waiting for the
          end of the transaction.
        */
        
        if ( terminated_inputs ) {
          // There are fork tags, we need to make sure that all downstream destinations are notified
          // of the end of this transaction from this branch.
          
          var subscribers = this
            .tree
            
            .get_all_subscribers()
            
            .filter( function( subscriber ) {
              // Only notify inputs which are not already terminated
              var r = terminated_inputs.indexOf( subscriber.input ) === -1;
              
              if ( r ) subscriber.v = [];
              
              return r;
            } )
          ;
          
          subscribers.length && emit_subscribers_operation( [ 'add', subscribers ] );
          
        } else if ( transactions.count ) {
          // There are ongoing output transactions
          
          // This transaction is terminated here
          // Notify all inputs associated with an Output_Transaction for this transaction
          transactions
            .terminate( _t )
            
            .forEach( function( destination ) {
              var _t    = destination._t
                , input = destination.input
              ;
              
              de&&ug( name + 'terminated transaction, input:', input._get_name(), ', _t:', _t );
              
              // Do not emit if more is expected
              _t.more || input.add( [], { _t: _t } )
            } )
          ;
        }
      } // if end of transaction
      
      return this;
      
      /* ------------------------------------------------------------------------------------------
         emit_subscribers_operation( subscribers_operation )
         
         Parameters:
         - subscribers_operation (Array):
           - 0: (String) operation 'add', 'remove', 'update', or 'clear'
           - 1: (Array of Objects), for each subscriber input:
             - input: (Input) destination of this subscriber
             - v: (optional Array of Objects) values to emit for 'add', 'remove', and 'update'
             - t: (optional Object) transaction information:
               - count: (Integer, 2 or 3) number of operations in an update transaction for this
               destination
      */
      function emit_subscribers_operation( subscribers_operation ) {
        var operation   = subscribers_operation[ 0 ]
          , subscribers = subscribers_operation[ 1 ]
          , i = -1
          , r
          , input
          , t, o
          , no_more
        ;
        
        de&&ug( name + 'subscribers:', subscribers.length );
        
        // Emit all subscribers' values
        while ( r = subscribers[ ++i ] ) {
          if ( t = r.t ) {
            // This is an update split into t.count (2 or 3) operations
            // ToDo: add tests
            
            // Get or initiate the transaction then get emit options
            o = ( t.t || ( t.t = new Transaction( t.count, options ) ) )
              .next()
              .get_emit_options()
            ;
            
            --t.count || t.t.end(); // done with this transaction
          } else {
            o = options;
          }
          
          input = r.input;
          
          if ( o && o._t ) {
            /* There may be concurrent transactions at that input
               that need to be synchronized so that each transaction
               terminates once and only once at this destination input
               Also allows to keep track of inputs which receive data with 'more'
               Allowing to terminate these when the transaction ends
            */
            o = transactions.get_options( input, input.transactions, o );
            
            no_more = ! o._t.more;
          } else {
            no_more = true;
          }
                    
          de&&ug( name + 'emitting to input: ' + input._get_name() + ', options:', o );
          
          if ( operation == 'clear' ) {
            input.clear( o );
          } else if ( r.v.length || no_more ) {
            // There is something to emit or the end of transaction needs to be notified
            input[ operation ]( r.v, o );
          }
          
          terminated_inputs && terminated_inputs.push( input );
        } // for all subscribers
      } // emit_subscribers_operation()
    }, // Output.._route()
    
    // ToDo: implement flow control methods _pause_destination() and _resume_destination()
    _pause_destination: function( destination ) {
      return this;
    },
    
    _resume_destination: function( destination ) {
      return this;
    },
    
    /* ------------------------------------------------------------------------
       Output..on_change( listener, that, once )
       
       listens to events 'add', 'remove', 'update', and 'clear' simultaneously.
       
         The event listener is then called with the following signatures:
           listener( 'add'   , values , options )
           listener( 'remove', values , options )
           listener( 'update', updates, options )
           listener( 'clear' , void 0 , options )
         
       on_complete( listener, that, once )
       
         'complete' event signature is:
           listener( options )
               
       Parameters:
         - event_name: (String) the name of the event.
             
         - listener: (Function) will be called with the parameters emitted by
             the event emitter.
           
         - that: (Object) optional, the context to call the listener, if not
             specified the context is this event emitter's instance.
           
         - once: (Boolean) optional, if true, the event listener will be
             removed right before the first __emit on this event.
    */
    on_change: function( listener, that, once ) {
      this.on( 'add'   , function( v, o ) { listener.call( this, "add"   , v, o ) }, that, once );
      this.on( 'remove', function( v, o ) { listener.call( this, "remove", v, o ) }, that, once );
      this.on( 'update', function( v, o ) { listener.call( this, "update", v, o ) }, that, once );
      this.on( 'clear' , function( v, o ) { listener.call( this, "clear" , v, o ) }, that, once );
      
      return this;
    }, // Output..on_change()
    
    on_complete: function( listener, that, once ) {
      return this.on( 'complete', listener, that, once );
    } // Output..on_complete()
  } ); // Output plug instance methods
  
  /* -------------------------------------------------------------------------------------------
     Pipelet( options )
     
     A Pipelet processes one upstream source dataflow and provides one downstream dataflow.
     
     Parameters:
     - options: (Object) optional parameters, some default options are set by Build() and
       set_default_options():
       - name          (String): debugging name for this pipelet
       - key (Array of Strings): attribute names carrying values identity
       - fork_tag      (String): output transactions tag for transactions that will be forked
                                 to multiple branches and will need recombining for
                                 synchronization
       - tag           (String): input tag to synchronize incoming forked transactions from
                                 multiple branches
     
     This is the base class of all Pipelets, providing the low-level dataflow service for Toubkal
     applications.
  */
  function Pipelet( options ) {
    var that = this
      , name
      , input
      , output
    ;
    
    options = that._options = options || {};
    
    name = options.name;
    
    Loggable.call( that, name );
    
    // scope for singletons, multitons, outputs
    that._scope = null;
    
    // inputs in addition to that._input
    that._inputs = that._inputs || [];
    
    // !! Always initialize _input and _output first, in all derived classes before calling that constructor
    input  = that._input  || ( that._input  = new Pipelet.Input ( that, name, options.tag ) );
    output = that._output || ( that._output = new Pipelet.Output( that, name ) );
    
    // Set that._output.source if not already set
    output.source = output.source || input;
    
    // Ongoing transactions
    that._transactions = new Transactions();
    
    // Objects' key
    that._key = options.key;
    
    // Output transactions fork tag to add to all emitted operations if defined
    that._fork_tag = options.fork_tag;
  } // Pipelet()
  
  // Input and Output plug classes
  Pipelet.Input  = Input;
  Pipelet.Output = Output;
  
  Loggable.subclass( 'Pipelet', Pipelet, {
    /* ------------------------------------------------------------------------
        @method Pipelet.._add_input( output, Input, name, methods )
        
        @short Instanciate additional Input and connect it to output.
        
        @description:
          Pipelet must already have a main input to share input transactions
          with.
          
          Use a unique tag to synchronize transactions on all inputs.
        
        @parameters:
        - output: (Pipelet, Output or Array of Objects), source dataflow, or
          static data.
          
        - Input (Input Class): the Input class to instanciate to create
          returned input.
          
        - name       (String): Loggable name of input instance.
        
        - methods    (Object): implementing operations _add(), _remove, _update(), _clear().
        
        @returns Input instance
    */
    _add_input: function( output, Input, name, methods ) {
      var that  = this
        , input = new Input( methods, name, that._options.tag, that._input_transactions )
            .add_source( output._output || output )
      ;
      
      that._inputs.push( input );
      
      return input;
    }, // Pipelet.._add_input()
    
    /* ------------------------------------------------------------------------
       Pipelet.._error( method, message )
       
       ToDo: rename __error()
       
       Reports errors to global error dataflow then throws.
       
       Parameters:
         - method (String): the name of the method where the error occurred
         
         - message: an error message
    */
    _error: function( method, message ) {
      message = this._get_name( method ) + message;
      
      // ToDo: report error to global error dataflow or error output
      
      throw new Error( message );
    }, // Pipelet.._error()
    
    /* ------------------------------------------------------------------------
       ToDo: rename Pipelet..make_key() into _make_key()
       
       make_key( value )
       
       Use this._key to generate code JIT to return a unique a string for an
       value based on the key coordinates concatenation separated with '#'.
       
       To regenerate code if this._key has changed, do:
         Pipelet.prototype.make_key.call( this, object )
       
       @parameter value (Object): value which key is requested.
    */
    make_key: function( object ) {
      return ( this.make_key
        = new Function( 'o', "return " + this._key
            
            .map( function( attribute ) {
              return 'o.' + attribute
            } )
            
            .join( "+'#'+" )
          )
      )( object );
    }, // make_key()
    
    /* ------------------------------------------------------------------------
       __transform( values, options, caller )
       
       Transforms an array of values into an other array of values according
       to the current pipelet role.
       
       Default is to return all values unaltered. Every pipelet should either
       implement __transform() if it is stateless or _fetch() if it is stateful
       and/or implement _add(), _remove(), and _update().
       
       Parameters:
         - values : (Array) values to transform
         - options: (Object) from _add / _remove / _update
         - caller : (String) the name of the function that called __transform.
             current values are 'fetch', 'add', and 'remove'. Update calls the
             __transform twice, first as 'remove', then as 'add'.
    */
    __transform: function( values ) {
      return values;
    }, // __transform()
    
    /* ------------------------------------------------------------------------
       _transaction( count, options, f )
       
       Executes a number of operations in a transaction for this pipelet then
       ends this transaction.
       
       Parameters:
         - count (Integer): number of operations in this transaction
         
         - options (Object): transaction options (more and transaction_id) from
             upstream pipelet or embedding transaction of this pipelet
             
         - f (Function): transaction processor, signature:
             f( transaction, count ):
               - this (Pipelet)            : context is this pipelet
               - transaction (Transaction) : to __emit operations to
               - count (Integer)           : number of operations
    */
    _transaction: function( count, options, f ) {
      var transactions = this._transactions;
      
      de&&ug( this._get_name( '_transaction' ) + 'count: ' + count + ', options:', options );
      
      var t = transactions.get_transaction( count, options, this._output, this._fork_tag );
      
      f.call( this, t, count )
      
      transactions.end_transaction( t );
      
      return this;
    }, // _transaction()
    
    /* ------------------------------------------------------------------------
       _notify( transaction [, options ] )
       
       Executes a transaction, eventually atomically (everything succeeds or
       everything fails).
       
       ToDo: revert failed operations in the transaction
       
       Parameters:
         - transaction: Array of actions. Each action has attributes:
           - action: string 'add', or 'remove', or 'update'
           - objects: Array of values for 'add' and 'remove' or updates. An
             update is an Array where the first item is the previous value and
             the second item is the new value

         - options: optional object of optional attributes
    */
    _notify: function( transaction, options ) {
      return this._transaction( transaction.length, options, function( t, l ) {
        for ( var i = -1, a; ++i < l; ) {
          a = transaction[ i ];
          
          this[ '_' + a.action ]( a.objects, t.next().get_emit_options() ); // ToDo: should be using get_options()
        }
      } );
    }, // _notify()
    
    /* ------------------------------------------------------------------------
       _add( added [, options ] )
       
       Add values to this pipelet then _notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly
       by users.
       
       This method is often overloaded by derived classes, the default
       behavior is to _notify downstream pipelets using __emit_add() of
       transformed objects by __transform().
       
       Parameters:
         added (Array of Objects): values to add
         
         options (Object): optional object for options
    */
    _add: function( added, options ) {
      return this.__emit_add( this.__transform( added, options, 'add' ), options );
    }, // _add()
    
    /* ------------------------------------------------------------------------
       __emit_add( added [, options ] )
       
       Notify downstream pipelets about added values.
       
       This method is typically called by add() after adding objects.
       
       Users should not call this method directly.
       
       Parameters:
         added: Array of added objects
         
         options: optional object
    */
    __emit_add: function( added, options ) {
      return this.__emit( 'add', added, options );
    }, // __emit_add()
    
    /* ------------------------------------------------------------------------
       _remove( removed [, options ] )
       
       Removes values from this pipelet then _notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is often overloaded by derived classes, the default
       behavior is to _notify downstream pipelets using __emit_remove() of
       transformed objects by __transform().
       
       Parameters:
         removed (Array of Objects): values to remove
         
         options (Optional Object): options
    */
    _remove: function( removed, options ) {
      return this.__emit_remove( this.__transform( removed, options, 'remove' ), options );
    }, // _remove()
    
    /* ------------------------------------------------------------------------
       __emit_remove( removed [, options ] )
       
       Notify downstream pipelets of removed object.
       
       This method is typically called by remove() after removing objects.
       
       Users should not call this method directly.
       
       Parameters:
         - removed (Array of Objects): removed values.
         
         - option (Optional Object)
    */
    __emit_remove: function( removed, options ) {
      return this.__emit( 'remove', removed, options );
    }, // __emit_remove()
    
    /* ------------------------------------------------------------------------
       _update( updated [, options ] )
       
       Updates objects from this pipelet then _notify downstream pipelets.
       
       This method should only be called by this pipelet source.
       
       Unless 'this' has no source, _update() should not be called directly.
       
       This method can be overloaded by derived classes, typically for
       performance reasons.
       
       This default version is meant to be semantically correct for all
       pipelets. Each update is executed in the order of appearance, as
       a _remove() followed by an _add() the whole _update is encapsulated
       in a transaction.
       
       Downstream pipelets will therefore not see updates but removes and adds
       in a transaction. 
       
       Parameters:
         updates: Array of updates, each update is an Array of two objects:
           - the first is the previous object value (to be removed),
           - the second is the updated object value (to be added).
         
         option: optional object
    */
    _update: function( _updates, options ) {
      var _l = _updates.length;
      
      de&&ug( this._get_name( '_update' ) + 'updates: ' + _l );
      
      // ToDo: add test for nested transactions
      return this._transaction( _l ? 2: 0, options, function( t ) {
        var updates = _updates, l = _l
          , i = -1, update
          , options = t.next().get_emit_options() // ToDo: find a way to use get_options() instead of get_emit_options()
        ;
        
        if ( --l ) {
          // there is more than one update
          for( l -= 1; i < l; ) {
            update = updates[ ++i ];
            
            this._remove( [ update[ 0 ] ], options );
            this._add   ( [ update[ 1 ] ], options );
          }
        }
        
        // last (or only) update
        update = updates[ ++i ];
        
        this._remove( [ update[ 0 ] ], options );
        this._add   ( [ update[ 1 ] ], t.next().get_emit_options() );
      } );
    }, // _update()
    
    /* ------------------------------------------------------------------------
       __emit_update( updated [, options ] )
        
       Notify downstream pipelets of updated object values.
       
       This method is typically called by _update() after updating objects.
       
       Users should not call this method directly.
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         option: optional object
    */
    __emit_update: function( updated, options ) {
      return this.__emit( 'update', updated, options );
    }, // __emit_update()
    
    /* ------------------------------------------------------------------------
       _clear( [ options ] )
       
       Clears the content of this Pipelet and downstream pipelets.
       
       _clear() may be called when an update requires to clear the state of
       all downstream objects. This may be necessary when:
         - The state is no longer needed and memory can be reclaimed
         - All or most values will change and it is more efficient to clear
         - The state of downstream objects cannot be updated incrementally
       
       Parameters:
         option: optional object
    */
    _clear: function( options ){
      return this.__emit_clear( options );
    }, // _clear()
    
    /* ------------------------------------------------------------------------
       __emit_clear( [ options ] )
       
       Notify downstream pipelets that all object values should be cleared.
       
       This method is typically called by _clear() for clearing downstream objects.
       
       Users should not call this method directly.

       Parameters:
         option: optional object
    */
    __emit_clear: function( options ) {
      return this.__emit( 'clear', null, options );
    }, // __emit_clear()
    
    /* ------------------------------------------------------------------------
       __emit_operations( added, removed, updates [, options ] )
       
       Emits a number of operations ( add / remove / update ) as a transaction.
       
       Parameters:
         - added: (Array) of added values. Can be undefined to specify that
           there is nothing to add.
         
         - removed: (Array) of removed values. Can be undefined to specify that
           this is nothing to remove.
         
         - updates: (Array) of updated values. Can be undefined to specify that
           this is nothing to update.
         
         - options: (Object) additional options to send to downstream pipelets:
           - _t (optional Object): a transaction
       
       If options specify a transaction with a fork, at least one empty add
       operation is emitted, to indicate that this branch has completed
       although it had nothing to update.
       
       ToDo: tests for __emit_operations()
    */
    __emit_operations: function( added, removed, updates, options ) {
      var operations = [], _t;
      
      removed && removed.length && operations.push( 'remove' );
      updates && updates.length && operations.push( 'update' );
      added   && added  .length && operations.push( 'add'    );
      
      var l = operations.length, that = this;
      
      if ( l ) {
        if ( l > 1 ) {
          // There is more than one operation
          this._transaction( l, options, function( t, l ) {
            for ( var i = -1; ++i < l; ) __emit( i, t.next().get_emit_options() );
          } );
        } else {
          // only 1 update using upstream options
          __emit( 0, options );
        }
      } else if ( options && ( _t = options._t ) && ! _t.more ) {
        // If there this is the end of the transaction
        // We need to forward at least one operation downstream
        that.__emit_add( [], options );
      }
      
      return this;
      
      function __emit( i, options ) {
        // Note: use __emit_xxx() and not __emit( 'xxx' ) to allow derived classes
        // to overload __emit_xxx() individually.
        // ToDo: consider removing this limitation before version 1.0 to only allow __emit() to be overloaded
        switch( operations[ i ] ) {
          case 'add'   : return that.__emit_add   ( added  , options ); 
          case 'remove': return that.__emit_remove( removed, options );
          case 'update': return that.__emit_update( updates, options );
        }
      } // __emit()
    }, // __emit_operations()
    
    // Shortcut methods to default input and output
    __emit: function( event_name, values, options ) {
      this._output.emit( event_name, values, options );
      
      return this;
    }, // __emit()
    
    _on: function( event_name, listener, that, once ) {
      this._output.on( event_name, listener, that, once );
      
      return this;
    }, // _on()
    
    /* ------------------------------------------------------------------------
        _add_source( source, options, then )
    */
    _add_source: function( s, options, then ) {
      this._input.add_source( s._output || s, options, then );
      
      return this;
    }, // _add_source()
    
    /* ------------------------------------------------------------------------
        _remove_source( source, options, then )
    */
    _remove_source: function( s, options, then ) {
      this._input.remove_source( s._output || s, options, then );
      
      return this;
    }, // _remove_source()
    
    /* ------------------------------------------------------------------------
        _add_destination( destination, options, then )
    */
    _add_destination: function( d, options, then ) {
      this._output.add_destination( d._input || d, options, then );
      
      return this;
    }, // _add_destination()
    
    /* ------------------------------------------------------------------------
        _remove_destination( destination, options, then )
    */
    _remove_destination: function( d, options, then ) {
      this._output.remove_destination( d._input || d, options, then );
      
      return this;
    }, // _remove_destination()
    
    _fetch_all: function( receiver, query ) {
      // fetch_all does not return this._output but fetched results synchronously
      return this._output.fetch_all( receiver, query );
    }, // _fetch_all()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..through( pipelet, options, then )
        
        @short Get source dataflow through another @@pipelet.
        
        @description:
        Adding pipelet's input as a destination to current pipelet.
        
        Warning: pipelet must not be the end of a dataflow @@pipeline, it must
        be a single pipelet, otherwise the last pipelet of the pipeline will be
        added which is most likely not desired - e.g. in the following dataflow
        pipeline, the last pipelet is set_flow( 'users' ), it's input is that
        of set_flow(), not set():
        
          ```javascript
          rs
            .set( [] )
            .set_flow( 'users' )
          ;
          ```
        To encapsulate a pipeline into a single pipelet, use @@encapsulate().
        
        @parameters:
        - pipelet (Pipelet): a pipelet instance to insert in current dataflow.
        
        - options (Object): optional transactional options:
          - _t (Object): a transaction object
          - no_fetch (Boolean): if true, prevents fetching while connecting.
        
        - then (Function): optional callback after fetching and updating
          source subscription.
        
        @example:
        Dispatch Socket.io clients to provide them access to a database()
        @@singleton:
        
        ```javascript
        rs
          .database()
          
          .dispatch( rs.socket_io_clients(), function( source, options ) {
            var client = this.socket;
            
            return source
              .through( client, options )
            ;
          } )
          
          .database()
        ;
        ```
        
        @manual reference
        
        @api beta
    */
    through: function through( pipelet, options, then ) {
      pipelet._input.add_source( this._output, options, then );
      
      return pipelet;
    }, // through()
    
    /* ---------------------------------------------------------------------------------------------
        @term pipeline
        
        @short A JavaScript expression assembling @@pipelets.
        
        @description:
          A pipeline is a JavaScript expression starting with a @@namespace, typically "rs",
          followed by pipelet factory calls.
          
          Executing a pipeline instanciates pipelets that stay connected and process dataflows until
          either the end of the process or the explicit tear-down of the pipeline in whole or in
          parts.
          
          A Toubkal program is composed of one or more pipelines.
          
          The first pipelet of a pipeline provides an upstream source dataflow to downstream
          destination pipelets.
          
          @example:
          
          ```javascript
            // Start with the root rs namespace
            rs
              // Call the socket_io_server() pipelet factory
              .socket_io_server()
              
              // Call the flow() pipelet factory
              .flow( 'sales' )
              
              // Call the $to_dom() pipelet factory
              .$to_dom( '#sales' )
            ;
          ```
    */
    
    /* ---------------------------------------------------------------------------------------------
        @term namespace
        
        @short A repository for @@pipelets, @@singletons, @@multitons, and @@outputs names.
        
        @description:
          A namespace such as @@rs, the root namespace, allows to start a @@pipeline.
          
          A namespace can have children namespaces which can access its names, but are isolated
          from each other in scope-tree fashion.
          
          To create a child namespace use the @@Pipelet..create_namespace() method.
          
          All @@pipelet instances are associated with a namespace. To retrieve this namespace
          use the @@Pipelet..namespace() method.
          
          To set the namespace at a pipelet instance in a pipeline, use the
          @@Pipelet..set_namespace() method.
          
          To debug issues with namespaces use @@Pipelet..log_namespace( name )
    */
    
    /* ---------------------------------------------------------------------------------------------
        @method Pipelet..set_namespace( pipelet )
        
        @short Set the @@namespace of current pipelet instance with that of pipelet
        
        @description:
          Use pipelet's scope to replace the scope of the current pipelet.
          
          It must be used with care in situations where this pipelet is shared with other modules,
          only the last assigned scope will be in effect for all modules using this pipelet.
          
          If multiple modules share the same pipelet, and a module operates under a specific
          @@namespase
        
        @parameters:
        - pipelet (Pipelet): use pipelet's scope to set current scope
        
        @returns (Pipelet): current pipelet instance
        
        @throws if pipelet does not have a namespace
        
        @manual reference
        
        @api alpha
    */
    set_namespace: function( pipelet ) {
      return ( this[ _scope ] = assert_scope( pipelet )[ _scope ] )[ _mixin ]( this );
    }, // set_namespace()
    
    /* ---------------------------------------------------------------------------------------------
        @method Pipelet..namespace()
        
        @short Get the @@namespace of current pipelet
        
        @description:
          Typically used to get the namespace of a source pipelet in a @composition:
          
          ```javascript
            rs.Singleton( 'users', function user_composition( source, options ) {
              var rs = source.namespace();
              
              return rs
                .set( [ { path: 'users.json' } ] )
                .watch( { name: options.name } )
              ;
            } )
          ```
        
        @returns (Namespace): the namespace of this pipelet
        
        @throws if this pipelet does not have a namespace
        
        @manual reference
        
        @api alpha
    */
    namespace: function() {
      return assert_scope( this )[ _scope ][ _namespace ];
    }, // namespace()
    
    /* ---------------------------------------------------------------------------------------------
        @method Pipelet..log_namespace( name )
        
        @short log current @@namespace pipelet factories and instances
        
        @description:
          Helps debug namespace issues by displaying the current namespace' state.
          
          Shows for each registered pipelet factory if it is mixed-in or not (i.e. callable) at this
          point in the @@pipeline, and which @@singleton, @@multiton, or @@output instances are in
          its scope.
          
          It does not show parent namespaces' factories or instances.
          
        @parameter name (String): a debugging name string to help locate trace in log
    */
    log_namespace: function( name ) {
      var that = this
        , namespace = that.namespace()
        , factories = Object.keys( namespace.constructor.prototype )
        , factories_status = {}
        , factory
        , i = -1
      ;
      
      while ( factory = factories[ ++i ] )
        if ( factory != 'constructor' )
          factories_status[ factory ] = !!that[ factory ]
      
      de&&ug( namespace._get_name() + ', ' + name
        + ', factories:', factories_status
        , ', instances:', Object.keys( namespace[ _scope ] ).filter( function( factory ) { return factory.charAt( 0 ) != '_' } )
      );
      
      return that;
    }, // log_namespace()
    
    /* ---------------------------------------------------------------------------------------------
        @method Pipelet..create_namespace( name, is_repository )
        
        @short Create a child @namespace from current pipelet's namespace
        
        @description:
          Provide a child namespace for @@singleton, @@multiton, and @@outputs instances.
          
          If the created namespace is also a repository, Compositions and Pipelets registered in
          this namespace are only accessible from this namespace.
          
          Child namespaces inherit instances and factories from all their ascendents.
        
        @example:
          ```javascript
            
            rs = rs
              // Create child namespace as a repository for pipelets and compositions
              .create_namespace( 'example', true );
            ;
            
            rs
              // Compositions are defined in the "example" namespace' repository
              .Compose( 'read', function( source, options ) {} )
              
              .set() // from root rs namespace, accessible from all namespaces
              
              .read() // accessible only from the "example" namespace
            ;
          ```
        
        @parameters:
        - name (String): created namespace @loggable name
        - is_repository (Boolean): true to make this namespace a repository for compositions and
          pipelets explicitly registered in this namespace.
        
        @returns (Namespace): the new child namespace of this pipelet
        
        @throws if this pipelet does not have a namespace
        
        @manual reference
        
        @api alpha
    */
    create_namespace: function( name, is_repository ) {
      return create_namespace( assert_scope( this ), name, is_repository );
    }, // create_namespace()
    
    /* ---------------------------------------------------------------------------------------------
        @method Pipelet..Compose( name [, options], composition )
        
        @short Builds a pipelet from one or more pipelets in order to provide a reusable component.
        
        @parameters:
        - name (String): the name of the pipelet
        
        - options (optional Object): define optional attributes:
          - union (Boolean): if true the composition is encapsulated with a union input so
            that the composition is a single pipelet to which additional inputs may be
            added. See multi-pipelet compositions bellow for details.
            
          - singleton (Boolean): if true, this composition has at most one instance.
            it will be instanciated once, at the first invocation. Subsequent invocations
            will reuse the singleton instance and parameters will be ignored.
          
          - multiton (Function): this composition has less instances than invocations.
            For each invocation multiton() is called with the same parameters as composition()
            without the source pipelet as first parameter; multiton() should return a unique
            index string for each singleton of the multiton.
            
            If this is the first time that this index is returned, composition() is
            instantiated. Subsequent invocations returning the same index reuse the instance
            returned by the first instantiation of composition().
        
        - composition (Function): this is the constructor for the composed pipelet that must
          return a Pipelet instance instead of this.
          
          Composition is called with the following parameters:
          - source (Pipelet): the input Pipelet instance, which also comes with a @@namespace.
            This namespace must be the namespace of the returned pipelet. If @@rs is used in
            the composition it must be declared the following way to be the namespace of
            source:
            
            ```javascript
              var rs = source.namespace();
            ```
          
          - parameters: 0 to n parameters of the pipelet.
          
          - options (Object): coming from the pipelet options augmented with default
            options, see important warning bellow!
          
          Composition must return a pipelet with the same namespace as source.
        
        @returns:
        - (Pipelet): this (Current pipelet instance), allowing to:
          - chain multiple Compose() definitions
          - use the composed pipelet immediately
          - chain other pipelets after Compose()
        
        @description:
        !!! Important Warning regarding composition's "options" parameter:
        -----------------------------------------------------------------
          The composition MUST define an "option" parameter, otherwise difficult-to-debug
          exceptions will occur such as '... has no method ...'.
          
          Because minification can optimize the options parameter out, programmers MUST use the
          options parameter in at least one function call, typically to pass the options to another
          pipelet.
          
          The example bellow will not have this issue because the options parameter is used in the
          filter() and aggregate() pipelets.
          
          We highly recommend testing all code minified to prevent this kind of surprise in
          production.
          
        Multi-pipelet compositions:
        --------------------------
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
          
          To prevent this issue, the composition is encapsulated into a single pipelet using
          a union() input and encapsulate() unless option "single" is true.
          
          If option single is set to true, it is assumed that the composition is made of a
          single pipelet or that actual usage prevents the above issue.
          
          Also note that using through() will also connect to the input of the last pipelet
          of the composition.
        
        @examples:
        
        - Compose a filter with an aggregate:
          1) Create the composition constructor using source as the first mandatory parameter and
          options as the last that can be shared between all pipelets of the composition:
          
          ```javascript
            function aggregate_from( source, from, measures, dimensions, options ) {
              return source
                .filter   ( from, options )
                .aggregate( measures, dimensions, options )
              ;
            }
          ```
          
          2) Build the pipelet, providing its name and @@composition:
          
          ```javascript
            rs.Compose( 'aggregate_from', aggregate_from );
          ```
          
          3) Use composed aggregate_from() to aggregate sales yearly from USA:
          
          ```javascript
            rs.flow( 'sales' )
              .aggregate_from( [{ country: 'USA'}], [{ id: 'sales'}], [{ id: 'year'}] )
            ;
          ```
        
        @manual reference
        
        @api beta
    */
    Compose: function _Compose( name, options, composition ) {
      if ( typeof options == 'function' ) {
        composition = options;
        options = {};
      }
      
      typeof composition == 'function' && composition.length > 1
        || fatal( 'Composition must be a function with at least two parameters: a source and options' )
      ;
      
      var factory = Pipelet.Add( name, instanciate, this.namespace() );
      
      if ( options.multiton ) {
        factory.multiton( options.multiton );
      } else if ( options.singleton ) {
        factory.singleton();
      }
      
      return this.set_namespace( this ); // namespace has changed, may need to mixin new compositon factory in
      
      function instanciate( source, a ) {
        if ( options.union ) {
          // Adding a union requires encapsulating to allow adding more sources
          // Encapsulating is useless unless the input is a union to allow adding more sources
          // Therefore encapsulating with a union input should always be the case, when adding more sources is required
          var input = source.namespace()
            
            .union( [], { name: options.name + ' input union' } )
          ;
          
          return assert_scope( source
            .encapsulate( input, compose( input ) )
          );
        } else {
          return compose( source );
        }
        
        function compose( input ) {
          a.unshift( input ); // add source pipelet as first parameter
          
          Pipelet.set_default_options( composition, source, a, { name: name } );
          
          return new_apply( composition, a );
        } // compose()
      } // instanciate()
      
      function fatal( message ) {
        throw new Error( 'Compose "' + name + '", Error: ' + message );
      } // fatal()
    }, // Compose()
    
    /* ---------------------------------------------------------------------------------------------
        Singleton( name, composition )
        
        Compose a singleton pipelet from one or more pipelets in order to provide a reusable
        component.
        
        See Compose() for behavior with options "union" and "singleton" set to true.
    */
    Singleton: function singleton( name, composition ) {
      return this.Compose( name, { union: true, singleton: true }, composition );
    }, // Singleton()
    
    /* ---------------------------------------------------------------------------------------------
        Multiton( name, multiton, composition )
        
        Compose a multiton pipelet from one or more pipelets in order to provide a reusable
        component.
        
        See Compose() for behavior with options "union" and "singleton" set to true.
    */
    Multiton: function multiton( name, multiton, composition ) {
      return this.Compose( name, { union: true, 'multiton': multiton }, composition );
    }, // Multiton()
    
    /* ---------------------------------------------------------------------------------------------
        set_output( output_name [, scope] )
        output( output_name [, scope] )
        
        Set or retrieve an output pipelet reference by name.
        
        Use set_output() to set a reference for the current pipelet output that can be retrieved
        with output().
        
        Unless a scope is provided, output references are global, shared throughout the entire
        process. As such they can be used to share outputs between modules of the application.
        
        To avoid collisions, it is advised to either use a scope object or prefix output names with
        the name of the module where they are defined.
        
        Parameters:
        - output_name (String): a unique output name throughout the scope or application.
        - scope (Object): optional scope storing output references, default is a global scope.
        
        Returns (Pipelet):
        - set_output(): this, allowing to connect a downstream pipelet immediately.
        - output()    : reference to output pipelet set by set_output().
        
        Exceptions:
        - set_output(): when attenting to set an output name more than once in the same scope
        - output(): when a name is not found in the scope of output names set by set_output()
        
        Examples:
        - Setting an output:
        
          rs
            .set( [] )
            .set_output( 'my set' )
            .alter( function() {} )
          ;
          
        - Recalling the output:
          
          rs
            .output( 'my set' )
            .trace( 'my set' )
            .greedy()
          ;
          
        - Using a scope Object:
          var scope = {};
          
          rs
            .set( [] )
            .set_output( 'my set', scope )
            .alter( function() {} )
            .output( 'my set', scope )
            .trace( 'my set' )
            .greedy()
          ;
          
        
    */
    set_output: function set_output( output_name, scope ) {
      scope = scope || this[ _scope ];
      
      scope[ output_name ]
        && this._error( 'set_output', 'already set, name: ' + output_name )
      ;
      
      return scope[ output_name ] = this;
    }, // set_output()
    
    output: function output( output_name, scope ) {
      return ( scope || this[ _scope ] )[ output_name ]
        || this._error( 'output', 'not set, name: ' + output_name )
      ;
    }, // output()
    
    // Global RS object, the dictionary of all Toubkal Pipelet Programmer classes
    RS: RS
  } ); // Pipelet instance methods
  
  /* -------------------------------------------------------------------------------------------
      @function assert_scope( output )
      
      @short Asserts if output has a non-null _scope attribute
      
      @parameters:
      - output (Pipelet): the output expected to have a non-null _scope attribute
      
      @throws if output does not have a non-null _scope attribute
      
      @manual internal
  */
  function assert_scope( output ) {
    if ( output[ _scope ] ) return output;
    
    throw new Error( 'no scope, output: ' + ( output._get_name && output._get_name() ) );
  } // assert_scope()
  
  /* -------------------------------------------------------------------------------------------
      @function create_namespace( pipelet, name, is_repository ) -> Namespace
      
      @short Create a child @@namespace from pipelet's namespace
      
      @description:
        Create a children Namespace class, deriving from Pipelet and returns a singleton
        namespace instance.
      
      @parameters:
      - pipelet (Pipelet): use pipelet's namespace as parent namespace, if null or undefined,
        create root namespace @@rs.
      
      - name (String): used to compose a @@Loggable class name as 'Namespace.' + name
      
      - is_repository (Boolean):
        - false: compositions and pipelets are registered in the registry of parent namespace.
        - true: created namespace is used as a repository for compositions and pipelets explicitly built
          with this namespace.
      
      @manual internal
  */
  var constructor  = 'constructor'
    , prototype    = 'prototype'
    , _scope       = '_scope'
    , _namespace   = '_namespace'
    , _mixin       = '_mixin'
    , _add_factory = '_add_factory'
  ;
  
  function create_namespace( pipelet, name, is_repository ) {
    var parent_scope
      , parent_namespace = pipelet && ( parent_scope = pipelet[ _scope ] )[ _namespace ]
    ;
    
    Loggable.subclass.call( parent_namespace ? parent_namespace[ constructor ] : Pipelet, 'Namespace.' + name, Namespace );
    
    var namespace = new Namespace();
    
    de&&ug( 'create_namespace: ', Object.keys( namespace[ constructor ].class_names ) );
    
    return namespace;
    
    function Namespace() {
      var that   = this
        , scope  = that[ _scope ] = Object.create( parent_scope || null ) // add to scope to scope tree
        , Namespace_prototype = Namespace.prototype
      ;
      
      scope[ _namespace ] = that;
      scope[ _mixin     ] = mixin;
      
      // This is not a real pipelet, we're only interested the repository of all defined pipelets
      // in Pipelet.prototype and parents' Namespace.prototype
      Loggable.call( that, name );
      
      // This is a null source, see Input..add_source(), Input..remove_source()
      that._output = { pipelet: that, is_void: true },
      
      that[ _add_factory ] = add_factory;
      
      function add_factory( name, factory ) {
        de&&ug( that._get_name( _add_factory ), name );
        
        return is_repository
          ? Namespace_prototype[ name ] = factory : parent_namespace
          ? parent_namespace[ _add_factory ]( name, factory )
          : Pipelet.prototype[ name ] = factory
        ;
      } // add_factory()
      
      function mixin( pipelet ) {
        // scope is already set on pipelet
        if ( parent_namespace ) { // not rs, the root namespace, which is using Pipelet, and is always visible
          // Copy this namespace' factories into pipelet
          // Do not copy parent's factories, users' can do this by explicitly calling mixin() on parents
          for ( var p in Namespace_prototype ) {
            if ( p != 'constructor' && Namespace_prototype.hasOwnProperty( p ) ) {
              de&&ug( that._get_name( _mixin ) + 'property:', p );
              
              pipelet[ p ] = Namespace_prototype[ p ];
            }
          }
        }
        
        return pipelet;
      } // mixin()
    } // Namespace()
  } // create_namespace()
  
  /* -------------------------------------------------------------------------------------------
      @namespace rs
      
      @short Root @@Namespace for all @@pipelines.
      
      @description:
        The rs object is the mandatory root of all @@pipelines.
        
        It does not count as a source of the first @@pipelet in the pipeline to allow later
        assignement of a source using @@through() or as an @@output parameter to pipelets
        having more than one output.
      
      @examples:
      - Watch a file:
        
        ```javascript
          rs
            .set( [ { path: '' } ] )
            .watch()
          ;
        ```
      
      - Watch a file, same thing, using through() for deffered assignement of source.
      
        ```javascript
          // Create a watcher instance with no source
          var watcher = rs.watch();
          
          // 
          rs
            .set( [ { path: '' } ] )
            .through( watcher )
          ;
        ```
      
        
        The rs object acts as a namespace for Toubkal chainable pipelets. Without the
        rs object, one would have to write the following less fluid code where the
        rs namespace is not explicit and requiring the new operator on a class to
        create the fist pipelet of a chain:
        
        new File( 'sales' ).publish();
  */
  // ToDo: make rs a true namespace as a base class to pipelet
  var rs = create_namespace( null, 'root' );
  
  /* ===========================================================================================
      Pipelet Class attributes and methods
     =========================================================================================== */
  
  /* -------------------------------------------------------------------------------------------
      @class_method Pipelet.Build( name, constructor [, methods [, namespace ] ] )
      
      @short creates a new Pipelet class
      
      @description:
      Pipelet builder:
      - Makes constructor a subclass of This class using This.subclass()
      - Adds methods to constructor's prototype, if any
      - Adds pipelet into repository, either global of that of optional namespace
      
      @parameters:
      - name         : (String) the name of the pipelet
      
      - constructor  : (Function) a Pipelet constructor which signature is:
        - parameters : 0 to n required parameters either Pipelet instances or non-objects
          (numbers, strings, functions, booleans, null, undefined)
        
        - options    : (object) optional parameters, will extend default options
      
      - methods      : optional parameter
        - (Object)   : methods for the constructor's class
        - (Function) : returning a method Object, see Pipelet.subclass()
      
      - namespace (@@Namespace): optional namespace to add pipelet into.
      
      @returns added pipelet factory function with the following attribute:
      - singleton (Function () ->): modifier to make pipelet a singleton.
      - multiton (Function ( Function ) -> String): modifier to make pipelet
        a multiton.
      
      @example:
      A 'from_usa' pipelet that filters values which country attribute is 'USA'.
      
      ```javascript
        // Programmer:
          function From_USA( options ) {
            return Pipelet.call( this, options );
          }
          
          Pipelet.Build( "from_USA", From_USA,
            { __transform: function( values ) {
                var usa_values = [];
                
                for ( var i = 0; i < values.length; ) {
                  var v = values[ i++ ];
                  
                  if ( v.country === 'USA' ) usa_values.push( v );
                }
                
                return usa_values;
              }
            } // methods
          );
          
        // Architect Usage, displays sales from USA in a table:
          rs.file( 'sales' )
            .from_USA()
            .table( '#sales_from_usa' )
          ;
      ```
      
      @manual internal
  */
  Pipelet.Build = function( name, constructor, methods, namespace ) {
    this.subclass( capitalize( name ), constructor, methods );
    
    return Pipelet.Add( name, pipelet_factory, namespace );
    
    function pipelet_factory( source, a ) {
      Pipelet.set_default_options( constructor, source, a, { name: name } );
      
      return assert_scope( source
        .through(
          new_apply( constructor, a )
        )
      );
    } // pipelet_factory()
    
    function capitalize( name ) {
      name = name[ 0 ].toUpperCase() + name.slice( 1 );
      
      return name.replace( /_./g, function( match ) { return '_' + match[ 1 ].toUpperCase() } );
    } // capitalize()
  }; // Pipelet.Build()
  
  /* -------------------------------------------------------------------------------------------
      @class_method Pipelet.Add( name, pipelet_factory [, namespace ] )
      
      @short Add pipelet factory to Pipelet base class' methods.
      
      @parameters:
      - name (String): the name of the pipelet abiding by the following constraints:
        - (enforced) not already used by another pipelet or a Pipelet attribute
        - (enforced) is at least 5 characters long
        - (enforced) starts with at least two lower-case letter
        - (enforced) all letters after first are lower-case letters or digits or underscore
        - (recommanded) starts with the unique domain name followed by "_"
      
      - pipelet_factory (Function): factory function to instanciate pipelets, signature is
        ( Pipelet source, Array parameters ) -> Pipelet
      
      - namespace (@@Namespace): optional namespace to add pipelet into, default is @@rs.
      
      @returns: (Function), added factory function with the following attribute:
      - singleton (Function () -> undefined): modifier to make pipelet a singleton
      - multiton (Function ( Function ) -> undefined ): modifier to make pipelet
        a multiton.
      
      @throws:
      - if name violates one of the enforced constraints.
      - if pipelet_factory() does not accept exactly 2 parameters
      
      @manual internal
  */
  Pipelet.Add = function( name, pipelet_factory, namespace ) {
    var namespace = namespace || rs;
    
    fatal( Pipelet.Check_Name( name, namespace ) );
    
    pipelet_factory.length == 2
      || fatal( ', pipelet_factory() must have exactly 2 parameters' )
    ;
    
    de&&ug( 'Pipelet.Add(): name: ', name, ', namespace:', Object.keys( namespace[ constructor ].class_names ) );
    
    var _factory = pipelet_factory;
    
    factory.singleton = singleton;
    factory.multiton  = multiton;
    
    return namespace[ _add_factory ]( name, factory );
    
    function factory() {
      var parameters = slice.call( arguments, 0 );
      
      de&&ug( 'instantiate pipelet ' + name + '(), parameters count: ' + parameters.length );
      
      return _factory( this, parameters ).set_namespace( this );
    } // factory()
    
    // singleton modifier, makes pipelet a singleton (one instance)
    function singleton() {
      _factory = singleton_factory;
      
      de&&ug( name + '() is now a singleton' );
      
      function singleton_factory( source, parameters ) {
        var singletons = source[ _scope ]
          , pipelet    = singletons[ name ]
        ;
        
        de&&ug( 'singleton ' + name + '(), found: ' + !!pipelet );
        
        return assert_scope( pipelet
          ? source.through( pipelet )
          : singletons[ name ] = pipelet_factory( source, parameters )
        );
      } // singleton_factory()
    } // singleton()
    
    function multiton( get_name ) {
      _factory = multiton_factory;
      
      de&&ug( name + '() is now a multiton' );
      
      function multiton_factory( source, parameters ) {
        var _name      = name + '#' + get_name.apply( source, parameters )
          , singletons = source[ _scope ]
          , pipelet    = singletons[ _name ]
        ;
        
        de&&ug( 'multiton ' + name + '(), _name: ' + _name + ', found: ' + !!pipelet );
        
        return assert_scope( pipelet
          ? source.through( pipelet )
          : singletons[ _name ] = pipelet_factory( source, parameters )
        );
      } // multiton_factory()
    } // multiton()
    
    function fatal( message ) {
      if ( message )
        throw new Error( 'Pipelet.Add() Error: pipelet name "' + name + '" ' + message );
    } // fatal()
  }; // Pipelet.Add()
  
  /* -------------------------------------------------------------------------------------------
      @class_method Pipelet.Check_Name( name, namespace )
      
      @short Checks if name is an authorized new pipelet name.
      
      @parameters:
      - name (String): a new pipelet name, checks:
        - not already used by another pipelet or a Pipelet attribute
        - is not one of the explicitly authorized names and:
          - is at least 5 characters long
          - starts with at least two lower-case letter
          - all letters after first are lower-case letters or digits or underscore
      
      - namespace (Namespace): to check name into
      
      @returns:
      - undefined: name is authorized
      - String: not authorized cause
      
      @manual internal
  */
  var authorized_name = [
    'adds', 'map', 'set', 'flow', 'join', 'last', 'next', 'form', 'once', 'beat'
  ];
  
  Pipelet.Check_Name = function check_name( name, namespace ) {
    if ( namespace[ constructor ].prototype[ name ] )
      return 'is already used'
    ;
    
    if ( authorized_name.indexOf( name ) == -1 ) { // not a core-authorized name
      if ( name.length < 5 )
        return 'must be at least 5 characters long'
      ;
      
      if ( ! /^\$?[a-z]{2}[0-9a-z_]*$/.test( name ) )
        return 'must start with an optional "$", then two lower-case letters followed by lower-case letters or digits or "_"'
      ;
    }
  }; // Pipelet.Check_Name()
  
  /* -------------------------------------------------------------------------------------------
      @class_method Pipelet.set_default_options( constructor, source, parameters, defaults )
      
      @short Sets default options for pipelet parameters.
      
      @description
      Mutates parameters with added or modified and shallow-copied options.
      
      The position of "options" in parameters is set as (constructor.length - 1). This
      works only if the option parameter is specified in the constructor function and
      if a minifier has not removed it. It also means that pipelets have a fixed
      number of parameters, using options to provide optional parameters.
      
      Options are always shallow-copied, allowing pipelets to shallow-mutate options
      parameter value safely.
      
      The priority of modified options is as follows, highest priority first:
      1) options provided by pipelet user
      2) constructor.default_options
      3) defaults parameter
      4) { key: source._key }
      5) { key: [ 'id' ] }
      
      @returns undefined
      
      @parameters:
      - constructor (Function): Pipelet constructor or composition function
        which last parameter must always be options but may be named anything
        (especially once minified).
        
        This constructor may have a "default_options" property which can be defined
        as:
        - (Object): Default options object.
        - (Function): Default options function called with "parameters" returning
          default options. The function is called in the context of "constructor".
      
      - source (Pipelet): source pipelet.
      
      - parameters (Array): from pipelet invocation, the last of which is
        considered options if is at the same position as the options parameter
        of constructor (constructor.length - 1).
      
      - defaults (Object): other default options, used by Compose() and Build() to
        provide the default name attribute for the pipelet.
      
      @throws Errors with explicit error messages:
      - expected function or object for default_options
      - too many parameters
      - expected last parameter to be an options object
      
      @tests:
      set_default_options() has a full test suite in test/src/pipelet.coffee verifying
      all features of this documentation.
  */
  Pipelet.set_default_options = function set_default_options( constructor, source, parameters, defaults ) {
    var default_options        = constructor.default_options
      , constructor_length     = constructor.length
      , typeof_default_options = typeof default_options
      , options                = extend_2( { key: source._key || [ 'id' ] }, defaults )
      , parameters_length      = parameters.length
      , last_parameter         = parameters[ parameters_length - 1 ]
      , typeof_last_parameter  = typeof last_parameter
      , name                   = 'set_default_options(), '
    ;
    
    // Apply pipelet default options if defined
    switch( typeof_default_options ) {
      case 'function': // ToDo: add test for default_options as a function 
        default_options = default_options.apply( constructor, parameters );
      // fall-through
      case 'object':
        options = extend_2( options, default_options );
      break;
      
      case 'undefined':
      break;
      
      default:
      fatal( 'expected function or object for default_options, got ' + typeof_default_options );
    }
    
    parameters_length > constructor_length
      && bad_parameters( 'too many parameters' )
    ;
    
    if ( parameters_length == constructor_length ) {
      typeof_last_parameter != 'object'
        && bad_parameters( 'expected last parameter to be an options object, got ' + typeof_last_parameter )
      ;
      
      extend_2( options, last_parameter );
    }
    
    parameters[ constructor_length - 1 ] = options;
    
    // de&&ug( name + 'options:', options );
    
    function bad_parameters( message ) {
      fatal( message + ', expecting ' + constructor_length + ' parameters max, got ' + parameters_length );
    } // bad_parameters()
    
    function fatal( message ) {
      throw new Error( name + message );
    } // fatal()
  }; // Pipelet.set_default_options()
  
  // Test function for checking if minimizer optimizes-out unused parameters
  function test_function( p1, p2 ) { return p1 }
  
  if ( test_function.length != 2 ) {
    throw new Error( 'expected test_function.length to be 2 instead of: ' + test_function.length
      + ', minimizer could have optimized-out unused parameter if length is 1'
    );
  }
  
  /* --------------------------------------------------------------------------
     Pipelet.subclass( name, constructor [, methods ] )
     
     - Makes constructor a subclass of This class
     - Add methods to constructor's prototype, if any
     - Add subclass() and Build() class methods to constructor
     
     Parameters:
     - name          (String): name for Loggable
     - constructor (Function): a Pipelet constructor
     
     Optional Parameters:
     - methods:
       - (Object)  : instance methods for the constructor's class
       - (Function): returning an instance method Object, signature:
         methods( Super)
          - Super (Object): prototype of the super class
     
     Examples:
       With no instance methods:
         Set.subclass( 'Order', Order );
       
       With instance methods _add() and _remove() defined:
         Set.subclass( 'Order', Order, {
           _add: function( values, options ) {
             // implement Order..add()
           },
           
           _remove: function( values, options ) {
             // implement Order..remove()
           }
         } );
         
       With instance methods encapsulated in a function:
         Set.subclass( 'Order', Order, function( Super ) {
           // Private / hidden class attributes
           
           var this_is_a_private_class_attribute = 42;
           
           return {
             _add: function( values, options ) {
               // implement Order..add()
               
               // Calling superclass _add method
               Super._add.call( this, values, options );
             },
             
             _remove: function( values, options ) {
               // implement Order..remove()
               
               // Calling superclass _remove method
               Super._remove.call( this, values, options );
             }
           } // instance methods
         } );
  */
  Pipelet.subclass = function( name, derived, methods ) {
    Loggable.subclass.call( this, name, derived, methods );
    
    // Allows Build() and subclass() to be used by subclass
    derived.Build    = Pipelet.Build;
    derived.subclass = Pipelet.subclass;
    
    // Input and Output plug classes
    derived.Input  || ( derived.Input    = this.Input  );
    derived.Output || ( derived.Output   = this.Output );
  }; // Pipelet.subclass()
  
  /* --------------------------------------------------------------------------
     Pipelet.methods( [ methods [, trace [, Super ] ] ] )
     
     Usage:
       Pipelet.methods( Super, trace, function( Super, trace ) {
         // Private class attributes common to all methods
         
         return {
           __transform: function( values ) {
             trace( 6, this, '__transform', { count: values.length } );
             
             /* This may emit a trace Object which would look like:
                  {
                    flow      : 'trace',                   // traces dataflow name
                    _timestamp: '2014/04/21 21:32:12.038', // when the trace was generated
                    _level    : 6,                         // trace level specified while calling trace
                    _realm    : 'order',                   // the pipelet name
                    _name     : 'books',                   // pipelet instance name: this._get_name() or this.valueOf()
                    _method   : '__transform',             // from the trace function
                    count     : 5                          // from trace( ..., { count: values.length } )
                  }
                
                To accomplish this, use of the following conditional forms which are
                all semantically equivalent but execute faster if the trace is filtered
                by a downstream trace consumer:
             *-/
             
             trace >= 6
               && trace( 6, this )
               && trace( '__transform' )
               && trace( { count: values.length } )
             ;
             
             /* The above deserves some explanations.
                
                The first term, 'trace >= 6' uses trace() as if it were an integer to test
                if the trace level for the current domain is high enough to require the
                generation of the trace. This is accomplished by defining trace.valueOf()
                as returning the current trace level.
                
                If the trace level is less than 6 the expression stops here and none of
                the other terms are evaluated, resulting in a very low execution cost when
                the trace is not consumed.
                
                If the trace level is above 6, the second term 'trace( 6, this )' is
                evaluated, calling trace() with an integer for this trace level (6) and
                a pipelet instance (this). This call will return false if the traces are
                not consumed for this instance, stopping the evaluation of the remaining
                of the trace expression.
                
                If traces are consumed for this instance, the third term is evaluated
                'trace( '__transform' )'. This will return true only if traces are
                consumed for the method '__transform' of this instance at level 6.
                
                Finally, if the last term, 'trace( { values: values.length } )' is
                evaluated, it will emit a trace equivalent as the first example.
                
                This is made possible because trace() is a special kind of function which
                parameters can be provided, one or more at a time, and that will complete
                only when all expected parameters have been gathered through one or more
                successive calls.
                
                trace() will discard gathered parameters if it returns false, reseting
                itself for the next trace.
                
                We call this type of function a 'progressive' function.
                
                For more details on trace() see the documentation for Lazy_Logger().
                
                So the following are all other equivalents semantically to the previous
                examples:
             *-/
             
             trace >= 6
               && trace( 6, this, '__transform' )
               && trace( { count: values.length } )
             ;
             
             trace( 6 )
               && trace( this )
               && trace( '__transform' )
               && trace( { count: values.length } )
             ;
             
             return values;
           }, // __transform()
           
           /* Another option for tracing is to make function that return trace functions
              like __make_trace() bellow which can be used like this:
              
                var _trace = this.__make_trace( '__transform' );
                
              The _trace() method returned by __make_trace() takes an optional trace level,
              defaulting to 6 (informational), followed by an optional object and returns
              true if traces are consumed for this instance __transform method at the
              specified level.
              
              When there are many traces in a single function this could improve clarity
              and avoid resetting the same patterns. The following three uses of _trace()
              are semantically equivalents:
              
                _trace( 6 ) && trace( { values: values.length } ); // First use of _trace()
                
                _trace() && trace( { values: values.length } );    // second use in the same function
                
                _trace( 6, { values: values.length } );            // third use
              
           *-/
           __make_trace: function( method, _level ) {
             var __, that = this;
             
             if ( _level === __ ) {
               return function( level, object ) {
                 return trace > ( level !== __ ? level : level = 6 )
                   && trace( level, that, method, object )
                 ;
               }
             } else {
               return function( object ) {
                 return trace > _level && trace( _level, that, method, object );
               }
             }
           }
         } // methods
       ) );
  */
  /* Not used for now
  Pipelet.methods = function( Super, trace, methods ) {
    if ( ! methods ) return this;
    
    if ( typeof methods == 'function' ) {
      methods = methods( Super, trace );
      
      methods._trace = trace;
    }
    
    var prototype = this.prototype;
    
    Object.keys( methods ).forEach( function( method_name ) {
      this.prototype[ method_name ] = methods[ method_name ];
    } );
  }; // Pipelet.methods()
  */
  
  /* -------------------------------------------------------------------------------------------
      @function set_pipelet_operations( Pipelet_Class, f )
      
      Helper function to setup _add(), _remove(), _update(), and _clear() event handlers for
      Pipelet_Class.
      
      @parameters:
      - Pipelet_Class (Pipelet derivated class): which prototype will be populated for _add(),
        _remove(), _update(), and _clear() event handlers.
        
      - f (Function ( String event_name ) -> Function ): will be called 4 times, for each 4
        events 'add', 'remove', 'update', then 'clear'as event_name. Must return an event
        handler for corresponding event.
        
      @manual internal
  */
  var operations = [ 'add', 'remove', 'update', 'clear' ];
  
  function set_pipelet_operations( Pipelet_Class, f ) {
    operations.forEach( function( event_name ) {
      Pipelet_Class.prototype[ '_' + event_name ] = f( event_name );
    } );
  } // set_pipelet_operations()
  
  /* -------------------------------------------------------------------------------------------
     encapsulate( input, output, options )
     
     A pipelet to group a graph of pipelets into a single pipelet which input operations are
     redirected to the 'input' pipelet and where output methods, such as _fetch(), are
     redirected to the 'output' pipelet.
     
     This is typically used with Compose() to allow access to the input of a composition.
     
     Parameters:
     ----------
     - input  (Pipelet): the input pipelet of the graph to encapsulate
     - output (Pipelet): the output pipelet of the graph
     - options (Object): pipelet options except "key" which is forced to that of output:
       - name (String): degugging name
     
     Example
     -------
     Using the aggregate_from() composition:
     
       rs.Compose( 'aggregate_from', function( source, from, measures, dimensions, options ) {
         var input  = rs.filter( from, options )
           , output = input.aggregate( measures, dimensions, options )
         ;
         
         return source
           .encapsulate( input, output, options )
         ;
       } )
     
     Or using option "union" of Compose() which encapsultes the composition with an input union:
     
       rs.Compose( 'aggregate_from', { union: true }, function( source, from, measures, dimensions, options ) {
         return source
           .filter( from, options )
           .aggregate( measures, dimensions, options )
         ;
     
     Implementation
     --------------
     This implementation assigns the _input plug of the encapsulated pipelet to the
     _input plug of the input pipelet, and its _output plug to the _output plug of
     the output pipelet.
     
     Then it redirects input operations methods to the input pipelet.
     
     To prevent silent bugs, methods that should never be called by an outside user are
     redirected to null to trigger exceptions as early as possible.
     
     The table bellow shows all pipelet's methods redirections:
     
     Pipelet Method               Redirection    Notes
     ------------------------------------------------------------------------------------
     
     Input methods:
     -------------
     
     _notify                    this --> input
     _add                       this --> input
     _remove                    this --> input
     _update                    this --> input
     _clear                     this --> input
     
     State methods:
     -------------
     
     __transform                    null         Called by _add(), _remove(), _update(), _fetch() receiver
     
     __emit_add                     null         Called by _add(), _remove(), and _update()
     __emit_remove                  null         Called by _add(), _remove(), and _update()
     __emit_update                  null         Called by _add(), _remove(), and _update()
     __emit_clear                   null         Called by _add(), _remove(), and _update()
     
     __emit_operations              null         Called typically by an operation implementation
     
     Output methods:
     --------------
     
     _fetch_all                     none         Redirected by Pipelet to _output.fetch_all
     __emit                         none         Redirected by Pipelet to _output.emit
     _on                            none         Redirected by Pipelet to _output.on
  */
  function Encapsulate( input, output, options ) {
    this._input  = input._input;
    this._input_pipelet = input;
    
    this._output_pipelet = output;
    this._output = output._output;
    
    Pipelet.call( this, extend( {}, options, { key: output._key } ) );
    
    this[ _scope ] = output[ _scope ];
  } // Encapsulate()
  
  Pipelet.Build( 'encapsulate', Encapsulate, {
    // Input operations
    _notify: function( transaction, options ) {
      this._input_pipelet._notify( transaction, options );
      
      return this;
    },
    
    _add: function( values, options ) {
      this._input_pipelet._add( values, options );
      
      return this;
    },
    
    _remove: function( values, options ) {
      this._input_pipelet._remove( values, options );
      
      return this;
    },
    
    _update: function( updates, options ) {
      this._input_pipelet._update( updates, options );
      
      return this;
    },
    
    _clear: function( options ) {
      this._input_pipelet._clear( options );
      
      return this;
    },
    
    // Forbidden methods
    __transform                 : null,
    __emit_add                  : null,
    __emit_remove               : null,
    __emit_update               : null,
    __emit_clear                : null,
    __emit_operations           : null
  } ); // Encapsulate instance methods
  
  set_pipelet_operations( Encapsulate, function( event_name ) {
    return function( values, options ) {
      this._input_pipelet[ '_' + event_name ]( values, options );
      
      return this;
    };
  } );
  
  /* -------------------------------------------------------------------------------------------
     pass_through( [ options ] )
     
     A pipelet typically used as a temporary variable for cyclic graphs.
     
     Example:
       var tmp = rs.pass_through()
       
       rs.loop( tmp )._output.add_destination( tmp._input );
       
     ToDo: Make Pass_Through a Controllet
  */
  function Pass_Through( options ) {
    return Pipelet.call( this, options );
  } // Pass_Through()
  
  Pipelet.Build( 'pass_through', Pass_Through );
  
  set_pipelet_operations( Pass_Through, function( event_name ) {
    return function( values, options ) {
      return this.__emit( event_name, values, options );
    };
  } );
  
  /* -------------------------------------------------------------------------------------------
     @class Controllet( options )
     
     Base class for optimized controllets.
     
     A controllet is a @@pipelet such @@union() that does not modify data and therefore does
     not need to process data operation events such as add, remove, update, and clear.
     
     A controllet only needs to process queries to update upstream query trees.
     
     The Controllet class allows to build optimized controllets that updates its sources'
     Query_Tree outputs to point directly at destinations' inputs.
     
     This allows controllets to get out of the data events path, improving performances,
     both CPU-wise and memory-wise because controllets do not need Query_Trees. Source
     query trees are more involved as they handle all destination pipelets of their downstream
     controllets, resulting in better overall performances.
     
     Controllets can be chained, redirecting traffic between a source and destinations across
     several controllets:
     
     ```
                             <--- fetch && queries updates < ---
     
        .-------------- controllet 1 <---- controllet 2 <---- controllet 3 <----------.
        |                                                                             |
        |                                                                             |
        v                                                                             |
     source -------------------------------------------------------------------> destination(s)
                                 ---> data operation events --->
     ```
     
     Eventually, Controllets could run on separate servers while controlling data event traffic
     between other groups of servers, preventing the routing of data through intermediate
     servers.
     
     The first implemented controllet is Union, the next candidates are Filter and Pass_Through.
     
     Exceptions:
     - Attempting to call _add(), _remove(), _update(), or _clear()
  */
  function Controllet( options ) {
    var name = options && options.name;
    
    this._input  || ( this._input  = new Controllet.Input ( this, name, options.tag ) );
    this._output || ( this._output = new Controllet.Output( this, name ) );
    
    Pipelet.call( this, options );
  } // Controllet()
  
  Pipelet.subclass( 'Controllet', Controllet );
  
  set_pipelet_operations( Controllet, function( event_name ) {
    return function method() {
      this._error(
        'controllet ' + this._get_name() + ' does not process events, attempted: ' + event_name
      );
    };
  } );
  
  Controllet.Input = Pipelet.Input.subclass(
    'Controllet.Input',
    
    function( p, name, tag, input_transactions ) {
      Pipelet.Input.call( this, p, name, tag, input_transactions );
    }, {
    
    /* --------------------------------------------------------------------------------------------
        @method Controllet.Input..is_lazy()
        
        @short true if all controllet destinations are lazy
        
        @description:
          Because @@Controllet.Output..update_upstream_query() forwards query updates to source,
          input query is no longer updated and can no-longer be used to evaluate if input is lazy
          or not.
        
        @returns (Boolean):
          - true: this input is lazy
          - false: this input is not lazy
    */
    is_lazy: function() {
      var i = -1
        , destinations = this.pipelet._output.destinations
        , input
        , name
      ;
      
      while( input = destinations[ ++i ] ) {
        if ( input.is_lazy() ) continue; // if also a controllet, will check all its destinations
        
        de&&ug( get_name( this ) + 'destination: ' + input._get_name() + ' is not lazy' );
        
        return false;
      }
      
      de&&ug( get_name( this ) + 'all destinations are lazy' );
      
      return true;
      
      function get_name( that ) {
        return name = name || that._get_name( 'is_lazy' );
      } // get_name()
    }, // Controllet.Input..is_lazy()
    
    /* -------------------------------------------------------------------------------------------
        @method route_to_destinations( method_name, parameters, then )
        
        @short Routes a method call to all controllet destinations.
        
        @parameters:
        - method_name (String): the name of the routed method
        - parameters (Array): parameters of method
        - then (Function): optional, called when all destinations have called their "then"
          parameter which must be the last parameter but should not be provided in parameters.
        
        @returns this
    */
    route_to_destinations: function( method_name, parameters, then ) {
      var destinations = this.pipelet._output.destinations
        , count        = destinations.length
        , name
        , i = -1
        , input
      ;
      
      de&&ug( ( name = this._get_name( method_name ) )
        + 'routed to ' + count + ' destinations'
      );
      
      if ( then )
        count ? parameters.push( _then ) : then()
      ;
      
      while ( ++i < count ) {
        input = destinations[ i ];
        
        de&&ug( name + 'to destination: ' + input._get_name() );
        
        input[ method_name ].apply( input, parameters );
      }
      
      return this;
      
      function _then() {
        --count || then()
      }
    }, // Controllet.Input..route_to_destinations()
    
    set_tag: function( tag ) {
      tag && this.route_to_destinations( 'set_tag', [ this.tag = tag ] )
    }, // Controllet.Input..set_tag()
    
    add_branches: function( count ) {
      this.branches += count; // ToDo: DRY with Input..add_branches()
      
      // de&&ug( this._get_name( 'add_branches' ) + 'routing adding ' + count + ' branches, new total:', this.branches );
      
      return this.route_to_destinations( 'add_branches', [ count ] );
    }, // Controllet.Input..add_branches()
    
    _add_source_subscription: function( source, options, then ) {
    
      return this.route_to_destinations( '_add_source_subscription', [ source, options ], then );
    }, // Controllet.Input.._add_source_subscription()
    
    _remove_source_subscription: function( source, options, then ) {
    
      return this.route_to_destinations( '_remove_source_subscription', [ source, options ], then );
    } // Controllet.Input.._remove_source_subscription()
  } ); // Controllet.Input instance attributes
  
  Controllet.Output = Pipelet.Output.subclass(
    'Controllet.Output',
    
    function( p, name ) { Pipelet.Output.call( this, p, name ) }, function( Super ) { return {
    
    /* -------------------------------------------------------------------------------------------
        @method Controllet.Output..branches_count()
        
        @short Reports the number of branches this controllet provides.
        
        @description:
          Conrollets report the number of branches their inputs have, because these inputs
          correspond to the number of branches redirected to downstream pipelets. If some of
          these inputs are also controllets, they report their branches count using this same
          method.
          
          Controllets may have zero branch, when they have no connected input.
        
        @return count (Integer), the number of branches this controllet provides.
    */
    branches_count: function() {
      // A controllet output has as many branches as the input of its pipelet
      return this.source.branches;
    }, // Controllet.Output..branches_count()
    
    _add_destination: function( input ) {
      // ToDo: Document Downstream pipelet inheriting controlet's input tag
      input.set_tag( this.source.tag );
      
      return Super._add_destination.call( this, input );
    }, // _add_destination()
    
    // Route update_upstream_query to pipelet input source, if any
    // ToDo: add tests for Controllet.Output..update_upstream_query()
    update_upstream_query: function( changes, destination ) {
      var that = this
        , source = that.source.source
      ;
      
      changes = that._update_query( changes, destination ); // ToDo: overload this.source instead
      
      de&&ug( that._get_name( 'update_upstream_query' ) + 'changes:', changes, ', input:', destination._get_name() );
      
      source
        && changes[ 0 ].length && changes[ 1 ].length
        && source.update_upstream_query( changes, destination )
      ;
    } //  Controllet.Output..update_upstream_query()
  } } ); // Controllet.Output instance attributes
  
  /* -------------------------------------------------------------------------------------------
     @pipelet union( sources, options )
     
     Forwards many sources to one destination, synchronizing transactions if tag option is
     provided.

     @parameters:
     - sources (Array of Pipelets): list of sources
     - options (Object):
      - name: debugging name for this union
      - tag: transactions tag for this union
  */
  function Union( sources, options ) {
    var that = this
      , name = options.name
    ;
    
    that._input  || ( that._input  = new Union.Input ( that, name, options.tag ) );
    that._output || ( that._output = new Union.Output( that, name ) );
    
    Controllet.call( that, options );
    
    that._pipelet_input = null;
    
    sources && sources.forEach( function( source ) {
      that._add_source( source ); // ToDo: pass transaction option to _add_source
    } );
  } // Union()
  
  Union.Input = Controllet.Input.subclass(
    'Union.Input',
    
    function( p, name, tag, input_transactions ) {
      Controllet.Input.call( this, p, name, tag, input_transactions );
      
      this.sources = [];
    }, {
    
    _add_source: function( source ) {
      var sources = this.sources;
      
      sources.indexOf( source ) != -1 && this.error( '_add_source', 'source already added' );
      
      sources.push( source );
      
      return this;
    }, // Union.Input.._add_source()
    
    _remove_source: function( source ) {
      var sources = this.sources
        , position = sources.indexOf( source )
      ;
      
      position == -1 && this.error( '_remove_source', 'source not found' );
      
      sources.splice( position, 1 );
      
      return this;
    } // Union.Input.._remove_source()
  } ); // Union.Input instance attributes
  
  Union.Output = Controllet.Output.subclass(
    'Union.Output',
    
    function( p, name ) { Controllet.Output.call( this, p, name ) }, {
    
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query] )
       
       ToDo: add test cases
    */
    _fetch: function( receiver, query ) {
      var p = this.pipelet
        , sources = this.source.sources
        , l = sources.length
      ;
      
      if ( l ) {
        for ( var i = -1, count = l; ++i < l; ) {
          var source = sources[ i ];
          
          if ( source._fetch ) {
            _fetch( source );
          } else {
            // Source should be an array of objects
            if ( query ) {
              source = new Query( query ).generate().filter( source );
            }
            
            receiver( source, ! --count );
            
            count || resume_all_sources();
          }
        }
      } else {
        end();
      }
      
      return this;
      
      function _fetch( source ) {
        var complete = false;
        
        source._fetch( rx, query );
        
        function rx( values, no_more ) {
          if ( no_more ) {
            complete = true;
            
            if ( values && values.length ) {
              receiver( values, ! --count );
            } else {
              --count || end();
            }
            
            if ( count ) {
              // There are still sources which _fetch is not complete
              
              // Pause this source from emitting to prevent inconsistent states
              source._pause_destination( p );
            } else {
              // All sources fetches are now complete
              resume_all_sources();
            }
          } else {
            if ( complete ) {
              p._error( '_fetch#rx'
                , 'source "' + source._get_name() + '" sent more content after completing'
              );
            }
            
            values && values.length && receiver( values );
          }
        } // rx()
      } // _fetch()
      
      function resume_all_sources() {
        for ( var i = -1, l = sources.length; ++i < l; ) {
          sources[ i ]._resume_destination( p );
        }
      } // resume_all_sources()
      
      function end() {
        receiver( [], true );
      } // end()
    }, //  Union.Output.._fetch()
    
    update_upstream_query: function( changes, destination ) {
      var that    = this
        , sources = that.source.sources
        , l       = sources.length
        , i       = -1
      ;
      
      changes = that._update_query( changes, destination ); // ToDo: overload this.source instead
      
      if ( changes[ 0 ].length + changes[ 1 ].length ) {
        de&&ug( that._get_name( 'update_upstream_query' ) + 'changes:', changes, ', input:', destination._get_name() );
        
        while ( ++i < l )
          sources[ i ].update_upstream_query( changes, destination )
        ;
      }
    } // Union.Output..update_upstream_query()
  } ); // Union.Output instance attributes
  
  Controllet.Build( 'union', Union, {
    // ToDo: forbid external pipelets calling __emit(), breaking encapsulation
    // For now, when they do, we add a pass_through() which is a hack to allow broken encapsulation to work
    __emit: function( event_name, values, options ) {
      var that = this;
      
      that._pipelet_input
        || ( that._pipelet_input = that.namespace().pass_through( { name: that._get_name() + ' input' } ) ).through( that )
      ;
      
      that._pipelet_input._output.emit( event_name, values, options );
      
      return that;
    } // __emit()
  } ); // union()
  
  set_pipelet_operations( Union, function( event_name ) {
    return function( values, options ) {
      return this.__emit( event_name, values, options );
    };
  } );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet greedy( options )
      
      This is a @@stateless, @@synchronous, @@greedy pass-through pipelet.
  */
  function Greedy( options ) {
    this._input = this._input || new Greedy.Input( this, options.name, options.tag );
    
    Pipelet.call( this, options );
  } // Greedy()
  
  Pipelet.Build( 'greedy', Greedy );
  
  Greedy.Input = Pipelet.Input.subclass(
    'Greedy.Input',
    
    function( p, name, input_transactions ) {
      Pipelet.Input.call( this, p, name, input_transactions );
      
      // Query everything from upstream, makes me greedy
      this.query = Query.pass_all;
      
      // We want everything now
      this.no_fetch = false;
    }, {
    
    /* -----------------------------------------------------------------------------------------
       update_upstream_query( changes )
       
       Input default behavior: Updates this input query and propagate upstream.
       
       Greedy behavior: to not do anything, do not update query and do not
       propagate upstream. Greedy therefore always fetches all it can regardless of
       downstream pipelet needs.
       
       Filtering content must therefore be specified upstream of the greedy pipelet.
    */
    update_upstream_query: function() {
      // Prevent upstream query propagation
    } // update_upstream_query()
  } ); // Greedy Input
  
  /* -------------------------------------------------------------------------------------------
     @pipelet alter( transform [, options] )
     
     Alters a dataflow, calling transform() on each added, removed, and fetched value.
     
     This is a @@stateless, @@synchronous pipelet. It is @@lazy if option "query_transform" is
     a Function, @@greedy otherwise. When greedy, alter() will:
     - fetch all values from upstream regardless of downstream queries
     - ignore downstream query updates
     
     @parameters:
     - transform (Function or Object): behavior varies with type:
       - transform( value, operation, options ) -> undefined:
         - value (Object): to shallow-mutate, alter() shallow copies values before calling
           transform().
         - operation (String): "add", "remove", or "fetch"
         - options (Object): optional, may include transaction object, do not mutate
         
         transform() MUST mutate its value parameter which is shallow-cloned prior to calling
         transform() but SHOULD NOT mutate Object and Array attributes.
         
         Any returned value by transform() is ignored.
         
       - (Object): set static properties into all values
     
     - options (Object):
       - query_transform (Function): A transform to alter queries for both fetch() and
         upstream query updates.
         
         If provided, alter becomes lazy and only fetches the minimum set of values
         from upstream; query_transform( term ) is called for each added and removed
         terms on query updates or each term of a fetch query.
         
         It must not mutate its term parameter and must return a new term or falsy to
         indicate that this term can never match any output. After query_transform is
         applied on all terms, if the resulting query becomes empty, no action is
         performed, a fetch() would then return immediatly with no values or the upstream
         query would not be updated.
         
         For more information on query terms, check the documentation for Queries.
     
     Examples:
     
     - Alter a source dataflow of stocks to produce a dataflow of P/E ratios from price
       and earnings attributes. Optionally provide query_transform for lazy behavior:
     
         stocks
           .alter( function( stock ) {
             // Alter shallow-cloned stock value, do not return a value
             stock.pe_ratio = stock.price / stock.earnings
           }, { query_transform: query_transform } )
         ;
         
         function query_transform( term ) {
           if ( term.pe_ratio ) {
             // make a shallow copy, before remove pe_ratio attribute
             term = extend( {}, term );
             
             delete term.pe_ratio; // term is greedier, possibly greedy
           }
           
           return term;
         } // query_transform()
       
     - Add a 'stock_prices' flow attribute using an Object transform:
     
       prices.alter( { flow: 'stock_prices' }, { query_transform: query_transform } );
       
       // Note: query_transform() is only necessary if one wants a lazy behavior
       function query_transform( term ) {
         switch( term.flow ) {
           case 'stock_prices':
             // make a shallow clone before deleting flow attribute
             term = extend( {}, term );
             
             delete term.flow;
           // fall-through
           case undefined:
           return term;
         }
         // returns undefined (no match for this term) if term specifies a flow
         // attribute different than 'stock_prices'
       } // query_transform()
     
     ToDo: alter(), provide default query_transform when transform is an object or deprecate object transform
     ToDo: alter(), add full test suite
  */
  function Alter( transform, options ) {
    var that            = this
      , no_clone        = that._no_clone = that._no_clone || false // set to true by Map()
      , name            = options.name
      , query_transform = options.query_transform
    ;
    
    that._input  = that._input  || new Alter.Input ( that, name, query_transform );
    that._output = that._output || new Alter.Output( that, name, query_transform );
    
    de&&ug( 'Alter(), options:', options );
    
    Pipelet.call( that, options );
    
    var vars       = [ 'i=-1', 'l=X.length', 'Y=[]', 'y' ] // parameters for unrolled while loop
    
      , while_body = 'x=X[++i],Y.push(y={});for(p in x)y[p]=x[p];' // used if ! no_clone
    ;
    
    no_clone || vars.push( 'x', 'p' );
    
    switch( typeof transform ) {
      case 'object':
        // add transform's properties
        for ( var p in transform ) {
          var _p = p.match( /^[a-zA-Z][0-9a-zA-Z]*$/ ) ? '.' + p : "['" + p + "']";
          
          while_body += "y" + _p + "='" + transform[ p ] + "';";
        }
      break;
      
      case 'function':
        var l = transform.length; // the number of requested parameters by transform()
        
        if ( l < 1 ) error( 'transform must use at least one parameter' );
        
        vars.push( 't=transform' );
        
        // Build transform parameter list according to the number of parameters requested by transform
        var t = 't(' + [ no_clone ? 'X[++i]' : 'y', 'operation', 'o' ].slice( 0, l ) + ')';
        
        if ( no_clone ) {
          while_body = 'if(y=' + t + ')Y.push(y);';
        } else {
          while_body += t + ';';
        }
      break;
      
      default:
        error( 'transform must be an Object or a function' );
    } // end switch typeof transform
    
    // Generate code for that.__transform()
    var code = new Code()
      ._function( 'that.__transform', void 0, [ 'X', 'o', 'operation' ] )
        ._var( vars )
        .unrolled_while( while_body )
        .add( 'return Y' )
      .end( 'Alter..__transform()' )
    ;
    
    eval( code.get() );
    
    that._output._transform = that.__transform.bind( that );
    
    function error( message ) {
      throw new Error( 'Alter(): ' + message );
    } // error
  } // Alter()
  
  function Alter_Input( p, name, query_transform, tag, input_transactions ) {
    // ToDo: inputs, provide query_transform, tag and maybe input_transactions as options
    Pipelet.Input.call( this, p, name, tag, input_transactions );
    
    if ( query_transform ) {
      // Input will be lazy and update queries
      this.query_transform = query_transform;
    } else {
      // Query everything from upstream (be greedy) unless query_transform is provided
      this.query = Query.pass_all;
    }
  } // Alter_Input()
  
  Alter.Input = Pipelet.Input.subclass( 'Alter.Input', Alter_Input,
    function ( Super ) {
      return {
        /* -----------------------------------------------------------------------------------------
           update_upstream_query( changes )
           
           Input default behavior: Updates this input query and propagate upstream.
           
           If query_transform is provided, updates upstream query with transformed query.
           
           Otherwise this pipelet has a greedy behavior is does not do anything, do not update query
           and do not propagate upstream. Greedy therefore always fetches all it can regardless of
           downstream pipelet needs. Filtering content must therefore be specified upstream of the
           greedy pipelet.
        */
        update_upstream_query: function( changes ) {
          var query_transform = this.query_transform;
          
          // ToDo: the ability to transform queries should be done in Pipelet, consistently with __transform
          query_transform
            && Super.update_upstream_query.call( this, changes.map( terms_transform ) )
          ;
          
          function terms_transform( terms ) {
            return terms.reduce( query_reducer, [] );
            
            function query_reducer( terms, term ) {
              term = query_transform( term );
              
              term && terms.push( term );
              
              return terms;
            } // query_reducer()
          } // terms_transform()
        } // Alter.Input..update_upstream_query()
      } // Alter.Input methods
    } // Alter.Input methods factory
  ); // Alter.Input
  
  function Alter_Output( p, name, query_transform ) {
    Pipelet.Output.call( this, p, name );
    
    this.query_transform = query_transform;
  } // Alter_Output()
  
  Alter.Output = Pipelet.Output.subclass( 'Alter.Output', Alter_Output,
    function ( Super ) {
      return {
        _fetch: function( receiver, query ) {
          var query_transform = this.query_transform
            , rx = receiver
          ;
          
          if ( query ) {
            if ( query_transform ) {
              // ToDo: handing of query_transform should be done by pipelet
              query = query.reduce( query_reducer, [] );
              
              if ( query.length == 0 ) return receiver( [], true );
            } else {
              var filter = new Query( query ).generate().filter;
              
              query = null;
              rx = filter_rx;
            }
          }
          
          return Super._fetch.call( this, rx, query );
          
          // ToDo: DRY with Alter.Input..update_upstream_query() by moving this code to Pipelet
          function query_reducer( terms, term ) {
            term = query_transform( term );
            
            term && terms.push( term );
            
            return terms;
          } // query_reducer()
          
          function filter_rx( values, no_more ) {
            if ( values && values.length ) values = filter( values );
            
            receiver( values, no_more );
          } // rx()
        } // Alter.Output.._fetch()
      } // Alter.Output methods
    } // Alter.Output methods factory
  ); // Alter.Output
  
  Pipelet.Build( 'alter', Alter );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet dispatch( branches, branch_dataflow, options )
      
      Dispatch is a basic building block for managing concurency with Toubkal.
      
      It dispatches a source dataflow over a dynamic number of branch dataflows, then gathers the
      outputs of these dataflows back together to produce the dispatcher's destination dataflow:
      
      ```
                                       branches
                                       dataflow
                                          |
                                          V
                                 Branches Controller
                            -----------------------------
                            |             |             |
                            V             |             V
                       Dispatcher         |         Gatherer
                       query tree         |        rs.union()
                            |             V             |
                            |---> branch dataflow 0 --->|
                            |             |             |
                 source     |             V             |     destination
              ------------->|---> branch dataflow i --->|------------------>
                dataflow    |             |             |       dataflow
                            |             V             |
                            |---> branch dataflow n --->|
      ```
      
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
        
        - Implement custom pipelets without deriving from a Pipelet class, the branch dataflow
          being called each time a new value is added. Removes can be handled by monitoring
          disconnections from the source.
          
        - Distribute a workload horizontally over multiple processes, servers, or worker
          threads in a Map/Reduce pattern controlled by 'branches'. The dispatcher 'maps'
          incoming operations to each branch using filters and 'reduces' the outputs of these
          branches back into 'this' destination dataflow.
          
          Each branch defines the dataflow that starts when a new proccess is added to the
          branches control dataflow and stops when its entry is removed from branches.
          
        - Control elastic charding where each branch controls a chard. Chard attributes may
          determine on which device they are, a path on the device, a process id, a machine url.
      
      Dispatching is implemented as efficiently as can be using the source query tree, while
      gathering together uses rs.union().
      
      @parameters:
        - branches: (Pipelet) controls branches creation and removal. Each add operation spawns
            the creation of a new branch, calling branch_dataflow(), while remove operations
            tear-down branches. Each branch has attributes:
              - id: (scalar) unique identifier for the branch. It is mandatory unless the
                pipelet provides a make_key() method to build a unique key from values emited
                by the pipelet.
                
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
            
          - no_encapsulate: (Boolean) true if the dispatcher should not use an encapsulate()
              pipelet. This improves performances by removing a query tree and using the source
              query tree as the dispatcher, removes an otherwise required pass_through() pipelet.
              
              When using this option, the returned pipelet is the output gatherer union at the
              end of the dispatcher and therefore it cannot be used as a reference to connect
              to the input dispatcher tree which becomes the source pipelet upstream of dispatch().
              
          - single: (Boolean) true if the the branch dataflow is made of a single pipelet or
              uses an encapsulated pipelet.
              
              Using this option allows to improve performances by removing the requirement for
              a pass-through pipelet between the source and the input of each branch.
              
          - input_output: (Boolean) true if the branch dataflow returns an input-output object.
              
              This option also allows to improve performances for multi-pipelet branches
              because it removes the need for both pass_through() and encapsulate() pipelets.
              
              The input-output Object requires the following attributes:
                - input : (Pipelet) input pipelet of the branch
                - output: (Pipelet) output pipelet of the branch  
      
      @throws error if:
        - a branch does not define an id matching to it's pipeline key
        - a branch is duplicated (use unique_set() upstream if necessary)
        - a branch returned (input, output) couple without option input_output
        - a branch did not return (input, output) couple while option input_output is true
        - option single specified but a branch returned a pipeline with more than one pipelet
        - a removed branch is not found, dispatch() does not have an anti-state, does not handle removes before adds
      
      @example:
        A trivial socket.io server with no authentication or authorizations, delivering the
        content of a database to a number of web clients, and allowing these clients to
        update that same database. In this example, branches are socket.io clients:
        
        ```javascript
          // HTTP Servers and socket.io clients dataflow
          var clients = rs
            .set( [
               { ip_address: '0.0.0.0', port: 80  }
               { ip_address: '0.0.0.0', port: 443, key: '...', cert: '...' }
             ] )
             
            .http_servers()      // start http and https servers
            
            .socket_io_clients() // emits a dataflow of socket.io client sockets
          ;
          
          // Database dataflow
          rs.database()
            
            .trace( 'database changes to clients' )
            
            .dispatch( clients, client_dataflow )
            
            .trace( 'database changes from clients' )
            
            .database()
          ;
          
          // Create a client dataflow
          function client_dataflow( source, options ) {
            return source
              .through( this.socket ) // add dispatcher's as source of socket.io client socket
            ;
          }
        ```
        
        To add authorizations, filter source and output to and from clients' sockets:
        
        ```javascript
          function client_dataflow( source, options ) {
            return source
              .filter( can_read ) // where can_read is read authorizations dataflow
              
              .through( this.socket )
              
              .filter( can_write ) // where can_write is write autorizations dataflow
            ;
          }
        ```
  */
  // Note: Dispatch() is a Greedy Pipelet which is unusually instanciated as a composition
  function Dispatch( source, branches, branch_dataflow, options ) {
    var that           = this
      , rs             = source.namespace()
      , name           = options.name + '-'
      , no_encapsulate = options.no_encapsulate
    ;
    
    options.key = branches._key;
    
    options.name = name + 'branches';
    
    Greedy.call( that, options );
    
    that.branch_dataflow = branch_dataflow;
    
    that.branches = {};
    
    // ToDo: no_encapsulate should be the default mode, provide option encapsulate or no option at all
    // When adding an input, it should most-likely be a union() instead of pass_through() however beware of union() controllet behavior
    // Review this in conjunction with Singleton() behavior
    that.dispatcher = no_encapsulate ? source : rs.pass_through( { name: name + 'dispatcher' } );
    
    that.gatherer   = rs.union( [], { name: name + 'gatherer' } );
    
    // This pipelet is instancated as a composition, we need to add branches as a source explicity:
    that._add_source( branches );
    
    return no_encapsulate
      ? that.gatherer
      : source.encapsulate( that.dispatcher, that.gatherer, options )
    ;
  } // Dispatch()
  
  Greedy.subclass( 'Dispatch', Dispatch, {
    _add: function( new_branches, options ) {
      var that                  = this
        , branches              = that.branches
        , _options              = that._options
        , input_output          = _options.input_output
        , dispatcher            = that.dispatcher
        , gatherer              = that.gatherer
        , requires_pass_through = ! ( _options.single || input_output )
        , name                  = '_add'
      ;
      
      new_branches.forEach( function( branch ) {
        var id     = that.make_key( branch )
          , branch
          , input
          , output
        ;
        
        typeof id === "undefined" && fatal( 'branches must define a unique id' );
        
        branches[ id ] && fatal( 'branch id: ' + id + ', already exists' );
        
        de&&ug( that._get_name( name ) + 'id:', id, ', options:', _options );
        
        // ToDo: determine requires_pass_through dynamically after calling branch_dataflow()
        // based on 1/ returned value or 2/ finding the input of the pipeline dynamically
        // providing a path_through() connected to namespace as input initialy, removing it
        // afterwards then connecting to dispatcher
        // Removing the path_through() would currently trigger hacked branch cleanup so this can only be done after providing a way to cleanup a branch
        input = requires_pass_through
          ? dispatcher.pass_through( { name: _options.name + '-input' } )
          : dispatcher
        ;
        
        branch = that.branch_dataflow.call( branch, input, options );
        
        // Assert that returned branch matches provided options
        if ( is_array( branch ) ) {
          input_output || that._error( name, 'branch returned (input, output) couple without option input_output' );
        } else {
          input_output && that._error( name, 'branch did not return (input, output) couple while option input_output is true' );
          
          _options.single
            && branch
            && branch._input.source
            && branch._input.source != dispatcher._output
            && that._error( name, 'option single specified but returned a pipeline with more than one pipelet: ' + branch._input.source._get_name() )
          ;
        }
        
        output = ( branches[ id ] = input_output
          ? branch
          : { input: requires_pass_through ? input : branch, output: branch }
        ).output;
        
        output && output.through( gatherer );
        
        function fatal( message ) {
          that._error( name, message + ', check branches key: ' + that._key );
        } // fatal()
      } ); // for all added branches
    }, // _add()
    
    _remove: function( removed_branches, options ) {
      var that     = this
        , branches = that.branches
        , name     = '_remove'
      ;
      
      removed_branches.forEach( function( branch ) {
        var id     = that.make_key( branch )
          , output
          , input
        ;
        
        branch = branches[ id ]
             // ToDo: send to error dataflow
          || that._error( name, 'branch: ' + id + ', does not exist, check branches key: ' + that._key )
        ;
        
        de&&ug( that._get_name( name ) + 'id:', id );
        
        delete branches[ id ];
        
        // ToDo: call a remove method on the branch to allow cleanup, currently done by highjacking branch.input._input.remove_source()
        // ToDo: allow to unplug at the end of ongoing transactions, this should be done by Input..remove_source()
        // ToDo: have socket.io provide no_fetch option when client disconnected, because there is nothing to fetch
        
        // Unplug input from dispatcher
        ( input = branch.input )
          ? branch.input._input.remove_source( that.dispatcher._output, options, unplug_output )
          : unplug_output()
        ;
        
        // Unplug output from gatherer
        function unplug_output() {
          ( output = branch.output )
            && that.gatherer._input.remove_source( output._output, options )
          ;
        } // unplug_output()
      } ) // for all removed branches
    }, // _remove()
    
    // ToDo: use updates to notify branches of some changes without tearing-down the branch,
    // possibly using the input_output object to provide a branch instance update function
    // or having branch return a function
    _update: function() {
      // Ignore updates for now
    } // _update()
    
    // ToDo: implement clear()
  } ); // Dispatch instance methods
  
  rs.Compose( 'dispatch', Dispatch );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet set( [values, [options]] )
      
      Non-ordered set.
      
      This is a @@stateful, @@@synchronous, @@greedy pipelet. It serves as a base class for
      stateful pipelets, derived classes can be @@assynchronous.
      
      @parameters:
      - values: optional array of objects to set initial content.
      
      - options: optional object to provide options for Set and parent class Pipelet:
        - name: set name
        
        - key: Objects identity attributes, default is [ 'id' ]
  */
  function Set( a, options ) {
    this._output || ( this._output = new Set.Output( this, options && options.name ) );
    
    if ( a && ! ( is_array( a ) ) )
      throw new Error( 'Set(), first parameter must be an Array' );
    
    Greedy.call( this, options );
    
    options = this._options;
    
    this._key = options.key || [ 'id' ]; // ToDo: consider moving this into Pipelet()
    
    // ToDo: add leading underscores to instance variables 
    this.a = []; // The current state of the set
    this.b = []; // Anti-state, used to store removes waiting for adds and conflict resolution
    
    a && a.length && this._add( a );
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
  } // Set()
  
  Set.Output = Greedy.Output.subclass(
    'Set.Output',
    
    function( p, name ) { Greedy.Output.call( this, p, name ) }, {
    
    /* ------------------------------------------------------------------------
       fetch_unfiltered( receiver )
       
       Fetches set's current state, possibly in several chunks, unfiltered.
       
       Called by _fetch()
    */
    fetch_unfiltered: function( receiver ) {
      receiver( this.pipelet.a, true );
      
      return this;
    }, // fetch_unfiltered()
    
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query ] )
       
       Fetches set's current state, possibly in several chunks, and filters
       results by optional query.
       
       See Output._fetch() for receiver and query documentation.
    */
    _fetch: function( receiver, query ) {
      if ( query ) {
        var name;
        
        de&&ug( ( name = 'Set ' + this._get_name( '_fetch' ) ) + 'query:', query );
        
        // ToDo: cache query filters
        var filter = new Query( query ).generate().filter;
        
        this.fetch_unfiltered( function( values, no_more ) {
          var filtered = filter( values );
          
          de&&ug( name + ', values: ' + values.length + ', filtered: ' + filtered.length );
          
          send( filtered, no_more );
        } );
      } else {
        this.fetch_unfiltered( send );
      }
      
      return this;
      
      function send( values, no_more ) {
        var l = values.length;
        
        if ( l || no_more ) { // filter out empty chunks
          // ToDo: split large result sets in chunks to reduce downstream latency
          receiver( values, no_more );
        }
      }
    } // _fetch()
  } ); // Set.Output
  
  Greedy.Build( 'set', Set, {
    /* ------------------------------------------------------------------------
       _clear( options )
       
       Clears content then notifes downsteam Pipelets.
    */
    _clear: function( options ) {
      this.a = [];
      
      return this.__emit_clear( options );
    }, // get()
    
    /* ------------------------------------------------------------------------
       _add( values, options )
       
       Add values to the set then notifies downsteam pipelets.
    */
    // Todo: Set.._add(): filter-out duplicate adds
    // ToDo: Set.._add(): optimize when .._add_value() is not overloaded
    _add: function( values, options ) {
      var locations = options && options.locations;
      
      // If there are locations, these cannot be forwared if values are handled
      // assynchronously by a derived class, therefore we remove locations from
      // options
      if ( locations ) {
        options = extend( {}, options );
        
        delete options.locations;
      }
      
      return this._transaction( values.length, options, function( t, l ) {
        de&&ug( this._get_name( '_add' ) + 'values: ' + l );
        
        if ( locations ) {
          while( l-- )
            this._add_value( t, values[ l ], false, locations[ l ] )
          ;
        } else {
          var i = -1;
          
          while( ++i < l )
            this._add_value( t, values[ i ] )
          ;
        }
      } );
    }, // _add()
    
    // ToDo: test Set.._add_value()
    _add_value: function( transaction, value, emit_now ) {
      if ( value ) {
        var b = this.b;
        
        if ( b.length ) {
          var p = this._b_index_of( value );
          
          if ( p != -1 ) {
            de&&ug( get_name( this ) + 'removing add from anti-state' );
            
            b.splice( p, 1 );
            
            transaction.emit_nothing();
            
            return this;
          }
        }
        
        // ToDo: should we insert at location or keep ignoring it?
        this.a.push( value );
        
        transaction.__emit_add( [ value ], emit_now );
      } else {
        transaction.emit_nothing();
      }
      
      function get_name( that ) { return that._get_name( '_add_value' ) }
    }, // _add_value()
    
    // ToDo: test Set.._add_values()
    _add_values: function( transaction, values, emit_now ) {
      var i = -1, v, b = this.b, added = [], l = values.length;
      
      while( b.length && ++i < l ) {
        // There are values in the antistate b, waiting for an add or
        // _update, or conflict resolution
        var p = this._b_index_of( v = values[ i ] );
        
        if ( p == -1 ) {
          added.push( v );
        } else {
          de&&ug( name || ( name =
            this._get_name( '_add_value' ) + 'removing add from anti-state'
          ) );
          
          b.splice( p, 1 );
        }
      }
      
      if ( i == -1 ) {
        added = values;
      } else if ( i < l ) {
        push.apply( added, values.slice( ++i ) );
      }
      
      push.apply( this.a, added );
      
      transaction.__emit_add( added, emit_now );
    }, // _add_values()
    
    /* ------------------------------------------------------------------------
       _remove( values )
       
       Remove values from the set then notify downstream pipelets
    */
    // ToDo: optimize _remove() when _remove_value() is not overloaded
    _remove: function( values, options ) {
      var locations = options && options.locations;
      
      // If there are locations, these cannot be forwared if values are handled
      // assynchronously by a derived class, therefore we remove locations from
      // options
      if ( locations ) {
        options = extend( {}, options );
        
        delete options.locations;
      }
      
      return this._transaction( values.length, options, function( t, l ) {
        de&&ug( this._get_name( '_remove' ) + 'values: ' + l );
        
        if ( locations ) {
          while ( l-- )
            this._remove_value( t, values[ l ], false, locations[ l ] )
          ;
        } else {
          var i = -1;
          
          while ( ++i < l )
            this._remove_value( t, values[ i ] )
          ;
        }
      } );
    }, // _remove()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_value: function( transaction, value, emit_now ) {
      var removed = [];
      
      if ( value ) {
        var p = this._a_index_of( value );
        
        if ( p == -1 ) {
          de&&ug( this._get_name( '_remove_value' ) + 'adding value to anti-state' );
          
          this.b.push( value );
        } else {
          // !! Removed item could be different than value, but does have the same index key
          removed = this.a.splice( p, 1 );
        }
      }
      
      transaction.__emit_remove( removed, emit_now );
    }, // _remove_value()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_values: function( transaction, values, emit_now ) {
      var i = -1, l = values ? values.length : 0, removed = [], name;
      
      while ( ++i < l ) {
        var v = values[ i ]
          , p = this._a_index_of( v )
        ;
        
        if ( p == -1 ) {
          de&&ug( name || ( name =
            this._get_name( '_remove_values' ) + 'adding value to anti-state'
          ) );
          
          this.b.push( v );
        } else {
          // !! Removed item could be different than value, but does have the same index key
          removed.push( this.a.splice( p, 1 )[ 0 ] );
        }
      }
      
      transaction.__emit_remove( removed, emit_now );
    }, // _remove_values()
    
    /* ------------------------------------------------------------------------
        @method Set.._update( updates, options )
        
        @short Update existing values of the set.
        
        @description:
        This implementation creates a transaction with twice as many operations
        as there are updates, then invokes @@Set.._update_value() for each
        update.
        
        If there are moves in options, _update_value() is called in reverse
        order, i.e. last update first.
        
        Moves are not forwared downstream.
        
        @parameters:
        - updates (Array of updates): an update is an array of two values, the
          first is the previous value, the second is the updated value.
        
        - options (Object): optional operation metadata:
          - _t (Object): upstream transaction info
          - moves (Array): from optional upstream order()
    */
    // ToDo: add tests for Set.._update() and Set.._update_value()
    _update: function( updates, options ) {
      var that  = this
        , l     = updates.length
        , moves = options && options.moves
      ;
      
      // If there are moves, these cannot be forwared if values are handled
      // assynchronously by a derived class, therefore we remove moves from
      // options
      if ( moves ) {
        options = extend( {}, options );
        
        delete options.moves;
      }
      
      return that._transaction( l * 2, options, function( t ) {
        de&&ug( that._get_name( '_update' ) + 'updates: ' + l );
        
        if ( moves ) {
          while ( l-- )
            that._update_value( t, updates[ l ][ 0 ], updates[ l ][ 1 ], moves[ l ] )
          ;
        } else {
          var i = -1;
          
          while ( ++i < l )
            that._update_value( t, updates[ i ][ 0 ], updates[ i ][ 1 ] )
          ;
        }
      } ); // this._transaction()
    }, // Set.._update()
    
    /* ------------------------------------------------------------------------
        @method Set.._update_value( t, remove, add, move )
        
        @description:
        This method may not be called but can be overloaded by derived
        pipelets. It is called by @@Set.._update()
        
        An implementation must emit two operations on the transaction,
        typically one __emit_remove() followed by one __emit_add(), or use
        emit_nothing() and add_operations() appropriately to adjust the count
        of operations that determines when the transaction is complete.
        
        The default implementation invokes _add_value() and _remove_value()
        and attempts to recombine emmited values as follows:
        
        Derived classes may implement _add_value( t, value ) and
        _remove_value( t, value ), emitting operations on the transaction (t)
        parameter using the following transaction methods only:
        - __emit_remove( removes, emit_now )
        - __emit_update( updates, emit_now )
        - __emit_add   ( adds   , emit_now )
        - emit_nothing()
        - add_operations( count )
        
        For more information on these methods, read Transaction documentation.
        
        __emit_remove() and __emit_add() are combined into an __emit_update()
        if all of the following conditions are met:
        1) __emit_remove() is first invoked with a one and only one value and
          with a falsy emit_now flag.
        
        2) __emit_add() is invoked after __emit_remove() and with a one and
          only one value (it may have a truly emit_now).
        
        3) add_operations() is not invoked before __emit_add()
        
        4) emit_nothing()   is not invoked before __emit_add()
        
        5) __emit_update()  is not invoked before __emit_add()
        
        6) __emit_remove()  is not invoked a second time before __emit_add()
        
        In all other cases, operations on the transaction are emitted in the
        same order as received, are not combined into updates, but the first
        __emit_remove() will be delayed if it satisfies the first test above
        and until another operation that fails one of the tests 2 to 6 above.
        
        When an __emit_update() is combined, it is emited when __emit_add() is
        invoked (rule 2). The flag emit_now used has the same value than that
        of __emit_add().
    */
    _update_value: function( t, removed, added, move ) {
      var that = this, remove, ___;
      
      // Transaction proxy
      // Transforms non-immediate emissions of a removed value followed by an added value into an updated value
      // Any other combination of operations prevents the update transformation
      var _t = {
        emit_nothing: function() {
          emit_remove();
          
          t.emit_nothing();
        }, // emit_nothing()
        
        __emit_remove: function( values, emit_now ) {
          if ( emit_now || values.length != 1 || remove != ___ ) {
            emit_remove();
            
            t.__emit_remove( values, emit_now );
          } else {
            remove = values[ 0 ];
          }
        }, // __emit_remove()
        
        __emit_add: function( values, emit_now ) {
          if ( remove && values.length == 1 ) {
            t.__emit_update( [ [ remove, values[ 0 ] ] ], emit_now );
            
            remove = 0; // 0 means that remove has been emitted already
            t.emit_nothing(); // for remove
          } else {
            emit_remove();
            
            t.__emit_add( values, emit_now );
          }
        }, // __emit_add()
        
        __emit_update: function( updates, emit_now ) {
          emit_remove();
          
          t.__emit_update( updates, emit_now );
        }, // __emit_update()
        
        add_operations: function( count ) {
          emit_remove();
          
          t.add_operations( count );
        } // add_operations()
      }; // _t, transaction proxy
      
      that._remove_value( _t, removed, false, move && move.from );
      that.   _add_value( _t, added  , false, move && move.to   );
      
      function emit_remove() {
        remove && t.__emit_remove( [ remove ] )
        remove = 0; // 0 means that remove has been emitted already
      } // emit_remove()
    }, // Set.._update_value()
    
    /* ------------------------------------------------------------------------
       _a_index_of( value )
       
       Lookup the position of a value in the set's current state.
       
       Generate optimized code using make_index_of() during first call.
       
       Returns:
         The position of the value in the set or -1 if not found.
    */
    _a_index_of: function( v ) {
      return this.make_index_of( 'a', '_a_index_of' )._a_index_of( v ); 
    }, // _a_index_of()
    
    /* ------------------------------------------------------------------------
       _b_index_of( value )
       
       Lookup the position of a value in the set's anti-state.
       
       Generate optimized code using make_index_of() during first call.
       
       Returns:
         The position of the value in the set or -1 if not found.
    */
    _b_index_of: function( v ) {
      return this.make_index_of( 'b', '_b_index_of' )._b_index_of( v ); 
    }, // _b_index_of()
    
    /* ------------------------------------------------------------------------
       make_index_of( state, method )
        
       JIT Code Generator for _x_index_of() from this._key
       
       Generated code is tied to current key. Uses unrolled while for maximum
       performance.
       
       Parameters:
       - state: (String) 'a' or 'b' to reference the current state or anti-
         state of the set.
       - method: (String) the name of the method to generate
       
       ToDo: add optional "flow" and "_v" (version) attributes to key
    */
    make_index_of: function( state, method ) {
      var key = this._key, l = key.length;
      
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
        //.trace()
        .get()
      ;
      
      eval( code );
      
      return this;
    } // make_index_of()
  } ); // Set instance methods
  
  /* -------------------------------------------------------------------------------------------
     unique_set( [values], [options] )
     
     A set which values are unique and for which duplicates are discarded.
     
     When duplicates are found, they are emitted in bulk in the 'error' flow unless option
     silent is true, with the error code 'DUPLICATE_KEY'. This may be used by a downstream
     pipelet to remove duplicates.
     
     Parameters:
     - values (Array of Objects): initial values for set
     - options (Optional Object):
       - silent (Boolean): do not emit errors, discard duplicates silently, default is false
       
     ToDo: add tests for unique_set()
  */
  function Unique_Set( values, options ) {
    Set.call( this, values, options );
  }
  
  Set.Build( 'unique_set', Unique_Set, {
    _add: function( values, options ) {
      var l = values.length
        , added = []
        , duplicates = []
        , i = -1
      ;
      
      while ( ++i < l ) {
        var v = values[ i ];
        
        ( v.flow === 'error' || this._a_index_of( v ) === -1 ? added : duplicates )
          .push( v )
        ;
      }
      
      if ( duplicates.length && ! this._options.silent ) {
        de&&ug( this._get_name( '_add' ) + 'discard duplicates, identities:', duplicates.map( this.make_key.bind( this ) ), ', key:', this._key );
        
        // Add an error the first time
        Set.prototype.__emit_add.call( this, [ {
          flow: 'error',
          code: 'DUPLICATE_KEY',
          error_flow: v.flow, // that of the first duplicate
          operation: 'add',
          sender: options && options.sender,
          key: this._key,
          values: duplicates
        } ], options );
      }
      
      return Set.prototype._add.call( this, added, options );
    } // _add()
  } ); // Unique_Set instance methods
  
  /* -------------------------------------------------------------------------------------------
     set_flow( flow_name, options )
     
     Sets the flow attribute of all values in the dataflow.
     
     Parameters:
       - flow_name: (String) the name of the flow to set for objects of this dataflow. All
         values added or removed are altered to add the attrinute 'flow' with this string.
         
         Values which already have a flow will be modified as the flow name always replaces
         any prior flow name, unless the flow name was 'error' to allow to propagate errors
         downstream.
         
     Example:
     
       rs.set( [
           { fist_name: 'Joe'    , last_name: 'Black'   },
           { fist_name: 'William', last_name: 'Parrish' },
           { fist_name: 'Susan'  , last_name: 'Parrish' }
           { flow: 'error', message: 'not found' }
         ] )
         .set_flow( 'roles' )
       ;
       
       Will produce the set:
         [
           { fist_name: 'Joe'    , last_name: 'Black'  , flow: 'role' },
           { fist_name: 'William', last_name: 'Parrish', flow: 'role' },
           { fist_name: 'Susan'  , last_name: 'Parrish', flow: 'role' }
           { flow: 'error', message: 'not found' }
         ]
  */
  rs.Compose( 'set_flow', function( source, flow, options ) {
    de&&ug( 'set_flow(), flow: ' + flow + ', options:', options );
    
    return source.alter( set_flow_transform
      , extend_2( { query_transform: set_flow_query_transform }, options )
    );
    
    function set_flow_transform( value ) {
      // ToDo: handling error flow will be deprecated if global error dataflow is adopted
      if ( value.flow != 'error' ) value.flow = flow;
    }
    
    function set_flow_query_transform( term ) {
      switch( term.flow ) {
        case flow:
          term = extend_2( {}, term );
          
          delete term.flow;
        // fall-through
        
        case undefined:
        case 'error':
        return term;
      }
      
      // ignore this term, it will never match an output from this pipelet
      return;
    } // set_flow_query_transform()
  } ); // set_flow()
  
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
  rs.Compose( 'auto_increment', function( source, options ) {
    de&&ug( 'auto_increment(), options:', options );
    
    var attribute = options.attribute || options.key[ 0 ] || 'id'
      , last      = options.start     || 0
    ;
    
    de&&ug( 'auto_increment(), attribute: ' + attribute + ', start: ' + last );
    
    var input = source.namespace().alter( function( v ) {
      var ai = v[ attribute ];
      
      if ( ai ) {
        if ( ai > last ) last = ai;
      } else {
        v[ attribute ] = ++last;
      }
    }, extend( {}, options, { name: options.name + '_alter' } ) );
    
    // Use a set() on the output to prevent re-incrementation through _fetch().
    
    var output = input.set( [], options );
    
    return source.encapsulate( input, output, options );
  } ); // auto_increment()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet trace( name, options )
      
      @short Trace pipelet methods
      
      @description:
        trace() helps debug Toubkal dataflows by showing exchanges at a given point of
        interest.
        
        This is a @@stateless, @@synchronous, @@lazy pipelet.
        
        It will only trace when downstream pipelet is non-lazy so if trace() is the last pipelet
        of a @@pipe, one needs to add @@greedy() right after it, e.g. to trace all authorized
        dataflows coming from a server:
        
        ```javascript
          rs.socket_io_server()
            .trace( 'socket_io_server' )
            .greedy()
          ;
        ```
      
      @parameters:
      - name (String): a name for all traces.
      
      - options (Object): optional attributes:
        - counts_only (Boolean, default false): only provide counts of values from operations
        - include (Array of Strings): attributes to include, exclusively.
        - exclude (Array of Strings): attributes to exclude, ignored if include provided.
        
        - All other options are booleans controlling which pipelet methods are traced:
          - all                 (Boolean, default false): trace everything
          - add_source          (Boolean, default false): trace _input.add_source()
          - remove_source       (Boolean, default false): trace _input.remove_source()
          - fetch               (Boolean, default false): trace _input._fetch()
          - fetched             (Boolean, default true ): trace _input._fetch#receiver()
          - _add_destination    (Boolean, default false): trace _output._add_destination()
          - _remove_destination (Boolean, default false): trace _output._remove_destination()
          - update_query        (Boolean, default false): trace _output.update_upstream_query()
          - add                 (Boolean, default true ): trace _add()
          - remove              (Boolean, default true ): trace _remove()
          - update              (Boolean, default true ): trace _update()
          - clear               (Boolean, default true ): trace _clear()
      
      @api alpha
  */
  function Trace( name, options ) {
    options = extend( {
      add_source         : false,
      remove_source      : false,
      fetch              : false,
      fetched            : true,
      _add_destination   : false,
      _remove_destination: false,
      update_query       : false,
      add                : true,
      remove             : true,
      update             : true,
      clear              : true
    }, options, options.all && {
      add_source         : true,
      remove_source      : true,
      fetch              : true,
      _add_destination   : true,
      _remove_destination: true,
      update_query       : true
    } );
    
    var that         = this
      , Super_Input  = Pipelet.Input.prototype
      , Super_Output = Pipelet.Output.prototype
    ;
    
    Pipelet.call( that, { name: options.name = name, key: options.key } );
    
    var include = options.include
      , exclude = options.exclude
      , ___
    ;
    
    if ( include ) {
      that._replacer = include;
    } else if ( options.exclude ) {
      that._replacer = function( key, value ) {
        return exclude.indexOf( key ) != -1 ? ___ : value; 
      }
    }
    
    de&&ug( 'Trace', { include: include || 'all', exclude: exclude || 'none' } );
    
    if ( options.fetch || options.fetched ) that._input._fetch  = fetch;
    if ( options.update_upstream_query    ) that._output.update_upstream_query = update_upstream_query;
    
    // Generate add, remove, update, clear
    [ 'add', 'remove', 'update', 'clear' ].forEach( function( operation, i ) {
      if ( options[ operation ] )
        that[ '_' + operation ] = function( values, _options ) {
          if ( i < 3 ) { // add, remove, update
            log( operation, {
              values : options.counts_only ? values.length : values,
              options: _options
            } );
          } else { // clear
            log( operation, { options: values } )
          }
          
          return that[ '__emit_' + operation ]( values, _options );
        }
    } );
    
    // Generate add_source(), remove_source(), _add_destination(), _remove_destination()
    generate( 'add'    , 'source'     , that._input , Super_Input );
    generate( 'remove' , 'source'     , that._input , Super_Input );
    generate( '_add'   , 'destination', that._output, Super_Output );
    generate( '_remove', 'destination', that._output, Super_Output );
    
    function generate( operation, name, plug, Super ) {
      var method_name = operation + '_' + name;
      
      if ( options[ method_name ] )
        plug[ method_name ] = function( plug, options ) {
          var o = {};
          
          o[ name ] = plug._get_name();
          o.options = options;
          
          log( method_name, o );
          
          Super[ method_name ].call( this, plug, options );
        }
    } // generate()
    
    function log( method, object ) {
      options[ method ]
        && RS.log( that._get_name( method ), JSON.stringify( object, that._replacer, '  ' ) )
      ;
    } // log()
    
    function fetch( receiver, query ) {
      var name   = 'fetch'
        , that   = this
        , source = that.source
      ;
      
      log( name, { source: source && source._get_name(), query: query } );
      
      source
        ? Super_Input._fetch.call( that, rx, query )
        : rx( [], true, true ); // No source, so this is an empty set
      ;
      
      return that;
      
      function rx( values, no_more, no_source ) {
        log( name + 'ed', {
          query    : query,
          values   : options.counts_only ? values.length : values,
          no_more  : no_more,
          no_source: no_source
        } );
        
        receiver( values, no_more );
      } // rx()
    } // fetch()
    
    function update_upstream_query( changes, input ) {
      log( 'update_upstream_query', { removes : changes[ 0 ], adds: changes[ 1 ], input: input._get_name() } );
      
      Super_Output.update_upstream_query.call( this, changes, input );
    } // update_upstream_query()
  } // Trace()
  
  Pipelet.Build( 'trace', Trace );
  
  /* -------------------------------------------------------------------------------------------
     delay( delay, options )
     
     Intented Purposes:
       - Simultate a distant pipelet by introducing a delay in all operations and _fetch().
       - Test assynchronous behavior of pipelets.
     
     Parameters:
       - delay: (Int) the delay in miliseconds
  */
  function Delay( delay, options ) {
    var that = this;
    
    Pipelet.call( that, options );
    
    that._input._fetch  = input_fetch;
    that._output.update_upstream_query = update_upstream_query;
    
    that.delay = delay;
    
    de&&ug( 'new Delay(): delay: ' + delay + ' ms' )
    
    function input_fetch( receiver, query ) {
      var that = this;
      
      // Delay the call to _fetch() to simultate a full round-trip to a server
      setTimeout( function() {
        Pipelet.Input.prototype._fetch.call( that, _receiver, query )
      }, delay );
      
      return that;
      
      // A delayed receiver
      function _receiver( values, no_more ) {
        setTimeout( function() {
          receiver( values, no_more )
        }, delay )
      }
    } // input_fetch()
    
    function update_upstream_query( changes, input ) {
      var that = this;
      
      setTimeout( function() {
        Pipelet.Output.prototype.update_upstream_query.call( that, changes, input )
      }, delay );
    } // update_upstream_query()
  } // Delay
  
  Pipelet.Build( 'delay', Delay, function() {
    function defer( that, operation, values, options ) {
      setTimeout( function() {
        that.__emit( operation, values, options );
      }, that.delay );
      
      return that;
    }
    
    return {
    
    _add: function( values, options ) {
      return defer( this, 'add', values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      return defer( this, 'remove', values, options );
    }, // _remove()
    
    _update: function( updates, options ) {
      return defer( this, 'update', updates, options );
    }, // _update()
    
    _clear: function( options ) {
      return defer( this, 'clear', void 0, options );
    } // _clear()
  } } ); // Delay instance attributes
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Plug'             : Plug,
    'Pipelet'          : Pipelet,
    'Encapsulate'      : Encapsulate,
    'Pass_Through'     : Pass_Through,
    'Controllet'       : Controllet,
    'Union'            : Union,
    'Dispatch'         : Dispatch,
    'Greedy'           : Greedy,
    'Alter'            : Alter,
    'Set'              : Set,
    'Unique_Set'       : Unique_Set,
    'Trace'            : Trace,
    'Delay'            : Delay
  } );
  
  de&&ug( "module loaded" );
  
  return rs; // global
} ); // pipelet.js
