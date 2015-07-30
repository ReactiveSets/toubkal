// chat-app.js

!function( exports ) {
  "use strict";
  
  var rs  = exports.rs
    , RS  = rs.RS
    , log = RS.log
    
    , extend_2 = RS.extend._2
  ;
  
  var de = true, ug = log.bind( null, 'chat application' );
  
  // display chat messages
  var server   = rs.socket_io_server()
    , messages = server.flow( 'chat/chat_message' )
    , user     = get_user()
  ;
  
  messages
    
    .order( [ { id: 'timestamp' } ] )
    
    .trace( 'messages' )
    
    .react( document.querySelector( '#messages' ), function() {
      return React.createElement( 'div', null, this.state.values.map( display_message ) );
      
      function display_message( value ) {
        
        var $timestamp = React.DOM.span( { className: 'timestamp' }, '[' + ( value.timestamp || 'unknown' ) + '] ' )
          , $username  = React.DOM.span( { className: 'username'  }, value.username + ' : '                        )
          , $message   = React.DOM.span( { className: 'message'   }, value.message                                 )
          , className = 'message-container'
        ;
        
        return React.createElement( 'div', { className: className, key: value.id }, $timestamp, $username, $message );
      }
    }, { component_name: 'messages' } )
  ;
  
  // chat form
  rs
    .form( document.querySelector( '#chat-form' )
      , 'chat_form'
      , [
          {
              id   : 'flow'
            , type : 'hidden'
            , value: 'chat/chat_message'
          },
          {
              id   : 'user_id'
            , type : 'hidden'
            , value: user.id
          },
          {
              id   : 'username'
            , type : 'hidden'
            , value: user.name
          },
          {
              id: 'message'
            , type: 'text'
            , style: { field: 'form-control', label: 'control-label', container: 'form-group' }
          }
        ]
      , { clear_after_submit: true, display_button: false } 
    )
    
    .events_metadata()
    
    .trace( 'after form' )
    
    .socket_io_server()
  ;
  
  // manage users using local storage
  function get_user() {
    var user = {};
    
    if( localStorage.length === 0 ) {
      user.id   = RS.uuid.v4();
      user.name = prompt( 'Your name, please', '' );
      
      localStorage.setItem( user.id, user.name );
    } else {
      user.id   = localStorage.key( 0 );
      user.name = localStorage.getItem( user.id );
    }
    
    return user;
  } // get_user()
  
}( this );
