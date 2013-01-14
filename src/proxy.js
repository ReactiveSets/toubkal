/*  proxy.js

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

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var log        = XS.log
    , subclass   = XS.subclass
    , extend     = XS.extend
    , Code       = XS.Code
    , Connection = XS.Connection
    , Set        = XS.Set
    , Ordered_Set= XS.Ordered_Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs proxy, " + m );
  } // ug()
  
  // Connection pipelet for Proxy
  Connection.prototype.proxy = function( name, options ) {
    var proxy = new Proxy( name, extend( { key: this.key }, options ) );
    
    // Connect proxy to this Connection
    this.connect( proxy );
    
    return proxy; // to connect it to other Connections
  }; // proxy()
  
  /* -------------------------------------------------------------------------------------------
     Proxy( name, options )
     
     Parameters:
       - name: model name
       
       - options (optional)
  */
  function Proxy( name, options ) {
    Connection.call( this, [], organizer, options );
    
    this,name = name;
    
    if ( typeof require === 'function' ) { // ToDo: find more reliable method to detect server side
      this.server = true;
    } else {
      this.client = true;
    }
    
    // Setup Socket server or client
    
    return this;
  } // Proxy()
  
  subclass( Connection, Proxy );
  
  extend( Proxy.prototype, {
    add: function( objects ) {
      return this.send( { name: 'add'   , objects: objects } );
    }, // add()
    
    remove: function( objects ) {
      return this.send( { name: 'remove', objects: objects } );
    }, // remove()
    
    update: function( updates ) {
      return this.send( { name: 'update', objects: objects } );
    }, // update()
    
    send: function( action ) {
      action.model = this.name;
      
      // Send action over socket
      
      return this;
    }, // send()
    
    // receive() is called when an action is received on model this.name
    receive: function( action ) {
      // forward action to connections
      
      switch ( action.name ) {
        case 'add'   : this.connections_add   ( action.objects ); break;
        case 'remove': this.connections_remove( action.objects ); break;
        case 'update': this.connections_update( action.objects ); break;
        
        default:
          throw new Error( "Unknown action: " + action.name );
      }
      
      return this;
    } // receive()
  } ); // Proxy instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Proxy' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // proxy.js
