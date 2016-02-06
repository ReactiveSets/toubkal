/*  filter.js
    
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
( 'filter', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , log      = RS.log.bind( null, 'filter' )
    , Code     = RS.Code
    , Pipelet  = RS.Pipelet
    , Query    = RS.Query
    , extend_2 = RS.extend._2
    , is_array = RS.is_array
    , de       = false
    , ug       = log
  ;
  
  /* -------------------------------------------------------------------------------------------
     filter( filter [, options ] )
     
     Filter a set by a filter function or query.
     
     Parameters:
     - filter: can be a Function, an Array or a Query Pipelet:
       - (Function) signature:
           filter( value )
           
           If the filter function returns truly, value is emitted downstream.
       
       - (Array of Objects): the filter is a static query, e.g.:
           states = [
             { country: 'USA', state 'Michigan' }
             { country: 'USA', state 'Illinois' }
           ];
           
           // Filter cities from the states of Michigan and Illinois
           cities.filter( states );
       
       - (Pipelet): the filter is a query dataflow processed using filter_query(). This allows
           dynamic filters from dataflows.
           
           states = rs.set( [ { country: 'USA', state 'Michigan' } ] );
           
           // Filter cities from the state of Michigan
           cities.filter( states );
           
           // Add the state of Illinois
           states.add( [ { country: 'USA', state 'Illinois' } ] );
           
           // From now on, the above filter also provides the cities in Illinois in addition
           // to Michigan
           
           // ...
           
           states._remove( [ { country: 'USA', state 'Michigan' } ] )
           
           // Now the filter no longer provides cities from Michigan, and only cities from
           // Illinois are sent downtream
     
     - options (optional) (Object):
       - name (String): debugging instance name
       
       - tag (String): to synchronize transactions forked and reunited at this filter.
       
       - filter_keys (Array): when filter is a query, filter_keys may be used to define
         and-terms present in all filter AND-expressions. Doing so allows to lazy-fetch
         the filter query for a subset of all AND-terms, improving the memory footprint
         and execution time of query updates.
         
         A typical example is when differenciating between many flows in an authorization
         filter:
         
           source
             .filter( authorizations, { filter_keys: [ 'flow' ] } )
             ._add_destination( socket._input )
           ;
         
         Doing so, says that all authorizations AND-expression have a flow attribute. When
         the socket requests a flow 'user', all authorizations for the 'user' flow are
         fetched.
  */
  function Filter( filter, options ) {
    this._output || ( this._output = new Filter.Output( this, options && options.name ) );
    
    Pipelet.call( this, options );
    
    options = this._options;
    
    var that = this;
    
    this._downstream_query = null;
    this._filter_query     = null;
    
    this._query_controller = null; // a controller pipelet for dynamic filter queries
    
    // Function-based filters attributes
    this._filter           = null;
    
    switch ( typeof filter ) {
      case "function":
        this._filter = filter;
      break;
      
      case "object":
        if ( filter._is_a && filter._is_a( 'Pipelet' )
          || is_array( filter )
        ) {
          this._init_filter_query( filter );
          
          break;
        }
      // pass-though 
      default:
        throw new Error( "filter(), filter should be a function, a Query Pipelet, or a Query Array" );
    }
    
    return this;
  } // Filter()
  
  Filter.Output = Pipelet.Output.subclass(
    'Filter.Output',
    
    function( p, name ) { Pipelet.Output.call( this, p, name ) },
    
    function ( Super ) {
      return {
        _fetch: function( receiver, query ) {
          var p = this.pipelet;
          
          if ( p._filter ) return Super._fetch.call( this, receiver, query ); // filter locally using this.__transform()
          
          // Filter using current filter Query
          var q = p._filter_query;
          
          if ( query ) q = new Query( q.query ).and( query );
          
          return p._input._fetch( receiver, q.query );
        }, // Filter.Output.._fetch()
        
        update_upstream_query: function( changes ) {
          var that    = this
            , p       = that.pipelet
            , input   = p._input
            , removes = changes[ 0 ]
            , adds    = changes[ 1 ]
          ;
          
          if ( p._filter ) {
            // Using filter a function, _update upstream query directly with downstream changes
            // will then be filtered by __transform()
            
            input.update_upstream_query( changes );
            
            return that;
          }
          
          // var name = de && that._get_name( 'update_upstream_query' );
          
          if ( adds.length ) {
            var filter_keys = p._options.filter_keys;
            
            if ( filter_keys ) {
              // update filter query using filter keys
              // Example of filter keys:
              //   [ 'flow' ]
              var query_controller = p._query_controller, filter_adds = [];
              
              for ( var i = -1, e; e = adds[ ++i ]; ) {
                for ( var j = -1, k, e1 = {}; k = filter_keys[ ++j ]; ) {
                  e1[ k ] = e[ k ];
                }
                
                filter_adds.push( e1 );
              }
              
              // get additional filters from query controllers
              query_controller.update_upstream_query( [ [], filter_adds ] );
              
              // Prevent memory leak from continusly added filter_adds to query_controller
              // Because we do not update it on removes from downstream query updates
              query_controller.query.discard_optimized();
            }
          }
          
          var changes = p
            ._downstream_query
            
            .add   ( adds )
            .remove( removes )
            
            .discard_operations()
          ;
          
          changes[ 0 ].length + changes[ 1 ].length
            // downstream_query has changed terms
            
            // Calculate changes of upstream query then apply these upstream
            && input.update_upstream_query( p._get_upstream_query_changes() )
          ;
          
          return that;
        } // Filter.Output..update_upstream_query()
      } // Filter.Output instance methods
    } // function()
  ); // Filter.Output
  
  Pipelet.Build( 'filter', Filter, function( Super ) { return {
    /* -----------------------------------------------------------------------------------------
       _get_upstream_query_changes()
       
       AND filter query with downstream query then get changes with the previous upstream
       query.
       
       We have 3 queries:
         - this._downstream_query : query from destination pipelets
         - this._filter_query     : filter query updated by the query controller
         - this._input.query      : query for upstream pipelets
       
       ToDo: make this incremental instead of recalculating AND then changes
    */
    _get_upstream_query_changes: function() {
      var downstream_query = this._downstream_query
        ,   upstream_query = this._input.     query
        ,     filter_query = this.    _filter_query
        
        // and_query = downstream_query AND filter_query 
        ,        and_query = new Query( downstream_query ).and( filter_query )
        
        // changes = upstream_query - and_query 
        ,          changes = upstream_query.differences( and_query );
      ;
      
      de&&ug( this._get_name( '_get_upstream_query_changes' )
        + 'changes: '            , changes
        , '- ANDed query: '      , and_query       .query
        , '- upstream query: '   , upstream_query  .query
        , '- downstream query: ' , downstream_query.query
        , '- filter query: '     , filter_query    .query
      );
      
      return changes;
    }, // _get_upstream_query_changes()
    
    _init_filter_query: function( filter ) {
      var that         = this
        , options      = that._options
        , filter_query
      ;
      
      // This pipelet becomes a pass-through, ToDo: make it a controllet, dynamically
      that._add    = Super.__emit_add;
      that._remove = Super.__emit_remove;
      that._update = Super.__emit_update;
      
      // __transform should never be called as the default would not filter anything
      that.__transform = null;
      
      that._input.query                     = new Query( [] ).generate(); // nul filter
      that._downstream_query                = new Query( [] );
      that._filter_query     = filter_query = new Query( [] );
      
      that._query_controller = that._add_input(
        filter, // filter may be a Pipelet or an Array of Objects
        
        ( options.filter_keys ? Pipelet : RS.Greedy ).Input,
        
        options.name + '-query',
        
        {
          _add: function( or_terms, options ) {
            filter_query.add( or_terms );
            
            update_query( options );
          }, // add()
          
          _remove: function( or_terms, options ) {
            filter_query.remove( or_terms );
            
            update_query( options );
          }, // remove()
          
          _update: function( updates, options ) {
            filter_query.update( updates );
            
            update_query( options );
          } // update()
        }
      );
      
      function update_query( options ) {
        var _t      = options && options._t
          , input   = that._input
          , changes
        ;
        
        if ( _t && _t.more ) return;
        
        // Now that operations will be applied upstream of the pipelet, we can discard operations
        // ToDo: Rename Query..discard_operations() into Query..discard_changes() or Query..pop_changes()
        changes = filter_query.discard_operations();
        
        changes[ 0 ].length + changes[ 1 ].length
          && input._update_subscription( input._update_query( that._get_upstream_query_changes() ), options )
        ;
      } // update_query()
    }, // _init_filter_query()
    
    __transform: function( objects ) {
      var filter = this._filter;
      
      eval( new Code()
        ._function( 'this.__transform', null, [ '_' ] )
          ._var( [ 'r = []', 'f = filter', 'v', 'i = -1', 'l = _.length' ] )
          
          .unrolled_while( 'f( v = _[++i] ) && r.push( v )' )
          
          .add( 'return r' )
        .end( 'Filter..__transform()' )
        .get()
      );
      
      return this.__transform( objects );
    }, // __transform()
    
    // ToDo: filter(), _update is now used again, it needs to be tested and validated
    /*
    _update: function( updates, options ) {
      var filter = this._filter;
      
      switch( typeof filter ) {
        case 'object':
          filter = filter.f;
        // fall-through
        
        case 'function':
          this._update = function( updates ) {
            var l = updates.length, f = filter
              , removed = [], updated = [], added = []
              , more = options && options._t && options._t.more
            ;
            
            for ( var i = -1; ++i < l; ) {
              var u = updates[ i ], u0 = u[ 0 ], u1 = u[ 1 ];
              
              if ( f( u0 ) ) {
                if ( f( u1 ) ) {
                  updated.push( u );
                } else {
                  removed.push( u0 );
                }
              } else if ( f( u1 ) ) {
                added.push( u1 );
              }
            }
            
            return this.__emit_operations( added, removed, updated, RS.options_forward( options ) );
          };
          
          return this._update( updates );
        break;
      }
    } // _update()
    */
  }; } ); // Filter instance methods
  
  /* -------------------------------------------------------------------------------------------
     flow( 'name' )
     
     Filters a dataflow by the 'flow' attribute.
     
     Parameters:
     - name (String): the name of the flow to extract
     - options (Object):
       - key (Array of Strings): defaults to source's key or [ 'id' ]
       - fork_tag (String): optional transactions fork tag
  */
  rs.Compose( 'flow', function( source, flow_name, options ) {
    return source

      .filter( [ { flow: flow_name } ], extend_2( {}, options, { name: 'flow#' + flow_name } ) )
    ;
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Filter': Filter } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // filter.js
