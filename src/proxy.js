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
  var l8;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    require( './connection.js' )
    l8 = require( 'l8/lib/l8.js' )
    require( 'l8/lib/actor.js' )
  } else {
    XS = exports.XS;
    l8 = exports.l8
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
     
     Data flow: node->proxy(->relay----->relay->)proxy->node
     
     Parameters:
       - name: model name
       
       - options (optional)
  */
  function Proxy( name, options ) {
    //Connection.call( this, [], organizer, options );
    Connection.call( this, options );
    this.name = name;
    
    if ( l8.server ) {
      this.server = true;
    } else {
      this.client = true;
    }
    
    // Setup Socket server or client
    Proxy.register( this.name, this)
    return this;
  } // Proxy()
  
  Proxy.AllProxies = {}
  Proxy.register = function( name, object ){ Proxy.AllProxies[name] = object }
  Proxy.lookup   = function( name  ){ return Proxy.AllProxies[name] }
  Proxy.url      = l8.client && document.url
  Proxy.actor    = l8.Actor( "XS_Proxy", l8.role( { delegate: {
    relay: function( action ){
      var name = action.model
      var proxy = Proxy.lookup( name )
      if( !proxy ){
        var stage = l8.actor.stage
        if ( stage ) {
          name = stage.name + "/" + name
        }
        proxy = Proxy.lookup( name ) || new Proxy( name )
        if( stage ){
          proxy.relay = l8.proxy( "XS_Proxy", stage )
        }
      }
      proxy.receive( action)
    }
  } } ) )()
  Proxy.relay = Proxy.url && l8.proxy( "XS_Proxy", Proxy.url )
  Proxy.stage = l8.stage( "local")
  
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
    // Typically called by a source
      action.model = this.name;
      
      // Send action over socket
      (this.relay || Proxy.relay).send( ["relay", action] )
      return this;
    }, // send()
    
    receive: function( action, client ) {
    // Called when an action is received on model this.name
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
  
/*
 *  test
 */
   
var Http    = require( "http")
var Connect = require( "connect")

var de   = l8.de
var bug  = l8.bug
var mand = l8.mand


/*
 *  test http server
 */

var app    = Connect()
app
.use( Connect.static( 'public'))
.use( function( req, res ){
  res.end( 'hello world\n')
})
var server = Http.createServer( app)
server.listen( process.env.PORT)

l8.stage( "local", server)


Proxy.relay = l8.proxy( "XS_Proxy", "http://localhost:" + process.env.PORT )
var proxy = new Proxy( "test proxy node")
require( "./connection.js")
var set   = new XS.Set()
set.connect( proxy)
set.add( [{hello:"world"}])
l8.countdown( 10)
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Proxy' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // proxy.js
