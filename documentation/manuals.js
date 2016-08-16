/*  manuals.js
    
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
*/

/* ------------------------------------------------------------------------------------------------
    @manual introduction
    
    @short Introduction
    
    @description:
    ## What is Toubkal?
    
    Toubkal is a JavaScript dataflow library for the rapid developpement of higher-performances
    reactive, distributed, and concurrent, systems and applications.
    
    Toubkal provides architecture-level abstractions simultaneously delivering high-productivity
    (10+ times less code) and higher-performances (lower CPU usage, low bandwidth usage, low
    latency).
    
    Toubkal runs on EcmaScript 5+ interpretors such as NodeJS, web browsers and mobile web views.
    
    ### Higher-level Abstractions
    
    Toubkal provides higher-level abstractions than any other reactive library currently available
    allowing to reduce systems complexity while providing higher performances:
    - Pipelets
    - Pipelines
    - Reactive Sets
    - Reactive Queries
    - Concurent Dataflow Synchronization using Transactions
    - Error Routing and Reverting
    
    #### Reactive Sets
    
    Toubkal programs handle reactive sets of values. This allows to define an general purpose
    reactive API using very few operations: add, remove, update, fetch and subscribe.
    
    This high-level API simplifies greatly the connection between components simplifying
    interoprabilty.
    
    As such Toubkal can be used as glue between components designed with otherwise incompatible
    paradygms.
    
    
    #### Reactive Queries
    
    Queries are used in fetch and subscribe opeations to retrieve and subscribe to subsets of
    sets provided by upstream pipelets.
    
    Toubkal queries are described using sets of terms which allows Toubkal queries to be provided
    as dataflows.
    
    
    #### Concurent Dataflow Synchronization using Transactions
    
    Transactions are a unique and essential feature of Toubkal allowing synchronization
    of concurent dataflows and providing consistency information to downstream pipelets.
    
    The ending of transactions provide an equivalent to imperative programming end-of-loop
    information.
    
    #### Error Routing and Reverting
    
    
    ----
    
    Why another JavaScript library?
    ------------------------------
    Toubkal came out of more than ten years of experience developing realtime web
    applications where the main problems were:
      - the lack of an existing libraries to develop efficiently reactive applications,
      - the complexity to handle data authorizations for multi-user enterprise applications,
        even more so in realtime,
      - the impedance mismatch between front-end, back-end programming, and the SQL language,
      - backend scalability to serve millions of users, or more,
      - high availability,
      - asynchronous programming callback hell
      - many bugs difficult to reproduce and fix due to the complexity of asynchronous
        operations.
    
    Toubkal addresses all these issues, providing high-performance and high code
    productivity through the use of a dataflow programming model running on both the server
    and clients, providing full-featured database services available everywhere.
    
    Toubkal was inspired by Unix(tm) pipes which provide a type of dataflow programming, and the SQL
    language that manipulates datasets very consilely and efficiently in particular with no
    loops.
    
    Definitions and Concepts:
    ------------------------
    
    Set:
    ---
    A Toubkal Set is a collection of JavaScript Objects.
    
    A trivial implementation of a Set uses an Array of JavaScript Objects such as:
    
    ```javascript
      [
        { id: 1, city: "New York" },
        { id: 2, city: "San Francisco" }
      ]
    ```
    
    Dataflow, and Pipelets:
    ----------------------
    Unix(tm) pipes allow a type of dataflow programming where text lines flow through programs,
    and where the output of each program produces a new set of lines, e.g.:
    
    ```
      tail -f http.log | grep wikipedia.org
    ```
    
    Where tail produces the http.log file in realtime as it is modified, and where grep filters
    the lines that contain the text "wikipedia.org" to produce the set of lines referencing
    that site in realtime.
    
    Likewise, Toubkal uses a dataflow model where JavaScript Objects flow through Pipelets, and
    where the output of each Pipelet produces a new Toubkal Set, e.g.:
    
    ```javascript
      var new_york_sales_by_year = sales
        .filter( { city: "New York" } )
        .aggregate( [ { id: sales } ], [ { id: year } ] )
      ;
    ```
    
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
    
    SQL      | Toubkal Pipelet | Pipelet behavior notes
    ---------|-----------------|------------------------------------------------------------
    Where    | filter()        | Selects a subset of objects from the source dataflow
    Group By | aggregate()     | Groups measures by dimensions
    Order By | order()         |
    Join     | join()          | Inner, left, right, and outer joins 2 dataflows
    Select   | alter()         | Outputs an altered dataflow but with same number of objects
    
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
    
    Transactions:
    ------------
    Operations can be combined to form transactions using a '_t' transaction options Object
    with attributes:
    - id: a UUIDv4 allowing to differentiate transactions
    - more: indicate that more operations will follow as part of this transaction.
      A 'no-more' condition is reached if the 'more' option is set to the boolean value 'false'
      or if the not present. Therefore, by default, when no options are provided, operations
      are the final operation of single-operation transactions.
    - forks: and Array of fork tag strings for each tagged fork this transaction has been
      through. Fork tags are added at pipelets having a 'fork_tag' option and are removed
      at pipelets having a matching 'tag' option.
    
    Example:
    
     ```javascript
     2016/03/05 09:57:57.570 - Trace( counters )..remove(),  {
       "values": [
         {
           "id": "1",
           "last": 32,
           "description": "starts at 25",
           "flow": "counters"
         }
       ],
       "options": {
         "_t": {
           "forks": [
             "next"
           ],
           "id": "412d58f7-292e-450a-be0d-ef9d2ed7b691",
           "more": true
         }
       }
     }
     ```
    
    Transactions can start only once and terminate only once at all pipelets. If a transaction
    terminates more than once, an Error may be thrown. This error can be due to either:
    - improper handling of transactions by a pipelet which should never happen if transactions
    are handled using the transactions API.
    - untagged forks when concurent transactions reunite downstream at a @@union()
    
    Transactions must all terminate as non-terminated transactions could cause memory leaks.
    A future pipelet may force-terminate transactions on timeout, possibly generating errors
    allowing to revert previously processed operations.
    
    Tagged Transactions must be forwared downstream by all pipelets. If a pipelet does not
    forward a tagged transaction it will prevent it's termination at unions.
    
    
    The 'more' option along with its 'id' option must be propagated by all pipelets
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
    
    This is typically how unix pipes operate.
    
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
    
    #### Stateless and Stateful Pipelets:
    
    There are two main types of pipelets: @@stateless pipelets that do not
    hold the state of sets, and @@stateful pipelets that do hold a state.
    
    Stateless pipelets are very simple to implement, typically by @@composition
    of other stateless pipelets such as @@pipelet:alter(), @@pipelet:map(),
    @@pipelet:flat_map().
    
    Stateful pipelets may be more complex to implement if they cannot be
    @@[composed](@@composition), and may require to derive from a class
    such as @@class:Pipelet which is stateless but is the base of all
    pipelets, or @@class:Set which is the base class for stateful
    pipelets and the class of pipelet @@pipelet:set().
    
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

/* ----------------------------------------------------------------------------
    @manual glossary
    
    @short Glossary of Terms
    
    @description:
    Terms required to understand Toubkal concepts and documentation.
    
    Most important terms:
    - @@pipelet
    - @@dataflow
    - @@pipelet
    - @@namespace
*/

