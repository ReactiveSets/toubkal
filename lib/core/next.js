/*  next.js
    
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
( 'next', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , extend_2     = RS.extend._2
    , Pipelet      = RS.Pipelet
    , Compose      = Pipelet.Compose
    , Transactions = RS.Transactions
    , Transaction  = Transactions.Transaction
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'next' );
  
  /* -------------------------------------------------------------------------------------------
     source.next( trigger, f, options )
     
     On trigger additions, calls f() to update source dataflow (downstream) and alter trigger
     add.
     
     On errors from source, next() will revert changes to resolve conflicts and generate new
     updates downstream using f() to generate new values. To allow source error recovery,
     source dataflow values must have a flow attribute. Likewise to allow trigger values
     error recovery, trigger values must have a flow attribute set no-later than after calling
     f().
     
     Source: a dataflow with a single current value which is the last value that will be
     updated by f() on triggers.
     
     Parameters:
     - trigger: a dataflow of events (adds only)
     
     - f( source_value, trigger_value ): a function altering a next source value and a new
       trigger value using this next source value. Both the source_value and trigger_value
       are shallow-cloned Objects.
     
     - options (Object): Compose options.
     
     Example: Auto-Incrementing and assigning an issue number:
     
       source.next( trigger, function( source, trigger ) {
         if ( trigger.issue_number ) {
           // this is a conflict resolution
         }
         
         trigger.issue_number = source.last_issue += 1;
       } )
     
     Error recovery:
     - On source duplicates:
     - On trigger values duplicates:
       - remove previous trigger value, using key that must not include the attribute set by f()
       - add a new next trigger value by calling f() to replce the removed trigger value
  */
  Compose( 'next', function( source, trigger, f, options ) {
    var output = new Pipelet();
    
    var source_flow  = null
      , trigger_flow = null
      , error_filter = rs.set()
    ;
    
    source
      .filter( error_filter )
      
      // ToDo: replace alter() by for_each() once implemented
      .alter( function( error, i, errors, options, caller ) {
        if ( caller !== 'add' ) return;
        
        switch( error.error_flow ) {
          case source_flow:
            // ToDo handle duplicates errors on source
          break;
          
          case trigger_flow:
            if ( error.operation == 'add' ) { // ToDo: duplicate errors only
              error.values.forEach( function( trigger_value ) {
                // revert add trigger_value
                output._remove( [ trigger_value ] );
                
                // add a new next trigger value
                next_trigger( trigger_value );
              } );
            }
          break;
        } // switch error_flow
      } ) // on error
    ;
    
    source = source.unique_set( [], { silent: true } );
    
    trigger = trigger.greedy();
    
    trigger
      .greedy()
      ._on( 'add', function( trigger_values, options ) {
        if ( trigger_values.length ) {
          var source_value = source._output.fetch_all()[ 0 ];
          
          if ( source_value ) {
            return trigger_values.forEach( function( trigger_value ) {
              next_trigger( source_value, trigger_value, options );
            } );
          }
        }
        
        if ( options._t && ! options._t.more ) {
          // this is the end of a previous transaction, notify downstream pipelets
          output._add( [], options );
        }
      } )
    ;
    
    return output;
    
    function next_trigger( source_value, trigger_value, options ) {
      var next_source_value = extend_2( {}, source_value  );
      var new_trigger_value = extend_2( {}, trigger_value );
      
      f( next_source_value, new_trigger_value );
      
      // Create a local loop to the source to garanty that if triggers come at
      // a high rate, we call f() on the next updated source value
      // If / when the source is updated from upstream a second time, the unique
      // set will ignore the duplicate value
      source._remove( [ source_value ] );
      source._add( [ next_source_value ] );
      
      // Add filter term to get errors for source
      if ( source_value.flow && ! source_flow ) {
        source_flow = source_value.flow;
        
        error_filter._add( [ { flow: 'error', error_flow: source_flow } ] );
      }
      
      // Add filter term to get errors for triggers
      if ( new_trigger_value.flow && ! trigger_flow ) {
        trigger_flow = new_trigger_value.flow;
        
        error_filter._add( [ { flow: 'error', error_flow: trigger_flow } ] );
      }
      
      var t = new Transaction( 3, options );
      
      output._remove( [ source_value ]  , t.next().get_emit_options() );
      output._add( [ next_source_value ], t.next().get_emit_options() );
      
      // ToDo: remove timeout once toubkal_mysql implements transactions
      setTimeout( function() {
        output._add( [ new_trigger_value ], t.next().get_emit_options() );
        
        t.end();
      }, 30 );
    } // next_trigger()
  } ); // next()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // next.js
