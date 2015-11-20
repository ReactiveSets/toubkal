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
    , extend_2     = RS.extend._2
    , log          = RS.log
    , Pipelet      = RS.Pipelet
    , value_equals = RS.value_equals
    , de           = false
    , ug           = de && log.bind( null, 'operations' )
  ;
  
  /* -------------------------------------------------------------------------------------------
      fetch_flow_key( flows, options )
      
      For each value of a multi-flows dataflow, fetch dataflow key from flows metadata. This
      may be used by a downstream pipelet to perform multi-flow operations based on a required
      key.
      
      Keys are provided in output operations options under the _keys attribute, an Array of
      keys in the same order as output values. If the flow attribute is not present in a value
      or not found in flows, corresponding key is set to null.
      
      This is a transactional, stateless, lazy pipelet. It may be synchronous or assynchronous
      depending of implementation. It is transactional because the output will not be updated
      if flows keys change.
      
      Parameters:
      - flows (Pipelet): dataflows' metadata with the following attributes:
        - id (String): dataflow name
        - key (optional Array of Strings): key attributes for this dataflow, default is
          [ 'id' ]
      - options (optional Object): options for Pipelet
  */
  function Fetch_Flow_Key( flows, options ) {
    Pipelet.call( this, options );
    
    this._flows = flows._output;
  } // Fetch_Flow_Key()
  
  Pipelet.Build( 'fetch_flow_key', Fetch_Flow_Key, {
    _fetch_keys: function( values, options, done ) {
      var flows     = this._flows
        , l         = values.length
        , processed = 0
        , keys      = []
      ;
      
      if ( l ) {
        values.forEach( fetch_value_flow );
      } else {
        emit();
      }
      
      return this;
      
      function fetch_value_flow( value ) {
        fetch_flow( value.flow, flows, fetched );
        
        function fetched( key ) {
          keys.push( key );
          
          ++processed == l && emit();
        } // fetched()
      } // fetch_value_flow()
      
      function fetch_flow( flow, flows, done ) {
        if ( typeof flow == 'string' && flow ) {
          flows.fetch_all( fetched_flow, [ { id: flow } ] );
        } else {
          // flow must be a non-empty string
          error( 'UNDEFINED_FLOW' );
        }
        
        function fetched_flow( flows ) {
          if ( flows.length ) {
            done( flows[ 0 ].key || [ 'id' ] );
          } else {
            // no flow by this name in flows
            error( 'FLOW_NOT_FOUND' );
          }
        } // fetched_flow()
        
        function error( code ) {
          // ToDo: send error into global error dataflow
          done( null );
        } // error()
      } // fetch_flow()
      
      function emit() {
        // make a shallow copy of options before forcing _keys metadata
        options = extend_2( {}, options );
        
        options._keys = keys;
        
        done( options );
      } // emit()
    }, // _fetch_keys()
    
    _add: function( values, options ) {
      var that = this;
      
      this._fetch_keys( values, options, fetched );
      
      function fetched( options ) {
        that.__emit_add( values, options );
      } // emit()
    }, // _add()
    
    _remove: function( values, options ) {
      var that = this;
      
      this._fetch_keys( values, options, fetched );
      
      function fetched( options ) {
        that.__emit_remove( values, options );
      } // emit()
    }, // _remove()
    
    _update: function( updates, options ) {
      var that   = this
        , values = updates.map( get_remove )
      ;
      
      this._fetch_keys( values, options, fetched );
      
      function fetched( options ) {
        that.__emit_update( updates, options );
      } // emit()
    }, // _update()
  } ); // fetch_flow_key()
  
  /* -------------------------------------------------------------------------------------------
      not_exists( source, options )
      
      Forwards:
      - "add"    operations: values not found in source (hence this pipelet's name)
      - "remove" operations: values found in source
      - "update" operations: values found in source AND which remove and add parts share the
        same key
      
      For each input value, a query is built to fetch from source the flow for the input
      value. The query is built from either this pipelet's key or the _keys option as
      fetched using fetch_flow_key() for multi-flows.
      
      This pipelet can be used as a validation step prior to datbase updates, preventing to
      send bad updates to a database master. Fething should typically be directed towards a
      slave server which may help mitigate against DoS attacks.
      
      This is a transactional, stateless, lazy pipelet. It is synchronous if all flows of an
      operation can be fethed synchronously, it is assynchronous otherwise.
      
      Parameters:
      - source (Pipelet): to fetch values and schemas from
      - options (optional Object): options for Pipelet
  */
  function Not_Exists( source, options ) {
    Pipelet.call( this, options );
    
    this._source_output = source._output;
  } // Not_Exists()
  
  Pipelet.Build( 'not_exists', Not_Exists, {
    _fetch_values: function( values, done ) {
      var source    = this._source_output
        , keys      = options._keys
        , key       = this._key
        , l         = values.length
        , processed = 0
        , out       = []
      ;
      
      if ( l ) {
        values.forEach( fetch_value );
      } else {
        done( out );
      }
      
      return this;
      
      function fetch_value( value, i ) {
        fetch_by_key( value, source, keys ? keys[ i ] : key, fetched );
        
        function fetched( error, value ) {
          if ( error ) {
            // ToDo: send error to global error dataflow
            out.push( null );
          } else {
            out.push( value );
          }
          
          ++processed == l && done( out );
        } // fetched()
      } // not_exists()
      
      return this;
      
      function fetch_by_key( value, source, key, done ) {
        var flow = value.flow;
        
        if ( key ) {
          var query = { flow: flow }
            , l     = key.length
            , i     = -1
            , v
          ;
          
          while ( ++i < key.length ) {
            v = value[ a ];
            
            if ( v == null ) return done( 'UNDEFINED_KEY_ATTRIBUTE' ); // null or undefined, not allowed in key
            
            query[ a ] = v;
          }
          
          source.fetch_all( fetched, [ query ] );
        } else {
          // flow must be a non-empty string
          done( 'NO_KEY' );
        }
        
        function fetched( values ) {
          if ( values.length ) { // should be 0 or 1
            done( null, [ value, values[ 0 ], key ] );
          } else {
            // not found with key
            done();
          }
        } // fetched()
      } // fetch_by_key()
    }, // _fetch_values()
    
    _add: function( values, options ) {
      var that = this;
      
      return this._fetch_values( values, not_exists );
      
      function not_exists( values ) {
        var out = []
          , l = values.length
          , i = -1
          , value
        ;
        
        while ( ++i < l ) {
          if ( value = values[ i ] ) {
            values[ 1 ] || out.push( value[ 0 ] ); // not found
          }
        }
        
        that.__emit_add( out, options );
      } // not_exists()
    }, // _add()
    
    _remove: function( values, options ) {
      var that = this;
      
      return this._fetch_values( values, exists );
      
      function exists( values ) {
        var out = []
          , l   = values.length
          , i   = -1
          , value
        ;
        
        while ( ++i < l ) {
          if ( value = values[ i ] ) {
            values[ 1 ] && out.push( value[ 0 ] ); // found
          }
        }
        
        that.__emit_add( out, options );
      } // exists()
    }, // _remove()
    
    _update: function( updates, options ) {
      var that   = this
        , values = updates.map( get_remove )
      ;
      
      return this._fetch_values( values, exists );
      
      function get_remove( update ) {
        return update[ 0 ];
      } // get_removed()
      
      function exists( values ) {
        var out = []
          , l   = values.length
          , i   = -1
          , update
          , value
          , v
        ;
        
        while ( ++i < l ) {
          value  = values [ i ];
          update = updates[ i ];
          
          if ( value // no error
            && ( v = value[ 1 ] ) // found
            && value_equals( v, value[ 0 ] )
            && key_equals( v, update[ 1 ], value[ 2 ] )
          ) {
            out.push( update );
          }
        }
        
        that.__emit_updates( out, options );
        
        function key_equals( remove, add, key ) {
          for ( var i = -1, l = key.length; ++i < l; ) {
            var a = key[ i ];
            
            if ( remove[ a ] !== add[ a ] ) return false;
          }
          
          return true;
        } // key_equals()
      } // exists()
    } // _update()
  } ); // not_exists()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Fetch_Flow_Key': Fetch_Flow_Key,
    'Not_Exists'    : Not_Exists
  } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // transactional.js
