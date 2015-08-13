/*  socket_io_server.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
undefine()( 'socket_io_server',

[ '../core/pipelet', './socket_io_crossover', '../util/timestamp_string' ],

function( rs, Socket_IO_Crossover, timestamp_string ) {
  'use strict';
  
  var RS    = rs.RS
    , Query = RS.Query
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'socket_io_server' );
  
  /* --------------------------------------------------------------------------
     source.socket_io_server( [ options ] )
     
     options (Object):
     - location (String): default is location.protocol + '//' + location.host
  */
  var singletons = {};
  
  function Socket_IO_Server( options ) {
    // This is a multiton, one instance per location
    var address = ( options && options.location ) || ( location.protocol + '//' + location.host )
      , that    = singletons[ address ]
    ;
    
    if ( that ) return that; // return already running singleton
    
    // Register new singleton instance
    that = singletons[ this._address = address ] = this;
    
    var connection = {}, previous_id;
    
    de&&ug( 'connecting to ' + address );
    
    that._state_changes = rs.set( [] );
    
    that.disconnect();
    
    var socket = io.connect( address )
      .on( 'connect', function() {
        de&&ug( 'received connect' );
        
        connection.state = 'connected';
        
        socket.emit( 'rs_connection', connection );
        
        that.connect( connection.state );
      } )
      
      .on( 'disconnect', function() {
        de&&ug( 'received disconnect' );
        
        that.disconnect( connection.state = 'disconnected' );
      } )
      
      .on( 'reconnect', function() {
        de&&ug( 'received reconnect, previous connection id:', previous_id );
      } )
      
      .on( 'rs_connection', function( _connection ) {
        // Received after 'connect' on a reconnection.
        de&&ug( 'received rs_connection, connection:', _connection, ', previous connection id:', previous_id );
        
        var _id = _connection.id;
        
        if ( previous_id ) {
          if ( previous_id == _id ) {
            de&&ug( 'this is a reconnexion with the same id' ); 
          } else {
            de&&ug( 'this is a reconnxion with a new id' );
            
            that._output.resubmit_query();
            
            // ToDo: re-fetch values through a unique multi-flow cache that will remove duplicates and output changes
            // Eventually we should consider an optimization to fetch some terms partially, when a strict order is used for
            // retrieved values.
          }
        }
        
        connection = _connection;
        previous_id = _id;
      } )
    ;
    
    that._output || ( that._output = new Socket_IO_Server.Output( that, 'socket_io_server_out' ) );
    
    return Socket_IO_Crossover.call( that, socket, options );
  } // Socket_IO_Server()
  
  Socket_IO_Server.Output = Socket_IO_Crossover.Output.subclass(
    'Socket_IO_Server.Output',
    
    function( p, name ) {
      Socket_IO_Crossover.Output.call( this, p, name )
    },
    
    function( Super ) {
      var query = new Query( [] )
        , _update_upstream_query = Super.update_upstream_query
      ;
      
      return {
        update_upstream_query: function( removes, adds ) {
          // Accumulate optimized changes into local Query instance
          if ( adds   .length ) query.add   ( adds    );
          if ( removes.length ) query.remove( removes );
          
          // Only propagate upstream optimized changes
          _update_upstream_query.call( this, query.removes, query.adds );
          
          query.discard_operations();
          
          return this;
        }, // update_upstream_query()
        
        resubmit_query: function() {
          de&&ug( this._get_name( 'resubmit_query' ), ', query terms:', query.query.length );
          
          return _update_upstream_query.call( this, [], query.query );
        } // resubmit_query()
      };
    } // methods()
  ); // Socket_IO_Server.Output subclass
  
  Socket_IO_Crossover.Build( 'socket_io_server', Socket_IO_Server, function( Super ) {
    var state_change_id = 0;
    
    return {
      connect: function( state ) {
        this._add_state_change( state );
        
        Super.connect.call( this );
      },
      
      disconnect: function( state ) {
        this._add_state_change( state );
        
        Super.disconnect.call( this );
      },
      
      _add_state_change: function( state ) {
        this._state_changes._input.add( [ {
          flow     : 'socket_io_state_changes',
          id       : ++state_change_id,
          timestamp: timestamp_string(),
          address  : this.address,
          state    : state
        } ] );
      },
      
      socket_io_state_changes: function() {
        return this._state_changes;
      }
    }
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Socket_IO_Server': Socket_IO_Server } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // socket_io_server.js
