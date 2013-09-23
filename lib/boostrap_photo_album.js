// boostrap_photo_album.js
XS.Compose( 'boostrap_photo_album', function( source, photos_matrix_node, carousel_node, options ) {
  // Set model options
  var album = options.album_name;
  
  if ( album ) {
    options.thumbnails_model          || ( options.thumbnails_model          = album + '_thumbnails'       );
    options.images_model              || ( options.images_model              = album + '_images'           );
    
    options.photo_matrix_events_model || ( options.photo_matrix_events_model = album + '_select_event'     );
    options.carousel_events_model     || ( options.carousel_events_model     = album + '_carousel_event'   );
  } else {
    options.thumbnails_model          || ( options.thumbnails_model          = 'images_thumbnails'         );
    options.images_model              || ( options.images_model              = 'images'                    );
    
    options.photo_matrix_events_model || ( options.photo_matrix_events_model = 'photo_matrix_select_event' );
    options.carousel_events_model     || ( options.carousel_events_model     = 'carousel_event'            );
  }
  
  // photo album graph
  var carousel_events = xs.pipelet(); // tmp pipelet for graph loop
  
  var thumbnails_events = source
    .model( options.thumbnails_model )
    .load_images()
    .boostrap_photos_matrix( photos_matrix_node, {
      input_events: carousel_events,
      output_events_model: options.photo_matrix_events_model,
      do_not_forward_events: true // prevent event loop
    } )
  ;
  
  return source
    .model( options.images_model )
    .load_images()
    .boostrap_carousel( carousel_node, {
      input_events: thumbnails_events,
      output_events_model: options.carousel_events_model
    } )
    .plug( carousel_events )
  ;
} );

xs.socket_io_server()
  .boostrap_photo_album( "album_1_matrix", "album_1_carousel", { album: 'album_1' } )
;
