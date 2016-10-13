/*  dispatch.js
    
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
( 'dispatch', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS        = rs.RS
    , extend    = RS.extend
    , get_name  = RS.get_name
    , is_array  = RS.is_array
    , log       = RS.log.bind( null, 'dispatch' )
    , Greedy    = RS.Greedy
    , de        = false
    , ug        = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet dispatch( branches, branch, options )
      
      @short Dispatches source @@dataflow through a set of branched @@[pipelines]pipeline
      
      @description:
      Dispatch is a basic building block for managing
      @@[concurency]concurent with Toubkal. It is also useful in
      many non-concurent Toubkal design patterns.
      
      It dispatches source dataflow over a reactive set of branch dataflows, 
      then gathers the outputs of these dataflows back together to produce
      the dispatcher's destination dataflow:
      
      ```
                          branches
                          dataflow
                             |
                             V
                    Branches Controller
                             |
               Dispatcher    |      Gatherer
             (pass-through)  |      (union)
                    |        V         |
                    |---> branch 0 --->|
                    |        |         |
        source      |        V         |   destination
        ----------->|---> branch i --->|--------------->
        dataflows   |        |         |   dataflows
                    |        V         |
                    |---> branch n --->|
      ```
      
      The ```branches``` dataflow controls setup and tear-down of branches
      and provides a context for each ```branch()```. When a branch is added
      in branches, the controller calls ```branch()``` to create a new
      pipeline between the dispatcher and the gatherer.
      
      When a branch is removed, the controller disconnects the branch
      pipeline between the dispatcher and the gatherer allowing to
      recover no-longer used resources.
      
      Dispatcher is currently implemented with pipelet pass_through(), while
      gatherer is implemented with pipelet union().
      
      Applications:
      - Dispatch server dataflows to a number of clients connecting to the server with some
        socket protocol such as WebSockets, socket.io, or plain Unix sockets. Clients' dataflows
        are then gathered back together on the server to produce the destination dataflow,
        typically updates to databases and other web services.
        
        Each branch serves a client that is created when it connects to the server, and torn-
        down when the client disconnects.
      
      - Dispatch dataflows to database tables and other web-services. Database tables and
        web services are differentiated by the "flow" attribute.
        
        Each branch describes table or web service access and schema.
      
      - Reuse pipelets designed for a single entity to accomodate multiple entities. Each
        branch corresponds to one entity.
      
      - Dispatch all process events efficiently, using the loop option, to all pipelines.
      
      - Distribute a workload horizontally over multiple processes, servers, or worker
        threads in a map/reduce pattern controlled by "branches". The dispatcher "maps"
        incoming operations to each branch using filters and "reduces" the outputs of these
        branches back into this" destination dataflow.
        
        Each branch defines the dataflow that starts when a new proccess is added to the
        branches control dataflow and stops when its entry is removed from branches.
      
      - Control elastic charding where each branch controls a chard. Chard attributes may
        determine on which device they are, a path on the device, a process id, a machine url.
      
      Dispatching is implemented very efficiently using the source query tree, while gathering
      uses pipelet union().
      
      @parameters:
        - branches: (Pipelet) controls branches creation and removal. Each add operation spawns
            the creation of a new branch, calling branch(), while remove operations
            tear-down branches. Each branch has attributes:
            - id: (scalar) unique identifier for the branch. It is mandatory unless the
              pipelet provides a _make_key() method to build a unique key from values emited
              by the pipelet.
              
            - any other attribute provided to branch() to provide a context for each
              branch.
        
        - branch: function( source, options ), called when each branch
            is created and which processes the incoming @@dataflow from
            ```source```. It creates a @@pipeline and returns its
            destination, or undefined if it does not provide a destination
            dataflow. If provided, this destination is then gathered back
            together with that of other branches to produce dispatcher's
            destination dataflow.
            
            The branch() function is called with the following parameters:
            - source : (Pipelet) the source dataflow for this branch
            - options: (Object) the options of this dispatch pipelet
              providing global options to all branches.
            
            ```this``` context of branch() is the branch that spawned this
            pipelet from branches.
            
            Returned value of the branch pipeline can be either the output
            pipelet or an input-output Array, see option ```"input_output"```
            for information about the later.
            
            If resource cleanup is required on branch removal, setup a
            one-time event listener on ```source._input``` for event
            ```"remove_source"```, example:
            
            ```javascript
              function branch( source, options ) {
                var output = source.some_singleton();
                
                // Cleanup on branch removal
                source._input.once( "remove_source", cleanup );
                
                return output;
                
                function cleanup( dispatcher, options ) {
                  // Tear-down connection between source and singleton
                  output._input.remove_source( source );
                } // cleanup()
              } // branch()
            ```
            When using options ```"single"``` or  ```"input_output"```,
            monitor the input pipelet, as seen in examples.
            
            Cleanup is required on branch removal if some pipelets in the
            instantiated pipeline are refered by external objects such as
            closure context, or @@singleton or @@multiton pipelets to which
            global references are held. Not properly cleaning up context
            will leak memory on branch removal.
        
        - options: (Object) For maximum performances, e.g. for very large
          dispachers with thousands of simultaneously active branches, one
          should use options ```"loop"``` or ```"no_encapsulate"``` along
          with either ```"single"``` or ```"input_output"```:
          
          - no_remove_fetch (Boolean): true to not fetch source data when removing a branch.
            Default is false, when removing a branch, source data is fetched and removed
            from pipeline, downstream of dispatch, then internally to the branch.
            
            Removing data when a branch is disconnected allows to keep downstream flows
            consistant with present branches. In some cases, branches hold no data, they
            may be purely transactional, it is therefore useless to attempt to remove
            data. Likewise, some branch pipelines may not be accepting data after removal
            because it may be a disconnected client, therefore there is no need for a
            remove operation. In these cases, setting option "no_remove_fetch" to true
            will prevent fetching and removing of data when removing a branch.
          
          - loop: (Boolean): true if the dispatcher is has the gatherer union for input, so
            that branch outputs are connected to the inputs of all previously instanciated
            branches.
            
            ```text
                          branches
                          dataflow
                             |
                             V
                    Branches Controller
                             |
               Dispatcher    |      Gatherer
             (pass-through)  |      (union)
                    |        V         |
                    |---> branch 0 --->|
                    |        |         |
                    |        V         |     destination
                 -->|---> branch i --->|------------------>
                |   |        |         |     dataflows
                |   |        V         |
                |   |---> branch n --->|
                |                      |
                |                      |
                 ----------------------|
                                       |
                                       |
                source dataflows       |
                ---------------------->|
            ```
            
            There could typically be one loop per process (node process or web worker) to
            dispatch all application events, handling both internal and external events, the
            branch dataflow declaring all active pipelines. This architecture has several
            benefits:
            
            a) active branches react to changes on the branches dataflow, allowing dynamic
            applications, such as single page applications.
            
            b) if the branch dataflow derives from a filter on the destination dataflow,
            the system can self-modify, enabling adaptive applications.
            
            Beware that when looping:
            
            a) the output of the dispatcher includes dispatch source events. This is not
            a problem if dataflows are properly identified to enable filtering.
            
            b) all branches outputs are connected to themselves which may yield infinite
            recursions unless proper filter() on branch inputs and set_flow() on branch
            outputs prevent these. Typically, a branch should never emit the same flow
            attribute as it requires, e.g.:
            
            ```javascript
              function branch( source, options ) {
                return source
                  .flow( 'user_updates' ) // subscribes to users' updates
                  .set()
                  .set_flow( 'users' ) // emits users state and change events
                ;
              }
            ```
          
          - no_encapsulate: (Boolean) true if the dispatcher should not use an encapsulate()
            pipelet. This improves performances by removing a query tree and using the source
            query tree as the dispatcher, removes an otherwise required pass_through() pipelet.
            
            When using this option, the returned pipelet is the output gatherer union at the
            end of the dispatcher and therefore it cannot be used as a reference to connect
            to the input dispatcher tree which becomes the source pipelet upstream of dispatch().
            
            This option cannot be used in conjunction with option loop. Doing so is not
            supported, will not be supported, and yields unpredictable results, most likely
            infinite recursions a this time.
          
          - single: (Boolean) true if the the branch dataflow is made of a single pipelet or
            uses an encapsulated pipelet.
            
            Using this option allows to improve performances by removing the requirement for
            a pass-through pipelet between the source and the input of each branch.
          
          - input_output: (Boolean) true if the branch dataflow returns an
            ```[input, output]``` Array.
            
            This option also allows to improve performances for multi-pipelet branches
            because it removes the need for both pipelet pass_through() and
            pipelet encapsulate().
            
            When this option is specified, ```branch()``` should return an
            Array of two pipelets: input pipelet followed by output pipelet
            which both are allowed to be ```null``` or ```undefined```.
      
      ### Throws error on
      - a branch does not define an @@identity matching to it's pipeline @@key
      - a branch is duplicated (use pipelet unique() upstream if necessary)
      - ```branch()``` returned ```[input, output]``` Array without using option
        ```"input_output"```
      - ```branch()``` did not return ```[input, output]``` Array while option
        ```"input_output"``` is true
      - option ```"single"``` specified but ```branch()``` returned a pipeline
        with more than one pipelet
      - a removed branch is not found, dispatch() does not have an
        @@antistate, does not handle @@remove before @@add operations.
      
      @examples:
      - Define a database @@singleton, also used in other examples bellow:
        
        ```javascript
          var rs = require( 'toubkal_mysql' );
          
          rs
            // Define database singleton
            .Singleton( 'database', function( source, schema, options ) {
            
              return source.dispatch( schema, table, options );
              
              function table( source, options )
                var flow = this.id;
                
                return source
                  .flow( flow, { key: this.key || [ 'id' ] } )
                  
                  .mysql( flow, this.columns )
                  
                  .set_flow( flow )
                ;
              } // table()
            } ) // database()
          ;
        ```
        
        #### Using
        - Method Pipelet..Singleton()
        - Pipelet flow()
        - Pipelet mysql()
        - Pipelet set_flow()
      
      - Define database schema for 2 tables ```"users"``` and ```"profiles"```:
      
        ```javascript
          rs
            // Define schema also as a singleton
            .Singleton( 'database_schema', function( source, options ) {
              return source
                .set( [
                  { id: 'users'   , columns: [ 'id', 'email' ] },
                  { id: 'profiles', columns: [ 'user_id', 'first_name', 'last_name' ], key: [ 'user_id' ] }
                ] )
              ;
            } ) // database_schema()
          ;
        ```
        
        #### Using
        - Method Pipelet..Singleton()
        - Pipelet set()
        
      - A trivial socket.io server with no authentication or authorizations, delivering the
        content of a database to a number of web clients, and allowing these clients to
        update that same database. In this example, branches are socket.io clients:
        
        ```javascript
          // HTTP Servers and socket.io clients dataflow
          var clients = rs
            .set( [
               { ip_address: '0.0.0.0', port: 80  }
               { ip_address: '0.0.0.0', port: 443, key: '...', cert: '...' }
             ] )
             
            .http_servers()      // start http and https servers
            
            .socket_io_clients() // emits a dataflow of socket.io client sockets
          ;
          
          // Dispatch database to clients
          rs.database( rs.database_schema() )
            
            .trace( 'database changes to clients' )
            
            .dispatch( clients, client )
            
            .trace( 'database changes from clients' )
            
            .database() // singleton, no need to specify schema
          ;
          
          // Create a client dataflow
          function client( source, options ) {
            return source
              .through( this.socket ) // add dispatcher's as source of socket.io client socket
            ;
          }
        ```
        
        #### Using
        - Pipelet set()
        - Pipelet http_servers()
        - Pipelet socket_io_clients()
        - Database singleton defined in prior example
        - Database schema defined in prio example
        - Pipelet trace()
        - Method Pipelet..through()
      
      - To add authorizations, filter source and output to and from clients' sockets:
        
        ```javascript
          function client( source, options ) {
            return source
              .filter( can_read ) // where can_read is read authorizations dataflow
              
              .through( this.socket )
              
              .filter( can_write ) // where can_write is write autorizations dataflow
            ;
          }
        ```
        
        #### Using
        - Pipelet filter()
        - Method Pipelet..through()
      
      - Load and hot-reload server javascript modules having database access, cleanup on removal:
        
        ```javascript
          // Watch javascript files in current working directory
          var modules = rs
            // Specify current working directory
            .set( [ { path: '' } ] )
            
            // Watch that directory
            .watch_directories()
            
            // Get only JavaScript files
            .filter( [ { extension: 'js' } ] )
            
            // Convert path to uri which always have "/" separators even on win32
            .to_uri()
          ;
          
          // load and hot-reload all modules manipulating a database
          rs
            // "database" singleton is defined in previous example
            .database( rs.database_schema() )
            
            // Allow modules to read database
            .dispatch( modules, load_module )
            
            // Allow modules to write to database
            .database()
          ;
          
          function load_module( source, options ) {
            var path   = require.resolve( '.' + this.uri );
            
            // On module removal, clear require cache
            source._input.once( 'remove_source', clear_cache );
            
            // Initialize module with source (i.e. database)
            // returned pipeline can write to database
            return require( path )( source, this, options );
            
            function clear_cache() {
              delete require.cache[ path ];
            } // clear_cache()
          } // load_module()
        ```
        
        #### Using
        - Pipelet set()
        - Pipelet watch_directories()
        - Pipelet filter()
        - Pipelet to_uri()
        - Database and its schema defined in prior examples
        - Method Event_Emitter..once() on for event ```"remove_source"``` emitted by method Input..remove_source()
      
      - A module for the example above joining ```"users"``` and ```"profiles"``` dataflows:
      
        ```javascript
          module.exports = processor;
          
          function processor( source, module, options ) {
            var rs     = source.namespace() // get namespace of source
              , extend = rs.RS.extend       // extend()
            ;
            
            return source
              .flow( 'users' )
              
              .join( source.flow( 'profiles' ), [ 'id', 'user_id' ], function( user, profile ) {
                var merged = extend( {}, user, profile );
                
                delete merged.user_id;
                
                return merged;
              } )
              
              .set_flow( 'users_profiles' )
            ;
          }
        ```
        
        #### Using
        - Pipelet flow()
        - Function RS.extend()
        - Pipelet join()
        - Pipelet set_flow()
      
      - Cleanup on branch removal with dispatch option ```"single"```:
        
        ```javascript
          rs.dispatch( branches, pipeline, { single: true } );
          
          function pipeline( source, options ) {
            var branch = this
              , output = source.flow( branch.flow )
            ;
            
            // Set "remove_source" event listener on output instead of source
            output._input.once( 'remove_source', function( dispatcher, options ) {
              // branch will be removed
            } );
            
            return output;
          } // pipeline()
        ```
        
        #### Using
        - Pipelet flow()
        - Method Event_Emitter..once() on for event ```"remove_source"``` emitted by method Input..remove_source()
      
      - Cleanup on branch removal with dispatch option ```"input_output"```, using database example:
        
        ```javascript
          var rs = require( 'toubkal_mysql' );
          
          rs
            // Define database singleton
            .Singleton( 'database', function( source, schema, options ) {
            
              return source.dispatch( schema, table, extend( {}, options, { input_output: true } ) );
              
              function table( source, options ) {
                var flow   = this.id
                  , input  = source
                      .flow( flow, { key: this.key || [ 'id' ] } )
                      
                  , output = input
                      .mysql( flow, this.columns )
                      
                      // Automatically disconnect pipelet mysql() when input is disconnected by dispatch()
                      .remove_source_with( input )
                      
                      .set_flow( flow )
                ;
                
                return [ input, output ];
              } // table()
            } ) // database()
          ;
        ```
        
        #### Using
        - Method Pipelet..Singleton()
        - Pipelet flow()
        - Pipelet mysql()
        - Pipelet set_flow()
        - Method Pipelet..remove_source_with()
  */
  // Note: Dispatch() is a Greedy Pipelet on "branches" which is instanciated as a composition
  function Dispatch( source, branches, branch, options ) {
    var that            = this
      , rs              = source.namespace()
      , name            = options.name + '-'
      , no_encapsulate  = options.no_encapsulate
      , gatherer        = that._gatherer = rs.union( [], { name: name + 'gatherer' } )
      , dispatcher
    ;
    
    options.key = branches._key;
    
    options.name = name + 'branches';
    
    Greedy.call( that, options );
    
    that._branch   = branch;
    that._branches = {};
    
    that._dispatcher = dispatcher
      = no_encapsulate
      ? source
      : rs
        .pass_through( { name: name + 'dispatcher' } ) // ToDo: use union()
        //.trace( name + 'dispatcher', { update_upstream_query: true } )
    ;
    
    // This pipelet is instancated as a composition, we need to add branches as a source explicity:
    that._add_source( branches );
    
    return options.loop 
      ? ( gatherer.through( dispatcher ), source.through( gatherer ) )
      : no_encapsulate
      ? gatherer
      : source.encapsulate( that._dispatcher, gatherer, options )
    ;
  } // Dispatch()
  
  Greedy.subclass( 'Dispatch', Dispatch, {
    _add: function( new_branches, options ) {
      var that                  = this
        , branches              = that._branches
        , _options              = that._options
        , input_output          = _options.input_output
        , dispatcher            = that._dispatcher
        , gatherer              = that._gatherer
        , requires_pass_through = ! ( _options.single || input_output )
        , name                  = '_add'
      ;
      
      new_branches.forEach( function( branch ) {
        var id     = that._make_key( branch )
          , branch
          , input
          , output
        ;
        
        typeof id === "undefined" && fatal( 'branches must define a unique id' );
        
        branches[ id ] && fatal( 'branch id: ' + id + ', already exists' );
        
        de&&ug( get_name( that, name ) + 'id:', id, ', options:', _options );
        
        // ToDo: connect to dispatcher after instanciating branch(), allows to optimize queries on input
        // ToDo: consider to use union() instead of pass_through() for input, may improve performances especially in conjunction with network pipelet
        // ToDo: determine requires_pass_through dynamically after calling branch()
        // based on 1/ returned value or 2/ finding the input of the pipeline dynamically
        // providing a path_through() connected to namespace as input initialy, removing it
        // afterwards then connecting to dispatcher
        // Removing the path_through() would currently trigger hacked branch cleanup so this can only be done after providing a way to cleanup a branch
        input = requires_pass_through
          ? dispatcher.pass_through( { name: _options.name + '-input-' + id } ) // ToDo: use union()
          : dispatcher
        ;
        
        branch = that._branch.call( branch, input, options );
        
        // Assert that returned branch matches provided options
        if ( is_array( branch ) ) {
          input_output || that._emergency( name, 'branch returned (input, output) couple without option input_output' );
        } else {
          input_output && that._emergency( name, 'branch did not return (input, output) couple while option input_output is true' );
          
          _options.single
            && branch
            && branch._input.source
            && branch._input.source != dispatcher._output
            && that._emergency( name, 'option single specified but returned a pipeline with more than one pipelet: ' + get_name( branch._input.source ) )
          ;
        }
        
        output = ( branches[ id ] = input_output
          ? branch
          : [ requires_pass_through ? input : branch, branch ]
        )[ 1 ];
        
        output && output.through( gatherer, options );
        
        function fatal( message ) {
          that._emergency( name, message + ', check branches key: ' + that._key );
        } // fatal()
      } ); // for all added branches
    }, // _add()
    
    _remove: function( removed_branches, options ) {
      var that     = this
        , branches = that._branches
        , name     = '_remove'
        , _options = that._options
      ;
      
      if ( _options.no_remove_fetch )
        options = extend( {}, options, { no_fetch: true } );
      ;
      
      removed_branches.forEach( remove_branch );
      
      function remove_branch( branch ) {
        var id     = that._make_key( branch )
          , output
          , input
        ;
        
        branch = branches[ id ]
             // ToDo: send to error dataflow
          || that._emergency( name, 'branch: ' + id + ', does not exist, check branches key: ' + that._key )
        ;
        
        de&&ug( get_name( that, name ) + 'id:', id );
        
        delete branches[ id ];
        
        // ToDo: allow to unplug at the end of ongoing transactions, this should be done by Input..remove_source()
        
        // Unplug input from dispatcher
        ( input = branch[ 0 ] )
          ? input._input.remove_source( that._dispatcher._output, options, unplug_output )
          : unplug_output()
        ;
        
        // Unplug output from gatherer
        function unplug_output() {
          de&&ug( get_name( that, name ) + 'remove output for branch', id );
          
          ( output = branch[ 1 ] )
            && that._gatherer._input.remove_source( output._output, options )
          ;
        } // unplug_output()
      } // remove_branch()
    }, // _remove()
    
    // ToDo: use updates to notify branches of some changes without tearing-down the branch,
    // possibly using the input_output object to provide a branch instance update function
    // or having branch return a function
    _update: function() {
      // Ignore updates for now
    } // _update()
    
    // ToDo: implement clear()
  } ); // Dispatch instance methods
  
  return rs.Compose( 'dispatch', RS.Dispatch = Dispatch );
} );
