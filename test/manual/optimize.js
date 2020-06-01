require( 'toubkal' )
  
  .once( 1 ) // delay 1 milisecond to emit operation after initial fetch
  
  .map( function( _ ) {
    return {
      removes: [
        { id: 1 }, // will be emitted in remove operation
        { id: 2 }  // will not be emitted because it is added back in adds below
      ],
      
      updates: [
        [ { id: 3       }, { id: 4       } ], // will be split into remove { id: 3 } and add { id: 4 } because values identities are different
        [ { id: 5       }, { id: 5       } ], // will be optimized-out because there are no changes
        [ { id: 6, v: 0 }, { id: 6, v: 1 } ]  // will be emitted in an update because it has the same identity and has changes
      ],
      
      adds: [
        { id: 2 }, // not emitted because it is removed in removes above
        { id: 7 }
      ]
    }
  } )
  
  .emit_operations() // emits un-optimized operations from above map
  
  .set_reference( 'operations' )
  
  .optimize() // emit optimized operations
  
  .trace( 'operations', { fetched: false } ).greedy()
  
  .reference( 'operations' )
  
  .optimize( { emit_transactions: true } ) // emit optimized transaction in one add
  
  .trace( 'transactions', { fetched: false } ).greedy()
;
