var rs = require( 'toubkal' )
  , users = rs
      .set( [
        { id: 1, name: 'Jean Vincent'   },
        { id: 2, name: 'Khalifa Nassik' },
        { id: 3, name: 'Samy Vincent'   },
      ] )
      
      .pass_through()
      
      .union( [] )
      
      .pick( [ 'id', 'name' ] )
      
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
source._add( [ { id: 36, query: [ { name: [ 'match', 'k', '||', 'match', [ 'RegExp', 's', 'i' ] ] } ] } ] );
//source._add( [ { id: 36, query: [ { id: [ '>', 1 ] } ] } ] );
