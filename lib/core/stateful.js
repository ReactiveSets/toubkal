/*  stateful.js

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
( 'stateful', [ './filter' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , log          = RS.log.bind( null, 'stateful.js' )
    , de           = false
    , ug           = log
    , extend       = RS.extend
    , value_equals = RS.value_equals
    , is_array     = RS.is_array
    , Code         = RS.Code
    , Greedy       = RS.Greedy
    , push         = [].push
  ;
  
  RS.add_exports( {
    'Set'   : Set,
    'Unique': Unique
  } );
  
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
    
    that._reset();
    
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
      receiver( this.pipelet._get(), true )
    } // fetch_unfiltered()
  } ); // Set.Output
  
  Greedy.Build( 'set', Set, {
    _reset: function() {
      this.a = []; // Current state of the set
      this.b = []; // Anti-state, removes waiting for adds
      
      // ToDo: implement super-state, maybe as a strict_set() pipelet
      // this.c = []; // Super-state, duplicate adds waiting for removes
    }, // _reset()
    
    _get: function() {
      return this.a;
    }, // _get()
    
    /* ------------------------------------------------------------------------
        @method Set.._clear( options )
        
        @short Clears set content then notifes downsteam Pipelets.
    */
    _clear: function( options ) {
      this._reset();
      
      return this.__emit_clear( options );
    }, // _clear()
    
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
    // Todo: Set.._add(): filter-out duplicate adds, with super-state
    _add: function( values, options ) {
      var that      = this
        , locations = options && options.locations
      ;
      
      // If there are locations, these cannot be forwared if values are handled
      // asynchronously by a derived class, therefore we remove locations from
      // options
      if ( locations ) {
        options = extend( {}, options );
        
        delete options.locations;
      }
      
      return that._transaction( values.length, options, function( t, l ) {
        de&&ug( get_name( that, '_add' ) + 'values: ' + l );
        
        if ( locations ) {
          while( l-- )
            that._add_value( t, values[ l ], false, locations[ l ] )
          ;
        } else {
          var i = -1;
          
          while( ++i < l )
            that._add_value( t, values[ i ] )
          ;
        }
        
        /* --------------------------------------------------------------------
           Flush to allow transaction to progress downstream.
           
           This prevents a bug during the connection of pipelets on
           Output.transactional_fetch() if the fetch is assynchronous, with
           a first part synchronous, a downstream pipelet would get the
           first part in the intial fetch and later would receive the same
           data duplicated because adds in the transaction that would
           otherwide be delayed until the end of the transaction.
        */
        t.flush();
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
        object must be invoked consistently with the number of values
        originally added in the operation by either calling
        @@method:Transaction..__emit_add() or
        @@method:Transaction..emit_nothing(). See also @@class:Transaction
        for more details and methods allowing to maintain transaction
        consistency.
    */
    _add_value: function( transaction, value, emit_now, location ) {
      if( value && this.__add_value( value, location ) ) {
        transaction.__emit_add( [ value ], emit_now );
      } else {
        transaction.emit_nothing();
      }
    }, // _add_value()
    
    _add_values: function( transaction, values, emit_now ) {
      var that  = this;
      
      transaction.__emit_add( values.filter( add_value ), emit_now );
      
      function add_value( value ) { return that.__add_value( value ) }
    }, // _add_values()
    
    /* ------------------------------------------------------------------------
        @method Set..__add_value( value, location )
        
        @short Adds a value into the set without emitting
        
        @parameters:
        - value (Object): value to add
        - location (Integer): optional location to insert value into set,
          as provided by optional upstream @@pipelet:order() pipelet.
        
        @returns
        (Boolean):
        - ```true```: value was added to the set's state
        - ```false```: value was not added to the set's state because it was
          removed from the set's anti-state.
        
        @description:
        This is a low-level method to add a value synchronously into the set
        without emitting anything.
        
        It must therefore be used in conjunction with a method that emits
        downstream events.
        
        This method can be overloaded by derived classes to implenent the
        set's state with other methods or behavior.
    */
    __add_value: function( value, location ) {
      var that = this
        , b    = that.b
        , p
      ;
      
      if ( b.length ) {
        p = that._b_index_of( value );
        
        if ( p != -1 ) {
          de&&ug( get_name( that, '__add_value' ) + 'removing add from anti-state' );
          
          b.splice( p, 1 );
          
          return false;
        }
      }
      
      if( typeof location == 'number' ) {
        that.a.splice( location, 0, value );
      } else {
        that.a.push( value );
      }
      
      return true;
    }, // __add_value()
    
    /* ------------------------------------------------------------------------
       _remove( values )
       
       Remove values from the set then notify downstream pipelets
    */
    _remove: function( values, options ) {
      var that      = this
        , locations = options && options.locations
      ;
      
      // If there are locations, these cannot be forwared if values are handled
      // asynchronously by a derived class, therefore we remove locations from
      // options
      if ( locations ) {
        options = extend( {}, options );
        
        delete options.locations;
      }
      
      return that._transaction( values.length, options, function( t, l ) {
        de&&ug( get_name( that, '_remove' ) + 'values: ' + l );
        
        if ( locations ) {
          while ( l-- )
            that._remove_value( t, values[ l ], false, locations[ l ] )
          ;
        } else {
          var i = -1;
          
          while ( ++i < l )
            that._remove_value( t, values[ i ] )
          ;
        }
        
        /* --------------------------------------------------------------------
           Flush to allow transaction to progress downstream.
           
           See coment in _add()
        */
        t.flush();
      } );
    }, // _remove()
    
    _remove_value: function( transaction, value, emit_now, location ) {
      if( value ) value = this.__remove_value( value, location );
      
      transaction.__emit_remove( value ? [ value ] : [], emit_now );
    }, // _remove_value()
    
    _remove_values: function( transaction, values, emit_now ) {
      var that    = this
        , removed = []
      ;
      
      values.forEach( remove_value );
      
      transaction.__emit_remove( removed, emit_now );
      
      function remove_value( value ) {
        value = that.__remove_value( value );
        
        value && removed.push( value );
      } // remove_value()
    }, // _remove_values()
    
    __remove_value: function( value, location ) {
      var that = this
        , v
      ;
      
      if( typeof location != 'number' ) location = that._a_index_of( value );
      
      // !! Removed value could be different than value, but does have the same index key
      if( location >= 0 && ( v = that.a.splice( location, 1 )[ 0 ] ) ) return v;
      
      de&&ug( get_name( that, '__remove_value' ) + 'adding value to anti-state' );
      
      that.b.push( value );
    }, // __remove_value()
    
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
        
        /* --------------------------------------------------------------------
           Flush to allow transaction to progress downstream.
           
           See coment in _add()
        */
        t.flush();
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
        1) __emit_remove() is first invoked with one and only one value and
          with a falsy emit_now flag.
        
        2) __emit_add() is invoked after __emit_remove() with one and
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
  
  return rs // only compositions bellow this line
  
  /* --------------------------------------------------------------------------
      @pipelet cache( options )
      
      @short Stateful and lazy pipelet
      
      @parameters:
      - options (Object): optional:
        - key (Array of Strings): @@key of cache values.
        
        - synchronize (Pipelet): optional, triggers cache resynchronizations
        
        - synchronizing (Pipelet): optional, triggers cache resynchronizations
          and receives end-of-synchronization events typically to update the
          state of a pipelet socket_io_state_changes() from
          ```"synchronizing"``` to ```"connected"```.
        
        - pipelet (String): @@stateful pipelet name, default is
          ```"unique"```. Other possible values are ```"set"```, or any other
          stateful pipelet.
        
        - greedy (Boolean): default is false. If true, cache is greedy,
          regardless of downstream subscriptions. Use with ```"synchronize"```
          option to synchronize a stateful pipelet.
      
      @examples:
      - Get notifications changes since last connection to server. Synchronizing
        ```"notifications"``` dataflow in local storage set with server:
        ```javascript
          var notifications = rs
            
            // Define "local_notifications" simgleton to use with cache()
            .Singleton( 'local_notifications', function( source, options ) {
              return source.local_storage( 'notifications', options );
            } )
            
            // Connect to server
            .socket_io_server()
            
            // Subscribe to "notifications" dataflow
            .flow( 'notifications' )
            
            // Start cache using "local_notifications" and synchronize immediately with server
            .cache( { pipelet: 'local_notifications', synchronize: rs.set( [ {} ] } )
            
            // Notifications changes since last connection to server
          ;
        ```
      
      - Resynchronizing ```"users"``` dataflow cache on hard reconnections
        with server using pipelet socket_io_synchronizing():
        ```javascript
          rs
            .socket_io_server()
            
            .flow( 'users' )
            
            // Cache users, synchronized on hard reconnections
            .cache( synchronizing: rs.socket_io_synchronizing() )
            
            // Remove "synchronizing" tag added by rs.socket_io_synchronizing()
            .pass_through( { tag: 'synchronizing' } )
          ;
        ```
      - Combining both immediate synchronization on first connection
        and resynchronizing on hard reconnections:
        ```javascript
          var notifications = rs
          
            // Connect to server
            .socket_io_server()
            
            // Subscribe to "notifications" dataflow
            .flow( 'notifications' )
            
            // Define "local_notifications" simgleton to use with cache()
            .Singleton( 'local_notifications', function( source, options ) {
              return source.local_storage( 'notifications', options );
            } )
            
            // Start cache using "local_notifications" and synchronize immediately with server
            // also resynchronize on hard reconnections with server
            .cache( {
              pipelet      : 'local_notifications',
              synchronize  : rs.set( [ {} ],
              synchronizing: rs.socket_io_synchronizing()
            } )
            
            // Remove "synchronizing" tag added by rs.socket_io_synchronizing()
            .pass_through( { tag: 'synchronizing' } )
            
            // Notifications changes since last connection to server
          ;
        ```
      
      @description:
      Uses pipelet query_updates() to make @@lazy any @@greedy @@stateful
      pipelet.
      
      This is a @@synchronous, @@stateful, @@lazy pipelet.
      
      To properly disconnect from optional pipelet(), synchronize() and
      synchronizing() pipelets, disconnect the source of cache(). This
      prevents memory leaks when discarding a pipeline containing cache() with
      option ```"pipelet"```, ```"synchronize"``` or ```"synchronizing"```
      when a pipelet provided is a @@singleton, such as pipelet
      socket_io_synchronizing(), or a @@multiton. See pipelet dispatch()
      and method Pipelet..remove_source_with() for more information on
      removing a pipeline and preventing memory leaks.
      
      ### See Also
      - Pipelet database_cache()
      - Pipelet set()
      - Pipelet unique()
      - Pipelet query_updates()
      - Pipelet filter()
      - Pipelet local_storage()
      - Pipelet socket_io_server()
      - Pipelet socket_io_synchronizing()
  */
  .Compose( 'cache', function( source, options ) {
    var rs            = source.namespace()
      , synchronize   = options.synchronize
      , synchronizing = options.synchronizing
      , greedy        = options.greedy
      , output        = greedy || rs.pass_through( options )
      , filter        = greedy ? source : source.filter( rs.query_updates( output ), options )
      , input         = synchronize || synchronizing ? filter.union() : filter
      , state         = input[ options.pipelet || 'unique' ]()
    ;
    
    // Disconnect pipelet with source disconnection if pipelet option is
    // used, it could be a singleton that requires explicit disconnection.
    options.pipelet && state
      .remove_source_with     ( source )
      .remove_destination_with( source )
    ;
    
    synchronize   && fetch_and_apply_differences( synchronize );
    
    synchronizing && fetch_and_apply_differences( synchronizing )
      // Once synchronized, emit source back to synchronizing pipelet in, possibly concurrent, transaction
      .map( function( _ ) { return _.source } )
      
      // Disconnect synchronizing's source if cache's source disconnects
      .remove_destination_with( source )
      
      .through( synchronizing )
    ;
    
    greedy || remove_branch( output = state.union( [ output ] ) );
    
    return greedy ? state : output;
    
    function fetch_and_apply_differences( synchronizer ) {
      var differences = synchronizer
        .fetch( filter )                // assynchronous
        
        // Disconnect synchronizer's output to fetch on cache's source disconnect
        .remove_source_with( source )
        
        .fetch( state  )                // synchronous
        .fetched_differences( options ) // synchronous
      ;
      
      differences
        .emit_operations()              // synchronous
        //.trace( 'emit differences', { counts: true } ) // synchronous
        .through( input )               // synchronous
      ;
      
      remove_branch( input );
      
      return differences;
    } // fetch_and_apply_differences()
    
    function remove_branch( union ) {
      // Allow transaction from synchronizing branch to progress
      
      union._input.add_branches( -1 );
    } // remove_branch()
  } ) // cache()
  
  /* --------------------------------------------------------------------------
      @pipelet database_cache( schema, options )
      
      @short Cache from a database schema
      
      @parameters:
      - schema (Pipelet): @@dataflow definitions. Used attributes:
        - id (String): model flow value
        - key (Array of String): optional, default is ```[ 'id' ]```
      
      - options (Object): options for pipelet dispatch() and pipelet cache():
        - pipelet (String): stateful pipelet name for @@pipelet:cache()
          pipelet, default is ```"unique"```.
        
        - synchronizing (Pipelet): optional, triggers cache resynchronizations
          and receives end-of-synchronization events typically to update the
          state of a pipelet socket_io_state_changes() from
          ```"synchronizing"``` to ```"connected"```.
      
      @examples:
      - A database cache resynchronizing on hard reconnection from socket.io
      server:
      
      ```javascript
        var server = rs.socket_io_server();
        
        // Get dataflows schema from server
        var schema = server.flow( 'schema' );
        
        // cache from schema, re-syncrhonizing on hard reconnections
        var cached = server
          .database_cache( schema, { synchronizing: rs.socket_io_synchronizing() } )
          
          // Remove "synchronizing" tag added by rs.socket_io_synchronizing()
          .pass_through( { tag: 'synchronizing' } )
        ;
      ```
      
      @description:
      Uses pipelet query_updates() and pipelet cache() to deliver
      lazy cache for a database.
      
      This is a @@synchronous, @@stateful, @@lazy pipelet. It is also lazy
      on ```"schema"```.
      
      Lazily creates caches when downstream subscribes to dataflows
      matching a model "id" in the schema set.
      
      ### See Also
      - Pipelet cache()
      - Pipelet set()
      - Pipelet unique()
      - Pipelet query_updates()
      - Pipelet flow()
      - Pipelet socket_io_server()
      - Pipelet socket_io_synchronizing()
  */
  .Compose( 'database_cache', function( source, schema, options ) {
    var rs            = source.namespace()
      , output_query  = rs.pass_through()
      , pipelet       = options.pipelet
      , synchronizing = options.synchronizing
      , query
      , output
      , gatherer
    ;
    
    query = rs
      .query_updates( output_query )
      
      .pick( { id: 'flow' } )
    ;
    
    output = source.dispatch( schema.filter( query ), cache, options );
    
    // ToDo: document dispatch() gatherer, make it part of the specification
    gatherer = output._output.pipelet;
    
    // Add output_query to gatherer's union sources, prevents adding another union
    output_query.through( gatherer );
    
    // Fix the number of branches that emit concurrent (forked) transactions (at least for synchronizing)
    gatherer._input.add_branches( -1 );
    
    return output;
    
    function cache( source, options ) {
      
      return source
        
        // cache() disconnects from pipelet and synchronizing when dispatch() disconnects source
        .cache( { key: this.key || [ 'id' ], pipelet: pipelet, synchronizing: synchronizing } )
        
        .delivers( [ this.id ] )
      ;
    } // cache()
  } ) // database_cache()
} );
