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
    , extend_2     = RS.extend._2
    , Pipelet      = RS.Pipelet
    , Set          = RS.Set
    , Transactions = RS.Transactions
    , Transaction  = Transactions.Transaction
    , has_more     = Transactions.Options.has_more
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = false
    , ug = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet optimize( options )
      
      @short Optinizes @@[operations](operation) in @@[transactions](transaction)
      
      @parameters:
      - options (Object): optional @@class:Pipelet options
      
      @description:
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
      
      Todos:
      - don't use Set(), use greedy stateless pipelet
      - implement implement anti-state and super-state
  */
  function Optimize( options ) {
    this._output || ( this._output = new Optimize.Output( this, options && options.name ) );
    
    // ToDo: don't use Set(), use greedy stateless pipelet
    Set.call( this, [], options );
  } // Optimize()
  
  Optimize.Output = Set.Output.subclass(
    'Optimize.Output',
    
    function Optimize_Output( p, name ) {
      this.state               = {};
      this.transactions_events = {};
      
      Set.Output.call( this, p, name );
    }, function Optimize_Output_prototyper( Super ) {
      
      var equals = RS.value_equals;
      
      return {
        /* --------------------------------------------------------------------
           fetch_unfiltered( receiver )
           
           Fetches set's current state, possibly in several chunks, unfiltered.
           
           Called by _fetch()
        */
        fetch_unfiltered: function( receiver ) {
          var _state = this.state
            , state = Object.keys( this.state )
                .map( function( id ) {
                  return _state[ id ];
                 } )
          ;
          
          receiver( state, true );
          
          return this;
        }, // fetch_unfiltered()
        
        /* --------------------------------------------------------------------
           emit( event_name, values, options )
           
           Emit output events.
        */
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
              ? equals( old_value, new_value ) || updates.push( [ old_value, new_value ] )
              : adds.push( new_value )
            ;
          } );
          
          // Find removes, values in previous_state no-longer present in state
          Object.keys( previous_state ).forEach( function( id ) {
            state[ id ] || removes.push( previous_state[ id ] );
          } );
          
          var al = adds   .length
            , rl = removes.length
            , ul = updates.length
          ;
          
          de&&ug( 'emit(), state:', Object.keys( state ).length + ', adds:', al + ', removes:', rl + ', updates:', ul );
          
          that.state = state;
          
          var operations = ( rl && 1 ) + ( ul && 1 ) + ( al && 1 );
          
          if ( operations ) {
            var t = new Transaction( operations, options );
            
            de&&ug( 'emit(), operations:', operations, ', transaction:', t );
            
            rl && Super.emit.call( that, 'remove', removes, next_options() );
            ul && Super.emit.call( that, 'update', updates, next_options() );
            al && Super.emit.call( that, 'add'   , adds   , next_options() );
            
            t.end()
          } else if ( options && options._t && options._t.forks ) {
            // Fork tags must always be forwarded even if there is nothing to do here
            Super.emit.call( that, 'add', [], options );
          }
          
          function next_options() {
            return t.next().get_emit_options()
          }
        } // emit()
      } // Optimize.Output prototype Object
    } // Optimize.Output prototype function
  ); // Optimize.Output
  
  Set.Build( 'optimize', Optimize );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Optimize': Optimize } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // optimize.js
