/*  
  common-widgets.js
  -----------------
  
  Licence
  
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'common-widgets', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var extend = rs.RS.extend;
  
  return rs
    
    /*-------------------------------------------------------------------------
      @pipelet content_editable( options )
      
      @short Make a DOM element editable
      
      @source
      Must be a dataflow of DOM elements.
      
      @emits new content
      
      @parameters
      - options (Object):
    
    */
    .Compose( '$content_editable', function( $nodes, options ) {
      var $elems = $nodes
        
        .alter( function( _ ) {
          _.$node.setAttribute( 'contenteditable', true );
          _.$node.setAttribute( 'class', 'content-editable' );
        } )
        
        .greedy()
      ;
      
      // emits new value when pressing Enter key
      $elems
        .$on( 'keypress' )
        
        .map( function( _ ) {
          var $e = _.$event;
          
          if( $e.key == 'Enter' && !$e.ctrlKey && !$e.shiftKey && !$e.altKey )
            $e.target.blur()
          ;
        } )
      ;
      
      return $elems
        .$on( 'blur' )
        
        .map( function( _ ) {
          var previous_content = _.content
            , new_content      = _.$event.target.innerText
          ;
          
          if( new_content && new_content != previous_content ) {
            return extend( {}, _, { content: new_content } );
          }
        } )
      ;
    } ) // $content_editable()
    
    /*-------------------------------------------------------------------------
      @pipelet strategies_or_profile( options )
      
      @short Passport client authentication
      
      @source
      Must be directly connected to the server with no cache.
      
      @description
      Gets passport login strategies and build an authentication menu
      
      @emits
      - user: if user is logged-in
      - strategies: if not logged-in
      
      @parameters
      - options (Object):
        - strategies_flow(String): the passport login strategies flow name,
          default is 'login_strategies'
        - user_flow      (String): the authenticated user flow name, default
          is 'profile'
      
      @examples
      ```javascript
        rs
          .socket_io_server()
          
          .strategies_or_profile( { user_flow: 'users', strategies_flow: 'login_strategies' } )
          
          .map( function( v ) {
            var o = {};
            
            if( v.flow === 'authenticated_user' ) {
              // if it's authenticated -> display first/last name
              return { tag: 'div', id: v.id, content: v.first_name + ' ' + v.last_name }
            } else {
              // display login strategies
              
              v.content.map( function( c ) {
                return { tag: 'div', id: c.id, content: 'Login with ' + c.display_name }
              } );
            }
          } )
          
          .$to_dom()
        ;
      ```
    */
    .Compose( 'strategies_or_profile', function( server, options ) {
      var rs              = server.namespace()
        , strategies_flow = options && options.strategies_flow || 'login_strategies'
        , user_flow       = options && options.user_flow       || 'profile'
      ;
      
      return server
        .filter( [ { flow: user_flow }, { flow: strategies_flow } ] )
        
        .group( function() {
          return { id: 1 }
        } )
        
        .map( function( _ ) {
          var content = _.content
            , strategies = _.content.filter( function( v ) { return v.flow === 'login_strategies' } )
            , profile    = _.content.filter( function( v ) { return v.flow === 'profile'          } )
          ;
          
          return profile.length ? profile[ 0 ] : { id: strategies_flow, flow: strategies_flow, strategies: strategies }
        }, { _t_postfix: 'strategies_or_profile' } )
        
        .cache( { synchronizing: rs.socket_io_synchronizing() } )
        
        .pass_through( { tag: 'synchronizing' } )
      ;
    } ) // strategies_or_profile()
  ;
} );
