/*  pipelet.js
    
    Pipelet base classes:
      - Pipelet: the current base of all pipelet classes having one source and one
        destination
      - Fork: a Pipelet with one source and n destinations
      - Union: a Pipelet with n sources and one destination
      - Set: a stateful set implementation
    
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
   
   Helper functions help manage options:
     - XS.more     ( options ): returns options with 'more' and 'transaction_id' set
     - XS.no_more  ( options ); returns options without 'more' options, keeping 'transaction_id'
     - XS.only_more( options ): extracts options 'more' and 'transaction_id' from options
    
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
   
   Stateless pipelets must implement the _transform( values ) method that returns values
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
   
   Furthermore, stateful pipelets must set their '_lazy' flag to 'false' so that Build()
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
   ToDo: update Query documentaion with latests developments
   
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
   a Query_Tree pipelet that still need to be integrated with fetch() and pipelets emitters.
   
   In this new design, fetch() provides a Query and pipelet emitters filter their outputs
   using a Query_Tree instead of Fork.
   
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
  var XS, uuid;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    
    require( './code.js' );
    
    uuid = require( 'node-uuid' );
  } else {
    XS = exports.XS;
    
    uuid = exports.uuid;
  }
  
  var log        = XS.log
    , extend     = XS.extend
    , extend_2   = XS.extend_2
    , subclass   = XS.subclass
    , Code       = XS.Code
    , u
  ;
  
  var push   = Array.prototype.push
    , slice  = Array.prototype.slice
    , concat = Array.prototype.concat
    , create = Object.create
  ;
  
  function Dictionary() {
    return create( null );
  }
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs pipelet, " + m );
  } // ug()
  
  function exception( e, name ) {
    // ToDo: decode stack trace to resolve urls of minified sources with a source map
    // Alternatively open a feature request in Google and Firefox to decode such urls
    // displayed in the console.
    
    log( 'exception, Pipelet..' + name
      + ', ' + e
      + ', stack trace: ' + e.stack 
    );
    
    // ToDo: send exception to an exception datafow that can be routed to a server
  } // exception()
  
  /* -------------------------------------------------------------------------------------------
     XS.Event_Emitter
  */
  function Event_Emitter() {
    // Events listeners
    this._events = {};
    
    return this;
  } // Event_Emitter()
  
  XS.Event_Emitter = Event_Emitter;
  
  var Event_Emitter_Prototype = Event_Emitter.prototype;
  
  extend_2( Event_Emitter_Prototype, {
    /* ------------------------------------------------------------------------
       on( event_name, listener [, that] [, once] )
       
       _once( event_name, listener [, that] )
       
       Sets an event listener that listens to events emited by this emitter.
       
       Parameters:
         - event_name: (String) the name of the event.
             
         - listener: (Function) will be called with the parameters emited by
             the event emitter.
           
         - that: (Object) optional, the context to call the listener, if not
             specified the context is this event emitter's instance.
           
         - once: (Boolean) optional, if true, the event listener will be
             removed right before the first emit on this event.
    */
    on: function( event_name, listener, that, once ) {
      var events = this._events
        , listeners = events[ event_name ] || ( events[ event_name ] = [] )
      ;
      
      listeners.push( { listener: listener, that: that || this, once: once } );
      
      de&&ug( 'on()'
        + ', event "' + event_name + '"'
        + ', name: "' + ( this._get_name && this._get_name() || '' ) + '"'
        + ', listeners: ' + listeners.length
        + ', once: ' + once
      );
      
      // ToDo: throw exception if some limit exceeded in the number of listeners to prevent memory leaks
      
      return this;
    }, // on()
    
    // ToDo: implement _off( event_name, listener )
    
    _once: function( event_name, listener, that ) {
      return this.on( event_name, listener, that, true );
    }, // _once()
    
    // ToDo: review API to sent to listener the event name and may be the list of arguments instead of an array
    _emit_event: function( event_name, a ) {
      var events = this._events, listeners, l, name;
      
      if ( de ) {
        if ( name = this._get_name && this._get_name() ) {
          name += '.';
        } else {
          name = '';
        }
        
        name += '_emit_event( ' + event_name + ' )';
      }
      
      if ( ( listeners = events[ event_name ] ) && ( l = listeners.length ) ) {
        de&&ug( name + ', listeners count: ' + l );
        
        try {
          for( var i = -1, listener; listener = listeners[ ++i ]; ) {
            if ( listener.once ) {
              de&&ug( name + ', removing "once" event listener, position: ' + i ); 
              
              listeners.splice( i--, 1 );
              
              l -= 1;
            }
            
            listener.listener.apply( listener.that, a );
          }
        } catch( e ) {
          exception( e, name );//+ ', a: ' + log.s( a ) );
        }
      }
      
      return this;
    } // _emit_event()
  } ); // Event_Emitter instance methods
  
  /* -------------------------------------------------------------------------------------------
     XS.uuid_v4()
  */
  var uuid_v4 = XS.uuid_v4 = uuid.v4;
  
  /* -------------------------------------------------------------------------------------------
     Transactions()
  */
  function Transactions() {
    this.transactions = Dictionary();
    
    return this;
  }
  
  XS.Transactions = Transactions;
  
  extend( Transactions.prototype, {
    get: function( tid ) {
      return this.transactions[ tid ];
    },
    
    get_tids: function() {
      return Object.keys( this.transactions );
    },
    
    toJSON: function() {
      return this.get_tids();
    },
    
    get_transaction: function( count, options, pipelet ) {
      var t, tid, transactions;
      
      if ( options ) {
        if ( t = options.__t ) {
          // nested transaction within this pipelet
          return t.add_operations( count ).set_source_options( options );
        }
        
        if ( tid = options.transaction_id ) {
          // There is an upstream transaction
          
          if ( t = this.transactions[ tid ] ) {
            // nested transaction from an upstream pipelet for which we have already a local transaction
            return t.add_operations( count ).set_source_options( options );
          }
          
          if ( options.more || count > 1 ) {
            // There is more comming from upstream or there are more than one operation for this pipelet
            // ToDo: add xs_core test
            // Need to create a new transaction with this upstream tid
            // Store upstream transaction at this pipelet
            t = ( transactions = this.transactions )[ tid ] = new Transaction( count, options, pipelet );
            
            return t.on( 'ended', function() {
              de&&ug( 'Transactions(), end event, tid: ' + tid );
              
              delete transactions[ tid ];
            } );
          }
        }
      }
      
      return new Transaction( count, options, pipelet );
    }, // get_transaction()
    
    end_transaction: function( t ) {
      t.is_closed() || t.end();
      
      return this;
    } // end_transaction()
  } ); // Transactions instance methods
  
  /* -------------------------------------------------------------------------------------------
     Transaction( count [, options [, pipelet ]] )
     
     Parameters:
       count: the number of operations expected
       
     Optional parameters:
       options: upstream pipelet options
       pipelet: pipelet to emit operations to 
  */
  function Transaction( count, options, pipelet ) {
    var o;
    
    if ( options && ( options.more || count > 1 ) ) {
      // There is more comming from upstream or multiple operations for this transaction 
      // Options will be altered by this transaction, requires a copy
      o = extend_2( {}, options );
    } else {
      o = options;
    }
    
    // Initialize Hidden class
    this.name           = pipelet ? pipelet._get_name() : '';
    this.debug_name     = this.name + '.Transaction..';
    
    this.count          = count;
    
    this.set_source_options( options );
    
    this.emit_options   = o;
    this.o              = extend_2( { __t: this }, o );
    this.added          = [];
    this.removed        = [];
    this.need_close     = false;
    this.closed         = false;
    this.ending         = false;
    this.pipelet        = pipelet;
    
    Event_Emitter.call( this );
    
    de&&ug( 'new Transaction(): ' + log.s( this ) );
    
    return this;
  } // Transaction()
  
  XS.Transaction = subclass( Event_Emitter, Transaction );
  
  extend_2( Transaction.prototype, {
    _get_name: function() {
      return this.name;
    }, // _get_name();
    
    get_tid: function() {
      return this.emit_options && this.emit_options.transaction_id;
    }, // Transaction..get_tid() 
    
    is_closed: function() {
      return this.closed;
    },
    
    toJSON: function() {
      return {
        name          : this._get_name(),
        tid           : this.get_tid(),
        count         : this.count,
        source_more   : this.source_more,
        need_close    : this.need_close,
        closed        : this.is_closed(),
        added_length  : this.added.length,
        removed_length: this.removed.length
      };
    }, // Transaction..toJSON()
    
    add_operations: function( count ) {
      this.count += count;
      
      de&&ug( this.debug_name + 'add_operations(), adding ' + count + ' operations, new total: ' + this.count );
      
      return this;
    }, // Transaction..add_operations()
    
    set_source_options: function( options ) {
      this.source_options = options;
      this.source_more = ( options && options.more ) || false;
      
      de&&ug( this.debug_name + 'set_source_options(), source_more: ' + this.source_more );
      
      return this;
    }, // Transaction..set_source_options()
    
    emit_add: function( values, emit_now ) {
      this.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          this.pipelet.emit( 'add', values, this.get_emit_options() );
        } else {
          push.apply( this.added, values );
        }
      }
      
      this.ending && this.end();
      
      return this;
    }, // Transaction..emit_add()
     
    emit_remove: function( values, emit_now ) {
      this.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          this.pipelet.emit( 'remove', values, this.get_emit_options() );
        } else {
          push.apply( this.removed, values );
        }
      }
      
      this.ending && this.end();
      
      return this;
    }, // Transaction..emit_remove()
    
    emit_nothing: function() {
      this.next();
      
      this.ending && this.end();
      
      return this;
    }, // Transaction..emit_nothing()
    
    get_options: function() {
      if ( this.closed )
        throw new Error ( this.debug_name + 'get_options(), exception: this transaction is already closed' );
      
      var options = this.o;
      
      options.more = this.source_more || this.count > 0 || this.removed.length > 0 || this.added.length > 0;
      
      de&&ug( this.debug_name + 'get_options(), more: ' + options.more );
      
      return options;
    }, // Transaction..get_options()
    
    get_emit_options: function() {
      var tid
        , more = this.get_options().more
        , options = this.emit_options
      ;
      
      if ( this.need_close ) {
        // there was something emited before, transaction id is therfore set
        
        if ( ! more ) {
          // this is the last emit
          this.need_close = options.more = false;
          
          this.closed = true; // this should be the last emit
        }
      } else {
        // there was nothing emited before, transaction id may be unset
        
        if ( more ) {
          // there will be more after this, transaction id may be unset
          
          if ( options ) {
            options.more = this.need_close = true;
            
            if ( options.transaction_id === tid ) {
              // transaction id is not set (undefined)
              tid = options.transaction_id = uuid_v4();
              
              de&&ug( this.debug_name + 'get_emit_options(), new tid: ' + tid );
            }
          } else {
            this.emit_options = options = { more: this.need_close = true, transaction_id: tid = uuid_v4() };
            
            de&&ug( this.debug_name + 'get_emit_options(), new tid: ' + tid );
          }
        } else {
          // there was nothing emited before, and this is the sole emit for this transaction
          this.closed = true; // this should be the only emit
          
          options = this.source_options;
          
          de&&ug( this.debug_name + 'get_emit_options(), use source options: ' + log.s( options ) );
        }
      }
      
      return options;
    }, // Transaction..get_emit_options()
    
    next: function() {
      if ( --this.count >= 0 ) return this;
      
      this.count = 0;
      
      throw new Error( this.debug_name + 'next(), exception: count was already zero' );
    }, // Transaction..next()
    
    /* ------------------------------------------------------------------------
       Transaction..end()
    */
    end: function() {
      if ( this.count || this.source_more ) {
        de&&ug( this.debug_name + 'end(), not ending because count (' + this.count + ') or source_more (' + this.source_more + ')' );
        
        this.ending = true;
        
        return this;
      }
      
      var removed = this.removed
        , added   = this.added
        , pipelet = this.pipelet
      ;
      
      if ( removed.length ) {
        de&&ug( this.debug_name + 'end(), emit removed' );
        
        this.removed = []; // clear before emit() bellow but do not clear this.added just yet to allow emit() to set more
        
        pipelet.emit( 'remove', removed, this.get_emit_options() );
      }
      
      if ( added.length || this.need_close ) {
        de&&ug( this.debug_name + 'end(), emit added' );
        
        this.added = []; // clear before emit() bellow to force to unset more
        
        pipelet.emit( 'add', added, this.get_emit_options() );
      }
      
      return this._emit_event( 'ended' );
    } // Transaction..end()
  } ); // Transaction instance methods
  
  /* -------------------------------------------------------------------------------------------
     XS.more( [ options ] )
     
     Helper function to add the 'more' and 'transaction_id' options into optional options if not
     already present.
     
     Returns options Object with 'more' set to true and 'transaction_id' set to a UUID v4.
     
     Optional Parameter:
       - options: (Object)
  */
  /*
  function more( options ) {
    if ( options ) {
      var is_transaction = typeof options.transaction_id == 'string';
      
      if ( options.more && is_transaction ) return options;
      
      // This is either a single-operation transaction or the end of a transaction
      
      // Copy options to add more and transaction
      options = extend_2( {}, options );
      
      options.more = true;
      
      // Only add transaction_id if not present, it could be the end of an existing transaction
      if ( is_transaction ) return options;
    } else {
      options = { more: true };
    }
    
    options.transaction_id = uuid_v4();
    
    de&&ug( 'more(), start transaction_id: ' + options.transaction_id );
    
    return options;
  } // more()
  
  XS.more = more;
  */
  
  /* -------------------------------------------------------------------------------------------
     XS.no_more( options_more )
     
     Helper function to remove the 'more' option from more() options while keeping the
     transaction id.
     
     Returns options Object with no 'more' flga and 'transaction_id' set to input tranascation
     id.
     
     Parameter:
       - options_more: (Object) returned by more()
  */
  /*
  function no_more( options_more ) {
    var options = extend_2( {}, options_more );
    
    delete options.more;
    
    return options;
  } // no_more()
  
  XS.no_more = no_more;
  */
  
  /* -------------------------------------------------------------------------------------------
     XS.only_more( [ options ] )
     
     Helper function to get options with only the more option set from source options.
     
     Always return an Object with attributes:
       - more: (Boolean):
         - true : input options had a "truly" property "more" and/or a "transaction_id"
                  property
         - false: no input options, no property "more", or "falsy" property "more"
                  and no "transaction_id" property
                  
       - transaction_id: from options.transaction_id if set or new uuid v4 string otherwise
                         and if more is truly.
     
     Optional Parameter:
       - options: (Object)
  */
  function only_more( options ) {
    var more, tid, o = {};
    
    if ( options ) {
      if ( more = options.more ) o.more = true;
      
      if ( tid = options.transaction_id ) {
        o.transaction_id = tid;
      } else if ( more ) {
        throw new Error( 'only_more(), more == true with missing transaction id' );
      }
    }
    
    return o;
  } // only_more()
  
  XS.only_more = only_more;
  
  /* -------------------------------------------------------------------------------------------
     Query( query ).
     
     A query is a set of 'OR-AND' expressions, aka or-terms, where each object is an operand of
     the OR-expression and each property of each object is an operand of the sub-AND expression.
     
     Parameters:
       - query (optional): Array or or-expression (or terms).
     
     Example, the query:
       [
         { flow: 'users' , id: 1092 },
         { flow: 'stores', id: 231  }
       ]
       
       Is equivalent to the JavaScript boolean expression on a value 'v':
         ( v.flow === 'users' &&  v.id === 1092 ) || ( v.flow === 'stores' && v.id === 231 )
       
       Which is also equivalent to an SQL-where clause:
         ( flow = 'users' AND id = 1092 ) OR ( flow = 'stores' AND id = 231 )
     
     So a query is code expressed with sets of JavaScript objects. With Connected Sets, these
     expressions become dataflows, which can enable realtime dynamic filters as implemented in
     filter.js.
     
     Queries are used by Pipelet.._fetch_source() to retrieve subsets of values from source
     dataflows and Pipelet.emit() to filter emitted operations to downstream pipelets.
     
     Query objects are created using a set of expressions as a parameter, the filter code is
     generated using generate() generating the filter() method that filters Arrays of Objects.
     
     A query can be "ORed" with an other query to result in the ORed combination of both
     queries. This is useful to merge a number of branches and build an optimized query for all
     these branches.
     
     The OR operation is provided by Query..add() which adds expressions into an existing
     query. The resulting query is optimized to remove redundant expressions. More details in
     Query..add().
     
     Query..remove() allows to do the opposite of or-operations, effecitvely removing
     or-expressions from an existing query.
     
     A query can be "ANDed" with an other query to result in the ANDed combination of both
     queries. This is useful to restrict one query by another one when two filters are connected
     one downstream of the other. A use case if for combining an authorization query with a user
     query requesting a subset of what this user is authorized to request.
     
     "Anding" queries is provided by Query..and(). 
     
     Last, but not least, multiple queries can be combined to produce and maintain in realtime
     an optimized query tree to allow fast dispatching of a dataflow to many clients each
     with a different query filtering what it processes.
     
     First version queries do not support:
       - Nested attributes that we may implement using the dot notation e.g. 'a1.a2.a3',
       
       - Non-strict-equality comparison such as 'not', 'greater than', etc, that we may
         implement using object values, e.g. v: { $gt: 5, $lt: 10, $not: 7 } which would mean:
         v > 5 AND v < 10 AND v !== 7
         
       - Regular expressions, that we may implement using objects e.g. { $matches: '' }
       
       - OR sub-expressions nested within AND sub-expressions, which can already be expressed
         with OR-AND expressions. However a compiler might reduce other arbitrarily nested
         expressions into the base OR-AND form that is well suited for optimized query
         arithmetics.
         
       - Strings such as SQL-where expressions that a compiler might compile to a valid OR-AND
         query or other representations such as abstract syntax trees.
         
       - More complex arithmetics that would involve more than one attribute per term, e.g.
         sales < costs. These might be better expressed using SQL-like expressions rather than
         trying to describe every possible query using objects.
         
     Roadmap:
       We do not currently have a roadmap specific for query features but work on queries will
       likely become the highest priority once basic routing and authorizations are finalized.
       
       The highest priority for a new operator may be to implement the 'greater than' operator,
       to be able to fetch data past a certain date, or after a certain monotically increasing
       identifier. This might be required to implement replication, and recovering after a
       reconnection without requesting to retransmit every data previously received.
       
       This in turn should allow to easily implement 'less than', 'greater than or equal', and
       'less than or equal operators'.
       
       After this, the 'not' operator is considered highest in priority at this time but this
       could change based on actual applications being developped.
     
     Performance considerations:
       Query_Tree performance is considered more important than Query operations performance.
       This is because query trees have to route a large number of data events while queries
       themselves are expected to have a much lower rate of change in most applications.
       
       To provide best query syntax while maintaining high performances might require to have
       two syntaxes: one for queries for designers, and one for queries trees which is internal
       to Connected Sets' implementation.
  */
  function Query( query ) {
    // Result expressions
    this.query = [];
    this.keys  = []; // Query expressions keys cache
    
    // Expressions optimized-out by Query..add()
    this.optimized      = [];
    this.optimized_keys = [];
    
    // Operations resulting from operations
    this.clear_operations();
    
    // Add the initial query in an optimized way
    return query ? this.add( query ) : this;
  } // Query()
  
  var query_get_keys = Query.get_keys = function( query ) {
    var keys = [], i = -1, e;
    
    while( e = query[ ++i ] ) keys.push( Object.keys( e ) );
    
    return keys;
  };
  
  extend_2( Query.prototype, {
    /* -----------------------------------------------------------------------------------------
       Query..clear_operations()
       
       Clears adds and removes from previous operations.
       
       Also used to initialize adds and removes to [] in Query constructor.
    */
    clear_operations: function() {
      this.adds = [];
      this.removes = [];
      
      return this;
    }, // clear_operations()
    
    /* -----------------------------------------------------------------------------------------
       Query..add( or_expressions )
       
       Add or_expressions to query, logically resulting in OR-ing query expressions.
       
       Parameters:
         - or_expressions: Array of Query expressions (or-terms)
       
       Behavior:
         Added expressions are pushed into 'adds' that may be used to produce output events of
         a Query dataflow and which may be different than the 'or_expressions' parameter because
         of query optimizations.
         
         The result is optimized to provide the least number of OR-expressions in the resulting
         query.
         
         If two queries have common terms (equal attribute and value), it can be shown that one
         of the resulting sets would be mathematically included into the other. In that case
         there is no need to keep both expressions, and the least restrictive (the one resulting
         in the largest set) is kept in the result while the other is optimized-out.
         
         When the result is optimized, expessions may be removed from the result. These
         optimized-out expressions are added to both 'removed' and 'optimized'.
         
         Optimized-out expression are memorized into instance variable 'optimized' to allow
         Query..remove() to either remove from optimized or restore optimized-out expressions
         when expressions are removed from the result query.
       
       Example:
         new Query( [ { flow: 'store' } ] ).add( [ { flow: 'user' } ] )
         
         results in the query:
           [ { flow: 'store' }, { flow: 'user' } ]
       
       Optimized Examples:
         new Query( [ { flow: 'store' } ] ).add( [ { flow: 'store', id: 1465 } ] )
           -->
           qyery    : [ { flow: 'store' } ]
           optimized: [ { flow: 'store', id: 1465 } ]
           
           adds     : [ { flow: 'store' } ]
           removes  : []
           
           The last added expression { flow: 'store', id: 1465 } is more restrictive, OR-wise,
           than the previous expression { flow: 'store' }.
           
           It is therefore not added to the result 'query' but optimized-out into 'optimized'.
           
         new Query( [ { flow: 'store', id: 1465 } ] ).add( [ { flow: 'store' } ] )
           -->
           query    : [ { flow: 'store' } ]
           optimized: [ { flow: 'store', id: 1465 } ]
           
           adds     : [ { flow: 'store', id: 1465 } , { flow: 'store' } ]
           removes  : [ { flow: 'store', id: 1465 } ]
           
           There is only one expression in the result because the last added expression is less
           restrictive, OR-wise, than the first expression which is optimized-out into
           'optimized'.
           
           Compared to the previous example, the resulting state in 'query' and 'optimized' is
           the same.
           
           One can say that add() is commutative as it should be expected.
           
           But the order of operations being different resulted in the expression
           { flow: 'store', id: 1465 } added then removed, hence the difference in 'adds' and
           'removes'.
           
           However one can easily see that that procesing these adds and removes yields the same
           result in both examples as it should be expected.
           
           In a future version, we might consider optimizing adds by removing expressions
           removed. If we implement this optimization, 'adds' and 'removes' final state would
           be strictly identical in both examples. 
           
    */
    add: function( q1 ) {
      // All variables with a trailing 0 correspond to the current query
      // All variables with a trailing 1 correspond to q1, the parameter query
      var that = this, q0 = this.query, keys0s = this.keys
        , keys1s, i1 = -1, e1
      ;
      
      if ( q1 instanceof Query ) {
        keys1s = q1.keys;
        q1 = q1.query;
      } else {
        keys1s = query_get_keys( q1 );
      }
      
      while ( e1 = q1[ ++i1 ] ) {
        var keys1 = keys1s[ i1 ], k1l = keys1.length
          , added = false
          , i0 = -1, e0
        ;
        
        // Optimize by adding the least number of queries to the result set
        while ( e0 = q0[ ++i0 ] ) {
          // Based on the number of properties, determine which expression, e0 or e1, may be less restrictive, OR-wise than the other
          
          var keys0 = keys0s[ i0 ]
            , keys = keys0.length <= k1l ? keys0 : keys1
            , i = -1, key
            , less_restrictive = true
          ;
          
          while ( key = keys[ ++i ] ) {
            if ( e0[ key ] !== e1[ key ] ) {
              less_restrictive = false;
              
              break;
            }
          }
          
          if ( less_restrictive ) {
            // One expression, e0 or e1, is less restrictive than the other. I.e. one expression
            // describes a set that mathematically includes the other.
            
            if ( keys === keys1 ) {
              // e1 is the less restrictive query --> Optimize-out e0
              
              // Remove e0 from result set and keys0 so that we no longer look it up
                  q0.splice( i0, 1 );
              keys0s.splice( i0--, 1 );
              
              this.removes.push( e0 );
              
              this.optimized.push( e0 );
              this.optimized_keys.push( keys0 );
              
              // There could be more expression in q0 more restrictive than e1 that would therefore need to be optimized-out
              
              // Note that, unless there is a bug in this implementation of Query, there cannot
              // exist another expression in q0 that would be less restrictive than e1 because
              // This would imply by transitivity that this other expression would also be
              // less restrictive than the current expression in q0. This cannot be if q0 is
              // already optimized and no expression is less restrictive than another one in q0.
            } else {
              // e1 is as restrictive or more restrictive than e0 --> optimize-out e1
              
              this.optimized.push( e1 );
              this.optimized_keys.push( keys1 );
              
              added = true;
              
              break; // if q0 is already optimized there should not be another expression less restrictive than e1
            }
          }
        } // for all sub expression from q0
        
        // Add e1 into result query if none was less restrictive than another
        added || add( e1, keys1 );
      } // for all sub expression from q1
      
      return this;
      
      function add( e, keys ) {
            q0.push( e );
        keys0s.push( keys );
        
        that.adds.push( e );
      }
    }, // add()
    
    /* -----------------------------------------------------------------------------------------
      Query..remove( expressions )
      
      Removes expressions from query.
      
      Parameters:
        - expressions: Array of Query expressions (or-terms)
      
      Behavior:
        Removed expressions should have been added previously with Query..add() or an exception
        is triggered.
        
        If or-terms had been optimized-out of the query, these can still be removed without
        triggering an exception.
        
        If a removed expression had optimized-out other expressions, these are recovered back into
        the query.
      
      Exemples:
        new Query( [ { id: 1 }, { id: 2 } ] ).remove( [ { id: 2 } ] )
        
          --> [ { id: 1 } ]
        
        new Query( [ { id: 1 }, { id: 2 } ] ).remove( [ { id: 3 } ] )
        
          --> exception
        
        new Query( [ { id: 1 }, { id: 2 } ] ).remove( [ { id: 2, name: 'test' } ] )
        
          --> exception
          
        new Query( [ { flow: "user", id: 1 } ] )
          .add   ( [ { flow: "user"        } ] ) // { flow: "user", id: 1 } is optimized-out
          .remove( [ { flow: "user", id: 1 } ] ) // no excpetion when removing optimized-out expression
          
          --> [ { flow: "user" } ]
          
        new Query( [ { flow: "user", id: 1 } ] )
          .add   ( [ { flow: "user"        } ] ) // { flow: "user", id: 1 } is optimized-out
          .remove( [ { flow: "user"        } ] ) // recovers { flow: "user", id: 1 }
          
          --> [ { flow: "user", id: 1 } ]
    */
    remove: function( q1 ) {
      var keys1s;
      
      // Make shallow copies, one level deep, of q1 and keys1s, because remove() modifies the array
      if ( q1 instanceof Query ) {
        keys1s = q1.keys1s.slice( 0 );
        q1     = q1.query .slice( 0 );
      } else {
        q1 = q1.slice( 0 );
        keys1s = query_get_keys( q1 );
      }
      
      var optimized = this.optimized;
      
      // Atempt to remove expressions from optimized-out expressions first
      remove( optimized, this.optimized_keys, q1, keys1s );
      
      if ( q1.length ) {
        remove( this.query, this.keys, q1, keys1s, this.removes );
        
        if ( q1.length ) throw new Error( 'Query..remove() could not find expressions to remove: ' + log.s( q1 ) );
        
        if ( optimized.length ) {
          // Recover optimized expressions that may have become least restrictive after removal
          // from current query that were more restrictive
          
          // Forget reference to optimized expressions
          this.optimized      = [];
          this.optimized_keys = []; 
          
          this.add( optimized );
        }
      }
      
      return this;
      
      function remove( q0, keys0s, q1, keys1s, removes ) {
        var i0, i1, e0, e1, keys0, keys1, l1;
        
        for ( i1 = -1; e1 = q1[ ++i1 ]; ) { // for all terms to remove
          l1 = ( keys1 = keys1s[ i1 ] ).length;
          
          for ( i0 = -1; e0 = q0[ ++i0 ]; ) {
            if ( ( keys0 = keys0s[ i0 ] ).length != l1 ) continue; // these cannot be equal
            
            for ( var k = -1, key; key = keys1[ ++k ]; ) if ( e0[ key ] !== e1[ key ] ) break;
            
            if ( key ) continue; // some term did not match
            
            // all terms matched => remove e0
            keys0s.splice( i0  , 1 );
            q0    .splice( i0--, 1 );
            
            // Also remove e1 so that caller can attempt to remove remaining expressions, or
            // generate exception if some are not removed
            keys1s.splice( i1  , 1 );
            q1    .splice( i1--, 1 );
            
            removes && removes.push( e0 );
            
            break;
          }
        }
      }
    }, // remove()
    
    /* -----------------------------------------------------------------------------------------
       Query..and( q1 )
       
       AND two queries. The result is optimized to provide the least number of OR-expressions in
       the resulting query.
       
       Example:
         new Query( [ { flow: 'store', id: 1465 }, { flow: 'store', id: 3678 } ] )
           .and( [ { id: 3678 } ] )
         
         results in the query:
           [ { flow: 'store', id: 3678 } ]
           
       Algorithm:
         1/ Factorize ( e00 .. OR e0n ) AND ( e10 .. OR e1n ) into l0 x l1 AND terms:
            ( e00 AND e10 ) .. OR ( e00 AND e1n ) .. OR ( e0n AND e10 ) .. OR ( e0n AND e1n )
            
         2/ To perform pi AND ej, lookup properties of ei and ej, pick the one that has the
            least number of properties, let it be ea and the other eb, then:
            - if one property of ea exists in eb but with a diffent value, then the result is
              always false, and no term is produced
            - if all properties of ea are either not present of have the same value in eb, then
              extend e0 with e1 to produce the ANDed expression
            
         3/ Or the result of the previous operation produced terms with previously accumulated
            results using optimized Query..add()
    */
    and: function( q1 ) {
      // All variables with a trailing 0 correspond to the current query
      // All variables with a trailing 1 correspond to q1, the parameter query
      var u, q0 = this.query, i0 = -1, e0, keys0s = this.keys
        , keys1s
        , result = []
      ;
      
      if ( q1 instanceof Query ) {
        keys1s = q1.keys;
        q1 = q1.query;
      } else {
        keys1s = query_get_keys( q1 );
      }
      
      while ( e0 = q0[ ++i0 ] ) {
        var k0 = keys0s[ i0 ], k0l = k0.length, i1 = -1, e1, produced = false, remove = false;
        
        while ( e1 = q1[ ++i1 ] ) {
          // Perform e0 AND e1
          var k1 = keys1s[ i1 ], k1l = k1.length, ka, ea, eb
            , produce = true, not_equal = k0l < k1l
            , i = -1, key
          ;
          
          // Let ka be the smallest key, ea the expression with the smallest key, and eb that with the largest key
          if ( not_equal ) {
            ka = k0; ea = e0; eb = e1;
          } else {
            ka = k1; ea = e1; eb = e0;
          }
          
          while ( key = ka[ ++i ] ) {
            if ( key in eb ) {
              // term is present in both expressions
              
              if ( eb[ key ] !== ea[ key ] ) {
                // the filter for this term would always be false
                produce = false;
                
                break;
              }
            } else {
              // At least one term present in one expression is not present in the other
              // Expressions can no longer be equal
              not_equal = true;
            }
          }
          
          if ( produce ) {
            produced = true;
            
            if ( not_equal ) {
              // e0 is less restrictive than e1
              // will have to remove e0
              remove = true;
              
              // add new value to result
              result.push( extend( {}, e0, e1 ) );
            }
          }
        }
        
        if ( ! produced || remove ) {
          keys0s.splice( i0, 1 );
          q0.splice( i0--, 1 );
          
          this.removes.push( e0 );
        }
      }
      
      this.add( result );
      
      return this;
    }, // and()
    
    /* -----------------------------------------------------------------------------------------
      Query..generate()
      
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
              
              if( _flow === "store"                ) { out.push( v ); continue; };
              if( _flow === "user" && v.id === 231 ) { out.push( v ); continue; };
            } 
            
            return out;
          } // Query..filter()
    */
    generate: function() {
      var u, q = this.query, l = q.length;
      
      var terms_counts = {}, vars = [], no_and_term = false;
      
      // Determine which terns (attributes of proposition Objects) should be cached as variables:
      //   Those which are used more than once
      // Also finds out if any term has no and terms which would be a pass-all term condition
      for ( var i = -1; ++i < l; ) {
        var p = q[ i ];
        
        no_and_term = true;
        
        for ( var t in p ) {
          no_and_term = false;
          
          if ( terms_counts[ t ] ) {
            if ( ++terms_counts[ t ] == 2 ) {
              vars.push( '_' + t + ' = v.' + t )
            }
          } else {
            terms_counts[ t ] = 1;
          }
        }
        
        if ( no_and_term ) break;
      }
      
      var code = new Code()
        ._function( 'this.filter', u, [ 'values' ] );
        
          if ( no_and_term ) {
            code.add( 'return values;' ); // pass-all
          } else if ( ! l ) {
            code.add( 'return [];' ); // nul-filter
          } else {
            code._var( 'out = []' )
            
            ._for( 'var i = -1, l = values.length', '++i < l' )
              ._var( 'v = values[ i ]' );
              
              if ( vars.length ) code._var( vars );
              
              for ( i = -1; ++i < l; ) {
                var e = [];
                
                p = q[ i ];
                
                for ( var t in p ) {
                  var v = p[ t ];
                  
                  if ( typeof v == 'string' ) v = '"' + v + '"';
                  
                  e.push( ( terms_counts[ t ] > 1 ? '_' : 'v.' ) + t + ' === ' + v );
                }
                
                code.add( 'if( ' + e.join( ' && ' ) + ' ) { out.push( v ); continue; }' );
              }
            code.end()
            
            .add( 'return out' )
          }
          
        code.end( 'Query..filter()' )
      ;
      
      eval( code.get() );
      
      return this;
    } // generate()
  } ); // Query instance methods
  
  Query.pass_all = new Query( [ {} ] ).generate();
  Query.nul      = new Query( [    ] ).generate();
  
  /* -------------------------------------------------------------------------------------------
     Query_Tree( options )
     
     Receives Query(ies) and produces an optimized decision tree to efficiently dispatch
     operations to a large number of downstream pipelets each filtered by potentially complex
     query with dozens or hundreds of terms.
     
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
     id 8 and 2:
     
       { "flow": {
         "user": { "id": { "5": user_5, "7": user_7, "12": user_12, "3": user_3 } },
         
         "store": { "id": { "8": [ user_5, user_7, user_12 ], "2": user_3 } }
       } }
     
     Please note that current implementation's query tree has a different structure, that may
     (will) change in the future, and that therefore one should not rely on this structure
     in users' code.
     
     Now in the worst case scenario, finding the full list of subscribers for an operation
     requires to evaluate two terms versus 12 terms for the trivial implementation. But
     most importantly, as the number of users connected to this dispatcher increases, the
     Query_Tree will always find the list of all subscribers after evaluating two terms, versus
     ( 2 or 3 ) * n terms for the trivial dispatcher.
     
     Finding the full list of subscribers using the Query_Tree completes in O( t ) time vs
     O( n * t ) time for the trivial implementation.
     
     If one considers that the number of terms is bound only by the complexity of the
     application, then these O numbers can be understood as:
     
       O( application_complexity * number_of_connected_users )
     vs
       O( application_complexity )
     
     Obviously the second is user-scalable while the first is not.
     
     Both algorithms do not scale with application complexity which therfore must be dealt with
     raw performence. This performance is improved with ConnectedSets by merging queries
     upstream using Query..and() and Query..add(). This is particularly useful for authorization
     rules that arguably constitute the largest source of complexity for modern web
     applications.
  */
  function Query_Tree( options ) {
    // !!! All initialization code should be in init_query_tree(), because this is also called
    // by the Pipelet constructor
    this.init_query_tree();
    
    return Pipelet.call( this, options );
  } // Query_Tree()
  
  // Nodes for Query Trees
  function Query_Tree_Node() {
    // hashed by terms' keys, each branch is the hashed by terms' values to lead to it's sub-node
    this.branches = Dictionary();
    
    // all the term keys for the above branches
    this.keys = [];
    
    // all subscriber pipelets
    this.subscribers = [];
    
    // all subscribers values as they are accumulated
    this.subscribers_values = [];
    
    return this;
  } // Query_Tree_Node()
  
  var Query_Tree_Prototype = {
    // !!! All initialization code goes here, because this is also called by the Pipelet constructor
    init_query_tree: function() {
      // Initialize all query tree properties here to avoid modifying v8 hidden classes
      this.query_tree_top = new Query_Tree_Node();
      
      this.transactions           = Dictionary(); // ongoing transactions
      this.source_transactions    = Dictionary(); // incomming transactions by source
      
      this.source_subscriber_index = 0; // incomming subscriber index in current operation
      
      return this;
    }, // init_query_tree()
    
    // Add or terms for a subscriber
    query_tree_add: function( or_terms, subscriber ) {
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
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in query_tree_add()
            
            // Lookup branch for this key, it must exist because it is created when a key is added
            branch = branches[ key ];
            
            // Lookup the sub-node for this value or create one if none exists
            node = branch[ v ] || ( branch[ v ] = new Query_Tree_Node() );
            
            break;
          }
          
          if ( v !== u ) continue;
          
          // No existing node key found in this term
          // Retreive the first key from term keys, add it to this node's keys
          keys.push( key = term_keys.shift() );
          
          // Create new branch with this key
          branch = branches[ key ] = Dictionary();
          
          // Create sub-node for first value in this new branch
          node = branch[ v = term[ key ] ] = new Query_Tree_Node();
        }
        // No more term keys to locate or create in this tree
        // We have found (or created) the leaf node for this term
        // Add this term's subscriber to this leaf
        node.subscribers.push( subscriber );  // subscribers is always defined unless there is a bug in Query_Tree() or add_value()
        
        return node; // return the leaf node
      } // add_term()
    }, // query_tree_add()
    
    query_tree_remove: function( or_terms, subscriber ) {
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
        var subscribers = node.subscribers
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
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in query_tree_add()
            
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
          // Remove subscriber from leaf
          var index = subscribers.indexOf( subscriber );
          
          // ToDo: this exception was seen: add tests, reproduce and fix
          if ( index == -1 ) throw new Error( 'Query_tree..remove(), Cannot find receipient in tree where it was expected' );
          
          subscribers.splice( index, 1 );
        }
        
        // Return true is the node is now empty, false if not empty
        // It is empty if if has no subscribers and no keys
        return ( subscribers.length + keys.length ) == 0;
      } // add_term()
    }, // query_tree_remove()
    
    // ToDo: optimize unfiltered routing in top node.
    query_tree_emit: function( operation, values, options ) {
      // Get no_more and transaction_id from options
      var more, transaction_id, transaction;
      
      if ( options ) {
        more           = options.more;
        transaction_id = options.transaction_id;
        
        if ( transaction_id ) {
          transaction = this.transactions[ transaction_id ] || ( this.transactions[ transaction_id ] = [] );
        }
      }
      
      var top = this.query_tree_top;
      
      // Each subscriber is an object:
      //  p: subscriber pipelet
      //  v: values to emit
      var subscribers = [], i, p, v, rl;
      
      switch( operation ) {
        case 'update':
          for ( i = -1; v = values[ ++i ]; ) {
            route_update( this, more && transaction, transaction_id, top, subscribers, v[ 0 ], i, 0 ); // route remove
            route_update( this, more && transaction, transaction_id, top, subscribers, v[ 1 ], i, 1 ); // route add
          }
          
          more || this._end_transaction( transaction, transaction_id, options );
          
          // emit operations to all subscribers
          for ( i = -1, rl = subscribers.length; ++i < rl; ) {
            var r = subscribers[ i ], p = r.p, added = [], removed = [], updated = [];
            
            p.source_subscriber_index = 0;
            
            v = r.v;
            
            for ( var j = -1, vl = v.length; ++j < vl; ) {
              var update = v[ j ];
              
              if ( update ) {
                // there is an add, remove, or update at this position
                if ( update[ 0 ] ) {
                  if ( update[ 1 ] ) {
                    // this is an update
                    updated.push( update );
                  } else {
                    // this is a remove
                    removed.push( update[ 0 ] );
                  }
                } else {
                  // this is an add
                  added.push( update[ 1 ] );
                }
              }
            }
            
            var operations = ( removed.length && 1 ) + ( added.length && 1 ) + ( updated.length && 1 )
              , options_more
            ;
            
            // ToDo: query_tree_emit()..update(): test transaction w/ nesting
            var t = new Transaction( operations, options );
            
            removed.length && p.remove( removed, t.next().get_emit_options() );
            added  .length && p.add   ( added  , t.next().get_emit_options() );
            updated.length && p.update( updated, t.next().get_emit_options() );
          }
        return this;
        
        case 'clear':
          route_clear( top, subscribers );
          
          more || this._end_transaction( transaction, transaction_id, options );
          
          // emit clear to all subscribers
          for ( i = -1, rl = subscribers.length; ++i < rl; ) {
            p = subscribers[ i ];
            
            p.source_subscriber_index = 0;
            
            p.clear( options );
          }
        return this;
      }
      
      // This is an add or remove operation
      
      // Route each value independently, to accumulate filtered node.subscribers_values in each node
      // Note: the last parameter of route_value() is pushed, an array of destination pipelets
      //   source_subscriber_index used to prevent sending duplicate values to each pipelets.
      //   These indexes start at 1, therefore the first element of the array could be uninitialized
      //   but this could result in an Array holding the undefined value followed by integers. In v8
      //   this would result in realocation of the Array. This is why we initialize pushed with the
      //   first element set to an integer, preventing realocation.
      for ( i = -1; v = values[ ++i ]; ) {
        route_value( this, more && transaction, transaction_id, top, subscribers, v, [ 0 ] );
      }
      
      more || this._end_transaction( transaction, transaction_id, options );
      
      // Emit accumulated values in subscribers[] from previous loop
      subscribers_emit( subscribers );
      
      return this;
      
      // Emit accumulated values to subscribers
      function subscribers_emit( subscribers ) {
        var i, l, r, p;
        
        for ( i = -1, l = subscribers.length; ++i < l; ) {
          r = subscribers[ i ], p = r.p;
          
          p.source_subscriber_index = 0; // we are done sending data for this operation to this pipelet
          
          p[ operation ]( r.v, options );
        }
      } // subscribers_emit()
      
      // Route value, recursively
      function route_value( that, transaction, transaction_id, node, subscribers, value, pushed ) {
        var keys             = node.keys, key
          , branches         = node.branches
          , node_subscribers = node.subscribers
          
          , rl               = node_subscribers.length
          , i, v, child
        ;
        
        // Push value into this node's subscribers
        // Except if this value was already pushed to some subscribers, preventing duplicates
        // This also guaranties that operations are sent in the same order received although this is not a requirement
        // Duplicates may happen on queries with an intersection
        // This also simplifies emission greatly at a the higher cost of this loop that depends on the number of subscribers
        // for this operation
        for( i = -1; ++i < rl; ) {
          var p = node_subscribers[ i ]
            , subscriber_index = p.source_subscriber_index
          ;
          
          if ( subscriber_index ) {
            // This pipelet already has at least one value for this operation
            if ( pushed[ subscriber_index ] ) continue; // this pipelet is already marked for this value, do not duplicate
            
            pushed[ subscriber_index ] = 1;
            
            subscribers[ subscriber_index - 1 ].v.push( value );
          } else {
            // This pipelet does not yet have any value from this operation
            subscribers.push( { p: p, v: [ value ] } );
            
            // This value is now pushed once, meorize it to avoid duplication later in the tree
            pushed[ p.source_subscriber_index = subscribers.length ] = 1; // pushed[] indexes start at 1
            
            if ( transaction ) {
              // there is an ongoing transaction with more operations to come after the current operation
              that._add_destination_to_transaction( transaction, p, transaction_id );
            }
          }
        }
        
        // Lookup child nodes for possible additional matches
        for( i = -1; key = keys[ ++i ]; ) {
          if ( ( v = value[ key ] ) !== u && ( child = branches[ key ][ v ] ) ) {
            // We have a value for this term and this value has a child node, descend
            route_value( that, transaction, transaction_id, child, subscribers, value, pushed );
          }
          // Keep looking for other possible matches
        } // for all term keys
      } // route_value()
      
      // Route update, recursively
      function route_update( that, transaction, transaction_id, node, subscribers, value, position, offset ) {
        var keys             = node.keys, key
          , branches         = node.branches
          , node_subscribers = node.subscribers
          
          , rl               = node_subscribers.length
          , i, v, u, child
        ;
        
        // Push value into this node's subscribers at position and offset
        // Except if this value was already pushed to some subscribers, preventing duplicates
        // This also guaranties that operations are sent in the same order received although this is not a requirement
        // Duplicates may happen on queries with an intersection
        for( i = -1; ++i < rl; ) {
          var p = node_subscribers[ i ]
            , subscriber_index = p.source_subscriber_index
          ;
          
          if ( subscriber_index ) {
            // This pipelet already has at least one update value for this operation
            v = subscribers[ subscriber_index - 1 ].v;
          } else {
            // This pipelet does not have any update yet
            subscribers.push( { p: p, v: v = [] } );
            
            p.source_subscriber_index = subscribers.length; // source subscriber indexes start at 1
            
            if ( transaction ) {
              // there is an ongoing transaction with more operations to come after the current operation
              that._add_destination_to_transaction( transaction, p, transaction_id );
            }
          }
          
          // ToDo: test updates, 4 cases at least including duplicates
          if ( v[ position ] ) {
            // there is already one of the two values set
            // duplicates are copied at the same position and offset, preventing duplicates
            v[ position ][ offset ] = value;
          } else if ( offset ) {
            // first value at position 1
            v[ position ] = v = [ u, value ];
          } else {
            // first value at position 0
            v[ position ] = [ value ];
          }
        }
        
        // Lookup child nodes for possible additional matches
        for( i = -1; key = keys[ ++i ]; ) {
          if ( ( v = value[ key ] ) !== u && ( child = branches[ key ][ v ] ) ) {
            // We have a value for this term and this value has a child node, descend
            route_update( that, transaction, transaction_id, child, subscribers, value, position, offset );
          }
          // Keep looking for other possible matches
        } // for all term keys
      } // route_update()
      
      function route_clear( node, subscribers ) {
        // Lookup all subscribers to clear
        var branches         = node.branches
          , keys             = node.keys
          , node_subscribers = node.subscribers
          
          , rl = node_subscribers.length
          , i, key
        ;
        
        // Send clear only once per subscriber pipelet
        for( i = -1; ++i < rl; ) {
          var p = node_subscribers[ i ]
            , subscriber_index = p.source_subscriber_index
          ;
          
          if ( subscriber_index ) continue; 
          
          // This pipelet is not marked for clearing yet
          subscribers.push( p );
          
          p.source_subscriber_index = subscribers.length;
        }
        
        for( i = -1; key = keys[ ++i ]; ) {
          var branch = branches[ key ];
          
          for ( var value in branch ) route_clear( branch[ value ], subscribers );
        }
      } // route_clear()
    }, // query_tree_emit()
    
    _add_destination_to_transaction: function( transaction, p, transaction_id ) {  
      // Check if this destination pipelet has its source_transactions set for this 
      var source_transactions = p.source_transactions
        , source_transaction  = source_transactions[ transaction_id ]
        , j, sl
      ;
      
      // ToDo: make sure this gets tested as well as every branch of this complex section of code
      if ( source_transaction ) {
        // lookup source_transaction to find out if it has source
        for ( j = -1, sl = source_transaction.length; ++j < sl; ) {
          if ( source_transaction[ j ].source === this ) return this; // already added
        }
        // That source has not yet emited any value to this destination for this transaction
      } else {
        // This transaction has not been started yet at this destination pipelet
        
        // There may be more than one source emiting data to the same destination during the same transaction if the
        // dataflow graph is not a strict tree but has loops or forks followed by unions.
        source_transaction = source_transactions[ transaction_id ] = [];
      }
      
      // Memorize the position at this source for this transaction to allow fast removal from source
      source_transaction.push( { source: this, position: transaction.length } );
      
      // Add destination into the list of pipelets that have received data for this transaction and source
      transaction.push( p );
      
      return this;
    }, // _add_destination_to_transaction()
    
    _end_transaction: function( transaction, transaction_id, options ) {
      if ( ! transaction ) return; // this is not a transaction
      
      delete this.transactions[ transaction_id ]; // was the reference to transaction
      
      var l = transaction.length;
      
      if ( l ) {
        // this is the end of a transaction
        // ToDo: provide tests for transaction termination
        
        // terminate this transaction for all destination pipelets except those which are set to send data
        // as marked by a non-zero source_subscriber_index
        for ( var i = -1, p; ++i < l; ) {
          p = transaction[ i ];
          
          // Remove this source from p.source_transactions
          var source_transactions = p.source_transactions
            , source_transaction = source_transactions[ transaction_id ]
            , sl = source_transaction.length
            , not_found = true
            , j
          ;
          
          de&&ug( 'end_transaction(), transaction id: ' + transaction_id + ', source_transaction length: ' + sl );
          
          for ( j = -1; ++j < sl; ) {
            if ( source_transaction[ j ].source === this ) {
              delete source_transactions[ source_transaction ];
              
              not_found = false;
              
              break;
            }
          }
          
          if ( not_found ) {
            try {
              throw new Error( 'Expected to find this source as a source_transaction' );
            } catch( e ) {
              exception( e, 'query_tree_emit()/end_transaction()' );
            }
          }
          
          if ( p.source_subscriber_index ) continue; // the transaction will terminate in the subscribers emit
          
          // Terminate the transaction
          p.add( [], options );
        }
      }
      
      return this;
    }, // _end_transaction()
    
    _end_source_transactions: function() {
      // ToDo: implement and call on unplug()
      var source_transactions = this.source_transactions
        , transaction_id, source_transaction
      ;
      
      for ( transaction_id in source_transactions ) {
        source_transaction = source_transactions[ transaction_id ];
        
        source = source_transaction.source;
        
        transaction = source.transactions[ transaction_id ];
        
        transaction.splice( source_transaction.position, 1 );
        
        if ( transaction.length == 0 ) delete source.transactions[ transaction_id ];
        
        this.add( [], { transaction_id: transaction_id } );
      }
      
      this.source_transactions = Dictionary();
      
      return this;
    }, // _end_source_transactions()
    
    /* ------------------------------------------------------------------------
       query_tree_pause( destination )
       
       Pause emit_xxx to destination
    */
    query_tree_pause: function( destination ) {
      // ToDo: implement query_tree_pause()
      return this;
    }, // query_tree_pause()
    
    /* ------------------------------------------------------------------------
       query_tree_resume( destination )
       
       Resume emit_xxx to destination
    */
    query_tree_resume: function( destination ) {
      // ToDo: implement query_tree_resume()
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
    // ToDo: rename options into _options
    this.options = options || {};
    
    // The source, aka upstream, pipelet
    this._source = null;
    
    // Default source query for upstream pipelet
    this._query = Query.pass_all;
    
    // Stateless pipelets do not need to add their content during add_source()
    this._lazy = true;
    
    // Ongoing transactions
    this._transactions = new Transactions();
    
    // Objects's key
    this._key = this.options.key;
    
    // Events Emitter super-class
    Event_Emitter.call( this );
    
    // ToDo: make query tree a contrained object rather than a base class or embedded class
    this.init_query_tree();
    
    return this;
  } // Pipelet()
  
  var p = subclass( Event_Emitter, Pipelet ).prototype;
  
  extend( p, Query_Tree_Prototype, {
    _get_name: function() {
      return this.options.name;
    },
    
    /* ------------------------------------------------------------------------
       _transform( values, options, caller )
       
       Transforms an array of values into an other array of values according
       to the current pipelet role.
       
       Default is to return all values unaltered. Every pipelet should either
       implement _transform() if it is stateless or fetch() if it is statefull
       and/or implement add(), remove(), and update().
       
       Parameters:
         - values : (Array) values to transform
         - options: (Object) from add / remove / update
         - caller : (String) the name of the function that called _transform.
             current values are 'fetch', 'add', and 'remove'. Update calls the
             _transform twice, first as 'remove', then as 'add'.
    */
    _transform: function( values ) {
      return values;
    }, // _transform()
    
    /* ------------------------------------------------------------------------
       _transaction( count, options, f )
    */
    _transaction: function( count, options, f ) {
      var name = ', name: ' + this.options.name, that = this;
      
      de&&ug( '_transaction()' + name + ', count: ' + count + ', options: ' + log.s( options ) );
      
      if ( count == 0 ) {
        // Forward if this is the end of an upstream transaction, i.e. no-more
        return options && options.more ? this : this.emit_add( [], options );
      }
      
      var t = this._transactions.get_transaction( count, options, this );
      
      try {
        f.call( this, t, count )
      } catch( e ) {
        this._transactions.end_transaction( t );
        
        // ToDo: _transaction(): send event on exception
        throw e;
      }
      
      this._transactions.end_transaction( t );
      
      return this;
    }, // _transaction()
    
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
      return this._transaction( transaction.length, options, function( t, l ) {
        for ( var i = -1, a; ++i < l; ) {
          a = transaction[ i ];
          
          this[ a.action ]( a.objects, t.next().get_emit_options() ); // ToDo: should be using get_options()
        }
      } );
    }, // notify()
    
    /* ------------------------------------------------------------------------
       add( added [, options ] )
       
       Add objects to this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly
       by users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_add() of
       transformed objects by _transform().
       
       Parameters:
         added: Array of object values to add
         
         option: optional object
    */
    add: function( added, options ) {
      return this.emit_add( this._transform( added, options, 'add' ), options );
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
       transformed objects by _transform().
       
       Parameters:
         removed: Array of object values to remove
         
         option: optional object
    */
    remove: function( removed, options ) {
      return this.emit_remove( this._transform( removed, options, 'remove' ), options );
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
       
       This method can be overloaded by derived classes, typically for
       performance reasons.
       
       This default version is meant to be semantically correct for all
       pipelets. Each update is excuted in the order of appearance, as
       a remove() followed by an add() the whole update is encapsulated
       in a transaction.
       
       Downstream pipelets will therfore not see updates but removes and adds
       in a transaction. 
       
       Parameters:
         updates: Array of updates, each update is an Array of two objects:
           - the first is the previous object value (to be removed),
           - the second is the updated object value (to be added).
         
         option: optional object
    */
    update: function( _updates, options ) {
      var _l = _updates.length;
      
      de&&ug( 'update(), name: ' + this.options.name + ', updates: ' + _l );
      
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
            
            this.remove( [ update[ 0 ] ], options );
            this.add   ( [ update[ 1 ] ], options );
          }
        }
        
        // last (or only) update
        update = updates[ ++i ];
        
        this.remove( [ update[ 0 ] ], options );
        this.add   ( [ update[ 1 ] ], t.next().get_emit_options() );
      } );
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
      var name = this.options.name, more, more_label = '', tid, u;
      
      if ( options ) {
        if ( more = options.more ) {
          more_label = ', more: ' + more;
        } else {
          more = false;
        }
        tid = options.transaction_id
      } else {
        more = false
      }
      
      name = ( name ? name + '.' : '' ) + 'emit( "' + event_name + '" )';
      
      de&&ug(
          name
        + ( values ? ', l: ' + values.length : '' )
        + more_label
        + ( tid ? ', transaction_id: ' + tid : '' )
        // + ', values: ' + log.s( values )
      );
      
      try {
        // !! emit even if values.length == 0 to transmit more flag to downstream pipelets
        // d && d[ event_name ].apply( d, a );
        this.query_tree_emit( event_name, values, options );
      } catch( e ) {
        exception( e, name )
      }
      
      this._emit_event( event_name, [ values, options ] );
      
      more || this._emit_event( 'complete', [ options ] );
      
      return this;
    }, // emit()
    
    /* ------------------------------------------------------------------------
       _on_change( listener, that, once )
       
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
             removed right before the first emit on this event.
    */
    _on_change: function( listener, that, once ) {
      this.on( 'add'   , function( v, o ) { listener.call( this, "add"   , v, o ) }, that, once );
      this.on( 'remove', function( v, o ) { listener.call( this, "remove", v, o ) }, that, once );
      this.on( 'update', function( v, o ) { listener.call( this, "update", v, o ) }, that, once );
      this.on( 'clear' , function( v, o ) { listener.call( this, "clear" , v, o ) }, that, once );
      
      return this;
    }, // _on_change()
    
    _on_complete: function( listener, that, once ) {
      return this.on( 'complete', listener, that, once );
    }, // _on_complete()
    
    /* ------------------------------------------------------------------------
       emit_operations( added, removed, updates [, options ] )
       
       Emits a number of operations ( add / remove / update ) as a transaction.
       
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
    // ToDo: tests for emit_operations()
    emit_operations: function( added, removed, updates, options ) {
      var operations = [];
      
      removed && removed.length && operations.push( 'remove' );
      updates && updates.length && operations.push( 'update' );
      added   && added  .length && operations.push( 'add'    );
      
      var l = operations.length, that = this;
      
      if ( l ) {
        if ( l > 1 ) {
          // There is more than one operation
          this._transaction( l, options, function( t, l ) {
            for ( var i = -1; ++i < l; ) emit( 1, t.next().get_emit_options() );
          } );
        } else {
          // only 1 update using upstream options
          emit( 0, options );
        }
      }
      
      return this;
      
      function emit( i, options ) {
        // Note: use emit_xxx() and not emit( 'xxx' ) to allow derived classes
        // to overload emit_xxx() individually.
        // ToDo: consider removing this limitation before version 1.0 to only allow emit() to be overloaded
        switch( operations[ i ] ) {
          case 'add'   : return that.emit_add   ( added  , options ); 
          case 'remove': return that.emit_remove( removed, options );
          case 'update': return that.emit_update( updates, options );
        }
      } // emit()
    }, // emit_operations()
    
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       Fetches the content of this set, possibly in chunks.
       
       This is the stateless version, it must be overloaded by stateful
       pipelets.
       
       Parameters:
         - receiver: function that will be called for each chunk of data and
           which signature is  receiver( values, no_more ):
             - values: (Array) of values for each chunk
             
             - no_more: indicates the last chunk if truly
    */
    fetch: function( receiver ) {
      var that = this;
      
      // After a first fetch, if any other source is added, fetch from that
      // source, ToDo: this should eventually be done in _subscribe(), because
      // fetching will no longer imply that a source is subscribed. 
      // This is also used in filter.js to avoid fetching unless this pipelet was
      // fetched at least once by a downstream stateful pipelet.
      this._lazy = false;
      
      return this._fetch_source( function( values, no_more ) {
        if ( values && values.length ) values = that._transform( values, {}, 'fetch' );
        
        receiver( values, no_more );
      } );
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       _fetch_source( receiver )
       
       Fetches the content of this source set, possibly in chunks.
       
       Applies this pipelet's _query on results.
       
       This method should not be called directly but may be overloaded.
       
       Parameter:
         - receiver: (function) see fetch() for definition 
    */
    _fetch_source: function( receiver ) {
      var s = this._source, q = this._query, query = q.query;
      
      if ( s && query.length ) { // there is a source and the query is not the nul query
        if ( q === Query.pass_all ) {
          s.fetch( receiver );
        } else {
          var filter = q.filter;
          
          // de&&ug( '_fetch_source(), filter: ' + filter );
          
          s.fetch( function( values, no_more ) {
            // de&&ug( '_fetch_source(), before filtering, values: ' + log.s( values ) + ', no_more: ' + no_more );
            
            if ( values && values.length ) values = filter( values );
            
            // de&&ug( '_fetch_source(), after filtering values with query: values: ' + log.s( values ) );
            
            if ( no_more || ( values && values.length ) ) receiver( values, no_more );
          } );
        }
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
           process. Otherwise an exception will be raised.
           
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
          out = that._transform( values, {}, 'fetch' );
          
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
      var that = this, t, options;
      
      this.fetch( function( values, no_more ) {
        if ( no_more ) {
          if ( t ) options = t.next().get_emit_options();
          
          destination.add( values || [], options );
          
          t.end();
          
          // This replaces _add_destination()
          that.query_tree_add( query, destination );
        } else if ( values && values.length ) {
          if ( ! t ) {
            t = new Transaction( {}, 2, {}, destination ); // transactions, count, options, pipelet
            
            options = t.next().get_emit_options();
          }
          
          destination.add( values, options );
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
       
       ToDo: the name 'plug' might intuitively be understood as 'pluging this pipelet into a source (a socket)', which is what add_source() does, choose alternative names
    */
    plug: function( pipelet, options ) {
      if ( pipelet._lazy ) options = extend_2( { lazy: true }, options );
      
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
       
       Unless option 'lazy' is false, the content of the source is fetched and
       added to this pipelet, possibly assynchonously.
       
       This pipelet is then connected to the upstream 'source' pipelet. If data
       fetching from the previous step is asynchronous.
       
       Parameters:
         - source: (Object) to add as a source to this pipelet.
             
             If source is a Pipelet or an Object providing a fetch() function
             and unless option lazy is true, the content is fetched from the
             source and added to this pipelet using this.add().
             
             If source is an not an instance of Pipelet and does not have a
             fetch() function, it's content is only added to the current
             pipelet using this.add(). It can be an Array but could be any
             other object type that this.add() supports such as a function.
           
         - options: (Object):
           - lazy: (Bollean) if true, do not fetch() and add() values from
               source.
               
               Stateless pipelets do not usually need to fetch their source at
               this stage, because these do not hold a state, unless these are
               already connected to a downstream pipelet. Specifying lazy as
               true prevents this otherwise usless and wastful data fetching.
               
       ToDo: add option for query
    */
    add_source: function( source, options ) {
      if ( source.is_void ) return this;
      
      var that = this, connected;
      
      // Add the source now so that, if a downsteam pipelet trys to fetch()
      // before this pipelet has finished fetching, that a new fetch be
      // requested to this source.
      this._add_source( source );
      
      if ( ! ( options && options.lazy ) ) {
        // Add data from source
        if ( source.fetch ) {
          // ToDo: handle transactions
          this._fetch_source( function( values, no_more ) {
            if ( values && values.length ) that.add( values );
            
            if ( no_more ) {
              if ( connected ) {
                throw new Error( 'Pipelet.add_source(), add_destination(): already connected, no_more received twice from fetch()' );
              }
              connected = true;
              
              // Now that all existing data is fetched, we can finalize
              // the connexion to allow further operations from source to be pushed to this pipelet.
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
        // This should be done later, when this.fetch is called by a downstream
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
        source._add_destination && source._add_destination( that, that._query.query );
        
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
       
       Parameters:
         - source: the source pipelet to add or undefined to remove the source.
    */
    _add_source: function( source ) {
      var s = this._source;
      
      if ( s ) {
        this._source = s = xs
          .union()
          ._add_destination( this, this._query.query ) // ToDo: add test
          ._add_source( s )
        ;
        
        this._add_source = function( source ) {
          s._add_source( source );
          
          return this;
        };
        
        this._remove_source = function( source ) {
          s._remove_source( source );
          
          return this;
        };
        
        return this._add_source( source );
      } else {
        this._source = source;
      }
      
      return this;
    }, // _add_source()
    
    /* ------------------------------------------------------------------------
       _add_destination( destination, query )
       
       Adds a query for a destination.
       
       This is a low-level method that should not be used by external objects
       because it does not add the source of the destination pipelet so
       added.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the addition by generating an exception.
         - trigger other actions on addition
         - redirect to another another pipelet (done by Encapsulate)
       
       Parameters:
         - destination: the destination pipelet to add the query to
         - query: or terms to add to this destination
    */
    _add_destination: function( destination, query ) {
      // ToDo: update upstream query, most likely in another higher level method,
      // this also should fetch the source somehow to update the destination with new values
      // de&&ug( '_add_destination(), query: ' + log.s( query ) );
      
      return this.query_tree_add( query, destination );
    }, // _add_destination()
    
    _query_tree_update: function( adds, removes, destination ) {
      removes.length && this.query_tree_remove( removes, destination );
      adds.length    && this.query_tree_add   ( adds   , destination );
      
      // ToDo: update this query as well as upstream pipelet(s)
      // var q = this._query;
      // q.remove( removes ).add( adds );
      
      return this;
    }, // _query_tree_update()
    
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
      source._remove_destination && source._remove_destination( this, this._query.query );
      
      this._remove_source( source );
      
      if ( ! ( options && options.no_fetch ) && typeof source.fetch == 'function' ) {
        var that = this;
        // ToDo: handle transaction
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
       overloaded or redirected as done by _add_source() if more than one source
       is added.
       
       Parameters:
         - source: (Pipelet) to remove from this pipelet
         
       Exception:
         - source is not a source of this pipelet
    */
    _remove_source: function( p ) {
      if ( this._source === p ) {
        this._source = null;
        
        return this;
      }
      
      throw new Error( 'Pipelet._remove_source( source ), source is not this._source' );
    }, // _remove_source()
    
    /* ------------------------------------------------------------------------
       _remove_destination( destination, query )
       
       Removes query for a destination.
       
       This is a low-level method that should not be used by external objects
       because it does not remove the source of the destination pipelet so
       removed.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the removal by generating an exception.
         - trigger other actions on removal
         - redirect to another another pipelet (done by Encapsulate)
       
       Paramters:
         - destination: the destionation pipelet to remove from
         - query: or terms to remove for this destination
         
       Exception:
         - destination is not a known destination of this pipelet
    */
    _remove_destination: function( destination, query ) {
      // ToDo: update upstream query, this should probably done in a higher level method
      return this.query_tree_remove( query, destination );
    } // _remove_destination()
  } ); // Pipelet instance methods
  
  /* --------------------------------------------------------------------------
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
    
    var options = extend_2( { key: source._key || [ 'id' ] }, defaults ) // Default options
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
        
        parameters[ l ] = extend_2( options, last );
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
          parameters[ l ] = extend_2( options, last );
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
     - Add subclass() and Build() class methods to constructor
     
     Parameters:
       - constructor: (function) a Pipelet constructor
     
     Optional Parameters:
       - methods    : (object) methods for the constructor's class
     
     Usage:
       Set.subclass( Order );
  */
  Pipelet.subclass = function( constructor, methods ) {
    subclass( this, constructor );
    
    // Allows Build() and subclass() to be used by subclass
    constructor.Build = Pipelet.Build;
    constructor.subclass = Pipelet.subclass;
    
    methods && extend_2( constructor.prototype, methods );
  }; // Pipelet.subclass()
  
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
       - methods      : (object) methods for the constructor's class
       - pipelet      : (function) the pipelet function creating an instance
                        of the constructor's class.
       
     Example: a 'from_usa' pipelet that filters values which country attribute
     is 'USA'.
     
     Programmer:
        function From_USA( options ) {
          return Pipelet.call( this, options );
        }
        
        Pipelet.Build( "from_USA", From_USA,
          { _transform: function( values ) {
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
          
          //if ( that._lazy || options.lazy ) return;
          
          //return this._subscribe();
          
          if ( that._lazy ) options = extend_2( { lazy: true }, options );
          
          return that.add_source( this, options );
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
     ToDo: Stateless() is not well defined, needs a use case
     
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
      ._function( '_transform', void 0, [ 'values' ] )
        ._var( 'i = -1', 'l = values.length', 'r = []', 't = transform', 'v', 'w', 'p', '' )
        .unrolled_while( 'v=values[++i],w={};for(p in v)w[p]=v[p];r.push(t.apply(w,parameters));' )
        .add( 'return r' )
      .end( 'Stateless.._transform()' )
    ;
    
    eval( code.get() );
    
    return this;
  } // Stateless()
  //*/
  
  /* -------------------------------------------------------------------------------------------
     encapsulate( input, output, options )
     
     A pipelet to group a graph of pipelets into a single pipelet which input operations are
     redirected to the 'input' pipelet and where output methods, such as fetch(), are redirected to
     the 'output' pipelet.
     
     This is typically used with compositions of more than one pipelet.
     
     Parameters:
       - input: the input pipelet of the graph to encapsulate
       - output: the ouput pipelet of the graph
       - options: these are pipelet options, the most important of which is lazy that should
         be set to false if the graph is stateful and requires fetching its source data upon
         connexion.
     
     Example using the aggregate_from() composition from above:
     -------
     
     Pipelet.Compose( 'aggregate_from', function( source, from, measures, dimensions, options ) {
       var input  = xs.filter( from, options )
         , output = input.aggregate( measures, dimensions, options )
       ;
       
       // Set lazy option to false to force data fetching for aggregate is a stateful
       // pipelet. Still, using extend allows users of the composition to set _lazy to
       // true. This could be useful if the composition is part of a bigger encapsulation
       return source.encapsulate( input, output, XS.extend_2( { lazy: false }, options ) );
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
     
     _transform                null         Called by add(), remove(), and update()
     
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
     emit_operations           null         Called typically by some update()
     
     on                    this --> output
     once                      none         Calls on()
     
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
    this._input  = input;
    this._output = output;
    
    return Pipelet.call( this, options );
  } // Encapsulate()
  
  Pipelet.Build( 'encapsulate', Encapsulate, {
    // Input operations
    notify: function( transaction, options ) {
      this._input.notify( transaction, options );
      
      return this;
    },
    
    add: function( values, options ) {
      this._input.add( values, options );
      
      return this;
    },
    
    remove: function( values, options ) {
      this._input.remove( values, options );
      
      return this;
    },
    
    update: function( updates, options ) {
      this._input.update( updates, options );
      
      return this;
    },
    
    clear: function( options ) {
      this._input.clear( options );
      
      return this;
    },
    
    // Responding to output fetching
    fetch: function() {
      this._output.fetch.apply( this._output, arguments );
      
      return this;
    },
    
    fetch_all: function() {
      this._output.fetch_all.apply( this._output, arguments );
      
      return this;
    },
    
    // Setting output event listeners
    on: function( event_name, listener, that, once ) {
      this._output.on( event_name, listener, that, once );
      
      return this;
    },
    
    // Pluging / Unpluging output
    plug: function( pipelet, options ) {
      return this._output.plug( pipelet, options );
    },
    
    unplug: function( pipelet, options ) {
      return this._output.unplug( pipelet, options );
    },
    
    _add_destination: function( pipelet, query ) {
      this._output._add_destination( pipelet, query );
      
      return this;
    },
    
    _remove_destination: function( pipelet ) {
      this._output._remove_destination( pipelet );
      
      return this;
    },
    
    // Input source addition and removal
    add_source: function( source, options ) {
      this._input.add_source( source, options );
      
      return this;
    },
    
    _add_source: function( source ) {
      this._input._add_source( source );
      
      return this;
    },
    
    remove_source: function( source ) {
      this._input.remove_source( source );
      
      return this;
    },
    
    _remove_source: function( source, options ) {
      this._input._remove_source( source, options );
      
      return this;
    },
    
    // Forbidden methods
    _fetch_source    : null,
    _fetch_source_all: null,
    _transform       : null,
    emit_add         : null,
    emit_remove      : null,
    emit_update      : null,
    emit_clear       : null,
    emit             : null,
    enit_operations  : null
  } ); // Encapsulate instance methods
  
  /* -------------------------------------------------------------------------------------------
     pass_through( [ options ] )
     
     A pipelet used as a temporary variable for cyclic graphs.
     
     Exemple:
       var tmp = xs.pass_through()
  */
  function Pass_Trough( options ) {
    return Pipelet.call( this, options );
  } // Pass_Trough()
  
  Pipelet.Build( 'pass_through', Pass_Trough, {
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
     Union( sources, options )
     
     Forwards many sources to one destination
  */
  function Union( sources, options ) {
    Pipelet.call( this, options );
    
    this._sources = [];
    
    if ( sources ) {
      for( var i = -1; ++i < sources.length; ) {
        var p = sources[ i ];
        
        if ( p && p instanceof Pipelet ) this.add_source( p );
      }
    }
    
    return this;
  } // Union()
  
  Pipelet.Build( 'union', Union, {
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       ToDo: add test cases
    */
    fetch: function( receiver ) {
      var that = this, sources = this._sources, l = sources.length;
      
      // After a first fetch, if any other source is added, fetch from that
      // source. ToDo: this should be driven by _subscribe()
      this._lazy = false;
      
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
        // ToDo: handle transaction ids
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
      if ( this._sources.indexOf( source ) !== -1 ) throw new Error( "Union, _add_source(), invalid source: already there" );
      
      this._sources.push( source );
      
      return this;
    }, // _add_source()
    
    _remove_source: function( source ) {
      var s = this._sources;
      
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
    this.remove_branches_tid = '';
    
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
  
  extend_2( Dispatch.prototype, {
    create_branches: function( new_branches, options ) {
      if ( options ) {
        var tid = options.transaction_id;
        
        // ToDo: Dispatch..create_branches() find cleaner option to deal with updates as remove + add
        if ( tid == this.remove_branches_tid ) {
          de&&ug( 'Dispatch..create_branches(), ignore update from previous remove, tid: ' + tid )
          
          return this;
        }
      }
      
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
    
    remove_branches: function( removed_branches, options ) {
      if ( options && options.more ) {
        var tid = this.remove_branches_tid = options.transaction_id;
        
        de&&ug( 'Dispatch..remove_branches(), more option set, this could be an update, tid: ' + tid );
        
        return this;
      }
      
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
     alter( transform [, options] )
     
     Alters a set by altering all values by transform().
     
     Parameters:
       - transform:
           (Function): a function which signature is:
             transform( value [, position [, values [, options ] ] ] )
           
             if option no_clone is used, tranform must return one new object for each source
             object.
           
           (Object): set static properties into all values
           
       - options: (Object)
         - no_clone: (Boolean) if true, values will not be clone prior to calling the
           transform which could then produce side effects on the source value. This
           optimization option should only be used when "transform" never alters
           incomming values.
       
     Example: alters a source dataflow of stocks to add PE ratios.
       var pe_ratios = stocks
         .alter( function( stock ) {
           stock.pe_ratio = stock.price / stock.earnings; // modifies stock, cannot use option no_clone
         } )
       ;
       
     Example: alters a source dataflow of stocks to produce a dataflow of PE ratios.
       var pe_ratios = stocks
         .alter( function( stock ) {
           // never alters stock because it returns a new object
           return { ticker: stock.ticker, pe_ratio: stock.price / stock.earnings };
         }, { no_clone: true } )
       ;
       
     Example: add a 'stock_prices' flow attribute using an Object transform:
       prices.alter( { flow: 'stock_prices' } );
  */
  function Alter( transform, options ) {
    de&&ug( 'alter(), transform: ' + ( log.s( transform ) || transform ) + ', options: ' + log.s( options ) );
    
    Pipelet.call( this, options );
    
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
    
    // Generate code for this._transform()
    var code = new Code()
      ._function( 'this._transform', void 0, [ 'values', 'options' ] )
        ._var( vars )
        .unrolled_while( while_body )
        .add( 'return r' )
      .end( 'Alter.._transform()' )
    ;
    
    eval( code.get() );
    
    return this;
  } // Alter()
  
  Pipelet.Build( 'alter', Alter );
  
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
    
    this._lazy = false; // stateful pipelet needs to subcribe to upstream pipelets immediately
    
    this._key = options.key || [ 'id' ]; // ToDo: consider moving this into Pipelet()
    
    this.a = []; // The current state of the set
    this.b = []; // Anti-state, used to store removes waiting for adds and conflict resolution
    
    a && a.length && this.add( a );
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
    
    return this;
  } // Set()
  
  Pipelet.Build( 'set', Set, {
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       Fetches set content, possibly in several chunks.
       
       See Pipelet.fetch() for receiver documentation.
    */
    fetch: function( receiver ) {
      // ToDo: split large sets in chunks to allow incremental processing
      receiver( this.a, true );
      
      return this;
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       clear( options )
       
       Clears content then notifes downsteam Pipelets.
    */
    clear: function( options ) {
      this.a = [];
      
      return this.emit_clear( options );
    }, // get()
    
    /* ------------------------------------------------------------------------
       add( values )
       
       Add values to the set then notifies downsteam Pipelets.
    */
    // Todo: Set..add(): filter-out duplicate adds
    // ToDo: Set..add(): optimize when .._add_value() is not overloaded
    add: function( _values, options ) {
      return this._transaction( _values.length, options, function( t, l ) {
        de&&ug( "Set..add(), values: " + l );
        
        var i = -1, v, b = this.b, values = _values;
        
        // ToDo: Add test for both anti state and non-anti state additions
        while( b.length && ++i < l ) {
          // There are values in the antistate b, waiting for an add or
          // update, or conflict resolution
          var p = this._index_of( v = values[ i ] );
          
          if ( p == -1 ) {
            this._add_value( t, v );
          } else {
            de&&ug( 'Set..add(), removing add from anti-state' );
            
            b.splice( p, 1 );
            
            t.emit_nothing();
          }
        }
        
        while( ++i < l ) this._add_value( t, values[ i ] );
      } );
    }, // add()
    
    // ToDo: test Set.._add_value()
    _add_value: function( transaction, value, emit_now ) {
      if ( value ) {
        var b = this.b;
        
        if ( b.length ) {
          var p = this._index_of( value );
          
          if ( p != -1 ) {
            de&&ug( 'Set.._add_value(), removing add from anti-state' );
            
            b.splice( p, 1 );
            
            transaction.emit_nothing();
            
            return this;
          }
        }
        
        this.a.push( value );
        
        transaction.emit_add( [ value ], emit_now );
      } else {
        transaction.emit_nothing();
      }
           
      return this;
    }, // _add_value()
    
    // ToDo: test Set.._add_values()
    _add_values: function( transaction, values, emit_now ) {
      var i = -1, v, b = this.b, added = [], l = values.length;
      
      while( b.length && ++i < l ) {
        // There are values in the antistate b, waiting for an add or
        // update, or conflict resolution
        var p = this._index_of( v = values[ i ] );
        
        if ( p == -1 ) {
          added.push( v );
        } else {
          de&&ug( 'Set.._add_values(), removing add from anti-state' );
          
          b.splice( p, 1 );
        }
      }
      
      i < l && added.concat( values.slice( ++i ) );
      
      transaction.emit_add( added, emit_now );
      
      return this;
    }, // _add_values()
    
    /* ------------------------------------------------------------------------
       remove( values )
       
       Remove values from the set then notify downsteam Pipelets
    */
    // ToDo: optimize remove() when _remove_value() is not overloaded
    remove: function( _values, options ) {
      return this._transaction( _values.length, options, function( t, l ) {
        de&&ug( "Set..remove(), values: " + l );
        
        for ( var i = -1, values = _values; ++i < l; ) {
          var v = values[ i ]
            , p = this.index_of( v )
          ;
          
          if ( p == -1 ) {
            de&&ug( "Set..remove(), adding value to anti-state" );
            
            this.b.push( v );
            
            t.emit_nothing();
          } else {
            this._remove_value( t, v );
          }
        }
      } );
    }, // remove()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_value: function( transaction, value, emit_now ) {
      var removed = [];
      
      if ( value ) {
        var p = this.index_of( value );
        
        if ( p === -1 ) {
          de&&ug( "Set.._remove_value(), adding value to anti-state" );
          
          this.b.push( value );
        } else {
          this.a.splice( p, 1 );
          
          removed = [ value ];
        }
      }
      
      transaction.emit_remove( removed, emit_now );
      
      return this;
    }, // _remove_value()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_values: function( transaction, values, emit_now ) {
      var i = -1, l = values ? values.length : 0, removed = [];
      
      while ( ++i < l ) {
        var v = values[ i ]
          , p = this.index_of( v )
        ;
        
        if ( p === -1 ) {
          de&&ug( "Set.._remove_values(), adding value to anti-state" );
          
          this.b.push( v );
        } else {
          this.a.splice( p, 1 );
          
          removed.push( v );
        }
      }
      
      transaction.emit_remove( removed, emit_now );
      
      return this;
    }, // _remove_values()
    
    /* ------------------------------------------------------------------------
       update( updates )
       
       Update set values using updates then notifes downsteam Pipelets.
       
       Parameter:
         updates: Array of updates, an update is an array of two values, the
           first is the previous value, the second is the updated value.
    */
    /*
    // ToDo: rewrite to work with _add_value(), _remove_value(), until then, use Pipelet..update()
    update: function( updates, options ) {
      de&&ug( "Set..update(), updates: " + updates.length );
      
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
      return this.emit_operations( added, u, updated, options );
    }, // update()
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
    return Set.call( this, values, options );
  }
  
  Set.Build( 'unique_set', Unique_Set, {
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
    
    // Use a set() on the output to prevent re-incrementation through fetch().
    
    // Use option lazy to prevent unecessary fetching now, fetching will be done using
    // encapsulate()
    var output = input.set( [], extend_2( options, { lazy: false } ) ); // ToDo: fix to be able to do lazy: true
    
    // Set option 'lazy' to false as this is effectively a stateful pipelet with the above
    // set()
    
    // ToDo: find a better solution for fetching data when a source connects
    return source.encapsulate( input, output, extend_2( { lazy: false }, options ) );
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
  
  Pipelet.Build( 'trace', Trace, {
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
      var u, s = this._source, that = this;
      
      if ( s ) {
        Pipelet.prototype._fetch_source.call( this, function( values, no_more ) {
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
  
  Pipelet.Build( 'delay', Delay, {
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
    
    _defer: function( operation, values, options ) {
      var that = this;
      
      setTimeout( function() {
        that.emit( operation, values, options );
      }, that.delay );
      
      return this;
    },
    
    add: function( values, options ) {
      return this._defer( 'add', values, options );
    }, // add()
    
    remove: function( values, options ) {
      return this._defer( 'remove', values, options );
    }, // remove()
    
    update: function( updates, options ) {
      return this._defer( 'update', updates, options );
    }, // update()
    
    clear: function( options ) {
      return this._defer( 'clear', void 0, options );
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
    Pipelet.Build( 'pxxx', PXXX, {
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
     
     ToDo: remove xs from the list once all modules load it directly from
     xs = require( lib/pipelet.js ) and get XS as xs.XS.
  */
  eval( XS.export_code( 'XS', [
    'xs', 'Encapsulate', 'Pipelet', 'Union', 'Dispatch', 'Alter', 'Set', 'Unique_Set', 'Trace', 'Delay', 'Query', 'Query_Tree'
  ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // pipelet.js
