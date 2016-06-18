require( "toubkal" )
  .set([
    { name: "toubkal/lib/core/pipelet.js"            },
    { name: "toubkal/lib/server/toubkal_acorn"       },
    { name: "toubkal/lib/server/parse_documentation" }
  ] )
  
  .require_resolve()
  .watch()
  .acorn()
  .parse_documentation()
  .optimize()
  .trace()
  .greedy()
;
