var rs = require( 'toubkal/lib/core' );

var cities = rs
  .set( [
    { country: 'England', city: 'London'      },
    { country: 'France' , city: 'Paris'       },
    { country: 'France' , city: 'Marseille'   },
    { country: 'England', city: 'Manchester'  },
    { country: 'England', city: 'Liverpool'   },
    { country: 'France' , city: 'Lille'       },
    { country: 'France' , city: 'Caen'        },
    { country: 'England', city: 'Southampton' }
  ] )
;
 
cities
  .group( by_country, { key: [ 'country' ], initial_groups: [ { country: 'Germany' }, { country: 'England' } ] } )
  
  .trace( 'cities by country' ).greedy()
;

function by_country( city ) {
  return { country: city.country }
}

 