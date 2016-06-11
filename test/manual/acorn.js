require( "toubkal" )
  .set([ { name:"toubkal/lib/server/toubkal_acorn.js"} ] )
  .require_resolve()
  .watch()
  .acorn()
  .trace()
  .greedy()
;
