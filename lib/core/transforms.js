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

  var RS           = rs.RS
    , extend       = RS.extend
    , extend_2     = extend._2
    , log          = RS.log.bind( null, 'transforms' )
    , Pipelet      = RS.Pipelet
    , Compose      = Pipelet.Compose
    , Alter        = RS.Alter
    , Set          = RS.Set
    , value_equals = RS.value_equals
    , Options      = RS.Transactions.Options
    , has_more     = Options.has_more
    , push         = Array.prototype.push
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = log;
  
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
     
     This is stateless synchronous greedy pipelet.
     
     Parameters:
     - options (Object):
       - key  (Array of Strings): index key for destination set, default is upstream pipelet key
       
       - attribute_name (String): name of attribute which contains values, default is 'content'
     
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
    // Use Alter inputs and outputs with no query transform to become greedy
    var name = options.name;
    
    this._input  = this._input  || new Alter.Input ( this, name );
    this._output = this._output || new Alter.Output( this, name );
    
    Pipelet.call( this, options );
  } // Attribute_To_Values()
  
  Pipelet.Build( 'attribute_to_values', Attribute_To_Values, {
    __transform: function( values ) {
      var attribute_name = this._options.attribute_name || 'content'
        , i = -1, v, out = []
      ;
      
      while ( v = values[ ++i ] ) push.apply( out, v[ attribute_name ] );
      
      return out;
    }
  } ); // attribute_to_values()
  
  /* -------------------------------------------------------------------------------------------
     values_to_attribute( options )
     
     Embed all input values under a content attribute of a single output value.
     
     The output single value has the "id" attribute set to 1.
     
     This is a stateful synchronous greedy pipelet.
     
     Parameters:
     - options (Object):
       - attribute_name (String): name of attribute which contains values, default is "content"
     
     Example:
       rs.set( [
           { city: 'Paris'     }
           { city: 'Marseille' }
           { city: 'Lille'     }
           { city: 'Caen'      }
         ], { key: [ 'city' ] } )
         
         .values_to_attribute()
       ;
       
       ->
         {
           id: 1,
           
           content: [
             { city: 'Paris'     }
             { city: 'Marseille' }
             { city: 'Lille'     }
             { city: 'Caen'      }
           ]
         }
  */
  function Values_To_Attribute( options ) {
    this._previous = null;
    
    var value = this._value = { id: 1 };
    
    this._attribute_name = options.attribute_name || 'content';
    
    value[ this._attribute_name ] = [];
    
    Set.call( this, [] );
  } // Values_To_Attribute()
  
  Set.Build( 'values_to_attribute', Values_To_Attribute, {
    _emit_on_complete: function( options ) {
      if ( has_more( options ) ) return this;
      
      var previous = this._previous
        , value    = this._previous = this._value
      ;
      
      this.a[ 0 ] = value;
      
      return this.__emit_operations( [ value ], previous && [ previous ], null, options );
    }, // _emit_on_complete()
    
    _add: function( values, options ) {
      push.apply( this._value[ this._attribute_name ], values );
      
      return this._emit_on_complete( options );
    }, // _add()
    
    _remove: function( values, options ) {
      var content = this._value[ this._attribute_name ];
      
      values.forEach( function( value ) {
        for ( var i = -1, l = content.length; ++i < l; ) {
          if ( value_equals( value, content[ i ] ) ) {
            content.splice( i, 1 );
            
            return;
          }
        }
        
        // ToDo: values_to_attribute.._remove(): implement anti-state
        log( 'values_to_attribute.._remove(), ignoring not found value:', value );
      } );
      
      return this._emit_on_complete( options );
    }, // _remove()
    
    _update: Pipelet.prototype._update
  } ); // values_to_attribute()
  
  /* -------------------------------------------------------------------------------------------
      ToDo: document content_order()
  */
  Compose( 'content_order', function( source, organizer, options ) {
    return source.content_sort( function( a, b ) {
      a = a[ organizer ];
      b = b[ organizer ];
      
      return +( a  >  b )
          || +( a === b ) - 1
      ;
    }, options );
  } ); // content_order()
  
  /* -------------------------------------------------------------------------------------------
      ToDo: document content_sort()
  */
  Compose( 'content_sort', function( source, sorter, options ) {
    return source.content_transform( content_sort, options );
    
    function content_sort( content ) {
      // shallow copy before sort
      return content.slice().sort( sorter )
    }
  } ); // content_order()
  
  /* -------------------------------------------------------------------------------------------
      content_transform( transform, options )
      
      Modifies content attribute using transform().
      
      This is a stateless synchronous lazy pipelet. If content attribute is defined in
      queries, option content_query_transform() must be provided.
      
      Parameters:
      - transform( content ) -> content: should return a new value for a content attribute,
        and SHOULD NOT mutate source content attribute. Content attribute may contain any
        value, including null or undefined passed-to and returned-by transform().
      
      - options (optional Object):
        - content (String): content attribute name, default is "content"
        
        - content_query_transform( term ) -> term: transforms defined content attribute query
          terms for fetch() upstream queries. Default is none, query terms defining a content
          attribute would neither be forwarded upstream nor provide any fetched value.
  */
  Compose( 'content_transform', function( source, transform, options ) {
    var content = options.content || 'content'
      , content_query_transform = options.content_query_transform
    ;
    
    return source
      .alter( content_transform, { query_transform: content_transform_query_transform } )
    ;
    
    function content_transform( value ) {
      value[ content ] = transform( value[ content ] );
    }
    
    function content_transform_query_transform( term ) {
      var content = term[ content ], ___;
      
      if ( content !== ___ ) {
        if ( content_query_transform ) {
          term = extend_2( {}, term );
          
          term[ content ] = content_query_transform( content );
        } else {
        
          // ToDo: emit an Error or a Warning
          return;
        }
      }
      
      return term;
    } // content_transform_query_transform()
  } ); // content_transform()
  
  /* -------------------------------------------------------------------------------------------
      module exports
  */
  RS.add_exports( {
    'Attribute_To_Value' : Attribute_To_Value,
    'Value_To_Attribute' : Value_To_Attribute,
    'Attribute_To_Values': Attribute_To_Values,
    'Values_To_Attribute': Values_To_Attribute
  } )
  
  de&&ug( "module loaded" );
  
  return rs;
} );
