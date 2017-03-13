/*  aws.js
    
    ----
    
    Copyright (c) 2013-2016, Reactive Sets

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

var aws      = require( 'aws-sdk' )
  , rs       = require( '../core/pipelet.js' )
  , RS       = rs.RS
  , log      = RS.log
  , extend   = RS.extend
  , extend_2 = extend._2
  , Pipelet  = RS.Pipelet
  , Set      = RS.Set
;

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = RS.log.bind( null, 'aws' );

/* -------------------------------------------------------------------------------------------
    @pipelet ec2( credentials, options )
    
    @short Initializes and emits EC2 client instance.
    
    @description:
      This is multiton, one instance per credentials file name.
      
      This is a stateful, synchronous, source pipelet.
      
    @parameters:
      - credentials (String): aws credentials file name
      - options (Object): pipelet options
    
    @emits:
      - flow (String):
        - 'ec2_errors': when there are errors initializing EC2 client
          - errors (Error): thrown Error instance
        
        - 'ec2': EC2 client is initialized properly, other attributes:
          - ec2: instance of aws.EC2.Client()
*/
var ec2s = {}; // global ec2 instances, one per credentials

function EC2( credentials, options ) {
  var that = this
    , ec2  = ec2s[ that.credentials = credentials ]
  ;
  
  if ( ec2 ) return ec2;
  
  Pipelet.call( that, options );
  
  that._output.fetch_unfiltered = fetch_unfiltered;
  
  try {
    aws.config.loadFromPath( credentials );
    
    aws.config.update( { region: "us-east-1" } ); // need to specify a region
    
    that.ec2 = new aws.EC2.Client();
    
    ec2s[ credentials ] = that;
  } catch( e ) {
    that.ec2_error = e;
    
    de&&ug( 'EC2, error: ' + e );
  }
  
  function fetch_unfiltered( receiver ) {
    var values;
    
    if ( that.ec2_error ) {
      // ToDo: emit to global error dataflow
      values = [ { flow: 'ec2_errors', error: that.ec2_error } ];
    } else if ( that.ec2 ) {
      values = [ { flow: 'ec2', ec2: that.ec2 } ];
    } else {
      values = [];
    }
    
    receiver( values, true );
  } // fetch_unfiltered()
} // EC2()

Pipelet.Build( 'ec2', EC2 );

/* -------------------------------------------------------------------------------------------
    @pipelet ec2_Regions( options )
    
    @short Retrieve ec2 client regions and initializes ec2 clients for each region
    
    @description:
      This is a stateful, synhronous, greedy pipelet.
      
      For each region found, initializes a client for other ec2 pipelets to use.
    
    @emits regions returned by ec2.describeRegions().
    
    @example:
      rs.ec2( '/path/to/credentials' )
        .ec2_Regions()
      ;
*/
function EC2_Regions( options ) {
  Set.call( this, [], extend( {}, options, { key: [ 'RegionName' ] } ) );
} // EC2_Regions()

var region_clients = {};

Set.Build( 'ec2_regions', EC2_Regions, {
  _add: function( values, options ) {
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
    
    function error( e ) { de&&ug( 'EC2_Regions, error' + e ) }
  }
} ); // EC2_Regions instance methods

/* -------------------------------------------------------------------------------------------
   EC2_Availability_Zones( options )
*/
function EC2_Availability_Zones( options ) {
  Set.call( this, [], extend( {}, options, { key: [ 'ZoneName' ] } ) );
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
  Set.call( this, [], extend( {}, options, {
    // ZoneName contains the RegionName so there is no need to add it into the key 
    key: [ 'ZoneName', 'ProductDescription', 'InstanceType', 'Timestamp' ]
  } ) );
  
  options = this._options;
  
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
    if ( instance_types._output ) {
      instance_types._output.on( 'complete', function() {
        that._fetch_all( set_instance_types );
      } );
    } else {
      set_instance_types( instance_types );
    }
  }
  
  var products = options.products;
  
  if ( products ) {
    if ( products._output ) {
      products._output.on( 'complete', function() {
        that._fetch_all( set_products );
      } );
    } else {
      set_products( products );
    }
  }
  
  this.count = 0;
  
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
  _add_value: function( t, zone ) {
    de&&ug( 'ec2_describe_spot_price_history.._add_value(): zone: ' + log.s( zone ) );
    
    var that = this;
    
    get_prices( zone.RegionName, zone.ZoneName, extend_2( {}, this.parameters ) ); // copy parameters to allow for next token
    
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
RS.add_exports( {
  'EC2'        : EC2,
  'EC2_Regions': EC2_Regions
} );

de&&ug( "module loaded" );
