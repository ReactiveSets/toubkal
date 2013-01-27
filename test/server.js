// server.js
//  http server for tests

var xs = require( "../lib/xs.js" ).XS;
require( "../lib/proxy.js");
var fluid = xs.fluid;

// Set the stage
var Http    = require( "http" );
var Connect = require( "connect" );
var app     = Connect();
app.use( Connect.static( 'public') );
app.use( function( req, res ){ res.end( 'hello world\n' ) } );
var server  = Http.createServer( app );
server.listen( process.env.PORT );
xs.Proxy.server( server );

var de   = xs.l8.de;
var mand = xs.l8.mand;

var debug_mode = false; // Interactive debug mode, ie when using a debugger

// The fake publisher of the daily mirror has only one subscriber: The Dude.
var daily_mirror = fluid.set( null, { name: "daily_mirror" } );
de&&mand( daily_mirror.xs_class.name === "Set" );
xs.l8.trace( "daily mirror is " + daily_mirror );
de&&mand( !daily_mirror.is_void );
// daily_mirror.proxy( "daily_mirror_for_the_dude" );

// The true publisher of the daily mirror has many subscribers
daily_mirror.publish( "daily_mirror" );

// Let's add articles to the daily_mirror
daily_mirror.add( [
  { id: 1, text: "a first article" },
  { id: 2, text: "another story" }
] );

var TEST_GOAL      = 25;
var Articles_Count = 2;

xs.l8.task( function(){
  this.set( "label", "daily_mirror acticle generator task" );
  var next_id = 3;  
  this.repeat( function(){
    if( next_id > TEST_GOAL ) this.break;
    xs.l8.trace( "NEW ARTICLE (by publisher), " + next_id );
    daily_mirror.add( [ { id: next_id, text: "article " + next_id } ] );
    Articles_Count++;
    next_id++;
    if ( debug_mode ) {
      this.sleep( 10 * 1000 );
    } else {
      this.sleep( 10 );
    }
  }).failure( function( e ) { xs.log( "Error on the publisher:", e ); } );
});

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
  xs.l8.trace( "!!!!! " + tracer, model.toString(), operation, buf );
}

//daily_mirror_for_the_dude.tracer( { log: trace } );

var subscriber = fluid.subscribe( "daily_mirror", { url: server_url } );
subscriber.tracer( {
  log:   trace,
  label: "Tracer for subscriber " + subscriber.source
} );

!debug_mode && xs.l8.task( function(){
  this.set( "label", "subsciber additions task" );
  var next_id = 1;
  this.step( function(){ this.sleep( 2000 ); } );
  this.repeat( function(){
    if( next_id > 10 ) this.break;
    // ToDo: JHR, this does not work yet and may never be implemented.
    subscriber.propose_add( [ { id: next_id, text: "article oops " + next_id } ] );
    Articles_Count++;
    xs.l8.trace( "NEW ARTICLE (by subscriber), " + next_id );
    next_id++;
    this.sleep( 10 );
  }).failure( function( e ){
    xs.l8.trace( "Error on the subscriber's additions", e );
  });
});

!debug_mode && xs.l8.task( function() {
  this.step( function(){ this.sleep( (TEST_GOAL / 5) * 1000 ) } );
  this.step( function(){
    xs.l8.trace( "OK, let's check what the subscriber got: " + total_traces );
    xs.l8.trace( "I was expecting " + Articles_Count );
    if( total_traces === Articles_Count ){
      xs.l8.trace( "SUCCESS!" );
      process.exit( 0 );
    }
    xs.l8.trace( "FAILURE! too bad..." );
    process.exit( 1 );
  } );
} );

xs.l8.countdown( debug_mode ? 1000 : TEST_GOAL / 4 );

process.on( 'exit', function () {
  xs.log( 'Bye bye.' );
} );
 
process.on( 'uncaughtException', function( err ) {
  xs.log( err.stack.replace( /^    /gm, '                  ') );
});

// subscriber.persistor( "daily_mirror_backup" )

