require( "toubkal" )
  
  .once()
  
  .flat_map( function( _ ) { return [
    { path: "test", other: "some value"    }, // a file that exists
    { path: "test1"                        }, // a file that does not exists
    { path: {}                             }, // an invalid path value, yieding a TypeError
    { path: "/dev/null/invalid"            }, // /dev/null is not a directory
    {                                      },  // missing path
    { error: { message: "upstream error" } }
  ] } )
  
  .fs_stat()
  
  .trace( "fs_stat" )
  
  .greedy()
;
