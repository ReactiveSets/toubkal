/*  
  utils.js
  --------
  
  Licence
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'route', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var extend = rs.RS.extend;
  
  return rs
    /* ---------------------------------------------------------------------------------------------------------------------
    */
    .Singleton( 'application_routes', function( source, options ) {
      return source
        
        .namespace()
        
        .set( [
            {
                id: 'home'
              , pipelet_name: '$homepage'
              , title: 'Home'
              , navigation: false
            },
            { 
                id: 'todo_list'
              , pipelet_name: '$todo_list_page'
              , title: 'ToDo list'
            },
            {
                id: 'signin'
              , pipelet_name: '$signin_page'
              , title: 'Sign-In with Passport'
            }
          ].map( function( v, i ) {
            return extend( { flow: 'application_routes' }, v, { order: i } );
          } )
        )
      ;
    } ) // application_routes()
    
    /* ----------------------------------------------------------------------------------------------
      @pipelet url_route( options )
      
      @short emits current URL route
      
      @description
      Parses urls to extract current page route matching a URL pattern
      
      @emits
      - flow: pipelet dataflow name = 'url_route'
      - id: URL route name matching pattern ( the module name loaded by require() )
      and other attributes regarding URL pattern
      
      @parameters
      - options (Object):
        - pattern             (String): pattern provided to pipelet url_pattern();
          default is '#/(:route)'
        - segment_name_charset(String): set of chars allowed in named segment;
          default is 'a-zA-Z0-9_-'
      
      @examples
      Using default pattern:
      ```javascript
        // URL: http://localhost/#/homepage?date=desc
        rs.url_route();
      ```
      Output:
      ```javascript
        {
            flow: 'url_route'
          , id: 'homepage'
          , query: { date: 'desc' }
        }
      ```
    */
    .Singleton( 'url_route', function( source, options ) {
      var pattern = options.pattern || '#/(:route)';
      
      return source
        .namespace()
        
        .url_events()
        
        .url_parse( { parse_query_string: true } )
        
        .url_pattern( pattern, options )
        
        .map( function( url ) {
          var route = url.route
          
          return { flow: 'url_route', id: route || 'home', query: url.query }
        }, { key: [ 'id' ] } )
        
        .last()
      ;
    } )	// url_route()
    
    /*-------------------------------------------------------------------------
      @pipelet route( options )
      
      @short application routing
      
      @description
      Routes dataflows from source( usually database_cache() ) to different
      application pages
      
      @emits new / update dataflows emitted to server
      
      @parameters
      - url_route              (Pipelet): rs.url_route() output
      - $selector(String/Object/Pipelet): DOM element where to display data
      - options                 (Object): optional object
      
      @source
      Output of database_cache()
    
    */
    .Compose( 'route', function( source, url_route, $selector, options ) {
      var rs = source.namespace();
      
      // application routes
      var application_routes = source
        .namespace()
        
        .application_routes()
      ;
      
      // application page route
      var $page_route = application_routes
        .join( url_route
          , [ 'id' ]
          , function( route, url ) {
              return extend( {}, route, url )
            }
          , { no_filter: true, key: [ 'id' ] }
        )
        
        .alter( function( _ ) {
          _.tag = 'main';
        } )
        
        .$to_dom( $selector )
        
        .optimize()
      ;
      
      return source
        .optimize()
        
        .union( [ application_routes ] )
        
        .dispatch( $page_route, function( source, options ) {
          var page    = this
            , pipelet = source[ page.pipelet_name ]
          ;
          
          return pipelet ? source[ page.pipelet_name ]( page ) : source.namespace();
        } )
      ;
    } ) // route()
  ;
} );

