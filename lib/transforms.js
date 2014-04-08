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
      , new Function( [ 'v' ], "  return v[ '" + attribute_name + "' ]" )
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
      code = log.s( defaults ).replace( /\}/, ', "' + attribute_name + '": v };' );
    } else {
      code = '{ "' + attribute_name + '": v };';
    }
    
    return Alter.call(
        this
      , new Function( [ 'v' ], '  return ' + code )
      , extend_2( { no_clone: true }, options )
    );
  } // Value_To_Attribute()
  
  Alter.Build( 'value_to_attribute', Value_To_Attribute );
  
  /* -------------------------------------------------------------------------------------------
     source.attribute_to_values( options )
     
     This is a lazy stateless pipelet.
     
     Source:
       - options.attribute_name (Array of Objects) to emit
     
     Destination: Objects from source attribute options.attribute_name
     
     Options:
       - key (Array): index key for destination set, default is upstream pipelet key which in
           most cases is not what one wants and should therefore be provided.
       
       - attribute_name (string): name of attribute which contains values, default is 'content'
     
     Example:
       xs.set(
         [
           {
             id: 1,
             
             content: [
               { city: 'Paris'     }
               { city: 'Marseille' }
             ]
           },
           
           {
             id: 2,
             
             content: [
               { city: 'Lille'     }
               { city: 'Caen'      }
             ]
           }
           
         ] )
         
         .attribute_to_values( { id: 'city' } )
       ;
       
       -->
       
       [
         { city: 'Paris'     }
         { city: 'Marseille' }
         { city: 'Lille'     }
         { city: 'Caen'      }
       ]
  */
  function Attribute_To_Values( options ) {
    return Pipelet.call( this, options );
  } // Attribute_To_Values()
  
  Pipelet.Build( 'attribute_to_values', Attribute_To_Values, function( Super ) {
    var push = Array.prototype.push;
    
    return {
      __transform: function( values ) {
        var attribute_name = this._options.attribute_name || 'content'
          , i = -1, v, out = []
        ;
        
        while ( v = values[ ++i ] ) push.apply( out, v[ attribute_name ] );
        
        return out;
      }
    }
  } ); // attribute_to_values()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    Attribute_To_Value : Attribute_To_Value,
    Value_To_Attribute : Value_To_Attribute,
    Attribute_To_Values: Attribute_To_Values
  } )
    
  de&&ug( "module loaded" );
}( this );
