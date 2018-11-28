/*
    Copyright (c) 2013-2018, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'navigation', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
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
