/*  
  homepage.js
  -----------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'homepage', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var extend = rs.RS.extend;
  
  return rs
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $homepage( $selector, options )
      
      @short home page
      
      @parameters
      - $selector(String/Object/Pipelet): DOM element where to display data
      - options                 (Object): optional object
    */
    .Compose( '$homepage', function( source, $selector, options ) {
      var $home = source
        .namespace()
        
        .set( [
          { id: 'home-page', tag: 'section', attributes: { class: 'homepage' } }
        ] )
        
        .$to_dom( $selector )
        
        .map( function( _ ) {
          return {
              id: 'home-page-content'
            , tag: 'div'
            , $node: _.$node
            , attributes: { class: 'content' }
          }
        } )
        
        .$to_dom()
      ;
      
      source
        .flow( 'application_routes' )
        
        .alter( function( _ ) {
          var id = _.id;
          
          _.tag = 'li';
          _.content = '<a class="" href="#/' + id + '">' + _.title + '</a>'
        } )
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom( $home )
      ;
    } ) // $homepage()
  ;
} ); // module.export
