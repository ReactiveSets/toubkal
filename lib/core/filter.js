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
  
  var RS              = rs.RS
    , log             = RS.log.bind( null, 'filter' )
    , Code            = RS.Code
    , Pipelet         = RS.Pipelet
    , Query           = RS.Query
    , extend_2        = RS.extend._2
    , is_array        = RS.is_array
    , forward_options = RS.Transactions.Options.forward
    , get_name        = RS.get_name
    , de              = false
    , ug              = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet filter( filter, options )
      
      @short Filter a set by a filter function or @@query
      
      @parameters:
      - filter: can be a Function, an Array or a Query Pipelet:
        - (Function) signature:
            filter( value )
            
            If the filter function returns truly, value is emitted downstream.
            
            In this mode, the filter is executed locally and the filter
            pipelet is @@(greedy).
        
        - (Array of Objects): the filter is a static query, e.g.:
          ```javascript
            states = [
              { country: 'USA', state 'Michigan' }
              { country: 'USA', state 'Illinois' }
            ];
            
            // Filter cities from the states of Michigan and Illinois
            cities.filter( states );
          ```
          In this mode, the filter is executed upstream, and the filter
          pipelet is @@(lazy).
          
        - (Pipelet): the filter is a query dataflow allowing dynamic filters
          from dataflows:
          ```javascript
            states = rs.set( [ { country: 'USA', state 'Michigan' } ] );
            
            // Filter cities from the state of Michigan
            cities.filter( states );
            
            // Add the state of Illinois
            states._add( [ { country: 'USA', state 'Illinois' } ] );
            
            // From now on, the above filter also provides the cities in
            // Illinois in addition to Michigan
            
            states._remove( [ { country: 'USA', state 'Michigan' } ] )
            
            // Now the filter no longer provides cities from Michigan,
            // and only cities from Illinois are emitted downtream
          ```
          In this mode, the filter is executed upstream, and the filter
          pipelet is @@(lazy).
          
          See also option "filter_keys" which allows to @@lazy fetch
          this dataflow.
          
      - options (Object): optional pipelet options:
        - name (String): debugging instance name
        
        - tag (String): to synchronize transactions forked and reunited
          at this filter.
        
        - filter_keys (Array): when filter is a @@query, filter_keys may
          be used to define and-terms present in all filter AND-expressions.
          Doing so allows to @@(lazy)-fetch the filter query for a subset of
          all AND-terms, improving the memory footprint and execution time
          of query updates.
          
          A typical example is when differenciating between many flows in
          an authorization filter:
          ```javascript
            source
              .filter( authorizations, { filter_keys: [ 'flow' ] } )
              
              .through( socket._input )
            ;
          ```
          Doing so, says that all authorizations AND-expression have a flow
          attribute. When the socket requests a flow 'user', authorizations
          for the 'user' flow are fetched.
    
    @description:
    
    This is a @@synchronous, @@stateless pipelet. It is @@greedy when the
    filter parameter is a function and @@lazy when the filter is a @@query,
    either static or dynamic when provided by a pipelet.
    
    When the filter parameter is a pipelet, the input is @@greedy unless
    options "filter_keys" is defined, in which case it becomes @@(lazy).
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
  
  function changes_count( changes ) {
    return changes[ 0 ].length + changes[ 1 ].length
  }
  
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
       ToDo: move this method as an inner function of _init_filter_query, queries becoming closure variables
    */
    _get_upstream_query_changes: function() {
      var that             = this
        , name             = '_get_upstream_query_changes'
        , downstream_query = that._downstream_query
        ,   upstream_query = that._input.     query
        ,     filter_query = that.    _filter_query
        
        // and_query = downstream_query AND filter_query
        ,        and_query = new Query( downstream_query, get_name( that, name ) + '-filter-' + name ).and( filter_query )
        
        // changes = upstream_query - and_query
        ,          changes = upstream_query.differences( and_query );
      ;
      
      de&&ug( get_name( that, name )
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
        , name         = get_name( that ) + '-filter-'
        , filter_query
        , ___
      ;
      
      // This pipelet becomes a pass-through, ToDo: make it a controllet, dynamically
      that._add    = Super.__emit_add;
      that._remove = Super.__emit_remove;
      that._update = Super.__emit_update;
      
      // __transform should never be called as the default would not filter anything
      that.__transform = null;
      
      input.query                           = new Query( [], name + 'input'      ).generate(); // nul filter
      that._downstream_query                = new Query( [], name + 'downstream' );
      that._filter_query     = filter_query = new Query( [], name + 'filter'     );
      
      if ( filter_keys ) {
        var output_query       = rs.pick( filter_keys, { key: filter_keys } )
          , filter_keys_filter = output_query.unique( [] )
        ;
        
        filter = filter
          .filter( filter_keys_filter, { name: name + 'filter_keys_filter' } )
        ;
      }
      
      that._query_controller = that._add_input(
        filter, // filter may be a Pipelet or an Array of Objects
        
        RS.Greedy.Input,
        
        name + 'query-controller',
        
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
          , count
        ;
        
        if ( _t && _t.more ) return;
        
        // Now that operations will be applied upstream of the pipelet, we can discard operations
        // ToDo: Rename Query..discard_operations() into Query..pop_changes()
        changes = filter_query.discard_operations();
        
        // log( get_name( that, 'update_query' ) + 'changes:', changes );
        count = changes_count( changes );
        
        if( count ) {
          changes = that._get_upstream_query_changes();
          
          input._update_query( changes, ___, 'future_query' );
          
          // ToDo: updating input query should be done after/while updating subscription, and in synchronized order with output source fetched
          changes = input._update_query( changes );
          
          count = changes_count( changes );
        }
        
        if( count || _t && _t.forks )
          // Always forward transaction downstream
          // ToDo: filter() add test for add and update with no changes but with a fork tag
          input._update_subscription( changes, options )
        ;
        
        // de&&ug( get_name( that, 'update_query' ) + 'input query:', input.query.query );
      } // update_query()
      
      that._output.source = {
        __options: { name: get_name( that ) + '-output_source' },
        
        _get_name: that._get_name,
        
        _update_downstream_query: function( changes ) {
          // log( get_name( this, '_update_downstream_query' ) + 'query before:', that._downstream_query.query, ', changes:', changes );
          
          return that
            ._downstream_query
            
            // ToDo: use Query..update( changes )
            .add   ( changes[ 1 ] ) // ToDo: apply remove before add
            .remove( changes[ 0 ] ) // ToDo: add tests for removed terms
            
            .discard_operations()
          ;
        }, // Filter.Input.._update_downstream_query()
        
        _update_query: function( changes ) {
          // update downstream query to get optimized changes
          changes = this._update_downstream_query( changes );
          
          // log( get_name( this, '_update_query' ) + 'changes:', changes );
          
          if( changes_count( changes ) )
            // downstream_query has changed terms, need to calculate changes for input query
            
            changes = that._get_upstream_query_changes()
          ;
          
          return changes;
        }, // Filter.Input.._update_query()
        
        _fetch: function( receiver, query, query_changes, destination ) {
          var q    = filter_query.query
            , rx   = receiver
            , that = this
          ;
          
          if ( query_changes ) {
            var removes        = query_changes[ 0 ]
              , adds           = query_changes[ 1 ]
              , al             = adds.length
              , _query_changes = query_changes
            ;
            
            if ( output_query && al ) {
              output_query._add( adds );
              
              // ToDo: should we wait for fetch from filter to emit before fetching input?
            }
            
            if ( al + removes.length ) {
              query_changes = that._update_query( query_changes );
              
              if( ! changes_count( query_changes ) ) query_changes = ___;
              
              // Revert downstream changes for now, will be finally applied by update_query_changes()
              that._update_downstream_query( [ adds, removes ] );
              
              // ToDo: fix for concurrent fetches' receivers called out-of-order
              
              rx = update_query_changes;
            }
          }
          
          // log( get_name( that, '_fetch' ) + 'query:', query, 'q:', q );
          
          query = q_and( query );
          
          // log( get_name( that, '_fetch' ) + 'query:', query );
          
          // ToDo: update Filter.Query_Controller query on receiver if there are filter keys
          input._fetch( rx, query, query_changes, destination ); // act as a controllet plug
          
          function q_and( query ) {
            return query && query.length
              ? new Query( q, name + 'output_source-_fetch' ).and( query ).query
              : q
            ;
          }
          
          function update_query_changes( adds, no_more, removes, updates, options ) {
            no_more
              && that._update_downstream_query( _query_changes )
            ;
            
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
            
            changes_count( changes )
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
    
    _update: function( updates, options ) {
      var that   = this
        , filter = that._filter
      ;
      
      switch ( typeof filter ) {
        case 'object':
          filter = filter.f;
        // fall-through
        
        case 'function':
          return ( that._update = update ).call( that, updates, options );
        break;
      }
      
      function update( updates, options ) {
        var removed = []
          , updated = []
          , added   = []
          , l       = updates.length
          , i       = -1
        ;
        
        while ( ++i < l ) {
          var u  = updates[ i ]
            , u0 = u[ 0 ]
            , u1 = u[ 1 ]
          ;
          
          if ( filter( u0 ) ) {
            if ( filter( u1 ) ) {
              updated.push( u );
            } else {
              removed.push( u0 );
            }
          } else if ( filter( u1 ) ) {
            added.push( u1 );
          }
        }
        
        return this.__emit_operations( added, removed, updated, forward_options( options ) );
      } // update()
    } // _update()
  }; } ); // Filter instance methods
  
  /* -------------------------------------------------------------------------------------------
      @pipelet flow( name, options )
      
      @short Filters a @@dataflow by its ```"flow"``` attribute
      
      @parameters
      - name (String): the name of the flow to extract
      - options (Object):
        - key (Array of Strings): defaults to source's @@key or [ 'id' ]
        - fork_tag (String): optional transactions @@fork @@tag
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
