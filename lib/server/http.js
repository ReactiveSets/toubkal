/*  http.js
    
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
  var http = require( 'http' );
  
  var XS = require( '../pipelet.js' ).XS;
  
  var xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Code       = XS.Code
    , Pipelet    = XS.Pipelet
    , Set        = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs http, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     HTTP_Server_Handler()
  */
  function HTTP_Server_Handler() {
    var that = this;
    
    this.listener = listener;
    
    return this;
    
    function listener( request, response ) {
      that.handler( request, response );
    }
  } // HTTP_Server_Handler()
  
  extend( HTTP_Server_Handler.prototype, {
    handler: function( request, response ) {
      console.log( 'handler', request );
      
      response.writeHead( 200 );
      response.end( '<p>Hello, world</p>' );
    },
    
    set_handler: function( handler ) {
      this.handler = handler;
      
      return this;
    }
  } );
  
  /* -------------------------------------------------------------------------------------------
  */
  function HTTP_Servers( end_points, options ) {
    Set.call( this, options );
    
    this.end_points = end_points;
    
    return this;
  } // HTTP_Servers()
  
  /* -------------------------------------------------------------------------------------------
     xs.set( [ { id: 1, ip_address: '0.0.0.0', port: 80 } ] ).http_server()
  */
  Set.build( 'http_servers', HTTP_Servers, {
    add: function( end_points ) {
      var servers = [];
      
      for ( var i = -1; ++i < end_points.length; ) {
        var end_point  = end_points[ i ]
          , ip_address = end_point.ip_address || '127.0.0.1'
          , port       = end_point.port || 7001
          , handler    = new HTTP_Server_Handler()
          , server     = http.createServer( handler.listener )
        ;
        
        server.listen( port, ip_address );
        
        de&&ug( 'HTTP_Servers.add(): http server listening to ' + ip_address + ':' + port );
        
        servers.push( extend( {}, end_point, {
          ip_address: ip_address,
          
          port: port,
          
          handler: handler,
          
          server: server
        } ) );
      }
      
      return Set.prototype.add.call( this, server );
    },
    
    remove: function( end_points ) {
      for ( var i = -1; ++i < end_points.length; ) {
        end_points[ i ].server.close();
      }
      
      return Set.prototype.remove.call( this, end_points );
    },
    
    update: function( updates ) {
      var updates = Pipelet.split_updates( updates );
      
      this.remove( updates.removes );
      this.add   ( updates.adds    );
      
      return this;
    },
  } ); // HTTP_Servers instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'HTTP_Servers' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // http.js
