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
        - key (Array of Strings): @@key defining the @@identity of values for
          this cache.
        
        - synchronize (Pipelet): optional, triggers cache resynchronizations
        
        - pipelet (String): @@stateful pipelet name, default is
          ```"unique"```. Other possible values are ```"set"```, or any other
          stateful pipelet.
      
      @description:
      Uses pipelet query_updates() to make @@lazy any @@greedy @@stateful
      pipelet.
      
      This is a @@synchronous, @@stateful, @@lazy pipelet.
      
      ### See Also
      - Pipelet set()
      - Pipelet unique()
      - Pipelet query_updates()
      - Pipelet filter()
  */
  .Compose( 'cache', function( source, options ) {
    var rs          = source.namespace()
      , synchronize = options.synchronize
      , output      = rs.pass_through( options )
      , filter      = source.filter( rs.query_updates( output ), options )
      , input       = synchronize ? filter.union() : filter
      , state       = input[ options.pipelet || 'unique' ]()
    ;
    
    synchronize && synchronize
      .fetch( filter )                // assynchronous
      .fetch( state  )                // synchronous
      .fetched_differences( options ) // synchronous
      .emit_operations()              // synchronous
      //.trace( 'emit differences' )  // synchronous
      .through( input )               // synchronous
    ;
    
    return state.union( [ output ] );
  } ) // cache()
  
  /* --------------------------------------------------------------------------
      @pipelet database_cache( schema, options )
      
      @short Cache for an entire database schema
      
      @parameters:
      - schema (Pipelet): model definitions. Used attributes:
        - id (String): model flow value
        - key (Array of String): optional, default is [ 'id' ]
      
      - options (Object): options for dispatch(), plus:
        - pipelet (String): stateful pipelet name for @@pipelet:cache() pipelet,
          default is "set".
      
      @examples:
      ```javascript
        var server = rs.socket_io_server();
        
        server = server.database_cache( server.flow( 'schema' ) );
      ```
      
      @description:
      Uses pipelet query_updates() and pipelet cache() to deliver
      lazy cache for a database.
      
      This is a @@synchronous, @@stateful, @@lazy pipelet. It is also lazy
      on ```"schema"```.
      
      Lazily creates caches when downstream subscribes to dataflows
      matching a model "id" in the schema set.
  */
  .Compose( 'database_cache', function( source, schema, options ) {
    var rs           = source.namespace()
      , output_query = rs.pass_through()
      , pipelet      = options.pipelet
      , query
      , output
    ;
    
    query = rs
      .query_updates( output_query )
      
      .pick( { id: 'flow' } )
    ;
    
    output = source.dispatch( schema.filter( query ), cache, options );
    
    // Add output_query to dispatcher's union sources
    output._output.pipelet._add_source( output_query );
    
    return output;
    
    function cache( source, options ) {
    
      return source
        
        .cache( { key: this.key || [ 'id' ], pipelet: pipelet } )
        
        .delivers( [ this.id ] )
      ;
    } // cache()
  } ) // database_cache()
} );
