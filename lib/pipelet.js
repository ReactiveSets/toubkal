/*  pipelet.js
    
    Pipelet core classes:
      - Plug / Input / Output
      - Pipelet: the current base of all pipelet classes having one input and one
        output plug
      - Controllet
      - Union: a Pipelet with n sources and one destination
      - Set: a stateful set implementation
      - Dispatch
      - Trace, Delay
    
    Also defines the 'xs' namespace for a fluid interface that acts as a singleton
    or a pseudo source.
    
    Copyright (C) 2013, 2014, Connected Sets

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
   an application we recommend the above indentation where each pipelet uses one or more
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
   
   Many sets per Pipelet, and the 'flow' Attribute:
   -----------------------------------------------
   Some pipelets may handle many sets simultaneously. This simplifies complex applications
   with many sets that can share some pipelets. This is typically the case for persistance,
   replication, charding, and dispatching pipelets.
   
   To differentiate between dataflows the 'flow' attribute is used, while the flow() pipelet
   allows to query operations for a single dataflow. The set_flow() pipelet allows to set
   the flow attribute.
   
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
     - XS.options_forward( options ): get transaction options from options
   
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
   the same value. This also implies that updates should always update the identity of
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
  var XS, uuid;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    
    require( './query.js'        );
    require( './transactions.js' );
    require( './code.js'         );
    
    uuid = require( 'node-uuid' );
  } else {
    XS = exports.XS;
    
    uuid = exports.uuid;
  }
  
  var log                 = XS.log
    , extend              = XS.extend
    , extend_2            = XS.extend_2
    , Root                = XS.Root
    , Dictionary          = XS.Dictionary
    , Code                = XS.Code
    , Query               = XS.Query
    , Query_Tree          = XS.Query_Tree
    , Event_Emitter       = XS.Event_Emitter
    , Transaction         = XS.Transaction
    , Transactions        = XS.Transactions
    , Input_Transactions  = XS.Input_Transactions
    , Output_Transactions = XS.Output_Transactions
    , Options             = XS.Options
    , options_forward     = Options.forward
  ;
  
  var push   = Array.prototype.push
    , slice  = Array.prototype.slice
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
     Plug( pipelet, name )
     
     Base class for Input and Output plugs.
     
     Input plugs are meant to be connected to Output plugs.
     
     Parameters:
     - pipelet (Object): a reference to the pipelet this plug is attached to.
       A pipelet must provide a _get_name( method ) method.
       
     - name (String): the name for this plug, used in traces
  */
  function Plug( pipelet, name ) {
    Event_Emitter.call( this );
    
    this.pipelet = pipelet;
    this.name = name;
  } // Plug()
  
  Event_Emitter.subclass( Plug, {
    /* ------------------------------------------------------------------------
       _get_name( [ method_name ] )
       
       Get the name string for this Plug pipelet instance typically as a helper
       for debug traces. Optionnaly, if a name is provided assume this is a
       method name.
       
       E.g.:
         this._get_name()          --> "set"
         
         this._get_name( '_fetch' ) --> "set._fetch(), "
    */
    _get_name: function( method ) {
      return this.name + ' - ' + this.pipelet._get_name( method );
    }, // _get_name()
    
    /* ------------------------------------------------------------------------
       error( method, message )
       
       ToDo: emit error trace.
       
       Reports errors to global error dataflow then throws.
       
       Parameters:
         - method (String): the name of the method where the error occured
         
         - message: an error message
    */
    error: function( method, message ) {
      message = this._get_name( method ) + message;
      
      // ToDo: report error to global error dataflow or error output
      
      throw new Error( message );
    } // error()
  } ); // Plug instance methods
  
  /* -------------------------------------------------------------------------------------------
     Input( pipelet, name )
     
     An input plug.
  */
  function Input( p, name ) {
    Plug.call( this, p, name || 'in' );
    
    // The source, aka upstream, pipelet
    this.source = null;
    
    // Source query for upstream pipelet
    this.query = null;
    
    // incomming subscriber index in current operation
    this.source_subscriber_index = 0;
    
    this.transactions = new Input_Transactions();
  } // Input()
  
  Plug.subclass( Input, {
    add: function( added, options ) {
      this.pipelet._add( added, options );
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      this.pipelet._remove( removed, options );
      
      return this;
    }, // remove()
    
    update: function( updated, options ) {
      this.pipelet._update( updated, options );
      
      return this;
    }, // update()
    
    clear: function( options ) {
      this.pipelet._clear( options );
      
      return this;
    }, // clear()
    
    notify: function( transaction, options ) {
      this.pipelet._notify( transaction, options );
      
      return this;
    }, // notify()
    
    /* ------------------------------------------------------------------------
       _transactions_remove_source( source )
       
       Removes a source output from all source transactions, if any.
       
       This method is called by this._remove_source( source ); with
       source._output if it is defined, to cleanup unterminated transactions
       from a source.
       
       !!! Warning:
       Unterminated transactions from a source should not happen when the
       source is disconnected.
       
       The current behavior is to terminate the transaction, later a warning
       condition will be emitted, and later-on unterminated transactions
       should most-likely be rolled-back.
       
       Parameters:
       - source (Output): the output source being removed.
       
       Returns this;
       
       ToDo: add tests for _transactions_remove_source()
    */
    _transactions_remove_source: function( source ) {
      var terminated_transactions_objects = this.transactions.remove_source( source.transactions )
        , name = de && this._get_name( '_transactions_remove_source' )
        , i = -1, t
      ;
      
      while ( t = terminated_transactions_objects[ ++i ] ) {
        // Terminate the transaction at this input
        
        // ToDo: add warning condition, removing pipelet connection in the middle of a transaction.
        // ToDo: rollback transaction instead of silently terminating it.
        // ToDo: verify fork is handled by remove_source() above
        this.add( [], { _t: t } );
      }
      
      return this;
    }, // _transactions_remove_source()
    
    /* ------------------------------------------------------------------------
       _add_source( source [, options ] )
       
       Adds a source to this pipelet:
       
         source ----> this
       
       The content of the source is then fetched and added to this pipelet
       unless this pipelet is lazy or option no_fetch is provided.
       
       Parameters:
       - source: (Array of Objects, or Output) to add as a source to this
         Input.
       
       - options (Optional Object):
         - no_fetch: do not fetch data from source to add values to this
           pipelet.
       
       ToDo: _add_source(), synchronization between __add_source_query() and __fetch_source_destination()
    */
    _add_source: function( source, options ) {
      if ( source.is_void ) return this;
      
      if ( source instanceof Output ) {
        // This is an Output
        this
          .__add_source_destination  ( source )
          .__add_source_query        ( source )
          .__add_source              ( source )
          .__fetch_source_destination( source, options )
        ;
      } else {
        // This should be an Array of objects
        this
          .__add_source              ( source )
          .__fetch_source_destination( source, options )
        ;
      }
      
      return this;
    }, // _add_source()
    
    /* ------------------------------------------------------------------------
       _remove_source( source, options )
       
       Severes the connection between upstream source pipelet and this pipelet.
       
         source --x--> this
       
       The content of source is then fetched and removed from this pipelet
       unless this pipelet is lazy or option no_fetch is provided.
       
       Parameters:
       - source: (Array of Objects, or Output) the source to remove
       
       - options:
         - no_fetch: do not _fetch the source to remove values from destination
       
       ToDo: tests for _remove_source and _remove_destination
    */
    _remove_source: function( source, options ) {
      if ( source.is_void ) return this;
      
      options = extend_2( { operation: 'remove' }, options );
      
      if ( source instanceof Output ) {
        // We have an Output object
        this
          .__fetch_source_destination ( source, options )
          .__remove_source            ( source )
          .__remove_source_query      ( source )
          .__remove_source_destination( source )
          ._transactions_remove_source( source )
          // ToDo: kill pending fetches between source and destination
        ;
      } else {
        // Array of Objects
        this
          .__fetch_source_destination( source, options )
          .__remove_source           ( source )
        ;
      }
      
      return this;
    }, // _remove_source()
    
    __add_source_destination: function( output ) {
      output.__add_destination( this );
      
      return this;
    }, // __add_source_destination()
    
    __remove_source_destination: function( output ) {
      output.__remove_destination( this );
      
      return this;
    }, // __remove_source_destination()
    
    /* ------------------------------------------------------------------------
       __add_source( source )
       
       Sets the source output for this input plug.
       
       This is a low-level method that should not be used by external objects
       because it does not add a destination to the source pipelet.
       
       Parameters:
         - source (Output): the source output to add or undefined to remove the source.
    */
    __add_source: function( source ) {
      var s = this.source;
      
      if ( s ) this.error( '__add_source', 'already has a source: ' + ( s._get_name ? s._get_name() : typeof s ) );
      
      this.source = source;
      
      return this;
    }, // __add_source()
    
    /* ------------------------------------------------------------------------
       __remove_source( source )
       
       Removes an upstream source output from this input.
       
       This is a low-level method that should not be called directly.
              
       Parameters:
         - source (Output): output to remove from this input
       
       Exception:
         - source is not a source of this input
    */
    __remove_source: function( p ) {
      if ( this.source !== p ) this.error( '__remove_source', 'this.source is not ' + p._get_name() );
      
      this.source = null;
      
      return this;
    }, // __remove_source()
    
    /* ------------------------------------------------------------------------
       _insert_source_union( [ name ] )
       
       Inserts a union as a source of this, switching a previous source of this
       if any.
       
       Parameters:
         name (Optional String): a pipelet name for the inserted union. The
           default name is composed from the name of this pipelet.
         
       Returns:
         The inserted union.
    */
    _insert_source_union: function( name ) {
      var no_fetch = { no_fetch: true } // Will just switch the connexion between source and union
        , source = this.source
      ;
      
      de&&ug( this._get_name( '_insert_source_union' )
        + 'source: ' + ( source && source._get_name ? source._get_name() : typeof source )
      );
      
      if ( source ) {
        this._remove_source( source, no_fetch );
      } else {
        source = xs;
      }
      
      var union = xs
        .union( [], { name: name || ( this._get_name() + ' (union)' ) } )
      ;
      
      union._add_source( source, no_fetch );
      
      union._add_destination( this, no_fetch );
      
      return union;
    }, // _insert_source_union()
    
    /* ------------------------------------------------------------------------
       __add_source_query( output )
       
       Low-level function to add this as a destination for this.query from
       output plug.
       
       May be overloaded to redirect to this downstream destinations as done
       by controllets.
       
       Parameters:
         source (Pipelet): to add query and destination to
    */
    __add_source_query: function( output ) {
      var q = this.query;
      
      q && output.query_update( [], q.query, this );
      
      return this;
    }, // __add_source_query()
    
    /* ------------------------------------------------------------------------
       __remove_source_query( output )
       
       Low-level function to remove this as a destination for this.query from
       output plug.
       
       May be overloaded to redirect to this downstream destinations as done
       by controllets.
       
       Parameters:
         output (Output): to add query and destination to
    */
    __remove_source_query: function( output ) {
      var q = this.query;
      
      q && output.query_update( q.query, [], this );
      
      return this;
    }, // __remove_source_query()
    
    /* ------------------------------------------------------------------------
       __fetch_source_destination( source, options )
       
       Fetch a source for this pipelet destinations if this is not lazy.
       
       This is a low-level function that should not be called directly but can
       be overloaded to allow redirections of the _fetch output other pipelets
       than this and as done by controllets.
       
       Parameters:
         - source:
           - (Output): implementing _transactional_fetch():
               the source output to _fetch from for a destination of this
               pipelet
           
           - Other: added or removed directly to this pipelet
           
         - options (Optional Object):
           - operation (String): Either 'add' or 'remove', default is 'add'.
           
           - _t (Object): a transaction Object
           
           - no_fetch (Boolean): don't do anything, return immediately
    */
    __fetch_source_destination: function( source, options ) {
      if ( this._is_lazy() || ( options && options.no_fetch ) ) return this; // Don't add or remove anything
      
      // Add data from source
      de&&ug( this._get_name( '__fetch_source_destination' ) + 'source: ' + ( source._get_name ? source._get_name() : typeof source ) );
      
      var q = this.query;
      
      if ( source._transactional_fetch ) {
        source._transactional_fetch( this, q && q.query, options );
      } else {
        // This source does not provide a _transactional_fetch method, it should be an Array
        // of JavaScript Objects containing a static set.
        //
        // This is typically used by control inputs.
        //
        if ( q ) source = q.filter( source );
        
        this[ ( options && options.operation ) || 'add' ]( source, options_forward( options ) );
      }
      
      return this;
    }, // __fetch_source_destination()
    
    /* ------------------------------------------------------------------------
       _is_lazy()
       
       Returns: (Boolean) true if lazy, false if not lazy.
    */
    _is_lazy: function() {
      var q = this.query;
      
      return ! ( q && q.query.length );
    }, // _is_lazy()
    
    update_upstream_query: function( removes, adds ) {
      var rl = removes.length, al = adds.length;
      
      if ( ! ( rl || al ) ) return this;
      
      var q = this.query, source = this.source;
      
      if ( q ) {
        rl && q.remove( removes );
        al && q.add   ( adds    );
      } else {
        // This pipelet has never fetched yet, it was lazy
        q = this.query = new Query( [] ); // Now this pipelet will no-longer be lazy
        
        rl && q.remove( removes ); // would throw
        al && q.add   ( adds    );
        
        q.adds.length || q.generate();
      }
      
      adds    = q.adds   ;
      removes = q.removes;
      
      if ( removes.length || adds.length ) {
        de&&ug( this._get_name( 'update_upstream_query' )
          + 'update source: ' + ( source ? source._get_name() : 'none' )
        );
        
        q.generate();
        
        source && source.query_update( removes, adds, this );
        
        q.discard_operations();
      }
      
      return this;
    }, // update_upstream_query()
    
    /* ------------------------------------------------------------------------
       __fetch_source( receiver [, query] )
       
       Fetches the content of the source of this input, possibly in chunks.
       
       Applies this input query on results.
       
       This method should not be called directly but may be overloaded.
       
       Parameters:
       - receiver: (Function) see _output._fetch() for definition
       - query (optional Array of Objects): see _output._fetch() for
         definition
    */
    __fetch_source: function( receiver, _query ) {
      var p = this.pipelet
        , s = this.source
        , q = this.query
        , name
      ;
      
      de&&ug( get_name( p ) + 'query: ' + log.s( _query ) );
      
      if ( s && q ) {
        // there is a source and a query
        var query = q.query
          , keys  = q.keys
          , ql    = query.length
        ;
        
        if ( 1 == ql && 0 == keys[ 0 ].length ) {
          // There is only one or-term and it has no keys, i.e. this is the pass-all term, it does not filter anything
          de&&ug( name + 'no filter' );
          
          s._fetch( rx, _query );
        } else {
          // ToDo: optimize nul query; also perform this.query AND _query before fetching source, removing the need for rx_filtered() bellow
          var filter = q.filter;
          
          de&&ug( name + 'filter query: ' + log.s( query ) );
          
          s._fetch( rx_filtered, _query );
        }
      } else if ( s ) {
        de&&ug( name + 'no query' );
        
        s._fetch( rx, _query );
      } else {
        de&&ug( name + 'no source' );
        
        receiver.call( p, [], true ); // No source, so this is an empty set
      }
      
      return this;
      
      function rx( values, no_more ) {
        receiver.call( p, values, no_more );
      } // rx()
      
      function rx_filtered( values, no_more ) {
        // de&&ug( '__fetch_source(), before filtering, values: ' + log.s( values ) + ', no_more: ' + no_more );
        
        if ( values && values.length ) values = filter( values );
        
        // de&&ug( '__fetch_source(), after filtering values with query: values: ' + log.s( values ) );
        
        if ( no_more || ( values && values.length ) ) receiver.call( p, values, no_more );
      } // rx_filtered()
      
      function get_name( that ) {
        return name || ( name = that._get_name( '__fetch_source' ) );
      } // get_name()
    }, // __fetch_source()
    
    __fetch_source_all: function( receiver, query ) {
      var p = this.pipelet, chunks = [], out, u;
      
      this.__fetch_source( rx_concat, query );
      
      if ( out === u && receiver === u ) this.error( 'fetch_source_all', 'is asynchronous and no receiver function was provided' );
      
      return out;
      
      // ToDo: dry code with _fetch_all()#rx_concat()
      function rx_concat( values, no_more ) {
        if ( out ) that.error( 'fetch_source_all', 'received extra chunck after no_more' );
        
        if ( values && values.length ) chunks.push( values );
        
        if ( no_more ) {
          out = concat.apply( [], chunks );
          
          receiver && receiver.call( p, out, no_more );
        }
      } // rx_concat()
    }, // __fetch_source_all()
    
    // Input Transactions methods, returning input transactions reference
    // Overloaded by Controllet.Input
    set_tag_branches: function( tag, count ) {
      return this.transactions.set_tag_branches( count );
    } // set_branches()
  } ); // Input instance methods
  
  /* -------------------------------------------------------------------------------------------
     Output( pipelet, name )
     
     An output plug.
  */
  function Output( pipelet, name ) {
    Plug.call( this, pipelet, name || 'out' );
    
    // Destinations, downstream inputs
    this.destinations = [];
    
    // Output transactions
    this.transactions = new Output_Transactions( this );
    
    // Output Query Tree router
    this.tree = new Query_Tree();
  } // Output()
  
  Plug.subclass( Output, {
    /* ------------------------------------------------------------------------
       _add_destination( destination [, options ] )
       
       Adds a destination input to this source output:
       
         this output ---> destination input
         
       The content of the this output is then fetched and added to destination
       input unless destination is lazy or option no_fetch is provided.
       
       Parameters:
         - destination: (Input) the destination input
         
         - options (Optional Object):
           - no_fetch: do not _fetch the source to remove
    */
    _add_destination: function( destination, options ) {
      de&&ug( this._get_name( '_add_destination' ) + 'destination: ' + destination._get_name() );
      
      destination._add_source( this, options );
      
      return this;
    }, // _add_destination()
    
    /* ------------------------------------------------------------------------
       _remove_destination( destination [, options ] )
       
       Severes the connection between this output and one of its destinations:
       
         this output --x--> destination input
       
       The content of this output is then fetched and removed from desintation
       input unless destination is lazy or option no_fetch is provided.
       
       Parameters:
         - destination: (Input) the destination input to _remove_destination
         
         - options (Optional Object):
           - no_fetch: do not _fetch the source to remove
    */
    _remove_destination: function( destination, options ) {
      destination._remove_source( this, options );
      
      return this;
    }, // _remove_destination()
    
    /* ------------------------------------------------------------------------
       __add_destination( input )
       
       Adds a destination input to this output.
       
       This is a low-level method that should not be used by external objects.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destination(s)
         - reject the addition by generating an exception.
         - trigger other actions on addition
         - redirect to another another pipelet (done by Encapsulate)
       
       Parameters:
         - input (Input): the destination input to add
         
       Exception:
         - input is already added to this output's destinations
    */
    __add_destination: function( input ) {
      var destinations = this.destinations
        , position = destinations.indexOf( input )
      ;
      
      if ( position != -1 ) this.error( '__add_destination', 'already added, input: ' + input._get_name() );
      
      destinations.push( input );
      
      return this;
    }, // __add_destination()
    
    /* ------------------------------------------------------------------------
       __remove_destination( input )
       
       Removes a destination input from this output plug.
       
       This is a low-level method that should not be used by external objects.
       
       Paramters:
         - input: the destination input to remove from this output destinations
         
       Exception:
         - input is not a known destination of this output
    */
    __remove_destination: function( input ) {
      var destinations = this.destinations
        , position = destinations.indexOf( input )
      ;
      
      if ( position == -1 ) this._error( '__remove_destination', 'not found, destination: ' + input._get_name() );
      
      destinations.splice( position, 1 );
      
      return this;
    }, // __remove_destination()
    
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query] )
       
       Fetches the content of this set, possibly in chunks.
       
       This is the stateless version, it must be overloaded by stateful
       pipelets.
       
       Parameters:
         - receiver (Function): will be called for each chunk of data in the
           context of this pipelet and which signature is:
             
             receiver( values, no_more ):
             - values: (Array) of values for each chunk
             
             - no_more: indicates the last chunk if truly
             
         - query (optional Array of Objects): where each object is the or_term
             for a Query.
       
       ToDo: receiver should accept operations (adds and removes) in a transaction
         for version control and fully stateless routing back to a persistent store
         of transactions. This refactoring will be done when implementing persistence
    */
    _fetch: function( receiver, query ) {
      var that = this, p = this.pipelet;
      
      p._input.__fetch_source( rx, query );
      
      return this;
      
      function rx( values, no_more ) {
        if ( values && values.length ) values = p.__transform( values, {}, 'fetch' );
        
        receiver.call( that, values, no_more );
      }
    }, // _fetch()
    
    /* ------------------------------------------------------------------------
       _transactional_fetch( destination, query [, options [, next ] ] )
       
       Fetch data for a receiver pipelet, limited by an optional query and
       possibly within a transaction defined in options.
       
       Parameters:
       - destination (Input): towards which adds (and eventually
         other operations) are emited
       
       - query (Optional Array of AND-expressions): limiting returned
         operations.
       
       - options (Optional Object): options for the transactional fetch
         - _t (Object): a transaction object:
           - id (String): transaction id of a larger transaction this
             _fetch is part of.
             
           - more (optional Boolean): true if this _fetch is part of a
             larger unfinished transaction.
             
           - other optional transaction attributes
         
         - operation (String): "add" or "remove", default is "add".
           
           This option is deleted after use.
         
         - count (Integer): the number of _fetch operations after this one.
           the default is 1. If the count provided is more than 1, a
           transaction will be passed on to the next() callback which
           must then be provided to allow the transaction to be finished.
           
           This option is deleted after use.
           
           See also 'transaction' option and next() optional parameter.
         
         - transaction (Transaction): a transaction from a previous
           _transactional_fetch() passed by next().
           
           This option is deleted after use.
           
           See also 'count' options and next() optional parameter.
       
       - next (Optional Function): callback right after calling _fetch to allow
           other _fetch operations in the same transaction to proceed
           with a transaction provided as the first parameter of next().
           This transaction must then be passed on to the next call of
           _transactional_fetch() using the 'transaction' options.
    */
    _transactional_fetch: function( destination, query, options, next ) {
      var that = this
        , transactions = this.pipelet._transactions
        , transaction
        , ended = false
        , count = 1
        , operation = "add"
        , o, _t
        , name = de && this._get_name( '_transactional_fetch#receiver' )
      ;
      
      if ( options ) {
        if ( options.operation ) {
          operation = options.operation;
          
          delete options.operation;
        }
        
        if ( options.transaction ) {
          transaction = options.transaction;
          
          o = transaction.get_emit_options();
          
          delete options.transaction;
        }
        
        if ( options.count ) {
          count = options.count;
          
          delete options.count;
        }
      }
      
      o || count == 1 || get_options( 2 );
      
      this._fetch( receiver, query );
      
      next && next( transaction );
      
      return this;
      
      function receiver( values, no_more ) {
        if ( ended ) {
          that.error( '_transactional_fetch', 'already ended, no_more received twice from _fetch()' );
        }
        
        de&&ug( name + log.s( { values: values.length, no_more: no_more } ) );
        
        if ( no_more ) {
          ended = true;
          
          if ( count == 1 ) {
            // This will be the last emission
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
        
        if ( values.length || ( _t && _t.id ) ) {
          destination[ operation ]( values, o );
        }
      } // receiver()
      
      function get_options( count ) {
        transaction || ( transaction = transactions.get_transaction( count, options ) );
        
        return o = transaction.next().get_emit_options();
      } // get_options()
    }, // _transactional_fetch()
    
    /* ------------------------------------------------------------------------
       _fetch_all( [ receiver [, query ] ] )
       
       Fetches the entire content of the source set.
       
       This method should only be used for debugging and testing purposes or
       when the full state is known to be 'small' (can fit entirely in memory)
       and the source fetched is always on the same thread.
       
       For large sets, use _fetch() instead that allows to retreive the content
       in 'reasonable' size chunks that require less memory.
       
       Parameters:
         - receiver (optional Function): see _fetch() for definition.
           
           This function must be provided if the source responds asynchronously
           to _fetch(). Otherwise an exception will be raised.
           
           !!! Warnning:
           It is highly recommanded to always provide the receiver function
           to future-proof programs. Not using a receiver should only be used
           for testing.
           
         - query (optional Array of Objects): see _fetch() for definition.
           
       Returns:
         Undefined: the source did not respond synchronously to _fetch()
           therefore the result cannot be known at the time when _fetch_all()
           returns.
         
         Array of values: the source responded synchronously to _fetch() and
           this are the values fetched.
         
       Exceptions:
         If the method is asynhronous, and no receiver function is provided,
         an exception will be raised.
         
         If a chunk is received after the last chunk was received.
    */
    _fetch_all: function( receiver, query ) {
      var that = this, p = this.pipelet, u, out, name;
      
      de&&ug( get_name() + 'query: ' + log.s( query ) );
      
      if ( this._fetch === Output.prototype._fetch ) {
        // _fetch has not been overloaded so this is a stateless pipelet
        // Can optimize using __fetch_source_all() to do a single transform
        p._input.__fetch_source_all( rx_all, query );
      } else {
        var chunks = [];
        
        this._fetch( rx_concat, query );
      }
      
      if ( out === u && receiver === u ) this.error( '_fetch_all', 'is asynchronous and no receiver function was provided' );
      
      return out;
      
      function rx_all( values, no_more ) {
        out = p.__transform( values, {}, '_fetch' );
        
        receiver && receiver.call( p, out, no_more );
      } // rx_all()
      
      function rx_concat( values, no_more ) {
        if ( out ) that.error( '_fetch_all', 'received extra chunck after no_more' );
        
        if ( values && values.length ) chunks.push( values );
        
        if ( no_more ) {
          out = concat.apply( [], chunks );
          
          receiver && receiver.call( p, out, no_more );
        }
      } // rx_concat()
      
      function get_name() {
        return name || ( name = that._get_name( '_fetch_all' ) );
      } // name()
    }, // _fetch_all()
    
    // ToDo: implement add and remove methods updating upstream query
    
    // ToDo: document query_update()
    query_update: function( removes, adds, input ) {
      // ToDo: guaranty synchronization between _fetch() and query_update()
      
      var rl = removes.length, al = adds.length;
      
      de&&ug( this._get_name( 'query_update' )
        + log.s( { removes: removes, adds: adds, input: input._get_name() } )
      );
      
      var tree = this.tree;
      
      rl && tree.remove( removes, input );
      al && tree.add   ( adds   , input );
      
      return this.update_upstream_query( removes, adds );
    }, // query_update()
    
    // ToDo: document update_upstream_query()
    // Overload to not update upstream query or update something else as this pipelet's input query
    update_upstream_query: function( removes, adds ) {
      // ToDo: this should call this.pipelet._query_update() that would allow to transform the query
      // before passing it to the pipelet default input
      this.pipelet._input.update_upstream_query( removes, adds );
      
      return this;
    }, // update_upstream_query()
    
    /* ------------------------------------------------------------------------
       emit( event_name, ... )
       
       Emit an event.
       
       If the event_name is one of _add, _remove, _update, or _clear, the event
       is propagated to downstream pipelets. The full signature of __emit is
       then:
         __emit( 'add'   , added    , options )
         __emit( 'remove', removed  , options )
         __emit( 'update', updates  , options )
         __emit( 'clear'            , options )
       
       All other events are not propagated to downstream pipelets and therefore
       must be listened directly on the pipelet using _on( event_name, listener )
       .
       
       Parameters:
         - event_name: (String) the name of the event
         - ...: other parameters to send to all listeners
       
       ToDo: move to Output which will become the Event_Emitter
    */
    emit: function( event_name, values, options ) {
      var t = options && options._t, more, tid;
      
      if ( t ) {
        more = t.more;
        tid  = t.id;
      }
      
      de&&ug(
          this._get_name()
        + '.emit( event_name: "' + event_name + '"'
        + ( values ? ', values: '         + values.length : '' )
        + ( more   ? ', more: '           + more          : '' )
        + ( tid    ? ', transaction_id: ' + tid           : '' )
        // + ', values: ' + log.s( values )
        + ' )'
      );
      
      // !! __emit even if values.length == 0 to transmit more flag to downstream pipelets
      this._route( event_name, values, options );
      
      this._emit_event( event_name, [ values, options ] );
      
      more || this._emit_event( 'complete', [ options ] );
      
      return this;
    }, // emit()
    
    // Route and emit using query tree, synchronized with concurrent pipelets
    _route: function( operation, values, options ) {
      var subscribers_operations = this.tree.route( operation, values )
        , i = -1, subscribers_operation
        , transactions = this.transactions
      ;
      
      /* subscribers_operations: (Array of Arrays), operations:
         - 0: (String) operation 'add', 'remove', 'update', or 'clear'
         - 1: (Array of Objects), for each subscriber input:
           - input: (Input) destination of this subscriber
           - v: (optional Array of Objects) values to emit for 'add', 'remove', and 'update'
           - t: (optional Object) transaction information:
             - count: (Integer, 2 or 3) number of operations in an update transaction for this destination
             - t: (Transaction) will be created bellow before the first operation
      */
      
      // Emit accumulated values to subscribers
      while ( subscribers_operation = subscribers_operations[ ++i ] ) {
        var operation   = subscribers_operation[ 0 ]
          , subscribers = subscribers_operation[ 1 ]
          , j = -1, r, input, t, transaction, o
          , clear = operation == 'clear'
        ;
        
        // Emit all subscribers' values
        while ( r = subscribers[ ++j ] ) {
          if ( t = r.t ) {
            // This is an update split in t.count (2 or 3) operations
            // ToDo: add tests
            
            // Get or create transaction
            if ( ! ( transaction  = t.t) ) {
              // Create the transaction
              transaction = t.t = new Transaction( t.count, options );
            }
            
            o = transaction.next().get_emit_options();
            
            if ( --t.count == 0 ) transaction.end();
          } else {
            o = options;
          }
          
          input = r.input;
          
          if ( input.transactions.tag ) {
            // There are concurrent transactions at that input
            // that need to be synchronized so that each transaction
            // terminates once and only once at this destination input
            
            o = transactions.get_concurrent_options( input.transactions, o );
          }
          
          if ( clear ) {
            input.clear( o );
          } else {
            input[ operation ]( r.v, o );
          }
        } // for all subscribers
      } // for all subscribers_operations
      
      return this;
    }, // _route()
    
    // ToDo: implement flow control methods _pause_destination() and _resume_destination()
    _pause_destination: function( destination ) {
      return this;
    },
    
    _resume_destination: function( destination ) {
      return this;
    },
    
    /* ------------------------------------------------------------------------
       on_change( listener, that, once )
       
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
             
         - listener: (Function) will be called with the parameters emited by
             the event emitter.
           
         - that: (Object) optional, the context to call the listener, if not
             specified the context is this event emitter's instance.
           
         - once: (Boolean) optional, if true, the event listener will be
             removed right before the first __emit on this event.
    */
    on_change: function( listener, that, once ) {
      this._on( 'add'   , function( v, o ) { listener.call( this, "add"   , v, o ) }, that, once );
      this._on( 'remove', function( v, o ) { listener.call( this, "remove", v, o ) }, that, once );
      this._on( 'update', function( v, o ) { listener.call( this, "update", v, o ) }, that, once );
      this._on( 'clear' , function( v, o ) { listener.call( this, "clear" , v, o ) }, that, once );
      
      return this;
    }, // on_change()
    
    on_complete: function( listener, that, once ) {
      return this._on( 'complete', listener, that, once );
    } // on_complete()
  } ); // Output plug instance methods
  
  /* -------------------------------------------------------------------------------------------
     Pipelet( options )
     
     A Pipelet processes one upstream source dataflow and provides one downstream dataflow.
     
     Parameters:
     - options: (Object) optional parameters, some default options are set by Build() and
       set_default_options():
       - name (String): the name of this pipelet
       - key (Array of Strings): attribute names carrying values identity
       - fork_tag (String): outgoing transactions tags
     
     This is the base class of all Pipelets, providing the low-level dataflow service for XS
     applications.
  */
  function Pipelet( options ) {
    // !! Always initialize _input and _output first, in all derived classes before calling this constructor
    this._input  || ( this._input  = new Pipelet.Input ( this ) );
    this._output || ( this._output = new Pipelet.Output( this ) );
    
    options = this._options = options || {};
    
    // Ongoing transactions
    this._transactions = new Transactions();
    
    // Objects's key
    this._key = options.key;
    
    // Fork tag
    this._fork_tag = options.fork_tag;
    
    return this;
  } // Pipelet()
  
  // Input and Output plug classes
  Pipelet.Input  = Input;
  Pipelet.Output = Output;
  
  Root.subclass( Pipelet, {
    /* ------------------------------------------------------------------------
       _get_name( [ method_name ] )
       
       Get the name string for this instance typically as a helper for debug
       traces. Optionnaly, if a name is provided assume this is a method name.
       
       E.g.:
         this._get_name()          --> "set"
         
         this._get_name( '_fetch' ) --> "set._fetch(), "
    */
    _get_name: function( method ) {
      return this._options.name + ( method ? '.' + method + '(), ' : '' );
    }, // _get_name()
    
    /* ------------------------------------------------------------------------
       _error( method, message )
       
       ToDo: rename __error()
       
       Reports errors to global error dataflow then throws.
       
       Parameters:
         - method (String): the name of the method where the error occured
         
         - message: an error message
    */
    _error: function( method, message ) {
      message = this._get_name( method ) + message;
      
      // ToDo: report error to global error dataflow or error output
      
      throw new Error( message );
    }, // _error()
    
    /* ------------------------------------------------------------------------
       __transform( values, options, caller )
       
       Transforms an array of values into an other array of values according
       to the current pipelet role.
       
       Default is to return all values unaltered. Every pipelet should either
       implement __transform() if it is stateless or _fetch() if it is statefull
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
       
       Excecutes a number of operations in a transaction for this pipelet then
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
      
      de&&ug( this._get_name( '_transaction' ) + 'count: ' + count + ', options: ' + log.s( options ) );
      
      var t = transactions.get_transaction( count, options, this._output, this._fork_tag );
      
      try {
        f.call( this, t, count )
      } catch( e ) {
        transactions.end_transaction( t );
        
        // ToDo: _transaction(): send event on exception
        throw e;
      }
      
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
       
       Notify downsteam pipelets about added values.
       
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
       
       Notify downsteam pipelets of removed object.
       
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
       pipelets. Each update is excuted in the order of appearance, as
       a _remove() followed by an _add() the whole _update is encapsulated
       in a transaction.
       
       Downstream pipelets will therfore not see updates but removes and adds
       in a transaction. 
       
       Parameters:
         updates: Array of updates, each update is an Array of two objects:
           - the first is the previous object value (to be removed),
           - the second is the updated object value (to be added).
         
         option: optional object
    */
    _update: function( _updates, options ) {
      var _l = _updates.length;
      
      de&&ug( this._get_name( '_update' ) + ', updates: ' + _l );
      
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
        
       Notify downsteam pipelets of updated object values.
       
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
         - The state of downstream objects cannot be updated incremetally
       
       Parameters:
         option: optional object
    */
    _clear: function( options ){
      return this.__emit_clear( options );
    }, // _clear()
    
    /* ------------------------------------------------------------------------
       __emit_clear( [ options ] )
       
       Notify downsteam pipelets that all object values should be cleared.
       
       This method is typically called by _clear() for clearing downstream objects.
       
       Users should not call this method directly.

       Parameters:
         option: optional object
    */
    __emit_clear: function( options ) {
      return this.__emit( 'clear', void 0, options );
    }, // __emit_clear()
    
    /* ------------------------------------------------------------------------
       __emit_operations( added, removed, updates [, options ] )
       
       Emits a number of operations ( add / remove / update ) as a transaction.
       
       Parameters:
         - added: (Array) of added values. Can be undefined to specify that
           there is nothing to add.
         
         - removed: (Array) of removed values. Can be undefined to specify that
           this is nothing to remove.
         
         - updates: (Array) of updeted values. Can be undefined to specify that
           this is nothing to update.
         
         - options: (Object) additional options to send to downstream pipelets:
           - _t (optional Object): a transaction
       
       ToDo: tests for __emit_operations()
    */
    __emit_operations: function( added, removed, updates, options ) {
      var operations = [];
      
      removed && removed.length && operations.push( 'remove' );
      updates && updates.length && operations.push( 'update' );
      added   && added  .length && operations.push( 'add'    );
      
      var l = operations.length, that = this;
      
      if ( l ) {
        if ( l > 1 ) {
          // There is more than one operation
          this._transaction( l, options, function( t, l ) {
            for ( var i = -1; ++i < l; ) __emit( 1, t.next().get_emit_options() );
          } );
        } else {
          // only 1 update using upstream options
          __emit( 0, options );
        }
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
      this
        ._output
        .emit( event_name, values, options )
      ;
      
      return this;
    }, // __emit()
    
    _on: function( event_name, listener, that, once ) {
      this
        ._output
        ._on( event_name, listener, that, once )
      ;
      
      return this;
    }, // _on()
    
    _on_change: function( listener, that, once ) {
      this
        ._output
        .on_change( listener, that, once )
      ;
      
      return this;
    }, // _on_change()
    
    _on_complete: function( listener, that, once ) {
      this
        ._output
        .on_complete( listener, that, once )
      ;
      
      return this;
    }, // _on_complete()
    
    _add_source: function( s, options ) {
      this
        ._input
        ._add_source( s._output || s, options )
      ;
      
      return this;
    }, // _add_source()
    
    _remove_source: function( s, options ) {
      this
        ._input
        ._remove_source( s._output || s, options )
      ;
      
      return this;
    }, // _remove_source()
    
    _add_destination: function( d, options ) {
      this
        ._output
        ._add_destination( d._input || d, options )
      ;
      
      return this;
    }, // _add_destination()
    
    _remove_destination: function( d, options ) {
      this
        ._output
        ._remove_destination( d._input || d, options )
      ;
      
      return this;
    }, // _remove_destination()
    
    _fetch_all: function( receiver, query ) {
      this._output._fetch_all( receiver, query );
      
      return this;
    } // _fetch_all()
  } ); // Pipelet instance methods
  
  /* --------------------------------------------------------------------------
    The xs object is a void source Pipelet to provide a fluid interface with a
    namespace for other Pipelets.
    
    Example:
      Publish a sales dataset from a 'sales' file:
      
      xs.file( 'sales' ).publish();
      
      The xs object acts as a namespace for XS chainable pipelets. Without the
      xs object, one would have to write the following less fluid code where the
      xs namespace is not explicit and requiring the new operator on a class to
      create the fist pipelet of a chain:
      
      new File( 'sales' ).publish();
  */
  var xs = new Pipelet();
  
  // Prevent becoming a source of any downstream Pipelet, see Pipelet.._add_source() and Pipelet.._remove_source()
  xs._output.is_void = true;
  
  // xs also holds a reference to XS, the Object of all Connected Sets' objects
  xs.XS = XS;
  
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
     Pipelet.set_default_options( constructor, source, parameters, defaults )
     
     Set default options for pipelet parameters.
     
     Returns an Array of parameters with default options as the last parameter.
     
     Parameters:
     - constructor: (Function) Pipelet constructor or composition function
       which last parameter must always be options but may be named anything,
       especially once minified.
       
       This constructor may have a property default_options which can be defined
       as:
       - (Object): Default options object.
       - (Function): Default options function called with "parameters" returning
         default options. The function is called in the context of "constructor".
     
     - source     : (Pipelet instance) source pipelet, or something with a
       _key, an Array of Strings representing the key of the source.
     
     - parameters : (arguments) from pipelet invocation, the last of which is
       considered options if is at the same position as the options parameter
       of f (f.length - 1).
     
     - defaults   : (Object) other default options.
  */
  Pipelet.set_default_options = function( f, source, parameters, defaults ) {
    parameters = slice.call( parameters, 0 );
    
    var default_options = f.default_options, options, l = parameters.length;
    
    if ( typeof default_options == 'function' ) {
      default_options = default_options.apply( f, parameters );
    }
    
    options = extend( { key: source._key || [ 'id' ] }, defaults, default_options )
    
    if ( l === f.length ) {
      l -= 1;
      
      var last = parameters[ l ];
      
      if ( typeof last !== 'object' ) {
        error( 'expected last parameter to be an object but found ' + typeof last );
      }
      
      parameters[ l ] = extend_2( options, last );
    } else if ( l < f.length ) {
      // Set options as last expected parameter of constructor or composition
      parameters[ f.length - 1 ] = options;
    } else {
      error( 'too many parameters provided for pipelet, expected ' + f.length + ' parameters max' );
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
     - Add subclass() and Build() class methods to constructor
     
     Parameters:
     - constructor: (function) a Pipelet constructor
     
     Optional Parameters:
     - methods:
       - (Object)  : instance methods for the constructor's class
       - (Function): returning an instance method Object, signature:
         methods( Super)
          - Super (Object): prototype of the super class
     
     Examples:
       With no instance methods:
         Set.subclass( Order );
       
       With instance methods _add() and _remove() defined:
         Set.subclass( Order, {
           _add: function( values, options ) {
             // implement Order..add()
           },
           
           _remove: function( values, options ) {
             // implement Order..remove()
           }
         } );
         
       With instance methods encapsulated in a function:
         Set.subclass( Order, function( Super ) {
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
  Pipelet.subclass = function( derived, methods ) {
    XS.subclass( this, derived, methods );
    
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
                generation of the trace. This is acomplished by defining trace.valueOf()
                as returning the current trace level.
                
                If the trace level is less than 6 the expression stops here and none of
                the other terms are evaluated, resulting in a very low execution cost when
                the trace is not consumed.
                
                If the trace level is above 6, the second term 'trace( 6, this )' is
                evaluated, calling trace() with an interger for this trace level (6) and
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
                
                For more details on trace() see the documentation for Trace_Domain().
                
                So the following are all other equivalents semantically to the previous
                examples:
             *-/
             
             trace >= 6
               && trace( 6, this, '__transform' )
               && trace( { count: values.length } )
             ;
             
             trace( 6 )
               && trace( this, '__transform' )
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
              and avoid repetiting the same patterns. The following three uses of _trace()
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
  
  /* --------------------------------------------------------------------------
     Pipelet.Build( name, constructor [, methods [, pipelet ] ] ] )
     
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
       - methods      :
           - (Object)   : methods for the constructor's class
           - (Function) : returning a method Object, see Pipelet.subclass()
           
       - pipelet      : (function) the pipelet function creating an instance
                        of the constructor's class.
       
     Example: a 'from_usa' pipelet that filters values which country attribute
     is 'USA'.
     
     Programmer:
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
        
     Architect Usage, displays sales from usa in a table:
       xs.file( 'sales' ).from_USA().table( '#sales_from_usa' );
       
     ToDo: Build API, find a way to create multiple dataflow ports for pipelet with more than one input or output port
  */
  Pipelet.Build = function( name, constructor, methods, pipelet ) {
    this.subclass( constructor, methods );
    
    if ( ! pipelet ) {
      pipelet = ( function() {
        var constructor_apply = XS.make_constructor_apply( constructor );
        
        return function pipelet() {
          // 'this' is the context of the upstream pipelet
          
          var a = arguments;
          
          de&&ug( 'pipelet.' + name + '(), parameters count: ' + a.length );
          
          a = Pipelet.set_default_options( constructor, this, a, { name: name } );
          
          var that = new constructor_apply( a );
          
          that._add_source( this );
          
          return that;
        } // pipelet()
      } )();
    }
    
    Pipelet.Add( name, pipelet );
    
    return constructor;
  }; // Pipelet.Build()
  
  /* -------------------------------------------------------------------------------------------
     Pipelet.Compose( name, composition )
     
     Build a pipelet from one or more pipelets in order to provide a reusable component.
     
     If the composition uses more than one pipelet, it is highly recommended to use Compose with
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
       
       We highly recommend testing all code minified to prevent this kind of surprise in
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
       
         Pipelet.Compose( 'aggregate_from', aggregate_from );
       
       3/ Use composed aggregate_from() to aggregates sales yearly from usa:
       
         xs.flow( 'sales' )
           .aggregate_from( [{ country: 'USA'}], [{ id: 'sales'}], [{ id: 'year'}] )
         ;
  */
  var Compose = Pipelet.Compose = function ( name, composition ) {
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
     ToDo: stateless() pipelet is not well defined, needs a use case
     
     Possible use case:
     - An assynchronous stateless pipelet, whereas alter() is synchronous in
       the sense that the transform function must return immediately a transformed value.
     - Allowing to generate more or less values than the input operation provides
     - Managing transactions for developper
     
     Stateless( name, transform )
     Stateless( name, { factory: true }, factory )
     Stateless( name, parameters, body )
     
     Example: building a stateless pipelet to set the flow attribute, could be done in three
     different ways:
         Stateless( 'flow', function( flow ) { this.flow = flow } );
       or
         Stateless( 'flow', { factory: true }, function( flow ) {
           return function() { this.flow = flow }
         } );
       or
         Stateless( 'flow', [ 'flow' ], "v.flow = flow" );
     
     Usage:
       xs.flow( 'users' );
  * /
  function Stateless( name, transform ) {
    var l = f.length, parameters = [];
    
    for ( var i = -1; ++i < l; ) parameters.push( '_' + i );
    
    var alter_parameters = [ 'source' ].concat( parameters, [ 'options' ] )
    
    var code = new Code( name )
      ._function( name, null, alter_parameters )
        .add( 'return source.alter( alter, options )' )
        ._function( 'alter', null, [ 'v' ] )
          .add( 'var o = {}, p; for ( p in v ) o[ p ] = v[ p ];' )
          .add( 'f.apply( o, [' + parameters + '] )' )
          .add( 'return o' )
        .end( 'alter()' )
      .end( name + '()' )
      .get()
    ;
    
    eval( code );
    
    Compose( name, function( source, options ) {
      return source.alter( function( v ) {
        var o = {}, p; for ( p in v ) o[ p ] = v[ p ];
        
        parameters = slice( arguments, 1 );
        
        f.apply( o, parameters );
        
        return o;
      }, options );
    }, options );
    
    
    // alter way
    
    Pipelet.Build( 'name', Pipelet );
    
    de&&ug( 'alter(), tranform: ' + transform + ', options: ' + log.s( options ) );
    
    Pipelet.call( this, options );
    
    if ( typeof transform != 'function' ) throw new Error( 'Alter(): transform must be a function' );
    
    var l = transform.length; // the number of requested parameters by transform()
    
    if ( l < 1 ) throw new Error( 'Alter(): transform must use at least one parameter' );
    
    // Build parameter list according to the number of parameters requested by transform
    var parameters = [ 'values[ ++i ]', 'i', 'values', 'options' ].slice( 0, l ).join( ', ' );
    
    var transform;
    
    var code = new Code()
      ._function( '__transform', void 0, [ 'values' ] )
        ._var( 'i = -1', 'l = values.length', 'r = []', 't = transform', 'v', 'w', 'p', '' )
        .unrolled_while( 'v=values[++i],w={};for(p in v)w[p]=v[p];r.push(t.apply(w,parameters));' )
        .add( 'return r' )
      .end( 'Stateless..__transform()' )
    ;
    
    eval( code.get() );
    
    return this;
  } // Stateless()
  //*/
  
  /* -------------------------------------------------------------------------------------------
     encapsulate( input, output, options )
     
     A pipelet to group a graph of pipelets into a single pipelet which input operations are
     redirected to the 'input' pipelet and where output methods, such as _fetch(), are redirected to
     the 'output' pipelet.
     
     This is typically used with compositions of more than one pipelet.
     
     Parameters:
       - input: the input pipelet of the graph to encapsulate
       - output: the ouput pipelet of the graph
       - options: these are pipelet options
     
     Example using the aggregate_from() composition:
     -------
     
     ToDo: Compose(), allow to automatically encapsulate
     
     Pipelet.Compose( 'aggregate_from', function( source, from, measures, dimensions, options ) {
       var input  = xs.filter( from, options )
         , output = input.aggregate( measures, dimensions, options )
       ;
       
       return source.encapsulate( input, output, options );
     } )
     
     Implementation
     --------------
     This implementation assigns the _input plug of the encapsulated pipelet to the
     _input plug of the input pipelet, and its _output plug to the _output plug of
     the output pipelet.
     
     Then it redirects input operations methods to the input pipelet.
     
     To prevent silent bugs, methods that should never be called by an outside user are
     redirected to null to trigger exceptions as early as possible.
     
     The table bellow shows all pipelet's methods redictions:
     
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
     
     _fetch_all                     none         Redirected to _output by Pipelet
     __emit                         none         Redirected to _output by Pipelet
     _on                            none         Redirected to _output by Pipelet
     _on_change                     none         Redirected to _output by Pipelet
     _on_complete                   none         Redirected to _output by Pipelet
  */
  function Encapsulate( input, output, options ) {
    this._input  = input._input;
    this._input_pipelet = input;
    
    this._output_pipelet = output;
    this._output = output._output;
    
    Pipelet.call( this, options );
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
  
  /* -------------------------------------------------------------------------------------------
     pass_through( [ options ] )
     
     A pipelet typically used as a temporary variable for cyclic graphs.
     
     Example:
       var tmp = xs.pass_through()
       
       xs.loop( tmp )._output._add_destination( tmp._input );
       
     ToDo: Make Pass_Through a Controllet
  */
  function Pass_Through( options ) {
    return Pipelet.call( this, options );
  } // Pass_Through()
  
  Pipelet.Build( 'pass_through', Pass_Through, {
    _add: function( values, options ) {
      return this.__emit( "add", values, options );
    },
    
    _remove: function( values, options ) {
      return this.__emit( "remove", values, options );
    },
    
    _update: function( updates, options ) {
      return this.__emit( "update", updates, options );
    }
  } );
  
  /* -------------------------------------------------------------------------------------------
     Controllet( options )
     
     Base class for controllets.
     
     A Controllet controls the communication between it's source and it's destination(s) by
     updating its source Query_Tree outputs to point directly at destinations' input ports.
     
     Therefore a Controllet does not process data operation events such as add, remove,
     update, clear and does not need input or output ports.
     
     Doing so allows controllets to get out of the data event path, improving performances, both
     CPU-wise and memory-wise because controllets do not need Query_Trees. The source
     Query_Tree is more fully used as it handles all destination pipelets of its downstream
     controllets, resulting in better overall performances.
     
     Controllets can be chained, redirecting traffic between a source and destinations accross
     several controllets:
     
                                   <--- queries updates < ---
     
        .-------------- controllet 1 <---- controllet 2 <---- controllet 3 <----------.
        |                                                                             |
        |                                                                             |
        v                                                                             |
     source -------------------------------------------------------------------> destination(s)
                                 ---> data operation events --->
     
     
     Eventually, Controllets could run on separate servers while controlling data event traffic
     between other groups of servers.
     
     The first implemented controllet is Union, the next candidates are Filter and Pass_Through.
  */
  function Controllet( options ) {
    this._input  || ( this._input  = new Controllet.Input ( this ) );
    this._output || ( this._output = new Controllet.Output( this ) );
    
    Pipelet.call( this, options );
  } // Controllet()
  
  Pipelet.subclass( Controllet );
  
  Controllet.Input = Pipelet.Input.subclass(
    function( p, name ) { Pipelet.Input.call( this, p, name ) }, {
    
    // It _is_lazy() if all destinations are lazy
    // this is necessary because output query_update only fowards update to source
    // and therefore input query is no longer updated and can no-longer be used to
    // evaluate if input is lazy or not
    _is_lazy: function() {
      var i = -1, destinations = this.pipelet._output.destinations, input, name;
      
      while( input = destinations[ ++i ] ) {
        if ( input._is_lazy() ) continue;
        
        de&&ug( get_name( this ) + 'false, because destination: ' + input._get_name() + ' is not lazy' );
        
        return false;
      }
      
      de&&ug( get_name( this ) + 'true, because all destinations are lazy' );
      
      return true;
      
      function get_name( that ) {
        return name || ( name = that._get_name( '_is_lazy' ) );
      } // get_name()
    }, // Controllet.Input.._is_lazy()
    
    route_to_destinations: function( method_name, parameters ) {
      var destinations = this.pipelet._output.destinations
        , name, i = -1, input
      ;
      
      de&&ug( ( name = this._get_name( method_name ) )
        + ' routed to ' + destinations.length + ' destinations'
      );
      
      while( input = destinations[ ++i ] ) {
        de&&ug( name + 'to destination: ' + input._get_name() );
        
        input[ method_name ].apply( input, parameters );
      }
      
      return this;
    }, // route_to_destinations()
    
    __add_source_query: function( output ) {
      // Add to that source this destinations and queries
      
      return this.route_to_destinations( '__add_source_query', [ output ] );
    }, // Controllet.Input..__add_source_query()
    
    __remove_source_query: function( output, options ) {
      // Remove from that source, this destinations / queries
      
      return this.route_to_destinations( '__remove_source_query', [ output, options ] );
    }, // Controllet.Input..__remove_source_query()
    
    __fetch_source_destination: function( source, options ) {
    
      return this.route_to_destinations( '__fetch_source_destination', [ source, options ] );
    }, // Controllet.Input..__fetch_source_destination()
    
    set_tag_branches: function( tag, count ) {
    
      return this.route_to_destinations( 'set_tag_branches', [ tag, count ] );
    } // Controllet.Input..set_tag_branches()
  } ); // Controllet.Input instance attributes
  
  Controllet.Output = Pipelet.Output.subclass(
    function( p, name ) { Pipelet.Output.call( this, p, name ) }, {
    
    // Route query_update to this source
    query_update: function( removes, adds, input ) {
      var p = this.pipelet, rl = removes.length, al = adds.length;
      
      de&&ug( this._get_name( 'query_update' )
        + log.s( { removes: removes, adds: adds, input: input._get_name() } )
      );
      
      if ( rl || al ) {
        var source = p._input.source;
        
        if( source ) {
          var output = source && source._output;
        
          output && output.query_update( removes, adds, input );
        }
      }
      
      return this;
    } //  Controllet.Output..query_update()
  } ); // Controllet.Output instance attributes
  
  /* -------------------------------------------------------------------------------------------
     Union( sources, options )
     
     Forwards many sources to one destination
  */
  function Union( sources, options ) {
    this._input  || ( this._input  = new Union.Input ( this, 'union-in'  ) );
    this._output || ( this._output = new Union.Output( this, 'union-out' ) );
    
    Controllet.call( this, options );
    
    this._input.tag = this._options.tag;
    
    if ( sources ) {
      for( var i = -1; ++i < sources.length; ) {
        var source = sources[ i ];
        
        if ( source ) this._add_source( source );
      }
    }
  } // Union()
  
  Controllet.Build( 'union', Union );
  
  Union.Input = Controllet.Input.subclass(
    function( p, name ) {
      Controllet.Input.call( this, p, name );
      
      this.sources = [];
      this.tag = null;
    }, {
    
    __add_source: function( source ) {
      var sources = this.sources, tag;
      
      if ( sources.indexOf( source ) !== -1 ) this.error( "invalid source: already there" );
      
      sources.push( source );
      
      ( tag = this.tag ) && this.set_tag_branches( tag, sources.length );
      
      return this;
    }, // Union.Input..__add_source()
    
    __remove_source: function( source ) {
      var sources = this.sources
        , position = sources.indexOf( source )
        , tag
      ;
      
      if ( position === -1 ) this.error( "source not found in this" );
      
      sources.splice( position, 1 );
      
      ( tag = this.tag ) && this.set_tag_branches( tag, sources.length );
      
      return this;
    } // Union.Input..__remove_source()
  } ); // Union.Input instance attributes
  
  Union.Output = Controllet.Output.subclass(
    function( p, name ) { Controllet.Output.call( this, p, name ) }, {
    
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query] )
       
       ToDo: add test cases
    */
    _fetch: function( receiver, query ) {
      var p = this.pipelet, sources = p._input.sources, l = sources.length;
      
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
    
    // Forward query tree updates directly to all sources
    query_update: function( removes, adds, input ) {
      var p = this.pipelet, rl = removes.length, al = adds.length;
      
      de&&ug( p._get_name( 'query_update' )
        + log.s( { removes: removes, adds: adds, input: input._get_name() } )
      );
      
      if ( rl || al ) {
        var sources = p._input.sources, l = sources.length, i = -1;
        
        while ( ++i < l ) sources[ i ].query_update( removes, adds, input );
      }
      
      return this;
    } //  Union.Output..query_update()
  } ); // Union.Output instance attributes
  
  /* -------------------------------------------------------------------------------------------
     source.dispatch( branches, branch_dataflow [, options ] )
     
     Dispatch is a basic building block for managing parallelism with Connected Sets.
     
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
           return this.socket
             ._add_source( source ) // add dispatcher's source as source of socket.io client socket
           ;
         }
       
       Note that to add proper authorizations, one would only need to filter the source and
       output to and from clients sockets. 
  */
  function Dispatch( source, branches, branch_dataflow, options ) {
    this.branch_dataflow = branch_dataflow;
    
    this.branches = {};
    this.remove_branches_tid = '';
    
    var that = this
      , no_encapsulate = options && options.no_encapsulate
      , dispatcher = this.dispatcher = no_encapsulate ? source : xs.pass_through( options )
      , gatherer   = this.gatherer   = xs.union( options, { name: 'gatherer (union)' } )
    ;
    
    options = this._options = options || {};
    
    // ToDo: implement branches using a proper pipelet input port instead of _on() + _fetch(), see filter.js for example
    branches 
      ._output._fetch( function( branches ) { that.create_branches( branches ) } )
    ;
    
    branches
      ._on( 'add'   , this.create_branches, this )
      ._on( 'remove', this.remove_branches, this )
      // Ignore updates for now
      // ToDo: use updates to notify branches of some changes without tearing-down the branch,
      // possibly using the input_output object to provide a branch instance update function
      ._on( 'clear' ,
        function() {
          this.remove_branches( Object.keys( this.branches ) );
        }, this
      )
    ;
    
    if ( no_encapsulate ) return gatherer;
    
    return source.encapsulate( dispatcher, gatherer, options );
  } // Dispatch()
  
  extend_2( Dispatch.prototype, {
    _get_name: function( name ) {
      return ( this._options.name || 'dispatch' ) + ( name ? '.' + name + '(), ' : '' );
    }, // _get_name()
    
    create_branches: function( new_branches, options ) {
      var name = de && this._get_name( 'create_branches' )
        , t = options && options._t
      ;
      
      if ( t ) {
        var tid = t.id;
        
        // ToDo: Dispatch..create_branches() find cleaner option to deal with updates as remove + add
        if ( tid === this.remove_branches_tid ) {
          de&&ug( name + 'ignore update from previous remove, tid: ' + tid );
          
          return this;
        }
      }
      
      var branches = this.branches
        , options = this._options
        , input_output = options.input_output
        , input
        , gatherer = this.gatherer
      ;
      
      for ( var i = -1, l = new_branches.length; ++i < l; ) {
        var branch = new_branches[ i ], id = branch.id;
        
        if ( branches[ id ] ) throw new Error( 'Error, ' + this._get_name( 'create_branches' ) + 'branch: ' + id + ', already exists' );
        
        de&&ug( name + 'id: ' + id + ', options: ' + log.s( options ) );
        
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
        // ToDo: test initial _fetch on output from gatherer
        
        de&&ug( name + 'gatherer query: ' + ( gatherer._query && gatherer._query.query ) );
        
        output && output._output._add_destination( gatherer._input );
      } // for all added branches
      
      return this;
    }, // create_branches()
    
    remove_branches: function( removed_branches, options ) {
      var name = de && this._get_name( 'remove_branches' )
        , t = options && options._t
      ;
      
      if ( t && t.more ) {
        var tid = this.remove_branches_tid = t.id;
        
        de&&ug( name + 'more option set, this could be an update, tid: ' + tid );
        
        return this;
      }
      
      for( var i = -1, l = removed_branches.length, branches = this.branches, id, branch; ++i < l; ) {
        branch = branches[ id = removed_branches[ i ].id ];
        
        if ( branch ) {
          de&&ug( name + 'id: ' + id );
          
          // Unplug using no_fetch because there will be no response to this fetch
          branch.output && branch.output._output._remove_destination( this.gatherer._input, { no_fetch: true } );
          
          // Unplug using no_fetch because there is nowhere to send removes to
          branch.input && this.dispatcher._output._remove_destination( branch.input._input, { no_fetch: true } );
          
          delete branches[ id ];
        } else {
          // ToDo: send to global error datafow
          log( 'Error, ' + this._get_name( 'remove_branch' ) + 'branch: ' + id + ', does not exist' );
        }
      }
      
      return this;
    } // remove_branches()
  } ); // Dispatch instance methods
  
  Compose( 'dispatch', Dispatch );
  
  /* -------------------------------------------------------------------------------------------
     greedy( options )
     
     A non-lazy pass-through pipelet
  */
  function Greedy( options ) {
    this._input || ( this._input = new Greedy.Input( this, 'greedy_in' ) );
    
    Pipelet.call( this, options );
  } // Greedy()
  
  Pipelet.Build( 'greedy', Greedy );
  
  Greedy.Input = Pipelet.Input.subclass(
    function( p, name ) {
      Pipelet.Input.call( this, p, name );
      
      // Query eveyrthing from upstream, makes me greedy
      this.query = Query.pass_all;
    }, {
    
    /* -----------------------------------------------------------------------------------------
       update_upstream_query( removes, adds )
       
       Input default behavior: Updates this input query and propagate uptream.
       
       Greedy behavior: to not do anything, do not update query and do not
       propagate upstream. Greedy therefore always fetches all it can regarless of
       downstream pipelet needs.
       
       Filtering content must therefore be specified upstream of the greedy pipelet.
    */
    update_upstream_query: function() {
      // Prevent upstream query propagation
      
      return this;
    } // update_upstream_query()
  } ); // Greedy Input
  
  /* -------------------------------------------------------------------------------------------
     alter( transform [, options] )
     
     Alters a set by altering all values by transform().
     
     Parameters:
       - transform:
           (Function): a function to transform values which signature is:
             transform( value [, position [, values [, options ] ] ] )
             
             !! The behavior of transform is very different based on the value of option 
             'no_clone':
               - if options no_clone is falsy, transform() MUST modify value which will have
               been cloned prior to calling transform()
               
               - if option no_clone is truly, transform() MUST return one new object for each
               source object and should not modify value.
             
           (Object): set static properties into all values
           
       - options: (Object)
         - no_clone: (Boolean) if true, values will not be cloned prior to calling the
           transform which could then produce side effects on the source value. This
           optimization option should only be used when "transform" never alters
           incomming values.
           
         ToDo: alter(): provide option allowing to return any number of values.
       
     Example: alters a source dataflow of stocks to add PE ratios.
       var pe_ratios = stocks
         .alter( function( stock ) {
           stock.pe_ratio = stock.price / stock.earnings; // modifies stock, cannot use option no_clone
         } )
       ;
       
     Example: alters a source dataflow of stocks to produce a dataflow of PE ratios.
       var pe_ratios = stocks
         .alter( function( stock ) {
           // never alters stock, it returns a new object
           return { ticker: stock.ticker, pe_ratio: stock.price / stock.earnings };
         }, { no_clone: true } )
       ;
       
     Example: add a 'stock_prices' flow attribute using an Object transform:
       prices.alter( { flow: 'stock_prices' } );
  */
  function Alter( transform, options ) {
    de&&ug( 'alter(), transform: ' + ( log.s( transform ) || transform ) + ', options: ' + log.s( options ) );
    
    Greedy.call( this, options );
    
    var vars = [ 'i = -1', 'l = values.length', 'r = []' ] // parameters for unrolled while loop
      , while_body
    ;
    
    if ( typeof transform == 'object' ) {
      vars.push( 'v', 'w', 'p' );
      
      while_body = 'v=values[++i],r.push(w={});for(p in v)w[p]=v[p];';
      
      // add transform's properties
      for ( var p in transform ) {
        var _p = p.match( /^[a-zA-Z][0-9a-zA-Z]*$/ ) ? '.' + p : "['" + p + "']";
        
        while_body += "w" + _p + "='" + transform[ p ] + "';";
      }
    } else {
      if ( typeof transform != 'function' ) throw new Error( 'Alter(): transform must be a function' );
      
      var l = transform.length; // the number of requested parameters by transform()
      
      if ( l < 1 ) throw new Error( 'Alter(): transform must use at least one parameter' );
      
      vars.push( 't = transform' );
      
      // Build parameter list according to the number of parameters requested by transform
      var parameters = [ 'values[++i]', 'i', 'values', 'options' ].slice( 0, l );
      
      if ( options.no_clone ) {
        while_body = 'r.push(t(' + parameters + '));';
      } else {
        // add variables and code for cloning
        vars.push( 'v', 'w', 'p' );
        parameters[ 0 ] = 'w';
        while_body = 'v=values[++i],r.push(w={});for(p in v)w[p]=v[p];t(' + parameters + ');';
      }
    }
    
    // Generate code for this.__transform()
    var code = new Code()
      ._function( 'this.__transform', void 0, [ 'values', 'options' ] )
        ._var( vars )
        .unrolled_while( while_body )
        .add( 'return r' )
      .end( 'Alter..__transform()' )
    ;
    
    eval( code.get() );
    
    this._output._fetch = this._fetch;
    
    return this;
  } // Alter()
  
  Greedy.Build( 'alter', Alter, {
    // ToDo: we probably don't need this _fetch(), looks like the same as Pipelet.prototype._fetch()
    _fetch: function( receiver, query ) {
      if ( query ) {
        var filter = new Query( query ).generate().filter;
      } else {
        rx = receiver;
      }
      
      return Output.prototype._fetch.call( this, rx );
      
      function rx( values, no_more ) {
        if ( values && values.length ) values = filter( values );
        
        receiver( values, no_more );
      } // rx()
    } // _fetch()
    
    // Programmers might be able to propagate upstream altered queries in some cases.
    //
    // e.g.: if the alter function is set_flow() it could remove from incomming queries the flow key
    // when it matches the set_flow name, or remove the term entirely when the flow key does not
    // match the set_flow name. For simple flow() queries, this would result in either the pass-all
    // or nul query respectively which in both case is faster.
    
    // ToDo: implement query updates to propagate upstream when the transform is an Object
    // ToDo: implement option to provide a transform function for update_upstream_query()
  } );
  
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
    this._output || ( this._output = new Set.Output( this, 'set_out' ) );
    
    if ( a && ! ( a instanceof Array ) ) throw new Error( 'Set(), first paramater must be an Array' );
    
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
    function( p, name ) { Greedy.Output.call( this, p, name ) }, {
    
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query ] )
       
       Fetches set content, possibly in several chunks.
       
       See Pipelet._fetch() for receiver and query documentation.
       
       ToDo: implement a fetch_state() method instead of this fetch in output plug
    */
    _fetch: function( receiver, query ) {
      // ToDo: split large sets in chunks to allow incremental processing
      var a = this.pipelet.a;
      
      if ( query ) {
        de&&ug( 'Set ' + this._get_name( '_fetch' ) + 'query: ' + log.s( query ) + ', values: ' + a.length );
        
        a = new Query( query ).generate().filter( a );
        
        de&&ug( 'Set ' + this._get_name( '_fetch' ) + 'filtered values: ' + a.length );
      }
      
      receiver( a, true );
      
      return this;
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
    _add: function( _values, options ) {
      return this._transaction( _values.length, options, function( t, l ) {
        de&&ug( this._get_name( '_add' ) + 'values: ' + l );
        
        var i = -1, values = _values;
        
        while( ++i < l ) this._add_value( t, values[ i ] );
      } );
    }, // _add()
    
    // ToDo: test Set.._add_value()
    _add_value: function( transaction, value, emit_now ) {
      if ( value ) {
        var b = this.b;
        
        if ( b.length ) {
          var p = this._index_of( value );
          
          if ( p != -1 ) {
            de&&ug( get_name( this ) + 'removing add from anti-state' );
            
            b.splice( p, 1 );
            
            transaction.emit_nothing();
            
            return this;
          }
        }
        
        this.a.push( value );
        
        transaction.__emit_add( [ value ], emit_now );
      } else {
        transaction.emit_nothing();
      }
           
      return this;
      
      function get_name( that ) { return that._get_name( '_add_value' ) }
    }, // _add_value()
    
    // ToDo: test Set.._add_values()
    _add_values: function( transaction, values, emit_now ) {
      var i = -1, v, b = this.b, added = [], l = values.length;
      
      while( b.length && ++i < l ) {
        // There are values in the antistate b, waiting for an add or
        // _update, or conflict resolution
        var p = this._index_of( v = values[ i ] );
        
        if ( p == -1 ) {
          added.push( v );
        } else {
          de&&ug( get_name( this ) + 'removing add from anti-state' );
          
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
      
      return this;
      
      function get_name( that ) { return that._get_name( '_add_value' ) }
    }, // _add_values()
    
    /* ------------------------------------------------------------------------
       _remove( values )
       
       Remove values from the set then notify downsteam pipelets
    */
    // ToDo: optimize _remove() when _remove_value() is not overloaded
    _remove: function( _values, options ) {
      return this._transaction( _values.length, options, function( t, l ) {
        de&&ug( this._get_name( '_remove' ) + 'values: ' + l );
        
        var i = -1, values = _values;
        
        while ( ++i < l ) this._remove_value( t, values[ i ] );
      } );
    }, // _remove()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_value: function( transaction, value, emit_now ) {
      var removed = [];
      
      if ( value ) {
        var p = this.index_of( value );
        
        if ( p == -1 ) {
          de&&ug( this._get_name( '_remove_value' ) + 'adding value to anti-state' );
          
          this.b.push( value );
        } else {
          this.a.splice( p, 1 );
          
          removed = [ value ];
        }
      }
      
      transaction.__emit_remove( removed, emit_now );
      
      return this;
    }, // _remove_value()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_values: function( transaction, values, emit_now ) {
      var i = -1, l = values ? values.length : 0, removed = [];
      
      while ( ++i < l ) {
        var v = values[ i ]
          , p = this.index_of( v )
        ;
        
        if ( p == -1 ) {
          de&&ug( get_name( this ) + 'adding value to anti-state' );
          
          this.b.push( v );
        } else {
          this.a.splice( p, 1 );
          
          removed.push( v );
        }
      }
      
      transaction.__emit_remove( removed, emit_now );
      
      return this;
      
      function get_name( that ) { return that._get_name( '_remove_values' ) }
    }, // _remove_values()
    
    /* ------------------------------------------------------------------------
       _update( updates )
       
       Update set values using updates then notifes downsteam pipelets.
       
       Parameter:
         updates: Array of updates, an update is an array of two values, the
           first is the previous value, the second is the updated value.
    */
    /*
    // ToDo: rewrite to work with _add_value(), _remove_value(), until then, use Pipelet.._update()
    _update: function( updates, options ) {
      de&&ug( this._get_name( '_update' ) + 'updates: " + updates.length );
      
      for ( var i = -1, l = updates.length, updated = [], added = []; ++i < l; ) {
        var o = updates[ i ]
          , r = o[ 0 ], v = o[ 1 ]
          , p = this.index_of( r )
        ;
        
        if ( p == -1 ) {
          // This update may come before an add
          this.b.push( r ); // Must be before _index_of( v )
          
          p = this._index_of( v );
          
          if ( p == -1 ) {
            this.a.push( v );
            
            added.push( v );
          } else {
            // There is a remove in the anti-state waiting for this add
            this.b.slice( p, 1 );
          }
          
          continue;
        }
        
        this.a[ p ] = v;
        
        updated.push( o );
      }
      
      // ToDo: not tested
      return this.__emit_operations( added, u, updated, options );
    }, // _update()
    */
    
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
        
       JIT Code Generator for index_of() from this._key
       
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
    }, // make_index_of()
    
    /* ------------------------------------------------------------------------
       make_key( object )
       
       Use this._key to generate code JIT to return a unique a string for an
       object based on the key coordinates concatenation separated with '#'.
       
       Parameters:
         object: an object which key is requested.
    */
    make_key: function( o ) {
      var key = this._key, l = key.length, code = [];
      
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
     
     ToDo: add tests for unique_set()
  */
  function Unique_Set( values, options ) {
    Set.call( this, values, options );
  }
  
  Set.Build( 'unique_set', Unique_Set, {
    _add: function( values, options ) {
      for ( var i = -1, l = values.length, added= []; ++i < l; ) {
        var v = values[ i ];
        
        if ( this.index_of( v ) != -1 ) {
          de&&ug( this._get_name( '_add' ) + 'discard duplicate, identity: ' + this.make_key( v ) );
        } else {
          added.push( v );
        }
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
         any prior flow name.
         
     Example:
     
       xs.set( [
           { fist_name: 'Joe'    , last_name: 'Black'   },
           { fist_name: 'William', last_name: 'Parrish' },
           { fist_name: 'Susan'  , last_name: 'Parrish' }
         ] )
         .set_flow( 'roles' )
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
    
    return source.alter( { flow: flow }, options );
  } );
  
  // ToDo: Stateless( 'set_flow', function( flow ) { this.flow = flow } );
  
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
    options = Pipelet.call( this, options )._options;
    
    var input  = this._input
      , output = this._output
    ;
    
    input._add_source = this._input_add_source;
    input.__fetch_source = this.__input_fetch_source;
    
    output.query_update = this._output_query_update;
    
    options.name = name;
    
    var include = options.include, exclude = options.exclude, u;
    
    if ( include ) {
      this.replacer = include;
    } else if ( options.exclude ) {
      this.replacer = function( key, value ) {
        return exclude.indexOf( key ) != -1 ? u : value; 
      }
    }
    
    this.log( 'new Trace(): ' + log.s( { include: include, exclude: exclude } ) );
  } // Trace()
  
  Pipelet.Build( 'trace', Trace, {
    log: function( method, object ) {
      var u, s = 'xs "' + this._get_name() + '".' + method + '()';
      
      if ( object ) {
        if ( this._options.counts_only ) {
          object.count = object.values ? object.values.length : 0;
          
          object.values = u;
        }
        
        s += ', ' + JSON.stringify( object, this.replacer, '  ' );
      }
      
      log( s );
      
      return this;
    }, // log()
    
    _input_add_source: function( source ) {
      this.pipelet.log( '_add_source', { source: source._get_name() } );
      
      return Pipelet.Input.prototype._add_source.call( this, source );
    }, // _input_add_source()
    
    __input_fetch_source: function( receiver, query ) {
      var u, s = this.source, that = this, name = '__fetch_source', p = this.pipelet;
      
      p.log( name, { source: s._get_name(), query: this.pipelet._query && this.pipelet._query.query } );
      
      if ( s ) {
        Pipelet.Input.prototype.__fetch_source.call( this, rx, query );
      } else {
        p.log( name + ', no source', { values: [], no_more: true } );
        
        receiver( [], true ); // No source, so this is an empty set
      }
      
      return this;
      
      function rx( values, no_more ) {
        p.log( name + '#rx', { values: values, no_more: no_more } );
        
        receiver( values, no_more );
      } // rx()
    }, // __input_fetch_source()
    
    _output_query_update: function( removes, adds, input ) {
      this.pipelet.log( 'query_update', { removes : removes, adds: adds, input: input._get_name() } );
      
      return Pipelet.Output.prototype.query_update.call( this, removes, adds, input );
    }, // _output_query_update()
    
    _add: function( values, options ) {
      this.log( '_add', { values: values, options: options } );
      
      return this.__emit_add( values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      this.log( '_remove', { values: values, options: options } );
      
      return this.__emit_remove( values, options );
    }, // _remove()
    
    _update: function( updates, options ) {
      this.log( '_update', { updates: updates, options: options } );
      
      return this.__emit_update( updates, options );
    }, // _update()
    
    _clear: function( options ) {
      this.log( '_clear', options ? { options: options } : options );
      
      return this.__emit_clear( options );
    } // _clear()
  } ); // Trace instance attributes
  
  /* -------------------------------------------------------------------------------------------
     source.delay( delay, options )
     
     Intented Purposes:
       - Simultate a distant pipelet by introducing a delay in all operations and _fetch().
       - Test assynchronous behavior of pipelets.
     
     Parameters:
       - delay: (Int) the delay in miliseconds
  */
  function Delay( delay, options ) {
    Pipelet.call( this, options );
    
    this._input.__fetch_source = this.__input_fetch_source;
    this._output.query_update = this._output_query_update;
    
    this.delay = delay;
    
    de&&ug( 'new Delay(): delay: ' + delay + ' ms' )
  } // Delay
  
  Pipelet.Build( 'delay', Delay, {
    __input_fetch_source: function( receiver, query ) {
      var that = this, delay = this.delay;
      
      // Get a delayed receiver
      var _receiver = function( values, no_more ) {
        setTimeout( function() {
          receiver( values, no_more )
        }, delay )
      }
      
      // Delay the call to __fetch_source() to simultate a full round-trip to a server
      setTimeout( function() {
        Pipelet.Input.prototype.__fetch_source.call( that, _receiver, query )
      }, delay );
      
      return this;
    }, // __input_fetch_source()
    
    _output_query_update: function( removes, adds, input ) {
      var that = this;
      
      setTimeout( function() {
        Pipelet.Output.prototype.query_update.call( that, removes, adds, input )
      }, this.delay );
      
      return this;
    },
    
    _defer: function( operation, values, options ) {
      var that = this;
      
      setTimeout( function() {
        that.__emit( operation, values, options );
      }, that.delay );
      
      return this;
    },
    
    _add: function( values, options ) {
      return this._defer( 'add', values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      return this._defer( 'remove', values, options );
    }, // _remove()
    
    _update: function( updates, options ) {
      return this._defer( 'update', updates, options );
    }, // _update()
    
    _clear: function( options ) {
      return this._defer( 'clear', void 0, options );
    } // _clear()
  } ); // Delay instance attributes
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    'Plug'             : Plug,
    'Pipelet'          : Pipelet,
    'xs'               : xs,  // ToDo: remove xs from the list once all modules load it directly from xs = require( lib/pipelet.js ) and get XS as xs.XS.
    'Encapsulate'      : Encapsulate,
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
  
  typeof module == "object" ? module.exports = xs : exports.xs = xs;
  
  de&&ug( "module loaded" );
} )( this ); // pipelet.js
