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
    , Input           = Pipelet.Input
    , Plug_p          = RS.Plug.prototype
    , Query           = RS.Query
    , extend          = RS.extend
    , extend_2        = extend._2
    , is_array        = RS.is_array
    , forward_options = RS.Transactions.Options.forward
    , get_name        = RS.get_name
    , changes_count   = Query.changes_count
    , de              = false
    , ug              = log
    , _filter_query_s = '_filter_query'
    , query_s         = 'query'
    , future_query_s  = 'future_query'
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
    
    that._downstream = null;
    
    that[ _filter_query_s ] = null;
    
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
  
  function Downstream_Plug( pipelet ) {
    Input.call( this, pipelet, get_name( pipelet ) + '-downstream'  )
  }
  
  Input.subclass( 'Downstream_Plug', Downstream_Plug, function( Super ) { return {
    _upstream_query_changes: function( changes ) {
      var that         = this
        , removes      = changes[ 0 ]
        , adds         = changes[ 1 ]
        , al           = adds.length
        , output_query
      ;
      
      if ( removes.length + al ) {
        if ( al && ( output_query = that.pipelet._output_query ) )
           output_query._add( adds )
           
           /*
             The use of unique() in Filter.._init_filter_query() prevents
             a memory leak that would result from continously added
             filter_adds to query_controller Because we do not update
             it on removes from downstream query updates
             filter._query_controller.query.discard_optimized();
             that._query_controller.query.discard_optimized();
           */
        ;
        
        // update query to get optimized changes
        changes = Super._upstream_query_changes.call( that, changes );
        
        // log( get_name( this, '_upstream_query_changes' ) + 'changes:', changes );
        
        if ( changes_count( changes ) )
          // downstream_query has changed terms, need to calculate changes for input query
          
          changes = that.pipelet._get_upstream_query_changes()
        ;
      }
      
      return changes;
    }, // Downstream_Plug.._upstream_query_changes()
    
    _fetch: function( receiver, query, query_changes, destination ) {
      var that             = this
        , pipelet          = that.pipelet
        , filter_query     = pipelet[ _filter_query_s ]
        , q                = filter_query.query
        , upstream_changes
        , ___
      ;
      
      if ( query_changes
        && ! changes_count( upstream_changes = that._upstream_query_changes( query_changes ) )
      )
        upstream_changes = ___
      ;
      
      // log( get_name( that, '_fetch' ) + 'query:', query, 'q:', q );
      
      query = q_and( query );
      
      // log( get_name( that, '_fetch' ) + 'query:', query );
      
      Plug_p._fetch.call(
        that,
        receiver,         // to send fetched data to
        query,            // requested data
        upstream_changes, // changes to apply upstream immediately
        destination,      // which originates the changes
        query_changes     // changes to apply to query when fetch completes, ignored because _query_update() is undefined on input, ToDo: remove this parameter
      );
      
      // ToDo: inline q_and()
      function q_and( query ) {
        return query && query.length
          ? new Query( q, get_name( that ) + 'output_source-_fetch' ).and( query ).query
          : q
        ;
      }
    } // Downstream_Plug.._fetch()
  } } ); // Downstream_Plug() instance methods
  
  Pipelet.Build( 'filter', Filter, function( Super ) { return {
    /* ------------------------------------------------------------------------
        @method Filter.._get_upstream_query_changes()
        
        @short Get query differences between upstream and filter AND downstream
        
        @description
        This method allows to calcultate query changes emitted upstream. It
        is called when either filter or downstream query changes.
        
        Upstream query should always be the result of a Query AND between
        filter and downstream queries. But because we only emit query changes
        upstream, we need to calculate these changes, which is what this method
        does.
        
        We have 3 queries:
        - ```this._downstream.query```: from Downstream_Plug
        - ```this._filter_query```: updated by the query controller
        - ```this._input.query```: for upstream pipelets
        
        Returned changes are calculated with the following pseudo
        @@class:Query code:
        
        ```
          upstream_query DIFF ( filter_query AND downstream_query )
        ```
        
        Where:
        - ```DIFF``` is method Query..differences()
        - ```AND``` is method Query..and()
        
        This method produces no side effects on queries.
        
        ToDo: make this incremental instead of calculating differences
    */
    _get_upstream_query_changes: function() {
      var that             = this
        , name             = '_get_upstream_query_changes'
        , downstream_query = that._downstream[ future_query_s ]
        ,   upstream_query = that._input[ future_query_s ]
        ,     filter_query = that[ _filter_query_s ]
        
        // and_query = downstream_query AND filter_query
        ,        and_query = new Query( downstream_query, get_name( that, name ) + '-filter-' + name ).and( filter_query )
        
        // changes = upstream_query - and_query
        ,          changes = upstream_query.differences( and_query )
      ;
      
      de&&ug( get_name( that, name )
        + 'upstream_query diff ( downstream_query and filter_query )'
        , '\n  - changes                          : ', changes
        , '\n  - upstream query                   : ', upstream_query  .query
        , '\n  - downstream_query and filter_query: ', and_query       .query
        , '\n  - downstream query                 : ', downstream_query && downstream_query.query
        , '\n  - filter query                     : ', filter_query    .query
      );
      
      return changes;
    }, // _get_upstream_query_changes()
    
    _init_filter_query: function( filter ) {
      var that         = this
        , options      = that._options
        , filter_keys  = options.filter_keys
        , input        = that._input
        , output       = that._output
        , name         = get_name( that ) + '-filter-'
        , filter_query
        , ___
      ;
      
      // This pipelet becomes a pass-through, ToDo: make it a controllet, dynamically
      input.add    = function( adds   , options ) { output.emit( 'add'   , adds   , options ) };
      input.remove = function( removes, options ) { output.emit( 'remove', removes, options ) };
      input.update = function( updates, options ) { output.emit( 'update', updates, options ) };
      
      // __transform should never be called as the default would not filter anything
      that.__transform = null;
      
      // Initialize queries to null queries (lazy)
      input[ query_s ]                       = new Query( [], name + query_s         );
      input[ future_query_s ]                = new Query( [], name + future_query_s  );
      that[ _filter_query_s ] = filter_query = new Query( [], name + _filter_query_s );
      
      if ( filter_keys ) {
        var output_query       = that._output_query = rs.pick( filter_keys, { key: filter_keys } )
          , filter_keys_filter = output_query.unique( [] )
        ;
        
        filter = filter
          .filter( filter_keys_filter, { name: name + 'filter_keys_filter' } )
        ;
      }
      
      var downstream = that._downstream = output.source
        = new Downstream_Plug( that )
      ;
      
      downstream.source = input;
      
      that._query_controller = that._add_input(
        filter, // filter may be a Pipelet or an Array of Objects
        
        RS.Greedy.Input, // ToDo: implement as a query controller class
        
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
          
          changes = input._upstream_query_changes( changes );
          
          count = changes_count( changes );
        }
        
        if( count || _t && _t.forks )
          // Always forward transaction downstream
          // ToDo: filter() add test for add and update with no changes but with a fork tag
          input._update_subscription( changes, options )
        ;
        
        // de&&ug( get_name( that, 'update_query' ) + 'input query:', input[ query_s ].query );
      } // update_query()
    }, // _init_filter_query()
    
    __transform: function( objects ) {
      var that   = this
        , filter = that._filter
      ;
      
      eval( new Code()
        ._function( 'this.__transform', null, [ '_' ] )
          ._var( [ 'r = []', 'f = filter', 'v', 'i = -1', 'l = _.length' ] )
          
          .unrolled_while( 'f( v = _[++i] ) && r.push( v )' )
          
          .add( 'return r' )
        .end( 'Filter..__transform()' )
        .get()
      );
      
      that._output._transform = that.__transform.bind( that );
      
      return that.__transform( objects );
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
      @pipelet flow( flow_name, options )
      
      @short Filters a @@dataflow by its ```"flow"``` attribute
      
      @parameters
      - **flow_name** (String): the name of the flow to extract
      
      - **options** (Object): @@class:Pipelet options, e.g.:
        - **key** (Array of Strings): defaults to source's @@key or ```[ 'id' ]```
        - **fork_tag** (String): optional transactions @@fork @@tag
  */
  rs.Compose( 'flow', function( source, flow_name, options ) {
    return source

      .filter( [ { flow: flow_name } ], extend( {}, options, { name: 'flow#' + flow_name } ) )
    ;
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Filter': Filter } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // filter.js
