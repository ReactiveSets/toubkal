/*  transforms.js

    Copyright (c) 2013-2017, Reactive Sets

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

  var RS               = rs.RS
    , log              = RS.log.bind( null, 'transforms' )
    , de               = false
    , ug               = log
    , get_name         = RS.get_name
    , extend           = RS.extend
    , extend_2         = extend._2
    , identity         = RS.identity
    , Code             = RS.Code
    , safe_value       = Code.safe_value
    , safe_string      = Code.safe_string
    , safe_attribute   = Code.safe_attribute
    , safe_dereference = Code.safe_dereference
    , Query            = RS.Query
    , Pipelet          = RS.Pipelet
    , Set              = RS.Set
    , Group            = RS.Group
    , value_equals     = RS.value_equals
    , is_array         = RS.is_array
    , Options          = RS.Transactions.Options
    
    , picker           = RS.picker
    , inverse_picker   = picker.inverse
    , filter_pick_keys = picker.filter_pick_keys
    
    , Input            = Pipelet.Input
    , Output           = Pipelet.Output
    , has_more         = Options.has_more
    , push             = [].push
  ;
  
  function is_object( v ) {
    return v && typeof v == 'object'
  }
  
  function is_string( v ) {
    return typeof v == 'string'
  }
  
  /* --------------------------------------------------------------------------
      @pipelet alter( transform, options )
      
      @short Call transform() on each added, removed, and fetched @@(value).
      
      @parameters
      - transform (Function or Object):
        - (Function): transform( value ) -> undefined:
          - value (Object): to shallow-mutate, alter() shallow copies values
            before calling transform().
          
          transform() MUST mutate its value parameter which is shallow-cloned
          prior to calling transform() but SHOULD NOT mutate Object and Array
          attributes.
          
          Any returned value by transform() is ignored.
          
          ```javascript
            rs
              .alter( function( _ ) {
                // Note: using _ for the value parameter name is often convenient
                // but in some cases it is better to use a more explicit name
                // such as student that could be appropriate in this example
                
                // It's not ok to push a value into the grades Array
                // because shallow-clone does not clone the Array content
                // _.grades.push( 5 ); // mutates grades Array content
                
                // First, make a shallow copy of the grades Array
                _.grades = _.grades.slice();
                
                // Now it's ok to push a new grade into the grades Array
                _.grades.push( 5 );
                
                // Mutate count, its ok because _ is shallow-cloned
                _.count = _.grades.length;
                
                // There is no need to return _, it would be ignored
                // return _;
              } );
            ;
          ```
          
        - (Object): set static properties into all values. This is deprecated,
          use pipelet pick() instead.
      
      - options (Object): pipelet options plus:
        - query_transform (Function): A transform to alter queries for both fetch() and
          upstream query updates.
          
          If provided, alter becomes lazy and only fetches the minimum set of values
          from upstream; query_transform( term ) is called for each added and removed
          terms on query updates or each term of a fetch query.
          
          It must not mutate its term parameter and must return a new term or falsy to
          indicate that this term can never match any output. After query_transform is
          applied on all terms, if the resulting query becomes empty, no action is
          performed, a fetch() would then return immediatly with no values or the upstream
          query would not be updated.
          
          For more information on query terms, check the documentation for Queries.
      
      @examples:
      
      - Alter a source dataflow of stocks to produce a dataflow of P/E ratios from price
        and earnings attributes. Optionally provide query_transform for lazy behavior:
        
        ```javascript
          stocks
            .alter( function( stock ) {
              // Alter shallow-cloned stock value, do not return a value
              stock.pe_ratio = stock.price / stock.earnings
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
        ```
      
      - Add a 'stock_prices' flow attribute using an Object transform:
      
        ```javascript
        prices.alter( { flow: 'stock_prices' }, { query_transform: query_transform } );
        
        // Note: query_transform() is only necessary if one wants a lazy behavior
        function query_transform( term ) {
          switch( term.flow ) {
            case 'stock_prices':
              // make a shallow clone before deleting flow attribute
              term = extend( {}, term );
              
              delete term.flow;
            // fall-through
            case undefined:
            return term;
          }
          // returns undefined (no match for this term) if term specifies a flow
          // attribute different than 'stock_prices'
        } // query_transform()
        ```
      
      @description:
      See also @@pipelet:map() which does not shallow copy values before
      calling transform(), and using value returned by transform().
      
      This is a @@stateless, @@synchronous pipelet. It is @@lazy if option "query_transform" is
      a Function, @@greedy otherwise. When greedy, alter() will:
      - fetch all values from upstream regardless of downstream queries
      - ignore downstream query updates
  */
  
  // ToDo: alter(), provide default query_transform when transform is an object or deprecate object transform
  // ToDo: alter(), add full test suite
  function Alter( transform, options ) {
    var that            = this
      , no_clone        = that._no_clone = that._no_clone || false // set to true by Map()
      , name            = options.name
      , query_transform = options.query_transform
      , ___
    ;
    
    that._input  = that._input  || new Alter_Input ( that, name, query_transform, options );
    that._output = that._output || new Alter_Output( that, options, query_transform );
    
    //de&&ug( 'Alter(), options:', options );
    
    Pipelet.call( that, options );
    
    var safe_vars  = [ 'i=-1', 'l=X.length', 'Y=[]', 'y' ] // parameters for unrolled while loop, safe
    
      , while_body = 'x=X[++i],Y.push(y={});for(p in x)y[p]=x[p];' // used if ! no_clone, safe
    ;
    
    no_clone || safe_vars.push( 'x', 'p' ); // safe
    
    switch( typeof transform ) {
      case 'object': // ToDo: add test for object transform or remove feature
        // add transform's properties
        if ( transform )
          for ( var p in transform )
            while_body += "y" + safe_dereference( p ) + " = " + safe_value( transform[ p ] ) + ";";
      
      break;
      
      case 'function':
        var l = transform.length; // the number of requested parameters by transform()
        
        if ( l != 1 ) error( 'transform() must accept exaclty one parameter' );
        
        safe_vars.push( 't=transform' ); // safe
        
        // Build transform parameter list according to the number of parameters requested by transform
        var safe_t = 't( ' + ( no_clone ? 'X[ ++i ]' : 'y' ) + ' )'; // safe
        
        if ( no_clone )
          while_body = 'if ( y = ' + safe_t + ' ) Y.push( y );';
        
        else
          while_body += safe_t + ';';
        
      break;
      
      default:
        error( 'transform must be an Object or a function' );
    } // end switch typeof transform
    
    // Generate code for that.__transform()
    var code = new Code()
      ._function( 'that.__transform', ___, [ 'X' ] )
        ._var( safe_vars )
        
        .unrolled_while( while_body ) // safe
        
        .add( 'return Y' )
      .end( 'Alter..__transform()' )
      
      //.trace()
    ;
    
    eval( code.get() );
    
    that._input._transform = that.__transform.bind( that );
    
    function error( message ) {
      throw new Error( get_name( that ) + ', error: ' + message );
    } // error
  } // Alter()
  
  function Alter_Input( p, name, query_transform, options, input_transactions ) {
    var that = this;
    
    // ToDo: inputs, provide query_transform, tag and maybe input_transactions as options
    Input.call( that, p, name, options, input_transactions );
    
    if ( ! query_transform ) {
      // Input is greedy, but, unlike greedy(), does not require to fetch
      // immediately, it requires a downstream pipelet for the first fetch.
      
      // Query everything from upstream
      that.future_query = that.query = Query.pass_all;
      
      // Do not forward upstream queries upstream
      that.update_upstream_query = function() {};
    }
  } // Alter_Input()
  
  Alter.Input = Input.subclass( 'Alter.Input', Alter_Input );
  
  function Alter_Output( p, options, query_transform ) {
    var that = this;
    
    Output.call( that, p, options );
    
    that._query_transform = query_transform;
    
    if ( ! query_transform ) {
      // alter() is greedy, need to filter fetched results or update query, transformed by Alter.Input
      
      that.fetch_unfiltered = function( receiver ) {
        that.source._fetch( receiver, null, null, that );
      };
    }
  } // Alter_Output()
  
  Alter.Output = Output.subclass( 'Alter.Output', Alter_Output );
  
  Pipelet.Build( 'alter', Alter, {
    _update: function( _updates, options ) {
      // Don't split updates unless transform() does not return exactly one value
      
      var that    = this
        , t       = that.__transform
        , adds    = []
        , removes = []
        , updates = []
      ;
      
      _updates.forEach( function( update ) {
        var removed = t( [ update[ 0 ] ], "remove", options )
          , added   = t( [ update[ 1 ] ], "add"   , options )
          , rl      = removed.length
          , al      = added.length
        ;
        
        if ( rl == 1 && al == 1 ) {
          updates.push( [ removed[ 0 ], added[ 0 ] ] );
        } else {
          rl && push.apply( removes, removed );
          al && push.apply( adds   , added   );
        }
      } );
      
      that.__emit_operations( adds, removes, updates, options );
    } // _update()
  } ); // alter()
  
  /* --------------------------------------------------------------------------
      @pipelet set_flow( flow_name, options )
      
      @short Sets the ```"flow"``` attribute of values in @@dataflow
      
      @parameters
      - flow_name (String): the name of the flow to set for objects of this
        dataflow. All values added or removed are altered to add the
        attrinute ```"flow"``` with this string.
        
        Values which already have a flow will be modified as the flow name
        always replaces any prior flow name, unless the flow name was
        ```"error"``` to allow to propagate errors downstream.
      
      - options (Object): options for pipelet alter().
      
      @examples
      - Add ```"flow"``` attribute ```"roles"``` to a dataflow:
        ```javascript
          rs
            .set( [
              { fist_name: 'Joe'    , last_name: 'Black'   },
              { fist_name: 'William', last_name: 'Parrish' },
              { fist_name: 'Susan'  , last_name: 'Parrish' }
              { flow: 'error', message: 'not found' }
            ] )
            
            .set_flow( 'roles' )
          ;
        ```
        
        Will emit this set:
        ```javascript
            [
              { fist_name: 'Joe'    , last_name: 'Black'  , flow: 'role' },
              { fist_name: 'William', last_name: 'Parrish', flow: 'role' },
              { fist_name: 'Susan'  , last_name: 'Parrish', flow: 'role' }
              { flow: 'error', message: 'not found' }
            ]
        ```
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
  */
  rs.Compose( 'set_flow', function( source, flow, options ) {
    options = extend( { query_transform: set_flow_query_transform }, options, { name: 'set_flow-' + flow } );
    
    de&&ug( 'set_flow(), flow: ' + flow + ', options:', options );
    
    return source.alter( set_flow_transform, options );
    
    function set_flow_transform( value ) {
      // ToDo: handling error flow will be deprecated when global error dataflow is adopted
      if( value.flow != 'error' ) value.flow = flow;
    }
    
    function set_flow_query_transform( term ) {
      switch( term.flow ) {
        case flow:
          term = extend_2( {}, term );
          
          delete term.flow;
        // fall-through
        
        case undefined:
        case 'error':
        return term;
      }
      // ignore this term, it will never match an output from this pipelet
      
    } // set_flow_query_transform()
  } ); // set_flow()
  
  /* --------------------------------------------------------------------------
      @pipelet delivers( query, options )
      
      @short Specifies which upstream dataflows can be subscribed-to
      
      @parameters:
      - query:
        - (String): only flow attribute value delivered upstream
        - (Array of Strings): where each string specifies a flow
          attribute value delivered upstream.
      
      - options (Object): pipelet options.
      
      @description:
      This is a @@synchronous, @@stateless, @@lazy pipelet.
      
      This is an optimization pipelet that is mostly semantically neutral
      and may improve performances significantly, especially between clients
      and servers but also in internal application loops.
      
      It is only neutral for non-@@greedy @@downstream pipelets that
      specify a ```flow``` attribute value.
      
      It prevents upstream queries and fetch from downstream pipelets to
      proceeed upstream when they do not match query.
      
      Doing so also provides more freedom into the architecture of complex
      applications, that can then be built around a main application loop,
      e.g.:
      
      ```javasacript
        rs
          .socket_io_server()
          
          .delivers( [ 'users', 'profiles', 'projects', 'imagaes' ] )
          
          .application_loop( rs.components() )
          
          .socket_io_server()
        ;
      ```
      
      In the above example, application_loop() components subscribe to both
      other internal components dataflows as well as server dataflows.
      Without the use of delivers(), all internal dataflows would be
      automatically subscribed from the server which does not delivers them.
      This would yield unnecessary delays, bandwidth consumption, and server
      resources usage.
      
      ### See Also
      
      - Pipelet flow()
      - Pipelet set_flow()
      - Pipelet alter()
      - Pipelet application_loop()
      - Pipelet socket_io_server()
      - Pipelet database_cache()
      
      ### Wish list
      - ToDo: delivers(): make it a Controllet
      - ToDo: Pipelet: implement option query_transform to avoid hacking into pipelet
  */
  rs.Compose( 'delivers', function( source, flows, options ) {
    if ( is_string( flows ) ) flows = [ flows ];
    
    options = extend( {}, options, { name: options.name + ': ' + flows.join( ', ' ) } );
    
    // de&&ug( 'delivers(), options:', options );
    
    var delivers = source.pass_through( options );
    
    delivers._output._query_transform = query_transform;
    
    return delivers;
    
    function query_transform( term ) {
      if ( flows.indexOf( term.flow ) != -1 ) return term
    } // query_transform()
  } ); // delivers()
  
  /* --------------------------------------------------------------------------
      @pipelet map( f, options )
      
      @short Maps input values through f() to optional output values
      
      @parameters:
      - f( Object ) -> Object: f() must not mutate its Object parameter, and
        should return:
        - non-null Object: value emitted to output
        - falsy: no value emitted to output, acting as a filter
      
      - options (Object): optional attributes for alter():
        - key (Array of Strings): output values key, defaults to source key
        - query_transform( Object ) -> Object: A transform to alter queries
          for both fetch() and upstream query updates. See pipelet alter()
          for details.
      
      @examples
      - Alter a source dataflow of stocks to produce a dataflow of P/E
        ratios from price and earnings attributes. Optionally provide
        query_transform for lazy behavior:
        
        ```javascript
          stocks
            .map( function( stock ) {
              // Do not alter stock, return a new Object value
              return {
                ticker: stock.ticker,
                pe_ratio: stock.price / stock.earnings
              };
            }, { query_transform: query_transform } )
          ;
          
          function query_transform( term ) {
            if( term.pe_ratio ) {
              // make a shallow copy, before remove pe_ratio attribute
              term = RS.extend( {}, term );
              
              delete term.pe_ratio; // term is greedier, possibly greedy
            }
            
            return term;
          } // query_transform()
        ```
      
      @description
      This is @@stateless, @@synchronous pipelet. It is @@lazy if
      query_transform() option is defined, @@greedy otherwise.
  */
  function Map( f, options ) {
    this._no_clone = true;
    
    Alter.call( this, f, options );
  } // Map()
  
  Alter.Build( 'map', Map );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet flat_map( f, options )
      
      @short Maps input values to f() which returns an Array of output values.
      
      @description:
      
      This is @@stateless, @@synchronous pipelet. It is @@lazy if query_transform() option
      is defined.
     
      @parameters:
      - f( value ) -> Array of values
      
      - options (Object):
        - key (Array of Strings): index key for destination set, default is upstream key
        - query_transform( Object ) -> Object: see alter() for details
      
      @examples:
      
      - creating two objects in two different dataflows on a source trigger:
      
        ```javascript
        var uuid_v4 = rs.RS.uuid.v4;
        
        source
          .flat_map( function( project ) {
            var project_id = uuid_v4();
            
            return [
              { flow: 'projects', id: project_id },
              { flow: 'projects_descriptions'   , project_id: project_id   , name: project.name }
            ]
          }, { key: [ 'id' ] } )
        ;
        ```
  */
  function Flat_Map( f, options ) {
    // Use Alter inputs and outputs with no query transform to be greedy
    var that            = this
      , name            = options.name
      , query_transform = options.query_transform
    ;
    
    that._input  = that._input  || new Alter_Input ( that, name, query_transform, options );
    that._output = that._output || new Alter_Output( that, options, query_transform );
    
    if( f.length == 2 ) {
      var output = that._output;
      
      that.__emit = emit;
    } else {
      that._input._transform = that.__transform = transform;
    }
    
    Pipelet.call( that, options );
    
    function transform( values ) {
      var i   = -1
        , l   = values.length
        , out = []
      ;
      
      while( ++i < l )
        push.apply( out, f( values[ i ] ) )
      ;
      
      return out;
    } // transform()
    
    function emit( event, values, options ) {
      asynchrounous_transform( values, function( out ) {
        output.emit( event, out, options )
      } )
    } // emit()
    
    function asynchrounous_transform( values, done ) {
      var i    = -1
        , l    = values.length
        , v
        , out  = []
      ;
      
      while( v = values[ ++i ] ) f( v, done );
      
      function done( values ) {
        values && push.apply( out, values );
        
        --l || done( out );
      }
    } // event()
  } // Flat_Map()
  
  Pipelet.Build( 'flat_map', Flat_Map );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet auto_increment( options )
      
      @short Auto-increment an attribute
      
      @parameters:
      - options:
        - attribute (String): the name of the attribute to auto-incremente. Default is "id".
        
        - start (Integer): used to initialize the auto-increment value. Default is zero
          which will start at 1 because the last auto-increment value is pre-incremented
          before emission.
      
      @description:
      
      Important requirement: The upstream source must provide a unique @@key which is
      used to store an association of identities to assigned auto-incremented values.
      
      This allows to emit corect auto-incremented values on @@remove and @@update
      operations.
      
      Therefore, @@values having the same @@identity, which are @@duplicate values, will
      be assigned the same auto-incremented value.
      
      If a source value has its auto-incement attribute set to a finite number it is not
      modified and if it is superior to the last auto-increment value it used as the last.
      
      If a source value has its auto-incement attribute set to a non-number or infinite
      number, it will be orverridden by an auto-incremented value.
      
      This is a @@stateless, @@synchronous, @@greedy pipelet.
      
      It is stateless from a pipelet standpoint as @@downstream @@fetch are forwarded
      @@upstream, but previous identities association with auto-incremented values are
      maintained as an internal state.
      
      Therefore the amount of memory used by this pipelet is proportional to the number
      of all values in the set over time. This state is preserved, i.e. not cleared, on
      remove operations.
   */
  rs.Compose( 'auto_increment', function( source, options ) {
    de&&ug( 'auto_increment(), options:', options );
    
    var attribute = options.attribute || 'id'
      , last      = options.start     || 0
      , keys      = {}
      , that
    ;
    
    de&&ug( 'auto_increment(), attribute: ' + attribute + ', start: ' + last );
    
    return that = source.map( function( v ) {
      var out = {}
        , ai  = v[ attribute ]
        , p   = that._input.source.pipelet
        , key = p._identity( v )
      ;
      
      // for traces, force attribute as first attribute in output value
      out[ attribute ] = 0;
      
      if ( typeof ai == 'number' && isFinite( ai ) ) {
        if ( ai > last ) last = ai;
      } else if ( ! ( ai = keys[ key ] ) ) {
        ai = ++last;
      }
      
      // Force attribute new value even if present, as it could be non-number, infinite, or NaN
      extend_2( out, v )[ attribute ] = keys[ key ] = ai;
      
      //de&&ug( 'auto_increment(), ', get_name( source ), 'source._key:', p._key, 'key:', key, 'auto:', out[ attribute ] );
      
      return out;
    }, extend( {}, options, { name: options.name + '_map' } ) );
  } ); // auto_increment()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet attribute_to_value( [ options ] )
      
      @short Replace input values with the value of a content attribute
      
      @description:
      This is a @@synchronous, @@stateless, @@greedy pipelet.
      
      @parameters:
      - options (Object):
        - content        (String): content attribute name, default is "content"
        - key  (Array of Strings): key attribute names of output set
      
      @examples:
      ```javascript
        rs.set( [ { value: { name: 'Paris' } ] )
          .attribute_to_value( { content: 'value', key: [ 'name' ] } )
        ;
       
        // --> [ { name: 'Paris' } ]
      ```
      @todos:
      ToDo: attribute_to_value(), more tests
      ToDo: attribute_to_value(), make it lazy, using query_transform and complex expressions
  */
  function Attribute_To_Value( options ) {
    Map.call( this
      , new Function( [ 'v' ], "return v" + safe_dereference( options.content || 'content' ) ) // safe
      , options
    );
  } // Attribute_To_Value()
  
  Map.Build( 'attribute_to_value', Attribute_To_Value );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet value_to_attribute( [ options ] )
      
      @short Embed input values into a content attribute, preserving key attributes, optionally
      adding default attributes
      
      @parameters
      - **options** (Object):
        - **key** (Array of Strings): key attribute names, defaults to [ 'id' ]
        - **defaults**      (Object): static attributes to add to all destination values
        - **content**       (String): content attribute name, default is "content"
      
      @examples
      ```javascript
        rs.set( [ { id: 1, name: 'first' }, { id: 2, name: 'second' } ] )
          .value_to_attribute()
        ;
        
        /*
        ->
          [
            { id: 1, content: { id: 1, name: 'first'  } },
            { id: 2, content: { id: 2, name: 'second' } }
          ]
        *\/
      ```
      
      @description
      This is a @@synchronous, @@stateless, @@greedy pipelet.
      
      @todos:
      ToDo: value_to_attribute(), more tests
  */
  // ToDo add tests against injection attacks
  function Value_To_Attribute( options ) {
    var content   = safe_attribute( options.content || 'content' )
      , defaults  = options.defaults
      , comma     = ', '
      , key       = options.key || options.source_key
      , key_code  = key.map( safe_key_attribute ).join( comma ) // safe
      , safe_code = 'return { ' + key_code + comma + content + ': v' // safe
    ;
    
    safe_code += is_object( defaults ) && Object.keys( defaults ).length
      ? comma + JSON.stringify( defaults ).slice( 1 ) // safe
      : ' }'
    ;
    
    de&&ug( 'value_to_attribute(), code:', safe_code );
    
    Map.call( this
      , new Function( [ 'v' ], safe_code ) // safe
      , options
    );
    
    function safe_key_attribute( value ) {
      return safe_attribute( value ) + ': v' + safe_dereference( value )
    } // safe_key_attribute()
  } // Value_To_Attribute()
  
  Map.Build( 'value_to_attribute', Value_To_Attribute );
  
  /* -------------------------------------------------------------------------------------------
      @pipelet attribute_to_values( options )
      
      @short Replace input values with the values of content attribute
      
      @description:
      This is @@stateless, @@synchronous, @@greedy pipelet.
      
      @parameters:
      - options (Object):
        - key  (Array of Strings): index key for destination set, default is upstream key
        
        - content (String): name of attribute which contains values, default is 'content'
      
      @examples:
      ```javascript
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
        
        /*
          -->
          
          [
            { city: 'Paris'     }
            { city: 'Marseille' }
            { city: 'Lille'     }
            { city: 'Caen'      }
          ]
        *\/
      ```
  */
  Flat_Map.Build( 'attribute_to_values', Attribute_To_Values );
  
  function Attribute_To_Values( options ) {
    var content = options.content || 'content';
    
    Flat_Map.call( this, map_content, options );
    
    function map_content( value ) {
      return value[ content ]
    } // map_content()
  } // Attribute_To_Values()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet values_to_attribute( options )
      
      @short Embed all input values under a content attribute of a single output value
      
      @description:
      The output single value has the "id" attribute set to 1.
      
      This is a @@stateful, @@synchronous, @@greedy pipelet.
      
      @parameters:
      - options (Object):
        - content (String): name of attribute which contains values, default is "content"
      
      @examples:
      ```
        rs.set( [
            { city: 'Paris'     }
            { city: 'Marseille' }
            { city: 'Lille'     }
            { city: 'Caen'      }
          ], { key: [ 'city' ] } )
          
          .values_to_attribute()
        ;
        
        /*
          -->
          
          {
            id: 1,
            
            content: [
              { city: 'Paris'     }
              { city: 'Marseille' }
              { city: 'Lille'     }
              { city: 'Caen'      }
            ]
          }
        *\/
      ```
       
  */
  Group.Build( 'values_to_attribute', Values_To_Attribute );
  
  function Values_To_Attribute( options ) {
    Group.call( this, id_1, extend( {}, options, { key: [ 'id' ] } ) );
    
    function id_1( value ) {
      return { id: 1 }
    }
  } // Values_To_Attribute()
  
  /* -------------------------------------------------------------------------------------------
      @pipelet content_transform( transform, options )
      
      @short Modifies content attribute using transform()
      
      @description:
      This is a @@stateless, @@synchronous, @@lazy pipelet. If content attribute is defined in
      queries, option content_query_transform() must be provided.
      
      @parameters:
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
  
  /* --------------------------------------------------------------------------
      @pipelet pick( expression, options )
      
      @short Forwards only specified attributes.
      
      @parameters
      - **expression** (Object or Array): @@function:picker expression to
        pick source attributes.
      
      - **options** (Object): @@pipelet:map() options:
        - **allow_empty** (Boolean): default is false:
          - true: Allow to emit empty values ```{}```.
          - false: Emits nothing instead of empty values ```{}```.
        
        - **query_transform** (Function): controls *pick()* laziness. default
          is ```inverse_picker( expression, { allow_empty: true } )```.
      
      @description
      This is a @@stateless, @@synchronous pipelet. It is @@lazy if
      *expression* has an @@[inverse](function:inverse_picker_expression),
      @@greedy otherwise.
      
      From each source value, select attributes, then emit downstream.
      
      Undefined attributes in source values are not copied.
      
      @see_also
      - Pipelet filter_pick()
      - Function picker()
      - Function inverse_picker_expression()
      - Function inverse_picker()
  */
  rs.Compose( 'pick', function( source, expression, options ) {
    options.hasOwnProperty( 'query_transform' ) || ( options
      = extend_2( {
          query_transform: inverse_picker( expression, { allow_empty: true } )
        }, options )
    );
    
    return source.map( picker( expression, options ), options )
  } ); // pick()
  
  /* --------------------------------------------------------------------------
      @pipelet filter_pick( parent, expression, options )
      
      @short Select source dataflow from matching parent dataflow values
      
      @parameters
      - **parent** (Pipelet): dataflow of values used to select source values
      
      - **expression**: @@function:picker() expression.
      
      - **options** (optional Object): options for pipelet filter():
        - **key** (Array of Strings): @@key, default is the source
          key.
        
        - **filter_keys** (Array of Strings): filter keys for
          @@pipelet:filter(), to make filter lazy on *parent*. Default
          is ```filter_pick_keys( inverse_expression( expression ) )```.
      
      @description
      This is a @@synchronous, @@stateless, @@lazy pipelet.
      
      It performs a kind of stateless and lazy inner join between its source
      and *parent*, where its destination only receives unaltered source values.
      
      This is a composed version of the common pattern using *filter()* with
      *pick()*:
      
      ```javascript
      source
        .filter(
          parent.pick(
            { flow: "issues", project_id: ".id" }, // filter_pick expression
            { query_transform: picker( { id: ".project_id" }, { allow_empty: true } ) }
          ),
          
          { filter_keys: [ "project_id" ] }
        )
      ```
      
      With filter_pick() this can be re-written as:
      
      ```javascript
        source.filter_pick( parent, { flow: "issues", project_id: ".id" } )
      ```
      
      @see_also
      - Pipelet filter()
      - Pipelet pick()
      - Function inverse_picker_expression()
      - Function filter_pick_keys()
      - Function picker()
  */
  rs.Compose( 'filter_pick', function( source, parent, expression, options ) {
    var pick               = picker( expression )
      , inverse_expression = picker.inverse_expression( expression )
      , pick_options       = { name: options.name + '-pick' }
      , filter_keys
    ;
    
    if ( inverse_expression ) {
      // query transform for lazy map()
      pick_options.query_transform = picker( inverse_expression, { allow_empty: true } );
      
      // filter_keys for filter() lazy on map()
      filter_keys = filter_pick_keys( inverse_expression );
      
      /*
        Do not set options.key to filter_keys, although this is tempting,
        because the output of the filter should always have the same key
        as its source key.
      */
      
      options = extend( { filter_keys: filter_keys }, options )
    }
    
    return source.filter( parent.map( pick, pick_options ), options )
  } ); // filter_pick()
  
  /* -------------------------------------------------------------------------------------------
      module exports
  */
  extend_2( RS, {
    'Alter'               : Alter,
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
  
  return rs;
} );
