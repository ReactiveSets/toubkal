var input = require( "toubkal" )
  
  .aggregate( [], [], { sticky_groups: [ {} ] } )
;

input.trace().greedy();
  
input._remove( [ {}, {}, {} ] );

input._add( [ {}, {} ] );

input._add( [ {} ] );

input._add( [ {}, {} ] );
  
input._remove( [ {}, {} ] );
