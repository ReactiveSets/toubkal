/*  network.js
*/
  
( this.undefine || require( 'undefine' )( module, require ) )()
( 'network', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  /* ----------------------------------------------------------------------------------------------
      @pipelet network( nodes, options )
      
      @short A dynamic network of pipelets
      
      @description:
        A network is used to build reactive databases, widgets rendering engines, business logic
        engines, or a combination of these.
        
        Each node provides a pipelet name and filters. Filters allow routing between nodes and
        provide authorizations.
        
        If the nodes dataflow comes from the network itself, the network can self-update allowing
        to create dynamic applications.
      
      @parameters:
        - nodes (dataflow): controls the creation and deletion of nodes, attributes:
          - pipelet (String): the name of the pipelet to instanciate, which signature is:
            source.pipelet( node [, parameter_1, parameter_2 ] )
            
          - queries (Array of Queries): list of queries for each input parameter for the pipelet.
            The first query is the source query for the pipelet. Queries can be:
            - (String): a dataflow name, resulting in the query [ { flow: dataflow_name } ]
            - null or undefined: the souce dataflow of the network, i.e. all outputs of all pipelets
            of the network itself plus the external source of the network.
            - (Array of Objects): a Query for the @@filter() pipelet.
  */
  rs.Compose( 'network', Network );
  
  function Network( source, nodes, options ) {
    var input = source
      .namespace()
      .dispatch( nodes, node, { no_encapsulate: true /*, input_output: true */ } )
    ;
    
    input.gatherer._add_source( source ); // this could produce an infinite loop if this network is included in another network
    
    // loopback on self and return
    return input._add_destination( input );
    
    function node( source, options ) {
      var node       = this
        , queries    = node.queries
        , instance   = node.instance
        , parameters = [ node ]
        //, input      = queries.length > 1 && source.pass_through()
        //, output
      ;
      
      queries = queries ? queries.map( process_queries ) : [ source ];
      
      queries.length > 1
        && parameters.push.apply( parameters, queries.slice( 1 ) )
      ;
      
      return source[ node.pipelet ].apply( queries[ 0 ], parameters, options );
      
      function process_queries( query ) {
        if ( typeof query == 'string' )
          query = [ { flow: query } ]
        ;
        
        return query ? source.filter( instance ? query.map( compile_term ) : query ) : source;
        
        function compile_term( term ) {
          var terms = term.query_terms
            , out   = { flow: term.flow }
          ;
          
          terms && terms.forEach( function( term ) {
            var _id = term.id;
            
            out[ term.name || _id ] = instance[ _id ];
          } ); // forEach()
          
          return out;
        }
      }
    } // node()
  }
  
  return rs;
} );
