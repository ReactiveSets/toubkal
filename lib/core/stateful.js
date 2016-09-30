/*  stateful.js

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
( 'stateful', [ './filter' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , value_equals = RS.value_equals
  ;
  
  return rs
  
  /* --------------------------------------------------------------------------
      @pipelet cache( options )
      
      @short Stateful and lazy pipelet
      
      @parameters:
      - options (Object): optional:
        - key (Array of Strings): @@key of cache values.
        
        - synchronize (Pipelet): optional, triggers cache resynchronizations
        
        - synchronizing (Pipelet): optional, triggers cache resynchronizations
          and receives end-of-synchronization events typically to update the
          state of a pipelet socket_io_state_changes() from
          ```"synchronizing"``` to ```"connected"```.
        
        - pipelet (String): @@stateful pipelet name, default is
          ```"unique"```. Other possible values are ```"set"```, or any other
          stateful pipelet.
      
      @examples:
      - Get notifications changes since last connection to server. Synchronizing
        ```"notifications"``` dataflow in local storage set with server:
        ```javascript
          var notifications = rs
            
            // Define "local_notifications" simgleton to use with cache()
            .Singleton( 'local_notifications', function( source, options ) {
              return source.local_storage( 'notifications', options );
            } )
            
            // Connect to server
            .socket_io_server()
            
            // Subscribe to "notifications" dataflow
            .flow( 'notifications' )
            
            // Start cache using "local_notifications" and synchronize immediately with server
            .cache( { pipelet: 'local_notifications', synchronize: rs.set( [ {} ] } )
            
            // Notifications changes since last connection to server
          ;
        ```
      
      - Resynchronizing ```"users"``` dataflow cache on hard reconnections
        with server using pipelet socket_io_synchronizing():
        ```javascript
          rs
            .socket_io_server()
            
            .flow( 'users' )
            
            // Cache users, synchronized on hard reconnections
            .cache( synchronizing: rs.socket_io_synchronizing() )
            
            // Remove "synchronizing" tag added by rs.socket_io_synchronizing()
            .pass_through( { tag: 'synchronizing' } )
          ;
        ```
      - Combining both immediate synchronization on first connection
        and resynchronizing on hard reconnections:
        ```javascript
          var notifications = rs
          
            // Connect to server
            .socket_io_server()
            
            // Subscribe to "notifications" dataflow
            .flow( 'notifications' )
            
            // Define "local_notifications" simgleton to use with cache()
            .Singleton( 'local_notifications', function( source, options ) {
              return source.local_storage( 'notifications', options );
            } )
            
            // Start cache using "local_notifications" and synchronize immediately with server
            // also resynchronize on hard reconnections with server
            .cache( {
              pipelet      : 'local_notifications',
              synchronize  : rs.set( [ {} ],
              synchronizing: rs.socket_io_synchronizing()
            } )
            
            // Remove "synchronizing" tag added by rs.socket_io_synchronizing()
            .pass_through( { tag: 'synchronizing' } )
            
            // Notifications changes since last connection to server
          ;
        ```
      
      @description:
      Uses pipelet query_updates() to make @@lazy any @@greedy @@stateful
      pipelet.
      
      This is a @@synchronous, @@stateful, @@lazy pipelet.
      
      ### See Also
      - Pipelet database_cache()
      - Pipelet set()
      - Pipelet unique()
      - Pipelet query_updates()
      - Pipelet filter()
      - Pipelet local_storage()
      - Pipelet socket_io_server()
      - Pipelet socket_io_synchronizing()
  */
  .Compose( 'cache', function( source, options ) {
    var rs            = source.namespace()
      , synchronize   = options.synchronize
      , synchronizing = options.synchronizing
      , output        = rs.pass_through( options )
      , filter        = source.filter( rs.query_updates( output ), options )
      , input         = synchronize || synchronizing ? filter.union() : filter
      , state         = input[ options.pipelet || 'unique' ]()
    ;
    
    synchronize && synchronize
      .fetch( filter )                // assynchronous
      .fetch( state  )                // synchronous
      .fetched_differences( options ) // synchronous
      .emit_operations()              // synchronous
      //.trace( 'emit differences', { counts: true } ) // synchronous
      .through( input )               // synchronous
    ;
    
    if( synchronizing ) {
      var differences = synchronizing
        .fetch( filter )                // assynchronous
        .fetch( state  )                // synchronous
        .fetched_differences( options ) // synchronous
      ;
      
      differences
        .emit_operations()              // synchronous
        //.trace( 'emit differences', { counts: true } ) // synchronous
        .through( input )               // synchronous
      ;
      
      remove_branches( state, synchronize ? 2 : 1 );
      
      differences
        .map( function( _ ) { return _.source } )
        
        .through( synchronizing )
      ;
    }
    
    output = state.union( [ output ] );
    
    synchronizing && remove_branches( output = output.pass_through(), 1 );
    
    return output;
    
    function remove_branches( pipelet, count ) {
      // Allow transaction from synchronizing branch to progress
      
      pipelet._input.add_branches( -count );
    } // remove_branches()
  } ) // cache()
  
  /* --------------------------------------------------------------------------
      @pipelet database_cache( schema, options )
      
      @short Cache from a database schema
      
      @parameters:
      - schema (Pipelet): @@dataflow definitions. Used attributes:
        - id (String): model flow value
        - key (Array of String): optional, default is ```[ 'id' ]```
      
      - options (Object): options for pipelet dispatch() and pipelet cache():
        - pipelet (String): stateful pipelet name for @@pipelet:cache()
          pipelet, default is ```"unique"```.
        
        - synchronizing (Pipelet): optional, triggers cache resynchronizations
          and receives end-of-synchronization events typically to update the
          state of a pipelet socket_io_state_changes() from
          ```"synchronizing"``` to ```"connected"```.
      
      @examples:
      - A database cache resynchronizing on hard reconnection from socket.io
      server:
      
      ```javascript
        var server = rs.socket_io_server();
        
        // Get dataflows schema from server
        var schema = server.flow( 'schema' );
        
        // cache from schema, re-syncrhonizing on hard reconnections
        var cached = server
          .database_cache( schema, { synchronizing: rs.socket_io_synchronizing() } )
          
          // Remove "synchronizing" tag added by rs.socket_io_synchronizing()
          .pass_through( { tag: 'synchronizing' } )
        ;
      ```
      
      @description:
      Uses pipelet query_updates() and pipelet cache() to deliver
      lazy cache for a database.
      
      This is a @@synchronous, @@stateful, @@lazy pipelet. It is also lazy
      on ```"schema"```.
      
      Lazily creates caches when downstream subscribes to dataflows
      matching a model "id" in the schema set.
      
      ### See Also
      - Pipelet cache()
      - Pipelet set()
      - Pipelet unique()
      - Pipelet query_updates()
      - Pipelet flow()
      - Pipelet socket_io_server()
      - Pipelet socket_io_synchronizing()
  */
  .Compose( 'database_cache', function( source, schema, options ) {
    var rs            = source.namespace()
      , output_query  = rs.pass_through()
      , pipelet       = options.pipelet
      , synchronizing = options.synchronizing
      , query
      , output
      , gatherer
    ;
    
    query = rs
      .query_updates( output_query )
      
      .pick( { id: 'flow' } )
    ;
    
    output = source.dispatch( schema.filter( query ), cache, options );
    
    // ToDo: document dispatch() gatherer, make it part of the specification
    gatherer = output._output.pipelet;
    
    // Add output_query to gatherer's union sources, prevents adding another union
    output_query.through( gatherer );
    
    // Fix the number of branches that emit concurrent (forked) transactions (at least for synchronizing)
    gatherer._input.add_branches( -1 );
    
    return output;
    
    function cache( source, options ) {
      // ToDo: disconnect from synchronizing on remove
      
      return source
        
        .cache( { key: this.key || [ 'id' ], pipelet: pipelet, synchronizing: synchronizing } )
        
        .delivers( [ this.id ] )
      ;
    } // cache()
  } ) // database_cache()
} );
