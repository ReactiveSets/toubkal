/*  aws.js
    
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
Pipelet.build( 'ec2', EC2, {
  fetch: function( receiver ) {
    var values;
    
    if ( this.ec2_error ) {
      values = [ { model: 'ec2_errors', error: this.ec2_error } ];
    } else if ( this.ec2 ) {
      values = [ { model: 'ec2', ec2: this.ec2 } ];
    } else {
      values = [];
    }
    
    receiver( values, true );
    
    return this;
  } // fetch()
} ); // EC2 instance methods

/* -------------------------------------------------------------------------------------------
   EC2_Regions( options )
*/
function EC2_Regions( options ) {
  Set.call( this, extend( {}, options, { key: [ 'RegionName' ] } ) );
  
  return this;
} // EC2_Regions()

/* -------------------------------------------------------------------------------------------
   .ec2_regions( options )
*/
var region_clients = {};

Set.build( 'ec2_regions', EC2_Regions, {
  add: function( values ) {
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
        
        Set.prototype.add.call( that, regions );
      } catch( e ) {
        console.log( e );
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
  Set.call( this, extend( {}, options, { key: [ 'ZoneName' ] } ) );
  
  return this;
} // EC2_Availability_Zones()

/* -------------------------------------------------------------------------------------------
   .ec2_availability_zones( options )
*/
Set.build( 'ec2_availability_zones', EC2_Availability_Zones, {
  add: function( regions ) {
    de&&ug( 'ec2_availability_zones..add(): regions: ' + log.s( regions ) );
    
    if ( regions.length === 0 ) return this;
    
    var that = this, count = regions.length;
    
    for ( var i = -1; ++i < regions.length; ) {
      var region = regions[ i ].RegionName;
      
      ( function( region ) { 
        region_clients[ region ].describeAvailabilityZones( function( e, availability_zones ) {
          if ( e ) return error( e );
          
          availability_zones = availability_zones.AvailabilityZones;
          
          de&&ug( 'EC2 Availability Zones for region "' + region + '": ' + log.s( availability_zones ) );
          
          Set.prototype.add.call( that, availability_zones, --count ? { more: true } : void 0 );
        } );
        
        function error( e ) {
          --count || that.emit_add( that, [] ); // no more
          
          de&&ug( 'EC2_Availability_Zones, region ' + region + ', error ' + e )
        }
      } )( region );
    }
    
    return this;
  }
} ); // EC2_Availability_Zones instance methods

/* -------------------------------------------------------------------------------------------
   regions.ec2_describe_spot_price_history( start, instance_types, options )
   
   Parameters:
     start: (Date) start day of the price history, default matches yesterday.
     
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
  options = Set.call( this, extend( {}, options, { key: [ 'RegionName' ] } ) ).options;
  
  var parameters = this.parameters = {};
  
  // StartTime cannot be specified, the service always returns Invalid Request
  if ( start ) {
    //parameters.StartTime = start;
  } else {
  /*
    var d = new Date();
    d.setUTCDate( d.getUTCDate() - 10 );
    
    d.setUTCHours       ( 0 );
    d.setUTCMinutes     ( 0 );
    d.setUTCSeconds     ( 0 );
    d.setUTCMilliseconds( 0 );
    
    parameters.StartTime = d;
    */
  }
  
  if ( instance_types ) {
    if ( instance_types.on_change ) {
      instance_types.on_change( function( operation, values, options ) {
        this.fetch_all( set_instance_types );
      } );
    } else {
      set_instance_types( instance_types );
    }
  }
  
  var products = options.products;
  
  if ( products ) {
    if ( products.on_change ) {
      products.on_change( function( operation, values, options ) {
        this.fetch_all( set_products );
      } );
    } else {
      set_products( products );
    }
  }
  
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

Set.build( 'ec2_describe_spot_price_history', EC2_Describe_Spot_Price_History, {
  add: function( regions ) {
    de&&ug( 'ec2_describe_spot_price_history..add(): regions: ' + log.s( regions ) );
    
    if ( regions.length === 0 ) return this;
    
    var that = this, count = regions.length;
    
    for ( var i = -1; ++i < regions.length; ) {
      get_prices( regions[ i ].RegionName, extend( {}, this.parameters ) ); // copy parameters to allow for next token
    }
    
    return this;
    
    function get_prices( region, parameters ) {
      de&&ug( 'ec2_describe_spot_price_history, region: "' + region + '", get_prices(): parameters: ' + log.s( parameters ) );
      
      region_clients[ region ].describeSpotPriceHistory( parameters, receiver );
      
      function receiver( e, prices ) {
        if ( e ) return error( e );
        
        if ( parameters.NextToken = prices.NextToken ) {
          // get_prices( region, parameters ); // Query next prices
        }
        
        prices = prices.SpotPriceHistory;
        
        de&&ug( 'EC2 Spot Price History for region "' + region + '", prices: ' + prices.length );
        
        // Add region into returned prices, parse spot prices as floats 
        for ( var i = -1, l = prices.length; ++i < l; ) {
          var p = prices[ i ];
          
          p.region = region;
          
          p.SpotPrice = parseFloat( p.SpotPrice );
        }
        
        Set.prototype.add.call( that, prices, --count ? { more: true } : void 0 );
        //parameters.NextToken
      } // receiver()
      
      function error( e ) {
        --count || that.emit_add( that, [] ); // no more
        
        de&&ug( 'EC2_Describe_Spot_Price_History, region ' + region + ', error ' + e )
      } // error()
    } // get_prices()
  } // add()
} ); // EC2_Describe_Spot_Price_History instance methods

/* --------------------------------------------------------------------------
   module exports
*/
eval( XS.export_code( 'XS', [ 'EC2', 'EC2_Regions' ] ) );

de&&ug( "module loaded" );
