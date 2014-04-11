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
   
   Furthermore, stateful pipelets must set '_query' to a non-null query so that their
   source content is fetched upon connection with source pipelets.
   
   This can be achieved by deriving from 'Set', a base class provided for stateful
   pipelet.
   
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
   
   A conflict detection pipelet would emit 'conflicts' using emit_add(). A conflict
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
     - add becomes remove
     - remove becomes add
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
   timestamps allowing to _fetch a subset of set.
   
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
   
   These stateless pipelets in turn _fetch their upstream content but without indicating that
   these are interested only by a subset of the source content.
   
   This works fine in a local environement but if the stateless pipelet and its upstream
   pipelet are interconnected through a low-bandwidth network, such as the internet, and if
   the set's content is large it may take a long time and become wastful to _fetch the entire
   source to discard most of the content.
   
   To prevent this tremendous waste of ressources, we have implemented a Query class and
   a Query_Tree pipelet that still need to be integrated with _fetch() and pipelets emitters.
   
   In this new design, _fetch() provides a Query and pipelet emitters filter their outputs
   using a Query_Tree instead of Fork.
   
   Stateless pipelets combine their queries upstream, via their _fetch() while stateful
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
       _on( event_name, listener [, that] [, once] )
       
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
    _on: function( event_name, listener, that, once ) {
      var events = this._events
        , listeners = events[ event_name ] || ( events[ event_name ] = [] )
      ;
      
      listeners.push( { listener: listener, that: that || this, once: once } );
      
      de&&ug( '_on()'
        + ', event "' + event_name + '"'
        + ', name: "' + ( this._get_name && this._get_name() || '' ) + '"'
        + ', listeners: ' + listeners.length
        + ', once: ' + once
      );
      
      // ToDo: throw exception if some limit exceeded in the number of listeners to prevent memory leaks
      
      return this;
    }, // _on()
    
    // ToDo: implement _off( event_name, listener )
    
    _once: function( event_name, listener, that ) {
      return this._on( event_name, listener, that, true );
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
            
            return t._on( 'ended', function() {
              de&&ug( 'Transactions(), end event, delete transaction tid: ' + tid );
              
              delete transactions[ tid ];
            } );
          }
        }
      }
      
      // Nothing more expexted from upstream or count <= 1, no need to memorize this transaction in this.transactions
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
    
    this.count          = count; // !! Must set count before calling set_source_options()
    
    this.set_source_options( options );
    
    this.emit_options   = o;
    this.o              = extend_2( { __t: this }, o );
    this.added          = [];    // Values added but which emission is defered 
    this.removed        = [];    // Values removed but which emission is defered
    this.need_close     = false; // True when some emits with more have been done requiring an emit with no-more 
    this.closed         = false; // When true means that the last options have been provided with no-more, any further attempt will raise an exception
    this.ending         = false; // Will be set to true if end() is called but cannot end yet
    
    this.pipelet        = pipelet; // The pipelet to emit operations to
    
    Event_Emitter.call( this );
    
    de&&ug( 'new Transaction(): ' + log.s( this ) );
    
    return this;
  } // Transaction()
  
  XS.Transaction = subclass( Event_Emitter, Transaction );
  
  extend_2( Transaction.prototype, {
    _get_name: function( name ) {
      return this.name + ( name ? '.' + name + '(), ' : '' );
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
      
      if ( this.count > 0 ) this.ending = false; // will required a new end() to set ending to true
      
      return this;
    }, // Transaction..add_operations()
    
    set_source_options: function( options ) {
      this.source_options = options;
      this.source_more = ( options && options.more ) || false;
      
      de&&ug( this.debug_name + 'set_source_options(), source_more: ' + this.source_more );
      
      return this.ending ? this.end() : this;
    }, // Transaction..set_source_options()
    
    __emit_add: function( values, emit_now ) {
      this.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          this.pipelet.__emit( 'add', values, this.get_emit_options() );
        } else {
          push.apply( this.added, values );
        }
      }
      
      return this.ending ? this.end() : this;
    }, // Transaction..__emit_add()
     
    __emit_remove: function( values, emit_now ) {
      this.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          this.pipelet.__emit( 'remove', values, this.get_emit_options() );
        } else {
          push.apply( this.removed, values );
        }
      }
      
      return this.ending ? this.end() : this;
    }, // Transaction..__emit_remove()
    
    emit_nothing: function() {
      this.next();
      
      return this.ending ? this.end() : this;
    }, // Transaction..emit_nothing()
    
    get_options: function() {
      if ( this.closed ) {
        throw new Error ( this.debug_name + 'get_options(), exception: this transaction is already closed' );
      }
      
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
      var count = this.count, source_more = this.source_more;
      
      if ( count || source_more ) {
        de&&ug( this.debug_name + 'end(), not ending because'
          + ( count                ? ' count (' + count + ') > 0'         : '' )
          + ( count && source_more ? ' and'                               : '' )
          + (          source_more ? ' source_more (' + source_more + ')' : '' )
        );
        
        // Remember that application requested the end of this transaction so that it
        // ends after emitting count operations and source has no more to send
        this.ending = true;
        
        return this;
      }
      
      var removed = this.removed
        , added   = this.added
        , pipelet = this.pipelet
      ;
      
      if ( removed.length ) {
        de&&ug( this.debug_name + 'end(), __emit removed' );
        
        this.removed = []; // _clear before __emit() bellow but do not clear this.added just yet to allow __emit() to set more
        
        pipelet.__emit( 'remove', removed, this.get_emit_options() );
      }
      
      if ( added.length || this.need_close ) {
        de&&ug( this.debug_name + 'end(), __emit added' );
        
        this.added = []; // _clear before __emit() bellow to force to unset more
        
        pipelet.__emit( 'add', added, this.get_emit_options() );
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
     
     Queries are used by Pipelet..__fetch_source() to retrieve subsets of values from source
     dataflows and Pipelet.__emit() to filter emitted operations to downstream pipelets.
     
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
       to be able to _fetch data past a certain date, or after a certain monotically increasing
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
    this.discard_optimized();
    
    // Operations resulting from operations
    this.discard_operations();
    
    // Add the initial query in an optimized way
    return query ? this.add( query ) : this;
  } // Query()
  
  var query_keys = Query.keys = function( query ) {
    var keys = [], i = -1, e;
    
    while( e = query[ ++i ] ) keys.push( Object.keys( e ) );
    
    return keys;
  };
  
  /* -----------------------------------------------------------------------------------------
     Query.least_restrictive_keys( e0, e1, keys0, keys1 )
     
     Determines which AND-expression is the least-restricive or as restrictive, i.e. describes
     the largest set.
     
     An AND-expression is described using a JavaScript Object which attribute names and values
     determine a set of JavaScript Objects that match all attributes names and values of the
     AND-expression, e.g.:
       - The AND-expression { flow: 'stores' } describes a set where all JavaScript Objects
         have a flow attribute which value is 'stores'.
       
       - The AND-expression { flow: 'sales', month: 1 } describes the set of all JavaScript
         Objects which flow attribute is sales' AND whcih 'month' attribute has the value '1'.
     
     Parameters:
       - e0: the first AND-expression
       - e1: the second AND-expression
       - keys0: the keys of e0 as determined by Object.keys( e0 )
       - keys1: the keys of e1 as determined by Object.keys( e1 )
     
     !! Note that this function is not strictly symetric, if it returns keys0 the two
     AND-expressions may be strictly equal while if it returns keys1 the two expressions
     are guarantied to NOT be strictly equal.
     
     Returns:
       null : None can be determined as least restrictive. The two expressions describe
              sets that may have an intersection but none is fully included in the other or
              the expressions are too complex to determine if one set is fully included in
              the other.
              
       keys0: Expression e0 is either least restrictive, or as restrictive as e1. The set
              described by e1 is therefore fully included in the set described by e0 or
              exactly the same set.
              
       keys1: Expression e1 is the least restrictive. The set described by e0 is fully
              included in the set described by e1.
              
     Use cases:
       XS Queries are OR-expressions which terms are AND-expresssions as tested by this
       function.
       
       If a query contains one AND-expression which is less restrictive than others of the
       same query, then these other expressions are redundant and may be optimized-out of
       the query, reducing the number or AND-expression in an optimized query.
       
       Optimizing queries is therefore essential to optimal performances of query filters
       and query trees.
       
       Another use case is an intelligent cache based on queries, preventing the redundant
       caching of subsets described by more restrictive queries. Several cache strategies
       can be implemented, sharing JavaScript Objects included in more than one set as
       described by more or less restrictive queries.
  */
  Query.least_restrictive_keys = function( e0, e1, keys0, keys1 ) {
    var keys = keys0.length <= keys1.length ? keys0 : keys1
      , i = -1, key
    ;
    
    while ( key = keys[ ++i ] ) {
      if ( e0[ key ] !== e1[ key ] ) return null; // none is least restrictive
    }
    
    return keys; // keys of least restrictive expression 
  } // Query.least_restrictive_keys()
  
  extend_2( Query.prototype, {
    /* -----------------------------------------------------------------------------------------
       Query..discard_operations()
       
       Clears adds and removes from previous operations.
       
       Also used to initialize adds and removes to [] in Query constructor.
    */
    discard_operations: function() {
      this.adds = [];
      this.removes = [];
      
      return this;
    }, // discard_operations()
    
    discard_optimized: function() {
      this.optimized      = [];
      this.optimized_keys = [];
      
      return this;
    }, // discard_optimized()
     
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
        , least_restrictive_keys = Query.least_restrictive_keys
      ;
      
      if ( q1 instanceof Query ) {
        keys1s = q1.keys;
        q1 = q1.query;
      } else {
        keys1s = query_keys( q1 );
      }
      
      while ( e1 = q1[ ++i1 ] ) {
        var keys1 = keys1s[ i1 ]
          , added = false
          , i0 = -1, e0
        ;
        
        // Optimize by adding the least number of queries to the result set
        while ( e0 = q0[ ++i0 ] ) {
          // Determine which expression, e0 or e1, may be less restrictive
          
          var keys0 = keys0s[ i0 ]
            , keys = least_restrictive_keys( e0, e1, keys0, keys1 )
          ;
          
          if ( keys ) {
            // One expression, e0 or e1, is less restrictive than the other. I.e. one expression
            // describes a set that mathematically includes the other.
            
            if ( keys === keys1 ) {
              // e1 is the least restrictive query --> Optimize-out e0
              
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
      } // add()
      
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
      
      Examples:
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
        keys1s = query_keys( q1 );
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
       Query..differences( q1 )
       
       Finds differences between this query and q1
       
       Returns: [ adds, removes ]
       
       Example:
         new Query( [
           { flow: 'stores', id: 1 }
           { flow: 'stores', id: 2 }
           { flow: 'stores', id: 3 }
         ] )
         
         .differences( [
           { flow: 'stores', id: 3 }
           { flow: 'stores', id: 4 }
           { flow: 'stores', id: 5 }
         ] )
         
         --> [
           [ // removes
             { flow: 'stores', id: 1 }
             { flow: 'stores', id: 2 }
           ],
           
           [ // adds
             { flow: 'stores', id: 4 }
             { flow: 'stores', id: 5 }
           ]
         ]
    */
    differences: function( q1 ) {
      var keys0s = this.keys, q0 = this.query
        , keys1s
        , e0, e1
        , keys0, keys1
        , i0, i1
        , l0
        , j, a
        , removed = []
      ;
      
      if ( q1 instanceof Query ) {
        keys1s = q1.keys .slice( 0 );
        q1     = q1.query.slice( 0 );
      } else {
        q1     = q1.slice( 0 );
        keys1s = query_keys( q1 );
      }
      
      for ( i0 = -1; e0 = q0[ ++i0 ]; ) {
        keys0 = keys0s[ i0 ];
        l0 = keys0.length;
        
        for ( i1 = -1; keys1 = keys1s[ ++i1 ]; ) {
          if ( l0 == keys1.length ) {
            e1 = q1[ i1 ];
            
            for ( j = -1; j < l0; ) {
              a = keys0[ ++j ];
              
              if ( e0[ a ] !== e1[ a ] ) break; // no match
            }
            
            if ( j < l0 ) continue; // no match
            
            // all terms match
            break;
          }
        }
        
        if ( keys1 ) {
          // e1 matches e0
          // Remove e1 from q1 because it does not need to be added in q0
          q1    .splice( i1, 1 );
          keys1s.splice( i1, 1 );
        } else {
          // e0 was not found in q1
          // e0 will have to be removed from q0
          removed.push( e0 );
        }
      }
      
      return [ removed, q1 ];
    }, // differences()
    
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
        keys1s = query_keys( q1 );
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
            code.add( 'return values' ); // pass-all
          } else if ( ! l ) {
            code.add( 'return []' ); // nul-filter
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
    // !!! All initialization code should be in __init_query_tree(), because this is also called
    // by the Pipelet constructor
    this.__init_query_tree();
    
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
    __init_query_tree: function() {
      // Initialize all query tree properties here to avoid modifying v8 hidden classes
      // ToDo: prefix attributes w/ underscores
      this.query_tree_top = new Query_Tree_Node();
      
      this.transactions           = Dictionary(); // ongoing transactions
      this.source_transactions    = Dictionary(); // incomming transactions by source
      
      this.source_subscriber_index = 0; // incomming subscriber index in current operation
      
      return this;
    }, // __init_query_tree()
    
    // Add or terms for a subscriber
    __query_tree_add: function( or_terms, subscriber ) {
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
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in __query_tree_add()
            
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
    }, // __query_tree_add()
    
    __query_tree_remove: function( or_terms, subscriber ) {
      var that = this
        , top = that.query_tree_top
        , or_term
        , position = -1 // the name position must be seen for exception message in remove_term() closure
      ;
      
      // For all OR-terms of this OR-AND query or partial query
      while( or_term = or_terms[ ++position ] ) {
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
            term_keys.splice( term_keys.indexOf( key ), 1 ); // indexOf() always succeeds, unless there is a bug in __query_tree_add()
            
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
          
          if ( v === u ) throw new Error( that._get_name( 'Query_Tree()..remove' ) + 'term not found' );
        } else {
          // No more term keys to locate or create in this tree
          // We have found the leaf node for this term
          // Remove subscriber from leaf
          var index = subscribers.indexOf( subscriber );
          
          // ToDo: this exception was seen: add tests, reproduce and fix
          if ( index == -1 ) {
            throw new Error(
                that._get_name( 'Query_Tree()..remove' )
              + 'Cannot find subscriber (' + subscriber._get_name() + ') in tree where it was expected'
              + ', or_terms: ' + log.s( or_terms )
              + ', at position: ' + position
            );
          }
          
          subscribers.splice( index, 1 );
        }
        
        // Return true is the node is now empty, false if not empty
        // It is empty if if has no subscribers and no keys
        return ( subscribers.length + keys.length ) == 0;
      } // remove_term()
    }, // __query_tree_remove()
    
    // ToDo: optimize unfiltered routing in top node.
    __query_tree_emit: function( operation, values, options ) {
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
            
            // ToDo: __query_tree_emit()#_update(): test transaction w/ nesting
            var t = new Transaction( operations, options );
            
            removed.length && p._remove( removed, t.next().get_emit_options() );
            added  .length && p._add   ( added  , t.next().get_emit_options() );
            updated.length && p._update( updated, t.next().get_emit_options() );
          }
        return this;
        
        case 'clear':
          route_clear( top, subscribers );
          
          more || this._end_transaction( transaction, transaction_id, options );
          
          // emit _clear to all subscribers
          for ( i = -1, rl = subscribers.length; ++i < rl; ) {
            p = subscribers[ i ];
            
            p.source_subscriber_index = 0;
            
            p._clear( options );
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
        var i, l, r, _operation = '_' + operation;
        
        // Clear all subscribers' source_subscriber_index in case of re-entrance
        // !! This must be done before emiting operations to prevent re-entrance issues on graph loops
        for ( i = -1, l = subscribers.length; ++i < l; ) {
          subscribers[ i ].p.source_subscriber_index = 0;
        }
        
        // Emit all subscribers' values
        for ( i = -1, l = subscribers.length; ++i < l; ) {
          r = subscribers[ i ];
          
          r.p[ _operation ]( r.v, options );
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
              that.__add_destination_to_transaction( transaction, p, transaction_id );
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
              that.__add_destination_to_transaction( transaction, p, transaction_id );
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
        
        // Send _clear only once per subscriber pipelet
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
    }, // __query_tree_emit()
    
    __add_destination_to_transaction: function( transaction, p, transaction_id ) {  
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
    }, // __add_destination_to_transaction()
    
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
              exception( e, '__query_tree_emit()/end_transaction()' );
            }
          }
          
          if ( p.source_subscriber_index ) continue; // the transaction will terminate in the subscribers emit
          
          // Terminate the transaction
          p._add( [], options );
        }
      }
      
      return this;
    }, // _end_transaction()
    
    _end_source_transactions: function() {
      // ToDo: implement and call on _remove_destination()
      var source_transactions = this.source_transactions
        , transaction_id, source_transaction
      ;
      
      for ( transaction_id in source_transactions ) {
        source_transaction = source_transactions[ transaction_id ];
        
        source = source_transaction.source;
        
        transaction = source.transactions[ transaction_id ];
        
        transaction.splice( source_transaction.position, 1 );
        
        if ( transaction.length == 0 ) delete source.transactions[ transaction_id ];
        
        this._add( [], { transaction_id: transaction_id } );
      }
      
      this.source_transactions = Dictionary();
      
      return this;
    }, // _end_source_transactions()
    
    /* ------------------------------------------------------------------------
       query_tree_pause( destination )
       
       Pause __emit_xxx to destination
    */
    query_tree_pause: function( destination ) {
      // ToDo: implement query_tree_pause()
      return this;
    }, // query_tree_pause()
    
    /* ------------------------------------------------------------------------
       query_tree_resume( destination )
       
       Resume __emit_xxx to destination
    */
    query_tree_resume: function( destination ) {
      // ToDo: implement query_tree_resume()
      return this;
    } // query_tree_resume()
  }; // Query_Tree instance methods
  
  // ToDo: Create Input and Output classes for Pipelets. This will ease encapsulation,
  // documentation, and implementation of additional control ports
  
  /* -------------------------------------------------------------------------------------------
     Pipelet( options )
     
     A Pipelet processes one upstream source dataflow and provides one downstream dataflow.
     
     Parameters:
       options: (Object) optional parameters
         
     This is the base class of all Pipelets, providing the low-level dataflow service for XS
     applications.
  */
  function Pipelet( options ) {
    options = this._options = options || {};
    
    // The source, aka upstream, pipelet
    this._source = null;
    
    // Destination, aka downstream, pipelets
    this._destinations = [];
    
    // Source query for upstream pipelet
    this._query = null;
    
    // Ongoing transactions
    this._transactions = new Transactions();
    
    // Objects's key
    this._key = options.key;
    
    // Events Emitter super-class
    Event_Emitter.call( this );
    
    // ToDo: make query tree a contrained object rather than a base class or embedded class
    this.__init_query_tree();
    
    return this;
  } // Pipelet()
  
  var p = subclass( Event_Emitter, Pipelet ).prototype;
  
  extend( p, Query_Tree_Prototype, {
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
      
      var t = transactions.get_transaction( count, options, this );
      
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
       __emit( event_name, ... )
       
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
    */
    __emit: function( event_name, values, options ) {
      var more, tid;
      
      if ( options ) {
        more = options.more;
        tid  = options.transaction_id
      }
      
      de&&ug(
          this._get_name()
        + '.__emit( event_name: "' + event_name + '"'
        + ( values ? ', values: '         + values.length : '' )
        + ( more   ? ', more: '           + more          : '' )
        + ( tid    ? ', transaction_id: ' + tid           : '' )
        // + ', values: ' + log.s( values )
        + ' )'
      );
      
      // !! __emit even if values.length == 0 to transmit more flag to downstream pipelets
      this.__query_tree_emit( event_name, values, options );
      
      this._emit_event( event_name, [ values, options ] );
      
      more || this._emit_event( 'complete', [ options ] );
      
      return this;
    }, // __emit()
    
    /* ------------------------------------------------------------------------
       _on_change( listener, that, once )
       
       listens to events 'add', 'remove', 'update', and 'clear' simultaneously.
       
         The event listener is then called with the following signatures:
           listener( 'add'   , values , options )
           listener( 'remove', values , options )
           listener( 'update', updates, options )
           listener( 'clear' , void 0 , options )
         
       _on_complete( listener, that, once )
       
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
    _on_change: function( listener, that, once ) {
      this._on( 'add'   , function( v, o ) { listener.call( this, "add"   , v, o ) }, that, once );
      this._on( 'remove', function( v, o ) { listener.call( this, "remove", v, o ) }, that, once );
      this._on( 'update', function( v, o ) { listener.call( this, "update", v, o ) }, that, once );
      this._on( 'clear' , function( v, o ) { listener.call( this, "clear" , v, o ) }, that, once );
      
      return this;
    }, // _on_change()
    
    _on_complete: function( listener, that, once ) {
      return this._on( 'complete', listener, that, once );
    }, // _on_complete()
    
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
           - more: (Boolean) true if more operations are comming, false if this
             is the last operation of a number of operations
    */
    // ToDo: tests for __emit_operations()
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
    
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query] )
       
       Fetches the content of this set, possibly in chunks.
       
       This is the stateless version, it must be overloaded by stateful
       pipelets.
       
       Parameters:
         - receiver (Function): will be called for each chunk of data and
             which signature is  receiver( values, no_more ):
               - values: (Array) of values for each chunk
               
               - no_more: indicates the last chunk if truly
               
         - query (optional Array of Objects): where each object is the or_term
             for a Query.
       
       ToDo: receiver should accept operations (adds and removes) in a transaction
         for version control and fully stateless routing back to a persistent store
         of transactions. This refactoring will be done when implementing persistence
    */
    _fetch: function( receiver, query ) {
      var that = this;
      
      return this.__fetch_source( rx, query );
      
      function rx( values, no_more ) {
        if ( values && values.length ) values = that.__transform( values, {}, 'fetch' );
        
        receiver( values, no_more );
      }
    }, // _fetch()
    
    /* ------------------------------------------------------------------------
       _transactional_fetch( receiver_pipelet, query, options )
       
       Fetch data for a receiver pipelet, limited by an optional query and
       possibly within a transaction defined in options.
       
       Parameters:
         - receiver_pipelet (Pipelet): towards which adds (and eventually other
             operations) are emited
             
         - query (Optional Array of AND-expressions): limiting returned
             operations.
             
         - options (Optional Object): options for the transactional fetch
             - more (Boolean): true if this _fetch is part of a larger unfinished
                 transaction.
                 
             - transaction_id (String): transaction id of a larger transaction
                 this _fetch is part of.
                 
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
    _transactional_fetch: function( receiver_pipelet, query, options, next ) {
      var that = this
        , transactions = this._transactions
        , transaction
        , ended = false
        , count = 1
        , operation = "add"
        , o
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
          this._error( '_transactional_fetch', 'already ended, no_more received twice from _fetch()' );
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
        
        receiver_pipelet[ '_' + operation ]( values, o );
      } // receiver()
      
      function get_options( count ) {
        transaction || ( transaction = transactions.get_transaction( count, options || {}, that ) );
        
        return o = transaction.next().get_emit_options();
      } // get_transaction()
    }, // _transactional_fetch()
    
    /* ------------------------------------------------------------------------
       __fetch_source( receiver [, query] )
       
       Fetches the content of this source set, possibly in chunks.
       
       Applies this pipelet's _query on results.
       
       This method should not be called directly but may be overloaded.
       
       Parameters:
         - receiver: (function) see _fetch() for definition
         - query (optional Array of Objects): see _fetch() for definition
    */
    __fetch_source: function( receiver, _query ) {
      var s = this._source
        , q = this._query
        , name
      ;
      
      de&&ug( get_name( this ) + 'query: ' + log.s( _query ) );
      
      if ( s && q ) {
        // there is a source and a query
        var query = q.query
          , keys  = q.keys
          , ql    = query.length
        ;
        
        if ( 1 == ql && 0 == keys[ 0 ].length ) {
          // There is only one or-term and it has no keys, i.e. this is the pass-all term, it does not filter anything
          de&&ug( name + 'no filter' );
          
          s._fetch( receiver, _query );
        } else {
          // ToDo: optimize nul query; also perform this._query AND _query before fetching source, removing the need for rx() bellow
          var filter = q.filter;
          
          de&&ug( name + 'filter query: ' + log.s( query ) );
          
          s._fetch( rx, _query );
        }
      } else if ( s ) {
        de&&ug( name + 'no query' );
        
        s._fetch( receiver, _query );
      } else {
        de&&ug( name + 'no source' );
        
        receiver( [], true ); // No source, so this is an empty set
      }
      
      return this;
      
      function rx( values, no_more ) {
        // de&&ug( '__fetch_source(), before filtering, values: ' + log.s( values ) + ', no_more: ' + no_more );
        
        if ( values && values.length ) values = filter( values );
        
        // de&&ug( '__fetch_source(), after filtering values with query: values: ' + log.s( values ) );
        
        if ( no_more || ( values && values.length ) ) receiver( values, no_more );
      } // rx()
      
      function get_name( that ) {
        return name || ( name = that._get_name( '__fetch_source' ) );
      } // get_name()
    }, // __fetch_source()
    
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
           
           This function must be provided if the source is not in the same
           process. Otherwise an exception will be raised.
           
         - query (optional Array of Objects): see _fetch() for definition.
           
       Returns:
         Undefined: the source is not in the same process or worker thread,
           therefore the result is assynchronous and cannot be known at the
           time when _fetch_all() returns.
         
         Array of values: the source is in the same process or worker thread,
           the _fetch_all() method is therefore synchronous and the returned
           value contains the Array of all the values of the set.
         
       Exceptions:
         If the method is asynhronous, because the source is in a different
         process or worker thread, and no receiver function is provided, an
         exception will be raised.
         
         If a chunk is received after the last chunk was received.
    */
    _fetch_all: function( receiver, query ) {
      var that = this, u, out, name;
      
      de&&ug( get_name() + 'query: ' + log.s( query ) );
      
      if ( this._fetch === Pipelet.prototype._fetch ) {
        // _fetch has not been overloaded so this is a stateless pipelet
        // Can optimize using __fetch_source_all() to do a single transform
        this.__fetch_source_all( rx_all, query );
      } else {
        var chunks = [];
        
        this._fetch( rx_concat, query );
      }
      
      if ( out === u && receiver === u ) this._error( '_fetch_all', 'is asynchronous and no receiver function was provided' );
      
      return out;
      
      function rx_all( values, no_more ) {
        out = that.__transform( values, {}, '_fetch' );
        
        receiver && receiver( out, no_more );
      } // rx_all()
      
      function rx_concat( values, no_more ) {
        if ( out ) that._error( '_fetch_all', 'received extra chunck after no_more' );
        
        if ( values && values.length ) chunks.push( values );
        
        if ( no_more ) {
          out = concat.apply( [], chunks );
          
          receiver && receiver( out, no_more );
        }
      } // rx_concat()
      
      function get_name() {
        return name || ( name = that._get_name( '_fetch_all' ) );
      } // name()
    }, // _fetch_all()
    
    __fetch_source_all: function( receiver, query ) {
      var that = this, chunks = [], out, u;
      
      this.__fetch_source( rx_concat, query );
      
      if ( out === u && receiver === u ) this._error( 'fetch_source_all', 'is asynchronous and no receiver function was provided' );
      
      return out;
      
      // ToDo: dry code with _fetch_all()#rx_concat()
      function rx_concat( values, no_more ) {
        if ( out ) that._error( 'fetch_source_all', 'received extra chunck after no_more' );
        
        if ( values && values.length ) chunks.push( values );
        
        if ( no_more ) {
          out = concat.apply( [], chunks );
          
          receiver && receiver( out, no_more );
        }
      } // rx_concat()
    }, // __fetch_source_all()
    
    /* ------------------------------------------------------------------------
       _add_destination( destination [, options ] )
       
       Adds a destination pipelet to this source:
       
         this ---> destination
         
       The content of the this pipelet is then fetched and added to destination
       pipelet unless destination is lazy or option no_fetch is provided.
       
       Parameters:
         - destination: (Pipelet) the destination pipelet to _remove_destination
         
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
       
       Severes the connection between this pipelet and one of its destinations:
       
         this --x--> destination
       
       The content of this pipelet is then fetched and removed from desintation
       pipelet unless destination is lazy or option no_fetch is provided.
       
       Parameters:
         - destination: (Pipelet) the destination pipelet to _remove_destination
         
         - options (Optional Object):
           - no_fetch: do not _fetch the source to remove
    */
    _remove_destination: function( destination, options ) {
      destination._remove_source( this, options );
      
      return this;
    }, // _remove_destination()
    
    /* ------------------------------------------------------------------------
       _add_source( source [, options ] )
       
       Adds a source to this pipelet:
       
         source ----> this
       
       The content of the source is then fetched and added to this pipelet
       unless this pipelet is lazy or option no_fetch is provided.
       
       Parameters:
         - source: (Object) to add as a source to this pipelet.
         
         - options (Optional Object):
           - no_fetch: do not fetch data from source to add values to this
             pipelet.
             
       ToDo: _add_source(), synchronization between __add_source_query() and __fetch_source_destination()
    */
    _add_source: function( source, options ) {
      return source.is_void ? this : this
        .__add_source              ( source )
        .__add_source_destination  ( source )
        .__add_source_query        ( source )
        .__fetch_source_destination( source, options )
      ;
    }, // _add_source()
    
    /* ------------------------------------------------------------------------
       _remove_source( source, options )
       
       Severes the connection between upstream source pipelet and this pipelet.
       
         source --x--> this
       
       The content of source is then fetched and removed from this pipelet
       unless this pipelet is lazy or option no_fetch is provided.
       
       Parameters:
         - source: (Pipelet) the source pipelet to remove
         
         - options:
           - no_fetch: do not _fetch the source to remove values from
                       destination
       
       ToDo: tests for _remove_source and _remove_destination
       ToDo: remove pending fetches between source and destination
    */
    _remove_source: function( source, options ) {
      return source.is_void ? this : this
        .__fetch_source_destination ( source, extend_2( { operation: 'remove' }, options ) )
        .__remove_source_query      ( source )
        .__remove_source_destination( source )
        .__remove_source            ( source )
      ;
    }, // _remove_source()
    
    /* ------------------------------------------------------------------------
       __add_source( source )
       
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
    __add_source: function( source ) {
      var s = this._source;
      
      if ( s ) this._error( '__add_source', 'already has a source: ' + ( s._get_name ? s._get_name() : typeof s ) );
      
      this._source = source;
      
      return this;
    }, // __add_source()
    
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
        , source = this._source
      ;
      
      de&&ug( this._get_name( '_insert_source_union' )
        + 'source: ' + ( source && source._get_name ? source._get_name() : typeof source )
      );
      
      if ( source ) {
        this._remove_source( source, no_fetch );
      } else {
        source = xs;
      }
      
      return xs
      
        .union( [], { name: name || ( this._get_name() + ' (union)' ) } )
        
        ._add_source( source )
        
        ._add_destination( this, no_fetch )
      ;
    }, // _insert_source_union()
    
    /* ------------------------------------------------------------------------
       __remove_source( source )
       
       Removes an upstream source pipelet from this pipelet.
       
       This is a low-level method that should not be called directly but can be
       overloaded or redirected as done by __add_source() if more than one source
       is added.
       
       Parameters:
         - source: (Pipelet) to remove from this pipelet
         
       Exception:
         - source is not a source of this pipelet
    */
    __remove_source: function( p ) {
      if ( this._source !== p ) this._error( '__remove_source', 'this._source is not ' + p._get_name() );
      
      this._source = null;
      
      return this;
    }, // __remove_source()
    
    /* ------------------------------------------------------------------------
       __add_source_destination( source )
       
       Adds to a source of this pipelet destinations.
       
       The default implementation adds this as a destination to source.
       
       Derived pipelets may use this method to redirect source's destination
       to another pipelet.
    */
    __add_source_destination: function( source ) {
      source.__add_destination && source.__add_destination( this );
      
      return this;
    }, // __add_source_destination()
    
    /* ------------------------------------------------------------------------
       __remove_source_destination( source )
       
       Removes from a source of this pipelet destinations.
       
       The default implementation removes this as a destination to source.
    */
    __remove_source_destination: function( source ) {
      source.__remove_destination && source.__remove_destination( this );
      
      return this;
    }, // __remove_source_destination()
    
    /* ------------------------------------------------------------------------
       __add_destination( destination )
       
       Adds a destination to this pipelet.
       
       This is a low-level method that should not be used by external objects.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destination(s)
         - reject the addition by generating an exception.
         - trigger other actions on addition
         - redirect to another another pipelet (done by Encapsulate)
       
       Parameters:
         - destination (Pipelet): the destination pipelet to add
         
       Exception:
         - destination is already add to this pipelet
    */
    __add_destination: function( destination ) {
      // Keep track of all destinations
      var destinations = this._destinations
        , i = destinations.indexOf( destination )
      ;
      
      if ( i != -1 ) this._error( '__add_destination', 'already added, destination: ' + destination._get_name() );
      
      destinations.push( destination );
      
      return this;
    }, // __add_destination()
    
    /* ------------------------------------------------------------------------
       __remove_destination( destination )
       
       Removes a destination.
       
       This is a low-level method that should not be used by external objects.
       
       Paramters:
         - destination: the destionation pipelet to remove from
         
       Exception:
         - destination is not a known destination of this pipelet
    */
    __remove_destination: function( destination ) {
      // Remove this destination from of this._destinations
      var destinations = this._destinations
        , i = destinations.indexOf( destination )
      ;
      
      if ( i == -1 ) this._error( '__remove_destination', 'not found, destination: ' + destination._get_name() );
      
      destinations.splice( i, 1 );
      
      return this;
    }, // __remove_destination()
    
    /* ------------------------------------------------------------------------
       __add_source_query( source )
       
       Low-level function to add this as a destination for this._query from
       source.
       
       May be overloaded to redirect to this downstream destinations as done
       by controllets.
       
       Parameters:
         source (Pipelet): to add query and destination to
    */
    __add_source_query: function( source ) {
      var q = this._query;
      
      source._query_tree_update && source._query_tree_update( [], q ? q.query : [], this );
      
      return this;
    }, // __add_source_query()
    
    /* ------------------------------------------------------------------------
       __remove_source_query( source )
       
       Low-level function to remove this as a destination for this._query from
       source.
       
       May be overloaded to redirect to this downstream destinations as done
       by controllets.
       
       Parameters:
         source (Pipelet): to add query and destination to
    */
    __remove_source_query: function( source ) {
      var q = this._query;
      
      source._query_tree_update && source._query_tree_update( q ? q.query : [], [], this );
      
      return this;
    }, // __remove_source_query()
    
    /* ------------------------------------------------------------------------
       __fetch_source_destination( source, options )
       
       Fetch a source for this pipelet destinations if this is not lazy.
       
       This is a low-level function that should not be called directly but can
       be overloaded to allow redirections of the _fetch output other pipelets
       than this and as done by controllets.
       
       Parameters:
         - source
           - implementing _transactional_fetch():
               the source pipelet to _fetch from for a destination of this
               pipelet
               
           - Other: added or removed directly to this pipelet
           
         - options (Optional Object):
           - operation (String): Either 'add' or 'remove', default is 'add.
           
           - more (Boolean): for transaction
           
           - transaction_id (String): for transaction
           
           - no_fetch (Boolean): don't do anything, return immediately
    */
    __fetch_source_destination: function( source, options ) {
      if ( this._is_lazy() || ( options && options.no_fetch ) ) return this; // Don't add or remove anything
      
      // Add data from source
      de&&ug( this._get_name( '__fetch_source_destination' ) + 'source: ' + ( source._get_name ? source._get_name() : typeof source ) );
      
      var q = this._query;
      
      if ( source._transactional_fetch ) {
        source._transactional_fetch( this, q && q.query, options );
      } else {
        // This source does not provide a _fetch method, it should be an Array
        // of JavaScript Objects containing a static set.
        //
        // This is typically used by input control ports.
        //
        if ( q ) source = q.filter( source );
        
        this[ ( options && options.operation ) || '_add' ]( source, only_more( options ) );
      }
      
      return this;
    }, // __fetch_source_destination()
    
    /* ------------------------------------------------------------------------
       _is_lazy()
       
       Returns: (Boolean) true if lazy, false if not lazy.
    */
    _is_lazy: function() {
      var q = this._query;
      
      return ! ( q && q.query.length );
    }, // _is_lazy()
    
    // ToDo: document _query_tree_update() and __update_upstream_query()
    _query_tree_update: function( removes, adds, destination ) {
      // ToDo: guaranty synchronization between _fetch() and _query_tree_update()
      
      var rl = removes.length, al = adds.length;
      
      de&&ug( this._get_name( '_query_tree_update' ) + log.s( { removes: removes, adds: adds, destination: destination._get_name() } ) );
      
      rl && this.__query_tree_remove( removes, destination );
      al && this.__query_tree_add   ( adds   , destination );
      
      return this.__update_upstream_query( removes, adds );
    }, // _query_tree_update()
    
    __update_upstream_query: function( removes, adds ) {
      var rl = removes.length, al = adds.length;
      
      if ( ! ( rl || al ) ) return this;
      
      var q = this._query, source = this._source;
      
      if ( q ) {
        rl && q.remove( removes );
        al && q.add   ( adds    );
      } else {
        // This pipelet has never fetched yet, it was lazy
        q = this._query = new Query( [] ); // Now this pipelet will no-longer be lazy
        
        rl && q.remove( removes ); // would throw
        al && q.add   ( adds    );
        
        q.adds.length || q.generate();
      }
      
      adds    = q.adds   ;
      removes = q.removes;
      
      if ( removes.length || adds.length ) {
        de&&ug( this._get_name( '__update_upstream_query' )
          + 'update source: ' + ( source ? source._get_name() : 'none' )
        );
        
        q.generate();
        
        source && source._query_tree_update( removes, adds, this );
        
        q.discard_operations();
      }
      
      return this;
    }, // __update_upstream_query()
    
    __dummy__: false // ToDo: Remove when API is stabilized
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
  
  // Prevent becoming a source of any downstream Pipelet, see Pipelet.._add_source()
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
       - methods:
         - (Object)  : methods for the constructor's class
         - (Function): returning a method Object, signature:
           methods( Super, prototype )
             - Super (Object): prototype of the super class
             - prototype (Object): prototype of new class 
     
     Usage:
       Set.subclass( Order );
  */
  Pipelet.subclass = function( constructor, methods ) {
    subclass( this, constructor );
    
    // Allows Build() and subclass() to be used by subclass
    constructor.Build    = Pipelet.Build;
    constructor.subclass = Pipelet.subclass;
    
    if ( methods ) {
      if ( typeof methods == 'function' ) {
        // Methods is a function returning methods
         
        methods = methods( this.prototype, constructor.prototype );
      }
      
      extend_2( constructor.prototype, methods );
    }
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
    
    if ( pipelet === u ) {
      pipelet = ( function() {
        var constructor_apply = XS.make_constructor_apply( constructor );
        
        return function pipelet() {
          // 'this' is the context of the upstream pipelet
          
          var a = arguments;
          
          de&&ug( 'pipelet.' + name + '(), parameters count: ' + a.length );
          
          a = Pipelet.set_default_options( constructor, this, a, { name: name } );
          
          var that = new constructor_apply( a );
          
          return that._add_source( this );
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
     
     Example using the aggregate_from() composition from above:
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
     This implementation redirects the methods that tie pipelets together so that all
     subsequent method invocations are done directly to/from input or output pipelets
     with no overhead.
     
     However, as users may still hold references to the encapsulated pipelet, many other
     methods have to be redirected too.
     
     Some methods are not redirected because these should never be called by an outside
     user. To prevent silent bugs, these are redirected to null to trigger exceptions
     as early as possible.
     
     An interesting side-effect of encapsulate() is that it better defines the semantic
     of these methods as applying to the input or output of a pipelet.
     
     ToDo: use this to augment the documentation of pipelet methods
     
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
     
     __transform                    null         Called by _add(), _remove(), _update(), _fetch() receiver
     
     __emit_add                     null         Called by _add(), _remove(), and _update()
     __emit_remove                  null         Called by _add(), _remove(), and _update()
     __emit_update                  null         Called by _add(), _remove(), and _update()
     __emit_clear                   null         Called by _add(), _remove(), and _update()
     
     __emit                         null         Called by __emit_xxx()
     __emit_operations              null         Called typically by an operation implementation
     
     _add_source                this --> input
     _remove_source             this --> input
     
     __add_source                   null         Called by _add_source()
     __remove_source                null         Called by _remove_source()
     
     __add_source_destination       null         Called by _add_source()
     __remove_source_destination    null         Called by _remove_source()
     __add_source_query             null         Called by _add_source()
     __remove_source_query          null         Called by _remove_source()
     __fetch_source_destination     null         Called by _add_source() and _remove_source()
     
     Output methods:
     --------------
     
     _on                        this --> output
     _once                          none         Calls _on()
     _on_change                     none         Calls _on()
     _on_complete                   none         Calls _on()
     
     _add_destination           this --> output
     _remove_destination        this --> output
     
     __add_destination              null         Called by _add_destination()
     __remove_destination           null         Called by _remove_destination()
     
     _fetch                     this --> output
     _fetch_all                 this --> output
     _transactional_fetch       this --> output
     
     __fetch_source                 null         Called by _fetch()
     __fetch_source_all             null         Called by _fetch_all()
     
     _query_tree_update         this --> output
     
     __init_query_tree             unused        Called by Pipelet()
     
     __query_tree_add               null         Called by _query_tree_update()
     __query_tree_remove            null         Called by _query_tree_update()
     __query_tree_emit              null         Called by __emit()
     __update_upstream_query        null         Called by _query_tree_update()
  */
  function Encapsulate( input, output, options ) {
    this._input  = input;
    this._output = output;
    
    return Pipelet.call( this, options );
  } // Encapsulate()
  
  Pipelet.Build( 'encapsulate', Encapsulate, {
    // Input operations
    _notify: function( transaction, options ) {
      this._input._notify( transaction, options );
      
      return this;
    },
    
    _add: function( values, options ) {
      this._input._add( values, options );
      
      return this;
    },
    
    _remove: function( values, options ) {
      this._input._remove( values, options );
      
      return this;
    },
    
    _update: function( updates, options ) {
      this._input._update( updates, options );
      
      return this;
    },
    
    _clear: function( options ) {
      this._input._clear( options );
      
      return this;
    },
    
    // Setting output event listeners
    _on: function( event_name, listener, that, once ) {
      this._output._on( event_name, listener, that, once );
      
      return this;
    },
    
    // Responding to output fetching
    _fetch: function( receiver, query ) {
      this._output._fetch( receiver, query );
      
      return this;
    },
    
    _fetch_all: function( receiver, query ) {
      this._output._fetch_all( receiver, query );
      
      return this;
    },
    
    _transactional_fetch: function( pipelet, query, options ) {
      this._output._transactional_fetch( pipelet, query, options );
      
      return this;
    },
    
    _query_tree_update: function( removes, adds, destination ) {
      this._output._query_tree_update( removes, adds, destination );
      
      return this;
    },
    
    // Pluging / Unpluging output
    _add_destination: function( destination, options ) {
      return this._output._add_destination( destination, options );
    },
    
    _remove_destination: function( destination, options ) {
      return this._output._remove_destination( destination, options );
    },
    
    // Input source addition and removal
    _add_source: function( source, options ) {
      this._input._add_source( source, options );
      
      return this;
    },
    
    _remove_source: function( source, options ) {
      this._input._remove_source( source, options );
      
      return this;
    },
    
    // Forbidden methods
    __fetch_source              : null,
    __fetch_source_all          : null,
    __update_upstream_query     : null,
    __transform                 : null,
    __add_source                : null,
    __remove_source             : null,
    __add_destination           : null,
    __remove_destination        : null,
    __add_source_destination    : null,
    __remove_source_destination : null,
    __add_source_query          : null,
    __remove_source_query       : null,
    __fetch_source_destination  : null,
    __query_tree_add            : null,
    __query_tree_remove         : null,
    __query_tree_emit           : null,
    __emit_add                  : null,
    __emit_remove               : null,
    __emit_update               : null,
    __emit_clear                : null,
    __emit                      : null,
    __emit_operations           : null,
  } ); // Encapsulate instance methods
  
  /* -------------------------------------------------------------------------------------------
     pass_through( [ options ] )
     
     A pipelet typically used as a temporary variable for cyclic graphs.
     
     Example:
       var tmp = xs.pass_through()
       
       xs.loop( tmp )._add_destination( tmp );
       
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
    Pipelet.call( this, options );
    
    this._destinations = [];
    
    return this;
  } // Controllet()
  
  Pipelet.subclass( Controllet, function( Super ) {
    return {
      // It _is_lazy() if all destinations are lazy 
      _is_lazy: function() {
        var i = -1, destinations = this._destinations, d;
        
        while( d = destinations[ ++i ] ) {
          if ( d._is_lazy() ) continue;
          
          de&&ug( get_name( this ) + 'false, because destination: ' + d._get_name() + ' is not lazy' );
          
          return false;
        }
        
        de&&ug( get_name( this ) + 'true, because all destinations are lazy' );
        
        return true;
        
        function get_name( that ) {
          return that._get_name( '_is_lazy' );
        } // get_name()
      }, // Controllet.._is_lazy()
      
      // Route __add_source_query() to all destinations
      __add_source_query: function( source ) {
        // Add to that source this destinations and queries
        var i = -1, destinations = this._destinations, d, name;
        
        de&&ug( get_name( this ) + 'source: ' + source._get_name() );
        
        while( d = destinations[ ++i ] ) {
          de&&ug( name + 'destination: ' + d._get_name() );
          
          d.__add_source_query( source );
        }
        
        return this;
        
        function get_name( that ) {
          return name = that._get_name( '__add_source_query' );
        }
      }, // Controllet..__add_source_query()
      
      // Route __remove_source_query() to all destinations
      __remove_source_query: function( source, options ) {
        // Remove from that source, this destinations / queries
        var i = -1, destinations = this._destinations, d, name;
        
        de&&ug( get_name( this ) + 'source: ' + source._get_name() + ', options: ' + log.s( options ) );
        
        while( d = destinations[ ++i ] ) {
          de&&ug( name + 'destination: ' + d._get_name() );
          
          d.__remove_source_query( source, options );
        }
        
        return this;
        
        function get_name( that ) {
          return name = that._get_name( '__remove_source_query' );
        }
      }, // Controllet..__remove_source_query()
      
      // Route __fetch_source_destination() to destinations
      __fetch_source_destination: function( source, options ) {
        var i = -1, destinations = this._destinations, d, name;
        
        de&&ug( get_name( this ) + 'source: ' + source._get_name() );
        
        while( d = destinations[ ++i ] ) {
          de&&ug( name + 'destination: ' + d._get_name() );
          
          d.__fetch_source_destination( source, options );
        }
        
        return this;
        
        function get_name( that ) {
          return name = that._get_name( '__fetch_source_destination' );
        }
      }, // Controllet..__fetch_source_destination()
      
      // Route _query_tree_update to this source
      _query_tree_update: function( removes, adds, destination ) {
        var rl = removes.length, al = adds.length;
        
        de&&ug( this._get_name( '_query_tree_update' )
          + log.s( { removes: removes, adds: adds, destination: destination._get_name() } )
        );
        
        if ( rl || al ) {
          var source = this._source;
          
          source._query_tree_update && source._query_tree_update( removes, adds, destination );
        }
        
        return this;
      } //  Controllet.._query_tree_update()
    }; // Controllet instance methods
  } ); // Controllet methods() maker
  
  /* -------------------------------------------------------------------------------------------
     Union( sources, options )
     
     Forwards many sources to one destination
  */
  function Union( sources, options ) {
    Controllet.call( this, options );
    
    this._sources = [];
    
    if ( sources ) {
      for( var i = -1; ++i < sources.length; ) {
        var p = sources[ i ];
        
        if ( p && p instanceof Pipelet ) this._add_source( p );
      }
    }
    
    return this;
  } // Union()
  
  Controllet.Build( 'union', Union, {
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query] )
       
       ToDo: add test cases
    */
    _fetch: function( receiver, query ) {
      var that = this, sources = this._sources, l = sources.length;
      
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
        var that = this, complete = false;
        
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
              source.query_tree_pause( that );
            } else {
              // All sources fetches are now complete
              resume_all_sources();
            }
          } else {
            if ( complete ) {
              that._error( '_fetch#rx'
                , 'source "' + source._get_name() + '" sent more content after completing'
              );
            }
            
            values && values.length && receiver( values );
          }
        } // rx()
      } // _fetch()
      
      function resume_all_sources( source ) {
        for ( var i = -1, l = sources.length; ++i < l; ) {
          sources[ i ].query_tree_resume( that );
        }
      } // resume_all_sources()
      
      function end() {
        receiver( [], true );
      } // end()
    }, //  Union.._fetch()
    
    // Forward query tree updates directly to all sources
    _query_tree_update: function( removes, adds, destination ) {
      var rl = removes.length, al = adds.length;
      
      de&&ug( this._get_name( '_query_tree_update' )
        + log.s( { removes: removes, adds: adds, destination: destination._get_name() } )
      );
      
      if ( rl || al ) {
        var sources = this._sources, l = sources.length, i = -1;
        
        while ( ++i < l ) sources[ i ]._query_tree_update( removes, adds, destination );
      }
      
      return this;
    }, //  Union.._query_tree_update()
    
    __add_source: function( source ) {
      if ( this._sources.indexOf( source ) !== -1 ) throw new Error( "Union, __add_source(), invalid source: already there" );
      
      this._sources.push( source );
      
      return this;
    }, // Union..__add_source()
    
    __remove_source: function( source ) {
      var s = this._sources;
      
      if ( ( source = s.indexOf( source ) ) === -1 ) throw new Error( "Union, __remove_source(), source not found in this" );
      
      s.splice( source, 1 );
      
      return this;
    } // Union..__remove_source()
  } ); // Union instance methods
  
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
    
    branches // ToDo: implement branches using a proper pipelet port instead of _on() + _fetch(), see filter.js for example
      ._fetch( function( branches ) { that.create_branches( branches ) } )
      
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
      var name = de && this._get_name( 'create_branches' );
      
      if ( options ) {
        var tid = options.transaction_id;
        
        // ToDo: Dispatch..create_branches() find cleaner option to deal with updates as remove + add
        if ( tid == this.remove_branches_tid ) {
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
        
        output && output._add_destination( this.gatherer );
      } // for all added branches
      
      return this;
    }, // create_branches()
    
    remove_branches: function( removed_branches, options ) {
      var name = de && this._get_name( 'remove_branches' );
      
      if ( options && options.more ) {
        var tid = this.remove_branches_tid = options.transaction_id;
        
        de&&ug( name + 'more option set, this could be an update, tid: ' + tid );
        
        return this;
      }
      
      for( var i = -1, l = removed_branches.length, branches = this.branches, id, branch; ++i < l; ) {
        branch = branches[ id = removed_branches[ i ].id ];
        
        if ( branch ) {
          de&&ug( name + 'id: ' + id );
          
          // Unplug using no_fetch because there will be no response to this fetch
          branch.output && branch.output._remove_destination( this.gatherer, { no_fetch: true } );
          
          // Unplug using no_fetch because there is nowhere to send removes to
          branch.input && this.dispatcher._remove_destination( branch.input, { no_fetch: true } );
          
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
    Pipelet.call( this, options );
    
    // Query eveyrthing from upstream, makes me greedy
    this._query = Query.pass_all;
    
    return this;
  } // Greedy()
  
  Pipelet.Build( 'greedy', Greedy, {
    /* -----------------------------------------------------------------------------------------
       __update_upstream_query( removes, adds )
       
       Pipelet default behavior: Updates upstream query and propagate uptream.
       
       Greedy behavior: to not do anything, do not update query and do not
       propagate upstream. Greedy therefore _fetch all it can regarless of
       downstream pipelet needs.
       
       Filtering content must therefore be specified upstream of the greedy pipelet.
    */
    __update_upstream_query: function() {
      // Prevent upstream query propagation
      
      return this;
    } // __update_upstream_query()
  } ); // greedy()
  
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
    
    return this;
  } // Alter()
  
  Greedy.Build( 'alter', Alter, {
    // ToDo: we probably don't need this _fetch(), looks like the same as Pipelet.prototype._fetch()
    _fetch: function( receiver, query ) {
      if ( query ) {
        var filter = new Query( query ).generate().filter;
        
        return Pipelet.prototype._fetch.call( this, rx );
      }
      
      return Pipelet.prototype._fetch.call( this, receiver );
      
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
    // ToDo: implement option to provide a function for __update_upstream_query()
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
    var u;
    
    if ( a && ! ( a instanceof Array ) ) throw new Error( 'Set(), first paramater must be an Array' );
    
    options = Greedy.call( this, options )._options;
    
    this._key = options.key || [ 'id' ]; // ToDo: consider moving this into Pipelet()
    
    // ToDo: add leading underscores to instance variables 
    this.a = []; // The current state of the set
    this.b = []; // Anti-state, used to store removes waiting for adds and conflict resolution
    
    a && a.length && this._add( a );
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
    
    return this;
  } // Set()
  
  Greedy.Build( 'set', Set, {
    /* ------------------------------------------------------------------------
       _fetch( receiver [, query ] )
       
       Fetches set content, possibly in several chunks.
       
       See Pipelet._fetch() for receiver and query documentation.
    */
    _fetch: function( receiver, query ) {
      // ToDo: split large sets in chunks to allow incremental processing
      var a = this.a;
      
      if ( query ) {
        de&&ug( 'Set ' + this._get_name( '_fetch' ) + 'query: ' + log.s( query ) + ', values: ' + a.length );
        
        a = new Query( query ).generate().filter( a );
        
        de&&ug( 'Set ' + this._get_name( '_fetch' ) + 'filtered values: ' + a.length );
      }
      
      receiver( a, true );
      
      return this;
    }, // _fetch()
    
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
        var name;
        
        de&&ug( get_name( this, 'add' ) + 'values: ' + l );
        
        var i = -1, v, b = this.b, values = _values;
        
        while( b.length && ++i < l ) {
          // There are values in the antistate b, waiting for an add or
          // update, or conflict resolution
          var p = this._index_of( v = values[ i ] );
          
          if ( p == -1 ) {
            this._add_value( t, v );
          } else {
            de&&ug( name + 'removing add from anti-state' );
            
            b.splice( p, 1 );
            
            t.emit_nothing();
          }
        }
        
        while( ++i < l ) this._add_value( t, values[ i ] );
        
        function get_name( that ) { return name = that._get_name( '_add' ) }
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
      
      i < l && added.concat( values.slice( ++i ) );
      
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
        var name;
        
        de&&ug( get_name( this ) + 'values: ' + l );
        
        for ( var i = -1, values = _values; ++i < l; ) {
          var v = values[ i ]
            , p = this.index_of( v )
          ;
          
          if ( p == -1 ) {
            de&&ug( name + 'adding value to anti-state' );
            
            this.b.push( v );
            
            t.emit_nothing();
          } else {
            this._remove_value( t, v );
          }
        }
        
        function get_name( that ) { return name = that._get_name( '_remove' ) }
      } );
    }, // _remove()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_value: function( transaction, value, emit_now ) {
      var removed = [];
      
      if ( value ) {
        var p = this.index_of( value );
        
        if ( p === -1 ) {
          de&&ug( get_name( this ) + 'adding value to anti-state' );
          
          this.b.push( value );
        } else {
          this.a.splice( p, 1 );
          
          removed = [ value ];
        }
      }
      
      transaction.__emit_remove( removed, emit_now );
      
      return this;
      
      function get_name( that ) { return that._get_name( '_remove_value' ) }
    }, // _remove_value()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_values: function( transaction, values, emit_now ) {
      var i = -1, l = values ? values.length : 0, removed = [];
      
      while ( ++i < l ) {
        var v = values[ i ]
          , p = this.index_of( v )
        ;
        
        if ( p === -1 ) {
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
    
    options.name = name;
    
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
    
    _add_source: function( source ) {
      this.log( '_add_source', { source: source._get_name() } );
      
      return Pipelet.prototype._add_source.call( this, source );
    }, // _add_source()
    
    __fetch_source: function( receiver, query ) {
      var u, s = this._source, that = this, name = '__fetch_source';
      
      this.log( name, { source: s._get_name(), query: this._query && this._query.query } );
      
      if ( s ) {
        Pipelet.prototype.__fetch_source.call( this, rx, query );
      } else {
        this.log( name + ', no source', { values: [], no_more: true } );
        
        receiver( [], true ); // No source, so this is an empty set
      }
      
      return this;
      
      function rx( values, no_more ) {
        that.log( name + '#rx', { values: values, no_more: no_more } );
        
        receiver( values, no_more );
      } // rx()
    }, // __fetch_source()
    
    _query_tree_update: function( removes, adds, destination ) {
      this.log( '_query_tree_update', { removes : removes, adds: adds, destination: destination._get_name() } );
      
      return Pipelet.prototype._query_tree_update.call( this, removes, adds, destination );
    }, // _query_tree_update()
    
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
  } );
  
  /* -------------------------------------------------------------------------------------------
     source.delay( delay, options )
     
     Intented Purposes:
       - Simultate a distant pipelet by introducing a delay in all operations and _fetch().
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
    __fetch_source: function( receiver, query ) {
      var that = this, delay = this.delay;
      
      // Get a delayed receiver
      var _receiver = function( values, no_more ) {
        setTimeout( function() {
          receiver( values, no_more )
        }, delay )
      }
       
      // Delay the call to __fetch_source() to simultate a full round-trip to a server
      setTimeout( function() {
        Pipelet.prototype.__fetch_source.call( that, _receiver, query )
      }, delay );
      
      return this;
    }, // __fetch_source()
    
    // ToDo: add delay on _query_tree_update()
    
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
      _add: function( values, options ) {
        // add values to internal state
        
        return this.__emit_add( values, optons ); // forward added values
      }, // _add()
      
      /* ------------------------------------------------------------------------
         _remove( values )
         
         Called when items were removed from the source
      */
      _remove: function( values, options ) {
        // remove values from internal state
        
        return this.__emit_remove( values, options ); // forward removed values
      }, // _remove()
      
      /* ------------------------------------------------------------------------
         _update( updates )
         
         Called when items were updated inside the source
      */
      _update: function( updates, options ) {
        // _update internal state from updates
        
        return this.__emit_update( updates, options ); // forward updated values
      }, // _update()
      
      /* ------------------------------------------------------------------------
         _clear()
         
         Called when all items should be cleared, when the source set
         was disconnected from its source and new data is expected.
      */
      _clear: function( options ) {
        // _clear internal state
        
        return this.__emit_clear( options ); // forward to downstream pipelets
      } // _clear()
    } ); // PXXX instance methods
  } )(); } // end if false
  
  /* --------------------------------------------------------------------------
     module exports
     
     ToDo: remove xs from the list once all modules load it directly from
     xs = require( lib/pipelet.js ) and get XS as xs.XS.
  */
  eval( XS.export_code( 'XS', [
    'xs', 'Encapsulate', 'Pipelet', 'Controllet', 'Union', 'Dispatch', 'Alter', 'Set', 'Unique_Set', 'Trace', 'Delay', 'Query', 'Query_Tree'
  ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // pipelet.js
