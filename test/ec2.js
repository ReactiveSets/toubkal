var xs = require( '../lib/server/aws.js' ).XS.xs;

xs.ec2( '../aws-credentials.json' )
  .ec2_regions()
;
