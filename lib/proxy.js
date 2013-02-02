/*  proxy.js

    usage:
      producer.publish(  "xxx" );  
      consumer = xs.subscribe( "xxx" );
      
      local_object.proxy( "yyy" )
      remote_object = xs.proxy( "yyy" )

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
    XS = require( 'excess/lib/xs.js' ).XS;
    require( 'excess/lib/fluid.js'   );
    require( 'excess/lib/fork.js'    );
    l8 = require( 'l8/lib/l8.js'     );
    require( 'l8/lib/actor.js'       );

  } else {
    XS = exports.XS;
    l8 = exports.l8;
  }

  var log       = XS.log
    , the_void  = XS.fluid
    , xs        = XS.fluid    
    , Pipelet   = XS.Pipelet
    , Datalet   = XS.Pipelet
  ;

  // Export l8
  XS.l8 = xs.l8 = l8;
  

  /* --------------------------------------------------------------------------
     de&&ug()
  */
  
  var de = true;
  
  function ug( m ) {
    log( "xs proxy, " + m );
  } // ug()
  
  var mand = l8.mand;
  var bug  = ug; // de&&bug and de&&ug, Jean Vincent && Jean Hugues Robert
  
  // Ask l8 to use XS.log instead of its own trace method.
  l8.logger( function(){ return log; } );
  
  
  /* --------------------------------------------------------------------------
     .proxy( system_wide_name, options )
     A proxy is a channel over IP between a local and a remote object. Both
     objects share the same system wide global name.
     Any method called on the local proxy is invoked on the peer proxy.
     
     This means that a call to .add() on one side will have for effect .add()
     on the peer proxy, that will immediatly invoke .add() on it's destination,
     which, btw, is also it's source... ie, proxy are bidirectionnal.
     
     this also means that a call to .emit_add() will have for effect a call to
     .emit_add() on the peer object.
     
     ToDo: this is really weird and I don't like it because .emit_xxx() are
     supposed to be private methods but the pub/sub solution breaks the
     encapsulation and calls it... I wonder if add() + propose_add() versus
     add() + emit_add() was not a cleaner solution after all, because
     propose_add() was clearly a public method of the publisher, meant to be
     called when something done on the subscriber side was willing to have the
     publisher perform an operation, if it agrees, despite the fact that it
     was not it's source that is asking that but a subscriber, something that
     looks more like a destination than a source... (looks like a destination
     but is not a destination, at least not the way a destination
     is retrieved using this.destination, retrieved by the subscriber of
     course (or else this would be another encapsulation violation)). It this
     does look like its not clear... well, maybe that's because it is not.
    
     Usage:
     
       -- source side
       source xs.set()
       source.proxy( "xxx" )
       source.add( [...] )
       
       -- destination side
       source = xs.proxy( "xxx" ) // client/server
       source = xs.proxy( "xxx", { url: "http:..." } ) // peer to peer
       source.log()
     
     Implementation: there is a XS_Proxy l8 actor in each client and each
     server. When we need to talk to it, we use a l8 proxy. When the actor
     receives the "relay" message, it relays the message's operation to a
     local object based on the system wide name used to register that object.
     
     If such an object does not exist, the target object name is used to lookup
     for a Publisher that will handle the message and may, or may not, create
     the target object. That target object is a Proxy for a Subscriber object
     that is also created "on demand".
     
     More specifically, for each proxy, there are typically two instances of
     Proxy, in two different places (aka stage, process, javascript vm, etc).
     
     The order in which these instances are created is irrelevant because
     wherever a proxy is referenced, it is created if it does not already
     exists. When a proxy sends operations to its peer, the peer get notified.
     If that peer proxy is not yet connected to a local object, it does not
     matter because the notifications are buffered and will be notified to
     the proxied object when it is connected to its local object.
     
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
    
    Pipelet.call( this, options );
    this.name = name || source.name;
    
    de&&bug( "New proxy " + this );
    
    // Maybe the remote proxy already contacted us (race condition)
    var previous = Proxy.lookup( name );
    
    // Operations are sent to a relay l8 actor (using relay.send()) 
    this.relay        = (previous && previous.relay)        || null;
    this.receiveQueue = (previous && previous.receiveQueue) || [];
    this.sendQueue    = (previous && previous.sendQueue)    || [];
    
    // When there is no remote relay yet, should we buffer the operations?
    this.bufferize = !this.options.bufferless;
    this.bufferize = true; // ToDo: implement false, ie: no buffering
    
    // When the peer's url is not specified, listen mode.
    this.url = this.options.url || Proxy.url;
    if ( !this.url ) {
      this.listen = true;
    }
    
    // Track all proxies, by name
    this.register( name, this );
    
    // New proxy depends on a source object and get notified of changes to it.
    // This means that this side of the proxy is a producer of updates.
    // The other side is assumed to be a consumer of updates.
    // ToDo: when source is The Void, obj.set_source() should not set
    // obj.source to null, it should set it to the_void, this would simplify
    // the code in a lot of places.
    // Note: when source === the_void, it means that the peer is the source.
    // ToDo: JHR, I don't want it but set_source() call this.add(), even
    // when the proxy is on the destination side.... See how I got by
    // in .add()
    // ToDo: if set_source() could handle the_void, I could avoid testing
    // against it. As of today I must not use set_source( the_void ).
    if( source !== the_void ){
      de&&mand( !this.set_source_done );
      de && ( this.set_source_done = true );
      this.set_source( source );
    }
    de&&mand( (this.source === source) || source === the_void );
    
    // This looks weird but the destination of a Proxy is also it's source.
    // This is because proxy are bidirectionnal.
    this.destination = source;
    
    this.contact();
    
    return this;
  } // Proxy()
  
  
  xs.pipelet.subclass( Proxy, {
    
    factory: function( source, name, options ) {
      // xs.proxy() usage, consumer side
      // ToDo: simplify when the dust settles
      if( source === the_void || source.is_void ){
        return new this( source, name, options );
      // some_publisher.proxy() usage, typically, producer side
      } else {
        new this( source, name, options );
        return source;
      }
    }, // factory()
    
    toString: function(){
      return "Proxy/"
      + this.name + ( this.url ? ( "(" + this.url + ")" ) : "" );
    },
    
    // The content of a proxy is the content of its source
    // ToDo: this.source could be the_void instead of null, this would
    // simplify the code in a lot of places. ie: the_void.get() -> []
    get: function(){ return (this.source && this.source.get()) || [] },
    
    // ToDo: for now, fetch works like get
    fetch: function( produce ){
      var a = this.get();
      a.length && produce( a );
      // ToDo: There should be a global XS.no_more
      // ie: produce( xs.no_more )
      produce( [] );
    },
    
    // A proxy is a source when it's source is not void
    // ie, the proxy is a source on the side where operations are pushed,
    // on the other side, where the pushed operations are received, the
    // proxy is a destination.
    // ToDo: if source was never null.. ie. was the_void, the definition of
    // this method would be:
    // is_source: function() { return this.source !== the_void; },
    is_source: function() { return this.source && this.source !== the_void; },
        
    // Operations on a proxy are just sent to the other side, no storage
    add: function( objects, by_subscriber ) {
      // ToDo: JHR, set_source() calls .add() but I don't want that...
      // See comment before about that.
      // However, because the source is The Void, objects is null and
      // I could adapt my assert.
      // ok for source proxies only, unless done by a subscriber
      if( !objects || !objects.length )return this;
      // de&&mand( this.is_source() || by_subscriber );
      // I cannot do this assert because the fact that the add operation
      // comes from a subscriber get lost when .notify() is involved.
      return this.send( { 
        name:         'add',
        objects:       objects
      } );
    }, // Proxy.add()
    
    remove: function( objects, by_subscriber ) {
      if( !objects || !objects.length )return this;
      de&&mand( this.is_source() || by_subscriber );
      return this.send( { 
        name:          'remove',
        objects:       objects,
        by_subscriber: by_subscriber
      } );
    }, // Proxy.remove()
    
    update: function( objects, by_subscriber ) {
      if( !objects || !objects.length )return this;
      de&&mand( this.is_source() || by_subscriber );
      return this.send( {
        name:          'update',
        objects:       objects,
        by_subscriber: by_subscriber
      } );
    }, // Proxy.update()
    
    // When dealing with an add(), the publisher calls .emit_add() on the
    // subscriber, breaking encapsulation. But it has no choice because
    // if it were to call .add() on the subscriber... it would look exactly
    // like what is done when something on the subscriber side does a .add()
    // to ask the publisher to .add() something (something added to it's
    // destination, which is also directly or indirectly downsteam connected
    // to the direct or indirect source of the publisher... this might be
    // called a feedback loop, I guess, when a source contributes to effects
    // on itself due to work done by its destinations).
    emit_add: function( objects, by_publisher ) {
      if( !objects || !objects.length )return this;
      // ok for source proxies only, unless done by a publisher
      // de&&mand( this.is_source() || by_publisher );
      return this.send( { 
        name:         'emit_add',
        objects:       objects,
        by_publisher:  by_publisher 
      } );
    }, // Proxy.emit_add()
    
    emit_remove: function( objects, by_publisher ) {
      if( !objects || !objects.length )return this;
      de&&mand( this.is_source() || by_publisher );
      return this.send( { 
        name:          'remove',
        objects:       objects,
        by_publisher:  by_publisher
      } );
    }, // Proxy.emit_remove()
    
    emit_update: function( objects, by_publisher ) {
      if( !objects || !objects.length )return this;
      de&&mand( this.is_source() || by_publisher );
      return this.send( {
        name:          'emit_update',
        objects:       objects,
        by_publisher:  by_publisher
      } );
    }, // Proxy.emit_update()
  
    send: function( action ) {
    // Called by add/remove/update to forward an operation to the other side.
    // Typically called by a source that notified us about some change.
    // Also called by .emit_add()/remove/update to forward a "thing to define"
    // to the other side. I hesitate to call .emit_add() an operation, because
    // it does not look it it is one, it looks to me more like a hack that 
    // anything else.
    // Also called by a subscriber when it is remote and need it's remote
    // publisher to create, if that's authorized, a peer proxied subscriber.
      // Filter out operations with no objects
      if( action.name !== "subscribe" ){
        if( !action.objects || !action.objects.length ) return this;
      }
      de&&mand( this.name );
      // target model of operation is usually the other side proxy. But that
      // is not true regarding the special "subscribe" operation: it's target
      // has to be a new dynamically created proxy. In that case, the proxy's
      // name is negotiated between the client and the server ; it typically
      // includes a part that depends on the publisher's name and a part that
      // depends on the client id, when avaible, a client side subscriber id
      // and something that that represent the client in terms of socketIo
      // connection, something definitely needs when the client id is not
      // available, ie anonymous clients typically.
      var name = action.model || this.name;
      // Get rid of the [Client:xxx] part of the name, it is strickly local
      // and has no meaning for the other side, a side that knows only about
      // a local proxy whose name certainly does not include a [Client:xxx]
      // part, something that only the server knows about, because it's
      // basically the name of the socketIo connection. Note: [xxx] may
      // also include a url instead of a socketIo connection id, that does
      // not change the issue, that part needs to be removed.
      var ii = name.indexOf( "[" );
      if( ii !== -1 ){
        name = name.substr( name, ii );
      }
      action.model = name;
      this.contact();
      if( !this.contacted && !this.bufferize ) return this;
      this.relay_it( action );
      return this;
    }, // Proxy.send()
    
    relay_it: function( action ) {
    // Called by XS_Proxy.relay() and send() when an action has to be relayed
    // from one side to the other.
    // Also works for the "emit_xxx" things that don't look like operations but
    // have some weird similarities with them.
      // An operation, when relayed, is first sent by one side and then
      // received by the other one.
      
      // If action needs to be sent (sender side)
      if( !action.relayed ){
        action.relayed = true;
        de&&bug( "Relay action, sending it, queue it in send queue."
          + " Action: " + action.name + " on " + action.model
          + " for " + ((action.objects && action.objects.length) || 0) + " objects"
          + ". Destination : " + ( this.relay || " not yet known, queued" )
        );
        de&&mand( action.model.indexOf( "[") === -1 );
        // "subscribe" actions travel backwards, ie upstream, not downstream
        // de&&mand( this.is_source() || action.name === "subscribe" || action.by_subscriber );
        // I cannot do that assert because the fact that the operation comes
        // from a subscriber get lost when .notify() is involved.
        this.sendQueue.push( action );
        
      // If action was relayed, we are the receiving side
      }else{
        de && (action.relayed = "done");
        de&&bug( "Relay action, receiving it, queue it in receive queue."
          + " Action: " + action.name + " on " + action.model
          + " for " + ((action.objects && action.objects.length) || 0 ) + " ojbects"
        );
        de&&mand( action.model.indexOf( "[") === -1 );
        this.receiveQueue.push( action );
      }
      this.handleQueues();
      return this;
    }, // Proxy.relay_it()
    
    handleQueues: function(){
    // Process queued messages, both those sent and those received, asap.
      // Don't reenter, only one "queue consumer" needs to be active, or else
      // it probably means that we might go deep in the stack and maybe
      // too deep (javascript stack is large but not that much, about 10 000
      // calls, after that... an error is raised) 10 000  is a lot, but
      // excess may handle very big sets and very big graphs of connected sets.
      this.contact();
      if ( this.handlingQueues || this.queueHandlingScheduled )  return this;
      if ( !this.sendQueue.length && !this.receiveQueue.length ) return this;
      this.handlingQueues = true;
      var something = false;
      var action;
      // Handle stuff to send
      if( this.relay ){
        // "bulk" action to send all bufferized actions in one shot
        // ToDo: make it optional
        if( this.sendQueue.length > 1 && false ){ // ToDo: debug this
          something = true;
          var bulk = this.sendQueue;
          this.sendQueue = [];
          this.relay.send( [ "relay ", { name: "bulk", objects: bulk } ] );
        }
        de&&bug( "Processing send queue of " + this );
        while ( action = this.sendQueue.shift() ) {
          something = true;
          // ToDo: sync mode, where we wait for ack from target before sending
          // more. On timeout or disc, we would unshift whatever we failed to
          // deliver reliably.
          l8.trace( "" + this + ". processing send queue operation: " + action.name
          + " to be sent to " + this.relay );
          if( de && action.by_subscriber ){
            l8.trace( "that action is coming from a subscriber");
          }
          de&&mand( action.model );
          // de&&mand( this.is_source() || action.name === "subscribe" || action.by_subscriber );
          // I cannot do that assert because the fact that the operation comes
          // from a subscriber get lost when .notify() is involved.
          this.relay.send( [ "relay", action ] );
          de&&bug( "Sent. Operation: " + action.name, " on " + action.model
          + ". Destination: " + this.relay );
        }
      } else {
        if( de && this.sendQueue.length ) {
          de&&bug( "" + this + ". no relay, cannot send queued operations yet" );
        }
      }
      // Handle stuff received
      de&&bug( "Process receive queue of " + this );
      while ( action = this.receiveQueue.shift() ) {
        l8.trace( "" + this + ". processing receive queue action: " + action.name);
        if( de && action.by_subscriber ){
          l8.trace( "that action is coming from a subscriber");
        }
        de&&mand( action.relayed );
        // de&&mand( !this.is_source() || action.by_subscriber );
        // Actions from subscribers are just proposals, that the publisher will
        // accept, maybe. The base class publisher accepts, but a derived
        // class may not.
        something = true;
        var o = action.objects;
        switch ( action.name ) {
        case 'contact' : /* dummy message clients send once */      break;
        case 'bulk'    :
          var actions = o;
          var len     = actions.length;
          // Push back each action in the queue, lifo
          for ( var ii = len ; ii > 0 ; ii-- ){
            this.receiveQueue.unshift( actions[ ii - 1 ] );
          }
        break;
        case 'subscribe'   : this.send( action );                       break;
        // When a proxy receives an op, it forwards it to the proxied object
        case 'add'         : this.destination.add(         o ); break;
        case 'remove'      : this.destination.remove(      o ); break;
        case 'update'      : this.destination.update(      o ); break;
        case 'clear'       : this.destination.clear(       o ); break;
        case 'emit_add'    :
          // ToDo: because I break encapsulation and need to call the
          // .emit_add() method of the destinations, I need to dig into
          // the destination object and basically implement a emit_emit_add()
          // myself. This is another clear sign that the model is broken.
          if( this.destination instanceof XS.Tee ){
            var d = this.destination.destinations, l = d.length;
            for ( var i = -1; ++i < l; ) d[ i ].emit_add( o );
          } else {
            this.destination.emit_add( o );
          }
        break;
        case 'emit_remove' : this.destination.emit_emit_remove( o ); break;
        case 'emit_update' : this.destination.emit_emit_update( o ); break;
        case 'emit_clear'  : this.destination.emit_emit_clear(  o ); break;
        default:
          // ToDo: remove the cases and do:
          // this.destination[action.name].call( this, o );
          // Why: much faster I think.
          log( "Unknown action: " + action.name + ", proxy: " + this.name );
        }
      }
      this.handlingQueues = false;
      // Handle whatever maybe got queued additionnaly
      if( something ){ this.handleQueues() }
      return this;
    }, // Proxy.handleQueues()
    
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
        Proxy.register_remote( this.relay.stage.name );
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
      if ( this.listen ) return;
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
    
    deprecated_connect: function( subscriber ) {
      // ToDo: figure out a way to avoid connection() redefinition
      de&&mand( !this.is_source() ); // only ok on the destination side
      this.contact();
      var result = xs.Pipelet.prototype.connect.call( this, subscriber );
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
      // ToDo: Tell the source xor destination about that? how?
      if( !this.is_source() ){
        // ToDo: ? this.source._destination_disconnection( this );
        // ToDo: ? this.set_source();
      } else {
        // ToDo: this.destination._source_disconnection( this );
        // ToDo: this.destination.set_source();
      }
    }
    
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
    de&&bug( "Registering proxy named " + id + ", proxy object is " + object );
    de&&mand( !Proxy.AllProxies[ id ] || Proxy.AllProxies[ id ] === object );
    Proxy.AllProxies[id] = object;
  };
  
  // Deregister a Proxy instance, called when that instance is destroyed
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
    var resource;
    de&&mand( resources );
    for ( var rid in resources ){
      resource = resources[ rid ];
      resource.resource.disconnection( id, rid );
      delete resources[ id ];
    }
    delete Proxy.AllRemotes[ id ];
  };
  
  // When running client side, we know the url of the server
  // ToDo: when running server side, we could assume that the server is
  // whatever is listening on the http port of the server
  // ie: Proxy.url = "localhost:80"
  Proxy.url = null;
  // Todo: the default url toward the server should not depend on l8.client
  // because servers too sometimes may have to talk to another server, the
  // one that launched it typically, in a master/slave scheme.
  if( l8.client ){
    // Either a true browser client or a mock nodejs client
    try { Proxy.url = document.url }catch( e ){
      try {
        var port = l8.http_port || process.env.PORT || 80;
        var url  = "http://localhost:" + port;
        Proxy.url = url;
      }catch( e ){}
    }
  }
  
  // When running client side, we know what relay actor to talk to, it's the
  // one hosted by the server we connect to.
  // When running server side, we must wait until the client talks first.
  Proxy.relay = null;
  if ( Proxy.url ) { 
    Proxy.relay = l8.proxy( "XS_Proxy", l8.stage( Proxy.url ) );
    // Handle disconnection with server
    Proxy.relay.stage.defer( function(){
      Proxy.disconnection( Proxy.relay.stage.name );
    });
    Proxy.register_remote( Proxy.relay.stage.name );
  }
  
  // Proxy.stage = l8.stage( "local")
  // Handle disconnection of local stage. Not expected. ToDo: fix that
  // ToDo: l8.stage( "local" ).defer( function() { Proxy.disconnection() } )
  Proxy.register_remote( "local" );
  
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
  Proxy.listen = function( http_server ){ l8.stage( "local", http_server ); };

  // Start a local "XS_Proxy" relay actor that peers will talk to, soon proxied
  Proxy.actor = l8.Actor( "XS_Proxy", l8.role( {
    
    // "relay" message handling. ToDo: avoid it and use catch() instead?
    // using catch would save a few bytes.
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
      if( action.id ){
        name = name + "/" + action.id + "[" + stage + "]";
        de&&bug( "Action is actually for a publisher side subscriber, " + name );
      }
      
      if( action.name === "emit_add" ){
        de&&bug( "emit_add" );
      }
      
      // Look for the model proxy (or Publisher fake proxy, on publisher side)
      var model_proxy = Proxy.lookup( name );
      
      // Check if a model proxy with that name was ever created locally
      if( model_proxy ){
        de&&bug( "XS_Proxy.relay() could find proxy named " + name + ". found: " + model_proxy );
        
      } else {
        
        de&&bug( "XS_Proxy.relay() could not find proxy named " + name );
        
        var is_pubsub = name.substr( 0, 8 ) === "pub/sub.";
        
        // New model, are we handling a subscriber?
        if ( is_pubsub ) {
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
        + " forwards action '" + action.name
        + "' to " + model_proxy
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
        return publisher.handle_subscriber_operation( action );
      }
      
      // No publisher. ToDo: could bufferize, until publisher() is created
      log( "Invalid publisher " + pub
        + " for remote subscribtion " + name
        + " of client " + action.stage
      );
      
      de&&mand( false );
      
    }, // relay.pubsub()
    
    catch: function( method ){
      log( "Unsupported relay method: " + method.join( ",") );
    } // relay.catch()
    
  } ) )();
  
  /*
   *  End of RPC logic.
   */
  

  /* --------------------------------------------------------------------------
     .publish( name, options )
     A Datalet for publishers.
     A publisher connects a data source to subscribers. When a subscriber edit
     the data, the change is forwarded to the source. Some 
     subscribers are local, some are remote.
    
     Usage:
     
       -- publisher side
       publisher = daily_mirror.publish( "daily_mirror" )
       daily_mirror.add( [ an_article, another_story ] )
       
       -- subscriber side
       reader = xs.subscribe( "daily_mirror" )
       reader.log()
       editor = reader
       editor.add( [ an_item ] )

     Data flow: source->publisher->local_subscribers
                source->publisher->remote_subscribers
                subscriber.add( x ) -> publisher.source.add( x )
  */
  
  function Publish( source, name, options ) {
    this.xs_super.xs_class.call( this, options );
    this.name = name || source.name;
    // Let's pretend new publisher is a proxy, aka "fake proxy". That way,
    // when a subscriber talks to the publisher, we skip the proxy indirection.
    // This is a small optimization where a publisher behave like a proxy
    // instead of creating a proxy for itself.
    // When relay actor receives a subscription msg, it calls This.receive()
    Proxy.register( "pub/sub." + this.name, this );
    // Publisher has list of its subscribers, they're not regular outputs
    this.subscribers = {};
    // Each subscriber has an id in that hash table.
    // That id is stored in the .id_for_publisher attribute of the subscriber.
    this.next_subscriber_id = 1;
    // New publisher depends on it's source and get notified of changes to it.
    de&&mand( !this.set_source_done );
    de && ( this.set_source_done = true );
    this.set_source( source );
    return this;
  } // Publish()

  xs.datalet.subclass( Publish, {
    
    factory: function( source, name, options ) {
      return new this( source, name, options );
      // return source;
    }, // Publish.factory()
    
    toString: function(){ return "Publish/" + this.name; },
    
    get: function(){
    // The content of a publisher is the content of its source.
      return this.source.get();
    }, // Publish.get()
    
    fetch: function( produce ){
      var a = this.get();
      a.length && produce( a );
      produce( [] );
    },
    
    add_subscriber: function( subscriber ){
    // Private. Called when a subscriber is attached to the publisher
      de&&mand( subscriber );
      this.subscribers[ this.next_subscriber_id ] = subscriber;
      // ToDo: try to merge both ids.
      subscriber.id_for_publisher = this.next_subscriber_id;
      subscriber.id = subscriber.id_for_publisher;
      this.next_subscriber_id++;
      de&&bug( "just added " + subscriber + " to " + this );
    }, // Publish.add_subscriber()
    
    remove_subscriber: function( subscriber ){
    // Private. Called when a subscriber disconnection is detected
      de&&mand( this.subscribers[ subscriber.id_for_publisher ] );
      de&&bug( "removing " + subscriber + " from " + this );
      delete this.subscribers[ subscriber.id_for_publisher ];
    }, // Publish.remove_subscriber()
    
    add:    function( objects ){
      // Forward to destinations, calling their .add() method
      this.xs_super.add.call( this, objects );
      // Forward to subscribers, calling their .emit_add() method...
      // The goal is to forward the operation to the subscriber's destinations.
      // This means that the output of the publisher and of the subscribers are
      // the same.
      this.emit_emit_to_subscribers( "add",    objects );
    }, // Publish.add()
    
    update: function( objects ){
      this.xs_super.update.call( this, objects );
      this.emit_emit_to_subscribers( "update", objects );
    }, // Publish.update()
    
    remove: function( objects ){
      this.xs_super.remove.call( this, objects );
      this.emit_emit_to_subscribers( "remove", objects ); 
    }, // Publish.remote()
    
    // Calls emit_op( x ) on all subscribers.
    // I do that because .add() is what is used on the subscriber's side
    // to talk to the publisher...
    // Maybe I should have a publisher_add() weird operation?
    emit_emit_to_subscribers: function( op, objects ){
      var hash = this.subscribers;
      var emit_op = "emit_" + op;
      for( var item in hash ){
        item = hash[ item ];
        item[ emit_op ].call( item, objects, true ); // from publisher
      }
    }, // Publish.emit_emit_to_subscribers()
    
    // ToDo: should call cb with true or false depending on autorisation to
    // subscribe. Called when a will be subscriber subscribes
    accept: function( action, cb ){ cb( 0) },
    
    disconnection: function() { return this; },  // handled by local subscriber
    
    contact: function(){
    // Private. Each publisher is a fake proxy, proxies implements .contact().
      // Do nothing. ToDo: describer why
    }, // Publish.contact()
    
    relay_it: function( operation ){
    // Private. Each publisher is a fake proxy, proxies implements .relay_it()
      de&&bug( "Subscriber operation fake proxy's .relay_i() of " + this );
      this.handle_subscriber_operation( operation );
    }, // Publish.relay_it()
    
    handle_subscriber_operation: function( action ) {
    // Called when an operation is proposed by a subscriber, local or remote.
    // This method is called by pubsub() of the XS_Proxy actor and .relay_it()
    // when thru the publisher's fake proxy.
    
      var that       = this;
      var subscriber = action.model;
      // ToDo: the id should not be in the model name, it should be in the id
      var id         = action.id;
      var stage      = action.stage;
    
      // When the action is invoked by a remote subscriber
      if( stage ){
        
        de&&bug( "handling subscriber operation from " + stage + " on " + this );
        
        // Determine what the name for the proxy would be, if accepted
        var name = subscriber + "/" + id + "[" + stage.name + "]";
        
        // Does such a proxy already exists? ie, was subscription accepted?
        subscriber = Proxy.lookup( name);
        
        // If new subscriber, should the candidate subscriber be accepted?
        if ( subscriber ){
          de&&bug( "existing subscriber: " + name + ". action: " + action.name );
        } else {   
          log( "new remote subscriber: " + name + ". action: " + action.name );
          if ( action.name !== 'subscribe' ){
            log( "Subscriber " + name + " should subscribe first. " + action.name );
            return;
          }
          // If not accepted, silently ignore the subscription request
          // ToDo: should signal the rejection, how?
          var acceptance = l8.promise();
          var cb = acceptance.callback;
          this.accept( action, cb );
          acceptance.then( function ok(){
          
            // OK. Subscriber is accepted, create a local subscriber & proxy
            de&&bug( "New remote subscriber is accepted" );
            subscriber = that.subscribe( { name: name } );
            de&&mand( subscriber.name === name );
            de&&mand( !subscriber.source || subscriber.source.is_void );
            de&&bug( "New subscriber was accepted: " + subscriber );
            var proxy = new Proxy( subscriber, name );
            de&&mand( proxy.source === subscriber );
            de&&bug( "Proxy for newly accepted subscriber: " + proxy );
            subscriber.proxy_subscriber = proxy;
            de&&bug( "Remote subscriber " + subscriber + " is proxied by " + proxy );
          
            // We may need to talk to that subscriber, via it's own relay actor
            proxy.contact( l8.proxy( "XS_Proxy", stage ) );
            
            // When the subscriber was created, it received the content of
            // it's source. At that time it was not yet connected to a proxy
            // and therefore the proxy has not been notified of the content
            // of the publisher's source. Let's do that now.
            // ToDo: set_source() should not use .add(), it proves to be
            // useless in this case again.
            // Note: I cannot use .add() to notify the subscriber, .add() is
            // used to implement changes issued by the subscriber. As a result
            // I use .emit_add() instead. Consequently, it is the subscriber
            // destination that will have their .add() method invoked.
            // This is weird because .emit_add() is a private method that
            // only the subscriber itself should call and not only do I cal
            // it but I call it remotely...
            // All this weirdness suggest a need for .publisher_add(),
            // .publisher_remove() and publisher_xxx() and respective weird
            // operations instead of the .emit_xxx() weird operations.
            // All in all this is similar to my propose_add() initial half
            // backed implementation, but the other way around, ie: it's adds
            // from the publisher that requires a new weird operation versus
            // the special propose_add() that I initially implemented.
            // What are these weird operations, that is something to discover,
            // with the help of Jean.
            de&&bug( "" + that + " sends initial content to " + proxy );
            proxy.emit_add( that.get() );
          
            // Register as a resource to handle subscriber.disconnection()
            Proxy.register_remote( stage.name );
            Proxy.register_remote_resource( stage.name, name, subscriber );
                      
            action.subscriber = subscriber;
            that.forward_subscriber_operation( action );
            
          }, function ko(){
            de&&bug( "Candidate subscriber was rejected, " + subscriber );
          });
          return;
        }
      }  
      // The subscriber is valid, because it is local or accepted, proceed

      // Actions from subscribers impact the publisher's destination.
      // It is up to the publisher to accept or ignore the action depending on
      // the subscriber authorizations. Default is to accept the action and
      // forward it to the publisher's destination.
      action.subscriber = subscriber;
      that.forward_subscriber_operation( action );
    }, // Publish.handle_subscriber_operation()
    
    forward_subscriber_operation: function( action ){
    // Parameter action includes a .subscriber that describe the subscriber.
    // The default behaviour is to forward the operation to the destinations of
    // the publisher.
    // If the action is a subscribe, it has already been accepted and is
    // ignored.
      if( action.name === "subscribe" ) return;
      // ToDo: encapsultation violation, I invoke the private method .notify()
      // of this.destination, I should not. But I cannot invoke this.notify()
      // because it would call this.add maybe and this would mean that the
      // subscriber's actions is sent to the subscriber... where it comes from,
      // ie. loop.
      this.destination && this.destination.notify( [action] );
    }, // Publisher.forward_subscriber_operation()
    
  } );
  
  
  /* --------------------------------------------------------------------------
     xs.subscribe( publisher [, options] )
     publisher.subscribe( [options] )
     Attach a new subscriber to a publisher. Operations on the publisher are
     forwarded to the subscriber via it's .emit_xxx() methods so that they
     are forwarded to the subscriber outputs. Publisher is either local or
     remote. Operations on the subscriber are forwared to the publisher via
     it's .emit_xxx() methods so that they are forwarded to the publisher's
     outputs, if the publisher agrees.
     
     options.filter is a filter sent to the publisher so that it can send only
     the data that the subscriber desires. ToDo: this will be implemented
     differently.
     
     options.stage is the stage where the remote subscriber operates if this
     local publisher is proxied.
     
     options.url is the url to contact the publisher, when it is remote and
     is different from the default url (ie, different from the url of the http
     server in the case of browsers). Nota: in browsers, ability to send http
     requests is restricted for security reasons, often the browser can send
     requests only to the http server that created the current page. In that
     situation it is useless to specify an url option, the default url, set
     when this module is loaded, will be used and will work as expected to 
     join the only http server the browser can talk to.
  */
  
  // Each subscriber has a unique id, a part of it is locally generated
  // ToDo: next_subscriber_id
  Proxy.NextSubscriberId = 1;
  
  // The application can monitor publisher creation/destruction
  // ToDo: implement this?
  // Proxy.AllRemotePublishers = xs.set();
  
  function Subscribe( publisher, options ){
    
    de&&mand( this );
    de&&mand( publisher );

    this.xs_super.xs_class.call( this, options );
    this.filter = this.options.filter;
    this.stage  = this.options.stage || l8.stage( "local" );
    this.url    = this.options.url;
    
    // If local publisher, simple, just connect the subscriber to it
    if ( typeof publisher !== 'string' ){
      this.name = this.options.name || publisher.name;
      this.publisher = publisher;
      publisher.add_subscriber( this );
      de&&bug( "New local subscriber " + this );
      // this.set_source( publisher );
      // publisher.connect( this );
      return this;
    }
    de&&bug( "New client side subscriber on server side '" + publisher + "'" );
    
    // If remote publisher, we need to use a proxy object, dynamic.
    // The name of that proxy is "pub/sub.pppp.iii[.uuuu]" where pppp is the
    // name of the publisher, iii is a unique increasing subscriber id and
    // optional uuuu is the client side Proxy.uuid when it is known.
    var sub_name = "pub/sub." + publisher;
    this.name = this.options.name || sub_name;
    this.id   = Proxy.NextSubscriberId++;
    if( Proxy.uuid ){
      this.id = this.id + "." + Proxy.uuid;
    }
    this.proxy_subscriber = new Proxy( the_void, sub_name + "/" + this.id );
    de&&bug( "Proxy " + this.proxy_subscriber + " just attached to new remote " + this );
    
    // Either locally connected to a subscriber, or thru a proxy
    de&mand( this.publisher || this.proxy_subscriber );
    
    // Ask publisher to send updates to the newly created proxy, if it accepts
    // ToDo: what about the case where the publisher rejects the subscriber?
    this.proxy_subscriber.url = this.url;
    de&&bug( "New " + this + " sends a 'subscribe', via proxy " + this.proxy_subscriber );
    this.proxy_subscriber.relay_it( {
      name:   "subscribe",
      model:  this.name,
      id:     this.id,
      // ToDo: use Proxy.uuid when available,
      filter: this.filter
    } );
    
    // Register the proxied subscriber, to handle .disconnection()
    Proxy.register_remote( this.stage.name );
    Proxy.register_remote_resource(
      this.stage.name, // ToDo: should be this.proxy_subscriber.stage.name
      this.proxy_subscriber.name,
      this
    );
    
    // Everything that happens to the proxy will be forwarded to this object
    de&&mand( ! this.set_source_done );
    de && ( this.set_source_done = true );
    this.set_source( this.proxy_subscriber );
    // this.proxy_sub.connect( this );
    de&&mand( this.source === this.proxy_subscriber );
    
    return this;
  } // Subscribe()
  
  xs.datalet.subclass( Subscribe, {
    
    factory: function( source, p1, p2 ) {
      // xs.subscribe( "some_publisher") usage
      if( source === the_void || source.is_void ) {
        return new this( p1, p2 );
      // some_publisher.subscribe() usage
      } else {
        return new this( source, p1 );
      }
    }, // Subscribe.factory
    
    toString: function(){
      return (this.proxy_subscriber ? "Proxied " : "Local ") + "Subscribe/"
      + this.name 
      + ( this.id ? ( "(/" + this.id + ")" ) : "" );
    }, // Subscribe.toString()
    
    // The content of a subscriber is empty, state less
    get: function(){ return []; },
    
    fetch: function( produce ){
      produce( [] );
    },
    
    // When a subscriber receives an action from its publisher,
    // it is actually for it's destinations
    receive: function( action ){
      // This does what .emit_add()/.emit_remove/update do in the base class,
      // but I miss a .emit( operation )... ToDo: ask Jean to add it?
      // ToDo: .notify() is overkill for a single action. there should be
      // .operation( operation ) and a .operations( [ op1, op2, ... ] ) instead
      // of .notify() ; where .operation( x ) tells the target object that it
      // must perform the operation x.
      // ToDo: this breaks encapsulation unless this.destination is a protected
      // attribute, versus a private one, as it should be, I think.
      this.destination.notify( [action] );
    }, // Subscriber.receive()
    
    // When a subscriber is asked to perform an operation, it sends it to
    // it's publisher, either local or thru a proxy.
    send: function( operation ){
      // If thru proxy, call .add()/.update()/remove/... on the proxy
      if( this.proxy_subscriber ){
        de && (operation.by_subscriber = true);
        // Attach the subscriber id, the proxy router detect it and knows
        // how not to confuse this proxy with it's peer in the rare case
        // where both run in the same process, like it happens for tests.
        operation.id = this.id;
        this.proxy_subscriber.notify( [operation] );
      
      // If local, forward to publisher, ie call .add()/... on the publisher
      } else {
        de&&mand( this.publisher );
        // ToDo: this is overkill
        // The alternative is : this.publisher[operation.name].call( this.publisher, operation.objects )
        // it's ugly. A .operation() would be welcome I think, it would perform
        // a single operation. Nota: hence a .operations() would perform many
        // operations, ie do what .notify() does today.
        this.publisher.notify( [operation] );
      }
      // ToDo: looks like the code is the same in both case,
      // maybe I could avoid using .proxy_subscriber and use
      // .publisher in all cases, if the proxy is assigned to .publisher when
      // the proxy is created. coool
    }, // Subscribe.send()
    
    // When a subscriber is asked to perform an operation, it sends it to
    // it's publisher instead of forwarding it to it's destination somehow,
    // like other pipelets do. However, it does not send it "as is", it makes
    // sure that the operation is forwarded to the publisher's destinations,
    // using .emit_xxx. If it were not to do that, if it were to forward
    // plain xxx() operation, than an add() would imply an an add() on the
    // publisher and in that case, the publisher would send an emit_add to
    // the subscriber, ie the add would bounce back.
    // ToDo: maybe it is desirable that the operation bounces back?
    add:    function( x ) { this.send( { action: "add",    objects: x } ); },
    update: function( x ) { this.send( { action: "update", objects: x } ); },
    remove: function( x ) { this.send( { action: "remove", objects: x } ); },
    clear:  function(   ) { this.send( { action: "clear",  objects: x } ); },
    
    // When a publisher wants to signal an operation to the subsciber, it
    // bypasses the normal .add() (beause that .add() if for subscriber side
    // changes) and directly forward the operation to the subscriber's
    // destinations. Forwarding an operation to destinations, that's what the
    // .emit_xxx() methods do. As a consequence, to invoke these .emit_xxx()
    // methods, the publisher requires new weird operations called
    // "emit_xxx" and implements the even weirder .emit_emit_xxx() methods.
    // When these methods are received by the subscriber's proxy, it calls
    // transparently the same method in the proxied subscriber.
    
    emit_add: function( x ){
      de&&mand( this );
      de&&bug( "emit_add() invoked on subscriber " + this );
      de&&bug( "its publisher is " + (this.publisher || "not a local publisher ") );
      de&&bug( "its proxy is " + (this.proxy_subscriber || "non existant") );
      // When an emit_add is done on the publisher's side, it needs to be
      // sent to the subscriber side if that side is remote
      if( this.publisher && this.proxy_subscriber ){
        this.proxy_subscriber.emit_add( x );
      // Else (subscriber side or local subscriber), invoke base class
      } else {
        return this.xs_super.emit_add.call( this, x );
      }
    }, // Subscribe.emit_add()
        
    disconnect: function( target ) {
      log( "!!!!! Subscriber.disconnect() call on " + target );
      // ToDo: feature interaction with set_source()...
      if ( target === this.proxy_subscriber ) {
        de&&bug( "target is proxy_subscriber ");
        this.disconnection();
        return this;
      }
      // Invoke super
      return this.xs_super.disconnect.call( this, target);
    }, // Subscribe.disconnect()
    
    disconnection: function(){
      // Called when the remote entity disconnects
      // this.set_source();
      // ToDo: should signal the event to publisher? how?
      var proxy = this.proxy_subscriber;
      if( proxy ){
        this.proxy_subscriber = null;
        Proxy.deregister_remote_resource( proxy.stage.name, proxy.name );
      } else {
        de&&bug( "WEIRD!!!!! .disconnection() was called, yet there are no proxy" );
      }
      if( this.publisher ){
        de&&bug( "About to remove subscriber " + this + " from " + this.publisher );
        this.publisher.remove_subscriber( this );
      }
    } // Subscribe.disconnection()
    
  } ); // subscriber
  
    
de&&ug( "proxy module loaded" );
} )( this ); // proxy.js
