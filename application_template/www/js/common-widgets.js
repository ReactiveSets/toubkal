/*  
  common-widgets.js
  -----------------
  
  Licence
  
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'common-widgets', [ [ 'rs', 'toubkal' ] ], function( rs ) {
  "use strict";
  
  var RS = rs.RS
    , extend    = rs.RS.extend
    , has_class = RS.has_class
  ;
  
  return rs
    
    /*-------------------------------------------------------------------------
      @pipelet $radio( options )
      
      @short Build a radio control widget
      
      @source
      Must be a dataflow of DOM elements.
      
      @emits selected value
      
      @parameters
      - options (Object):
       - radio_name(String): radio input name attribute, default is: radio
       - selected  (String): id of the default selected value, default is: undefined
    
    */
    .Compose( '$radio', function( $nodes, options ) {
      options = extend( {}, options, { radio_name: 'radio' } );
      
      // default state
      var state = [];
      
      options.selected && state.push( { id: options.selected } );
      
      // output
      var output = $nodes
        .namespace()
        
        .set( state )
        
        .union()
      ;
      
      // radio control:
      // - build label and input radio
      // - get radio input changes
      var $radio_changes = $nodes
        .flat_map( function( _ ) {
          var id = _.id
            , $  = _.$node
            , checked = id == options.selected ? { checked: true } : {}
          ;
          
          return [
            {
                id: id + '-radio'
              , tag: 'input'
              , $node: $
              , attributes: extend( { name: options.radio_name || 'radio', type: 'radio', value: id }, checked )
            },
            {
                id: id + '-label'
              , tag: 'label'
              , $node: $
              , content: _.label || id
              , attributes: { for: id + '-radio' }
            },
          ]
        } )
        
        .$to_dom()
        
        .set()
        
        .filter( [ { tag: 'input' } ] )
        
        .$on( 'change' )
      ;
      
      // toggle class active from previous to current selected $node
      var $previous_$current = $radio_changes
        
        .fetch( $nodes.set() )
        
        .flat_map( function( _ ) {
          var $values = _.values;
          
          var $previous = $values
            .filter( function( elem ) {
              return has_class( elem.$node, 'active' );
            } )
          ;
          
          return $values
            .filter( function( elem ) {
              return elem.id == _.source.attributes.value
            } )
            
            .map( function( elem ) {
              return extend( { is_active: true }, elem );
            } )
            
            .concat( $previous )
          ;
        } )
      ;
      
      // remove class active from previous selected node
      $previous_$current
        .$has_class( 'active' )
        
        .$remove_class( 'active' )
      ;
      
      // add class active to current selected node
      $previous_$current
        .filter( [ { is_active: true } ] )
        
        .$add_class( 'active' )
      ;
      
      // update output state
      $radio_changes
        
        .fetch( output.set() )
        
        .map( function( _ ) {
          return {
            updates: [ [ _.values[ 0 ], { id: _.source.$node.value } ] ]
          }
        } )
        
        .emit_operations()
        
        .through( output )
      ;
      
      return output.set();
    } ) // $radio()
    /*-------------------------------------------------------------------------
      @pipelet $content_editable( options )
      
      @short Make a DOM element editable
      
      @source
      Must be a dataflow of DOM elements.
      
      @emits new content
      
      @parameters
      - options (Object):
    
    */
    .Compose( '$content_editable', function( $nodes, options ) {
      var $elems = $nodes
        
        .alter( function( _ ) {
          _.$node.setAttribute( 'contenteditable', true );
          _.$node.setAttribute( 'class', 'content-editable' );
        } )
        
        .greedy()
      ;
      
      // emits new value when pressing Enter key
      $elems
        .$on( 'keypress' )
        
        .map( function( _ ) {
          var $e = _.$event;
          
          if( $e.key == 'Enter' && !$e.ctrlKey && !$e.shiftKey && !$e.altKey )
            $e.target.blur()
          ;
        } )
      ;
      
      return $elems
        .$on( 'blur' )
        
        .map( function( _ ) {
          var previous_content = _.content
            , new_content      = _.$event.target.innerText
          ;
          
          if( new_content && new_content != previous_content ) {
            return extend( {}, _, { content: new_content } );
          }
        } )
      ;
    } ) // $content_editable()
    
    /*-------------------------------------------------------------------------
      @pipelet strategies_or_profile( options )
      
      @short Passport client authentication
      
      @source
      Must be directly connected to the server with no cache.
      
      @description
      Gets passport login strategies and build an authentication menu
      
      @emits
      - user: if user is logged-in
      - strategies: if not logged-in
      
      @parameters
      - options (Object):
        - strategies_flow(String): the passport login strategies flow name,
          default is 'login_strategies'
        - user_flow      (String): the authenticated user flow name, default
          is 'profile'
      
      @examples
      ```javascript
        rs
          .socket_io_server()
          
          .strategies_or_profile( { user_flow: 'users', strategies_flow: 'login_strategies' } )
          
          .map( function( v ) {
            var o = {};
            
            if( v.flow === 'authenticated_user' ) {
              // if it's authenticated -> display first/last name
              return { tag: 'div', id: v.id, content: v.first_name + ' ' + v.last_name }
            } else {
              // display login strategies
              
              v.content.map( function( c ) {
                return { tag: 'div', id: c.id, content: 'Login with ' + c.display_name }
              } );
            }
          } )
          
          .$to_dom()
        ;
      ```
    */
    .Compose( 'strategies_or_profile', function( server, options ) {
      var rs              = server.namespace()
        , strategies_flow = options && options.strategies_flow || 'login_strategies'
        , user_flow       = options && options.user_flow       || 'profile'
      ;
      
      return server
        .filter( [ { flow: user_flow }, { flow: strategies_flow } ] )
        
        .group( function() {
          return { id: 1 }
        } )
        
        .map( function( _ ) {
          var content = _.content
            , strategies = _.content.filter( function( v ) { return v.flow === 'login_strategies' } )
            , profile    = _.content.filter( function( v ) { return v.flow === 'profile'          } )
          ;
          
          return profile.length ? profile[ 0 ] : { id: strategies_flow, flow: strategies_flow, strategies: strategies }
        }, { _t_postfix: 'strategies_or_profile' } )
        
        .cache( { synchronizing: rs.socket_io_synchronizing() } )
        
        .pass_through( { tag: 'synchronizing' } )
      ;
    } ) // strategies_or_profile()
  ;
} );
