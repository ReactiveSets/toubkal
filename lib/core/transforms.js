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
      map( f, options )
      
      Maps input values through f() to optional output values.
      
      This is stateless synchronous pipelet. It is lazy of query_transform() is defined.
      
      Parameters:
      - f( Object ) -> Object: f() must not mutate its Object parameter, returns:
        - non-null Object: value emitted to output
        - falsy: no value emitted to output, acting as a filter
      
      - options      (Object): optional attributes for alter():
        - key (Array of Strings): output values key, defaults to source key
        - query_transform( Object ) -> Object: A transform to alter queries for both fetch() and
          upstream query updates. See alter() for details.
      
      Examples:
      - Alter a source dataflow of stocks to produce a dataflow of P/E ratios from price and
        earnings attributes. Optionally provide query_transform for lazy behavior:
        
          stocks
            .alter( function( stock ) {
              // Do not alter stock, return a new Object value
              return { ticker: stock.ticker, pe_ratio: stock.price / stock.earnings };
            }, { query_transform: query_transform } )
          ;
          
          function query_transform( term ) {
            if ( term.pe_ratio ) {
              // make a shallow copy, before remove pe_ratio attribute
              term = extend( {}, term );
              
              delete term.pe_ratio; // term is greedier, possibly greedy
            }
            
            return term;
          } // query_transform()
  */
  function Map( f, options ) {
    this._no_clone = true;
    
    Alter.call( this, f, options );
  } // Map()
  
  Alter.Build( 'map', Map );
  
  /* -------------------------------------------------------------------------------------------
     flap_map( f, options )
     
     Maps input values to f() which returns an Array of output values.
     
     This is stateless synchronous greedy pipelet.
     
     Parameters:
     - f( value ) -> Array of values
     
     - options (Object):
       - key (Array of Strings): index key for destination set, default is upstream key
     
     Example: creating two objects in two different dataflows on a source trigger:
       source
         .flat_map( f( project ) {
           var project_id = uuid_v4();
           
           return [
             { flow: 'projects', id: project_id },
             { flow: 'projects_descriptions'   , project_id: project_id   , name: project.name }
           ]
         }, { key: [ 'id' ] } )
       ;
  */
  function Flat_Map( f, options ) {
    // Use Alter inputs and outputs with no query transform to be greedy
    var name = options.name;
    
    this._input  = this._input  || new Alter.Input ( this, name );
    this._output = this._output || new Alter.Output( this, name );
    
    this._f = f;
    
    Pipelet.call( this, options );
  } // Flat_Map()
  
  Pipelet.Build( 'flat_map', Flat_Map, {
    __transform: function( values ) {
      var f = this._f
        , i = -1
        , v
        , out = []
      ;
      
      while ( v = values[ ++i ] ) push.apply( out, f( v ) );
      
      return out;
    } // __transform()
  } ); // flat_map()
  
  /* -------------------------------------------------------------------------------------------
     attribute_to_value( [ options ] )
     
     Replace input values with the value of a content attribute.
     
     Example:
         { content: { id: 1, name: 'first' } }
       ->
         { id: 1, name: 'first' }
     
     This is a synchronous stateless greedy pipelet.
     
     Parameters:
     - options (Object):
       - content        (String): content attribute name, default is 'content'
       - key  (Array of Strings): key attribute names of output set
     
     Example:
       rs.set( [ { value: { name: 'Paris' } ] )
         .attribute_to_value( { content: 'value', key: [ 'name' ] } )
       ;
       
       --> [ { name: 'Paris' } ]
       
     ToDo: attribute_to_value(), more tests
     ToDo: attribute_to_value(), make it lazy, using query_transform and complex expressions
  */
  function Attribute_To_Value( options ) {
    Map.call( this
      , new Function( [ 'v' ], "return v[ '" + ( options.content || 'content' ) + "' ]" )
      , options
    );
  } // Attribute_To_Value()
  
  Map.Build( 'attribute_to_value', Attribute_To_Value );
  
  /* -------------------------------------------------------------------------------------------
     value_to_attribute( [ options ] )
     
     Embed input values into a content attribute, preserving key attributes, optionally adding
     default attributes.
     
     This is a synchronous stateless greedy pipelet.
     
     Parameters:
     - options (Object):
       - key (Array of Strings): key attribute names, defaults to [ 'id' ]
       - defaults      (Object): static attributes to add to all destination values
       - content       (String): content attribute name, default is "content"
     
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
    var content   = options.content || 'content'
      , defaults  = options.defaults
      , key_code  = options.key.reduce( reduce_key_attribute, '' )
      , code      = 'return { ' + key_code + ', "' + content + '": v'
    ;
    
    code += defaults && Object.keys( defaults ).length
      ? ', ' + JSON.stringify( defaults ).slice( 1 )
      : ' }'
    ;
    
    de&&ug( 'value_to_attribute(), code:', code );
    
    Map.call( this
      , new Function( [ 'v' ], code )
      , options
    );
    
    function reduce_key_attribute( result, value, i ) {
      return result
        + ( i ? ', ': '' )
        + value + ': v[ "' + value + '" ]'
      ;
    } // reduce_key_attribute()
  } // Value_To_Attribute()
  
  Map.Build( 'value_to_attribute', Value_To_Attribute );
  
  /* -------------------------------------------------------------------------------------------
     attribute_to_values( options )
     
     Replace input values with the values of content attribute
     
     This is stateless synchronous greedy pipelet.
     
     Parameters:
     - options (Object):
       - key  (Array of Strings): index key for destination set, default is upstream key
       
       - content (String): name of attribute which contains values, default is 'content'
     
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
  Flat_Map.Build( 'attribute_to_values', Attribute_To_Values );
  
  function Attribute_To_Values( options ) {
    var content = options.content || 'content';
    
    Flat_Map.call( this, map_content, options );
    
    function map_content( value ) {
      return value[ content ];
    } // map_content()
  } // Attribute_To_Values()
  
  /* -------------------------------------------------------------------------------------------
     values_to_attribute( options )
     
     Embed all input values under a content attribute of a single output value.
     
     The output single value has the "id" attribute set to 1.
     
     This is a stateful synchronous greedy pipelet.
     
     Parameters:
     - options (Object):
       - content (String): name of attribute which contains values, default is "content"
     
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
      
      ToDo: implement group_by( f, options ) then use it to refactor values_to_attribute() into:
      
      Compose( 'values_to_attribute', function( source, options ) {
        return source
          .group_by( id_1, options )
        ;
        
        function id_1( value ) {
          return { id: 1 }
        }
      } )
  */
  function Values_To_Attribute( options ) {
    this._previous = null;
    
    var value = this._value = { id: 1 };
    
    this._content = options.content || 'content';
    
    value[ this._content ] = [];
    
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
      push.apply( this._value[ this._content ], values );
      
      return this._emit_on_complete( options );
    }, // _add()
    
    _remove: function( values, options ) {
      var content = this._value[ this._content ];
      
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
      content_order( organizer, options )
      
      Orders the array of values contained in a content attribute.
      
      This is a stateless synchronous lazy pipelet. Although it is stateless it is usually used
      to order a set fully contained in a content attribute.
      
      Parameters:
      - organizer (String): attribute name to order content values
      
      - options (optional Object): options for content_transform():
        - content (String): the name of the content attribute, defaults to 'content'
  */
  Compose( 'content_order', function( source, organizer, options ) {
    return source.content_sort( sorter, options );
    
    function sorter( a, b ) {
      a = a[ organizer ];
      b = b[ organizer ];
      
      return +( a  >  b )
          || +( a === b ) - 1
      ;
    } // sorter()
  } ); // content_order()
  
  /* -------------------------------------------------------------------------------------------
      content_sort( sorter, options )
      
      Sorts the array of values contained in a content attribute.
      
      This is a stateless synchronous lazy pipelet. Although it is stateless it is usually used
      to order a set fully contained in a content attribute.
      
      Parameters:
      - sorter( a, b ) -> integer: returns:
        - +1 if a is 'after'  b
        -  0 if a     equals  b
        - -1 if a is 'before' b
      
      - options (optional Object): options for content_transform():
        - content (String): the name of the content attribute, defaults to 'content'
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
    'Map'                 : Map,
    'Flat_Map'            : Flat_Map,
    'Attribute_To_Value'  : Attribute_To_Value,
    'Attribute_To_Values' : Attribute_To_Values,
    'Value_To_Attribute'  : Value_To_Attribute,
    'Values_To_Attribute' : Values_To_Attribute
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} );
