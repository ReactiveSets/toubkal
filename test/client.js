// client.js
//  test http client, uses server.js defined http server

var l8 = require( "l8/lib/l8.js")
l8.server = false
l8.client = true

var XS = require( "../src/xs.js" ).XS
require( "../src/fork.js" )
require( "../src/proxy.js" )

// The Dude subscribe to the daily mirror
var my_subscriptions = new XS.Set( null, "subscriptions" )
var daily_mirror_for_the_dude = my_subscriptions.proxy( "daily_mirror_for_the_dude" )

function trace( tracer, model, operation, objects ){
  var buf = ["["];
  for( var item in objects ){
    buf.push( "{");
    item = objects[item]
    for( var property in item ){
      buf.push( "" + property + ":" + item[property] );
    }
    buf.push( "}");
  }
  buf = buf.join( ", ")
  l8.trace( tracer, model, operation, buf )
}

daily_mirror_for_the_dude.tracer( { log: trace } );

var subscriber = my_subscriptions.subscriber( "daily_mirror" );
subscriber.tracer( { log: trace } );

// subscriber.persistor( "daily_mirror_backup" )

l8.countdown( 10)
