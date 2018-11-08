/*  
  url.js
  ------
  
  Licence

*/
  
( this.undefine || require( 'undefine' )( module, require ) )()
( 'url', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var valid_uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  
  /* ----------------------------------------------------------------------------------------------
     source.url()
     
     Parses urls to extract filterning informations( flow, project_id, ... )
     
     example:
     - input:
         
         { hash: '#/projects/32b43584-cb66/views/42b43584-cb66/images/a73c-36c67016?sort=by_date' }
         
     - output:
         
         {
             flow : 'images'
           , project_id: '32b43584-cb66'
           , view_id: '42b43584-cb66'
           , image_id: 'a73c-36c67016'
           , query : {
               sort: 'by_date'
             }
         }
    
     where:
     - id: String current url route ( the module name loaded by require() )
  */
  rs.Singleton( 'url_pipelet', function( source, options ) {
    var rs = source.namespace();
    
    var url_pattern_options = {
      segmentNameCharset: 'a-zA-Z0-9_-',
    };
    
    source.alter( function( url ) {
      document.location.href = url.hash;
    } );
    
    return rs
      .url_events()

      .url_parse( { parse_query_string: true } )

      .url_pattern(
          'hash'
        , '#/(:route)(/:dataflows)'
        , url_pattern_options
      )
      
      .map( function( url ) {
        var attributes_names = { dataflow: 'dataflow_id' };
        
        var route = url.route
          , dataflows     = url.dataflows || []
          , dataflows_ids = url.ids       || []
          , object        = { route: route || 'home' }
          , url_query     = url.query
        ;
        
        switch( toString.call( dataflows ) ) {
          case '[object String]' :
            object[ attributes_names[ dataflows ] ] = dataflows_ids;
          break;
          
          case '[object Array]' :
            for( var i = -1; ++i < dataflows.length; )
              object[ attributes_names[ dataflows[ i ] ] ] = dataflows_ids[ i ]
            ;
          break;
        } // switch()
        
        if( url_query )
          object.query = url_query
        ;
        
        return object;
      }, { key: [ 'route' ] } )
      
      .last()
    ;
  } )
  
  return rs;
  
} );
