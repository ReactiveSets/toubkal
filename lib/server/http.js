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
  var url  = require( 'url'  );
  var mime = require( 'mime' );
  
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
      that.handler.call( this, request, response );
    }
  } // HTTP_Server_Handler()
  
  extend( HTTP_Server_Handler.prototype, {
    handler: function( request, response ) {
      de&&ug( 'HTTP_Server_Handler.handler(), url: ' + request.url );
      
      response.writeHead( 200 );
      response.end( '<p>Hello, world</p>' );
    },
    
    set: function( handler ) {
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
      
      return Set.prototype.add.call( this, servers );
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
     Serve_HTTP_Servers
  */
  function Serve_HTTP_Servers( handler, options ) {
    Pipelet.call( this, options );
    
    this.handler = handler;
    
    return this;
  } // Serve_HTTP_Servers()
  
  Pipelet.build( 'serve_http_servers', Serve_HTTP_Servers, {
    add: function( servers ) {
      for ( var i = -1, l = servers.length; ++i < l; ) {
        var server = servers[ i ];
        
        server.handler.set( this.handler );
      }
      
      return this.emit_add( servers );
    }, // add()
    
    remove: function( servers ) {
      return this.emit_remove( servers );
    }, // remove()
    
    update: function( updates ) {
      var updates = Pipelet.split_updates( updates );
      
      this.remove( updates.removes );
      this.add   ( updates.adds    );
      
      return this;
    }, // update()
  } ); // serve_http_servers()
  
  /* --------------------------------------------------------------------------
     source.serve( http_servers );
  */
  function Serve( http_servers, options ) {
    Pipelet.call( this, options );
    
    var that = this;
    
    http_servers.serve_http_servers( function( request, response ) {
      that.handler.call( this, request, response, that );
    } );
    
    this.files = {};
    
    return this;
  } // Serve()
  
  Pipelet.build( 'serve', Serve, {
    handler: function( request, response, that ) {
      var parsed_url = url.parse( request.url )
        , pathname = parsed_url.pathname
        , file = that.files[ pathname ]
        , u
      ;
      
      if ( file ) {
        var content = file.content, mime_type = file.mime_type || mime.lookup( pathname );
        
        // ToDo: load content from file if undefined (large files)
        if ( content === u ) {
        }
        
        mime_type && response.setHeader( 'Content-Type', mime_type );
        
        de&&ug( 'Serve.handler(), found pathname: ' + pathname + ', mime: ' + mime_type + ', content length: ' + content.length );
        
        // ToDo: gzip or deflate content
        
        response.writeHead( 200 );
        response.end( content );
        
        return;
      }
      
      de&&ug( 'Serve.handler(), pathname: ' + pathname + ', Not Found' );
      
      response.writeHead( 404 );
      response.end( '<p>Not Found</p>' );
    }, // handler()
    
    add: function( files ) {
      for ( var i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ], location = '/' + file.name;
        
        this.files[ location ] = file;
        
        de&&ug( 'Serve.add(), location: ' + location );
      }
      
      return this;
    }, // add()
    
    remove: function( files ) {
      for ( var u, i = -1, l = files.length; ++i < l; ) {
        var file = files[ i ];
        
        this.files[ '/' + file.name ] = u;
      }
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      for ( var u, i = -1, l = updates.length; ++i < l; ) {
        var update = updates[ i ], remove = update[ 0 ], add = update[ 1 ];
        
        this.files[ remove.name ] = u; 
        this.files[ add.name    ] = add;
      }
      
      return this;
    }, // update()
  } ); // Serve instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'HTTP_Servers', 'Serve' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // http.js
