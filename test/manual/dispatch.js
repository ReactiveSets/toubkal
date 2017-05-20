var rs     = require( 'toubkal' )
  , RS     = rs.RS
  , uuid   = RS.uuid.v4
  , extend = RS.extend
  , de     = false
  , a      = rs.set( [ { id: 1, a: { a: true } } ] )
  , b      = rs.pass_through()
  , a_in   = a._input
  , b_in   = b._input
  
  , c      = a.debug( 1, 'a', { pick: { id: '.id', a: '.a.a' } } )
  
              .dispatch( b.debug( 1, 'b' ), function( a ) {
                return a.debug( de, 'in' )
              }, { name: 'c', single: de } )
              
              //.pass_through()
              .debug( 1, 'c-trace', { tag: 'b' } )
              .greedy()
              
  , forks  //= [ 'b' ]
  , t      = { id: 'add to b', forks: forks }
  , o      = { _t: t }
  , t_more = extend( {}, t, { more: true } )
  , o_more = { _t: t_more }
;

c.greedy();

// add in a transaction
b_in.listen( 0, [ { id: 2 } ], o_more )
b_in.listen( 0, [           ], o      )

t_more.id = t.id = uuid();

// remove plus add in a transaction
b_in.listen( 1, [ { id: 2 } ], o_more )
b_in.listen( 0, [ { id: 2 }, { id: 3 } ], o )
//b_in.listen( 0, [ { id: 2 } ], o_more )
//b_in.listen( 0, [], o )

//a_in.listen( 0, [], o )

RS.log( RS.log.pretty( c._input.source.source.transactions ) )
