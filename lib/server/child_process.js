"use strict";

var rs            = require( 'toubkal'       )
  , child_process = require( 'child_process' )
  , cancelable    = require( 'toubkal/lib/util/cancelable' )
  
  , exec_limiter  = cancelable.limiter( 1 )
  
  , RS            = rs.RS
  , extend        = RS.extend
  
  , log           = RS.log.bind( null, 'child_process' )
  
  , de            = true
  , ug            = log
;

rs
  /* --------------------------------------------------------------------------
      @pipelet child_process_exec( options )
      
      @short Executes a command in a child process
      
      @parameters
      - **options** (Object): optional @@class:Pipelet() options, plus:
        - **linit**: limiter to limit the number of child_process_exec()
          that can be excuted in parallel.
          
          Default limiter is a global limiter for all child_process_exec()
          that limits execution of child processes to one at a time for the
          entire node instance. This default is best to limit cpu and memory
          usage spikes.
          
          Types and values that can be assigned to limit are the same as that
          of @@function:cancelable_limiter()
      
      
      @examples
      
      ```javascript
        require( "toubkal" )
          
          .once( 1 ) // child_process_exec does not yet work on initial fetch
          
          .alter( { command: "echo hello world on stdout; echo to stderr 1>&2" } )
          
          .child_process_exec()
          
          .trace( "child_process_exec" )
          
          /*
            Emitted value in the above trace will show:
              {
                "stdout": "hello world on stdout\\\\n",
                "stderr": "to stderr\\\\n",
                "source": {
                  "command": "echo hello world on stdout; echo to stderr 1>&2"
                }
              }
          *\/
          
          .greedy()
        ;
      ```
      
      @source
      - **command** (String): to execute
      
      @emits
      - **error** (String): optional error from child_process.exec()
      - **stdout** (String): from child process
      - **stderr** (String): from child process
      - **source** (Object): source value
      
      @description
      This is an @@asynchronous, @@greedy, @@pipelet\.
      
      This pipelet is based on experimental assynchronous mode of
      pipelet map() that does not yet work on the initial fetch().
      
      It has only been tested on @@term:add() operations.
      
      @see_also
      - Pipelet alter()
      - Pipelet once()
      - Pipelet trace()
      - Pipelet greedy()
      - Function cancelable_map()
  */
  .Compose( 'child_process_exec', function( source, options ) {
    options = extend( { limit: exec_limiter }, options );
    
    return source.map( exec, options );
    
    function exec( _, operation, options, next ) {
      if ( _.error ) {
        next( null, _ );
      
      } else {
        var command = _.command;
        
        child_process.exec( command, emit );
      }
      
      function emit( error, stdout, stderr ) {
        var result;
        
        if ( error ) {
          log( 'child_process_exec error:', error, ', command:', command );
          
          result = { error: error, error_pipelet: options.name, source: _ };
        } else {
          result = { stdout: stdout, stderr: stderr, source: _ };
        }
        
        next( null, result );
      } // emit()
    } // exec()
  } ) // pipelet child_process_exec()
;
