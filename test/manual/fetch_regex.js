var rs = require( 'toubkal' )
  , users = rs
      .set( [
        { id: 1, name: 'Jean Vincent'   },
        { id: 2, name: 'Khalifa Nassik' },
        { id: 3, name: 'Samy Vincent'   },
      ] )
      
      .pass_through()
      
      .trace( 'from set', { all: true } )
      
      .filter( [ { id: [ 'in', [ '$', [ 1, 2, 3 ] ] ] } ] )
      
      .union( [] )
      
      .pick( [ 'id', 'name', 'age' ] )
      
  , source = rs.pass_through()
;

source
  .fetch( users, function( v ) { return v.query } )
  .trace( 'fetched' )
  .greedy()
;

//source._add( [ { id: 34 } ] );
//source._add( [ { id: 35, query: [ { name: 'Jean Vincent' } ] } ] );
//source._add( [ { id: 36, query: [ { name: [ 'match', 'Jean Vincent' ] } ] } ] );
source._add( [ { id: 36, query: [ { id: [ '<=', 5 ], name: [ 'match', 'k', '||', [ '_', 'id' ], '<=', 3, '&&', 'match', [ 'RegExp', 's', 'i' ] ] } ] } ] );
//source._add( [ { id: 36, query: [ { id: [ '>', 1 ] } ] } ] );
