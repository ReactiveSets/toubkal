/*  
  todo-list-page.js
  -----------------
  
  Licence

*/

( this.undefine || require( 'undefine' )( module, require ) )()
( 'todo-list-page', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var extend = rs.RS.extend;
  
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
