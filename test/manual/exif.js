require("toubkal")
  .set( [
    { path:"/Users/Public/Pictures/Sample\ Pictures/Desert.jpg" },
    { path: "/Users/User/Documents/ourika/screenshots/Comments.png" }
  ] )
  .watch()
  .piexif_parse()
  .pick(["exif"])
  .trace()
  .greedy()
;