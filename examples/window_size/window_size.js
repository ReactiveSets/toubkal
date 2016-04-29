undefine()( 'window_size', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  // table columns
  var columns = [
    { id: 'id'    , label: '#'     , align: 'center' },
    { id: 'width' , label: 'Width' , align: 'center' },
    { id: 'height', label: 'Height', align: 'center' }
  ];
  
  rs
    // Get a dataflow of window size events
    .window_size()
    
    // Throttle window resize events using Window.requestAnimationFrame() for smooth display in table bellow
    .throttle_last( rs.animation_frames() )
    
    // Display results in table div id "window_size"
    .table( rs.RS.$( '#window_size' ), columns, { class_names: 'table table-condensed' } )
  ;
} );
