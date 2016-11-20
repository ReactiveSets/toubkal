var rs = require( 'toubkal' );

var friends = [
  [ 1, 2 ],
  [ 1, 3 ],
  [ 1, 4 ],
  [ 1, 5 ],
  
  [ 2, 1 ],
  [ 2, 3 ],
  [ 2, 4 ],
  [ 2, 6 ],
  [ 2, 7 ],
  
  [ 3, 1 ],
  [ 3, 2 ],
  [ 3, 6 ],
  [ 3, 8 ],
  
  [ 4, 1 ],
  [ 4, 2 ],
  
  [ 5, 1 ],
  [ 5, 7 ],
  [ 5, 9 ],
  
  [ 6, 2 ],
  [ 6, 3 ],
  [ 6, 7 ],
  [ 6, 9 ],
  
  [ 7, 2 ],
  [ 7, 5 ],
  [ 7, 6 ],
  [ 7, 10 ],
  
  [ 8, 3 ],
  [ 8, 10 ],
  
  [ 9, 5 ],
  [ 9, 6 ],
  
  [ 10, 7 ],
  [ 10, 8 ]
];

friends = friends
  .map( function( friend ) { return { id: friend[ 0 ], friend_id: friend[ 1 ] } } )
;

friends = rs
  .set( friends, { key: [ 'id', 'friend_id' ], fork_tag: 'friends' } )
  
  //.trace( 'friends' )
;

var friends_of_friends = friends
  .join( friends, [ [ 'friend_id', 'id' ] ],
    function(  user, friend ) {
      console.log( user.id, friend.friend_id )
      
      return {
        id: user.id,
        friend_of_friend_id: friend.friend_id
      }
    },
    
    { key: [ 'id', 'friend_of_friend_id' ], _no_filter: true, concurrent: { 'friends': true } }
  )
  
  .unique( [], { tag : 'firends' } )
  
  //.filter( [ { id: 10 } ] )
  
  .trace( 'friends_of_friends' ).greedy()
;

friends._add( [
  { id: 7, friend_id: 3 },
  { id: 3, friend_id: 7 }
] );

friends._add( [
  { id: 4 , friend_id: 10 },
  { id: 10, friend_id: 4  }
] );

