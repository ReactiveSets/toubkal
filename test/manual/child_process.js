require( "toubkal" )
  
  .once( 1 ) // child_process_exec does not yet work on initial fetch
  
  .alter( { command: "echo hello world on stdout; echo to stderr 1>&2" } )
  
  .child_process_exec()
  
  .trace( "child_process_exec" )
  
  .greedy()
;
