###
    xs_core.coffee

    Copyright (C) 2013, 2014, Connected Sets

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
# xs test utils
# -------------

utils = require( './tests_utils.js' ) if require?
expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
log    = this.log    || utils.log
xs     = this.xs     || utils.xs

XS      = xs.XS
extend  = XS.extend

slice = Array.prototype.slice

# ----------------------------------------------------------------------------------------------
# Check sorted pipelet content
# ----------------------------

check_set_content = ( done, source, values ) ->
  source._fetch_all ( _values ) ->
    check done, () ->
      expect( _values.sort ( a, b ) -> a.id - b.id ).to.be.eql values
  
# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

if require?
  require '../../lib/code.js'
  require '../../lib/filter.js'
  require '../../lib/order.js'
  require '../../lib/aggregate.js'
  require '../../lib/join.js'
  require '../../lib/json.js'

Pipelet = XS.Pipelet
Greedy  = XS.Greedy
Set     = XS.Set

# ----------------------------------------------------------------------------------------------
# xs unit test suite
# ------------------

describe 'XS test suite:', ->
  it 'XS should be defined:', ->
    expect( XS ).to.exist

  describe 'XS.extend():', ->
    it 'should be a function', ->
      expect( extend ).to.be.a 'function'
    
    o1 = 
      id: 1
      name: 'khalifa'
    
    o2 = 
      email: 'knassik@gmail.com'
    
    o3 =
      country: 'Morocco'
      name: 'khalifa nassik'
      email: 'khalifan@gmail.com'

    _o1 = clone o1
    _o2 = clone o2
    _o3 = clone o3

    result = undefined
    
    it 'should be identity, i.e. extend( object ) should be strictly equal to object', ->
      result = extend o1
      
      expect( result ).to.be o1
    
    it 'should modify o1 in extend( o1, o2 )', ->
      result = extend o1, o2
      
      expect( o1 ).to.be.eql( { id: 1, name: 'khalifa', email: 'knassik@gmail.com' } )

    it 'should return o1', ->
      expect( result ).to.be o1
    
    it 'should not modify o2', ->
      expect( o2 ).to.be.eql _o2
    
    it 'should modify o1 after extend( o1, o2, o3 )', ->
      o1 = clone _o1 # restore o1 original value

      result = extend o1, o2, o3
      
      expect( o1 ).to.be.eql( { id: 1, name: 'khalifa nassik', email: 'khalifan@gmail.com', country: 'Morocco' } ) and
      expect( result ).to.be o1
    
    it 'should not have modified o2', ->
      expect( o2 ).to.be.eql _o2

    it 'should not have modified o3', ->
      expect( o3 ).to.be.eql _o3

    it 'should return {} in extend( null )', ->
      expect( extend( null ) ).to.be.eql {}

    it 'should return {} in extend( undefined )', ->
      expect( extend( undefined ) ).to.be.eql {}

    it 'should return {} in extend( null, null )', ->
      expect( extend( null, null ) ).to.be.eql {}

    it 'should return {} in extend( undefined, undefined )', ->
      expect( extend( undefined, undefined ) ).to.be.eql {}

    it 'should return o3 clone in extend( null, null, null, o3, null )', ->
      result = extend null, null, null, o3, null
      
      expect( result ).to.be.eql( o3 ) and expect( result ).to.not.be o3

    it 'should return o3 clone in extend( undefined, undefined, undefined, o3, undefined )', ->
      result = extend( undefined, undefined, undefined, o3, undefined )

      expect( result ).to.be.eql( o3 ) and expect( result ).to.not.be o3

  # XS.extend()
  
  describe 'XS.extend_2():', ->
    extend_2 = XS.extend_2
    
    it 'should be a function', ->
      expect( extend_2 ).to.be.a 'function'

    it 'should not be XS.extend()', ->
      expect( extend_2 ).to.not.be XS.extend
    
    o1 = 
      id: 1
      name: 'khalifa'
    
    o2 = 
      email: 'knassik@gmail.com'
    
    _o1 = clone o1
    _o2 = clone o2

    result = undefined
    
    it 'should be identity, i.e. extend_2( object ) should be strictly equal to object', ->
      result = extend_2 o1
      
      expect( result ).to.be o1
    
    it 'should modify o1 in extend_2( o1, o2 )', ->
      result = extend_2 o1, o2
      
      expect( o1 ).to.be.eql( { id: 1, name: 'khalifa', email: 'knassik@gmail.com' } )

    it 'should return o1', ->
      expect( result ).to.be o1
    
    it 'should not modify o2', ->
      expect( o2 ).to.be.eql _o2
    
    it 'should return object in extend_2( object, null )', ->
      expect( extend_2( o2, null ) ).to.be o2

    it 'should return object in extend_2( object, undefined )', ->
      expect( extend_2( o2, undefined ) ).to.be o2

    it 'should return null in extend_2( null )', ->
      expect( extend_2( null ) ).to.be null

    it 'should return undefined in extend_2( undefined )', ->
      expect( extend_2( undefined ) ).to.be undefined

    it 'should return null in extend_2( null, null )', ->
      expect( extend_2( null, null ) ).to.be null

    it 'should return undefined in extend_2( undefined, undefined )', ->
      expect( extend_2( undefined, undefined ) ).to.be undefined

    it 'should return null in extend_2( null, undefined )', ->
      expect( extend_2( null, undefined ) ).to.be null

    it 'should return undefined in extend_2( undefined, null )', ->
      expect( extend_2( undefined, null ) ).to.be undefined

    it 'should throw in extend_2( null, o2 )', ->
      f = -> extend_2 null, o2

      expect( f ).to.throwException()

    it 'should throw in extend_2( undefined, o2 )', ->
      f = -> extend_2 undefined, o2

      expect( f ).to.throwException()

  # XS.extend_2()
  
  describe 'XS.subclass():', ->
    subclass = XS.subclass
    
    it 'subclass() should be a function', ->
      expect( subclass ).to.be.a 'function'
    
    Animal = ( name ) -> @name = name
    
    a = new Animal 'Sam'
    
    it 'a should be an instance of Animal', ->
      expect( a ).to.be.an Animal
      
    Snake = ( name ) ->
    
    subclass( Animal, Snake );
    
    s = new Snake( "Barry the Snake" )
    
    it 's should be an instance of Snake', ->
      expect( s ).to.be.a Snake
    
    it 's should be an instance of Animal', ->
      expect( s ).to.be.an Animal
    
    it 'a should not be an instance of Snake', ->
      expect( a ).to.not.be.a Snake
    
  describe 'XS.Code():', ->
    f = code = new XS.Code( 'Code Test' )
      ._function( 'f', null, [] )
        .add( 'var i' )
        ._for( 'i = -1', ' ++i < 10' )
        .end()
        .add( 'return i' )
      .end()
      .get()
    
    eval code
    
    i = f()
    
    it 'f should be a function', ->
      expect( f ).to.be.a 'function'
    
    it 'i should be equal to 10', ->
      expect( i ).to.be.eql 10
    
    test = 'a[ ++i ] === n'
    
    g = code = new XS.Code( 'Test unfolded while' )
      ._function( 'g', null, [ 'n' ] )
        ._var( [ 'a = [ 34, 65, 98, 8, 52, 10, 21, 13, 1, 90, 14 ]', 'l = a.length', 'i = -1' ] )
        .unrolled_while( 'if ( ' + test, '|| ' + test, ') return i' )
        .add( 'return -1' )
      .end( '' )
      .get()
    ;
    
    eval code
    
    it 'the index of 34 should be 0', ->
      expect( g( 34 ) ).to.be.eql 0
  
    it 'the index of 52 should be 4', ->
      expect( g( 52 ) ).to.be.eql 4
  
    it 'the index of 90 should be 9', ->
      expect( g( 90 ) ).to.be.eql 9
  
    it 'the index of 1 should be 8', ->
      expect( g( 1 ) ).to.be.eql 8
  
  describe 'Pipelets Connections', ->
    values = [ { id: 1 }, { id: 2 } ]
    
    source = new Pipelet()
    lazy   = new Pipelet()
    greedy = xs.greedy()
    
    lazy._add_source source
    greedy._input._add_source source._output
    
    it 'source should have lazy and greedy inputs as outputs', ->
      expect( source._output.destinations ).to.be.eql [ lazy._input, greedy._input ]
    
    it 'lazy should have source._output as its input', ->
      expect( lazy._input.source ).to.be source._output
      
    it 'greedy should have source._output as its input', ->
      expect( greedy._input.source ).to.be source._output
      
    it 'source query tree should have greedy as a subscriber in its top node', ->
      expect( source._output.tree.top ).to.be.eql {
        branches   : {}
        keys       : []
        subscribers: [ greedy._input ]
      }
    
    it 'should have fetched content into a set through a stateless pipelet', ->
      s = xs.set( values ).pass_through().set()
      
      expect( s.a ).to.be.eql values
    
    it 'should have fetched content into a set even if stateless pipelet is pluged last into upstream pipelet', ->
      s = xs.set( values )
      
      p = xs.pass_through()
      
      s1 = p.set()
      
      s._output._add_destination( p._input )
      
      expect( s1.a ).to.be.eql values
      
  describe 'XS.Set():', ->
    set = xs.set();
    
    it 'set should be a Set', ->
      expect( set ).to.be.a XS.Set
    
    it 'should throw an exception if trying to initialize a set with an Object not instance of Array', ->
      expect( () -> xs.set( {} ) ).to.throwException()
      
    cities = xs.set [
      { id: 1, name: "Marrakech"    , country: "Morocco"                      }
      { id: 2, name: "Mountain View", country: "USA"    , state: "California" }
      { id: 3, name: "Paris"        , country: "France"                       }
    ]
    
    delayed_set = xs
      .set( [ { id:1, value: 'delayed' } ] )
      .delay( 100 )
      .trace( 'Delayed Set' )
      .filter( () -> true )
      .set()
    
    #delayed_set = delayed_set.filter( () -> true ).set()
    
    cars = xs
      .set( [
            { id: 1, brand: "Mercedes", model: "C Class" }
            { id: 2, brand: "Mercedes", model: "S Class" }
            { id: 3, brand: "BMW"     , model: "M Serie" }
          ]
          { key: [ "id", "model" ] }
      )
      .set_flow( 'car' )
      .set()
    
    employee = xs.set [
      { id:  1, name: "Stephen C. Cox" , salary: "$3000", customer_id: "222", order_id: "1222" }
      { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
      { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
      { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
      { id:  5, name: "Alex Frog"      , salary: "$3000", customer_id: "226", order_id: "1226" }
      { id:  6, name: "Tim Hancook"    , salary: "$1500", customer_id: "227", order_id: "1227" }
    ]
    
    describe 'Delayed set:', ->
      it 'Delayed set (100 ms) should eventually equal its source values', ( done ) ->
        delayed_set._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:1, value: 'delayed' }
        ]
    
    describe '_fetch_all():', ->
      it 'set._fetch_all() should be empty', ( done ) ->
        set._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql []
      
      it 'cars._fetch_all() should be equal to result', ( done ) ->
        cars._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { flow: "car", id: 1, brand: "Mercedes", model: "C Class" }
          { flow: "car", id: 2, brand: "Mercedes", model: "S Class" }
          { flow: "car", id: 3, brand: "BMW"     , model: "M Serie" }
        ]
    
    describe 'add():', ->
      it 'should contain Berlin after adding it', ( done ) ->
        cities._add [ { id: 4, name: "Berlin", country: "Germany" } ]
        
        cities._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id: 1, name: "Marrakech"    , country: "Morocco"                      }
          { id: 2, name: "Mountain View", country: "USA"    , state: "California" }
          { id: 3, name: "Paris"        , country: "France"                       }
          { id: 4, name: "Berlin"       , country: "Germany"                      }
        ]
    
    describe 'index_of():', ->
      it 'set.index_of( { id: 2 } ) should be -1: empty set', ->
        expect( set.index_of( { id: 2 } ) ).to.be.eql -1
      
      it 'cities.index_of( { id: 2 } ) should be 1', ->
        expect( cities.index_of( { id: 2 } ) ).to.be.eql 1
      
      it 'cars.index_of( { id: 2, model: "S Class" } ) should be 1', ->
        expect( cars.index_of( { id: 2, model: "S Class" } ) ).to.be.eql 1
      
      it 'cars.index_of( { id: 3, model: "S Class" } ) should be -1: not found', ->
        expect( cars.index_of( { id: 3, model: "S Class" } ) ).to.be.eql -1
    
    describe 'remove():', ->
      it 'set._remove( [ { id: 1 } ] )._add( [ { id: 2 } ] ) should have id 2', ( done ) ->
        set._remove( [ { id: 1 } ] )._add( [ { id: 2 } ] )._fetch_all ( values ) ->
          check done, -> expect( values ).to.be.eql [ { id: 2 } ]
      
      it 'should have an one value in the anti-state', ->
        expect( set.b ).to.be.eql [ { id: 1 } ]
      
      it 'adding back this element should not change the set', ( done ) ->
        set._add( [ { id: 1 } ] )._fetch_all ( values ) ->
          check done, -> expect( values ).to.be.eql [ { id: 2 } ]
      
      it 'anti-state should be empty again', ->
        expect( set.b ).to.be.eql []
        
      it 'removing id 2 should left set empty again', ( done ) ->
        set._remove( [ { id: 2 } ] )._fetch_all ( values ) ->
          check done, -> expect( values ).to.be.eql []
      
      it 'employee._remove( [ { id: 15 } ] ) should be equal to employee: record with id 15 doesn\'t exist', ( done ) ->
        employee._remove( [ { id: 15 } ] )
        
        employee._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:  1, name: "Stephen C. Cox" , salary: "$3000", customer_id: "222", order_id: "1222" }
          { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
          { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
          { id:  5, name: "Alex Frog"      , salary: "$3000", customer_id: "226", order_id: "1226" }
          { id:  6, name: "Tim Hancook"    , salary: "$1500", customer_id: "227", order_id: "1227" }
        ]
      
      it 'employee._remove( [ { id: 1 } ] ) should be equal to result: first record', ( done ) ->
        employee._remove( [ { id: 1 } ] )
        
        employee._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
          { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
          { id:  5, name: "Alex Frog"      , salary: "$3000", customer_id: "226", order_id: "1226" }
          { id:  6, name: "Tim Hancook"    , salary: "$1500", customer_id: "227", order_id: "1227" }
        ]

      it 'employee._remove( [ { id: 5 } ] ) should be equal to result: record in the middle', ( done ) ->
        employee._remove( [ { id: 5 } ] )
        
        employee._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
          { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
          { id:  6, name: "Tim Hancook"    , salary: "$1500", customer_id: "227", order_id: "1227" }
        ]
      
      it 'employee._remove( [ { id: 6 } ] ) should be equal to result: last record', ( done ) ->
        employee
          ._remove( [ { id: 6 } ] )
          ._fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
              { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
              { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
            ]
    
    describe '_update():', ->
      it 'set._update( [ [ { id: 1 }, { id: 1, v: "test" } ] ] ) should be equal to set: empty set', ( done ) ->
        set
          ._update( [ [ { id: 1 }, { id: 1, v: 'test' } ] ] )
          ._fetch_all ( values ) -> check done, -> expect( values ).to.be.eql []
      
      it 'employee with add, _update and remove inverted should end with update done', ( done ) ->
        employee
          ._remove(   [ { id: 15, name: "Khalifa P Nassik", salary: "$2500" } ] )
          ._update( [ [ { id: 15, name: "Khalifa P Nassik", salary: "$1500" }
                       { id: 15, name: "Khalifa P Nassik", salary: "$2500" } ] ] )
          ._add(      [ { id: 15, name: "Khalifa P Nassik", salary: "$1500" } ] )
          ._fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
              { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
              { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
            ]
      
      it 'employee._update( [ [ { id: 3 }, { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" ] ] } ) should be equal to result', ( done ) ->
        employee._update( [ [ { id: 3 }, { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" } ] ] )

        employee._fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Josephin Tan"    , salary: "$1500", customer_id: "223", order_id: "1223" }
            { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
            { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
          ]
    
    describe 'filter():', ->
      is_in_usa = ( city, c, cities ) ->
        return city.country is 'USA'
      
      cities_in_usa = cities.filter( is_in_usa ).set()
      
      it 'cities_in_usa should be a Pipelet', ->
        expect( cities_in_usa ).to.be.an XS.Pipelet
      
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
      multiflow = xs.set [
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
      
      users    = multiflow.flow( "user"    ).set()
      groups   = multiflow.flow( "group"   ).set()
      posts    = multiflow.flow( "post"    ).set()
      comments = multiflow.flow( "comment" ).set()
      
      it 'should filter a multiflow by "users"', ( done ) ->
        check_set_content done, users, [
          { flow: "user", id: 1 }
          { flow: "user", id: 2 }
          { flow: "user", id: 3 }
        ]
      
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
      countries = xs.set [
        { country: 'USA' }
      ], { key: [ 'country' ] }
      
      cities_from_countries = cities.filter( countries ).trace( 'cities from countries' ).set( [] )
      
      it 'cities_from_countries should be a Pipelet', ->
        expect( cities_from_countries ).to.be.an XS.Pipelet
      
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
          expect( cities.index_of( { id: 9 } ) ).to.not.be.eql -1
          
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
          expect( cities.index_of( { id: 9 } ) ).to.not.be.eql -1
          
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
          expect( countries.index_of( { country: "Germany" } ) ).to.be.eql -1
          
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
          expect( cities.index_of( { id: 8 } ) ).to.be.eql -1
          
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
      
    describe 'order():', ->
      books = xs.set [
        { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
        { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
        { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
        { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
        { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
      ], { name: 'books' }
      
      organizer = xs.set [ { id: "year" } ], { name: 'by_year' }
      
      by_ascending_author  = ( a, b ) ->
        if ( a = a.author ) == ( b = b.author ) then return 0
        
        if a == undefined then return -1
        if b == undefined then return  1
        if a == null      then return -1
        if b == null      then return  1
        
        if a  <  b        then return -1
        if a  >  b        then return  1

        return 0
      
      by_descending_author = ( a, b ) ->
        return by_ascending_author( b, a )
      
      books_ordered_by_year = books
        .order( organizer, { name: 'books_ordered_by_year' } )
        .ordered().ordered()
      
      by_descending_year_delay = 100
      
      by_descending_year = xs
        .set( [ { id: "year", descending: true } ], { name: 'by_descending_year' } )
        .trace( 'By Descending Year Organizer, before delay' )
        .delay( by_descending_year_delay )
        .trace( 'By Descending Year Organizer, after delay' )
      
      books_ordered_by_descending_year = books
        .order( by_descending_year, { name: 'books_ordered_by_descending_year', insert_before: true } )
        .ordered().ordered().delay( by_descending_year_delay )
      
      books_ordered_by_ascending_author  = books
        .order( by_ascending_author , { name: 'books_ordered_by_ascending_author'  } )
        .ordered().ordered()

      books_ordered_by_descending_author = books
        .order( by_descending_author, { name: 'books_ordered_by_descending_author', insert_before: true } )
        .ordered().ordered()
      
      it 'books_ordered_by_year should be ordered by ascending year', ( done ) ->
        books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
          { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
          { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
          { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
          { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
          { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
        ]

      it 'books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
        books_ordered_by_descending_year._fetch_all ( books ) ->
          log 'books_ordered_by_descending_year delayed fetched'
          
          check done, () -> expect( books ).to.be.eql [
            { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
            { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
            { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
            { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
            { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
          ]
      
      it 'books_ordered_by_ascending_author should be ordered by ascending auhtor: organizer is a function', ( done ) ->
        books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
          { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
          { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
          { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
          { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
          { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        ]

      it 'books_ordered_by_descending_author should be ordered by descending auhtor: organizer is a function', ( done ) ->
        books_ordered_by_descending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
          { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
          { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
          { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
          { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
          { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        ]
      
      describe 'add()', ->
        it 'after books._add( book 6 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books._add [ { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", year: 2005 } ]

          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 1, title: "A Tale of Two Cities"           , author: "Charles Dickens" , year: 1859 }
            { id: 2, title: "The Lord of the Rings"          , author: "J. R. R. Tolkien", year: 1955 }
            { id: 4, title: "The Alchemist"                  , author: "Paulo Coelho"    , year: 1988 }
            { id: 5, title: "Angels and Demons"              , author: "Dan Brown"       , year: 2000 }
            { id: 3, title: "The Da Vinci Code"              , author: "Dan Brown"       , year: 2003 }
            { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson"   , year: 2005 }
          ]
        
        it 'after books._add( book 6 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson"   , year: 2005 }
            { id: 3, title: "The Da Vinci Code"              , author: "Dan Brown"       , year: 2003 }
            { id: 5, title: "Angels and Demons"              , author: "Dan Brown"       , year: 2000 }
            { id: 4, title: "The Alchemist"                  , author: "Paulo Coelho"    , year: 1988 }
            { id: 2, title: "The Lord of the Rings"          , author: "J. R. R. Tolkien", year: 1955 }
            { id: 1, title: "A Tale of Two Cities"           , author: "Charles Dickens" , year: 1859 }
          ]
        
        it 'after books._add( book 6 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
          books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
          ]

        it 'after books._add( book 6 ), books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
          books_ordered_by_descending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
          ]

        it 'after books._add( books 7, 8, 9, 10 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books._add [
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
          ]

          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
          ]
        
        it 'after books._add( books 7, 8, 9, 10 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
          ]
        
        it 'after books._add( books 7, 8, 9, 10 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
          books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
          ]

        it 'after books._add( books 11, 12, 13 ), whose years are already used; books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books._add [
            { id: 11, title: "The Dukan Diet", author: "Pierre Dukan"    , year: 2000 }
            { id: 12, title: "Breaking Dawn" , author: "Stephenie Meyer" , year: 2008 }
            { id: 13, title: "Lolita"        , author: "Vladimir Nabokov", year: 1955 }
          ]
          
          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
          ]
        
        it 'after books._add( books 11, 12, 13 ), whose years are already used; books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
          ]
        
        it 'after books._add( books 14, 15, 16 ), the years are undefined or null; books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books._add [
            { id: 14, title: "And Then There Were None"         , author: "Agatha Christie", year: undefined }
            { id: 15, title: "Steps to Christ"                  , author: "Ellen G. White" , year: null      }
            { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"                       }
          ]
          
          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
          ]
        
        it 'after books._add( books 14, 15, 16 ), the years are undefined or null; books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
          ]
        
        it '_update organizer, books_ordered_by_year should be ordered by ascending by title', ( done ) ->
          organizer._update [ [ { id: "year" }, { id: "title" } ] ]

          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
          ]
        
        it 'add a second field to organizer, books_ordered_by_year should be ordered by ascending year and title', ( done ) ->
          organizer._notify [
            { action: "update", objects: [ [ { id: "title" }, { id: "year" } ] ] }
            { action: "add"   , objects: [ { id: "title" } ] }
          ]
          
          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
          ]
        
        it 'books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
          books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
          ]

        it 'books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
          books_ordered_by_descending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
          ]
        
        it 'books_ordered_by_ascending_id should be ordered by ascending id: organizer is an objects', ( done ) ->
          books_ordered_by_ascending_id = books.order( [ { id: "id" } ] ).ordered().ordered()
          
          books_ordered_by_ascending_id._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
          ]

        it 'books_ordered_by_descending should be ordered by descending id: organizer is an objects', ( done ) ->
          books_ordered_by_ascending_id = books.order( [ { id: "id", descending: true } ] ).ordered().ordered()
          
          books_ordered_by_ascending_id._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
          ]
      
      describe '_update():', ->
        it 'after books._update( object 2 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books._update [ [
            { id: 2, title: "The Lord of the Rings"  , author: "J. R. R. Tolkien", year: 1955 }
            { id: 2, title: "The Lord of the Rings 1", author: "J. R. R. Tolkien", year: 1954 }
          ] ]

          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien"       , year: 1954 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
          ]
        
        it 'after books._update( object 2 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien"       , year: 1954 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
          ]
        
        it 'after books._notify( 4 updates transaction ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books._notify [
            {
              action : "update"
              objects: [
                [
                  { id:  8, title: "The Hobbit", author: "J. R. R. Tolkien"         , year: 1937 }
                  { id:  8, title: "The Hobbit Changed", author: "J. R. R. Tolkien 8" , year: 1937 }
                ]
                
                [
                  { id: 15, title: "Steps to Christ", author: "Ellen G. White", year: null      }
                  { id: 15, title: "Steps to Christ", author: "Ellen G. White", year: undefined }
                ]

                [
                  { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"             }
                  { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl", year: 1970 }
                ]
                
                [
                  { id: 14, title: "And Then There Were None", author: "Agatha Christie", year: undefined }
                  { id: 14, title: "And Then There Were None", author: "Agatha Christie", year: 1927      }
                ]

                [
                  { id:  2, title: "The Lord of the Rings 1", author: "J. R. R. Tolkien", year: 1954 }
                  { id:  2, title: "The Lord of the Rings 1", author: "J. R. R. Tolkien 2", year: 1954 }
                ]
                
                [
                  { id: 11, title: "The Dukan Diet", author: "Pierre Dukan", year: 2000 }
                  { id: 11, title: "The Dukan Diet", author: "Pierre Dukan", year: 1999 }
                ]
                
                [
                  { id:  5, title: "Angels and Demons", author: "Dan Brown", year: 2000 }
                  { id:  5, title: "Angels and Demons", author: "Dan Brown", year: 2001 }
                ]
                
                [
                  { id: 12, title: "Breaking Dawn", author: "Stephenie Meyer", year: 2008 }
                  { id: 12, title: "Breaking Dawn", author: "Stephenie Meyer", year: 1875 }
                ]
                
                [
                  { id:  9, title: "The Hunger Games", author: "Suzanne Collins", year: 2008 }
                  { id:  9, title: "The Hunger Games", author: "Suzanne Collins", year: 1942 }
                ]
              ]
            }
          ]
          
          books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: undefined }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 1875 }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
            { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
            { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
          ]
        
        it 'after books._notify( transaction ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
            { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
            { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
            { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
            { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 1875 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: undefined }
          ]
        
      describe 'remove( books 12, 13, 3, 15 ):', ->
        it 'after books._remove( objects 12, 13, 15 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
          books._remove [
            { id: 12, title: "Breaking Dawn"    , author: "Stephenie Meyer" , year: 2008 }
            { id: 13, title: "Lolita"           , author: "Vladimir Nabokov", year: 1955 }
            { id:  3, title: "The Da Vinci Code", author: "Dan Brown"       , year: 2003 }
            { id: 15, title: "Steps to Christ"  , author: "Ellen G. White"  , year: undefined }
          ]
          
          books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
            { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
            { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
            { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
          ]

        it 'after books._remove( objects 12, 13, 3, 15 ), books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
          books_ordered_by_descending_author._fetch_all ( books ) -> check done, () ->
            # books.sort ( a, b ) -> a.author < b.author
            expect( books ).to.be.eql [
              { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
              { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
              { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
              { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
              { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
              { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
              { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
              { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
              { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
              { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
              { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
              { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
            ]

  describe 'xs.aggregate() and Pipelet.Compose():', ->
    books_sales = xs.set [
      { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , sales:       200, year: 1859 }
      { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , sales:       150, year: 1955 }
      { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , sales:        80, year: 2003 }
      { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , sales:        65, year: 1988 }
      { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , sales:        39, year: 2000 }
      { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , sales:        30, year: 2005 }
      { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", sales:       125, year: 1853 }
      { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , sales:       100, year: 1937 }
      { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , sales:        23, year: 2008 }
      { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , sales: undefined, year: 1999 }
      { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
      { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , sales: undefined, year: 2008 }
      { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , sales:        50, year: 1955 }
      { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , sales:       100, year: undefined }
      { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , sales:        60, year: null }
      { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , sales:        13             }
    ]
    
    sales  = xs.set [ { id: "sales"  } ]
    by_author = xs.set [ { id: "author" } ]
    by_year   = xs.set [ { id: "year"   } ]
    
    books_sales_by_author = books_sales.aggregate( sales, by_author ).order( by_author ).ordered()
    books_sales_by_year   = books_sales.aggregate( sales, by_year ).order( by_year ).ordered()
    
    aggregate_from = ( source, from, measures, dimensions, options ) ->
      return source
        .filter( from, options )
        .aggregate( measures, dimensions, options )
        .order( dimensions )
        .ordered()
    
    Pipelet.Compose 'aggregate_from', aggregate_from
    
    tolkien_books = ( book, options ) ->
      return book.author is 'J. R. R. Tolkien'
    
    tolkien_sales_by_year = books_sales.aggregate_from tolkien_books, sales, by_year 
    
    it 'should group and order books_sales_by_author by author', ( done ) ->
      books_sales_by_author._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 200, _count: 1 }
          { author: "Dan Brown"              , sales: 119, _count: 2 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 250, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Pierre Dukan"           , sales:  10, _count: 1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stephenie Meyer"        , sales:   0, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  23, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]
    
    it 'should group and order books_sales_by_year by year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
      # ToDo: undefined and null groups are not supported at this time
      #  { sales:       113, year: undefined, _count: 1 }
      #  { sales:        60, year: null, _count: 1 }
        { sales:       125, year: 1853, _count: 1 }
        { sales:       200, year: 1859, _count: 1 }
        { sales:       100, year: 1937, _count: 1 }
        { sales:       200, year: 1955, _count: 2 }
        { sales:        65, year: 1988, _count: 1 }
        { sales:         0, year: 1999, _count: 1 }
        { sales:        49, year: 2000, _count: 2 }
        { sales:        80, year: 2003, _count: 1 }
        { sales:        30, year: 2005, _count: 1 }
        { sales:        23, year: 2008, _count: 2 }
      ]
    
    it 'should group and order tolkien_sales_by_year by year', ( done ) ->
      tolkien_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
        { sales:       100, year: 1937, _count: 1 }
        { sales:       150, year: 1955, _count: 1 }
      ]

    describe 'add sales for "Dan Brown" in 2004', ->
      it 'should increase books_sales_by_author for "Dan Brown"', ( done ) ->
        books_sales._add [
          { id: 17, title: "The Da Vinci Code"                       , author: "Dan Brown"              , sales:        125, year: 2004 }
        ]

        books_sales_by_author._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 200, _count: 1 }
          { author: "Dan Brown"              , sales: 244, _count: 3 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 250, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Pierre Dukan"           , sales:  10, _count: 1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stephenie Meyer"        , sales:   0, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  23, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]      
       
      it 'should add books_sales_by_year for 2004', ( done ) ->
        books_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
          { sales:       125, year: 1853, _count: 1 }
          { sales:       200, year: 1859, _count: 1 }
          { sales:       100, year: 1937, _count: 1 }
          { sales:       200, year: 1955, _count: 2 }
          { sales:        65, year: 1988, _count: 1 }
          { sales:         0, year: 1999, _count: 1 }
          { sales:        49, year: 2000, _count: 2 }
          { sales:        80, year: 2003, _count: 1 }
          { sales:       125, year: 2004, _count: 1 }
          { sales:        30, year: 2005, _count: 1 }
          { sales:        23, year: 2008, _count: 2 }
        ]

    describe "remove Stephenie Meyer's sales in 2008 and Pierre Dukan's sales in 2000", ->
      it 'should remove Stephenie Meyer and Pierre Dukan sales from books_sales_by_author', ( done ) ->
        books_sales._remove [
          { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
          { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , sales: undefined, year: 2008 }
        ]

        books_sales_by_author._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 200, _count: 1 }
          { author: "Dan Brown"              , sales: 244, _count: 3 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 250, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  23, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]      
       
      it 'should remove 10 from sales in 2000 from books_sales_by_year', ( done ) ->
        books_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
          { sales:       125, year: 1853, _count: 1 }
          { sales:       200, year: 1859, _count: 1 }
          { sales:       100, year: 1937, _count: 1 }
          { sales:       200, year: 1955, _count: 2 }
          { sales:        65, year: 1988, _count: 1 }
          { sales:         0, year: 1999, _count: 1 }
          { sales:        39, year: 2000, _count: 1 }
          { sales:        80, year: 2003, _count: 1 }
          { sales:       125, year: 2004, _count: 1 }
          { sales:        30, year: 2005, _count: 1 }
          { sales:        23, year: 2008, _count: 1 }
        ]

  describe 'xs.join() authors, books, and books_sales:', ->
    authors = xs.set [
      { id:  1, name: "Charles Dickens"         }
      { id:  2, name: "J. R. R. Tolkien"        }
      { id:  3, name: "Dan Brown"               }
      { id:  4, name: "Paulo Coelho"            }
      { id:  5, name: "Stieg Larsson"           }
      { id:  6, name: "William Holmes McGuffey" }
      { id:  7, name: "Suzanne Collins"         }
      { id:  8, name: "J.K. Rowling"            }
      { id:  9, name: "Pierre Dukan"            }
      { id: 10, name: "Stephenie Meyer"         }
      { id: 11, name: "Vladimir Nabokov"        }
      { id: 12, name: "Agatha Christie"         }
      # { id: 13, name: "Ellen G. White"          }
      # { id: 14, name: "Roald Dahl"              }
    ], { name: 'authors' }
    
    books = xs.set [
      { id:  1, title: "A Tale of Two Cities"                    , author_id:  1 }
      { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
      { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
      { id:  4, title: "The Alchemist"                           , author_id:  4 }
      { id:  5, title: "Angels and Demons"                       , author_id:  3 }
      { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5 }
      { id:  7, title: "The McGuffey Readers"                    , author_id:  6 }
      { id:  8, title: "The Hobbit"                              , author_id:  2 }
      { id:  9, title: "The Hunger Games"                        , author_id:  7 }
      { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8 }
      { id: 11, title: "The Dukan Diet"                          , author_id:  9 }
      { id: 12, title: "Breaking Dawn"                           , author_id: 10 }
      { id: 13, title: "Lolita"                                  , author_id: 11 }
      { id: 14, title: "And Then There Were None"                , author_id: 12 }
      # { id: 15, title: "Steps to Christ"                         , author_id: 13 }
      { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
    ], { name: 'books' }
    
    books_with_authors = books.join(
      authors
      
      [ [ 'author_id', 'id' ] ]
      
      ( book, author ) ->
        return if author then extend {}, book, { author_name: author.name } else book
      
      { left: true, name: 'books_with_authors' }
    ).set()
    
    books_sales = xs.set [
      { book_id:  1, sales:       200, year: 1859 }
      { book_id:  2, sales:       150, year: 1955 }
      { book_id:  3, sales:        80, year: 2003 }
      { book_id:  4, sales:        65, year: 1988 }
      { book_id:  5, sales:        39, year: 2000 }
      { book_id:  6, sales:        30, year: 2005 }
      { book_id:  7, sales:       125, year: 1853 }
      { book_id:  8, sales:       100, year: 1937 }
      { book_id:  9, sales:        23, year: 2008 }
      { book_id: 10, sales: undefined, year: 1999 }
      { book_id: 11, sales:        10, year: 2000 }
      { book_id: 12, sales: undefined, year: 2008 }
      { book_id: 13, sales:        50, year: 1955 }
      { book_id: 14, sales:       100, year: undefined }
      { book_id: 15, sales:        60, year: null }
      { book_id: 16, sales:        13             }
    ], { key: ['year', 'book_id'], name: 'books_sales' }
    
    it 'should join books and authors', ( done ) ->
      books_with_authors._fetch_all ( values ) -> check done, ->
        found = true
        
        result = xs.set [
          { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
          { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
          { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
          { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
          { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
          { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
          { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
          { id:  7, title: "The McGuffey Readers"                    , author_id:  6, author_name: "William Holmes McGuffey" }
          { id:  9, title: "The Hunger Games"                        , author_id:  7, author_name: "Suzanne Collins"         }
          { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
          { id: 11, title: "The Dukan Diet"                          , author_id:  9, author_name: "Pierre Dukan"            }
          { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
          { id: 13, title: "Lolita"                                  , author_id: 11, author_name: "Vladimir Nabokov"        }
          { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
          { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
        ], { key: [ 'id', 'title', 'author_id', 'author_name' ] }
        
        for v in values
          continue if result.index_of( v ) isnt -1
          
          found = false
          
          break
          
        expect( found ).to.be true
        
    it 'should add a joined author', ( done ) ->
      authors._add [
        { id: 13, name: "Ellen G. White"          }
        { id: 14, name: "Roald Dahl"              }
      ]
      
      books._add [
        { id: 15, title: "Steps to Christ"                         , author_id: 13 }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        found = true
        
        result = xs.set [
          { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
          { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
          { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
          { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
          { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
          { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
          { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
          { id:  7, title: "The McGuffey Readers"                    , author_id:  6, author_name: "William Holmes McGuffey" }
          { id:  9, title: "The Hunger Games"                        , author_id:  7, author_name: "Suzanne Collins"         }
          { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
          { id: 11, title: "The Dukan Diet"                          , author_id:  9, author_name: "Pierre Dukan"            }
          { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
          { id: 13, title: "Lolita"                                  , author_id: 11, author_name: "Vladimir Nabokov"        }
          { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
          { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
          { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
          { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
        ], { key: [ 'id', 'title', 'author_id', 'author_name' ] }
        
        for v in values
          continue if result.index_of( v ) isnt -1

          found = false

          break

        expect( found ).to.be true
