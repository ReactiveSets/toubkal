/*  database.js
    -----------
    
    Application Database
    
    Licence
    
    template_database_name database SQL ( SQL script in database.sql ):
    
    CREATE DATABASE  IF NOT EXISTS `template_database_name` 
      DEFAULT CHARACTER SET utf8  
      DEFAULT COLLATE utf8_general_ci
    ;
    
    USE `template_database_name`;

    -- ------------------------------------------------------------------------------
    -- Table: users
    -- ------------------------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS `template_database_name`.`users` (
      `id` BINARY(16) NOT NULL,
      `email` VARCHAR(255) NOT NULL,
      `timestamp` VARCHAR(32) NULL DEFAULT NULL,
      `first_name` VARCHAR(255) NULL DEFAULT NULL,
      `last_name` VARCHAR(255) NULL DEFAULT NULL,
      `photo` TEXT NULL DEFAULT NULL,
      `phone` VARCHAR(32) NULL DEFAULT NULL,
      `zip_code` VARCHAR(32) NULL DEFAULT NULL,
      `city` VARCHAR(255) NULL DEFAULT NULL,
      `settings` TEXT NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE INDEX `email_UNIQUE` (`email` ASC))
    ENGINE = InnoDB
    DEFAULT CHARACTER SET = utf8;

    -- ------------------------------------------------------------------------------
    -- Table: users_providers
    -- ------------------------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS `template_database_name`.`users_providers` (
      `id` BINARY(16) NOT NULL,
      `user_id` BINARY(16) NOT NULL,
      `provider_id` VARCHAR(255) NULL DEFAULT NULL,
      `provider_name` VARCHAR(255) NULL DEFAULT NULL,
      `profile` TEXT NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      INDEX `idx_users_providers_user_id` (`user_id` ASC),
      CONSTRAINT `fk_users_providers_user_id`
        FOREIGN KEY (`user_id`)
        REFERENCES `template_database_name`.`users` (`id`)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION)
    ENGINE = InnoDB
    DEFAULT CHARACTER SET = utf8;

    -- ------------------------------------------------------------------------------
    -- Table: todos
    -- ------------------------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS `template_database_name`.`todos` (
      `id` BINARY(16) NOT NULL,
      `creator_id` BINARY(16) NULL DEFAULT NULL,
      `timestamp` VARCHAR(32) NULL DEFAULT NULL,
      `content` TEXT NULL DEFAULT NULL,
      `complete` INT(11) NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      INDEX `idx_todos_creator_id` (`creator_id` ASC),
      CONSTRAINT `fk_todos_creator_id`
        FOREIGN KEY (`creator_id`)
        REFERENCES `template_database_name`.`users` (`id`)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION)
    ENGINE = InnoDB
    DEFAULT CHARACTER SET = utf8;
    
    
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
    },
    
    // todos table
    {
      id     : 'todos',
      columns: [
        { id: 'id'        , converter: 'uuid_b16' },
        { id: 'creator_id', converter: 'uuid_b16' },
        { id: 'timestamp' , converter: timestamp_converter },
        'text', 'complete'
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
                mysql   : { database: 'template_database_name' }
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
