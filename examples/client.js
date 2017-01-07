module.exports = function client_handler( source, module, options ) {
  var version = '0.2.1'
    , rs      = source.namespace()
    , RS      = rs.RS
    , log     = RS.log.bind( null, 'client.js version', version )
  ;
  
  log( 'loaded' );
  
  // Set client handler for next connection by a client
  module.client.handler = function client( source, that, options ) {
    var socket = that.socket
      , name   = socket._get_name()
    ;
    
    log( 'new client:', name );
    
    return source
      .trace( 'to ' + name, { all: true } )
      
      .through( socket, options )
    ;
  } // client()
} // client_handler()
