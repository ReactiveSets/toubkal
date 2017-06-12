/*
    The MIT License (MIT)

    Copyright (c) 2013-2017, Reactive Sets

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'patch', [ [ 'JsDiff', 'diff' ], '../core' ], function( diff, rs ) {
  "use strict";
  
  var RS               = rs.RS
    , uuid_v4          = RS.uuid.v4
    , extend_2         = RS.extend._2
    , log              = RS.log.bind( null, 'patch' )
    , create_patch     = diff.createTwoFilesPatch
    , apply_patch      = diff.applyPatch
    , previous_value_s = 'previous_value'
  ;
  
  return rs // only compositions beyond this line
  
  /* --------------------------------------------------------------------------
    @pipelet create_patches( store, expression, options )
    
    @short Create a unified patch
    
    @parameters
    - **store** (@@class:Pipelet\): to diff source documents from.
    
    - **expression** (Object or Array): @@function:picker expression to
      lookup documents in *store*.
    
    - **options** (Object): optional @@lass:Pipelet options.
    
    @examples
    - Edit documents on a client, emitting modifications as patches to
      a server, exchanging modifications between all clients, if there is
      a merge conflict, documents stop updating:
    
    ```javascript
    // On clients
    var documents = rs.set();
    
    rs
      .socket_io_server()
      
      .flow( 'patches', { key: [ 'id', 'patch_id' ] } )
      
      .cache( { synchronizing: rs.socket_io_synchronizing() } )
      
      .pass_through( { tag: 'synchronizing' } )
      
      .patch( documents, [ 'id' ] )
      
      .set_flow( 'documents', { key: [ 'id' ] } )
      
      .through( documents )
      
      .editor( dom_container ) // emits updated documents when user clicks the save button
      
      .create_patches( documents, [ 'id' ] )
      
      .set_flow( 'patches' )
      
      .socket_io_server()
    ;
    
    // On the server
    var documents = rs.set()
      , patches
    ;
    
    patches = clients
      .flow( 'patches', { key: [ 'id', 'patch_id' ] } )
      
      .set()
    ;
    
    patches
      .patch( documents, [ 'id' ] )
      
      .set_flow( 'documents' )
      
      .through( documents )
    ;
    
    // route patches back to clients
    patches
      .through( clients )
    ;
    ```
    
    // serve patched documents, to allow downloading
    documents.serve( http_servers );
    
    @description
    This is a @@transactional, @@greedy pipelet.
    
    ### See Also
    - Pipelet patch()
    - Pipelet fetch_first()
    - Pipelet socket_io_server()
    - Pipelet cache()
    - Pipelet flow()
    - Pipelet set_flow()
    - Pipelet serve()
  */
  .Compose( 'create_patches', function( source, store, expression, options ) {
    return source
      .fetch_first( store, expression, previous_value_s )
      
      .alter( function( _ ) {
        var previous         = _[ previous_value_s ]
          , path             = _.path
          , previous_path    = previous && previous.path
          , next_path        = _.path = path || previous_path
          , previous_content = previous ? previous.content : ''
        ;
        
        _.patch_id = uuid_v4();
        _.patch_time = new Date();
        
        previous_path = previous_path ? 'a/' + previous_path : '/dev/null';
        
        _.patch = create_patch( previous_path, 'b/' + next_path, previous_content, _.content );
        
        delete _.content;
        delete _[ previous_value_s ];
      }, options )
  } ) // create_patches()
  
  .Compose( 'patch', function( source, store, expression, options ) {
    
    return source
      .fetch_first( store, expression, previous_value_s )
      
      .map( function( _ ) {
        var previous = _[ previous_value_s ]
          , patch    = _.patch
          , content  = apply_patch( previous && previous.content || '', patch )
          , next
        ;
        
        if ( content ) { // this is a valid patch
          next = extend_2( {}, previous || _ );
          
          next.content = content;
          next.path    = _.path || next.path
          
          delete next.patch;
          delete next.patch_id;
          delete next.patch_time;
          
          return previous
            ? { updates: [ [ previous, next ] ] }
            : { adds: [ next ] }
        } else
          log( options.name + ', cannot apply patch:', patch )// ToDo: emit error to global error dataflow
      } )
      
      .emit_operations()
  } ) // patch()
} );
