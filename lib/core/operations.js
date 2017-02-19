/*  operations.js
    
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
( 'operations', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , log          = RS.log
    , Pipelet      = RS.Pipelet
    , de           = false
    , ug           = de && log.bind( null, 'operations' )
  ;
  
  /* -------------------------------------------------------------------------------------------
      @function nil_operation( __, options )
      
      @short Emits empty add operation if options has an end of transaction.
      
      @description:
        Allows to guaranty transactions' semantics that forks in transactions must always be
        forwarded as well as terminating transactions that may have flowed through a previously
        forwarded operation.
        
        Emits nothing if there are no options or options without a transaction object or
        a transaction object without fork tags.
        
        Only emits the transaction object from options, discards all other options;
      
      @ToDo: move to Pipelet class
  */
  function nil_operation( __, options ) {
    var _t = options && options._t;
    
    if ( _t && ! _t.more )
      this.__emit_add( [], { _t: _t } )
    ;
  } // nil_operation()
  
  /* --------------------------------------------------------------------------
      @pipelet split_updates( options )
      
      @short Split @@update @@operations into @@remove plus @@add in a
        @@transaction
      
      @examples:
      - Process all add operations:
        ```javascript
          source
            .split_updates()
            .adds()
            .alter( function( value ) {
              // Alter all adds, including those from update operations
            } )
          ;
        ```
      
      - Process all remove operations:
        ```javascript
          source
            .split_updates()
            .removes()
            .alter( function( value ) {
              // Alter all removes, including those from update operations
            } )
          ;
        ```
      
      @description:
      This pipelet is used in conjunction with @@pipelet:adds() or
      @@pipelet:removes(), to process all @@add and @@remove @@operations
      including removes and adds included in @@update operations.
      
      On updates, one remove operation is emitted containing all removes
      from all updates, followed by the emission of one add operation
      with all adds from all updates. These two are emitted in a
      @@transaction to maintain atomicity.
      
      The pipelet @@pipelet:optimize() would do the opposite, recombining
      all remove and add operations in the same transaction into a
      single update operation.
      
      This is a @@synchronous, @@stateless, @@lazy pipelet.
  */
  function Split_Updates( options ) {
    Pipelet.call( this, options );
  } // Split_Updates()
  
  Pipelet.Build( 'split_updates', Split_Updates );
  
  /* --------------------------------------------------------------------------
      @pipelet adds( options )
      
      @short Only forward add @@operation\s
      
      @parameters
      - **options** (optional Object): @@class:Pipelet() options.
      
      @description
      Forwards only add operations downstream, filters-out remove and update
      operations. This may be used to select operations that create objects
      that do not yet exist in @@strict semantic. See caveats bellow if a
      non-strict semanctic is used.
      
      This is a @@synchronous, @@stateless, @@lazy pipelet.
      
      Caveat 1: for this pipelet to work as usually intented, upstream
      pipelets need to emit change operations using the "update" operation.
      Some pipelets may break this by splitting updates into remove and add
      operations within a transaction. Although this is semantically
      equivalent from a state standpoint, it makes it harder to detect
      changes on existing objects and this pipelet does not attempt to
      consolidate remove and add operations into updates. Using
      @@pipelet:optimize() can reconstruct updates from removes and adds
      in a transaction at this cost of a greedy and stateful behavior for
      specific dataflows where the key is specified.
      
      Caveat 2: this will not work if update operations are used to group
      adds and removes on different objects, concealing created and removed
      objects into a fake change operation.
  */
  function Adds( options ) {
    Pipelet.call( this, options );
  } // Adds()
  
  Pipelet.Build( 'adds', Adds, {
    _remove: nil_operation,
    _update: nil_operation
  } );
  
  /* --------------------------------------------------------------------------
      @pipelet removes( options )
      
      @short Only forward remove @@operation\s
      
      @parameters
      - **options** (optional Object): @@class:Pipelet() options.
      
      @description
      Forwards only remove operations downstream, filters-out add and update
      operations. This may be used to select operations that remove existing
      objects in @@strict semantic.
      
      Caveats: check @@pipelet:adds() caveats about split updates and fake
      updates that would prevent this pipelet to work as intented.
      
      This is a @@synchronous, @@stateless, @@lazy pipelet.
  */
  function Removes( options ) {
    Pipelet.call( this, options );
  } // Removes()
  
  Pipelet.Build( 'removes', Removes, {
    _add   : nil_operation,
    _update: nil_operation
  } );
  
  /* --------------------------------------------------------------------------
      @pipelet updates( options )
      
      @short Only forward update @@operation\s
      
      @parameters
      - **options** (optional Object): @@class:Pipelet() options.
      
      @description
      Forwards only update operations downstream, filters-out add and remove
      operations. This may be used to select operations that update existing
      objects in @@strict semantic.
      
      Caveats: check @@pipelet:adds() caveats about split updates and fake
      updates that would prevent this pipelet to work as intented.
      
      This is a @@synchronous, @@stateless, @@lazy pipelet.
  */
  function Updates( options ) {
    Pipelet.call( this, options );
  } // Updates()
  
  Pipelet.Build( 'updates', Updates, {
    _add   : nil_operation,
    _remove: nil_operation,
    
    // override default update function that splits updates
    _update: function( updates, options ) {
      this.__emit_update( updates, options );
    }
  } ); // updates()
  
  /* --------------------------------------------------------------------------
      @pipelet revert( initial_state, options )
      
      @short Reverts add, remove, and update operations
      
      @parameters
      - **initial_state** (Array of values): optional initial values to emit
        synchronously as a guess on upstream fetched state.
        
      - **options** (Object): optional @@class:Pipelet options.
      
      @examples
      - Complement of one set with respect to another set:
        
        ```javascript
        var other_users = users
          
          .union( some_users.revert() )
          
          .set()
        ;
        
        ```
      - Remove fetched items by id from a database:
        
        ```javascript
        source_item_ids_to_remove
          .fetch( rs.database(), function( item ) {
            return [ { flow: 'items', id: item.id } ]
          } )
          
          // emit fetched values as adds
          .flat_map( function( _ ) {
            return _.values;
          } )
          
          // emit fetched values as removes
          .revert()
          
          // delete fetched items from database
          .database()
        ;
        ```
        Using:
        - Pipelet fetch()
        - Pipelet flat_map()
        
      @description
      Reverts operations:
      - @@[adds]add are emitted as removes
      - @@[removes]remove are emitted as adds
      - @@[updates]update are swapped (remove swapped with add)
      
      The resulting set can be considered as the "anti-set" of upstream
      set. This allows to build "not" pipelines such as @@pipelet:has_none()
      or set complement as in the above example.
      
      Used in @@transactional pipelines, revert() allows to remove
      fetched values that need to be deleted from system's state.
      
      This is a @@stateless, @@synchronous, @@lazy pipelet.
      
      ### Initial state processing
      On downstream fetch, the initial state is emitted synchronously as
      a guess on upstream fetched state.
      
      This is useful when upstream fetch is assynchronous and one desires
      fewer state changes downstream.
      
      As fetched values are received from upstream, values already emitted
      downstream as initial state are discarded. Once a fetch completes,
      initial values that were not fetched (wrongly guessed) are removed
      (i.e. actually emitted as fetched adds because emiited state is
      reverted).
      
      ### See Also
      - Pipelet has_none()
      - Pipelet emit_operations()
  */
  function Revert( initial_state, options ) {
    var that = this
      , output
      , original_fetch
    ;
    
    Pipelet.call( that, options );
    
    output = that._output;
    
    original_fetch = output._fetch;
    output._fetch = initial_state ? initial_fetch : fetch;
    
    function fetch( receiver, query, query_changes, destination ) {
      original_fetch.call( output, fetched, query, query_changes, destination )
      
      function fetched( adds, no_more, removes, updates, options ) {
        receiver( removes || [], no_more, adds, updates && updates.map( swap_update ), options )
      }
    } // fetch()
    
    // ToDo: implement a separate pipelet to fetch an initial state
    function initial_fetch( receiver, query, query_changes, destination ) {
      var _initial_state = initial_state.slice( 0 ); // shallow copy
      
      // Emit initial state as removes
      receiver( [], false, _initial_state );
      
      original_fetch.call( output, initial_fetched, query, query_changes, destination );
      
      function initial_fetched( adds, no_more, removes, updates, options ) {
        // ToDo: also lookup updates for _initial_state values
        if ( updates ) updates = updates.map( swap_update );
        
        // Removes adds already added in initial state
        var i = -1
          , initial_value
          , key
          , j
          , add
        ;
        
        while ( initial_value = _initial_state[ ++i ] ) {
          key = that._make_key( initial_value );
          
          // filter-out values that have the same key
          for ( j = -1; add = adds[ ++j ]; ) {
            if ( that._make_key( add ) == key ) {
              // This add was already added via initial state
              
              // Renove this add from adds and _initial_state
              adds = adds.slice( 0 ); // shallow copy before splice
              
              adds.splice( j, 1 );
              
              _initial_state.splice( i--, 1 );
              
              break;
            }
          }
        }
        
        if ( no_more ) {
          removes && _initial_state.push.apply( _initial_state, removes );
          
          receiver( _initial_state, no_more, adds, updates, options );
        } else if ( adds.length || removes || updates )
          receiver( removes || [], no_more, adds, updates, options )
        ;
      } // initial_fetched()
    } // initial_fetch()
  } // Revert()
  
  Pipelet.Build( 'revert', Revert, function( Super ) { return {
    __emit_add   : Super.__emit_remove,
    __emit_remove: Super.__emit_add,
    
    __emit_update: function( updates, options ) {
      return Super.__emit_update.call( this, updates.map( swap_update ), options );
    }
  } } ); // revert()
  
  function swap_update( update ) {
    return [ update[ 1 ], update[ 0 ] ]
  }
  
  /* --------------------------------------------------------------------------
      @pipelet has_none( options )
      
      @short Has one value if source has none, has no value if source has one
      
      @parameters
      - **options** (Object): optional @@class:Pipelet options, plus:
        - **start_none** (Boolean): if truly, initial state is { id: 1 },
          until first fetch returns.
      
      @emits
      - id (Number): always 1
      
      @examples:
      
      ```javascript
        // Synchronous upstream source fetching:
        rs.set( [ { id: 2 } ] )
          .has_none()
          // state: []
        ;
        
        rs.set( [] )
          .has_none()
          // state: [ { id: 1 } ]
        ;
        
        // Asynchronous upstream source fetching, using pipelet\ delay():
        rs.set( [ { id: 2 } ] )
          .delay( 10 )
          .has_none()
          // state: []
        ;
        
        rs.set( [] )
          .delay( 10 )
          .has_none()
          // state: [] then [ { id: 1 } ] 20 millisenconds later
        ;
        
        // Synchronous upstream source fetching with option start_none:
        rs.set( [ { id: 2 } ] )
          .has_none( { start_none: true } )
          // state: []
        ;
        
        rs.set( [] )
          .has_none( { start_none: true } )
          // state: [ { id: 1 } ]
        ;
        
        // Asynchronous upstream source fetching, using pipelet\ delay() and with option start_none:
        rs.set( [ { id: 2 } ] )
          .delay( 10 )
          .has_none( { start_none: true } )
          // state: [ { id: 1 } ] then [] 20 millisenconds later
        ;
        
        rs.set( [] )
          .delay( 10 )
          .has_none( { start_none: true } )
          // [ { id: 1 } ]
        ;
      ```
      
      @description:
      This is a @@stateful, @@greedy, @@synchronous pipelet.
      
      If upstream source fetching is asynchronous the initial state of
      has_none() will be empty, meaning that has_none() considers that
      the source has an initial value. If option start_none is truly,
      the opposite is true, i.e. the initial value will be
      ```{ id: 1 }```. See examples.
      
      If upstream source fetching is synchronous, the value of option
      ```start_none``` is irrelevant.
      
      Warning: has_none() works only if the source has zero or one value.
      If the source has more than one value at any given time, results
      are unpredictable. To prevent this, use a reducing pipelet
      upstream of has_none() such as @@pipelet:aggregate(),
      @@pipelet:last(), @@pipelet:group().
      
      ### See Also
      - Pipelet revert()
  */
  rs.Compose( 'has_none', function( source, options ) {
    var name = options.name
      , has_none_value = { id: 1 }
      , has_none_state = [ has_none_value ]
      , initial_state  = options.start_none ? null : has_none_state
    ;
    
    return source
      .map( function( _ ) {
        return has_none_value
      }, { key: [ 'id' ],        name: name + '-map' } )
      
      .revert( initial_state , { name: name + '-revert' } )
      .set   ( has_none_state, { name: name             } )
    ;
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Split_Updates': Split_Updates,
    'Adds'         : Adds,
    'Rem oves'      : Removes,
    'Updates'      : Updates,
    'Revert'       : Revert
  } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // operations.js
