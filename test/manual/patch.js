var diff             = require( 'diff' )
  , diff_lines       = diff.diffLines
  , diff_array       = diff.diffArrays
  , create_patch     = diff.createPatch
  , structured_patch = diff.structuredPatch
  
  , newline    = "\n"
  
  , x = add_newlines( [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "the",
      "big",
      "cat",
      "runs",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "the",
      "big",
      "cat",
      "runs"
    ] )
  
  , y = add_newlines( [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "the",
      "small",
      "cat",
      "is",
      "hungry",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "the",
      "small",
      "cat",
      "is",
      "hungry"
    ] )
  
  , lines  = diff_lines( x.join( '' ), y.join( '' ), { _newlineIsToken: true } )
  , arrays = diff_array( x, y )
  , patch  = create_patch( 'x-y', x.join( '' ), y.join( '' ), 'old header', 'new header', { context: 2 } )
  , s_patch = structured_patch( 'x', 'y', x.join( '' ), y.join( '' ), Date(), Date() )
;

console.log( lines );
console.log( arrays );
console.log( patch );
console.log( pretty( s_patch ) );

function add_newlines( x ) { return x.map( function( _ ) { return _ + newline } ) }

function pretty( _ ) { return JSON.stringify( _, null, '  ' ) }

var rs    = require( "../../lib/common/patch.js" )
  , a     = rs.set( [ { id: 1, path: 'test', content: x.join( '' ) } ] )
  , b     = rs.trace( 'b' )
  , patch = b.create_patches( a, [ 'id' ] ).trace( 'patches' )
  , c     = patch.patch( a.set(), [ 'id' ] ).trace( 'c' ).greedy()
  , none  = b.create_patches( rs.set(), [ 'id' ] ).trace( 'patches none' )
  , d     = none.patch( rs.set(), [ 'id' ] ).trace( 'd' ).greedy()
;

b._add( [ { id: 1, path: 'new_name', content: y.join( '' ) } ] );
