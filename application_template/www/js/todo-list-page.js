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
      @pipelet $todo_list_page( $selector, options )
      
      @short ToDo list app
      
      @source dataflows
      - todos
      - url_route
      
      @emits new or updated todos
      
      @parameters
      - $selector(String/Object/Pipelet): DOM element where to display data
      - options                 (Object): optional object
    */
    .Compose( '$todo_list_page', function( source, $page, options ) {
      var rs = source.namespace();
      
      // ----------------------------------------------------------------------------
      // ToDos states count: 
      var states_counts = source
        .flow( 'todos' )
        
        .aggregate( [ { id: 'complete' } ], [], { sticky_groups: [ {} ] } )
        
        .alter( function( _ ) {
          _.remaining = _._count - _.complete
          
          _.flow = 'states-counts';
        } )
      ;
      
      // ----------------------------------------------------------------------------
      // Page elements
      var footer = states_counts
        .filter( [ { _count: [ '>', 0 ] } ] )
        
        .pick( {
            id: 'todo-footer'
          , tag: 'footer'
          , attributes: { class: 'footer' }
          , order: 3
        } )
        
        .optimize()
      ;
      
      var $elements = rs
        .set( [
            {
                id: 'todo-header'
              , tag: 'header'
              , content: '<h1>todo</h1>'
              , attributes: { class: 'header' }
              , order: 1
            },
            {
                id: 'todo-content'
              , tag: 'section'
              , attributes: { class: 'main' }
              , order: 2
            }
        ] )
        
        .union( [ footer ] )
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom( $page )
        
        .set()
      ;
      
      // ----------------------------------------------------------------------------
      // header:
      // - new ToDo
      var new_todo = rs.$new_todo( $elements.filter( [ { id: 'todo-header' } ] ) );
      
      // ----------------------------------------------------------------------------
      // section: ToDo content
      // - toggle all control
      // - ToDo list
      var update_todos = source
        
        .union( [ states_counts ] )
        
        .$todo_content( $elements.filter( [ { id: 'todo-content' } ] ) )
      ;
      
      // ----------------------------------------------------------------------------
      // ToDo footer: 
      // - display active ToDos count
      // - display filters
      // - clear completed ToDos
      var clear_completed = source
        
        .union( [ states_counts ] )
        
        .$todo_footer( $elements.filter( [ { id: 'todo-footer' } ] ) )
      ;
      
      return rs
        .union( [ new_todo, update_todos, clear_completed ] )
      ;
    } )
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $new_todo( $selector, options )
      
      @short Creates input and emits new ToDo
      
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
                , complete: 0
              }
            ;
          }
        } )
        
        .timestamp()
      ;
    } ) // $new_todo()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_content( $selector, options )
      
      @description ToDos content section
      - toggle all ToDos state ( all to completed or active )
      - display ToDos list
      
      @emits updates ToDos state and text
      
      @parameters
      - $selector(Pipelet): DOM element where to display content
      - options   (Object): optional object
    */
    .Compose( '$todo_content', function( source, $selector, options ) {
      // toogle all checked state
      var input = source
        
        .filter( [ { flow: 'states-counts', _count: [ '>', 0 ] } ] )
        
        .flat_map( function( _ ) {
          var checked = _._count == _.complete ? { checked: true } : {};
          
          return [
            {
                id: 'toggle-all'
              , tag: 'input'
              , attributes: extend( {}, checked, { type: 'checkbox', class: 'toggle-all' } )
              , order: 1
            },
            {
                id: 'toggle-all-label'
              , tag: 'label'
              , content: 'Mark all as complete'
              , attributes: { for: 'toggle-all' }
              , order: 2
            }
          ]
        } )
        
        .optimize()
      ;
      
      // content items
      var $items = source
        .namespace()
        
        .set( [
          {
              id: 'todo-list'
            , tag: 'ul'
            , attributes: { class: 'todo-list' }
            , order: 3
          },
        ] )
        
        .union( [ input ] )
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom( $selector )
        
        .set()
      ;
      
      // toogle all control: update all ToDos state to complete or uncomplete
      var toggle_all = source.$toggle_all( $items.filter( [ { id: 'toggle-all' } ] ) );
      
      // ToDo list: update ToDo text and state
      return source
        .$todo_list( $items.filter( [ { id: 'todo-list' } ] ) )
        
        .union( [ toggle_all ] )
      ;
    } ) // $todo_content()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_footer( $selector, options )
      
      @short Toggles all ToDos state ( all active or uncomplete )
      
      @emits updates ToDos state
      
      @parameters
      - $selector(Pipelet): DOM element where to display data
      - options   (Object): optional object
    */
    .Compose( '$todo_footer', function( source, $selector, options ) {
      var filters = source
        .flow( 'url_route' )
        
        .map( function( _ ) {
          var query = _.query
            , route = _.hash || '#/'
            , state = query && query.state || 'all'
          ;
          
          return {
              id: 'filters'
            , tag: 'ul'
            , attributes: { class: 'filters' }
            , order: 1
            , content: [ 'all', 'active', 'completed' ]
                .map( function( s ) {
                  var li = '<li><a href="' + route;
                  
                  s != 'all' && ( li += '?state=' + s );
                  
                  li += '"';
                  
                  s == state && ( li += ' class="selected"' );
                  
                  return li += '>' + s.charAt( 0 ).toUpperCase() + s.slice( 1 ) + '</li>';
                } )
                
                .join( '' )
          }
        } )
      ;
      
      return source
        
        .flow( 'states-counts' )
        
        .flat_map( function( _ ) {
          var l = _.remaining
            , s = l != 1 ? 's' : ''
          ;
          
          var values = [ {
              id: 'todo-count'
            , tag: 'span'
            , content: '<strong>' + l + '</strong> item' + s + ' left'
            , attributes: { class: 'todo-count' }
            , order: 0
          } ];
          
          _.complete && values.push( {
              id: 'clear-completed'
            , tag: 'button'
            , content: 'Clear completed'
            , attributes: { class: 'clear-completed' }
            , order: 2
          } );
          
          return values;
        } )
        
        .union( [ filters ] )
        
        .order( [ { id: 'order' } ] )
        
        .$to_dom( $selector )
        
        .set()
        
        .filter( [ { id: 'clear-completed' } ] )
        
        .$on( 'click' )
        
        .fetch( source, { flow: 'todos', complete: 1 } )
        
        .map( function( _ ) {
          return { removes: _.values }
        } )
        
        .emit_operations()
        
        .optimize()
      ;
    } ) // $todo_footer()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $toggle_all( $checkbox, options )
      
      @short Force all todos state according to toggle checkbox
      
      @emits todos updates
      
      @parameters
      - $checkbox (Pipelet): Checkbox element 
      - options   (Object): optional, for output pipelet map()
    */
    .Compose( '$toggle_all', function( source, $checkbox, options ) {
      return $checkbox
        .$on( 'change' )
        
        .fetch( source, function( _ ) {
          return [ { flow: 'todos', complete: +!_.$node.checked } ]
        } )
        
        .map( function( fetched ) {
          return { updates : fetched.values.map( update ) }
          
          function update( todo ) {
            return [ todo, extend( {}, todo, { complete: todo.complete ^ 1 } ) ]
          }
        }, options )
        
        .emit_operations()
      ;
    } ) // $toggle_all()
    
    /*---------------------------------------------------------------------------------------------------------------------
      @pipelet $todo_list( $selector, options )
      
      @short Toggles all ToDos state ( all active or uncomplete )
      
      @emits updates ToDos state
      
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
          var query = _.query
            , state = query && query.state || 'all'
          ;
          
          switch( state ) {
            case 'active':
              return { flow: 'todos', complete: 0 };
            break;
            
            case 'completed':
              return { flow: 'todos', complete: 1 };
            break;
            
            case 'all':
              return { flow: 'todos' };
            break;
          }
        } )
        
        .set()
      ;
      
      // ToDos filtered by state
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
          
          _.id = 'todo-' + _.id
          
          _.tag = 'li';
          
          _.attributes = {
            class: 'todo' 
              + ( _.complete ? ' completed' : '' )
              + ( _.editing  ? ' editing'   : '' )
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
                // extend( _.editing ? { autofocus: true } : {}, { class: 'edit', type: 'text', value: _.text } )
                , attributes: { class: 'edit', type: 'text', value: _.text } 
              }
            ].map( function( v ) {
              return extend( {}, _, v );
            } )
          ;
        } )
        
        .$to_dom()
        
        .set()
      ;
      
      // work-around to set focus on input in editing mode
      $li_items
        .filter( [ { tag: 'input', editing: true } ] )
        
        .adds()
        
        .alter( function( _ ) {
          var $ = _.$node
            , l = $.value.length
          ;
          
          $.focus();
          
          $.setSelectionRange( l, l );
        } )
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
                  _.complete ? { checked: true } : {}
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
      
      // remove todo
      var remove_todo = $view_items
        .filter( [ { tag: 'button' } ] )

        .$on( 'click' )
        
        .fetch( todos, { flow: 'todos', id: '.todo_id' } )
        
        .map( function( _ ) {
          return _.values[ 0 ];
        } )
        
        .revert()
      ;
      
      // update ToDo state
      var $toggle_state = $view_items
        .filter( [ { tag: 'input' } ] )
        
        .$on( 'change' )
        
        .alter( function( _ ) {
          _.new_value = { complete: +_.$node.checked }
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
        
        .union( [ remove_todo ] )
        
        .optimize()
      ;
    } ) // $todo_list()
  ;
} ); // module.export
