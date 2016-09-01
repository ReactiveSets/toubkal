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
      @term crossover
      
      @short A @@pipelet exchanging events with a remote pipelet
      
      @description
      
      A crossover is a type of cable that connect the transmit wire on one
      side to the receiver wire on the other side:
      ```
        tx >-----  -----< tx
                 \\\\/
                 /\
        rx <-----  -----> rx
      ```
      
      Likewise, a crossover pipelet is a pipelet which source events are
      sent to a remote crossover pipelet which @@[emits](emit) them, while
      source events received by the remote pipelet are emitted by the local
      crossover.
      
      ```
             local                        remote
        
        source  events >-----  -----< source  events
                             \\\\/
                             /\
        emitted events <-----  -----> emitted events
      ```
  */
  
  /* --------------------------------------------------------------------------
      @class Socket_IO_Crossover( socket, options )
      
      @short Base @@crossover class for pipelet socket_io_server() and pipelet socket_io_clients()
      
      @parameters
      - socket (Object): socket.io socket instance
      - options (Object): pipelet options
      
      @emits Remote crossover source events
      
      @description
      This is an @@asynhcronous, @@lazy, @@stateless pipelet.
      
      ### To-Do List
      - ToDo: complete documentation
      - ToDo: data and options validation
      - ToDo: send errors to error dataflow
      - ToDo: implement retransmission mechanism on synchronized reconnection events
      - ToDo: implement flow control mechanism
      - ToDo: elaborate Denial of Service mitigation strategies
  */
  function Socket_IO_Crossover( socket, options ) {
    var that     = this
      , input
      , fetch_id = 0
    ;
    
    Pipelet.call( that, options );
    
    input = that._input;
    
    that.disconnected = true;
    
    that._tx_queue = [];
    
    that._fetch_receivers = {};
    
    that._init_socket( socket );
    
    that._output.source = {
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
      
      _fetch: function( receiver, query, query_changes ) {
        that._fetch_receivers[ ++fetch_id ] = receiver;
        
        that._send( 'rs_fetch', { id: fetch_id, query: query, query_changes: query_changes } );
      } // Socket_IO_Crossover.Output.._fetch()
    }; // Socket_IO_Crossover.Output..source
    
    function send_query_update( changes ) {
      changes[ 0 ].length + changes[ 1 ].length
        && that._send( 'rs_query', changes )
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
    
    _init_socket: function( socket ) {
      var that  = this
        , input = that._input
      ;
      
      that.socket = socket
        
        .on( 'rs_fetch', function( data ) {
          de&&ug( 'rs_fetch', data );
          
          // ToDo: rs_fetch(): validate id, query and query_changes
          var id            = data.id;
          var query         = data.query;
          var query_changes = data.query_changes;
          
          input._fetch( receiver, query, query_changes );
          
          function receiver( adds, no_more, removes, updates, options ) {
            // ToDo: what happens on disconnection between rx fetch and sending fetched values?
            // On reconnection, fetched values will be sent to the other side which may no-longer hold
            // these ids. However there is a risk of conflict if ids collide between different instances
            // if may happen in particular if a diconnection happens soon after a connection
            that._send( 'rs_fetched_values', { id: id
              , adds   : adds
              , no_more: no_more
              , removes: removes
              , updates: updates
              , options: options
            } );
          }
        } )
        
        .on( 'rs_fetched_values', function( data ) {
          de&&ug( 'rs_fetched_values', data );
          
          var id = data.id
            , receiver = that._fetch_receivers[ id ]
          ;
          
          if( receiver ) {
            var no_more = data.no_more
              , adds    = data.adds
              , removes = data.removes
              , updates = data.updates
              , options = data.options
            ;
            
            if ( no_more ) delete that._fetch_receivers[ id ];
            
            // ToDo: provide a context for receiver()
            receiver( adds, no_more, removes, updates, options );
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
    }, // _init_socket()
    
    connect: function() {
      this.disconnected = false;
      
      this._tx();
    }, // connect()
    
    disconnect: function() {
      de&&ug( 'disconnect' );
      
      this.disconnected = true;
      // Add to queue not acknowledged transmissions
    }, // disconnect()
    
    close: function() {
      // terminate all pending fetches
      var receivers = this._fetch_receivers
        , id
        , receiver
      ;
      
      for( id in receivers )
        if( receiver = receivers[ id ] ) {
          delete receivers[ id ];
          
          receiver( [ { flow: 'errors', cause: 'connection_closed' } ], true );
        }
    }, // close()
    
    _send: function( method, data ) {
      var that  = this;
      
      de&&ug( that._get_name( '_send' ) + 'queue [' + method, data, ']' );
      
      that._tx_queue.push( [ method, data ] );
      
      that._tx();
    }, // _send()
    
    _tx: function() {
      var that   = this
        , queue  = that._tx_queue
        , socket = that.socket
        , emit   = socket.emit
        , v
      ;
      
      while( ! that.disconnected && ( v = queue.shift() ) ) {
        // ToDo: implement retransmission mechanism if not acknowledged before diconnection
        de&&ug( that._get_name( '_tx'  ) + 'emit:', v );
        
        emit.apply( socket, v );
      }
    }, // tx()
    
    _add: function( values, options ) {
      this._send( 'rs_add', { values: values, options: options } );
    }, // _add()
    
    _remove: function( values, options ) {
      this._send( 'rs_remove', { values: values, options: options } );
    }, // _remove()
    
    _update: function( updates, options ) {
      this._send( 'rs_update', { updates: updates, options: options } );
    }, // _update()
    
    _clear: function( options ) {
      this._send( 'rs_clear', { options: options } );
    } // _clear()
  } ); // Socket_IO_Crossover instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Socket_IO_Crossover': Socket_IO_Crossover } );
  
  de&&ug( "module loaded" );
  
  return Socket_IO_Crossover;
} ); // socket_io_crossover.js
