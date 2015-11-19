/*  transactional.js
    
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
( 'transactional', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , log          = RS.log
    , Pipelet      = RS.Pipelet
    , de           = false
    , ug           = de && log.bind( null, 'operations' )
  ;
  
  /* -------------------------------------------------------------------------------------------
      not_exists( source, options )
      
      Forwards "add" operations for values not found in source.
       
      This is a transactional, stateless, asynchronous, lazy pipelet.
      
      Behavior:
      - For each input value, the "flow" attribute is used to fetch the "flows" dataflow in
        source in order to retrieve the key for this dataflow. Using the retrieved key (defaults
        to [ 'id' ]), a query is built to fetch from source the flow for the input value.
        
        If a value is found (exists) nothing is emitted.
        
        If no value is found (not exists), value is emiited.
      
      This pipelet can be used in as a validation step for added values, preventing to send
      insert queries to a database master. Fethed values would typically be directed towards a
      slave server.
      
      Parameters:
      - source (Pipelet): to fetch values and schemas from
      - options (optional Object): options for Pipelet
  */
  function Not_Exists( source, options ) {
    Pipelet.call( this, options );
    
    this._source_output = source._output;
  } // Not_Exists()
  
  Pipelet.Build( 'not_exists', Not_Exists, {
    _add: function( values, options ) {
      var that      = this
        , source    = this._source_output
        , l         = values.length
        , processed = 0
        , out       = []
        , key       = this._key
      ;
      
      if ( l ) {
        values.forEach( not_exist );
      } else {
        done();
      }
      
      return this;
      
      function not_exist( value ) {
        var flow = value.flow;
        
        source.fetch_all( fetched_flow, [ { flow: 'flows', id: flow } ] );
        
        function fetched_flow( flows ) {
          if ( flows.length ) {
            var query = { flow: value.flow }
              , key   = flows[ 0 ].key || [ 'id' ]
            ;
            
            keys.forEach( function( a ) {
              query[ a ] = value[ a ]
            } );
            
            source.fetch_all( fetched, [ query ] );
          } else {
            done();
          }
        } // fetched_flow()
        
        function fetched( _values ) {
          if ( _values.length == 0 ) out.push( value ); // value does not exist in source
          
          done();
        } // fetched()
      } // not_exist()
      
      function done() {
        if ( ++processed >= l ) that.__emit_add( out, options );
      } // done()
    }, // _add()
    
    _remove: function() { return this }
  } ); // not_exists()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Not_Exists': Not_Exists
  } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // transactional.js
