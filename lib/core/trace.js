/*  trace.js
    
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
( 'trace', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS         = rs.RS
    , log        = RS.log.bind( null, 'trace' )
    // , de         = false
    // , ug         = log
    , extend     = RS.extend
    , picker     = RS.picker
    , get_name   = RS.get_name
    , Pipelet    = RS.Pipelet
    , operations = RS.operations
    , fetch_id   = 0
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet trace( name, options )
      
      @short Trace pipelet methods
      
      @parameters
      - **name** (String): a name for all traces.
      
      - **options** (Object): optional attributes:
        - **counts** (Boolean): default *false*, only provide counts of
          values from operations instead of full content.
        
        - **pick** (Object): optional @@function:picker() expression to pick
          which attributes are traced. Defaults traces all attributes.
          This option is exclusive with option *counts* which has priority
          over *pick*.
        
        - **include** (Array of Strings): attributes to include, exclusively.
          This is applied after *pick*.
        
        - **exclude** (Array of Strings): attributes to exclude, ignored if
          option *include* is provided. This is applied after *pick*.
        
        - All other options are Booleans controlling which methods are traced,
          defaults correspond to all methods carrying data:
          
          Option Name               | Default | Methods traced
          --------------------------|---------|---------------------------------------
          **all**                   |  false  | everything
          **with_queries**          |  false  | add *fetch* and *update_upstream_query*
          **add**                   |  true   | @@method:Pipelet.._add()
          **remove**                |  true   | @@method:Pipelet.._remove()
          **update**                |  true   | @@method:Pipelet.._update()
          **clear**                 |  true   | @@method:Pipelet.._clear()
          **fetched**               |  true   | @@method:Input.._fetch() receiver()
          **fetch**                 |  false  | @@method:Output.._fetch()
          **update_upstream_query** |  false  | @@method:Plug..update_upstream_query()
          **add_source**            |  false  | @@method:Input..add_source()
          **remove_source**         |  false  | @@method:Input..remove_source()
          **_add_destination**      |  false  | @@method:Output.._add_destination()
          **_remove_destination**   |  false  | @@method:Output.._remove_destination()
      
      @description
      This pipelet helps debug Toubkal dataflows by showing messages exchanged
      at a point of interest.
      
      It uses @@MDN:JSON.stringify() to display @@[values]value that
      should therefore not have circular references, or which circular
      references should excluded using options *include*, *exclude*,
      *counts*, or *pick*.
      
      This is a @@stateless, @@synchronous, @@lazy pipelet.
      
      It will only trace when downstream pipelet is non-lazy so if
      ```trace()``` is the last pipelet of a @@pipeline, one needs to
      add @@pipelet:greedy() after it, e.g. to trace all authorized
      dataflows coming from a server:
      
      ```javascript
        rs.socket_io_server()
          
          .trace( 'from server' )
          
          .greedy()
        ;
      ```
      
      @see_also
      - Pipelet debug()
      
      @to_do
      - ToDo: provide commented trace examples
      - ToDo: add option *filter_map* to trace conditionally on message data and provide alternate data
  */
  function Trace( name, options ) {
    var all          = options.all
      , with_queries = options.with_queries || all
    ;
    
    options = extend(
      // defaults
      {
        add                  : true,
        remove               : true,
        update               : true,
        clear                : true,
        fetched              : true
      },
      
      // with queries
      with_queries && {
        fetch                : true,
        update_upstream_query: true
      },
      
      // all
      all && {
        add_source           : true,
        remove_source        : true,
        _add_destination     : true,
        _remove_destination  : true,
      },
      
      options
    );
    
    var that         = this
      , Super_Input  = Pipelet.Input.prototype
      , Super_Output = Pipelet.Output.prototype
      , include      = options.include
      , exclude      = options.exclude
      , counts       = options.counts
      , pick         = ! counts && options.pick
      , input
      , output
      , ___
    ;
    
    Pipelet.call( that, extend( {}, options, { name: options.name = name } ) );
    
    input  = that._input
    output = that._output;
    
    if ( include )
      that._replacer = include;
    
    else if ( options.exclude )
      that._replacer = function( key, value ) {
        return exclude.indexOf( key ) != -1 ? ___ : value;
      };
    
    if ( pick ) pick = picker( pick );
    
    // de&&ug( 'Trace', { include: include || 'all', exclude: exclude || 'none' } );
    
    if ( options.fetch || options.fetched ) {
      input ._fetch = input_fetch;
      output._fetch = output_fetch;
    }
    
    if ( options.update_upstream_query )
      output.update_upstream_query = update_upstream_query
    ;
    
    // Generate add, remove, update, clear
    operations.forEach( function( operation, i ) {
      if ( options[ operation ] )
        that[ '_' + operation ] = function( values, _options ) {
          
          log( operation, i < 3 
          
            ? // add, remove, update
              {
                values : counts ? values.length : values,
                options: _options
              }
            
            : // clear
              { options: values }
          );
          
          return that[ '__emit_' + operation ]( values, _options );
        }
    } );
    
    // Generate add_source(), remove_source(), _add_destination(), _remove_destination()
    generate( 'add'    , 'source'     , input , Super_Input );
    generate( 'remove' , 'source'     , input , Super_Input );
    generate( '_add'   , 'destination', output, Super_Output );
    generate( '_remove', 'destination', output, Super_Output );
    
    function generate( operation, name, plug, Super ) {
      var method_name = operation + '_' + name;
      
      if ( options[ method_name ] )
        plug[ method_name ] = function( plug, options ) {
          var o = {};
          
          o[ name ] = get_name( plug );
          o.options = options;
          
          log( method_name, o );
          
          Super[ method_name ].call( this, plug, options );
        }
    } // generate()
    
    function log( method, object ) {
      var values = pick && object.values;
      
      if ( values )
        object.values = method == 'update'
          ? values.map( function( update ) { return update.map( pick ) } )
          : values.map( pick )
        ;
      
      options[ method ]
        && RS.log( get_name( that, method ), JSON.stringify( object, that._replacer, '  ' ) )
      ;
    } // log()
    
    function input_fetch( receiver, query, query_changes, destination ) {
      var id = fetch_id; // incremented by output_fetch()
      
      Super_Input._fetch.call( this, rx, query, query_changes, destination );
      
      function rx( values, no_more, operation, options, terminated_source ) {
        log( 'fetched', {
          fetch_id         : id,
          more             : ! no_more     || ___,
          terminated_source: terminated_source && get_name( terminated_source ),
          operation        : operations[ operation || 0 ],
          values           : counts ? values.length : values,
          options          : options
        } );
        
        receiver( values, no_more, operation, options, terminated_source );
      } // rx()
    } // input_fetch()
    
    function output_fetch( receiver, query, query_changes, destination ) {
      log( 'fetch', {
        fetch_id     : ++fetch_id,
        destination  : get_name( destination ),
        query        : query         || ___,
        query_changes: query_changes || ___
      } );
      
      Super_Output._fetch.call( this, receiver, query, query_changes, destination );
    } // output_fetch()
    
    function update_upstream_query( changes, input ) {
      log( 'update_upstream_query', { removes : changes[ 0 ], adds: changes[ 1 ], destination: get_name( input ) } );
      
      Super_Output.update_upstream_query.call( this, changes, input );
    } // update_upstream_query()
  } // Trace()
  
  Pipelet.Build( 'trace', Trace );
  
  /* --------------------------------------------------------------------------
      @pipelet debug( debug, name, options )
      
      @short Conditional trace
      
      @parameters
      - **debug* (Boolean):
        - truly: display traces returning ```trace( name, options )```.
        
        - falsy: no traces, return *source*.
      
      - **name** (String): @@pipelet:trace() name.
      
      - **options** (Object): @@pipelet:trace() options.
      
      @examples
      Conditional trace in composition:
      ```javascript
        var debug = true; // set to false to disable all traces
        
        rs
          .socket_io_server()
          
          .debug( debug, "from server" )
          
          .greedy()
        ;
      ```
      
      @description
      This is a @@stateless, @@lazy, @@synchronous pipelet.
      
      Add a pipelet trace() if *debug* is truly.
      
      Unlike pipelet trace() that will always trace operations, *debug()*
      will not do anything if *debug* is falsy.
      
      This allows to add conditional traces typically in
      @@[Compositions](composition).
      
      ### See Also
      - Method Pipelet..Compose()
  */
  rs.Compose( 'debug', function( source, debug, name, options ) {
    
    return debug
      ? source.trace( name, options )
      : source
    ;
  
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.Trace = Trace;
  
  return rs;
} );
