/*    
    Copyright (c) 2013-2020, Reactive Sets
    
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
( this.undefine || require( 'undefine' )( module, require ) )
( { global: 'rs', no_conflict: true } )
( 'pipelet', [ './RS', './query', './transactions' ], function( RS, Query, Transactions ) {
  'use strict';
  
  var Code                   = RS.Code
    , safe_dereference       = Code.safe_dereference
    , Event_Emitter          = RS.Event_Emitter
    , Query_Tree             = Query.Tree
    , Transaction            = Transactions.Transaction
    , Input_Transactions     = Transactions.Input_Transactions
    , Output_Transactions    = Transactions.Output_Transactions
    , Options                = Transactions.Options
    , options_forward        = Options.forward
    , RS_log                 = RS.log
    , log_s                  = RS_log.s
    , pretty                 = RS.log.pretty
    , pretty                 = RS_log.pretty
    , log                    = RS_log.bind( null, 'pipelet' )
    , extend                 = RS.extend
    , extend_2               = extend._2
    , is_array               = RS.is_array
    , subclass               = RS.subclass
    , Loggable               = RS.Loggable
    , get_name               = RS.get_name

    , Root                   = subclass.Root
    , new_apply              = subclass.new_apply
    
    , operations             = RS.operations = [ 'add', 'remove', 'update', 'clear' ] // ToDo: remove clear once removed in all tests
    , operation_values       = RS.operation_values = { add: 0, remove: 1, update: 2, clear: 3 }
    
    // Constants to optimize for minified size
    // Attribute strings, the name of which variable is the attribute name followed by _s
    , query_s                = 'query'
    , future_query_s         = 'future_query'
    , prototype_s            = 'prototype'
    , constructor_s          = 'constructor'
    , _scope_s               = '_scope'
    , _namespace_s           = '_namespace'
    , _mixin_s               = '_mixin'
    , _add_factory_s         = '_add_factory'
    , _output_listeners_s    = '_output_listeners'
    , remove_source_s        = 'remove_source'
    , function_s             = 'function'
    , multiton_s             = 'multiton'
    , singleton_s            = 'singleton'
    , instances_scope_s      = 'instances_scope'
    
    , push                   = [].push
    , slice                  = [].slice
    , concat                 = [].concat
    , toString               = {}.toString
    
    , de                     = false
    , ug                     = log
  ;
  
  /* --------------------------------------------------------------------------
      @function swap_update( update )
      
      @short Swaps add and remove operation in update
      
      @parameters
      - **update** (Array of 2 Objects): first object is remove, second is add
      
      @description
      Swapping updates is used to revert operations, e.g. used by
      pipelet revert() and method Output.._transactional_fetch().
      
      This function is available in ```RS.swap_update()```.
  */
  function swap_update( update ) {
    return [ update[ 1 ], update[ 0 ] ]
  }
  
  RS.swap_update = swap_update;
  
  /* --------------------------------------------------------------------------
      @class Plug( pipelet, options )
      
      @short Base class for @@class:Input and @@class:Output plugs
      
      @is_a @@class:Event_Emitter\.
      
      @parameters
      - **pipelet** (@@class:Pipelet\): reference to container pipelet
      
      - **options** (Object):
        - **name** (String): name for this plug, used in traces
        - other possible options for derived classes.
      
      @description
      Plugs route dataflow subscriptions and fetches upstream and may relay
      data events downstream.
      
      Class Input() plugs are data events destinations, subscribers of
      data events sources class Output()  plugs.
      
      Some pipelets, such as @@pipelet:filter() may implement
      intermediate plugs between their input and output plugs.
  */
  var plugs = 0; // for debugging purposes
  
  function Plug( pipelet, options ) {
    var that = this
      , name = options.name
    ;
    
    Event_Emitter.call( that, name + ' #' + ++plugs );
    
    that.pipelet = pipelet;
    that.options = options;
    that.name    = name;
    
    // Upstream source
    that.source = null;
    
    // Fetches waiting for emitting outputs to terminate emission
    that.emit_waiters = [];
  } // Plug()
  
  function transform_query( query_transform, query, filtered ) {
    var new_terms = []
      , i         = -1
      , term
      , new_term
    ;
    
    while ( term = query[ ++i ] )
      ( new_term = query_transform( term ) )
        && new_terms.push( new_term ) // always > 0
        && filtered
        && filtered.push( term )
    ;
    
    return new_terms
  } // transform_query()
  
  function map_query_changes( query_transform, query_changes, filtered ) {
    var removes = query_changes[ 0 ]
      , adds    = query_changes[ 1 ]
    ;
    
    if ( removes.length )
      removes = transform_query( query_transform, removes, filtered[ 0 ] )
    ;
    
    if ( adds.length )
      adds = transform_query( query_transform, adds, filtered[ 1 ] )
    ;
    
    if ( changes_count( query_changes = [ removes, adds ] ) ) return query_changes
  } // map_query_changes()
  
  function changes_count( changes ) {
    return changes[ 0 ].length + changes[ 1 ].length
  }
  
  function swap_query_changes( changes ) {
    return [ changes[ 1 ], changes[ 0 ] ]
  }
  
  Query.changes_count = changes_count;
  
  Event_Emitter.subclass( 'Plug', Plug, {
    /* ------------------------------------------------------------------------
        @method Plug..toJSON()
        
        @short Get *Plug* representation with no circular dependency for
        @@MDN:JSON.stringify()
        
        @returns (Object): with properties without circular dependencies.
    */
    toJSON: function() {
      var that = this;
      
      return {
        name   : get_name( that ),
        source : get_name( that.source )
      }
    }, // Plug..toJSON()
    
    /* ------------------------------------------------------------------------
        @method Plug.._error( method, message, then )
        
        @short Logs errors then callback with error message or throws
        
        @parameters
        - **method** (String): name of the method where the error occurred
        
        - **message** (String): error message
        
        - **then** (Function): optional, call *then()* with Error as
          first parameter. If not provided, will throw the Error.
    */
    _error: function( method, message, then ) {
      message = get_name( this, method ) + message;
      
      var error = new Error( message );
      // ToDo: report error to global error dataflow or error output
      
      if ( then ) {
        log( error.stack );
        
        then( error )
      } else
        throw error
      ;
    }, // Plug.._error()
    
    /* ------------------------------------------------------------------------
        @method Plug..update_upstream_query( changes, destination )
        
        @short Update upstream source query with minimum changes.
        
        @parameters
        - **changes** (Array): downstream subscription query terms changes.
          The Array of changes must always have two element Arrays:
          - **0** (Array): query terms to remove.
          
          - **1** (Array): query terms to add.
        
        - **destination** (@@class:Plug\): subscriber
        
        @description
        This is a @@synchronous method, it may be @@asynchronous when
        applying changes on @@method:Plug.._update_query(), see bellow.
        
        First transforms changes calling @@method:Plug.._query_transform()
        if defined.
        
        Then, if there are still changes after this optional transformation:
        - Call @@method:Plug.._update_query(), if defined, on downstream
          (i.e. untransformed) changes possibly delayed in synchronized
          order with @@method:Plug..fetch() when its receiver emits
          final chunks;
        
        - Then call @@method:Plug.._upstream_query_changes(), if defined,
          on transformed changes, that may further transform changes to
          forward upstream;
        
        - Finally forward upstream resulting changes calling
          @@method:Plug..update_upstream_query() on ```this.source``` if
          defined.
    */
    update_upstream_query: function( downstream_changes, destination ) {
      var that                    = this
        , query_transform         = that._query_transform
        , changes
        , filtered_changes
        , query_updates
        , _upstream_query_changes
        , _update_query
        , source
        , update_upstream_query
      ;
      
      changes = query_transform
        ? map_query_changes( query_transform, downstream_changes, filtered_changes = [ [], [] ] )
        : filtered_changes = downstream_changes
      ;
      
      if ( changes ) {
        if ( query_updates = that.query_updates ) {
          // this is an Output
          
          // Apply un-transformed downstream changes to output
          
          query_updates.length
          
            // There are fetches in progress, delay query update
            ? query_updates.push( {
                done       : 1,
                changes    : filtered_changes,
                destination: destination
              } )
            
            // there are no ongoing fetches, apply query update immediately
            : that._update_query( filtered_changes, destination )
        }
        
        if ( _upstream_query_changes = that._upstream_query_changes ) {
          // this is an input
          
          changes = _upstream_query_changes.call( that, changes );
          
          if ( ! changes || ! changes_count( changes ) ) return
        }
        
        // Apply changes upstrean
        source                = that.source;
        update_upstream_query = source && source.update_upstream_query;
        
        //de&&ug( get_name( that, 'update_upstream_query' ) + 'changes:', log_s( changes ), '\n  source:', source && get_name( source ) );
        
        update_upstream_query
          && changes_count( changes ) // ToDo: remove this line, changes always has changes
          && update_upstream_query.call( source, changes, that )
      }
    }, // Plug..update_upstream_query()
    
    /* ------------------------------------------------------------------------
        @method Plug.._transform( values, done, stateful )
        
        @short Optional virtual method to transform fetched values
        
        @parameters
        - **values** (Array of Object): to transform
        
        - **done** (Function): to call with values when done.
        This function is only provided to _transform() if _transform()
        has 2 parameters or more. If _transform() has less than 2
        parameters, it must return values synchronously and statelessly.
        When provided it can be called synchronously or asynchronously.
        Its signature is the same as @@method:Plug.._fetch() receiver().
        
        - **stateful** (Object): if stateful operation is requested,
        in which case it must also provide values using done().
        Attributes:
          - **operation** (optional Number): It has 4 bits:
            - bit 0: remove (0 for add)
            - bit 1: from an update
            - bit 2: from a fetch
            - bit 3: more to come in a transaction or fetch
          
          - **fetch_state** (Object): on fetch operations. Persists
          between calls of the same fetch. This is an opaque Object,
          not interpreted or used by Plug, use it as needed.
          
          - **query** (Array of Objects): on fetch operations.
          
          - **term_state** (Object): This is the output state for this
          particular query term requiring stateful operation. This is
          an opaque Object, use it as needed for stateful operation.
        
        @returns
        - (Array of Objects): stateless synchronous transformed values
        - (Function): cancel function for assynchronous transform. If called,
        assynchronous action should be canceled immediately and no further
        calls to done() are allowed.
        
        @description
        When this method is defined, it is called by @@method:Plug.._fetch().
        
        This method should not modify its paraneters.
        
        @see_also
        - Method Query..generate()
    */
    
    /* ------------------------------------------------------------------------
        @method Plug.._query_transform( query_term )
        
        @short Optional virtual method to transform @@query terms
        
        @parameters
        - **query_term** (Object): @@query AND-expression
        
        @returns
        - (Object): optional transformed query AND-expression. If falsy,
          the transformed query will hold one-less term, making the
          resulting query lazier.
        
        @description
        When this method is defined, it is called by:
        - Method Plug..update_upstream_query()
        - Method Plug.._fetch()
        
        For each @@query term to transform queries. This allows @@greedy
        pipelets such as @@pipelet:alter() to become @@lazy\.
        
        This method should not modify its ```query_term``` paraneter,
        a new object should be returned instead, e.g. only subscribe to
        upstream @@operation\s if downstream query is for the ```flow```
        ```"issues"```:
        
        ```javascript
          function query_transform( term ) {
            if( term.flow == 'issues' ) {
              // Shallow-copy term before modification
              term = RS.extend( {}, term );
              
              delete term.flow; // term is now greedyier
              
              return term;
            }
            
            // Returns undefined for all other flow values, making query lazyier
          }
        ```
        
        This method is allways called before @@method:Plug.._update_query()
        with transformed changes. If called on an @@class:Output,
        _update_query() is applied on output query tree, which is used to
        filter efficiently emitted values after a possible transform.
        Therefore this method should only filter query terms if applied on
        an Output.
        
        Calling this method is not fully implemented on @@class:Input,
        therefore it should not be used on inputs because it would yield
        unpredictable results, possibly throwing errors.
    */
    
    /* ------------------------------------------------------------------------
        @method Plug.._update_query( changes, destination )
        
        @short Updates local @@class:Output query tree
        
        @parameters
        - **changes** (Array):
          - **0** (Array): query terms to remove
          - **1** (Array): query terms to add
        
        - **destination** (@@class:Plug\): subscriber
        
        @throws
        (Error): removed term has no matching prior added term
        
        @description
        This is an optional virtual method.
        
        This method is implemented in derived class @@class:Output:
        - @@method:Output.._update_query()
    */
    
    /* ------------------------------------------------------------------------
        @method Plug.._upstream_query_changes( changes )
        
        @short Modify query changes before upstream forwarding
        
        @parameters:
        - **changes** (Array):
          - **0** (Array): @@query terms to remove
          - **1** (Array): @@query terms to add
        
        @returns
        - (undefined): no changes to forward upstream
        
        - (Array): modified changes:
          - **0** (Array): query terms removed
          - **1** (Array): query terms added
        
        @throws
        - (Error): removed term has no matching prior added term
        
        @description
        This is an optional virtual method.
        
        This method is called by:
        - Method Plug..update_upstream_query()
        - Method Plug.._fetch()
        
        It is defined in method Input.._upstream_query_changes()
    */
    
    /* ------------------------------------------------------------------------
        @method Plug..fetch_unfiltered( receiver, query_changes )
        
        @short Fetches content, not filteed by a query
        
        @parameters
        - **receiver** (Function): see @@method:Plug.._fetch() receiver
          parameter, may be undefined if only *query_changes* need to be
          updated and ```fetch_unfiltered.length > 1```
        
        - **query_changes** (Array): optional changes for upstream
          @@subscription query
        
        @description
        This is an optional virtual method.
        
        This method is called by @@method:Plug.._fetch().
        
        It is typically implemented by @@stateful pipelets to emit the full
        set of values that may then be filtered by @@method:Plug.._fetch().
        
        If ```query_changes``` is not needed, do not define it avoid
        being called with an undefined ```receiver```.
        
        ToDo: rename Plug..fetch_unfiltered() into Plug.._fetch_unfiltered()
    */
    
    /* ------------------------------------------------------------------------
        @method Plug.._fetch( receiver, query, query_changes, destination )
        
        @short Fetches data from source then updates local queries
        
        @parameters
        - **receiver** (Function): signature:
          ```receiver( values, no_more, operation, options, terminated_source )```
          
          - **values** (Array): values added, removed of updated. Empty Array
            if no values are emitted.
          
          - **no_more**: if falsy, more operations will come later, if truly
            this is the last chunk for this fetch.
          
          - **operation** (Number): optional, 0 (default): add; 1: remove;
            2: update.
          
          - **options** (Object): optional and never used at this time:
            - **_t**: a @@transaction object when values were added, removed
              or updated.
          
          - **terminated_source** (@@class:Output\): optional, indicates
            termination of fetch from that source when upstream pipelet is
            a @@pipelet:union().
        
        - **query** (Array of Objects): optional @@query
        
        - **query_changes** (Array): optional query update once values are
          fetched
        
        - **destination** (@@class:Plug\): optional plug for
          @@method:Plug.._update_query()
        
        @returns
        - (Function): abort(): to abort fetch from downstream and possibly
          revert query changes already applied upstream. This function is
          called indirectly via the cancellation of a downstream fetch
          through @@method:Output.._cancel_fetches(), when a downstream
          source is removed by @@method:Input..remove_source().
        
        @description:
        Operation:
          - transforms queries using @@method:Plug.._query_transform() if
            defined;
          
          - Call ```receiver()``` immediately with an empty set of values
            ```[]``` if *query* (after optional transformation) is the nul
            query: ```[]```,
            
            otherwise call @@method:Plug..fetch_unfiltered() if defined,
            
            otherwise call ```this.source._fetch()``` if ```this.source``` is
            defined,
            
            otherwise call *receiver()* immediately with an empty set of
            values.
          
          - Call @@method:Plug.._update_query() synchronously when fetched
            values are received, or before calling ```receiver()``` with an
            empty set of values.
          
          - Optionally filters fetched values using *query* if
            @@method:Plug..fetch_unfiltered() is defined and
            @@method:Plug.._transform() if defined.
          
          - Receiver can emits adds, removes and updates, in a transaction;
        .
        
        Synhronization between fetch and query updates is done by updating
        local queries calling @@method:Plug.._update_query() only when fetched
        values are received and in the same order as the order of calls to
        @@method:Plug..update_upstream_query() and ```_fetch()```.
        
        This may be challenged by delayed transactions in pipelets that only
        emit when complete. If a fetch happens in the middle of such a
        transaction, pipelets must emit values to fetch receivers
        consistently.
        
        ToDo: rename Plug.._fetch() into fetch()
        ToDo: Plug.._fetch(): add full test suite
    */
    _fetch: function( receiver, query, downstream_changes, destination ) {
      var that         = this
        , name         = get_name( that, "_fetch" )
        , emit_waiters
        , abort
      ;
      
      if ( false && that.emitting ) { // Disabled for now
        /*
          Output is emitting, delay fetch until emission is complete.
          
          During emission, it is possible that a downstream pipelet is added,
          typically using dispatch(). The new downstream pipelet may then
          fetch the current state and may then receive the emitted operation
          with a state change that is
          - either already taken into account by the current fetched state
            resulting in inconsistent state,
          - or, receives an immediate state change that is not optimal,
            requiring an extra state change that would not have been necessary
            if fetch had been done after the emission was complete.
          
          To prevent these issues, we delay fetch execution until
          Output..emit() completes.
        */
        emit_waiters = that.emit_waiters;
        
        emit_waiters.push( emit_waiter );
        
        // log( name + 'waiting, emit_waiters length:', emit_waiters.length );
        
        // ToDo: allow cancellation
        
        return function() { // abort
          var p = emit_waiters.indexOf( emit_waiter );
          
          // log( name + 'abort, emit_waiters length:', emit_waiters.length + ', position:', p );
          
          p >= 0
            ? // still waiting, never fetched upstream
              emit_waiters.splice( p, 1 )
            
            : // no-longer waiting, has fetched upstream
              fetch_abort()
        }
      }
      
      var fetch_unfiltered = that.fetch_unfiltered
        , query_transform  = that._query_transform
        , _query           = query // ToDo: rename var into upstream_query
        , _update_query    = that._update_query // to apply downstream_changes locally, Output only
        , _rx              = receiver
        , source           = that.source
        , output_listeners = that[ _output_listeners_s ] // Input only
        , that_transform   = that._transform
        , emitted          = []
        , _query_changes   // changes to apply upstream ToDo: rename var into upstream_changes
        , filtered_changes // downstream changes filtered by map_query_changes if query_transform()
        , _get_transform
        , added_listeners
        , query_updates
        , query_update
        , cancelled
        , filter
        , _upstream_query_changes
        , ___
      ;
      
      // Tell _do_not_fetch() that sources must now be fetched when further connected to upstream pipelets
      // ToDo: review setting that.no_fetch to false if true, as this may no-longer be necessary
      if ( that.no_fetch === true ) that.no_fetch = false;
      
      if ( query_transform ) {
        if ( downstream_changes ) {
          _query_changes = map_query_changes( query_transform, downstream_changes, filtered_changes = [ [], [] ] );
          
          if ( ! _query_changes ) filtered_changes = ___;
        }
        
        // ToDo: if no-query, apply transform to [ {} ] which is the default query and may be transformed to something else
        // pipelets flow() and set_flow() may return undefined resulting in the nul query []. Adding a ToDo to implement this
        // as an upcomming commit:
        // query = query || [ {} ]
        
        if ( query )
          // Get transformed query from _query_changes or by calling transform_query()
          // This optmization works because map_query_changes() always returns undefined or an Array of two Arrays
          _query =
               _query_changes && _query_changes[ downstream_changes.indexOf( query ) ]
            || transform_query( query_transform, query )
      } else
        _query_changes = filtered_changes = downstream_changes
      ;
      
      // Handle output query tree changes and allow output fetch cancellation
      if ( query_updates = that.query_updates ) { // Output only
        query_updates.push( query_update = {
          done       : 0,
          changes    : filtered_changes, // may be undefined
          destination: destination,
          cancel     : cancel
        } );
        
        // this requires rx to apply query_update.changes using _update_query() and/or remove query_update from query_updates
        _rx = rx
      }
      
      if ( _query_changes && ( _upstream_query_changes = that._upstream_query_changes ) )
        // ToDo: apply _upstream_query_changes() on _query_changes
        // _query_changes = _upstream_query_changes.call( that, _query_changes )
      ;
      
      // ToDo: if defined, apply _upstream_query() on _query
      
      if ( _query && ! _query.length ) {
        de&&ug( name, 'nul query' );
        
        _query_changes && update_source_query( _query_changes );
        
        _rx( [], true )
      
      } else if ( fetch_unfiltered || is_array( source ) ) {
        if ( _query && _query.length || that_transform ) {
          _get_transform = get_filter;
          
          _rx = rx
        }
        
        fetch_unfiltered
          ? abort = fetch_unfiltered.call( that, _rx, _query_changes )
          
          : _rx( source, true )
      
      } else if ( source ) {
        de&&ug( name, 'query:', query );
        
        if ( that_transform ) {
          _get_transform = get_transform;
          
          _rx = rx
        }
        
        if ( source.emits_terminated_sources )
          // Requires rx to process terminated sources
          _rx = rx;
        
        // If there is an exception calling source._fetch(), and there is a query_update, it will block all further completions
        // Pipelet mysql throws when query does not match schema, ToDo: should we allow fetch to emit errors instead?
        // ToDo: should we catch exceptions from source._fetch()?
        // setTimeout( function() {
        abort = source._fetch( _rx, _query, _query_changes, that )
        // }, 0 );
      
      } else {
        de&&ug( name, 'no source' );
        
        _rx( [], true )
      
      }
      
      return fetch_abort;
      
      function emit_waiter() {
        // log( name + 'releasing, emit_waiters length:', emit_waiters.length + ', query:', pretty( query ) );
        
        abort = that._fetch( receiver, query, downstream_changes, destination )
      } // emit_waiter()
      
      // closure references: that, fetch_unfiltered, source, destination
      function update_source_query( _query_changes ) {
        var update_upstream_query;
        
        if ( fetch_unfiltered )
          fetch_unfiltered.length > 1 &&
            // query changes and fetch_unfiltered wants query changes
            fetch_unfiltered.call( that, ___, _query_changes )
        
        else if ( update_upstream_query = source && source.update_upstream_query )
          // If any, forward transformed subscription changes upstream
          update_upstream_query.call( source, _query_changes, destination )
      } // update_source_query()
      
      // closure references: _query, filter, get_name, that, ___
      function get_filter() {
        // This is an output, that._transform() ignored
        return _query && _query.length
          ? filter = filter
              || new Query( _query, get_name( that ) + '-_fetch' )
                .generate().filter
          : ___
      } // get_filter()
      
      // closure references: that_transform
      function get_transform() {
        return that_transform
      } // get_transform()
      
      function cancel() {
        // ToDo: [test] add tests for fetch cancellation
        var last_emitted = emitted.length - 1;
        
        //de&&
        ug( name + 'cancelled, query changes:', query_update.changes, '- destination:', get_name( destination ) );
        
        // ToDo: cancel application of query changes if any
        query_update.done = 1; // allow to apply query update by _apply_done_query_updates()
        
        cancelled = 1;
        
        // Revert previously emitted operations
        emitted.forEach( function( emitted, i ) {
          var operation = emitted[ 0 ]
            , values    = emitted[ 1 ]
          ;
          
          operation > 1
            ? values = values.map( swap_update )
            
            : operation ^= 1
          ;
          
          receiver( values, i == last_emitted, operation );
        } );
        
        fetch_abort()
      } // cancel()
      
      function fetch_abort() {
        output_listeners && remove_output_listeners(); // Input only
        
        // de-reference downstream closure as this closure is still referenced upstream
        receiver = 0;
        
        // attempt to de-reference _rx from upstream
        if ( abort )
          abort()
        
        else
          _query_changes &&
            update_source_query( swap_query_changes( _query_changes ) )
      } // fetch_abort()
      
      function rx( values, no_more, operation, options, terminated_source ) {
        // ToDo: delay response until related transactions are complete at this plug.
        
        if ( cancelled ) return; // this fetch was cancelled by cancel()
        
        // Apply changes on local query, synchronized with receiver() call bellow
        if ( no_more && _update_query ) // Output only
          if ( query_updates ) {
            query_update.done = 1;
            
            that._apply_done_query_updates( query_update ); // ToDo: provide filter if stateful
            
            if ( query_update.done < 2 ) {
              // de&&ug( name, 'not applied:', query_update.done );
              
              // _update_query = 0; // this rx() will not attempt to apply done changes again ToDo: remove unused code
              
              query_update.done = function() {
                // de&&ug( name, 'applied' );
                
                // ToDo: stop listening data events from Output..emit()
                
                receiver( [], true );
              };
              
              // delay receiver until query is updated, re-ordering receiver's calls in fetch order
              
              // ToDo: listen data events from Output..emit() until query tree is updated
              
              // fetch will terminate only when query changes are applied
              no_more = false;
            }
          } else
            // ToDo: is this still required since this code is only for outputs having _update_query?
            _update_query.call( that, filtered_changes, destination );
        
        var l          = values.length
          , _transform
        ;
        
        if ( output_listeners ) { // Input only
          if ( no_more )
            remove_output_listeners()
          
          else if ( terminated_source )
            add_output_listener()
        }
        
        // transform results if any
        // ToDo: allow assynchronous and stateless transforms
        if ( _get_transform && l ) {
          _transform = _get_transform();
          
          if ( operation > 1 ) return update( values, _transform );
          
          // add and remove
          values = _transform( values );
          
          l = values.length;
        }
        
        // emit possibly transformed results
        
        if ( l || no_more )
          emit( values, no_more, operation, options )
        ;
        
        function update( updates, _transform ) {
          var adds = [], removes = [], al, rl, ul;
          
          updates = updates
            .reduce( function( updates, update ) {
              var _removes = _transform( [ update[ 0 ] ] )
                , _adds    = _transform( [ update[ 1 ] ] )
                , _rl      = _removes.length
                , _al      = _adds   .length
              ;
              
              if ( _rl == 1 && _al == 1 ) {
                updates.push( [ _removes[ 0 ], _adds[ 0 ] ] );
              } else {
                _al && adds   .push( _adds    );
                _rl && removes.push( _removes );
              }
              
              return updates;
            }, [] )
          ;
          
          ul = updates.length;
          rl = removes.length;
          al = adds   .length;
          
          if ( rl )
            emit( removes, no_more && ! al && ! ul, 1, options )
          ;
          
          if ( ul )
            emit( updates, no_more && ! al, 2, options )
          ;
          
          if ( al || no_more && ! ul && ! rl )
            emit( adds, no_more, 0, options )
          ;
        } // update()
        
        // ToDo: only use emit() if this fetch can be canceled, i.e. this is an output
        function emit( values, no_more, operation ) {
          no_more || emitted.push( [ operation, values ] );
          
          receiver( values, no_more, operation, options );
        } // emit()
        
        function add_output_listener() { // input
          var i          = -1
            , listener
          ;
          
          // ToDo: do not add a receiver to terminated source if this source values will always be filtered-out
          // ToDo: use terminated_source query tree instead of adding output listener
          
          while ( listener = output_listeners[ ++i ] )
            if ( listener.output == terminated_source )
              break; // found listener for this terminated source
          
          // create listener if not found
          listener || output_listeners.push( listener = { output: terminated_source, listeners: [] } );
          
          // add receiver to terminated source listener
          listener.listeners.push( added_receiver );
          
          // also add receiver to list of added listeners by this fetch for later cleanup
          added_listeners || ( added_listeners = [] );
          
          added_listeners.push( added_receiver );
          
          /*
          de&&ug( get_name( that, 'add_output_listener' )
            + 'terminated_source:' + get_name( terminated_source )
            + ', output_listener.listeners:' + listener.listeners.length
            + ', added_listeners:' + added_listeners.length
          );
          */
          
          function added_receiver( operation, values ) {
            //de&&ug( get_name( that, 'added_listener' ) + 'emit operation:', operation + ', values:', values.length );
            
            // optionally transform values
            if ( that_transform ) {
              if ( operation > 1 ) return update( values, that_transform );
              
              // ToDo: allow assynchronous and stateful transforms
              values = that_transform( values );
            }
            
            values.length && receiver( values, no_more, operation )
          } // added_receiver()
        } // add_output_listener()
      } // rx()
      
      function remove_output_listeners() { // input
        var i              = -1
          , j
          , listener
          , listeners
          , added_listener
          , position
        ;
        
        if ( added_listeners ) // remove all listeners added by this fetch to output_listeners
          while ( listener = added_listeners.length && output_listeners[ ++i ] )
            for ( listeners = listener.listeners, j = -1; added_listener = added_listeners[ ++j ]; )
              if ( ( position = listeners.indexOf( added_listener ) ) >= 0 ) {
                //de&&ug( get_name( that, 'remove_output_listeners' ) + 'remove from:', get_name( listener.output ) + ', position:', position );
                
                listeners.length < 2
                  ?
                    // remove entire output listener
                    output_listeners.splice( i--, 1 )
                  :
                    // remove this added listener from output listener's listeners
                    listeners.splice( position, 1 )
                ;
                
                added_listeners.splice( j--, 1 )
              }
      } // remove_output_listeners()
    }, // Plug.._fetch()
    
    /* ------------------------------------------------------------------------
        @method Plug..fetch_all( receiver, query )
        
        @short Fetches the entire content of set
        
        @parameters
        - **receiver** (Function): optional, see @@method:Plug.._fetch() for
          definition.
          
          This function must be provided if source responds asynchronously
          to _fetch(). Otherwise an error will be thrown.
          
          !!! Warning:
          It is highly recommended to always provide the receiver function
          to future-proof programs. Not using a receiver should only be used
          for testing when source is known to be synchronous.
        
        - **query** (Array of Objects): optional, see @@method:Plug.._fetch()
          for definition.
        
        @returns
        - (undefined): the source did not respond synchronously to _fetch()
          therefore the result cannot be known at the time when fetch_all()
          returns.
        
        - (Array of Objects): the source responded synchronously to _fetch() and
          this are the values fetched.
        
        @throws
        (Error):
          - If the method is asynchronous, and no receiver function is provided.
          
          - If a chunk is received after the last chunk was received.
          
          - If received chunk is not an @@add @@operation.
        
        @description
        This method should only be used for debugging and testing purposes or
        when the full state is known to be "small" (i.e. can fit entirely in
        memory), the source fetched is always on the same thread, and the
        source always emits @@add\s on fetch.
        
        For large sets, use @@method:Plug.._fetch() instead that allows to
        retrieve the content in "reasonable" size chunks that require less
        memory.
        
        This fetch cannot be aborted but can be cancelled if it is on an
        @@class:Output which is most likely the case if called from
        @@method:Pipelet.._fetch_all().
        
        ToDo: accept removes and updates, try to do this in a DRY way with
        pipelet set() if possible, possibly allowing to return an anti-state
        if ```receiver.length > 1```
    */
    fetch_all: function( receiver, query ) {
      var that   = this
        , p      = that.pipelet
        , chunks = []
        , out
      ;
      
      de&&ug( get_name( that, 'fetch_all' ) + 'query:', query );
      
      that._fetch( rx_concat, query );
      
      out || receiver || error( 'is asynchronous and no receiver function was provided' );
      
      return out;
      
      function rx_concat( values, no_more, operation ) {
        operation && error( 'cannot handle non-add operations' );
        
        out && error( 'received extra chunck after no_more' );
        
        values && values.length && chunks.push( values );
        
        if ( no_more ) {
          out = concat.apply( [], chunks );
          
          receiver && receiver.call( p, out );
        }
      } // rx_concat()
      
      function error( message ) {
        that._error( 'fetch_all', message )
      } // error()
    } // Plug..fetch_all()
  } ); // Plug instance methods
  
  /* --------------------------------------------------------------------------
      @class Input( pipelet, name, transactions_options, input_transactions )
      
      @short An input plug.
      
      @is_a @@class:Plug
      
      @parameters
      - **pipelet** (Pipelet): input owner and destination
      
      - **name** (String): for Loggable, defaults to ```"in"```
      
      - **transactions_options** (Object): options for class Input_Transactions():
        - **untag** (String): optional input transactions tag to remove (not
          forwarded) at this input.
        
        - **tag** (String): **untag** alias, deprecated.
        
        - **concurrent** (Object): keys are tags, truly values means @@concurrent,
          if concurrent is null or undefined, all tagged transactions are
          considered concurrent. Therefore concurrents comes as a restriction
          which designate which tagged transactions are conccurent at this
          pipelet.
      
      - **input_transactions** (Input_Transactions): optional shared with other
        inputs, allows synchronization between inputs of concurrent tagged
        transactions.
  */
  function Input( p, name, options, input_transactions ) {
    var that = this;
    
    // ToDo: Input: get name from options
    
    options = extend( {}, options, { name: name = name || 'in' } );
    
    Plug.call( that, p, options );
    
    // Source query for upstream pipelet
    that[ query_s ] = null;
    
    // Additional source query to optimize upstream query changes while fetch completes
    that[ future_query_s ] = null;
    
    // Tells _do_not_fetch() to not fetch data when connected to an upstream pipelet
    // Set to true by _fetch() on first fetch, and by stateful pipelets
    that.no_fetch = true;
    
    // Incoming subscriber index in current operation, updated by Query_Tree methods
    that.source_subscriber_index = 0;
    
    // ToDo: Input_Transactions(): use options.name, remove name parameter
    that.transactions = input_transactions || new Input_Transactions( name, that, options );
    
    that.tag = options.untag || options.tag || null;
    
    // Number of upstream branches
    that.branches = 0;
    
    /*
      Ongoing fetches output listeners, Array of Objects which attributes
      are:
      - **output** (@@class:Output\)
      - **listeners** (Array of Functions)
    */
    that[ _output_listeners_s ] = [];
  } // Input()
  
  Plug.subclass( 'Input', Input, function( Super ) { return {
    /* ------------------------------------------------------------------------
        @method Input..set_tag( tag )
        
        @short Sets input transactions' tag.
        
        @parameters
        - **tag** (String): optional transaction tag from an upstream fork tag
          dispatching operations over a number of concurrent bramches.
        
        @description
        The value of tag will be removed from @@upstream transactions,
        meaning that @@downstream of this input, transactions holding
        this tag are no-longer concurrent and do not need to be
        forwarded to all branches.
        
        If tag is specified this method sets ```this.tag``` then calls
        method Input_Transactions..set_tag() for ```this.transactions```.
        
        This may be called by an upstream class Controllet() instance to
        apply controllet's input tag to all its destinations, the controllet,
        appearing as the synchronization point from a programmer's
        perspective.
        
        ### See Also
        - Method Input..add_branches()
        - Method Controllet.Input..set_tag()
        
        ### ToDo
        ToDo: set_tag() allow to set and unset multiple tags
    */
    set_tag: function( tag ) {
      tag && this.transactions.set_tag( this.tag = tag );
    }, // Input..set_tag()
    
    /* ------------------------------------------------------------------------
        @method Input..add_branches( count )
        
        @short Add or remove input transactions' source branches.
        
        @parameters
        - **count** (Integer): positive to add, negative to remove.
        
        @returns this
        
        @description
        Add parameter ```count```, which may be positive or negative,
        to ```this.branches``` then call
        method Input_Transactions..add_branches() on ```this.transactions```
        for the same count.
        
        This method is overload by @@method:Controllet.Input..add_branches()
        that routes ```add_branches()``` to all destinations of the
        controllet.
        
        Source branch count allows class Input_Transactions() to know
        when a tagged forked transaction has terminated, i.e. when all
        source branches have terminated that forked transaction.
        
        This method is called by method Input.._add_source_branches()
        and method Input.._remove_source_branches() so that
        ```this.branches``` will automatically equal the number of
        sources of this input.
        In most cases this is the desired behavior, but not always.
        To adjust the number of branches for a specific use case,
        call this method directly. See also **ToDo List** bellow.
        
        ### See Also
        - Method Output..branches_count()
        - Method Input.._add_source_branches()
        - Method Input.._remove_source_branches()
        - Method Input..set_tag()
        
        ### ToDo List
        To cover complex topologies involving tagged transactions,
        more research is needed to find actual use cases and avoid
        over-engeneering. Here are possible future solutions:
        - ToDo: allow to update tag-specific branches count
        - ToDo: allow to update source-specific branches count
        - ToDo: allow to set which sources are sources for each tag
    */
    add_branches: function( count ) {
      var that = this;
      
      that.branches += count;
      
      that.transactions.add_branches( count );
      
      // de&&ug( get_name( that, 'add_branches' ) + 'added ' + count + ' branches, total branches: ' + that.branches );
      
      return that;
    }, // Input..add_branches()
    
    /* ------------------------------------------------------------------------
        @method Input..listen( operation, values, options, source, only_output_listeners )
        
        @short Listens to output data events for pipelet and output listeners
        
        @parameters
        - **operation** (Number):
          0: add
          1: remove
          2: update
        
        - **values**:
          - (Array of Objects): for add and remove operations
          - (Array of Array): for update operations
        
        - **options** (Object): operation options, e.g. transaction object
        
        - **source** (@@class:Output\): optional source
        
        - **only_output_listeners** (Boolean): if truly, do not call
          pipelet event methods. This is used by pipelet optimize()
        
        @description
        If source is defined emit operation to all output listeners for
        this output, if any. Output listeners are used by
        @@method:Plug.._fetch() to listen to outputs which have terminated
        a fetch involving multiple outputs from a @@pipelet:union().
        
        Then emits operation to pipelet unless ```only_output_listeners```
        is truly.
    */
    listen: function( operation, values, options, source, only_output_listeners ) {
      var listeners
        , listener
        , i
      ;
      
      if ( source && values.length && ( listeners = this[ _output_listeners_s ] ).length )
        for ( i = -1; listener = listeners[ ++i ]; )
          if ( listener.output == source ) {
            listeners = listener.listeners.slice();
            
            for ( i = -1; listener = listeners[ ++i ]; )
              listener( operation, values ) // options are not emitted to these listeners because end of transactions are not garantied here
            ;
            
            break;
          }
      
      only_output_listeners
        || this.pipelet[ '_' + operations[ operation ] ]( values, options )
    }, // Input..listen()
    
    // ToDo: remove tests using clear()
    clear: function( options ) {
      this.pipelet._clear( options );
    }, // Input..clear()
    
    /* ------------------------------------------------------------------------
        @method Input..add_source( source, options, then )
        
        @short Subscribe this input to source
        
        @parameters
        - **source**: (Array of Objects, or @@class:Output\) to add as a
          source to this Input.
        
        - **options** (Object): optional, attributes:
          - **no_fetch** (Boolean): do not fetch data from source to add
            values to this pipelet.
          
          - **_t** (Object): a transaction object to fetch initial data
          
          - **transaction_branches** (Object): optional branches provided
          in response to *then* handler of @@method:Input..remove_source().
          Will be ignored if *_t* is not provided. If present, this option
          is deleted before calling *then()*.
        
        - **then** (Function): optional function called when subscription
          is fully updated, including possible asynchronous fetches.
        
        @description:
        Adds a source to this pipelet:
        
        ```markdown
          source ----> this destination input
        ```
        
        The content of the source is then fetched and added to this pipelet
        unless this pipelet is lazy, instance flag ```no_fetch``` is
        ```true``` or option ```no_fetch``` is provided.
        
        If there is an error, it is thrown if *then* is not provided,
        otherwise the error is provided as the first parameter to *then()*.
        
        Possible errors are:
        - "already has added source"
        - "expected instance of Output or Array"
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
      
      if ( ! ( source.is_namespace == true ) ) { // == true fails with function Pipelet..is_namespace(), as intended
        if ( that._source_position( source ) != -1 )
          return that._source_error( 'add_source', 'already has added source: ', source, then );
        ;
        
        if ( source._fetch )
          // This is a Plug
          
          return that
            ._add_source             ( source ) // may throw if source already added
            ._add_source_destination ( source )
            ._add_source_branches    ( source, options )
            ._add_source_subscription( source, options, then );
        
        if ( ! is_array( source ) )
          return that._source_error( 'add_source', null, source, then );
        
        // Should be an Array of Objects
        that
          ._add_source         ( source )
          ._update_source_array( source, options, 0 )
      } // ! source.is_namespace
      
      then && then();
      
      return that
    }, // Input..add_source()
    
    /* ------------------------------------------------------------------------
        @method Input..remove_source( source, options, then )
        
        @short Unsubscribe and disconnects this input from source
        
        @parameters
        - **source** (Array of Objects, or @@class:Output\): source to remove
        
        - **options** (Object):
          - **no_fetch** (Boolean): if true, do not fetch source to remove
            values from destination.
        
        - **then** (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
          Its signature is: ```then( error, response )``` where:
          - **error** (Error): if defined, something went wrong, see
            description.
          
          - **response** (Object): defined if *options* specifies a
            transaction *Object* with a truly *more* attribute. In which
            case *then* is responsible for terminating the transaction
            ongoing during removal on another pipelet. See example bellow
            for using *then* with a transaction. Attributes:
            - **transaction_branches** (Array of Objects): extracted
              transactions branches. For more information on *response*, see
              @@method:Input.._remove_source_branches() which returns it.
        
        @examples
        - Removing source from destination then adding back a new source
          within a transaction:
        
          ```javascript
          var RS      = rs.RS
            , tid     = RS.uuid.v4() // a unique transaction identifier
            , options = { _t: { id: tid, more: true } }
          ;
          
          destination.remove_source( source, options, then );
          
          function then( error, response ) {
            var options = { _t: { id: tid }, transaction_branches: response.transaction_branches );
            
            rs
              .set() // a new source for destination
              
              .through( destination, options )
            ;
          } // then()
          
          ```
        
        @description
        This method does the opposite of @@method:add_source() which connects
        an upstream source.
        
        It cuts the connection between upstream source and this destination:
        
        ```markdown
          source --x--> this destination input
        ```
        
        The content of source is then fetched and removed from this pipelet
        unless this pipelet is @@lazy or option ```"no_fetch"``` is
        ```true```.
        
        It is @@synchronous if option ```"no_fetch"``` is true, and can be
        @@assynchronous otherwise.
        
        Before removing source, emits event ```"remove_source"``` which
        allows to disconnect dependent pipelets connections and is provided
        with source and options.
        
        This method is responsible for cleaning-up all resources associated
        with the connection to source:
        - move one or many transactions for continuing pipeline(s)
        - cancel possibly ongoing @@method:Input..add_source()
        - cancel other ongoing fetches
        - cancel ongoing transactions
        
        If there is an error, and *then()* is not defined, it is thrown,
        otherwise *then()* is called with the *Error* as first parameter.
        
        Possible errors are:
        - "does not have removed source"
        - "expected instance of Output or Array"
        
        ### See Also
        - Method Pipelet..remove_source_with()
        - Method Pipelet..remove_destination_with()
        - Pipelet dispatch()
    */
    remove_source: function( source, options, then ) {
      var that = this;
      
      // Allow removal of dependent connections and other application resources cleanup
      that.emit( remove_source_s, source, options );
      
      if ( ! ( source.is_namespace == true ) ) { // == true fails with function Pipelet..is_namespace(), as intended
        if ( that._source_position( source ) == -1 )
          return that._source_error( remove_source_s, 'does not have removed source: ', source, then )
        ;
        
        if ( source._fetch )
          // We have a Plug object
          
          /*
            Cancelling fetches:
            - reverts emmitted values by ongoing fetches before cancellation
            - calling each fetch abort function allows to revert possible
              query changesm which should cancel the effect of a possible
              ongoing add_source()/_add_source_subscription().
            
            ToDo: add tests for remove_source() while ongoing add_source()
            is in progress.
          */
          source._cancel_fetches( that ); // reverts operations already emitted by ongoing fetches
          
          return that
            // Remove the source before updating the subscription, this avoids that source subscription removes trigger double removes of query terms
            // ToDo: add tests where a filter requests a dataflow based on another dataflow, both from the same source
            ._remove_source             ( source ) // may throw if source not that source
            ._remove_source_subscription( source, options, function() {
              de&&ug( get_name( that, remove_source_s ) + 'removed source subscription, options:', options );
              
              // Will close ongoing concurrent transactions, ToDo: merge with _transactions_remove_source() bellow
              // Note: _t is conditionned to providing then() to allow a response containing output transactions
              var response = that._remove_source_branches( source, then && options && options._t )
                , error
              ;
              
              // final cleanup
              that
                ._remove_source_destination ( source )
                ._transactions_remove_source( source )
              ;
              
              then && then( error, response );
            } );
        
        if ( ! is_array( source ) )
          return that._source_error( remove_source_s, null, source, then );
        
        // Array of Objects
        that
          ._update_source_array( source, options, 1 )
          ._remove_source      ( source )
      } // ! source.is_namespace
      
      then && then();
      
      return that
    }, // Input..remove_source()
    
    /* ------------------------------------------------------------------------
        @method Input.._source_position( source )
        
        @short Returns position of source in Input sources
        
        @returns
        - -1: source not found in this Input sources
        - positive Integer: position of source in this Input sources
    */
    _source_position: function( source ) {
      return this.source === source ? 0 : -1;
    }, // Input.._source_position()
    
    /* ------------------------------------------------------------------------
        @method Input.._source_error( function_name, message, source, then )
        
        @short Formats and emit error message for source
        
        @parameters
        - **function_name** (String): method or function name where the
          error occured
        - **message** (String): error message
        - **source** (@@class:Output\): for wich the error occured
        - **then** (Function): callback after emiiting the error will be
          called with the built error messsage.
        
        @throws
        - (Error): if ```then``` is falsy, the error is thrown instead
          of sent to ```then```.
        
        @description
        This is a private helper method for method Input..add_source() and
        method Input..remove_source().
        
        The error is emitted using method Plug.._error().
    */
    _source_error: function( function_name, message, source, then ) {
      // ToDo: add_source() and remove_source(), add test for bad source type
      this._error( function_name,
        ( message || 'expected instance of Output or Array, got a ' ) + get_name( source ),
        then
      );
    }, // Input.._source_error()
    
    /* ------------------------------------------------------------------------
        @method Input.._add_source_destination( output )
        
        @short Adds this input as a @@destination of output
        
        @parameters
        - **output** (@@class:Output\): source output to add this destination
          input.
        
        @returns this
        
        @description
        This is a low-level method called by @@method:Input..add_source() that
        should not be called directly but may be overloaded.
        
        Calls method Output.._add_destination()
        
        ### See Also:
        - Method Input..add_source()
        - Method Input.._remove_source_destination()
    */
    _add_source_destination: function( output ) {
      output._add_destination( this );
      
      return this;
    }, // Input.._add_source_destination()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_destination( output )
        
        @short Removes this input as a @@destination of output
        
        @parameters
        - **output** (@@class:Output\): source output to remove this input.
        
        @returns this
        
        @description
        This is a low-level method called by @@method:Input..remove_source()
        that should not be called directly but can be overloaded.
        
        Calls method Output.._remove_destination()
        
        ### See Also
        - Method Input..remove_source()
        - Method Input.._add_source_destination()
    */
    _remove_source_destination: function( output ) {
      output._remove_destination( this );
      
      return this;
    }, // Input.._remove_source_destination()
    
    /* ------------------------------------------------------------------------
        @method Input.._add_source_branches( source, options )
        
        @short Adds as many branches as source reports
        
        @parameters
        - **source** (@@class:Output\): added.
        
        - **options** (Object):
          - **_t** (Object): optional @@transaction object
          
          - **transaction_branches** (Object): optional branches provided
          in response to *then* handler of @@method:Input..remove_source().
          Will be ignored if *_t* is not provided.
        
        @returns this
        
        @description
        This method is called by @@method:Input..add_source() to add
        transactions branches from *source* and optionally add-back
        other transaction branches as a continuation of a transaction
        started with @@method:Input..remove_source().
        
        See also @@method:Input.._remove_source_branches() that extracts
        transaction branches if done within an ongoing transaction.
    */
    _add_source_branches: function( output, options ) {
      var input             = this
        , _t                = options && options._t
        , branches          = _t && options.transaction_branches
        , branches_count    = output.branches_count()
        , injected_branches
      ;
      
      if ( _t && branches ) {
        delete options.transaction_branches;
        
        input._inject_branches( output, _t.id, branches, injected_branches = [] );
        
        branches_count -= injected_branches.length
      }
      
      branches_count && input.add_branches( branches_count );
      
      return input
    }, // Input.._add_source_branches()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_branches( source, _t )
        
        @short Removes *source* branches, extracts branches from *_t*
        
        @parameters
        - **source** (@@class:Output\) removed.
        
        - **_t** (Object): optional @@transaction object of ongoing
        transaction that should not be canceled but which branches should
        be extracted using @@method:Input.._extract_branches().
        
        @returns (Object): optional response for @@method:Input..remove_source()
        
        @returns
        - (undefined): *_t* is undefined or ```t.more``` is falsy.
        
        - (Object): response for @@method:Input..remove_source(), with
        attribute:
          - **transaction_branches** (Array of Objects):
          gathered by @@method:Input.._extract_branches().
        
        @description
        This method is called by @@method:Input..remove_source() after
        updating source subscription. It is responsible for removing
        branches from source and terminating associated concurrent
        transactions if any, except a possible ongoing transaction
        referenced by *_t* related to the *remove_source()* itself.
        
        If *_t* has more, there is at least one ongoing transaction,
        removing this source, that should not be canceled as it will
        terminate later.
        
        This means that a transaction can start on one source to
        terminate on another,
        
        The response handler of *remove_source()* is then responsible
        for adding back as many branches as were extracted to terminate
        the transaction.
        
        This method should not be overloaded by
        @@class:Controllet..Input\, it uses methods
        @@method:Input.._extract_branches() and
        @@method:Input..add_branches() which are overloaded by
        *Controllet..Input*.
    */
    _remove_source_branches: function( source, _t ) {
      var that           = this
        , branches_count = -source.branches_count() // to add or remove
        , branches // extracted using _extract_branches()
        , response // response for remove_source() then handler
      ;
      
      if ( _t && _t.more ) {
        // this transaction survives remove_source()
        that._extract_branches( source, _t.id, branches = [] );
        
        branches_count += branches.length; // in most cases should be zero, see bellow
        
        response = { transaction_branches: branches }
      }
      
      // de&&ug( get_name( that, '_remove_source_branches' ) + 'response:', pretty( response ) );
      
      // !!! Do not merge _extract_branches() and add_branches() because
      // Controllet.Input..add_branches() needs to calculate a local
      // cache of total branches counts. Merging would require to
      // duplicate this cache code, which would still be more efficient
      // than 2 routings by Controllet.Input.
      // That said, in most use cases, there should be either no
      // ongoing transaction or one with the same number of branches than
      // source.branches_count(), i.e. l == 0, so either _extract_branches()
      // or add_branches() would be called but not both.
      branches_count && that.add_branches( branches_count );
      
      return response;
    }, // Input.._remove_source_branches()
    
    // ToDo: document inject_branches()
    _inject_branches: function( source, tid, branches, injected_branches ) {
      source._inject_branches( this, tid, branches, injected_branches )
    }, // Input.._inject_branches()
    
    /* ------------------------------------------------------------------------
        @method Input.._extract_branches( source, tid, branches )
        
        @short Extract branches of @@class:Output_Transactions for *tid* at
        *source*
        
        @parameters
        - **source** (@@class:Output\): source associated with transaction.
        
        - **tid** (String) : @@transaction identifier.
        
        - **branches** (Array of Objects): extracted output transaction
        branches by @@method:Output.._extract_branches().
        
        @return this
        
        @description
        This method is called by @@method:Input.._remove_source_branches()
        to extract ongoing transaction branches when removing a source and
        preventing premature cancellation of the transaction with *source*
        identified by *tid*.
        
        It is overloaded by method Controllet.Input.._extract_branches()
        that routes it to its destinations.
        
        It calls method Output.._extract_branches() that can be
        routed by Union to its inputs.
    */
    _extract_branches: function( source, tid, branches ) {
      source._extract_branches( this, tid, branches );
    }, // Input.._extract_branches()
    
    /* ------------------------------------------------------------------------
        @method Input.._add_source( source )
        
        @short Sets the source output for this input plug
        
        @parameters
        - **source** (@@class:Output or Array of Objects): the source output
          to add or undefined to remove the source.
        
        @returns this
        
        @description
        This is a low-level method that should not be used by external objects
        because it does not add a destination to the source pipelet.
        
        ### See Also
        - Method Input.._remove_source()
        - Method Input..add_source()
    */
    _add_source: function( source ) {
      var that = this
        , s    = that.source
      ;
      
      s && that
        ._source_error( '_add_source'
          , 'already has a source: ' + get_name( s ) + ', cannot add:', source
        )
      ;
      
      that.source = source;
      
      return that;
    }, // Input.._add_source()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source( source )
        
        @short Removes an upstream source output from this input
        
        @parameters
        - **source** (@@class:Output or Array of Objects): to remove from
          this input
        
        @returns this
        
        @throws
        - (Error):  source is not a source of this input
        
        @description
        This is a low-level method that should not be called directly.
        
        ### See Also
        - Method Input..remove_source()
        - Method Input.._add_source()
    */
    _remove_source: function( source ) {
      var that = this
        , s    = that.source
      ;
      
      s !== source
        && that._source_error( '_remove_source', 'expected ' + get_name( s ) + ' instead of ', source )
      ;
      
      that.source = null;
      
      return that;
    }, // Input.._remove_source()
    
    /* ------------------------------------------------------------------------
        @method Input.._update_source_array( source, options, operation )
        
        @short Add or remove data from source Array
        
        @parameters:
        - **source** (Array): added or removed directly to this pipelet
        
        - **options** (Object): optional:
          - **no_fetch** (Boolean): don't do anything, return immediately
          
          - **_t** (Object): a @@transaction Object
        
        - **operation** (Number):
          - 0: add
          - 1: remove
        
        @returns this
        
        @description
        This is a low level method called by @@method:Input..add_source()
        and @@method:Input..remove_source() when the source is an Array
        of @@[values]value\.
    */
    _update_source_array: function( source, options, operation ) {
      var that = this;
      
      options = that._fetch_option( options );
      
      if ( ! ( options && options.no_fetch ) ) { // Don't add or remove anything
        de&&ug( get_name( that, '_update_source_array' ) + 'source:', typeof source );
        
        var q = that[ future_query_s ];
        
        that.listen( operation, ( q ? q.filter( source ) : source ), options_forward( options ) );
      }
      
      return that;
    }, // Input.._update_source_array()
    
    /* ------------------------------------------------------------------------
        @method Input.._add_source_subscription( source, options, then )
        
        @short Add source query and fetch
        
        @parameters
        - **source** (@@class:Output\): to subscribe to
        
        - **options** (Object):
          - **_t** (Object): @@transaction object
          
          - **no_fetch** (Boolean): do not fetch if true.
        
        - **then** (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
        
        @returns this
    */
    _add_source_subscription: function( source, options, then ) {
      var that  = this
        , q     = that[ future_query_s ]
      ;
      
      that._update_subscription( [ [], q && q.query ], that._fetch_option( options ), source, then );
      
      return that
    }, // Input.._add_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_subscription( source, options, then )
        
        @short Fetch then remove source query
        
        @parameters
        - **source** (@@class:Output\): subscribed to
        
        - **options** (Object):
          - **_t** (Object): @@transaction object
          
          - **no_fetch** (Boolean): do not fetch if true.
        
        - **then** (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
        
        @returns this
    */
    _remove_source_subscription: function( source, options, then ) {
      var that  = this
        , q     = that[ future_query_s ]
      ;
      
      // log( get_name( that, '_remove_source_subscription' ), q && q.query );
      
      that._update_subscription( [ q && q.query, [] ], that._fetch_option( options ), source, then );
      
      return that;
    }, // Input.._remove_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Input.._fetch_option( options )
        
        @short Provide option no_fetch if pipelet is lazy or not yet fetching
        
        @parameters
        - **options** (Object): optional:
          - **no_fetch** (Boolean): do not fetch if true
          - **_t** (Object): a @@transaction object
        
        @returns
        - (Object) new options with no_fetch set to true or original options
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
        
        @short Manages data subcription changes in a transaction
        
        @parameters
        - **changes** (Array):
          - 0: (Array): removed subscription query terms.
          
          - 1: (Array): added subscription query terms.
        
        - **options** (Object):
          - **no_fetch** (Boolean): do not fetch source.
          
          - **_t** (Object): upstream @@transaction requesting subscription
            changes. It may include fork tags in which case at least one
            add is emitted to guaranty fork tags forwarding downstream.
        
        - **source** (@@class:Output\): optional source, default is
          ```this.source```
        
        - **then** (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
        
        @description
        Fetches source, updates data, and update upstream query.
    */
    _update_subscription: function( changes, options, source, then ) {
      var input       = this
        , removes
        , adds
        , rl
        , al
        , count
        , operations
        , _then
        , transaction
        , _t
      ;
      
      if ( source || ( source = input.source ) ) {
        de&&ug( get_name( input, '_update_subscription' ), 'changes:', changes, ', source:', get_name( source ) );
        
        removes = changes[ 0 ];
        adds    = changes[ 1 ];
        
        rl = removes && removes.length ? 1 : 0;
        al = adds    && adds   .length ? 1 : 0;
        
        count = al + rl;
        
        if ( then ) {
          operations = count + 1;
          
          _then = function() { --operations || then() };
        }
        
        if ( count ) {
          if ( options && options.no_fetch ) {
            // Only update upstream query
            source.update_upstream_query( changes, input );
          
          } else {
            transaction = {};
            
            // ToDo: we need a fetch that allows to atomically query removes and adds
            rl && source._transactional_fetch( input, transaction, count, removes, [ removes, [] ], options, true , _then );
            
            al && source._transactional_fetch( input, transaction, 1    , adds   , [ [],    adds ], options, false, _then );
          }
        } else if ( options && ( _t = options._t ) && _t.forks && ! _t.more ) {
          // Need to forward this end of transaction
          // ToDo: Input.._update_subscription(), add tests for forwarding forked end of transactions
          // ToDo: do not emit end-of-transaction event to destination if there was nothing emitted to this destination before
          input.listen( 0, [],
            // Get concurrent options to guaranty end of concurrent transactions if input transactions is shared
            source._concurrent_options( input, options )
          );
        }
        
        de&&ug( get_name( input, '_update_subscription' ) + 'updated query, count:', count )
        
        _then && _then();
      } else {
        then && then();
      }
    }, // Input.._update_subscription()
    
    /* ------------------------------------------------------------------------
        @method Input.._transactions_remove_source( output )
        
        @short Removes a source output from all source transactions, if any
        
        @parameters
        - **output** (@@class:Output\): the source output being removed.
        
        @returns this
        
        @description
        This method is called by method Input..remove_source() to cleanup
        unterminated transactions from a source.
        
        !!! Warning:
        Unterminated transactions from a source should not happen when the
        source is disconnected, unless the termination is forced immediate or
        due to a network problem.
        
        The current behavior is to terminate the transaction with a logged
        warning message. Later-on unterminated transactions may have to be
        rolled-back, especially at network boundaries when non-recoverable
        disconnections occur, e.g. in socket_io_crossover ongoing
        transactions may be memorized to allow rolling them back at least
        on subscription updates.
        
        This method is overloaded by
        @@method:Controllet.Input.._transactions_remove_source().
        
        ToDo: add tests for _transactions_remove_source()
    */
    _transactions_remove_source: function( output ) {
      var that = this;
      
      that.transactions
        .remove_source( that, output.output_transactions )
        
        .forEach( function( _t ) {
          // Terminate transaction at this input
          
          // ToDo: add warning condition, removing pipelet connection in the middle of a transaction.
          RS_log( 'Warning:', get_name( that, '_transactions_remove_source' )
            + 'removing pipelet connection in the middle of transaction, _t:', _t
            , ', Output:', get_name( output )
          );
          
          // ToDo: Transactions allow handling of canceled flag in downstream pipelets
          
          // ToDo: Input..Transactions..remove_source(): provide the source in addition to _t
          
          // ToDo: allow Union routing this of output operation
          that.listen( 0, [], { _t: extend_2( { canceled: true }, _t ) } );
        } )
      ;
      
      return that;
    }, // Input.._transactions_remove_source()
    
    /* ------------------------------------------------------------------------
        @method Input..insert_source_union( name )
        
        @short Inserts a @@pipelet:union() as a source of this, switching
        a previous source of this if any
        
        @parameters
        - **name** (String): optional pipelet name for the inserted union. The
          default name is composed from the name of this pipelet.
          
        @returns
        - (@@class:Pipelet\)  The inserted union.
    */
    insert_source_union: function( name ) {
      var that     = this
        , rs       = that.pipelet.namespace()
        , no_fetch = { no_fetch: true } // Will just switch the connexion between source and union
        , source   = that.source
      ;
      
      de&&ug( get_name( that, 'insert_source_union' ) + 'source:', get_name( source ) );
      
      if ( source ) {
        that.remove_source( source, no_fetch );
      } else {
        source = rs;
      }
      
      return rs
        .union( [], { name: name || ( get_name( that ) + ' (union)' ) } )
        
        ._add_source( source, no_fetch )
        
        ._add_destination( that )
      ;
    }, // Input..insert_source_union()
    
    /* ------------------------------------------------------------------------
        @method Input..is_lazy()
        
        @short True if input is not querying anything from upstream
        
        @returns
        - (Boolean):
          - ```true``` if this input is @@lazy
          - ```false``` if this input is not lazy
        
        @description
        An input is considered lazy if it has no @@query of its query is empty.
        
        This method is overloaded by method Controllet.Input..is_lazy() which
        calls ```is_lazy()`` on all destinations to determine if a controllet
        input is lazy or not.
    */
    is_lazy: function() {
      var q = this[ future_query_s ];
      
      return ! ( q && q.query.length );
    }, // Input..is_lazy()
    
    /* ------------------------------------------------------------------------
        @method Input.._fetch( receiver, query, query_changes, destination )
        
        @short Fetches upstream source
        
        @parameters
        - **receiver** (Function): see method Plug.._fetch() for details.
        
        - **query** (Array of Objects): optional query terms.
        
        - **query_changes** (Array of Objects) to optionally update local
          query.
        
        - **destination** (@@class:Plug\): to route @@[operations]operation
        
        @description
        Optimizes query_changes, if any, calling
        method Input.._upstream_query_changes().
        
        Then calls method Plug.._fetch() to fetch source, which will
        update the local query when fetch completes.
    */
    _fetch: function( receiver, query, query_changes, destination ) {
      var _query_changes
        , abort
        , ___
      ;
      
      if ( query_changes ) {
        // Find-out query_changes differences on future query
        
        // ToDo: apply _query_transform if defined on query_changes
        _query_changes = this._upstream_query_changes( query_changes );
        
        if ( ! changes_count( _query_changes ) )
          // There are no changes to forward upstream
          
          _query_changes = ___
        ;
      }
      
      abort = Super._fetch.call( this, receiver, query, _query_changes, destination );
      
      return fetch_abort
      
      function fetch_abort() {
        query_changes &&
          this._upstream_query_changes( swap_query_changes( query_changes ) );
        
        abort && abort()
      } // fetch_abort()
    }, // Input.._fetch()
    
    /* ------------------------------------------------------------------------
        @method Input.._upstream_query_changes( changes )
        
        @short Optimizes query for upstream pipelets
        
        @parameters:
        - **changes** (Array):
          - **0** (Array): @@query terms to remove
          - **1** (Array): @@query terms to add
        
        @returns
        - (Array): optimized changes:
          - **0** (Array): query terms removed
          - **1** (Array): query terms added
        
        @throws
        - (Error): removed term has no matching prior added term
        
        @description
        Apply changes to input query, returns minimum set of changes.
    */
    _upstream_query_changes: function( changes ) {
      var that    = this
        , removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , rl      = removes.length
        , al      = adds.length
        , q
      ;
      
      if ( rl + al ) {
        q = that[ future_query_s ] || ( that[ future_query_s ] = new Query( [], get_name( that ) + '-input_' + future_query_s ) );
        
        //de&&ug( get_name( that, '_upstream_query_changes' ) + ', changes:', changes, ', query:', q.query, ', optimized:', q.optimized );
        
        rl && q.remove( removes ); // throws if term has no matching prior added term
        al && q.add   ( adds    );
        
        changes = q.discard_operations();
      }
      
      return changes;
    } // Input.._upstream_query_changes()
  } } ); // Input instance methods
  
  /* --------------------------------------------------------------------------
      @class Output( pipelet, options )
      
      @short Base output @@class:Plug
      
      @is_a @@class:Plug
      
      @parameters
      - **pipelet** (@@class:Pipelet\): output container
      
      - **options** (Object):
        - **name**: for Loggable, default is ```"out"```
        
        - **fork_tag** (String): optional @@tag to add to output transactions
        
      @instance_attributes
      - **destinations** (Array of @@class:Input\): inputs connected to
        this output.
      
      - **output_transactions** (@@class:Output_Transactions\): ongoing
        output transactions with destinations
      
      - **tree** (@@class:Query_Tree\): output query tree
      
      - **query_updates** (Array): list of query updates (Object) to
        apply in order:
          - **done**:
            - falsy: waiting for this fetch to complete.
            
            - truly: complete, either waiting for a previous fetch to
              complete or applied and no-longer in query_updates queue:
              - (Function): function to call after applying changes
                after all previous fetches complete.
              
              - 2: done and applied, removed from queue.
              
              - other: waiting for a previous fetch to complete.
          
          - **changes** (Array): removes and adds to apply to query tree
          
          - **destination** (@@class:Input\): downstrean input which
            requested changes.
          
          - **cancel** (Function): optional, to call to cancel fetch
            associated to this query update.
          
          Operation:
          Query updates are immediately marked as done.
          
          When a fetch completes, it's query update is marked as done.
          
          After each completion, the list of done query updates at
          the start is removed and applied. Processing stops as soon
          as a not done query update is found.
  */
  function Output( pipelet, options ) {
    var that = this
      , name = options && options.name || 'out'
    ;
    
    options = extend( {}, options, { name: name } );
    
    Plug.call( that, pipelet, options );
    
    // Destinations, downstream inputs
    that.destinations = [];
    
    // Output transactions
    that.output_transactions = new Output_Transactions( name );
    
    // Output Query Tree router
    that.tree = new Query_Tree( name );
    
    // Set to true during emissions, see Plug..emit_waiters
    that.emitting = 0;
    
    that.query_updates = [];
  } // Output()
  
  Plug.subclass( 'Output', Output, {
    /* ------------------------------------------------------------------------
        @method Output..branches_count()
        
        @short Reports the number of branches this output provides.
        
        @returns
        (Integer): the number of source branches this output provides.
        
        @description
        By default a pipelet has one branch, for its own output.
        
        @@method:Controllet.Output..branches_count() overloads this method.
    */
    branches_count: function() {
      return 1;
    }, // Output.._branches_count()
    
    /* ------------------------------------------------------------------------
        @method Output..add_destination( destination, options, then )
        
        @short Add destination subscriber.
        
        @parameters
        - **destination**: (@@class:Input\) the destination input
        
        - **options** (Object): optional, attributes:
          - **no_fetch** (Boolean): do not fetch the source to remove.
          
          - **_t** (Object): transaction object.
          
          - **transaction_branches** (Array of Objects): to inject
            output transaction branches extracted from a previous
            call to @@method:Output..remove_destination() or
            @@method:Input..remove_source()
        
        - **then** (Function): optional, called when subscription is complete
        
        @returns this
        
        @description
        Adds a destination input to this source output:
          ```markdown
            this output ---> destination input
          ```
        
        The content of the this output is then fetched and added to
        destination input unless destination is lazy or has instance
        flag no_fetch set to *true* or option no_fetch is provided.
        
        Calls @@method:Input..add_source() to perform the connection.
        
        See also @@method:Output..remove_destination().
    */
    add_destination: function( destination, options, then ) {
      // de&&ug( get_name( this, 'add_destination' ) + 'destination: ' + get_name( destination ) );
      
      destination.add_source( this, options, then );
      
      return this;
    }, // Output..add_destination()
    
    /* ------------------------------------------------------------------------
        @@method Output..remove_destination( destination, options, then )
        
        @short Removes a destination input from this output
        
        @parameters
        - **destination**: (@@class:Input\) destination input to disconnect
        
        - **options** (Optional Object):
          - **no_fetch** (Boolean): do not fetch the source on remove
          
          - **_t** (Object): optional transaction object
        
        - **then** (Function): optional, called after updating of subscription
        
        @returns this
        
        @description
        ```markdown
          this output --x--> destination input
        ```
        
        The content of this output is then fetched and removed from destination
        input unless destination is lazy or option no_fetch is provided.
        
        Calls @@method:Input..remove_source() to perform the disconnection.
        
        See also @@method:Output..add_destination().
    */
    remove_destination: function( destination, options, then ) {
      destination.remove_source( this, options, then );
      
      return this;
    }, // Output..remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Output.._add_destination( input )
        
        @short Adds destination *input* to this output destinations
        
        @parameters
        - **input** (@@class:Input\): destination input to add
          
        @throws
        (Error):
          - input is already added to this output's destinations
        
        @description
        This is a low-level method called by
        @@method:Input.._add_source_destination()
        
        It is overloaded by @@method:Controllet.Output.._add_destination().
    */
    _add_destination: function( input ) {
      var destinations = this.destinations
        , position = destinations.indexOf( input )
      ;
      
      position != -1 && this._error( '_add_destination', 'already added, input: ' + get_name( input ) );
      
      destinations.push( input );
      
      return this;
    }, // Output.._add_destination()
    
    /* ------------------------------------------------------------------------
        @method Output.._remove_destination( input )
        
        @short Removes destination *input* from this output plug
        
        @parameters
        - **input** (@@class:Input\): destination input to remove from this
          output destinations
        
        @emits
        - Event ```"disconnected"``` when last input is removed. Listened by
          pipelet query_updates().
        
        @throws
        - (Error): ```"not found"``` when input is not a known
          destination of this output.
        
        @description
        This is a low level method called
        by @@method:Input.._remove_source_destination().
    */
    _remove_destination: function( input ) {
      var that         = this
        , destinations = that.destinations
        , position     = destinations.indexOf( input )
      ;
      
      position == -1 && that._error( '_remove_destination', 'not found, destination: ' + get_name( input ) );
      
      destinations.splice( position, 1 );
      
      // log( get_name( that, '_remove_destination' ) + 'input:', get_name( input ), destinations.length );
      
      // do not use emit(), it is overloaded to emit to pipelet subscribers
      destinations.length || that.emit_apply( 'disconnected', [] );
      
      return that;
    }, // Output.._remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Output.._extract_branches( input, tid, branches )
        
        @short Extract transaction referenced by tid at input
        
        @parameters
        - **input** (@@class:Input\): to extract transaction from.
        
        - **tid** (String): uniquely identifies the @@transaction\.
        
        - **branches** (Array of Object): to push extracted output
        transaction branches to, if any, with the following attributes:
          - **tid** (String): *tid*.
          
          - **destination** (@@class:Input\): *input*.
          
          - **output_transactions** (@@class:Output_Transactions\):
          created to by this method to move transactions to.
        
        @description
        Called by @@method:Input.._extract_branches() when disconnecting a
        pipelet in a transaction to allow to later reconnect transaction
        branches to another source pipelet.
        
        It is routed by @@class:Controllet.Output and @@class:Union.Output
        to all sources.
        
        Calling @@method:Output_Transactions..move_to() to extract one
        transaction referenced by *tid* from ```this.output_transactions```
        and *input*.
        
        If an @@class:Output_Transaction matching *tid* between this
        output and *input* is found, a new transactions branch *Object*
        is pushed to *branches* with attributes specified above.
        
        See Also @@method:Output.._inject_branches() that terminates
        extracted transactions at another source pipelet.
    */
    _extract_branches: function( input, tid, branches ) {
      var to = new Output_Transactions( 'extracted-' + get_name( this ) );
      
      this.output_transactions.move_to( to, input, tid )
      
        && branches.push( { tid: tid, destination: input, output_transactions: to } )
    }, // Output.._extract_branches()
    
    /* ------------------------------------------------------------------------
        @method Output.._inject_branches( input, tid, branches, injected_branches )
        
        @short Inject transaction branches referenced by *tid* at *input*
        
        @parameters
        - **input** (@@class:Input\): to inject transaction to.
        
        - **tid** (String): uniquely identifies the @@transaction\.
        
        - **branches** (Array of Objects): extracted output transaction branches
        by @@method:Output.._extract_branches(). Objects attributes:
          - **tid** (String): extracted transaction identifier.
          
          - **destination** (@@class:Input\): *input* for which the
          transaction branch was extracted.
          
          - **output_transactions** (@@class:Output_Transactions\):
          containing the extracted transaction.
        
        - **injected_branches** (Array of Objects): list of branches
        spliced out of *branches* and which transaction was terminated.
        
        @description
        Called by @@method:Input.._inject_branches() when recoonnecting a
        pipelet after a disconnection from another pipelet in a transaction.
        
        It is routed by @@class:Controllet.Output and @@class:Union.Output
        to all sources.
        
        Calling @@method:Output_Transactions..move_to() to inject
        transactions referenced by *tid* and *input* into
        ```this.output_transactions```.
        
        If an @@class:Output_Transaction matching *tid* between this
        output and *input* is found in *branches*, it is spliced out of
        *branches* and pushed into *injected_branches*.
    */
    _inject_branches: function( input, tid, branches, injected_branches ) {
      var to      = this.output_transactions
        , i       = -1
        , branch
      ;
      
      while( branch = branches[ ++i ] )
        if ( tid == branch.tid && input === branch.destination ) {
          branch.output_transactions.move_to( to, input, tid );
          
          injected_branches.push( branch );
          
          branches.splice( i--, 1 )
        }
    }, // Output.._inject_branches()
    
    /* ------------------------------------------------------------------------
        @method Output.._cancel_fetches( destination )
        
        @short Cancel ongoing fetches to destination when disconnecting
        
        @parameters
        - **destination** (@@class:Input\): which ongoing fetches with this
          output will be cancelled.
        
        @description
        This method is called by @@method:Input..remove_source(). It is
        routed by @@class:Controllet.Output and @@class:Union.Output to
        all sources.
        
        ### Implementation
        It looks up all non-applied query updates for ```destination```,
        calling their ```cancel()``` method.
        
        After all query updates to destination have been cancelled, and
        if any was canceled, it then calls
        @@method:Output.._apply_done_query_updates() to apply all done
        query updates resulting from cancellation.
    */
    _cancel_fetches: function( destination ) {
      var that          = this
        , query_updates = that.query_updates
        , i             = -1
        , query_update
        , canceled
      ;
      
      while ( query_update = query_updates[ ++i ] )
        if ( query_update.destination == destination ) {
          canceled || ( canceled = query_update );
          
          query_update.done || query_update.cancel();
        }
      
      canceled && that._apply_done_query_updates( canceled );
    }, // Output.._cancel_fetches()
    
    /* ------------------------------------------------------------------------
        @method Output.._transactional_fetch( destination, transaction, count, query, query_changes, options, revert, next )
        
        @short Group one or more fetch in a transaction to emit operations
        
        @parameters
        - **destination** (@@class:Input\): towards which adds (and eventually
          other operations) are emitted
        
        - **transaction** (Object): carries transaction information between
          calls of *_transactional_fetch()* in the same transaction.
        
        - **count** (Integer): the number of fetch operations, including this
          one, that are to be executed in a transaction.
        
        - **query** (Optional Array of AND-expressions): limiting returned
          operations.
        
        - **query_changes** (Array): optional, to synchronize fetch with
          query updates:
          - 0 (Array): removed subscription query terms
          - 1 (Array): added subscription query terms
        
        - **options** (Object): optional:
          - **_t** (Object): a transaction object:
            - **id** (String): unique transaction identifier of a
              transaction this fetch is part of.
            
            - **more** (Boolean): optional, true if this fetch is part of an
              ongoing transaction.
            
            - other optional transaction attributes
        
        - **revert** (Boolean):
          - true: revert received operations, adds becomes removes, removes becomes
            add, and updates are swaped
          - false: to not revert operations
        
        - **next** (Function): optional, called after fetch completes.
        
        @description
        Fetch data for *destination* pipelet, limited by an optional query and
        possibly within a transaction defined in options.
        
        This is an "internal" method called by
        @@method:Input.._update_subscription().
        
        This fetch cannot be aborted, but can be cancelled by
        @@method:Output.._cancel_fetches().
    */
    _transactional_fetch: function( destination, transaction, count, query, query_changes, options, revert, next ) {
      var that  = this
        , name  = '_transactional_fetch' // for debugging and error
        , ended = false // to assert that receiver is called with no_more true only once
        , rx    = revert ? revert_receiver : receiver
      ;
      
      that._fetch( rx, query, query_changes, destination );
      
      function revert_receiver( values, no_more, operation, _options ) {
        operation > 1
          ? values = values.map( swap_update )
          
          : operation ^= 1
        ;
        
        receiver( values, no_more, operation, _options );
      } // revert_receiver()
      
      function receiver( values, no_more, operation, _options ) { // ToDo: use _options
        // Assert no_more is emitted only once
        ended &&
          that._error( name,
            'already ended, no_more received twice from _fetch()'
          )
        ;
        
        if ( no_more ) ended = true;
        
        // Emit removes, updates, and adds, in that order
        var l    = values.length
          , more = count > 1 || ! no_more
        ;
        
        //de&&ug( get_name( that, name ), { no_more: no_more, adds: al, removes: rl, updates: ul, options: _options } );
        
        if ( l )
          destination.listen( operation || 0, values, get_options( more ), that );
        
        else if ( ! more /*&& transaction.t*/ ) // ToDo: modify join() tests to allow commented-out optimization
          // Nothing was emitted yet, no more calls to receiver, and there were emissions in the past
          
          // ToDo: do not emit end-of-transaction event to destination if there was nothing emitted to this destination before
          destination.listen( 0, [], get_options( false ) )
        ;
        
        no_more && next && next();
      } // receiver()
      
      function get_options( more ) {
        var o = transaction.o
          , t
        ;
        
        if ( ! more || ! o ) { // When ! more we need to get last options
          t = transaction.t || ( transaction.t = new Transaction( more ? 2 : 1, options ) );
          
          o = transaction.o = t.next_options();
        }
        
        if ( o && o._t )
          o = that._concurrent_options( destination, o )
        ;
        
        //de&&ug( get_name( that, name ) + 'options:', o );
        
        return o;
      } // get_options()
    }, // Output.._transactional_fetch()
    
    /* ------------------------------------------------------------------------
        @method Output.._concurrent_options( destination, options )
        
        @short Manages concurrent options to a destination for a transaction
        
        @parameters
        - **destination** (@@class:Input\): emitting for this transaction
        - **options** (Object): must be defined with a defined ```_t```
          @@transaction Object
        
        @examples
        
        ```javascript
          if( options && options._t ) {
            options = source._concurrent_options( destination, options );
          }
          
          destination.listen( 0, values, options );
        ```
        
        @description
        This method is called by:
        - Method Output.._transactional_fetch()
        - Method Input.._update_subscription()
        
        The same behavior is duplicated in method Output.._route().
    */
    _concurrent_options: function( destination, options ) {
      return this.output_transactions.get_options( destination, options );
    }, // Output.._concurrent_options()
    
    /* ------------------------------------------------------------------------
        @method Output.._update_query( changes, destination )
        
        @short Update local query tree with changes for destination
        
        @parameters
        - **changes** (Array):
          - **0** (Array): @@query terms to remove from query tree
          - **1** (Array): query terms to add to query tree
        
        - **destination** (@@class:Input\): subscriber
        
        @throws
        (Error): removed term has no matching prior added term for this
        destination.
        
        @description
        This method is called by:
        - Method Plug..update_upstream_query()
        - Method Plug.._fetch()
        - Method Output.._apply_done_query_updates()
    */
    _update_query: function( changes, destination ) {
      var removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , tree    = this.tree
      ;
      
      /*
      // if ( get_name( destination ) == "Input( dispatched #13 )" )
        log( get_name( this, '_update_query' )
          + 'destination:', get_name( destination )
          + ', changes:', pretty( changes )
      //  + '\n\n stack:' + RS.stack()
        );
      //*/
      
      removes.length && tree.remove( removes, destination );
      adds   .length && tree.add   ( adds   , destination ); // ToDo: provide filter if stateful
    }, // Output.._update_query()
    
    /* ------------------------------------------------------------------------
        @method Output.._apply_done_query_updates( query_update )
        
        @short Apply all done query updates starting with ```query_update```
        
        @parameters
        - **query_update** (Object): done or canceled query update,
          attributes:
          - **changes** (Array):
            - **0** (Array): @@query terms to remove from query tree
            - **1** (Array): query terms to add to query tree
          
          - **destination** (@@class:Input\): subscriber
          
          - **done**:
            - (Function): function to call after applying query updates
              using @@method:Output.._update_query()
            - (Number):
              - ```0```: not done (not allowed for this query_update)
              - ```1```: done or canceled
              - ```2```: done and applied (not allowed for this query_update)
        
        @throws
        (Error): removed term has no matching prior added term for this
        destination.
        
        @description
        This method is called by @@method:Plug.._fetch() when an output fetch
        completes to apply all done query updates for the destination
        of ```query_update```.
        
        It is also called by @@method:Output.._cancel_fetches() if at least
        one query update was canceled, and is therefore done, for a
        destination.
        
        Query updates are only applied if all prior query updates for the
        same destination are done and applied. This garanties that
        removes are not applied before corresponding adds which would
        throw an error on the query tree.
        
        Before applying, ```query_update``` is removed from the list
        of all query updates.
        
        Query update changes are applied on output query tree by calling
        @@method:Output.._update_query().
        
        Once a query update is applied, if its done attribute is a
        ```Function```, it is called. Then ```query_update.done``` is
        set to ```2```, i.e. done and applied.
    */
    _apply_done_query_updates: function( query_update ) {
      var that          = this
        , de = true
        , name          = de && get_name( that, "_apply_done_query_updates" )
        , query_updates = that.query_updates
        , i             = -1
        , destination   = query_update.destination
        , changes
        , done
      ;
      
      // de&&ug( name, 'query_update:', pretty( query_update ), '\n  query_updates:', pretty( query_updates ) );
      
      // Find-out if this query_update is first in the queue for its destination
      while ( query_updates[ ++i ].destination != destination );
      
      if ( query_updates[ i ] == query_update ) {
        // query_update is the first of its destination in query_updates[]
        
        top: for ( ;; ) {
          // de&&ug( name, 'apply:', pretty( query_update ) );
          
          query_updates.splice( i--, 1 );
          
          if ( changes = query_update.changes )
            that._update_query( changes, destination ); // ToDo: provide filter if stateful
          
          done = query_update.done; // must be a function or 1
          
          typeof done == 'function' && done();
          
          query_update.done = 2;
          
          // From i upward, find additional done query updates for same destination
          while ( query_update = query_updates[ ++i ] )
            if ( query_update.destination == destination ) {
              if ( query_update.done ) continue top; // apply this query update
              
              // next query_update for this destination is not done yet, we need to wait for it to be done
              break;
            }
          
          // no-more query update to apply
          break;
        }
      }
    }, // Output.._apply_done_query_updates()
    
    /* ------------------------------------------------------------------------
        @method Output..emit( event_name, values, options )
        
        @short Emits @@operation to @@downstream @@input
        
        @parameters
        - event_name: (String) the name of the event: "add", "remove",
          "update", or "clear".
        
        - values (Array of Objects): emitted, may be undefined for "clear"
        
        - options (Object): @@operation meta-data
        
        @description
        If the event_name is one of "add", "remove", "update", or "clear", the
        event is emitted to downstream pipelets. The full signature of emit
        for these events is:
        
        ```javascript
          emit( "add"   , adds   , options )
          emit( "remove", removes, options )
          emit( "update", updates, options )
          emit( "clear"          , options )
        ```
        
        Where:
        - adds (Array of Objects): values
        - removes (Array of Objects): values
        - updates (Array of Arrays of two Objects): [ remove, add ] values
        - options (Object): optional, the following attributes are processed:
          - _t: a @@transaction object
        
        All other events, including "complete", are not propagated to
        downstream pipelets and can be listened directly on the pipelet using
        @@method:Event_Emitter..on().
        
        A "complete" event is also emitted when emitted objects delimit the end
        of a transaction, or are not part of any transaction.
    */
    emit: function( event_name, values, options ) {
      var that       = this
        , fork_tag   = that.options.fork_tag
        , _t
        , more
      ;
      
      // ToDo: optimize / merge _t changes for fork tag and postfix
      if ( fork_tag ) options = Options.add_fork_tag( options, fork_tag );
      
      if ( options && ( _t = options._t ) ) more = _t.more;
      
      de&&ug(
          get_name( that, 'emit' )
        +   'event_name: ' + event_name
        + ', values: '     + ( values && values.length )
        + ', options:'     , options
      );
      
      if ( more
        && values // not clear
        && !values.length
      ) {
        // There is more to come, but nothing to actually send, we'll wait for follow-up data
        return that;
      }
      
      // !! emit even if values.length == 0 to transmit no-more and fork tags to downstream pipelets
      that.destinations.length && that._route( event_name, values, _t, options );
      
      that.emit_apply( event_name, [ values, options ] );
      
      more || that.emit_apply( 'complete', [ options ] );
    }, // Output..emit()
    
    /* ------------------------------------------------------------------------
        @method Output.._route( event_name, values, _t, options )
        
        @short Route an @@operation to destination inputs
        
        @parameters
        - **event_name** (String): the name of the event ("add", "remove",
        "update", or "clear").
        
        - **values** (Array of Object): optional values.
        
        - **_t** (Object): optional @@transaction Object, extracted from
        *options* by @@method:Output..emit()
        
        - **options** (Object): optional
        
        @description
        Properly terminates transactions emitting to downstream pipelet the
        minimum number of operations, and synchronizing transactions in
        coordination with downstream pipelets.
        
        ### See Also
        - Method Output.._concurrent_options()
        
        ToDo: add transactions tests for _route()
    */
    _route: function( operation, values, _t, options ) {
      var that                   = this
        , name                   = de && get_name( that, '_route' )
        , transactions           = that.output_transactions
        , end_of_transaction
        , terminated_inputs
        , subscribers_operations
        , emit_waiters
      ;
      
      _t
        && ( end_of_transaction = ! _t.more )
        && _t.forks
        && ( terminated_inputs = [] ) // will collect terminated inputs
      ;
      
      if ( operation == 'clear' || values.length ) { // tree.route() returns no subscribers_operations when no values
        subscribers_operations = that.tree.route( operation, values ); // ToDo: tree.route(): do not emit empty operations
        
        /* subscribers_operations: (Array of Objects), operations:
            - 0: (String): operation, one of: 'add', 'remove', 'update',
              or 'clear'.
            
            - 1: (Array of Objects): for each subscriber input:
              - **input** (@@class:Input\): destination of this subscriber.
              
              - **v** (Array of Objects): optional values to emit for "add",
                "remove", or "update".
              
              - **t** (Object): transaction information:
                - **count** (Integer, 2 or 3): number of operations in an
                  update transaction for this destination
        */
        if ( subscribers_operations.length ) {
          de&&ug( name + 'subscribers_operations count:', subscribers_operations.length );
          
          ++that.emitting;
          
          // Emit accumulated values to subscribers
          subscribers_operations.forEach( emit_subscribers_operation );
          
          --that.emitting
            
            || ( emit_waiters = that.emit_waiters ).length
            
               // Allow upstream emission to fully terminate, preventing further upstream queuing and improving performances
               // ToDo: alternatively to setTimeout(), emit_subscribers_operation() could release that.emitting before the last emit
            && setTimeout( function() {
              while ( emit_waiters.length ) emit_waiters.shift()()
            }, 0 )
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
          
          var subscribers = [];
          
          that.tree.subscribers
            
            .forEach( function( subscriber ) {
              var input = subscriber.input;
              
              // Only notify inputs which are not already terminated
              terminated_inputs.indexOf( input ) < 0 && subscribers.push( { input: input, v: [] } )
            } )
          ;
          
          // de&&ug( name + 'terminated inputs, subscribers', subscribers, options );
          
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
              
              //de&&ug( name + 'terminated transaction, input:', get_name( input ), ', _t:', _t );
              
              input.listen( 0, [], { _t: _t } )
            } )
          ;
        }
      } // if end of transaction
      
      /* ----------------------------------------------------------------------
          emit_subscribers_operation( subscribers_operation )
          
          parameters
          - **subscribers_operation** (Array of Objects): 
            - 0 (String): operation 'add', 'remove', 'update', or 'clear'.
            
            - 1 (Array of Objects): for each subscriber input:
              - **input**: (@@class:Input\) destination of this subscriber.
              
              - **v** (Array of Objects): optional values to emit for 'add',
              'remove', and 'update'.
              
              - **t** (Object): optional transaction information:
                - **count** (Integer, 2 or 3): number of operations in an
                update transaction for this destination.
      */
      function emit_subscribers_operation( subscribers_operation ) {
        var operation   = operation_values[ subscribers_operation[ 0 ] ]
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
          o = ( t = r.t )
            ? // This is an update split into t.count (2 or 3) operations
              // ToDo: add tests
              
              // Get or initiate the transaction then get next emit options
              ( t.t || ( t.t = new Transaction( t.count, options ) ) )
                .next_options()
            
            : options
          ;
          
          input = r.input;
          
          // ToDo: compute more instead of no_more, it is used only once bellow
          no_more = ! ( o && o._t
            /* There may be concurrent transactions at that input
               that need to be synchronized so that each transaction
               terminates once and only once at this destination input
               Also allows to keep track of inputs which receive data with 'more'
               Allowing to terminate these when the transaction ends
               
               See also duplicated behavior in Output.._concurrent_options()
            */
            && ( o = transactions.get_options( input, o ) )._t.more
          );
          
          de&&ug( name + 'emitting to input: ' + get_name( input ) + ', options:', o );
          
          if ( operation == 3 )
            input.clear( o );
          
          else if ( r.v.length || no_more )
            // There is something to emit or the end of transaction needs to be notified
            input.listen( operation, r.v, o, that )
          ;
          
          terminated_inputs && terminated_inputs.push( input );
        } // for all subscribers
      } // emit_subscribers_operation()
    } // Output.._route()
  } ); // Output plug instance methods
  
  /* --------------------------------------------------------------------------
      @class Pipelet( options )
      
      @short Base class for all pipelets
      
      @parameters
      - **options** (Object): optional pipelet parameters:
        - **name** (String): @@class:Loggable debugging name for this pipelet,
          default is the name of the pipelet class.
        
        - **key** (Array of Strings): optional @@key, dataflow values attribute
          names carrying objects' @@[identities](identity) - i.e. for which
          there is one and only one value in the set.
        
        - **source_key** (Array of Strings): used if option *key* is not
          defined. Default is @@upstream pipelet @@key or ```[ 'id' ]``` if
          there are no upstream pipelets as set by
          @@class_method:Pipelet.set_default_options().
        
        - **fork_tag** (String): @@output @@transaction @@tag for
          @@concurrent pipeline graphs - i.e. there is a fork at this pipelet
          to multiple @@downstream pipelets that recombine concurrently
          downstream.
          
          This allows proper @@synchronization of concurrent transactions at
          the recombining point where the option tag (bellow) is set to the
          same value as this fork tag.
        
        - **untag** (String): @@input transaction tag for concurrent graph join
          - i.e. this pipelet recombines dataflows from an @@upstream fork
          tagged using option ```"fork_tag"``` having the same value as this
          tag.
        
        - **tag** (String): deprecated alias of **untag**.
        
        - **concurrent** (Object): option for class Input_Transactions():
          keys are tags, truly values means @@concurrent, if concurrent is
          null or undefined, all tagged transactions are considered
          concurrent. Therefore concurrents comes as a restriction which
          designate which tagged transactions are conccurent at this
          pipelet.
        
        - **transactional** (Boolean): if true, pipelet is @@transactional,
          i.e. it will respond with an empty state ```[]``` when fetched.
        
        - **query_transform** (Function): provide method
          @@method:Plug.._query_transform().
      
      @description
      All @@(pipeline)s are made of connected instances of this class.
      
      Provides service for a @@synchronous, @@stateless, @@lazy pipelet.
      
      Pipelet instances also provides the toubkal pipelet API for other
      javacript libraries, i.e. front-end or native applications. The API is
      provided by the **api** instance attribute (Object) which attributes
      are the following functions:
      - To modify pipelet state, via the pipelet input, call:
        - **add( values, options )** (Function): to add values to pipelet
        state, check @@method:Pipelet.._add() for details.
        - **remove( values, options )** (Function): to remove values from
        pipelet state, check @@method:Pipelet.._remove() for details.
        - **update( updates, options )** (Function): to update values of
        pipelet state, check @@method:Pipelet.._update() for details.
      - To retrieve and subscribe to output data change events:
        - **fetch( fetch( receiver, query, subscription_changes )**:
        fetching values from pipelet and optionally update subscriptions,
        check @@method:Plug.._fetch() for details.
        - **update_subscriptions( subscription_changes )**: to update
        subscriptions without fetching values, check
        @@method:Plug..update_upstream_query() for details.
        - **on( event_name, listener, context, once )**: to listen to
        data change events from active subscriptions, where event_name
        can be one of "add", "remove", or "update", one should listen to
        all three to receive all events. Check @@method:Event_Emitter..on()
        for details.
  */
  // ToDo: rename tag option untag (WIP), rename fork_tag tag
  // ToDo: untag should allow an Array of Strings to untag mutliple tags simultaneously
  function Pipelet( options ) {
    var that = this
      , name
      , input
      , output
      , query_transform
    ;
    
    options = that._options = options || {};
    
    name = options.name;
    
    Loggable.call( that, name );
    
    // scope for singletons, multitons, outputs
    that[ _scope_s ] = null;
    
    // inputs in addition to that._input
    that._inputs = that._inputs || [];
    
    // !! Always initialize _input and _output first, in all derived classes before calling that constructor
    input  = that._input  || ( that._input  = new Input ( that, name, options ) );
    output = that._output || ( that._output = new Output( that, options ) );
    
    // Set that._output.source if not already set
    output.source = output.source || input;
    
    // Set API methods, this must be compatible with pipelet encapsulate()
    that.api = {
      add   : input_listen( 0 ),
      remove: input_listen( 1 ),
      update: input_listen( 2 ),
      
      fetch: function( receiver, query, query_changes ) {
        return output._fetch( receiver, query, query_changes )
      },
      
      update_subscriptions: function( changes ) {
        output.update_upstream_query( changes )
      },
      
      on: function( event_name, listener, context, once ) {
        output.on( event_name, listener, context, once )
        
        return this;
      }
    }; // api
    
    // Ongoing transactions
    that._transactions = new Transactions( name );
    
    // Set values's key
    that._set_key( options.key || options.source_key );
    
    // Set tag to input.transactions if any.
    // !! This must be done after that._output is set for Controllets which route tags to their destinations
    input.set_tag( options.untag || options.tag );
    
    // Output transactions fork tag to add to all emitted operations' transactions if defined
    that._fork_tag = options.fork_tag;
    
    // query_transform
    if( query_transform = options.query_transform ) output._query_transform = query_transform;
    
    // Transactional fetch
    if( options.transactional ) output._fetch = fetch_transactional;
    
    function input_listen( operation ) {
      return function( values, options ) {
        input.listen( operation, values, options )
      }
    }
    
    function fetch_transactional( receiver, query, query_changes, destination ) {
      de&&ug( get_name( that, 'fetch_transactional' ), 'changes:', query_changes );
      
      query_changes && output.update_upstream_query( query_changes, destination );
      
      receiver( [], true );
    } // fetch_transactional()
  } // Pipelet()
  
  // Input and Output plug classes
  Pipelet.Input  = Input;
  Pipelet.Output = Output;
  
  Loggable.subclass( 'Pipelet', Pipelet, {
    /* ------------------------------------------------------------------------
        @method Pipelet.._add_input( output, Input, name, methods )
        
        @short Instanciate additional Input and connect it to output
        
        @parameters:
        - **output** (Pipelet, Output or Array of Objects): source dataflow,
          or static data.
        
        - **Input** (@@class:Input Class): the Input class (not an instance
          of the class) to instanciate to create returned input.
        
        - **name** (String): Loggable name of input instance.
        
        - **methods** (Object): implementing operations ```_add()```,
          ``_remove()```, ```_update()```, and optionally ```set_input()```.
          
          ```set_input( input )``` receives created Input instance as only
          parameter to allow ```methods``` to use input methods such as
          @@method:Plug.._fetch().
        
        @returns Input instance
        
        @description:
        Pipelet must already have a main input to share input transactions
        with.
        
        Allows to use a unique tag to synchronize transactions on all inputs
        of the same pipelet.
        
        Method set_input( input ) 
    */
    _add_input: function( output, Input, name, methods ) {
      var that      = this
        , set_input = methods.set_input
        , options   = that._options
        , untag     = options.untag || options.tag
        , input     =
            new Input( methods, name, untag, that._input.transactions )
      ;
      
      if ( set_input ) set_input.call( methods, input );
      
      input.add_source( output._output || output );
      
      that._inputs.push( input );
      
      return input
    }, // Pipelet.._add_input()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._emergency( method, message )
        
        @short Reports emergencies to global error dataflow then throws.
        
        @parameters:
        - method (String): the name of the method where the error occurred
          
        - message (String): emergency error message
        
        @throws Error
        
        @description:
        This method should be called only when an error occurs than cannot
        be recovered, requiring the process to stop. It should therefore
        be avoided as much as possible.
        
        This method currently throws an Error, but does not report the error
        in the global error dataflow, it only reports errors to the console.
        
        The error message is built from the method name using
        @@function:get_name( method ) with the error message appended.
    */
    _emergency: function( method, message ) {
      message = get_name( this, method ) + message;
      
      // ToDo: report error to global error dataflow or error output
      log( 'Emergency: ' + message );
      
      throw new Error( message )
    }, // Pipelet.._emergency()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._set_key( key )
        
        @short Sets values' @@key
        
        @parameters
        - **key** (Array of Strings): attribute names defining values'
          @@identity. Default is ```[ "id" ]```.
        
        @returns
        (Array of Strings): key, never null nor undefined, using default key
        if key parameter was not defined.
        
        @description
        This method is experimental. Its API is very likely to change in
        the future and should therefore be considered deprecared. It should
        be used only by toubkal internals. Use it at your own risk.
        
        See also notes in the code of method Set.._add() which calls this
        method on add options "new_key".
        
        This method can be called by upstream pipelet to notify that the
        upstream key has changed as does pipelet aggregate().
        
        @@method:Pipelet.._identity() is reset to its original so that the
        next invocation, if any, will re-generate code with the new key.
        
        Derived classes should reset any other methods that relies on
        ```key```.
    */
    _set_key: function( key ) {
      var that = this;
      
      that._key = key = key || [ 'id' ];
      
      that._identity = pipelet_identity;
      
      return key
    }, // Pipelet.._set_key()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._identity( value )
        
        @short Return the key of a value in the set
        
        @parameters
        - **value** (Object): value which key is requested.
        
        @returns
        
        (String) key attributes values concatenated, starting with, and
        separated by ```"#"```.
        
        @examples
        ```javascript
          // Assuming this._key is [ 'a', 'c' ]
          
          this._identity( { a: 1, b: 2, c: "test" } )
          
          // -> "#1#test"
        ```
        
        @description
        Uses ```this._key``` to generate code @@JIT to return a unique a
        string for a value based on the key coordinates concatenation
        separated with ```"#"```.
        
        To regenerate code on key change, call @@method:Pipelet.._set_key().
        
        Generated function is a pure that does not require a
        context, it can therefore be cached and used without a bound
        context with ```[].map()``` and other Array functional methods:
        
        ```javascript
          this._identity( {} ); // force generation of this._identity
          
          var _identity  = this._identity
            , identities = value.map( _identity ) // no need to _identity.bind( this )
          ;
        ```
    */
    _identity: function( value ) {
      return ( this._identity =
        new Function( 'o', 'return ' + safe_identity_code( this._key ) )
      )( value )
    }, // Pipelet.._identity()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__transform( values )
        
        @short Transforms source values into values to emit
        
        @parameters
        - **values** (Array of Objects): values to transform.
        
        @description
        This is a virtual method.
        
        Transforms an array of values into an other array of values according
        to the current pipelet role.
        
        Default is to return all values unaltered. Every @@stateless pipelet
        should overload this method or make a @@composition using
        @@pipelet:alter().
        
        @see_also
        - Funcion Plug.._transform()
    */
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._transaction( count, options )
        
        @short Create @@transaction for ```count``` @@(operation)s
        
        @parameters
        - **count** (Integer): number of operations in this transaction
        
        - **options** (Object): transaction options from @@upstream pipelet
        
        @returns
        (@@class:Transaction\): transaction to emit count operations.
        
        @examples
        Emit removes and adds in a transaction:
        ```javascript
          var t = this._transaction( 2, options );
          
          // must now call t.next() exactly twice
          
          this.__emit_remove( removes, t.next_options() );
          this.__emit_add   ( adds   , t.next_options() );
        ```
        
        @description
        Transaction is created for this output and optional pipelet fork
        @@tag\.
        
        ### See Also
        - Method Transactions..get_transaction()
        - Method Pipelet..__emit_operations()
    */
    _transaction: function( count, options ) {
      var that = this;
      
      // de&&ug( get_name( this, '_transaction' ) + 'count: ' + count + ', options:', options );
      
      return that._transactions
        .get_transaction( count, options, that._output, that._fork_tag )
    }, // Pipelet.._transaction()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._add( added, options )
        
        @short Add @@(value)s to this pipelet then @@emit @@downstream
        
        @parameters
        - **added** (Array of Objects): values to add
        
        - **options** (Object): optional @@operation meta-data
        
        @description
        This @@operation method is called on @@upstream add events.
        
        This method may be overloaded by derived classes, the default
        behavior is to optionally transform values using
        @@method:Pipelet..__transform() and emit using
        @@method:Output..emit() or @@method:Pipelet..__emit_operations()
    */
    _add: function( added, options ) {
      operation_transform( this, 'add', added, options )
    }, // Pipelet.._add()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_add( added, options )
        
        @short Emits added @@(value)s @@downstream
        
        @parameters
        - added (Array of objects): added values
        
        - options (Object): optional @@operation meta-data
        
        @description
        This method is deprecated.
    */
    __emit_add: function( added, options ) {
      this._output.emit( 'add', added, options )
    }, // Pipelet..__emit_add()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._remove( removed, options )
        
        @short Removes @@(value)s then @@emit @@downstream
        
        @parameters:
        - added (Array of Objects): values to remove
        
        - options (Object): optional @@operation meta-data
        
        @description:
        This @@operation method is called on @@upstream data events.
        
        This method is often overloaded by derived classes, the default
        behavior is to _notify downstream pipelets using
        @@method:Pipelet..__emit_remove() of transformed values by
        @@method:Pipelet..__transform().
    */
    _remove: function( removed, options ) {
      operation_transform( this, 'remove', removed, options )
    }, // Pipelet.._remove()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_remove( removed, options )
        
        @short Emits removed @@(value)s @@downstream
        
        @parameters
        - removed (Array of objects): removed values
        
        - options (Object): optional @@operation meta-data
        
        @description
        This method is deprecated.
    */
    __emit_remove: function( removed, options ) {
      this._output.emit( 'remove', removed, options )
    }, // Pipelet..__emit_remove()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._update( updates, options )
        
        @short Updates @@values then @@emit @@downstream
        
        @parameters
        - **updates** (Array of Arrays): each update is an Array of two objects
          ```[ remove, add ]```:
          - **remove** (Object): value prior to the update
          - **add** (Object): new value after the update
        
        - **options** (Object): optional @@operation meta-data
        
        @description
        This method processes @@update @@operations for this pipelet. It can
        be overloaded by derived classes.
        
        This version of update is meant to ease the developpement of pipelets
        by calling @@method:Pipelet.._remove() then @@method:Pipelet.._add()
        methods for each update in a @@transaction.
        
        However, doing so, it splits updates into @@remove and @@add
        @@operations which makes it more difficult for downstream pipelets
        to perform operations specific to updates.
        
        If @@strict update semantic is desired, one can either:
        - overload this update method to not split updates; or
        - use a pipelet such as @@pipelet:alter(), @@pipelet:map()
        or @@pipelet:flat_map() that do not split updates; or
        - use pipelet optimize() downstream of this pipelet
        which will recombine remove and add operations in a transaction
        into semantically strict update operations.
    */
    _update: function( updates, options ) {
      var that           = this
        , transform      = that.__transform
        , moves          = options && options.moves
        , l              = updates.length
        , i              = -1
        , t
        , options
        , add_options
        , remove_options
        , update
      ;
      
      //de&&ug( get_name( that, '_update' ) + 'updates:', l );
      
      if ( moves ) { // ToDo: add test for update with moves from order()
        options = extend_2( {}, options );
        
        delete options.moves;
      }
      
      t = that._transaction( l ? 2: 0, options );
      
      add_options = remove_options = options = t.next_options();
      
      if ( --l ) // there are more than one update ToDo: add test for more than one update
        for ( l -= 1; i < l; ) // process all updates but last with first options
          next_update( options );
      
      // last (or only) update
      next_update( add_options = t.next_options() )
      
      function next_update( _add_options ) {
        update = updates[ ++i ];
        
        if ( moves ) {
          var move = moves[ i ];
          
          remove_options = extend( {},      options, { locations: [ move.from ] } );
             add_options = extend( {}, _add_options, { locations: [ move.to   ] } );
        }
        
        that._remove( [ update[ 0 ] ], remove_options );
        that._add   ( [ update[ 1 ] ],    add_options );
      } // next_update()
    }, // Pipelet.._update()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_update( updated, options )
         
        @short Notify downstream pipelets of updated object values.
        
        @parameters:
        - updated: Array of updates, each update is an Array of two objects:
            - the first is the previous object value,
            - the second is the updated object value.
          
        - option: optional object
        
        @description
        This method is typically called by _update() after updating objects.
        
        Users should not call this method directly.
        
        This method is deprecated.
    */
    __emit_update: function( updated, options ) {
      this._output.emit( 'update', updated, options )
    }, // Pipelet..__emit_update()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._clear( options )
        
        @short Clears the content of this Pipelet and downstream pipelets.
        
        @parameters:
        - option: optional object
        
        @description
        This method is deprecated, do not use.
        
        _clear() may be called when an update requires to clear the state of
        all downstream objects. This may be necessary when:
          - The state is no longer needed and memory can be reclaimed
          - All or most values will change and it is more efficient to clear
          - The state of downstream objects cannot be updated incrementally
    */
    _clear: function( options ) {
      this.__emit_clear( options )
    }, // Pipelet.._clear()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_clear( options )
        
        @short Notify downstream pipelets that all object values should be cleared.

        @parameters:
        - option: optional object
        
        @description
        This method is deprecated, do not use.
        
        This method is typically called by _clear() for clearing a @@pipeline.
        
        Users should not call this method directly.
    */
    __emit_clear: function( options ) {
      this.__emit( 'clear', null, options )
    }, // Pipelet..__emit_clear()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_operations( added, removed, updates, options )
        
        @short Emits a number of operations ( add / remove / update ) as a transaction.
        
        @parameters
        - **added** (Array): of added values. Can be falsy to specify that
          there is nothing to add.
        
        - **removed** (Array): of removed values. Can be falsy to specify that
          this is nothing to remove.
        
        - **updates** (Array): of updated values. Can be falsy to specify that
          this is nothing to update.
        
        - **options** (Object): additional options to emit to downstream pipelets:
          - **_t** (Object): an optional transaction
        
        @description
        If options specify an end-of-transaction, at least one empty add
        operation is emitted. @@method:Output..emit() may decide to filter-out
        this emission.
    */
    __emit_operations: function( added, removed, updates, options ) {
      var output = this._output
        , al     = added   && added  .length ? 1 : 0
        , rl     = removed && removed.length ? 1 : 0
        , ul     = updates && updates.length ? 1 : 0
        , l      = al + rl + ul
        , t
      ;
      
      if ( l ) {
        if ( l > 1 ) t = this._transaction( l, options );
        
        rl && output.emit( 'remove', removed, next_options() );
        ul && output.emit( 'update', updates, next_options() );
        al && output.emit( 'add'   , added  , next_options() );
      
      } else if ( options && ( t = options._t ) && ! t.more )
        // If this is the end of a transaction
        // We need to forward at least one operation downstream
        output.emit( 'add', [], options )
      
      function next_options() {
        return t ? t.next_options() : options
      }
    }, // Pipelet..__emit_operations()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit( event_name, values, options )
        
        @short Emits values to this pipelet's @@output
        
        @description
        This method should not be overloaded as it is not always called
        to emit to ```this._output```.
    */
    __emit: function( event_name, values, options ) {
      this._output.emit( event_name, values, options )
    }, // Pipelet..__emit()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._on( event_name, listener, that, once )
        
        @short Listen to this pipelet's output events
        
        @description:
        This method is deprecated, do not use.
    */
    _on: function( event_name, listener, that, once ) {
      this._output.on( event_name, listener, that, once );
      
      return this
    }, // Pipelet.._on()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._add_source( source, options, then )
        
        @short Connect this pipelet's @@input to an @@upstream @@output
    */
    _add_source: function( s, options, then ) {
      this._input.add_source( s._output || s, options, then );
      
      return this
    }, // Pipelet.._add_source()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._remove_source( source, options, then )
        
        @short Disconnect this pipelet's @@input from an @@upstream @@output
    */
    _remove_source: function( s, options, then ) {
      this._input.remove_source( s._output || s, options, then );
      
      return this
    }, // Pipelet.._remove_source()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._add_destination( destination, options, then )
        
        @short Connect this pipelet's @@output to @@downstream @@input
    */
    _add_destination: function( d, options, then ) {
      this._output.add_destination( d._input || d, options, then );
      
      return this
    }, // Pipelet.._add_destination()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._remove_destination( destination, options, then )
        
        @short Disconnect this pipelet's @@output from @@downstream @@input
    */
    _remove_destination: function( d, options, then ) {
      this._output.remove_destination( d._input || d, options, then );
      
      return this
    }, // Pipelet.._remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._fetch_all( receiver, query )
        
        @short Fetch content from this pipelet's output
    */
    _fetch_all: function( receiver, query ) {
      // fetch_all does not return this._output but fetched results synchronously
      return this._output.fetch_all( receiver, query )
    }, // Pipelet.._fetch_all()
    
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
        
        #### Using
        - Pipelet dispatch()
    */
    through: function through( pipelet, options, then ) {
      pipelet._input.add_source( this._output, options, then );
      
      return pipelet
    }, // Pipelet..through()
    
    // Helper method, asserts input is an Input
    _assert_Input: function( input ) {
      input.pipelet || this._emergency( '_assert_Input', 'requires Input, got: ' + get_name( input ) );
      
      return input
    }, // Pipelet.._assert_Input()
    
    // Helper method for remove_source_with() and remove_destination_with()
    // ToDo: move this out of Pipelet's protoype, make it a function only accessible within pipelet.js
    _once_input_remove_source: function( source, listener ) {
      this._assert_Input( source._input || source )
      
        .once( remove_source_s, listener )
      ;
      
      return this
    }, // Pipelet.._once_input_remove_source()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..remove_source_with( source, output )
        
        @short Disconnect pipelet's @@input when ```source``` disconnects
        
        @parameters
        - **source** (@@class:Pipelet or @@class:Input\): to listen to event
          ```"remove_source"``` triggering the disconnection of this pipelet
          input from *output*.
        
        - **output** (@@class:Pipelet or @@class:Output\): optional,
          default is this pipelet input source.
        
        @examples
        - disconnect pipelet configuration(), which is a @@multiton, when the
          source of a @@composition is disconnected:
          
          ```javascript
            rs
              .Compose( 'filter_by_configuration', function( source, options ) {
                var reactive_query = rs
                  .configuration( options )
                  
                  // Add disconnection constraint between source and configuration()
                  .remove_source_with( source )
                  
                  .filter( [ { module: 'queries' } ] )
                  
                  .flat_map( function( configuration ) { return configuration.query } )
                ;
                
                return source
                  .filter( reactive_query )
                ;
              } )
            ;
          ```
          
          #### Using:
          - Method Pipelet..Compose()
          - Pipelet configuration()
          - Pipelet filter()
          - Pipelet flat_map()
        
        @description
        This method allows to set a disconnection constraint between a source
        connection (```source```'s to ```source```), and a target
        connection (```output``` to ```this._input```). I.e.. when the
        source connection is severed, the target connection will be severed
        as well.
        
        Doing so allows to properly release resources when
        @@[pipelines](pipeline) are disassembled, typically when
        pipelet dispatch() removes a branch, therefore preventing memory
        leaks that would result from pipelets connected to typically
        @@singleton and @@multiton pipelets.
        
        ### See Also
        - Method Pipelet..remove_destination_with()
        - Method Input..remove_source()
        - Pipelet dispatch()
        - Pipelet cache()
        - Pipelet socket_io_synchronizing()
    */
    remove_source_with: function( source, output ) {
      var input = this._input;
      
      return this._once_input_remove_source( source, remove_source )
      
      function remove_source( _, options ) {
        output = output ? output._output || output : input.source;
        
        // log( get_name( input, 'remove_source_with' ) + 'remove from output:', get_name( output ) );
        
        output && input.remove_source( output, options )
      } // remove_source()
    }, // Pipelet..remove_source_with()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..remove_destination_with( source, input )
        
        @short Disconnect @@[destinations]destination when ```source``` disconnects
        
        @parameters
        - **source** (@@class:Pipelet or @@class:Input\): to listen to event
          ```"remove_source"``` triggering the disconnection of this pipelet
          input from *output*.
        
        - **input** (@@class:Pipelet or @@class:Input\): optional, default is
          this pipelet output's first @@(destination).
        
        @description
        This method allows to set a disconnection constraint between a source
        connection (```source```'s source to ```source```), and a target
        connection (```this._output``` to ```input```). I.e.. when the
        source connection is severed, the target connection will be severed
        as well.
        
        Doing so allows to properly release resources when
        @@[pipelines](pipeline) are disassembled, typically when
        pipelet dispatch() removes a branch, therefore preventing memory
        leaks that would result from pipelets connected to typically
        @@singleton and @@multiton pipelets.
        
        ### See Also
        - Method Pipelet..remove_source_with()
        - Method Input..remove_source()
        - Pipelet dispatch()
        - Pipelet cache()
        - Pipelet socket_io_synchronizing()
    */
    remove_destination_with: function( source, input ) {
      var that   = this
        , output = that._output
      ;
      
      return that._once_input_remove_source( source, remove_source )
      
      function remove_source( _, options ) {
        ( input ? [ that._assert_Input( input._input || input ) ] : output.destinations.slice() )
          .forEach( remove_input )
        
        function remove_input( input ) {
          // log( get_name( output, 'remove_destination_with' ) + 'remove:', get_name( input ) );
          
          input.remove_source( output, options )
        }
      } // remove_source()
    }, // Pipelet..remove_destination_with()
    
    /* ------------------------------------------------------------------------
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
        
        @see_also:
        - Namespace @@namespace:rs
        - @@method:Pipelet..namespace()
        - @@method:Pipelet..create_namespace()
        - @@method:Pipelet..is_namespace()
        - @@method:Pipelet..log_namespace()
    */
    set_namespace: function( pipelet ) {
      return ( this[ _scope_s ] = assert_scope( pipelet )[ _scope_s ] )[ _mixin_s ]( this )
    }, // Pipelet..set_namespace()
    
    /* ------------------------------------------------------------------------
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
        
        @see_also:
        - Namespace @@namespace:rs
        - @@method:Pipelet..create_namespace()
        - @@method:Pipelet..is_namespace()
        - @@method:Pipelet..log_namespace()
        - @@method:Pipelet..set_namespace()
    */
    namespace: function() {
      return assert_scope( this )[ _scope_s ][ _namespace_s ]
    }, // Pipelet..namespace()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..is_namespace()
        
        @short Returns true if pipelet is a @@namespace
        
        @returns
        - true: this pipelet is a namespace.
        - falsy: this pipelet is not a namespace.
        
        @see_also:
        - Namespace @@namespace:rs
        - @@method:Pipelet..namespace()
        - @@method:Pipelet..create_namespace()
        - @@method:Pipelet..log_namespace()
        - @@method:Pipelet..set_namespace()
    */
    is_namespace: function() {
      return this._output.is_namespace
    }, // Pipelet..is_namespace()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..log_namespace( name )
        
        @short log current @@namespace pipelet factories and instances
        
        @description:
          Helps debug namespace issues by displaying the current namespace' state.
          
          Shows for each registered pipelet factory if it is mixed-in or not (i.e. callable) at this
          point in the @@pipeline, and which @@singleton, @@multiton, or @@output instances are in
          its scope.
          
          It does not show parent namespaces' factories or instances.
          
        @parameter name (String): a debugging name string to help locate trace in log
        
        @see_also:
        - Namespace @@namespace:rs
        - @@method:Pipelet..namespace()
        - @@method:Pipelet..create_namespace()
        - @@method:Pipelet..is_namespace()
        - @@method:Pipelet..set_namespace()
    */
    log_namespace: function( name ) {
      var that             = this
        , namespace        = that.namespace()
        , factories        = Object.keys( namespace[ constructor_s ][ prototype_s ] )
        , factories_status = {}
        , i                = -1
        , factory
      ;
      
      while ( factory = factories[ ++i ] )
        if ( factory != constructor_s )
          factories_status[ factory ] = !!that[ factory ];
      
      de&&ug( get_name( namespace ) + ', ' + name
        + ', factories:', factories_status
        , ', instances:', Object.keys( namespace[ _scope_s ] ).filter( function( factory ) { return factory.charAt( 0 ) != '_' } )
      );
      
      return that
    }, // Pipelet..log_namespace()
    
    /* ------------------------------------------------------------------------
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
        
        @see_also:
        - Namespace @@namespace:rs
        - @@method:Pipelet..namespace()
        - @@method:Pipelet..is_namespace()
        - @@method:Pipelet..log_namespace()
        - @@method:Pipelet..set_namespace()
    */
    create_namespace: function( name, is_repository ) {
      log( 'create_namespace():', name, is_repository );
      
      return create_namespace( assert_scope( this ), name, is_repository )
    }, // Pipelet..create_namespace()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..Compose( name [, options], composition )
        
        @short Build a pipelet from one or more pipelets
        
        @parameters
        - **name** (String): the name of the pipelet
        
        - **options** (Object): optional, define optional attributes:
          
          - **union** (Boolean): if true this @@composition is encapsulated
            with a union input so that the composition is a single pipelet
            to which additional inputs may be added. See multi-pipelet
            compositions bellow for details.
          
          - **singleton**: to make this @@composition a @@singleton or a
            @@multiton, i.e. having less instances than invocations:
            
            - falsy: this composition is neither a singleton not a multiton
            
            - ```true```: this composition is a @@singleton, it will
              have at most one instance per instance scope (see
              instances_scope option bellow).
            
            - (Function): this composition is a @@multiton\.
              
              For each invocation, ```singleton()``` is called with
              the same parameters as ```composition()``` without the
              source pipelet as first parameter. The source pipelet is
              still provided as ```this``` context to singleton() which
              is invoqued as ```singleton.apply( source, parameters )```
              where ```parameters``` are composition parameters as an
              Array.
              
              This function must return a unique identity as a unique
              string or a unique Array of strings for each singleton
              of the multiton.
              
              The first time an identity is returned per instances
              scope (see instances_scope option bellow),
              ```composition()``` is called to instantiate the
              pipelet. Invocations of ```singleton()``` returning an
              identity already used will not instanciate the pipelet,
              not calling ```composition()```, and the returned
              pipelet will be that of the first invocation.
          
          - **instances_scope** (@@class:Pipelet or
            @@method:Pipelet..namespace\): optional global @@scope for
            singletons and multitons. The default scope is that of the
            source pipelet instantiating the singleton or multiton.
        
        - **composition** (Function): this is the constructor for the pipelet
            @@composition that must return a @@class:Pipelet instance instead of
            this.
          
          Composition is called with the following parameters:
          - **source** (@@class:Pipelet\): the input pipelet instance, which
            also comes with a @@namespace.
            This namespace must be the namespace of the returned pipelet. If
            @@rs is used in the composition it must be declared the following
            way to use the namespace of source in the composition:
            
            ```javascript
              rs
                .Compose( 'server_last_state', function( source, options ) {
                  var rs = source.namespace();
                  
                  return rs
                    .socket_io_state_changes()
                    
                    .last( options )
                  ;
                } )
              ;
            ```
          
          - parameters: 0 to n parameters of the pipelet.
          
          - **options** (Object): coming from the pipelet options
            @@[augmented with default options]class_method:Pipelet.set_default_options\,
            see important warning bellow! Options can be shallow-mutated by
            *composition*.
          
          Composition must return a pipelet with the same namespace as source.
          If composition() returns ```null``` or ```undefined```, it's pipelet
          instances will return the source namespace.
        
        @returns
        (@@class:Pipelet\): this (Current pipelet instance), allowing to:
          - chain multiple Compose() definitions
          - use the composed pipelet immediately
          - chain other pipelets after Compose()
        
        @description
        
        ### !!! Important Warning regarding composition's ```options``` parameter
        
          The composition MUST define an ```option``` parameter, otherwise
          difficult-to-debug error will occur such as
          ```"... has no method ..."```.
          
          Because minification can optimize-out the options parameter,
          programmers MUST use the options parameter at least one once,
          typically to pass options to another pipelet.
          
          The example bellow will not have this issue because the options
          parameter is used with @@pipelet:filter() and @@pipelet:aggregate().
          
          We highly recommend testing all code minified to prevent this kind
          of surprise in production.
        
        ### Multi-pipelet compositions
          The output of the composition is the pipelet returned by the
          composition.
          
          This is fine in most cases but if the composition has multiple
          pipelets and one attempts to connect additional sources to the
          composition these will effectively connect to the last pipelet
          of the composition:
          
          ```markdown
            source ---> composition inner pipelets --->|
                                                       | ---> last pipelet ----> destination
                                additional sources --->|
          ```
          
          This is most likely not what one wants. What one usually wants is
          the following graph:
          
          ```markdown
            source             --->|
                                   | ---> composition pipelets ----> destination
            additional sources --->|
          ```
          
          Set option ```"union"``` to ```true``` to prevent this issue, which
          will encapsulate the composition is into a single pipelet using a
          @@pipelet:union() input and @@pipelet:encapsulate().
        
        ### See Also
        - @@method:Pipelet..Singleton()
        - @@method:Pipelet..Multiton()
        - @@class_method:Pipelet.Build()
        - @@class_method:Pipelet.Add()
        
        @examples
        
        - Compose a filter with an aggregate:
          1) Create the @@composition constructor using source as the first mandatory
            parameter and options as the last that can be shared between all pipelets
            of the composition:
            
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
    */
    Compose: function _Compose( name, options, composition ) {
      if ( typeof options == 'function' ) {
        composition = options;
        options = {};
      }
      
      typeof composition == 'function' && composition.length > 1
        || fatal( 'Composition must be a function with at least two parameters: a source and options' )
      ;
      
      var factory         = Pipelet.Add( name, instanciate, this.namespace() )
        , singleton       = options[ singleton_s ]
        , instances_scope = options[ instances_scope_s ]
      ;
      
      singleton && factory[ singleton_s ]( singleton, instances_scope && instances_scope[ _scope_s ] );
      
      return this.set_namespace( this ); // namespace has changed, may need to mixin new compositon factory in
      
      function instanciate( source, a ) {
        if ( options.union ) {
          // Adding a union requires encapsulating to allow adding more sources
          // Encapsulating is useless unless the input is a union to allow adding more sources
          // Therefore encapsulating with a union input should always be the case, when adding more sources is required
          var rs    = source.namespace()
            , input = source.union( [], { name: name + ' (Compose input union)', key: source._key } )
          ;
          
          return assert_scope( rs.encapsulate( input, compose( input ) ) );
        } else {
          return compose( source );
        }
        
        function compose( input ) {
          a.unshift( input ); // add source pipelet as first parameter
          
          set_default_options( composition, source, a, { name: name } );
          
          var output = new_apply( composition, a ); // may return non-pipelet new Object if composition() returns nothing
          
          // Always return pipelet instance or input's namespace
          return output.set_namespace
            ? output
            : input.namespace()
          ;
        } // compose()
      } // instanciate()
      
      function fatal( message ) {
        throw new Error( 'Compose "' + name + '", Error: ' + message )
      } // fatal()
    }, // Pipelet..Compose()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..Singleton( name, composition, instances_scope )
        
        @short Compose a @@singleton pipelet
        
        @parameters
        - **name** (String): name of @@(composition).
        - **composition** (Function): @@composition, See
        method Pipelet..Compose(), parameter ```composition```.
        - **instances_scope** (@@class:Pipelet or
        @@method:Pipelet..namespace\): optional global scope for all
        instances. Default is instance source scope, allowing one
        instance per source instance scope.
        
        @description:
        See method Pipelet..Compose() for behavior with options
        ```"union"``` and ```"singleton"``` set to true.
        
        ### See Also
        - Method Pipelet..Multiton()
        - Method Pipelet..Compose()
    */
    Singleton: function singleton( name, composition, instances_scope ) {
      var options = { union: true };
      
      options[ singleton_s       ] = true;
      options[ instances_scope_s ] = instances_scope;
      
      return this.Compose( name, options, composition )
    }, // Pipelet..Singleton()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..Multiton( name, multiton, composition, instances_scope )
        
        @short Compose a @@multiton pipelet
        
        @parameters
        - **name** (String): name of @@(composition).
        - **multiton** (Function): See method Pipelet..Compose(), option
        ```"singleton"``` Function.
        - **composition** (Function): @@composition, See
        method Pipelet..Compose(), parameter ```composition```.
        - **instances_scope** (@@class:Pipelet or
        @@method:Pipelet..namespace\): optional global scope for all
        instances. Default is instance source scope, allowing many
        instances per instance source scope.
        
        @description
        See method Pipelet..Compose() for behavior with options ```"union"```
        set to ```true``` and ```"singleton"``` set to parameter ```multiton```.
        
        ### See Also
        - Method Pipelet..Singleton()
        - Method Pipelet..Compose()
    */
    Multiton: function Multiton( name, multiton, composition, instances_scope ) {
      var options = { union: true };
      
      options[ singleton_s       ] = multiton;
      options[ instances_scope_s ] = instances_scope;
      
      return this.Compose( name, options, composition )
    }, // Pipelet..Multiton()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..set_reference( name, scope )
        
        @short Records reference to *this* pipelet by name in scope
        
        @parameters
        - **name** \\<String>: unique name throughout scope or application
          to record reference.
        
        - **scope** \\<Object>: optional scope for name. Default
          is the global scope.
        
        @returns
        - \\<Pipelet>: *this*, allowing to connect a downstream pipelet
          immediately.
        
        @examples
        ```javascript
          // define a scope Object
          // this is recommended, if undefined, will use the global scope
          var scope = {};
          
          require( "toubkal" )
            
            .set( [] )
            
            // Record "my set" as a reference to the above set pipelet
            .set_reference( "my set", scope )
            
            .alter( function( _ ) { /* do something *\/ } )
            
            // forget alter reference, recall "my set" reference
            .reference( "my set", scope )
            
            .trace( "my set" )
            
            .greedy()
          ;
        ```
        
        Which is an alternative to using JavaScript variables:
        ```javascript
        var my_set = require( "toubkal" )
          
          .set( [] )
        ;
        
        my_set
        
          .alter( function( _ ) { /* do something *\/ } )
        ;
        
        my_set
        
          .trace( "my set" )
          
          .greedy()
        ;
        ```
        
        @description
        This is an alternative styling method to using JavaScript variables
        when writing Toubkal @@pipeline\s.
        
        It allows to write pipelines without interrupting them to store
        and recall intermediate references in JavaScript variables.
        
        Use *set_reference()* to set a reference for the current pipelet
        that can be retrieved using method Pipelet..reference().
        
        Unless a scope is provided, references are global, shared
        throughout the entire process. As such they can be used to share
        references between modules of the application.
        
        To avoid collisions, it is recommended to either use a scope Object
        or prefix names with the name of the module where they are
        defined.
        
        Throws an error when attenting to set a reference using a name
        more than once in the same scope.
        
        The scope Object contains all references, keys are recorded
        names and values are references. Keys can be deleted after use
        without affecting prior uses.
    */
    set_reference: function set_reference( name, scope ) {
      var that = this;
      
      scope = scope || that[ _scope_s ];
      
      scope[ name ]
        && that._emergency( 'set_reference', 'already set, name: ' + name )
      ;
      
      return scope[ name ] = that
    }, // Pipelet..set_reference()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..set_output()
        
        @short Deprecated alias to method Pipelet..set_reference()
    */
    set_output: function( name, scope ) {
      return this.set_reference(  name, scope )
    }, //  Pipelet..set_output()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..reference( name, scope )
        
        @short Recalls pipelet reference by name in scope
        
        @parameters
        - **name** \\<String>: name of the reference to recall
        
        - **scope** \\<Object>: optional scope of name. Default is the
          global scope.
        
        @returns
        - \\<Pipelet>: Recalled pipelet reference
        
        @examples
        See example for method Pipelet..set_reference().
        
        @description
        Recalls reference initially recorded using
        method Pipelet..set_reference().
        
        Throws an Error when name is not found scope.
    */
    reference: function reference( name, scope ) {
      return ( scope || this[ _scope_s ] )[ name ]
        || this._emergency( 'reference', 'not set, name: ' + name )
    
    }, // Pipelet..reference()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..output()
        
        @short Deprecated alias to method Pipelet..reference()
    */
    output: function( name, scope ) {
      return this.reference( name, scope )
    }, // Pipelet..output()
    
    // Global RS object, the dictionary of all Toubkal Pipelet Programmer classes
    RS: RS
  } ); // Pipelet instance methods
  
  function operation_transform( that, operation, values, options ) {
    var transform = that.__transform;
    
    // Note: does not work for updates yet, only adds and removes
    transform
      ? transform.length > 1
        ? transform.call( that, values, emit, operation, options ) // assynchronous
        : emit( transform.call( that, values ) ) // synchronous
      : emit( values ) // no-transform, synchronous stateless
    
    function emit( operations ) {
      if ( is_array( operations ) ) {
        // these are values
        var t;
        
        if ( operations.length || options && ( t = options._t ) && ! t.more )
          that._output.emit( operation, operations, options )
      
      } else {
        // operations to emit
        // may be called multiple times per operation in which case transform must manage transaction options
        that.__emit_operations(
          operations.added,
          operations.removed,
          operations.updates,
          operations.options
        )
      }
    } // emit()
  } // operation_transform()
  
  var pipelet_identity = Pipelet[ prototype_s ]._identity;
  
  /* --------------------------------------------------------------------------
      @function assert_scope( output )
      
      @short Asserts if output has a non-null _scope attribute
      
      @parameters:
      - output (Pipelet): the output expected to have a non-null _scope attribute
      
      @throws if output does not have a non-null _scope attribute
      
      @manual internal
  */
  function assert_scope( output ) {
    if ( output[ _scope_s ] ) return output;
    
    throw new Error( 'no scope, output: ' + get_name( output ) );
  } // assert_scope()
  
  /* --------------------------------------------------------------------------
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
  function create_namespace( pipelet, name, is_repository ) {
    var parent_scope
      , parent_namespace = pipelet && ( parent_scope = pipelet[ _scope_s ] )[ _namespace_s ]
    ;
    
    Loggable.subclass.call( parent_namespace ? parent_namespace[ constructor_s ] : Pipelet, 'Namespace.' + name, Namespace );
    
    var namespace = new Namespace();
    
    de&&ug( 'create_namespace: ', Object.keys( namespace[ constructor_s ].class_names ) );
    
    return namespace;
    
    function Namespace() {
      var that   = this
        , scope  = that[ _scope_s ] = Object.create( parent_scope || null ) // add to scope to scope tree
        , Namespace_prototype = Namespace[ prototype_s ]
      ;
      
      scope[ _namespace_s ] = that;
      scope[ _mixin_s     ] = mixin;
      
      // This is not a real pipelet, we're only interested the repository of all defined pipelets
      // in Pipelet.prototype and parents' Namespace.prototype
      Loggable.call( that, name );
      
      // This is a null source, see Input..add_source(), Input..remove_source()
      that._output = { pipelet: that, is_namespace: true },
      
      that[ _add_factory_s ] = add_factory;
      
      function add_factory( name, factory ) {
        de&&ug( get_name( that, _add_factory_s ), name );
        
        return is_repository
          ? Namespace_prototype[ name ] = factory : parent_namespace
          ? parent_namespace[ _add_factory_s ]( name, factory )
          : Pipelet[ prototype_s ][ name ] = factory
        ;
      } // add_factory()
      
      function mixin( pipelet ) {
        // scope is already set on pipelet
        if ( parent_namespace ) { // not rs, the root namespace, which is using Pipelet, and is always visible
          // Copy this namespace' factories into pipelet
          // Do not copy parent's factories, users' can do this by explicitly calling mixin() on parents
          for ( var p in Namespace_prototype ) {
            if ( p != constructor_s && Namespace_prototype.hasOwnProperty( p ) ) {
              de&&ug( get_name( that, _mixin_s ) + 'property:', p );
              
              pipelet[ p ] = Namespace_prototype[ p ];
            }
          }
        }
        
        return pipelet;
      } // mixin()
    } // Namespace()
  } // create_namespace()
  
  /* --------------------------------------------------------------------------
      @namespace rs
      
      @short Root @@namespace for all @@[pipelines]pipeline
      
      @description:
      The rs object is the mandatory root of all @@[pipelines](pipeline).
      
      It does not count as a source of the first @@pipelet in the pipeline
      to allow later assignement of a source using
      @@[through()](method:Pipelet..through).
      
      @examples:
      - Watch a file:
        
        ```javascript
          rs
            .set( [ { path: 'index.html' } ] )
            
            .watch()
          ;
        ```
      
      - Watch a file, same thing, using through() for deffered assignement of source.
      
        ```javascript
          // Create a watcher instance with no source
          var watcher = rs.watch();
          
          // Use watcher as a destination for an upstream set:
          rs
            .set( [ { path: 'index.html' } ] )
            
            .through( watcher )
          ;
        ```
      
      @see_also:
      - @@method:Pipelet..namespace()
      - @@method:Pipelet..create_namespace()
      - @@method:Pipelet..is_namespace()
      - @@method:Pipelet..log_namespace()
      - @@method:Pipelet..set_namespace()
  */
  // ToDo: make rs a true namespace as a base class to pipelet
  var rs = create_namespace( null, 'root' );
  
  /* ===========================================================================================
      Pipelet Class attributes and methods
     =========================================================================================== */
  
  /* --------------------------------------------------------------------------
      @class_method Pipelet.safe_identity_code( key )
      
      @short Get safe evaluation code to calculate value @@identity from @@key
      
      @parameters
      - **key** (Array of Strings): must provide at least one value or
        default key ```[ "id" ]``` is used.
      
      @return
      (String): safe code for evaluation
      
      @examples
      ```javascript
      Pipelet.safe_identity_code( [ 'author', 'year' ]; // "#" + o.author + "#" + o.year
      
      Pipelet.safe_identity_code();    // "#" + o.id
      Pipelet.safe_identity_code( [] ) // "#" + o.id
      Pipelet.safe_identity_code( {} ) // "#" + o.id
      
      Pipelet.safe_identity_code( [ "unsafe string \\\\\\\\" ] ) // "#" + o[ "unsafe string \\\\\\\\\\\\\\\\" ]
      ```
      
      @description
      Used by @@method:Pipelet.._identity() to generate safe identity code.
      
      Evaluated code produces strings that always start with the #
      character.
      This is part of the API and will not change without serious
      consideration and notice.
      
      Note that identity parts may also contain # characters that may
      confuse a parser of these identity strings. It is therefore
      dangerous and not supported to parse these identity strings
      assuming # as a separator of identity parts. Beyond the first
      pound, identity strings should be considered opaque strings.
  */
  Pipelet.safe_identity_code = safe_identity_code; 
  
  function safe_identity_code( key ) {
    var plus   = ' + '
      , prefix = '"#"' + plus // !!! Do not change prefix, this is part of the API
    ;
    
    return prefix
    
        + ( is_array( key ) && key.length ? key : [ 'id' ] )
          
          // ToDo: add tests for safety against code injection attempts
          .map( function( attribute ) {
            return 'o' + safe_dereference( attribute )
          } )
          
          .join( plus + prefix )
  }; // Pipelet.safe_identity_code()
  
  /* --------------------------------------------------------------------------
      @class_method Pipelet.Build( name, constructor [, methods [, namespace ] ] )
      
      @short creates a new Pipelet class
      
      @description:
      Pipelet builder:
      - Makes constructor a subclass of This class using This.subclass()
      - Adds methods to constructor's prototype, if any
      - Adds pipelet into repository, either global of that of optional
      @@namespace
      
      @parameters:
      - name         : (String) the name of the pipelet
      
      - constructor  : (Function) a Pipelet constructor which signature is:
        - parameters : 0 to n required parameters either Pipelet instances
        or non-objects (numbers, strings, functions, booleans, null,
        undefined)
        
        - options    : (object) optional parameters, will extend default
        options
      
      - methods      : optional parameter
        - (Object)   : methods for the constructor's class
        - (Function) : returning a method Object, see Pipelet.subclass()
      
      - namespace (@@namespace): optional namespace to add pipelet into.
      Default is @@namespace:rs\. 
      
      @returns added pipelet factory function with the following attribute:
      - singleton (Function ( Function || true, instances_scope ) ->):
      modifier to make pipelet a singleton or a multiton.
      
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
      
      @see_also:
      - @@class_method:Pipelet.Add()
      - @@method:Pipelet..Compose()
      - @@method:Pipelet..Singleton()
      - @@method:Pipelet..Multiton()
  */
  Pipelet.Build = function( name, constructor, methods, namespace ) {
    this.subclass( capitalize( name ), constructor, methods );
    
    return Pipelet.Add( name, pipelet_factory, namespace );
    
    function pipelet_factory( source, a ) {
      set_default_options( constructor, source, a, { name: name } );
      
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
  
  /* --------------------------------------------------------------------------
      @class_method Pipelet.Add( name, pipelet_factory [, namespace ] )
      
      @short Add pipelet factory to Pipelet base class' methods.
      
      @parameters:
      - name (String): the name of the pipelet abiding by the following
      constraints:
        - (enforced) not already used by another pipelet or a Pipelet
        attribute
        - (enforced) is at least 5 characters long
        - (enforced) starts with at least two lower-case letter
        - (enforced) all letters after first are lower-case letters or digits
        or underscore
        - (recommanded) starts with the unique domain name followed by "_"
      
      - pipelet_factory (Function): factory function to instanciate pipelets,
      signature is ( Pipelet source, Array parameters ) -> Pipelet
      
      - namespace (@@namespace): optional namespace to add pipelet into,
      default is @@namespace:rs\.
      
      @returns: (Function), added factory function with the following
      attribute:
      - singleton (Function ( Function, instances_scope ) -> undefined):
      modifier to make pipelet a singleton. See
      @@method:Pipelet..Compose() for details.
      
      @throws:
      - if name violates one of the enforced constraints.
      - if pipelet_factory() does not accept exactly 2 parameters
      
      @see_also:
      - @@class_method:Pipelet.Build()
      - @@method:Pipelet..Compose()
      - @@method:Pipelet..Singleton()
      - @@method:Pipelet..Multiton()
  */
  Pipelet.Add = function( name, pipelet_factory, namespace ) {
    namespace = namespace || rs;
    
    fatal( Pipelet.Check_Name( name, namespace ) );
    
    pipelet_factory.length == 2
      || fatal( ', pipelet_factory() must have exactly 2 parameters' )
    ;
    
    de&&ug( 'Pipelet.Add(): name: ', name, ', namespace:', Object.keys( namespace[ constructor_s ].class_names ) );
    
    var _factory = pipelet_factory;
    
    factory[ singleton_s ] = singleton;
    
    return namespace[ _add_factory_s ]( name, factory );
    
    function factory() {
      var parameters = slice.call( arguments, 0 );
      
      de&&ug( 'instantiate pipelet ' + name + '(), parameters count: ' + parameters.length );
      
      return _factory( this, parameters ).set_namespace( this );
    } // factory()
    
    // singleton modifier, makes pipelet a singleton (one instance)
    function singleton( get_instance_name, instances_scope ) {
      var multiton                = typeof get_instance_name == function_s
        , singleton_or_multiton_s = multiton ? multiton_s : singleton_s
      ;
      
      _factory = singleton_factory;
      
      de&&ug( name + '() is now a', singleton_or_multiton_s );
      
      function singleton_factory( source, parameters ) {
        var scope          = instances_scope || source[ _scope_s ]
          , instance_name  = name
          , instance_names
          , pipelet
        ;
        
        if ( multiton ) {
          instance_names = get_instance_name.apply( source, parameters );
          
          instance_name
            = [ instance_name ]
            .concat( is_array( instance_names ) ? instance_names : [ instance_names ] )
            .join( '#' )
          ;
        }
        
        pipelet = scope[ instance_name ];
        
        de&&ug( singleton_or_multiton_s
          , name + '(),'
          + ( multiton ? ' instance name: ' + instance_name : '' )
          + ( !pipelet ? ' not' : '' )
          , 'found in', scope._namespace.__options.name
        );
        
        // ToDo: allow pipelet_factory() to return null or undefined
        return assert_scope( pipelet
          ? source.through( pipelet )
          : scope[ instance_name ] = pipelet_factory( source, parameters )
        );
      } // singleton_factory()
    } // singleton()
    
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
        - is at least 4 characters long
        - starts with an optional "$",
        - followed by a lower-case letter
        - followed by lower-case letters, digits, or underscores
      
      - namespace (Namespace): to check name into
      
      @returns:
      - undefined: name is authorized
      - String: not authorized cause
      
      @manual internal
  */
  var authorized_names = [
    'map', 'set', '$on'
  ];
  
  Pipelet.Check_Name = function check_name( name, namespace ) {
    if ( namespace[ constructor_s ][ prototype_s ][ name ] )
      return 'is already defined'
    ;
    
    if ( authorized_names.indexOf( name ) == -1 ) { // not a core-authorized name
      if ( name.length < 4 )
        return 'must be at least 4 characters long'
      ;
      
      if ( ! /^\$?[a-z][0-9a-z_]+$/.test( name ) )
        return 'must start with an optional "$", then one lower-case letter, followed by lower-case letters or digits or "_"'
      ;
    }
  }; // Pipelet.Check_Name()
  
  /* --------------------------------------------------------------------------
      @class_method Pipelet.set_default_options( constructor, source, parameters, defaults )
      
      @short Sets default options for pipelet parameters.
      
      @parameters
      - **constructor** (Function): Pipelet constructor or composition function
        which last parameter must always be options but may be named anything
        (especially once minified).
        
        This constructor may have a ```"default_options"``` property which can
        be defined as:
        - (Object): Default options object.
        - (Function): Default options function called with ```"parameters"```
          returning default options. The function is called in the context of
          the ```constructor``` parameter.
      
      - **source** (@@class:Pipelet\): source pipelet.
      
      - **parameters** (Array): from pipelet invocation, the last of which is
        considered *options* if is at the same position as the *options*
        parameter of constructor ```( constructor.length - 1 )```. If present,
        the *options* parameter is always shallow-copied.
      
      - **defaults** (Object): other default options, used by
        @method:Pipelet..Compose() and @@class_method:Pipelet.Build() to
        provide the default name attribute for the pipelet.
      
      @throws
      (Error):
      - expected function or object for default_options
      - too many parameters
      - expected last parameter to be an options object
      
      @description
      Mutates parameters with added or modified and shallow-copied options.
      
      The position of options in parameters is set as
      ```( constructor.length - 1)```. This works only if the options
      parameter is specified in the constructor function and if a minifier
      has not removed it. It also means that pipelets have a fixed number
      of parameters, using options to provide optional parameters.
      
      Options are always shallow-copied, allowing pipelets to shallow-mutate
      options parameter value safely.
      
      The priority of modified options is as follows, highest priority first:
      1) options provided by pipelet user
      2) constructor.default_options
      3) defaults parameter
      4) ```{ source_key: source._key }```
      5) ```{ source_key: [ 'id' ] }```
      
      If parameters does not provide options for the pipelet or if its
      ```"name"``` attribute is not defined, attempts to locate the filename
      and position of the initiator in the stack trace. This works in Chrome
      and helps debugging unnamed pipelets. More tests are needed to
      verify that this works in other browsers and node.
      
      @tests
      set_default_options() has a full test suite in test/src/pipelet.coffee
      verifying all features of this documentation.
  */
  var set_default_options_s = 'set_default_options'
    , toubkal_frame_signature = RS.in_browser && typeof sourceMapSupport == 'undefined' ? 'lib/toubkal-min.js' : 'pipelet.js'
  ;
  
  Pipelet[ set_default_options_s ] = set_default_options;
  
  function set_default_options( constructor, source, parameters, defaults ) {
    var default_options        = constructor.default_options
      , constructor_length     = constructor.length
      , typeof_default_options = typeof default_options
      , options                = extend_2( { source_key: source._key || [ 'id' ] }, defaults )
      , parameters_length      = parameters.length
      , last_parameter         = parameters[ parameters_length - 1 ]
      , typeof_last_parameter  = typeof last_parameter
      , name                   = set_default_options_s + '(' + ( defaults ? ' "' + defaults.name + '" ' : '' ) + '), '
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
      && fatal( 'too many parameters, expected ' + constructor_length + ' parameters max, got ' + parameters_length )
    ;
    
    if ( parameters_length == constructor_length && last_parameter != null ) {
      typeof_last_parameter != 'object'
        && fatal( 'expected last (' + ordinal( parameters_length ) + ') parameter to be an options object, got ' + typeof_last_parameter )
      ;
      
      extend_2( options, last_parameter );
      
      // ToDo: do not call name_after_caller_location() in production, this slows-down load-times significantly
      last_parameter.name || name_after_caller_location()
    } else {
      name_after_caller_location();
    }
    
    parameters[ constructor_length - 1 ] = options;
    
    // de&&ug( name + 'options:', options );
    
    function name_after_caller_location() {
      var stack = RS.stack()
        , i     = 3
        , frame
      ;
      
      if ( stack.length ) {
        // lookup first frame not containing toubkal_frame_signature
        while( ( frame = stack[ ++i ] || '' ) && frame.indexOf( toubkal_frame_signature ) > 0 );
        
        // get last three components of path at most
        frame = frame.split( '/' );
        
        i = frame.length - 3;
        
        if ( i > 0 ) frame = frame.slice( i );
        
        frame = frame.join( '/' );
        
        // Append (in parenthesis) to options.name
        if ( frame.charAt( frame.length - 1 ) != ')' ) frame += ')'; // Note: V8 frames include a trailing ')'
        
        options.name += ' (' + frame;
      }
    } // name_after_caller_location()
    
    function fatal( message ) {
      throw new Error( name + message );
    } // fatal()
    
    function ordinal( n ) {   
      return n + ( [ '', 'st', 'nd', 'rd' ][ n ] || 'th' );
    } // ordinal()
  } // Pipelet.set_default_options()
  
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
  function set_pipelet_operations( Pipelet_Class, f ) {
    operations.forEach( function( event_name ) {
      Pipelet_Class[ prototype_s ][ '_' + event_name ] = f( event_name );
    } );
  } // set_pipelet_operations()
  
  /* --------------------------------------------------------------------------
      @pipelet encapsulate( input, output, options )
      
      @short Encapsulate input and output pipelets into a pipelet
      
      @parameters
      - input  (Pipelet): the input pipelet of the pipeline to encapsulate
      - output (Pipelet): the output pipelet of the pipeline
      - options (Object): pipelet options except @@key which is forced
        to that of output:
        - name (String): degugging name
      
      @examples
      - Compose aggregate_from() as an encapsulated single pipelet:
      
        ```javascript
        rs.Compose( 'aggregate_from', function( source, from, measures, dimensions, options ) {
          var input  = source.namespace().filter( from, options )
            , output = input.aggregate( measures, dimensions, options )
          ;
          
          return source
            .encapsulate( input, output, options )
          ;
        } )
        ```
        
      - Or using option ```"union"``` of @@method:Pipelet..Compose() which
        encapsulates the composition with an input pipelet union():
      
        ```javascript
        rs.Compose( 'aggregate_from', { union: true }, function( source, from, measures, dimensions, options ) {
          return source.namespace()
            .filter( from, options )
            .aggregate( measures, dimensions, options )
          ;
        ```
      
      @description
      A pipelet to group a pipeline into a single pipelet which input
      operations are redirected to the 'input' pipelet and where output
      methods are redirected to the 'output' pipelet.
      
      This is typically used with Compose() to allow access to the input
      of a composition.
      
      ### Implementation
      This implementation assigns the _input plug of the encapsulated
      pipelet to the _input plug of the input pipelet, and its _output
      plug to the _output plug of the output pipelet.
      
      Then it redirects input operations methods to the input pipelet.
      
      To prevent silent bugs, methods that should never be called are
      redirected to null to trigger exceptions as early as possible.
      
      The table bellow shows all pipelet's methods redirections:
      
      Pipelet Method      |   Redirection  | Notes
      --------------------|----------------|----------------------------
      Input methods:      |                |
      _notify             | this --> input | This method is deprecated
      _add                | this --> input |
      _remove             | this --> input |
      _update             | this --> input |
      _clear              | this --> input | This method is deprecated
                          |                |
      State methods:      |                |
      __transform         |     null       | Called by _add(), _remove(), _update(), _fetch() receiver
      __emit_add          |     null       | Called by _add(), _remove(), and _update()
      __emit_remove       |     null       | Called by _add(), _remove(), and _update()
      __emit_update       |     null       | Called by _add(), _remove(), and _update()
      __emit_clear        |     null       | Called by _add(), _remove(), and _update()
      __emit_operations   |     null       | Called typically by an operation implementation
                          |                |
      Output methods:     |                |
      _fetch_all          |     none       | Redirected by Pipelet to _output.fetch_all
      __emit              |     none       | Redirected by Pipelet to _output.emit
      _on                 |     none       | Redirected by Pipelet to _output.on
                          |                |
      API methods:        |                |
      add                 |     none       | Redirected by Pipelet to _input.listen
      remove              |     none       | Redirected by Pipelet to _input.listen
      update              |     none       | Redirected by Pipelet to _input.listen
      fetch               |     none       | Redirected by Pipelet to _output._fetch
      update_subscriptions|     none       | Redirected by Pipelet to _output.update_upstream_query
      on                  |     none       | Redirected by Pipelet to _output.on
  */
  function Encapsulate( input, output, options ) {
    var that = this;
    
    that._input  = input._input;
    that._input_pipelet = input;
    
    that._output_pipelet = output;
    that._output = output._output;
    
    Pipelet.call( that, extend( {}, options, { key: output._key } ) );
    
    that[ _scope_s ] = output[ _scope_s ];
  } // Encapsulate()
  
  Pipelet.Build( 'encapsulate', Encapsulate, {
    // Input operations
    _notify: function( transaction, options ) {
      this._input_pipelet._notify( transaction, options );
    },
    
    _add: function( values, options ) {
      this._input_pipelet._add( values, options );
    },
    
    _remove: function( values, options ) {
      this._input_pipelet._remove( values, options );
    },
    
    _update: function( updates, options ) {
      this._input_pipelet._update( updates, options );
    },
    
    _clear: function( options ) {
      this._input_pipelet._clear( options );
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
  
  /* --------------------------------------------------------------------------
      @pipelet query_updates( from, options )
      
      @short Emit query updates from pipelet output
      
      @parameters
      - from (@@class:Pipelet\): which @@class:Output receives query updates
        with @@method:Plug..update_upstream_query() or
        @@method:Plug.._fetch().
      
      - options (Object): @@class:Pipelet options
      
      @examples
      - A multi-flow reactive cache (stateful and lazy):
      
        ```javascript
        rs.Compose( 'cache', function( source, options ) {
          var rs  = source.namespace()
            , set = rs.set( [], { key: [ 'flow', 'id' ] } )
          ;
          
          return source
            .filter( rs.query_updates( set ), options )
            
            .through( set )
          ;
        } ) // cache()
        ```
      
      ### Using
      - Pipelet filter()
      - Pipelet set()
      - Method Pipelet..through()
      
      @description
      Allows to create caches and complex lazy pipelines, i.e. pipeline
      built from downstream subscriptions such as lazy authorizations.
      
      This is a @@synchronous, @@stateless, @@lazy pipelet.
      
      Emits adds and removes on ```from._output``` query updates by
      hijacking its @@method:Plug..update_upstream_query() and
      @@method:Plug.._fetch().
      
      Restores original @@method:Plug..update_upstream_query() and
      @@method:Plug.._fetch()  when its output is disconnected from all
      destinations, i.e. when its output method Output.._remove_destination()
      emits event ```"disconnected"```.
      
      There is currently no way to hijack again these methods once they
      have been restored other than instanciating a new query_updates()
      pipelet, and discarding the previous.
      
      ### See Also
      - Pipelet cache()
      - Pipelet database_cache()
      - Method Plug..update_upstream_query()
      - Method Output.._remove_destination()
      
      ### Wish List
      - ToDo: hijack fetch to allow assynchronous fetching on initial fetches
  */
  function Query_Updates( from, options ) {
    var that   = this
      , output = from._output
      , original_update_upstream_query = output.update_upstream_query
      , original_fetch                 = output._fetch
    ;
    
    output.update_upstream_query = update_upstream_query;
    output._fetch                = fetch;
    
    Pipelet.call( that, options );
    
    // log( get_name( that ), 'output:', get_name( output ) )
    
    that._output.once( 'disconnected', function() {
      // log( get_name( that, 'disconnected' ) + 'output:', get_name( that._output ) );
      
      output.update_upstream_query = original_update_upstream_query;
      output._fetch                = original_fetch;
    } );
    
    function update_upstream_query( changes, destination ) {
      original_update_upstream_query.call( output, changes, destination );
      
      update_query( changes, destination );
    } // update_upstream_query()
    
    function fetch( receiver, query, query_changes, destination, _query_changes ) {
      original_fetch.call( output, receiver, query, query_changes, destination, _query_changes );
      
      // ToDo: shouldn't update_query() be called when fetch completes, which would require ordering?
      query_changes && update_query( query_changes, destination );
    } // fetch()
    
    function update_query( changes, destination ) {
      var removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , rl      = removes.length
        , al      = adds   .length
        
        , t
        , remove_options
        , add_options
      ;
      
      // log( get_name( that, 'update_query' ) + 'to:', get_name( destination ), removes, adds );
      
      if ( rl && al ) {
        // Create transaction
        t = that._transaction( 2, {} );
        
        remove_options = t.next_options();
           add_options = t.next_options();
      }
      
      rl && that._remove( removes, remove_options );
      al && that._add   ( adds   ,    add_options );
    } // update_query()
  } // Query_Updates()
  
  Pipelet.Build( 'query_updates', Query_Updates );
  
  /* --------------------------------------------------------------------------
      @pipelet pass_through( options )
      
      @short Semantically-neutral pipelet
      
      @parameters:
      - options (Object): @@class:Pipelet options.
      
      @examples:
      ```javascript
        var tmp = rs.pass_through()
        
        rs
          .loop( tmp )
          .through( tmp )
        ;
      ```
      
      @description:
      A pass_through() pipelet forwards its upstream operations downstream
      without any change.
      
      It can be used:
      - As a temporary pipelet variable in situations where the graph
        has cyclic dependencies.
      - To join dataflows comming for an @@upstream @@controllet chain,
        such as pipelet union().
      
      This is a @@stateless, @@synchronous, @@lazy pipelet.
  */
  function Pass_Through( options ) {
    Pipelet.call( this, options );
  } // Pass_Through()
  
  Pipelet.Build( 'pass_through', Pass_Through );
  
  set_pipelet_operations( Pass_Through, function( event_name ) {
    return function( values, options ) {
      return this.__emit( event_name, values, options );
    };
  } );
  
  /* --------------------------------------------------------------------------
      @class Controllet( options )
      
      @short Base class for optimized controllets.
      
      @description
      A controllet is a @@pipelet such @@pipelet:union() that does not
      modify data and therefore does not need to process data operation
      events such as add, remove, update, and clear.
      
      A controllet only processes queries to update upstream query trees.
      
      The Controllet class allows to build optimized controllets that
      updates its sources' class Query_Tree() outputs to point directly
      at destinations' inputs.
      
      This allows controllets to get out of the data events path,
      improving performances, both CPU-wise and memory-wise because
      controllets do not need Query_Trees. Source query trees are more
      involved as they handle all destination pipelets of their
      downstream controllets, resulting in better overall performances.
      
      Controllets can be chained, redirecting traffic between a source
      and destinations across several controllets:
      
      ```
                     <--- fetch && queries updates <---
      
         .--- controllet 1 <---- controllet 2 <---- controllet 3 <---.
         |                                                           |
         |                                                           |
         v                                                           |
      source ------------------------------------------------> destination(s)
                      ---> data operation events --->
      ```
      
      Eventually, Controllets could run on separate servers while
      controlling data event traffic between other groups of servers,
      preventing the routing of data through intermediate servers.
      
      The first, and only so far, implemented controllet is
      pipelet union().
      
      ### Exceptions
      - Attempting to call _add(), _remove(), _update(), or _clear() on
        a controllet will throw an error
  */
  function Controllet( options ) {
    var that = this
      , name = options && options.name
    ;
    
    that._input  || ( that._input  = new Controllet_Input ( that, name, options ) );
    that._output || ( that._output = new Controllet_Output( that, options ) );
    
    Pipelet.call( that, options );
  } // Controllet()
  
  Pipelet.subclass( 'Controllet', Controllet );
  
  set_pipelet_operations( Controllet, function( event_name ) {
    return function method() {
      this._emergency(
        'controllet ' + get_name( this ) + ' does not process events, attempted: ' + event_name
      );
    };
  } );
  
  /* --------------------------------------------------------------------------
      @class Controllet.Input( pipelet, name, options, input_transactions )
      
      @short Input for class Controllet()
      
      @description
      Controllet inputs are responsible for routing class Input() methods
      to all destinations of this controllet.
  */
  function Controllet_Input( p, name, options, input_transactions ) {
    Input.call( this, p, name, options, input_transactions );
  }
  
  var route_to_destinations_s = 'route_to_destinations';
  
  Controllet.Input = Input.subclass(
    'Controllet.Input', Controllet_Input, {
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input..is_lazy()
        
        @short Determine if this controllet input is @@lazy or not
        
        @returns
        - (Boolean):
          - true: this input is lazy
          - false: this input is not lazy
        
        @description:
        Because @@Controllet.Output..update_upstream_query() forwards query
        updates directly to source, input query is not updated and cannot be
        used to evaluate if input is lazy or not.
        
        This method calls method Input..is_lazy() on all destinations to
        determine if this controllet input itself is lazy or not.
        
        If one or more destination input is not lazy then this controllet
        input is not lazy.
        
        If all destinations inputs are lazy then this controllet input
        is lazy.
    */
    is_lazy: function() {
      var that         = this
        , name         = de && get_name( that, 'is_lazy' )
        , destinations = that.pipelet._output.destinations
        , i            = -1
        , input
      ;
      
      while( input = destinations[ ++i ] ) {
        if ( input.is_lazy() ) continue; // if also a controllet, will check all its destinations
        
        de&&ug( name + 'destination: ' + get_name( input ) + ' is not lazy' );
        
        return false;
      }
      
      de&&ug( name + 'all destinations are lazy' );
      
      return true;
    }, // Controllet.Input..is_lazy()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input..route_to_destinations( method_name, parameters, then )
        
        @short Routes a method call to all controllet destination inputs.
        
        @parameters
        - **method_name** (String): name of routed method
        - **parameters** (Array): parameters of method
        - **then** (Function): optional, called when all destinations have
        called their *then* parameter which must be the last parameter
        but should not be provided with *parameters*.
        
        @returns this
        
        @description
        
        This method routes the following methods:
        - @@method:Controllet.Input..set_tag()
        - @@method:Controllet.Input.._inject_branches()
        - @@method:Controllet.Input.._extract_branches()
        - @@method:Controllet.Input..add_branches()
        - @@method:Controllet.Input.._transactions_remove_source()
        - @@method:Controllet.Input.._add_source_subscription()
        - @@method:Controllet.Input.._remove_source_subscription()
    */
    route_to_destinations: function( method_name, parameters, then ) {
      var that         = this
        , destinations = that.pipelet._output.destinations
        , count        = destinations.length
        , name         = de && get_name( that, method_name )
        , i            = -1
        , input
      ;
      
      de&&ug( name + 'routed to ' + count + ' destinations' );
      
      if( then )
        count ? parameters.push( _then ) : then()
      ;
      
      while( input = destinations[ ++i ] ) {
        de&&ug( name + 'to destination: ' + get_name( input ) );
        
        input[ method_name ].apply( input, parameters );
      }
      
      return that;
      
      function _then() {
        --count || then()
      }
    }, // Controllet.Input..route_to_destinations()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input..set_tag( tag )
        
        @short Route to all destinations method Input..set_tag()
        
        @description
        Also sets ```this.tag``` to ```tag``` parameter if defined so that
        it can be used by method Controllet.Output.._add_destination() to
        forward this tag.
        
        See method Controllet.Input..route_to_destinations() which routes
        this method to all destinations.
    */
    set_tag: function( tag ) {
      tag && this[ route_to_destinations_s ]( 'set_tag', [ this.tag = tag ] )
    }, // Controllet.Input..set_tag()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._inject_branches( output, _t, branches, injected_branches )
        
        @short Route to all destinations method Input.._inject_branches()
        
        @description
        See method Controllet.Input..route_to_destinations() which routes
        this method to all destinations.
    */
    _inject_branches: function( output, _t, branches, injected_branches ) {
      
      return this[ route_to_destinations_s ]( '_inject_branches', [ output, _t, branches, injected_branches ] )
    }, // Controllet.Input.._inject_branches()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._extract_branches( source, tid, branches )
        
        @short Route to all destinations method Input.._extract_branches()
        
        @description
        See method Controllet.Input..route_to_destinations() which routes
        this method to all destinations.
    */
    _extract_branches: function( source, tid, branches ) {
      
      return this[ route_to_destinations_s ]( '_extract_branches', [ source, tid, branches ] )
    }, // Controllet.Input.._extract_branches()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input..add_branches( count )
        
        @short Route to all destinations method Input..add_branches()
        
        @description
        Also adds parameter ```count```, which may be negative, to
        ```this.branches```.
        
        See method Controllet.Input..route_to_destinations() which routes
        this method to all destinations.
    */
    add_branches: function( count ) {
      this.branches += count; // ToDo: DRY with Input..add_branches()
      
      // de&&ug( get_name( this, 'add_branches' ) + 'routing adding ' + count + ' branches, new total:', this.branches );
      
      return this[ route_to_destinations_s ]( 'add_branches', [ count ] );
    }, // Controllet.Input..add_branches()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._transactions_remove_source( source )
        
        @short Route to all destinations method Input.._transactions_remove_source()
        
        @description
        
        See method Controllet.Input..route_to_destinations() which routes
        this method to all destinations.
    */
    _transactions_remove_source: function( source ) {
      
      return this[ route_to_destinations_s ]( '_transactions_remove_source', [ source ] );
    }, // Controllet.Input.._transactions_remove_source()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._add_source_subscription( source, options, then )
        
        @short Route to all destinations method Input.._remove_source_subscription()
        
        @description
        
        See method Controllet.Input..route_to_destinations() which routes
        this method to all destinations.
    */
    _add_source_subscription: function( source, options, then ) {
    
      return this[ route_to_destinations_s ]( '_add_source_subscription', [ source, options ], then );
    }, // Controllet.Input.._add_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._remove_source_subscription( source, options, then )
        
        @short Route to all destinations method Input.._remove_source_subscription()
        
        @description
        
        See method Controllet.Input..route_to_destinations() which routes
        this method to all destinations.
    */
    _remove_source_subscription: function( source, options, then ) {
    
      return this[ route_to_destinations_s ]( '_remove_source_subscription', [ source, options ], then );
    } // Controllet.Input.._remove_source_subscription()
  } ); // Controllet.Input instance attributes
  
  /* --------------------------------------------------------------------------
      @class Controllet.Output( pipelet, name )
      
      @short Output for class Controllet()
      
      @description
      Controllet outputs route class Output() methods to the source of this
      controllet.
  */
  function Controllet_Output( p, options ) {
    Output.call( this, p, options )
  }
  
  Controllet.Output = Output.subclass(
    'Controllet.Output', Controllet_Output, function( Super ) { return {
    
    /* ------------------------------------------------------------------------
        @method Controllet.Output..branches_count()
        
        @short Reports the number of branches this controllet provides.
        
        @returns count (Integer): the number of branches of this controllet's source.
        
        @description
        Conrollets report the number of branches their inputs have, because these inputs
        correspond to the number of branches redirected to downstream pipelets. If some of
        these inputs are also controllets, they report their branches count using this same
        method.
        
        Controllets may have zero branch, when they have no connected input.
    */
    branches_count: function() {
      // A controllet output has as many branches as the input of its pipelet
      return this.source.branches;
    }, // Controllet.Output..branches_count()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Output.._add_destination( input )
        
        @short Forwards class Controllet.Input() @@tag @@downstream
        
        @returns this
        
        @description
        Sets @@tag of paramenter ```input``` to this controllet input tag as
        set by method Controllet.Input..set_tag().
        
        Then calls method Output.._add_destination().
    */
    _add_destination: function( input ) {
      input.set_tag( this.source.tag );
      
      return Super._add_destination.call( this, input );
    }, // Controllet.Output.._add_destination()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Output..update_upstream_query( changes, destination )
        
        @short Route method Plug..update_upstream_query() to input source
        
        @description
        If this controllet has an @@upstream source, route this method to
        that source, therefore not updating this pipelet queries.
        
        See Also method Controllet.Input..is_lazy() which then needs to
        query all destinations to find out if it is lazy or not.
    */
    // This method is generated using Controllet.Output upstream routing methods generator
  } } ); // Controllet.Output instance attributes
  
  // List of Controllet.Output methods that must be routed to upstream source
  var controllet_output_routed_methods =
    [
      'update_upstream_query',
      '_cancel_fetches',
      '_inject_branches',
      '_extract_branches'
    ]
  ;
  
  // Controllet.Output upstream routing methods generator
  controllet_output_routed_methods
    .forEach( function( method_name ) {
      Controllet.Output[ prototype_s ][ method_name ] =
        function() {
          var source = this.source.source
            , f      = source[ method_name ]
          ;
          
          f && f.apply( source, arguments )
        } // Controllet.Output..[ method_name ]
    } )
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet union( sources, options )
      
      @short Forwards many sources to one destination
      
      @parameters:
      - **sources** (Array of Pipelets): list of sources
      
      - **options** (Object):
        - **name** (String): debugging name for this union
        
        - **untag** (String): transactions @@tag to synchronize and remove at
          this union.
        
        - **tag** (String): deprecated alias for **untag**.
        
        - **concurrent** (Object): concurrent transaction tags, each key in the
          object is a tag name, truly value means that this tag is concurrent
          at this union.
  */
  function Union( sources, options ) {
    var that = this
      , name = options.name
    ;
    
    that._input  || ( that._input  = new Union_Input ( that, name, options ) );
    that._output || ( that._output = new Union_Output( that, options ) );
    
    Controllet.call( that, options );
    
    // input to emit data events for this union
    that._pipelet_input = null;
    
    sources && sources.forEach( function( source ) {
      that._add_source( source ); // ToDo: pass transaction option to _add_source
    } );
  } // Union()
  
  /* ------------------------------------------------------------------------
      @class Union.Input( pipelet, name, options, input_transactions )
      
      @short: @@class:Union @@input
      
      @parameters
      - **pipelet** (@@class:Pipelet\) containing this input.
      
      - **name** (String): @@class:Loggable name.
      
      - **options** (Object): @@class:Controllet.Input options.
      
      - **input_transactions** (@@class:Input_Transactions): optional,
        to share with other @@concurrent pipelets.
      
      @description
      Initializes @@class:Controllet_Input() and *sources*.
      
      @instance_attributes
      - **sources** (Array of Objects): Union source @@[inputs]input\.
      
      ### Instance Methods
      - @@method:Union.Input.._source_position()
      - @@method:Union.Input.._add_source()
      - @@method:Union.Input.._remove_source()
  */
  function Union_Input( p, name, options, input_transactions ) {
    Controllet_Input.call( this, p, name, options, input_transactions );
    
    this.sources = [];
  } // Union_Input()
  
  Union.Input = Controllet_Input.subclass(
    'Union.Input', Union_Input, {
    
    /* ------------------------------------------------------------------------
        @method Union.Input.._source_position( source )
        
        @short: Returns position of *source* in @@class:Union_Input *sources*
        
        @parameters
        - **source** (@@class:Output\): which position is requested.
        
        @returns
        (Integer): *source* position
          - ```-1```: *source* not found in this Input sources.
          - ```>= 0```: position of *source* in @@class:Union_Input *sources*.
        
        @description
        Overloads method Input.._source_position().
        
        See also:
        - Method Union.Input.._add_source()
        - Method Union.Input.._remove_source()
    */
    _source_position: function( source ) {
      return this.sources.indexOf( source );
    }, // Union.Input.._source_position()
    
    /* ------------------------------------------------------------------------
        @method Union.Input.._add_source( source )
        
        @short: Adds *source* to @@class:Union_Input *sources*, if not present.
        
        @parameters
        - **source** (@@class:Output\): to add to @@class:Union_Input
          *sources*.
        
        @returns
        ```this```
        
        @throws
        - (Error): ```"source already added"``` if *source* is already
          present in @@class:Union_Input *sources*.
        
        @description
        Overloads @@method:Input.._add_source().
        
        Adds *source* to *sources* then add source to ongoing fetches
        calling @@method:Union.Output..source_add().
        
        See also:
        - Method Union.Input.._remove_source().
        - Method Union.Input.._source_position().
    */
    // ToDo: DRY _add_source() and _remove_source() into _update_source()
    _add_source: function( source ) {
      var that    = this
        , sources = that.sources
      ;
      
      sources.indexOf( source ) != -1
        && that._source_error( '_add_source', 'source already added: ', source )
      ;
      
      sources.push( source ); // See Union..__emit() when changing this line
      
      that.pipelet._output.source_add( source );
      
      return that;
    }, // Union.Input.._add_source()
    
    /* ------------------------------------------------------------------------
        @method Union.Input.._remove_source( source )
        
        @short: Removes *source* from @@class:Union_Input *sources*, if present.
        
        @parameters
        - **source** (@@class:Output\): to remove from @@class:Union_Input
          *sources*.
        
        @returns
        ```this```
        
        @throws
        - (Error): ```"source not found"``` if *source* was not found in
          @@class:Union_Input *sources*.
        
        @description
        Overloads @@method:Input.._remove_source().
        
        See also:
        - Method Union.Input.._add_source().
        - Method Union.Input.._source_position().
    */
    _remove_source: function( source ) {
      var that     = this
        , sources  = that.sources
        , position = sources.indexOf( source )
      ;
      
      position == -1
        && that._source_error( '_remove_source', 'source not found: ', source )
      ;
      
      sources.splice( position, 1 );
      
      return that;
    } // Union.Input.._remove_source()
  } ); // Union.Input instance attributes
  
  /* ------------------------------------------------------------------------
      @class Union.Output( pipelet, options )
      
      @short: @@class:Union @@output
      
      @parameters
      - **pipelet** (@@class:Pipelet\) containing this input.
      
      - **options** (Object): @@class:Controllet.Output options.
      
      @description
      Initializes @@class:Controllet.Output() and *_source_adds*.
      
      @instance_attributes
      - **_source_adds** (Array of Functions): to allow adding sources
        during ongoing fetches, signature: source_add( source ):
        - **source** (@@class:Output\): source to add to ongoing fetch.
      
      ### Instance Methods
      - @@method:Union.Output.._fetch()
      - @@method:Union.Output..source_add()
      - @@method:Union.Output..update_upstream_query()
      - @@method:Union.Output.._cancel_fetches()
      - @@method:Union.Output.._inject_branches()
      - @@method:Union.Output.._extract_branches()
  */
  var _source_adds_s = '_source_adds';
  
  function Union_Output( p, options ) {
    Controllet_Output.call( this, p, options );
    
    this[ _source_adds_s ] = [];
  } // Union_Output()
  
  Union.Output = Controllet_Output.subclass(
    'Union.Output', Union_Output, {
    
    emits_terminated_sources: true,
    
    /* ------------------------------------------------------------------------
        @method Union.Output.._fetch( receiver, query, query_changes, destination )
        
        @short Fetches all sources of union
        
        @paraneters
        These are the same parameters as method Plug.._fetch().
        
        @returns
        - (Function): abort fetching on all ongoing source fetches that can be
          aborted.
        
        @throws
        - (Error): source "sent more content after completing". This should
        never happen unless there is a low level bug in the implementation
        of a fetch by an upstream pipelet.
        
        @description
        For each @@class:Union.Input() source, fetch that source.
        
        Results are emitted to *receiver*. When a source fetch completes,
        *receiver* is called with the additional *terminated_source*
        parameter to allow @@method:Plug.._fetch() to listen to data that may
        come from that source while other source fetches complete, thus
        preventing the possible loss of data.
        
        If a source is added during an ongoing fetch, it is added by method
        Union.Output..source_add() to prevent the loss of added source data
        by ongoing fetches.
        
        This fetch cannot be canceled directly. Cancellation is done by either
        downstream or by each source using @@method:Output.._cancel_fetches()
        when individual @@inputs are removed using
        @@method:Input..remove_source(). If all sources of a
        @@pipelet:union() cancel fetches, this fetch will effectively cancel.
        
        When calling the returned *abort()* function, all ongoing fetches are
        aborted, calling their *abort()* function if provided.
        
        ToDo: Union.Output.._fetch(): add tests
    */
    _fetch: function( receiver, query, query_changes, destination ) {
      var that        = this
        , sources     = that.source.sources
        , source_adds = that[ _source_adds_s ]
        , aborts      = []
        , count
        , filter
        , ___
      ;
      
      sources = sources.length
        ? sources.slice() // guard against synchronous changes
        : [ [] ] // one dummy source with no data
      ;
      
      count = sources.length;
      
      source_adds.push( source_add );
      
      sources.forEach( fetch_source );
      
      // log( get_name( that, 'fetch' ) + 'forEach ends, sources:', sources.map( function( _ ) { return get_name( _ ) } ) );
      
      return abort;
      
      function source_add( source ) {
        ++count;
        
        log( get_name( that, 'fetch#add_source' ) + 'source:', get_name( source ), ', count:', count );
        
        fetch_source( source );
      } // source_add()
      
      function fetch_source( source ) {
        var complete = false
          , abort
        ;
        
        // log( get_name( that, 'fetch_source' ) + 'source:', get_name( source ), ', count:', count );
        
        source._fetch
          ? abort = source._fetch( rx, query, query_changes, destination )
          : // Source should be an Array of Objects
            rx(
              query && source.length
                ? ( filter || ( filter = new Query( query, get_name( that ) + '-union-_fetch' ).generate().filter ) )( source )
                : source
              ,
              true
            )
        ;
        
        // if _fetch is synchronous, it will be complete and terminated upon returning, aborting is no-longer possible
        complete || aborts.push( function() {
          terminate();
          
          abort && abort()
          
          // ToDo: if fetch has already completed, revert query changes, if any
        } );
        
        function rx( values, no_more, operation, options, terminated_source ) {
          complete &&
            // This is a bug, needs to be reported back to the team that implemented source
            that._error( '_fetch#rx'
              , 'source "' + get_name( source ) + '" sent more content after completing'
            )
          ;
          
          no_more && terminate();
          
          // There is no local query to update because this is a controllet which output query tree is never used.
          
          if ( no_more || values.length )
            receiver( values, ! count, operation, options, terminated_source || no_more && source )
        
        } // rx()
        
        function terminate() {
          complete = true;
          
          if ( abort )
            // this source fetch was asynchronous and could be aborted
            abort = aborts[ aborts.indexOf( abort ) ] = ___
          ;
          
          --count || source_adds.splice( source_adds.indexOf( source_add ), 1 );
        } // terminate()
      } // fetch_source()
      
      function abort() {
        receiver = ___; // de-reference receiver immediately
        
        while ( aborts && aborts.length )
          aborts.shift()()
      } // abort()
    }, // Union.Output.._fetch()
    
    /* ------------------------------------------------------------------------
        @method Union.Output..source_add( source )
        
        @short Adds a source to ongoing fetches
        
        @paraneters
        - **source** (@@class:Output\): source output to add to ongoing
          fetches.
        
        @description
        This method is called by method @@method:Union.Input.._add_source()
        itself called by @@method:Input..add_source(). It allows to
        synchronize fetches with source additions, preventing the loss
        of *source* data by ongoing fetches.
        
        This method is @@synchronous, i.e. it will return after adding
        *source* to all ongoing fetches.
        
        Note that there is no need to implement a method to remove sources
        during ongoing fetches on @@method:Input..remove_source() because
        the later cancels ongoing fetches with
        @@method:Output.cancel_fetches().
        
        See also: @@method:Union.Output.._fetch()
        
        ToDo: add test for adding a source to a Union during an ongoing fetch.
    */
    source_add: function( source ) {
      this[ _source_adds_s ]
        
        // prevent synchronous changes adding or removing source adds functions
        .slice()
        
        .forEach( function( source_add ) { source_add( source ) } )
      ;
    } // Union.Output..source_add()
  } ); // Union.Output instance attributes
  
  // Union.Output upstream routing methods generator
  controllet_output_routed_methods
    .forEach( function( method_name ) {
      Union.Output[ prototype_s ][ method_name ] =
        function() {
          var parameters = arguments;
          
          this.source.sources.forEach( function( source ) {
            var f = source[ method_name ];
            
            f && f.apply( source, parameters )
          } )
        } // Union.Output..[ method_name ]
    } )
  ;
  
  Controllet.Build( 'union', Union, {
    // ToDo: use Controllet's output to emit instead as Pipelet..__emit() is deprecated
    // See also Union.Input.._add_source() for comment refering this this method
    __emit: function( event_name, values, options ) {
      var that  = this
        , input = that._pipelet_input
      ;
      
      if( ! input ) {
        that._pipelet_input
          = input
          = that.namespace().pass_through( { name: get_name( that ) + '-input' } )
        ;
        
        input.through( that, { no_fetch: true } );
        
        that
          ._input
          
          // Do not count this as a branch in transaction counts, it will never emit to end a concurrent transaction
          .add_branches( -1 )
        ;
        
        // de&&ug( get_name( that, '__emit' ) + 'input created, branches count:', that._output.branches_count() );
      }
      
      input._output.emit( event_name, values, options );
    } // Union..__emit()
  } ); // union()
  
  set_pipelet_operations( Union, function( event_name ) {
    return function( values, options ) {
      return this.__emit( event_name, values, options );
    };
  } );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet greedy( options )
      
      @short Greedily @@subscribe to @@upstream events
      
      @description:
      This is a @@stateless, @@synchronous, @@greedy pass-through pipelet.
  */
  function Greedy( options ) {
    var that = this;
    
    that._input = that._input || new Greedy.Input( that, options.name, options );
    
    Pipelet.call( that, options );
  } // Greedy()
  
  Pipelet.Build( 'greedy', Greedy );
  
  function Greedy_Input( p, name, options, input_transactions ) {
    var that = this;
    
    Input.call( that, p, name, options, input_transactions );
    
    // Query everything from upstream, makes me greedy
    that[ query_s ] = Query.pass_all;
    that[ future_query_s ] = Query.pass_all;
    
    // We want everything now
    that.no_fetch = false;
  } // Greedy_Input()
  
  Greedy.Input = Input.subclass(
    'Greedy.Input', Greedy_Input, {
    
    _fetch: function( rx, query ) {
      Input[ prototype_s ]._fetch.call( this, rx, query );
    }, // Greedy.Input.._fetch()
    
    /* ------------------------------------------------------------------------
        @method Greedy.Input..update_upstream_query( changes )
        
        @short Do nothing, do not propagate upstream
        
        @description
        Input default behavior: Updates this input query and propagate
        upstream.
        
        Greedy behavior: to not do anything, do not update query and do not
        propagate upstream. Greedy therefore always fetches all it can
        regardless of downstream pipelet needs.
    */
    update_upstream_query: function() {
      // Prevent upstream query propagation
    } // Greedy.Input..update_upstream_query()
  } ); // Greedy Input
  
  /* --------------------------------------------------------------------------
      @pipelet delay( delay, options )
      
      @short Delay operations by "delay" miliseconds
      
      @parameters:
      - **delay**: (Integer) delay in miliseconds
      - **options** (Object): @@class:Pipelet options plus:
        - **fetch** (Boolean): delay fetch, default is ```true```, set to
          ```false``` to disable delay on fetch operations.
      
      @description:
      All @@upstream @@(operation)s are delayed as well as @@downstream
      fetch and subcription updates.
      
      On fetches, fetched values are also delayed by delay, so a fetch
      will emit values after two delay.
      
      Intented Purposes:
      - Simultate a distant pipelet by introducing a delay in all
        operations and _fetch().
      - Test asynchronous behavior of pipelets.
      - Introduce delays to circumvent timing issues although this
        should always be considered a hack
      
      This is a @@stateless, @@asynchronous, @@lazy pipelet.
  */
  function Delay( delay, options ) {
    var that = this;
    
    Pipelet.call( that, options );
    
    if ( that._options.fetch !== false ) that._input._fetch  = input_fetch;
    
    that._output.update_upstream_query = update_upstream_query;
    
    that.delay = delay;
    
    de&&ug( 'new Delay(): delay: ' + delay + ' ms' )
    
    function input_fetch( receiver, query, query_changes, destination ) {
      var that = this;
      
      // Delay the call to _fetch() to simultate a full round-trip to a server
      setTimeout( function() {
        Input[ prototype_s ]._fetch.call( that, _receiver, query, query_changes, destination )
      }, delay );
      
      return that; // ToDo: remove superflous return
      
      // A delayed receiver
      function _receiver( values, no_more, operation, options ) {
        setTimeout( function() {
          receiver( values, no_more, operation, options )
        }, delay )
      }
    } // input_fetch()
    
    function update_upstream_query( changes, input ) {
      var that = this;
      
      setTimeout( function() {
        Output[ prototype_s ].update_upstream_query.call( that, changes, input ) // ToDo: shouldn't this use this pipelet's input?
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
  extend_2( RS, {
    'Plug'             : Plug,
    'Pipelet'          : Pipelet,
    'Encapsulate'      : Encapsulate,
    'Pass_Through'     : Pass_Through,
    'Controllet'       : Controllet,
    'Union'            : Union,
    'Greedy'           : Greedy,
    'Delay'            : Delay
  } );
  
  return rs; // global
} ); // pipelet.js
