/*  network.js

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
            source.pipelet( node [, parameter_1, parameter_2 ], options )
            
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
      .dispatch( nodes, node, { no_encapsulate: true } )
    ;
    
    input.gatherer._add_source( source ); // this could produce an infinite loop if this network is a node of another network
    
    // loopback on self and return
    return input._add_destination( input );
    
    function node( source, options ) {
      var node       = this
        , queries    = node.queries
        , parameters = [ node ]
      ;
      
      queries = queries ? queries.map( process_queries ) : [ source ];
      
      queries.length > 1
        && parameters.push.apply( parameters, queries.slice( 1 ) )
      ;
      
      parameters.push( options );
      
      var output = source[ node.pipelet ].apply( queries[ 0 ], parameters, options )
        , remove = output.remove
      ;
      
      remove && hijack( source._input, 'remove_source', remove_source );
      
      return output;
      
      function process_queries( query ) {
        // ToDo: if query is a dataflow, it needs to be disconnected on instance removal
        
        return query ? source.filter( typeof query == 'string' ? [ { flow: query } ] : query ) : source;
      }
      
      function remove_source( output, options ) {
        // de&&ug( 'removing data processor:', data_processor );
        
        remove.call( output, options );
        
        // delete require.cache[ path ];
      }
    } // node()
  } // Network()
  
  function hijack( that, method, f ) {
    var m =  that[ method ];
    
    that[ method ] = function() {
      var parameters = Array.prototype.slice.call( arguments, 0 );
      
      f.apply( that, parameters );
      
      m.apply( that, parameters );
    }
  }
  
  return rs;
} );
