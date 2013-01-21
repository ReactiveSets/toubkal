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
    require( './fork.js' )
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
    , Connection = XS.Connection
    , Set        = XS.Set
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs proxy, " + m );
  } // ug()


  /* --------------------------------------------------------------------------
     .broadcaster( options )
     A broadcaster has one or many sources and will forward all operations from
     these sources to its downsteam forks. It is state less.
     
     Usage:
       var b = a_source.broadcaster();
       b.from( additional_source)
       b.to( destination1)
       b.to( destination2)
     
     ToDo: move this to fork.js
  */
  
  function Broadcaster( sources, options ) {
    Connection.call( this, options );
    // Make x.connect( broadcaster) invalid, please use broadcast.from( x)
    this.source = this;
    this.sources = sources || [];
    var big_a = this.get();
    this.add( big_a );
    return this;
  }
  
  Connection.subclass( "broadcaster", Broadcaster, {
    factory: function( options ){ return new Broadcaster( [this] ); },
    get: function(){
      var sources = this.sources;
      var all_get = [];
      for( var source in sources ){
        source = sources[source];
        all_get = all_get.push( source.get() );
      }
      var big_a = Array.prototype.concat.apply( [], all_get);
      return big_a;
    },
    from: function( source ) {
      this.sources.push( source );
      this.add( source.get() );
      return this;
    },
    not_from: function( source ) {
      var new_sources = [];
      var sources     = this.sources;
      var len         = sources.length;
      for ( var ii = 0, item ; ii < len ; ii++ ) {
        item = sources[ ii ];
        if ( item !== source) { new_sources.push( item ) }
        break;
      }
      this.sources = new_sources;
      return this;
    },
    to:     function( target  ) { return this.connect( target);              },
    not_to: function( target  ) { return this.disconnect( target);           },
    add:    function( objects ) { return this.forks_add(    objects ); },
    remove: function( objects ) { return this.forks_remove( objects ); },
    update: function( objects ) { return this.forks_update( objects ); },
  } );

  
  /* --------------------------------------------------------------------------
     .proxy( system_wide_name, options )
     Pipelet for Proxy.
     Proxies works in pairs, one proxy is local, the other is remote, they both
     have the same name.
     Any operation on the local proxy is signaled to the other side.
    
     Usage:
     
       -- source side
       daily_mirror.proxy( "daily_mirror.sub_id_xxx" )
       daily_mirror.add( [an_article, another_story] )
       
       -- destination side
       daily_mirror = my_subscriptions.proxy( "daily_mirror.sub_id_xxx" )
       daily_mirror.connect( my_mail_box)
    
     ToDo: a reliable mechanism to destroy proxies and collect garbadge.
     
     Implementation: there is a XS_Proxy l8 actor in each client and each
     server. When we need to talk to it, we use a l8 proxy. When the actor
     receives the "relay" message, it relays the message's operation to a
     local object based on the system wide name used to register that object.
     
     If such an object does not exist, the target object name is used to lookup
     for a publisher that will handle the message.
  */

  function Proxy( source, name, options ) {
    
    Connection.call( this, options );
    this.name = name || source.name;
    
    // Maybe the remote proxy already contacted us
    var previous = Proxy.lookup( name)
    
    // Operations are sent to a relay (using relay.send()) 
    this.relay        = (previous && previous.relay)        || null
    this.receiveQueue = (previous && previous.receiveQueue) || []
    this.sendQueue    = (previous && previous.sendQueue)    || []
    
    // When there is no remote relay yet, should we buffer the operations?
    this.bufferize = this.options.buffer
    this.bufferize = true // ToDo: implement false, ie: no buffering
    
    if ( !Proxy.url ) {
      this.server = true;  
    } else {
      this.client = true;
    }
    
    // Track all proxies
    Proxy.register( name, this )
    
    // New proxy depends on source object and get notified of changes to it
    source.connect( this );
    
    return this;
  } // Proxy()
  
  
  Connection.subclass( "proxy", Proxy, {
    
    factory: function( name, options ) {
      return new Proxy( this, name, options );
    }, // factory()
  
    contact: function() {
    // Establish contact between client and server asap.
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
        case 'add'     : this.forks_add   ( action.objects ); break;
        case 'remove'  : this.forks_remove( action.objects ); break;
        case 'update'  : this.forks_update( action.objects ); break;
        default:
          log( "Unknown action: " + action.name + ", proxy: " + this.name )
        }
      }
      this.handlingQueues = false
      // Handle whatever maybe got queued additionnaly
      if( something ){ this.handleQueues() }
      return this
    } // handleQueues()
    
  } ); // Proxy instance methods
  
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
  
  // When running client side, we know what relay actor to talk to.
  // When running server side, we must wait until the client talks first.
  Proxy.relay = Proxy.url && l8.proxy( "XS_Proxy", Proxy.url )
  
  // If that relay is/becomes unreachable, what do we do?
  Proxy.keep = function(){
    if( Proxy.relay ){
      Proxy.relay.stage.defer( function(){
        // ToDo: implement reconnect policy
        try{ Proxy.reconnect() }catch( e ){ Proxy.relay = null }
      })
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
  Proxy.actor = l8.Actor( "XS_Proxy", l8.role( {
    relay: function( action ){
      // Get the stage this actor's proxy plays on
      var stage = l8.actor.stage || l8.stage( "local" )
      // ToDo: if new stage, register a disconnection callback to clean stuff
      var name = action.model;
      // Check if a model proxy with that name was ever created locally
      var model_proxy = Proxy.lookup( name );
      if( !model_proxy ){
        // Are we handling a subscriber?
        if ( name.substr( 0, 8 ) === "pub/sub." ) {
          var pubsub = name;
          var slash  = pubsub.indexOf( "/" );
          var pub    = pubsub.substr( 0, slash - 1 );
          var sub    = pubsub.substr( slash + 1 );
          var publisher = Proxy.lookup( pub );
          if ( publisher ){
            return publisher.receive( action, sub, stage );
          } else {
            log( "Invalid publisher " + pub
              + " for remote subscribtion " + sub
              + " of client " + stage
            );
            return;
          }
        }
        // oops, race condition, one side is ahead of the other, let's buffer
        model_proxy = {
          receiveQueue: [],
          sendQueue:    [],
          receive:      function( a ){ this.receiveQueue.push( a) }
        }
        Proxy.register( name, model_proxy )
      }
      // We may need to talk to that client, via it's own relay actor
      model_proxy.relay = l8.proxy( "XS_Proxy", stage );
      model_proxy.receive( action );
    },
    catch: function( action ){
      log( "Unsupported relay action: " + action );
    }
  } ) )()
  
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
       reader = root.subscribe( "daily_mirror")
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
    
    get: function(){ return this.source.get(); },
    
    notify: function( transaction, initiator ){
      // Called by .receive() when a subscriber submit an operation.
      // Default is to notify the source about the transaction.
      return this.source.notify( transaction, initiator );
      // If the source plays the transaction, as most do, as a result
      // all subscribers, including the initiator of the action,
      // will have the action notified to them.
      // ToDo: loop detection?
    },
    
    accept: function( stage, filter ){ return true; },
    
    receive: function( action, subscriber, stage ) {
    // Called when an action is proposed by a subscriber, local or remote
      if( stage ){
        var name = "pub/sub" + this.name + "/" + subscriber + "." + stage.name;
        var proxy = Proxy.lookup( name);
        if ( !( subscriber = proxy ) ){
          log( "new remote subscriber: " + name, action);
          if ( action.name !== 'subscribe' ){
            log( "bad subscriber " + name + " should subscribed first" );
            return;
          }
          if ( !this.accept( stage, action.filter ) ) {
            return
          }
          subscriber
          = this.subscriber( this, { filter: action.filter, stage: stage } );
          subscriber.proxy( name);
        }
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
  */
  
  Proxy.NextSubscriberId    = 1;
  Proxy.AllRemotePublishers = new XS.Set()
  
  function Subscriber( publisher, options ){
    Connection.call( this, options );
    // If remote subscriber
    if ( typeof publisher === 'string' ){
      var name  = "pub/sub." + publisher;
      publisher = Proxy.lookup( name );
      if ( !publisher ) {
        // Create a new proxy to talk to the remote publisher
        publisher = Proxy.AllRemotePublishers.proxy( name );
      }
      // Create a new proxy to let the remote publisher talk to this subscriber
      this.proxy( name + "/" + Proxy.NextSubscriberId++ );
      publisher.send( [ { name: "subscribe", filter: options.filter } ] );
    }
    publisher.connect( this );
    return this;
  }
  
  Connection.broadcaster.subclass( "subscriber", Subscriber, {
    factory: function( options ){ return new Subscriber( this, options); }
  } )
  
  
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
    return this;
  } // Tracer()

  Connection.subclass( "tracer", Tracer, {
    factory: function( options ){ return new Tracer( this, options ) },
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
