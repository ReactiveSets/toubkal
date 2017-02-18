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
    , options_no_more        = Options.no_more
    , RS_log                 = RS.log
    , pretty                 = RS_log.pretty
    , log                    = RS_log.bind( null, 'pipelet' )
    , extend                 = RS.extend
    , extend_2               = extend._2
    , is_array               = RS.is_array
    , subclass               = RS.subclass
    , Loggable               = RS.Loggable
    , get_name               = RS.get_name
    , picker                 = RS.picker

    , Root                   = subclass.Root
    , new_apply              = subclass.new_apply
    
    // ToDo: remove synchronous var and related options and code once fully validated with applications
    , synchronous            = 1 // fetch and query updates should be synchronous
  
    // Constants to optimize for minified size
    , prototype_s    = 'prototype'
    , constructor_s  = 'constructor'
    , _scope_s       = '_scope'
    , _namespace_s   = '_namespace'
    , _mixin_s       = '_mixin'
    , _add_factory_s = '_add_factory'
    , push           = [].push
    , slice          = [].slice
    , concat         = [].concat
    , toString       = {}.toString
  ;
  
  /* --------------------------------------------------------------------------
      de&&ug( message )
      
      Logs an error message if de is true.
  */
  var de = false, ug = log;
  
  /* --------------------------------------------------------------------------
      @class Plug( pipelet, options )
      
      @short Base class for @@class:Input and @@class:Output plugs
      
      @parameters:
      - **pipelet** (@@class:Pipelet\): reference to container pipelet
      
      - **options** (Object):
        - **name** (String): name for this plug, used in traces
        - other possible options for derived classes.
      
      @description:
      Plugs route dataflow subscriptions and fetches upstream and may relay
      data events downstream.
      
      Class Input() plugs are meant to receive data events from class Output()
      plugs. Some pipelets, such as @@pipelet:filter() may implement
      intermediate plugs between their input and output plugs.
      
      A Plug is an @@class:Event_Emitter().
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
    
    if ( synchronous ) {
      // State to synchronize fetch and query updates
      
      /*
        query_updates (Array): list of query updates (Object) to apply in
        order:
          - done:
            - falsy: waiting for this fetch to complete
            - truly: complete, either waiting for a previous fetch to complete
              or applied and no-longer in query_updates queue:
              - (Function): function to call with applied changes
                after all previous fetches complete
              - (2): applied, removed from queue
              - (other): waiting for a previous fetch to complete
          
          - changes (Array): removes and adds
          
          - destination (Plug): downstrean plug which requested changes
          
          Operation:
          Query updates are immediately marked as done.
          
          When a fetch completes, it's query update is marked as done.
          
          After each completion, the list of done query updates at
          the start is removed and applied. Processing stops as soon
          as a not done query update is found.
      */
      that.query_updates = [];
    }
    
    // Upstream source
    that.source = null;
  } // Plug()
  
  function transform_query( query_transform, query ) {
    return query
      .reduce( function( terms, term ) {
        term = query_transform( term );
        
        term && terms.push( term );
        
        return terms;
      }, [] )
    ;
  } // transform_query()
  
  function map_query_changes( query_transform, query_changes ) {
    return query_transform && query_changes
      ? [ transform_query( query_transform, query_changes[ 0 ] ), transform_query( query_transform, query_changes[ 1 ] ) ]
      : query_changes
    ;
  } // map_query_changes()
  
  function changes_count( changes ) {
    return changes[ 0 ].length + changes[ 1 ].length;
  }
  
  Query.changes_count = changes_count;
  
  Event_Emitter.subclass( 'Plug', Plug, {
    /* ------------------------------------------------------------------------
        @method Plug..error( method, message, then )
        
        @short Logs errors then callback with error message or throws
        
        @parameters
        - **method** (String): name of the method where the error occurred
        
        - **message** (String): error message
        
        - **then** (Function): optional, call then() with Error instance,
          otherwise throw Error.
    */
    error: function( method, message, then ) {
      message = get_name( this, method ) + message;
      
      var error = new Error( message );
      // ToDo: report error to global error dataflow or error output
      
      if ( then ) {
        log( error.stack );
        
        then( error )
      } else
        throw error
      ;
    }, // Plug..error()
    
    /* ------------------------------------------------------------------------
        @method Plug..update_upstream_query( changes, destination, upstream_changes )
        
        @short Update upstream source query with minimum changes.
        
        @parameters
        - **changes** (Array): subscription query terms changes to optionaly
          transform using @@method:Plug.._query_transform() if
          ```upstream_changes``` is not defined, then apply to
          @@method:Plug.._update_query(), possibly delayed if there are
          fetches in progress (see @@method:Plug.._fetch()).
          The Array of changes has two elements:
          - **0** (Array): query terms to remove
          - **1** (Array): query terms to add
        
        - **destination** (@@class:Plug\): subscriber
        
        - **upstream_changes** (Array): provided by
          @@method:Input..update_upstream_query(). These are transformed
          and optimized changed query terms to apply upstream immediately.
        
        @description
        Apply minimum set of changes to local query, then forward any
        remaining changes upstream if ```this.source``` is defined, calling
        ```this.source.update_upstream_query()``` if defined.
        
        Minimum set of changes is 
        Find minimum set of changes calling @@method:Plug.._query_transform()
        if defined and not ```transformed```, then
        @@method:Plug.._update_query().
        
        Changes applied upsrteam are ```upstream_changes``` if defined or
        changes if ```upstream_changes``` is not defined because
        @@method:Output.._update_query() does not modify changes.
        
         returned by @@method:Plug.._update_query(), which may be
        delayed when previous fetches are in progress.
        
        Because @@method:Plug.._query_transform() is called before
        @@method:Plug.._update_query(), it has a different semantic
        when applied to an @@Class:Input or @@Class:Output\.
        
        When applied on an @@Class:Output, @@method:Plug.._query_transform()
        should only be used as a filter of query terms and should not
        change these terms otherwise the downstream pipelet may not
        receive expected values due to filtering by output uery tree.
        Filtering the query before applying to the query tree allows for
        smaller, more efficient, query trees.
        
        When applied to an @@Class:Input, @@method:Plug.._query_transform()
        can both filter and alter terms but it is not currenly fully
        implemented in Input.
        
        #### Whish list
        - ToDo: update_upstream_query(): process transaction objects:
          This might be challenging because query updates go upstream,
          which has the potential to add concurrency issues with
          downstream dataflow.
    */
    update_upstream_query: function( changes, destination, upstream_changes ) {
      var that            = this
        , query_transform = that._query_transform
        , query_updates
      ;
      
      if ( upstream_changes
        || ! query_transform
        || changes_count( changes = map_query_changes( query_transform, changes ) )
      ) {
        if ( synchronous && ( query_updates = that.query_updates ).length )
          // There are fetches in progress, delay query update
          
          query_updates.push( {
            done       : 1,
            changes    : changes,
            destination: destination
          } );
          
        else
          that._update_query( changes, destination )
        ;
        
        apply_upstream( upstream_changes || changes );
      }
      
      function apply_upstream( changes ) {
        var source                = that.source
          , update_upstream_query = source && source.update_upstream_query
        ;
        
        //de&&ug( get_name( that, 'update_upstream_query' ) + 'changes:', RS_log.s( changes ), '\n  source:', source && get_name( source ) );
        
        update_upstream_query
          && changes_count( changes )
          && update_upstream_query.call( source, changes, that )
        ;
      }
    }, // Plug..update_upstream_query()
    
    /* ------------------------------------------------------------------------
        @method Plug.._transform( values, options, operation )
        
        @short Optional virtual method to transform fetched values
        
        @parameters
        - **values** (Array of Object): to transform
        - **options** (Object): optional operation meta data, e.g. transaction
        - **operation** (String): always ```"fetch"``` for now.
        
        @returns
        - (Array of Object): transformed values
        
        @description
        When this method is defined, it is called by @@method:Plug.._fetch().
        
        This method should not modify its paraneters, a new Array must be
        returned instead.
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
        
        @short Virtual method, updates local query
        
        @parameters
        - **changes** (Array):
          - **0** (Array): query terms to remove
          - **1** (Array): query terms to add
        
        - **destination** (@@class:Plug\): subscriber
        
        @returns
        (Array): (possibly optimized) changes
        
        @description
        This method is implemented in derived classes:
        - @@method:Input.._update_query()
        - @@method:Output.._update_query()
    */
    
    /* ------------------------------------------------------------------------
        @method Plug..fetch_unfiltered( receiver, query_changes )
        
        @short Fetches content, not filteed by a query
        
        @parameters
        - **receiver** (Function): see @@method:Plug.._fetch() receiver
          parameter
        - **query_changes** (Array): optional changes for upstream
          @@subscription query
        
        @description
        This method is not implemented by class @@class:Plug but if
        overloaded it is called by @@method:Plug.._fetch().
        
        It is typically implemented by @@stateful pipelets to emit the full
        set of values that may then be filtered by @@method:Plug.._fetch().
        
        The "query_changes" parameter should not be defined if not used.
    */
    
    /* ------------------------------------------------------------------------
        @method Plug.._fetch( receiver, query, query_changes, destination, __query_changes )
        
        @short Fetches data from source then updates local queries
        
        @parameters
        - **receiver** (Function): signature:
          ```receiver( adds, no_more, removes, updates, options )```
          - **adds** (Array): values added. Empty Array if no values are added.
          
          - **no_more**: if falsy, more operations will come later, if truly
            this is the last chunk for this fetch.
          
          - **removes** (Array): optional values removed.
          - **updates** (Array): optional updated values.
          - **options** (Object): optional:
            - **_t**: a @@transaction object when values were added, removed
              or updated.
        
        - **query** (Array of Objects): optional @@query
        
        - **query_changes** (Array): optional query update once values are
          fetched
        
        - **destination** (@@class:Plug\): optional plug for
          @@method:Plug.._update_query()
        
        - **__query_changes** (Array): optional query changes to apply on
          receiver instead of ```query_changes``` as provided by overloaded
          @@method:Input.._fetch()
        
        - **options** (Object): optional
        
        @description:
        Operation:
          - transforms queries using @@method:Plug.._query_transform() if
            defined;
          
          - Call ```receiver()``` immediately with an empty set of values if
            query (after optional transformation) is the null query: ```[]```,
            
            otherwise call @@method:Plug..fetch_unfiltered() if defined,
            
            otherwise call ```this.source._fetch()``` if ```this.source``` is
            defined,
            
            otherwise call ```receiver()``` immediately with an empty set of
            values;
          
          - Call @@method:Plug.._update_query() synchronously when fetched
            values are received, or before calling ```receiver()``` with an
            empty set of values;
          
          - Filters fetched values using query if
            @@method:Plug..fetch_unfiltered() is defined or using
            @@method:Plug.._transform() if defined and
            @@method:Plug..fetch_unfiltered() is not defined;
          
          - Receiver can emits adds, removes and updates, in a transaction;
        .
        
        Synhronization between fetch and query updates is done by updating
        local queries calling @@method:Plug.._update_query() only when fetched
        values are received.
        
        Assuming that fetch and other operations travel without changes in
        order, this allows synchronization, maintaining dataflow consistency
        over asynchronous networks.
        
        This may be challenged by delayed transactions in pipelets that only
        emit when complete. If a fetch happens in the middle of such a
        transaction, pipelets must emit values to fetch receivers
        consistently.
    */
    _fetch: function( receiver, query, query_changes, destination, __query_changes ) {
      __query_changes = __query_changes || query_changes;
      
      var that             = this
        //, de               = true
        , name             = de && get_name( that, "_fetch" )
        , transform
        , fetch_unfiltered = that.fetch_unfiltered
        , query_transform  = ! ( fetch_unfiltered && fetch_unfiltered.length < 2 ) && that._query_transform
        , _query           = query
        , _query_changes   = query_changes
        , _update_query    = __query_changes && that._update_query
        , query_updates    = synchronous && _update_query && that.query_updates
        , _rx
        , cancelled // see function cancel() bellow
        , source
        , filter
        , i
      ;
      
      // Tell _do_not_fetch() that sources must now be fetched when further connected to upstream pipelets
      // This may no-longer be necessary
      if ( that.no_fetch === true ) that.no_fetch = false;
      
      _rx = _update_query ? rx : receiver;
      
      if ( query_transform ) {
        _query_changes = query_changes && map_query_changes( query_transform, query_changes );
        
        __query_changes = __query_changes === query_changes
          ? _query_changes
            // ToDo: consider possible optimizations to prevent applying some transforms:
          : __query_changes && map_query_changes( query_transform, __query_changes )
        ;
        
        if ( query ) {
          // ToDo: check if optimization still works, if _update_query() changes return original queries or not:
          _query = query_changes && ( i = query_changes.indexOf( query ) ) != -1
            ? _query_changes[ i ]
            : transform_query( query_transform, query )
          ;
          
          if ( ! ( _query.length || _query_changes && changes_count( _query_changes ) ) ) {
            query_updates && push__query_changes();
            
            return rx( [], true )
          }
        }
      }
      
      query_updates && push__query_changes(); // if query_updates, _rx === rx
      
      if ( _query && ! _query.length ) {
        de&&ug( name, 'nul query' );
        
        _rx( [], true );
      } else if ( fetch_unfiltered ) {
        if ( query ) {
          transform = function( /* ignore options */ ) {
            return filter = filter || new Query( query, get_name( that ) + '-_fetch' ).generate().filter
          }
          
          _rx = rx;
        }
        
        fetch_unfiltered.call( that, _rx, _query_changes );
      } else if ( source = that.source ) {
        de&&ug( name, 'query:', query );
        
        if ( that._transform ) {
          transform = function( options ) {
            return function( values ) {
              return that._transform( values, options, 'fetch' );
            }
          }
          
          _rx = rx;
        }
        
        source._fetch( _rx, _query, _query_changes, that );
      } else {
        de&&ug( name, 'no source' );
        
        _rx( [], true ); // No source, so this is an empty set
      }
      
      function push__query_changes() {
        query_updates.push( __query_changes = { done: 0, changes: __query_changes, destination: destination, cancel: cancel } )
      }
      
      function cancel() {
        var de = 1;
        
        de&&ug( name, 'cancelled, query changes:', __query_changes.changes, '- destination:', get_name( destination ) );
        
        __query_changes.done = 1; // allow to apply query update by _apply_done_query_updates()
        
        cancelled = 1;
        
        receiver( [], true, 0, 0, { cause: 'cancelled' } );
        
        receiver = 0; // de-reference downstream closure as this closure is still referenced upstream
        
        // ToDo: cancel upstream fetch
      } // cancel()
      
      function rx( adds, no_more, removes, updates, options ) {
        // ToDo: delay response until related transactions are complete at this plug.
        if ( cancelled ) return; // this fetch was cancelled by cancel()
        
        // Apply changes on local query, synchronized with receiver() call bellow
        if ( no_more && _update_query ) {
          if ( query_updates ) {
            __query_changes.done = 1;
            
            that._apply_done_query_updates();
            
            if ( __query_changes.done < 2 ) {
              // de&&ug( name, 'not done:', __query_changes.done );
              
              _update_query = 0; // this rx() will not attempt to apply done changes again
              
              __query_changes.done = function() {
                // de&&ug( name, 'done' );
                
                rx( adds, no_more, removes, updates, options );
              };
              
              // delay receiver until query is updated, re-ordering receiver's calls in fetch order
              return;
            }
          } else {
            _update_query.call( that, __query_changes, destination );
          }
        }
        
        var al = adds    && adds   .length || 0
          , rl = removes && removes.length || 0
          , ul = updates && updates.length || 0
          , _transform
        ;
        
        // transform results if any
        if ( transform && al + rl + ul ) {
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
    }, // Plug.._fetch()
    
    // ToDo: document _apply_done_query_updates()
    _apply_done_query_updates: function() {
      var that          = this
        , name          = de && get_name( that, "_apply_done_query_updates" )
        , query_updates = that.query_updates
        , query_update
        , done
        , changes
      ;
      
      // de&&ug( name, 'query_updates:', query_updates.length );
      
      // Apply all consecutive done changes from the start of the query updates queue
      while ( ( query_update = query_updates[ 0 ] ) && ( done = query_update.done ) ) {
        // de&&ug( name, 'apply:', query_update );
        
        changes = that._update_query( query_updates.shift().changes, query_update.destination )
        
        typeof done == 'function' && done( changes );
        
        query_update.done = 2;
      }
    }, // Plug.._apply_done_query_updates()
    
    // ToDo: document _cancel_fetches()
    _cancel_fetches: function( destination ) {
      var that          = this
        , query_updates = that.query_updates
        , i             = -1
        , query_update
      ;
      
      while ( query_update = query_updates[ ++i ] )
        if ( query_update.destination === destination )
          query_update.done || query_update.cancel();
      ;
      
      that._apply_done_query_updates();
    }, // Plug.._cancel_fetches()
    
    /* ------------------------------------------------------------------------
        @method Plug..fetch_all( receiver, query )
        
        @short Fetches the entire content of set
        
        @parameters
        - **receiver** (optional Function): see _fetch() for definition.
          
          This function must be provided if source responds asynchronously
          to _fetch(). Otherwise an error will be thrown.
          
          !!! Warning:
          It is highly recommended to always provide the receiver function
          to future-proof programs. Not using a receiver should only be used
          for testing when source is known to be synchronous.
        
        - **query** (optional Array of Objects): see @@method:Plug.._fetch()
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
        
        @description
        This method should only be used for debugging and testing purposes or
        when the full state is known to be "small" (i.e. can fit entirely in
        memory) and the source fetched is always on the same thread.
        
        For large sets, use @@method:Plug.._fetch() instead that allows to
        retrieve the content in "reasonable" size chunks that require less
        memory.
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
  
  /* --------------------------------------------------------------------------
      @class Input( pipelet, name, transactions_options, input_transactions )
      
      @short An input plug.
      
      @parameters
      - **pipelet** (Pipelet): input owner and destination
      
      - **name** (String): for Loggable, defaults to ```"in"```
      
      - **transactions_options** (Object): options for class Input_Transactions():
        - **tag** (String): optional input transactions tag removed (not
          forwarded) at this input.
        
        - **concurrent** (Object): keys are tags, truly values means @@concurrent,
          if concurrent is null or undefined, all tagged transactions are
          considered concurrent. Therefore concurrents comes as a restriction
          which designate which tagged transactions are conccurent at this
          pipelet.
      
      - **input_transactions** (Input_Transactions): optional shared with other
        inputs, allows synchronization between inputs of concurrent tagged
        transactions.
  */
  var query_s        = 'query'
    , future_query_s = 'future_query'
  ;
  
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
    
    that.tag = options.tag || null;
    
    that.branches = 0;
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
    
    // ToDo: document add, remove, update
    add: function( added, options ) {
      this.pipelet._add( added, options );
    }, // Input..add()
    
    remove: function( removed, options ) {
      this.pipelet._remove( removed, options );
    }, // Input..remove()
    
    update: function( updated, options ) {
      this.pipelet._update( updated, options );
    }, // Input..update()
    
    clear: function( options ) {
      this.pipelet._clear( options );
    }, // Input..clear()
    
    // ToDo: remove deprecated, never used Input..notify()
    notify: function( transaction, options ) {
      this.pipelet._notify( transaction, options );
    }, // Input..notify()
    
    /* ------------------------------------------------------------------------
        @method Input..add_source( source, options, then )
        
        @short Subscribe this input to source
        
        @parameters
        - **source**: (Array of Objects, or Output) to add as a source to
          this Input.
        
        - **options** (Optional Object):
          - **no_fetch** (Boolean): do not fetch data from source to add
            values to this pipelet.
          
          - **_t** (Object): a transaction object to fetch initial data
        
        - **then** (Function): optional function called when subscription
          is fully updated, including possible asynchronous fetches.
        
        @description:
        Adds a source to this pipelet:
        
        ```
          source ----> this
        ```
        
        The content of the source is then fetched and added to this pipelet
        unless this pipelet is lazy, instance flag ```no_fetch``` is
        ```true``` or option ```no_fetch``` is provided.
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
      
      if ( ! source.is_namespace ) {
        if ( that._source_position( source ) != -1 )
          return that._source_error( 'add_source', 'already has added source: ', source, then );
        ;
        
        if ( source._fetch ) {
          // This is a Plug
          
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
          return that._source_error( 'add_source', null, source, then );
        }
      } // ! source.is_namespace
      
      then && then()
      
      return that;
    }, // Input..add_source()
    
    /* ------------------------------------------------------------------------
        @method Input..remove_source( source, options, then )
        
        @short Unsubscribe and disconnects this input from source
        
        @parameters
        - **source** (Array of Objects, or @@class:Output\): source to remove
        
        - **options** (Object):
          - **no_fetch** (Boolean): do not _fetch the source to remove values
            from destination
        
        - **then** (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
        
        @description
        Cuts the connection between upstream source pipelet and this pipelet.
        
          source --x--> this
        
        The content of source is then fetched and removed from this pipelet
        unless this pipelet is lazy or option ```"no_fetch"``` is ```true```.
        
        It is @@synchronous if option ```"no_fetch"``` is true, and can be
        @@assynchronous otherwise.
        
        Before removing source, emits event ```"remove_source"``` which
        allows to disconnect dependent pipelets connections and is provided
        with source and options.
        
        ### See Also
        - Method Pipelet..remove_source_with()
        - Method Pipelet..remove_destination_with()
        - Pipelet dispatch()
    */
    remove_source: function( source, options, then ) {
      var that = this;
      
      that.emit( 'remove_source', source, options );
      
      if ( ! source.is_namespace ) {
        if ( that._source_position( source ) == -1 )
          return that._source_error( 'remove_source', 'does not have removed source: ', source, then )
        ;
        
        if ( source._fetch ) {
          // We have a Plug object
          that
            // Remove the source before updating the subscription, this avoids that source subscription removes trigger double removes of query terms
            // ToDo: add tests where a filter requests a dataflow based on another dataflow, both from the same source
            ._remove_source             ( source ) // may throw if source not that source
            ._remove_source_subscription( source, options, function() {
              de&&ug( get_name( that, 'remove_source' ) + 'removed source subscription, options:', options );
              
              // ToDo: (optionally) wait for pending fetches to complete instead of killing them
              source._cancel_fetches( that );
              
              if( options && ! options.no_fetch && ( options = options_no_more( options ) ) ) {
                // Before disconnecting, terminate the transaction started in transactional fetch
                
                that._terminate_source_transaction( source, options );
              }
              
              that
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
          return that._source_error( 'remove_source', source, then );
        }
      } // ! source.is_namespace
      
      then && then();
      
      return that;
    }, // Input..remove_source()
    
    /* ------------------------------------------------------------------------
        @method Input.._terminate_source_transaction( source, options )
        
        @short Terminates an ongoing transaction from source
        
        @parameters
        - **source** (@@class:Output\):
        
        - **options** (Object): containing transaction Object attribute ```_t```
          for ongoing transaction to terminate from ```source```.
        
        @description
        Uses method Output.._concurrent_options() to terminate transaction
        properly from ```source```.
        
        Called by method Input..remove_source(), and overloaded by
        class Controllet() to route it to all destinations.
    */
    _terminate_source_transaction: function( source, options ) {
      //de&&ug( get_name( this, '_terminate_source_transaction' ), get_name( source ), options );
      
      this.add( [], source._concurrent_options( this, options ) );
    }, // Input.._terminate_source_transaction()
    
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
        
        The error is emitted using method Plug..error().
    */
    _source_error: function( function_name, message, source, then ) {
      // ToDo: add_source() and remove_source(), add test for bad source type
      this.error( function_name,
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
        @method Input.._add_source_branches( source )
        
        @short Adds as many branches as source reports
        
        @parameters
        - **source** (Output), providing branches_count() method.
        
        @returns this
    */
    _add_source_branches: function( source ) {
      return this.add_branches( source.branches_count() );
    }, // Input.._add_source_branches()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_branches( source )
        
        @short Removes as many branches as source reports
        
        @parameters
        - **source** (Output), providing branches_count() method.
        
        @returns this
    */
    _remove_source_branches: function( source ) {
      return this.add_branches( - source.branches_count() );
    }, // Input.._remove_source_branches()
    
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
        @method Input.._update_source_array( source, options, remove )
        
        @short Add or remove data from source Array
        
        @parameters:
        - **source** (Array): added or removed directly to this pipelet
        
        - **options** (Object): optional:
          - **no_fetch** (Boolean): don't do anything, return immediately
          
          - **_t** (Object): a @@transaction Object
        
        - **remove** (Boolean): truly to remove, falsy to add
        
        @returns this
        
        @description
        This is a low level method called by @@method:Input..add_source()
        and @@method:Input..remove_source() when the source is an Array
        of @@[values]value\.
    */
    _update_source_array: function( source, options, remove ) {
      var that = this;
      
      options = that._fetch_option( options );
      
      if ( ! ( options && options.no_fetch ) ) { // Don't add or remove anything
        de&&ug( get_name( that, '_update_source_array' ) + 'source:', typeof source );
        
        var q = that[ query_s ];
        
        if ( q ) source = q.filter( source );
        
        that[ remove ? 'remove' : 'add' ]( source, options_forward( options ) );
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
    */
    _add_source_subscription: function( source, options, then ) {
      var that  = this
        , q     = that[ query_s ]
      ;
      
      that._update_subscription( [ [], q && q.query ], that._fetch_option( options ), source, then );
      
      return that;
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
          **0**: removes (Array): removed subscription query terms
          **1**: adds    (Array): added subscription query terms
        
        - **options** (Object):
          - **no_fetch** (Boolean): do not fetch source
          - **_t** (Object): upstream @@transaction requesting subscription
            changes. It may include fork tags in which case at least one
            add is emitted to guaranty fork tags forwarding downstream.
        
        - **source** (@@class:Output\): optional source, default is
          ```this.source```
        
        - **then** (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
        
        @description
        Fetches source, updates data, then update upstream query.
    */
    _update_subscription: function( changes, options, source, then ) {
      var input = this;
      
      if ( source || ( source = input.source ) ) {
        de&&ug( get_name( input, '_update_subscription' ), 'changes:', changes, ', source:', get_name( source ) );
        
        var removes = changes[ 0 ]
          , adds    = changes[ 1 ]
          , rl      = removes && removes.length ? 1 : 0
          , al      = adds    && adds   .length ? 1 : 0
          , count   = al + rl
          , fetch   = options && options.no_fetch ? 0 : 1
          , _count  = fetch * count + 1
          , _then   = then && function() { --_count || then() }
          , transaction = {}
          , sync    = fetch && ( synchronous || input.options.synchronous )
          , _t
        ;
        
        if ( count ) {
          rl * fetch
            && source._transactional_fetch( input, transaction, count, removes, sync && [ removes, [] ], options, true, _then )
          ;
          
          al * fetch
               // ToDo: add test to verify that second fetch uses transaction
            && source._transactional_fetch( input, transaction, 1, adds, sync && [ [], adds ], options, false, _then )
          ;
          
          // Update upstream query trees and queries if not synchronized and there are query changes
          
          // Updating queries should be done after fetching, because if an upstream pipelet
          // emits adds synchronously when updating queries, it would be done before fetch
          // yielding duplicate data downstream, the add then fetched data. This may happen
          // with pipelet query_updates() when used to update the filter of a stateful cache
          // upstream from here, and when a source of the cache is synchronously available.
          
          sync || source.update_upstream_query( changes, input );
        
        } else if ( options && ( _t = options._t ) && _t.forks && ! _t.more ) {
          // Need to forward this end of transaction
          // ToDo: Input.._update_subscription(), add tests for forwarding forked end of transactions
          // ToDo: do not emit end-of-transaction event to destination if there was nothing emitted to this destination before
          input.add( [],
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
        
        ToDo: add tests for _transactions_remove_source()
    */
    _transactions_remove_source: function( output ) {
      var that = this;
      
      that.transactions
        .remove_source( that, output.output_transactions )
        
        .forEach( function( _t ) {
          // Terminate transaction at this input
          
          // ToDo: add warning condition, removing pipelet connection in the middle of a transaction.
          RS.log( 'Warning:', get_name( that, '_transactions_remove_source' )
            + 'removing pipelet connection in the middle of transaction, _t:', _t
            , ', Output:', get_name( output )
          );
          
          // ToDo: Transactions allow handling of canceled flag in downstream pipelets
          // ToDo: add test for cancelled transaction by _transactions_remove_source()
          
          // ToDo: use _terminate_source_transaction() to allow Controllet to route to all
          // destinations, requires to modify Input..Transactions..remove_source()
          // to provide the source in addition to _t, it should also not terminate the
          // transaction itself since _terminate_source_transaction() does the
          // termination properly.
          // that._terminate_source_transaction( source, { _t: extend_2( { canceled: true }, _t ) } )
          
          that.add( [], { _t: extend_2( { canceled: true }, _t ) } );
        } )
      ;
      
      return this;
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
      var q = this[ query_s ];
      
      return ! ( q && q.query.length );
    }, // Input..is_lazy()
    
    /* ------------------------------------------------------------------------
        @method Input..update_upstream_query( changes, destination )
        
        @short Update future query before calling @@method:Plug..update_upstream_query()
        
        @parameters
        - **changes** (Array): changed query terms:
          - **0** (Array): query terms to remove
          - **1** (Array): query terms to add
        
        - **destination** (@@class:Plug\): subscriber
        
        @description
        Apply minimum set of changes to future query, then call
        @@method:Plug..update_upstream_query().
    */
    update_upstream_query: function( changes, destination ) {
      var that                  = this
        , query_transform       = that._query_transform
      ;
      
      // ToDo: DRY code with Plug..update_upstream_query() for transforming query
      if ( ! query_transform
        || changes_count( changes = map_query_changes( query_transform, changes ) )
      )
        Super.update_upstream_query.call(
          that,
          changes, // transformed changes
          destination,
          that._update_query( changes, destination, future_query_s ) // upstream_changes
        )
      ;
    }, // Input..update_upstream_query()
    
    /* ------------------------------------------------------------------------
        @method Input.._fetch( receiver, query, query_changes, destination )
        
        @short Fetches upstream source
        
        @parameters
        - **receiver** (Function): see method Plug.._fetch() for details
        - **query** (Array of Objects): optional query terms
        - **query_changes** (Array of Object) to optionally update local
          query
        - **destination** (@@class:Plug\): to route @@[operations]operation
        
        @description
        Optimizes query_changes, if any, calling method Input.._update_query()
        on future query.
        
        Then calls method Plug.._fetch() to fetch source, which will
        update the local query when fetch completes.
    */
    _fetch: function( receiver, query, query_changes, destination ) {
      var _query_changes, ___;
      
      if ( query_changes ) {
        // Find-out query_changes differences on future query
        
        // ToDo: apply _query_transform if defined on query_changes
        try {
          _query_changes = this._update_query( query_changes, destination, future_query_s );
          
        } catch( e ) {
          
          log( 'error, query history:', pretty( this[ query_s ].history ) );
          
          throw e
        }
        
        if ( ! changes_count( _query_changes ) )
          // There are no changes to forward upstream
          
          _query_changes = ___
        ;
      }
      
      // ToDo: Plug.._fetch(): switch semantic of parameters query_changes and __query_changes
      // adopt same semantic is Input..update_upstream_query, which is that last parameter
      // is upstream_changes provided by Input.._fetch() only.
      Super._fetch.call( this, receiver, query, _query_changes, destination, query_changes );
    }, // Input.._fetch()
    
    /* ------------------------------------------------------------------------
        @method Input.._update_query( changes, destination, query_name )
        
        @short Update input query with minimum changes
        
        @parameters:
        - **changes** (Array):
          - **0** (Array): @@query terms to remove
          - **1** (Array): @@query terms to add
        
        @returns
        - (Array): changes:
          - **0** (Array): query terms removed
          - **1** (Array): query terms added
        
        @description
        Apply changes to input query, return minimum set of changes.
    */
    _update_query: function( changes, destination, query_name ) {
      var that    = this
        , removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , rl      = removes.length
        , al      = adds.length
        , q
      ;
      
      if( rl + al ) {
        query_name = query_name || query_s;
        
        q = that[ query_name ] = that[ query_name ] || new Query( [], get_name( that ) + '-input_' + query_name );
        
        // log( get_name( that, '_update_query' ) + 'query_name: ' + query_name + ', changes:', changes, ', query:', q.query, ', optimized:', q.optimized );
        
        rl && q.remove( removes ); // would throw if there were any removes and there were no query before
        al && q.add   ( adds    );
        
        changes = q.discard_operations();
      }
      
      return changes;
    } // Input.._update_query()
  } } ); // Input instance methods
  
  /* --------------------------------------------------------------------------
      @class Output( pipelet, options )
      
      @short Base output @@class:Plug
      
      @parameters
      - **pipelet** (@@class:Pipelet\): output container
      
      - **options** (Object):
        - **name**: for Loggable, default is ```"out"```
        
        - **fork_tag** (String): optional @@tag to add to output transactions
        
        - **_t_postfix** (String): postifx to add to transactions, see
          @@class:Pipelet options for details
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
    
    // Transactions postfix
    that._t_postfix = options._t_postfix;
    
    // Output Query Tree router
    that.tree = new Query_Tree( name );
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
        - destination: (Input) the destination input
        
        - options (Optional Object):
          - no_fetch: do not fetch the source to remove
          - _t (Object): transaction object
        
        - then (Function): optional, called when subscription is complete
        
        @returns this
        
        @description
        Adds a destination input to this source output:
        
          this output ---> destination input
          
        The content of the this output is then fetched and added to destination
        input unless destination is lazy or has instance flag no_fetch set to
        true or option no_fetch is provided.
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
        
          this output --x--> destination input
        
        The content of this output is then fetched and removed from destination
        input unless destination is lazy or option no_fetch is provided.
    */
    remove_destination: function( destination, options, then ) {
      destination.remove_source( this, options, then );
      
      return this;
    }, // Output..remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Output.._add_destination( input )
        
        @short Adds a destination input to this output
        
        @parameters
        - **input** (Input): the destination input to add
          
        @throws
        - (Error):
          - input is already added to this output's destinations
        
        @description
        This is a low-level method that should not be used by external objects.
        
        This method can be overloaded by derived classes to:
          - change the implementation of destination(s) (done by
            @@method:Controllet.Output.._add_destination())
          - reject the addition by generating an exception.
          - trigger other actions on addition
          - redirect to another another pipelet (done by Encapsulate)
    */
    _add_destination: function( input ) {
      var destinations = this.destinations
        , position = destinations.indexOf( input )
      ;
      
      position != -1 && this.error( '_add_destination', 'already added, input: ' + get_name( input ) );
      
      destinations.push( input );
      
      return this;
    }, // Output.._add_destination()
    
    /* ------------------------------------------------------------------------
        @method Output.._remove_destination( input )
        
        @short Removes a destination input from this output plug.
        
        @parameters
        - input: the destination input to remove from this output destinations
        
        @emits
        - Event ```"disconnected"``` when its last input is removed.
        
        @throws
        - (Error): ```"not found"``` when input is not a known
          destination of this output.
        
        @description
        This is a low level method that can be overloaded. It is called
        by method Input.._remove_source_destination().
    */
    _remove_destination: function( input ) {
      var that         = this
        , destinations = that.destinations
        , position     = destinations.indexOf( input )
      ;
      
      position == -1 && that.error( '_remove_destination', 'not found, destination: ' + get_name( input ) );
      
      destinations.splice( position, 1 );
      
      // log( get_name( that, '_remove_destination' ) + 'input:', get_name( input ), destinations.length );
      
      destinations.length || that.emit( 'disconnected' );
      
      return that;
    }, // Output.._remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Output.._transactional_fetch( destination, transaction, count, query, query_changes, options, revert, next )
        
        @short Group one or more fetch in a transaction to emit operations
        
        @parameters
        - destination (Input): towards which adds (and eventually
          other operations) are emitted
        
        - transaction (Object): carries transaction information between calls
          of _transactional_fetch() in the same transaction.
        
        - count (Integer): the number of fetch operations, including this one,
          that are to be executed in a transaction.
        
        - query (Optional Array of AND-expressions): limiting returned
          operations.
        
        - query_changes (Array): optional, to synchronize fetch with query updates:
          0: removes (Array): removed subscription query terms
          1: adds    (Array): added subscription query terms
        
        - options (Object): optional:
          - _t (Object): a transaction object:
            - id (String): transaction id of a larger transaction this
              fetch is part of.
            
            - more (optional Boolean): true if this fetch is part of a
              larger ongoing transaction.
            
            - other optional transaction attributes
        
        - revert (Boolean):
          - true: revert received operations, adds becomes removes, removes becomes
            add, and updates are swaped
          - false: to not revert operations
        
        - next (Function): optional, called after fetch completes.
        
        @description
        Fetch data for a receiver pipelet, limited by an optional query and
        possibly within a transaction defined in options.
    */
    _transactional_fetch: function( destination, transaction, count, query, query_changes, options, revert, next ) {
      var that  = this
        , name  = '_transactional_fetch' // for debugging and error
        , ended = false // to assert that receiver is called with no_more true only once
        , rx    = revert ? revert_receiver : receiver
      ;
      
      that._fetch( rx, query, query_changes, destination );
      
      function revert_receiver( adds, no_more, removes, updates, _options ) {
        updates = updates && updates
          .map( function swap( update ) {
            return [ update[ 1 ], update[ 0 ] ];
          } )
        ;
        
        receiver( removes || [], no_more, adds, updates, _options );
      } // revert_receiver()
      
      function receiver( adds, no_more, removes, updates, _options ) { // ToDo: use _options
        // Assert no_more is emitted only once
        ended &&
          that.error( name,
            'already ended, no_more received twice from _fetch()'
          )
        ;
        
        if ( no_more ) ended = true;
        
        // Emit removes, updates, and adds, in that order
        var al   = adds.length
          , rl   = removes && removes.length || 0
          , ul   = updates && updates.length || 0
          
          , more = count > 1 || ! no_more
        ;
        
        //de&&ug( get_name( that, name ), { no_more: no_more, adds: al, removes: rl, updates: ul, options: _options } );
        
        if ( rl + ul + al ) {
          rl && destination.remove( removes, get_options( more || al || ul ) );
          ul && destination.update( updates, get_options( more || al       ) );
          al && destination.add   ( adds   , get_options( more             ) );
          
        } else if ( ! more /*&& transaction.t*/ ) { // ToDo: modify join() tests to allow commented-out optimization
          // Nothing was emitted yet, no more calls to receiver, and there were emissions in the past
          
          // ToDo: do not emit end-of-transaction event to destination if there was nothing emitted to this destination before
          destination.add( [], get_options( false ) );
        }
        
        no_more && next && next();
      } // receiver()
      
      function get_options( more ) {
        var o = transaction.o
          , t
        ;
        
        if( ! more || ! o ) {
          t = transaction.t = transaction.t || new Transaction( more ? 2 : 1, options );
          
          o = transaction.o = t.next().get_emit_options();
          
          count == 1 && t.end();
        }
        
        if( o && o._t )
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
          
          destination.add( values, options );
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
        
        @short Update local query tree with changes for destination.
        
        @parameter
        - **changes** (Array):
          - **0** (Array): @@query terms to remove from query tree
          - **1** (Array): query terms to add to query tree
        
        @returns (Array): unaltered ```changes``` parameter.
    */
    _update_query: function( changes, destination ) {
      var removes = changes[ 0 ]
        , adds    = changes[ 1 ]
        , tree    = this.tree
      ;
      
      // log( get_name( this, '_update_query' ) + 'changes:', changes );
      
      removes.length && tree.remove( removes, destination );
      adds   .length && tree.add   ( adds   , destination );
      
      return changes;
    }, // Output.._update_query()
    
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
        , _t_postfix
        , more
      ;
      
      // ToDo: optimize / merge _t changes for fork tag and postfix
      if ( fork_tag ) options = Options.add_fork_tag( options, fork_tag );
      
      if ( options )
        if ( _t = options._t ) {
          more = _t.more;
          
          if ( _t_postfix = that._t_postfix )
            ( _t = ( options = extend_2( {}, options ) )._t = extend_2( {}, _t ) ).id += _t_postfix
          ;
        }
      
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
      that.destinations.length && this._route( event_name, values, _t, options );
      
      that.emit_apply( event_name, [ values, options ] );
      
      more || that.emit_apply( 'complete', [ options ] );
    }, // Output..emit()
    
    /* ------------------------------------------------------------------------
        @method Output.._route( event_name, values, _t, options )
        
        @short Route an event to downstream pipelets using output query tree router.
        
        @parameters
        - event_name: (String) the name of the event (add, remove, update,
          clear)
        
        - values (optional Array of Object)
        
        - _t (optional transaction Object): from options
        
        - options (optional options Object)
        
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
      ;
      
      _t
        && ( end_of_transaction = ! _t.more )
        && _t.forks
        && ( terminated_inputs = [] ) // will collect terminated inputs
      ;
      
      if ( operation == 'clear' || values.length ) { // tree.route() returns no subscribers_operations when no values
        subscribers_operations = that.tree.route( operation, values ); // ToDo: tree.route(): do not emit empty operations
        
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
          
          var subscribers = that
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
              
              //de&&ug( name + 'terminated transaction, input:', get_name( input ), ', _t:', _t );
              
              // Do not emit if more is expected
              _t.more || input.add( [], { _t: _t } )
            } )
          ;
        }
      } // if end of transaction
      
      /* ----------------------------------------------------------------------
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
               
               See also duplicated behavior in Output.._concurrent_options()
            */
            o = transactions.get_options( input, o );
            
            no_more = ! o._t.more;
          } else {
            no_more = true;
          }
                    
          de&&ug( name + 'emitting to input: ' + get_name( input ) + ', options:', o );
          
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
    /*
    _pause_destination: function( destination ) {
    },
    
    _resume_destination: function( destination ) {
    },
    */
    
    /* ------------------------------------------------------------------------
        method Output..on_change( listener, context, once )
        
        @short listens to events 'add', 'remove', 'update', and 'clear' simultaneously.
        
        @parameters
        - event_name: (String) the name of the event.
            
        - listener: (Function) will be called with the parameters emitted by
          the event emitter.
          
        - context: (Object) optional, the context to call the listener, if not
          specified the context is this event emitter's instance.
          
        - once: (Boolean) optional, if true, the event listener will be
          removed right before the first __emit on this event.
        
        @description
        The event listener is then called with the following signatures:
        ```javascript
          listener( 'add'   , values , options )
          listener( 'remove', values , options )
          listener( 'update', updates, options )
          listener( 'clear' , void 0 , options )
        ```
    */
    /*
    on_change: function( listener, context, once ) {
      var that = this;
      
      this.on( 'add'   , function( v, o ) { listener.call( this, "add"   , v, o ) }, context, once );
      this.on( 'remove', function( v, o ) { listener.call( this, "remove", v, o ) }, context, once );
      this.on( 'update', function( v, o ) { listener.call( this, "update", v, o ) }, context, once );
      this.on( 'clear' , function( v, o ) { listener.call( this, "clear" , v, o ) }, context, once );
    }, // Output..on_change()
    */
    
    /* ------------------------------------------------------------------------
        method Output..on_complete( listener, context, once )
        
        @short listens to ```"complete"``` event
        
        @parameters
        - listener: (Function) will be called with the parameters emitted by
          the event emitter.
          
        - context: (Object) optional, the context to call the listener, if not
          specified the context is this event emitter's instance.
          
        - once: (Boolean) optional, if true, the event listener will be
          removed right before the first __emit on this event.
    */
    /*
    on_complete: function( listener, context, once ) {
      this.on( 'complete', listener, context, once );
    } // Output..on_complete()
    */
  } ); // Output plug instance methods
  
  /* --------------------------------------------------------------------------
      @class Pipelet( options )
      
      @short Base class for all pipelets
      
      @description:
      All @@(pipeline)s are made of connected instances of this class.
      
      Provides service for a @@synchronous, @@stateless, @@lazy pipelet.
      
      @parameters:
      - **options** (Object): optional pipelet parameters:
        - **name** (String): @@class:Loggable debugging name for this pipelet,
          default is the name of the pipelet class.
        
        - **key** (Array of Strings): @@key, dataflow values attribute names
          carrying objects' @@[identities](identity) - i.e. for which there
          is one and only one value in the set.
          
          Default is @@upstream pipelet key or ```[ 'id' ]``` if there are no
          upstream pipelets.
        
        - **fork_tag** (String): @@output @@transaction @@tag for
          @@concurrent pipeline graphs - i.e. there is a fork at this pipelet
          to multiple @@downstream pipelets that recombine concurrently
          downstream.
          
          This allows proper @@synchronization of concurrent transactions at
          the recombining point where the option tag (bellow) is set to the
          same value as this fork tag.
        
        - **tag** (String): @@input transaction tag for concurrent graph join
          - i.e. this pipelet recombines dataflows from an @@upstream fork
          tagged using option ```"fork_tag"``` having the same value as this
          tag.
        
        - **concurrent** (Object): option for class Input_Transactions():
          keys are tags, truly values means @@concurrent, if concurrent is
          null or undefined, all tagged transactions are considered
          concurrent. Therefore concurrents comes as a restriction which
          designate which tagged transactions are conccurent at this
          pipelet.
        
        - **_t_postfix** (String): postifx to add to @@class:Output
          @@transaction objects ```"id"``` attribute.
          
          This allows to differentiate transactions internal to a graph that
          is folded into a loop or similar situations where there is no actual
          concurrency between pipelines.
          
          This should not be used to circonvent untagged @@concurrent graphs.
          Doing so may prevent proper synchronization of graphs, which could
          lead to pipelets waiting forever the end of transactions, memory
          leaks, or worse.
          
          See pipelet dispatch() and pipelet application_loop() for more
          information.
        
        - **transactional** (Boolean): if true, pipelet is @@transactional,
          i.e. it will respond with an empty state ```[]``` when fetched.
        
        - **synchronous** (Boolean): if true, inputs of this pipelet will
          update queries synchronously with fetch in
          @@method:Input.._update_subscription(). This should be the
          default mode of operation for all pipelets, as this passes
          all CI tests, but does not work in some situations yet. More
          debugging/fixes are needed to make this work in all cases. In the
          interim, using this option allows to trigger the synchronous
          mode in situations where it is absolutely needed.
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
    that[ _scope_s ] = null;
    
    // inputs in addition to that._input
    that._inputs = that._inputs || [];
    
    // !! Always initialize _input and _output first, in all derived classes before calling that constructor
    input  = that._input  || ( that._input  = new Input ( that, name, options ) );
    output = that._output || ( that._output = new Output( that, options ) );
    
    // Set that._output.source if not already set
    output.source = output.source || input;
    
    // Ongoing transactions
    that._transactions = new Transactions( name );
    
    // Objects' key
    that._key = options.key;
    
    // Set tag to input.transactions if any.
    // !! This must be done after that._output is set for Controllets which route tags to their destinations
    input.set_tag( options.tag );
    
    // Output transactions fork tag to add to all emitted operations' transactions if defined
    that._fork_tag = options.fork_tag;
    
    if( options.transactional ) output._fetch = fetch_transactional;
    
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
        , input = new Input( methods, name, that._options.tag, that._input.transactions )
            .add_source( output._output || output )
      ;
      
      that._inputs.push( input );
      
      return input;
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
      
      throw new Error( message );
    }, // Pipelet.._emergency()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._make_key( value )
        
        @short Return the key of a value in the set
        
        @parameters:
        - value (Object): value which key is requested.
        
        @returns
        
        (String) key attributes values concatenated, separated with "#"
        
        @examples:
        ```javascript
          // Assuming the this._key == [ 'a', 'c' ]
          
          this._make_key( { a: 1, b: 2, c: "test" } )
          
          // -> "1#test"
        ```
        
        @description:
        Uses ```this._key``` to generate code @@JIT to return a unique a
        string for a value based on the key coordinates concatenation
        separated with ```"#"```.
        
        To regenerate code if this._key has changed, which should not
        be necessary for most applications, do:
        
        ```javascript
          Pipelet.prototype._make_key.call( this, object )
        ```
    */
    _make_key: function( object ) {
      return ( this._make_key
        = new Function( 'o', "return " + this._key
            
            .map( function( attribute ) {
              return 'o.' + attribute
            } )
            
            .join( "+'#'+" )
          )
      )( object );
    }, // _make_key()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__transform( values, options, caller )
        
        @short Synchronously transform source values into emitted values
        
        @parameters:
        - values (Array of Objects): values to transform
        - options (Object): @@operation options from
          @@method:Pipelet.._add / @@method:Pipelet.._remove /
          @@method:Pipelet.._update
        - caller (String): the name of the function that called __transform.
            current values are "fetch", "add", and "remove". Update calls the
            __transform twice, first as "remove", then as "add".
        
        @description:
        Transforms an array of values into an other array of values according
        to the current pipelet role.
        
        Default is to return all values unaltered. Every @@stateless pipelet
        should overload this method or make a @@composition using
        @@pipelet:alter().
    */
    __transform: function( values ) {
      return values;
    }, // __transform()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._transaction( count, options, f )
        
        @short Executes count @@(operation)s in a @@transaction
        
        @parameters:
        - count (Integer): number of operations in this transaction
        
        - options (Object): transaction options from @@upstream pipelet
        
        - f (Function): transaction processor, signature:
            f( transaction, count ):
            - this (Pipelet): context for this pipelet
            - transaction (@@(class:Transaction)): to @@emit operations to
            - count (Integer): number of operations
        
        @description:
        
        ### See Also
        - Method Transactions..get_transaction()
        - Method Pipelet..__emit_operations()
    */
    _transaction: function( count, options, f ) {
      var that         = this
        , transactions = that._transactions
      ;
      
      de&&ug( get_name( that, '_transaction' ) + 'count: ' + count + ', options:', options );
      
      var t = transactions.get_transaction( count, options, that._output, that._fork_tag );
      
      f.call( that, t, count )
      
      transactions.end_transaction( t );
    }, // _transaction()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._notify( transaction, options )
        
        @short Executes a multiple operations in a transactions.
        
        @parameters:
        - transaction: Array of actions. Each action has attributes:
          - action: string 'add', or 'remove', or 'update'
          - objects: Array of values for 'add' and 'remove' or updates. An
            update is an Array where the first item is the previous value and
            the second item is the new value

        - options: optional object of optional attributes
        
        @description:
        
        This method is deprecated, will be removed, DO NOT USE.
    */
    _notify: function( transaction, options ) {
      var that = this
        , l    = transaction.length
        , t    = new Transaction( l, options )
      ;
      
      transaction.forEach( function( a ) {
        log( '_notify', a );
        
        that[ '_' + a.action ]( a.objects, t.next().get_emit_options() );
      } );
    }, // _notify()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._add( added, options )
        
        @short Add @@(value)s to this pipelet then @@emit @@downstream
        
        @parameters:
        - added (Array of Objects): values to add
        
        - options (Object): optional @@operation meta-data
        
        @description:
        This @@operation method is called on @@upstream data events.
        
        This method is often overloaded by derived classes, the default
        behavior is to _notify downstream pipelets using
        @@method:Pipelet..__emit_add() of transformed values by
        @@method:Pipelet..__transform().
    */
    _add: function( added, options ) {
      this.__emit_add( this.__transform( added, options, 'add' ), options );
    }, // _add()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_add( added, options )
        
        @short Emits added @@(value)s @@downstream
        
        @parameters:
        - added (Array of objects): added values
        
        - options (Object): optional @@operation meta-data
        
        @description:
        This method is typically called by @@method:Pipelet.._add() after
        transforming or storing objects.
        
        It may be deprecated in the future in favor of calling directly
        @@method:Pipelet..__emit() or @@method:Output..emit().
    */
    __emit_add: function( added, options ) {
      this.__emit( 'add', added, options );
    }, // __emit_add()
    
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
      this.__emit_remove( this.__transform( removed, options, 'remove' ), options );
    }, // _remove()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_remove( removed, options )
        
        @short Emits removed @@(value)s @@downstream
        
        @parameters:
        - removed (Array of objects): removed values
        
        - options (Object): optional @@operation meta-data
        
        @description:
        This method is typically called by @@method:Pipelet.._remove() after
        transforming or storing objects.
        
        It may be deprecated in the future in favor of calling directly
        @@method:Pipelet..__emit() or @@method:Output..emit().
    */
    __emit_remove: function( removed, options ) {
      this.__emit( 'remove', removed, options );
    }, // __emit_remove()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._update( updates, options )
        
        @short Updates @@values then @@emit @@downstream
        
        @parameters:
        - updates (Array of Arrays): each update is an Array of two objects
          ```[ remove, add ]```:
          - remove (Object): value prior to the update
          - add (Object): new value after the update
        
        - option (Object): optional @@operation meta-data
        
        @description:
        This method processes @@update @@operations for this pipelet. It is
        typically overloaded by derived classes.
        
        This version of update is meant to ease the developpement of pipelets
        by calling @@method:Pipelet.._remove() then @@method:Pipelet.._add()
        methods for each update in a @@transaction.
        
        However, doing so, it splits updates into @@remove and @@add
        @@operations which makes it more difficult for downstream pipelets
        to perform operations specific to updates.
        
        If a strict update semantic is desired, one can either:
        - overload this update method to not split updates; or
        - use pipelet optimize() downstream of this pipelet
          which will recombine remove and add operations in a transaction
          into semantically @@strict update operations.
    */
    _update: function( _updates, options ) {
      var that  = this
        , _l    = _updates.length
        , moves = options && options.moves
      ;
      
      if( moves ) delete options.moves;
      
      de&&ug( get_name( that, '_update' ) + 'updates: ' + _l );
      
      // ToDo: add test for nested transactions
      that._transaction( _l ? 2: 0, options, function( t ) {
        var updates = _updates, l = _l
          , i = -1, update
          , options = t.next().get_emit_options() // ToDo: find a way to use get_options() instead of get_emit_options()
          , add_options = options
          , remove_options = options
        ;
        
        if ( --l ) {
          // there is more than one update
          for( l -= 1; i < l; ) {
            update = updates[ ++i ];
            
            moves && move_options( options );
            
            that._remove( [ update[ 0 ] ], remove_options );
            that._add   ( [ update[ 1 ] ],    add_options );
          }
        }
        
        // last (or only) update
        update = updates[ ++i ];
        
        add_options = t.next().get_emit_options();
        
        moves && move_options( add_options );
        
        that._remove( [ update[ 0 ] ], remove_options );
        that._add   ( [ update[ 1 ] ],    add_options );
        
        function move_options( _add_options ) {
          var move = moves[ i ];
          
          remove_options = extend( {},      options, { locations: [ move.from ] } );
             add_options = extend( {}, _add_options, { locations: [ move.to   ] } );
        }
      } );
    }, // _update()
    
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
    */
    __emit_update: function( updated, options ) {
      this.__emit( 'update', updated, options );
    }, // __emit_update()
    
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
    _clear: function( options ){
      this.__emit_clear( options );
    }, // _clear()
    
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
      this.__emit( 'clear', null, options );
    }, // __emit_clear()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit_operations( added, removed, updates, options )
        
        @short Emits a number of operations ( add / remove / update ) as a transaction.
        
        @parameters:
        - added: (Array) of added values. Can be undefined to specify that
          there is nothing to add.
        
        - removed: (Array) of removed values. Can be undefined to specify that
          this is nothing to remove.
        
        - updates: (Array) of updated values. Can be undefined to specify that
          this is nothing to update.
        
        - options: (Object) additional options to send to downstream pipelets:
          - _t (optional Object): a transaction
        
        @description:
        If options specify a transaction with a fork, at least one empty add
        operation is emitted, to indicate that this branch has completed
        although it had nothing to update.
        
        ### ToDo List
        - ToDo: add CI tests for __emit_operations()
        - ToDo: rename __emit_operations() into _emit_operations()
    */
    __emit_operations: function( added, removed, updates, options ) {
      var that   = this
        , al     = added   && added  .length ? 1 : 0
        , rl     = removed && removed.length ? 1 : 0
        , ul     = updates && updates.length ? 1 : 0
        , l      = al + rl + ul
        , t
      ;
      
      if( l ) {
        l > 1 && that._transaction( l, options, function( _t ) { t = _t } );
        
        rl && that.__emit_remove( removed, next_options() );
        ul && that.__emit_update( updates, next_options() );
        al && that.__emit_add   ( added  , next_options() );
        
      } else if( options && ( t = options._t ) && ! t.more ) {
        // If there this is the end of the transaction
        // We need to forward at least one operation downstream
        that.__emit_add( [], options );
      }
      
      function next_options() {
        return t ? t.next().get_emit_options() : options;
      }
    }, // __emit_operations()
    
    // Shortcut methods to default input and output
    
    /* ------------------------------------------------------------------------
        @method Pipelet..__emit( event_name, values, options )
        
        @short Emits values to this pipelet's @@output
    */
    __emit: function( event_name, values, options ) {
      this._output.emit( event_name, values, options );
    }, // __emit()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._on( event_name, listener, that, once )
        
        @short Listen to this pipelet's output events
        
        @description:
        This method is deprecated, do not use.
    */
    _on: function( event_name, listener, that, once ) {
      this._output.on( event_name, listener, that, once );
      
      return this;
    }, // _on()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._add_source( source, options, then )
        
        @short Connect this pipelet's @@input to an @@upstream @@output
    */
    _add_source: function( s, options, then ) {
      this._input.add_source( s._output || s, options, then );
      
      return this;
    }, // _add_source()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._remove_source( source, options, then )
        
        @short Disconnect this pipelet's @@input from an @@upstream @@output
    */
    _remove_source: function( s, options, then ) {
      this._input.remove_source( s._output || s, options, then );
      
      return this;
    }, // _remove_source()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._add_destination( destination, options, then )
        
        @short Connect this pipelet's @@output to @@downstream @@input
    */
    _add_destination: function( d, options, then ) {
      this._output.add_destination( d._input || d, options, then );
      
      return this;
    }, // _add_destination()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._remove_destination( destination, options, then )
        
        @short Disconnect this pipelet's @@output from @@downstream @@input
    */
    _remove_destination: function( d, options, then ) {
      this._output.remove_destination( d._input || d, options, then );
      
      return this;
    }, // _remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Pipelet.._fetch_all( receiver, query )
        
        @short Fetch content from this pipelet's output
    */
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
        
        #### Using
        - Pipelet dispatch()
    */
    through: function through( pipelet, options, then ) {
      pipelet._input.add_source( this._output, options, then );
      
      return pipelet;
    }, // through()
    
    // Helper method, asserts input is an Input
    _assert_Input: function( input ) {
      input.pipelet || this._emergency( '_assert_Input', 'requires Input, got: ' + get_name( input ) );
      
      return input;
    }, // _assert_Input()
    
    // Helper method for remove_source_with() and remove_destination_with()
    _once_input_remove_source: function( source, listener ) {
      this._assert_Input( source._input || source )
      
        .once( 'remove_source', listener )
      ;
      
      return this;
    }, // _once_input_remove_source()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..remove_source_with( source, output )
        
        @short Disconnect pipelet's @@input when ```source``` disconnects
        
        @parameters
        - **source** (Pipelet or Input): to listen to event
          ```"renove_source"``` triggering the disconnection of this pipelet
          input from ```output```
        
        - **output** (Pipelet or Output): optional, default is this pipelet
          input source.
        
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
      
      return this
        ._once_input_remove_source( source, remove_source )
      ;
      
      function remove_source( _, options ) {
        output = output ? output._output || output : input.source;
        
        // log( get_name( input, 'remove_source_with' ) + 'remove from output:', get_name( output ) );
        
        output && input.remove_source( output, options );
      } // remove_source()
    }, // remove_source_with()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..remove_destination_with( source, input )
        
        @short Disconnect @@[destinations]destination when ```source``` disconnects
        
        @parameters
        - **source** (Pipelet or Input): to listen to event
          ```"renove_source"``` triggering the disconnection of this pipelet
          input from ```output```
        
        - **input** (Pipelet or Input): optional, default is this pipelet
          output's first @@(destination).
        
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
      
      return that
        ._once_input_remove_source( source, remove_source )
      ;
      
      function remove_source( _, options ) {
        ( input ? [ that._assert_Input( input._input || input ) ] : output.destinations.slice() )
          .forEach( remove_input )
        ;
        
        function remove_input( input ) {
          // log( get_name( output, 'remove_destination_with' ) + 'remove:', get_name( input ) );
          
          input.remove_source( output, options );
        }
      } // remove_source()
    }, // remove_destination_with()
    
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
    */
    set_namespace: function( pipelet ) {
      return ( this[ _scope_s ] = assert_scope( pipelet )[ _scope_s ] )[ _mixin_s ]( this );
    }, // set_namespace()
    
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
    */
    namespace: function() {
      return assert_scope( this )[ _scope_s ][ _namespace_s ];
    }, // namespace()
    
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
          factories_status[ factory ] = !!that[ factory ]
        ;
      
      de&&ug( get_name( namespace ) + ', ' + name
        + ', factories:', factories_status
        , ', instances:', Object.keys( namespace[ _scope_s ] ).filter( function( factory ) { return factory.charAt( 0 ) != '_' } )
      );
      
      return that;
    }, // log_namespace()
    
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
    */
    create_namespace: function( name, is_repository ) {
      return create_namespace( assert_scope( this ), name, is_repository );
    }, // create_namespace()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..Compose( name, options, composition )
        
        @short Build a pipelet from one or more pipelets
        
        @parameters
        - **name** (String): the name of the pipelet
        
        - **options** (Object): optional, define optional attributes:
          - **union** (Boolean): if true this @@composition is encapsulated with a union input
            so that the composition is a single pipelet to which additional inputs may be
            added. See multi-pipelet compositions bellow for details.
            
          - **singleton** (Boolean): if true, this @@composition is a @@singleton, i.e. it has
            at most one instance. It will be instanciated once, at the first invocation.
            Subsequent invocations will reuse the singleton instance and parameters will be
            ignored.
          
          - **multiton** (Function): this @@composition is a @@multiton, i.e. it has less
            instances than invocations. For each invocation multiton() is called with the
            same parameters as composition() without the source pipelet as first parameter;
            multiton() should return a unique index string for each singleton of the
            multiton.
            
            The first time an index is returned, composition() is instantiated. Subsequent
            invocations returning the same index reuse the instance returned by the first
            instantiation of composition().
        
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
          
          - **options** (Object): coming from the pipelet options augmented with
            default options, see important warning bellow!
          
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
        - Method Pipelet..Singleton()
        - Method Pipelet..Multiton()
        
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
        throw new Error( 'Compose "' + name + '", Error: ' + message );
      } // fatal()
    }, // Compose()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..Singleton( name, composition )
        
        @short Compose a @@singleton pipelet
        
        @description:
        See method Pipelet..Compose() for behavior with options
        ```"union"``` and ```"singleton"``` set to true.
        
        ### See Also
        - Method Pipelet..Multiton()
        - Method Pipelet..Compose()
    */
    Singleton: function singleton( name, composition ) {
      return this.Compose( name, { union: true, singleton: true }, composition );
    }, // Singleton()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..Multiton( name, multiton, composition )
        
        @short Compose a @@multiton pipelet
        
        @parameters
        - name (String): name of @@(composition).
        - multiton (Function): See method Pipelet..Compose(), option
          ```"multiton"```.
        - composition (Function): @@composition, See method
          Pipelet..Compose(), parameter ```composition```.
        
        @description
        See method Pipelet..Compose() for behavior with options ```"union"```
        set to ```true``` and ```"multiton"``` set to parameter ```multiton```.
        
        ### See Also
        - Method Pipelet..Singleton()
        - Method Pipelet..Compose()
    */
    Multiton: function Multiton( name, multiton, composition ) {
      return this.Compose( name, { union: true, 'multiton': multiton }, composition );
    }, // Multiton()
    
    /* ------------------------------------------------------------------------
        @method Pipelet..set_output( output_name [, scope] )
        
        @method Pipelet..output( output_name [, scope] )
        
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
      scope = scope || this[ _scope_s ];
      
      scope[ output_name ]
        && this._emergency( 'set_output', 'already set, name: ' + output_name )
      ;
      
      return scope[ output_name ] = this;
    }, // set_output()
    
    output: function output( output_name, scope ) {
      return ( scope || this[ _scope_s ] )[ output_name ]
        || this._emergency( 'output', 'not set, name: ' + output_name )
      ;
    }, // output()
    
    // Global RS object, the dictionary of all Toubkal Pipelet Programmer classes
    RS: RS
  } ); // Pipelet instance methods
  
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
  */
  Pipelet.Add = function( name, pipelet_factory, namespace ) {
    namespace = namespace || rs;
    
    fatal( Pipelet.Check_Name( name, namespace ) );
    
    pipelet_factory.length == 2
      || fatal( ', pipelet_factory() must have exactly 2 parameters' )
    ;
    
    de&&ug( 'Pipelet.Add(): name: ', name, ', namespace:', Object.keys( namespace[ constructor_s ].class_names ) );
    
    var _factory = pipelet_factory;
    
    factory.singleton = singleton;
    factory.multiton  = multiton;
    
    return namespace[ _add_factory_s ]( name, factory );
    
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
        var singletons = source[ _scope_s ]
          , pipelet    = singletons[ name ]
        ;
        
        de&&ug( 'singleton ' + name + '(), found: ' + !!pipelet );
        
        // ToDo: allow pipelet_factory() to return null or undefined
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
          , singletons = source[ _scope_s ]
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
    'adds', 'map', 'set', 'flow', 'join', 'last', 'next', 'form', 'once', 'beat', 'pick', '$on'
  ];
  
  Pipelet.Check_Name = function check_name( name, namespace ) {
    if ( namespace[ constructor_s ][ prototype_s ][ name ] )
      return 'is already defined'
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
        considered options if is at the same position as the options parameter
        of constructor ```( constructor.length - 1 )```.
      
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
      4) { key: source._key }
      5) { key: [ 'id' ] }
      
      If parameters does not provide options for the pipelet or if its
      ```"name"``` attribute is not defined, attempts to locate the filename
      and position of the initiator in the stack trace. This works in Chrome
      and helps debugging unnamed pipelets. More tests are needed to
      verify that this works in other browsers and node.
      
      @tests
      set_default_options() has a full test suite in test/src/pipelet.coffee
      verifying all features of this documentation.
  */
  var set_default_options_s = 'set_default_options';
  
  Pipelet[ set_default_options_s ] = set_default_options;
  
  function set_default_options( constructor, source, parameters, defaults ) {
    var default_options        = constructor.default_options
      , constructor_length     = constructor.length
      , typeof_default_options = typeof default_options
      , options                = extend_2( { key: source._key || [ 'id' ] }, defaults )
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
      
      last_parameter.name || name_after_caller_location();
    } else {
      name_after_caller_location();
    }
    
    parameters[ constructor_length - 1 ] = options;
    
    // de&&ug( name + 'options:', options );
    
    function name_after_caller_location() {
      try {
        throw new Error( '' );
      } catch( e ) {
        var stack = e.stack
          , i     = 3
          , frame
        ;
        
        if( typeof stack == 'string' ) {
          stack = stack.split( '\n' );
          
          while(
              ( frame = stack[ ++i ] || '' )
            &&
              (
                  frame.indexOf( 'pipelet.js' ) > 0
                ||
                  frame.indexOf( 'lib/toubkal-min.js'  ) > 0
              )
          );
          
          options.name += ' (' + frame.trim() + ' )';
        }
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
  var operations = [ 'add', 'remove', 'update', 'clear' ];
  
  function set_pipelet_operations( Pipelet_Class, f ) {
    operations.forEach( function( event_name ) {
      Pipelet_Class[ prototype_s ][ '_' + event_name ] = f( event_name );
    } );
  } // set_pipelet_operations()
  
  /* --------------------------------------------------------------------------
      @pipelet encapsulate( input, output, options )
      
      @short Make a single pipelet from a @@pipeline
      
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
          return source
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
                          |                |
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
  */
  function Encapsulate( input, output, options ) {
    this._input  = input._input;
    this._input_pipelet = input;
    
    this._output_pipelet = output;
    this._output = output._output;
    
    Pipelet.call( this, extend( {}, options, { key: output._key } ) );
    
    this[ _scope_s ] = output[ _scope_s ];
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
        
        , remove_options
        , add_options
      ;
      
      // log( get_name( that, 'update_query' ) + 'to:', get_name( destination ), removes, adds );
      
      if( rl && al ) {
        // Create transaction
        that._transaction( 2, {}, function( t ) {
          remove_options = t.next().get_emit_options();
             add_options = t.next().get_emit_options();
        } )
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
        
        @parameters:
        - method_name (String): name of the routed method
        - parameters (Array): parameters of method
        - then (Function): optional, called when all destinations have called
          their ```"then"``` parameter which must be the last parameter but
          should not be provided in parameters.
        
        @returns this
        
        @description
        
        This method is currently used to route:
        - Method Controllet.Input..set_tag()
        - Method Controllet.Input..add_branches()
        - Method Controllet.Input.._add_source_subscription()
        - Method Controllet.Input.._remove_source_subscription()
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
        
        See method Controllet.Input..route_to_destinations() used to route
        this method to all destinations.
    */
    set_tag: function( tag ) {
      tag && this.route_to_destinations( 'set_tag', [ this.tag = tag ] )
    }, // Controllet.Input..set_tag()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input..add_branches( count )
        
        @short Route to all destinations method Input..add_branches()
        
        @description
        Also adds parameter ```count```, which may be negative, to
        ```this.branches```.
        
        See method Controllet.Input..route_to_destinations() used to route
        this method to all destinations.
    */
    add_branches: function( count ) {
      this.branches += count; // ToDo: DRY with Input..add_branches()
      
      // de&&ug( get_name( this, 'add_branches' ) + 'routing adding ' + count + ' branches, new total:', this.branches );
      
      return this.route_to_destinations( 'add_branches', [ count ] );
    }, // Controllet.Input..add_branches()
    
    _terminate_source_transaction: function( source, options ) {
      
      return this.route_to_destinations( '_terminate_source_transaction', [ source, options ] );
    }, // _terminate_source_transaction()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._add_source_subscription( source, options, then )
        
        @short Route to all destinations method Input.._remove_source_subscription()
        
        @description
        
        See method Controllet.Input..route_to_destinations() used to route
        this method to all destinations.
    */
    _add_source_subscription: function( source, options, then ) {
    
      return this.route_to_destinations( '_add_source_subscription', [ source, options ], then );
    }, // Controllet.Input.._add_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._remove_source_subscription( source, options, then )
        
        @short Route to all destinations method Input.._remove_source_subscription()
        
        @description
        
        See method Controllet.Input..route_to_destinations() used to route
        this method to all destinations.
    */
    _remove_source_subscription: function( source, options, then ) {
    
      return this.route_to_destinations( '_remove_source_subscription', [ source, options ], then );
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
        Sets @@tag of paramenter ```input``` to this controlet input tag as
        set by method Controllet.Input..set_tag().
        
        Then calls method Output.._add_destination().
    */
    _add_destination: function( input ) {
      input.set_tag( this.source.tag );
      
      return Super._add_destination.call( this, input );
    }, // _add_destination()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Output..update_upstream_query( changes, destination )
        
        @short
        
        Route method Plug..update_upstream_query() to pipelet input source
        
        @description
        If this controllet has an @@upstream source, route this method to
        that source, therefore not updating this pipelet queries.
        
        See Also method Controllet.Input..is_lazy() which then needs to
        query all destinations to find out if it is lazy or not.
    */
    update_upstream_query: function( changes, destination ) {
      var source = this.source.source;
      
      source && source.update_upstream_query( changes, destination );
    } //  Controllet.Output..update_upstream_query()
  } } ); // Controllet.Output instance attributes
  
  /* --------------------------------------------------------------------------
      @pipelet union( sources, options )
      
      @short Forwards many sources to one destination
      
      @parameters:
      - sources (Array of Pipelets): list of sources
      - options (Object):
        - name (String): debugging name for this union
        - tag (String): transactions @@tag for this union
        - concurrent (Object): concurrent transaction tags, each key in the
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
    
    that._pipelet_input = null;
    
    sources && sources.forEach( function( source ) {
      that._add_source( source ); // ToDo: pass transaction option to _add_source
    } );
  } // Union()
  
  function Union_Input( p, name, options, input_transactions ) {
    Controllet_Input.call( this, p, name, options, input_transactions );
    
    this.sources = [];
  }
  
  Union.Input = Controllet_Input.subclass(
    'Union.Input', Union_Input, {
    
    /* ------------------------------------------------------------------------
        @method Union.._source_position( source )
        
        @short: returns position of source in Input sources
        
        @returns:
          - -1: source not found in this Input sources
          - positive Integer: position of source in this Input sources
    */
    _source_position: function( source ) {
      return this.sources.indexOf( source );
    }, // Union.Input.._source_position()
    
    _add_source: function( source ) {
      var that    = this
        , sources = that.sources
      ;
      
      sources.indexOf( source ) != -1
        && that._source_error( '_add_source', 'source already added: ', source )
      ;
      
      sources.push( source ); // See Union..__emit() when changing this line
      
      return that;
    }, // Union.Input.._add_source()
    
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
  
  function Union_Output( p, options ) {
    Controllet_Output.call( this, p, options )
  }
  
  Union.Output = Controllet_Output.subclass(
    'Union.Output', Union_Output, {
    
    /* ------------------------------------------------------------------------
        @method Union.Output.._fetch( receiver, query, query_changes, destination )
        
        @short Fetches all sources of union.
        
        ToDo: Union.Output.._fetch(): add tests
    */
    _fetch: function( receiver, query, query_changes, destination ) {
      var that    = this
        , sources = that.source.sources
        , count   = sources.length || ( sources = [[]], 1 )
        , filter
        , paused  = []
      ;
      
      sources.forEach( fetch_source );
      
      function fetch_source( source ) {
        var complete = false;
        
        // log( get_name( that, 'fetch_source' ) + 'source:', get_name( source ), ', count:', count );
        
        source._fetch
          ? source._fetch( rx, query, query_changes, destination )
          : // Source should be an Array of Objects
            rx(
              query && source.length
                ? ( filter || ( filter = new Query( query, get_name( that ) + '-union-_fetch' ).generate().filter ) )( source )
                : source
              ,
              true
            )
        ;
        
        function rx( adds, no_more, removes, updates, options ) {
          complete &&
            // This is a bug, needs to be reported back to the team that implemented source
            that.error( '_fetch#rx'
              , 'source "' + get_name( source ) + '" sent more content after completing'
            )
          ;
          
          if ( complete = no_more ) --count;
          
          // There is no local query to update because this is a controllet which output query tree is never used.
          
          if ( ! count || adds.length + ( removes && removes.length || 0 ) + ( updates && updates.length || 0 ) )
            receiver( adds, ! count, removes, updates, options )
          ;
          
          /*
          if ( no_more  ) {
            if ( count ) {
              // There are still sources for which fetch is not complete
              
              // Pause this source from emitting to prevent inconsistent states
              var pause = source._pause_destination;
              
              if ( pause ) {
                pause.call( source, that );
                
                paused.push( source );
              }
            } else {
              // All sources fetches are now complete, resume all paused sources
              paused.forEach( function( source ) {
                source._resume_destination( that );
              } );
            }
          }
          */
        } // rx()
      } // fetch_source()
    }, // Union.Output.._fetch()
    
    update_upstream_query: function( changes, destination ) {
      this.source.sources.forEach( function( source ) {
        var update_upstream_query = source.update_upstream_query;
        
        update_upstream_query
          && update_upstream_query.call( source, changes, destination )
        ;
      } );
    } // Union.Output..update_upstream_query()
  } ); // Union.Output instance attributes
  
  Controllet.Build( 'union', Union, {
    // ToDo: consider using Controllet's output to emit instead
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
          
          // Remove this from sources, as it always emits nothing when fetched, and will never be removed
          .sources.splice( -1, 1 )
        ;
      }
      
      input._output.emit( event_name, values, options );
    } // __emit()
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
    
    _fetch: function( rx ) {
      Input[ prototype_s ]._fetch.call( this, rx );
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
  
  /* -------------------------------------------------------------------------------------------
      @pipelet delay( delay, options )
      
      @short Delay operations by "delay" miliseconds
      
      @parameters:
      - delay: (Integer) delay in miliseconds
      - options (Object): @@class:Pipelet options
      
      @description:
      All @@upstream @@(operation)s are delayed as well as @@downstream fetch and subcription
      updates.
      
      Intented Purposes:
      - Simultate a distant pipelet by introducing a delay in all operations and _fetch().
      - Test asynchronous behavior of pipelets.
      
      This is a @@stateless, @@asynchronous, @@lazy pipelet.
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
        Input[ prototype_s ]._fetch.call( that, _receiver, query )
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
        Output[ prototype_s ].update_upstream_query.call( that, changes, input )
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
    'Greedy'           : Greedy,
    'Delay'            : Delay
  } );
  
  de&&ug( "module loaded" );
  
  return rs; // global
} ); // pipelet.js
