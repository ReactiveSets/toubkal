// server.js
//  http server for tests, tests the Publish/Subscribe scheme.
//  see also client.js
//
// 2013/01/25 by JHR
//
// This is the test program for the publisher/subscriber scheme.
// It creates a set, publish it and add items.
// A subscriber counts the received item.
// After a while the test stops and succeed if the number of item received
// by the subscriber is equal to the number of item addded by the publisher.
// The connection between the subscriber and the publisher goes over an
// http, with connection hopefully upgraded to websocket thanks to socketIo.


var xs = require( "excess/lib/xs.js" ).XS;
require( "excess/lib/proxy.js");
require( "excess/lib/tracer.js");
var fluid = xs.fluid;
var log   = xs.log;
var l8    = fluid.l8;

// Set the stage, an http server, with an XS Proxy server attached to it
var Http    = require( "http" );
var Connect = require( "connect" );
var app     = Connect();
app.use( Connect.static( 'public') );
app.use( function( req, res ){ res.end( 'hello world\n' ) } );
var server  = Http.createServer( app );
l8.http_port = parseInt( process.env.PORT, 10) || 8080; // 80 requires sudo
server.listen( l8.http_port );
xs.Proxy.listen( server );

var de   = l8.de;
var mand = l8.mand;

var debug_mode = false; // Interactive debug mode, ie when using a debugger
// In debug mode I increases all delays so that the test does not finish
// early, while I am still using the debugger.

/*
 *  Server side
 */
 
// Let's have a source set, I will add items to it
var daily_mirror = fluid.set( null, { name: "daily_mirror" } );
de&&mand( daily_mirror.xs_class.name === "Set" );
log( "daily mirror is " + daily_mirror );
de&&mand( !daily_mirror.is_void );

// The fake publisher of the daily mirror has only one subscriber: The Dude.
// daily_mirror.proxy( "daily_mirror_for_the_dude" );

// The true publisher of the daily mirror has many subscribers
var pub = daily_mirror.publish( "daily_mirror" );

//var local_sub = pub.subscribe();
//local_sub.trace( {name:"----- YEAH -----------"} );

// Let's add initial articles to the daily_mirror
daily_mirror.add( [
  { id: 1, text: "a first article" },
  { id: 2, text: "another story" }
] );

// Let's add additional article in a loop
var TEST_GOAL      = 25;
var Articles_Count = 2;

l8.task( function(){
  this.set( "label", "daily_mirror acticle generator task" );
  var next_id = 3;  
  l8.step(function(){ l8.sleep( debug_mode ? 2000 : 100 );
  }).repeat(function(){
    if( next_id > TEST_GOAL ) this.break;
    log( "NEW ARTICLE (by publisher), " + next_id );
    daily_mirror.add( [ { id: next_id, text: "article " + next_id } ] );
    Articles_Count++;
    next_id++;
    if ( debug_mode ) {
      this.sleep( 10 * 1000 );
    } else {
      this.sleep( 10 );
    }
  }).failure( function( e ) { l8.trace( "Error on the publisher:", e ); } );
});

// daily_mirror.persistor( "daily_mirror.json")

/*
 *  Client side
 */

var server_url = "http://localhost:" + (process.env.PORT || 8080);

// The Dude subscribe to the daily mirror
//var daily_mirror_for_the_dude = XS.void.proxy( "daily_mirror_for_the_dude", { url: server_url } );

// I use a tracer to count received objects
var total_traces = 0;
function trace( tracer, model, operation, objects ){
  var buf = [ "[" ];
  for( var item in objects ){
    total_traces++;
    buf.push( "{" );
    item = objects[ item ];
    for( var property in item ){
      buf.push( "" + property + ":" + item[ property ] + "," );
    }
    buf.push( "}, ");
  }
  buf.push( "]" );
  buf = buf.join( "" );
  l8.trace( "TRACER " + tracer, model.toString(), operation, buf );
}

//daily_mirror_for_the_dude.tracer( { log: trace } );

// Subscribe and add the counting tracer
var subscriber = fluid.subscribe( "daily_mirror", { url: server_url } );
subscriber.trace( {
  log:   trace,
  label: "Tracer for subscriber " + subscriber
} );

// When publisher task is done, start a task where subscriber edit the
!debug_mode && l8.task( function(){
  this.set( "label", "subscriber additions task" );
  var next_id = 1;
  this.step( function(){ this.sleep( 2000 ); } );
  this.repeat( function(){
    if( next_id > 10 ) this.break;
    throw "Not implemented yet";
    subscriber.add( [ { id: next_id, text: "article oops " + next_id } ] );
    Articles_Count++;
    log( "NEW ARTICLE (by subscriber), " + next_id );
    next_id++;
    this.sleep( 10 );
  }).failure( function( e ){
    l8.trace( "Error on the subscriber's additions", e );
  });
});

// When every thing is done, check if test passed
!debug_mode && l8.task( function() {
  this.step( function(){ this.sleep( (TEST_GOAL / 4) * 1000 ) } );
  this.step( function(){
    log( "OK, let's check what the subscriber got: " + total_traces );
    log( "the publisher says " + Articles_Count );
    log( "The goal was " + TEST_GOAL );
    if( total_traces === TEST_GOAL ){
      log( "SUCCESS!" );
      process.exit( 0 );
    }
    log( "FAILURE! too bad..." );
    process.exit( 1 );
  } );
} );

// Start a countdown in case things go wrong silently
l8.countdown( debug_mode ? 1000 : TEST_GOAL / 3, true );

process.on( 'exit', function () {
  xs.log( 'Publish/Subscribe test server says "Bye bye."' );
} );
 
process.on( 'uncaughtException', function( err ) {
  xs.log( err.stack.replace( /^    /gm, '                  ') );
});
