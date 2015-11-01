/*  transforms.js

    Copyright (C) 2013-2015, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'transforms', [ './pipelet' ], function( rs ) {
  'use strict';

  var RS       = rs.RS
    , extend_2 = RS.extend._2
    , log      = RS.log
    , Pipelet  = RS.Pipelet
    , Alter    = RS.Alter
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = log.bind( null, 'transforms' );
  
  /* -------------------------------------------------------------------------------------------
     attribute_to_value( [ options ] )
     
     Replace input values with the value of an attribute (content by default), e.g.:
     
         { content: { id: 1, name: 'first' } }
       ->
         { id: 1, name: 'first' }
     
     This is a synchronous stateless greedy pipelet.
     
     Parameters:
     - options (Object):
       - attribute_name (String): default is 'content'
       - key  (Array of Strings): key attribute names of output set
     
     Example:
       rs.set( [ { value: { name: 'Paris' } ] )
         .attribute_to_value( { attribute_name: 'value', key: [ 'name' ] } )
       ;
       
       --> [ { name: 'Paris' } ]
       
     ToDo: attribute_to_value(), more tests
     ToDo: attribute_to_value(), make it lazy, using query_transform and complex expressions
  */
  function Attribute_To_Value( options ) {
    Alter.call( this
      , new Function( [ 'v' ], "return v[ '" + ( options.attribute_name || 'content' ) + "' ]" )
      , extend_2( { no_clone: true }, options )
    );
  } // Attribute_To_Value()
  
  Alter.Build( 'attribute_to_value', Attribute_To_Value );
  
  /* -------------------------------------------------------------------------------------------
     value_to_attribute( [ options ] )
     
     Embed input values into a container attribute (default is content) object, preserving
     key attributes, optionally adding default attributes.
     
     This is a synchronous stateless greedy pipelet.
     
     Parameters:
     - options (Object):
       - key (Array of Strings): key attribute names, defaults to [ 'id' ]
       - defaults      (Object): static attributes to add to all destination values
     
     Example:
       rs.set( [ { id: 1, name: 'first' }, { id: 2, name: 'second' } ] )
         .value_to_attribute()
       ;
       
       ->
         [
           { id: 1, content: { id: 1, name: 'first'  } },
           { id: 2, content: { id: 2, name: 'second' } }
         ]
     
     ToDo: value_to_attribute(), more tests
  */
  function Value_To_Attribute( options ) {
    var attribute_name = options.attribute_name || 'content'
      , defaults       = options.defaults
      , key_code       = options.key.reduce( reduce_key_attribute, '' )
      , code           = 'return { ' + key_code + ', "' + attribute_name + '": v'
    ;
    
    code += defaults && Object.keys( defaults ).length
      ? ', ' + JSON.stringify( defaults ).slice( 1 )
      : ' }'
    ;
    
    de&&ug( 'value_to_attribute(), code:', code );
    
    Alter.call( this
      , new Function( [ 'v' ], code )
      , extend_2( { no_clone: true }, options )
    );
    
    function reduce_key_attribute( result, value, i ) {
      return result
        + ( i ? ', ': '' )
        + value + ': v[ "' + value + '" ]'
      ;
    } // reduce_key_attribute()
  } // Value_To_Attribute()
  
  Alter.Build( 'value_to_attribute', Value_To_Attribute );
  
  /* -------------------------------------------------------------------------------------------
     attribute_to_values( options )
     
     Replace input values with the values of an attribute (content by default)
     
     This is stateless synchronous lazy pipelet.
     
     Parameters:
     - options (Object):
       - key  (Array of Strings): index key for destination set, default is upstream pipelet key
       
       - attribute_name (string): name of attribute which contains values, default is 'content'
     
     Example:
       rs.set(
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
    Pipelet.call( this, options );
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
  RS.add_exports( {
    Attribute_To_Value : Attribute_To_Value,
    Value_To_Attribute : Value_To_Attribute,
    Attribute_To_Values: Attribute_To_Values
  } )
    
  de&&ug( "module loaded" );
  
  return rs;
} );
