/*  transactions.js
    
    Copyright (C) 2013, 2014, Connected Sets

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

"use strict";

( function( exports ) {
  var XS, uuid;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    
    uuid = require( 'node-uuid' );
  } else {
    XS = exports.XS;
    
    uuid = exports.uuid;
  }
  
  var log        = XS.log
    , extend     = XS.extend
    , extend_2   = XS.extend_2
    , Root       = XS.Root
    , Dictionary = XS.Dictionary
  ;
  
  var push   = Array.prototype.push
    , slice  = Array.prototype.slice
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "transactions, " + m );
  } // ug()
  
  function exception( e, name ) {
    // ToDo: decode stack trace to resolve urls of minified sources with a source map
    // Alternatively open a feature request in Google and Firefox to decode such urls
    // displayed in the console.

    log( 'exception, Pipelet..' + name
      + ', ' + e
      + ', stack trace: ' + e.stack
    );

    // ToDo: send exception to an exception datafow that can be routed to a server
  } // exception()

  /* -------------------------------------------------------------------------------------------
     XS.Event_Emitter
     
     Simple event emitter.
     
     ToDo: implement full-featured event emiter class, or import one
     ToDo: remove '_' prefix on methods as Pipelet is no longer an Event Emitter and if it would
       become an Event Emitter in the future, we could do with existing redirects
  */
  function Event_Emitter() {
    // Events listeners
    this._events = {};
  } // Event_Emitter()
  
  Root.subclass( Event_Emitter, {
    /* ------------------------------------------------------------------------
       _on( event_name, listener [, that] [, once] )
       
       _once( event_name, listener [, that] )
       
       Sets an event listener that listens to events emited by this emitter.
       
       Parameters:
         - event_name: (String) the name of the event.
             
         - listener: (Function) will be called with the parameters emited by
             the event emitter.
           
         - that: (Object) optional, the context to call the listener, if not
             specified the context is this event emitter's instance.
           
         - once: (Boolean) optional, if true, the event listener will be
             removed right before the first emit on this event.
    */
    _on: function( event_name, listener, that, once ) {
      var events = this._events
        , listeners = events[ event_name ] || ( events[ event_name ] = [] )
      ;
      
      listeners.push( { listener: listener, that: that || this, once: once } );
      
      de&&ug( '_on()'
        + ', event "' + event_name + '"'
        + ', name: "' + ( this._get_name && this._get_name() || '' ) + '"'
        + ', listeners: ' + listeners.length
        + ', once: ' + once
      );
      
      // ToDo: throw exception if some limit exceeded in the number of listeners to prevent memory leaks
      
      return this;
    }, // _on()
    
    _once: function( event_name, listener, that ) {
      return this._on( event_name, listener, that, true );
    }, // _once()
    
    /* ------------------------------------------------------------------------
       emit( event_name, ... )
       
       Parameters:
         - event_name: (String) the name of the event.
         - all additional parameters are emitted to listeners.
    */
    emit: function( event_name ) {
      return this._emit_event( event_name, slice.call( arguments, 1 ) );
    }, // emit()
    
    /* ------------------------------------------------------------------------
       _emit_event( event_name, arguments )
       
       Parameters:
         - event_name (String): the name of the event.
         - arguments   (Array): parameters emitted to listeners.
    */
    _emit_event: function( event_name, a ) {
      var events = this._events, listeners, l, name;
      
      if ( de ) {
        if ( name = this._get_name && this._get_name() ) {
          name += '.';
        } else {
          name = '';
        }
        
        name += '_emit_event( ' + event_name + ' )';
      }
      
      if ( ( listeners = events[ event_name ] ) && ( l = listeners.length ) ) {
        de&&ug( name + ', listeners count: ' + l );
        
        try {
          for( var i = -1, listener; listener = listeners[ ++i ]; ) {
            if ( listener.once ) {
              de&&ug( name + ', removing "once" event listener, position: ' + i ); 
              
              listeners.splice( i--, 1 );
              
              l -= 1;
            }
            
            listener.listener.apply( listener.that, a );
          }
        } catch( e ) {
          exception( e, name );//+ ', a: ' + log.s( a ) );
        }
      }
      
      return this;
    } // _emit_event()
  } ); // Event_Emitter instance methods
  
  /* -------------------------------------------------------------------------------------------
     XS.uuid_v4()
  */
  var uuid_v4 = XS.uuid_v4 = uuid.v4;
  
  /* -------------------------------------------------------------------------------------------
     Transactions()
     
     Manages a collection of ongoing transactions at an output operations emitter.
  */
  function Transactions() {
    this.transactions = Dictionary();
  }
  
  Root.subclass( Transactions, {
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
      var t, tid, more, _t, transactions = this.transactions;
      
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
            return _t.add_operations( count ).set_source_options( options );
          }
          
          if ( more || count > 1 || t.forks ) {
            // There is more comming from upstream
            // or there are more than one operation for this output
            // or there are forks in the upstream transactions that need to be forwared
            
            // ToDo: add xs_core test
            
            // Create and store a new transaction with this upstream tid
            return transactions[ tid ]
              = new Transaction( count, options, output, fork )
              ._on( 'ended', on_transaction_ended )
            ;
          }
        }
      }
      
      // Nothing more expected from upstream, or count <= 1 and no fork
      // There is no need to memorize this transaction in transactions
      return new Transaction( count, options, output, fork )
        ._on( 'tid', record_tid )
      ;
      
      // Record transaction id and transaction in transactions if tid is generated
      function record_tid( tid ) {
        de&&ug( 'Transactions(), new transaction id: ' + tid );
        
        // ToDo: Following code commented-out, because it fails filter() tests, we need to understand why
        //transactions[ tid ] = this;
        
        //this._on( 'ended', on_transaction_ended );
      }
      
      // Remove tid from transactions when transaction has ended
      function on_transaction_ended() {
        de&&ug( 'Transactions(), transaction ended, delete transaction, id: ' + tid );
        
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
       - _t (Object): a transaction Object:
         - more (optional Boolean): true if more data is expected from upstream, i.e. the
           upstream transaction is not complete.
           
         - id: (String): a unique identifier for this transaction
         
         - forks (optional Array of Strings): Array of fork tags to always forward to
           downstream pipelets.
       
     - output (optional Output): output to emit operations to. When not provided, the
       transaction will emit events 'add' and 'remove' instead of emitting to an output,
       see Emitted Events bellow.
     
     - fork (optional String): fork name.
     
     Returns a Transaction instance.
     
     Emitted Events:
     - 'ended' : ():
       When the transaction have finished emitting everything and has ended
     
     - 'add'   : ( values, options ):
       When no output is provided and an 'add' is emited
     
     - 'remove': ( values, options ):
       When no output is provided and a 'remove' is emited
     
     Diamond-graph issue:
       
            -- branch 1 --
       -- | -- branch 2 --| --
            -- branch 3 --
       
       If a transaction happens over two or more branches that later re-union
       (a diamond) and if the execution of one of the branches starts and
       ends the transaction before another branch had a chance to start the
       transaction at the union, the same transaction id will start and stop
       twice (or more) at the union.
       
       This would be an issue if the atomicity of the whole transaction must
       be preserved at or downstream of the join.
       
       In this case, the solution would be to delay from the original
       source the ending of the transaction long enough to allow all
       branches to be seen at the join.
       
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
       terminate these indenpendent transactions, a fork tag is added before
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
         
         xs.union( [ branch_1, branch_2, branch_3 ], { tag: 'map' } );
       
       Union removes the 'map' fork tag from transactions' tags added by
       source.fork_tag(). If a single operation has no transaction,
       source.fork_tag() makes a transaction with that single operation
       with the tag to allow union() to wait for all branches to complete
       that transaction.
       
       All pipelets in all branches must forward tagged transactions even
       if they have nothing to forward. This is probably the most error-prone
       part since this relies on each pipelet to properly forward
       transactions.
  */
  function Transaction( count, options, output, fork ) {
    Event_Emitter.call( this );
    
    var o, t = options && options._t;
    
    if ( ( t && t.more ) || count > 1 || fork ) {
      // There is more comming from upstream or multiple operations for this transaction, or a fork at this point
      // Options will be altered by this transaction, requires a deep copy
      // ToDo: implement deep copy in XS.deep_copy()
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
    
    // Initialize Hidden class
    this.name           = output ? output._get_name() : '';
    this.debug_name     = this.name + '.Transaction..';
    
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
    
    de&&ug( 'new Transaction(): ' + log.s( this ) );
  } // Transaction()
  
  Event_Emitter.subclass( Transaction, {
    _get_name: function( name ) {
      return this.name + ( name ? '.' + name + '(), ' : '' );
    }, // _get_name()
    
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
      
      de&&ug( this.debug_name + 'add_operations(), adding ' + count + ' operations, new total: ' + this.count );
      
      return this.ending ? this.end() : this;
    }, // Transaction..add_operations()
    
    set_source_options: function( options ) {
      var t = options && options._t;
      
      if ( t && t.forks ) {
        this.need_close = true; // Forces a closing emit() because there are fork tags
      }
      
      this.source_more = ( t && t.more ) || false;
      
      this.source_options = options;
      
      de&&ug( this.debug_name + 'set_source_options(), source_more: ' + this.source_more );
      
      return this.ending ? this.end() : this;
    }, // Transaction..set_source_options()
    
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
      // de&&ug( '__emit_add, values: ' + values.length + ( emit_now ? ', now' : ', later' ) );
      
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
      // de&&ug( '__emit_remove, values: ' + values.length + ( emit_now ? ', now' : ', later' ) );
            
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
      this.next();
      
      return this.ending ? this.end() : this;
    }, // Transaction..emit_nothing()
    
    // ToDo: redefine the use of get_options()
    get_options: function() {
      if ( this.closed ) {
        throw new Error ( this.debug_name + 'get_options(), exception: this transaction is already closed' );
      }
      
      var options = this.o
        , t = options._t
        , more = this.source_more || this.count > 0 || this.removed.length > 0 || this.added.length > 0
      ;
      
      de&&ug( this.debug_name + 'get_options(), more: ' + more );
      
      options.more = more; // ToDo: needs to be redefined with the role of get_options()
      
      return options;
    }, // Transaction..get_options()
    
    // Makes options for emitting an operation, should be called once and only once per operation emitted
    get_emit_options: function() {
      var more = this.get_options().more
        , options = this.emit_options
        , t = options && options._t
        , tid, fork = this.fork
        , debug_name = this.debug_name
      ;
      
      if ( this.need_close ) {
        // there was something emited before or there are upstream forks, transaction id is therfore set
        
        if ( ! more ) {
          // this is the last emit
          this.need_close = false;
          
          clone_options( this );
          
          delete t.more;
          
          this.closed = true; // this should be the last emit
        }
      } else {
        // there was nothing emited before, transaction id may be unset
        
        if ( more || fork ) {
          // there will be more after this or this is a fork, transaction id may be unset
          
          // Create options Object if it does not exist or clone existing options
          clone_options( this );
          
          // Create transaction object in options if it does not exist
          t || ( t = options._t = {} );
          
          // Create transaction id if it does not exist
          if ( ! t.id ) {
            tid = t.id = uuid_v4();
            
            de&&trace( 'new tid: ' + tid );
            
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
          
          de&&trace( 'use source options: ' + log.s( options ) );
        }
      }
      
      return options;
      
      function trace( message ) {
        ug( debug_name + 'get_emit_options(), ' + message );
      }
      
      function clone_options( that ) {
        that.emit_options = options = options ? extend_2( {}, options ) : {};
        
        t && ( t = options._t = extend_2( {}, t ) );
      }
    }, // Transaction..get_emit_options()
    
    next: function() {
      if ( --this.count >= 0 ) return this;
      
      this.count = 0;
      
      throw new Error( this.debug_name + 'next(), exception: count was already zero' );
    }, // Transaction..next()
    
    /* ------------------------------------------------------------------------
       Transaction..end()
    */
    end: function() {
      var count = this.count, source_more = this.source_more;
      
      if ( count || source_more ) {
        de&&ug( this.debug_name + 'end(), not ending because'
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
        de&&ug( this.debug_name + 'end(), __emit removed' );
        
        this.removed = []; // _clear before __emit() bellow but do not clear this.added just yet to allow __emit() to set more
        
        this._emit( 'remove', removed, this.get_emit_options() );
      }
      
      if ( added.length || this.need_close ) {
        de&&ug( this.debug_name + 'end(), __emit added' );
        
        this.added = []; // _clear before __emit() bellow to force to unset more
        
        this._emit( 'add', added, this.get_emit_options() );
      }
      
      return this._emit_event( 'ended' );
    } // Transaction..end()
  } ); // Transaction instance methods
  
  /* -------------------------------------------------------------------------------------------
     Input_Transactions( tag, branches )
     
     Manages transactions for an input, in order to guaranty that transactions executed
     concurrently over multiple pipelets terminate once and only once.
     
     Parameters:
     - tag (optional String): transaction tag from an upstream query tree dispatching operations
     over a number of concurrent pipelets. If there is no tag this means that all transactions
     comming through this input are not concurrent.
     
     - branches (optional Integer): the number of concurrent branches, default is 1, which means
     that there is only one upstream pipelet and that and therefore no concurrency.
     
     Input Transactions are held in a Dictionary of source transactions by transaction_id.
     
     An input transaction is an Array of Objects with attributes:
     - source: (Output_Transaction) transactions for the source output of the transaction.
     - position: (Integer) of the input into the transaction at the source output.
  */
  function Input_Transactions() {
    this.transactions = Dictionary();
    this.tag = null;
    this.branches = 0;
  }
  
  Root.subclass( Input_Transactions, {
    // Set upstream fork tag and branches count for union
    set_tag_branches: function( tag, count ) {
      this.tag = tag || null; // upstream fork tag
      this.branches = count || 1; // number of branches at this input (> 1 if union)
      
      return this;
    }, // set_fork_tag()
    
    /* ------------------------------------------------------------------------
       add( transaction_id, source, forks )
       
       Add source to transactions for transaction_id.
       
       Parameters:
       - transaction_id (String): id of the transaction to add source to
       - source (Output_Transactions): transactions for the source requesting
         the addition.
       - forks (optional Array of Strings): fork tags from transaction Object
       
       Returns:
       - null: this source was already added, or there are no concurrent
         transactions at this input
         
       - Object: created to hold source information, initialized with
         - source (Output): the output source provided
         - any other attributes may be added by that source and may retrieved
           when the source will be removed from this transaction
    */
    add: function( tid, source, forks ) {
      var tag = this.tag, transaction, tag, s;
      
      if ( ! ( tag && forks ) ) return null; // There are no concurrent transactions at this input
      
      /*
        For each transaction_id, transaction is a Dictionary indexed by
        source.id and containing Objects with attributes:
        - source: (Output) source of the transaction
        - position: (Integer) of the input into the transaction Array at the
          source output
        - additional attributes if needed
      */
      
      if ( transaction = this.transactions[ tid ] ) {
        // This transaction is already in progress at this input from at least
        // one source
        
        // Lookup transaction to find out if it has this source
        s = transaction[ source.id ];
        
        if ( s ) return null; // Source already recorded as started for this transaction
        
        if ( s === null ) throw new Error( 'Input_Transactions..add(), transaction ' + tid + ' already terminated' );
        
        // That source has not yet emited any value to this input for this
        // transaction, but this transaction is already in progress from
        // another source.
        transaction._.count += 1;
      } else {
        // This transaction has not been started yet at this input
        
        transaction = this.transactions[ tid ] = new Dictionary();
        
        // Meta data about the transaction is stored into '_' key.
        transaction._ = {
          // Number of output sources that have started but not terminated this transaction
          // i.e. the number of ongoing chunks of the transaction from inputs
          count: 1,
          
          // Total number of sources that have terminated the transaction
          terminated_count: 0,
          
          // If this input tag is found in forks, this transaction is tagged
          // and will have to terminate at all branches before terminating at
          // this input
          tagged: forks.indexOf( tag ) != -1
        };
      }
      
      // Memorize this new source for this transaction
      return transaction[ source.id ] = { source: source };
    }, // Input_Transactions..add()
    
    /* ------------------------------------------------------------------------
       remove( transaction_id, source )
       
       Removes a source from a transaction.
       
       Parameters:
       - transaction_id (String): id of the transaction to remove source from
       - source (Output_Transactions): transactions for the source removed.
       
       Returns:
       - null: this source was not found or there are no concurrent
         transactions a this input.
         
       - Object: objact that was returned by add() with additional more flag
         set to true if there are more outputs emitting operations that have
         not yet removed for this transaction.
    */
    remove: function( tid, source ) {
      if ( ! this.tag ) return null;
      
      var transactions = this.transactions
        , transaction = transactions[ tid ]
        , name = 'Source_Transaction..remove(), '
      ;
      
      if ( transaction ) {
        var _ = transaction._
          , count            = --_.count            // There is one fewer source emitting for this transaction
          , terminated_count = ++_.terminated_count // One more has terminated
          , id = source.id
          , s = transaction[ id ]
        ;
        
        de&&ug( name + log.s( {
          tid: tid, source_id: id, count: count, terminated_count: terminated_count
        } ) );
        
        if ( s ) {
          transaction[ source.id ] = null;
          
          if ( count == 0 ) {
            // This was the last one for this transaction from this source
            
            // Are there more sources expected?
            if ( _.tagged && terminated_count < this.branches ) {
              // Some sources have not yet emitted anything for this tagged transaction
              // We need to wait for these sources to emit and terminate this transaction
              s.more = true;
            } else {
              // Remove this transaction entirely
              delete transactions[ tid ];
              
              s.more = false;
            }
          } else {
            // There are more outputs emiting operations for this transaction
            // Do not end this transaction at the source output
            s.more = true;
          }
          
          return s;
        }
      }
      
      return null;
    }, // Input_Transactions..remove()
    
    /* ------------------------------------------------------------------------
       remove_source( source )
       
       Removes a source output from all transactions, if any. For each
       transaction removed, source.transactions.remove_source() is called with
       the following parameters:
       - transaction_id (String): transaction id for source
       - Object: the object returned by transactions..add()
       
       Parameters:
       - source (Output_Transactions): transactions from output source being
         removed.
       
       Returns:
       - Array of terminated transaction objects
       
       Called by:
       - Input.._transactions_remove_source() by Input.._remove_source() when
       two pipelets are disconnected.
       
       ToDo: add tests for Input_Transactions..remove_source()
    */
    remove_source: function( source ) {
      var transactions = this.transactions
        , transaction_id, transaction
        , name = de && 'Input_Transactions..remove_source(), '
        , terminated_transactions_objects = []
      ;
      
      for ( transaction_id in transactions ) {
        transaction = transactions[ transaction_id ];
        
        for ( var i = 0, s; s = transaction[ i ]; ) {
          if ( source !== s.source ) {
            i += 1;
            
            continue;
          }
          
          // Source found for this transaction, remove it
          de&&ug( name + 'removing source ' + source._get_name() + ' from transaction ' + transaction_id );
          
          transaction.splice( i, 1 );
          
          source.remove_source( transaction_id, s );
          
          if ( transaction.length == 0 ) {
            // Terminate the transaction at this input.
            
            // ToDo: add warning condition, removing pipelet connection in the middle of a transaction.
            // ToDo: consider rolling-back transaction instead of silently terminating it.
            // ToDo: we need more than a transaction id, we need the whole transaction Object, including forks
            // ToDo: handle fork
            terminated_transactions_objects.push( { id: transaction_id } );
            
            delete transactions[ transaction_id ];
          }
        } // For all sources of source transaction
      } // For all source transactions
      
      return terminated_transactions_objects;
    } // Input_Transactions..remove_source()
  } ); // Input_Transactions instance attributes
  
  function Output_Transaction( transaction_id, source ) {
    this.source = source;
    this.tid = transaction_id;
    this.inputs = [];
  }
  
  Root.subclass( Output_Transaction, {
    _get_name: function( f ) {
      return 'Output_Transaction..' + f + '(), ';
    },
    
    is_empty: function() {
      return ! this.inputs.length;
    },
    
    // ToDo: document add_destination_to_transaction()
    add_destination: function( input_transactions, forks ) {
      // Graph loops, resulting in reentrance of transaction functions are taken care
      // of by testing if the source is already added in a source transaction
      // This also takes care of diamond issues in the graph, allowing the same transaction
      // to have multiple sources.
      
      var tid = this.tid
        , s = input_transactions.add( tid, this.source, forks ) // ToDo: use this instead of this.source
      ;
      
      if ( s ) {
        /* s: (optional Object), null if already added. Attributes:
           - source: (Output) this.source
        */
        
        var inputs = this.inputs;
        
        // Keep the position of input in inputs[] for remove_destination()
        s.position = inputs.length;
        
        inputs.push( input_transactions );
        
        de&&ug( this._get_name( 'add_destination_to_transaction' )
          + 'input added to transaction ' + tid
          + ' at position ' + s.position
        );
      }
      
      return this;
    }, // Output_Transaction..add_destination()
    
    // ToDo: document Output_Transaction..remove_destination()
    remove_destination: function( input_transactions ) {
      var tid = this.tid;
      
      de&&ug( this._get_name( 'remove_destination' ) + tid );
      
      var source = input_transactions.remove( tid, this.source ); // ToDo: use this instead of this.source
      
      if ( source ) {
        this.inputs.splice( source.position, 1 );
        
        return source.more;
      }
      
      // ToDo: return whether this transaction is closed and the input
      
      return false;
    }, // Output_Transaction..remove_destination()
    
    // ToDo: Document Output_Transaction..terminate()
    // Returns inputs for which transactions were terminated
    terminate: function() {
      var source = this.source, inputs = this.inputs, id = this.id
        , name = de && this._get_name( 'terminate' )
        , terminated_inputs = []
      ;
      
      // ToDo: provide tests for transaction termination
      if ( inputs.length ) {
        de&&ug( name + id );
        
        var i = -1, input_transactions;
        
        // this is the end of a transaction at this source
        
        // terminate this transaction for all destination inputs except those which are set to send data
        // as marked by a non-zero source_subscriber_index
        while ( input_transactions = inputs[ ++i ] ) {
          // Remove source from input.transactions
          var s = input_transactions.remove( id, source ); // ToDo: use this instead of source
          
          if ( s && ! s.more ) {
            terminated_inputs.push( input );
            
            // ToDo: this needs to move out of this method back into caller's code
            // input.add( [], options );
            
            continue;
          }
          
          // There is a bug, possibly in transaction.add_destination()
          exception( // Does not throw but reports exception, ToDo: make this an error trace
            new Error( 'Expected to find this source as a source_transaction' ),
            'Output_Transaction..terminate()'
          );
        } // for all destination inputs for which this transaction was started
      }
      
      return terminated_inputs;
    }, // Output_Transaction..terminate()
    
    remove_source: function( s ) {
      this.inputs.splice( s.position, 1 );
      
      // ToDo: what if this is the last one
      
      return this;
    } // Output_Transaction..remove_source()
  } ); // Output_Transaction instance attributes
  
  var Output_Transactions_id = 1000; // Start at 1000 to ease traces
  
  function Output_Transactions() {
    this.id = ++Output_Transactions_id; // Locally unique identifier for this output
    this.transactions = Dictionary();
  }
  
  Root.subclass( Output_Transactions, {
    /* ------------------------------------------------------------------------
       get_concurrent_options( input, [ options ] )
       
       Get output options for an input from options, with 'more' possibly added
       to transaction Object if there are other concurent source outputs that
       have not terminated the same transaction at that input.
       
       This is used when there are concurrent pipelets in the graph that handle
       operations concurently, allowing the synchronization of all 
       
       Parameters:
       - input (Input_Transactions): input to get options for
       
       - options (optional Object): output options before taking into account
         destination inputs and possible graph diamonds
       
       Returns:
       - options (Object): output options with more possibly added to
         transaction Object
    */
    get_concurrent_options: function( input, o ) {
      if ( ! input.tag ) return o; // There are no concurrent transaction at the target input
      
      var t = o && o._t
        , tid = t && t.tid
        , transaction
      ;
      
      if ( tid ) {
        // ToDo: add tests
        
        // Get or create output transaction for transaction_id
        transaction = this.get( tid );
        
        // Add destination input if not already added
        transaction.add_destination( input, t.forks );
        
        if ( ! t.more ) {
          // This is the end of this transaction at this branch
          // But this transaction may have several branches
          // We need to know if this is the last branch closing this transaction
          var more = transaction.remove_destination( input );
          
          if ( transaction.is_empty() ) delete this.transactions[ tid ];
          
          if ( more ) {
            // There are more branches which haven't closed this transaction
            
            // Make a deep copy of options, then add more to transaction Object
            o = extend_2( {}, o );
            
            ( o._t = extend_2( {}, t ) ).more = true; // Don't close this transaction just yet
          }
        }
      }
      
      return o;
    }, // get_concurrent_options()
    
    /* ------------------------------------------------------------------------
       get: function( transaction_id )
       Get or create an output transaction for transaction_id
       
       Parameters:
       - transaction_id (String)
       
       Returns:
       - transaction (Output_Transaction): managing inputs per transaction ids
    */
    get: function( tid ) {
      var transactions = this.transactions;
      
      return transactions[ tid ] || ( transactions[ tid ] = new Output_Transaction( tid, this ) );
    }, // get()
    
    /*
    remove_destination: function( tid, input, forks ) {
      var transactions = this.transactions
        , transaction  = this.get( tid ).add_destination( input, t.forks )
      ;
      
      transaction.remove_destination( input );
      
      if ( transaction.is_empty() ) delete transactions[ tid ];
      
      return this;
    }, // remove_destination()
    */
    
    // Returns inputs for which transactions were terminated
    /*
    terminate: function( tid, options ) {
      var transactions = this.transactions
        , transaction  = transactions[ tid ]
      ;
      
      if ( transaction ) {
        delete transactions[ tid ];
        
        return transaction.terminate( options );
      }
      
      return [];
    }, // terminate()
    */
    
    // ToDo: docuement remove_source()
    // Called from Input when removing a source to a destination input
    remove_source: function( tid, source ) {
      var transaction = this.transactions[ tid ];
      
      transaction.remove_source( source );
      
      if ( transaction.is_empty() ) delete this.transactions[ tid ];
      
      return this;
    } // remove_source()
  } ); // Output_Transactions instance attributes
  
  /* -------------------------------------------------------------------------------------------
     XS.Options
     
     Operations' Options methods
     
     Because options are optional parameters these can be undefined, therefore Options methods
     are defined in the XS.Options object that provides methods which first parameter is an
     optional options Object.
  */
  
  /* -------------------------------------------------------------------------------------------
     XS.Options.forward( [ options ] )
     XS.options_forward( [ options ] ) deprecated form
     
     Get options that need to be forwarded from optional source options.
     
     At this time the only options that must always be forwarded is the transaction Object _t.
     
     In the future more options might have to be always forwarded, this function will take
     care of these therefore insuring forward compatibility.
     
     At this time options_forward() always returns an object even if there are no source
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
  
  XS.options_forward = options_forward;
  
  XS.Options = {
    forward: options_forward,
    
    /* ------------------------------------------------------------------------
       Options.has_more( options )
       
       Returns truly if there is an incomplete transaction.
    */
    has_more: function( options ) {
      var t = options && options._t;
      
      return t && t.more;
    } // has_more()
  }; // Options methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    'Event_Emitter'      : Event_Emitter,
    'Transactions'       : Transactions,
    'Transaction'        : Transaction,
    'Input_Transactions' : Input_Transactions,
    'Output_Transactions': Output_Transactions
  } );
  
  de&&ug( "module loaded" );
} )( this ); // transactions.js
