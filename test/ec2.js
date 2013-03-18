var xs = require( '../lib/server/aws.js' ).XS.xs;

require( '../lib/filter.js' );

var zones = xs.ec2( '../aws-credentials.json' )
  .ec2_regions()
  .filter( function( r ) { return /^us/.test( r.RegionName ) } )
  .ec2_availability_zones()
  .on( 'complete', function() {
    zones.fetch_all( function( zones ) {
      console.log( 'Received all us Availability Zones: '
        + zones.map( function( z ) { return z.ZoneName } ).join( ', ' )
      )
    } );
  } )
  .set() // testing output of availability zones
;
