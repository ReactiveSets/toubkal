/*  lib/socket_io_crossover.js
    
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
  var XS;
  
  if ( typeof require == 'function' ) {
    XS = require( './pipelet.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var xs         = XS.xs
    , log        = XS.log
    , extend_2   = XS.extend_2
    , Pipelet    = XS.Pipelet
    , Query      = XS.Query
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs socket_io_crossover, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     Socket_IO_Crossover( socket [, options] )
     
     ToDo: send errors error dataflow
     ToDo: elaborate Denial of Service mitigation strategies
  */
  function Socket_IO_Crossover( socket, options ) {
    var that = this, input;
    
    this.disconnected = true;
    
    this.emit_queue = [];
    
    this.fetch_id = 0;
    this.fetch_receivers = [];
    
    this.socket = socket
      
      .on( 'xs_fetch', function( data ) {
        de&&ug( 'xs_fetch', data );
        
        var id = data.id; // ToDo: validate id (int), could be checked for increase over previous value
        var query = data.query; // ToDo validate query (Array of Objects) or undefined using Query.validate()
        
        input.__fetch_source( receiver, query );
        
        function receiver( values, no_more ) {
          that.send( 'xs_fetched_values', { id: id, values: values, no_more: no_more } );
        }
      } )
      
      .on( 'xs_fetched_values', function( data ) {
        de&&ug( 'xs_fetched_values', data );
        
        var id = data.id
          , receiver = that.fetch_receivers[ id ]
        ;
        
        if ( receiver ) {
          var no_more = data.no_more;
          
          if ( no_more ) delete that.fetch_receivers[ id ];
          
          // ToDo: provide a context for receiver()
          receiver( data.values, no_more );
        } else {
          log( 'error, Socket_IO_Crossover(), received xs_fetched_values with id: ' + id + ', having no matching receiver' ) 
        }
      } )
      
      .on( 'xs_query', function( data ) {
        de&&ug( 'xs_query', data );
        
        // ToDo: validate data as [ query, query ]
        
        Pipelet.Input.prototype.update_upstream_query.apply( input, data );
      } )
      
      .on( 'xs_add', function( data ) {
        de&&ug( 'xs_add', data );
        
        // ToDo: validate data.values, data.options
        that.__emit_add( data.values, data.options );
      } )
      
      .on( 'xs_remove', function( data ) {
        de&&ug( 'xs_remove', data );
        
        // ToDo: validate data.values, data.options
        that.__emit_remove( data.values, data.options );
      } )
      
      .on( 'xs_update', function( data ) {
        de&&ug( 'xs_update', data );
        
        // ToDo: validate data.updates, data.options
        that.__emit_update( data.updates, data.options );
      } )
      
      .on( 'xs_clear', function( data ) {
        de&&ug( 'xs_clear', data );
        
        // ToDo: validate data.options
        that.__emit_clear( data.options );
      } )
    ;
    
    this._output || ( this._output = new Socket_IO_Crossover.Output( this, 'crossover_out' ) );
    
    Pipelet.call( this, extend_2( { name: 'socket' }, options ) );
    
    input = this._input;
    
    return this;
    
    function ug( method, data ) {
      log( 'xs socket_io_crossover, ' + that._get_name() + ', received ' + method + ': ' + log.s( data ) ); 
    }
  } // Socket_IO_Crossover()
  
  Socket_IO_Crossover.Output = Pipelet.Output.subclass(
    function( p, name ) { Pipelet.Output.call( this, p, name ) }, {
    
    _fetch: function( receiver, query ) {
      var p = this.pipelet, id = ++p.fetch_id;
      
      p.fetch_receivers[ id ] = receiver;
      
      return p.send( 'xs_fetch', { id: id, query: query } );
    }, // _fetch()
    
    update_upstream_query: function( removes, adds ) {
      if ( adds.length || removes.length ) {
        this.pipelet.send( 'xs_query', [ removes, adds ] );
      }
      
      return this;
    } // update_upstream_query()
  } );
  
  Pipelet.subclass( Socket_IO_Crossover, {
    connect: function() {
      if ( this.disconnected ) {
        this.disconnected = false;
        
        var q = this.emit_queue
          , l = q.length
          , s = this.socket
          , emit = s.emit
        ;
        
        de&&ug( this._get_name( 'connect' ) + 'emit ' + l + ' queued operations' );
        
        for ( var i = -1; ++i < l; ) emit.apply( s, q[ i ] ); 
        
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
        de&&ug( this._get_name( 'queue' ) + method + ', ' + log.s( data ) );
        
        this.emit_queue.push( [ method, data ] );
      } else {
        de&&ug( this._get_name( 'send'  ) + method + ', ' + log.s( data ) );
        
        this.socket.emit( method, data );
      }
      
      return this;
    }, // send()
    
    _add: function( values, options ) {
      return this.send( 'xs_add', { values: values, options: options } );
    }, // _add()
    
    _remove: function( values, options ) {
      return this.send( 'xs_remove', { values: values, options: options } );
    }, // _remove()
    
    _update: function( updates, options ) {
      return this.send( 'xs_update', { updates: updates, options: options } );
    }, // _update()
    
    _clear: function( options ) {
      return this.send( 'xs_clear', { options: options } );
    } // _clear()
  } ); // Socket_IO_Crossover instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    'Socket_IO_Crossover': Socket_IO_Crossover
  } );
  
  de&&ug( "module loaded" );
} )( this ); // lib/socket_io_crossover.js
