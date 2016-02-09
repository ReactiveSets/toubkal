/*  socket_io_crossover.js
    
    Copyright (c) 2013-2016, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'socket_io_crossover', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , extend_2 = RS.extend._2
    , Pipelet  = RS.Pipelet
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'socket_io_crossover' ), _ug = ug;
  
  /* --------------------------------------------------------------------------
     Socket_IO_Crossover( socket [, options] )
     
     ToDo: send errors error dataflow
     ToDo: elaborate Denial of Service mitigation strategies
  */
  function Socket_IO_Crossover( socket, options ) {
    var that = this
      , input
    ;
    
    this.disconnected = true;
    
    this.emit_queue = [];
    
    this.fetch_id = 0;
    this.fetch_receivers = [];
    
    this.socket = socket
      
      .on( 'rs_fetch', function( data ) {
        de&&ug( 'rs_fetch', data );
        
        var id = data.id; // ToDo: validate id (int), could be checked for increase over previous value
        var query = data.query; // ToDo validate query (Array of Objects) or undefined using Query.validate()
        
        input._fetch( receiver, query );
        
        function receiver( values, no_more ) {
          that.send( 'rs_fetched_values', { id: id, values: values, no_more: no_more } );
        }
      } )
      
      .on( 'rs_fetched_values', function( data ) {
        de&&ug( 'rs_fetched_values', data );
        
        var id = data.id
          , receiver = that.fetch_receivers[ id ]
        ;
        
        if ( receiver ) {
          var no_more = data.no_more;
          
          if ( no_more ) delete that.fetch_receivers[ id ];
          
          // ToDo: provide a context for receiver()
          receiver( data.values, no_more );
        } else {
          _ug( 'rs_fetched_values() error, received rs_fetched_values with id: ' + id + ', having no matching receiver' ) 
        }
      } )
      
      .on( 'rs_query', function( changes ) {
        de&&ug( 'rs_query', changes );
        
        // ToDo: validate data as [ query, query ]
        
        input.update_upstream_query( changes );
      } )
      
      .on( 'rs_add', function( data ) {
        de&&ug( 'rs_add', data );
        
        // ToDo: validate data.values, data.options
        that.__emit_add( data.values, data.options );
      } )
      
      .on( 'rs_remove', function( data ) {
        de&&ug( 'rs_remove', data );
        
        // ToDo: validate data.values, data.options
        that.__emit_remove( data.values, data.options );
      } )
      
      .on( 'rs_update', function( data ) {
        de&&ug( 'rs_update', data );
        
        // ToDo: validate data.updates, data.options
        that.__emit_update( data.updates, data.options );
      } )
      
      .on( 'rs_clear', function( data ) {
        de&&ug( 'rs_clear', data );
        
        // ToDo: validate data.options
        that.__emit_clear( data.options );
      } )
    ;
    
    Pipelet.call( this, extend_2( { name: 'socket' }, options ) );
    
    input = this._input;
    
    this._output.source = {
      query: null, // Optimized local query by Input.._update_query
      
      update_upstream_query: function( changes ) {
        // Optimize changes
        changes = input._update_query.call( this, changes );
        
        // Send optimized changes
        send_query_update( changes );
      }, // update_upstream_query()
      
      _resubmit_query: function() {
        var q     = this.query
          , query = q && q.query
          , ql    = query && query.length
        ;
        
        de&&ug( that._get_name( 'resubmit_query' ) + 'query terms:', ql );
        
        ql && send_query_update( [ [], query ] );
      }, // _resubmit_query()
      
      _fetch: function( receiver, query ) {
        var id = that.fetch_id++;
        
        that.fetch_receivers[ id ] = receiver;
        
        that.send( 'rs_fetch', { id: id, query: query } );
      } // Socket_IO_Crossover.Output.._fetch()
    }; // Socket_IO_Crossover.Output..source
    
    function send_query_update( changes ) {
      changes[ 0 ].length + changes[ 1 ].length
        && that.send( 'rs_query', changes )
      ;
    } // send_query_update()
    
    function ug( method, data ) {
      _ug( that._get_name( method ) + 'received:', data );
    }
  } // Socket_IO_Crossover()
  
  Pipelet.subclass( 'Socket_IO_Crossover', Socket_IO_Crossover, {
    _resubmit_query: function() {
      this._output.source._resubmit_query();
    }, // _resubmit_query()
    
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
      // Add to queue not acknowledged transmissions
      
      return this;
    }, // connect()
    
    close: function() {
      // terminate all pending fetches
      // ToDo: this may not be enough, as this could leave the system in an incomplete state
      // and might require more cleanup.
      for ( var id = -1, l = this.fetch_id; ++id < l; ) {
        var receiver = this.fetch_receivers[ id ];
        
        if ( receiver ) {
          delete this.fetch_receivers[ id ];
          
          receiver( [], true );
        }
      }
    }, // close()
    
    send: function( method, data ) {
      if ( this.disconnected ) {
        de&&ug( this._get_name( 'queue' ) + method, data );
        
        this.emit_queue.push( [ method, data ] );
      } else {
        de&&ug( this._get_name( 'send'  ) + method, data );
        
        // ToDo: implement retransmission mechanism if not acknowledged before diconnection
        this.socket.emit( method, data );
      }
      
      return this;
    }, // send()
    
    _add: function( values, options ) {
      return this.send( 'rs_add', { values: values, options: options } );
    }, // _add()
    
    _remove: function( values, options ) {
      return this.send( 'rs_remove', { values: values, options: options } );
    }, // _remove()
    
    _update: function( updates, options ) {
      return this.send( 'rs_update', { updates: updates, options: options } );
    }, // _update()
    
    _clear: function( options ) {
      return this.send( 'rs_clear', { options: options } );
    } // _clear()
  } ); // Socket_IO_Crossover instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Socket_IO_Crossover': Socket_IO_Crossover } );
  
  de&&ug( "module loaded" );
  
  return Socket_IO_Crossover;
} ); // socket_io_crossover.js
