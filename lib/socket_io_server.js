/*  lib/socket_io_server.js
    
    ----
    
    Copyright (C) 2013, 2014, Connected Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
"use strict";

( function( exports ) {
  var xs                  = XS.xs
    , log                 = XS.log
    , extend              = XS.extend
    , Pipelet             = XS.Pipelet
    , Socket_IO_Crossover = XS.Socket_IO_Crossover
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs socket_io_server, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     source.socket_io_server( [ options ] )
  */
  function Socket_IO_Server( options ) {
    var that = Socket_IO_Server.singleton;
    
    if ( that ) return that;
    
    that = Socket_IO_Server.singleton = this;
    
    var connection = {}
      , address = location.protocol + '//' + location.host
    ;
    
    de&&ug( 'connecting to ' + address );
    
    var socket = io.connect( address )
      .on( 'connect', function() {
        de&&ug( 'received connect' );
        
        connection.state = 'connected'
        
        socket.emit( 'xs_connection', connection );
        
        that.connect();
      } )
      
      .on( 'disconnect', function() {
        de&&ug( 'received disconnect' );

        connection.state = 'disconnected';
        
        that.disconnect();
      } )
      
      .on( 'reconnect', function() {
        de&&ug( 'received reconnect' );
      } )
      
      .on( 'xs_connection', function( _connection ) {
        de&&ug( 'received xs_connection: ' + log.s( _connection ) );
        
        var id = connection.id, _id = _connection.id;
        
        if ( id ) {
          if ( id == _id ) {
            de&&ug( 'this is a reconnexion with the same id' ); 
          } else {
            de&&ug( 'this is a reconnxion with a new id' );
            
            // ToDo: need to reinitialize the client
            // This could be done with a _clear followed by re-fetching all models
            // We could also force a refresh but this would loose unsubmited data
          }
        }
        
        connection = _connection;
        
        connection.state = 'connected';
        
        that.connect();
      } )
    ;
    
    return Socket_IO_Crossover.call( this, socket, options );
  } // Socket_IO_Server()
  
  Socket_IO_Crossover.Build( 'socket_io_server', Socket_IO_Server, {
  } ) // Socket_IO_Server instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Socket_IO_Server' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // lib/socket_io_server.js
