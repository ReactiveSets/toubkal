/*  client.js
    ---------
    
    Licence
*/
module.exports = function client_handler( source, module, options ) {
  'use strict';
  
  var version = '0.1'
    , rs      = source.namespace()
    , RS      = rs.RS
    , log     = RS.log.bind( null, 'My Application client.js version', version )
  ;
  
  log( 'loaded' );
  
  module.client.handler = client;
  
  function client( source, that, options ) {
    var rs     = source.namespace()
      , client = that.socket
      , socket = client.socket
      , sid    = socket.sid
    ;
    
    log( 'new client, sid:', sid, ' - id:', socket.id, ' - socket.handshake:', socket.handshake );
    
    // ------------------------------------------------------------------------------------------
    // All login strategies
    // ------------------------------------------------------------------------------------------
    var all_login_strategies = source

      .flow( 'login_strategies', { name: 'all_login_strategies' } )
      
      .set() // workaround to never terminating fetch aka blank page of death
    ;
    
    // ------------------------------------------------------------------------------------------
    // Authenticated User
    // ------------------------------------------------------------------------------------------
    // User session from sid
    var user_session = source.filter( [ { flow: 'user_sessions', id: sid } ] );
    
    // User provider from authenticated user session' user id
    var user_provider_by_profile_id = source
      .filter_pick( user_session, { flow: 'users_providers', id: '.user_id' },
        { greedy: true, name: 'user_provider_by_profile_id' }
      )
      
      .set()
    ;
    
    // Authenticated user
    var authenticated_user_by_user_id = user_provider_by_profile_id
      .pick( { flow: 'users', id: '.user_id' }, { name: 'authenticated_user_by_user_id' } )
    ;
    
    // Authenticated user profile
    var user_profile = source
      
      .filter( authenticated_user_by_user_id )

      .set()
      
      // ToDo: rename "profile" dataflow into "authenticated_user"
      .set_flow( 'profile', { name: 'user_profile' } )
    ;
    
    // ------------------------------------------------------------------------------------------
    // Write authorizations
    // ------------------------------------------------------------------------------------------
    // can write
    var can_write = rs
      .union( [] )
    ;
    
    return rs
      .union( [
          all_login_strategies
        , user_profile
      ] )
      
      // .trace( 'client read', { all: true } )
      
      .through( client )
      
      // filter client output by write authorizations
      .filter( can_write, { name: 'can_write-' + sid } )
      
      // .trace( 'through client', { all: true } )
    ;
  } // client()
}; // module.exports
