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

utils = require( './xs_tests_utils.js' ) if require?
expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
log    = this.log    || utils.log
xs     = this.xs     || utils.xs

XS      = xs.XS
extend  = XS.extend
uuid_v4 = XS.uuid_v4

# ----------------------------------------------------------------------------------------------
# Check sorted pipelet content
# ----------------------------

check_set_content = ( done, source, values ) ->
  source.fetch_all ( _values ) ->
    check done, () ->
      expect( _values.sort ( a, b ) -> a.id - b.id ).to.be.eql values
  
# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

if require?
  require '../lib/code.js'
  require '../lib/filter.js'
  require '../lib/order.js'
  require '../lib/aggregate.js'
  require '../lib/join.js'
  require '../lib/json.js'

Pipelet = XS.Pipelet
Set     = XS.Set

# ----------------------------------------------------------------------------------------------
# Some constants
# --------------

valid_uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

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
  
  describe 'XS.uuid_v4():', ->
    # Generate 10 random uuid v4 to verify that they al match
    v4_0 = uuid_v4()
    v4_1 = uuid_v4()
    v4_2 = uuid_v4()
    v4_3 = uuid_v4()
    v4_4 = uuid_v4()
    v4_5 = uuid_v4()
    v4_6 = uuid_v4()
    v4_7 = uuid_v4()
    v4_8 = uuid_v4()
    v4_9 = uuid_v4()

    it '10 uuid_v4() should return a uuid v4 string: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is hexadecimal and y [89ab]', ->
      expect( v4_0 ).to.match( valid_uuid_v4 ) and
      expect( v4_1 ).to.match( valid_uuid_v4 ) and
      expect( v4_2 ).to.match( valid_uuid_v4 ) and
      expect( v4_3 ).to.match( valid_uuid_v4 ) and
      expect( v4_4 ).to.match( valid_uuid_v4 ) and
      expect( v4_5 ).to.match( valid_uuid_v4 ) and
      expect( v4_6 ).to.match( valid_uuid_v4 ) and
      expect( v4_7 ).to.match( valid_uuid_v4 ) and
      expect( v4_8 ).to.match( valid_uuid_v4 ) and
      expect( v4_9 ).to.match( valid_uuid_v4 )
  
  # XS.uuid_v4()
  
  describe 'XS.Event_Emitter(): ', ->
    emitter = new XS.Event_Emitter()
    data = null
    complete = null
    
    it 'should be an Event_Emitter', ->
      expect( emitter ).to.be.a XS.Event_Emitter
    
    it 'should allow to emit a "data" event with no exception', ->
      expect( emitter._emit_event( 'data', {} ) ).to.be emitter
      
    it 'should allow to set a "data" event listener', ->
      emitter.on "data", () -> data = arguments
        
      expect( Object.keys emitter._events ).to.be.eql [ "data" ]
      expect( emitter._events.data.length ).to.be 1
      
    it 'should allow to emit a "data" event that sends values to the listener', ->
      expect( emitter._emit_event( 'data', [ { a: 1 } ] ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
        
    it 'should allow to set a "complete" listener once', ->
      emitter._once "complete", () -> complete = arguments
      
      expect( Object.keys emitter._events ).to.be.eql [ "data", "complete" ]
      expect( emitter._events.complete.length ).to.be 1
      
    it 'should allow to emit the "complete" event', ->
      expect( emitter._emit_event( "complete", [ { more: false } ] ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
      expect( complete ).to.be.eql [ { more: false } ]
      
    it 'should then remove the listener on the "complete" event', ->
      expect( Object.keys emitter._events ).to.be.eql [ "data", "complete" ]
      expect( emitter._events.complete.length ).to.be 0
      expect( emitter._events.data.length ).to.be 1
      
    it 'should then allow to emit the "complete" event with calling the complete listener', ->
      expect( emitter._emit_event( "complete", [ { id: 1 } ] ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
      expect( complete ).to.be.eql [ { more: false } ]
      
  # XS.Event_Emitter()
  
  ###
  describe 'XS.more():', ->
    v4 = uuid_v4()

    more_0 = XS.more()
    more_1 = XS.more {}
    more_2 = XS.more { a: 1, b: {} }
    more_3 = XS.more more_2

    more_4 = extend {}, more_3
    more_4.more = false
    more_5 = XS.more more_4

    more_6 = extend {}, more_3
    delete more_6.more
    more_7 = XS.more more_6

    more_8 = extend {}, more_7
    more_8.transaction_id = 1
    more_9 = XS.more more_8
    
    it 'XS.more() should set more', ->
      expect( more_0.more ).to.be.eql true

    it 'XS.more() should provide a transaction_id string', ->
      expect( more_0.transaction_id ).to.be.a 'string'

    it 'XS.more() transaction id should match uuid v4 string', ->
      expect( more_0.transaction_id ).to.match valid_uuid_v4

    it 'XS.more( {} ) should set more', ->
      expect( more_1.more ).to.be.eql true

    it 'XS.more( {} ) should provide a transaction_id string', ->
      expect( more_1.transaction_id ).to.be.a 'string'

    it 'XS.more( {} ) transaction id should match uuid v4 string', ->
      expect( more_1.transaction_id ).to.match valid_uuid_v4

    it 'XS.more( { a: 1, b: {} } ) should set more', ->
      expect( more_2.more ).to.be.eql true

    it 'XS.more( { a: 1, b: {} } ) should provide a transaction_id string', ->
      expect( more_2.transaction_id ).to.be.a 'string'

    it 'XS.more( { a: 1, b: {} } ) transaction id should match uuid v4 string', ->
      expect( more_2.transaction_id ).to.match valid_uuid_v4

    it 'XS.more( { a: 1, b: {} } ) should conserve a and b', ->
      expect( more_2 ).to.be.eql { a: 1, b: {}, more: true, transaction_id: more_2.transaction_id }

    it 'XS.more( { a: 1, b: {}, more: true, transaction_id: uuid_v4() } ) should return self', ->
      expect( more_3 ).to.be more_2

    it 'check test value { a: 1, b: {}, more: false, transaction_id: uuid_v4() }', ->
      expect( more_4 ).to.be.eql { a: 1, b: {}, more: false, transaction_id: more_3.transaction_id }

    it 'XS.more( { a: 1, b: {}, more: false, transaction_id: uuid_v4() } ) should set more to true', ->
      expect( more_5 ).to.be.eql more_2

    it 'check test value { a: 1, b: {}, transaction_id: uuid_v4() }', ->
      expect( more_6 ).to.be.eql { a: 1, b: {}, transaction_id: more_3.transaction_id }

    it 'XS.more( { a: 1, b: {}, transaction_id: uuid_v4() } ) should set more to true', ->
      expect( more_7 ).to.be.eql more_2

    it 'check test value { a: 1, b: {}, transaction_id: 1 }', ->
      expect( more_8 ).to.be.eql { a: 1, b: {}, more: true, transaction_id: 1 }

    it 'XS.more( { a: 1, b: {}, transaction_id: uuid_v4() } ) should set transaction id to uuid v4 ', ->
      expect( more_9 ).to.be.eql( { a: 1, b: {}, more: true, transaction_id: more_9.transaction_id } ) &&
      expect( more_9.transaction_id ).to.match valid_uuid_v4

  # more()

  describe 'XS.no_more():', ->
    more_0 = XS.more()
    more_0_clone = clone more_0

    more_1 = XS.more { a: 1 }
    more_1_clone = clone more_1

    it 'should have original transaction id but no "more" flag', ->
      expect( XS.no_more more_0 ).to.be.eql { transaction_id: more_0.transaction_id }

    it 'should not alter original object', ->
      expect( more_0 ).to.be.eql more_0_clone

    it 'should have original transaction id with other attributes but no "more" flag', ->
      expect( XS.no_more more_1 ).to.be.eql { transaction_id: more_1.transaction_id, a: 1 }

    it 'should not alter original object', ->
      expect( more_1 ).to.be.eql more_1_clone

  # no_more()
  ###

  describe 'XS.only_more():', ->
    it 'XS.only_more should be a function with one parameter', ->
      expect( XS.only_more ).to.be.a( 'function' ) &&
      expect( XS.only_more.length ).to.be.eql 1

    it 'XS.only_more() should return undefined', ->
      expect( XS.only_more() ).to.be.eql {}

    it 'XS.only_more( { more: false, a: 1; b: {} } ) should return {}', ->
      expect( XS.only_more( { more: false, a: 1; b: {} } ) ).to.be.eql {}

    it 'XS.only_more( { a: 1; b: {} } ) should return {}', ->
      expect( XS.only_more( { a: 1; b: {} } ) ).to.be.eql {}

    it 'XS.only_more( { more: "", a: 1; b: {} } ) should return {}', ->
      expect( XS.only_more( { more: '', a: 1; b: {} } ) ).to.be.eql {}

    it 'XS.only_more( { more: true, a: 1; b: {} } ) should throw an exception for missing transaction id', ->
      expect( () -> XS.only_more( { more: true, a: 1; b: {} } ) ).to.throwException()

    it 'XS.only_more( { more: true, transaction_id: uuid_v4, a: 1; b: {} } ) should return { more: true, transaction_id: uuid_v4 }', ->
      more = { more: true, transaction_id: uuid_v4(), a: 1; b: {} }

      expect( XS.only_more( more ) ).to.be.eql( { more: true, transaction_id: more.transaction_id } ) &&
      expect( more.transaction_id ).to.match valid_uuid_v4

    it 'XS.only_more( { more: false, transaction_id: uuid_v4, a: 1; b: {} } ) should return { more: true, transaction_id: uuid_v4 }', ->
      more = { more: false, transaction_id: uuid_v4(), a: 1; b: {} }

      expect( XS.only_more( more ) ).to.be.eql( { transaction_id: more.transaction_id } ) &&
      expect( more.transaction_id ).to.match valid_uuid_v4

    it 'XS.only_more( { more: 1, transaction_id: uuid_v4, a: 1; b: {} } ) should return { more: true, transaction_id: uuid_v4 }', ->
      more = { more: 1, transaction_id: uuid_v4(), a: 1; b: {} }

      expect( XS.only_more( more ) ).to.be.eql( { more: true, transaction_id: more.transaction_id } ) &&
      expect( more.transaction_id ).to.match valid_uuid_v4

    it 'XS.only_more( { more: 0, transaction_id: uuid_v4, a: 1; b: {} } ) should return { transaction_id: uuid_v4 }', ->
      more = { more: 0, transaction_id: uuid_v4(), a: 1; b: {} }

      expect( XS.only_more( more ) ).to.be.eql( { transaction_id: more.transaction_id } ) &&
      expect( more.transaction_id ).to.match valid_uuid_v4

    it 'XS.only_more( { transaction_id: uuid_v4, a: 1; b: {} } ) should return { transaction_id: uuid_v4 }', ->
      more = { transaction_id: uuid_v4(), a: 1; b: {} }

      expect( XS.only_more( more ) ).to.be.eql( { transaction_id: more.transaction_id } ) &&
      expect( more.transaction_id ).to.match valid_uuid_v4

  # only_more()

  describe 'XS.Transactions() and XS.Transaction():', ->
    Transaction  = XS.Transaction
    Transactions = XS.Transactions
    
    describe 'Transaction with no options or pipelet', ->
      t = new Transaction 4
      
      options = undefined
      tid = undefined
      
      it 'should be a Transaction with a count of 4', ->
        expect( t ).to.be.a Transaction
        expect( t.source_options ).to.be undefined
        expect( t.emit_options ).to.be undefined
        expect( t.o.__t ).to.be t
        
      it 't.toJSON() should return a representation of the new transaction', ->
        expect( t.toJSON() ).to.be.eql {
          name          : ''
          tid           : undefined
          count         : 4
          source_more   : false
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
      
      it 'after t.next(), count should be 3', ->
        expect( t.next().toJSON() ).to.be.eql {
          name          : ''
          tid           : undefined
          count         : 3
          source_more   : false
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
      
      it 't.get_options() should set more', ->
        expect( t.get_options() ).to.be.eql { more: true, __t: t }
      
      it 't.get_emit_options() should provide "more" and a uuid v4 "transaction_id"', ->
        options = t.get_emit_options()
        
        expect( options.more ).to.be.eql true
        expect( tid = options.transaction_id ).to.match valid_uuid_v4
      
      it 'need_close should be true', ->
        expect( t.toJSON() ).to.be.eql {
          name          : ''
          tid           : tid
          count         : 3
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 0
          removed_length: 0
        }
      
      it 'should continue to provide "more" and the same "transaction_id" after next().get_emit_options()', ->
        expect( t.next().get_emit_options() ).to.be     options
        expect( options                     ).to.be.eql { more: true, transaction_id: tid }
      
      it 'should decrease count to 1 and set added_length to 2 after t.emit_add( [{}{}] )', ->
        expect( t.emit_add( [{},{}] ).toJSON() ).to.be.eql {
          name          : ''
          tid           : tid
          count         : 1
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 2
          removed_length: 0
        }
      
      it 'should decrease count to zero and set removed_length to 1 after t.emit_remove( [{}] )', ->
        expect( t.emit_remove( [{}] ).toJSON() ).to.be.eql {
          name          : ''
          tid           : tid
          count         : 0
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 2
          removed_length: 1
        }
      
      it 'should return more with t.get_options()', ->
        expect( t.get_options() ).to.be.eql { __t: t, more: true }
      
      it 'should return more with transaction id with t.get_emit_options()', ->
        expect( t.get_emit_options() ).to.be.eql { more: true, transaction_id: tid }
      
      it 'should no longer need close but it should now be closed', ->
        expect( t.toJSON() ).to.be.eql {
          name          : ''
          tid           : tid
          count         : 0
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 2
          removed_length: 1
        }
      
      it 'should allow to retrieve options with t.get_emit_options()', ->
        expect( options = t.get_emit_options() ).to.be.eql { more: true, transaction_id: tid }
        
      it 'should not change the state of the transaction', ->
        expect( t.toJSON() ).to.be.eql {
          name          : ''
          tid           : tid
          count         : 0
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 2
          removed_length: 1
        }
      
      it 'should throw an exception after 1 more t.next()', ->
        expect( () -> return t.next() ).to.throwException()
    
    describe 'Transactions()..get_transaction() for four operations with pseudo pipelet, options with more', ->
      transactions = new Transactions()
      
      pipelet = {
        _operations: []
        
        _get_name: -> 'Pipelet'
        
        emit : ( operation, values, options ) ->
          this._operations.push( arguments )
          
          return this
      }
      
      tid = uuid_v4()
      
      options = { more: true, transaction_id: tid, a: 1, b: [1,2] }
      options_original = clone( options );
      
      t = transactions.get_transaction 4, options, pipelet
      
      it 'should create a transaction with a count of 4, and a name', ->
        expect( t.get_tid()   ).to.be tid
        expect( t.is_closed() ).to.be false
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 4
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
      
      it 'should set one transaction in transactions', ->
        expect( transactions.get_tids() ).to.be.eql [ tid ]
        expect( transactions.get( tid ) ).to.be t
        
      it 'should decrease count after t.emit_nothing()', ->
        t.emit_nothing()
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 3
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
      
      it 'should decrease count after t.emit_add( [] )', ->
        t.emit_add( [] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 2
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
        
      it 'should decrease count and increse added_length after t.emit_add( [ { id: 1 } ] )', ->
        t.emit_add( [ { id: 1 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 1
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 1
          removed_length: 0
        }
        
      it 'should decrease count and need close after t.emit_add( [ { id: 2 } ], true )', ->
        t.emit_add( [ { id: 2 } ], true )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 0
          source_more   : true
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 0
        }
      
      it 'should have emited an add operation to the pipelet', ->
        expect( pipelet._operations ).to.be.eql [
          [ 'add', [ { id: 2 } ], options_original ]
        ]
        
      it 'should raise an exception on extra t.emit_add( [ { id: 1 } ], true )', ->
        expect( -> t.emit_add( [ { id: 3 } ], true ) ).to.throwException()
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 0
          source_more   : true
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 0
        }
        
      it 'should not terinate the transaction after transactions.end_transaction( t ) because of more from upstream', ->
        transactions.end_transaction( t )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 0
          source_more   : true
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 0
        }
      
      it 'should not have removed the transaction from transactions', ->
        expect( transactions.get_tids() ).to.be.eql [ tid ]
      
      it 'should have emited two operations in total to the pipelet', ->
        expect( pipelet._operations ).to.be.eql [
          [ 'add', [ { id: 2 } ], options_original ]
        ]
        
      it 'should return the same transaction after follow-up transactions.get_transaction()', ->
        options.more = false
        orginal_options = clone options
        
        t1 = transactions.get_transaction 4, options, pipelet
        
        expect( t1 ).to.be t
        
      it 'should have increased transaction\'s operations count by 4', ->
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 4
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 0
        }
      
      it 'should increase removed_length to 2 after t.emit_remove( [ { id:1 }, { id: 2 } ] )', ->
        t.emit_remove( [ { id:1 }, { id: 2 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'Pipelet'
          tid           : tid
          count         : 3
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 2
        }
      
    
  # XS.Transactions() and XS.Transaction()
  
  describe 'XS.Query():', ->
    Query = XS.Query
    
    q = q1 = null
    
    it 'new Query( [] ) should create an empty query', ->
      q = new Query [];
      
      expect( q.query   ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
      
    it 'new Query() should create an empty query', ->
      q = new Query();
      
      expect( q.query   ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    
    
    it 'Query..add() should allow to "or" two empty queries', ->
      q = new Query( [] )
      
      expect( q.add( [] ).query ).to.be.eql []
      expect( q.adds ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should add query to empty query', ->
      expect( q.add( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql []
      
    it 'Query..add() should OR two queries', ->
      expect( q.add( [ { flow: 'user' } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
      
    it 'Query..add() should OR two queries and result in optimized query', ->
      expect( q.add( [ { flow: 'group', id: 1465 } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should not duplicate existing expressions', ->
      expect( q.add( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query.add() should remove an expression if a new less restrictive is or-ed', ->
      q.add( [ { flow: 'post', id: 1 }, { flow: 'post' } ] )
      
      expect( q.query ).to.be.eql [ { flow: 'group' }, { flow: 'user' }, { flow: 'post' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' }, { flow: 'post', id: 1 }, { flow: 'post' } ]
      expect( q.removes ).to.be.eql [ { flow: 'post', id: 1 } ]
    
    it 'new Query( query ) should self optimize and not alter parameter query', ->
      query = [ { flow: 'group' }, { flow: 'group' }, { flow: 'user' }, { flow: 'group' }, { flow: 'user' } ]
      
      q = new Query( query )
      
      expect( q.query ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( query ).to.be.eql [ { flow: 'group' }, { flow: 'group' }, { flow: 'user' }, { flow: 'group' }, { flow: 'user' } ]
      expect( q.adds ).to.be.eql [ { flow: 'group' }, { flow: 'user' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..add() should optimize more than one left expression per less restrictive right expression', ->
      q1 = [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      
      q = new Query( q1 ).add [ flow: 'group' ]
      
      expect( q.query   ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 }, { flow: 'group' } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
    
    it 'should not have alterned Query() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
    
    
    
    it 'Query..and() should allow to "and" two empty queries', ->
      q = new Query []
      
      expect( q.and( [] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should remain empty after "and" query to empty query', ->
      expect( q.and( [ { flow: 'group' } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should not change query after "and" query with same query', ->
      expect( q.add( [ { flow: 'group' } ] ).and( [ { flow: 'group' } ] ).query ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() should AND two queries', ->
      expect( q.and( [ { id: 26 } ] ).query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' } ]
    
    it 'Query..and() with one false sub term should AND two queries', ->
      q.add( [ { flow: 'group', id: 27 } ] ).and( [ { id: 26 } ] )
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 27 } ]
      
    it 'Query..clear_operations() should empty adds and removes', ->
      q.clear_operations()
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 } ]
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..and() with only one false sub term should AND two queries to result in an empty query', ->
      expect( q.and( [ { id: 27 } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 } ]
    
    it 'Query..and() with two AND propositions should AND two queries and produce two propositions', ->
      q1 = [ { id: 26 }, { id: 27 } ]
      q.add( [ { flow: 'group' } ] ).and q1
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 26 }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group' } ]
    
    it 'should not have alterned and() parameter query', ->
      expect( q1 ).to.be.eql [ { id: 26 }, { id: 27 } ]
      
    it 'Query..and() with two AND propositions with more terms than original should AND two queries and produce one proposition', ->
      q.clear_operations()
      
      q1 = [ { flow: 'group', id: 27 }, { flow: 'user', id: 234 } ]
      q.add( [ { flow: 'group' } ] ).and q1
      
      expect( q.query ).to.be.eql [ { flow: 'group', id: 27 } ]
      expect( q.adds    ).to.be.eql [ { flow: 'group' }, { flow: 'group', id: 27 } ]
      expect( q.removes ).to.be.eql [ { flow: 'group', id: 26 }, { flow: 'group', id: 27 }, { flow: 'group' } ]
    
    it 'should not have alterned and() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 27 }, { flow: 'user', id: 234 } ]
      
    
    
    it 'Query..remove() should allow to "remove" two empty queries', ->
      q = new Query( [] )
      
      expect( q.remove( [] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql []
      expect( q.removes ).to.be.eql []
    
    it 'Query..remove() should remain empty after "remove" query to empty query', ->
      expect( q.add( [ { flow: 'group' } ] ).remove( [ { flow: 'group' } ] ).query ).to.be.eql []
      expect( q.adds    ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes ).to.be.eql [ { flow: 'group' } ]
    
    it 'Query..remove() should raise an exception after "remove" from empty query', ->
      expect( () -> new Query( [] ).remove( [ { flow: 'group' } ] ).query )
        .to.throwException()
    
    it 'Query..remove() should raise an exception after "remove" with not-found query', ->
      expect( () -> new Query( [ { flow: 'group', id: 1 } ] ).remove( [ { flow: 'group' } ] ).query )
        .to.throwException()
    
    it 'Query..remove() should raise an exception after "remove" with not-found query', ->
      expect( () -> new Query( [ { flow: 'group' } ] ).remove( [ { flow: 'group', id: 1 } ] ).query )
        .to.throwException()
    
    it 'Query..remove() should remove two queries after "remove"', ->
      q = new Query( [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ] ).remove [
          { flow: 'group', id: 2 }
          { flow: 'user', id: 3 }
        ]
      
      expect( q.query ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 3 }
        ]
      expect( q.adds ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ]
      expect( q.removes ).to.be.eql [
          { flow: 'group', id: 2 }
          { flow: 'user', id: 3 }
        ]
      
    it 'Query..remove() should remove expressions after "remove" even if removed out of order', ->
      q1 = [
        { flow: 'user', id: 2 }
        { flow: 'group', id: 3 }
        { flow: 'user', id: 4 }
        { flow: 'group', id: 1 }
        { flow: 'user', id: 1 }
        { flow: 'user', id: 3 }
      ]
      
      q = new Query( [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ] ).remove q1
        
      expect( q.query ).to.be.eql [
          { flow: 'group', id: 2 }
        ]
      expect( q.adds ).to.be.eql [
          { flow: 'user', id: 1 }
          { flow: 'user', id: 2 }
          { flow: 'user', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'group', id: 2 }
          { flow: 'group', id: 3 }
        ]
      expect( q.removes ).to.be.eql [
          { flow: 'user', id: 2 }
          { flow: 'group', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'user', id: 1 }
          { flow: 'user', id: 3 }
        ]
    
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [
          { flow: 'user', id: 2 }
          { flow: 'group', id: 3 }
          { flow: 'user', id: 4 }
          { flow: 'group', id: 1 }
          { flow: 'user', id: 1 }
          { flow: 'user', id: 3 }
        ]
      
    it 'should not remove an expression which was previously optimized-out by add()', ->
      q.clear_operations()
      
      q.add    [ { flow: 'group' } ]
      
      expect( q.optimized ).to.be.eql [ { flow: 'group', id: 2 } ]
      
      q1 = [ { flow: 'group', id: 2 } ]
      
      q.remove q1
      
      expect( q.query     ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group' } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.optimized ).to.be.eql []
    
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group', id: 2 } ]
    
    it 'should recover expression previously optimized-out by add() when removing the less restrictive operation', ->
      q = new Query [ { flow: 'group', id: 2 } ]
      
      expect( q.query     ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.removes   ).to.be.eql []
      expect( q.optimized ).to.be.eql []
      
      # add less restrictive expression than { flow: 'group', id: 2 }
      q.add [ { flow: 'group' } ] 
      
      expect( q.query     ).to.be.eql [ { flow: 'group' } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.optimized ).to.be.eql [ { flow: 'group', id: 2 } ]
      
      # remove less restrictive operation
      q1 = [ { flow: 'group' } ]
      
      q.remove [ { flow: 'group' } ]
      
      # expects more restrictive expression { flow: 'group', id: 2 } to be recovered
      expect( q.query     ).to.be.eql [ { flow: 'group', id: 2 } ]
      expect( q.adds      ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' }, { flow: 'group', id: 2 } ]
      expect( q.removes   ).to.be.eql [ { flow: 'group', id: 2 }, { flow: 'group' } ]
      expect( q.optimized ).to.be.eql []
      
    it 'should not have alterned remove() parameter query', ->
      expect( q1 ).to.be.eql [ { flow: 'group' } ]
    
    
    
    it 'generate() should generate a filter() function', ->
      q = new Query( [ { flow: 'group' }, { flow: 'user', id: 231 } ] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
      
    it 'filter() should filter an Array of Objects', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
      ]
    
    it 'should generate a filter for a query with no or-terms', ->
      q = new Query( [] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
    
    it 'should filter everything, this is the nul-filter', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql []
    
    it 'should generate a filter for a query with one or-terms having no and terms', ->
      q = new Query( [ {} ] ).generate()
      
      expect( typeof ( q.filter ) ).to.be.eql 'function'
    
    it 'should filter nothing, this is a pass-through filter', ->
      expect( q.filter [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ] ).to.be.eql [
        { flow: 'group', id: 826 }
        { flow: 'group', id: 295 }
        { flow: 'user', id: 231 }
        { flow: 'user', id: 235 }
      ]
    
  describe 'XS.Pipelet(): tests for Query Tree', ->
    tree = new XS.Pipelet()
    
    subscriber_1 = xs.set( { name: 'subscriber_1' } )
    subscriber_2 = xs.set( { name: 'subscriber_2' } )
    subscriber_3 = xs.set( { name: 'subscriber_3' } )
    
    it 'Pipelet() should allow to create a top query tree node', ->
      expect( tree.query_tree_top ).to.be.eql {
        branches   : {}
        keys       : []
        subscribers: []
        subscribers_values: []
      }
    
    it 'Adding a query should generate a query tree', ->
      expect( tree
        .query_tree_add( [ { flow: 'user' } ], subscriber_1 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
              subscribers_values: []
            }
          }
        }
        keys       : [ "flow" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Adding an empty OR-term should add subscriber to the root of the tree - i.e. unfiltered', ->
      expect( tree
        .query_tree_add( [ {} ], subscriber_2 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
              subscribers_values: []
            }
          }
        }
        keys       : [ "flow" ]
        subscribers: [ subscriber_2 ]
        subscribers_values: []
      }
      
    it 'Adding an additional query should expand the query tree', ->
      expect( tree
        
        .query_tree_add( [
          { flow: 'user' }
          { flow: 'group', id: 527 }
          { id: 521, flow: 'group' }
          { id: 425 }
        ], subscriber_3 )
        
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1, subscriber_3 ]
              subscribers_values: []
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys       : [ "flow", "id" ]
        subscribers: [ subscriber_2 ]
        subscribers_values: []
      }
      
    it 'Remove a query should shrink the query tree', ->
      expect( tree
        .query_tree_remove( [ {} ], subscriber_2 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1, subscriber_3 ]
              subscribers_values: []
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove another query should shrink the query tree further', ->
      expect( tree
        .query_tree_remove( [ { flow: 'user' } ], subscriber_3 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "user": {
              branches: {}
              keys: []
              subscribers: [ subscriber_1 ]
              subscribers_values: []
            }
            
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove another query should shrink the query tree even further', ->
      expect( tree
        .query_tree_remove( [ { flow: 'user' } ], subscriber_1 )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Add and Remove empty queries should not change anything', ->
      expect( tree
        .query_tree_add( [] ).query_tree_remove( [] )
        .query_tree_top
      ).to.be.eql {
        branches: {
          "flow": {
            "group": {
              branches: {
                "id": {
                  "527": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                  
                  "521": {
                    branches: {}
                    keys: []
                    subscribers: [ subscriber_3 ]
                    subscribers_values: []
                  }
                }
              }
              keys: [ "id" ]
              subscribers: []
              subscribers_values: []
            }
          }
          
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "flow", "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove another query should shrink the query tree even further', ->
      expect( tree
        
        .query_tree_remove( [
          { flow: 'group', id: 521 }
          { id: 527, flow: 'group' }
        ], subscriber_3 )
        
        .query_tree_top
      ).to.be.eql {
        branches: {
          "id" : {
            "425": {
              branches: {}
              keys: []
              subscribers: [ subscriber_3 ]
              subscribers_values: []
            }
          }
        }
        keys      : [ "id" ]
        subscribers: []
        subscribers_values: []
      }
      
    it 'Remove the last record, should empty the query tree', ->
      expect( tree
        .query_tree_remove( [ { id: 425 } ], subscriber_3 )
        .query_tree_top
      ).to.be.eql {
        branches  : {}
        keys      : []
        subscribers: []
        subscribers_values: []
      }
      
  describe 'Query_Tree routing:', ->
    tree = new XS.Pipelet()
    
    subscriber_1 = xs.set( { name: 'subscriber_1' } )
    subscriber_2 = xs.set( { name: 'subscriber_2' } )
    subscriber_3 = xs.set( { name: 'subscriber_3' } )
    subscriber_4 = xs.set( { name: 'subscriber_4' } )
    
    tree.query_tree_add [ { flow: 'user', id: 123 } ], subscriber_1
    
    tree.query_tree_add [ { flow: 'user', id: 345 } ], subscriber_2
    
    tree.query_tree_add [ {} ], subscriber_3
    
    tree.query_tree_add [ { id: 123 }, { flow: 'user' } ], subscriber_4
    
    tree.query_tree_emit 'add', [
      { flow: 'group' }
      { id: 123 }
      { flow: 'user', id: 123 }
      { flow: 'user', id: 345 }
    ]
    
    it 'Should allow to emit an add operation filtered by a query to the first subscriber', ( done ) ->
      subscriber_1.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 123 }
        ]
        
    it 'Should emit other values to the second subscriber', ( done ) ->
      subscriber_2.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 345 }
        ]
      
    it 'Should emit all values to the third subscriber', ( done ) ->
      subscriber_3.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
          { id: 123 }
          { flow: 'user', id: 123 }
          { flow: 'user', id: 345 }
        ]

    it 'Should not duplicate or reorder values emited to fourth subscriber', ( done ) ->
      subscriber_4.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { id: 123 }
          { flow: 'user', id: 123 }
          { flow: 'user', id: 345 }
        ]

    it "should alter first recepient's set", ( done ) ->
      tree.query_tree_emit 'remove', [ { flow: 'user', id: 123 } ]
      
      subscriber_1.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
        
    it "should not alter second subscriber's set", ( done ) ->
      subscriber_2.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'user', id: 345 }
        ]
    
    it 'Third subscriber set should have two record less after removing one more record', ( done ) ->
      tree.query_tree_emit 'remove', [ { id: 123 } ]
      
      subscriber_3.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
          { flow: 'user', id: 345 }
        ]
      
    it 'Second subscriber be empy after removing one more record', ( done ) ->
      tree.query_tree_emit 'remove', [ { flow: 'user', id: 345 } ]
      
      subscriber_2.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
      
    it 'And third subscriber should have only one record left', ( done ) ->
      subscriber_3.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql [
          { flow: 'group' }
        ]
      
    it 'third subscriber should be empty after removing last record', ( done ) ->
      tree.query_tree_emit 'remove', [ { flow: 'group' } ]
      
      subscriber_3.fetch_all ( values ) -> check done, () ->
        expect( values ).to.be.eql []
      
    it 'clear should clear all records from all subscribers', ( done ) ->
      tree.query_tree_add [ { flow: 'user', id: 123 } ], subscriber_1
      
      tree.query_tree_add [ { flow: 'user', id: 345 } ], subscriber_2
      
      tree.query_tree_add [ {} ], subscriber_3
      
      tree.query_tree_add [ { id: 123 }, { flow: 'user' } ], subscriber_4
      
      tree.query_tree_emit 'add', [
        { flow: 'group' }
        { id: 123 }
        { flow: 'user', id: 123 }
        { flow: 'user', id: 345 }
      ]
      
      tree.query_tree_emit 'clear'
      
      count = 4
      all_values = []

      fetched = ( values ) ->
        all_values.push( values )
        
        --count || check done, () ->
          expect( all_values ).to.be.eql [ [], [], [], [] ]

      subscriber_1.fetch_all fetched
      subscriber_2.fetch_all fetched
      subscriber_3.fetch_all fetched
      subscriber_4.fetch_all fetched
      
  describe 'Pipelets Connections', ->
    values = [ { id: 1 }, { id: 2 } ]
    
    it 'should fetch content through a stateless pipelet', ( done ) ->
      p = xs.set( values ).pass_through()
      
      p.fetch_all ( _values ) -> check done, -> expect( _values ).to.be.eql values
      
    it 'should have fetched content into a set through a stateless pipelet', ->
      s = xs.set( values ).pass_through().set()
      
      expect( s.a ).to.be.eql values
    
    it 'should fetch content even if stateless pipelet is pluged last into upstream pipelet', ( done ) ->
      s = xs.set( values )
      
      p = xs.pass_through()
      
      s.plug( p )
      
      p.fetch_all ( _values ) -> check done, -> expect( _values ).to.be.eql values
      
    it 'should have fetched content into a set even if stateless pipelet is pluged last into upstream pipelet', ->
      s = xs.set( values )
      
      p = xs.pass_through()
      
      s1 = p.set()
      
      s.plug( p )
      
      expect( s1.a ).to.be.eql values
      
  describe 'XS.Set():', ->
    set = xs.set();
    
    it 'set should be a Set', ->
      expect( set ).to.be.a XS.Set
    
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
    
    delayed_set = delayed_set.filter( () -> true )
    
    cars = xs
      .set( [
            { id: 1, brand: "Mercedes", model: "C Class" }
            { id: 2, brand: "Mercedes", model: "S Class" }
            { id: 3, brand: "BMW"     , model: "M Serie" }
          ]
        , { key: [ "id", "model" ] }
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
        delayed_set.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:1, value: 'delayed' }
        ]
    
    describe 'fetch_all():', ->
      it 'set.fetch_all() should be empty', ( done ) ->
        set.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql []
      
      it 'cars.fetch_all() should be equal to result', ( done ) ->
        cars.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { flow: "car", id: 1, brand: "Mercedes", model: "C Class" }
          { flow: "car", id: 2, brand: "Mercedes", model: "S Class" }
          { flow: "car", id: 3, brand: "BMW"     , model: "M Serie" }
        ]
    
    describe 'add():', ->
      it 'should contain Berlin after adding it', ( done ) ->
        cities.add [ { id: 4, name: "Berlin", country: "Germany" } ]
        
        cities.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
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
      it 'set.remove( [ { id: 1 } ] ).add( [ { id: 2 } ] ) should have id 2', ( done ) ->
        set.remove( [ { id: 1 } ] ).add( [ { id: 2 } ] ).fetch_all ( values ) ->
          check done, -> expect( values ).to.be.eql [ { id: 2 } ]
      
      it 'should have an one value in the anti-state', ->
        expect( set.b ).to.be.eql [ { id: 1 } ]
      
      it 'adding back this element should not change the set', ( done ) ->
        set.add( [ { id: 1 } ] ).fetch_all ( values ) ->
          check done, -> expect( values ).to.be.eql [ { id: 2 } ]
      
      it 'anti-state should be empty again', ->
        expect( set.b ).to.be.eql []
        
      it 'removing id 2 should left set empty again', ( done ) ->
        set.remove( [ { id: 2 } ] ).fetch_all ( values ) ->
          check done, -> expect( values ).to.be.eql []
      
      it 'employee.remove( [ { id: 15 } ] ) should be equal to employee: record with id 15 doesn\'t exist', ( done ) ->
        employee.remove( [ { id: 15 } ] )
        
        employee.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:  1, name: "Stephen C. Cox" , salary: "$3000", customer_id: "222", order_id: "1222" }
          { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
          { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
          { id:  5, name: "Alex Frog"      , salary: "$3000", customer_id: "226", order_id: "1226" }
          { id:  6, name: "Tim Hancook"    , salary: "$1500", customer_id: "227", order_id: "1227" }
        ]
      
      it 'employee.remove( [ { id: 1 } ] ) should be equal to result: first record', ( done ) ->
        employee.remove( [ { id: 1 } ] )
        
        employee.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
          { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
          { id:  5, name: "Alex Frog"      , salary: "$3000", customer_id: "226", order_id: "1226" }
          { id:  6, name: "Tim Hancook"    , salary: "$1500", customer_id: "227", order_id: "1227" }
        ]

      it 'employee.remove( [ { id: 5 } ] ) should be equal to result: record in the middle', ( done ) ->
        employee.remove( [ { id: 5 } ] )
        
        employee.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
          { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
          { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
          { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
          { id:  6, name: "Tim Hancook"    , salary: "$1500", customer_id: "227", order_id: "1227" }
        ]
      
      it 'employee.remove( [ { id: 6 } ] ) should be equal to result: last record', ( done ) ->
        employee
          .remove( [ { id: 6 } ] )
          .fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
              { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
              { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
            ]
    
    describe 'update():', ->
      it 'set.update( [ [ { id: 1 }, { id: 1, v: "test" } ] ] ) should be equal to set: empty set', ( done ) ->
        set
          .update( [ [ { id: 1 }, { id: 1, v: 'test' } ] ] )
          .fetch_all ( values ) -> check done, -> expect( values ).to.be.eql []
      
      it 'employee with add, update and remove inverted should end with update done', ( done ) ->
        employee
          .remove(   [ { id: 15, name: "Khalifa P Nassik", salary: "$2500" } ] )
          .update( [ [ { id: 15, name: "Khalifa P Nassik", salary: "$1500" }
                       { id: 15, name: "Khalifa P Nassik", salary: "$2500" } ] ] )
          .add(      [ { id: 15, name: "Khalifa P Nassik", salary: "$1500" } ] )
          .fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id:  2, name: "Josephin Tan"   , salary: "$1500", customer_id: "223", order_id: "1223" }
              { id:  3, name: "Joyce Ming"     , salary: "$2000", customer_id: "224", order_id: "1224" }
              { id:  4, name: "James A. Pentel", salary: "$1750", customer_id: "225", order_id: "1225" }
            ]
      
      it 'employee.update( [ [ { id: 3 }, { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" ] ] } ) should be equal to result', ( done ) ->
        employee.update( [ [ { id: 3 }, { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" } ] ] )

        employee.fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Josephin Tan"    , salary: "$1500", customer_id: "223", order_id: "1223" }
            { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
            { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
          ]
    
    describe 'filter():', ->
      is_in_usa = ( city, c, cities ) ->
        return city.country is 'USA'
      
      cities_in_usa = cities.filter is_in_usa
      
      it 'cities_in_usa should be a Pipelet', ->
        expect( cities_in_usa ).to.be.an XS.Pipelet
      
      it 'cities_in_usa should only contain cities in USA', ( done ) ->
        cities_in_usa.fetch_all ( values ) -> check done, ->
          expect( values ).to.be.eql [
            { id: 2, name: "Mountain View", country: "USA", state: "California" }
          ]
      
      describe 'add():', ->
        it 'cities_in_usa should show one more city after adding New York to cities', ( done ) ->
          cities.add [ { id: 5, name: "New York", country: "USA", state: "New York" } ]
          
          cities_in_usa.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
            { id: 2, name: "Mountain View", country: "USA", state: "California" }
            { id: 5, name: "New York", country: "USA", state: "New York" }
          ]
        
        it 'cities_in_usa should show only one more city after adding Casablanca and Huston', ( done ) ->
          cities.add [
            { id: 6, name: "Casablanca", country: "Morocco"                 }
            { id: 7, name: 'Huston'    , country: 'USA'    , state: 'Texas' }
          ]
          
          cities_in_usa.fetch_all ( values ) -> check done, -> expect( values ).to.be.eql [
            { id: 2, name: "Mountain View", country: "USA", state: "California" }
            { id: 5, name: "New York"     , country: "USA", state: "New York"   }
            { id: 7, name: "Huston"       , country: "USA", state: "Texas"      }
          ]
      
      describe 'update', ->
        it 'cities_in_usa should be updated when updating "New York" to "New York City" in cities', ( done ) ->
          cities.update [
            [ { id: 5, name: "New York", country: "USA", state: "New York" }, { id: 5, name: "New York City", country: "USA", state: "New York" } ]
          ]
          
          cities_in_usa.fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id: 2, name: "Mountain View", country: "USA", state: "California" }
              { id: 5, name: "New York City", country: "USA", state: "New York"   }
              { id: 7, name: "Huston"       , country: "USA", state: "Texas"      }
            ]
        
        it 'cities_in_usa should remove Huston after it be updated to Venice in cities', ( done ) ->
          cities.update [ [ { id: 7, name: "Huston", country: "USA", state: "Texas" }, { id: 7, name: "Venice", country: "Italy" } ] ]
          
          cities_in_usa.fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id: 2, name: "Mountain View", country: "USA", state: "California" }
              { id: 5, name: "New York City", country: "USA", state: "New York"   }
            ]
        
        it 'should add Detroit in cities_in_usa, after Paris is updated to Detroit in cities', ( done ) ->
          cities.update [ [ { id: 3, name: "Paris", country: "France" }, { id: 8, name: "Detroit", country: "USA", state: "Michigan" } ] ]
          
          cities_in_usa.fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id: 2, name: "Mountain View", country: "USA", state: "California" }
              { id: 5, name: "New York City", country: "USA", state: "New York"   }
              { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"   }
            ]
        
        it 'should not change cities_in_usa after Paris is updated to Madrid in cities, resulting in Paris added to cities anti-state', ( done ) ->
          cities.update [ [ { id: 3, name: "Paris", country: "France" }, { id: 9, name: "Madrid", country: "Spain" } ] ]
          
          cities_in_usa.fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id: 2, name: "Mountain View", country: "USA", state: "California" }
              { id: 5, name: "New York City", country: "USA", state: "New York"   }
              { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"   }
            ]
        
      describe 'remove()', ->
        it 'cities_in_usa should be equal to result: cities.remove( [ { id: 2, name: "Mountain View", country: "USA", state: "California" } ] )', ( done ) ->
          cities.remove [ { id: 2, name: "Mountain View", country: "USA", state: "California" } ]
          
          cities_in_usa.fetch_all ( values ) -> check done, ->
            expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
              { id: 5, name: "New York City", country: "USA", state: "New York" }
              { id: 8, name: "Detroit" , country: "USA", state: "Michigan" }
            ]
        
        it 'cities_in_usa should be equal to result: cities.remove( [ { id: 7, name: "Venice", country: "Italy" } ] )', ( done ) ->
          cities.remove [ { id: 7, name: "Venice", country: "Italy" } ]
          
          cities_in_usa.fetch_all ( values ) -> check done, ->
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
        check_set_content done, cities.filter( [] ).trace( 'filter_no_country' ), []
      
      it 'should contain all cities when an empty or-term is provided', ( done ) ->
        check_set_content done, cities.filter( [ {} ] ).trace( 'filter_no_country' ), [
            { id: 1, name: "Marrakech"    , country: "Morocco"                      }
            { id: 4, name: "Berlin"       , country: "Germany"                      }
            { id: 5, name: "New York City", country: "USA", state: "New York"       }
            { id: 6, name: "Casablanca"   , country: "Morocco"                      }
            { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }
            { id: 9, name: "Madrid"       , country: "Spain"                        }
          ]
      
      it 'should only contain cities from USA and Morocco', ( done ) ->
        check_set_content done, cities.filter( countries ), [
            { id: 1, name: "Marrakech"    , country: "Morocco"                      }
            { id: 5, name: "New York City", country: "USA", state: "New York"       }
            { id: 6, name: "Casablanca"   , country: "Morocco"                      }
            { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }
          ]
      
      it 'should only contain cities from USA and Morocco even through a set()', ( done ) ->
        check_set_content done, cities.filter( countries ).set( [] ), [
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
      
      users    = multiflow.flow "user"
      groups   = multiflow.flow "group"
      posts    = multiflow.flow( "post" ).set []
      comments = multiflow.flow( "comment" ).set []
      
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
        multiflow.add [
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
        multiflow.remove [
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
        cities_from_countries.fetch_all ( values ) -> check done, ->
          expect( values ).to.be.eql [
            { id: 5, name: "New York City", country: "USA", state: "New York"       }
            { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }
          ]
      
      it 'after updating Detroit to Chicago, cities_from_countries should show Chicago', ( done ) ->
        cities.update [
          [ { id: 8, name: "Detroit"      , country: "USA", state: "Michigan"       }, { id: 8, name: "Chicago", country: "USA" }]
        ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
          expect( values ).to.be.eql [
            { id: 5, name: "New York City", country: "USA", state: "New York"       }
            { id: 8, name: "Chicago"      , country: "USA"                          }
          ]
      
      it 'after updating countries to get countries from Morocco, cities_from_countries should have all and only cities from Morocco', ( done ) ->
        countries.update [ [ { country: 'USA' }, { country: 'Morocco' } ] ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
          expect( values ).to.be.eql [
            { id: 1, name: "Marrakech"    , country: "Morocco"                      }
            { id: 6, name: "Casablanca"   , country: "Morocco"                      }
          ]
      
      it 'after adding San Francisco to cities, cities_from_countries should not change', ( done ) ->
        cities.add [ { id: 11, name: 'San Francisco', country: "USA" } ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
          expect( values ).to.be.eql [
            { id: 1, name: "Marrakech"    , country: "Morocco"                      }
            { id: 6, name: "Casablanca"   , country: "Morocco"                      }
          ]
      
      it 'after adding Germany in countries, cities_from_countries should have cities from Morocco and Germany', ( done ) ->
        countries.add [ { country: 'Germany' } ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
            { id: 1, name: "Marrakech"    , country: "Morocco"                      }
            { id: 4, name: "Berlin"       , country: "Germany"                      }
            { id: 6, name: "Casablanca"   , country: "Morocco"                      }
          ]
      
      it 'after adding France and USA to countries, cities_from_countries should have cities from Morocco, Germany, and the USA', ( done ) ->
        countries.add [ { country: 'France' }, { country: 'USA' } ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
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
        cities.add [ { id: 9, name: "Paris", country: "France" } ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
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
        cities.update [
          [ { id: 8, name: "Chicago", country: "USA" }, { id: 8, name: "Chicago", country: "USA", state: "Illinois" } ]
        ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
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
        countries.remove [ { country: "Germany" } ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
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
        cities.remove [ { id: 8, name: "Chicago"      , country: "USA"    , state: "Illinois"   } ]
        
        cities_from_countries.fetch_all ( values ) -> check done, ->
          expect( cities.index_of( { id: 8 } ) ).to.be.eql -1
          
          expect( values.sort ( a, b ) -> a.id - b.id ).to.be.eql [
            { id:  1, name: "Marrakech"    , country: "Morocco"                      }
            { id:  5, name: "New York City", country: "USA"    , state: "New York"   }
            { id:  6, name: "Casablanca"   , country: "Morocco"                      }
            { id:  9, name: "Paris"        , country: "France"                       }
            { id: 11, name: 'San Francisco', country: "USA"                          }
          ]
      
    describe 'notify():', ->
      it 'add(): employee.notify( transaction ) should be equal to result', ( done ) ->
        employee.notify [
          {
            action: "add"
            objects: [
              { id: 7, name: "John Morrison", salary: "$3000", customer_id: "228", order_id: "1228" }
              { id: 8, name: "Thomas Buch", salary: "$2500", customer_id: "229", order_id: "1229" }
            ]
          }
        ]
        
        employee.fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Josephin Tan"    , salary: "$1500", customer_id: "223", order_id: "1223" }
            { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
            { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
            { id: 7, name: "John Morrison"   , salary: "$3000", customer_id: "228", order_id: "1228" }
            { id: 8, name: "Thomas Buch"     , salary: "$2500", customer_id: "229", order_id: "1229" }
          ]
      
      it 'remove(): employee.notify( transaction ) should be equal to result', ( done ) ->
        employee.notify [ { action: "remove", objects: [ { id: 8 } ] } ]
        
        employee.fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Josephin Tan"    , salary: "$1500", customer_id: "223", order_id: "1223" }
            { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
            { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
            { id: 7, name: "John Morrison"   , salary: "$3000", customer_id: "228", order_id: "1228" }
          ]
      
      it 'update(): employee.notify( transaction ) should be equal to result', ( done ) ->
        employee.notify [ {
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

        employee.fetch_all ( values ) -> check done, ->
          expect( values.sort ( a, b ) -> a.id > b.id ).to.be.eql [
            { id: 2, name: "Josephin Tan"    , salary: "$2750", customer_id: "223", order_id: "1223" }
            { id: 3, name: "Khalifa P Nassik", Salary: "$1500", customer_id: "224", order_id: "1224" }
            { id: 4, name: "James A. Pentel" , salary: "$1750", customer_id: "225", order_id: "1225" }
            { id: 7, name: "John Morrison"   , salary: "$3500", customer_id: "228", order_id: "1228" }
          ]
      
      it 'filter(): cities.filter( is_in_morocco ) should be equal to result', ( done ) ->
        cities_in_morocco = cities.filter ( city ) -> return city.country is "Morocco"
        
        cities.notify [
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
        
        cities_in_morocco.fetch_all ( values ) -> check done, ->
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
        books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
          { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
          { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
          { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
          { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
          { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
        ]

      it 'books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
        books_ordered_by_descending_year.fetch_all ( books ) ->
          log 'books_ordered_by_descending_year delayed fetched'
          
          check done, () -> expect( books ).to.be.eql [
            { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
            { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
            { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
            { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
            { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
          ]
      
      it 'books_ordered_by_ascending_author should be ordered by ascending auhtor: organizer is a function', ( done ) ->
        books_ordered_by_ascending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
          { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
          { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
          { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
          { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
          { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        ]

      it 'books_ordered_by_descending_author should be ordered by descending auhtor: organizer is a function', ( done ) ->
        books_ordered_by_descending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
          { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
          { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
          { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
          { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
          { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        ]
      
      describe 'add()', ->
        it 'after books.add( book 6 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books.add [ { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", year: 2005 } ]

          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 1, title: "A Tale of Two Cities"           , author: "Charles Dickens" , year: 1859 }
            { id: 2, title: "The Lord of the Rings"          , author: "J. R. R. Tolkien", year: 1955 }
            { id: 4, title: "The Alchemist"                  , author: "Paulo Coelho"    , year: 1988 }
            { id: 5, title: "Angels and Demons"              , author: "Dan Brown"       , year: 2000 }
            { id: 3, title: "The Da Vinci Code"              , author: "Dan Brown"       , year: 2003 }
            { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson"   , year: 2005 }
          ]
        
        it 'after books.add( book 6 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson"   , year: 2005 }
            { id: 3, title: "The Da Vinci Code"              , author: "Dan Brown"       , year: 2003 }
            { id: 5, title: "Angels and Demons"              , author: "Dan Brown"       , year: 2000 }
            { id: 4, title: "The Alchemist"                  , author: "Paulo Coelho"    , year: 1988 }
            { id: 2, title: "The Lord of the Rings"          , author: "J. R. R. Tolkien", year: 1955 }
            { id: 1, title: "A Tale of Two Cities"           , author: "Charles Dickens" , year: 1859 }
          ]
        
        it 'after books.add( book 6 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
          books_ordered_by_ascending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
          ]

        it 'after books.add( book 6 ), books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
          books_ordered_by_descending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
            { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
            { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
            { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
            { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
            { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
            { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
          ]

        it 'after books.add( books 7, 8, 9, 10 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books.add [
            { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
            { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
            { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
            { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
          ]

          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.add( books 7, 8, 9, 10 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.add( books 7, 8, 9, 10 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
          books_ordered_by_ascending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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

        it 'after books.add( books 11, 12, 13 ), whose years are already used; books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books.add [
            { id: 11, title: "The Dukan Diet", author: "Pierre Dukan"    , year: 2000 }
            { id: 12, title: "Breaking Dawn" , author: "Stephenie Meyer" , year: 2008 }
            { id: 13, title: "Lolita"        , author: "Vladimir Nabokov", year: 1955 }
          ]
          
          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.add( books 11, 12, 13 ), whose years are already used; books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.add( books 14, 15, 16 ), the years are undefined or null; books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books.add [
            { id: 14, title: "And Then There Were None"         , author: "Agatha Christie", year: undefined }
            { id: 15, title: "Steps to Christ"                  , author: "Ellen G. White" , year: null      }
            { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"                       }
          ]
          
          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.add( books 14, 15, 16 ), the years are undefined or null; books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'update organizer, books_ordered_by_year should be ordered by ascending by title', ( done ) ->
          organizer.update [ [ { id: "year" }, { id: "title" } ] ]

          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
          organizer.notify [
            { action: "update", objects: [ [ { id: "title" }, { id: "year" } ] ] }
            { action: "add"   , objects: [ { id: "title" } ] }
          ]
          
          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
          books_ordered_by_ascending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
          books_ordered_by_descending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
          
          books_ordered_by_ascending_id.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
          
          books_ordered_by_ascending_id.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
      
      describe 'update():', ->
        it 'after books.update( object 2 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books.update [ [
            { id: 2, title: "The Lord of the Rings"  , author: "J. R. R. Tolkien", year: 1955 }
            { id: 2, title: "The Lord of the Rings 1", author: "J. R. R. Tolkien", year: 1954 }
          ] ]

          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.update( object 2 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.notify( 4 updates transaction ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
          books.notify [
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
          
          books_ordered_by_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        
        it 'after books.notify( transaction ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
          books_ordered_by_descending_year.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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
        it 'after books.remove( objects 12, 13, 15 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
          books.remove [
            { id: 12, title: "Breaking Dawn"    , author: "Stephenie Meyer" , year: 2008 }
            { id: 13, title: "Lolita"           , author: "Vladimir Nabokov", year: 1955 }
            { id:  3, title: "The Da Vinci Code", author: "Dan Brown"       , year: 2003 }
            { id: 15, title: "Steps to Christ"  , author: "Ellen G. White"  , year: undefined }
          ]
          
          books_ordered_by_ascending_author.fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
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

        it 'after books.remove( objects 12, 13, 3, 15 ), books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
          books_ordered_by_descending_author.fetch_all ( books ) -> check done, () ->
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
      books_sales_by_author.fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
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
      books_sales_by_year.fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
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
      tolkien_sales_by_year.fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
        { sales:       100, year: 1937, _count: 1 }
        { sales:       150, year: 1955, _count: 1 }
      ]

    describe 'add sales for "Dan Brown" in 2004', ->
      it 'should increase books_sales_by_author for "Dan Brown"', ( done ) ->
        books_sales.add [
          { id: 17, title: "The Da Vinci Code"                       , author: "Dan Brown"              , sales:        125, year: 2004 }
        ]

        books_sales_by_author.fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
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
        books_sales_by_year.fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
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
        books_sales.remove [
          { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
          { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , sales: undefined, year: 2008 }
        ]

        books_sales_by_author.fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
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
        books_sales_by_year.fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
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
    ]
    
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
    ]
    
    books_with_authors = books.join(
      authors
      
      [ [ 'author_id', 'id' ] ]
      
      ( book, author ) ->
        return if author then extend {}, book, { author_name: author.name } else book
      
      { left: true }
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
    ], { key: ['year', 'book_id'] }
    
    it 'should join books and authors', ( done ) ->
      books_with_authors.fetch_all ( values ) -> check done, ->
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
      authors.add [
        { id: 13, name: "Ellen G. White"          }
        { id: 14, name: "Roald Dahl"              }
      ]
      
      books.add [
        { id: 15, title: "Steps to Christ"                         , author_id: 13 }
      ]
      
      books_with_authors.fetch_all ( values ) -> check done, () ->
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


describe 'json.js', ->
  books = [
    { operation: "add", content: { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         } }
    { operation: "add", content: { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        } }
    { operation: "add", content: { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        } }
  ]
  
  book_operations = xs.set books
  
  books_stringified = book_operations.json_stringify()
  
  books_parsed = books_stringified.json_parse()
  
  it 'json_stringify() should stringify content attributes', ( done ) ->
    books_stringified.fetch_all ( books ) ->
      check done, () ->
        expect( books ).to.be.eql [
          { operation: "add", content: '{"id":1,"title":"A Tale of Two Cities","author_id":1,"author_name":"Charles Dickens"}' }
          { operation: "add", content: '{"id":8,"title":"The Hobbit","author_id":2,"author_name":"J. R. R. Tolkien"}' }
          { operation: "add", content: '{"id":2,"title":"The Lord of the Rings","author_id":2,"author_name":"J. R. R. Tolkien"}' }
        ]

  it 'json_parse() should parse stringified content', ( done ) ->
    books_parsed.fetch_all ( _books ) ->
      check done, () ->
        expect( _books ).to.be.eql books
