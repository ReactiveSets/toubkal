/*
    Copyright (c) 2013-2020, Reactive Sets

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
( 'optimize', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , RS_log       = RS.log
    , log          = RS_log.bind( null, 'optimize' )
    , pretty       = RS.log.pretty
    , get_name     = RS.get_name
    , value_equals = RS.value_equals
    , Pipelet      = RS.Pipelet
    , Options      = RS.Transactions.Options
    , get_tid      = Options.get_tid
    , set_tid      = Options.set_tid
    , push         = [].push
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = false
    , ug = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet optimize( options )
      
      @short Optinizes @@[operations](operation) in @@[transactions](transaction) statelessly
      
      @parameters
      - **options** (Object): optional @@class:Pipelet options:
        - **timeout** (Number): maximum duration, in seconds, for a
          transaction to terminate. If a transaction lasts longer it is
          terminated, an error message is printed, all accumulated
          operations are discarded. Default is no timeout, if a transaction
          does not terminate, its operations are held forever.
        
        - **transactional** (Boolean): if true, optimize is @@transactional,
          it will respond with an empty state [] when fetched.
        
        - **emit_transactions** (Boolean): if true, optimize will force
          option *transactional* to true, and will emit one @@add for
          each transaction with the following attributes:
          
          - **flow** (String): "transactions"
          
          - **id** (String): uuid_v4 of transaction. If none existed, use
            @@class_method:Options.set_tid() to set transaction identifier
          
          - **removes** (Object []): all optimized removed values in the
            transaction.
          
          - **updates** ([ Object, Object ] []): all optimized updates in
            the transaction.
          
          - **adds** (Object []): all optimized added values in the
            transaction.
          
          This can be used to process transactions as an a whole
          that can then be applied using pipelet emit_operations().
      
      @examples
      
      ```javascript
      require( 'toubkal' )
        
        .once( 1 ) // delay 1 milisecond to emit operation after initial fetch
        
        .map( function( _ ) {
          return {
            removes: [
              { id: 1 }, // will be emitted in remove operation
              { id: 2 }  // will not be emitted because it is added back in adds below
            ],
            
            updates: [
              [ { id: 3       }, { id: 4       } ], // will be split into remove { id: 3 } and add { id: 4 } because values identities are different
              [ { id: 5       }, { id: 5       } ], // will be optimized-out because there are no changes
              [ { id: 6, v: 0 }, { id: 6, v: 1 } ]  // will be emitted in an update because it has the same identity and has changes
            ],
            
            adds: [
              { id: 2 }, // not emitted because it is removed in removes above
              { id: 7 }
            ]
          }
        } )
        
        .emit_operations() // emits un-optimized operations from above map
        
        .set_reference( 'operations' )
        
        .optimize() // emit optimized operations
        
        .trace( 'operations', { fetched: false } ).greedy()
        
        .reference( 'operations' )
        
        .optimize( { emit_transactions: true } ) // emit optimized transaction in one add
        
        .trace( 'transactions', { fetched: false } ).greedy()
      ;
      ```
      
      Using:
      - Pipelet once()
      - Pipelet map()
      - Pipelet emit_operations()
      - Pipelet trace()
      - Method Pipelet..set_reference()
      - Method Pipelet..reference()
      
      Which produces the following traces to the console:
      
      ```javascript
      2018/11/23 14:22:34.908 - Trace( operations )..remove(),  {
        "values": [
          {
            "id": 1
          },
          {
            "id": 3
          }
        ],
        "options": {
          "_t": {
            "id": "de3345d1-8eb6-4aa9-9b71-086107f0ce5d",
            "more": true
          }
        }
      }
      ----------------------- + 8 milliseconds -----------------------
      2018/11/23 14:22:34.916 - Trace( operations )..update(),  {
        "values": [
          [
            {
              "id": 6,
              "v": 0
            },
            {
              "id": 6,
              "v": 1
            }
          ]
        ],
        "options": {
          "_t": {
            "id": "de3345d1-8eb6-4aa9-9b71-086107f0ce5d",
            "more": true
          }
        }
      }
      ----------------------- + 2 milliseconds -----------------------
      2018/11/23 14:22:34.918 - Trace( operations )..add(),  {
        "values": [
          {
            "id": 4
          },
          {
            "id": 7
          }
        ],
        "options": {
          "_t": {
            "id": "de3345d1-8eb6-4aa9-9b71-086107f0ce5d"
          }
        }
      }
      2018/11/23 14:22:34.919 - Trace( transactions )..add(),  {
        "values": [
          {
            "flow": "transactions",
            
            "id": "de3345d1-8eb6-4aa9-9b71-086107f0ce5d",
            
            "adds": [
              {
                "id": 4
              },
              {
                "id": 7
              }
            ],
            "removes": [
              {
                "id": 1
              },
              {
                "id": 3
              }
            ],
            "updates": [
              [
                {
                  "id": 6,
                  "v": 0
                },
                {
                  "id": 6,
                  "v": 1
                }
              ]
            ]
          }
        ],
        "options": {
          "_t": {
            "id": "de3345d1-8eb6-4aa9-9b71-086107f0ce5d"
          }
        }
      }
      ```
      
      @description
      This is a @@stateless, @@lazy pipelet.
      
      If is @@asynchronous on @@operations in the middle of a transaction
      and @@synchronous on end-of-transaction operations.
      
      It is fully @@transactional if option *transactional* or option
      *emit_transactions* is used.
      
      This pipelet emits recombined operations at the end of transactions.
      
      For each transaction it emit a maximum of one @@remove, one @@update,
      and one @@add operations in the same transaction, in this order.
      
      If option *emit_transactions* is truly, it emits one @@add operation
      for the entire transaction, with attributes *adds*, *removes*, and
      *updates* containing all operations for that transaction.
      
      To do so, it delays operations in a transaction to consolidate add,
      remove and update operations at the end of each transaction. A remove
      and an add sharing the same @@identity are combined into an update.
      Updates having the same removed and added values are discarded.
      
      If at the end of the transaction there are no changes, it emits nothing
      unless the transaction has fork @@[tags](tag) in which case it emits
      and empty add operation to forward downstream the transaction fork tag.
      
      Also *optimize()*:
      - always emits @@[semantically strict](strict) adds, removes and
        updates corresponding respectfullly to object @@create, object
        @@delete, and object strict @@update events
      
      - does not require prior adds on objects to accept removes and
        updates, which is typical of transactional pipelets that emit
        change events for a database without emitting existing object
        values.
      
      When fetched it provides the state when all transactions are terminated
      in order to provide a state consitent with emitted operations. This
      works as long as upstream pipelets respond synchronously to fetch
      and do not provide transaction-intermediate states.
      
      If option *transactional* or option *emit_transactions* is used, it
      always reponds with an empty set to fetch.
      
      Therefore optimize() makes transactions more atomic, i.e.
      all operations on a transaction are executed synchronously at the end
      of each transaction and fetch() are executed outside of ongoing
      transactions.
      
      It also serializes transactions, i.e. transactions operations are
      applied at the end of each transactions, so nested transactions are
      un-nested using optimize().
  */
  function Optimize( options ) {
    var that = this;
    
    that._input = that._input || new Optimize.Input( that, options.name, options );
    
    if ( that._emit_transactions = options.emit_transactions ) {
      options.transactional = true;
    }
    
    Pipelet.call( that, options );
  } // Optimize()
  
  Optimize.Input = Pipelet.Input.subclass( 'Optimize.Input',
    function Optimize_Input( p, name, options, input_transactions ) {
      var that    = this
        , timeout = options.timeout
      ;
      
      Pipelet.Input.call( that, p, name, options, input_transactions );
      
      that.transaction_events = {};
      
      if ( timeout ) that.timeout = timeout * 1000;
    }, // Optimize_Input()
    
    function( Super ) { return {
      listen: function( operation, values, options, source ) {
        var that         = this
          , transactions = that.transaction_events
          , events       = []
          , t            = options && options._t
          , tid
          , more
          , timeout
        ;
        
        Super.listen.call( that, operation, values, options, source, 1 /* only_output_listeners */ );
        
        if( t ) {
          more   = t.more;
          tid    = t.id;
          
          events = transactions[ tid ];
          
          if ( ! events ) {
            events = transactions[ tid ] = [];
            
            if ( timeout = more && that.timeout )
              events.timeout = setTimeout( cancel, timeout );
          }
        }
        
        values.length && events.push( [ operation, values ] );
        
        if( ! more ) {
          if( tid ) delete transactions[ tid ];
          
          timeout = events.timeout;
          
          timeout && clearTimeout( timeout );
          
          emit( events )
        }
        
        function cancel() {
          // ToDo: emit error
          log( get_name( that, 'listen' )
            + 'error, transaction cancelled on timeout:', t
            , ', operations:\n  ', pretty( events )
          );
          
          delete transactions[ tid ];
          
          // allow tagged transactions to progress
          emit( [ [ 0, [] ] ] )
        }
        
        function emit( events ) {
          that.pipelet._add( [ { id: tid, events: events } ], options )
        }
      } // listen()
    } } // Optimize.Input() instance methods
  ); // Optimize.Input
  
  Pipelet.Build( 'optimize', Optimize, {
    _add: function( values, options ) {
      var that         = this
        , events       = values[ 0 ].events
        , adds         = {} // for all identities, all adds
        , removes      = {} // for all identities, all removes
        , updates      = []
      ;
      
      // Organize all operations by value identity
      events.forEach( function( event ) {
        var values = event[ 1 ];
        
        switch(  event[ 0 ] /* operation */ ) {
          case 0: // add
            values.forEach( function( v ) {
              var id = that._identity( v );
              
              ( adds[ id ] = adds[ id ] || [] ).push( v );
            } );
          break;
          
          case 1: // remove
            values.forEach( function( v ) {
               var id = that._identity( v );
               
               ( removes[ id ] = removes[ id ] || [] ).push( v );
            } );
          break;
          
          case 2: // update
            // split updates into removes and adds, these will be recombined later if they have the same identity
            values.forEach( function( update ) {
              var remove    = update[ 0 ]
                , add       = update[ 1 ]
                , remove_id = that._identity( remove )
                , add_id    = that._identity( add )
              ;
              
              ( adds   [ add_id    ] = adds   [ add_id    ] || [] ).push( add    );
              ( removes[ remove_id ] = removes[ remove_id ] || [] ).push( remove );
            } );
          break;
        }
      } );
      
      /*
        For each remove:
          - locate adds with the same identity
          - discard equal adds
          - make updates
          - then flat map remaining removes into removed values
      */
      removes = Object.keys( removes ).reduce( function( out, id ) {
        var removed = removes[ id ]
          , added   = adds[ id ]
          , al      = added && added.length
        ;
        
        if ( al ) {
          // Discard equal removed and added values
          removed = removed.filter( function( remove ) {
            for( var i = -1; ++i < al; ) {
              if( value_equals( remove, added[ i ] ) ) {
                // Discard this remove and add because they have the same value
                added.splice( i, 1 );
                
                --al;
                
                return false;
              }
            }
            
            return true;
          } );
          
          // make updates for all remaining removed and added value couple
          while( removed.length && added.length )
            updates.push( [ removed.shift(), added.shift() ] )
          ;
          
          // Discard these adds if empty
          if( !added.length ) delete adds[ id ];
        }
        
        // flat map remaining removes into removed values
        push.apply( out, removed );
        
        return out;
      }, [] );
      
      // Flat map adds added values
      adds = Object.keys( adds ).reduce( function( out, id ) {
        push.apply( out, adds[ id ] );
        
        return out;
      }, [] );
      
      that._emit_transactions
        ?
          // Emits optimized operations in a single add
          that.__emit( 'add', [ {
            flow   : 'transactions',
            id     : get_tid( options = set_tid( options ) ),
            adds   : adds,
            removes: removes,
            updates: updates
          } ], options )
        
        :
          // Emits optimized adds, removes and updates into a transaction
          that.__emit_operations( adds, removes, updates, options );
    } // _add()
  } ); // optimize() instance methods
  
  return rs;
} ); // optimize.js
