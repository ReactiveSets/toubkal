undefine()( 'window_size', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  // table columns
  var columns = [
    { id: 'id'    , label: '#'     , align: 'center' },
    { id: 'width' , label: 'Width' , align: 'center' },
    { id: 'height', label: 'Height', align: 'center' }
  ];
  
  rs
    // Get the dataflow of window size events
    .window_size()
    
    // Smooth table updates on Animation Frames
    .throttle_last( rs.animation_frames() )
    
    // Display results in div id "window_size"
    .table( rs.RS.$( '#window_size' ), columns, {
      class_names: 'table table-condensed table-bordered',
      caption: 'Window Size'
    } )
  ;
} );
