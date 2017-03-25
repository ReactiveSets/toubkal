/*  transactions.js
    
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
( 'transactions', [ './RS' ], function( RS ) {
  'use strict';
  
  var uuid_v4       = RS.uuid.v4
    , Event_Emitter = RS.Event_Emitter
    , log           = RS.log.bind( null, 'transactions' )
    , extend_2      = RS.extend._2
    , Loggable      = RS.Loggable
    , Dictionary    = RS.Dictionary
    , push          = [].push
    , de            = false
    , ug            = log
    , get_name      = Loggable.get_name
  ;
  
/* ----------------------------------------------------------------------------
    @term transaction
    
    @short A group of one or more @@[operations]operation
    
    @description
    
    Transactions are an essential part of Toubkal dataflows, allowing to
    group operations originating from an common cause.
    
    They are for the most part implicit, not requiring programming from
    architects in general, except when @@[concurrency]concurrent is involved
    (see bellow).
    
    Toubkal transactions serve two major purposes:
    - Grouping operations for application state updates to allow these
      operations to either all succeed or all fail in an atomic fashion;
    
    - Provide synchrnonization points, allowing application processes
      to proceed synchronously only at the end of transactions.
    
    The later is arguably the most innovative key technology that
    Toubkal provides greatly simplifying dataflow programming and
    enabling complex applications distributed over micro-services
    to synchronize gracefully with litle if any programming.
    
    A transaction must end once and only once at any given pipelet.
    
    Transactions are designed to be naturaly distributable thanks
    to transaction Objects that carry transaction metadata in
    @@operation options.
    
    Transaction Objects are carried in the ```"_t"``` attribute of
    operation options with the following attributes:
    - **id** (String): transaction unique identifier
    - **more** (Boolean): optional:
      - ```true```: transaction is not yet terminated, more
        operations are expected from @@upstream;
      
      - ```false``` or ```undefined```: transaction terminates
        with this operation. No more operations are expected
        for this transaction from @@upstream\.
    
    - forks (Array of Strings): optional, @@tag\s of concurrent
      transactions.
    
    ### Concurrent graph transactions
    
    ```markdown
    Fork                Union
         -- branch 1 --
    -- | -- branch 2 -- | --
         -- branch 3 --
    ```
    
    When a transaction happens over two or more branches of a @@pipeline
    graph and later re-unites the graph is said to be @@concurrent\.
    
    A concurrent graph does not need to execute in parallel to be the
    source of race conditions that break synchronization and are a
    major source headaches of assynchronous and reactive programming.
    
    If a transaction starts at the above fork, it may then start at
    up to three branches, then terminate up to three times @@downstream
    of the @@pipelet:union(). This would break the essential rule
    that transactions must end once and only once, and most importantly
    may trigger downstream processes to:
    - start up to three times instead of once;
    
    - start too early while all operations have not terminated and the
      final state is unknown.
    
    This would invariably yield chaotic malfunction of the application
    and unhappy users.
    
    To synchronize concurrent transactions, one needs to @@tag them before
    the fork so that Toubkal handles them as concurrent where dataflows
    join agains at pipelets such as @@pipelet:union(), @@pipelet:filter(),
    @@pipelet:join(), and many more.
    
    Once a transaction is tagged, Toubkal knows it needs to wait for
    all branches to terminate the transaction before terminating the
    transaction once, and only once, achieving synchronization of all
    branches.
    
    To allow other independent transactions to be created within each
    branch and so that the union does not wait for other branches to
    terminate these independent transactions, a fork tag is added
    upstream of the concurrent graph to all transactions:
    
    ```javascript
      options: {
        _t: { // transaction object
          id: "0b9b3ef4-521c-4f08-a61d-bd041a715aa7",
          more: true,
          forks: [ "map" ]
        }
      }
    ```
    
    When there are nested concurrent graphs, multiple fork tags are
    pushed to the forks Array, then removed at recombining unions.
    
    @examples
    - a concurrent graph with 3 branches tagged 'map'
      ```javascript
      var fork = source.pass_through( { fork_tag: 'map' } )
        , branch_1 = fork...
        , branch_2 = fork...
        , branch_3 = fork...
      ;
      
      rs.union( [ branch_1, branch_2, branch_3 ], { tag: 'map' } );
      ```
      
      Union removes the ```"map"``` fork tag from transactions' tags added
      by ```source.pass_through()```.
      
      If a single operation has no transaction, ```source.pass_through()```
      makes a transaction with that single operation with the tag to allow
      pipelet union() to wait for all branches to complete
      that transaction.
      
      All pipelets in all branches must forward end of tagged transactions
      even if they have no data to emit.
*/

