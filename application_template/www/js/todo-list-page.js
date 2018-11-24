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
    , uuid_v4   = RS.uuid.v4
  ;
  
  return rs
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $new_todo( $selector, options )
      
      @short Creates input and emits new todo
      
      @emits new todos
      
      @parameters
      - $selector(Pipelet): DOM element where to display data
      - options   (Object): optional object
    */
    .Compose( '$new_todo', function( source, $selector, options ) {
      return source
        .namespace()
        
        .set( [
          {
              id: 'new-todo'
            , tag: 'input'
            , attributes: {
                  type: 'text'
                , class: 'new-todo'
                , placeholder: 'What needs to be done?'
              }
          }
        ] )
        
        .$to_dom( $selector )
        
        .$on( 'keypress' )
        
        .map( function( _ ) {
          var $e = _.$event;
          
          if( $e.key == 'Enter' && !$e.ctrlKey && !$e.shiftKey && !$e.altKey ) {
            var $ = _.$node, value = $.value;
            
            // reset content
            $.value = '';
            
            if( value )
              return {
                  flow: 'todos'
                , id: uuid_v4()
                , text: value
                , state: 1
              }
            ;
          }
        } )
        
        .timestamp()
      ;
    } ) // $new_todo()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $toggle_all( $checkbox, options )
      
      @short Toggles all todos state ( all active or uncomplete )
      
      @emits updates todos state
      
      @parameters
      - $checkbox(Pipelet): Checkbox element 
      - options   (Object): optional object
    */
    .Compose( '$toggle_all', function( source, $checkbox, options ) {
      return $checkbox
        .$on( 'change' )
        
        .fetch( source, { flow: 'todos' } )
        
        .map( function( _ ) {
          var checked = _.source.$node.checked;
          
          return {
            updates: _.values
              .slice()
              
              .map( function( todo ) {
                if( checked && todo.state == 1 ) {
                  return [ todo, extend( {}, todo, { state: 2 } ) ];
                } else if( !checked && todo.state == 2 ) {
                  return [ todo, extend( {}, todo, { state: 1 } ) ];
                }
              } )
          }
        } )
        
        .emit_operations()
        
        .optimize()
      ;
    } ) // $toggle_all()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_content( $selector, options )
      
      @short Toggles all todos state ( all active or uncomplete )
      
      @emits updates todos state
      
      @parameters
      - $selector(Pipelet): DOM element where to display data
      - options   (Object): optional object
    */
    .Compose( '$todo_content', function( source, $selector, options ) {
      // toogle all checked state
      var input = source
        .flow( 'todos' )
        
        .group( function() {
          return { id: 'toggle-all' }
        }, { initial_groups: [ { id: 'toggle-all' } ] } )
        
        .map( function( _ ) {
          var attributes = extend(
            _.content.every( function( v ) { return v.state == 2 } ) ? { checked: true } : {},
            { type: 'checkbox', class: 'toggle-all' }
          );
          
          return {
              id: _.id
            , checked: _.content.every( function( v ) { return v.state == 2 } )
            , tag: 'input'
            , attributes: attributes
            , order: 1
          }
        } )
      ;
      
      // content items
      var $items = source
        .namespace()
        
        .set( [
          {
              id: 'toggle-all-label'
            , tag: 'label'
            , content: 'Mark all as complete'
            , attributes: { for: 'toggle-all' }
            , order: 2
          },
          {
              id: 'todo-list'
            , tag: 'ul'
            , attributes: { class: 'todo-list' }
            , order: 3
          },
        ] )
        
        .union( [ input ] )
        
        .optimize()
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom( $selector )
        
        .set()
      ;
      
      // toogle all control: update all todos state to complete or uncomplete
      var toggle_all = source.$toggle_all( $items.filter( [ { id: 'toggle-all' } ] ) ).trace( 'toggle all' );
      
      // todo list: update todo text and state
      return source
        .$todo_list( $items.filter( [ { id: 'todo-list' } ] ) )
        
        .union( [ toggle_all ] )
      ;
    } ) // $todo_content()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_footer( $selector, options )
      
      @short Toggles all todos state ( all active or uncomplete )
      
      @emits updates todos state
      
      @parameters
      - $selector(Pipelet): DOM element where to display data
      - options   (Object): optional object
    */
    .Compose( '$todo_footer', function( source, $selector, options ) {
      var filters = source
        .flow( 'url_route' )
        
        .map( function( _ ) {
          var state = _.query.state || 'all';
          
          return {
              id: 'filters'
            , tag: 'ul'
            , attributes: { class: 'filters' }
            , order: 1
            , content: [ 'all', 'active', 'completed' ]
                .map( function( s ) {
                  var li = '<li><a href="#/todo_list';
                  
                  s != 'all' && ( li += '?state=' + s );
                  
                  li += '"';
                  
                  s == state && ( li += ' class="selected"' );
                  
                  return li += '>' + s.charAt( 0 ).toUpperCase() + s.slice( 1 ) + '</li>';
                } )
                
                .join( '' )
          }
        } )
      ;
      
      var $footer = source
        .namespace()
        
        .set( [
            { id: 'todo-count', tag: 'span', attributes: { class: 'todo-count' }, order: 0 },
            {
                id: 'clear-completed'
              , tag: 'button'
              , content: 'Clear completed'
              , attributes: { class: 'clear-completed' }
              , order: 2
            }
        ] )
        
        .union( [ filters ] )
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom( $selector )
      ;
    } ) // $todo_footer()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_list( $selector, options )
      
      @short Toggles all todos state ( all active or uncomplete )
      
      @emits updates todos state
      
      @parameters
      - options (Object): optional object
    */
    .Compose( '$todo_list', function( source, $selector, options ) {
      // editing class
      var editing_class = source.namespace().union();
      
      // ----------------------------------------------------------------------------
      // Todo list: update todos state and text
      var by_state = source
        .flow( 'url_route' )
        
        .map( function( _ ) {
          var state = _.query.state || 'all';
          
          switch( state ) {
            case 'active':
              return { flow: 'todos', state: 1 };
            break;
            
            case 'completed':
              return { flow: 'todos', state: 2 };
            break;
            
            case 'all':
              return { flow: 'todos' };
            break;
          }
        } )
        
        .set()
      ;
      
      // todos filtered by state
      var todos = source
        
        .filter( by_state )
        
        .optimize()
      ;
      
      // ----------------------------------------------------------------------------
      // li
      var $li_items = todos
        .join( editing_class
          , [ 'id' ]
          , function( todo, editing ) {
              return extend( { editing: !!editing }, todo )
            }
          , { left: true, no_filter: true }
        )
        
        .alter( function( _ ) {
          _.todo_id = _.id;
          
          _.tag = 'li';
          
          _.attributes = {
            class: 'todo' 
              + ( _.state == 2 ? ' completed' : '' )
              + ( _.editing    ? ' editing'   : '' )
          }
        } )
        
        .optimize()
        
        .order( [ { id: 'timestamp' } ] )
        
        .$to_dom( $selector )
        
        .flat_map( function( _ ) {
          var id = _.todo_id;
          
          return [
              { 
                  id: 'view-' + id
                , tag: 'div'
                , attributes: { class: 'view' }
              },
              {
                  id: 'input-' + id
                , tag: 'input'
                , attributes: extend(
                    _.editing ? { autofocus: true } : {},
                    { class: 'edit', type: 'text', value: _.text }
                  )
              }
            ].map( function( v ) {
              return extend( {}, _, v );
            } )
          ;
        } )
        
        .$to_dom()
        
        .set()
      ;
      
      // ----------------------------------------------------------------------------
      // li items
      var $view_items = $li_items
        .filter( [ { tag: 'div' } ] )
        
        .flat_map( function( _ ) {
          var id = _.todo_id
            , $  = _.$node
          ;
          
          return [
            {
                id: 'toggle-' + id
              , tag: 'input'
              , $node: $
              , attributes: extend(
                  { type: 'checkbox', class: 'toggle' },
                  _.state == 2 ? { checked: true } : {}
                )
              , todo_id: id
            },
            {
                id: 'label-' + id
              , tag: 'label'
              , $node: $
              , content: _.text
              , todo_id: id
            },
            {
                id: 'button-' + id
              , tag: 'button'
              , $node: $
              , attributes: { class: 'destroy' }
              , todo_id: id
            }
          ]
        } )
        
        .$to_dom()
        
        .set()
      ;
      
      // update todo state
      var $toggle_state = $view_items
        .$on( 'change' )
        
        .alter( function( _ ) {
          _.new_value = { state: _.$node.checked ? 2 : 1 }
        } )
      ;
      
      // toggle class editing
      // add editing class on label double click
      $view_items
        .filter( [ { tag: 'label' } ] )
        
        .$on( 'dblclick' )
        
        .map( function( _ ) {
          return { id: _.todo_id }
        } )
        
        .through( editing_class )
      ;
        
      // remove editing class on key Enter
      var $input = $li_items.filter( [ { tag: 'input' } ] );
      
      $input
        .$on( 'keydown' )
        
        .map( function( _ ) {
          var $e = _.$event;
          
          if( $e.key == 'Escape' || $e.key == 'Tab' || ( $e.key == 'Enter' && !$e.ctrlKey && !$e.shiftKey && !$e.altKey ) )
            _.$node.blur()
          ;
        } )
      ;
      
      var $input_blur = $input.$on( 'blur' );
      
      $input_blur
        .pick( { id: '.todo_id' } )
        
        .revert()
        
        .through( editing_class )
      ;
      
      return $input_blur
        .map( function( _ ) {
          var value = _.$node.value;
          
          if( _.text != value )
            return extend( { new_value: { text: value } }, _ );
          ;
        } )
        
        .union( [ $toggle_state ] )
        
        .fetch( todos, { flow: 'todos', id: '.todo_id' } )
        
        .map( function( _ ) {
          var previous = _.values[ 0 ];
          
          
          return {
            updates: [ [ previous, extend( {}, previous, _.source.new_value ) ] ]
          }
        } )
        
        .emit_operations()
        
        .optimize()
      ;
    } ) // $todo_list()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_list_page( $selector, options )
      
      @short ToDo list app
      
      @source dataflow 'todos'
      
      @emits new or updated todos
      
      @parameters
      - $selector(String/Object/Pipelet): DOM element where to display data
      - options                 (Object): optional object
    */
    .Compose( '$todo_list_page', function( source, $page, options ) {
      var rs = source.namespace();
      
      // ----------------------------------------------------------------------------
      // Page elements
      var $elements = rs
        .set( [
          {
              id: 'todo-header'
            , tag: 'header'
            , content: '<h1>todo</h1>'
            , attributes: { class: 'header' }
          },
          {
              id: 'todo-content'
            , tag: 'section'
            , attributes: { class: 'main' }
          },
          {
              id: 'todo-footer'
            , tag: 'footer'
            , attributes: { class: 'footer' }
          }
        ] )
        
        .$to_dom( $page )
        
        .set()
      ;
      
      // ----------------------------------------------------------------------------
      // header: new ToDo
      var new_todo = rs.$new_todo( $elements.filter( [ { id: 'todo-header' } ] ) );
      
      // ----------------------------------------------------------------------------
      // section: todo content
      // - toggle all control
      // - ToDo list
      var update_todos = source.$todo_content( $elements.filter( [ { id: 'todo-content' } ] ) );
      
      // ----------------------------------------------------------------------------
      // ToDo footer
      source.$todo_footer( $elements.filter( [ { id: 'todo-footer' } ] ) );
      
      return rs
        .union( [ new_todo, update_todos ] )
      ;
    } )
  ;
} ); // module.export