/* ----------------------------------------------------------------------------
    @manual architect
    
    @short Architect Manual
    
    @description:
    This manual is for application developpers using existing
    @@[pipelets](pipelet).
    
    For the developpement of pipelets, refer to the
    @@[Pipelet Programer's Guide](manual:guide).
*/

/* ----------------------------------------------------------------------------
    @manual reference
    
    @short Application Architect Reference
    
    @description:
    This manual contains the detailed documentation of all
    @@[pipelets](pipelet).
*/

/* ----------------------------------------------------------------------------
    @manual guide
    
    @short Pipelet Programer's Guide
    
    @description:
    
    ## Pipelet Design Guidelines
    
    ### Introduction
    
      Pipelet design is an essential process that helps reuseability but can also constrain the
      architecture of applications. As such it is important to think about this part of the
      design even more carefully than the implementation. The later is easier to fix that the
      specification of components once they are used in applications.
    
    ### Behavior
    
      Each pipelet should have a clear and simple behavior. More complex behaviors can be built
      easily using Compose().
      
      Always prefer stateless pipelets, using alter(), map(), flat_map(), as stateless pipelets
      can be distributed easily and have the smallest memory footprint.
      
      Design stateful pipelets only when there is no other option.
      
    ### Naming
    
      Arguably, the most important part of pipelet design is to give it a good name.
      
      It should have the following qualities: be descriptive, non-deceptive, and easy to
      remember.
      
      If the name is hard to come by, it may be because either the pipelet is doing too many
      things and should be split into several pipelets, or that its behavior is not clear.
      Therefore naming difficulties can help reconsider the actual service provided by the
      pipelet.
      
      In addition to that the name should be prefixed with the name of the module to prevent
      collisions, e.g. bootstrap_carousel() for the carousel pipelet of the bootstrap module.
      
    ### Parameters and Options
    
      All optional parameters should go into the last parameter object of the pipelet, the
      'options' parameter that is also handled by set_default_options().
      
      No mandatory parameters should be included into the options parameter.
      
    ### Pipelet Options vs Independent Pipelets
    
      Instead of using options, anything that can be implemented as a pipelet should be,
      unless there are significant performance issues. Options should be reserved for things
      that cannot be implemented as pipelet or when significant performance issues require
      merging features into the same pipelet.
      
      Example, at some point we had a set_flow option for set(). This option is supposed to
      be used on few pipelets, but yet was cluttering the code for set(). By extracting the
      code into a set_flow() pipelet, the clutter has been removed, performance improved for
      all other sets, maintainability was improved and this was implemented in fewer lines
      of code and providing a lazy behavior that could not be implement easily as an option.
      
    ### Documentation
    
      No pipelet is reusable unless it is properly documented.
      
      Documentation can be provided in source code comments, next to implementation and can
      be extracted using the documentation() pipelet to produce application and systems
      manuals.
      
      Documentation should include:
        - the name of the pipelet as a function with its parameters
        - the description of all parameters, documenting defaults for optional parameters
        - the description of the expected incoming dataflow
        - the description of outgoing dataflow
*/

