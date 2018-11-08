/*  
  utils.js
  --------
  
  Licence
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'utils', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var RS = rs.RS
    , extend       = RS.extend
    , add_class    = RS.add_class
    , remove_class = RS.remove_class
    , timestamp    = RS.timestamp_string
  ;
  
  return rs
  
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

