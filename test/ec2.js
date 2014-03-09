/*  ec2.js
    
    AWS EC2 tests
    
    ----
    
    Copyright (C) 2013, 2014, Connected Sets

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
require( '../lib/aggregate.js' );
require( '../lib/join.js' );
require( '../lib/last.js' );

var de = true, ug = function( message ) {
  log( 'xs tests, ' + message )
}

de&&ug( 'start ec2.js' );

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
    { id: 'ami-b6ad81f3', version: '12.10', type: 1, region: 'us-west-1',
      features: [ 'node', 'desktop' ], created_at: new Date( 2013, 04, 20 ) },
    
    // Region eu-west-1
    { id: 'ami-5a60692e', version: '12.10', type: 0, region: 'eu-west-1' },
    { id: 'ami-64636a10', version: '12.10', type: 1, region: 'eu-west-1' },
    { id: 'ami-66636a12', version: '12.10', type: 2, region: 'eu-west-1' }
  ] )
  
  .join( ami_types, [ { id: 'type', type: 'number', no_null: true, no_undefined: true } ], function( ami, type ) {
    return extend( {}, ami, { description: type.description } )
  } )
  
  .order( [
    { id: 'region' },
    { id: 'version', descending: true },
    { id: 'type', type: 'number' }
  ], { no_null: true, no_undefined: true } )
  
  .trace( 'ubuntu amis' )
  ._on( 'complete', function() { exit() } )
;

var AMI_regions = ubuntu_amis
// .filter( function( ami ) { return ami.version == '12.10' } )
  .filter( function( ami ) { return ami.version == '12.10' && ami.type == 2 } )
  .aggregate( void 0, [ { id: 'region' } ] )
  .trace( 'AMI Regions' );
;

var regions = xs
  .ec2( '../aws-credentials.json' )
  .ec2_regions()
  .join( AMI_regions, [
    [
      { id: 'RegionName', no_null: true, no_undefined: true },
      { id: 'region'    , no_null: true, no_undefined: true }
    ]
    ], function( region ) { return region }
  )
  .trace( 'Regions for which we have AMIs' )
;
    
var zones = regions
  // .filter( function( r ) { return /^us/.test( r.RegionName ); } )
  
  .ec2_availability_zones()
  
  .set() // testing output of availability zones
  
  .trace( 'Availability Zones' )
  
  ._on( 'complete', function() {
    this._fetch_all( function( zones ) {
      console.log( 'Received all us Availability Zones: '
        + zones.map( function( z ) { return z.ZoneName } ).join( ', ' )
      )
    } );
  } )
  
  .filter( function( zone ) { return zone.State == 'available' } )
;

/*/ Watchdog test on availability zones reception
zones
  .trace( 'zones' )
  .watchdog( 'watching_zones', 5000 )
  .trace( 'watchdog zones' )
;
// */

var d = new Date();
d.setDate( d.getDate() - 90 ); // 3 months history 

var previous;

var spot_prices_stats = zones
  .ec2_describe_spot_price_history( d, [ 'm1.small' ], { products : [ 'Linux/UNIX' ], name: 'spot_price_history' } )
//  .ec2_describe_spot_price_history( d, [ 'cc1.4xlarge' ], { products : [ 'Linux/UNIX' ], name: 'spot_price_history' } )
  
  ._on( 'complete', function() { de&&ug( 'complete after ec2_describe_spot_price_history()' ) } )
  
  .trace( 'Spot Price History', { counts_only: true } )
  
  // ._on( 'complete', function() { de&&ug( 'complete after trace()' ) } )
  
  .order( [
    { id: 'AvailabilityZone'  , type: 'String' },
    { id: 'ProductDescription', type: 'String' },
    { id: 'InstanceType'      , type: 'String' }, 
    { id: 'Timestamp'         , type: 'Date'   }
  ], { no_null: true, no_undefined: true } )
  
  // ._on( 'complete', function() { de&&ug( 'complete after order()' ) } )
  
  // .trace( 'Spot Price History Ordered', { counts_only: true } )
  
  .delay( 1000 ) // for testing purposes only
  
  // ._on( 'complete', function() { de&&ug( 'complete after delay()' ) } )
  
  .alter( function( price, i ) {
    if ( i
      && previous.AvailabilityZone   == price.AvailabilityZone
      && previous.ProductDescription == price.ProductDescription
      && previous.InstanceType       == price.InstanceType
    ) {
      var timestamp = price.Timestamp;
      
      // price.year = timestamp.getUTCFullYear();
      // price.month = timestamp.getUTCMonth();
      
      var seconds = previous.seconds = ( timestamp - previous.Timestamp ) / 1000;
      
      previous.cost_seconds = previous.SpotPrice * seconds;
    }
    
    return previous = price;
  } )
  
  // ._on( 'complete', function() { de&&ug( 'complete after alter()' ) } )
  
  //.trace( 'Spot Prices' )
  
  .aggregate( [
    { id: 'seconds'     , type: 'sum' },
    { id: 'cost_seconds', type: 'sum' },
    { id: 'max_price'   , type: 'max', of: 'SpotPrice' },
    { id: 'min_price'   , type: 'min', of: 'SpotPrice' }
  ], [
    { id: 'AvailabilityZone'   },
    { id: 'ProductDescription' },
    { id: 'InstanceType'       }
  ] )
  
  ._on( 'complete', function() { de&&ug( 'complete after aggregate()' ) } )
  
  .alter( function( cost ) {
    cost = extend( {}, cost );
    
    cost.average_cost_per_hour = cost.cost_seconds / cost.seconds;
    
    cost.max_price = Math.max.apply( null, cost.max_price );
    cost.min_price = Math.min.apply( null, cost.min_price );
    
    return cost;
  } )
  
  .order( [ { id: 'average_cost_per_hour', descending: true } ] )
  
  .trace( 'Average Cost per Hour by AvailabilityZone and InstanceType' )
  
  ._on( 'complete', function() {
    de&&ug( 'complete after all is done' )
    
    this._fetch_all( function( prices ) {
      //de&&ug( 'spot_prices_stats: ' + log.s( prices, void 0, '  ' ) );
    } )
  } )
;
