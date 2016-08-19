/*  transactional.js
    
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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'transactional', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , extend       = RS.extend
    , extend_2     = extend._2
    , log          = RS.log
    , Pipelet      = RS.Pipelet
    , Greedy       = RS.Greedy
    , value_equals = RS.value_equals
    , picker       = RS.picker
    , de           = false
    , ug           = de && log.bind( null, 'transactional' )
  ;
  
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
      
      @parameters:
      - store (Pipelet): the dataflow from which incomming values will
        are fetched
      
      - fetch_query (Function): optional, called to build fetch query,
        default will query all, which is the equivalent of a fetch_query()
        returning undefined. Signature is ( Object ) -> Array of Objects
      
      - options (Object): optional options for Pipelet.
      
      @emits:
      - source (Object): incomming source value
      - query  (Array of Objects): query used to fetch the store dataflow
      - values (Array of Objects): fetched values from the store dataflow
        with query
      - operation (String): "create", "delete", "update_previous", or
        "update_new".
      
      @examples:
      - Create a user object if none exist with source email address:
      
        ```javascript
          user
            .fetch( rs.database(), function ( value ) {
               return [ { flow: 'users', email: value.email } ];
             } )
            
            .map( function( fetched ) {
              if ( ! fetched.values.length ) // none found with this email address
                return { flow: 'users', id: uuid_v4(), email: fetched.source.email }
              ;
            } )
            
            .trace( 'database state changes' )
            
            .database()
          ;
        ```
        
        Using @@pipelet:flat_map() instead of @@pipelet:map() above, one
        can create multiple objects at the same time in the same
        transaction.
      
      @description:
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
      
      #### Operation:
      
      In Toubkal, the low level method that allows to query the state of
      the system is the method @@method:Plug.._fetch(). It provides a
      snapshot of a @@pipeline at the time of fetching. In all-reactive
      operations, _fetch() is always associated with a change in
      @@subscription. But _fetch() can also be used without a subscribtion,
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
      
      Source operations to this pipelet are supposed to adhere strictly
      to a transactional semantic where adds mean "create", removes mean
      "delete", and updates mean updating an existing object providing
      previous and new values.
  */
  // ToDo: add tests for fetch() pipelet.
  function Fetch( store, fetch_query, options ) {
    var that = this;
    
    Greedy.call( that, options )
    
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
        var query = fetch_query && fetch_query( value )
          , fetched_values = []
        ;
        
        store._fetch( fetched, query );
        
        function fetched( values, no_more ) {
          fetched_values.push.apply( fetched_values, values );
          
          if ( ! no_more ) return;
          
          out[ position ] = {
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
        that.__emit_update( updates.map( make_update ), options );
        
        function make_update( removed, position ) {
          return [
            removed,
            
            {
              source   : updates[ position ][ 1 ],
              query    : removed.query,
              values   : removed.values,
              operation: 'update_new'
            }
          ];
        } // make_update()
      } // emit()
    } // _update()
  } ); // fetch(), the pipelet
  
  /* --------------------------------------------------------------------------
      @pipelet update_fetched( update, options )
      
      @short Update fetched values in a transaction
      
      @parameters:
      - update (Function): optional, called to calculate new values from
        fetched values and source value, it should not modify its parameter
        objects. Its signature is:
        
        ```
          ( fetched_value, source_value ) -> updated_value (Object)
        ```
        Which parameters come from upstream pipelet @@pipelet:fetch():
        - fetched_value (Object): value fetched
        - source_value (Object): source value of upstream fetch()
        
        If no update() function is provided, the default is to extend
        fetched values with source values:
        
        ```javascript
          function update( fetched_value, source_value ) {
            return extend( {}, fetched_value, source_value );
          }
        ```
      
      - options (Object): ignored for now
      
      @examples:
        Update a user profile, where source is a dataflow of updates to user profiles:
        
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
      Emit removes of fetched (current) values then adds for new updated values in a
      transaction.
      
      Updated values are returned by the update() function parameter which returns
      updated values from fetched values and source values.
      
      Source values must have the following attributes, typically emitted by the fetch()
      pipelet but could also be provided by any other pipelet:
      - source (Object): incomming source value, upstream of fetch()
      - values (Array of Objects): fetched values from the store dataflow with query
      
      If multiple values were fetched, the update() function is called for all fetched
      values, so that all fetched values can be updated in the same transaction.
      
      This is a @@transactional, @@synchronous, @@stateless, @@greedy pipelet.
  */
  // ToDo: update_fetched(), add tests
  rs.Compose( 'update_fetched', function( source, update, options ) {
    var tag   = 'update_fetched'
      , input = source.pass_through( { fork_tag: tag } )
    ;
    
    // Emit remove + add in a transaction, using fork tag
    return source
      .namespace()
      
      .union( [
        input.flat_map( removed_values ).revert(),
        input.flat_map(   added_values )
      ], { key: options.key, tag: tag } )
      
      .pass_through()
    ;
    
    function removed_values( fetched ) { return fetched.values }
    
    function added_values( fetched ) {
      var source = fetched.source;
      
      var _update = update
        ? function( fetched_value ) { return update( fetched_value, source ) }
        : function( fetched_value ) { return extend( {}, fetched_value, source ) }
      ;
      
      return fetched.values.map( _update );
    } // added_values()
  } ) // update_fetched()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet fetch_first( store, expression, attribute, options )
      
      @short Set attribute with first fetched value from store by @@function:picker expression
      
      @parameters:
      - store     (Pipelet): to @@pipelet:fetch() from.
      - expression (Object): @@function:picker() expression.
      - attribute  (String): attribute name for emitted fetched values
      - options    (Object):
        - mandatory (Boolean): default false, do not emit any value if fetch
          emits no values.
      
      @description:
      This is a @@transactional, @@synchronous, @@stateless, @@greedy pipelet.
  */
  .Compose( 'fetch_first', function( source, store, expression, attribute, options ) {
    // ToDo: fetch_first() add tests
    expression = picker( expression );
    
    return source
      .fetch( store, function( data ) { return [ expression( data ) ] } )
      
      .map( function( fetched ) {
        var value  = fetched.values[ 0 ]
          , source = fetched.source
        ;
        
        if ( value ) {
          source = extend( {}, source );
          
          source[ attribute ] = value;
          
        } else if ( options.mandatory ) return;
        
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
  RS.add_exports( {
    'Fetch_Flow_Key': Fetch_Flow_Key,
    'Not_Exists'    : Not_Exists
  } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // transactional.js
