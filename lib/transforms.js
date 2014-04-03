/*  transforms.js

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

!function( exports ) {
  var XS       = exports.XS || require( './pipelet.js' ).XS
    , xs       = XS.xs
    , extend   = XS.extend
    , extend_2 = XS.extend_2
    , log      = XS.log
    , Pipelet  = XS.Pipelet
    , Alter    = XS.Alter
    , Compose  = Pipelet.Compose
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs transforms, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     source.attribute_to_value( [ options ] )
     
     This is a stateless and lazy pipelet.
     
     Source:
       - options.attribute_name (Object): the value to output to destination
       
     Destination:
       - all attributes of options.attribute_name
       
     Options:
       - attribute_name (string), default is 'content'
       
     Example:
       xs.set( [ { value: { name: 'Paris' } ] )
         .attribute_to_value( { attribute_name: 'value', key: [ 'name' ] } )
       ;
       
       --> [ { name: 'Paris' } ]
       
     ToDo: attribute_to_value(), add more tests
  */
  function Attribute_To_Value( options ) {
    var attribute_name = ( options && options.attribute_name ) || 'content';
    
    return Alter.call( this
      , new Function( [ 'v' ], "return v[ '" + attribute_name + "' ]" )
      , extend_2( { no_clone: true }, options )
    );
  } // Attribute_To_Value()
  
  Alter.Build( 'attribute_to_value', Attribute_To_Value );
  
  /* -------------------------------------------------------------------------------------------
     source.value_to_attribute( [ options ] )
     
     This is a stateless and lazy pipelet.
     
     Destination:
       - options.attribute_name (Object): source value
       
     Options:
       - Todo: add option to specify a source attrubute index
       - defaults (Object): static attributes to add to all destination values
       
     Example:
       xs.set( [ { id: 1 } ] )
         .value_to_attribute()
       ;
       
       --> [ { content: { id: 1 } } ]
       
     ToDo: value_to_attribute(), add tests
  */
  function Value_To_Attribute( options ) {
    options || ( options = {} );
    
    var attribute_name = options.attribute_name || 'content'
      , defaults = options.defaults || {}
      , l = Object.keys( defaults ).length
      , code
    ;
    
    if ( l ) {
      code = log.s( defaults ).replace( /\}/, '"' + attribute_name + '": value };' );
    } else {
      code = '{ "' + attribute_name + '": value };';
    }
    
    return Alter.call(
        this
      , new Function( [ 'value' ], 'return ' + code )
      , { no_clone: true }
    );
  } // Value_To_Attribute()
  
  Alter.Build( 'value_to_attribute', Value_To_Attribute );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    Attribute_To_Value: Attribute_To_Value,
    Value_To_Attribute: Value_To_Attribute
  } )
    
  de&&ug( "module loaded" );
}( this );
