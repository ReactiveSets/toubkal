/* to_live.js
   ----------

   Pipelets to_live(), to_live_array(), to_live_object()

   Copyright (c) 2022 ReactiveSets, all rights reserved.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'to_live', [ './pipelet' ], function( rs ) {
  'use strict';
  
  rs
    /* ------------------------------------------------------------------------
       @pipelet to_live( add, remove, update, options )
       
       @short calls add() and remove() from source operations
       
       @parameters
       - **add( identity, value )** (Function) optional:
         - **identity( value )** (Function): source identity method, see
           description bellow for more information
         - **value** (Object): source value added
       - **remove( identity, value )** (Function) optional:
         - **identity( value )** (Function): source identity method, see
           description bellow for more information
         - **value** (Object): source value removed
       - **update( identity, update )** (Function) optional: defaults
         to remove followed by add:
         - **identity( value )** (Function): source identity method, see
           description bellow for more information
         - **update** (Array): source @@update
       
       @description
       This is a @@stateless, @@synchronous @@pipelet\.
       
       It is @@lazy if query_transform() option is defined, @@greedy otherwise.
       See pipelet map() for more information on query_transform() option.
       
       It emits the same values as received.
       
       Functions add() and remove() are called each time a value is added,
       removed, or updated, in which case the function\ remove() is first
       called, then function\ add() is called.
       
       The first parameter to add() and remove() functions is the identity()
       function. It returns the value of source identity
       method Pipelet.._identity() stripped of the leading ```'#'```.
       
       ### See Also
       - Pipelet to_live_array()
       - Pipelet to_live_object()
       - Method Pipelet.._identity()
    */
    .Compose( "to_live", function( source, add, remove, update, options ) {
      add    = add    || nil;
      remove = remove || nil;
      update = update || _update;
      
      var api        = source.api
        , operations = [ add, remove, update ]
      ;
       
      api.fetch( rx, [{}] );
      
      api.on( 'add'   , function( values ) { emit( add   , values ) } );
      api.on( 'remove', function( values ) { emit( remove, values ) } );
      api.on( 'update', function( values ) { emit( update, values ) } );
      
      return source;
      
      function _update( identity, update ) {
        remove( identity, update[ 0 ] );
        add   ( identity, update[ 1 ] )
      } // _update()
      
      function rx( values, _, operation ) { emit( operations[ operation || 0 ], values ) }
      
      function emit( operation, values ) {
        values.forEach( function( v ) { operation( identity, v ) } )
      }// emit()
      
      function identity( value ) {
        return source._identity( value ).slice( 1 ) // remove leading #
      }
    } ) // to_live()
    
    /* ------------------------------------------------------------------------
       @pipelet to_live_array( array, options )
       
       @short update live Array from source operations
       
       @parameters
       - **array** (Array): must be defined, at least as an empty array. Will
         receive values from source as they are added, removed, or updated.
       
       @description
       This is a @@stateless, @@synchronous @@pipelet.
       
       Added values are added at the end of the array using
       [Array..push](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push)().
       
       Removed values are spliced out of the array using
       [Array..splice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice)().
       
       Updated values are replaced at the same position in the array,
       but if the previous value is not found, the new value is
       added at the end of the array.
       
       Non-@@strict updates also replace
       the previous value by the new value at the same position in the
       array as the previous value.
       
       ### See Also
       - Pipelet to_live()
       - Pipelet to_live_object()
    */
    .Compose( "to_live_array", function( source, array, options ) {
      return source.to_live( add, remove, update, options )
      
      function add( identity, value ) { array.push( value ) }
      
      function remove( identity, value ) {
        // console.log( 'remove:', value );
        
        var i = find( identity, value );
        
        i != -1 && array.splice( i, 1 )
      } // remove()
      
      function update( identity, update ) {
        // console.log( 'update:', update );
        
        var i = find( identity, update[ 0 ] );
        
        if ( i != -1 )
          // array[ i ] = update[ 1 ]
          array.splice( i, 1, update[ 1 ] )
        else
          add( identity, update[ 1 ] )
      } // update()
      
      function find( identity, value ) {
        var i = identity( value );
        
        return array.findIndex( same_identity );
        
        function same_identity( a ) { return identity( a ) == i }
      } // find()
    } ) // to_live_array()
    
    /* ------------------------------------------------------------------------
       @pipelet to_live_object( object, options )
       
       @short update live Object from source operations
       
       @parameters
       - **object** (Object): must be defined, at least as an empty Object.
         Will receive values from source as they are added or removed,
         identified by source values identities based on source @@key.
         Source @@update\s are treated as @@remove followed by @@add.
         Not found removed values are silently ignored.
       
       @description
       This is a @@stateless, @@synchronous @@pipelet.
       
       It is @@lazy if query_transform() option is defined, @@greedy otherwise.
       See pipelet map() for more information on query_transform() option.
       
       It emits the same values as received.
       
       ### See Also
       - Pipelet to_live()
       - Pipelet to_live_array()
    */
    .Compose( "to_live_object", function( source, object, options ) {
      return source.to_live( add, remove, null, options )
      
      function add   ( identity, value ) { object[ identity( value ) ] = value }
      
      function remove( identity, value ) { delete object[ identity( value ) ] }
    } ) // to_live_array()
  ;
  
  function nil() {}
} )
