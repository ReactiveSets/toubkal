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
  XS.l8 = l8
  
  var log        = XS.log
    , subclass   = XS.subclass
    , extend     = XS.extend
    , Code       = XS.Code
    , Connection = XS.Connection
    , Set        = XS.Set
    , Ordered_Set= XS.Ordered_Set
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs proxy, " + m );
  } // ug()
  
  /* --------------------------------------------------------------------------
     .proxy()
     Connection pipelet for Proxy.
     Proxies works in pairs, one proxy is local, the other is remote, they both
     have the same name.
     Any operation on the local proxy is signaled to the other side.
    
     Usage:
     
       -- publisher side
       daily_mirror.proxy( "daily_mirror.sub_id_xxx" )
       daily_mirror.add( [an_article, another_story] )
       
       -- subscriber side
       daily_mirror = my_subscriptions.proxy( "daily_mirror.sub_id_xxx" )
       daily_mirror.connect( my_mail_box)
    
     ToDo: a reliable mechanism to destroy proxies and collect garbadge.
  */

  Connection.prototype.proxy = function( name, options ) {
    var proxy = new Proxy( name, extend( { key: this.key }, options ) );
    
    // new proxy depends on this object and get notified of changes to it
    this.connect( proxy );
    
    return proxy;
  }; // proxy()
  
  /* --------------------------------------------------------------------------
     Proxy( name, options )
     
     Data flow: node->proxy(x)->network->relay()->proxy(x)->node
     
     Parameters:
       - name: model name
       
       - options (optional)
  */
  function Proxy( name, options ) {
    Connection.call( this, options );
    this.name = name;
    
    // Maybe the remote proxy already contacted us
    var previous = Proxy.lookup( name)
    
    this.relay        = (previous && previous.relay)        || null
    this.receiveQueue = (previous && previous.receiveQueue) || []
    this.sendQueue    = (previous && previous.sendQueue)    || []
    
    if ( !Proxy.url ) {
      this.server = true;  
    } else {
      this.client = true;
    }
    
    // Track all proxies
    Proxy.register( name, this )
    
    return this;
  } // Proxy()
  
  /*
   *  RPC logic, implemented using l8 actors and proxies
   */
  
  // When running client side, we know the url of the server
  Proxy.url = null
  if( l8.client ){
    // Either a true browser client or a mock nodejs client
    try{ Proxy.url = document.url }catch( e ){
      try{ Proxy.url = "http://localhost:" + process.env.PORT }catch( e ){}
    }
  }
  
  // When running server side, there is an http server involved, app provided
  Proxy.server = function( http_server ){ l8.stage( "local", http_server ); }
  
  // Manage a registry of all the known Proxy instances
  Proxy.AllProxies = {}
  
  // Register a Proxy instance to enable future lookup by name for it
  Proxy.register = function( name, object ){ Proxy.AllProxies[name] = object }
  
  // Lookup for a Proxy instance, typically when a publisher send a message
  Proxy.lookup = function( name  ){ return Proxy.AllProxies[name] }
  
  // Start a local "XS_Proxy" relay actor that peers will talk to
  Proxy.actor = l8.Actor( "XS_Proxy", l8.role( { delegate: {
    relay: function( action ){
      // Get the stage this actor's proxy plays on
      var stage = l8.actor.stage || l8.stage( "local" )
      var name = action.model;
      // Check if a model proxy with that name was ever created locally
      var model_proxy = Proxy.lookup( name );
      if( !model_proxy ){
        // oops, race condition, one side is ahead of the other, let's buffer
        model_proxy = {
          receiveQueue: [],
          sendQueue:    [],
          receive:      function( a ){ this.receiveQueue.push( a) }
        }
        Proxy.register( name, proxy )
      }
      // We may need to talk to that client, via it's own relay actor
      model_proxy.relay = l8.proxy( "XS_Proxy", stage );
      model_proxy.receive( action );
    }
  } } ) )()
  
  // When running client side, we know what relay actor to talk to.
  // When running server side, we must wait until the client talks first.
  Proxy.relay = Proxy.url && l8.proxy( "XS_Proxy", Proxy.url )
  
  /*
   *  End of RPC logic. See .send() using it below
   */
  
  subclass( Connection, Proxy );
  
  extend( Proxy.prototype, {
    
    contact: function() {
    // Establish contact between client and server.
      if ( this.contacted ) return;
      // Client must contact server, server can't contact client, no address
      if ( this.server ) return;
      // If client contacted us, we know what relay to use to talk to client
      if ( this.relay ) {
        this.contacted = true;
        return;
      }
      // To contact server, client sends a dummy 'contact' action, once
      Proxy.relay.send( [ "relay", { name: 'contact', model: this.name } ] );
      // When server receives that, it knows what relay to use with the client
      this.contacted = true;
    }, // contact()
    
    connect: function( subscriber ) {
      this.contact();
      var result = Connection.prototype.connect.call( this, subscriber );
      // Handle case where messages were received before .connect() is called
      if ( this.receiveQueue.length
      &&  !this.handlingQueues
      &&  !this.queueHandlingScheduled
      ) {
        this.queueHandlingScheduled = true;
        var that = this;
        l8.nextTick( function(){
          that.queueHandlingScheduled = false;
          that.handleQueues();
        } )
      }
      return result
    }, // connect()
    
    get: function(){ return []; },
    
    add: function( objects ) {
      return this.send( { name: 'add'   , objects: objects } );
    }, // add()
    
    remove: function( objects ) {
      return this.send( { name: 'remove', objects: objects } );
    }, // remove()
    
    update: function( objects ) {
      return this.send( { name: 'update', objects: objects } );
    }, // update()
    
    send: function( action ) {
    // Typically called by a source that notified us about some change
      if( !action.objects || !action.objects.length ) return this
      action.model = this.name;
      this.contact();
      this.sendQueue.push( action );
      this.handleQueues();
      return this;
    }, // send()
    
    receive: function( action ) {
    // Called when an action is signaled by the paired proxy on the other side.
    // forward action to dependents
      this.receiveQueue.push( action )
      this.handleQueues()
      return this;
    }, // receive()
    
    handleQueues: function(){
      // Don't reenter, only one queue consumer must be active
      if ( this.handlingQueues || this.queueHandlingScheduled )  return this
      if ( !this.sendQueue.length && !this.receiveQueue.length ) return this
      this.handlingQueues = true
      var something = false
      var action
      if( this.relay ){
        while ( action = this.sendQueue.shift() ) {
          something = true
          this.relay.send( ["relay", action] );
        }
      }
      while ( action = this.receiveQueue.shift() ) {
        something = true
        switch ( action.name ) {
        case 'contact' :                                            break;
        case 'add'     : this.connections_add   ( action.objects ); break;
        case 'remove'  : this.connections_remove( action.objects ); break;
        case 'update'  : this.connections_update( action.objects ); break;
        default:
          de&&bug( "Unknown action: " + action.name + ", proxy: " + this.name )
        }
      }
      this.handlingQueues = false
      // Handle whatever maybe got queued additionnaly
      if( something ){ this.handleQueues() }
      return this
    } // handleQueues()
    
  } ); // Proxy instance methods
  
  /* --------------------------------------------------------------------------
     .tracer()
     tracers simply display whatever happens on the object they observe
    
     Usage:
       some_xs_object.tracer()
  */

  Connection.prototype.tracer = function( options ) {
    var tracer = new Tracer( this.name, extend( { key: this.key }, options ) );
    
    // new tracer depends on this object and get notified of changes to it
    this.connect( tracer );
    
    return this;
  }; // tracer()
  
  /* --------------------------------------------------------------------------
     Tracer( name, options )
     
     Data flow: node->tracer
     
     Parameters:
       - name: model name
       
       - options (optional)
  */
  function Tracer( name, options ) {
    Connection.call( this, options );
    this.name  = name;
    this.log = options.log || log
    return this;
  } // Tracer()
  
  
  subclass( Connection, Tracer );
  extend( Tracer.prototype, {
    add: function( objects ) {
      return this.trace( { name: 'add'  , objects: objects } );
    }, // add()
    remove: function( objects ) {
      return this.send( { name: 'remove', objects: objects } );
    }, // remove()
    update: function( objects ) {
      return this.send( { name: 'update', objects: objects } );
    }, // update()
    trace: function( action ) {
      ( this.log || log )(
        [ "tracer", this.name, action.name, action.objects ]
      );
    } // trace()
  } ); // Tracer instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Proxy' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // proxy.js
