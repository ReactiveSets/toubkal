require("toubkal")
  .set( [
    { path:"../ourika/uploads" },
  ] )
  .watch_directories()
  .filter( [ { extension: 'jpg' } ] )
  .watch()
  .piexif_parse()
  .pick( [ "path", "exif" ] )
  .trace()
  .greedy()
;