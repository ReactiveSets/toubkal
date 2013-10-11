/*  lib/socket_io_crossover.js
    
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
    log( "xs socket_io_crossover, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     Socket_IO_Crossover( socket [, options] )
  */
  function Socket_IO_Crossover( socket, options ) {
    var that = this;
    
    this.disconnected = true;
    
    this.emit_queue = [];
    
    this.fetch_id = 0;
    this.fetch_receivers = [];
    
    this.socket = socket
      
      .on( 'xs_fetch', function( data ) {
        de&&ug( 'received xs_fetch: ' + log.s( data ) );
        
        var id = data.id;
        
        that._fetch_source( function( values, no_more ) {
          that.send( 'xs_fetched_values', { id: id, values: values, no_more: no_more } );
        }, data.options )
      } )
      
      .on( 'xs_fetched_values', function( data ) {
        de&&ug( 'received xs_fetched_values: ' + log.s( data ) );
        
        var id = data.id
          , receiver = that.fetch_receivers[ id ]
        ;
        
        if ( receiver ) {
          var no_more = data.no_more;
          
          if ( no_more ) delete that.fetch_receivers[ id ];
          
          receiver( data.values, no_more );
        } else {
          log( 'error, Socket_IO_Crossover(), received xs_fetched_values with id: ' + id + ', having no matching receiver' ) 
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
      
      // Query Dataflow Events
      .on( 'xs_query_add', function( data ) {
        de&&ug( 'received xs_query_add: ' + log.s( data ) );
        
        that.source.query_add( data.values, data.options );
      } )
      
      .on( 'xs_query_remove', function( data ) {
        de&&ug( 'received xs_query_remove: ' + log.s( data ) );
        
        that.source.query_remove( data.values, data.options );
      } )
      
      .on( 'xs_query_update', function( data ) {
        de&&ug( 'received xs_query_update: ' + log.s( data ) );
        
        that.source.query_update( data.updates, data.options );
      } )
      
    ;
    
    return Pipelet.call( this, options );
  } // Socket_IO_Crossover()
  
  Pipelet.subclass( Socket_IO_Crossover, {
    connect: function() {
      if ( this.disconnected ) {
        this.disconnected = false;
        
        var q = this.emit_queue
          , l = q.length
          , s = this.socket
          , emit = s.emit
        ;
        
        de&&ug( 'connect, emit ' + l + ' queued operations' );
        
        for ( var i = -1; ++i < l; ) {
          emit.apply( s, q[ i ] ); 
        }
        
        this.emit_queue = [];
      }
      
      return this;
    }, // connect()
    
    disconnect: function() {
      de&&ug( 'disconnect' );
      
      this.disconnected = true;
      
      return this;
    }, // connect()
    
    close: function() {
      // terminate all pending fetches
      // ToDo: this may not be enough, as this could leave the system in an incomplete state
      // and might require more cleanup.
      for ( var id = -1, l = this.fetch_id; ++id < l; ) {
        var receiver = this.fetch_receivers[ id ];
        
        receiver && receiver( [], true );
      }
    }, // close()
    
    send: function( method, data ) {
      if ( this.disconnected ) {
        de&&ug( 'emit queue, push: "' + method + '", ' + log.s( data ) );
        
        this.emit_queue.push( [ method, data ] );
      } else {
        de&&ug( 'emit: "' + method + '", ' + log.s( data ) );
        
        this.socket.emit( method, data );
      }
      
      return this;
    }, // send()
    
    fetch: function( receiver, options ) {
      var id = ++this.fetch_id;
      
      this.fetch_receivers[ id ] = receiver;
      
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
    }, // clear()
    
    // Query Operations
    query_add: function( values, options ) {
      return this.send( 'xs_query_add', { values: values, options: options } );
    }, // add()
    
    query_remove: function( values, options ) {
      return this.send( 'xs_query_remove', { values: values, options: options } );
    }, // remove()
    
    query_update: function( updates, options ) {
      return this.send( 'xs_query_update', { updates: updates, options: options } );
    } // update()
  } ) // Socket_IO_Crossover instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Socket_IO_Crossover' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // lib/socket_io_crossover.js
