/*  optimize.js
    
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
( 'optimize', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , log          = RS.log.bind( null, 'optimize' )
    //, extend_2     = RS.extend._2
    , value_equals = RS.value_equals
    , Pipelet      = RS.Pipelet
    //, Greedy       = RS.Greedy
    , Transaction  = RS.Transactions.Transaction
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
      
      @parameters:
      - options (Object): optional @@class:Pipelet options
      
      @description:
      This pipelet emits recombined operations at the end of transactions.
      For each transaction it emit a maximum of one @@remove, one @@update,
      and one @@add operations in the same transaction, in this order.
      
      To do so, it delays operations in a transaction to consolidate add,
      renove and update operations at the end of each transaction. A remove
      and an add sharing the same @@identity are combined into an update.
      Updates having the same removed and added values are discarded.
      
      All removed values, if any, are first enitted in a @@remove operation,
      followed by all updated values, if any, in an @@update operation,
      followed by all added values, if any, in an @@add operation that
      terminates the emitted transaction.
      
      If at the end of the transaction there are no changes, it emits nothing
      unless the transaction has fork @@[tags](tag) in which case it emits
      and empty add operation to forward downstream the transaction fork tag.
      
      This is a @@stateless, @@lazy, @@transactional pipelet. It is
      @@asynchronous on @@operations in the middle of a transaction and
      @@synchronous on end-of-transaction operations.
      
      It is @@transactional because:
      - it always emits @@[semantically strict](strict) adds, removes and
        updates corresponding respectfullly to object @@create, object
        @@delete, and object strict @@update events
      - it does not require prior adds on objects to accept removes and
        updates, which is typical of transactional pipelets that emit
        change events for a database without emitting existing object
        values.
      
      If fetched it returns the state when all transactions are terminated
      in order to provide a state consitent with emitted operations. This
      works as long as upstream pipelets respond synchronously to fetch.
      
      Therefore optimize() makes transactions more atomic, i.e.
      all operations on a transaction are executed synchronously at the end
      of each transaction and fetch() are executed outside of ongoing
      transactions.
      
      It also serializes transactions, i.e. transactions operations are
      applied at the end of each transactions, so nested transactions are
      un-nested by optimize().
      
      Todos:
      - ToDo: optimize() implement delayed fetches
      - ToDo: add tests for optimize()
  */
  function Optimize( options ) {
    var that = this;
    
    that._output || ( that._output = new Optimize.Output( that, options && options.name ) );
    
    Pipelet.call( that, options );
  } // Optimize()
  
  Optimize.Output = Pipelet.Output.subclass(
    'Optimize.Output',
    
    function Optimize_Output( p, name ) {
      var that = this;
      
      that.transactions_events = {};
      
      Pipelet.Output.call( that, p, name );
    }, function Optimize_Output_prototyper( Super ) {
      
      var super_emit = Super.emit;
      
      return {
        /* --------------------------------------------------------------------
           emit( event_name, values, options )
           
           Emit optimized events.
        */
        emit: function( event_name, values, options ) {
          var that         = this
            , transactions = that.transactions_events
            , events       = []
            , t            = options && options._t
            , tid
            , more
          ;
          
          if( t ) {
            more   = t.more;
            tid    = t.id;
            events = transactions[ tid ] = transactions[ tid ] || [];
          }
          
          events.push( [ event_name, values ] );
          
          if( more ) return that;
          
          if( tid ) delete transactions[ tid ];
          
          var p              = that.pipelet
            , adds           = {} // for all identities, all adds
            , removes        = {} // for all identities, all removes
            , updates        = []
          ;
          
          // Organize all operations by value identity
          events.forEach( function( event ) {
            var name   = event[ 0 ]
              , values = event[ 1 ]
            ;
            
            switch( name ) {
              case 'add':
                values.forEach( function( v ) {
                  var id = p._make_key( v );
                  
                  ( adds[ id ] = adds[ id ] || [] ).push( v );
                } );
              break;
              
              case 'remove':
                values.forEach( function( v ) {
                   var id = p._make_key( v );
                   
                   ( removes[ id ] = removes[ id ] || [] ).push( v );
                } );
              break;
              
              case 'update':
                // split updates into removes and adds, these will be recombined later if they have the same identity
                values.forEach( function( update ) {
                  var remove    = update[ 0 ]
                    , add       = update[ 1 ]
                    , remove_id = p._make_key( remove )
                    , add_id    = p._make_key( add )
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
              - then reduce remaining removed values as Array of removed values
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
              if( !added.lemgth ) delete adds[ id ];
            }
            
            // reduce remaining removed values
            push.apply( out, removed );
            
            return out;
          }, [] );
          
          // Reduce adds into array of added values
          adds = Object.keys( adds ).reduce( function( out, id ) {
            push.apply( out, adds[ id ] );
            
            return out;
          }, [] );
          
          that.emit_operations( adds, removes, updates, options );
        }, // emit()
        
        emit_operations: function( adds, removes, updates, options ) {
          // Emit optimized operations
          // ToDo: move this code to Output.emit_operations, will enable to DRY code with Pipelet.__emit_operations()
          var that = this
            , al   = adds   .length
            , rl   = removes.length
            , ul   = updates.length
            , l    = ( rl && 1 ) + ( ul && 1 ) + ( al && 1 )
            , _t
            , t
          ;
          
          de&&ug( 'emit(), adds:', al + ', removes:', rl + ', updates:', ul );
          
          switch( l ) {
            case 0:
              ( _t = options && options._t )
                && _t.forks
                   // Fork tags must always be forwarded even if there is nothing to emit
                && _emit_one( 'add', [] )
              ;
            break;
            
            case 1:
              rl && _emit_one( 'remove', removes );
              ul && _emit_one( 'update', updates );
              al && _emit_one( 'add'   , adds    );
            break;
            
            default:
              t = new Transaction( l, options );
              
              de&&ug( 'emit(), in transaction:', t );
              
              rl && _emit( 'remove', removes );
              ul && _emit( 'update', updates );
              al && _emit( 'add'   , adds    );
              
              t.end();
          }
          
          function _emit_one( operation, values ) {
            super_emit.call( that, operation, values, options )
          } // _emit_one()
          
          function _emit( operation, values ) {
            super_emit.call( that, operation, values, t.next().get_emit_options() )
          } // _emit()
        } // emit_operations()
      } // Optimize.Output prototype Object
    } // Optimize.Output prototype function
  ); // Optimize.Output
  
  Pipelet.Build( 'optimize', Optimize );
  
  /* --------------------------------------------------------------------------
      @_pipelet optimize( options )
      
      @_short Optinizes @@[operations](operation) in @@[transactions](transaction)
      
      @_parameters:
      - options (Object): optional @@class:Pipelet options
      
      @_description:
      This pipelet emits recombined operations at the end of transactions.
      For each transaction it emit a maximum of one @@remove, one @@update,
      and one @@add operations in the same transaction, in this order.
      
      To do so, it calculates differences between the state of the set before
      and after the transaction completes. All removed values, if any, are
      first enitted in a @@remove operation, followed by all updated values,
      if any, in an @@update operation, followed by all added values, if any,
      in an @@add operation that terminates the transaction.
      
      If at the end of the transaction there are no changes, it emits nothing
      unless the transaction has fork @@[tags](tag) in which case it emits
      and empty add operation to forward downstream the transaction fork tag.
      
      This is a @@stateful, @@greedy pipelet. It is @@asynchronous on
      @@operations in the middle of a transaction and @@synchronous on
      end-of-transaction operations.
      
      If fetched it returns the last state at the end of the last terminated
      transaction. Therefore optimize() makes transactions more atomic, i.e.
      all operations on a transaction are executed synchronously at the end
      of each transaction.
      
      It also serializes transactions, i.e. transactions operations are
      applied at the end of each transactions, so nested transactions are
      un-nested by optimize().
      
      See also pipelet optimize_transactional() which is @@stateless and
      @@transactional.
      
      Todos:
      - implement implement anti-state and super-state, workaround: use set() upstream of optimize()
      - add tests for optimize()
  */
  /*
  function Optimize( options ) {
    var that = this;
    
    that._output || ( that._output = new Optimize.Output( that, options && options.name ) );
    
    Greedy.call( that, options );
  } // Optimize()
  
  Optimize.Output = Greedy.Output.subclass(
    'Optimize.Output',
    
    function Optimize_Output( p, name ) {
      var that = this;
      
      that.state               = {};
      that.transactions_events = {};
      
      Greedy.Output.call( that, p, name );
    }, function Optimize_Output_prototyper( Super ) {
      
      var super_emit = Super.emit;
      
      return {
        /* --------------------------------------------------------------------
           fetch_unfiltered( receiver )
           
           Fetches set's current state, possibly in several chunks, unfiltered.
           
           Called by _fetch()
        * /
        fetch_unfiltered: function( receiver ) {
          var state = this.state;
          
          receiver( Object.keys( state ).map( get_value ), true );
          
          function get_value( id ) { return state[ id ] }
        }, // fetch_unfiltered()
        
        /* --------------------------------------------------------------------
           emit( event_name, values, options )
           
           Emit output events.
        * /
        emit: function( event_name, values, options ) {
          var that         = this
            , transactions = that.transactions_events
            , events       = []
            , t            = options && options._t
            , tid
            , more
          ;
          
          if ( t ) {
            more   = t.more;
            tid    = t.id;
            events = transactions[ tid ] = transactions[ tid ] || [];
          }
          
          events.push( [ event_name, values ] );
          
          if ( more ) return that;
          
          if ( tid ) delete transactions[ tid ];
          
          var p              = that.pipelet
            , previous_state = that.state
            , state          = extend_2( {}, previous_state )
            , adds           = []
            , removes        = []
            , updates        = []
          ;
          
          // Apply all events on previous state atomically
          events.forEach( function( event ) {
            var name   = event[ 0 ]
              , values = event[ 1 ]
            ;
            
            switch( name ) {
              case 'add':
                values.forEach( function( v ) {
                  var id = p._make_key( v );
                  
                  if ( state[ id ] ) {
                    // duplicate, ToDo: implement super-state
                    log( 'duplicate', name, id );
                  } else {
                    de&&ug( name, id );
                    
                    state[ id ] = v;
                  }
                } );
              break;
              
              case 'remove':
                values.forEach( function( v ) {
                   var id = p._make_key( v );
                   
                   if ( state[ id ] ) {
                     de&&ug( name, id );
                     
                     delete state[ id ];
                   } else {
                     // not found, ToDo: implement anti-state
                     log( 'not found', name, id );
                   }
                } );
              break;
              
              case 'update':
                values.forEach( function( update ) {
                  var remove = update[ 0 ]
                    , add    = update[ 1 ]
                    , id     = p._make_key( remove )
                  ;
                  
                  if ( state[ id ] ) {
                    // value found
                    de&&ug( name, id );
                    
                    state[ id ] = add;
                  } else {
                    // not found, implement anti-state
                    log( 'not found', name, id );
                  }
                } );
              break;
              
              case 'clear':
                state = {};
              break;
            }
          } );
          
          // Calculate differences
          // Find adds, values in state not present in previous_state
          // and updates, values present in both but different
          Object.keys( state ).forEach( function( id ) {
            var old_value = previous_state[ id ]
              , new_value = state[ id ]
            ;
            
            old_value
              ? value_equals( old_value, new_value ) || updates.push( [ old_value, new_value ] )
              : adds.push( new_value )
            ;
          } );
          
          // Find removes, values in previous_state no-longer present in state
          Object.keys( previous_state ).forEach( function( id ) {
            state[ id ] || removes.push( previous_state[ id ] );
          } );
          
          that.state = state;
          
          // Emit optimized operations
          // ToDo: move this code to Output.emit_operations, will enable to DRY code with Pipelet.__emit_operations()
          var al = adds   .length
            , rl = removes.length
            , ul = updates.length
            , l  = ( rl && 1 ) + ( ul && 1 ) + ( al && 1 )
          ;
          
          de&&ug( 'emit(), state:', Object.keys( state ).length + ', adds:', al + ', removes:', rl + ', updates:', ul );
          
          switch( l ) {
            case 0:
              var t = options && options._t;
              
              t && t.forks
                   // Fork tags must always be forwarded even if there is nothing to emit
                && _emit_one( 'add', [] )
              ;
            break;
            
            case 1:
              rl && _emit_one( 'remove', removes );
              ul && _emit_one( 'update', updates );
              al && _emit_one( 'add'   , adds    );
            break;
            
            default:
              var t = new Transaction( l, options );
              
              de&&ug( 'emit(), in transaction:', t );
              
              rl && _emit( 'remove', removes );
              ul && _emit( 'update', updates );
              al && _emit( 'add'   , adds    );
              
              t.end()
          }
          
          function _emit_one( operation, values ) {
            super_emit.call( that, operation, values, options )
          } // _emit_one()
          
          function _emit( operation, values ) {
            super_emit.call( that, operation, values, t.next().get_emit_options() )
          } // _emit()
        } // emit()
      } // Optimize.Output prototype Object
    } // Optimize.Output prototype function
  ); // Optimize.Output
  
  Greedy.Build( 'optimize', Optimize );
  */
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Optimize': Optimize } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // optimize.js
