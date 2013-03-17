var xs = require( '../lib/server/aws.js' ).XS.xs;

var zones = xs.ec2( '../aws-credentials.json' )
  .ec2_regions()
  .ec2_availability_zones()
  .set() // testing output of availability zones
;

setTimeout( function() {
  zones.fetch_all( function( zones ) {
    console.log( '!!! All zones: ', zones.map( function( z ) { return z.ZoneName } ) )
  } );
}, 25000 );