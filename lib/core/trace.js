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
  
  var RS       = rs.RS
    , log      = RS.log.bind( null, 'trace' )
    , de       = false
    , ug       = log
    , extend   = RS.extend
    , extend_2 = extend._2
    , picker   = RS.picker
    , get_name = RS.get_name
    , Pipelet  = RS.Pipelet
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet trace( name, options )
      
      @short Trace pipelet methods
      
      @parameters
      - **name** (String): a name for all traces.
      
      - **options** (Object): optional attributes:
        - **counts** (Boolean, default ```false```): only provide counts of
          values from operations
        - **include** (Array of Strings): attributes to include, exclusively.
        - **exclude** (Array of Strings): attributes to exclude, ignored if
          include provided.
        - **pick** (Object): optional @@function:picker() expression to pick
          which attributes are traced. Defaults traces all attributes.
          This option is exclusive with options ```"counts"``` which has
          priority over ```"pick"```.
        
        - All other options are Booleans controlling which methods are traced:
          - **all**                   : default ```false```, trace everything
          - **add_source**            : default ```false```, @@method:Input..add_source()
          - **remove_source**         : default ```false```, @@method:Input..remove_source()
          - **fetch**                 : default ```false```, @@method:Plug.._fetch()
          - **fetched**               : default ```true```, @@method:Plug.._fetch() receiver()
          - **_add_destination**      : default ```false```, @@method:Output.._add_destination()
          - **_remove_destination**   : default ```false```, @@method:Output.._remove_destination()
          - **update_upstream_query** : default ```false```, @@method:Plug..update_upstream_query()
          - **add**                   : default ```true```, @@method:Pipelet.._add()
          - **remove**                : default ```true```, @@method:Pipelet.._remove()
          - **update**                : default ```true```, @@method:Pipelet.._update()
          - **clear**                 : default ```true```, @@method:Pipelet.._clear()
      
      @description
      trace() helps debug Toubkal dataflows by showing exchanges at a given point of
      interest.
      
      This is a @@stateless, @@synchronous, @@lazy pipelet.
      
      It will only trace when downstream pipelet is non-lazy so if trace() is the last
      @@pipelet of a @@pipeline, one needs to add @@pipelet:greedy() right after it,
      e.g. to trace all authorized dataflows coming from a server:
      
      ```javascript
        rs.socket_io_server()
          .trace( 'socket_io_server' )
          .greedy()
        ;
      ```
      
      ### See Also
      - Pipelet debug()
  */
  function Trace( name, options ) {
    options = extend( {
      add_source           : false,
      remove_source        : false,
      fetch                : false,
      fetched              : true,
      _add_destination     : false,
      _remove_destination  : false,
      update_upstream_query: false,
      add                  : true,
      remove               : true,
      update               : true,
      clear                : true
    }, options, options.all && {
      add_source           : true,
      remove_source        : true,
      fetch                : true,
      _add_destination     : true,
      _remove_destination  : true,
      update_upstream_query: true
    } );
    
    var that         = this
      , Super_Input  = Pipelet.Input.prototype
      , Super_Output = Pipelet.Output.prototype
    ;
    
    Pipelet.call( that, { name: options.name = name, key: options.key } );
    
    var include = options.include
      , exclude = options.exclude
      , counts  = options.counts
      , pick    = ! counts && options.pick
      , ___
    ;
    
    if( include ) {
      that._replacer = include;
    } else if( options.exclude ) {
      that._replacer = function( key, value ) {
        return exclude.indexOf( key ) != -1 ? ___ : value;
      }
    }
    
    if( pick ) pick = picker( pick );
    
    de&&ug( 'Trace', { include: include || 'all', exclude: exclude || 'none' } );
    
    if( options.fetch || options.fetched )
      that._output._fetch = fetch
    ;
    
    if( options.update_upstream_query )
      that._output.update_upstream_query = update_upstream_query
    ;
    
    // Generate add, remove, update, clear
    [ 'add', 'remove', 'update', 'clear' ].forEach( function( operation, i ) {
      if( options[ operation ] )
        that[ '_' + operation ] = function( values, _options ) {
          if( i < 3 ) { // add, remove, update
            log( operation, {
              values : counts ? values.length : values,
              options: _options
            } );
          } else { // clear
            log( operation, { options: values } )
          }
          
          return that[ '__emit_' + operation ]( values, _options );
        }
    } );
    
    // Generate add_source(), remove_source(), _add_destination(), _remove_destination()
    generate( 'add'    , 'source'     , that._input , Super_Input );
    generate( 'remove' , 'source'     , that._input , Super_Input );
    generate( '_add'   , 'destination', that._output, Super_Output );
    generate( '_remove', 'destination', that._output, Super_Output );
    
    function generate( operation, name, plug, Super ) {
      var method_name = operation + '_' + name;
      
      if( options[ method_name ] )
        plug[ method_name ] = function( plug, options ) {
          var o = {};
          
          o[ name ] = get_name( plug );
          o.options = options;
          
          log( method_name, o );
          
          Super[ method_name ].call( this, plug, options );
        }
    } // generate()
    
    function log( method, object ) {
      if( pick && object.values ) object.values = object.values.map( pick );
      
      options[ method ]
        && RS.log( get_name( that, method ), JSON.stringify( object, that._replacer, '  ' ) )
      ;
    } // log()
    
    function fetch( receiver, query, query_changes, destination ) {
      var name   = 'fetch'
        , that   = this
        , input  = get_name( destination )
      ;
      
      log( name, show_parameters() );
      
      Super_Output._fetch.call( that, rx, query, query_changes, destination );
      
      function show_parameters() {
        return {
          destination  : input,
          query        : query || ___,
          query_changes: query_changes || ___
        }
      } // show_parameters()
      
      function rx( adds, no_more, removes, updates, options ) {
        log( name + 'ed', extend_2( {
          more         : ! no_more,
          adds         : show( adds    ),
          removes      : show( removes ),
          updates      : show( updates ),
          options      : options
        }, show_parameters() ) );
        
        receiver( adds, no_more, removes, updates, options );
        
        function show( values ) {
          return values
            ? ( counts ? values.length : pick ? values.map( pick ) : values )
            : ___
          ;
        }
      } // rx()
    } // fetch()
    
    function update_upstream_query( changes, input ) {
      log( 'update_upstream_query', { removes : changes[ 0 ], adds: changes[ 1 ], destination: get_name( input ) } );
      
      Super_Output.update_upstream_query.call( this, changes, input );
    } // update_upstream_query()
  } // Trace()
  
  Pipelet.Build( 'trace', Trace );
  
  /* --------------------------------------------------------------------------
      @pipelet debug( name, options )
      
      @short Conditional trace
      
      @parameters
      - **name** (String): @@pipelet:trace() name
      - **options** (Object): optional @@pipelet:trace() options
      
      @examples
      Conditional trace in composition:
      ```javascript
        rs
          .Compose( '', function( source, options ) {
            return source
              .debug( options.debug )
            ;
          } )
        ;
      ```
      
      @description
      Add a pipelet trace() if name is truly.
      
      Unlike pipelet trace() that will always trace operations regardless of
      its ```name``` parameter, ```debug()``` will not do anything if name
      is falsy.
      
      This allows to add conditional traces typically in
      @@[Compositions](composition).
      
      This is a @@stateless, @@lazy, @@synchronous pipelet.
      
      ### See Also
      - Method Pipelet..Compose()
  */
  rs.Compose( 'debug', function( source, debug, options ) {
    
    return debug
      ? source.trace( debug, options )
      : source
    ;
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Trace': Trace
  } );
  
  de&&ug( "module loaded" );
  
  return rs; // global
} );
