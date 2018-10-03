var rs = require( 'toubkal' )

  , authorizations = rs.set( [ { id: [ '<=<', 1, 5 ] } ], { key: ['dummy'] } )
  
  , users_source = rs.pass_through()
  
  , users = users_source
      .set( [
        { id: 1, name: 'John Snape'   },
        { id: 2, name: 'Natalie Lee' },
        { id: 3, name: 'Jeremy De Souza'   },
      ] )
      
      .pass_through()
      
      //.trace( 'from set', { all: true } )
      
      .filter( authorizations )
      
      .union( [] )
      
      .pick( [ 'id', 'name', 'age' ] )
  
  , source = rs.pass_through()
;

users
  //.optimize()
  .trace( 'users' )
  .greedy()
;

source
  .fetch( users, function( v ) { return v.query } )
  .trace( 'fetched' )
  .greedy()
;

//source._add( [ { id: 34 } ] );
//source._add( [ { id: 35, query: [ { name: 'John Snape' } ] } ] );
//source._add( [ { id: 36, query: [ { name: [ 'match', 'John Snape' ] } ] } ] );
source._add( [ { id: 36, query: [ { id: [ '<=', 5 ], name: [ 'match', 'k', '||', [ '_', 'id' ], '<=', 3, '&&', 'match', [ 'RegExp', 's', 'i' ] ] } ] } ] );
//source._add( [ { id: 36, query: [ { id: [ '>', 1 ] } ] } ] );

users_source._add( [ { id: 4, name: 'Jack London' } ] )

// authorizations._remove( [ { id: [ '<=<', 1, 5 ] } ] );
authorizations._update( [ [ { id: [ '<=<', 1, 5 ] }, { id: [ 'in_set', '<<=', 1, 2, '<<=', 3, 5 ] } ] ] )
