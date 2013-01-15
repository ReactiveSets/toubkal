// server.js
//  http server for tests

var XS = require( "../src/xs.js" ).XS;
require( "../src/connection.js" );
require( "../src/proxy.js");

// Set the stage
var Http    = require( "http" );
var Connect = require( "connect" );
var app     = Connect();
app.use( Connect.static( 'public') );
app.use( function( req, res ){ res.end( 'hello world\n' ) } );
var server  = Http.createServer( app );
server.listen( process.env.PORT );
XS.Proxy.server( server );

// The publisher of the daily mirror has only one subscriber: The Dude.
var daily_mirror = new XS.Set( null, "daily_mirror");
daily_mirror.proxy( "daily_mirror_for_the_dude" );
daily_mirror.add( [
  { id: 1, text: "an article" },
  { id: 2, text: "another story" }
] );
XS.l8.task( function(){
  var next_id = 3
  this.repeat( function(){
    daily_mirror.add( [ { id: next_id, text: "article " + next_id } ] );
    next_id++;
    this.sleep( 1000 );
  })
})