/* ----------------------------------------------------------------------------
    @manual programmer
    
    @short Pipelet Programmer's Reference
    
    @description:
    This manual contains the detailed documentation of all
    classes methods to help program @@[pipelets](pipelet).
*/

/* ----------------------------------------------------------------------------
    @manual internal
    
    @short Internals
    
    @description:
    This manual contains internals classes, methods and functions used for
    the implementation of Toubkal.
*/

/* ----------------------------------------------------------------------------
    @term pipelet
    
    @short A @@dataflow processor
    
    @description:
    
    A pipelet is the basic building block for a @@(pipeline).
    
    From a programming standpoint a pipelet is a factory function creating
    @@class:Pipelet instances, connecting such instances to @@upstream
    and @@downstream pipelets.
    
    A pipelet instance processes @@[operations](operation) (data change
    events) from an @@upstream Pipelet instance and emits data change events
    to @@dowstream Pipelet instances.
*/

/* ----------------------------------------------------------------------------
    @term dataflow
    
    @short A stream of @@[operations]operation (dataset change events)
    
    @description:
    
    A Toubkal dataflow is a stream of events on a dataset.
    
    These change events can be either an @@add, @@remove, or @@update
    @@(operation).
    
    A Toubkal dataflow has synchronization points marked by the boundaries
    of @@transaction objects grouping multiple operations as changes that
    are related to a source cause.
    
    A dataflow flows from an @@upstream @@pipelet to a @@downstream pipelet.
    
    Toubkal dataflows are requested by @@fetch and @@subscribe operations
    from @@downstream pipelets to @@upstream pipelets.
*/

/* ----------------------------------------------------------------------------
    @term pipeline
    
    @short A JavaScript expression assembling @@pipelet instances.
    
    @examples:
    
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
    
    @description:
    A pipeline is a JavaScript expression starting with a @@namespace,
    typically @@namespace:rs, followed by pipelet factory calls.
    
    Executing a pipeline instanciates pipelets that stay connected and
    process a @@dataflow until either the end of the process or the
    explicit tear-down of the pipeline in whole or in parts.
    
    A Toubkal program is composed of one or more pipelines.
*/

