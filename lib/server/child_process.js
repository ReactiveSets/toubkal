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
        - **linit**: for @@function:cancelable_limiter() to limit the number
          of concurent child_process_exec() that can be excuted in parallel.
          
          Default limiter is a global limiter for all child_process_exec()
          that limits execution of child processes to one at a time for the
          entire node instance. This default is best to limit cpu and memory
          usage spikes.
      
      @examples
      
      ```javascript
        require( "toubkal" )
          
          .once()
          
          .flat_map( function( _ ) {
            return [
              { command: "echo hello world on stdout" },
              { command: "echo to stderr 1>&2" }
            ]
          } )
          
          .child_process_exec()
          
          .trace( "child_process_exec" )
          
          /*
            Emitted values in the above trace will show:
            [
              {
                "stdout": "hello world on stdout\\\\n",
                "stderr": "",
                "source": {
                  "command": "echo hello world on stdout"
                }
              },
              {
                "stdout": "",
                "stderr": "to stderr\\\\n",
                "source": {
                  "command": "echo to stderr 1>&2"
                }
              }
            ]
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
      This is an @@asynchronous, @@stateless, @@greedy, @@pipelet\.
      
      @see_also
      - Pipelet flat_map()
      - Pipelet once()
      - Pipelet trace()
      - Pipelet greedy()
      - Function cancelable_map()
  */
  .Compose( 'child_process_exec', function( source, options ) {
    options = extend( { limit: exec_limiter }, options );
    
    return source.map( exec, options );
    
    function exec( _, next ) {
      if ( _.error ) {
        next( null, _ );
      
      } else {
        var command = _.command;
        
        child_process.exec( command, emit );
      }
      
      function emit( error, stdout, stderr ) {
        var result;
        
        if ( error ) {
          log( 'child_process_exec error:', RS.log.s( error ), ', command:', command );
          console.log( error );
          result = { source: _, error: error, error_pipelet: options.name };
        } else {
          result = { source: _, stdout: stdout, stderr: stderr };
        }
        
        next( null, result );
      } // emit()
    } // exec()
  } ) // pipelet child_process_exec()
;
