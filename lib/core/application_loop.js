/*  application_loop.js

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
( 'application_loop', [ './pipelet' ], function( rs ) {
  "use strict";
  
  var RS       = rs.RS
    , is_array = RS.is_array
  ;
  
  return rs // only compose definition bellow
  
  /* ----------------------------------------------------------------------------------------------
      @pipelet application_loop( input, components, options )
      
      @short Processes an application from a dataflow of components and input dataflows.
      
      @description:
        Each component is defined by the name of pipelet to invoke.
        
        This pipelet is invoked with a number of parameters that depend on the
        size of the "queries" Array attribute.
        
        The patern of invocation for each component pipelet is:
        
        ```javascript
        input
          .filter( fist_query )
          
          [ pipelet ](
             component,
             input.filter( second_query ),
             ...
             input.filter( last_quert )
          )
          
          .set_flow( component.flow )
        ;
        ```
        
        The set_flow() pipelet may be replaced by a delivers() or nothing if
        the component emits nothing and as specified by component attributes
        "flow" and "delivers".
      
      @parameters:
        - components: a dataflow of components for the current page, attributes are:
          - pipelet (String): the name of the pipelet for this component.
              It will be invoked with:
                - source: input filtered by the first query
                - first parameter (Object): the current component object
                - next parameters: input filtered by second to last queries
                - no options for now, will be added in future version
          
          - queries (Array of Array of Objects): Each Array of Objects specifies a
            query for each pipelet parameter, and where the first query is for
            pipelet's source. Each object specifies an OR term for the query. Each
            OR term has attributes which correspond to the following specification:
            - attribute name starts with non-"_" character:
              - if attribute value starts with ".url.", the value is taken from
                currently parsed url, and the picked attribute name follows "url."
                - e.g. { id : '.url.project_id' }
              
              - otherwise value is that of the attribute value - e.g.
                { flow: 'projects' }
            
            - attribute name starts with "_", e.g. "_url", pick attributes(s) from
              component depending on attribute value type:
              - String: to specify a single attribute from url - e.g.
                 { _url: 'project_id' } for { project_id: component.url.project_id }
              
              - Array of Strings: specify a number of attributes from url - e.g.
                 { _url: [ 'project_id', 'issue_id' ] } for:
                 { project_id: component.url.project_id, issue_id: component.url.issue_id }
              
              - Object: attribute names are target attribute names, while
                attribute values are attribute names picked from url - e.g.
                { _url: { id: 'project_id' } } for: { id : component.url.project_id }
          
          - flow (String): name of output flow or null if this component emits
            nothing.
            
            It will be used by pipelet set_flow(), unless null.
            
            This option should not be used in addition to "delivers" option,
            only use "flow" or "deliver" but not both.
          
          - delivers (Array of Strings): if this pipelet delivers more than one
            output flow, these are the name of all delivered flows. These will
            be used by pipelet deliver().
  */
  .Compose( 'application_loop', { union: true }, function( input, components, options ) {
    var output = input.dispatch( components, start_component, { name: 'application_loop' } );
    
    // loopback
    output
      // .trace( 'application_loop out' )
      .through( input )
    ;
    
    return output;
    
    function start_component( source, options ) {
      // source = source.trace( 'start_component-' + this.id, { all : true } )
      
      var component     = this
        , queries    = component.queries
        , parameters = [ component ] // ToDo: consider moving component to last parameter, and adding options parameter
        , flow       = component.flow
        , delivers   = component.delivers
      ;
      
      queries = queries ? queries.map( process_queries ) : [ source.namespace() ];
      
      queries.length > 1
        && parameters.push.apply( parameters, queries.slice( 1 ) )
      ;
      
      source = source[ component.pipelet ].apply( queries[ 0 ], parameters );
      
      return flow       ? source.set_flow( flow )
        : delivers      ? source.delivers( delivers )
        : flow === null ? flow
        : source
      ;
      
      function process_queries( query ) {
        if ( typeof query == 'string' )
          query = [ { flow: query } ]
        ;
        
        return query ? source.filter( query.map( compile_term ), { key: query.key || [ 'id' ] } ) : source;
        
        function compile_term( term ) {
          var out  = {}
            , p
            , v
            , a
          ;
          
          for ( p in term ) {
            v = term[ p ];
            
            if ( p.charAt( 0 ) != '_' ) {
              if ( v.charAt( 0 ) == '.' ) {
                a = component;
                
                v
                  .split( '.' )
                  
                  .forEach( function( name ) { if ( name ) a = a[ name ] } )
                ;
                
                v = a;
              }
              
              out[ p ] = v
            } else {
              // This is a reference in the component object
              p = p.slice( 1 ); // remove leading '_'
              
              p = p ? component[ p ] : component; // use component itself is the reference was just '_'
              
              if ( typeof v == 'string' ) {
                // Pick a single attribute from component property
                out[ v ] = p[ v ]
              
              } else if ( is_array( v ) ) {
                // Array of attributes to pick from component property
                v.forEach( function( term ) { if( p[ term ] ) out[ term ] = p[ term ] } )
              
              } else {
                // Object which attributes are picked from component property by attributes' values
                Object.keys( v ).forEach( function( k ) { out[ k ] = p[ v[ k ] ] } )
              }
            }
          }
          
          return out;
        } // compile_term()
      } // process_queries()
    } // start_component()
  } ) // application_loop()
} );