/* --------------------------------------------------------------------------
    @term tag
    
    @short A string allowing to synchronize concurrent @@[transactions]transaction
    
    @description
*/

  /* --------------------------------------------------------------------------
      @class Transactions( name )
      
      @short Manage a collection of ongoing transactions at an emitter
      
      @parameters:
      - name (String): debugging @@class:Loggable name
      
      @emits
      - **"no_transactions"**: when a transaction terminates and there are
        no other ongoing transactions.
  */
  function Transactions( name ) {
    Event_Emitter.call( this, name );
    
    this.transactions = Dictionary();
    
    // The number of ongoing transactions
    this.count = 0;
  }
  
  Event_Emitter.subclass( 'Transactions', Transactions, {
    /* ------------------------------------------------------------------------
        @method Transactions..get( tid )
        
        @short Get class Transaction() instance from tid
        
        @returns
        - ```undefined``` if not found in ```this.transactions```
        - (@@class:Transaction\)
    */
    get: function( tid ) {
      return this.transactions[ tid ];
    }, // Transactions..get()
    
    /* ------------------------------------------------------------------------
        @method Transactions..get_tids()
        
        @short Get tids for all ongoing transactions
        
        @returns (Array of Strings)
    */
    get_tids: function() {
      return Object.keys( this.transactions );
    }, // Transactions..get_tids()
    
    /* ------------------------------------------------------------------------
        @method Transactions..get_count()
        
        @short Get the number ongoing transactions
        
        @returns (Number)
        
        @throws
        - If the internal count does not match the number of transaction
          identifiers returned by @@method:Transactions..get_tids(). This
          should never happen, and this check might be removed in the
          future if this exception actually never happens.
          
          This check guaranties that the event ```"no_transactions"``` will
          be emitted when count reaches zero.
    */
    get_count: function() {
      var that  = this
        , count = that.count
        , tids  = that.get_tids()
      ;
      
      if ( tids.length != count )
        throw new Error( get_name( that, 'get_count' ) + 'bad count: ' + count + ', tids: ' + tids );
      ;
      
      return count;
    }, // Transactions..get_count()
    
    /* ------------------------------------------------------------------------
        @method Transactions..toJSON()
        
        @short Provides a representation suitable for JSON.stringify()
        
        @returns acyclic representation of all ongoing transactions.
    */
    toJSON: function() {
      return this.get_tids();
    }, // Transactions..toJSON()
    
    /* ------------------------------------------------------------------------
        @method Transactions..get_transaction( count, options, output, fork )
        
        @short Get or create a transaction for count (additional) operations
        
        @parameters:
        - count (Integer): number of (additional) operations this transaction
          is expected to emit
        
        - options (Object): optional from upstream pipelet, used to forward
          transaction downstream
        
        - output (@@class:Output\): optional output to emit operations to.
          If no output is provided, the returned transaction will emit events
          as an Event_Emitter.
        
        - fork (String): optional fork @@tag\.
        
        @returns (@@class:Transaction\)
    */
    get_transaction: function( count, options, output, fork ) {
      var that         = this
        , transactions = that.transactions
        , name         = de && get_name( that, 'get_transaction' )
        , _t           = options && options._t
        , tid
        , t
      ;
      
      if ( _t && ( t = transactions[ tid = _t.id ] ) ) {
        // This is a continuation of an upstream transaction
        de&&ug( name + 'Continue from upstream, tid: %s, add count: %d', tid, count );
        
        t
          .add_operations( count )
          .set_source_options( options )
        ;
      
      } else {
        de&&ug( name + ( _t ? 'Create from upstream, tid: ' + tid : 'New cause' ) + ', count:', count );
        
        t = new Transaction( count, options, output, fork );
        
        _t
          ? record_tid.call( t, tid ) // create from upstream
          : t.on( 'tid', record_tid ) // new cause
        ;
      }
      
      // end transaction immediately, it will close when count reaches zero
      return that.end_transaction( t )
      
      // Record transaction id and transaction in transactions if tid is generated
      function record_tid( tid ) {
        de&&ug( name + 'record_tid:', tid );
        
        ++that.count;
        
        return transactions[ tid ] = this.on( 'ended', end );
      }
      
      // Remove tid from transactions when transaction ends, emit event "no_transactions"
      function end() {
        de&&ug( name + 'end, tid: %s, count: %d', tid, that.count );
        
        delete transactions[ tid ];
        
        --that.count || that.emit( 'no_transactions' )
      }
    }, // Transactions..get_transaction()
    
    /* ------------------------------------------------------------------------
        @method Transactions..end_transaction( transaction )
        
        @short Ends a transaction if it is closed
        
        @description
        - ToDo: this method is no-longer called directly other than in tests and internally, remove it
        - ToDo: this should be a method of Transaction, not Transactions
    */
    end_transaction: function( t ) {
      t.is_closed() || t.end();
      
      return t;
    } // Transactions..end_transaction()
  } ); // Transactions instance methods
  
  /* --------------------------------------------------------------------------
      @class Transaction( count, options, output, fork )
      
      @short Creates a transaction
      
      @parameters:
      - **count** (Integer): the number of operations expected, which is
        the number of time one must call the next() instance method.
      
      - **options** (Object): optional upstream optional attributes:
      
        ToDo: Transaction() should only receive _t as a parameter, should not need all options that should be managed by caller.
        
        - **_t** (Object): a transaction Object:
          - **more** (optional Boolean):
            - ```true```: if more data is expected from upstream within this
              transaction, i.e. the upstream transaction is not complete.
            
            - ```false``` or ```undefined```: this is the last event from
              upstream for this transaction.
            
          - **id**: (String): a unique identifier (uuid_v4) for this
            transaction
          
          - **forks** (Array of Strings): optional upstream fork tags to
            always forward to downstream pipelets, allowing branches
            synchronization at inputs tagged with one of this fork tags.
        
      - **output** (@@class:Output\): optional output to emit operations to.
        When not provided, the transaction will emit events ```"add"``` and
        ```"remove"``` instead of emitting to an output, see Emitted Events
        bellow.
      
      - **fork** (String): optional fork @@tag.
      
      @emits
      - ```"ended"``` : ():
        When the transaction have finished emitting everything and has ended
      
      - ```"add"```   : ( values, options ):
        When no output is provided and an 'add' is emitted
      
      - ```"remove"```: ( values, options ):
        When no output is provided and a 'remove' is emitted
      
      - ```"update"```: ( updates, options ):
        When no output is provided and an 'update' is emitted
      
      @description
      
      This is an @@class:Event_Emitter\.
      
      @manual internal
  */
  function Transaction( count, options, output, fork ) {
    var that  = this
      , o     = options
      , t     = options && options._t
      , more  = t && t.more
      , forks = t && t.forks
    ;
    
    that.number = ++Transaction.count; // for debugging purposes
    
    Event_Emitter.call( that, get_name( output ) + ' #' + that.number );
    
    if( more || count > 1 || fork ) {
      // There is more comming from upstream or multiple operations for this transaction, or a fork at this point
      // Options will be altered by this transaction, requires a deep copy
      
      if( fork ) {
        o = extend_2( {}, options );
        
        t = o._t = t ? extend_2( {}, t ) : {};
        
        // Don't create a transaction id here,
        // it will be created by emit_options() only if we actually emit something
        
        if( forks ) {
          // make a copy and add fork
          ( t.forks = forks.slice( 0 ) ).push( fork );
        } else {
          t.forks = [ fork ];
        }
      }
    }
    
    that.count        = count; // !! Must set count before calling set_source_options()
    
    that.set_source_options( options );
    
    that.emit_options = o;
    that.fork         = fork;
    that.o            = extend_2( {}, o );
    that.added        = [];       // Values added but which emission is defered
    that.removed      = [];       // Values removed but which emission is defered
    that.updated      = [];       // Values updated but which emission is defered
    that.need_close   = !!forks;  // True when some emits with more have been done requiring an emit with no-more, or there are fork tags
    that.closed       = false;    // When true means that the last options have been provided with no-more, any further attempt will raise an exception
    that.ending       = false;    // Will be set to true if end() is called but cannot end yet
    that.output       = output;   // The Output to emit operations to
    
    de&&ug( 'new Transaction()', that.toJSON() );
  } // Transaction()
  
  Transaction.count = 0; // created transcations counter, for debugging purposes
  
  Event_Emitter.subclass( 'Transaction', Transaction, {
    get_tid: function() {
      var emit_options = this.emit_options || {}
        , t = emit_options._t || {}
      ;
      
      return /*emit_options.transaction_id ||*/ t.id;
    }, // Transaction..get_tid()
    
    is_closed: function() {
      return this.closed;
    },
    
    toJSON: function() {
      var that = this;
      
      return {
        number        : that.number,
        name          : get_name( that ),
        tid           : that.get_tid(),
        count         : that.count,
        source_more   : that.source_more,
        need_close    : that.need_close,
        closed        : that.is_closed(),
        added_length  : that.added.length,
        updated_length: that.updated.length,
        removed_length: that.removed.length
      };
    }, // Transaction..toJSON()
    
    add_operations: function( count ) {
      var that = this;
      
      // count can be negative, is equivalent to -count emit_nothing()
      if ( ( that.count += count ) < 0 ) {
        that.next(); // will throw an exception because the resulting count is negative
      }
      
      de&&ug( get_name( that, 'add_operations' ), { adding_operations: count, new_total: that.count } );
      
      return that.ending ? that.end() : that;
    }, // Transaction..add_operations()
    
    set_source_options: function( options ) {
      var that  = this
        , t     = options && options._t
      ;
      
      if ( t && ! t.more ) {
        // This is the end of an upstream transaction, it must be forwarded
        that.need_close = true;
      }
      
      that.source_more = ( t && t.more ) || false;
      
      // source options will be used for options if there is only one emitted operation
      that.source_options = options;
      
      de&&ug( get_name( that, 'set_source_options' ), { source_more: that.source_more } );
      
      return that.ending ? that.end() : that;
    }, // Transaction..set_source_options()
    
    // ToDo: implement _emit methods as Transaction subclass in pipelet.js
    _emit: function( operation, values, options ) {
      var that   = this
        , output = that.output
      ;
      
      if ( output ) {
        output.emit( operation, values, options );
      } else {
        that.emit_apply( operation, [ values, options ] );
      }
      
      return that;
    }, // _emit()
    
    __emit_add: function( values, emit_now ) {
      var that = this;
      
      de&&ug( '__emit_add, values: ' + values.length + ( emit_now ? ', now' : ', later' ) );
      
      that.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          that._emit( 'add', values, that.get_emit_options() );
        } else {
          push.apply( that.added, values );
        }
      }
      
      return that.ending ? that.end() : that;
    }, // Transaction..__emit_add()
    
    __emit_remove: function( values, emit_now ) {
      var that = this;
      
      de&&ug( '__emit_remove, values: ' + values.length + ( emit_now ? ', now' : ', later' ) );
      
      that.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          that._emit( 'remove', values, that.get_emit_options() );
        } else {
          push.apply( that.removed, values );
        }
      }
      
      return that.ending ? that.end() : that;
    }, // Transaction..__emit_remove()
    
    // ToDo: add tests for Transaction..__emit_update()
    __emit_update: function( updates, emit_now ) {
      var that = this;
      
      de&&ug( '__emit_update, updates: ' + updates.length + ( emit_now ? ', now' : ', later' ) );
      
      that.next();
      
      if ( updates.length ) {
        if ( emit_now ) {
          that._emit( 'update', updates, that.get_emit_options() );
        } else {
          push.apply( that.updated, updates );
        }
      }
      
      return that.ending ? that.end() : that;
    }, // Transaction..__emit_update()
    
    emit_nothing: function() {
      var that = this;
      
      de&&ug( get_name( that, 'emit_nothing' ) );
      
      that.next();
      
      return that.ending ? that.end() : that;
    }, // Transaction..emit_nothing()
    
    next: function() {
      var that = this;
      
      // decrement coumt and test validity
      if ( --that.count < 0 ) {
        that.count = 0;
        
        throw new Error( get_name( that, 'next' ) + ', exception: count was already zero' );
      }
      
      return that;
    }, // Transaction..next()
    
    // ToDo: merge Transaction..get_emit_options() into Transaction..next_options()
    next_options: function() {
      return this.next().get_emit_options()
    }, // Transaction..next_options()
    
    // Get options for emitting current operation, should be called once and only once per operation emitted
    get_emit_options: function() {
      var that    = this
        //, de      = true
        , ug      = de && log.bind( null, _get_name() )
        , more    =
            that.o.more = // Set more on that.o, ToDo: is this really required?
               that.source_more
            || that.count > 0
            || that.removed.length > 0
            || that.updated.length > 0
            || that.  added.length > 0
        
        , options = that.emit_options
        , t       = options && options._t
        , fork    = that.fork
        , t_more
        , tid
      ;
      
      //de&&ug( 't:', t, ' - more:', more, ' - fork:', fork );
      
      if ( that.closed ) {
        var error = new Error( _get_name()
          + 'transaction already closed'
          + ', tid: ' + that.get_tid()
          + ', this pipeline probably has non-synchronized branches'
        );
        
        log( _get_name() + '!Warning:', error, error.stack )
      }
      
      if ( that.need_close ) {
        // there was something emited before or there are upstream forks, transaction id is therfore set
        t_more = t && t.more;
        
        //de&&ug( 'need close, t.more:', t_more );
        
        if( more ) {
          if( !t_more ) {
            clone_options();
            
            t.more = more;
          }
        } else {
          // this is the last emit
          that.need_close = false;
          
          if( t && t.more ) {
            clone_options();
            
            delete t.more;
          }
          
          that.closed = true; // this should be the last emit
        }
      } else {
        // there was nothing emited before, transaction id may be unset
        
        if( more || fork ) {
          // there will be more after this or this is a fork, transaction id may be unset
          
          // Create options Object if it does not exist or clone existing options
          clone_options();
          
          // Create transaction id if it does not exist
          if( ! t.id ) {
            tid = t.id = uuid_v4();
            
            //de&&ug( 'new tid:', tid );
            
            that.emit_apply( 'tid', [ tid ] );
          }
          
          // Set more and memorize that this transaction will need to be closed
          // by issuing an operation with more undefined or false
          if( more ) {
            t.more = that.need_close = true;
          } else {
            // there was nothing emited before, and this is the sole emit for this transaction
            that.closed = true;
          }
        } else {
          // there was nothing emited before, and this is the sole emit for this transaction
          that.closed = true; // this should be the only emit
          
          options = that.source_options;
          
          //de&&ug( 'use source options' );
        }
      }
      
      //de&&ug( 'returned options._t:', options && options._t );
      
      return options;
      
      function clone_options() {
        that.emit_options = options = options ? extend_2( {}, options ) : {};
        
        options._t = t = t ? extend_2( {}, t ) : {};
      }
      
      function _get_name() {
        return get_name( that, 'get_emit_options' )
      }
    }, // Transaction..get_emit_options()
    
    /* ------------------------------------------------------------------------
        Transaction..end()
    */
    end: function() {
      var that        = this
        , count       = that.count
        , source_more = that.source_more
        , name        = de && get_name( that, 'end' )
      ;
      
      if ( count || source_more ) {
        de&&ug( name, 'not ending because'
          + ( count                ? ' count (' + count + ') > 0' : '' )
          + ( count && source_more ? ' and'                       : '' )
          + (          source_more ? ' source_more'               : '' )
        );
        
        // Remember that application requested the end of this transaction so that it
        // ends after emitting count operations and source has no more to send
        that.ending = true;
        
        return that;
      }
      
      that.flush( true );
      
      return that.emit_apply( 'ended' );
    }, // Transaction..end()
    
    flush: function( ending ) {
      var that    = this
        , name    = de && get_name( that, 'flush' )
        , removed = that.removed
        , updated = that.updated
        , added   = that.added
      ;
      
      if ( removed.length ) {
        de&&ug( name, '__emit removed' );
        
        that.removed = []; // _clear before __emit() to allow __emit() to set or unset more
        
        that._emit( 'remove', removed, that.get_emit_options() );
      }
      
      if ( updated.length ) {
        de&&ug( name, '__emit updated' );
        
        that.updated = []; // _clear before __emit() to allow __emit() to set or unset more
        
        that._emit( 'update', updated, that.get_emit_options() );
      }
      
      if ( added.length || ( ending && that.need_close ) ) {
        de&&ug( name, '__emit added' );
        
        that.added = []; // _clear before __emit() to force to unset more
        
        that._emit( 'add', added, that.get_emit_options() );
      }
      
      return that;
    } // Transaction..flush()
  } ); // Transaction instance methods
  
  /* --------------------------------------------------------------------------
     --------------------------------------------------------------------------
      @class IO_Transactions( name )
      
      @manual internal
      
      @short Base class for class Input_Transactions() and class Output_Transactions()
      
      @parameters
      - name (String): Loggable name
      
      @description
      Manages a collection of IO_Transaction instances.
      
      ### Input / Output transactions classes
      
      Manage ongoing transactions between inputs and outputs.
      
      Enforce transactions' rules:
      - all transactions terminate once and only once.
      - transactions with fork tags (said concurrent) are forwarded to all destinations at a fork
      - all branches of concurrent transactions synchronize at tagged inputs
      - fork tags are removed at synchronization points
      
      Relationship between I/O and I/O transactions instances:
      
      ```markdown
        upstream Pipelet                       downstream Pipelet
        
               |                                    |       |
               | many                               | many  |
               v                                    v       |
                            many            many            |
             Output - - - - -               ----> Input     |
                               \\\\           /        |       |
               |                          /         ---------
               | one             \\\\       /              | one (shared by all inputs of a pipelet)
               v                        /               v
                            many   \\\\   /
       Output_Transactions <--------\\\\ /        Input_Transactions
                                     x
               |                    / \\\\                 |
               | many              /   \\\\                | many
               v                  /     \\\\               v
                                 /       \\
       Output_Transaction  ------         ------ Input_Transaction
      ```
      
      As shown above, multiple @@[inputs]class:Input of the same
      @@class:Pipelet typically share a single @@class:Input_Transactions
      instance to allow synchronization of concurrent transactions at
      pipelets joining multiple inputs. This is the defaulf behavior
      when inputs are added using method Pipelet.._add_input().
      
      ### See Also
      - Class Pipelet()
      - Class Output()
      - Class Input()
      - Class Output_Transactions()
      - Class Input_Transactions()
      - Class IO_Transaction()
      - Class Output_Transaction()
      - Class Input_Transaction()
      
      - Pipelets with multiple inputs sharing @@class:Input_Transactions:
        - Pipelet union()
        - Pipelet join()
        - Pipelet $to_dom()
  */
  var IO_Transactions_id = 1000; // start at 1000 to help debugging
  
  function IO_Transactions( name ) {
    var that = this;
    
    that.id = ++IO_Transactions_id; // Locally unique identifier
    
    Loggable.call( that, name + '#' + that.id );
    
    that.count = 0;
    that.transactions = Dictionary();
  } // IO_Transactions()
  
  Loggable.subclass( 'IO_Transactions', IO_Transactions, {
    /* ------------------------------------------------------------------------
        @method IO_Transactions..toJSON()
        
        @manual internal
        
        @returns
        - object without circular references
    */
    toJSON: function() {
      var that = this;
      
      return {
        'id'          : that.id,
        'name'        : get_name( that ),
        'count'       : that.count,
        'transactions': that.transactions
      };
    },
    
    /* ------------------------------------------------------------------------
        @method IO_Transactions..get_from_tid( tid )
        
        @manual internal
        
        @returns:
        - io_transaction if found at tid
        - undefined if not found in transactions
    */
    get_from_tid: function( tid ) {
      return this.transactions[ tid ];
    }, // IO_Transactions..get_from_tid()
    
    /* ------------------------------------------------------------------------
        @method IO_Transactions..has( io_transaction )
        
        @manual internal
        
        @returns
        - io_transaction if found at io_transaction.tid
        - undefined if not found in transactions
        
        @throws
        - Error on:
          - io_transaction is null or undefined
          - io_transaction does not have a truly tid attribute
          - found but does not match io_transaction
    */
    has: function( io_transaction ) {
      var that = this;
      
      io_transaction || fatal( 'is null or undefined' );
      
      var t = that.transactions[ io_transaction.tid || fatal( 'has no tid' ) ];
      
      t && t !== io_transaction && fatal( 'does not match found io_transaction' );
      
      return t;
      
      function fatal( message ) {
        that.fatal( 'has', io_transaction, 'i/o transaction ' + message );
      }
    }, // IO_Transactions..has()
    
    /* ------------------------------------------------------------------------
        @method IO_Transactions..add( io_transaction )
        
        @manual internal
        
        @short Add io_transaction object using io_transaction.tid as a key.
        
        @returns
        - (IO_Transaction): parameter io_transaction;
        
        @throws
        - Error if tid key is aleady used or if io_transaction is null or
          undefined.
    */
    add: function( io_transaction ) {
      var that = this;
      
      that.has( io_transaction ) && that.fatal( 'add', io_transaction, 'already added' );
      
      that.transactions[ io_transaction.tid ] = io_transaction;
      
      ++that.count;
      
      return io_transaction;
    }, // IO_Transactions..add()
    
    /* ------------------------------------------------------------------------
        @method IO_Transactions..remove( io_transaction )
        
        @manual internal
        
        @short Removes io_transaction from tid key
        
        @returns
        - (IO_Transaction): parameter io_transaction.
        
        @throws
        - Error if tid key does not hold any io_transaction or if it is not
          a matching io_transaction.
    */
    remove: function( io_transaction ) {
      var that = this;
      
      that.has( io_transaction ) || that.fatal( 'remove', io_transaction, 'not found' );
      
      delete that.transactions[ io_transaction.tid ];
      
      --that.count;
      
      return io_transaction;
    }, // IO_Transactions..remove()
    
    /* ------------------------------------------------------------------------
        @method IO_Transactions..fatal( method_name, io_transaction, message )
        
        @manual internal
        
        @short Fatal error, throws
        
        @throws
        - Error on io_transaction with error message in method method_name.
    */
    fatal: function( method_name, io_transaction, message ) {
      throw new Error(
          get_name( this, method_name )
        + ( io_transaction ? ', tid:' + io_transaction.tid : '' )
        + ', ' + message
      );
    } // IO_Transactions..fatal()
  } ); // IO_Transactions
  
  /* --------------------------------------------------------------------------
      @class IO_Transaction( container, tid, name )
      
      @manual internal
      
      @short Manages transactions counterparts
      
      @parameters
      - container: reference to container IO_Transactions
      - tid (String): unique identifier of transaction
      - name (optional String): for Loggable, default is container._get_name()
      
      @description
      This is the base for class Input_Transaction() and
      class Output_Transaction().
      
      See also class IO_Transactions()
  */
  function IO_Transaction( container, tid, name ) {
    var that = this;
    
    Loggable.call( that, ( name || get_name( container ) ) + '#' + tid );
    
    // Container of all transactions for this IO
    that.container = container;
    
    // Unique transaction identifier
    that.tid = tid;
    
    // number of transactions in this.transactions
    that.count = 0;
    
    // Counterpart's transactions by their id
    that.transactions = new Dictionary();
    
    // Set to true at first emitted warning
    that.warned = 0;
  } // IO_Transaction()
  
  Loggable.subclass( 'IO_Transaction', IO_Transaction, {
    /* ------------------------------------------------------------------------
        @method IO_Transaction..toJSON()
        
        @manual internal
        
        @returns (Object): a representation with no circular dependency
    */
    toJSON: function() {
      var that = this;
      
      return {
        'name'        : get_name( that ),
        'container'   : get_name( that.container ), // prevents circular dependency
        'tid'         : that.tid,
        'count'       : that.count,
        'transactions': that.transactions
      };
    }, // IO_Transaction..toJSON()
    
    /* ------------------------------------------------------------------------
        @method IO_Transaction..is_empty()
        
        @manual internal
        
        @returns
        - (true): holds no class IO_Transactions() instance
        - (false): holds one or more class IO_Transactions() instance
    */
    is_empty: function() {
      return ! this.count;
    }, // IO_Transaction..is_empty()
    
    /* ------------------------------------------------------------------------
        @method IO_Transaction..get( io_transactions )
        
        @manual internal
        
        @parameters
        - io_transactions (@@class:IO_Transactions or @@class:Plug\)
        
        @returns
        - (undefined): io_transactions was never added to this
        - (IO_Transactions): io_transactions already added in this
        - (null): io_transactions was added then removed from this
    */
    get: function( io_transactions ) {
      return this.transactions[ io_transactions.id || io_transactions.transactions.id ];
    }, // IO_Transaction..get()
    
    /* ------------------------------------------------------------------------
        @method IO_Transaction..map( f )
        
        @manual internal
        
        @parameters
        - f( io_transactions ).
        
        @description
        Maps f() to all ongoing io_transactions counterparts and returns Array
        of non-( null or undefined ) values returned by f().
    */
    map: function( f ) {
      var id
        , transactions = this.transactions
        , io_transactions
        , v
        , ___
        , a = []
      ;
      
      for ( id in transactions )
        if ( io_transactions = transactions[ id ] )
          if ( ( v = f( io_transactions ) ) != ___ ) // i.e. null or undefined
            a.push( v )
      
      return a;
    }, // IO_Transaction..map()
    
    /* ------------------------------------------------------------------------
        @method IO_Transaction..add( io_transactions )
        
        @manual internal
        
        @short Adds io_transactions counterpart to this transaction
        
        @parameters
        - io_transactions (@@class:IO_Transactions or @@class:Input\): to add to this.
        
        @returns this
        
        @throws
        - (Error): ```"too many errors on this transaction"```
        
        @description
        Log warnings:
        - io_transactions ```"Already terminated"```
        - io_transactions ```"Already added"```
    */
    add: function( io_transactions ) {
      var that               = this
        , these_transactions = that.transactions
        , id                 = io_transactions.id || io_transactions.transactions.id
        , t                  = these_transactions[ id ]
      ;
      
      if ( t          ) return error( 'Already added' );
      if ( t === null ) return error( 'Already terminated' );
      
      these_transactions[ id ] = io_transactions;
      
      that.count += 1;
      
      de&&ug( get_name( that, 'add' ), { id: id, count: that.count } );
      
      return that;
      
      function error( message ) {
        return that.error( 'add', io_transactions, message );
      }
    }, // IO_Transaction..add()
    
    /* ------------------------------------------------------------------------
        @method IO_Transaction..remove( io_transactions )
        
        @manual internal
        
        @short Removes io_transactions counterpart from this transaction
        
        @parameters
        - io_transactions (IO_Transactions): to remove from this.
        
        @returns this
        
        @description
        Log warnings:
        - io_transactions ```"Already terminated"```
        - io_transactions ```"Not found"```
        - found ```io_transactions``` for this ```io_transactions.id```
          ```"Does not match io_transactions"```.
    */
    remove: function( io_transactions ) {
      var that               = this
        , these_transactions = that.transactions
        , id                 = io_transactions.id || io_transactions.transactions.id
        , t                  = these_transactions[ id ]
      ;
      
      // Assertions
      if ( t === null            ) return error( 'Already terminated' );
      if ( !t                    ) return error( 'Not found' );
      if ( t !== io_transactions ) return error( 'Does not match io_transactions' );
      
      these_transactions[ id ] = null;
      
      that.count -= 1;
      
      de&&ug( get_name( that, 'remove' ), { id: id, count: that.count } );
      
      return that;
      
      function error( message ) {
        return that.error( 'remove', io_transactions, message );
      }
    }, // IO_Transaction..remove()
    
    /* ------------------------------------------------------------------------
        @method IO_Transaction..error( method, other, message )
        
        @manual internal
        
        @short Logs a detailed warning
        
        @parameters
        - method (String): method name from this class originating the error
        - other (@@class:Input_Transactions || @@class:Output_Transactions\):
          counterpart parameter
        - message (String or Array of Strings): error message
    */
    error: function( method, other, message ) {
      var that         = this
        , transactions = that.transactions
        , container    = that.container
        , branches     = container.branches
        , is_input     = Number( !!container.input )
        , types        = [ 'Output', 'Input' ]
        , type         = types[ is_input     ]
        , other_type   = types[ is_input ^ 1 ]
        , _t           = that._t
        , tid          = that.tid
        , warned       = that.warned++
        , is_string    = typeof message == 'string'
        , forks        = _t && _t.forks
      ;
      
      method = get_name( that, method );
      other  = other_type + ': ' + get_name( other );
      
      if( warned ) {
        message = ( is_string ? message : message[ 0 ] ).slice( 0, 64 );
        message = [ method + '!Notice: additional (' + warned + ') warning,', other, message ];
      } else {
        if( is_string ) message = [ '\n  ' + message ];
        
        message.unshift( method + '!Warning:\n' );
        
        message.push(
          '\n\n  Context:' +
          '\n    - tid:', tid,
          '\n    - ' + type + ':', get_name( that ),
          '\n    - ' + other,
          '\n    - Ongoing ' + other_type + 's:',
            Object.keys( transactions )
              .map   ( function( _ ) { return get_name( transactions[ _ ] ) } )
              .filter( Boolean )
            ,
          '\n    - Transaction object:', _t
        );
        
        forks && message.push(
          '\n      -      forks:', _t && _t.forks
        );
        
        branches && message.push(
          '\n    - Upstream branches:', branches
        );
      }
      
      // ToDo: send warning to global log dataflow
      message && log.apply( null, message );
      
      if ( warned > 9 )
        throw new Error( 'too many errors on this transaction' )
      ;
      
      return that;
      
      function get_name( io, method ) {
        if( io ) {
          var container     = io.container || io
            , input         = container.input
            , input_pipelet = input && input.pipelet
          ;
          
          return input
            ? ( input_pipelet._get_name ? input_pipelet._get_name( method ) : input._get_name( method ) )
            : container._get_name( method )
          ;
        }
      } // get_name()
    } // IO_Transaction..error()
  } ); // IO_Transaction
  
  /* --------------------------------------------------------------------------
      @class Input_Transactions( name, input, transactions_options )
      
      @manual internal
      
      @short Manages input transactions for an input container
      
      @parameters
      - name (String): Loggable name
      - input (Object): reference to this Input_Transaction container
      - transactions_options (Object):
        - concurrent (Object): keys are tags, truly values means @@concurrent,
          if concurrent is null or undefined, all tagged transactions are
          considered concurrent. Therefore concurrents comes as a restriction
          which designate which tagged transactions are conccurent at this
          pipelet.
      
      @description
      Guaranties that transactions executed concurrently over multiple
      pipelets terminate once and only once.
  */
  function Input_Transactions( name, input, transactions_options ) {
    var that = this;
    
    IO_Transactions.call( that, name );
    
    that.input   = input;
    that.options = transactions_options || {};
    
    that.set_tag();
    
    that.branches = 0;
  } // Input_Transactions()
  
  IO_Transactions.subclass( 'Input_Transactions', Input_Transactions, function( Super ) { return {
    /* ------------------------------------------------------------------------
        @method Input_Transactions..set_tag( tag )
        
        @manual internal
        
        @short Sets transaction tag to remove from an upstream fork tag.
        
        @parameters
        - tag (optional String): transaction tag from an upstream fork tag
          dispatching operations over a number of concurrent pipelets. If there
          is no tag, no concurrent transaction joins at this input
        
        @description
        
        ### See Also
        - Method Input..set_tag() which calls this method
    */
    // ToDo: allow to set / unset multiple tags
    set_tag: function( tag ) {
      this.tag = tag || null;
    }, // Input_Transactions..set_tag()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..remove_fork_tag_if_last( _t, forks, count, copy_on_write )
        
        @manual internal
        
        @short Removes last fork tag if it is this Input_Transactions tag
        
        @parameters
        - _t (Object): transactions object
        - forks (Array): must be equal to _t.forks
        - count (Number): must be forks.length
        - copy_on_write (Boolean): if true, _t will be shallow cloned before
          modification of forks
        
        @returns
        - (undefined): tag not found, so not removed, _t not altered
        - (Object): modified _t, cloned if copy_on_write
    */
    remove_fork_tag_if_last: function( _t, forks, count, copy_on_write ) {
      var tag = count && this.tag;
      
      if( tag && forks[ --count ] == tag ) {
        if( copy_on_write ) _t = extend_2( {}, _t );
        
        if( count ) {
          _t.forks = forks.slice( 0, count );
        } else {
          delete _t.forks;
        }
        
        de&&ug( get_name( this, 'remove_fork_tag_if_last' ) + 'removed:', tag, ', _t:', _t );
        
        return _t;
      }
      
      // returns undefined if t is unchanged
    }, // Input_Transactions..remove_fork_tag_if_last()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..add_branches( branches )
        
        @manual internal
        
        @short Add or remove concurrent uptream branches.
        
        @parameters:
        - branches (Integer): the number of concurrent branches to add if
          positive, to remove if negative.
    */
    add_branches: function( count ) {
      var that         = this
        , transactions = that.transactions
        , tid
      ;
      
      that.branches += count;
      
      de&&ug( get_name( that, 'add_branches' ) + 'count:', count, ', new count:', that.branches )
      
      for( tid in transactions )
        transactions[ tid ].add_branches( count );
    }, // Input_Transactions..add_branches()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..add( tid, source, forks )
        
        @manual internal
        
        @short Add source to transactions for transaction_id.
        
        @parameters
        - tid (String): id of the transaction to add source to
        - source (Output_Transactions): transactions for the source requesting
          the addition.
        - forks (optional Array of Strings): fork tags from transaction Object
        
        @returns
        - null: this source was already added
        
        - input_transaction (Input_Transaction): this source was just added to
          this input transaction
    */
    add: function( tid, source, forks ) {
      var that            = this
        , transaction     = that.get_from_tid( tid )
        , _t
        , forks_count
        , is_concurrent   = false
        , concurrent_tags
      ;
      
      if( transaction ) {
        // This transaction is already in progress at this input from at least
        // one source
        
        // Lookup transaction to find out if it already has this source
        if( transaction.get( source ) ) return null; // Source already recorded as started for this transaction
        
        // That source has not yet emited any value to this input for this
        // transaction, but this transaction is already in progress from
        // another source.
      } else {
        // This transaction has not been started yet at this input
        _t = {
          id  : tid,
          more: true
        };
        
        // Determine transaction concurrency and remove tag from last fork
        if( forks_count = forks && forks.length ) {
          // There are fork tags in this transaction
          _t.forks = forks;
          
          // If found in last fork tag, remove input tag from forks
          that.remove_fork_tag_if_last( _t, forks, forks_count );
          
          // ToDo: add tests using concurrent_tags
          concurrent_tags = that.options.concurrent;
          
          // If concurrent_tags is defined, the transaction is concurrent ONLY if a fork tag is found in concurrent_tags
          is_concurrent = ! concurrent_tags;
          
          if( concurrent_tags = that.options.concurrent )
            while( forks_count )
              if( concurrent_tags[ forks[ --forks_count ] ] ) {
                is_concurrent = true;
                
                break;
              }
        }
        
        transaction = Super.add.call( that,
          new Input_Transaction( that, _t, is_concurrent, is_concurrent ? that.branches : 1 )
        );
      }
      
      // Memorize this new source for this transaction
      return transaction.add( source );
    }, // Input_Transactions..add()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..remove( tid, source )
        
        @manual internal
        
        @short Removes a source from a transaction.
        
        @parameters
        - tid (String): id of the transaction to remove source from
        - source (Output_Transactions): transactions for the source removed.
        
        @returns
        - null: this source was not found or there are no concurrent
          transactions at this input.
          
        - _t (Object): returned by method Input_Transaction..remove()
    */
    remove: function( tid, source ) {
      var transaction = this.get_from_tid( tid )
        , _t          = transaction && transaction.remove( source )
      ;
      
      if ( _t ) _t.more || Super.remove.call( this, transaction );
      
      return _t;
    }, // Input_Transactions..remove()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..terminate_transaction( transaction, _t )
        
        @manual internal
        
        @short Terminates transaction, emits empty @@add operation on Input
        
        @description
        Called by method Input_Transaction..add_branches() when it triggers
        the end of a transaction.
    */
    terminate_transaction: function( transaction, _t ) {
      Super.remove.call( this, transaction );
      
      this.input.add( [], { _t: _t } );
    }, // terminate_transaction()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..remove_source( output_transactions )
        
        @manual internal
        
        @short Removes a output_transactions from all input transactions, if any.
        
        @parameter output_transactions (Output_Transactions): transactions from
        removed output source.
        
        @returns Array of terminated transactions' objects (_t):
          - id (String): this transaction id
          - more (optional Boolean): true if more are expected from a source
          - forks (optional Array of String): remaining forks for downstream
        
        Called by:
        - Method Input.._transactions_remove_source() itself
        - Method Input..remove_source() when two pipelets are disconnected.
        
        Calling method Output_Transactions..remove_destination()
        
        @manual internal
    */
    remove_source: function( input, output_transactions ) {
      // ToDo: add tests for Input_Transactions..remove_source()
      var that = this
        , tid
        , input_transaction
        , _t
        , out = []
      ;
      
      for ( tid in that.transactions ) {
        input_transaction = that.get_from_tid( tid );
        
        if ( input_transaction && input_transaction.get( output_transactions ) ) {
          // This transaction is ongoing between this and output_transactions
          // ToDo: but is it ongoing for this input?
          _t = output_transactions.remove_destination( output_transactions.get_from_tid( tid ), input );
          
          _t && _t.more || out.push( _t );
        }
      }
      
      return out;
    } // Input_Transactions..remove_source()
  } } ); // Input_Transactions instance attributes
  
  /* --------------------------------------------------------------------------
      @class Input_Transaction( destination, _t, concurrent, branches )
      
      @manual internal
      
      @short Handles output transactions
      
      @parameters
      - destination (@@class:Input_Transactions\)
      - _t (Object): transaction object creating the transaction:
        - id (String): transaction identifier
        - more (Boolean): default is false
        - forks (Array): optional fork tags
      - concurrent (Boolean): true if transaction is concurrent
      - branches (Number): number of branches from which a termination
        event is expected. It should be one if not concurrent. If concurrent
        is true, it must be equal to the number of concurrent branches.
        It can be updated during the life of the transaction by calling
        method Input_Transaction..add_branches().
      
      @description
      See also base class IO_Transaction()
  */
  function Input_Transaction( destination, _t, concurrent, branches ) {
    var that = this;
    
    IO_Transaction.call( that, destination, _t.id );
    
    that._t = _t;
    
    that.concurrent = concurrent;
    
    that.branches = concurrent ? destination.branches : 1; // ToDo: fix encapsulation, maybe adding a branches parameter
    
    // Total number of sources that have terminated this transaction
    that.terminated_count = 0;
  } // Input_Transaction()
  
  IO_Transaction.subclass( 'Input_Transaction', Input_Transaction, function( Super ) {
    return {
      /* ------------------------------------------------------------------------
          @method Input_Transaction..add_branches( branches )
          
          @manual internal
          
          @short Adds or removes branches to transaction, if concurrent
          
          @parameters
          - branches (Number):
            - \\> 0: add branches
            - < 0: remove branches
          
          @description
          If transaction is concurrent and terminated count is superior to
          the updated number of branches, terminate this input transaction,
          calling:
          - Method Output_Transactions..terminate_transaction() on all
            its counterparts.
          
          - Method Input_Transactions..terminate_transaction()
      */
      add_branches: function( branches ) {
        var that = this;
        
        if( that.concurrent ) {
          // ToDo: add tests: adding and removing branches in the middle of a concurrent transaction
          that.branches += branches;
          
          if( that.terminated_count >= that.branches ) {
            var _t        = extend_2( {}, that._t )
              , tid       = _t.id
              , container = that.container
            ;
            
            delete _t.more;
            
            log( get_name( 'add_branches()' ) + 'terminating transaction' );
            
            that
              .map( function( output_transactions ) {
                Super.remove.call( that, output_transactions );
                
                output_transactions.terminate_transaction( container, tid )
              } )
            ;
            
            container.terminate_transaction( this, _t );
          }
        }
      }, // add_branches()
      
      // ToDo: implement add() to assert early count with concurrent, allows to know which source attempted the add
      
      /* ------------------------------------------------------------------------
          @method Input_Transaction..remove( source )
          
          @manual internal
          
          @short Removes source from a input transaction.
          
          @parameters
          - source (Output_Transactions): transactions for the source removed.
          
          @returns
          - null: this source was not found or there are no concurrent
            transactions a this input.
            
          - _t (Object):
            - id (String): this transaction id
            - more (optional Boolean): true if more are expected from a source
            - forks (optional Array of String): remaining forks for downstream
      */
      remove: function( source ) {
        var that           = this
          , _t
          , not_concurrent
        ;
        
        ++that.terminated_count; // One more has terminated
        
        de&&ug( get_name( that, 'remove' ), { terminated_count: that.terminated_count } );
        
        if( that.get( source ) ) {
          Super.remove.call( that, source );
          
          _t = that._t;
          not_concurrent = ! that.concurrent;
          
          if( that.count ) {
            not_concurrent && error( [
              '\n  Waiting for more outputs to terminate on untagged or not concurrent transaction.' +
              '\n' +
              '\n  This may cause unterminated transactions, interruption of dataflows, or worse.' +
              '\n' +
              '\n  To fix this issue:' +
              '\n    - If this is due to an untagged concurrent graph:' +
              '\n      - Add a fork tag at the start of the concurrent graph,' +
              '\n      - and add the same tag at this input: ' + get_input_name() +
              '\n' +
              '\n    - If this is due to a tagged transaction not concurrent at this point:' +
              '\n      - add the concurrent tag in concurrent options of this pipelet' +
              '\n' +
              '\n    - If this is from a dispatch loop connecting "internal" pipelines, either:' +
              '\n      - Rename transactions at some upstream outputs using pipelet option _t_postfix' +
              '\n      - Remove one or more pipelines from the loop'
            ] );
          } else {
            // This was the last one for this transaction from the source
            
            // Are there more sources expected to terminate?
            if( not_concurrent || that.terminated_count >= that.branches ) {
              // All expected sources have terminated this transaction
              
              _t.more ||
                error( 'Already terminated transaction terminates a second time' )
              ;
              
              delete _t.more;
            } // else {
              // There are more outputs emiting operations for this transaction
              // Do not end this transaction at the source output
          }
          
          return _t;
        }
        
        return null;
        
        function error( message ) {
          that.error( 'remove', source, message )
        }
        
        function get_input_name() {
          var transactions = that.transactions
            , container    = that.container
            , input        = container.input.pipelet
          ;
          
          return input._get_name ? input._get_name() : container.input._get_name();
        } // get_input_name()
      } // Input_Transaction..remove()
    };
  } ); // Input_Transaction
  
  /* --------------------------------------------------------------------------
      @class Output_Transaction( source, tid )
      
      @manual internal
      
      @short Handles input transactions
      
      @parameters
      - source (@@class:Input_Transactions\)
      - tid (String): transaction identifier
      
      @description
      See also base class IO_Transaction()
  */
  function Output_Transaction( source, tid ) {
    IO_Transaction.call( this, source, tid );
  }
  
  IO_Transaction.subclass( 'Output_Transaction', Output_Transaction, {
    /* ------------------------------------------------------------------------
        @method Output_Transaction..add_destination( input, forks )
        
        @manual internal
        
        @short Adds input with optional forks to transaction
        
        @parameters
        - input (@@class:Input\)
        - forks (Array): optional forks from transaction object
        
        @returns this
    */
    add_destination: function( input, forks ) {
      var that               = this
        , input_transactions = input.transactions
      ;
      
      // Graph loops, resulting in reentrance of transaction functions are taken care
      // of by testing if the source is already added in a source transaction
      // This also takes care of concurrent graph issues in the graph, allowing the same transaction
      // to have multiple sources.
      
      /*
        ToDo: add_destination(): two or more inputs can share the same Input_Transactions instance with both inputs forked from the same output
        This may happen for a self-join, e.g. friends-of-firends, mutual friends, mutual followed, ..
        
        The example bellow illustrate a case that may have triggered this
        issue but does not because join() is implemented with its union not
        directly connected to its inputs.
        
          firends = friends
            .pass_through( { fork_tag: 'friends' } )
          ;
          
          firends_of_friends = friends
          
            // Immediately join forked friends which may have triggered this issue
            .join( friends, [ [ 'friend_id', 'id' ] ],
              function( user, friend ) {
                return {
                  id: user.id,
                  friend_of_friend_id: friend.friend_id
                }
              },
              
              { key: [ 'id', 'friend_of_friend_id' ], concurrent: { friends: true } }
            )
            
            .unique( { tag : 'firends' } )
          ;
        
        This in turn shows a simple workaround to the problem, by adding
        any pipelet, such as a pass_through() to one of the inputs.
        
        This can be taken care of by Pipelet._add_input() with a warning and/or
        adding a pass_through() if the added output is the same as the source
        output.
        
        However Pipelet._add_input() may not always know the main source
        when adding an input, so the warning would have to be implemented
        in Input.add_source() in conjunction with some mechanism to know
        that an input transaction is shared between two inputs from the
        same output.
        
        The warning or an error could be issued in Output_Transactions..get_options().
        
        Finally we could add input instead of input_transactions to this
        output transaction
      */
      that.get( input ) // already ongoing
        || input_transactions.add( that.tid, that.container, forks )
        // Input transaction added
        && that.add( input )
      ;
      
      return that;
    }, // Output_Transaction..add_destination()
    
    /* ------------------------------------------------------------------------
        @method Output_Transaction..remove_destination( input )
        
        @manual internal
        
        @short Removes destination input, as sender terminates transaction
        
        @parameters:
        - input (@@class:Input\)
        
        @returns
        - null: this source was not found or there are no concurrent
          transactions at this input.
        
        - (Object): transaction object
          - id (String): transaction identifier
          - more (Boolean):
            - true: the transaction is awaiting termination from another output
            - false or undefined: the transaction is fully terminated
        
        @description:
        Returned value from method Input_Transactions..remove()
    */
    // @returns from Input_Transaction..remove(): null or _t
    remove_destination: function( input ) {
      // ToDo: remove_destination(): multiple inputs can share the same input_transactions object, although this is unlikely to happen in practice
      
      var that               = this
        , input_transactions = input.transactions
      ;
      
      de&&ug( get_name( that, 'remove_destination' ) + ', input_transactions:', get_name( input_transactions ) );
      
      var _t = input_transactions.remove( that.tid, that.container ); // ToDo: fix encapsulation for that.container
      
      _t && that.remove( input );
      
      // ToDo: verify that _t holds fork tags and other all other attributes of the transaction
      return _t;
    }, // Output_Transaction..remove_destination()
    
    /* ------------------------------------------------------------------------
        @method Output_Transaction..terminate()
        
        @manual internal
        
        @short Terminate this transaction and return terminated input transactions.
        
        @returns
        - (Array of Objects): terminated destinations with transaction objects.
          Each object has attributes:
          - _t (Object): transaction object to terminate this transaction
          - input (Input): target input waiting for an end-of-transaction event
        
        @description
        ToDo: add tests for terminate()
    */
    terminate: function() {
      var that              = this
        , terminated_inputs = []
      ;
      
      // Terminate this transaction for all destination inputs except those which need more
      return that.map( function( input ) {
        // ToDo: For a given input.transactions, terminate at most one input
        
        var _t = that.remove_destination( input );
        
        //de&&ug( get_name( that, 'terminate' ) + 'input:', input );
        
        return _t.more
          ? null // more expected, this input does not terminate
          : { _t: _t, input: input }
        ;
      } ) // for all destination inputs for which this transaction was started
    } // Output_Transaction..terminate()
  } ); // Output_Transaction instance attributes
  
  /* --------------------------------------------------------------------------
      @class Output_Transactions( name )
      
      @manual internal
      
      @short Handle output transactions for a class Output instance
  */
  function Output_Transactions( name ) {
    IO_Transactions.call( this, name );
  } // Output_Transactions
  
  IO_Transactions.subclass( 'Output_Transactions', Output_Transactions, {
    /* ------------------------------------------------------------------------
        @method Output_Transactions..get_options( input, options )
        
        @manual internal
        
        @short Get sender options sending to input with options
        
        @parameters
        - input (Input): destination for which options need to be calculated,
          and containing a transactions Input_Transactions object.
        
        - options (Object): optional, output options before taking into
          account destination inputs and possible concurrent transactions
          on concurrent inputs
        
        @returns
        - options (Object): output options 'with' more possibly added to
          transaction Object
          
        @description
        Get output options for a destination input_transactions object from
        options, with 'more' possibly added to transaction Object if there are
        other concurrent source outputs that have not terminated the same
        transaction at that input, or if there are more data events expected.
        
        This is used when there are concurrent pipelets in the graph that handle
        operations concurrently, allowing the synchronization of concurrent
        operations.
        

        ToDo: rename concurrent_options()
        ToDo: manipulate transaction objects instead of options
    */
    get_options: function( input, options ) {
      var that               = this
        , input_transactions = input.transactions
        , _t
        , tid
        , forks
        , output_transaction
        , new_t
        , cloned
      ;
      
      if ( options && ( _t = options._t ) && ( tid = _t.id ) ) {
        forks = _t.forks;
        
        output_transaction = that.get_from_tid( tid );
        
        if ( _t.more || forks ) {
          de&&ug( get_name( that, 'get_options' ) + 'add destination' );
          
          // Create a transaction if necessary
          output_transaction || ( output_transaction = that.get_transaction( tid ) );
          
          // Add destination input if not already added
          output_transaction.add_destination( input, forks );
        }
        
        if( forks ) {
          new_t = input_transactions.remove_fork_tag_if_last( _t, forks, forks.length, true /* copy-on-write */ );
          
          if( new_t ) {
            options    = extend_2( {}, options );
            options._t = _t = new_t;
            cloned     = true;
          }
        }
        
        if ( ! _t.more && output_transaction && output_transaction.get( input_transactions ) ) {
          // This is the end of this transaction at this branch
          // But this transaction may have several branches
          // We need to know if this is the last branch closing this transaction
          var t = that.remove_destination( output_transaction, input );
          
          if ( t && t.more ) {
            // There are more branches which haven't closed this transaction
            
            // Make a deep copy of options, if not cloned yet, then add more to transaction Object
            cloned || clone_options()
            
            _t.more = true; // Don't close this transaction just yet
          }
        }
      }
      
      return options;
      
      function clone_options() {
        options = extend_2( {}, options );
        
        _t = options._t = extend_2( {}, _t );
      } // clone_options()
    }, // Output_Transactions..get_options()
    
    /* ------------------------------------------------------------------------
        @method Output_Transactions..get_transaction: function( tid )
        
        @manual internal
        
        @short Get or create an output transaction for transaction_id
        
        @parameters
        - tid: unique transaction identifier
        
        @returns
        - transaction (Output_Transaction): managing input transactions
    */
    get_transaction: function( tid ) {
      var that = this;
      
      return that.get_from_tid( tid ) || that.add( new Output_Transaction( that, tid ) );
    }, // Output_Transactions..get_transaction()
    
    /* ------------------------------------------------------------------------
        @method Output_Transactions..terminate( transaction_object )
        
        @manual internal
        
        @short Terminates all input transactions of from @@transaction object
        
        @parameters
        _t (transaction Object)
        
        @returns
        - (Array of Objects): returned by Output_Transaction..terminate()
        
        @description
        If _t indicates the end of a transaction for which an output
        transaction exists, terminate this transaction and return terminated
        input transactions with termination transaction object.
        
        ToDo: add more tests for terminate()
    */
    terminate: function( _t ) {
      var that        = this
        , transaction = ! _t.more && that.get_from_tid( _t.id )
      ;
      
      return transaction
        ? that
            .remove( transaction )
            .terminate()
        : []
      ;
    }, // Output_Transactions..terminate()
    
    /* ------------------------------------------------------------------------
        @method Output_Transactions..terminate_transaction( input_transactions, tid )
        
        @manual internal
        
        @short Terminates because input transaction terminated
        
        @description
        Called by method Input_Transaction..add_branches() when it triggers
        the end of a transaction.
    */
    terminate_transaction: function( input_transactions, tid ) {
      var output_transaction = this.get_from_tid( tid );
      
      output_transaction
        .remove( input_transactions )
        .is_empty()
        
        && this.remove( output_transaction )
      ;
    }, // Output_Transactions..terminate_transaction()
    
    /* ------------------------------------------------------------------------
        @method Output_Transactions..remove_destination( output_transaction, input )
        
        @manual internal
        
        @short Removes input from output_transaction
        
        @parameters:
        - **output_transaction** (@@class:Output_Transaction\)
        - **input** (@@class:Input\)
        
        @returns
        (Object): from Input_Transaction..remove(), null or _t with
        attributes:
          - **id** (String)
          - **more** (Boolean):
            - ```true```: this transaction is not terminated at this input
            - ```false```: this transaction is complete for this input
          - **forks** (Array of Strings)
        
        @description
        If output_transaction then becomes empty, remove it from this
        transactions.
        
        Calling Output_Transaction ..remove_destination()
        Calling Input_Transactions ..remove()
        Calling Input_Transaction  ..remove()
    */
    remove_destination: function( output_transaction, input ) {
      var that = this
        , _t
      ;
      
      if ( output_transaction ) {
        de&&ug( get_name( that, 'remove_destination' ) + 'tid: %s, input: %s', output_transaction.id, get_name( input ) );
        
        _t = output_transaction.remove_destination( input );
        
        // ToDo: Add test for non-empty output_transaction
        output_transaction.is_empty() && that.remove( output_transaction );
      }
      
      return _t;
    } // Output_Transactions..remove_destination()
  } ); // Output_Transactions
  
  /* --------------------------------------------------------------------------
      @class Options()
      
      @short Operations' options Objects methods
      
      @description
      Because options are optional parameters these can be undefined,
      therefore Options methods are defined in Options as class methods that
      which first parameter is an optional options Object.
  */
  
  /* --------------------------------------------------------------------------
      @class_method Options.forward( options )
      
      @short Get need to be forwarded options from @@operation
      
      @manual programmer
      
      @parameters:
      - options (Object): optional operation options Object
      
      @returns
      (Object): options with attributes:
      - _t (optional Object): transaction Object shallow copied from options,
      if present:
        - more (Boolean): optional, true if more is expected in transaction
        - id (String): transaction identifier
        - other transaction parameters if any
      
      @description
      At this time the only options that must always be forwarded is the
      transaction Object _t.
      
      In the future more options might have to be always forwarded, this
      function will take care of these therefore insuring forward
      compatibility.
      
      At this time Options.forward() always returns an object even if there
      are no source options, this is likely to change in the future and
      therefore one should not rely on this for new code.
      
      Exceptions:
      - If more is truly, a transaction id should also be present, otherwise
      an Error is thrown.
  */
  function options_forward( options ) {
    // ToDo: do not initialize o to {}, allowing to return undefined
    var t, _t, p, more, tid, o = {}, count = 0, ___;
    
    if ( options ) {
      t = options._t;
      
      if ( t ) {
        _t = {};
        
        for ( p in t ) {
          _t[ p ] = t[ p ];
          
          count += 1;
        }
        
        tid = _t.id;
        
        if ( more = _t.more ) {
          _t.more = true;
          
          if( ! tid )
            throw new Error( 'options_forward(), more == true with missing transaction id' );
        
        } else if ( more != ___ )  {
          delete _t.more;
          
          count -= 1; // removed one property
        }
        
        // Add _t to o only if there is has at least one property
        if ( count ) o._t = _t;
      }
    }
    
    return o;
  } // options_forward()
  
  /* --------------------------------------------------------------------------
      @class_method Options.has_more( options )
      
      @short Tells if more @@[operations]operation are expected in this transaction
      
      @returns
      - (truly): there is an incomplete transaction.
      - (falsy): this is the end of the transaction.
  */
  function options_has_more( options ) {
    var t;
    
    return options
      && ( t = options._t )
      && t.more
    ;
  } // options_has_more()
  
  /* --------------------------------------------------------------------------
      @class_method Options.no_more( options )
      
      @short Options for terminating a transaction if not already terminated
      
      @returns
      - (undefined): options was not defined or already had a terminated
        transaction
      - (Object): cloned options for terminating the transaction
  */
  // ToDo: add Options.no_more()
  function options_no_more( options ) {
    var _t;
    
    if( options && ( _t = options._t ) && _t.more ) {
      // delete _t.more after cloning options
      options = extend_2( {}, options );
      options._t = _t = extend_2( {}, _t );
      
      delete _t.more;
      
      return options;
    }
  } // options_no_more()
  
  /* --------------------------------------------------------------------------
      @class_method Options.last_fork_tag( t )
      
      @short Get last fork tag in transaction object, if any
      
      @returns
      - (falsy): there is no transaction, or fork tags
      - (String): last fork tag
  */
  function options_last_fork_tag( t ) {
    var forks, l;
    
    return t
      && ( forks = t.forks      )
      && ( l     = forks.length )
      && forks[ l - 1 ]
    ;
  } // options_last_fork_tag()
  
  /* --------------------------------------------------------------------------
      @class_method Options.add_fork_tag( options, fork_tag )
      
      @short Enforce presence of ```fork_tag``` in ```options```
      
      @manual programmer
      
      @parameters:
      - options (Object): @@operation options object, may be null or undefined
      - fork_tag (String): required fork tag
      
      @returns
      Options with fork tag added in transaction if it is not there yet.
  */
  function options_add_fork_tag( options, fork_tag ) {
    var t = options && options._t;
    
    if ( ! t || options_last_fork_tag( t ) !== fork_tag ) {
      // ToDo: optimize adding fork tag to transaction, once fully tested
      
      // Create a transaction with a single operation and fork_tag
      t = new Transaction( 1, options, null, fork_tag ); // ToDo: end transaction immediately
      
      // Get options for this single operation
      options = t.next_options();
      
      // Then end this transaction
      t.end();
    }
    
    return options;      
  } // options_add_fork_tag()
  
  /* --------------------------------------------------------------------------
      @class_method Options.enforce_tag_on_many( values, options, tag, transactions_options )
      
      @short Enforce presence of a @@tag on many values or operations
      
      @manual programmer
      
      @parameters:
      - values (Array of Objects): values added or removed in operation
      - options (Object): @@operation options object, may be null or undefined
      - tag (String): added tag if a tag is required and none is present in
        options
      - transactions_options (Object): hash of transaction objects managed by
        this method to keep track of transactions between invocations at
        this pipelet.
      
      @returns
      (Object): Options with fork tag added in transaction if it is not there yet.
  */
  function enforce_tag_on_many( values, options, tag, transactions_options ) {
    var t                   = options && options._t
      , count               = values.length
      , tid
      , more
      , transaction_options
    ;
    
    if( t ) {
      tid                 = t.id;
      more                = t.more;
      transaction_options = transactions_options[ tid ];
    }
    
    // Add fork_tag if synchronization is required and no tag is present
    if( transaction_options ) {
      // This transaction is already tagged
      
      options = transaction_options;
      t       = options._t;
      tid     = t.id;
      
      if( ! more ) {
        delete transactions_options[ tid ];
        
        if( t.more ) {
          options = extend_2( {}, options );
          
          delete options._t.more;
        }
      }
      
    } else if( count > 1 || more && count ) {
      // requires synchronization, hence requires a tagged transaction
      
      if( ! t || ! options_last_fork_tag( t ) ) {
        // There are is no fork tag yet, add one
        options = options_add_fork_tag( options, tag );
        tid     = options._t.id;
      }
      
      if( more ) transactions_options[ tid ] = options;
      
    }
    
    return options;
  } // enforce_tag_on_many()
  
  Transactions.Options = {
    forward            : options_forward,
    has_more           : options_has_more,
    no_more            : options_no_more,
    last_fork_tag      : options_last_fork_tag,
    add_fork_tag       : options_add_fork_tag,
    enforce_tag_on_many: enforce_tag_on_many
  }; // Options methods
  
  Transactions.Transaction         = Transaction;
  
  Transactions.IO_Transactions     = IO_Transactions;
  Transactions.Input_Transactions  = Input_Transactions;
  Transactions.Output_Transactions = Output_Transactions;
  
  Transactions.IO_Transaction      = IO_Transaction;
  Transactions.Input_Transaction   = Input_Transaction;
  Transactions.Output_Transaction  = Output_Transaction;
  
  RS.add_exports( {
    'Transactions': Transactions
  } );
  
  de&&ug( 'module loaded' );
  
  return Transactions;
} ); // transactions.js
