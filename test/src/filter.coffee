###
    filter.coffee

    Copyright (C) 2013-2015, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

###

# ----------------------------------------------------------------------------------------------
# rs test utils
# -------------

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check
rs     = this.rs     || utils.rs

RS      = rs.RS
Pipelet = RS.Pipelet

# ----------------------------------------------------------------------------------------------
# Check sorted pipelet content
# ----------------------------

check_set_content = ( done, source, values ) ->
  source._fetch_all ( _values ) ->
    check done, () ->
      expect( _values.sort ( a, b ) -> a.id - b.id ).to.be.eql values

# ----------------------------------------------------------------------------------------------
# filter test suite
# -----------------

describe 'filter()', ->
  cities = rs.set [
    { id: 1, name: "Marrakech"    , country: "Morocco"                      }
    { id: 2, name: "Mountain View", country: "USA"    , state: "California" }
    { id: 3, name: "Paris"        , country: "France"                       }
    { id: 4, name: "Berlin"       , country: "Germany"                      }
  ]
  
  employee = rs.set [
    { id: 2, name: "Josephin Tan"    , salary: "$1500", customer_id: "223", order_id: "1223" }
    { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
    { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
  ]
  
  describe 'filter() with a Function', ->
    is_in_usa = ( city, c, cities ) ->
      return city.country is 'USA'
    
    cities_in_usa = null
    
    it 'cities_in_usa should be a Pipelet', ->
      cities_in_usa = cities.filter( is_in_usa ).set()
      
      expect( cities_in_usa ).to.be.a Pipelet
    
    it 'cities_in_usa should only contain cities in USA', ( done ) ->
      cities_in_usa._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 2, name: "Mountain View", country: "USA", state: "California" }
        ]
    
    describe 'add():', ->
      it 'cities_in_usa should show one more city after adding New York to cities', ( done ) ->
        cities._add [ { id: 5, name: "New York", country: "USA", state: "New York" } ]
        
        cities_in_usa._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id: 2, name: "Mountain View", country: "USA", state: "California" }
          { id: 5, name: "New York", country: "USA", state: "New York" }
        ]
      
      it 'cities_in_usa should show only one more city after adding Casablanca and Huston', ( done ) ->
        cities._add [
          { id: 6, name: "Casablanca", country: "Morocco"                 }
          { id: 7, name: 'Huston'    , country: 'USA'    , state: 'Texas' }
        ]
        
        cities_in_usa._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id: 2, name: "Mountain View", country: "USA", state: "California" }
          { id: 5, name: "New York"     , country: "USA", state: "New York"   }
          { id: 7, name: "Huston"       , country: "USA", state: "Texas"      }
        ]
    
    describe '_update', ->
      it 'cities_in_usa should be updated when updating "New York" to "New York City" in cities', ( done ) ->
        cities._update [
          [ { id: 5, name: "New York", country: "USA", state: "New York" }, { id: 5, name: "New York City", country: "USA", state: "New York" } ]
        ]
        
        cities_in_usa._fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Mountain View", country: "USA", state: "California" }
            { id: 5, name: "New York City", country: "USA", state: "New York"   }
            { id: 7, name: "Huston"       , country: "USA", state: "Texas"      }
          ]
      
      it 'cities_in_usa should remove Huston after it be updated to Venice in cities', ( done ) ->
        cities._update [ [ { id: 7, name: "Huston", country: "USA", state: "Texas" }, { id: 7, name: "Venice", country: "Italy" } ] ]
        
        cities_in_usa._fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Mountain View", country: "USA", state: "California" }
            { id: 5, name: "New York City", country: "USA", state: "New York"   }
          ]
      
      it 'should add Detroit in cities_in_usa, after Paris is updated to Detroit in cities', ( done ) ->
        cities._update [ [ { id: 3, name: "Paris", country: "France" }, { id: 8, name: "Detroit", country: "USA", state: "Michigan" } ] ]
        
        cities_in_usa._fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Mountain View", country: "USA", state: "California" }
            { id: 5, name: "New York City", country: "USA", state: "New York"   }
            { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"   }
          ]
      
      it 'should not change cities_in_usa after Paris is updated to Madrid in cities, resulting in Paris added to cities anti-state', ( done ) ->
        cities._update [ [ { id: 3, name: "Paris", country: "France" }, { id: 9, name: "Madrid", country: "Spain" } ] ]
        
        cities_in_usa._fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Mountain View", country: "USA", state: "California" }
            { id: 5, name: "New York City", country: "USA", state: "New York"   }
            { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"   }
          ]
      
    describe 'remove()', ->
      it 'cities_in_usa should be equal to result: cities._remove( [ { id: 2, name: "Mountain View", country: "USA", state: "California" } ] )', ( done ) ->
        cities._remove [ { id: 2, name: "Mountain View", country: "USA", state: "California" } ]
        
        cities_in_usa._fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 5, name: "New York City", country: "USA", state: "New York" }
            { id: 8, name: "Detroit" , country: "USA", state: "Michigan" }
          ]
      
      it 'cities_in_usa should be equal to result: cities._remove( [ { id: 7, name: "Venice", country: "Italy" } ] )', ( done ) ->
        cities._remove [ { id: 7, name: "Venice", country: "Italy" } ]
        
        cities_in_usa._fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 5, name: "New York City", country: "USA", state: "New York"       }
            { id: 8, name: "Detroit" , country: "USA", state: "Michigan" }
          ]

  describe 'filter() from static countries query filtering cities from USA and Morocco:', ->
    countries = [
      { country: 'USA'     }
      { country: 'Morocco' }
    ]
    
    it 'should contain no city when no country is provided', ( done ) ->
      check_set_content done, cities.filter( [] ).trace( 'filter_no_country' ).set(), []
    
    it 'should contain all cities when an empty or-term is provided', ( done ) ->
      check_set_content done, cities.filter( [ {} ] ).trace( 'filter_no_country' ).set(), [
          { id: 1, name: "Marrakech"    , country: "Morocco"                      }
          { id: 4, name: "Berlin"       , country: "Germany"                      }
          { id: 5, name: "New York City", country: "USA", state: "New York"       }
          { id: 6, name: "Casablanca"   , country: "Morocco"                      }
          { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }
          { id: 9, name: "Madrid"       , country: "Spain"                        }
        ]
    
    it 'should only contain cities from USA and Morocco', ( done ) ->
      check_set_content done, cities.filter( countries ).set(), [
          { id: 1, name: "Marrakech"    , country: "Morocco"                      }
          { id: 5, name: "New York City", country: "USA", state: "New York"       }
          { id: 6, name: "Casablanca"   , country: "Morocco"                      }
          { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }
        ]
    
    it 'should only contain cities from USA and Morocco even through a set()', ( done ) ->
      check_set_content done, cities.filter( countries ).set(), [
          { id: 1, name: "Marrakech"    , country: "Morocco"                      }
          { id: 5, name: "New York City", country: "USA", state: "New York"       }
          { id: 6, name: "Casablanca"   , country: "Morocco"                      }
          { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }
        ]

  describe 'flow() static queries', ->
    multiflow = rs.set [
      { flow: "user", id: 1 }
      { flow: "user", id: 2 }
      { flow: "user", id: 3 }
      { flow: "group", id: 1 }
      { flow: "group", id: 2 }
      { flow: "group", id: 3 }
      { flow: "group", id: 4 }
      { flow: "post", id: 1 }
      { flow: "post", id: 2 }
      { flow: "post", id: 3 }
      { flow: "post", id: 4 }
      { flow: "post", id: 5 }
      { flow: "comment", id: 1 }
      { flow: "comment", id: 2 }
      { flow: "comment", id: 3 }
      { flow: "comment", id: 4 }
    ], { key: [ 'flow', 'id' ] }
    
    users    = null
    groups   = null
    posts    = null
    comments = null
    
    it 'should filter a multiflow by "users"', ( done ) ->
      users    = multiflow.flow( "user"    ).set()
      groups   = multiflow.flow( "group"   ).set()
      posts    = multiflow.flow( "post"    ).set()
      comments = multiflow.flow( "comment" ).set()
      
      check_set_content done, users, [
        { flow: "user", id: 1 }
        { flow: "user", id: 2 }
        { flow: "user", id: 3 }
      ]
    
    it 'should allow fetching by "users" with an additional query', ( done ) ->
      fetched = ( users ) ->
        check done, () ->
          expect( users ).to.be.eql [
            { flow: "user", id: 1 }
            { flow: "user", id: 3 }
          ]
      
      users
        ._fetch_all fetched, [ { id: 1 }, { id: 3 }, { id: 5 } ]
    
    it 'should allow fetching with no downstream query by "users"', ( done ) ->
      multiflow
        .flow( "user" )
        ._fetch_all ( users ) ->
          check done, () ->
            expect( users ).to.be.eql [
              { flow: "user", id: 1 }
              { flow: "user", id: 2 }
              { flow: "user", id: 3 }
            ]
    
    it 'should allow fetching with no downstream query by "users" with an additional query', ( done ) ->
      fetched = ( users ) ->
        check done, () ->
          expect( users ).to.be.eql [
            { flow: "user", id: 1 }
            { flow: "user", id: 3 }
          ]
      
      multiflow
        .flow( "user" )
        ._fetch_all fetched, [ { id: 1 }, { id: 3 }, { id: 5 } ]
    
    it 'should filter a multiflow by "groups"', ( done ) ->
      check_set_content done, groups, [
        { flow: "group", id: 1 }
        { flow: "group", id: 2 }
        { flow: "group", id: 3 }
        { flow: "group", id: 4 }
      ]
      
    it 'should filter a multiflow by "posts"', ( done ) ->
      check_set_content done, posts, [
        { flow: "post", id: 1 }
        { flow: "post", id: 2 }
        { flow: "post", id: 3 }
        { flow: "post", id: 4 }
        { flow: "post", id: 5 }
      ]
    
    it 'should filter a multiflow by "comments"', ( done ) ->
      check_set_content done, comments, [
        { flow: "comment", id: 1 }
        { flow: "comment", id: 2 }
        { flow: "comment", id: 3 }
        { flow: "comment", id: 4 }
      ]
      
    it 'should allow to add users', ( done ) ->
      multiflow._add [
        { flow: "user", id: 4 }
        { flow: "user", id: 5 }
      ]
      
      check_set_content done, users, [
        { flow: "user", id: 1 }
        { flow: "user", id: 2 }
        { flow: "user", id: 3 }
        { flow: "user", id: 4 }
        { flow: "user", id: 5 }
      ]
      
    it 'should allow to remove comments', ( done ) ->
      multiflow._remove [
        { flow: "comment", id: 2 }
        { flow: "comment", id: 3 }
      ]
      
      check_set_content done, comments, [
        { flow: "comment", id: 1 }
        { flow: "comment", id: 4 }
      ]
    
    it 'should not have modified posts', ( done ) ->
      check_set_content done, posts, [
        { flow: "post", id: 1 }
        { flow: "post", id: 2 }
        { flow: "post", id: 3 }
        { flow: "post", id: 4 }
        { flow: "post", id: 5 }
      ]
    
  describe 'filter() from dynamic countries query:', ->
    countries = rs.set [
      { country: 'USA' }
    ], { key: [ 'country' ] }
    
    cities_from_countries = null
    
    it 'cities_from_countries should be a Pipelet', ->
      cities_from_countries = cities.filter( countries ).trace( 'cities from countries' ).set( [] )
      
      expect( cities_from_countries ).to.be.a Pipelet
    
    it 'cities_from_countries should only contain cities in USA', ( done ) ->
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 5, name: "New York City", country: "USA", state: "New York"       }
          { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }
        ]
    
    it 'after updating Detroit to Chicago, cities_from_countries should show Chicago', ( done ) ->
      cities._update [
        [ { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }, { id: 8, name: "Chicago", country: "USA" }]
      ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 5, name: "New York City", country: "USA", state: "New York"       }
          { id: 8, name: "Chicago"      , country: "USA"                          }
        ]
    
    it 'after updating countries to get countries from Morocco, cities_from_countries should have all and only cities from Morocco', ( done ) ->
      countries._update [ [ { country: 'USA' }, { country: 'Morocco' } ] ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, name: "Marrakech"    , country: "Morocco"                      }
          { id: 6, name: "Casablanca"   , country: "Morocco"                      }
        ]
    
    it 'after adding San Francisco to cities, cities_from_countries should not change', ( done ) ->
      cities._add [ { id: 11, name: 'San Francisco', country: "USA" } ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, name: "Marrakech"    , country: "Morocco"                      }
          { id: 6, name: "Casablanca"   , country: "Morocco"                      }
        ]
    
    it 'after adding Germany in countries, cities_from_countries should have cities from Morocco and Germany', ( done ) ->
      countries._add [ { country: 'Germany' } ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
          { id: 1, name: "Marrakech"    , country: "Morocco"                      }
          { id: 4, name: "Berlin"       , country: "Germany"                      }
          { id: 6, name: "Casablanca"   , country: "Morocco"                      }
        ]
    
    it 'after adding France and USA to countries, cities_from_countries should have cities from Morocco, Germany, and the USA', ( done ) ->
      countries._add [ { country: 'France' }, { country: 'USA' } ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( countries.a ).to.be.eql [
          { country: 'Morocco' }, { country: 'Germany' }, { country: 'France' }, { country: 'USA' }
        ]
        
        expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
          { id:  1, name: "Marrakech"    , country: "Morocco"                      }
          { id:  4, name: "Berlin"       , country: "Germany"                      }
          { id:  5, name: "New York City", country: "USA"    , state: "New York"   }
          { id:  6, name: "Casablanca"   , country: "Morocco"                      }
          { id:  8, name: "Chicago"      , country: "USA"                          }
          { id: 11, name: 'San Francisco', country: "USA"                          }
        ]
    
    it 'after adding Paris to cities, cities_from_countries should have cities from Morocco, Germany, France and the USA', ( done ) ->
      # Note: we're not using id: 3, because it is in the anti-state
      cities._add [ { id: 9, name: "Paris", country: "France" } ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( cities._a_index_of( { id: 9 } ) ).to.not.be.eql -1
        
        expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
          { id:  1, name: "Marrakech"    , country: "Morocco"                      }
          { id:  4, name: "Berlin"       , country: "Germany"                      }
          { id:  5, name: "New York City", country: "USA"    , state: "New York"   }
          { id:  6, name: "Casablanca"   , country: "Morocco"                      }
          { id:  8, name: "Chicago"      , country: "USA"                          }
          { id:  9, name: "Paris"        , country: "France"                       }
          { id: 11, name: 'San Francisco', country: "USA"                          }
        ]
    
    it 'should add a state to Chicago after updating Chicago s state to Illinois', ( done ) ->
      cities._update [
        [ { id: 8, name: "Chicago", country: "USA" }, { id: 8, name: "Chicago", country: "USA", state: "Illinois" } ]
      ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( cities._a_index_of( { id: 9 } ) ).to.not.be.eql -1
        
        expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
          { id:  1, name: "Marrakech"    , country: "Morocco"                      }
          { id:  4, name: "Berlin"       , country: "Germany"                      }
          { id:  5, name: "New York City", country: "USA"    , state: "New York"   }
          { id:  6, name: "Casablanca"   , country: "Morocco"                      }
          { id:  8, name: "Chicago"      , country: "USA"    , state: "Illinois"   }
          { id:  9, name: "Paris"        , country: "France"                       }
          { id: 11, name: 'San Francisco', country: "USA"                          }
        ]
      
    it 'after removing Germany from countries, cities_from_countries should have Berlin removed', ( done ) ->
      countries._remove [ { country: "Germany" } ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( countries._a_index_of( { country: "Germany" } ) ).to.be.eql -1
        
        expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
          { id:  1, name: "Marrakech"    , country: "Morocco"                      }
          { id:  5, name: "New York City", country: "USA"    , state: "New York"   }
          { id:  6, name: "Casablanca"   , country: "Morocco"                      }
          { id:  8, name: "Chicago"      , country: "USA"    , state: "Illinois"   }
          { id:  9, name: "Paris"        , country: "France"                       }
          { id: 11, name: 'San Francisco', country: "USA"                          }
        ]
    
    it 'after removing Chicago from cities, cities_from_countries should have it removed as well', ( done ) ->
      # Note: we're not using id: 3, because it is in the anti-state
      cities._remove [ { id: 8, name: "Chicago"      , country: "USA"    , state: "Illinois"   } ]
      
      cities_from_countries._fetch_all ( values ) -> check done, ->
        expect( cities._a_index_of( { id: 8 } ) ).to.be.eql -1
        
        expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
          { id:  1, name: "Marrakech"    , country: "Morocco"                      }
          { id:  5, name: "New York City", country: "USA"    , state: "New York"   }
          { id:  6, name: "Casablanca"   , country: "Morocco"                      }
          { id:  9, name: "Paris"        , country: "France"                       }
          { id: 11, name: 'San Francisco', country: "USA"                          }
        ]
    
  describe '_notify():', ->
    it 'add(): employee._notify( transaction ) should be equal to result', ( done ) ->
      employee._notify [
        {
          action: "add"
          objects: [
            { id: 7, name: "John Morrison", salary: "$3000", customer_id: "228", order_id: "1228" }
            { id: 8, name: "Thomas Buch", salary: "$2500", customer_id: "229", order_id: "1229" }
          ]
        }
      ]
      
      employee._fetch_all ( values ) -> check done, ->
        expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
          { id: 2, name: "Josephin Tan"    , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
          { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
          { id: 7, name: "John Morrison"   , salary: "$3000", customer_id: "228", order_id: "1228" }
          { id: 8, name: "Thomas Buch"     , salary: "$2500", customer_id: "229", order_id: "1229" }
        ]
    
    it 'remove(): employee._notify( transaction ) should be equal to result', ( done ) ->
      employee._notify [ { action: "remove", objects: [ { id: 8 } ] } ]
      
      employee._fetch_all ( values ) -> check done, ->
        expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
          { id: 2, name: "Josephin Tan"    , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
          { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
          { id: 7, name: "John Morrison"   , salary: "$3000", customer_id: "228", order_id: "1228" }
        ]
    
    it '_update(): employee._notify( transaction ) should be equal to result', ( done ) ->
      employee._notify [ {
        action: "update"
        objects: [
          [
            { id: 7, name: "John Morrison", salary: "$3000", customer_id: "228", order_id: "1228" }
            { id: 7, name: "John Morrison", salary: "$3500", customer_id: "228", order_id: "1228" }
          ]
          [

            { id: 2, name: "Josephin Tan", salary: "$1500", customer_id: "223", order_id: "1223" }
            { id: 2, name: "Josephin Tan", salary: "$2750", customer_id: "223", order_id: "1223" }
          ]
        ]
      } ]

      employee._fetch_all ( values ) -> check done, ->
        expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
          { id: 2, name: "Josephin Tan"    , salary: "$2750", customer_id: "223", order_id: "1223" }
          { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
          { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
          { id: 7, name: "John Morrison"   , salary: "$3500", customer_id: "228", order_id: "1228" }
        ]
    
    it 'filter(): cities.filter( is_in_morocco ) should be equal to result', ( done ) ->
      cities_in_morocco = cities.filter( ( city ) -> return city.country is "Morocco" ).set()
      
      cities._notify [
        {
          action: "add"
          objects: [
            { id:  9, name: "Moscow", country: "Russia"  }
            { id: 10, name: "Tanger", country: "Morocco" }
          ]
        }
        {
          action: "update"
          objects: [
            [ { id:  6, name: "Casablanca", country: "Morocco" }, { id:  6, name: "Casa" , country: "Morocco" } ]
            [ { id: 10, name: "Tanger"    , country: "Morocco" }, { id: 11, name: "Cairo", country: "Egypt"   } ]
            [ { id:  3, name: "Paris"     , country: "France"  }, { id: 12, name: "Fes"  , country: "Morocco" } ]
            [ { id:  9, name: "Madrid"    , country: "Spain"   }, { id: 13, name: "LA"   , country: "USA", state: "California" } ]
          ]
        }
        {
          action: "remove"
          objects: [
            { id: 13, name: "LA"   , country: "USA", state: "California" }
            { id: 12, name: "Fes"  , country: "Morocco" }
            { id: 11, name: "Cairo", country: "Egypt"   }
          ]
        }
      ]
      
      cities_in_morocco._fetch_all ( values ) -> check done, ->
        expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
          { id:  1, name: "Marrakech", country: "Morocco" }
          { id:  6, name: "Casa"     , country: "Morocco" }
        ]
