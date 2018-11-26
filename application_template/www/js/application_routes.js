/*  
  application_routes.js
  ---------------------
  
  Licence
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'application_routes', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var extend   = rs.RS.extend
    , extend_2 = extend._2
  ;
  
  return rs
    /* ---------------------------------------------------------------------------------------------------------------------
        @pipelet application_routes( options )
        
        @short Application page routes
        
        @parameters
        - **options** (Object): @@class:Pipelet options, plus:
        
        @emits
        - **flow** (String): dataflow name = "application_routes".
        
        - **id** (String): page ID that will matched url_route() ID.
        
        - **pipelet_name** (String): pipelet name to call for the matched URL.
        
        - **navigation** (Boolean): optional attribute if page must have a navigation.
        
        @examples
        
        ```javascript
          rs.application_routes()
        ```
        Output:
        ```javascript
          [
            {
                id: 'home'
              , pipelet_name: '$homepage'
              , title: 'Home'
              , navigation: false
              , flow: 'application_routes'
            },
            { 
                id: 'todo_list'
              , pipelet_name: '$todo_list_page'
              , title: 'ToDo list'
              , flow: 'application_routes'
            },
            {
                id: 'signin'
              , pipelet_name: '$signin_page'
              , title: 'Sign-In with Passport'
              , flow: 'application_routes'
            }
          ]
        ```
        
        @description
        This is a @@singleton, @@stateful, @@synchronous pipelet.
        
        It initially defines each application page content.
        
    */
    .Singleton( 'application_routes', function( source, options ) {
      options = extend_2( { flow: 'application_routes' }, options );
      
      return source
        
        .namespace()
        
        .set( [
            {
                id: 'home'
              , pipelet_name: '$todo_list_page'
              , title: 'Home'
              , tag: 'section'
              , attributes: { class: 'todoapp' }
              , navigation: false
            },
            { 
                id: 'todo_list'
              , pipelet_name: '$todo_list_page'
              , title: 'ToDo list'
              , tag: 'section'
              , attributes: { class: 'todoapp' }
            }
          ].map( function( v, i ) {
            return extend( { flow: 'application_routes' }, v, { order: i } );
          } )
        )
      ;
    } ) // application_routes()
  ;
} );

