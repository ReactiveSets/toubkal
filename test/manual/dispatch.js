var rs     = require( 'toubkal' )
  , RS     = rs.RS
  , extend = RS.extend
  , de     = true
  , a      = rs.set( [ { id: 1, a: { a: true } } ] )
  , b      = rs.pass_through()
  , a_in   = a._input
  , b_in   = b._input
  
  , c      = a.debug( de && 'a', { all: true, pick: { id: '.id', a: '.a.a' } } )
  
              .dispatch( b.debug( de && 'b' ), function( a ) {
                return a.debug( de && 'in' )
              }, { branches_tag: 'branches tag', name: 'c', single: true } )
              
              //.pass_through()
              .debug( de && 'c', { tag: 'b' } )
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

// remove plus add in a transaction
b_in.listen( 1, [ { id: 2 } ], o_more )
b_in.listen( 0, [ { id: 2 } ], o_more )
b_in.listen( 0, [           ], o      )

//a_in.listen( 0, [           ], o      )
