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
  var ec2 = ec2s[ credentials ];
  
  if ( ec2 ) return ec2;
  
  Pipelet.call( this, options );
  
  try {
    aws.config.loadFromPath( credentials );
    
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
  Set.call( this, options );
  
  return this;
} // EC2_Regions()

/* -------------------------------------------------------------------------------------------
   .ec2_regions( options )
*/
Set.build( 'ec2_regions', EC2_Regions, {
  add: function( values ) {
    if ( values.length === 0 ) return this;
    
    var ec2 = values[ 0 ].ec2;
    
    ec2.describeRegions( function( e, regions ) {
      if ( e ) return error( e );
      
      regions = regions.Regions;
      
      de&&ug( 'EC2 Regions: ' + log.s( regions ) );
      
      this.add( regions.Regions );
    } );
    
    return this;
    
    function error( e ) { de&&ug( 'EC2_Regions, error' + e ) }
  }
} ); // EC2_Regions instance methods

/* --------------------------------------------------------------------------
   module exports
*/
eval( XS.export_code( 'XS', [ 'EC2', 'EC2_Regions' ] ) );

de&&ug( "module loaded" );
