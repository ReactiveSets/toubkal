/*  transactional.js
    
    Copyright (c) 2013-2018, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'transactional', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , extend       = RS.extend
    , extend_2     = extend._2
    , log          = RS.log.bind( null, 'transactional' )
    , Pipelet      = RS.Pipelet
    , Greedy       = RS.Greedy
    , value_equals = RS.value_equals
    , picker       = RS.picker
    , de           = false
    , ug           = log
    , get_name     = RS.get_name
    , toString     = {}.toString
  ;
  
  function nil_function() {}
  
  function get_remove( update ) {
    return update[ 0 ];
  } // get_removed()
  
  /* --------------------------------------------------------------------------
      @term transactional
      
      @short A @@pipelet that mutates the state of the system
      
      @description:
      A state mutation is the change in the value of the system by either
      creating, removing, or updating the value of, objects of the system.
      
      As opposed to the immutable nature of values, an object is defined by
      a identity, such as a primary key in a database, associated with a
      current value. An object can be created, deleted, or updated (changing
      its value, not its identity).
      
      Objects' values may also be constrained by rules of the system that
      constrain them with other objects' values. Transactional pipelets help
      enforce these rules.
      
      A transactional pipelet emits events that mutate the state of the
      system. In many cases these mutations are related to the current
      state of the system.
      
      This means that the decision to emit or not a state change, cannot
      change after the decision was made and therefore the information
      pertaining to that current state must not be reactive, i.e. it must
      not react to the state change itself or future state changes.
      
      In imperative programming, that is usually non-reactive, this is
      the default behavior. By contrast, in a fully reactive system such
      as one based on Toubkal, all changes are reactive by default which
      is incompatible with the required operational mode of transactional
      operations that manipulate the state of the system on an event.
      
      The pipelet @@pipelet:fetch() is the base pipelet allowing
      transactional @@[pipelines](pipeline) to query the state of the
      system on incomming events.
  */
  
  /* --------------------------------------------------------------------------
      @pipelet fetch( store, fetch_query, options )
      
      @short Fetches the current state of store @@dataflow on source events.
      
      @parameters
      - **store** (Pipelet): the dataflow from which incomming values are fetched
      
      - **fetch_query**:
        - (null or undefined): fetch all values from store
        
        - (Function): called to build fetch query, Signature is:
          ```( value, operation ) -> query```
          
          - **value** (Object): source event
          
          - **operation** (String): corresponding to stict transactional
          semantics:
            - ```"create"```: value is from a source add operation
            - ```"delete"```: value is from a source remove operation
            - ```"update_previous"```: value is the old value of an update operation
            
          - **query** (Array of Objects): the query to fetch *store*, if null
            or undefined, all values are fetched from store.
        
        - (Object): @@function:picker() expression to pick query from source
          values. Provides the following fetch_query() function:
          
          ```javascript
          var pick = picker( fetch_query );
          
          fetch_query = function( source_value ) {
            return [ pick( source_value ) ]
          }
          ```
        
        - (Array): Array of @@function:picker() expressions to build OR-query
          for picker expressions. Provides the following fetch_query():
          
          ```javascript
          picks = fetch_query.map( picker );
          
          fetch_query = function( source_value ) {
            return picks.map( function( pick ) { return pick( source_value ) } )
          }
          ```
          
          Note that this is different than ```picker( Array )``` semantics
          which can still be used by adding an extra enclosing Array, e.g.
          ```[ [ 'id' ] ]```.
      
      - **options** (Object): optional options for Pipelet, key is forced to
        ```[ 'id' ]```
      
      @emits
      - **id** (String): source value @@identity string built using
        @@method:Pipelet.._identity()
      - **source** (Object): incomming source value
      - **query**  (Array of Objects): query used to fetch the store dataflow
      - **values** (Array of Objects): fetched values from the store dataflow
        with query
      - **operation** (String): corresponding to stict transactional semantics,
        one of:
        - ```"create"```: for a source add
        - ```"delete"```: for a source remove
        - ```"update_previous"```: for the previous value of an update operation
        - ```"update_new"```: for the new value of an update operation
      
      @examples
      - Create a user object if none exist with source email address:
      
        ```javascript
          var uuid_v4 = rs.RS.uuid.v4;
          
          user
            .fetch( rs.database(), { flow: 'users', email: '.email' } )
            
            .map( function( fetched ) {
              if ( ! fetched.values.length ) // none found with this email address
                return { flow: 'users', id: uuid_v4(), email: fetched.source.email }
              ;
            } )
            
            .trace( 'database state changes' )
            
            .delivers( 'users', { transactional: true } )
            
            .database()
          ;
        ```
        
        Using @@pipelet:flat_map() instead of @@pipelet:map() above, one
        can create multiple objects at the same time in the same
        transaction.
      
      @description
      This is a @@transactional, @@stateless, @@greedy pipelet. It is
      @@synchronous if fetching the store dataflow is synchronous, or
      @@asynchronous if fetching is asynchronous. It never subscribes
      to the store dataflow, only fetches when triggered from a source
      event.
      
      Typical desisions for state changes are:
      - Create an object IF none exists
      - Remove related / dependant objects IF any
      
      The IF above is performed by fetching the state of the system using
      this pipelet then make the decision based on fetched values. The
      decision to emit or not a state change is typically taken using
      pipelet @@pipelet:map() or @@pipelet:flat_map() downstream of this
      pipelet.
      
      This pipelet is the basis of all transactional pipelets that
      require to make state change decisions based on the current state
      of the system.
      
      #### Operation
      In Toubkal, the low level method that allows to query the state of
      the system is the method @@method:Plug.._fetch(). It provides a
      snapshot of a @@pipeline at the time of fetching. In all-reactive
      operations, _fetch() is always associated with a change in
      @@subscription. But _fetch() can also be used without a subscription,
      which is exactly what is needed for transactional pipelets making
      decisions based on the current state of the system.
      
      This pipelet allows transactional pipelines to query the state of
      the system on source mutation events to allow to make state change
      decisions by calling the @@method:Plug.._fetch() method without
      a subscription.
      
      On incomming values from its source, fetch() builds a query,
      calling fetch_query() to fetch the store dataflow without
      subscribing to it.
      
      Parameter function fetch_query() is called for each source value,
      and must return a valid fetching query. On updates, the query is
      built from the removed value which is supposed to refer to the
      same object as the added value.
      
      Fetched values are then emmitted along with the original source
      value used to build the query.
      
      Emitted operations (add, remove, update) are the same as that of
      incomming source events. Emitted values are returned in the same
      order as received, regardless of the time it takes to fetch values
      for each individual value.
      
      Source operations to this pipelet must adhere strictly to a
      transactional semantic where adds mean "create", removes mean
      "delete" existing objects, and updates mean updating existing
      objects providing previously existing and new values with the
      same @@identity.
      
      ### See Also
      - Pipelet fetch_as()
      - Pipelet fetch_first()
      - Pipelet fetched_differences()
      - Pipelet update_fetched()
      - Pipelet emit_operations()
      
      ToDo: add tests for fetch() pipelet.
      ToDo: provide 'as' option, to implement fetch_as() more efficiently
  */
  function Fetch( store, fetch_query, options ) {
    var that = this, pick;
    
    switch ( toString.call( fetch_query ) ) {
      case '[object Object]': // picker expression
        pick = picker( fetch_query );
        
        fetch_query = function( source_value ) {
          return [ pick( source_value ) ]
        }
      break;
      
      case '[object Array]': // Array of picker expressions
        pick = fetch_query.map( picker );
        
        fetch_query = function( source_value ) {
          return pick.map( function( pick ) { return pick( source_value ) } )
        }
      break;
      
      default:
        log( 'Warning: fetch_query ignored, not a Function, Object, Array, null, or undefined' );
      
      case '[object Null]':
      case '[object Undefined]':
        fetch_query = function() {};
      
      case '[object Function]':
    }
    
    Greedy.call( that, extend( options, { key: [ 'id' ] } ) )
    
    // Prevent fetching source from destination
    that._output.source = null;
    
    that._store       = store._output;
    that._fetch_query = fetch_query;
    that._queue       = [];
  } // Fetch()
  
  Greedy.Build( 'fetch', Fetch, {
    _fetch_values: function( operation, values, options, done ) {
      var that        = this
        , store       = that._store
        , fetch_query = that._fetch_query
        , length      = values.length
        , out         = new Array( length )
        , queue       = that._queue
        , response    = { out : out }
      ;
      
      // Garanty responses are emitted in the same order as incomming operations
      queue.push( response );
      
      length ? values.forEach( fetch_value ) : emit();
      
      function fetch_value( value, position ) {
        var query = fetch_query( value, operation )
          , fetched_values = []
        ;
        
        store._fetch( fetched, query );
        
        function fetched( values, no_more ) {
          fetched_values.push.apply( fetched_values, values );
          
          if ( ! no_more ) return;
          
          out[ position ] = {
            id       : that._identity( value ),
            source   : value,
            query    : query,
            values   : fetched_values,
            operation: operation,
            options  : options
          };
          
          --length || emit();
        } // fetched()
      } // fetch_value()
      
      function emit() {
        response.done = done; // ready to emit
        
        // emit all pending responses which are done AND with no prior operation not done
        while ( ( response = queue[ 0 ] ) && ( done = response.done ) )
          done( queue.shift().out )
        ;
      } // emit()
    }, // _fetch_values()
    
    _add: function( values, options ) {
      var that = this;
      
      that._fetch_values( 'create', values, options, emit );
      
      function emit( out ) {
        that.__emit_add( out, options );
      } // emit()
    }, // _add()
    
    _remove: function( values, options ) {
      var that = this;
      
      that._fetch_values( 'delete', values, options, emit );
      
      function emit( out ) {
        that.__emit_remove( out, options );
      } // emit()
    }, // _remove()
    
    _update: function( updates, options ) {
      var that = this;
      
      that._fetch_values( 'update_previous', updates.map( get_remove ), options, emit );
      
      function emit( out ) {
        that.__emit_update( out.map( make_update ), options );
        
        function make_update( removed, position ) {
          var added = updates[ position ][ 1 ];
          
          // ToDo: if removed is undefined, we cannot update, must only emit an add as create
          return [
            removed,
            
            {
              id       : that._identity( added ),
              source   : added,
              query    : removed.query,
              values   : removed.values,
              operation: 'update_new',
              options  : removed.options
            }
          ];
        } // make_update()
      } // emit()
    } // _update()
  } ); // fetch(), the pipelet
  
  /* --------------------------------------------------------------------------
      @pipelet emit_operations( options )
      
      @short Emits @@remove, @@update, and @@add operations in a transaction
      
      @parameters
      - *options* (Object): @@class:Pipelet options
      
      @examples
      - Create or update user profiles from source profile values:
      ```javascript
        // Source profiles is an adds-only stream of user profile values
        profiles
        
          // Fetch profile from server
          .fetch( rs.socket_io_server(), function( profile ) {
            return { flow: 'profiles', id: profile.id }
          } )
          
          // Make add or update operation depending on profile existance
          .map( function( fetched ) {
            var value = fetched.source;
            
            fetched = fetched.values[ 0 ];
            
            return fetched
                // Update existing profile
              ? { updates: [ [ fetched, extend( {}, fetched, value ) ] ] }
              
                // Create new profile as none existed before
              : { adds: [ value ] } // create new profile
            ;
          } )
          
          // Apply these downstream
          .emit_operations()
          
          // Inspect emitted operations in console.log()
          .trace( 'Created or updated profiles' )
          
          // Enit transaction back to server
          .socket_io_server()
        ;
      ```
      
      @description
      Source @@add operations may have the following optional attributes:
      - removes (Array of Objects): @@[removes]remove to emit
      - updates (Array of Arrays of two Objects): @@[updates](update) to enit
      - adds (Array of Objects): @@[adds]add to emit
      
      On source events, this pipelet emits zero to three operations in a
      transaction.
      
      Removes are emitted first, followed by updates, then adds.
      
      In order to preserve transactions' consistency, if the source event
      has a fork @@tag in a transaction, it is forwarded @@downstream at
      the end of @@upstream transactions even if there is nothing to emit.
      
      This is a *@@synchronous, @@stateless, @@greedy, @@transactional*
      pipelet.
      
      Source @@remove and @@update operations are ignored silently,
      
      ### See Also
      - Pipelet fetch()
      - Pipelet update_fetched()
      - Pipelet map()
      - Pipelet socket_io_server()
      - Method @@method:Pipelet..__emit_operations()
  */
  function Emit_Operations( options ) {
    var that = this;
    
    Greedy.call( that, options );
    
    // Prevent fetching source from destination
    that._output.source = null;
  } // Emit_Operations()
  
  Greedy.Build( 'emit_operations', Emit_Operations, {
    _add: function( values, options ) {
      var v       = values[ 0 ]
        , adds
        , removes
        , updates
      ;
      
      if ( v ) {
        adds    = v.adds
        removes = v.removes
        updates = v.updates
        
        if ( values.length > 1 ) { // concatenates all adds together, all removes together, all updates together
          adds    = [];
          removes = [];
          updates = [];
          
          values.forEach( function( value ) {
            value.adds    && push.apply( adds   , value.adds    );
            value.removes && push.apply( removes, value.removes );
            value.updates && push.apply( updates, value.updates );
          } );
        }
      }
      
      //de&&ug( get_name( this, '_add' ), { adds: adds, removes: removes, updates: updates, options: options } );
      
      this.__emit_operations( adds, removes, updates, options );
    }, // _add()
    
    _remove: nil_function,
    
    _update: nil_function
  } ) // emit_operations()
  
  /* --------------------------------------------------------------------------
      @pipelet update_fetched( update, options )
      
      @short Update, create, or remove fetched values in a transaction
      
      @parameters
      - **update** (Function): optional, called to calculate new values from
        fetched values and source value, it should not modify its parameter
        objects. Its signature is:
        
        ```
          ( fetched_value, source_value ) -> mew_or_updated_value (Object)
        ```
        Which parameters come from upstream pipelet fetch():
        - **fetched_value** (Object): value fetched, falsy when no value
          fetched
        
        - **source_value** (Object): source value of upstream pipelet fetch()
        
        If there are no ```fetched_value```, a new value is created
        (emit @@add) if update() returns an Object, otherwise nothing
        is done.
        
        If there are fetched values, all fetched values are updated (emit
        @@update) or removed (emit @@remove) in a transaction, depending
        on update() returned value:
        - (truly): the current fetched value is updated with that value
        - (null): the current fetched value is removed
        - otherwise nothing is done.
        
        If no update() function is provided, the default is to update
        all fetched values by using class method RS.extend() on fetched
        values with source values:
        
        ```javascript
          function update( fetched_value, source_value ) {
            return rs.RS.extend( {}, fetched_value, source_value );
          }
        ```
      
      - options (Object): pipelet options
      
      @examples
      - Update a user profile, where source is a dataflow of updates to
        user profiles:
        
        ```javascript
          source
            .fetch( profile, function( user ) {
              return [ { flow: 'profile', id: user.id } ]
            } )
            
            .update_fetched( function( fetched_value, source_value ) {
              // this is the default behavior if no update() function is provided
              
              return extend( {}, fetched_value, source_value )
            } )
            
            .set_flow( 'profile_updates' )
          ;
        ```
      
      @description:
      Emit updates of fetched (current) values with new updated values.
      
      Updated values are returned by the update() function parameter
      which returns updated values from fetched values and source
      values.
      
      Source values must have the following attributes, typically
      emitted by pipelet fetch() but could also be provided by any
      other pipelet:
      - source (Object): incomming source value, upstream of fetch()
      - values (Array of Objects): fetched values from the store
        dataflow with query.
      
      If multiple values were fetched, the update() function is called
      for all fetched values, so that all fetched values can be updated
      or removed in the same transaction.
      
      If no value is fetched, the source value is added, yielding the
      creation of the object.
      
      This is a @@transactional, @@synchronous, @@stateless, @@greedy
      pipelet.
      
      ### ToDo List
      - ToDo: update_fetched(), add CI tests
  */
  rs.Compose( 'update_fetched', function( source, update, options ) {
    return source
      .map( update_or_create, options )
      
      .emit_operations()
    ;
    
    function update_or_create( fetched ) {
      var source  = fetched.source // always an Object
        , values  = fetched.values
        , first   = values[ 0 ]
        , updates = []
        , removes = []
        , adds
      ;
      
      if ( first )
        // Update or remove fetched values
        values.forEach( update_or_remove )
      
      else {
        // Found no value, this is a creation
        if ( update ) source = update( first, source ); // first is undefined
        
        adds = source && [ source ];
      }
      
      return { adds: adds, removes: removes, updates: updates }
      
      function update_or_remove( fetched_value ) {
        var value = update
          ? update(     fetched_value, source )
          : extend( {}, fetched_value, source )
        ;
        
        value
          ? updates.push( [ fetched_value, value ] )
          : removes.push( fetched_value )
        ;
      } // update_or_remove()
    } // update_or_create()
  } ) // update_fetched()
  
  /* --------------------------------------------------------------------------
      @pipelet fetched_differences( options )
      
      @short Emits differences (**A - B**) between two fetched sets **A**
      then **B**
      
      @parameters
      - options (Object): pipelet options, which @@key must be that of
        compared sets.
        
        Note that emitted values by fetched_differences() do not
        include @@[identities]identity as they are meant to be fed downstream
        to pipelet emit_operations() that will emit values with identities
        matching this key.
      
      @emits
      Attributes for pipelet emit_operations():
      - removes (Array of Objects): optional, the set of all values in the
        second (**B**) fetched set that were not found in the first (**A**).
      
      - updates (Array of Arrays of two Objects): optional, the set of
        updates for values that changed. Each update is an Array where
        the first value is the old value from **B**, and second value is
        the new value found in **A**.
      
      - adds (Array of Objects): optional, the set of all values in the
        first (**A**) fetched set that were not found in the second (**B**).
      
      - source (Object): value of the attribute ```source.source```, i.e.
        the source value of the first fetch().
      
      @examples
      - Resynchronize a cache of users, on hard reconnections from a
        socket.io server:
        ```javascript
          // Subscribe to a dataflow of users from socket.io server
          var users = rs
          
            // Connect to server using socket.io
            .socket_io_server()
            
            // Subcribe to dataflow users
            .flow( 'users' )
          ;
          
          // cache users values
          var users_cache = users.cache();
          
          // Resynchronize cache on hard reconnections
          var fetched_differences = rs
          
            // Get the dataflow of socket.io connection to server state changes
            .socket_io_synchronizing() // adds "synchronizing" fork tag
            
            // On hard-reconnection events, asynchronously fetch distant users
            .fetch( users )
            
            // Once fetched, fetch synchronously content of local cache of users
            .fetch( users_cache )
            
            // Synchronously calculate differences
            .fetched_differences()
          ;
          
          fetched_differences
            // Remove "synchronizing" fork tag, not necessary for this branch
            .pass_through( { tag: 'synchronizing' } )
            
            // Show changes in console.log()
            .trace( 'fetched_differences' )
            
            // Emit changes downstream in a transaction
            .emit_operations()
            
            // Emit these changes to users's cache
            .through( users_cache )
          ;
          
          
          
          // Signal end of synchronization back to socket_io_synchronizing()
          fetched_differences
          
            // Get source value to enit back to socket_io_synchronizing()
            .map( function( _ ) { return _.source } )
            
            .socket_io_synchronizing() // Removes "synchronizing" fork tag
          ;
        ```
      
      - The above logic is already implemented in pipelet cache() which
        can then be simplified as:
        ```javascript
          var users_cache = rs
            
            .socket_io_server()
            
            .flow( 'users' )
            
            .cache( { synchronizing: rs.socket_io_synchronizing() } )
            
            .pass_through( { tag: 'synchronize' } )
          ;
        ```
      
      @description
      This pipelet assumes that it is fed with @@adds-only events from two
      @@upstream pipelet fetch() in the following typical @@transactional
      patterm:
      
      ```javascript
        transactional_events
          .fetch( A )
          .fetch( B )
          
          // Calculate A - B
          .fetched_differences()
          
          // Emit differences
          .emit_operations()
          
          // Apply differences to B, after which B = A
          .through( B )
        ;
      ```
      In order to apply changes downstream, it is usually important to
      understand when differences are calculated versus when the two
      sets where fetched. This depends on the synchronicity of the two
      pipelet fetch(). It is highly recommended that the second fetch
      (on **B**) be synchronous if one wants to apply differences
      synchronously, i.e. atomically on **B**.
      
      This pipelet can also be used without pipelet fetch() in which
      case **A** must be provided in attribute ```source.values```
      and **B** must be provided in attribute ```values```.
      
      Furthermore this pipelet emits a ```"source"``` attribute
      containing the source event of the first fetch() or the value
      of the attribute ```source.source```.
      
      This is a @@stateless, @@synchronous, @@greedy pipelet.
      
      ### See Also:
      - Pipelet fetch()
      - Pipelet emit_operations()
      - Pipelet cache()
      - Pipelet socket_io_synchronizing()
      - Pipelet socket_io_server()
      - Pipelet filter()
      - Pipelet flow()
      - Pipelet trace()
  */
  .Compose( 'fetched_differences', function( source, options ) {
    var that = source.map( A_minus_B, options );
    
    return that;
    
    function A_minus_B( _ ) {
      var source  = _.source
        , A       = source.values // first  fetched values
        , B       = _.values      // second fetched values
        , A_kv    = {}
        , B_kv    = {}
        , removes = []
        , updates = []
        , adds    = []
      ;
      
      // Build A key-value store
      A.forEach( function( value ) {
        A_kv[ that._identity( value ) ] = value;
      } );
      
      // Find removed, values in B which are not in A
      // Find updated, values in B with a different value than in A
      B.forEach( function( b_value ) {
        var identity = that._identity( b_value )
          , a_value  = A_kv[ identity ]
        ;
        
        B_kv[ identity ] = b_value;
        
        if ( a_value ) {
          value_equals( b_value, a_value )
            || updates.push( [ b_value, a_value ] )
          ;
        } else {
          removes.push( b_value );
        }
      } );
      
      // Find added: values in A which are not in B
      Object.keys( A_kv ).map( function( identity ) {
        B_kv[ identity ] || adds.push( A_kv[ identity ] );
      } );
      
      return {
        removes: removes,
        updates: updates,
        adds   : adds,
        source : source.source
      }
    } // A_minus_B()
  } ) // fetched_differences()
  
  /* --------------------------------------------------------------------------
      @pipelet fetch_as( store, attribute, fetch_query, options )
      
      @short Set attribute with fetched values from store by fetch_query
      
      @parameters:
      - store (Pipelet): to @@pipelet:fetch() from
      - attribute (String): attribute name for emitted fetched values. Will
        replace any source value with the same attribute name.
      - fetch_query (Function, Object, Array, null, or undefined):
        for pipelet fetch().
      - options (Object): pipelet fetch() options
      
      @emits: source attributes plus attribute (possibly empty) Array of
      fetched values.
      
      @description:
      This is a @@transactional, @@synchronous, @@stateless, @@greedy pipelet.
      
      ### See Also:
      - Pipelet fetch_first()
      
      ToDo: fetch_as() add tests
  */
  .Compose( 'fetch_as', function( source, store, attribute, fetch_query, options ) {
    
    return source
      
      .fetch( store, fetch_query, options )
      
      .map( function( fetched ) {
        var source = extend( {}, fetched.source );
        
        source[ attribute ] = fetched.values;
        
        return source;
      } )
  } ) // fetch_as()
  
  /* --------------------------------------------------------------------------
      @pipelet fetch_first( store, attribute, fetch_query, options )
      
      @short Set attribute with first fetched value from store by fetch_query
      
      @parameters:
      - store (Pipelet): to @@pipelet:fetch() from.
      - attribute (String): attribute name for emitted fetched value. Will
        replace any source value with the same attribute name.
      - fetch_query (Function, Object, Array, null, or undefined):
        for pipelet fetch().
      - options (Object): pipelet fetch options plus:
        - mandatory (Boolean): default false, do not emit any value if fetch
          emits no values.
      
      @emits: source attributes plus attribute if one value was fetched.
      
      @description:
      This is a @@transactional, @@synchronous, @@stateless, @@greedy pipelet.
      
      ### See Also:
      - Pipelet fetch()
      - Pipelet fetch_as()
      
      ToDo: fetch_first() add tests
  */
  .Compose( 'fetch_first', function( source, store, attribute, fetch_query, options ) {
    
    return source
      
      .fetch( store, fetch_query, options )
      
      .map( function( fetched ) {
        var values = fetched.values
          , count  = values.length
          , source
        ;
        
        if ( ! count && options.mandatory ) return;
        
        if ( count > 1 ) log( 'Warning:', options.name + ', more than one value fetched:', values );
        
        source = extend( {}, fetched.source );
        
        source[ attribute ] = values[ 0 ];
        
        return source;
      } )
  } ); // fetch_first()
  
  /* -------------------------------------------------------------------------------------------
      fetch_flow_key( flows, options )
      
      Fetch dataflow key from flows metadata.
      
      For each value of a multi-flows dataflow, fetch dataflow key from flows metadata. This
      may be used by a downstream pipelet to perform multi-flow operations based on a required
      key.
      
      Keys are provided in output operations options under the _keys attribute, an Array of
      keys in the same order as output values. If the flow attribute is not present in a value
      or not found in flows, corresponding key is set to null.
      
      This is a transactional, stateless, lazy pipelet. It may be synchronous or asynchronous
      depending of implementation. It is transactional because the output will not be updated
      if flows keys change.
      
      Parameters:
      - flows (Pipelet): dataflows' metadata with the following attributes:
        - id (String): dataflow name
        - key (optional Array of Strings): key attributes for this dataflow, default is
          [ 'id' ]
      - options (optional Object): options for Pipelet
  */
  function Fetch_Flow_Key( flows, options ) {
    Pipelet.call( this, options );
    
    this._flows = flows._output;
  } // Fetch_Flow_Key()
  
  Pipelet.Build( 'fetch_flow_key', Fetch_Flow_Key, {
    _fetch_keys: function( values, options, done ) {
      var flows     = this._flows
        , l         = values.length
        , processed = 0
        , keys      = []
      ;
      
      if ( l ) {
        values.forEach( fetch_value_flow );
      } else {
        emit();
      }
      
      return this;
      
      function fetch_value_flow( value ) {
        fetch_flow( value.flow, flows, fetched );
        
        function fetched( key ) {
          keys.push( key );
          
          ++processed == l && emit();
        } // fetched()
      } // fetch_value_flow()
      
      function fetch_flow( flow, flows, done ) {
        if ( typeof flow == 'string' && flow ) {
          flows.fetch_all( fetched_flow, [ { id: flow } ] );
        } else {
          // flow must be a non-empty string
          error( 'UNDEFINED_FLOW' );
        }
        
        function fetched_flow( flows ) {
          if ( flows.length ) {
            done( flows[ 0 ].key || [ 'id' ] );
          } else {
            // no flow by this name in flows
            error( 'FLOW_NOT_FOUND' );
          }
        } // fetched_flow()
        
        function error( code ) {
          // ToDo: send error into global error dataflow
          done( null );
        } // error()
      } // fetch_flow()
      
      function emit() {
        // make a shallow copy of options before forcing _keys metadata
        options = extend_2( {}, options );
        
        options._keys = keys;
        
        done( options );
      } // emit()
    }, // _fetch_keys()
    
    _add: function( values, options ) {
      var that = this;
      
      this._fetch_keys( values, options, fetched );
      
      function fetched( options ) {
        that.__emit_add( values, options );
      } // emit()
    }, // _add()
    
    _remove: function( values, options ) {
      var that = this;
      
      this._fetch_keys( values, options, fetched );
      
      function fetched( options ) {
        that.__emit_remove( values, options );
      } // emit()
    }, // _remove()
    
    _update: function( updates, options ) {
      var that   = this
        , values = updates.map( get_remove )
      ;
      
      this._fetch_keys( values, options, fetched );
      
      function fetched( options ) {
        that.__emit_update( updates, options );
      } // emit()
    }, // _update()
  } ); // fetch_flow_key()
  
  /* --------------------------------------------------------------------------
      @pipelet not_exists( source, options )
      
      @short Existence validation on adds (no-exists), removes and updates (exists).
      
      @parameters:
      - source (Pipelet): to fetch values and schemas from
      - options (optional Object): options for Pipelet
      
      @description:
      Forwards:
      - "add"    operations: values not found in source (hence this pipelet's name)
      - "remove" operations: values found in source
      - "update" operations: values found in source AND which remove and add parts share the
        same key
      
      #### Operation:
      For each input value, a query is built to fetch from source the flow for the input
      value. The query is built from either this pipelet's key or the _keys option as
      fetched using fetch_flow_key() for multi-flows.
      
      This pipelet can be used as a validation step prior to database updates, preventing to
      send bad updates to a database master. Fething should typically be directed towards a
      slave server which may help mitigate against DoS attacks.
      
      This is a @@transactional, @@stateless, @@lazy pipelet. It is
      @@synchronous if all flows of an operation can be fethed synchronously,
      it is @@asynchronous otherwise.
  */
  function Not_Exists( source, options ) {
    Pipelet.call( this, options );
    
    this._source_output = source._output;
  } // Not_Exists()
  
  Pipelet.Build( 'not_exists', Not_Exists, {
    _fetch_values: function( values, done ) {
      var source    = this._source_output
        , keys      = options._keys
        , key       = this._key
        , l         = values.length
        , processed = 0
        , out       = []
      ;
      
      if ( l ) {
        values.forEach( fetch_value );
      } else {
        done( out );
      }
      
      function fetch_value( value, i ) {
        fetch_by_key( value, source, keys ? keys[ i ] : key, fetched );
        
        function fetched( error, value ) {
          if ( error ) {
            // ToDo: send error to global error dataflow
            out.push( null );
          } else {
            out.push( value );
          }
          
          ++processed == l && done( out );
        } // fetched()
      } // not_exists()
      
      function fetch_by_key( value, source, key, done ) {
        var flow = value.flow;
        
        if ( key ) {
          var query = { flow: flow }
            , l     = key.length
            , i     = -1
            , v
          ;
          
          while ( ++i < key.length ) {
            v = value[ a ];
            
            if ( v == null ) return done( 'UNDEFINED_KEY_ATTRIBUTE' ); // null or undefined, not allowed in key
            
            query[ a ] = v;
          }
          
          source.fetch_all( fetched, [ query ] );
        } else {
          // flow must be a non-empty string
          done( 'NO_KEY' );
        }
        
        function fetched( values ) {
          if ( values.length ) { // should be 0 or 1
            done( null, [ value, values[ 0 ], key ] );
          } else {
            // not found with key
            done();
          }
        } // fetched()
      } // fetch_by_key()
    }, // _fetch_values()
    
    _add: function( values, options ) {
      var that = this;
      
      this._fetch_values( values, not_exists );
      
      function not_exists( values ) {
        var out = []
          , l = values.length
          , i = -1
          , value
        ;
        
        while ( ++i < l )
          if ( value = values[ i ] )
            values[ 1 ] || out.push( value[ 0 ] ); // not found
        
        that.__emit_add( out, options );
      } // not_exists()
    }, // _add()
    
    _remove: function( values, options ) {
      var that = this;
      
      this._fetch_values( values, exists );
      
      function exists( values ) {
        var out = []
          , l   = values.length
          , i   = -1
          , value
        ;
        
        while ( ++i < l )
          if ( value = values[ i ] )
            values[ 1 ] && out.push( value[ 0 ] ); // found
        
        that.__emit_add( out, options );
      } // exists()
    }, // _remove()
    
    _update: function( updates, options ) {
      var that   = this
        , values = updates.map( get_remove )
      ;
      
      return this._fetch_values( values, exists );
      
      function exists( values ) {
        var out = []
          , l   = values.length
          , i   = -1
          , update
          , value
          , v
        ;
        
        while ( ++i < l ) {
          value  = values [ i ];
          update = updates[ i ];
          
          if ( value // no error
            && ( v = value[ 1 ] ) // found
            && value_equals( v, value[ 0 ] )
            && key_equals( v, update[ 1 ], value[ 2 ] )
          ) {
            out.push( update );
          }
        }
        
        that.__emit_updates( out, options );
        
        function key_equals( remove, add, key ) {
          for ( var i = -1, l = key.length; ++i < l; ) {
            var a = key[ i ];
            
            if ( remove[ a ] !== add[ a ] ) return false;
          }
          
          return true;
        } // key_equals()
      } // exists()
    } // _update()
  } ); // not_exists()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.Fetch_Flow_Key = Fetch_Flow_Key;
  RS.Not_Exists     = Not_Exists;
  
  return rs;
} ); // transactional.js
