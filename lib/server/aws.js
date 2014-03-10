/*  aws.js
    
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
"use strict";

var aws = require( 'aws-sdk' );

var XS;

if ( typeof require === 'function' ) {
  XS = require( '../pipelet.js' ).XS;
} else {
  XS = exports.XS;
}

var xs         = XS.xs
  , log        = XS.log
  , extend     = XS.extend
  , extend_2   = XS.extend_2
  , Code       = XS.Code
  , Pipelet    = XS.Pipelet
  , Set        = XS.Set
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true;

function ug( m ) {
  log( "xs aws, " + m );
} // ug()

/* -------------------------------------------------------------------------------------------
   EC2( credentials, options )
*/
var ec2s = {}; // global ec2 instances, one per credentials

function EC2( credentials, options ) {
  var ec2 = ec2s[ this.credentials = credentials ];
  
  if ( ec2 ) return ec2;
  
  Pipelet.call( this, options );
  
  try {
    aws.config.loadFromPath( credentials );
    
    aws.config.update( { region: "us-east-1" } ); // need to specify a region
    
    this.ec2 = new aws.EC2.Client();
    
    ec2s[ credentials ] = this;
  } catch( e ) {
    this.ec2_error = e;
    
    de&&ug( 'EC2, error: ' + e );
  }
  
  return this;
} // EC2()

/* -------------------------------------------------------------------------------------------
   .ec2( credentials, options )
*/
Pipelet.Build( 'ec2', EC2, {
  _fetch: function( receiver ) {
    var values;
    
    if ( this.ec2_error ) {
      values = [ { flow: 'ec2_errors', error: this.ec2_error } ];
    } else if ( this.ec2 ) {
      values = [ { flow: 'ec2', ec2: this.ec2 } ];
    } else {
      values = [];
    }
    
    receiver( values, true );
    
    return this;
  } // _fetch()
} ); // EC2 instance methods

/* -------------------------------------------------------------------------------------------
   EC2_Regions( options )
*/
function EC2_Regions( options ) {
  Set.call( this, [], extend( {}, options, { key: [ 'RegionName' ] } ) );
  
  return this;
} // EC2_Regions()

/* -------------------------------------------------------------------------------------------
   .ec2_regions( options )
*/
var region_clients = {};

Set.Build( 'ec2_regions', EC2_Regions, {
  add: function( values, options ) {
    if ( values.length === 0 ) return this;
    
    var ec2 = values[ 0 ].ec2, that = this;
    
    ec2.describeRegions( function( e, regions ) {
      if ( e ) return error( e );
      
      regions = regions.Regions;
      
      de&&ug( 'EC2 Regions, ' + regions.length + ' regions found: ' + log.s( regions ) );
      
      try {
        for ( var i = -1; ++i < regions.length; ) {
          var region = regions[ i ].RegionName;
          
          if ( region_clients[ region ] ) continue;
          
          de&&ug( 'EC2 starting client for region ' + region );
          
          region_clients[ region ] = new aws.EC2.Client( { region: region } );
        }
        
        de&&ug( 'EC2 Regions: adding regions' );
        
        Set.prototype.add.call( that, regions, options );
      } catch( e ) {
        de&&ug( 'EC2 Regions: exception: ' + log.s( e ) );
      }
    } );
    
    return this;
    
    function error( e ) { de&&ug( 'EC2_Regions, error' + e ) }
  }
} ); // EC2_Regions instance methods

/* -------------------------------------------------------------------------------------------
   EC2_Availability_Zones( options )
*/
function EC2_Availability_Zones( options ) {
  Set.call( this, [], extend( {}, options, { key: [ 'ZoneName' ] } ) );
  
  return this;
} // EC2_Availability_Zones()

/* -------------------------------------------------------------------------------------------
   .ec2_availability_zones( options )
*/
Set.Build( 'ec2_availability_zones', EC2_Availability_Zones, {
  _add_value: function( t, region ) {
    de&&ug( 'ec2_availability_zones.._add_value(): region: ' + log.s( region ) );
    
    var that = this;
    
    region_clients[ region ].describeAvailabilityZones( function( e, availability_zones ) {
      if ( e ) {
        de&&ug( 'EC2_Availability_Zones, region: ' + region + ', error ' + e );
        
        t.emit_nothing();
      } else {
        availability_zones = availability_zones.AvailabilityZones;
        
        de&&ug( 'EC2 Availability Zones, region: ' + region + ', zones: ' + log.s( availability_zones ) );
        
        Set.prototype._add_values.call( that, availability_zones, true /* emit_now */ );
      }
    } );
    
    return this;
  } // _add_value()
} ); // EC2_Availability_Zones instance methods

