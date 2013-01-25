// server.js
//  http server for tests

var XS = require( "../lib/xs.js" ).XS;
require( "../lib/fork.js" );
var xs = XS.xs;
require( "../lib/proxy.js");

// Set the stage
var Http    = require( "http" );
var Connect = require( "connect" );
var app     = Connect();
app.use( Connect.static( 'public') );
app.use( function( req, res ){ res.end( 'hello world\n' ) } );
var server  = Http.createServer( app );
server.listen( process.env.PORT );
XS.Proxy.server( server );

var debug_mode = false;

// The fake publisher of the daily mirror has only one subscriber: The Dude.
var daily_mirror = new xs.set( null, "daily_mirror");
// daily_mirror.proxy( "daily_mirror_for_the_dude" );

// The true publisher of the daily mirror has many subscribers
daily_mirror.publish( "daily_mirror" );

// Let's add articles to the daily_mirror
daily_mirror.add( [
  { id: 1, text: "a first article" },
  { id: 2, text: "another story" }
] );

var Articles_Count = 2;

XS.l8.task( function(){
  var next_id = 3;  
  this.repeat( function(){
    if( next_id >  100 ) this.break;
    XS.l8.trace( "NEW ARTICLE (by publisher), " + next_id );
    daily_mirror.add( [ { id: next_id, text: "article " + next_id } ] );
    Articles_Count++;
    next_id++;
    if ( debug_mode ) {
      this.sleep( 10 * 1000 );
    } else {
      this.sleep( 10 );
    }
  }).failure( function( e ) { l8.trace( "Error on the publisher: ", e ); } );
}).label = "daily_mirror acticle generator task";

// daily_mirror.persistor( "daily_mirror.json")



var server_url = "http://localhost:" + (process.env.PORT || 8080);

// The Dude subscribe to the daily mirror
//var daily_mirror_for_the_dude = XS.void.proxy( "daily_mirror_for_the_dude", { url: server_url } );

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
  XS.l8.trace( "!!!!! " + tracer, model.toString(), operation, buf );
}

//daily_mirror_for_the_dude.tracer( { log: trace } );

var subscriber = xs.subscribe( "daily_mirror", { url: server_url } );
subscriber.source.tracer( {
  log:   trace,
  label: "Tracer for subscriber " + subscriber.source
} );

!debug_mode && XS.l8.task( function(){
  var next_id = 1;
  this.step( function(){ this.sleep( 2000 ); } )
  this.repeat( function(){
    if( next_id > 10 ) this.break;
    // ToDo: JHR, this does not work yet and may never be implemented.
    subscriber.propose_add( [ { id: next_id, text: "article oops " + next_id } ] );
    Articles_Count++;
    XS.l8.trace( "NEW ARTICLE (by subscriber), " + next_id );
    next_id++;
    this.sleep( 10 );
  }).failure( function( e ) { XS.l8.trace( "Error on the subscriber: ", e ); } );
});

!debug_mode && XS.l8.task( function() {
  this.step( function(){ this.sleep( 9 * 1000 ) } )
  this.step( function(){
    XS.l8.trace( "OK, let's check what the subscriber got: " + total_traces );
    XS.l8.trace( "I was expecting " + Articles_Count );
    if( total_traces === Articles_Count ){
      XS.l8.trace( "SUCCESS!" );
      process.exit( 0 );
    }
    XS.l8.trace( "FAILURE! too bad..." )
    process.exit( 1 );
  })
})

XS.l8.countdown( debug_mode ? 1000 : 10 );

// subscriber.persistor( "daily_mirror_backup" )

