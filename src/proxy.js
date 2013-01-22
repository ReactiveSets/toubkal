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
"use strict";

( function( exports ) {
  var XS;
  var l8;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    require( './fork.js' );
    require( './broadcaster.js');
    l8 = require( 'l8/lib/l8.js' );
    require( 'l8/lib/actor.js' );

  } else {
    XS = exports.XS;
    l8 = exports.l8;
  }

  XS.l8 = l8;
  
  var log         = XS.log
    , subclass    = XS.subclass
    , extend      = XS.extend
    , Connection  = XS.Fork
    , Set         = XS.Set
    , Broadcaster = XS.Broadcaster

  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  
  var de = true;
  
  function ug( m ) {
    log( "xs proxy, " + m );
  } // ug()
  
  var mand = l8.mand;
  var bug  = ug; // de&&bug or de&&ug


  /* --------------------------------------------------------------------------
     .proxy( system_wide_name, options )
     A proxy is a downstream channel between a local and a remote object. Both
     objects share the same system wide global name.
     Any operation on the source proxy is signaled to the other side.
    
     Usage:
     
       -- source side
       source.proxy( "xxx" )
       source.add( [an_article, another_story] )
       
       -- destination side
       source = XS.void.proxy( "xxx" ) (or source = new Proxy( null, "xxx" ))
       source.connect( my_mail_box = new Set() )
     
     Implementation: there is a XS_Proxy l8 actor in each client and each
     server. When we need to talk to it, we use a l8 proxy. When the actor
     receives the "relay" message, it relays the message's operation to a
     local object based on the system wide name used to register that object.
     
     If such an object does not exist, the target object name is used to lookup
     for a Publisher that will handle the message and may, or may not, create
     the target object. That target object is a Proxy for a Subscriber object
     that is also create "on demand".
     
     More specifically, for each proxy, there are typically two instances of
     Proxy, in two different places (aka stage, process, javascript vm, etc).
     
     The order in which these instances are created is irrelevant because
     wherever a proxi is reference, it is created if it does not already
     exists. When a proxy sends operations to its peer, the peer get notified.
     If that peer proxy is not yet connected to a local object, it does not
     matter because the notifications are buffered and will be notified to
     the proxied object when it is connected to its proxy.
     
     The actual object a proxy proxies is it's "source" object, because Proxy
     objects are XS node objects too.
     
     Usually, proxies are about duplication, ie have a local set replicated in
     a remote place. But this is not mandatory. For example, one end of the
     proxy link, ie one of the two Proxy instances, can be of some class while
     the other end is of some other class. A source proxy can for example be
     the proxy for a filter while the target/destination proxy proxies a set ;
     in that situation, whatever operation goes thru the filter get applied to
     the remote set ; which is exactely what would happen if the remote set was
     connected locally.
     
     Subscriber proxies are slightly different because of the way they are
     created. Contrary to regular proxies, a subscriber proxy depends on the
     willingness of a publisher, ie if the publisher does not accept the
     subscriber, it will not create the proxy on its side and consequently
     the other side proxy will never get any updates.
  */
  
  function Proxy( source, name, options ) {
    
    Connection.call( this, options );
    this.name = name || source.name;
    
    de&&mand( name.indexOf( "?" ) === -1 );
    
    // Maybe the remote proxy already contacted us (race condition)
    var previous = Proxy.lookup( name );
    
    // Operations are sent to a relay l8 actor (using relay.send()) 
    this.relay        = (previous && previous.relay)        || null;
    this.receiveQueue = (previous && previous.receiveQueue) || [];
    this.sendQueue    = (previous && previous.sendQueue)    || [];
    
    // When there is no remote relay yet, should we buffer the operations?
    this.bufferize = !this.options.bufferless;
    this.bufferize = true; // ToDo: implement false, ie: no buffering
    
    this.url = this.options.url || Proxy.url;
    if ( !this.url ) {
      this.server = true;
    } else {
      this.client = true;
    }
    
    // Track all proxies, by name
    this.register( name, this );
    
    // New proxy depends on source object and get notified of changes to it.
    // This means that this side of the proxy is a producer of updates.
    // The other side is assumed to be a consumer of updates.
    if( source ){
      // Source is local
      source.connect( this );
    } else {
      // Source is remote
      // Hack, so that xx.connect( this ) will fail
      this.source = this;
    }
    
    // Todo: should we call .contact() now? or be lazy and wait until first
    // actual operation?
    // this.contact()
    
    return this;
  } // Proxy()
  
  
  Connection.subclass( "proxy", Proxy, {
    
    factory: function( name, options ) {
      // XS.void.proxy() usage, consumer side
      if( this === XS.void ){
        return new Proxy( null, name, options );
      // some_publisher.proxy() usage, producer side
      } else {
        new Proxy( this, name, options );
        return this;
      }
      return new Proxy( this, name, options );
    }, // factory()
    
    toString: function(){ return "Proxy/" + this.name; },
    
    // The content of a source proxy is the content of its source
    // The content of a target proxy is always empty.
    get: function(){ return this.source !== this ? this.source.get() : []; },
    
    // Operations on a proxy are just sent to the other side, no storage
    add: function( objects ) {
      de&&mand( this.source !== this ); // ok for source proxies only
      return this.send( { name: 'add'   , objects: objects } );
    }, // add()
    
    remove: function( objects ) {
      de&&mand( this.source !== this );
      return this.send( { name: 'remove', objects: objects } );
    }, // remove()
    
    update: function( objects ) {
      de&&mand( this.source !== this );
      return this.send( { name: 'update', objects: objects } );
    }, // update()
    
    send: function( action ) {
    // Called by add/remove/update to forward an operation to the other side.
    // Typically called by a source that notified us about some change
      // Filter out operations with no objects
      if( action.name !== "subscribe" ){
        if( !action.objects || !action.objects.length ) return this;
      }
      de&&mand( this.name );
      // target model of operation is usually the other side proxy. But that
      // is not true regarding the special "subscribe" operation: it's target
      // has to be a new dynamically created proxy. In that case, the model's
      // name is negotiated between the subscriber and the publisher.
      var name = action.model || this.name;
      // When the model name includes a [client id], change it into *
      // because the other side knows nothing about its client id and uses *
      // instead, as a substitute.
      // ToDo: this may change if Proxy.uuid gets implemented.
      var ii = name.indexOf( ".[" );
      if( ii != -1 ){
        name = name.substr( 0, ii + 1 )
        + "*" 
        + name.substr( name.indexOf( "]" ) + 1);
      }
      action.model = name;
      this.contact();
      if( !this.contacted && !this.bufferize ) return this;
      this.relay_it( action );
      return this;
    }, // send()
    
    relay_it: function( action ) {
    // Called by XS_Proxy.relay() and send() when an action has to be relayed
    // from one side to the other.
      // An operation, when relayed, is first sent by one side and then
      // received by the other one.
      if( !action.relayed ){
        de&&mand( !action.relayed );
        action.relayed = true;
        de&&bug( "Relay action, sending it."
          + " Action: " + action.name + " on " + action.model
        );
        de&&mand( action.model.indexOf( "?") === -1 
          ||      action.name === "subscribe" 
        );
        // "subscribe" action travels backwards, ie upstream, no downstream
        de&&mand( this.source !== this || action.name === "subscribe" );
        this.sendQueue.push( action );
      }else{
        de&&mand( action.relayed === true );
        de && (action.relayed = "done"); // basic loop detection
        de&&bug( "Relay action, receiving it."
          + " Action: " + action.name + "on " + action.model
        );
        de&&mand( action.model.indexOf( "?") === -1 
          ||      action.name === "subscribe" 
        );
        de&&mand( this.source === this );
        this.receiveQueue.push( action );
      }
      this.handleQueues();
      return this;
    }, // receive()
    
    handleQueues: function(){
    // Process queued messages, both those sent and those received, asap.
      // Don't reenter, only one queue consumer must be active
      this.contact();
      if ( this.handlingQueues || this.queueHandlingScheduled )  return this;
      if ( !this.sendQueue.length && !this.receiveQueue.length ) return this;
      this.handlingQueues = true;
      var something = false;
      var action;
      if( this.relay ){
        // "bulk" action to send all bufferized actions in one shot
        // ToDo: make it optional
        if( this.sendQueue.length > 1 && false ){ // ToDo: debug this
          something = true;
          var bulk = this.sendQueue;
          this.sendQueue = [];
          this.relay.send( [ "relay ", { name: "bulk", objects: bulk } ] );
        }
        while ( action = this.sendQueue.shift() ) {
          something = true;
          de&&mand( action.model );
          // ToDo: sync mode, where we wait for ack from target before sending
          // more. On timeout or disc, we would unshift whatever we failed to
          // deliver reliably.
          de&&mand( this.source !== this || action.name === "subscribe" );
          this.relay.send( [ "relay", action ] );
          de&&bug( "Sent. Action: " + action.name, " on " + action.model );
        }
      } else {
        if( de && this.sendQueue.length ) {
          de&&bug( "" + this + ". no relay, cannot send yet" );
        }
      }
      while ( action = this.receiveQueue.shift() ) {
        de&&mand( action.relayed );
        de&&mand( this.source === this );
        something = true;
        switch ( action.name ) {
        case 'contact' : /* dummy message clients send once */      break;
        case 'bulk'    :
          var actions = action.objects;
          var len     = actions.length;
          // Push back each action in the queue, lifo
          for ( var ii = len ; ii > 0 ; ii-- ){
            this.receiveQueue.unshift( actions[ ii - 1 ] );
          }
        break;
        case 'subscribe' : this.send( action );                       break;
        case 'add'       : this.connections_add(    action.objects ); break;
        case 'remove'    : this.connections_remove( action.objects ); break;
        case 'update'    : this.connections_update( action.objects ); break;
        default:
          log( "Unknown action: " + action.name + ", proxy: " + this.name );
        }
      }
      this.handlingQueues = false;
      // Handle whatever maybe got queued additionnaly
      if( something ){ this.handleQueues() }
      return this;
    }, // handleQueues()
    
    // Private.
    register:   function(){ Proxy.register(   this.name, this); return this; },
    deregister: function(){ Proxy.deregister( this.name);       return this; },
  
    contact: function( relay ) {
    // Private. Establish contact between client and server asap.
    // When a proxy is contacted it means that both ends of the link can know
    // of the relays to use to communicate with each other.
    // Note: there is no acknowledge, transport mechanism is assumed reliable.
      // While disconnected, no contact is possible
      if ( this.disconnected ){
        throw new Error( "Cannot contact(), disconnected" );
      }
      if ( this.contacted ) return;
      // If client contacted us, we know what relay to use to talk to client
      if( relay ){
        de&&mand( !this.relay );
        this.relay = relay;
      }
      // If the url to the server is known, contact it (server to server case)
      if ( this.url && !this.relay ) {
        this.relay = l8.proxy( "XS_Proxy", l8.stage( this.url, this.url ) );
      }
      // When the relay is known, assume contact is established
      if ( this.relay ) {
        this.contacted = true;
        // Handle relay disconnection
        Proxy.register_remote_resource(
          this.relay.stage.name,
          this.name,
          this
        );
        // When no buffer, send the whole content
        if ( !this.bufferize ){
          this.add( this.get() );
        }
        return;
      }
      // Client must contact server, server can't contact client, no url
      if ( this.server ) return;
      // To contact server, client sends a dummy 'contact' action, once.
      // Note: we don't expect an acknowledge. Assumed.
      // ToDo: avoid sending contact message that when possible, ie when
      // some add/update/remove message is beeing sent. Send that message
      // instead.
      de&&mand( this.name );
      // Note: this could be done when proxy is created, on the client side.
      // ToDo: do it at creation time? Or delay until proxy is first utilized?
      // ie: should client side proxies be lazy about their connection?
      // By beeing lazy (and buffering) we could handle automatic client
      // reconnections to the server (with some policy).
      Proxy.relay.send( [ "relay", { name: 'contact', model: this.name } ] );
      // When server receives that, it knows what relay to use with the client
      this.contacted = true;
      // Handle relay disconnection. ToDo: move that to constuctor?
      Proxy.register_remote_resource( Proxy.relay.name, this.name, this );
    }, // contact()
    
    connect: function( subscriber ) {
      // ToDo: figure out a way to avoid connection() redefinition
      de&&mand( this.source === this ); // only ok on the target side
      this.contact();
      var result = Connection.prototype.connect.call( this, subscriber );
      // ToDo: DRY, this code is a duplicate from handleQueues()'s prologue.
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
        } );
      }
      return result;
    }, // connect()
    
    disconnection: function(){
    // Private. called when contact is lost with remote proxy.
      // Let's start from fresh, bufferize (maybe) until next contact
      this.relay      = null;
      this.contacted = false;
      // ToDo: Tell the source about that? how?
      if( this.source ){
        //this.source.disconnect( this)
      }
    },
    
  } ); // Proxy
  
  /* --------------------------------------------------------------------------
   *  RPC logic, implemented using l8 actors and proxies
   */
    
  // Manage a registry of all the known Proxy instances, key is proxy's name
  Proxy.AllProxies = {};
  
  // Register a Proxy instance to enable future lookup by name for it
  Proxy.register = function( id, object ){
    de&&mand( id );
    de&&mand( object );
    de&&mand( id.indexOf( "?" ) === -1 );
    // Never register an object when a different one is already registered
    de&&mand( !Proxy.AllProxies[ id ] || Proxy.AllProxies[ id ] === object );
    Proxy.AllProxies[id] = object;
  };
  
  // Deregister a Proxy instance, called when that instance is detroyed
  Proxy.deregister = function( id ){
    de&&mand( id );
    // Deregistering a non registered proxy is most probably a bug
    de&&mand( Proxy.AllProxies[ id ] );
    delete Proxy.AllProxies[ id ];
  };
  
  // Lookup for a Proxy instance, typically when a message is received
  Proxy.lookup = function( id  ){ return Proxy.AllProxies[id]; };
  
  // Manage a registry of all known remote subscribers. Handles disconnections.
  Proxy.AllRemotes = {};
  
  // Register a remote subscriber, id is client:xx. Returns same result
  // .lookup_remote() will.
  Proxy.register_remote = function( id ){
    de&&mand( id );
    var remote = Proxy.lookup_remote( id );
    if( remote )return remote;
    Proxy.AllRemotes[id] = remote = { id: id, resources: {} };
    return remote;
  };
  
  // Lookup for a remote suscriber. Returns { id:"name", resources: {...} }
  // where resources is {xx: {id:xx,resource:o}, yy: {id:yy,resource:o2}, ...}
  Proxy.lookup_remote = function( id ){ return Proxy.AllRemotes[ id ]; };
  
  // Register a remote subscriber resource, to be detroyed on disconnection
  Proxy.register_remote_resource = function( id, resource_id, resource ){
    de&&mand( id );
    // Don't do that for local resources
    // ToDo: explain why
    // if ( id === "local" || id === "XS_Proxy" ) return
    var remote = Proxy.lookup_remote( id );
    if ( !remote ) {
      de&&bug( "Cannot register " + resource_id + " for unknown " + id );
      return;
    }
    //de&&mand( remote );
    //if ( !remote ) throw new Error( "Cannot register resource, bad id");
    remote.resources[resource_id] = { id: resource_id, resource: resource };
  };
  
  // Deregister a remote subscriber resource. Returns that resource or null.
  Proxy.deregister_remote_resource = function( id, resource_id ){
    var remote = Proxy.lookup_remote( id );
    de&&mand( remote );
    if ( !remote ) throw new Error( "Cannot deregister resource, bad id" );
    var resource = remote.resources[ resource_id ];
    delete remote.resources[ resource_id ];
    return resource.resource;
  };
  
  // Calls .disconnection( remote_id, resource_id ) on all the resources
  // registered for a remote id. This is called typically when a subscriber
  // disconnects.
  Proxy.disconnection = function( id ){
    var remote = Proxy.lookup_remote( id );
    var resources = remote.resources;
    var resource
    de&&mand( resources );
    for ( var rid in resources ){
      resource = resources[rid]
      resource.resource.disconnection( id, rid );
      delete resources[id];
    }
    delete Proxy.AllRemotes[id];
  };
  
  // When running client side, we know the url of the server
  Proxy.url = null;
  if( l8.client ){
    // Either a true browser client or a mock nodejs client
    try{ Proxy.url = document.url }catch( e ){
      try{ Proxy.url = "http://localhost:" + process.env.PORT }catch( e ){}
    }
  }
  
  // When running client side, we know what relay actor to talk to, it's the
  // one hosted by the server we connect to.
  // When running server side, we must wait until the client talks first.
  Proxy.relay = null;
  if ( Proxy.url ) { 
    Proxy.relay = l8.proxy( "XS_Proxy", l8.stage( Proxy.url ) );
    // Handle disconnection with server
    Proxy.register_remote( Proxy.relay.stage.name, Proxy.relay );
  }
  
  // Proxy.stage = l8.stage( "local")
  // Handle disconnection of local stage. Not expected. ToDo: fix that
  Proxy.register_remote( "local", Proxy );
  
  // When running client side, we could use an application provides session_id
  // instead of an id that changes each time a new connection is
  // established with the server. This would be important to handle client
  // reconnections.
  // ToDo: fully implement this
  Proxy.uuid = null;
  
  // If the server relay is/becomes unreachable, what do we do?
  // ToDo: implement reconnection policy.
  Proxy.keep = function(){
    if( Proxy.relay ){
      Proxy.relay.stage.defer( function(){
        // ToDo: implement reconnect policy
        try{ Proxy.reconnect() }catch( e ){ Proxy.relay = null }
      });
    }
  };
  
  // When running server side, there is an http server involved, app provided.
  // Using it we can start our local proxy actor that client will contact.
  Proxy.server = function( http_server ){ l8.stage( "local", http_server ); };

  // Start a local "XS_Proxy" relay actor that peers will talk to, soon proxied
  Proxy.actor = l8.Actor( "XS_Proxy", l8.role( {
    
    // "relay" message handling. ToDo: avoid it and use catch() instead?
    relay: function( action ){
      
      de&&bug( "XS_Proxy.relay() called"
        + " for action " + action.name 
        + " on model " + action.model
      );
      
      // Get the stage this actor's invoker plays on, supposedly remote.
      var stage = l8.actor.stage || l8.stage( "local" );
      action.stage = stage;
      
      de&&bug( "XS_Proxy.relay() called from stage " + stage );
      
      // If new stage, register a disconnection callback to clean stuff
      var remote = Proxy.lookup_remote( stage.name );
      if ( !remote ){
        log( "XS_Proxy.relay(). New client incoming connection: " + stage );
        remote = Proxy.register_remote( stage.name );
        // Register a callback to be called on disconnection. It will destroy
        // all the ressources associated with the remote entity.
        stage.defer( function( stage ) {
          de&&bug( "Disconnection of " + stage );
          Proxy.disconnection( stage.name );
        } );
      }
      
      // The relay deals with actions, usually directed toward a "model".
      var name = action.model;
      
      // Look for the model proxy
      var model_proxy = Proxy.lookup( name );
      
      // If not found, maybe it is because this side needs a client id
      if ( !model_proxy ){
        // When the model name includes *?, replace that with the [client_id]
        var star = name.indexOf( "*?" );
        if( star !== -1 ){
          // The client does not know it's own id, this is a workaround
          name = action.model
          = name.substr( 0, star )
          + "[" + stage.name + "]"
          + name.substr( star + 2);
          de&&bug( "actual model name is " + name );
        
        // When name includes a client name, get rid of it
        } else if( !Proxy.uuid ) {
          // clients are not supposed to spoof their name!
          var bracket = name.indexOf( "[" );
          if( bracket !== -1 ){
            log( "spoof " + name + " from " + stage.name );
            name = action.model
            = name.substr( 0, bracket - 1)
            + name.substr( name.indexOf( "]") + 1);
          }
        }
        model_proxy = Proxy.lookup( name );
      }
      
      // Check if a model proxy with that name was ever created locally
      if( !model_proxy ){
        
        // New model, are we handling a subscriber?
        if ( name.substr( 0, 8 ) === "pub/sub." ) {
          return this.pubsub( action );
        }
        
        log( "XS_Proxy.relay(). New model " + name + " referenced by " + remote.name );
        
        // oops, race condition, one side is ahead of the other, let's buffer
        model_proxy = {
          receiveQueue: [],
          sendQueue:    [],
          contact:      function( relay ){ this.relay = relay },
          receive:      function( a ){ this.receiveQueue.push( a) }
        };
        
        // Register the half backed proxy
        Proxy.register( name, model_proxy );
      }
      
      // We may need to talk to that client, via it's own relay actor
      model_proxy.contact( l8.proxy( "XS_Proxy", stage ) );
      
      // Forward the received message to the local proxy (or half backed one)
      de&&bug( "XS_Proxy.relay()"
        + " forwards action " + action.name
        + " to " + model_proxy
      );
      model_proxy.relay_it( action );
    }, // relay.relay()
    
    // Actions on special pub/sub models are special
    pubsub: function( action ){
      
      // Look for a Publisher object, based on the model name
      var name = action.model;
      log( "subscriber stuff on " + name + " by " + action.stage.name );
      // pub/sub.xxxx/yyyy is a would be subscriber, lookup the publisher
      var pubsub = name.substr( 8 ); // pub/sub. prefix
      var pub;
      var slash = pubsub.indexOf( "/" );
      if( slash === -1 ) {
        pub = name;
      } else {
        pub = "pub/sub." + pubsub.substr( 0, slash );
      }
      var publisher = Proxy.lookup( pub );
      
      // Forward message to local publisher, a fake proxy.
      if ( publisher ){
        return publisher.receive( action );
      }
      
      // No publisher. ToDo: could bufferize, until publisher() is created
      log( "Invalid publisher " + pub
        + " for remote subscribtion " + name
        + " of client " + action.stage
      );
      
    }, // relay.pubsub()
    
    catch: function( method ){
      log( "Unsupported relay method: " + method.join( ",") );
    } // relay.catch()
    
  } ) )();
  
  /*
   *  End of RPC logic.
   */
  

  /* --------------------------------------------------------------------------
     .publisher( name, options )
     Pipelet for Publisher.
     A Publisher connects a data source to subscribers. When a subscriber edit
     the data, the change is forwarded to the other subscribers. Some 
     subscribers are local, some are remote.
    
     Usage:
     
       -- publisher side
       publisher = daily_mirror.publish( "daily_mirror")
       daily_mirror.add( [an_article, another_story] )
       
       -- subscriber side
       reader = XS.void.subscribe( "daily_mirror")
       reader.connect( xxx)
       editor = reader
       reader.update( [an_article])

     Data flow: source->publisher->local_subscribers
                source->publisher->remote_subscribers
                subscriber->publisher.notify( t, initiator )
  */
  
  function Publisher( source, name, options ) {
    Connection.call( this, options );
    this.name = name || source.name;
    // Create a fake proxy so that remote subscribers can subscribe.
    // When relay actor receives a subscription msg, it calls This.receive()
    Proxy.register( "pub/sub." + this.name, this );
    // New publisher depends on it's source and get notified of changes to it
    source.connect( this );
    return this;
  } // Publisher()

  Connection.broadcaster.subclass( "publisher", Publisher, {
    
    factory: function( name, options ) {
      var factory = options && options.factory;
      return factory
      ? factory(       this, name, options )
      : new Publisher( this, name, options );
    },
    
    toString: function(){ return "Publisher/" + this.name; },
    
    get: function(){ return this.source.get(); },
    
    notify: function( transaction, initiator ){
      // Called by .receive() when a subscriber submit an operation.
      // Default is to notify the publisher source about the transaction.
      return this.source.notify( transaction, initiator );
      // If the source plays the transaction, as most do, as a result
      // all subscribers, including the initiator of the action,
      // will have the action notified to them.
      // ToDo: loop detection?
    },
    
    accept: function( subscriber, stage, filter ){ return true; },
    
    disconnection: function() { return this; },  // handled by local subscriber
    
    receive: function( action ) {
    // Called when an action is proposed by a subscriber, local or remote
    
      var subscriber = action.model;
      var stage      = action.stage;
    
      // When the action is invoked by a remote subscriber
      if( stage ){
        
        // Determine what the name for the proxy would be, if accepted
        var name = subscriber;
        
        // Does such a proxy already exists? ie, was subscription accepted?
        subscriber = Proxy.lookup( name);
        
        // If new subscriber, should the will be subscriber be accepted?
        if ( !subscriber ){
          log( "new remote subscriber: " + name + ". action: " + action.name );
          if ( action.name !== 'subscribe' ){
            log( "Subscriber " + name + " should subscribe. " + action.name );
            return;
          }
          // If not accepted, silently ignore the subscription request
          // ToDo: should signal the rejection, how?
          if ( !this.accept( name, stage, action.filter, action.all ) ) {
            return;
          }
          
          // OK. Subscriber is accepted, create a local subscriber proxy for it
          subscriber = this.subscriber( this, {
            filter: action.filter,
            all:    action.all,
            stage:  stage
          } );
          var proxy = new Proxy( subscriber, name );
          
          // We may need to talk to that subscriber, via it's own relay actor
          proxy.contact( l8.proxy( "XS_Proxy", stage ) );
          
          // Register as a resource to handle subscriber.disconnection()
          Proxy.register_remote_resource( stage.name, name, subscriber );
          
          // If all is required, not just news, send the whole content
          if( action.all ){
            subscriber.add( this.get() );
          }
          
          return;
        }
        // The subscriber is valid, let's proceed
      }
      
      // Actions from subscribers impact the publisher's source.
      // It is up to the publisher to accept or ignore the action depending on
      // the subscriber authorizations. Default is to accept the action and
      // forward it to the publisher's source. See .notify()
      this.notify( [action], subscriber );
      
      return this;
    }, // receive()
    
  } );
  
  
  /* --------------------------------------------------------------------------
     .subscriber( publisher, options )
     Attach a new subscriber to a publisher. Operations on the publisher are
     forwarded to the subscriber. Publisher is either local or remote.
     
     options.filter is a filter sent to the publisher so that it can send only
     the data that the subscriber desires.
     
     options.stage is the stage where the remote subscriber operates.
     
     options.url is the url to contact the publisher
  */
  
  // Each subscriber has a unique id, a part of it is locally generated
  Proxy.NextSubscriberId    = 1;
  
  // The application can monitor publisher creation/destruction
  Proxy.AllRemotePublishers = new XS.Set();
  
  function Subscriber( publisher, options ){

    Connection.call( this, options );
    this.filter = this.options.filter;
    this.stage  = this.options.stage || l8.stage( "local" );
    this.url    = this.options.url
    this.all    = this.options.url
    
    // If local publisher, simple, just connect the subscriber to it
    if ( typeof publisher !== 'string' ){
      this.name = publisher.name;
      publisher.connect( this );
      return this;
    }
    
    // If remote subscriber, we need to use a proxy object, dynamic
    var sub_name
    = "pub/sub." + publisher + "/"
    + (Proxy.NextSubscriberId++) + ".*";
    // ToDo: use Proxy.uuid when available
    this.name = sub_name;
    this.proxy_sub = new Proxy( null, sub_name );
    
    // Ask publisher to send updates to the newly created proxy, if it accepts
    // ToDo: what about the case where the publisher rejects the subscriber?
    this.proxy_sub.url = this.url;
    de&&bug( "" + this + " sends a 'subscribe', via proxy " + this.proxy_sub );
    this.proxy_sub.relay_it( {
      name:   "subscribe",
      model:  sub_name + "?", // *? becomes [client id] on the receiver side
      filter: this.filter,
      all:    this.all,       // defaults to false, only news are required
    } );
    
    // Register the proxied subscriber, to handle .disconnection()
    Proxy.register_remote_resource(
      this.stage.name, // ToDo: should be this.proxy_sub.stage.name
      this.proxy_sub.name,
      this
    );
    
    // Everything that happens to the proxy will be forwarded to this object
    this.proxy_sub.connect( this );
    de&&mand( this.source === this.proxy_sub );
    return this;
  } // Subscriber()
  
  Connection.broadcaster.subclass( "subscriber", Subscriber, {
    
    factory: function( p1, p2 ){
      // XS.void.subscriber( "some_publisher") usage
      if( this === XS.void ){
        return new Subscriber( p1, p2 );
      // some_publisher.subscriber() usage
      } else {
        return new Subscriber( this, p1 );
      }
    },
    
    toString: function(){ return "Subscriber/" + this.name; },
    
    // When a subscriber receive an action, it is actually for the publisher
    receive: function( action ){ return this.source.receive( action ); },
    
    disconnect: function( target ) {
      if ( target === this.proxy_sub ) {
        this.disconnection();
        return this;
      }
      // Invoke super
      return Subscriber.disconnect.call( this, target);
    },
    
    disconnection: function(){
      // Called when the remote entity disconnects
      this.publisher.disconnect( this );
      var proxy = this.proxy_sub;
      if( proxy ){
        this.proxy_sub = null;
        Proxy.deregister_remote_resource( proxy.stage.name, proxy.name );
      }
    }
    
  } ); // subscriber

  
  /* --------------------------------------------------------------------------
     .tracer( options )
     Tracers simply display whatever happens on the object they observe. 
     Data flow: source->tracer
     option log:   log function, defaults to XS.log()
            usage: log( target, operation, objects )
     Usage:
       some_xs_object.tracer()
       some_xs_object.tracer( { log: function( t ){ log( t)
       
    ToDo: the equivalent of Unix's tee.
  */

  function Tracer( source, options ) {
    Connection.call( this, options );
    // new tracer depends on source object and get notified of changes to it
    source.connect( this );
    this.log = options.log || log;
    this.name = source.name;
    return this;
  } // Tracer()

  Connection.subclass( "tracer", Tracer, {
    factory: function( options ){ return new Tracer( this, options ) },
    toString: function() { return "Tracer/" + this.name; },
    add: function( objects ) {
      return this.trace( { name: 'add'  , objects: objects } );
    }, // add()
    remove: function( objects ) {
      return this.trace( { name: 'remove', objects: objects } );
    }, // remove()
    update: function( objects ) {
      return this.trace( { name: 'update', objects: objects } );
    }, // update()
    trace: function( operation ) {
      ( this.log || log ).apply( this,
        [ this.source, operation.name, operation.objects ]
      );
    } // trace()
  } ); // Tracer instance methods
  

  /* --------------------------------------------------------------------------
     module exports
  */
  // ToDo: JHR, export Tracer?
  eval( XS.export_code( 'XS', [ 'Proxy', 'Publisher', 'Subscriber' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // proxy.js
