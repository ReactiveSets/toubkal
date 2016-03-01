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
             
             .through( socket._input )
           ;
         
         Doing so, says that all authorizations AND-expression have a flow attribute. When
         the socket requests a flow 'user', authorizations for the 'user' flow are fetched.
  */
  function Filter( filter, options ) {
    var that = this;
    
    Pipelet.call( that, options );
    
    options = that._options;
    
    that._downstream_query = null;
    that._filter_query     = null;
    
    that._query_controller = null; // a controller input for dynamic filter queries
    
    // Function-based filters attributes
    that._filter           = null;
    
    switch ( typeof filter ) {
      case "function":
        that._filter = filter;
        
        that._output._transform = that.__transform.bind( that );
      break;
      
      case "object":
        if ( filter._is_a && filter._is_a( 'Pipelet' )
          || is_array( filter )
        ) {
          that._init_filter_query( filter );
          
          break;
        }
      // pass-though 
      default:
        throw new Error( "filter(), filter should be a function, a Query Pipelet, or a Query Array" );
    }
  } // Filter()
  
  Pipelet.Build( 'filter', Filter, function( Super ) { return {
    /* -----------------------------------------------------------------------------------------
       _get_upstream_query_changes()
       
       AND filter query with downstream query then get changes with the previous upstream
       query.
       
       We have 3 queries:
         - this._downstream_query : query from destination pipelets
         - this._filter_query     : filter query updated by the query controller
         - this._input.query      : query for upstream pipelets
       
       ToDo: make this incremental instead of recalculating AND then changes, possibly as a pipelet
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
        + 'upstream_query diff ( downstream_query and filter_query )'
        , '\n  - changes                          : ', changes
        , '\n  - upstream query                   : ', upstream_query  .query
        , '\n  - downstream_query and filter_query: ', and_query       .query
        , '\n  - downstream query                 : ', downstream_query.query
        , '\n  - filter query                     : ', filter_query    .query
      );
      
      return changes;
    }, // _get_upstream_query_changes()
    
    _init_filter_query: function( filter ) {
      var that         = this
        , options      = that._options
        , filter_keys  = options.filter_keys
        , input        = that._input
        , filter_query
      ;
      
      // This pipelet becomes a pass-through, ToDo: make it a controllet, dynamically
      that._add    = Super.__emit_add;
      that._remove = Super.__emit_remove;
      that._update = Super.__emit_update;
      
      // __transform should never be called as the default would not filter anything
      that.__transform = null;
      
      input.query                           = new Query( [] ).generate(); // nul filter
      that._downstream_query                = new Query( [] );
      that._filter_query     = filter_query = new Query( [] );
      
      if ( filter_keys ) {
        var output_query       = rs.pick( filter_keys, { key: filter_keys } )
          , filter_keys_filter = output_query.unique( [], { silent: true } )
        ;
        
        filter = filter
          .filter( filter_keys_filter, { name: that._options.name + '-filter_keys_filter' } )
        ;
      }
      
      that._query_controller = that._add_input(
        filter, // filter may be a Pipelet or an Array of Objects
        
        RS.Greedy.Input,
        
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
          , changes
        ;
        
        if ( _t && _t.more ) return;
        
        // Now that operations will be applied upstream of the pipelet, we can discard operations
        // ToDo: Rename Query..discard_operations() into Query..discard_changes() or Query..pop_changes()
        changes = filter_query.discard_operations();
        
        // log( that._get_name( 'update_query' ) + 'changes:', changes );
        
        changes[ 0 ].length + changes[ 1 ].length
          && input._update_subscription( input._update_query( that._get_upstream_query_changes() ), options )
        ;
        
        // log( that._get_name( 'update_query' ) + 'input query:', input.query.query );
      } // update_query()
      
      that._output.source = {
        _update_query: function( changes, destination ) {
          // update downstream query to get optimized changes
          // ToDo: this should be done by an _update_query() on a plug having for query _downstream_query
          changes = that
            ._downstream_query
            
            // ToDo: use Query..update( changes )
            .add   ( changes[ 1 ] )
            .remove( changes[ 0 ] ) // ToDo: add tests for removed terms
            
            .discard_operations()
          ;
          
          // ToDo: this should be done in Filter.Input.._update_query()
          if ( changes[ 0 ].length + changes[ 1 ].length )
            // downstream_query has changed terms, need to calculate changes for input query
            
            changes = that._get_upstream_query_changes()
          ;
          
          return changes;
        }, // Filter.Input.._update_query()
        
        // ToDo: this should go to Filter.Input
        _fetch: function( receiver, query, query_changes, destination ) {
          var q    = filter_query.query
            , rx   = receiver
            , that = this
          ;
          
          if ( query_changes ) {
            var adds           = query_changes[ 1 ]
              , removes        = query_changes[ 0 ]
              , _query_changes = query_changes
            ;
            
            // ToDo: DRY code with update_upstream_query() bellow
            if ( output_query && adds.length ) {
              output_query._add( adds );
              
              // ToDo: wait for fetch from filter to emit before fetching input
            }
            
            if ( adds.length + removes.length ) rx = update_query_changes;
            
            query_changes = [ // !! do not use query_changes.map()
              // ToDo: see _update_query() to implement changes
              q_and( removes ),
              q_and( adds    )
            ];
          }
          
          // log( that._get_name( '_fetch' ) + 'query:', query, 'q:', q );
          
          // ToDo: to optimize this process, refactor to use Plug.._fetch()
          query = q_and( query );
          
          // log( that._get_name( '_fetch' ) + 'query:', query );
          
          // ToDo: update Filter.Query_Controller query on receiver if there are filter keys
          input._fetch( rx, query, query_changes, destination ); // act as a controllet plug
          
          function q_and( query ) {
            return query && query.length
              ? new Query( q ).and( query ).query
              : q
            ;
          }
          
          function update_query_changes( adds, no_more, removes, updates, options ) {
            // update local queries
            if ( no_more ) {
              var changes = that._update_query( _query_changes, destination );
              
              input._update_query( changes ); // ToDo: split _update_query() in two to avoid recalculating unused changes
            }
            
            receiver( adds, no_more, removes, updates, options );
          } // update_query_changes()
        }, // Filter.Input.._fetch()
        
        update_upstream_query: function( changes, destination ) {
          var removes = changes[ 0 ]
            , adds    = changes[ 1 ]
            , al      = adds.length
          ;
          
          if ( removes.length + al ) {
            if ( output_query && al ) {
               output_query._add( adds );
               
               // The use of unique() above prevents the problem described bellow which could nonetheless be more efficient:
               // Prevent memory leak from continously added filter_adds to query_controller
               // Because we do not update it on removes from downstream query updates
               // filter._query_controller.query.discard_optimized();
               // that._query_controller.query.discard_optimized();
            }
            
            // Calculate changes of upstream query then apply these upstream, if any
            changes = this._update_query( changes, destination );
            
            changes[ 0 ].length + changes[ 1 ].length
              && input.update_upstream_query( changes, destination ) // act as a controllet, not processing operations
            ;
          }
        } // Filter.Input..update_upstream_query()
      };
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
      
      this._output._transform = this.__transform.bind( this );
      
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
