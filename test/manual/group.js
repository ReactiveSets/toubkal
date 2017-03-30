var rs  = require( 'toubkal/lib/core' )
  , RS  = rs.RS
  , log = RS.log
;

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
  ], { key: [ 'country', 'city' ], name: 'cities' } )
;

var cities_by_country = cities
  .group( by_country, {
    initial_groups: [ { country: 'Germany' }, { country: 'England' } ],
    name: 'cities_by_country'
  } )
;

var cities_by_country_set = cities_by_country
  .trace( 'cities by country' )
  
  .set( [], { name: 'cities_by_country_set' } )
;

cities_by_country_set  
  .trace( 'cities by country set' )
  
  .greedy()
;

log( 'cities_by_country and cities_by_country_set keys:', typeof cities_by_country._key, cities_by_country._key, cities_by_country_set._key );

cities._add   ( [ { country: 'Germany', city: 'Berlin' } ] );
cities._remove( [ { country: 'Germany', city: 'Berlin' } ] );

function by_country( city ) {
  return { country: city.country }
}

 