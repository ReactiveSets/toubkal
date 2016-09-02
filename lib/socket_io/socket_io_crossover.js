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
  
  var RS            = rs.RS
    , de            = false
    , log           = RS.log.bind( null, 'socket_io_crossover' )
    , ug            = log
    , extend_2      = RS.extend._2
    , valid_uuid_v4 = RS.valid_uuid_v4
    , Pipelet       = RS.Pipelet
    , slice         = [].slice
  ;
  
  function _get_name( that, name ) { return that._get_name( name ) }
  
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
      
      ## Protocol
      This is a simplified description of the Toubkal protocol over
      socket.io transport as implemented by this Socket_IO_Crossover class.
      It does not describe the socket.io protocol itself, only how socket.io
      is used to exchange packets.
      
      For now connections and reconnections are not described, only exchanges
      once the connection is established.
      
      For now this protocol is described for debugging purposes only, not
      for third-party implementations as it is subject to changes without
      notice.
      
      ### Packets exchanged
      All packets are exchanged using a list of
      ```socket.emit( event_name, ... )``` parameters as described bellow.
      The first paramter is the event name showed bellow at the top level,
      subsequent parameters are showed at the second level:
      - ```"rs"```: all operations including fetch and query:
        - packet_id (Number): increasing number starting at 1
        - operation (String):
          - ```"add"```: an @@add operation, additional parameters:
            - values (Array of Objects): added values
            - options (Object): optional operation options
          
          - ```"remove"```: a @@remove operation, additional parameters:
            - values (Array of Objects): added values
            - options (Object): optional operation options
          
          - ```"update"```: an @@update operation, additional parameters:
            - updates (Array of Arrays of two Objects): updated values
            - options (Object): optional operation options
          
          - ```"clear"```: a @@clear operation, additional parameters:
            - ```null```: no values
            - options (Object): optional operation options
          
          - ```"fetch"```: a @@fetch request, additional parameters:
            - fetch_id (Number): a unique identifier to match
              ```"fetched"``` responses
            - query (Array of Objects): a @@query
            - query_changes (Array): optional, to synchronously update
              subscribed query
          
          - ```"fetched"```: a response to a ```"fetch"``` packet.
            Additional parameters bellow are highly likely to change in an
            upcomming version of Toubkal in order to accomodate versionning
            complementary sets, and possibly transactions:
            - fetch_id (Number): the unique identifier matching received
              ```"fetch"``` request
            - no_more (Boolean): ```false``` if more chuncks are comming
              for this response, ```true``` if this is the last chunk
            - adds (Array of Objects): added values matching fetch query
            - removes (Array of Objects): optional removed values matching
              fetch query, this may happen with complementaty sets
              as generated with pipelet revert().
            - updates (Array of Objects): optional updated values matching
              fetch query, no pipelet generates this so far
            - options (Object): optional, an unsued so far
          
          - ```"query"```: an update to subscribed query terms,
            additional parameters:
            - changes (Array of two Arrays of Objects): changes to query
              subscription:
              - first Array contains removed query terms
              - second Array contains added query terms
          
      - ```"rs_ack"```: acknowledges received packet by peer:
        - packet_id (Number): acknowledged ```"rs"``` packet number
      
      - ```"rs_nack"```: indicates that peer did not receive a
        previous packet and requests retransmission of missing packet(s)
        by indicating last acknowledged packet.
        This allows to retransmit lost packets between reconnections
        preserving the same Socket_IO_Crossover object, i.e. before a remove
        timeout expires.
        - packet_id (Number): last acknowledged ```"rs"``` packet number
        
      - ```"rs_protocol_error"```: peer unrecoverable error message:
        - message (String): a intelligent agent-readable error message
        - ```...```: additonal parameters
      
      ### Procedures
      - ```"rs"``` packets:
        - Up to 3 ```"rs"``` packets, the window, can be sent without
          receiving an acknowldge.
        - Received duplicate packets are ignored as it may happen right
          after a reconnection.
      
      - Sending always add packets to a queue, regardless of connection
        status, allows retransmissions on received ```"rs_nack"``` packets.
      
      - Sending queue is emptied as ```"rs_ack"``` packets are reveived,
        All packets which ```packet_id``` is inferior or equal to
        acknowledged packet id are removed from the queue.
      
      - When reconnecting with the same connection id, not yet
        acknowledged packets are retransmitted which may cause duplicates
        that will be ignored by peer. This allows this protocol to not
        require the use of timeouts, provided that the underlying socket.io
        behaves as expected below in "Socket.io Properties".
        
      - When reconnecting with a new connection id, window attributes are
        reset to zero, the transmission queue is cleaned of obsolete packets
        and query changee, and a new query change request is inserted at the
        start of the queue.
      
      ### Socket.io Properties
      The underlying transport, i.e. socket.io, is assumed to have the following
      properties:
      - Receive packets in sent order
      - Do not loose or delay packets outside of network disconnection events
      - Preserve packets integrity
      
      ### To-Do List
      - ToDo: complete documentation
      - ToDo: data validation
      - ToDo: send errors to error dataflow
      - ToDo: Evaluate Denial of Service potential effects and mitigation strategies
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
    
    init_rx_tx( '' );
    
    that._fetch_receivers = {};
    
    that._init_socket( socket );
    
    that._output.source = {
      query: null, // Optimized local query by Input.._update_query
      
      update_upstream_query: function( changes ) {
        // Optimize changes
        changes = input._update_query.call( this, changes );
        
        // Send optimized changes
        changes[ 0 ].length + changes[ 1 ].length && that._send( [ 'query', changes ] );
      }, // update_upstream_query()
      
      // ToDo: rename _resubmit_query() into _reset_peer
      _reset_peer: function() {
        // A client reconnects to a server with a new id, requires to reset rx and tx attributes
        init_rx_tx( '_reset_peer()' );
        
        // Empty _tx_queue[] of messages 'query' (replaced by query bellow), 'fetched' (peer has lost its fetch requests)
        var queue   = that._tx_queue
          , i       = -1
          , message
          , ___
        ;
        
        while( message = queue[ ++i ] ) {
          switch( message[ 0 ] ) {
            case 'query':
            case 'fetched':
              de&&ug( get_name() + 'removing from queue obsolete message:', message );
              
              queue.splice( i--, 1 );
            break;
            
            case 'fetch':
              de&&ug( get_name() + 'removing obsolete query changes from fetch:', message );
              
              message[ 3 ] = ___;
          }
        }
        
        var q     = this.query
          , query = q && q.query
          , ql    = query && query.length
        ;
        
        if ( ql ) {
          de&&ug( get_name() + 'resubmit query ' + ql + ' terms' );
          
          // Add resubmitted query at the beginning (unshift() instead of push()) of the queue, before emitting anything else
          queue.unshift( [ 'query', [ [], query ] ] );
        }
        
        // ToDo: allow application to re-submit additional messages on hard reconnection, such as authorization data
        
        // Emit queue
        that._tx();
        
        function get_name() { return _get_name( that, '_reset_peer' ) }
      }, // _reset_peer()
      
      _fetch: function( receiver, query, query_changes ) {
        that._fetch_receivers[ ++fetch_id ] = receiver;
        
        that._send( [ 'fetch', fetch_id, query, query_changes ] );
      } // Socket_IO_Crossover.Output.._fetch()
    }; // Socket_IO_Crossover.Output..source
    
    function init_rx_tx( name ) {
      de&&ug( _get_name( that, 'init_rx_tx' ) + name );
      
      that._last_processed = 0; // last packet processed from peer
      that._last_tx        = 0; // last packet transmitted to peer
      that._acknowledged   = 0; // last packet acknowledged by peer
    } // init_rx_tx()
  } // Socket_IO_Crossover()
  
  Pipelet.subclass( 'Socket_IO_Crossover', Socket_IO_Crossover, {
    // ToDo: rename _resubmit_query() into _reset_peer()
    _resubmit_query: function() {
      this._output.source._reset_peer();
    }, // _resubmit_query()
    
    _init_socket: function( socket ) {
      var that   = this
        , input  = that._input
        , output = that._output
      ;
      
      that.socket = socket
        .on( 'rs_ack', function( acknowledged_position ) {
          that._ack( acknowledged_position );
        } ) // 'on( "rs_ack" )
        
        .on( 'rs_nack', function( last_processed ) {
          that._nack( last_processed );
        } ) // 'on( "rs_nack" )
        
        .on( 'rs', function( peer_position, operation, _2, _3, _4, _5, _6, _7 ) {
          var name           = 'on( "rs" ), '
            , last_processed = that._last_processed
          ;
          
          de&&ug( name, slice.call( arguments ) );
          
          if ( peer_position <= last_processed )
            // this can happen right after a reconnection when peer retransmits not-acknowledged packets
            return log( name + 'received duplicate:', peer_position, ', last processed:', last_processed );
          ;
          
          if ( peer_position != last_processed + 1 ) {
            de&&ug( name + 'missing one or more packet, tx "rs_nack", peer_position:', peer_position, ', last processed:', last_processed );
            
            // this can happen after a reconnection when packets have been lost, i.e. peer did not know it was disconnected
            
            return that.socket.emit( 'rs_nack', last_processed );
          }
          
          // Acknowledge receipt immediately
          de&&ug( name + 'tx "rs_ack", acknowledge packet:', peer_position );
          
          that.socket.emit( 'rs_ack', that._last_processed = peer_position );
          
          switch( operation ) {
            case 'fetch':
              // ToDo: fetch(): validate id, query and query_changes
              input._fetch( fetch_receiver, _3, _4 );
            break;
            
            case 'fetched':
              var receiver = that._fetch_receivers[ _2 ];
              
              if( receiver ) {
                var no_more = _3;
                
                if ( no_more ) delete that._fetch_receivers[ _2 ];
                
                receiver( _4, no_more, _5, _6, _7 );
              } else {
                // ToDo: send this to error dataflow
                error( 'received "fetched" with id: ' + _2 + ', having no matching receiver' ) 
              }
            break;
            
            case 'query':
              // ToDo: validate data_1 as [ query, query ]
              
              input.update_upstream_query( _2 );
            break;
            
            case 'add'   :
            case 'remove':
            case 'update':
            case 'clear' :
              validate_options( _3 ) && output.emit( operation, _2, _3 );
            break;
            
            default:
              protocol_error( name, 'unknow operation:', operation );
            break;
          }
          
          function fetch_receiver( adds, no_more ) {
            // ToDo: what happens on disconnection between rx fetch and sending fetched values?
            // On reconnection, fetched values will be sent to the other side which may no-longer hold
            // these ids. However there is a risk of conflict if ids collide between different instances
            // if may happen in particular if a diconnection happens soon after a connection
            that._send( [ 'fetched', _2, no_more, adds ].concat( slice.call( arguments, 2 ) ) );
          } // fetch_receiver()
          
          function validate_options( options ) {
            if ( assert_type( options, 'Object', 'options' ) ) return false;
            
            if ( options ) {
              var _t = options._t;
              
              if ( assert_type( _t, 'Object', 'options._t' ) ) return false;
              
              if ( _t ) {
                if ( assert_type( _t.id   , 'String' , 'options._t.id'    )
                  || assert_type( _t.more , 'Boolean', 'options._t.more'  )
                  || assert_type( _t.forks, 'Array'  , 'options._t.forks' )
                ) return false;
              }
            }
            
            return true;
            
            function assert_type( v, type, name ) {
              var t = toString.call( v );
              
              return t != '[object ' + type + ']'
                  && t != '[object Null]'
                  && t != '[object Undefined]'
                  && error( 'expected ' + name + ' to be a ' + type + ' or undefined, got: ' + t )
              ;
            }
          } // validate_options()
          
          function error( message ) {
            protocol_error( name, message, [ peer_position, operation, _2, _3, _4, _5, _6, _7 ] );
            
            return true;
          } // error()
        } ) // 'on( "rs" )
        
        .on( 'rs_protocol_error', function( message, parameters ) {
          // ToDo emit error to error dataflow, allowing client to display error to end-user
          
          log( 'on( "rs_protocol_error" ), peer reported a protocol error', message, parameters );
        } ) // 'on( "rs_protocol_error" )
      ;
      
      function protocol_error() {
        that._protocol_error.apply( that, arguments );
      } // protocol_error()
    }, // _init_socket()
    
    connect: function() {
      var that = this;
      
      that.disconnected = false;
      
      // Force retransmission of not acknowldged packets on reconnections
      that._last_tx = that._acknowledged;
      
      that._tx();
    }, // connect()
    
    disconnect: function() {
      de&&ug( 'disconnect' );
      
      this.disconnected = true;
    }, // disconnect()
    
    close: function() {
      // terminate all pending fetches
      var receivers = this._fetch_receivers
        , id
        , receiver
      ;
      
      for( id in receivers )
        if( receiver = receivers[ id ] ) {
          de&&ug( get_name( this, 'close' ) + 'delete receiver:', id );
          
          delete receivers[ id ];
          
          // ToDo: emit error to globql error dataflow
          receiver( [ { flow: 'errors', cause: 'connection_closed' } ], true );
        }
    }, // close()
    
    __emit: function( operation, values, options ) {
      this._send( [ operation, values, options ] );
    }, // __emit()
    
    // Must define _update to avoid updates to be split which is the default for Set()
    _update: function( updates, options ) {
      this._send( [ 'update', updates, options ] );
    }, // _update()
    
    _send: function( parameters ) {
      var that = this;
      
      // ToDo: if queue becomes too big, because client is disconnected or another serious condition, close the connection and the socket
      // ToDo: if queue becomes too big, because server is unresponsive or another serious condition, close the connection and attempt to reconnect later
      de&&ug( _get_name( that, '_send' ) + 'queue:', parameters );
      
      that._tx_queue.push( parameters );
      
      that._tx();
    }, // _send()
    
    _tx: function() {
      var that       = this
        , queue      = that._tx_queue
        , socket     = that.socket
        , emit       = socket.emit
        , position
        , parameters
        , last_tx
      ;
      
      while ( ! that.disconnected
        && ( position = that._last_tx - that._acknowledged ) < 3 // Send up to 3 packets without acknowledge
        && ( parameters = queue[ position ] )
      ) {
        last_tx = ++that._last_tx;
        
        de&&ug( _get_name( that, '_tx'  ) + 'tx "rs", position:', last_tx, ', parameters:', parameters );
        
        emit.apply( socket, [ 'rs', last_tx ].concat( parameters ) );
      }
    }, // tx()
    
    _ack: function( acknowledged_position ) {
      var that         = this
        , last_tx      = that._last_tx
        , acknowledged = that._acknowledged
      ;
      
      // Resume transmission, if it had paused
      if ( typeof acknowledged_position == 'number' && acknowledged < acknowledged_position && acknowledged_position <= last_tx ) {
        de&&ug( _get_name( that, '_ack' ) + 'peer acknowledged position:', acknowledged_position );
        
        while( acknowledged++ < acknowledged_position ) that._tx_queue.shift();
        
        that._acknowledged = acknowledged_position;
        
        that._tx();
      } else {
        that._protocol_error( 'on( "_ack" ), ', 'invalid acknowledged_position', arguments )
      }
    }, // _ack()
    
    _nack: function( last_processed ) {
      var that         = this
        , last_tx      = that._last_tx
        , acknowledged = that._acknowledged
      ;
      
      de&&ug( _get_name( that, '_nack' ) + 'peer last_processed:', last_processed, ', last tx:', last_tx, ', acknowledged:', acknowledged );
      
      if ( typeof last_processed == 'number' && acknowledged < last_processed && last_processed < last_tx ) {
        that._last_tx = last_processed + 1;
        
        that._tx();
      } else {
        that._protocol_error( 'on( "_nack" ), ', 'invalid last_processed', arguments );
      }
    }, // _nack()
    
    _protocol_error: function( name, message, parameters ) {
      parameters = slice.call( parameters );
      
      // ToDo: send to error dataflow, allowing client to display error to end-user
      log( name + 'tx "rs_protocol_error":', message + ', parameters:', parameters );
      
      this.socket.emit( 'rs_protocol_error', message, parameters );
    } // _protocol_error()
  } ); // Socket_IO_Crossover instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Socket_IO_Crossover': Socket_IO_Crossover } );
  
  de&&ug( "module loaded" );
  
  return Socket_IO_Crossover;
} ); // socket_io_crossover.js
