var input = require( "toubkal" )
  
  .aggregate( [], [], { initial_groups: [ {} ] } )
;

input.trace().greedy();
  
input._remove( [ {}, {}, {} ] );

input._add( [ {}, {} ] );

input._add( [ {} ] );

input._add( [ {}, {} ] );
  
input._remove( [ {}, {} ] );
