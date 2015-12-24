require( 'toubkal/lib/html/html_parse.js' );
require( 'toubkal/lib/html/html_serialize.js' );

require( 'toubkal' )
  .Singleton( 'files', function( source, options ) {
    return source
      .set( [], { key: [ 'path' ] } )
      .trace( 'files' )
    ;
  } )
  
  .files()
  .watch( { base_directory: __dirname + '/..' } )
  .html_parse()
  .trace( 'file' )
  .html_serialize()
  .adds()
  .revert()
  .files()
  ._add   ( [ { path: 'manual/index.html' } ] )
;
