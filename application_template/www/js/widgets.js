/*  
  widgets.js
  ----------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'widgets', [ [ 'rs', 'toubkal' ] ], function( rs ) {
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
    .Compose( '$signin', function( login_strategies, $selector, options ) {
      var $container = login_strategies
        .map( function( _ ) {
          return {
              id: 'signin'
            , tag: 'div'
            , content: '<section class="section fade-in">'
                +  '<div class="container is-fluid">'
                +   '<div class="logo">'
                +    '<i class="fas fa-piggy-bank"></i>'
                +   '</div>'
                
                +   '<a class="button" href="/passport/google">Sign-In</a>'
                +  '</div>'
                + '</section>'
            , attributes: { class: 'signin' }
          }
        } )
        
        .$to_dom( $selector )
        
        .$query_selector( 'a.button' )
        
        .$on( 'click' )
        
        .alter( function( _ ) {
          add_class( _.$node, 'is-loading' );
        } )
      ;
    } ) // $signin()
    
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
    
    /* ---------------------------------------------------------------------------------------------------------------------
    */
    .Compose( '$home', function( source, $selector, options ) {
      var $home = source
        .namespace()
        
        .set( [
          { id: 'home-page', tag: 'ul', attributes: { class: 'home' } }
        ] )
        
        .$to_dom( $selector )
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
    } ) // $home()
    
    /* ---------------------------------------------------------------------------------------------------------------------
    */
    .Compose( '$todo_list', function( source, $selector, options ) {
      var rs = source.namespace()
        , todos = source.flow( 'todos' )
      ;
      
      var $containers = rs        
        .set( [
          { id: 'todo-list-page', tag: 'section', attributes: { class: 'todo-list' } }
        ] )
        
        .$to_dom( $selector )
        
        .flat_map( function( _ ) {
          var $ = _.$node;

          return [
            {
                id: 'new-todo'
              , tag: 'div'
              , $node: $
              , attributes: { class: '' }
              , order: 0
            },
            {
                id: 'todo-list'
              , tag: 'ul'
              , $node: $
              , attributes: { class: '' }
              , order: 1
            }
          ]
        } )
        
        .optimize()
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom()
        
        .set()
      ;
      
      // new todo
      var new_todo = $containers
        .filter( [ { id: 'new-todo' } ] )
        
        .map( function( _ ) {
          return {
              id: 'new-todo-input'
            , tag: 'textarea'
            , $node: _.$node
            , attributes: {
                  name: 'new-todo-input'
                , placeholder: 'new task'
                , row: 1
              }
          }
        } )
        
        .$to_dom()
        
        .$on( 'keypress' )
        
        .map( function( _ ) {
          var $event = _.$event
            , $node  = _.$node
            , value  = $node.value
          ;
          
          if( $event.key == 'Enter' && !$event.ctrlKey && !$event.shiftKey && !$event.altKey && value !== '' ) {
            $event.preventDefault();
            
            var todo_id = uuid_v4();
            
            $node.value = '';
            
            return {
                flow: 'todos'
              , id: todo_id
              , text: value
              , state: 1
            }
          }
        } )
        
        .timestamp()
      ;
      
      // todos list
      var $todo_list = todos
        
        .alter( function( _ ) {
          var id = _.id;
          
          _.id = 'todo-' + id;
          _.tag = 'li';
          _.attributes = { class: '' };
          _.todo_id = id;
        } )
        
        .optimize()
        
        .order( [ { id: 'timestamp' } ] )
        
        .$to_dom( $containers.filter( [ { id: 'todo-list' } ] ) )
        
        .flat_map( function( _ ) {
          var  $    = _.$node
            , id    = _.todo_id
            , state = _.state
            , content = [ 'Uncomplete', 'Complete' ]
          ;
          
          return [
            {
                id: 'todo-control-' + id
              , tag: 'button'
              , $node: $
              , content: content[ state - 1 ]
              , attributes: { type: 'button', class: '', value: state }
              , todo_id: id
              , order: 1
            },
            {
                id: 'todo-content-' + id
              , tag: 'span'
              , $node: $
              , content: _.text
              , attributes: { class: '' }
              , order: 2
            }
          ]
        } )
       
        .optimize()
        
        .$to_dom()
      ;
      
      // update todo state
      var update_todo_state = $todo_list
        
        .filter( [ { tag: 'button' } ] )
        
        .$on( 'click' )
        
        .fetch( todos, [ { id: '.todo_id' } ] )
        
        .map( function( _ ) {
          var previous_state = _.values[ 0 ]
            , new_state      = extend( {}, previous_state, { state: previous_state.state === 1 ? 2 : 1 } )
          ;
          
          return { updates: [ [ previous_state, new_state ] ] }
        } )
        
        .emit_operations()
        
        .optimize()
      ;
      
      return rs
        .union( [ new_todo, update_todo_state ] )
      ;
    } ) // $todo_list()
  ;
} ); // module.export