/* -------------------------------------------------------------------------------------------
   zones.ec2_describe_spot_price_history( start, instance_types, options )
   
   Parameters:
     start: (Date) start day of the price history, default matches 10 days ago.
     
     instance_types: Set or Array of instance types. An instance type is either a string
       or an object which id is an API Name - e.g. c1.medium, as defined in
       http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html#AvailableInstanceTypes
       
     options: (Object) optional additional properties.
       products_descriptions: Set or Array of products descriptions. A product is either a
         string or an object which id is a string. Valid values currently are:
           'Linux/UNIX', 'SUSE Linux', 'Windows',
           'Linux/UNIX (Amazon VPC)', 'SUSE Linux (Amazon VPC)', 'Windows (Amazon VPC)'.
*/
function EC2_Describe_Spot_Price_History( start, instance_types, options ) {
  options = Set.call( this, [], extend( {}, options, {
    // ZoneName contains the RegionName so there is no need to add it into the key 
    key: [ 'ZoneName', 'ProductDescription', 'InstanceType', 'Timestamp' ]
  } ) )._options;
  
  var that = this, parameters = this.parameters = {};
  
  if ( ! start ) {
    var start = new Date();
    
    start.setUTCDate( d.getUTCDate() - 10 );
    
    start.setUTCHours       ( 0 );
    start.setUTCMinutes     ( 0 );
    start.setUTCSeconds     ( 0 );
    start.setUTCMilliseconds( 0 );
  }
  this.start = start;
  
  if ( instance_types ) {
    if ( typeof instance_types.on == 'function' ) {
      instance_types._on( 'complete', function() {
        that._fetch_all( set_instance_types );
      } );
    } else {
      set_instance_types( instance_types );
    }
  }
  
  var products = options.products;
  
  if ( products ) {
    if ( typeof products.on == 'function' ) {
      products._on( 'complete', function() {
        that._fetch_all( set_products );
      } );
    } else {
      set_products( products );
    }
  }
  
  this.count = 0;
  
  return this;
  
  function set_instance_types( instance_types ) {
    parameters.InstanceTypes = instance_types.map( function( type ) {
      return typeof type === 'string' ? type : type.id
    } );
  }
  
  function set_products( products ) {
    parameters.ProductDescriptions = products.map( function( type ) {
      return typeof type === 'string' ? type : type.id
    } );
  }
} // EC2_Describe_Spot_Price_History()

Set.Build( 'ec2_describe_spot_price_history', EC2_Describe_Spot_Price_History, {
  _add_value( t, zone ) {
    de&&ug( 'ec2_describe_spot_price_history.._add_value(): zone: ' + log.s( zone ) );
    
    var that = this;
    
    get_prices( zone.RegionName, zone.ZoneName, extend_2( {}, this.parameters ) ); // copy parameters to allow for next token
    
    return this;
    
    function get_prices( region, zone, parameters ) {
      if ( zone ) {
        // The source pipelet provides an availability zone
        parameters.AvailabilityZone = zone;
      } else {
        // The source pipelet only provides for a region
        zone = region; // this is for traces to display the region instead of undefined zones 
      }
      
      de&&ug( 'ec2_describe_spot_price_history, region: "' + region + '", get_prices(): parameters: ' + log.s( parameters ) );
      
      region_clients[ region ].describeSpotPriceHistory( parameters, receiver );
      
      function receiver( e, prices ) {
        if ( e ) return error( e );
        
        var end = true; // by default, this will was the last describeSpotPriceHistory()
        
        if ( parameters.NextToken = prices.NextToken ) end = false; // there's more
        
        prices = prices.SpotPriceHistory;
        
        de&&ug( 'EC2 Spot Price History for region/zone: "' + zone
          + '", prices: ' + prices.length
          + ', count: ' + that.count
        );
        
        try {
          // Add region into returned prices, parse spot prices as floats, truncate results to
          // return results from requested start date 
          for ( var i = -1, l = prices.length, start = that.start.valueOf(); ++i < l; ) {
            var p = prices[ i ];
            
            p.RegionName = region;
            
            p.SpotPrice = parseFloat( p.SpotPrice );
            
            if ( start > p.Timestamp.valueOf() ) {
              // This is the end of the search
              prices = prices.slice( 0, i );
              
              end = true; // we have enough
              
              break;
            }
          }
          
          if ( end ) {
            // Done for this region or zone
            Set.prototype._add_values.call( that, t, prices, true /* emit_now */ );
          } else {
            // There's more to fetch
            Set.prototype._add_values.call( that, t, prices, true /* emit_now */, true /* there's even more */ );
            
            // Query next prices if more needed and available
            get_prices( region, zone, parameters );
          }
        } catch( e ) {
          error( '' + e + ', stack trace: ' + e.stack );
        }
      } // receiver()
      
      function error( e ) {
        de&&ug( 'EC2_Describe_Spot_Price_History, zone: "' + zone + '", error ' + e )
        
        t.emit_nothing();
      } // error()
    } // get_prices()
  } // _add_value()
} ); // EC2_Describe_Spot_Price_History instance methods

/* --------------------------------------------------------------------------
   module exports
*/
eval( XS.export_code( 'XS', [ 'EC2', 'EC2_Regions' ] ) );

de&&ug( "module loaded" );
