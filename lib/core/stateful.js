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
      
      @parameter options:
        - key (Array o Strings): key defining unique values for this cache.
  */
  .Compose( 'cache', function( source, options ) {
    var rs     = source.namespace()
      , output = rs.pass_through( options )
    ;
    
    return source
      .filter( rs.query_updates( output ), options )
      
      .set()
      
      .union( [ output ] )
    ;
  } ) // cache()
  
  /* --------------------------------------------------------------------------
      @pipelet database_cache( schema, options )
      
      @short Cache for an entire database
      
      @parameters:
        - schema (Pipelet): model definitions. Used attributes:
          - id (String): model flow value
          - key (Array of String): optional, default is [ 'id' ]
        
        - options (Object): options for dispatch()
      
      @example:
        ```javascript
        var server = rs.socket_io_server();
        
        server = server.database_cache( server.flow( 'schema' ) );
        ```
      
      @description:
        This is a @@synchronous, @@stateful, @@lazy pipelet. It is also lazy
        on "schema".
        
        Lazily creates caches when downstream subscribes to dataflows
        matching a model "id" in the schema set.
  */
  .Compose( 'database_cache', function( source, schema, options ) {
    var rs     = source.namespace()
      , output_query = rs.pass_through()
      , query
      , output
    ;
    
    query = rs
      .query_updates( output_query )
      
      .pick( [ [ 'id', 'flow' ] ], { key: [ 'flow' ] } )
      
      .optimize() // This currently does nothing because query updates do not emit transactions
    ;
    
    output = source.dispatch( schema.filter( query ), cache, options );
    
    // Add output_query to dispatcher's union sources
    output._output.pipelet._add_source( output_query );
    
    return output;
    
    function cache( source, options ) {
      var flow = this.id;
      
      return source
        
        .flow( flow, { key: this.key || [ 'id' ] } )
        
        .cache()
        
        .delivers( [ flow ] )
      ;
    } // cache()
  } ) // database_cache()
} );
