/*  lib/socket_io_socket.js
    
    ----
    
    Copyright (C) 2013, Connected Sets

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
  var XS;
  
  if ( typeof require == 'function' ) {
    XS = require( './pipelet.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Pipelet    = XS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs socket_io_socket, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     Socket_IO_Socket( socket [, options] )
  */
  function Socket_IO_Socket( socket, options ) {
    var that = this;
    
    this.socket = socket
      
      .on( 'xs_fetch', function( data ) {
        de&&ug( 'received xs_fetch: ' + log.s( data ) );
        
        var id = data.id;
        
        that.fetch( function( values, no_more ) {
          that.send( 'xs_fetched_values', { id: id, values: values, no_more: no_more } );
        }, data.options )
      } )
      
      .on( 'xs_fetched_values', function( data ) {
        de&&ug( 'received xs_fetched_values: ' + log.s( data ) );
        
        var id = data.id
          , receiver = Socket_IO_Socket.fetch_receivers[ id ]
        ;
        
        if ( receiver ) {
          var no_more = data.no_more;
          
          if ( no_more ) delete Socket_IO_Socket.fetch_receivers[ id ];
          
          receiver( data.values, no_more );
        } else {
          log( 'error, Socket_IO_Socket(), received xs_fetched_values with id: ' + id + ', having no matching receiver' ) 
        }
      } )
      
      .on( 'xs_add', function( data ) {
        de&&ug( 'received xs_add: ' + log.s( data ) );
        
        that.emit_add( data.values, data.options );
      } )
      
      .on( 'xs_remove', function( data ) {
        de&&ug( 'received xs_remove: ' + log.s( data ) );
        
        that.emit_remove( data.values, data.options );
      } )
      
      .on( 'xs_update', function( data ) {
        de&&ug( 'received xs_update: ' + log.s( data ) );
        
        that.emit_update( data.updates, data.options );
      } )
      
      .on( 'xs_clear', function( data ) {
        de&&ug( 'received xs_clear: ' + log.s( data ) );
        
        that.emit_add( data.options );
      } )
    ;
    
    return Pipelet.call( this, options );
  } // Socket_IO_Socket()
  
  Socket_IO_Socket.fetch_id = 0;
  Socket_IO_Socket.fetch_receivers = {};
  
  Pipelet.subclass( Socket_IO_Socket, {
    send: function( method, data ) {
      de&&ug( 'emit: "' + method + '", ' + log.s( data ) );
      
      this.socket.emit( method, data );
      
      return this;
    }, // send()
    
    fetch: function( receiver, options ) {
      var id = ++Socket_IO_Socket.fetch_id;
      
      Socket_IO_Socket.fetch_receivers[ id ] = receiver;
      
      return this.send( 'xs_fetch', { id: id, options: options } );
    }, // fetch()
    
    add: function( values, options ) {
      return this.send( 'xs_add', { values: values, options: options } );
    }, // add()
    
    remove: function( values, options ) {
      return this.send( 'xs_remove', { values: values, options: options } );
    }, // remove()
    
    update: function( updates, options ) {
      return this.send( 'xs_update', { updates: updates, options: options } );
    }, // update()
    
    clear: function( options ) {
      return this.socket.emit( 'xs_clear', { options: options } );
    } // clear()
  } ) // Socket_IO_Socket instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Socket_IO_Socket' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // lib/socket_io_socket.js
