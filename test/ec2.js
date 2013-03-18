/*  ec2.js
    
    AWS EC2 tests
    
    ----
    
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

var XS     = require( '../lib/server/aws.js' ).XS 
  , xs     = XS.xs
  , extend = XS.extend
  , log    = XS.log
;

require( '../lib/filter.js' );
require( '../lib/watchdog.js' );

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

// Watchdog test on availability zones reception
zones
  .trace( 'zones' )
  .watchdog( 'watching_zones', 5000 )
  .trace( 'watchdog zones' )
;

require( '../lib/join.js' );

var ami_types = xs.set( [
  { type: 0, description: 'instance-store'        },
  { type: 1, description: 'EBS boot'              },
  { type: 2, description: 'HVM (cluster compute)' }
], { key: [ 'type' ] } );

// Ubuntu AMIs, source http://alestic.com/
var ubuntu_amis = xs
  .set( [
    // Region us-east-1
    { id: 'ami-b8d147d1', version: '12.10', type: 0, region: 'us-east-1' },
    { id: 'ami-0cdf4965', version: '12.10', type: 1, region: 'us-east-1' },
    { id: 'ami-02df496b', version: '12.10', type: 2, region: 'us-east-1' },
    { id: 'ami-b6089bdf', version: '12.04', type: 0, region: 'us-east-1' },
    { id: 'ami-de0d9eb7', version: '12.04', type: 1, region: 'us-east-1' },
    { id: 'ami-d00d9eb9', version: '12.04', type: 2, region: 'us-east-1' },
    { id: 'ami-cc811ea5', version: '11.10', type: 0, region: 'us-east-1' },
    { id: 'ami-a4801fcd', version: '11.10', type: 1, region: 'us-east-1' },
    { id: 'ami-ba801fd3', version: '11.10', type: 2, region: 'us-east-1' },
    { id: 'ami-bffa6fd6', version: '11.04', type: 0, region: 'us-east-1' },
    { id: 'ami-21e47148', version: '11.04', type: 1, region: 'us-east-1' },
    { id: 'ami-3c229e55', version: '8.04' , type: 0, region: 'us-east-1' },
    { id: 'ami-b19458d8', version: '8.04' , type: 1, region: 'us-east-1' },
    
    // Region us-west-2
    { id: 'ami-6ab8325a', version: '12.10', type: 0, region: 'us-west-2' },
    { id: 'ami-a4b83294', version: '12.10', type: 1, region: 'us-west-2' },
    { id: 'ami-a6b83296', version: '12.10', type: 2, region: 'us-west-2' },
    
    // Region us-west-1
    { id: 'ami-42b39007', version: '12.10', type: 0, region: 'us-west-1' },
    { id: 'ami-00b39045', version: '12.10', type: 1, region: 'us-west-1' },
    
    // Region eu-west-1
    { id: 'ami-5a60692e', version: '12.10', type: 0, region: 'eu-west-1' },
    { id: 'ami-64636a10', version: '12.10', type: 1, region: 'eu-west-1' },
    { id: 'ami-66636a12', version: '12.10', type: 2, region: 'eu-west-1' }
  ] )
  .join( ami_types, [ 'type' ], function( ami, type ) {
    return extend( {}, ami, { description: type.description } )
  } )
  .order( [
    { id: 'region' },
    { id: 'version', descending: true },
    { id: 'type'   }
  ] )
  .trace( 'ubuntu amis' )
;

