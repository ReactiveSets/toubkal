require( "toubkal" )
  .set([
    // { name: "toubkal/lib/core/pipelet.js"            },
    { name: "toubkal/lib/server/toubkal_acorn"       },
    { name: "toubkal/lib/server/parse_documentation" },
    { name: "toubkal/lib/server/markdown"            }
  ] )
  
  .require_resolve()
  .watch()
  .acorn()
  .parse_documentation()
  .optimize()
  //.trace()
  .documentation_markdown()
  .markdown()
  .trace()
  .greedy()
;