/* ----------------------------------------------------------------------------
    @term namespace
    
    @short:
    A repository of @@pipelets, @@singletons, @@multitons, and @@outputs names
    
    @description:
    
    A namespace such as @@namespace:rs, the root namespace, allows to start
    a @@(pipeline).
    
    A namespace can have children namespaces which can access its names, but
    are isolated from each other in scope-tree fashion.
    
    To create a child namespace use the @@method:Pipelet..create_namespace()
    method.
    
    All @@pipelet instances are associated with a namespace. To retrieve this
    namespace use the @@method:Pipelet..namespace() method.
    
    To set the namespace at a pipelet instance in a pipeline, use the
    @@method:Pipelet..set_namespace() method.
    
    To debug issues with namespaces use
    @@method:Pipelet..log_namespace( name ).
*/

/* ----------------------------------------------------------------------------
    @term stateless
    
    @short A @@pipelet holding no state information in memory
    
    @description:
    
    A stateless pipelet does not hold any state between @@(operation)s
    and can be seen as purely functional, i.e. the same input value will
    always result in the same emitted value.
    
    The state of these pipelets is therefore virtual and does not require
    any memory to store values.
    
    The memory footprint of a stateless pipelet does not depend on the
    size of the set it describes, implying that these pipelets are for
    the most part CPU-bound.
    
    The order in which operations are processed does not matter and it
    can therefore be distributed horizontally.
    
    Examples of stateless pipelets include @@pipelet:union(),
    @@pipelet:filter(), @@pipelet:alter(), @@pipelet:map(),
    @@pipelet:flat_map().
    
    Stateless pipelets are typically built by @@composition of other
    stateless pipelets.
    
    Stateless pipelets may also be built by deriving the @@class:Pipelet
    class an must then implement the @@method:Pipelet..__transform()
    method that returns values as transformed or filtered. This method
    is then used by @@method:Pipelet.._add(), @@method:Pipelet.._remove(),
    and @@method:Pipelet.._update() @@operation methods to produce the
    desintation set plus the @@method:Plug.._fetch() method invoqued when
    a destination pipelet connects its source to a stateless pipelet.
    
    Stateless pipelets managing mulitple sets simultaneously, are
    encouraged to the "flow" attribute to differentiate between sets.
    Pipelets @@pipelet:flow() and @@pipelet:set_flow(), respectively
    filter and set the "flow" attribute.
*/

/* ----------------------------------------------------------------------------
    @term stateful
    
    @short A @@pipelet holding its state in memory or other storage
    
    @description:
    
    A stateful pipelet maintains the state of the set either in memory, in
    mass storage, or any other API that provides a storage behavior.
    
    Stateful pipelets must implement @@method:Plug..fetch_unfiltered(),
    @@method:Pipelet.._add(), @@method:Pipelet.._remove(),
    @@method:Pipelet.._update(), and @@method:Pipelet.._clear() and
    propagate their state forward using __emit_xxx() methods where xxx is
    one of "add", "remove", "update", or "clear".
    
    This can be achieved by deriving from the stateful base class
    @@(class:Set).
    
    Stateful pipelets must either implement an @@antistate or memorize
    all operations. The Set base class implements an antistate in memory.
*/

/* ----------------------------------------------------------------------------
    @term synchronous
    
    @short A @@pipelet that emits data synchronously on source events
    
    @description:
    Synchronous operation implies that when an @@operation is called, the
    pipelet will call internal methods then calling @@downstream pipelets
    operations before returning.
    
    Synchronous pipelets therfore offer the lowest latency, but increase
    stack usage.
    
    Examples of synchronous pipelets are @@pipelet:pass_through(),
    @@pipelet:alter(), @@pipelet:map(), @@pipelet:trace().
    
    @@[Composition](composition) of two synchronous pipelets results in
    a synchronous pipelet,
    
    Composition of a synchronous pipelet with an @@asynchronous pipelet
    results in an asynchronous pipelet.
*/

