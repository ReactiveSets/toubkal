/*  next.js
    
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
( 'next', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , extend_2     = RS.extend._2
    , Pipelet      = RS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'next' );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet next( trigger, f, options )
      
      @short Update source state on trigger
      
      @description:
        On trigger additions, calls f() to update source dataflow (downstream) and alter
        trigger add.
        
        On errors from source, next() will revert changes to resolve conflicts and generate new
        updates downstream using f() to generate new values. To allow source error recovery,
        source dataflow values must have a flow attribute. Likewise to allow trigger values
        error recovery, trigger values must have a flow attribute set no-later than when calling
        f().
        
        Source: a dataflow with a single current value which is the last value that will be
        updated by f() on triggers.
        
        Parameters:
        - trigger: a dataflow of events (adds only)
        
        - f( source_value, trigger_value ): a function altering a next source value and a new
          trigger value using this next source value. Both the source_value and trigger_value
          are shallow-cloned Objects.
        
        - options (Object): Compose options:
          - fork_tag (String): output fork tag to allow handling of concurrent output transactions
            typically between the trigger dataflow and the source dataflow.
        
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
  rs.Compose( 'next', function( source, trigger, f, options ) {
    var rs                    = source.namespace()
      , output                = rs.pass_through( { fork_tag: options.fork_tag } )
      , source_flow           = null
      , trigger_flow          = null
      , source_errors_filter  = rs.set()
      , trigger_errors_filter = rs.set()
      , fetch_tag             = 'store-fetch'
    ;
    
    // Handle dupplicate errors on source
    source
      .filter( source_errors_filter )
      .adds()
      .map( function( error ) {
        // ToDo: handle duplicates errors on source
      } )
    ;
    
    // Handle duplicate errors on trigger
    source
      .filter( trigger_errors_filter )
      .adds()
      .map( function( error ) {
        // ToDo: finish error handling
        if ( error.operation == 'add' ) { // ToDo: duplicate errors only
          error.values.forEach( function( trigger_value ) {
            // revert add trigger_value
            output._remove( [ trigger_value ] );
            
            // add a new next trigger value
            // ToDo: implement next_trigger downstream
            next_trigger( trigger_value );
          } );
        }
      } ) // on error
    ;
    
    source = source.union();
    
    var source_out = source.unique( [], { tag: fetch_tag } );
    
    var fetched = trigger
      .fetch( source_out )
      //.trace( 'fetched source_out' )
      .map( function( trigger ) {
        var source_value = trigger.values[ 0 ];
        
        if ( source_value ) {
          var trigger_value = trigger.source
            , next_source = extend_2( {}, source_value  )
            , new_trigger = extend_2( {}, trigger_value )
          ;
          
          f( next_source, new_trigger );
          
          // Subscribe to source errors when source flow first provided
          source_flow
            || ( source_flow = source_value.flow )
            && subscribe_errors( source_errors_filter, source_flow );
          ;
          
          // Subscribe to trigger errors when trigger flow first provided
          trigger_flow
            || ( trigger_flow = new_trigger.flow )
            && subscribe_errors( trigger_errors_filter, trigger_flow )
          ;
          
          return {
            source     : source_value,
            trigger    : trigger_value,
            next_source: next_source,
            new_trigger: new_trigger
          };
        }
        
        function subscribe_errors( error_filter, flow ) {
          error_filter._add( [ { flow: 'error', error_flow: flow } ] );
        }
      }, { fork_tag: fetch_tag } )
    ;
    
    // Update local source state synchronously to allow multiple triggers before external feedback as well as offline operation
    fetched.map( function( _ ) { return _.source      } ).revert().through( source );
    fetched.map( function( _ ) { return _.next_source } )         .through( source );
    
    // Update external source and emit trigger in a transaction (using fork tag)
    return rs
      .union( [
        fetched.map( function( _ ) { return _.source      } ).revert(),
        fetched.map( function( _ ) { return _.next_source } ),
        
        fetched.map( function( _ ) { return _.new_trigger } )
          .delay( 30, { fetch: false } )  // prevent foreign key countraint: ToDo: handle this issue at the database layer
      ], { tag: fetch_tag } )
      
      .through( output )
    ;
  } ); // next()
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // next.js
