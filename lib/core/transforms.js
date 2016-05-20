/*  transforms.js

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'transforms', [ './group_by' ], function( rs ) {
  'use strict';

  var RS           = rs.RS
    , extend       = RS.extend
    , extend_2     = extend._2
    , log          = RS.log.bind( null, 'transforms' )
    , Pipelet      = RS.Pipelet
    , Alter        = RS.Alter
    , Set          = RS.Set
    , Group        = RS.Group
    , value_equals = RS.value_equals
    , is_array     = RS.is_array
    , Options      = RS.Transactions.Options
    , has_more     = Options.has_more
    , push         = Array.prototype.push
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log;
  
  /* -------------------------------------------------------------------------------------------
      map( f, options )
      
      Maps input values through f() to optional output values.
      
      This is stateless synchronous pipelet. It is lazy if query_transform() is defined.
      
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
     flat_map( f, options )
     
     Maps input values to f() which returns an Array of output values.
     
     This is stateless synchronous pipelet. It is lazy if query_transform() is defined.
     
     Parameters:
     - f( value ) -> Array of values
     
     - options (Object):
       - key (Array of Strings): index key for destination set, default is upstream key
       - query_transform( Object ) -> Object: see alter() for details
     
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
    var that            = this
      , name            = options.name
      , query_transform = options.query_transform
    ;
    
    that._input  = that._input  || new Alter.Input ( that, name, query_transform );
    that._output = that._output || new Alter.Output( that, name, query_transform );
    
    that._input._transform = that.__transform =
      function( values ) {
        var i   = -1
          , l   = values.length
          , out = []
        ;
        
        while ( ++i < l )
          push.apply( out, f( values[ i ] ) )
        ;
        
        return out;
      }
    ;
    
    Pipelet.call( that, options );
  } // Flat_Map()
  
  Pipelet.Build( 'flat_map', Flat_Map );
  
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
      
  */
  Group.Build( 'values_to_attribute', Values_To_Attribute );
  
  function Values_To_Attribute( options ) {
    Group.call( this, id_1, extend( {}, options, { key: [ 'id' ] } ) );
    
    function id_1( value ) {
      return { id: 1 }
    }
  } // Values_To_Attribute()
  
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
  Alter.Build( 'content_transform', Content_Transform );
  
  function Content_Transform( transform, options ) {
    var content = options.content || 'content'
      , content_query_transform = options.content_query_transform
    ;
    
    Alter.call( this, content_transform, { query_transform: content_transform_query_transform } );
    
    // return
    
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
  } // Content_Transform()
  
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
  Content_Transform.Build( 'content_sort', Content_Sort );
  
  function Content_Sort( sorter, options ) {
    Content_Transform.call( this, content_sort, options );
    
    function content_sort( content ) {
      // shallow copy before sort
      return content.slice().sort( sorter )
    }
  } // Content_Sort()
  
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
  Content_Sort.Build( 'content_order', Content_Order );
  
  function Content_Order( organizer, options ) {
    Content_Sort.call( this, sorter, options );
    
    function sorter( a, b ) {
      a = a[ organizer ];
      b = b[ organizer ];
      
      return +( a  >  b )
          || +( a === b ) - 1
      ;
    } // sorter()
  } // Content_Order()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet pick( attributes, options )
      
      @short Forwards only specified attributes.
      
      @description:
        From each source value, select attributes, then emit downstream.
        
        Undefined attributes in source values are not copied.
        
        This is a @stateless, @@synchronous, @@lazy pipelet.
      
      @parameters:
        - attributes:
          - (Array): attribute definitions, each attribute is:
            - (String): the attribute name
            
            - (Array of Strings): first string is output attribute name,
              second string is source attribute name.
          
          - (Object): which attribute names are output attribute names
            and attribute values are source attribute names.
        
        - options (optional Object): options for map() plus:
          - _static:
            - (String): a flow attribute to add to output
            
            - (Object): static attributes to add to output
  */
  function pick_attributes_to_array( attributes ) {
    return is_array( attributes )
    
      ? attributes.map( string_to_array )
      
      : Object.keys( attributes ).map( attribute_to_array )
    ;
    
    function string_to_array( a ) { return typeof a == 'string' ? [ a, a ] : a }
    
    function attribute_to_array( a ) { return [ a, attributes[ a ] ] }
  } // pick_attributes_to_array()
  
  rs.Compose( 'pick', function( source, attributes, options ) {
    attributes = pick_attributes_to_array( attributes );
    
    var transform       = make_transform( attributes, options._static )
      , query_transform = attributes.every( identical ) ? identity : make_transform( attributes.map( swap ) )
    ;
    
    return source
      .map( transform, extend( { query_transform: query_transform }, options ) )
    ;
    
    function identical( _ ) { return _[ 0 ] == _[ 1 ] }
    
    function identity( term ) { return term }
    
    function swap( k ) { return [ k[ 1 ], k[ 0 ] ] }
    
    function make_transform( attributes, _static ) {
      if ( typeof _static == 'string' ) _static = { flow: _static };
      
      _static = _static ? JSON.stringify( _static ) : '{}';
      
      attributes = _static + attributes
        .map( to_code_string )
        .join( '' )
      ;
      
      return new Function( '_', 'var o=' + attributes + ';return o' );
      
      function to_code_string( a ) {
        return ';if(_.hasOwnProperty("' + a[ 1 ] + '"))o' + de_reference( a[ 0 ] ) + '=_' + de_reference( a[ 1 ] )
        
        function de_reference( _ ) {
          return _.match( /^[$_a-zA-Z][$_a-zA-Z0-9]*/ ) ? '.' + _ : '["' + _ + '"]'
        }
      } // to_code_string()
    } // make_transform()
  } ); // pick()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet filter_pick( parent, _static, attributes, options )
      
      @short Select source dataflow from matching parent dataflow values.
      
      @description:
        This is a @@synchronous, @@stateless, @@lazy pipelet.
        
        It performs a kind of stateless and lazy inner join between source
        and parent, where the output only receives unaltered source values.
        
        This is a composed version of the common pattern using filter() with
        pick():
        
        ```javascript
        source
          .filter(
            parent.pick( { project_id: 'id' }, { _static: 'issues' } ),
            
            { filter_keys: [ 'project_id' ] }
          )
        ```
        
        With filter_pick() this can be re-written as:
        
        ```javascript
          source.filter_pick( parent, 'issues', { project_id: 'id' } )
        ```
      
      @parameters:
        - parent (Pipelet): dataflow of values used to select source values
        
        - _static: for pick() pipelet:
          - (String): a flow attribute for source lookup
          - (Object): a list of attributes with static values for source lookup
        
        - attributes: for pick() pipelet:
          - (Array): attribute definitions, each attribute is:
            - (String): the attribute name
            
            - (Array of Strings): first string is source attribute name,
              second string is parent attribute name.
          
          - (Object): which attribute names are source attribute names
            and attribute values are parent attribute names.
        
        - options (optional Object): options for filter() pipelet
  */
  rs.Compose( 'filter_pick', function( source, parent, _static, attributes, options ) {
    attributes = pick_attributes_to_array( attributes );
    
    return source
      .filter(
        
        parent
          .pick( attributes, { _static: _static, name: 'filter_pick#pick-' + options.name } )
        ,
        
        extend( { filter_keys: attributes.map( first ) }, options )
      )
    ;
    
    function first( a ) { return a[ 0 ] }
  } ); //filter_pick()
  
  /* -------------------------------------------------------------------------------------------
      module exports
  */
  RS.add_exports( {
    'Map'                 : Map,
    'Flat_Map'            : Flat_Map,
    'Attribute_To_Value'  : Attribute_To_Value,
    'Attribute_To_Values' : Attribute_To_Values,
    'Value_To_Attribute'  : Value_To_Attribute,
    'Values_To_Attribute' : Values_To_Attribute,
    'Content_Transform'   : Content_Transform,
    'Content_Sort'        : Content_Sort,
    'Content_Order'       : Content_Order
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} );
