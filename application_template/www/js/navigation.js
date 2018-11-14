/*  
  navigation.js
  -------------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'navigation', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var RS           = rs.RS
    , extend       = RS.extend
    , uuid_v4      = RS.uuid.v4
    , add_class    = RS.add_class
    , remove_class = RS.remove_class
  ;
  
  return rs
    
    /* ---------------------------------------------------------------------------------------------------------------------
    */
    .Compose( '$navigation', function( url, $selector, options ) {
      var dropdown = '<a '
        +   'class="nav-link dropdown-toggle" '
        +   'data-toggle="dropdown" '
        +   'href="#" '
        +   'role="button" '
        +   'aria-haspopup="true" '
        +   'aria-expanded="false"'
        + '>'
        +  '<i class="fas fa-sliders-h"></i>'
        + '</a>'
        
        + '<div class="dropdown-menu">'
        +  '<a class="dropdown-item" href="#/history"><i class="fas fa-list"></i> Historique</a>'
        +  '<a class="dropdown-item" href="#/users"><i class="fas fa-user-circle"></i> Utilisateurs</a>'
        +  '<a class="dropdown-item" href="#/balance"><i class="fas fa-wallet"></i> Solde</a>'
        + '</div>'
      ;
      
      url
        .flat_map( function( _ ) {
          var route = _.route;
          
          if( route == 'home' ) route = 'dedications';
          
          if( route == 'display' ) return [];
          
          return [
              { id: 'dedications', icon   : 'music'        },
              { id: 'dj'         , icon   : 'compact-disc' },
              { id: 'display'    , icon   : 'tv'           },
              { id: 'settings'   , content: dropdown       },
              { id: 'logout'     , icon   : 'power-off'    }
            ].map( function( v ) {
              var id     = v.id
                , href   = id == 'logout' ? '/passport/logout' : '#/' + id
                , icon   = v.icon
                , active = route == id ? ' active' : ''
              ;
              
              if( id == 'settings' && ( route == 'history' || route == 'users' || route == 'balance' ) ) active = ' active';
              return {
                  id: 'nav-item-' + id
                , tag: 'li'
                , content: icon ? '<a class="nav-link" href="' + href + '"><i class="fas fa-' + icon + '"></i></a>' : v.content
                , attributes: { class: 'nav-item' + active + ( id == 'settings' ? ' dropdown' : '' ) }
              }
            } )
          ;
        }, { key: [ 'id' ] } )
        
        .optimize()
        
        .$to_dom( $selector )
      ;
    } ) // $navigation()
  ;
} ); // module.export
