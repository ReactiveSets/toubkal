var rs     = require( 'toubkal/lib/core' )
  , RS     = rs.RS
  , log    = RS.log
  , pretty = log.pretty
;

[ 0, 1, 2, 3, 4, 5, 6 ]
  .forEach( function( n ) {
    return rs.Singleton( 'singleton_' + n, function( source, options ) {
      
      return source.set(
        [
          { flow: 'flow_' + n, id: n }
        ],
        
        { name: 'set ' + n }
      )
      
      .delay( n * 50 )
      
      //.debug( n == 6, 'set ' + n, { all: true } )
    } );
  } )
;

rs
  .union( [
    rs.singleton_3().pass_through(),
    rs.singleton_0(),
    rs.union( [
      rs.singleton_6()
    ] )
  ] )
  
  .union( [
    
    rs.union( [
      rs.singleton_5().singleton_1(),
      rs.union(),
      rs.union( [ rs.singleton_3().singleton_2() ] )
    ] ),
    
    rs.union( [
      rs.singleton_3()
    ] )
  ] )
  
  .set_reference( 'outer' )
  
  .trace( 'outer union' )
  
  //.emit_transactions( { _transactional: false } )
  //.set( [], { _no_flush: true } )
  .store()
  
  .trace( 'outer store' )
  
  .greedy()
  
  .api.on( "complete", function() {
    var all_values = [];
    
    this._fetch( function( values, no_more ) {
      [].push.apply( all_values, values );
      
      no_more && log( 'all store values', pretty( all_values ) )
    } )
  } )
;

setTimeout( function() {
  rs.reference( 'outer' )._input._add_source( rs.singleton_4()._output )
}, 100 )