/* ----------------------------------------------------------------------------
    @term asynchronous
    
    @short A @@pipelet that enits data asynchronously on source events
    
    @description:
    An asynchronous @@operation waits for some function to call back the
    pipelet before it emits data to @@downstream pipelets.
    
    Therefore an asynchronous pipelet does not increase stack usage to
    perform its operations while its latency depends on the underlying
    asynchronous function called.
    
    An example of asynchronous pipelet is @@pipelet:delay().
    
    @@[Composition](composition) of an asynchronous pipelet with any other
    pipelet, @@synchronous or asynchronous, always results in an
    asynchronous pipelet.
*/    

/* ----------------------------------------------------------------------------
    @term greedy
    
    @short A @@pipelet that @@(subscribe)s to all its @@upstream events
    
    @description:
    
    Pipelets @@subscribe to @@upstream events using a @@query to limit the
    amount of data received from upstream.
    
    Greedy pipelets subscribe to upstream events as soon as they
    are instanciated in a @@(pipeline).
    
    Examples of greedy pipelets are @@pipelet:alter(), @@pipelet:map(),
    @@pipelet:set(), @@pipelet:greedy().
    
    @@[Composition](composition) of a greedy pipelet with any other
    pipelet, @@lazy or greedy, always results in a greedy pipelet.
*/

/* ----------------------------------------------------------------------------
    @term lazy
    
    @short A @@pipelet that @@(subscribe)s to no @@upstream events
    
    @description:
    
    Pipelets @@subscribe to @@upstream events using a @@query to limit the
    amount of data received from upstream.
    
    Lazy pipelets do not subscribe to upstream events when they are
    instanciated in a @@(pipeline). They only start subscribing to upstream
    events when @@downstream pipelets subscribe to some events.
    
    Lazy pipelets are essential when building efficient applications as
    they allow to control the amount of data processed by pipelines and
    limit to amount of data transmitted over networks, reducing both
    bandwidth usage and latency.
    
    The most efficient Toubkal networks are typically composed of @@greedy
    pipelets at edges and lazy pipelets withing the network, interconnecting
    greedy pipelets.
    
    Examples of lazy pipelets are @@pipelet:filter(), @@pipelet:flow(),
    @@pipelet:pass_through(), @@pipelet:union(), @@pipelet:cache(),
    @@pipelet:trace().
    
    @@[Composition](composition) of a lazy pipelet with another lazy pipelet
    results in a lazy pipelet. @@[Composition](composition) of a lazy pipelet
    with a @@greedy pipelet results in a greedy pipelet.
    
    When a lazy pipelet at the end of a pipeline is not connected to a
    downstream pipelet, it will never receive any events. This typically
    happens when one wants to trace events at the end of a pipeline.
    Because @@pipelet:trace() is lazy, it will not trace anything
    until connected to a downstream greedy pipelet. This is typically
    done by using the @@pipelet:greedy() pipelet.
    
    In the example bellow, a pipeline requests all documentation items
    from a server:
    
    ```javascript
    rs
      // Connect to server (lazily):
      .socket_io_server()
      
      // Limit subscription to documentation events (lazily):
      .flow( 'documentation' )
      
      // Trace all events going through here (lazily):
      .trace( 'all documentation events' )
      
      // Request everything (greedily) which is limited by flow():
      .greedy()
    ;
    ```
    
    Lazy pipelets are commutative because subscription @@[queries](query)
    are combined to subscribe to minimum number of upstream events.
    So the above can also be written:
    
    ```javascript
    rs
      // Connect to server (lazily):
      .socket_io_server()
      
      // Trace all events going through here (lazily):
      .trace( 'all documentation events' )
      
      // Limit subscription to documentation events (lazily):
      .flow( 'documentation' )
      
      // Request everything (greedily) which is limited by flow():
      .greedy()
    ;
    ```
    
    From an efficiency standpoint both versions are perfectly
    equivalent. The first one is easier to understand because
    the @@pipelet:flow() filter shows what @@pipelet:trace() will
    actually display.
*/

/* ----------------------------------------------------------------------------
*/

/* ----------------------------------------------------------------------------
*/

