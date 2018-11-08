/*  database.js
    -----------
    
    Application Database
    
    Licence
    
    myapplication database SQL:
    -- ------------------------------------------------------------------------------
    CREATE DATABASE  IF NOT EXISTS `myapplication`;
    USE `myapplication`;
    
    -- ------------------------------------------------------------------------------
    CREATE TABLE `users` (
      `id` binary(16) NOT NULL,
      `email` varchar(255) NOT NULL,
      `timestamp` varchar(32) DEFAULT NULL,
      `first_name` varchar(255) DEFAULT NULL,
      `last_name` varchar(255) DEFAULT NULL,
      `photo` text,
      PRIMARY KEY (`id`),
      UNIQUE KEY `email_UNIQUE` (`email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    
    -- ------------------------------------------------------------------------------
    CREATE TABLE `users_providers` (
      `id` binary(16) NOT NULL,
      `user_id` binary(16) NOT NULL,
      `provider_id` varchar(255) DEFAULT NULL,
      `provider_name` varchar(255) DEFAULT NULL,
      `profile` text,
      PRIMARY KEY (`id`),
      KEY `idx_users_providers_user_id` (`user_id`),
      CONSTRAINT `fk_users_providers_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    
*/
module.exports = function( rs ) {
  'use strict';
  
  /* -------------------------------------------------------------------------------------------
     Timestamp converter
  */
  var timestamp_converter = {
    // JavaScript Date to MySQL VARCHAR
    parse: function( t ) {
      // console.log( 'parse:', t );
      
      return new Date( t ).toISOString(); // e.g. 2018-07-22T14:55:34.000Z
    },
    
    // MySQL VARCHAR to JavaScript Date
    serialize: function( t ) {
      // console.log( 'serialize:', t );
      
      return t && new Date( t );
    }
  };
  
  /* -------------------------------------------------------------------------------------------
     Database Schema
  */
  var schema = rs.set( [
    // This schema set
    { id : 'schema', engine: 'self' },
    
    // users table
    {
      id     : 'users',
      columns: [
        { id: 'id', converter: 'uuid_b16' },
        'email',
        'first_name',
        'last_name',
        'photo',
        { id: 'timestamp', converter: timestamp_converter }
      ]
    },
    
    // users_providers table
    {
      id     : 'users_providers',
      columns: [
        { id: 'id'     , converter: 'uuid_b16' },
        { id: 'user_id', converter: 'uuid_b16' },
        'provider_id', 'provider_name', 'profile'    
      ]
    }
  ] );
  
  /* -------------------------------------------------------------------------------------------
     Database Singleton
  */
  rs.Singleton( 'database', function( source, options ) {
    return source.dispatch( schema, table );
    
    function table( source, options ) {
      var table_name    = this.id
        , key           = this.key || [ 'id' ]
        , engine        = this.engine || 'mysql'
        , debug         = this.debug
        , debug_options = typeof( debug ) == 'object' ? debug: null
        , input
        , table
      ;
      
      input = source
        .flow( table_name )
        
        .debug( debug, table_name + ' in', debug_options )
        
        .remove_destination_with( source )
      ;
      
      switch( engine ) {
        case 'self':
          table = input.through( schema );
        break;
        
        case 'mysql':
          table = input
            .mysql( table_name, this.columns, {
                mysql   : { database: 'myapplication' }
              , key     : key
            } )
          ;
        break;
      } // switch( engine )
      
      return table
        .debug( debug, table_name + ' out', debug_options )
        
        .set_flow( table_name )
        
        .remove_source_with( source )
      ;
    } // table()
  } );
  
  return (function( schema ){
    var schema_dataflow = rs
      .database()
      
      .flow( 'schema' )
    ;
    
    schema_add( schema_dataflow._output
      
      .on( 'add', schema_add )
      
      .on( 'remove', function( removes ) {
        removes.forEach( function( table ) {
          delete schema[ table.id ];
        } )

        // console.log( 'schema after removes:', schema );
      } )
      
      .on( 'update', function( updates ) {
        updates.forEach( function( update ) {
          delete schema[ update[ 0 ].id ];

          schema[ update[ 1 ].id ] = update[ 1 ];
        } )

        // console.log( 'schema after updates:', schema );
      } )
      
      .fetch_all()
    );
    
    schema_dataflow.greedy();
    
    return schema;
    
    function schema_add( adds ) {
      adds && adds.forEach( function( table ) {
        schema[ table.id ] = table;
      } )

      // console.log( 'schema after adds:', schema );
    } // schema_add()
  } )( {} ); // Get schema
  
}; // module.export
