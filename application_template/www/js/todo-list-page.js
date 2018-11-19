/*  
  todo-list-page.js
  -----------------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'todo-list-page', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var RS = rs.RS
    , extend  = RS.extend
    , uuid_v4 = RS.uuid.v4
    , add_class = RS.add_class
    , remove_class = RS.remove_class
  ;
  
  return rs
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_list_page( $selector, options )
      
      @short ToDo list app
      
      @source dataflow 'todos'
      
      @emits new or updated todos
      
      @parameters
      - $selector(String/Object/Pipelet): DOM element where to display data
      - options                 (Object): optional object
    */
    .Compose( '$todo_list_page', function( source, $selector, options ) {
      // ----------------------------------------------------------------------------
      // page items containers
      var $containers = source
        .namespace()        
        
        .set( [
          {
              id: 'todo-list-page'
            , tag: 'section'
            , attributes: { class: 'todo-list-page' }
          }
        ] )
        
        .$to_dom( $selector )
        
        .alter( function( _ ) {
          _.id = 'todo-list-page-content';
          _.tag = 'div';
          _.attributes = { class: 'content' };
        } )
        
        .$to_dom()
        
        .flat_map( function( _ ) {
          var $ = _.$node;

          return [
            {
                id: _.id + '-title'
              , tag: 'h2'
              , content: 'ToDo list app'
              , attributes: { class: 'title' }
            },
            {
                id: 'todo-control'
              , tag: 'div'
              , attributes: { class: 'todo-control' }
            },
            {
                id: 'new-todo'
              , tag: 'div'
              , attributes: { class: 'new-todo' }
            },
            {
                id: 'todo-list'
              , tag: 'ul'
              , attributes: { class: 'todo-list' }
            }
          ].map( function( v, i ) {
            return extend( {}, v, { order: i, $node: $ } )
          } )
        } )
        
        .optimize()
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom()
        
        .set()
      ;
      
      // ----------------------------------------------------------------------------
      // new todo
      var new_todo = $containers
        .filter( [ { id: 'new-todo' } ] )
        
        .map( function( _ ) {
          return {
              id: 'new-todo-input'
            , tag: 'div'
            , $node: _.$node
            , placeholder: 'What must be done?'
          }
        } )
        
        .$to_dom()
        
        .$content_editable()
        
        .map( function( _ ) {
          // reset content  
          _.$node.innerText = '';
          
          return {
              flow: 'todos'
            , id: uuid_v4()
            , text: _.content
            , state: 1
          }
        } )
        
        .timestamp()
      ;
      
      // ----------------------------------------------------------------------------
      // control to filter todos by state
      var todos_by_state = $containers
        .filter( [ { id: 'todo-control' } ] )
      
        .map( function( _ ) {
          return {
              id: 'todo-state'
            , tag: 'ul'
            , $node: _.$node
            , attributes: { class: 'todo-state' }
          }
        } )
        
        .$to_dom()
        
        .flat_map( function( _ ) {
          var $ = _.$node;
          
          return [ 'open', 'complete' ]
            .map( function( v, i ) {
              return {
                  id: v
                , tag: 'li'
                , $node: $
                , label: v.charAt( 0 ).toUpperCase() + v.slice( 1 )
                , attributes: { class: v + ( v == 'open' ? ' active' : '' ) }
                , order: i
              }
            } )
          ;
        } )
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom()
        
        .$radio( { name: 'todo-state', selected: 'open' } )
        
        .map( function( _ ) {
          switch( _.id ) {
            case 'open':
              return { flow: 'todos', state: 1 };
            break;
            
            case 'complete':
              return { flow: 'todos', state: 2 };
            break;
          } // switch()
        } )
      ;
      
      // ----------------------------------------------------------------------------
      // todos list
      var $todo_list = source
        
        .filter( todos_by_state )
        
        .order( [ { id: 'timestamp' } ] )
        
        .alter( function( _ ) {
          var id = _.id;
          
          _.id = 'todo-' + id;
          _.tag = 'li';
          _.attributes = { class: 'todo-item' };
          _.todo_id = id;
        } )
        
        .optimize()
        
        .order( [ { id: 'timestamp' } ] )
        
        .$to_dom( $containers.filter( [ { id: 'todo-list' } ] ) )
        
        .flat_map( function( _ ) {
          var  $    = _.$node
            , id    = _.todo_id
            , state = _.state
            , content = [
                  { label: '<i class="icon-circle"></i>'      , class: 'open'    , value: 2 }
                , { label: '<i class="icon-check-circle"></i>', class: 'complete', value: 1 }
              ][ state - 1 ]
          ;
          
          return [
            {
                id: 'todo-control-' + id
              , tag: 'button'
              , $node: $
              , content: content.label
              , attributes: { type: 'button', class: 'button ' + content.class, value: content.value }
              , todo_id: id
              , order: 1
            },
            {
                id: 'todo-content-' + id
              , tag: 'span'
              , $node: $
              , content: _.text.replace( /\n/g, '<br />' )
              , attributes: { class: '' }
              , todo_id: id
              , order: 2
            }
          ]
        } )
       
        .optimize()
        
        .$to_dom()
        
        .set()
      ;
      
      // update ToDo list content
      var update_todo_text = $todo_list
        
        .filter( [ { tag: 'span' } ] )
        
        .$content_editable()
        
        .alter( function( _ ) {
          _.new_value = { text: _.content.replace( /<br\s*\/?>/, '\n' ) };
        } )
      ;
      
      // update todo : state and text content
      return $todo_list
        
        .filter( [ { tag: 'button' } ] )
        
        .$on( 'click' )
        
        .alter( function( _ ) {
          _.new_value = { state: _.$node.value };
        } )
        
        .union( [ update_todo_text ] )
        
        .fetch( source, [ { flow: 'todos', id: '.todo_id' } ] )
        
        // .trace( 'fetched' ) 
        
        .map( function( _ ) {
          var previous  = _.values[ 0 ]
            , new_value = extend( {}, previous, _.source.new_value )
          ;
          
          return { updates: [ [ previous, new_value ] ] }
        } )
        
        .emit_operations()
        
        .union( [ new_todo ] )
        
        .optimize()
      ;
    } ) // $todo_list()
  ;
} ); // module.export
