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
  
  var RS         = rs.RS
    , extend_2   = RS.extend._2
    , Compose    = RS.Pipelet.Compose
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
     updates downstream using f() to generate new values.
     
     Source: a dataflow with a single current value which is the last value that will be
     updated by f() on triggers.
     
     Parameters:
     - trigger: a dataflow of events (adds only)
     
     - f( source_value, trigger_value ): a function altering a next source value and a new
       trigger value using this next source value. Both the source_value and trigger_value
       are shallow-cloned Objects.
     
     - options (Object): Compose options.
     
     Example:
     
     source.next( trigger, function( source, trigger ) {
       if ( trigger.issue_number ) {
         // this is a conflict resolution
       }
       
       trigger.issue_number = source.last_issue += 1;
     } )
  */
  Compose( 'next', function( source, trigger, f, options ) {
    var output = new Pipelet();
    
    var source_flow = null
      , triiger_flow = null
      , error_filter = rs.set()
    ;
    
    source
      .filter( error_filter )
      .greedy()
      ._on( 'add', function( errors ) {
        // ToDo handle duplicates errors
      } )
    ;
    
    source = source.unique_set( { silent: true } );
    
    trigger = trigger.greedy();
    
    trigger._on( 'add', function( trigger_values, options ) {
      var source_value = source.fetch_all()[ 0 ];
      var trigger_value = trigger_values[ 0 ];
      
      if ( source_value && trigger_value ) {
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
          
          error_filter._add( [ { flow: error, error_flow: source_flow } ] );
        }
        
        // Add filter term to get errors for triggers
        if ( new_trigger_value.flow && ! trigger_flow ) {
          trigger_flow = new_trigger_value.flow;
          
          error_filter._add( [ { flow: error, error_flow: trigger_flow } ] );
        }
        
        // ToDo: do all updates in a transaction
        output._remove( [ source_value ] );
        output._add( [ next_source_value ] );
        
        output._add( [ new_trigger_value ] );
      }
    } );
    
    return output;
  } ); // next()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // next.js
