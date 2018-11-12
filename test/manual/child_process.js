require( "toubkal" )
  
  .once( 1 ) // emit_operations() does respond to initial fetch because it is transactional
  
  .map( function( _ ) {
    return {
      adds: [ { command: "echo hello world on stdout" } ],
      removes: [ { command: "echo to stderr 1>&2" } ],
      updates: [ [ { command: "echo removed" }, { command: "echo added" } ] ]
    }
  } )
  
  .emit_operations()
  
  /*
  .once()
  
  .flat_map( function( _ ) {
    return [
      { command: "echo hello world on stdout" },
      { command: "echo to stderr 1>&2" }
    ]
  } )
  */
  
  .child_process_exec()
  
  .trace( "child_process_exec" )
  
  .greedy()
;
