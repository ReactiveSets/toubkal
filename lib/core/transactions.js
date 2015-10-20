/*  transactions.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
  
  /* -------------------------------------------------------------------------------------------
     Transactions( name )
     
     Manages a collection of ongoing transactions at an output operations emitter.
     
     Parameters:
     - name (String): for Loggable
  */
  function Transactions( name ) {
    // ToDo: pipelet.js: provide name
    Loggable.call( this, name );
    
    this.transactions = Dictionary();
  }
  
  Loggable.subclass( 'Transactions', Transactions, {
    // Get outgoing Transaction instance, if any, from its transaction id
    get: function( tid ) {
      return this.transactions[ tid ];
    },
    
    // Get tids for all ongoing transactions
    get_tids: function() {
      return Object.keys( this.transactions );
    },
    
    // Provides acyclic representation of all ongoing transactions, suitable
    // for JSON.stringify()
    toJSON: function() {
      return this.get_tids();
    },
    
    /* ------------------------------------------------------------------------
       get_transaction( count [, options [, output [, fork ] ] ] )
       
       Get or create a transaction for count (additional) operations.
       
       Returns a Transaction instance.
       
       Parameters:
       - count (Integer): number of (additional) operations this transaction
         is expected to emit
       
       - options (Optional object): from upstream operation, used to nest
         transactions with upstream transactions
       
       - output (optional Output): to emit operations to.
         
         If no output is provided, the returned transaction will emit events
         as an Event_Emitter.
       
       - fork (optional String): fork name.
       
       For more information on the returned transaction, check out Transaction.
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
            
            return _t.add_operations( count ).set_source_options( options );
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
    
    // Ends a transaction if it is closed
    // ToDo: this should be a method of Transaction, not Transactions
    end_transaction: function( t ) {
      t.is_closed() || t.end();
      
      return this;
    } // end_transaction()
  } ); // Transactions instance methods
  
  /* -------------------------------------------------------------------------------------------
     new Transaction( count [, options [, output [, fork] ] ] )
     
     Creates a transaction.
     
     Parameters:
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
     
     - fork (optional String): fork name.
     
     Returns a Transaction instance, is an Event_Emitter.
     
     Emitted Events:
     - 'ended' : ():
       When the transaction have finished emitting everything and has ended
     
     - 'add'   : ( values, options ):
       When no output is provided and an 'add' is emited
     
     - 'remove': ( values, options ):
       When no output is provided and a 'remove' is emited
     
     Diamond-graph issue:
     
       Fork                Union
            -- branch 1 --
       -- | -- branch 2 -- | --
            -- branch 3 --
       
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
       
       Example: a diamond with 3 branches tagged 'map'
       
         var fork = source.fork_tag( 'map' )
           , branch_1 = fork...
           , branch_2 = fork...
           , branch_3 = fork...
         ;
         
         rs.union( [ branch_1, branch_2, branch_3 ], { tag: 'map' } );
       
       Union removes the 'map' fork tag from transactions' tags added by
       source.fork_tag(). If a single operation has no transaction,
       source.fork_tag() makes a transaction with that single operation
       with the tag to allow union() to wait for all branches to complete
       that transaction.
       
       All pipelets in all branches must forward tagged transactions even
       if they have nothing to forward. This could be the most error-prone
       part since this relies on each pipelet to always forward
       transactions having fork tags.
  */
  function Transaction( count, options, output, fork ) {
    this.number = ++Transaction.count; // for debugging purposes
    
    Event_Emitter.call( this, get_name( output ) + ' #' + this.number );
    
    var o, t = options && options._t;
    
    if ( ( t && t.more ) || count > 1 || fork ) {
      // There is more comming from upstream or multiple operations for this transaction, or a fork at this point
      // Options will be altered by this transaction, requires a deep copy
      if ( fork ) {
        o = extend_2( {}, options );
        
        t = o._t = t ? extend_2( {}, t ) : {};
        
        // Don't create a transaction id here,
        // it will be created by emit_options() only if we actually emit something
        
        var forks = t.forks;
        
        if ( forks ) {
          // make a copy and add fork
          ( t.forks = forks.slice( 0 ) ).push( fork );
        } else {
          t.forks = [ fork ];
        }
      } else {
        o = options;
      }
    } else {
      o = options;
    }
    
    this.count          = count; // !! Must set count before calling set_source_options()
    
    this.set_source_options( options );
    
    this.emit_options = o;
    this.fork         = fork;
    this.o            = extend_2( { __t: this }, o );
    this.added        = [];     // Values added but which emission is defered 
    this.removed      = [];     // Values removed but which emission is defered
    this.need_close   = false;  // True when some emits with more have been done requiring an emit with no-more 
    this.closed       = false;  // When true means that the last options have been provided with no-more, any further attempt will raise an exception
    this.ending       = false;  // Will be set to true if end() is called but cannot end yet
    this.output       = output; // The Output to emit operations to
    
    de&&ug( 'new Transaction()', this.toJSON() );
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
        this._emit_event( operation, [ values, options ] );
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
    
    emit_nothing: function() {
      de&&ug( this._get_name( 'emit_nothing' ) );
      
      this.next();
      
      return this.ending ? this.end() : this;
    }, // Transaction..emit_nothing()
    
    // ToDo: redefine the use of get_options()
    get_options: function() {
      if ( this.closed ) {
        throw new Error ( this._get_name( 'get_options' ) + ', exception: this transaction is already closed' );
      }
      
      var options = this.o
        , t = options._t
        , more = this.source_more || this.count > 0 || this.removed.length > 0 || this.added.length > 0
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
            
            this._emit_event( 'tid', [ tid ] );
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
      var count = this.count
        , source_more = this.source_more
        , name = de && this._get_name( 'end' )
      ;
      
      if ( count || source_more ) {
        de&&ug( name, 'not ending because'
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
      ;
      
      if ( removed.length ) {
        de&&ug( name, '__emit removed' );
        
        this.removed = []; // _clear before __emit() bellow but do not clear this.added just yet to allow __emit() to set more
        
        this._emit( 'remove', removed, this.get_emit_options() );
      }
      
      if ( added.length || this.need_close ) {
        de&&ug( name, '__emit added' );
        
        this.added = []; // _clear before __emit() bellow to force to unset more
        
        this._emit( 'add', added, this.get_emit_options() );
      }
      
      return this._emit_event( 'ended' );
    } // Transaction..end()
  } ); // Transaction instance methods
  
  /* -------------------------------------------------------------------------------------------
     -------------------------------------------------------------------------------------------
     
     Input / Output transactions classes
     
     Manage ongoing transactions between inputs and outputs.
     
     Enforce transactions' rules:
     - all transactions terminate once and only once.
     - transactions with fork tags (said concurent) are forwarded to all destinations at a fork
     - all branches of concurent transactions synchronize at tagged inputs
     
     Relationship between I/O and I/O transactions instances:
     
       upstream pipelet                        downstream pipelet
       
              |                                        |
              |zero or more                            |zero or more
              v                                        v
              
            output                                   input
            
              |                                        |
              |one                                     |one
              v                                        v
                           many           many
      output_transactions <-------     -------> input_transactions
                                  \   /
              |                    \ /                 |
              |many                 X                  |many
              v                    / \                 v
                                  /   \
      output_transaction  --------     -------- input_transaction
  */
  
  /* -------------------------------------------------------------------------------------------
     IO_Transactions( name, container )
     
     Base class for Input_Transactions and Output_Transactions.
     
     Manages a collection of IO_Transaction instances.
     
     Parameters:
     - container: reference to container input / output
     - name (optional String): Loggable name, default is container._get_name()
  */
  var IO_Transactions_id = 1000; // start at 1000 to help debugging
  
  function IO_Transactions( container, name ) {
    this.id = ++IO_Transactions_id; // Locally unique identifier
    
    Loggable.call( this, ( name || container._get_name() ) + '#' + this.id );
    
    this.container = container;
    this.count = 0;
    this.transactions = Dictionary();
  } // IO_Transactions()
  
  Loggable.subclass( 'IO_Transactions', IO_Transactions, {
    /* ------------------------------------------------------------------------
       toJSON()
       
       Returns object without circular reference to container
    */
    toJSON: function() {
      return {
        'id'          : this.id,
        'name'        : this._get_name(), // Loggable
        'container'   : this.container._get_name(), // contains circular reference to this
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
    }, // get_from_tid()
    
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
    }, // has()
    
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
    }, // add()
    
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
    }, // remove()
    
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
    } // fatal()
  } ); // IO_Transactions
  
  /* -------------------------------------------------------------------------------------------
     IO_Transaction( container, tid, name )
     
     Manages transactions counterparts.
     
     Parameters:
     - container: reference to container input
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
    }, // IO_Transaction.toJSON()
    
    /* ------------------------------------------------------------------------
       is_empty()
       
       Returns true if there are no transactions counterpart added to this.
    */
    is_empty: function() {
      return ! this.count;
    }, // IO_Transaction.is_empty()
    
    /* ------------------------------------------------------------------------
       get( io_transactions )
       
       Returns
       - undefined: if io_transactions was never added to this
       - io_transactions if io_transactions is already added in this.
       - null if io_transactions was added then removed from this.
       
       Parameters:
       - io_transactions (IO_Transactions): to add to this.
    */
    get: function( io_transactions ) {
      return this.transactions[ io_transactions.id ];
    }, // IO_Transaction.get()
    
    /* ------------------------------------------------------------------------
       map( f )
       
       Maps f() to all ongoing io_transactions counterparts and returns Array
       of non-( null or undefined ) values returned by f().
       
       Parameters:
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
    }, // IO_Transaction.map()
    
    /* ------------------------------------------------------------------------
       add( io_transactions )
       
       Adds io_transactions counterpart to this transaction
       
       Parameters:
       - io_transactions (IO_Transactions): to add to this.
       
       Throws an Error if io_transactions was already added, even if removed.
    */
    add: function( io_transactions ) {
      var that = this
        , these_transactions = that.transactions
        , id = io_transactions.id
        , t = these_transactions[ id ]
      ;
      
      t          && fatal( 'already added' );
      t === null && fatal( 'already terminated' );
      
      these_transactions[ id ] = io_transactions;
      
      that.count += 1;
      
      de&&ug( that._get_name( 'add' ), { id: id, count: that.count } );
      
      return that;
      
      function fatal( message ) {
        throw new Error( that._get_name( 'add' ) + ', id:' + id + ', ' + message );
      }
    }, // IO_Transaction.add()
    
    /* ------------------------------------------------------------------------
       remove( io_transactions )
       
       Removes io_transactions counterpart from this transaction
       
       Parameters:
       - io_transactions (IO_Transactions): to remove from this.
       
       Throws an Error if io_transactions was already removed or was never
       added to this, or does not match io_transactions.
    */
    remove: function( io_transactions ) {
      var that = this
        , these_transactions = that.transactions
        , id = io_transactions.id
        , t = these_transactions[ id ]
      ;
      
      // Assertions
      t !== null            || fatal( 'already terminated' );
      t                     || fatal( 'not found' );
      t === io_transactions || fatal( 'does not match io_transactions' );
      
      these_transactions[ id ] = null;
      
      that.count -= 1;
      
      de&&ug( that._get_name( 'remove' ), { id: id, count: that.count } );
      
      return that;
      
      function fatal( message ) {
        throw new Error( that._get_name( 'remove' ) + ', id:' + id + ', ' + message );
      }
    } // IO_Transaction.remove()
  } ); // IO_Transaction
  
  /* -------------------------------------------------------------------------------------------
     Input_Transactions( container, name )
     
     Manages Input_Transaction objects of an input container, in order to guaranty that
     transactions executed concurrently over multiple pipelets terminate once and only once.
     
     Parameters:
     - container      (Input): reference to container input
     - name (optional String): Loggable name, default is container._get_name()
  */
  function Input_Transactions( container, name ) {
    IO_Transactions.call( this, container, name );
    
    this.set_tag().set_branches();
  } // Input_Transactions()
  
  IO_Transactions.subclass( 'Input_Transactions', Input_Transactions, function( Super ) { return {
    /* ------------------------------------------------------------------------
       set_tag( tag )
       
       Sets transaction tag from an upstream fork tag.
       
       Parameter:
       - tag (optional String): transaction tag from an upstream fork tag
         dispatching operations over a number of concurrent pipelets. If there
         is no tag, no concurrent transaction joins at this input
    */
    set_tag: function( tag ) {
      this.tag = tag || null;
      
      return this;
    }, // Input_Transactions..set_tag()
    
    /* ------------------------------------------------------------------------
       set_branches( branches )
       
       Sets transaction the number of concurrent uptream branches.
       
       Parameter:
       - branches (optional Integer): the number of concurrent branches,
         default is 1, which means that there is only one upstream pipelet
         and that and therefore no concurrency.
    */
    set_branches: function( count ) {
      count || ( count = 1 ); // number of branches at this input (> 1 if union)
      
      de&&ug( this._get_name( 'set_branches' ) + ', count:', count )
      
      this.branches = count;
      
      // ToDo: if there are ongoing transactions, some may terminate if count is decreased and 
      // the removed branch has not terminated some transactions started at other branches
      // this requires to provide add_source( source ) and remove_source( source ) methods
      // instead of set_branches()
      // Since a remove_source() method already exist it will have to be modified 

      return this;
    }, // Input_Transactions..set_branches()
    
    /* ------------------------------------------------------------------------
       add( tid, source, forks )
       
       Add source to transactions for transaction_id.
       
       Parameters:
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
       remove( tid, source )
       
       Removes a source from a transaction.
       
       Parameters:
       - tid (String): id of the transaction to remove source from
       - source (Output_Transactions): transactions for the source removed.
       
       Returns:
       - null: this source was not found or there are no concurrent
         transactions at this input.
         
       - _t (Object): returned by Input_Transaction..remove()
    */
    remove: function( tid, source ) {
      var transaction = this.get_from_tid( tid )
        , _t
      ;
      
      if ( transaction
        && ( _t = transaction.remove( source ) )
      ) {
        _t.more || Super.remove.call( this, transaction );
      }
      
      return _t;
    }, // Input_Transactions..remove()
    
    /* ------------------------------------------------------------------------
       remove_source( source )
       
       Removes a source output from all transactions, if any. For each
       transaction removed, transaction.remove_source() is called.
       
       Parameters:
       - source (Output_Transactions): transactions from output source being
         removed.
       
       Returns:
       - Array of terminated transaction ids
       
       Called by:
       - Input.._transactions_remove_source() itself called by
       Input..remove_source() when two pipelets are disconnected.
    */
    remove_source: function( source ) {
      // ToDo: add tests for Input_Transactions..remove_source()
      var that = this, tids = [], tid, input_transaction, _t;
      
      for ( tid in that.transactions ) {
        if ( input_transaction = that.get_from_tid( tid )
          && input_transaction.get( source )
        ) {
          // This transaction is ongoing between this and source
          
          source.remove_destination_tid( that, tid );
          
          // ToDo: notice: removing pipelet connection in the middle of a transaction.
          de&&ug( that._get_name( 'remove_source' ) + ', remove input_transaction, tid:', tid );
          
          // ToDo: consider rolling-back transaction instead of silently terminating it.
          
          tids.push( tid );
        }
      }
      
      return tids;
    } // Input_Transactions..remove_source()
  } } ); // Input_Transactions instance attributes
  
  function Input_Transaction( destination, tid, forks ) {
    IO_Transaction.call( this, destination, tid );
    
    // Total number of sources that have terminated the transaction
    this.terminated_count = 0;
    
    var l, input_tag, tagged = false;
    
    // If this input tag is found as the last tag in forks, this transaction is tagged
    // and will have to terminate at all branches before terminating at this input
    if ( forks
      && ( l = forks.length ) // ToDo: this should always be the case, consider removing this code
    ) {
      // There are fork tags in this transaction
      tagged = true;
      
      if ( ( input_tag = destination.tag )
        && ( input_tag === forks[ l - 1 ] )
        && --l
      ) {
        // The last tag is destination.tag, remove it
        forks = forks.slice( 0, l );
        
        de&&ug( this._get_name() + ', removed fork tag "' + input_tag + '", remaining forks:', forks );
      }
    }
    
    this.tagged = tagged;
    
    this._t = {
      id: tid,
      more: true,
    }
    
    if ( l ) this._t.forks = forks;
  } // Input_Transaction()
  
  IO_Transaction.subclass( 'Input_Transaction', Input_Transaction, function( Super ) {
    return {
      /* ------------------------------------------------------------------------
         remove( source )
         
         Removes source from a input transaction.
         
         Parameters:
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
          
          var _t = that._t;
          
          if ( that.count == 0 ) {
            // This was the last one for this transaction from this source
            
            // Are there more sources expected to terminate?
            if ( ! that.tagged || that.terminated_count >= that.container.branches ) { // ToDo: fix encapsulation
              // All expected sources have terminated this transaction
              if ( ! _t.more ) throw new Error( get_name() + 'already terminated' );
              
              delete _t.more;
            }
          // } else {
            // There are more outputs emiting operations for this transaction
            // Do not end this transaction at the source output
          }
          
          return _t;
        }
        
        return null;
        
        function get_name() {
          return that._get_name( 'remove' );
        }
      } // Input_Transaction.remove()
    };
  } ); // Input_Transaction
  
  function Output_Transaction( source, tid ) {
    IO_Transaction.call( this, source, tid );
  }
  
  IO_Transaction.subclass( 'Output_Transaction', Output_Transaction, {
    // ToDo: document add_destination_to_transaction()
    add_destination: function( input_transactions, forks ) {
      // Graph loops, resulting in reentrance of transaction functions are taken care
      // of by testing if the source is already added in a source transaction
      // This also takes care of diamond issues in the graph, allowing the same transaction
      // to have multiple sources.
      if ( this.get( input_transactions ) ) return this; // already ongoing
      
      if ( input_transactions.add( this.tid, this.container, forks ) ) {
        // Input transaction added
        this.add( input_transactions );
      }
      
      return this;
    }, // Output_Transaction..add_destination()
    
    // ToDo: document Output_Transaction..remove_destination()
    remove_destination: function( input_transactions ) {
      de&&ug( this._get_name( 'remove_destination' ) + ', input_transactions:', input_transactions._get_name() );
      
      var _t = input_transactions.remove( this.tid, this.container ); // ToDo: fix encapsulation for this.container
      
      if ( _t ) {
        this.remove( input_transactions ); // Note: caller has responsibility to remove this when empty()
      }
      
      return _t;
    }, // Output_Transaction..remove_destination()
    
    /* ------------------------------------------------------------------------
        terminate()
        
        Terminate this transaction and return terminated input transactions.
        
        Returns:
        - (Array of Objects): terminated destinations with transaction objects.
          Each object has attributes:
          - input_transactions (Input_Transactions): terminating input
          - _t (Object): transaction object to terminate this transaction
        
        ToDo: add tests for terminate()
    */
    terminate: function() {
      var that = this
        , terminated_inputs = []
      ;
      
      // Terminate this transaction for all destination inputs except those which need more
      return that.map( function( input_transactions ) {
        // Remove source from input.transactions
        var _t = that.remove_destination( input_transactions );
        
        return _t.more
          ? null // more expected, this input does not terminate
          : {
            input_transactions: input_transactions,
            _t: _t
          }
        ;
      } ) // for all destination inputs for which this transaction was started
    } // Output_Transaction..terminate()
  } ); // Output_Transaction instance attributes
  
  function Output_Transactions( container ) {
    IO_Transactions.call( this, container );
  } // Output_Transactions
  
  IO_Transactions.subclass( 'Output_Transactions', Output_Transactions, {
    /* ------------------------------------------------------------------------
       get_options( input_transactions, [ options ] )
       
       Get output options for a destination input_transactions object from
       options, with 'more' possibly added to transaction Object if there are
       other concurent source outputs that have not terminated the same
       transaction at that input, or if there are more data events expected.
       
       This is used when there are concurrent pipelets in the graph that handle
       operations concurently, allowing the synchronization of concurent
       operations.
       
       Parameters:
       - input_transactions (Input_Transactions): input transactions to get
         options for
       
       - options (optional Object): output options before taking into account
         destination inputs and possible graph diamonds
       
       Returns:
       - options (Object): output options 'with' more possibly added to
         transaction Object
         
       ToDo: consider another name because this method has side-effects
       ToDo: manipulate transaction objects instead of options
    */
    get_options: function( input_transactions, options ) {
      var that = this, _t, tid, forks, input_tag, l, cloned, output_transaction;
      
      if ( options && ( _t = options._t ) && ( tid = _t.id ) ) {
        forks = _t.forks;
        
        output_transaction = that.get_from_tid( tid );
        
        if ( _t.more || forks ) {
          de&&ug( get_name() + ', add destination' );
          
          // Create a transaction if necessary
          output_transaction || ( output_transaction = that.get_transaction( tid ) );
          
          output_transaction
            // Add destination input_transactions if not already added
            .add_destination( input_transactions, forks )
          ;
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
          de&&ug( get_name() + ', remove destination' );
          
          // This is the end of this transaction at this branch
          // But this transaction may have several branches
          // We need to know if this is the last branch closing this transaction
          var t = output_transaction.remove_destination( input_transactions );
          
          if ( t && t.more ) {
            // There are more branches which haven't closed this transaction
            
            // Make a deep copy of options, if not cloned yet, then add more to transaction Object
            cloned || clone_options()
            
            _t.more = true; // Don't close this transaction just yet
          }
          
          output_transaction.is_empty() && that.remove( output_transaction );
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
       
       Parameters:
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
        
        Parameters:
        _t (transaction Object)
        
        Returns:
        - (Array of Objects): returned by Output_Transaction..terminate()
        
        ToDo: add more tests for terminate()
    */
    terminate: function( _t ) {
      var transaction;
      
      return ! _t.more && ( transaction = this.get_from_tid( _t.id ) )
        ? this
            .remove( transaction )
            .terminate()
        : []
      ;
    }, // Output_Transactions..terminate()
    
    /* ------------------------------------------------------------------------
       remove_destination_tid( input_transactions, tid )
       
       Removes source for a transaction id.
       
       If mathing output transaction becomes empty, remove it from this.transactions.
       
       Called from Input when removing a source to a destination input.
       
       Returns:
       - more (Boolean):
         - true: this transaction is not terminated at this input
         - false: this transaction is complete for this input
    */
    remove_destination_tid: function( input_transactions, tid ) {
      var transaction = this.get_from_tid( tid )
        , more
      ;
      
      if ( transaction ) {
        more = transaction.remove_destination( input_transactions );
        
        transaction.is_empty() && this.remove( transaction );
      }
      
      return more;
    } // Output_Transactions..remove_destination_tid()
  } ); // Output_Transactions
  
  /* -------------------------------------------------------------------------------------------
     Options
     
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
     
     Parameters:
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
