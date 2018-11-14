/*  
  signin-page.js
  --------------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'signin-page', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  return rs
    
    /*---------------------------------------------------------------------------------------------------------------------
      @signin_page( $selector, options )
      
      @short authentication with Passport.js
      
      @source dataflows:
      - login_strategies
      - profile
      
      @parameters
      - $selector(String/Object/Pipelet): DOM element where to display data
      - options                 (Object): optional object
    */
    .Compose( '$signin_page', function( source, $selector, options ) {
      var $container = source
        .flow( 'login_strategies' )
        
        .map( function( _ ) {
          return {
              id: 'signin'
            , tag: 'div'
            , content: '<section class="section fade-in">'
                +  '<div class="container is-fluid">'
                +   '<div class="logo">'
                +   '</div>'
                
                +   '<a class="button" href="/passport/google">Sign-In</a>'
                +  '</div>'
                + '</section>'
            , attributes: { class: 'signin' }
          }
        } )
        
        .$to_dom( $selector )
      ;
    } ) // $signin_page()
} ); // module.export
