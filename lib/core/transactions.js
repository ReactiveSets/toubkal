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
    , push          = Array.prototype.push
    , de            = false
    , ug            = log
    , get_name      = Loggable.get_name
  ;
  
/* --------------------------------------------------------------------------
    @term transaction
    
    @short One or more @@[operations]operation grouped by a transaction identifier
    
    @description
    
    ### Diamond-graph issue
    ```
    Fork                Union
         -- branch 1 --
    -- | -- branch 2 -- | --
         -- branch 3 --
    ```
    
    If a transaction happens over two or more branches that later re-union
    (a diamond) and if the execution of one of the branches starts and
    ends the transaction before another branch had a chance to start the
    transaction at the union, the same transaction id will start and stop
    twice (or more) at the union.
    
    This would be an issue if the atomicity of the whole transaction must
    be preserved at or downstream of the union.
    
    In this case, the solution would be to delay from the original
    source the ending of the transaction long enough to allow all
    branches to be seen at the union.
    
    Because the knowledge of such diamands in the graph is at an above
    level, a pipelet typically has no way of knowing in advance if such a
    situation may occur and therefore the issue can only be dealt at
    the architect level.
    
    Using a union that recombines transactions waiting for all branches
    to terminate transactions before terminating transactions downstream,
    i.e. the end of transaction condition would only be forwarded once
    the transaction would have been started and terminated from all
    upstream branches.
    
    To allow other independent transactions to be created within each
    branch and so that the union does not wait for other branches to
    terminate these independent transactions, a fork tag is added before
    the diamond to all transactions entering the diamond at a fork:
      options: {
        _t: { // the transaction object
          id: '...'
          more: true
          forks: [ 'map 1' ]
        }
      }
    
    When there are multiple diamonds nested in a graph, multiple fork
    tags are pushed to the forks Array, then removed by recombining
    unions.
    
    @examples
    - a diamond with 3 branches tagged 'map'
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
      
      All pipelets in all branches must forward tagged transactions even
      if they have nothing to forward. This could be the most error-prone
      part since this relies on each pipelet to always forward
      transactions having fork tags.
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
      - name (String): debugging @@class:Loggable() name
      
      @description
      
  */
  function Transactions( name ) {
    // ToDo: pipelet.js: provide name
    Loggable.call( this, name );
    
    this.transactions = Dictionary();
  }
  
  Loggable.subclass( 'Transactions', Transactions, {
    /* ------------------------------------------------------------------------
        @method Transactions..get( tid )
        
        @short Get class Transaction() instance from tid
        
        @description
        Returns ```undefined``` if not found in ```this.transactions```
    */
    get: function( tid ) {
      return this.transactions[ tid ];
    },
    
    /* ------------------------------------------------------------------------
        @method Transactions..get_tids()
        
        @short Get tids for all ongoing transactions
    */
    get_tids: function() {
      return Object.keys( this.transactions );
    },
    
    /* ------------------------------------------------------------------------
        @method Transactions..toJSON()
        
        @short Provides a representation suitable for JSON.stringify()
        
        @returns acyclic representation of all ongoing transactions.
    */
    toJSON: function() {
      return this.get_tids();
    },
    
    /* ------------------------------------------------------------------------
        @method Transactions..get_transaction( count, options, output, fork )
        
        @short Get or create a transaction for count (additional) operations.
        
        @returns a Transaction instance.
        
        @parameters:
        - count (Integer): number of (additional) operations this transaction
          is expected to emit
        
        - options (Optional object): from upstream operation, used to nest
          transactions with upstream transactions
        
        - output (optional Output): to emit operations to.
          If no output is provided, the returned transaction will emit events
          as an Event_Emitter.
        
        - fork (optional String): fork name.
        
        @description
        
        ### See Also
        - Class Transaction()
    */
    get_transaction: function( count, options, output, fork ) {
      var t, tid, more, _t
        , transactions = this.transactions
        , name = de && 'get_transaction()'
      ;
      
      if ( options ) {
        // if ( t = options.__t ) {
          // Nested transaction within this process
          
          // ToDo: this is not currently used, but should allow to reuse transaction Objects, fix or remove
          // There is another, probably better, way to do this, using a global dictionary of all transactions
          // in a process
          // return t.add_operations( count ).set_source_options( options );
        //}
        
        if ( t = options._t ) {
          // This is a transaction object
          tid = t.id;
          more = t.more;
        }
        
        if ( tid ) {
          // There is an upstream transaction
          
          if ( _t = transactions[ tid ] ) {
            // nested transaction from upstream for which we have already a local transaction
            de&&ug( name, 'nested transaction, tid:', tid );
            
            return _t
              .add_operations( count )
              .set_source_options( options )
            ;
          }
          
          if ( more || count > 1 || t.forks ) {
            
            // There is more comming from upstream
            // or there are more than one operation for this output
            // or there are forks in the upstream transactions that need to be forwarded
            
            // Create and store a new transaction with this upstream tid
            de&&ug( name, 'create and store a new transaction with upstream tid:', tid );
            
            return transactions[ tid ]
              = new Transaction( count, options, output, fork )
              .on( 'ended', on_transaction_ended )
            ;
          }
        }
      }
      
      // Nothing more expected from upstream, or count <= 1 and no fork
      // There is no need to memorize this transaction in transactions
      de&&ug( name, 'Nothing more expected from upstream, or count <= 1 and no fork, count:', count );
      
      return new Transaction( count, options, output, fork )
        .on( 'tid', record_tid )
      ;
      
      // Record transaction id and transaction in transactions if tid is generated
      function record_tid( tid ) {
        de&&ug( 'Transactions()', { message: 'new transaction', tid: tid } );
        
        // ToDo: Following code commented-out, because it fails filter() tests, we need to understand why
        //transactions[ tid ] = this;
        
        //this.on( 'ended', on_transaction_ended );
      }
      
      // Remove tid from transactions when transaction has ended
      function on_transaction_ended() {
        de&&ug( 'Transactions()', { message: 'transaction ended, delete transaction', tid: tid } );
        
        delete transactions[ tid ];
      }
    }, // get_transaction()
    
    /* ------------------------------------------------------------------------
        @method Transactions..end_transaction( transaction )
        
        @short Ends a transaction if it is closed
        
        @description
        - ToDo: this should be a method of Transaction, not Transactions
    */
    end_transaction: function( t ) {
      t.is_closed() || t.end();
      
      return this;
    } // end_transaction()
  } ); // Transactions instance methods
  
  /* -------------------------------------------------------------------------------------------
      @class Transaction( count, options, output, fork )
      
      @short Creates a transaction.
      
      @parameters:
      - count (Integer): the number of operations expected, which is the number of time one
        must call the next() instance method.
      
      - options (optional Object): upstream optional attributes:
      
        ToDo: Transaction() should only receive _t as a parameter, should not need all options that should be managed by caller.
        
        - _t (Object): a transaction Object:
          - more (optional Boolean): true if more data is expected from upstream within this
            transaction, i.e. the upstream transaction is not complete.
            false or undefined: this is the last event from upstream for this transaction
            
          - id: (String): a unique identifier (uuid_v4) for this transaction
          
          - forks (optional Array of Strings): Array of upstream fork tags to always forward
            to downstream pipelets, allowing branches synchronization at inputs tagged with
            one of this fork tags.
        
      - output (optional Output): output to emit operations to. When not provided, the
        transaction will emit events 'add' and 'remove' instead of emitting to an output,
        see Emitted Events bellow.
      
      - fork (optional String): fork tag.
      
      @description
      
      This is an @@class:Event_Emitter().
      
      ### Emited events
      
      - 'ended' : ():
        When the transaction have finished emitting everything and has ended
      
      - 'add'   : ( values, options ):
        When no output is provided and an 'add' is emitted
      
      - 'remove': ( values, options ):
        When no output is provided and a 'remove' is emitted
      
      - 'update': ( updates, options ):
        When no output is provided and an 'update' is emitted
      
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
    that.o            = extend_2( { /*__t: that*/ }, o );
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
      return {
        number        : this.number,
        name          : this._get_name(),
        tid           : this.get_tid(),
        count         : this.count,
        source_more   : this.source_more,
        need_close    : this.need_close,
        closed        : this.is_closed(),
        added_length  : this.added.length,
        updated_length: this.updated.length,
        removed_length: this.removed.length
      };
    }, // Transaction..toJSON()
    
    add_operations: function( count ) {
      // count can be negative, is equivalent to -count emit_nothing()
      if ( ( this.count += count ) < 0 ) {
        this.next(); // will throw an exception because the resulting count is negative
      }
      
      de&&ug( this._get_name( 'add_operations' ), { adding_operations: count, new_total: this.count } );
      
      return this.ending ? this.end() : this;
    }, // Transaction..add_operations()
    
    set_source_options: function( options ) {
      var t = options && options._t;
      
      if ( t && ! t.more ) {
        // This is the end of an upstream transaction, it must be forwarded
        this.need_close = true;
      }
      
      this.source_more = ( t && t.more ) || false;
      
      // source options will be used for options if there is only one emitted operation
      this.source_options = options;
      
      de&&ug( this._get_name( 'set_source_options' ), { source_more: this.source_more } );
      
      return this.ending ? this.end() : this;
    }, // Transaction..set_source_options()
    
    // ToDo: implement _emit methods as Transaction subclass in pipelet.js
    _emit: function( operation, values, options ) {
      var output = this.output;
      
      if ( output ) {
        output.emit( operation, values, options );
      } else {
        this.emit_apply( operation, [ values, options ] );
      }
      
      return this;
    }, // _emit()
    
    __emit_add: function( values, emit_now ) {
      de&&ug( '__emit_add, values: ' + values.length + ( emit_now ? ', now' : ', later' ) );
      
      this.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          this._emit( 'add', values, this.get_emit_options() );
        } else {
          push.apply( this.added, values );
        }
      }
      
      return this.ending ? this.end() : this;
    }, // Transaction..__emit_add()
    
    __emit_remove: function( values, emit_now ) {
      de&&ug( '__emit_remove, values: ' + values.length + ( emit_now ? ', now' : ', later' ) );
      
      this.next();
      
      if ( values.length ) {
        if ( emit_now ) {
          this._emit( 'remove', values, this.get_emit_options() );
        } else {
          push.apply( this.removed, values );
        }
      }
      
      return this.ending ? this.end() : this;
    }, // Transaction..__emit_remove()
    
    // ToDo: add tests for Transaction..__emit_update()
    __emit_update: function( updates, emit_now ) {
      de&&ug( '__emit_update, updates: ' + updates.length + ( emit_now ? ', now' : ', later' ) );
      
      this.next();
      
      if ( updates.length ) {
        if ( emit_now ) {
          this._emit( 'update', updates, this.get_emit_options() );
        } else {
          push.apply( this.updated, updates );
        }
      }
      
      return this.ending ? this.end() : this;
    }, // Transaction..__emit_update()
    
    emit_nothing: function() {
      de&&ug( this._get_name( 'emit_nothing' ) );
      
      this.next();
      
      return this.ending ? this.end() : this;
    }, // Transaction..emit_nothing()
    
    // ToDo: redefine the use of get_options()
    get_options: function() {
      if ( this.closed ) {
        var error = new Error ( this._get_name( 'get_options' )
          + 'transaction already closed'
          + ', tid: ' + this.get_tid()
          + ', this pipeline probably has non-synchronized branches'
        );
        
        ug( '!Error:', error, error.stack )
      }
      
      var options = this.o
        , t = options._t
        , more = this.source_more || this.count > 0 || this.removed.length > 0 || this.updated.length > 0 || this.added.length > 0
      ;
      
      de&&ug( this._get_name( 'get_options' ), { more: more } );
      
      options.more = more; // ToDo: needs to be redefined with the role of get_options()
      
      return options;
    }, // Transaction..get_options()
    
    // Makes options for emitting an operation, should be called once and only once per operation emitted
    get_emit_options: function() {
      var more = this.get_options().more
        , options = this.emit_options
        , t = options && options._t
        , tid, fork = this.fork
        , that = this
        , trace = de && ug.bind( null, this._get_name( 'get_emit_options' ) )
      ;
      
      if ( this.need_close ) {
        // there was something emited before or there are upstream forks, transaction id is therfore set
        
        if ( ! more ) {
          // this is the last emit
          this.need_close = false;
          
          clone_options();
          
          delete t.more;
          
          this.closed = true; // this should be the last emit
        }
      } else {
        // there was nothing emited before, transaction id may be unset
        
        if ( more || fork ) {
          // there will be more after this or this is a fork, transaction id may be unset
          
          // Create options Object if it does not exist or clone existing options
          clone_options();
          
          // Create transaction object in options if it does not exist
          t || ( t = options._t = {} );
          
          // Create transaction id if it does not exist
          if ( ! t.id ) {
            tid = t.id = uuid_v4();
            
            trace && trace( 'new tid:', tid );
            
            this.emit_apply( 'tid', [ tid ] );
          }
          
          // Set more and memorize that this transaction will need to be closed
          // by issuing an operation with more undefined or false
          if ( more ) {
            t.more = this.need_close = true;
          } else {
            // there was nothing emited before, and this is the sole emit for this transaction
            this.closed = true;
          }
        } else {
          // there was nothing emited before, and this is the sole emit for this transaction
          this.closed = true; // this should be the only emit
          
          options = this.source_options;
          
          trace && trace( 'use source options:', options );
        }
      }
      
      return options;
      
      function clone_options() {
        that.emit_options = options = options ? extend_2( {}, options ) : {};
        
        t && ( t = options._t = extend_2( {}, t ) );
      }
    }, // Transaction..get_emit_options()
    
    next: function() {
      if ( --this.count >= 0 ) return this;
      
      this.count = 0;
      
      throw new Error( this._get_name( 'next' ) + ', exception: count was already zero' );
    }, // Transaction..next()
    
    /* ------------------------------------------------------------------------
        Transaction..end()
    */
    end: function() {
      var that        = this
        , count       = that.count
        , source_more = that.source_more
        , name        = de && that._get_name( 'end' )
      ;
      
      if ( count || source_more ) {
        de&&ug( name, 'not ending because'
          + ( count                ? ' count (' + count + ') > 0'         : '' )
          + ( count && source_more ? ' and'                               : '' )
          + (          source_more ? ' source_more (' + source_more + ')' : '' )
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
        , name    = de && that._get_name( 'flush' )
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
  
  /* -------------------------------------------------------------------------------------------
     -------------------------------------------------------------------------------------------
      
      Input / Output transactions classes
      
      Manage ongoing transactions between inputs and outputs.
      
      Enforce transactions' rules:
      - all transactions terminate once and only once.
      - transactions with fork tags (said concurent) are forwarded to all destinations at a fork
      - all branches of concurent transactions synchronize at tagged inputs
      - fork tags are removed at synchronization points
      
      Relationship between I/O and I/O transactions instances:
      
        upstream pipelet                       downstream pipelet
        
               |                                    |       |
               | many                               | many  |
               v                                    v       |
                            many            many            |
             output - - - - -               ----> input     |
                               \           /        |       |
               |                          /         ---------
               | one             \       /              | one (shared by all inputs of a pipelet)
               v                        /               v
                            many   \   /
       output_transactions <--------\ /        input_transactions
                                     x
               |                    / \                 |
               | many              /   \                | many
               v                  /     \               v
                                 /       \
       output_transaction  ------         ------ input_transaction
       
       Multiple inputs typically share a single input_transactions to allow synchronization
       of transactions at a downstream pipelet. We may eventually consider that there is
       only one input_transactions instance per pipelet for all inputs, allowing to implement
       synchronization automatically for all inputs, the main source input and additional
       inputs added using Pipelet.._add_input().
  */
  
  /* -------------------------------------------------------------------------------------------
      IO_Transactions( name )
      
      Base class for Input_Transactions and Output_Transactions.
      
      Manages a collection of IO_Transaction instances.
      
      @parameter name (String): Loggable name
  */
  var IO_Transactions_id = 1000; // start at 1000 to help debugging
  
  function IO_Transactions( name ) {
    this.id = ++IO_Transactions_id; // Locally unique identifier
    
    Loggable.call( this, name + '#' + this.id );
    
    this.count = 0;
    this.transactions = Dictionary();
  } // IO_Transactions()
  
  Loggable.subclass( 'IO_Transactions', IO_Transactions, {
    /* ------------------------------------------------------------------------
        toJSON()
        
        Returns object without circular references
    */
    toJSON: function() {
      return {
        'id'          : this.id,
        'name'        : this._get_name(), // Loggable
        'count'       : this.count,
        'transactions': this.transactions
      };
    },
    
    /* ------------------------------------------------------------------------
        get_from_tid( tid )
        
        Returns:
        - io_transaction if found at tid
        - undefined if not found in transactions
    */
    get_from_tid: function( tid ) {
      return this.transactions[ tid ];
    }, // IO_Transactions..get_from_tid()
    
    /* ------------------------------------------------------------------------
        has( io_transaction )
        
        Returns:
        - io_transaction if found at io_transaction.tid
        - undefined if not found in transactions
        
        Throws error if:
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
        add( io_transaction )
        
        Add io_transaction object using io_transaction.tid as a key.
        
        Returns io_transaction;
        
        Throws Error if tid key is aleady used or if io_transaction is null or
        undefined.
    */
    add: function( io_transaction ) {
      this.has( io_transaction ) && this.fatal( 'add', io_transaction, 'already added' );
      
      this.transactions[ io_transaction.tid ] = io_transaction;
      
      ++this.count;
      
      return io_transaction;
    }, // IO_Transactions..add()
    
    /* ------------------------------------------------------------------------
        remove( io_transaction )
        
        Removes io_transaction from tid key.
        
        Returns io_transaction.
        
        Throws Error if tid key does not hold any io_transaction or if it is not
        a matching io_transaction.
    */
    remove: function( io_transaction ) {
      this.has( io_transaction ) || this.fatal( 'remove', io_transaction, 'not found' );
      
      delete this.transactions[ io_transaction.tid ];
      
      --this.count;
      
      return io_transaction;
    }, // IO_Transactions..remove()
    
    /* ------------------------------------------------------------------------
        fatal( method_name, io_transaction, message )
        
        Throws an error on io_transaction with error message in method
        method_name.
    */
    fatal: function( method_name, io_transaction, message ) {
      throw new Error(
          this._get_name( method_name )
        + ( io_transaction ? ', tid:' + io_transaction.tid : '' )
        + ', ' + message
      );
    } // IO_Transactions..fatal()
  } ); // IO_Transactions
  
  /* -------------------------------------------------------------------------------------------
      IO_Transaction( container, tid, name )
      
      Manages transactions counterparts.
      
      @parameters:
      - container: reference to container IO_Transactions
      - tid (String): unique identifier of transaction
      - name (optional String): for Loggable, default is container._get_name()
  */
  function IO_Transaction( container, tid, name ) {
    Loggable.call( this, ( name || container._get_name() ) + '#' + tid );
    
    // Container of all transactions for this IO
    this.container = container;
    
    // Unique transaction identifier
    this.tid = tid;
    
    // number of transactions in this.transactions
    this.count = 0;
    
    // Counterpart's transactions by their id
    this.transactions = new Dictionary();
  } // IO_Transaction()
  
  Loggable.subclass( 'IO_Transaction', IO_Transaction, {
    /* ------------------------------------------------------------------------
        toJSON()
        
        Returns an object with no circular dependency
    */
    toJSON: function() {
      var that = this;
      
      return {
        'name'        : that._get_name(), // for Loggable
        'container'   : that.container._get_name(), // prevents circular dependency
        'tid'         : that.tid,
        'count'       : that.count,
        'transactions': that.transactions
      };
    }, // IO_Transaction..toJSON()
    
    /* ------------------------------------------------------------------------
        is_empty()
        
        Returns true if there are no transactions counterpart added to this.
    */
    is_empty: function() {
      return ! this.count;
    }, // IO_Transaction..is_empty()
    
    /* ------------------------------------------------------------------------
        get( io_transactions )
        
        Returns
        - undefined: if io_transactions was never added to this
        - io_transactions if io_transactions is already added in this.
        - null if io_transactions was added then removed from this.
        
        @parameters:
        - io_transactions (IO_Transactions or IO): to add to this.
    */
    get: function( io_transactions ) {
      return this.transactions[ io_transactions.id || io_transactions.transactions.id ];
    }, // IO_Transaction..get()
    
    /* ------------------------------------------------------------------------
        map( f )
        
        Maps f() to all ongoing io_transactions counterparts and returns Array
        of non-( null or undefined ) values returned by f().
        
        @parameters:
        - f( io_transactions ).
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
        add( io_transactions )
        
        Adds io_transactions counterpart to this transaction
        
        @parameters:
        - io_transactions (IO_Transactions or IO): to add to this.
        
        Throws an Error if io_transactions was already added, even if removed.
    */
    add: function( io_transactions ) {
      var that = this
        , these_transactions = that.transactions
        , id = io_transactions.id || io_transactions.transactions.id
        , t = these_transactions[ id ]
      ;
      
      if ( t          ) return error( 'Already added' );
      if ( t === null ) return error( 'Already terminated' );
      
      these_transactions[ id ] = io_transactions;
      
      that.count += 1;
      
      de&&ug( that._get_name( 'add' ), { id: id, count: that.count } );
      
      return that;
      
      function error( message ) {
        that.error( 'add', io_transactions, message );
      }
    }, // IO_Transaction..add()
    
    /* ------------------------------------------------------------------------
        remove( io_transactions )
        
        Removes io_transactions counterpart from this transaction
        
        @parameters:
        - io_transactions (IO_Transactions): to remove from this.
        
        Throws an Error if io_transactions was already removed or was never
        added to this, or does not match io_transactions.
    */
    remove: function( io_transactions ) {
      var that = this
        , these_transactions = that.transactions
        , id = io_transactions.id || io_transactions.transactions.id
        , t = these_transactions[ id ]
      ;
      
      // Assertions
      if ( t === null            ) return error( 'Already terminated' );
      if ( !t                    ) return error( 'Not found' );
      if ( t !== io_transactions ) return error( 'Does not match io_transactions' );
      
      these_transactions[ id ] = null;
      
      that.count -= 1;
      
      de&&ug( that._get_name( 'remove' ), { id: id, count: that.count } );
      
      return that;
      
      function error( message ) {
        that.error( 'remove', io_transactions, message );
      }
    }, // IO_Transaction..remove()
    
    error: function( method, other, message ) {
      if ( typeof message == 'string' ) message = [ '\n  ' + message ];
      
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
      ;
      
      message.unshift( '!Error - ' + get_name( that, method ) + 'message:\n' );
      
      message = message.concat( [
        '\n\n  Context:' +
        '\n    - This ' + type + ':', [ get_name( that ) ],
        '\n    - Other ' + other_type + ':', [ get_name( other ) ],
        '\n    - Ongoing ' + other_type + 's:',
          Object.keys( transactions )
            .map   ( function( _ ) { return transactions[ _ ] && get_name( transactions[ _ ] ) } )
            .filter( Boolean )
        ,
        
        '\n    - Transaction ' + ( _t ? 'object:' : 'identifier:' ), _t || tid
      ] );
      
      if ( branches ) message.push(
        '\n    - Upstream branches:', branches
      );
      
      message.push(
        '\n    - ' + type + ':', that
      );
      
      // ToDo: send warning to global log dataflow
      log.apply( null, message );
      
      function get_name( io, method ) {
        var container     = io.container || io
          , input         = container.input
          , input_pipelet = input && input.pipelet
        ;
        
        return input
          ? ( input_pipelet._get_name ? input_pipelet._get_name( method ) : input._get_name( method ) )
          : container._get_name( method )
        ;
      } // get_name()
    } // IO_Transaction..error()
  } ); // IO_Transaction
  
  /* --------------------------------------------------------------------------
      @class Input_Transactions( name, input )
      
      @short Manages input transactions for an input container
      
      @parameters
      - name (String): Loggable name
      - input (Object): reference to this Input_Transaction container
     
      @description
      Guaranties that transactions executed concurrently over multiple
      pipelets terminate once and only once.
  */
  function Input_Transactions( name, input ) {
    var that = this;
    
    IO_Transactions.call( that, name );
    
    that.input = input;
    
    that.set_tag();
    
    that.branches = 0;
  } // Input_Transactions()
  
  IO_Transactions.subclass( 'Input_Transactions', Input_Transactions, function( Super ) { return {
    /* ------------------------------------------------------------------------
        @method Input_Transactions..set_tag( tag )
        
        @short Sets transaction tag to remove from an upstream fork tag.
        
        @parameters
        - tag (optional String): transaction tag from an upstream fork tag
          dispatching operations over a number of concurrent pipelets. If there
          is no tag, no concurrent transaction joins at this input
        
        @description
        
        ### See Also
        - Method Input..set_tag() which calls this method
    */
    set_tag: function( tag ) {
      this.tag = tag || null;
    }, // Input_Transactions..set_tag()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..add_branches( branches )
        
        @short Add or remove concurrent uptream branches.
        
        @parameters:
        - branches (Integer): the number of concurrent branches to add if
          positive, to remove if negative.
    */
    add_branches: function( count ) {
      this.branches += count;
      
      de&&ug( this._get_name( 'add_branches' ) + 'count:', count, ', new count:', this.branches )
      
      // ToDo: if there are ongoing transactions, some may terminate if count is decreased and 
      // the removed branch has not terminated some transactions started at other branches
      // this requires to provide add_source( source ) and remove_source( source ) methods
      // instead of add_branches()
      // Since a remove_source() method already exist it will have to be modified 
    }, // Input_Transactions..add_branches()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..add( tid, source, forks )
        
        Add source to transactions for transaction_id.
        
        @parameters:
        - tid (String): id of the transaction to add source to
        - source (Output_Transactions): transactions for the source requesting
          the addition.
        - forks (optional Array of Strings): fork tags from transaction Object
        
        Returns:
        - null: this source was already added
        
        - input_transaction (Input_Transaction): this source was just added to
          this input transaction
    */
    add: function( tid, source, forks ) {
      var transaction;
      
      if ( transaction = this.get_from_tid( tid ) ) {
        // This transaction is already in progress at this input from at least
        // one source
        
        // Lookup transaction to find out if it already has this source
        if ( transaction.get( source ) ) return null; // Source already recorded as started for this transaction
        
        // That source has not yet emited any value to this input for this
        // transaction, but this transaction is already in progress from
        // another source.
      } else {
        // This transaction has not been started yet at this input
        transaction = Super.add.call( this, new Input_Transaction( this, tid, forks ) );
      }
      
      // Memorize this new source for this transaction
      return transaction.add( source );
    }, // Input_Transactions..add()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..remove( tid, source )
        
        Removes a source from a transaction.
        
        @parameters:
        - tid (String): id of the transaction to remove source from
        - source (Output_Transactions): transactions for the source removed.
        
        Returns:
        - null: this source was not found or there are no concurrent
          transactions at this input.
          
        - _t (Object): returned by Input_Transaction..remove()
    */
    remove: function( tid, source ) {
      var transaction = this.get_from_tid( tid )
        , _t          = transaction && transaction.remove( source )
      ;
      
      if ( _t ) _t.more || Super.remove.call( this, transaction );
      
      return _t;
    }, // Input_Transactions..remove()
    
    /* ------------------------------------------------------------------------
        @method Input_Transactions..remove_source( output_transactions )
        
        @short Removes a output_transactions from all input transactions, if any.
        
        @parameter output_transactions (Output_Transactions): transactions from
        removed output source.
        
        @returns Array of terminated transactions' objects (_t):
          - id (String): this transaction id
          - more (optional Boolean): true if more are expected from a source
          - forks (optional Array of String): remaining forks for downstream
        
        Called by @@Input.._transactions_remove_source()
        Called by @@Input..remove_source() when two pipelets are disconnected.
        
        Calling @@Output_Transactions..remove_destination()
        
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
  
  function Input_Transaction( destination, tid, forks ) {
    var _         = this
      , l         = forks && forks.length
      , input_tag
      , _t
    ;
    
    IO_Transaction.call( _, destination, tid );
    
    // Total number of sources that have terminated the transaction
    _.terminated_count = 0;
    
    // If this input tag is found as the last tag in forks, this transaction is tagged
    // and will have to terminate at all branches before terminating at this input
    if ( _.tagged = !! l ) {
      // There are fork tags in this transaction
      if ( ( input_tag = destination.tag )
        && ( input_tag == forks[ l - 1 ] )
        && --l
      ) {
        // The last tag is destination.tag, remove it
        forks = forks.slice( 0, l );
        
        de&&ug( _._get_name() + ', removed fork tag "' + input_tag + '", remaining forks:', forks );
      }
    }
    
    // ToDo: we need the entire source _t object that may have additional flags, it needs to be updated at the end of the transaction as it may have a reason for the termination such as cancelled flag or other
    _t = _._t = {
      id: tid,
      more: true,
    }
    
    if ( l ) _t.forks = forks;
  } // Input_Transaction()
  
  IO_Transaction.subclass( 'Input_Transaction', Input_Transaction, function( Super ) {
    return {
      /* ------------------------------------------------------------------------
          remove( source )
          
          Removes source from a input transaction.
          
          @parameters:
          - source (Output_Transactions): transactions for the source removed.
          
          Returns:
          - null: this source was not found or there are no concurrent
            transactions a this input.
            
          - _t (Object):
            - id (String): this transaction id
            - more (optional Boolean): true if more are expected from a source
            - forks (optional Array of String): remaining forks for downstream
      */
      remove: function( source ) {
        var that = this;
        
        ++that.terminated_count; // One more has terminated
        
        de&&ug( get_name(), { terminated_count: that.terminated_count } );
        
        if ( that.get( source ) ) {
          Super.remove.call( that, source );
          
          var _t         = that._t
            , not_tagged = ! that.tagged
          ;
          
          if ( that.count == 0 ) {
            // This was the last one for this transaction from this source
            
            // Are there more sources expected to terminate?
            if ( not_tagged || that.terminated_count >= that.container.branches ) { // ToDo: fix encapsulation
              // All expected sources have terminated this transaction
              
              _t.more ||
                error( 'Already terminated transaction terminates a second time' )
              ;
              
              delete _t.more;
            } // else {
              // There are more outputs emiting operations for this transaction
              // Do not end this transaction at the source output
          } else {
            not_tagged && error( [
              '\n  Waiting for more outputs to terminate on untagged transaction.' +
              '\n' +
              '\n  This may cause unterminated transactions, interruption of dataflows, or worse.' +
              '\n' +
              '\n  To fix this issue:' +
              '\n    - If this is due to a diamond graph:' +
              '\n      - Add a fork tag at the start of the diamond,' +
              '\n      - and add the same tag at this input: ' + get_input_name() +
              '\n' +
              '\n    - If this is from a dispatch loop connecting "internal" pipelines, either:' +
              '\n      - Rename transactions at some upstream outputs using pipelet option _t_postfix' +
              '\n      - Remove one or more pipelines from the loop'
            ] );
          }
          
          return _t;
        }
        
        return null;
        
        function get_name() {
          return that._get_name( 'remove' );
        }
        
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
  
  function Output_Transaction( source, tid ) {
    IO_Transaction.call( this, source, tid );
  }
  
  IO_Transaction.subclass( 'Output_Transaction', Output_Transaction, {
    // ToDo: document add_destination_to_transaction()
    add_destination: function( input, forks ) {
      var that               = this
        , input_transactions = input.transactions
      ;
      
      // Graph loops, resulting in reentrance of transaction functions are taken care
      // of by testing if the source is already added in a source transaction
      // This also takes care of diamond issues in the graph, allowing the same transaction
      // to have multiple sources.
      
      // ToDo: add_destination(): multiple inputs can share the same input_transactions object, use input instead of input_transactions
      that.get( input_transactions ) // already ongoing
        || input_transactions.add( that.tid, that.container, forks )
        // Input transaction added
        && that.add( input_transactions )
      ;
      
      return that;
    }, // Output_Transaction..add_destination()
    
    // ToDo: document Output_Transaction..remove_destination()
    // @returns from Input_Transaction..remove(): null or _t
    remove_destination: function( input ) {
      var input_transactions = input.transactions;
      
      de&&ug( this._get_name( 'remove_destination' ) + ', input_transactions:', input_transactions._get_name() );
      
      var _t = input_transactions.remove( this.tid, this.container ); // ToDo: fix encapsulation for this.container
      
      _t && this.remove( input_transactions ); // Note: caller has responsibility to remove this when empty()
      
      // ToDo: verify that _t holds fork tags and other all other attributes of the transaction
      return _t;
    }, // Output_Transaction..remove_destination()
    
    /* ------------------------------------------------------------------------
        terminate()
        
        Terminate this transaction and return terminated input transactions.
        
        Returns:
        - (Array of Objects): terminated destinations with transaction objects.
          Each object has attributes:
          - _t (Object): transaction object to terminate this transaction
          - input (Input): target input waiting for an end-of-transaction event
        
        ToDo: add tests for terminate()
    */
    terminate: function() {
      var that = this
        , terminated_inputs = []
      ;
      
      // Terminate this transaction for all destination inputs except those which need more
      return that.map( function( input ) {
        // ToDo: For a given input_transactions, terminate at most one input
        
        if ( input.input ) input = input.input; // ToDo: remove compatibility code
        
        // Remove source from input_transactions
        var _t = that.remove_destination( input );
        
        //de&&ug( that._get_name( 'terminate' ) + 'input_transactions:', input.transactions );
        
        return _t.more
          ? null // more expected, this input does not terminate
          : { _t: _t, input: input }
        ;
      } ) // for all destination inputs for which this transaction was started
    } // Output_Transaction..terminate()
  } ); // Output_Transaction instance attributes
  
  function Output_Transactions( name ) {
    IO_Transactions.call( this, name );
  } // Output_Transactions
  
  IO_Transactions.subclass( 'Output_Transactions', Output_Transactions, {
    /* ------------------------------------------------------------------------
        get_options( input, [ options ] )
        
        Get output options for a destination input_transactions object from
        options, with 'more' possibly added to transaction Object if there are
        other concurent source outputs that have not terminated the same
        transaction at that input, or if there are more data events expected.
        
        This is used when there are concurrent pipelets in the graph that handle
        operations concurently, allowing the synchronization of concurent
        operations.
        
        @parameters:
        - input (Input): destination for which options need to be calculated,
          and containing a transactions Input_Transactions object.
        
        - options (optional Object): output options before taking into account
          destination inputs and possible graph diamonds
        
        Returns:
        - options (Object): output options 'with' more possibly added to
          transaction Object
          
        ToDo: consider another name because this method has side-effects
        ToDo: manipulate transaction objects instead of options
    */
    get_options: function( input, options ) {
      var that               = this
        , input_transactions = input.transactions
        , _t
        , tid
        , forks
        , input_tag
        , l
        , cloned
        , output_transaction
      ;
      
      if ( options && ( _t = options._t ) && ( tid = _t.id ) ) {
        forks = _t.forks;
        
        output_transaction = that.get_from_tid( tid );
        
        if ( _t.more || forks ) {
          de&&ug( get_name() + ', add destination' );
          
          // Create a transaction if necessary
          output_transaction || ( output_transaction = that.get_transaction( tid ) );
          
          // Add destination input if not already added
          output_transaction.add_destination( input, forks );
        }
        
        // ToDo: consider moving this code to Input_Transactions
        if ( forks
          && forks.length
          && ( input_tag = input_transactions.tag )
          && input_tag === forks[ l = forks.length - 1 ]
        ) {
          // remove last tag from forks, after cloning it
          clone_options();
          
          if ( l ) {
            _t.forks = forks.slice( 0, l );
          } else {
            delete _t.forks;
          }
          
          de&&ug( get_name() + ', removed fork tag "' + input_tag + '", remaining forks:', _t.forks );
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
        // ToDo: use a deep clone version of extend()
        options = extend_2( {}, options );
        
        _t = options._t = extend_2( {}, _t );
        
        cloned = true;
      } // clone_options()
      
      function get_name() {
        return that._get_name( 'get_options' );
      }
    }, // Output_Transactions..get_options()
    
    /* ------------------------------------------------------------------------
        get_transaction: function( tid )
        
        Get or create an output transaction for transaction_id
        
        @parameters:
        - tid: unique transaction identifier
        
        Returns:
        - transaction (Output_Transaction): managing input transactions
    */
    get_transaction: function( tid ) {
      return this.get_from_tid( tid ) || this.add( new Output_Transaction( this, tid ) );
    }, // Output_Transactions..get_transaction()
    
    /* ------------------------------------------------------------------------
        terminate( _t )
        
        If _t indicates the end of a transaction for which an output
        transaction exists, terminate this transaction and return terminated
        input transactions with termination transaction object.
        
        @parameters:
        _t (transaction Object)
        
        Returns:
        - (Array of Objects): returned by Output_Transaction..terminate()
        
        ToDo: add more tests for terminate()
    */
    terminate: function( _t ) {
      var transaction = ! _t.more && this.get_from_tid( _t.id );
      
      return transaction
        ? this
            .remove( transaction )
            .terminate()
        : []
      ;
    }, // Output_Transactions..terminate()
    
    /* ------------------------------------------------------------------------
        remove_destination( output_transaction, input )
        
        Remove input from output_transaction. If output_transaction then becomes
        empty, remove it from this.transactions.
        
        @returns (Object): from Input_Transaction..remove(), null or _t with
        attributes:
        - id (String)
        - more (Boolean):
          - true: this transaction is not terminated at this input
          - false: this transaction is complete for this input
        - forks (Array of Strings)
        
        Calling Output_Transaction ..remove_destination()
        Calling Input_Transactions ..remove()
        Calling Input_Transaction  ..remove()
    */
    remove_destination: function( output_transaction, input ) {
      var _t;
      
      if ( output_transaction ) {
        de&&ug( this._get_name( 'remove_destination' ) );
        
        _t = output_transaction.remove_destination( input );
        
        // ToDo: Add test for non-empty output_transaction
        output_transaction.is_empty() && this.remove( output_transaction );
      }
      
      return _t;
    } // Output_Transactions..remove_destination()
  } ); // Output_Transactions
  
  /* -------------------------------------------------------------------------------------------
      Class Options()
      
      Operations' Options methods
      
      Because options are optional parameters these can be undefined, therefore Options methods
      are defined in the Options object that provides methods which first parameter is an
      optional options Object.
  */
  
  /* -------------------------------------------------------------------------------------------
      Options.forward( [ options ] )
      
      Get options that need to be forwarded from optional source options.
      
      At this time the only options that must always be forwarded is the transaction Object _t.
      
      In the future more options might have to be always forwarded, this function will take
      care of these therefore insuring forward compatibility.
      
      At this time Options.forward() always returns an object even if there are no source
      options, this is likely to change in the future and therefore one should not rely
      on this for new code.
      
      Returns an Object with attributes:
      - _t (optional Object): transaction Object shallow copied from options, if present
        - more (optional Interger): true if more data is expected in this transaction
        - id (String): transaction identifier
        - other transaction parameters
      
      @parameters:
      - options: (optional Object): source options Object
      
      Exceptions:
      - If more is truly, a transaction id should also be present, otherwise an exception is
        thrown.
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
          
          if ( ! tid ) {
            throw new Error( 'options_forward(), more == true with missing transaction id' );
          }
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
  
  /* -------------------------------------------------------------------------------------------
      Options.has_more( [ options ] )
      
      Returns truly if there is an incomplete transaction.
  */
  function options_has_more( options ) {
    var t;
    
    return options
      && ( t = options._t )
      && t.more
    ;
  } // options_has_more()
  
  /* -------------------------------------------------------------------------------------------
      Options.last_fork_tag( [ options ] )
      
      Returns:
       (null)     ; options or transaction object or forks is null
       (undefined): there are no options, transaction object or fork tags.
       (Number 0) : there are zero fork tags
       (String)   : last fork tag
  */
  function options_last_fork_tag( options ) {
    var t, forks, l;
    
    return options
      && ( t     = options._t   )
      && ( forks = t.forks      )
      && ( l     = forks.length )
      && forks[ l - 1 ]
    ;
  } // options_last_fork_tag()
  
  /* -------------------------------------------------------------------------------------------
      Options.add_fork_tag( [ options ], fork_tag )
      
      Returns options object with fork tag added in transaction if it was not
      there yet.
  */
  function options_add_fork_tag( options, fork_tag ) {
    if ( options_last_fork_tag( options ) !== fork_tag ) {
      // ToDo: optimize adding fork tag to transaction, once fully tested
      
      // Create a transaction with a single operation and fork_tag
      var t = new Transaction( 1, options, null, fork_tag );
      
      // Get options for this single operation
      options = t
        .next()
        .get_emit_options()
      ;
      
      // Then end this transaction
      t.end();
    }
    
    return options;      
  } // options_add_fork_tag()
  
  Transactions.Options = {
    forward      : options_forward,
    has_more     : options_has_more,
    last_fork_tag: options_last_fork_tag,
    add_fork_tag : options_add_fork_tag
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
