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
XS.l8.task( function(){
  var next_id = 3;
  this.repeat( function(){
    XS.l8.trace( "NEW ARTICLE, " + next_id );
    daily_mirror.add( [ { id: next_id, text: "article " + next_id } ] );
    next_id++;
    this.sleep( 10 * 1000 );
  });
}).label = "daily_mirror acticle generator task"

// daily_mirror.persistor( "daily_mirror.json")

XS.l8.countdown( 1000);

var server_url = "http://localhost:" + (process.env.PORT || 8080);

// The Dude subscribe to the daily mirror
//var daily_mirror_for_the_dude = XS.void.proxy( "daily_mirror_for_the_dude", { url: server_url } );

function trace( tracer, model, operation, objects ){
  var buf = [ "[" ];
  for( var item in objects ){
    buf.push( "{" );
    item = objects[ item ];
    for( var property in item ){
      buf.push( "" + property + ":" + item[ property ] );
    }
    buf.push( "}");
  }
  buf = buf.join( ", " );
  XS.l8.trace( tracer.toString(), model.toString(), operation, buf );
}

//daily_mirror_for_the_dude.tracer( { log: trace } );

var subscriber = xs.subscribe( "daily_mirror", { url: server_url } );
subscriber.source.tracer( { log: trace } );

// subscriber.persistor( "daily_mirror_backup" )

