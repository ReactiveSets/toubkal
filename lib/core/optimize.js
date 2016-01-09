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
    , log          = RS.log
    , Pipelet      = RS.Pipelet
    , Set          = RS.Set
    , Transactions = RS.Transactions
    , Transaction  = Transactions.Transaction
    , has_more     = Transactions.Options.has_more
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = de && log.bind( null, 'optimize' );
  
  /* -------------------------------------------------------------------------------------------
     optimize( options )
  */
  function Optimize( options ) {
    this._output || ( this._output = new Optimize.Output( this, options && options.name ) );
    
    // ToDo: don't use Set(), use lazy stateful pipelet and a hash to optimize emits
    Set.call( this, [], options );
  } // Optimize()
  
  Optimize.Output = Set.Output.subclass(
    'Optimize.Output',
    
    function Optimize_Output( p, name ) {
      this.state = {};
      
      Set.Output.call( this, p, name );
    }, function Optimize_Output_prototyper( Super ) {
      
      var equals = RS.value_equals;
      
      return {
        /* ------------------------------------------------------------------------
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
        
        /* ------------------------------------------------------------------------
           emit( event_name, values, options )
           
           Emit output events.
        */
        emit: function( event_name, values, options ) {
          if ( has_more( options ) ) return this;
          
          var that  = this
            , p     = this.pipelet
            , state = {}
          ;
          
          p.a.forEach( function( v ) {
            state[ p.make_key( v ) ] = v;
          } );
          
          // Calculate differences
          var adds = [], removes = [], updates = [];
          
          // Find adds, values in state not present in this.state
          // and updates, values present in both but different
          Object.keys( state ).forEach( function( id ) {
            var old_value = that.state[ id ]
              , new_value = state[ id ]
            ;
            
            old_value
              ? equals( old_value, new_value ) || updates.push( [ old_value, new_value ] )
              : adds.push( new_value )
            ;
          } );
          
          // Find removes, values in this.state no-longer present in state
          Object.keys( this.state ).forEach( function( id ) {
            state[ id ] || removes.push( that.state[ id ] );
          } );
          
          de&&ug( 'emit(), state:', state, ', adds:', adds, ', removes:', removes, ', updates:', updates );
          
          this.state = state;
          
          var operations =
                ( removes.length && 1 ) +
                ( updates.length && 1 ) +
                ( adds   .length && 1 )
          ;
          
          if ( operations ) {
            var t = new Transaction( operations, options );
            
            de&&ug( 'emit(), operations:', operations, ', transaction:', t );
            
            removes.length && Super.emit.call( this, 'remove', removes, next_options() );
            updates.length && Super.emit.call( this, 'update', updates, next_options() );
            adds   .length && Super.emit.call( this, 'add'   , adds   , next_options() );
            
            t.end()
          } else if ( options && options._t && options._t.forks ) {
            // Fork tags must always be forwarded even if there is nothing to do here
            Super.emit.call( this, 'add', [], options );
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
