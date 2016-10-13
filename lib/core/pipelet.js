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
    , log                    = RS.log.bind( null, 'pipelet' )
    , extend                 = RS.extend
    , extend_2               = extend._2
    , is_array               = RS.is_array
    , subclass               = RS.subclass
    , Loggable               = RS.Loggable
    , get_name               = RS.get_name
    , picker                 = RS.picker
    , Root                   = subclass.Root
    , new_apply              = subclass.new_apply
  ;
  
  var push     = Array.prototype.push
    , slice    = Array.prototype.slice
    , concat   = Array.prototype.concat
    , toString = Object.prototype.toString
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug( message )
     
     Logs an error message if de is true.
  */
  var de = false, ug = log;
  
  /* --------------------------------------------------------------------------
      @class Plug( pipelet, name )
      
      @short Base class for Input and Output plugs.
      
      @parameters:
      - pipelet (Pipelet): a reference to the pipelet this plug is attached to.
      
      - name (String): the name for this plug, used in traces
      
      @description:
      Class Input() plugs are meant to receive data events from Class Output()
      plugs.
      
      Plug derives from Class Event_Emitter().
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
      message = get_name( this, method ) + message;
      
      var error = new Error( message );
      // ToDo: report error to global error dataflow or error output
      
      if ( then ) {
        log( error.stack );
        
        then( error )
      } else
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
      var that                  = this
        , query_transform       = that._query_transform
        , source                = that.source
        , update_upstream_query
      ;
      
      if ( ! query_transform || changes_count( changes = map_query_changes( query_transform, changes ) ) ) {
        //de&&ug( get_name( that, 'update_upstream_query' ) + 'changes:', RS.log.s( changes ), '\n  source:', source && get_name( source ) );
        
        changes = that._update_query( changes, destination );
        
        update_upstream_query = source && source.update_upstream_query;
        
        update_upstream_query
          && changes_count( changes )
          && update_upstream_query.call( source, changes, that )
        ;
      }
    }, // Plug..update_upstream_query()
    
    // Virtual Plug.._update_query( changes )
    
    /* ------------------------------------------------------------------------
        @method Plug..fetch_unfiltered( receiver, query_changes )
        
        @short Fetches content, not filteed by a query
        
        @parameters:
        - receiver (Function): see @@method:Plug.._fetch() receiver parameter
        - query_changes (Array): optional changes for upstream @@subscription
          query
        
        @description:
        This method is not implemented by class @@class:Plug but if
        overloaded it is called by @@method:Plug.._fetch().
        
        It is typically implemented by @@stateful pipelets to emit the full
        set of values that may then be filtered by @@method:Plug.._fetch().
        
        The "query_changes" parameter should not be defined if not used.
    */
    
    /* ----------------------------------------------------------------------------------
        @method Plug.._fetch( receiver, query, query_changes, destination, __query_changes )
        
        @short Fetches data from source then updates local queries.
        
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
        
        - __query_changes (Array): optional query changes to apply on receiver
          instead of query_changes. (provided by overloaded @@Input.._fetch())
        
        - options (Object):
          - clock: Lamport clock after which to start fetching values
        
        @description:
          Operation:
            - transforms queries using this._query_transform() if defined.
            
            - Call receiver immediately with an empty set of values if query (after
              optional transformation) is the null query: [],
              
              otherwise call this.fetch_unfiltered() if defined,
              
              otherwise call this.source._fetch() if this.source is defined,
              
              otherwise call receiver() immediatly with an empty set of values;
            
            - Call this._update_query() synchronously when fetched values are received,
              or before calling receiver() with an empty set of values;
            
            - Filters fetched values using query if this.fetch_unfiltered() is defined
              or using this._transform() if defined (and this.fetch_unfiltered() is not
              defined);
            
            - Receiver can emits adds, removes and updates, in a transaction;
          .
          
          Synhronization between fetch and query updates is done by updating local
          queries calling this._update_query() only when fetched values are received.
          
          Assuming that fetch and other operations travel without changes in order, this
          allows synchronization, maintaining dataflow consistency over asynchronous
          networks.
          
          This may be challenged by delayed transactions in pipelets that only emit when
          complete. If a fetch happens in the middle of such a transaction, pipelets
          must emit values to fetch receivers consistently.
    */
    _fetch: function( receiver, query, query_changes, destination, __query_changes ) {
      __query_changes = __query_changes || query_changes;
      
      var that             = this
        , name             = de && get_name( that, "_fetch" )
        , transform
        , fetch_unfiltered = that.fetch_unfiltered
        , query_transform  = ( ! fetch_unfiltered || fetch_unfiltered.length > 1 ) && that._query_transform
        , _query           = query
        , _query_changes   = query_changes
        , _update_query    = __query_changes && that._update_query
        , _rx
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
          
          if ( ! ( _query.length || _query_changes && changes_count( _query_changes ) ) )
            return rx( [], true )
          ;
        }
      }
      
      if ( _query && ! _query.length ) {
        de&&ug( name, 'nul query' );
        
        _rx( [], true );
      } else if ( fetch_unfiltered ) {
        if ( query ) {
          transform = function( /* ignore options */ ) {
            return filter = filter || new Query( query ).generate().filter
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
      
      function rx( adds, no_more, removes, updates, options ) {
        // ToDo: delay response until related transactions are complete at this plug.
        
        // Apply changes on local query, synchronized with receiver() call bellow
        no_more && _update_query && _update_query.call( that, __query_changes, destination );
        
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
  
  /* -------------------------------------------------------------------------------------------
      @class Input( pipelet, name, tag, input_transactions )
      
      @short An input plug.
      
      @parameters
      - pipelet (Pipelet): input owner and destination
      - name     (String): for Loggable
      - tag      (String): optional input transactions tag
      - input_transactions (Input_Transactions): optional shared with other inputs
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
    
    this.transactions = input_transactions || new Input_Transactions( name, this );
    
    // ToDo: inputs should allow multiple tags and branches count should be related to a tag
    this.tag = tag || null;
    
    this.branches = 0;
  } // Input()
  
  Plug.subclass( 'Input', Input, function( Super ) { return {
    /* ------------------------------------------------------------------------
        @method Input..set_tag( tag )
        
        @short Sets input transactions' tag.
        
        @parameters
        - tag (String): optional transaction tag from an upstream fork tag
          dispatching operations over a number of concurrent bramches.
        
        @returns undefined
        
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
    */
    set_tag: function( tag ) {
      tag && this.transactions.set_tag( this.tag = tag );
    }, // Input..set_tag()
    
    /* ------------------------------------------------------------------------
        @method Input..add_branches( count )
        
        @short Add or remove input transactions' source branches.
        
        @parameters
        - count (Integer): positive to add, negative to remove.
        
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
      
      de&&ug( get_name( that, 'add_branches' ) + 'added ' + count + ' branches, total branches: ' + that.branches );
      
      return that;
    }, // Input..add_branches()
    
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
          fully updated, including possible asynchronous fetches.
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
        
        @short Unsubscribe and disconnects this input from source.
        
        @parameters:
        - source: (Array of Objects, or Output) the source to remove
        
        - options:
          - no_fetch (Boolean): do not _fetch the source to remove values
            from destination
        
        - then (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
        
        @description:
        Cuts the connection between upstream source pipelet and this pipelet.
        
          source --x--> this
        
        The content of source is then fetched and removed from this pipelet
        unless this pipelet is lazy or option ```"no_fetch"``` is true.
        
        It is @@synchronous if option ```"no_fetch"``` is true, and can be
        @@assynchronous otherwise.
        
        Before removing source, emits event ```"remove_source"``` which
        allows to disconnect dependent pipelets connections and is provided
        with source and options.
        
        ### See Also
        - Method Pipelet..remove_source_with()
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
              // ToDo: (optionally) wait for pending fetches to complete or kill pending fetches
              de&&ug( get_name( that, 'remove_source' ) + 'removed source subscription, options:', options );
              
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
        @method Input.._source_position( source )
        
        @short: returns position of source in Input sources
        
        @returns:
          - -1: source not found in this Input sources
          - positive Integer: position of source in this Input sources
    */
    _source_position: function( source ) {
      return this.source === source ? 0 : -1;
    }, // Union.Input.._source_position()
    
    /* ------------------------------------------------------------------------
       Input.._source_error( function_name, message, source, then )
       
       Private helper method for add_source() and remove_source().
       
       Throws a bad source type Error for function_name.
    */
    _source_error: function( function_name, message, source, then ) {
      // ToDo: add_source() and remove_source(), add test for bad source type
      this.error( function_name,
        ( message || 'expected instance of Output or Array, got a ' ) + get_name( source ),
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
        
        @parameters
        - source (Output), providing branches_count() method.
        
        @returns this
    */
    _add_source_branches: function( source ) {
      return this.add_branches( source.branches_count() );
    }, // Input.._add_source_branches()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_branches( source )
        
        @short Removes as many branches as source reports
        
        @parameters
        - source (Output), providing branches_count() method.
        
        @returns this
    */
    _remove_source_branches: function( source ) {
      return this.add_branches( - source.branches_count() );
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
       Input.._remove_source( source )
       
       Removes an upstream source output from this input.
       
       This is a low-level method that should not be called directly.
       
       Parameters:
         - source (Output or Array of Objects): to remove from this input
       
       Exception:
         - source is not a source of this input
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
        de&&ug( get_name( that, '_update_source_array' ) + 'source:', typeof source );
        
        var q = that.query;
        
        if ( q ) source = q.filter( source );
        
        that[ remove ? 'remove' : 'add' ]( source, options_forward( options ) );
      }
      
      return that;
    }, // Input.._update_source_array()
    
    /* ------------------------------------------------------------------------
        @method Input.._add_source_subscription( source, options, then )
        
        @short Add source query and fetch.
        
        @parameters:
        - source (Output): to subscribe to
        
        - options (Object):
          - _t (Object): transaction object
          
          - no_fetch (Boolean): do not fetch if true.
        
        - then (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
    */
    _add_source_subscription: function( source, options, then ) {
      var that  = this
        , q     = that.query
      ;
      
      that._update_subscription( [ [], q && q.query ], that._fetch_option( options ), source, then );
      
      return that;
    }, // Input.._add_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Input.._remove_source_subscription( source, options, then )
        
        @short Fetch then remove source query.
        
        @parameters:
        - source (Output): subscribed to
        
        - options (Object):
          - _t (Object): transaction object
          
          - no_fetch (Boolean): do not fetch if true.
        
        - then (Function): optional function called when subscription is
          fully updated, including possible asynchronous fetches.
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
          fully updated, including possible asynchronous fetches.
    */
    _update_subscription: function( changes, options, source, then ) {
      var input = this;
      
      if ( source || ( source = input.source ) ) {
        de&&ug( get_name( input, '_update_subscription' ), 'changes:', changes, ', source:', get_name( source ) );
        
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
        .remove_source( that, output.transactions )
        
        .forEach( function( _t ) {
          // Terminate transaction at this input
          
          // ToDo: add warning condition, removing pipelet connection in the middle of a transaction.
          RS.log( 'notice:', get_name( that, '_transactions_remove_source' )
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
        @method Input.._fetch( receiver, query, query_changes, destination )
        
        @short Fetches upstream source
        
        @description:
          Transmits upstream optimized query changes, if any
    */
    _fetch: function( receiver, query, query_changes, destination ) {
      var that             = this
        , _query_changes   = query_changes
        , _update_query    = query_changes && that._update_query
      ;
      
      if ( _update_query ) {
        // Find-out query_changes differences with current query
        
        // ToDo: optimize the following, possibly implementing additional Query methods:
        _query_changes = _update_query.call( that, query_changes, destination );
        
        // Undo query changes for now, will be applied later by Plug.._fetch#rx() if any
        _update_query.call( that, [ query_changes[ 1 ], query_changes[ 0 ] ], destination );
        
        if ( ! changes_count( _query_changes ) )
          // There are no changes to forward upstream
          
          _query_changes = null
        ;
      }
      
      Super._fetch.call( that, receiver, query, _query_changes, destination, query_changes );
    }, // Input.._fetch()
    
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
        
        // log( get_name( this, '_update_query' ) + 'changes:', changes, ', query:', q.query, ', optimized:', q.optimized );
        
        rl && q.remove( removes ); // would throw if there were any removes and there were no query before
        al && q.add   ( adds    );
        
        changes = q.discard_operations();
      }
      
      return changes;
    } // Input.._update_query()
  } } ); // Input instance methods
  
  /* -------------------------------------------------------------------------------------------
     Output( pipelet, name )
     
     An output plug.
     
     Parameters:
     - pipelet (Pipelet): output owner
     - name (String): for Loggable
  */
  function Output( pipelet, name ) {
    var _ = this;
    
    name = name || 'out';
    
    Plug.call( _, pipelet, name );
    
    // Destinations, downstream inputs
    _.destinations = [];
    
    // Output transactions
    _.transactions = new Output_Transactions( name );
    
    // Transactions postfix, will be set by pipelet
    _._t_postfix = null;
    
    // Output Query Tree router
    _.tree = new Query_Tree( name );
  } // Output()
  
  Plug.subclass( 'Output', Output, {
    /* ------------------------------------------------------------------------
        @method Output..branches_count()
        
        @short Reports the number of branches this output provides.
        
        @returns count (Integer), the number of source branches this output
        provides.
        
        @description
        By default a pipelet has one branch, for its own output.
        
        @@class:Controllet.Output overloads this method.
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
      
      de&&ug( get_name( that, 'add_destination' ) + 'destination: ' + get_name( destination ) );
      
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
      
      position != -1 && this.error( '_add_destination', 'already added, input: ' + get_name( input ) );
      
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
      
      position == -1 && this.error( '_remove_destination', 'not found, destination: ' + get_name( input ) );
      
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
        
        - options (Object): optional
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
        , transaction = {}
        , sync    = fetch && false // ToDo: remove sync variable once fully validated with applications
      ;
      
      rl * fetch
        && source._transactional_fetch( input, transaction, count, removes, sync && [ removes, [] ], options, true, _then )
      ;
      
      // Update upstream query trees and queries if not synchronized and there are query changes
      // ToDo: remove update_upstream_query():
      sync || count && source.update_upstream_query( changes, input );
      
      de&&ug( get_name( source, '_update_subscription' ) + 'updated query, count:', count )
      
      _then && _then();
      
      al * fetch
           // ToDo: add test to verify that second fetch uses transaction
        && source._transactional_fetch( input, transaction, 1, adds, sync && [ [], adds ], options, false, _then )
      ;
    }, // Output.._update_subscription()
    
    /* ------------------------------------------------------------------------
        @method _transactional_fetch( destination, transaction, count, query, query_changes, options, revert, then )
        
        @short Group one or more fetch in a transaction.
        
        @description:
          Fetch data for a receiver pipelet, limited by an optional query and
          possibly within a transaction defined in options.
        
        @parameters:
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
          destination.add( [], get_options( false ) );
        }
        
        no_more && next && next();
      } // receiver()
      
      function get_options( more ) {
        var transactions = that.pipelet._transactions // ToDo: or should it be plain Transaction instances as with _route()?
          , o            = transaction.o
        ;
        
        if ( ! more || ! o ) {
          var t = transaction.t || ( transaction.t
            = transactions.get_transaction( more ? 2 : 1, options )
          );
          
          o = transaction.o = t.next().get_emit_options();
          
          count == 1 && transactions.end_transaction( t );
        }
        
        //de&&ug( get_name( that, name ) + 'options:', o );
        
        return o;
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
      
      // log( get_name( this, '_update_query' ) + 'changes:', changes );
      
      removes.length && tree.remove( removes, destination );
      adds   .length && tree.add   ( adds   , destination );
      
      return changes;
    }, // Output.._update_query()
    
    /* ------------------------------------------------------------------------
        @method Output..emit( event_name, values, options )
        
        @short Emits @@operation to @@downstream @@input
        
        @parameters:
        - event_name: (String) the name of the event: "add", "remove",
          "update", or "clear".
        
        - values (Array of Objects): emitted, may be undefined for "clear"
        
        - options (Object): @@operation meta-data
        
        @description:
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
      var that     = this
        , fork_tag = that.pipelet._fork_tag
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
        
        @parameters:
        - event_name: (String) the name of the event (add, remove, update,
          clear)
        
        - values (optional Array of Object)
        
        - _t (optional transaction Object): from options
        
        - options (optional options Object)
        
        @description:
        Properly terminates transactions emitting to downstream pipelet the
        minimum number of operations, and synchronizing transactions in
        coordination with downstream pipelets.
        
        ToDo: add transactions tests for _route()
    */
    _route: function( operation, values, _t, options ) {
      var that                   = this
        , name                   = de && get_name( that, '_route' )
        , transactions           = that.transactions
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
        @method Output..on_change( listener, context, once )
        
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
        @method Output..on_complete( listener, context, once )
        
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
      - options: (Object) optional parameters:
        - name (String): @@class:Loggable debugging name for this pipelet,
          default is the name of the pipelet class.
        
        - @@key (Array of Strings): dataflow values attribute names carrying
          objects' @@[identities](identity) - i.e. for which there is one and
          only one value in the set.
          
          Default is @@upstream pipelet key or ```[ 'id' ]``` if there are no
          upstream pipelets.
        
        - fork_tag (String): @@output @@(transaction)s @@tag for diamond
          graph entrance - i.e. fork at this pipelet to multiple @@downstream
          pipelets that recombine downstream.
          
          This allows proper @@synchronization of transactions at the
          recombining point where the option tag (bellow) is set to the same
          value as this fork tag.
        
        - tag (String): @@input transactions tag for diamond graph exit -
          i.e. this pipelet recombines dataflows from an @@upstream fork
          tagged using option ```"fork_tag"``` having the same value as this
          tag.
        
        - _t_postfix (String): postifx to add to @@transaction objects "id"
          attribute.
          
          This allows to differentiate transactions internal to a graph that
          is folded into a loop.
          
          This should not be used to circonvent untagged diamond graphs.
          Doing so will prevent proper synchronization of graphs, most
          likely leading to pipelets waiting forever the end of
          transactions, memory leaks, or worse.
  */
  function Pipelet( options ) {
    var that = this
      , name
      , input
      , output
      , _t_postfix
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
    
    // Set tag to input.transactions if any.
    // !! This must be done after that._output is set for Controllets which route tags to their destinations
    input.set_tag( options.tag );
    
    // Output transactions fork tag to add to all emitted operations if defined
    // ToDo: set this directly into output, see _t_postfix bellow
    that._fork_tag = options.fork_tag;
    
    // Transactions postfix
    if ( _t_postfix = options._t_postfix ) output._t_postfix = _t_postfix;
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
      this._transaction( transaction.length, options, function( t, l ) {
        for ( var i = -1, a; ++i < l; ) {
          a = transaction[ i ];
          
          this[ '_' + a.action ]( a.objects, t.next().get_emit_options() ); // ToDo: should be using get_options()
        }
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
      var that = this
        , _l   = _updates.length
      ;
      
      de&&ug( get_name( that, '_update' ) + 'updates: ' + _l );
      
      // ToDo: add test for nested transactions
      that._transaction( _l ? 2: 0, options, function( t ) {
        var updates = _updates, l = _l
          , i = -1, update
          , options = t.next().get_emit_options() // ToDo: find a way to use get_options() instead of get_emit_options()
        ;
        
        if ( --l ) {
          // there is more than one update
          for( l -= 1; i < l; ) {
            update = updates[ ++i ];
            
            that._remove( [ update[ 0 ] ], options );
            that._add   ( [ update[ 1 ] ], options );
          }
        }
        
        // last (or only) update
        update = updates[ ++i ];
        
        that._remove( [ update[ 0 ] ], options );
        that._add   ( [ update[ 1 ] ], t.next().get_emit_options() );
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
    
    /* ------------------------------------------------------------------------
        @method Pipelet..remove_source_with( source, output, source_output )
        
        @short Disconnect this pipelet's @@input when ```source``` disconnects
        
        @parameters
        - **source** (Pipelet or Input): to listen to event
          ```"renove_source"``` triggering the disconnection of this pipelet
          input from ```output```
        
        - **output** (Pipelet or Output): optional, default is this pipelet
          input source.
        
        - **source_output** (Output): optional, if specified, specifies which
          specific source of source should trigger the disconnection
        
        @description
        This method allows to set a disconnection constraint between a source
        connection (```source_output``` to ```source```), and a target
        connection (```output``` to ```this._input``` pipelet).
        
        Doing so allows to properly release resources when
        @@[pipelines](pipeline) are disassembled, typically when
        pipelet dispatch() removes a branch, therefore preventing memory
        leaks that would result from pipelets connected to typically
        @@singleton and @@multiton pipelets.
        
        ### See Also
        - Method Input..remove_source()
        - Pipelet dispatch()
        - Pipelet cache()
        - Pipelet socket_io_synchronizing()
    */
    remove_source_with: function( source, output, source_output ) {
      var input = this._input;
      
      output = output ? output._output || output : input.source;
      
      source = source._input || source;
      
      source.on( 'renove_source', remove_source );
      
      return this;
      
      function remove_source( _output, options ) {
        if( !source_output || _output === source_output ) {
          input.remove_source( output, options );
          
          source.remove_listener( 'renove_source', remove_source );
        }
      }
    }, // remove_source_with()
    
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
      return ( this[ _scope ] = assert_scope( pipelet )[ _scope ] )[ _mixin ]( this );
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
      return assert_scope( this )[ _scope ][ _namespace ];
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
        , factories        = Object.keys( namespace.constructor.prototype )
        , factories_status = {}
        , i                = -1
        , factory
      ;
      
      while ( factory = factories[ ++i ] )
        if ( factory != 'constructor' )
          factories_status[ factory ] = !!that[ factory ]
        ;
      
      de&&ug( get_name( namespace ) + ', ' + name
        + ', factories:', factories_status
        , ', instances:', Object.keys( namespace[ _scope ] ).filter( function( factory ) { return factory.charAt( 0 ) != '_' } )
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
        @method Pipelet..Compose( name [, options], composition )
        
        @short Build a pipelet from one or more pipelets
        
        @parameters:
        - name (String): the name of the pipelet
        
        - options (optional Object): define optional attributes:
          - union (Boolean): if true this @@composition is encapsulated with a union input
            so that the composition is a single pipelet to which additional inputs may be
            added. See multi-pipelet compositions bellow for details.
            
          - singleton (Boolean): if true, this @@composition is a @@singleton, i.e. it has
            at most one instance. It will be instanciated once, at the first invocation.
            Subsequent invocations will reuse the singleton instance and parameters will be
            ignored.
          
          - multiton (Function): this @@composition is a @@multiton, i.e. it has less
            instances than invocations. For each invocation multiton() is called with the
            same parameters as composition() without the source pipelet as first parameter;
            multiton() should return a unique index string for each singleton of the
            multiton.
            
            The first time an index is returned, composition() is instantiated. Subsequent
            invocations returning the same index reuse the instance returned by the first
            instantiation of composition().
        
        - composition (Function): this is the constructor for the pipelet @@composition
          that must return a Pipelet instance instead of this.
          
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
          
          Composition must return a pipelet with the same namespace as source. If composition()
          returns null or undefined, it's pipelet instances will return the source namespace.
        
        @returns:
        - (Pipelet): this (Current pipelet instance), allowing to:
          - chain multiple Compose() definitions
          - use the composed pipelet immediately
          - chain other pipelets after Compose()
        
        @description:
        #### !!! Important Warning regarding composition's "options" parameter:
          The composition MUST define an "option" parameter, otherwise difficult-to-debug
          exceptions will occur such as '... has no method ...'.
          
          Because minification can optimize the options parameter out, programmers MUST use the
          options parameter in at least one function call, typically to pass the options to another
          pipelet.
          
          The example bellow will not have this issue because the options parameter is used in the
          filter() and aggregate() pipelets.
          
          We highly recommend testing all code minified to prevent this kind of surprise in
          production.
          
        #### Multi-pipelet compositions:
          The output of the composition is the pipelet returned by the composition.
          
          This is fine in most cases but if the composition has multiple pipelets and one
          attempts to connect additional sources to the composition these will effectively
          connect to the last pipelet of the composition:
          
          ```
            source ---> composition inner pipelets --->|
                                                       | ---> last pipelet ----> destination
                                additional sources --->|
          ```
          
          This is most likely not what one wants. What one wants is the following graph:
          
          ```
            source             --->|
                                   | ---> composition pipelets ----> destination
            additional sources --->|
          ```
          
          Set option "union" to ```true``` to prevent this issue, which will encapsulate
          the composition is into a single pipelet using a @@pipelet:union() input and
          @@pipelet:encapsulate().
        
        @examples:
        
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
          var input = source.namespace()
            
            .union( [], { name: name + ' (Compose input union)', key: source._key } )
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
      scope = scope || this[ _scope ];
      
      scope[ output_name ]
        && this._emergency( 'set_output', 'already set, name: ' + output_name )
      ;
      
      return scope[ output_name ] = this;
    }, // set_output()
    
    output: function output( output_name, scope ) {
      return ( scope || this[ _scope ] )[ output_name ]
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
    if ( output[ _scope ] ) return output;
    
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
      that._output = { pipelet: that, is_namespace: true },
      
      that[ _add_factory ] = add_factory;
      
      function add_factory( name, factory ) {
        de&&ug( get_name( that, _add_factory ), name );
        
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
              de&&ug( get_name( that, _mixin ) + 'property:', p );
              
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
    'adds', 'map', 'set', 'flow', 'join', 'last', 'next', 'form', 'once', 'beat', 'pick', '$on'
  ];
  
  Pipelet.Check_Name = function check_name( name, namespace ) {
    if ( namespace[ constructor ].prototype[ name ] )
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
      , name                   = 'set_default_options(' + ( defaults ? ' "' + defaults.name + '" ' : '' ) + '), '
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
    }
    
    parameters[ constructor_length - 1 ] = options;
    
    // de&&ug( name + 'options:', options );
    
    function fatal( message ) {
      throw new Error( name + message );
    } // fatal()
    
    function ordinal( n ) {
      return [ '', 'first', 'second', 'third', n + 'th' ][ n ];
    } // ordinal()
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
    
    this[ _scope ] = output[ _scope ];
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
  
  /* -------------------------------------------------------------------------------------------
      @pipelet query_updates( from, options )
      
      @short Get query updates from pipelet
      
      @parameters:
        - from (Pipelet): the pipelet which inputs emit upstream query updates.
        
        - options (Object):
      
      @description:
        This is a @@synchronous, @@stateless, @@lazy pipelet.
        
        Emits adds and removes corresponding to "from" upstream query updates.
        
        Allows to create caches and complex lazy pipelines, i.e. pipeline
        built from downstream subscriptions such as lazy authorizations.
        
        When fetched it always calls the receiver immediately with no data.
      
      @examples:
        - A multi-flow reactive cache (stateful and lazy):
        
          ```javascript
          rs.Compose( 'cache', function( source, options ) {
            var rs         = source.namespace()
              , downstream = rs.pass_through( options )
            ;
            
            return source
              .filter( rs.query_updates( downstream ), options )
              
              .set()
              
              .union( [ downstream ] )
            ;
          } ) // cache()
          ```
  */
  function Query_Updates( from, options ) {
    var that   = this
      , output = new Output( null, options.name )
    ;
    
    Pipelet.call( that );
    
    output._fetch = fetch;
    output.update_upstream_query = update_upstream_query;
    
    from._input.add_source( output );
    
    function update_upstream_query( changes, destination ) {
      var removes = changes[ 0 ]
        , adds    = changes[ 1 ]
      ;
      
      // ToDo: handle transactions on query updates to allow optimize() to emit updates
      // ToDo: or create transactions on all query changes over some time on query removes, allowing downstream optimize()
      removes.length && that._remove( removes );
      adds   .length && that._add   ( adds    );
    } // update_upstream_query()
    
    function fetch( receiver, query, query_changes, destination ) {
      query_changes && update_upstream_query( query_changes );
      
      receiver( [], true );
    } // fecth()
  } // Query_Updates()
  
  Pipelet.Build( 'query_updates', Query_Updates );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet pass_through( options )
      
      @short A pipelet typically used as a temporary variable for cyclic graphs
      
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
      A pass_through() pipelet forwards its upstream operations downstream without any
      change.
      
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
      source -------------------------------------------------> destination(s)
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
    
    that._input  || ( that._input  = new Controllet.Input ( that, name, options.tag ) );
    that._output || ( that._output = new Controllet.Output( that, name ) );
    
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
      @class Controllet.Input( pipelet, name, tag, input_transactions )
      
      @short Input for class Controllet()
      
      @description
      Controllet inputs are responsible for routing class Input() methods
      to all destinations of this controllet.
  */
  Controllet.Input = Pipelet.Input.subclass(
    'Controllet.Input',
    
    function( p, name, tag, input_transactions ) {
      Pipelet.Input.call( this, p, name, tag, input_transactions );
    }, {
    
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
        
        If all destionations inputs are lazy then this controllet input
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
        this method to all destionations.
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
        this method to all destionations.
    */
    add_branches: function( count ) {
      this.branches += count; // ToDo: DRY with Input..add_branches()
      
      // de&&ug( get_name( this, 'add_branches' ) + 'routing adding ' + count + ' branches, new total:', this.branches );
      
      return this.route_to_destinations( 'add_branches', [ count ] );
    }, // Controllet.Input..add_branches()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._add_source_subscription( source, options, then )
        
        @short Route to all destinations method Input.._remove_source_subscription()
        
        @description
        
        See method Controllet.Input..route_to_destinations() used to route
        this method to all destionations.
    */
    _add_source_subscription: function( source, options, then ) {
    
      return this.route_to_destinations( '_add_source_subscription', [ source, options ], then );
    }, // Controllet.Input.._add_source_subscription()
    
    /* ------------------------------------------------------------------------
        @method Controllet.Input.._remove_source_subscription( source, options, then )
        
        @short Route to all destinations method Input.._remove_source_subscription()
        
        @description
        
        See method Controllet.Input..route_to_destinations() used to route
        this method to all destionations.
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
  Controllet.Output = Pipelet.Output.subclass(
    'Controllet.Output',
    
    function( p, name ) { Pipelet.Output.call( this, p, name ) }, function( Super ) { return {
    
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
        
        @short Route method Plug..update_upstream_query() to pipelet input source, if any
        
        @returns undefined
        
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
      - name: debugging name for this union
      - tag: transactions @@tag for this union
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
      
      // ToDo: implement Query_Tree, have upstream pipelet advertize publications (at least flows) downstream
      this.sources = [];
    }, {
    
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
      
      sources.push( source );
      
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
  
  Union.Output = Controllet.Output.subclass(
    'Union.Output',
    
    function( p, name ) { Controllet.Output.call( this, p, name ) }, {
    
    /* ------------------------------------------------------------------------
        @method _fetch( receiver, query, query_changes, destination )
        
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
        
        source._fetch
          ? source._fetch( rx, query, query_changes, destination )
          : // Source should be an Array of Objects
            rx(
              query && source.length
                ? ( filter || ( filter = new Query( query ).generate().filter ) )( source )
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
      var that    = this
        //, de      = true
        , name    = de && get_name( that, 'update_upstream_query' )
        , sources = that.source.sources
      ;
      
      sources.forEach( function( source ) {
        de&&ug( name + 'source:', get_name( source ) );
        
        source.update_upstream_query
          && source.update_upstream_query( changes, destination )
        ;
      } );
    } // Union.Output..update_upstream_query()
  } ); // Union.Output instance attributes
  
  Controllet.Build( 'union', Union, {
    // ToDo: forbid external pipelets calling __emit(), breaking encapsulation
    // For now, when they do, we add a pass_through() which is a hack to allow broken encapsulation to work
    // Another option is to emit a warning
    __emit: function( event_name, values, options ) {
      var that = this;
      
      that._pipelet_input
        || ( that._pipelet_input = that.namespace().pass_through( { name: get_name( that ) + ' input' } ) ).through( that )
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
      
      @short Greedily @@subscribe to @@upstream events
      
      @description:
      This is a @@stateless, @@synchronous, @@greedy pass-through pipelet.
  */
  function Greedy( options ) {
    this._input = this._input || new Greedy.Input( this, options.name, options.tag );
    
    Pipelet.call( this, options );
  } // Greedy()
  
  Pipelet.Build( 'greedy', Greedy );
  
  function Greedy_Input( p, name, input_transactions ) {
    Pipelet.Input.call( this, p, name, input_transactions );
    
    // Query everything from upstream, makes me greedy
    this.query = Query.pass_all;
    
    // We want everything now
    this.no_fetch = false;
  } // Greedy_Input()
  
  Greedy.Input = Pipelet.Input.subclass(
    'Greedy.Input', Greedy_Input, {
    
    _fetch: function( rx ) {
      Pipelet.Input[ prototype ]._fetch.call( this, rx );
    }, // Greedy.Input.._fetch()
    
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
      @pipelet alter( transform, options )
      
      @short Call transform() on each added, removed, and fetched @@(value).
      
      @parameters:
      - transform (Function or Object):
        - (Function): transform( value, operation, options ) -> undefined:
          - value (Object): to shallow-mutate, alter() shallow copies values before calling
            transform().
          - operation (String): "add", "remove", or "fetch"
          - options (Object): optional, may include transaction object, do not mutate
          
          transform() MUST mutate its value parameter which is shallow-cloned prior to calling
          transform() but SHOULD NOT mutate Object and Array attributes.
          
          Any returned value by transform() is ignored.
          
        - (Object): set static properties into all values
      
      - options (Object): pipelet options plus:
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
      
      @examples:
      
      - Alter a source dataflow of stocks to produce a dataflow of P/E ratios from price
        and earnings attributes. Optionally provide query_transform for lazy behavior:
        
        ```javascript
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
        ```
      
      - Add a 'stock_prices' flow attribute using an Object transform:
      
        ```javascript
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
        ```
      
      @description:
      See also @@pipelet:map() which does not shallow copy values before
      calling transform(), and using value returned by transform().
      
      This is a @@stateless, @@synchronous pipelet. It is @@lazy if option "query_transform" is
      a Function, @@greedy otherwise. When greedy, alter() will:
      - fetch all values from upstream regardless of downstream queries
      - ignore downstream query updates
  */
  
  // ToDo: alter(), provide default query_transform when transform is an object or deprecate object transform
  // ToDo: alter(), add full test suite
  function Alter( transform, options ) {
    var that            = this
      , no_clone        = that._no_clone = that._no_clone || false // set to true by Map()
      , name            = options.name
      , query_transform = options.query_transform
    ;
    
    that._input  = that._input  || new Alter.Input ( that, name, query_transform );
    that._output = that._output || new Alter.Output( that, name, query_transform );
    
    //de&&ug( 'Alter(), options:', options );
    
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
    
    that._input._transform = that.__transform.bind( that );
    
    function error( message ) {
      throw new Error( 'Alter(): ' + message );
    } // error
  } // Alter()
  
  function Alter_Input( p, name, query_transform, tag, input_transactions ) {
    var that = this;
    
    // ToDo: inputs, provide query_transform, tag and maybe input_transactions as options
    Pipelet.Input.call( that, p, name, tag, input_transactions );
    
    if ( ! query_transform ) {
      // Input is greedy, but, unlike greedy(), does not require to fetch immediately
      
      // Query everything from upstream
      that.query = Query.pass_all;
      
      // Do not forward upstream queries upstream
      that.update_upstream_query = function() {};
    }
  } // Alter_Input()
  
  Alter.Input = Pipelet.Input.subclass( 'Alter.Input', Alter_Input );
  
  function Alter_Output( p, name, query_transform ) {
    var that = this;
    
    Pipelet.Output.call( that, p, name );
    
    this._query_transform = query_transform;
    
    if ( ! query_transform ) {
      // alter() is greedy, need to filter fetched results or update query, transformed by Alter.Input
      
      that.fetch_unfiltered = function( receiver ) {
        that.source._fetch( receiver, null, null, that );
      };
    }
  } // Alter_Output()
  
  Alter.Output = Pipelet.Output.subclass( 'Alter.Output', Alter_Output );
  
  Pipelet.Build( 'alter', Alter, {
    _update: function( _updates, options ) {
      // Don't split updates unless transform() does not return exactly one value
      
      var that    = this
        , t       = that.__transform
        , adds    = []
        , removes = []
        , updates = []
      ;
      
      _updates.forEach( function( update ) {
        var removed = t( [ update[ 0 ] ], "remove", options )
          , added   = t( [ update[ 1 ] ], "add"   , options )
          , rl      = removed.length
          , al      = added.length
        ;
        
        if ( rl == 1 && al == 1 ) {
          updates.push( [ removed[ 0 ], added[ 0 ] ] );
        } else {
          rl && push.apply( removes, removed );
          al && push.apply( adds   , added   );
        }
      } );
      
      that.__emit_operations( adds, removes, updates, options );
    } // _update()
  } ); // alter()
  
  /* -------------------------------------------------------------------------------------------
      @class Set
      
      @short Base class for @@stateful pipelets
  */
  
  /* --------------------------------------------------------------------------
      @pipelet set( values, options )
      
      @short Unordered @@stateful pipelet
      
      @parameters:
      - values: optional, set initial content;
        - (Array)     : add values
        - (Object)    : add [ values ]
        - (other type): add [ { id: values } ]
      
      - options: @@Greedy options:
        - name: set name
        
        - key: Objects identity attributes, default is [ 'id' ]
      
      @description:
      This is the base pipelet for stateful pipelets.
      
      This is a @@stateful, @@@synchronous, @@greedy pipelet.
      Derived classes may be @@asynchronous.
      
      ### See Also
      - Class Set()
      - Pipelet unique()
      - Pipelet order()
  */
  function Set( values, options ) {
    var that = this;
    
    that._output = that._output || new Set.Output( that, options.name );
    
    Greedy.call( that, options );
    
    // ToDo: review anti-state logic
    that.a = []; // The current state of the set
    that.b = []; // Anti-state, removes waiting for adds
    
    if ( values ) {
      is_array( values )
        || ( values = [ typeof values == 'object' ? value : { id: values } ] )
      ;
      
      values.length && that._add( values );
    }
    
    de&&ug( get_name( that, 'Set' ) + 'name:', options.name, 'length:', that.a.length );
  } // Set()
  
  function Set_Output( p, name ) { Greedy.Output.call( this, p, name ) }
  
  Set.Output = Greedy.Output.subclass(
    'Set.Output', Set_Output, {
    
    /* ------------------------------------------------------------------------
       fetch_unfiltered( receiver )
       
       Fetches set's current state, possibly in several chunks, unfiltered.
       
       Called by Plug.._fetch() which filters it with optional query
    */
    fetch_unfiltered: function( receiver ) {
      receiver( this.pipelet.a, true )
    } // fetch_unfiltered()
  } ); // Set.Output
  
  Greedy.Build( 'set', Set, {
    /* ------------------------------------------------------------------------
        @method Set.._clear( options )
        
        @short Clears set content then notifes downsteam Pipelets.
    */
    _clear: function( options ) {
      this.a = [];
      
      return this.__emit_clear( options );
    }, // get()
    
    /* ------------------------------------------------------------------------
        @method Set.._add( values, options )
        
        @short Add values to the set
        
        @parameters:
        - values (Array of Objects): values to add to set
        - options (Object):
          - locations (Array of Integers): provided by upstream
            @@pipelet:order() pipelet. Locations are never forwarded (i.e.
            removed) downstream but are used to call @@method:Set.._add_value()
        
        @description:
          Calls @@method:Set.._add_value() for each individual value in values.
    */
    // Todo: Set.._add(): filter-out duplicate adds
    // ToDo: Set.._add(): optimize when .._add_value() is not overloaded
    _add: function( values, options ) {
      var locations = options && options.locations;
      
      // If there are locations, these cannot be forwared if values are handled
      // asynchronously by a derived class, therefore we remove locations from
      // options
      if ( locations ) {
        options = extend( {}, options );
        
        delete options.locations;
      }
      
      return this._transaction( values.length, options, function( t, l ) {
        de&&ug( get_name( this, '_add' ) + 'values: ' + l );
        
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
    
    /* ------------------------------------------------------------------------
        @method Set.._add_value( transaction, value, emit_now, location )
        
        @short Add a value to the set
        
        @parameters:
        - transaction (@@class:Transaction): transaction instance for this
          operation
        - value (Object): value to add
        - emit_now (Boolean):
          - true: emit value downstream immediately
          - false: emit values in builk at the end of the transaction
        - location (Integer): optional location to insert value into set,
          as provided by optional upstream @@pipelet:order() pipelet.
        
        @description:
        Add value synchronously to set.
        
        This method can be overloaded by derived classes to allow asynchronous
        add operations, calling this method later or implenenting set's state
        with other methods.
        
        The transaction object allows proper grouping of all asynchronous
        adds, emiting operations either one value at a time (option emit_now
        set to true) or in bulk only at the end of transactions (option
        emit_now set to false).
        
        When implementing _add_value() in a derived class, the transaction
        object must be invoqued consistently with the number of values
        originally added in the operation by either calling
        @@method:Transaction..__emit_add() or
        @@method:Transaction..emit_nothing(). See also @@class:Transaction
        for more details and methods allowing to maintain transaction
        consistency.
    */
    // ToDo: test Set.._add_value()
    _add_value: function( transaction, value, emit_now ) {
      if ( value ) {
        var that = this
          , b    = that.b
        ;
        
        if ( b.length ) {
          var p = that._b_index_of( value );
          
          if ( p != -1 ) {
            de&&ug( get_name( that, '_add_value' ) + 'removing add from anti-state' );
            
            b.splice( p, 1 );
            
            transaction.emit_nothing();
            
            return;
          }
        }
        
        // ToDo: should we insert at location or keep ignoring it?
        that.a.push( value );
        
        transaction.__emit_add( [ value ], emit_now );
      } else {
        transaction.emit_nothing();
      }
    }, // _add_value()
    
    // ToDo: test Set.._add_values()
    _add_values: function( transaction, values, emit_now ) {
      var that  = this
        , b     = that.b
        , added = []
        , i     = -1
        , l     = values.length
        , v
      ;
      
      while( b.length && ++i < l ) {
        // There are values in the antistate b, waiting for an add or
        // _update, or conflict resolution
        var p = that._b_index_of( v = values[ i ] );
        
        if ( p == -1 ) {
          added.push( v );
        } else {
          de&&ug( get_name( that, '_add_value' ) + 'removing add from anti-state' );
          
          b.splice( p, 1 );
        }
      }
      
      if ( i == -1 ) {
        added = values;
      } else if ( i < l ) {
        push.apply( added, values.slice( ++i ) );
      }
      
      push.apply( that.a, added );
      
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
      // asynchronously by a derived class, therefore we remove locations from
      // options
      if ( locations ) {
        options = extend( {}, options );
        
        delete options.locations;
      }
      
      return this._transaction( values.length, options, function( t, l ) {
        de&&ug( get_name( this, '_remove' ) + 'values: ' + l );
        
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
      var that    = this
        , removed = []
      ;
      
      if ( value ) {
        var p = that._a_index_of( value );
        
        if ( p == -1 ) {
          de&&ug( get_name( that, '_remove_value' ) + 'adding value to anti-state' );
          
          that.b.push( value );
        } else {
          // !! Removed item could be different than value, but does have the same index key
          removed = that.a.splice( p, 1 );
        }
      }
      
      transaction.__emit_remove( removed, emit_now );
    }, // _remove_value()
    
    // ToDo: Set.._remove_value(): add tests
    _remove_values: function( transaction, values, emit_now ) {
      var that    = this
        , i       = -1
        , l       = values ? values.length : 0
        , removed = []
      ;
      
      while ( ++i < l ) {
        var v = values[ i ]
          , p = that._a_index_of( v )
        ;
        
        if ( p == -1 ) {
          de&&ug( get_name( that, '_remove_values' ) + 'adding value to anti-state' );
          
          that.b.push( v );
        } else {
          // !! Removed item could be different than value, but does have the same index key
          removed.push( that.a.splice( p, 1 )[ 0 ] );
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
      // asynchronously by a derived class, therefore we remove moves from
      // options
      if ( moves ) {
        options = extend( {}, options );
        
        delete options.moves;
      }
      
      return that._transaction( l * 2, options, function( t ) {
        de&&ug( get_name( that, '_update' ) + 'updates:', l );
        
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
      @pipelet unique( values, options )
      
      @short A set discarding @@duplicate @@values.
      
      @parameters:
      - values (Array of Objects): initial values of set, duplicates will be discarded if any
      
      - options (Object): @@class:Set options plus:
        - verbose (Boolean): if ```true``` emit errors on duplicate adds, default is
        ```false```
        
        - key (Array of String): the list of attributes defining value's identities, default
          is @@upstream key or [ 'id' ]
      
      @description:
      Discards values that have the same @@identity. This implies that the set has a proper
      @@key set. When the key is not properly set, a possible symptom is that values'
      identities are undefined, yielding more duplicates than desired.
      
      If option verbose is ```true```, and duplicates are added, they are emitted in bulk
      in the ```"error"``` @@dataflow, with the error code ```"DUPLICATE_KEY"```. This may
      be used by a @@downstream pipelet to remove duplicates.
      
      Important considerations:
      - Removed and updated values which identity are not found in set are discarded silently
      
      - If values with the same identity are removed several times, they are removed on the
        first remove, then ignored
      
      - Updates must preserve values' identity, i.e. removed and added values must have the
        same identity, otherwise behavior is unspecified, no error is emitted
  */
  
  // ToDo: add tests for unique()
  function Unique( values, options ) {
    this._identities = {};
    
    Set.call( this, values, options );
  } // Unique()
  
  Set.Build( 'unique', Unique, function( Super ) { return {
    _add: function( values, options ) {
      var that       = this
        , l          = values.length
        , identities = that._identities
        , added      = []
        , duplicates = []
        , i          = -1
        , verbose    = that._options.verbose
      ;
      
      while ( ++i < l ) {
        var v   = values[ i ]
          , key = that._make_key( v )
        ;
        
        // ToDo: once global error dataflow is implemented, stop testing for v.flow != 'error'
        if ( v.flow != 'error' && identities[ key ] ) {
          verbose && duplicates.push( v )
        } else {
          identities[ key ] = 1;
          added.push( v );
        }
      }
      
      if ( duplicates.length ) {
        de&&ug( get_name( that, '_add' ) + 'discard duplicates, identities:', duplicates.map( that._make_key.bind( that ) ), ', key:', that._key );
        
        // ToDo: emit to global error dataflow
        Set.prototype.__emit_add.call( that, [ {
          flow: 'error',
          code: 'DUPLICATE_KEY',
          error_flow: v.flow, // that of the first duplicate
          operation: 'add',
          sender: options && options.sender,
          key: that._key,
          values: duplicates
        } ], options );
      }
      
      Super._add.call( that, added, options );
    }, // _add()
    
    _remove: function( values, options ) {
      var that       = this
        , identities = that._identities
      ;
      
      values = values
        .filter( function( value ) {
          var key   = that._make_key( value )
            , found = identities[ key ]
          ;
          
          if ( found ) delete identities[ key ];
          
          return found;
        } )
      ;
      
      Super._remove.call( that, values, options );
    }, // _remove()
    
    _update: function( updates, options ) {
      var that       = this
        , identities = that._identities
      ;
      
      updates = updates
        .filter( function( update ) {
          // Does not verify identity of added value, see documented warning
          
          return identities[ that._make_key( update[ 0 ] ) ];
        } )
      ;
      
      Super._update.call( that, updates, options );
    }, // _update()
    
    _clear: function( options ) {
      this._identities = {};
      
      Super._clear.call( that, options );
    } // _clear()
  } } ); // Unique instance methods
  
  /* --------------------------------------------------------------------------
      @pipelet set_flow( flow_name, options )
      
      @short Sets the ```"flow"``` attribute of values in @@dataflow
      
      @parameters
      - flow_name (String): the name of the flow to set for objects of this
        dataflow. All values added or removed are altered to add the
        attrinute ```"flow"``` with this string.
        
        Values which already have a flow will be modified as the flow name
        always replaces any prior flow name, unless the flow name was
        ```"error"``` to allow to propagate errors downstream.
      
      - options (Object): options for pipelet alter().
      
      @examples
      - Add ```"flow"``` attribute ```"roles"``` to a dataflow:
        ```javascript
          rs
            .set( [
              { fist_name: 'Joe'    , last_name: 'Black'   },
              { fist_name: 'William', last_name: 'Parrish' },
              { fist_name: 'Susan'  , last_name: 'Parrish' }
              { flow: 'error', message: 'not found' }
            ] )
            
            .set_flow( 'roles' )
          ;
        ```
        
        Will emit this set:
        ```javascript
            [
              { fist_name: 'Joe'    , last_name: 'Black'  , flow: 'role' },
              { fist_name: 'William', last_name: 'Parrish', flow: 'role' },
              { fist_name: 'Susan'  , last_name: 'Parrish', flow: 'role' }
              { flow: 'error', message: 'not found' }
            ]
        ```
  */
  rs.Compose( 'set_flow', function( source, flow, options ) {
    options = extend( { query_transform: set_flow_query_transform }, options, { name: 'set_flow-' + flow } );
    
    de&&ug( 'set_flow(), flow: ' + flow + ', options:', options );
    
    return source.alter( set_flow_transform, options );
    
    function set_flow_transform( value ) {
      // ToDo: handling error flow will be deprecated when global error dataflow is adopted
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
  
  /* --------------------------------------------------------------------------
      @pipelet delivers( query, options )
      
      @short Specifies which upstream dataflows can be subscribed-to
      
      @parameters:
      - query:
        - (String): only flow attribute value delivered upstream
        - (Array of Strings): where each string specifies a flow
          attribute value delivered upstream.
      
      - options (Object): pipelet options.
      
      @description:
      This is a @@synchronous, @@stateless, @@lazy pipelet.
      
      This is an optimization pipelet that is semantically neutral and
      may improve performances significantly, especially between clients
      and servers but also in internal application loops.
      
      It prevents upstream queries and fetch from downstream pipelets to
      proceeed upstream when they do not match query.
      
      Doing so also provides more freedom into the architecture of complex
      applications, that can then be built around a main application loop,
      e.g.:
      
      ```javasacript
        rs
          .socket_io_server()
          
          .delivers( [ 'users', 'profiles', 'projects', 'imagaes' ] )
          
          .application_loop( rs.components() )
          
          .socket_io_server()
        ;
      ```
      
      In the above example, application_loop() components subscribe to both
      other internal components dataflows as well as server dataflows.
      Without the use of delivers(), all internal dataflows would be
      automatically subscribed from the server which does not delivers them.
      This would yield unnecessary delays, bandwidth consumption, and server
      resources usage.
      
      ### See Also
      
      - Pipelet flow()
      - Pipelet set_flow()
      - Pipelet alter()
  */
  rs.Compose( 'delivers', function( source, query, options ) {
    if( typeof query == 'string' ) query = [ query ];
    
    options = extend( {}, options, { name: 'delivers-' + query.join() } );
    
    // de&&ug( 'delivers(), options:', options );
    
    // ToDo; implement query_transform on output
    var delivers = source.pass_through( options );
    
    // ToDo: implement option query_transform in Pipelet to avoid hacking into pipelet
    delivers._output._query_transform = query_transform;
    
    return delivers;
    
    function query_transform( term ) {
      var flow = term.flow;
      
      if ( !flow || query.indexOf( flow ) != -1 ) return term
    } // query_transform()
  } ); // delivers()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet auto_increment( options )
      
      @short Auto-increment an attribute
      
      @parameters:
      - options:
        - attribute (String): the name of the attribute to auto-incremente. Default is "id".
        
        - start (Integer): used to initialize the auto-increment value. Default is zero
          which will start at 1 because the last auto-increment value is pre-incremented
          before emission.
      
      @description:
      
      Important requirement: The upstream source must provide a unique @@key which is
      used to store an association of identities to assigned auto-incremented values.
      
      This allows to emit corect auto-incremented values on @@remove and @@update
      operations.
      
      Therefore, @@values having the same @@identity, which are @@duplicate values, will
      be assigned the same auto-incremented value.
      
      If a source value has its auto-incement attribute set to a finite number it is not
      modified and if it is superior to the last auto-increment value it used as the last.
      
      If a source value has its auto-incement attribute set to a non-number or infinite
      number, it will be orverridden by an auto-incremented value.
      
      This is a @@stateless, @@synchronous, @@greedy pipelet.
      
      It is stateless from a pipelet standpoint as @@downstream @@fetch are forwarded
      @@upstream, but previous identities association with auto-incremented values are
      maintained as an internal state.
      
      Therefore the amount of memory used by this pipelet is proportional to the number
      of all values in the set over time. This state is preserved, i.e. not cleared, on
      remove operations.
   */
  rs.Compose( 'auto_increment', function( source, options ) {
    de&&ug( 'auto_increment(), options:', options );
    
    var attribute = options.attribute || 'id'
      , last      = options.start     || 0
      , keys      = {}
      , that
    ;
    
    de&&ug( 'auto_increment(), attribute: ' + attribute + ', start: ' + last );
    
    return that = source.map( function( v ) {
      var out = {}
        , ai  = v[ attribute ]
        , p   = that._input.source.pipelet
        , key = p._make_key( v )
      ;
      
      // for traces, force attribute as first attribute in output value
      out[ attribute ] = 0;
      
      if ( typeof ai == 'number' && isFinite( ai ) ) {
        if ( ai > last ) last = ai;
      } else if ( ! ( ai = keys[ key ] ) ) {
        ai = ++last;
      }
      
      // Force attribute new value even if present, as it could be non-number, infinite, or NaN
      extend_2( out, v )[ attribute ] = keys[ key ] = ai;
      
      //de&&ug( 'auto_increment(), ', source._get_name(), 'source._key:', p._key, 'key:', key, 'auto:', out[ attribute ] );
      
      return out;
    }, extend( {}, options, { name: options.name + '_map' } ) );
  } ); // auto_increment()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet trace( name, options )
      
      @short Trace pipelet methods
      
      @description:
        trace() helps debug Toubkal dataflows by showing exchanges at a given point of
        interest.
        
        This is a @@stateless, @@synchronous, @@lazy pipelet.
        
        It will only trace when downstream pipelet is non-lazy so if trace() is the last
        @@pipelet of a @@pipeline, one needs to add @@pipelet:greedy() right after it,
        e.g. to trace all authorized dataflows coming from a server:
        
        ```javascript
          rs.socket_io_server()
            .trace( 'socket_io_server' )
            .greedy()
          ;
        ```
      
      @parameters:
      - name (String): a name for all traces.
      
      - options (Object): optional attributes:
        - counts (Boolean, default false): only provide counts of
          values from operations
        - include (Array of Strings): attributes to include, exclusively.
        - exclude (Array of Strings): attributes to exclude, ignored if
          include provided.
        - pick (Object): optional @@function:picker() expression to pick
          which attributes are traced. Defaults traces all attributes.
          This option is exclusive with options ```"counts"``` which has
          priority over ```"pick"```.
        
        - All other options are booleans controlling which pipelet methods are
          traced:
          - all                   (Boolean, default false): trace everything
          - add_source            (Boolean, default false): trace _input.add_source()
          - remove_source         (Boolean, default false): trace _input.remove_source()
          - fetch                 (Boolean, default false): trace _input._fetch()
          - fetched               (Boolean, default true ): trace _input._fetch#receiver()
          - _add_destination      (Boolean, default false): trace _output._add_destination()
          - _remove_destination   (Boolean, default false): trace _output._remove_destination()
          - update_upstream_query (Boolean, default false): trace _output.update_upstream_query()
          - add                   (Boolean, default true ): trace _add()
          - remove                (Boolean, default true ): trace _remove()
          - update                (Boolean, default true ): trace _update()
          - clear                 (Boolean, default true ): trace _clear()
  */
  function Trace( name, options ) {
    options = extend( {
      add_source           : false,
      remove_source        : false,
      fetch                : false,
      fetched              : true,
      _add_destination     : false,
      _remove_destination  : false,
      update_upstream_query: false,
      add                  : true,
      remove               : true,
      update               : true,
      clear                : true
    }, options, options.all && {
      add_source           : true,
      remove_source        : true,
      fetch                : true,
      _add_destination     : true,
      _remove_destination  : true,
      update_upstream_query: true
    } );
    
    var that         = this
      , Super_Input  = Pipelet.Input.prototype
      , Super_Output = Pipelet.Output.prototype
    ;
    
    Pipelet.call( that, { name: options.name = name, key: options.key } );
    
    var include = options.include
      , exclude = options.exclude
      , counts  = options.counts
      , pick    = ! counts && options.pick
      , ___
    ;
    
    if ( include ) {
      that._replacer = include;
    } else if ( options.exclude ) {
      that._replacer = function( key, value ) {
        return exclude.indexOf( key ) != -1 ? ___ : value; 
      }
    }
    
    if ( pick ) pick = picker( pick );
    
    de&&ug( 'Trace', { include: include || 'all', exclude: exclude || 'none' } );
    
    if ( options.fetch || options.fetched )
      that._input._fetch = fetch
    ;
    
    if ( options.update_upstream_query )
      that._output.update_upstream_query = update_upstream_query
    ;
    
    // Generate add, remove, update, clear
    [ 'add', 'remove', 'update', 'clear' ].forEach( function( operation, i ) {
      if ( options[ operation ] )
        that[ '_' + operation ] = function( values, _options ) {
          if ( i < 3 ) { // add, remove, update
            log( operation, {
              values : counts ? values.length : values,
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
          
          o[ name ] = get_name( plug );
          o.options = options;
          
          log( method_name, o );
          
          Super[ method_name ].call( this, plug, options );
        }
    } // generate()
    
    function log( method, object ) {
      if ( pick && object.values ) object.values = object.values.map( pick );
      
      options[ method ]
        && RS.log( get_name( that, method ), JSON.stringify( object, that._replacer, '  ' ) )
      ;
    } // log()
    
    function fetch( receiver, query, query_changes, destination ) {
      var name   = 'fetch'
        , that   = this
        , source = that.source
        , output = source && get_name( source )
      ;
      
      log( name, show_parameters() );
      
      source
        ? Super_Input._fetch.call( that, rx, query, query_changes, destination )
        : rx( [], true, null, null, null, true ); // No source, so this is an empty set
      ;
      
      return that;
      
      function show_parameters() {
        return {
          source       : output,
          query        : query,
          query_changes: query_changes
        }
      } // show_parameters()
      
      function rx( adds, no_more, removes, updates, options, no_source ) {
        log( name + 'ed', extend_2( {
          no_more      : no_more,
          adds         : show( adds    ),
          removes      : show( removes ),
          updates      : show( updates ),
          options      : options,
          no_source    : no_source
        }, show_parameters() ) );
        
        receiver( adds, no_more, removes, updates, options );
        
        function show( values ) {
          return values
            ? ( counts ? values.length : pick ? values.map( pick ) : values )
            : values
          ;
        }
      } // rx()
    } // fetch()
    
    function update_upstream_query( changes, input ) {
      log( 'update_upstream_query', { removes : changes[ 0 ], adds: changes[ 1 ], input: get_name( input ) } );
      
      Super_Output.update_upstream_query.call( this, changes, input );
    } // update_upstream_query()
  } // Trace()
  
  Pipelet.Build( 'trace', Trace );
  
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
    'Greedy'           : Greedy,
    'Alter'            : Alter,
    'Set'              : Set,
    'Unique'           : Unique,
    'Trace'            : Trace,
    'Delay'            : Delay
  } );
  
  de&&ug( "module loaded" );
  
  return rs; // global
} ); // pipelet.js
