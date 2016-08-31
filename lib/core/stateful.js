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
  
  return rs
  
  /* --------------------------------------------------------------------------
      @pipelet cache( options )
      
      @short Stateful and lazy pipelet
      
      @parameters:
      - options:
        - key (Array o Strings): key defining unique values for this cache.
        - pipelet (String): @@stateful pipelet name, default is "unique". other
          possible values are "set", or any other stateful pipelet.
      
      @description:
      Uses pipelet query_updates() to make @@lazy any @@greedy @@stateful
      pipelet.
      
      This is a @@synchronous, @@stateful, @@lazy pipelet.
  */
  .Compose( 'cache', function( source, options ) {
    var rs      = source.namespace()
      , output  = rs.pass_through( options )
      , pipelet = options.pipelet || 'unique'
    ;
    
    return source
      .filter( rs.query_updates( output ), options )
      
      [ pipelet ]()
      
      .union( [ output ] )
    ;
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
