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
  
  var RS                             = rs.RS
    , de                             = false
    , log                            = RS.log.bind( null, 'socket_io_crossover' )
    , ug                             = log
    , extend_2                       = RS.extend._2
    , valid_uuid_v4                  = RS.valid_uuid_v4
    , Pipelet                        = RS.Pipelet
    , Input                          = Pipelet.Input
    , changes_count                  = RS.Query.changes_count
    , slice                          = [].slice
    , get_name                       = RS.get_name
    , max_concurrent_transactions_s  = 'max_concurrent_transactions'
    , allowed_tags_s                 = 'allowed_tags'
    , update_s                       = 'update'
  ;
  
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
      - **socket** (Object): socket.io socket instance
      
      - **options** (Object): pipelet options plus:
        - **max_concurrent_transactions** (Number): default is 2, this is not
          currently enforced
        
        - **allowed_tags** (Array of Strings): default is []. Defines
          allowed @@transaction @@tag\s in incoming @@operation\s
      
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
      - ```"rs_connection"```: packet emitted as a request on connection
        and reconnections by clients and as a response by servers:
        - **id** (String): optional unique identifier of connection, issued by
          pipelet socket_io_clients(). Provided by pipelet socket_io_server()
          on reconnections.
        
        - **last_tx** (Integer): optional, indicates to receiver the last
          successfuly transmitted packet number on a reconnection, zero
          or undefined on initial connection. Default is zero.
      
      - ```"rs_ack"```: acknowledges received packet by peer:
        - **packet_id** (Number): acknowledged ```"rs"``` packet number
      
      - ```"rs_nack"```: indicates that peer did not receive a
        previous packet and requests retransmission of missing packet(s)
        by indicating last acknowledged packet.
        This allows to retransmit lost packets between reconnections
        preserving the same Socket_IO_Crossover object, i.e. before a remove
        timeout expires.
        - **packet_id** (Number): last acknowledged ```"rs"``` packet number.
        
      - ```"rs_protocol_error"```: peer unrecoverable error message:
        - **message** (String): a intelligent agent-readable error message.
        
        - ```...```: additonal parameters providing context for the error.
      
      - ```"rs"```: all operations including fetch and query:
        - **packet_id** (Number): increasing number starting at 1.
        
        - **operation** (String):
          - ```"add"```: an @@add operation, additional parameters:
            - **values** (Array of Objects): added values.
            
            - **options** (Object): optional operation options.
          
          - ```"remove"```: a @@remove operation, additional parameters:
            - **values** (Array of Objects): added values.
            
            - **options** (Object): optional operation options.
          
          - ```"update"```: an @@update operation, additional parameters:
            - **updates** (Array of Arrays of two Objects): updated values.
            
            - **options** (Object): optional operation options.
          
          - ```"fetch"```: a @@fetch request, additional parameters:
            - **fetch_id** (Number): a unique identifier to match
              ```"fetched"``` responses. It must be a positive number
              increasing monotonically.
            
            - **query** (Array of Objects): a @@query.
            
            - **query_changes** (Array of 2 Arrays): optional, to update
              subscribed query:
              - **0** (Array): query terms to remove.
              
              - **1** (Array): query terms to add.
          
          - ```"abort_fetch"```: aborting a previous @@fetch request.
             After aborting, the receiving party should no-longer send
             *fetched* responses for the corresponding fetch.
             Additional parameters:
             - **fetch_id** (Number): matching *fetch_id* parameter
               of previous *fetch* request to abort.
            
            - **query_changes** (Array): optional, to revert updated
              subscribed query if this fetch has already completed when
              *abort_fetch* reaches peer. It should have the same value
              as the original fetch *query_changes*:
              - **0** (Array): query terms removed with aborted *fetch*.
              
              - **1** (Array): query terms added with aborted *fetch*.
          
          - ```"fetched"```: a response to a ```"fetch"``` packet.
            Additional parameters bellow are highly likely to change in an
            upcomming version of Toubkal in order to accomodate versionning
            complementary sets, and possibly transactions:
            - **fetch_id** (Number): the unique identifier matching received
              ```"fetch"``` request.
            
            - **no_more** (Boolean): ```false``` if more chuncks are comming
              for this response, ```true``` if this is the last chunk.
            
            - **values** (Array of Objects): added, removed or updated values
              matching fetch query.
            
            - **operation** (Number):
              - 0: *values* are adds.
              
              - 1: *values* are removes.
              
              - 2: *values* are updates.
            
            - **options** (Object): optional, and unsued for now.
          
          - ```"query"```: an update to subscribed query terms,
            additional parameters:
            - **changes** (Array of 2 Arrays of Objects): changes to query
              subscription:
              - first Array contains removed @@query terms
              - second Array contains added @@query terms
      
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
  function Input_Proxy( pipelet, options ) {
    Input.call( this, pipelet, options );
    
    var fetch_id = 0;
    
    this.source = {
      update_upstream_query: function( changes ) {
        pipelet._send( [ 'query', changes ] )
      },
      
      _fetch: function( receiver, query, query_changes ) {
        var id = ++fetch_id;
        
        pipelet._fetch_receivers[ id ] = receiver;
        
        pipelet._send( [ 'fetch', id, query, query_changes ] );
        
        return abort;
        
        function abort() {
          // first try to remove fetch from tx queue
          pipelet._abort_fetch( id ) ||
            // if not found, send abort message to server
            pipelet._send( [ 'abort_fetch', id, query_changes ] );
        }
      }
    }
  } // Input_Proxy()
  
  Input.subclass( 'Input_Proxy', Input_Proxy );
  
  function Socket_IO_Crossover( socket, options ) {
    var that = this;
    
    Pipelet.call( that, options );
    
    that.disconnected = true;
    
    // Initialize tx attributes
    that._tx_queue       = [];
    that._last_tx        = 0; // last packet transmitted to peer
    that._acknowledged   = 0; // last packet acknowledged by peer
    
    // Initialize rx attributes
    that._init_rx();
    
    that._fetch_receivers = {};
    that._fetch_aborts = {};
    
    that._init_socket( socket );
    
    that._output.source = new Input_Proxy( that, { name: get_name( that ) + '-input_proxy' } );
  } // Socket_IO_Crossover()
  
  Pipelet.subclass( 'Socket_IO_Crossover', Socket_IO_Crossover, {
    _init_rx: function() {
      //de&&ug( get_name( this, 'init_rx' ) + '(re)set last_processed to zero' );
      
      this._last_processed = 0; // last packet processed from peer
      this._last_fetch     = 0; // last fetch id received from peer
    }, // init_rx()
    
    // ToDo: rename _resubmit_query() into _reset_peer()
    _resubmit_query: function() {
      // A client reconnects to a server with a new id, requires to reset rx attributes
      var that    = this
        , input   = that._input
        , q       = input.future_query
        , query   = q && q.query
        , ql      = query && query.length
        , queue   = that._tx_queue
        , i       = -1
        , message
        , ___
      ;
      
      that._init_rx();
      
      // Remove previous input query, peer will set new query terms
      if ( ql ) {
        de&&ug( _get_name() + 'removing input query terms:', query );
        
        input.update_upstream_query( [ query, [] ] );
      }
      
      // Empty _tx_queue[] of messages 'query' (replaced by query bellow), 'fetched' (peer has lost its fetch requests)
      while ( message = queue[ ++i ] ) {
        switch ( message[ 0 ] ) {
          case 'query':
          case 'fetched':
            de&&ug( _get_name() + 'removing from queue obsolete message:', message );
            
            queue.splice( i--, 1 );
          break;
          
          case 'fetch':
            de&&ug( _get_name() + 'removing obsolete query changes from fetch:', message );
            
            message[ 3 ] = ___;
        }
      }
      
      // Resubmit input proxy query
      q     = that._output.source.future_query;
      query = q && q.query;
      ql    = query && query.length;
      
      if ( ql ) {
        de&&ug( _get_name() + 'resubmit query ' + ql + ' terms' );
        
        // Add resubmitted query at the beginning (unshift() instead of push()) of the queue, before emitting anything else
        queue.unshift( [ 'query', [ [], query ] ] );
      }
      
      // Emit queue
      that._tx();
      
      function _get_name() {
        return get_name( that, '_resubmit_query' );
      }
    }, // _resubmit_query()
    
    _init_socket: function( socket ) {
      var that                        = this
        , input                       = that._input
        , output                      = that._output
        , options                     = that._options
        , max_concurrent_transactions = options[ max_concurrent_transactions_s ] || 2
        , allowed_tags                = options[ allowed_tags_s                ] || []
        , fetch_aborts                = that._fetch_aborts
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
            , fetch_abort
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
          
          try {
            switch( operation ) {
              case 'fetch':
                if ( _2 <= that._last_fetch )
                  error( 'received "fetch" with id (' + _2 + ') <= to last fetch' )
                
                // ToDo: validate fetch parameters
                else {
                  // !!! set fetch_aborts[ _2 ] before calling input._fetch()
                  // because it could be synchronous and call fetch_receiver()
                  // before returning optional fetch_abort()
                  fetch_aborts[ that._last_fetch = _2 ] = _fetch_abort;
                  
                  fetch_abort = input._fetch( fetch_receiver, _3 /* query */, _4 /* query_changes */ )
                }
              break;
              
              case 'abort_fetch':
                fetch_abort = fetch_aborts[ _2 ];
                
                if ( fetch_abort )
                  fetch_abort()
                
                else if ( _3 /* query_changes */ )
                  // ToDo: validate query_changes
                  input.update_upstream_query( [ _3[ 1 ], _3[ 0 ] ] )
              
              break;
              
              case 'fetched':
                var fetch_receivers = that._fetch_receivers
                  , receiver = fetch_receivers[ _2 /* fetch id */ ]
                ;
                
                if ( receiver ) {
                  if ( _3 /* no_more */ ) delete fetch_receivers[ _2 /* fetch id */ ];
                  
                  // ToDo: validate fetched parameters
                  
                  receiver( _4 /* values */, _3 /* no_more */, _5 /* operation */, _6 /* options */ );
                } else
                  error( 'received "fetched" with id: ' + _2 + ', having no matching receiver' ) 
                
              break;
              
              case 'query':
                // ToDo: validate query_changes parameters for update_upstream_query()
                input.update_upstream_query( _2 );
              break;
              
              case 'add'   :
              case 'remove':
              case 'update':
                operation_is_valid( operation, _2, _3 ) && output.emit( operation, _2, _3 );
              break;
              
              default:
                error( 'unknow or illegal operation' );
            }
          } catch( e ) {
            error( 'invalid parameters: ' + e.message, e.stack );
          }
          
          // return // only closures beyond this line
          
          function _fetch_abort() {
            delete fetch_aborts[ _2 ];
            
            fetch_abort && fetch_abort();
          } // _fetch_abort()
          
          function fetch_receiver( values, no_more ) {
            if ( fetch_aborts[ _2 ] ) { // this fetch was not aborted, and has not completed
              if ( no_more ) delete fetch_aborts[ _2 ]; // will ignore any further calls to fetch_receiver()
              
              // ToDo: abort fetches on disconnection
              // ToDo: what happens on disconnection between rx fetch and sending fetched values?
              // On reconnection, fetched values will be sent to the other side which may no-longer hold
              // these ids. However there is a risk of conflict if ids collide between different instances
              // if may happen in particular if a diconnection happens soon after a connection
              if ( no_more || values.length )
                // !! send first 4 arguments, ignoring terminated source (5th)
                that._send( [ 'fetched', _2, no_more, values ].concat( slice.call( arguments, 2, 4 ) ) )
            } // else
              // de&&ug( get_name( that, 'fetch_receiver' ) + 'this fetch (' + _2 + ') already completed or was aborted' )
          } // fetch_receiver()
          
          // ToDo: make validation functions unit-testable
          function operation_is_valid( operation, values, options ) {
            // validate values
            var is_update = operation == update_s;
            
            if ( not_defined_type( values, 'Array', is_update ? 'updates' : 'values' )
              || values.some( is_update ? not_update : not_value )
            ) return 0;
            
            // validate options
            if ( not_type( options, 'Object', 'options' ) ) return 0;
            
            if ( options ) {
              var _t = options._t;
              
              if ( not_type( _t, 'Object', 'options._t' ) ) return 0;
              
              if ( _t ) {
                var forks = _t.forks;
                
                if ( not_type( _t.id   , 'String' , 'options._t.id'    )
                  || not_type( _t.more , 'Boolean', 'options._t.more'  )
                  || not_type( forks, 'Array'  , 'options._t.forks' )
                  || forks && forks.some( not_tag )
                ) return 0;
                
                // ToDo: limit number of concurrent transactions to max_concurrent_transactions
              }
              
              // ToDo: validate locations and moves for order()
              // ToDo: forbid not validated options
            }
            
            return 1;
            
            function not_type( v, type, name ) {
              var ___
                , t = toString.call( v )
              ;
              
              return v != ___
                  && t != '[object ' + type + ']'
                  && error( 'expected ' + name + ' to be a ' + type + ' or null or undefined, got: ' + t )
              ;
            }
            
            function not_defined_type( v, type, name ) {
              var t = toString.call( v );
              
              return t != '[object ' + type + ']'
                  && error( 'expected ' + name + ' to be a ' + type + ', got: ' + t )
              ;
            }
            
            function not_update( update, i ) {
              var name = 'update#' + i;
              
              if ( not_defined_type( update, 'Array', name ) ) return 1;
              
              if ( update.length != 2 )
                return error( 'expected ' + name + ' to be have 2 elements' )
              ;
              
              return not_value( update[ 0 ], i, update, 'remove#' )
                  || not_value( update[ 1 ], i, update, 'add#'    )
            }
            
            function not_value( value, i, _, name ) {
              return not_defined_type( value, 'Object', ( name || 'value#' ) + i );
            }
            
            function not_tag( tag, i ) {
              return not_defined_type( tag, 'String', 'options._t.forks#' + i )
                  || allowed_tags.indexOf( tag ) < 0
                  && error( 'transaction tag not allowed: ' + tag )
            }
          } // operation_is_valid()
          
          function error( message, stack ) {
            protocol_error( name, message, peer_position, operation, _2, _3, _4, _5, _6, _7 );
            
            stack && log( stack );
            
            return 1 // i.e. not valid
          } // error()
        } ) // 'on( "rs" )
        
        .on( 'rs_protocol_error', function( message, parameters ) {
          // ToDo emit error to error dataflow, allowing client to display error to end-user
          
          log.apply( null, [ 'on( "rs_protocol_error" ), peer reported a protocol error', message ].concat( parameters ) );
        } ) // 'on( "rs_protocol_error" )
      ;
      
      function protocol_error() {
        that._protocol_error.apply( that, arguments );
      } // protocol_error()
    }, // _init_socket()
    
    _connect: function() {
      var that = this;
      
      de&&ug( get_name( that, '_connect' ) )
      
      that.disconnected = false;
      
      that._tx();
    }, // _connect()
    
    _disconnect: function() {
      de&&ug( get_name( this, '_disconnect' ) );
      
      this.disconnected = true;
    }, // _disconnect()
    
    _close: function() {
      // terminate all pending fetch_receivers
      var fetch_receivers = this._fetch_receivers
        , fetch_ids = Object.keys( fetch_receivers )
      ;
      
      de&&ug( get_name( this, 'close' ) + 'terminating pending fetches, fetch ids:', fetch_ids );
      
      fetch_ids.forEach( function( id ) {
        // ToDo: emit error to global error dataflow
        // ToDo: refactor fetches to signal errors
        
        // Do not send an error value, that would be unexpected and could trigger exception
        fetch_receivers[ id ]( [], true );
        
        delete fetch_receivers[ id ];
      } );
    }, // _close()
    
    __emit: function( operation, values, options ) {
      this._send( [ operation, values, options ] );
    }, // __emit()
    
    // Must define _update to avoid updates to be split which is the default for Pipelet()
    _update: function( updates, options ) {
      this._send( [ update_s, updates, options ] );
    }, // _update()
    
    _send: function( parameters ) {
      var that = this;
      
      // ToDo: if queue becomes too big, because client is disconnected or another serious condition, close the connection and the socket
      // ToDo: if queue becomes too big, because server is unresponsive or another serious condition, close the connection and attempt to reconnect later
      de&&ug( get_name( that, '_send' ) + 'queue:', parameters );
      
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
        
        de&&ug( get_name( that, '_tx'  ) + 'tx "rs", position:', last_tx, ', parameters:', parameters );
        
        emit.apply( socket, [ 'rs', last_tx ].concat( parameters ) );
      }
    }, // tx()
    
    _abort_fetch: function( fetch_id ) {
      var queue   = this._tx_queue
        , i       = -1
        , message
      ;
      
      while ( message = queue[ ++i ] )
        if ( message[ 0 ] == 'fetch' && message[ 1 ] == fetch_id ) {
          queue.splice( i, 1 );
          
          return true
        }
    }, // _abort_fetch()
    
    _tx_connection: function( rs_connection ) {
      var that           = this
        , name           = de && get_name( that, '_tx_connection' )
        , last_tx        = rs_connection.last_tx
        , last_processed = typeof last_tx == 'number' ? that._last_processed = last_tx : that._last_processed
      ;
      
      de&&ug( name
        + 'input rs_connection:', rs_connection
        , '- peer last_processed:', last_processed
        , '- force last tx (' + that._last_tx + ') to last acknowledged (' + that._acknowledged + ')'
      );
      
      // Will force retransmission of not acknowldged packets on reconnections
      rs_connection.last_tx = that._last_tx = that._acknowledged;
      
      de&&ug( name + 'tx rs_connection:', rs_connection );
      
      that.socket.emit( 'rs_connection', rs_connection );
    }, // _tx_connection()
    
    _ack: function( acknowledged_position ) {
      var that         = this
        , last_tx      = that._last_tx
        , acknowledged = that._acknowledged
      ;
      
      // Resume transmission, if it had paused
      if ( typeof acknowledged_position == 'number' && acknowledged < acknowledged_position && acknowledged_position <= last_tx ) {
        de&&ug( get_name( that, '_ack' ) + 'peer acknowledged position:', acknowledged_position );
        
        while( acknowledged++ < acknowledged_position ) that._tx_queue.shift();
        
        that._acknowledged = acknowledged_position;
        
        that._tx();
      } else {
        that._protocol_error( 'on( "_ack" ), ', 'invalid acknowledged_position', acknowledged_position )
      }
    }, // _ack()
    
    _nack: function( last_processed ) {
      var that         = this
        , last_tx      = that._last_tx
        , acknowledged = that._acknowledged
      ;
      
      de&&ug( get_name( that, '_nack' ) + 'peer last_processed:', last_processed, ', last tx:', last_tx, ', acknowledged:', acknowledged );
      
      if ( typeof last_processed == 'number' && acknowledged < last_processed && last_processed < last_tx ) {
        that._last_tx = last_processed + 1;
        
        that._tx();
      } else {
        that._protocol_error( 'on( "_nack" ), ', 'invalid last_processed:', last_processed );
      }
    }, // _nack()
    
    _protocol_error: function( name, message ) {
      var parameters = slice.call( arguments, 2 );
      
      // ToDo: send to error dataflow, allowing client to display error to end-user
      log.apply( null, [ name + 'tx "rs_protocol_error":', message + ', parameters:' ].concat( parameters ) );
      
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
