/*  
  utils.js
  --------
  
  Licence
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'route', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var extend   = rs.RS.extend
    , extend_2 = extend._2
  ;
  
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
    
    /* ------------------------------------------------------------------------
        @pipelet url_route( options )
        
        @short Get url events and parses
        
        @parameters
        - **options** (Object): @@class:Pipelet options, plus:
          - **parse_query_string** (Boolean): for pipelet url_parse().
            Default is *true*.
          
          - **pattern** (String): pattern provided to pipelet url_pattern(),
            MUST define an *id* attribute that matches the *id* of the page.
            Default is ```"#/(:id)"```.
          
          - **attribute** (String): for pipelet url_pattern() from
            pipelet url_parse(). Default is ```"hash"```.
          
          - **segment_name_charset** (String): set of chars allowed in named
            segment for pipelet url_pattern(). Default is
            ```"a-zA-Z0-9_-"```.
          
          - **default_page** (String): when current url does not countain a page
            identifier, default is ```"home"```.
          
          - **flow** (String): default is ```"url_route"```.
        
        @emits
        - **flow** (String): dataflow name, always ```options.flow```.
        
        - **id** (String): Matched url route, default is
          ```options.default_page```.
        
        - all other parsed attributes from pipelet url_parse()
          and pipelet url_pattern() and according to *pattern* option.
        
        @examples
        Using default pattern:
        ```javascript
          // URL: http://localhost/#/homepage?date=desc
          rs.url_route();
        ```
        Output:
        ```javascript
          {
              flow: "url_route"
            , id: "homepage"
            , query: { date: "desc" }
          }
        ```
        
        @description
        This is a @@singleton, @@stateful, @@synchronous pipelet.
        
        It initially emits an add @@operation, then updates on each url
        change event.
        
        For information only, do not rely on this, this pipelet is
        currently built from the following pipelets, in this order:
        - Pipelet url_events()
        - Pipelet url_parse()
        - Pipelet url_pattern()
        - Pipelet map()
        - Pipelet last()
    */
    .Singleton( 'url_route', function( source, options ) {
      options = extend_2(
        {
          pattern           : '#/(:id)',
          parse_query_string: true,
          default_page      : 'home'
          flow              : 'url_route'
        },
        
        options
      );
      
      return source
        
        .namespace()
        
        .url_events()
        
        .url_parse( options )
        
        .url_pattern( options.pattern, options )
        
        .map( function( url ) {
          
          return extend_2( { flow: options.flow, id: options.default_page }, url )
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

