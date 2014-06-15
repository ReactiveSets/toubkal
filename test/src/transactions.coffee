###
    transactions.coffee

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
uuid_v4 = XS.uuid_v4

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
  require '../../lib/transactions.js'

Pipelet = XS.Pipelet
Greedy  = XS.Greedy
Set     = XS.Set

# ----------------------------------------------------------------------------------------------
# Some constants
# --------------

valid_uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

# ----------------------------------------------------------------------------------------------
# Transactions test suite
# -----------------------

describe 'Transactions test suite:', ->
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
      expect( emitter.emit( 'data', {} ) ).to.be emitter
    
    it 'should allow to set a "data" event listener', ->
      emitter._on "data", () -> data = slice.call( arguments, 0 )
      
      expect( Object.keys emitter._events ).to.be.eql [ "data" ]
      expect( emitter._events.data.length ).to.be 1
    
    it 'should allow to emit a "data" event that sends values to the listener', ->
      expect( emitter.emit( 'data', { a: 1 } ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
    
    it 'should allow to set a "complete" listener once', ->
      emitter._once "complete", () -> complete = slice.call( arguments, 0 )
      
      expect( Object.keys emitter._events ).to.be.eql [ "data", "complete" ]
      expect( emitter._events.complete.length ).to.be 1
    
    it 'should allow to emit the "complete" event', ->
      expect( emitter._emit_event( "complete", [ { _t: { more: false } } ] ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
      expect( complete ).to.be.eql [ { _t: { more: false } } ]
    
    it 'should then remove the listener on the "complete" event', ->
      expect( Object.keys emitter._events ).to.be.eql [ "data", "complete" ]
      expect( emitter._events.complete.length ).to.be 0
      expect( emitter._events.data.length ).to.be 1
    
    it 'should then allow to emit the "complete" event with calling the complete listener', ->
      expect( emitter._emit_event( "complete", [ { id: 1 } ] ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
      expect( complete ).to.be.eql [ { _t: { more: false } } ]
    
  # XS.Event_Emitter()
  
  describe 'XS.Options.forward():', ->
    options_forward = XS.Options.forward
    uuid = uuid_v4()
    
    it 'should be a function with one parameter', ->
      expect( options_forward ).to.be.a( 'function' ) &&
      expect( options_forward.length ).to.be.eql 1
    
    it 'should return {} when called with no source options', ->
      expect( options_forward() ).to.be.eql {}
    
    it 'should return {} with options { a: 1, b: {}, _t: { more: false } }', ->
      expect( options_forward { a: 1, b: {}, _t: { more: false } } ).to.be.eql {}
    
    it 'should return {} with options { a: 1; b: {} }', ->
      expect( options_forward { a: 1, b: {} } ).to.be.eql {}
    
    it 'should return {} with options { a: 1, _t: { more: "" } }', ->
      expect( options_forward { a: 1, _t: { more: "" } } ).to.be.eql {}
    
    it 'should throw an exception for missing transaction id with options { a: 1, _t: { more: true } }', ->
      expect( () -> options_forward { a: 1, b: {}, _t: { more: true } } ).to.throwException()

    it 'should return { _t: { more: true, id: uuid } } with options { a: 1, _t: { more: true, id: uuid } }', ->
      more = { a: 1, _t: { more: true, id: uuid } }
      
      expect( options_forward more ).to.be.eql {
        _t: { more: true, id: uuid }
      }
    
    it 'should return { _t: { id: uuid } } with options { _t: { more: false, id: uuid } )', ->
      more = { _t: { more: false, id: uuid } }
      
      expect( options_forward more ).to.be.eql {
        _t: { id: uuid }
      }
      
    it 'should return { _t: { more: true, id: uuid } } with options { _t: { more: 1, id: uuid } }', ->
      more = { _t: { more: 1, id: uuid } }
      
      expect( options_forward more ).to.be.eql {
        _t: { more: true, id: uuid }
      }
      
    it 'should return { _t: { id: uuid } } with options { _t: { more: 0, id: uuid } }', ->
      more = { _t: { more: 0, id: uuid } }
      
      expect( XS.options_forward( more ) ).to.be.eql {
        _t: { id: uuid }
      }
    
    it 'should return { _t: { id: uuid } } with options { _t: { id: uuid } }', ->
      more = { _t : { id: uuid } }
      
      expect( XS.options_forward( more ) ).to.be.eql {
        _t: { id: uuid }
      }
  # options_forward()

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
        _t = options._t
        tid = _t.id
        
        expect( tid ).to.match valid_uuid_v4
        
        expect( _t ).to.be.eql {
          more: true
          id: tid
        }
      
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
        expect( options                     ).to.be.eql { _t: {
          id: tid
          more: true
        } }
      
      it 'should decrease count to 1 and set added_length to 2 after t.__emit_add( [{}{}] )', ->
        expect( t.__emit_add( [{},{}] ).toJSON() ).to.be.eql {
          name          : ''
          tid           : tid
          count         : 1
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 2
          removed_length: 0
        }
      
      it 'should decrease count to zero and set removed_length to 1 after t.__emit_remove( [{}] )', ->
        expect( t.__emit_remove( [{}] ).toJSON() ).to.be.eql {
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
        expect( t.get_emit_options() ).to.be.eql { _t: {
          id: tid
          more: true
        } }
      
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
        expect( options = t.get_emit_options() ).to.be.eql { _t: {
          id: tid
          more: true
        } }
        
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
      
      output = {
        _operations: []
        
        _get_name: -> 'output'
        
        emit : ( operation, values, options ) ->
          this._operations.push( slice.call( arguments, 0 ) )
          
          return this
      }
      
      tid = uuid_v4()
      
      options = { _t: { id: tid, more: true }, a: 1, b: [1,2] }
      
      no_more = clone options
      delete no_more._t.more
      
      t = transactions.get_transaction 4, options, output
      
      it 'should create a transaction with a count of 4, and a name', ->
        expect( t.get_tid()   ).to.be tid
        expect( t.is_closed() ).to.be false
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
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
          name          : 'output'
          tid           : tid
          count         : 3
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
      
      it 'should decrease count after t.__emit_add( [] )', ->
        t.__emit_add( [] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 2
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
        
      it 'should decrease count and increse added_length after t.__emit_add( [ { id: 1 } ] )', ->
        t.__emit_add( [ { id: 1 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 1
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 1
          removed_length: 0
        }
        
      it 'should decrease count and need close after t.__emit_add( [ { id: 2 } ], true )', ->
        t.__emit_add( [ { id: 2 } ], true )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 0
          source_more   : true
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 0
        }
      
      it 'should have emited an add operation to the pipelet', ->
        expect( output._operations ).to.be.eql [
          [ 'add', [ { id: 2 } ], options ]
        ]
        
      it 'should raise an exception on extra t.__emit_add( [ { id: 1 } ], true )', ->
        expect( -> t.__emit_add( [ { id: 3 } ], true ) ).to.throwException()
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
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
        
        expect( t.toJSON() ).to.be.eql {
          name          : 'output'
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
        expect( output._operations ).to.be.eql [
          [ 'add', [ { id: 2 } ], options ]
        ]
        
      it 'should return the same transaction after follow-up transactions.get_transaction()', ->
        t1 = transactions.get_transaction 2, no_more, output
        
        expect( t1 ).to.be t
        
      it 'should have increased transaction\'s operations count by 2', ->
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 2
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 0
        }
      
      it 'should increase removed_length to 2 after t.__emit_remove( [ { id:1 }, { id: 2 } ] )', ->
        t.__emit_remove( [ { id:1 }, { id: 2 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 1
          source_more   : false
          need_close    : true
          closed        : false
          added_length  : 1
          removed_length: 2
        }
      
      it 'should close the transaction after t.__emit_add( [ { id:4 }, { id: 5 } ] )', ->
        t.__emit_add( [ { id: 4 }, { id: 5 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 0
          source_more   : false
          need_close    : false
          closed        : true
          added_length  : 0
          removed_length: 0
        }
      
      it 'should have emitted all operations', ->
        expect( output._operations ).to.be.eql [
          [ 'add', [ { id: 2 } ], options ]
          [ 'remove', [ { id: 1 }, { id: 2 } ], options ]
          [ 'add', [  { id: 1 }, { id: 4 }, { id: 5 } ], no_more ]
        ]
    
    describe 'Transactions()..get_transaction() with a fork tag', ->
      transactions = new Transactions()
      
      output = {
        _operations: []
        
        _get_name: -> 'output'
        
        emit : ( operation, values, options ) ->
          this._operations.push( slice.call( arguments, 0 ) )
          
          return this
      }
      
      tid = uuid_v4()
      
      options = { _t: { id: tid, more: true }, a: 1, b: [1,2] }
      
      options_with_tag = clone options
      options_with_tag._t.forks = [ 'fork_tag' ]
      
      options_with_tag_no_more = clone options_with_tag
      delete options_with_tag_no_more._t.more
      
      t = transactions.get_transaction 2, options, output, 'fork_tag'
      
      it 'should create a transaction with a count of 3, a name, and a fork tag', ->
        expect( t.get_tid()   ).to.be tid
        expect( t.is_closed() ).to.be false
        expect( t.fork        ).to.be 'fork_tag'
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 2
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 0
          removed_length: 0
        }
      
      it 'should decrease count and increse added_length after t.__emit_add( [ { id: 1 }, { id: 2 }  ] )', ->
        t.__emit_add( [ { id: 1 }, { id: 2 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 1
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 2
          removed_length: 0
        }
        
      it 'should decrease count and need close after t.__emit_add( [ { id: 3 } ] )', ->
        t.__emit_add( [ { id: 3 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 0
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 3
          removed_length: 0
        }
      
      it 'should have emited no add operation to the pipelet', ->
        expect( output._operations ).to.be.eql []
      
      it 'after ending transation it should have emited nothing because there is more expected upstream', ->
        t.end()
        
        expect( output._operations ).to.be.eql []
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 0
          source_more   : true
          need_close    : false
          closed        : false
          added_length  : 3
          removed_length: 0
        }
      
      it 'should return the same transaction after follow-up transactions.get_transaction() with no more', ->
        delete options._t.more
        
        orginal_options = clone options
        
        t1 = transactions.get_transaction 1, options, output
        
        expect( t1 ).to.be t
        
      it 'should have increased transaction\'s operations count by 1', ->
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 1
          source_more   : false
          need_close    : false
          closed        : false
          added_length  : 3
          removed_length: 0
        }
      
      it 'should close the transaction after t.__emit_remove( [ { id:1 }, { id: 2 } ] )', ->
        t.__emit_remove( [ { id:1 }, { id: 2 } ] )
        
        expect( t.toJSON()    ).to.be.eql {
          name          : 'output'
          tid           : tid
          count         : 0
          source_more   : false
          need_close    : false
          closed        : true
          added_length  : 0
          removed_length: 0
        }
        
      it 'should have output two operations', ->
        expect( output._operations ).to.be.eql [
          [ 'remove', [ { id:1 }, { id: 2 } ], options_with_tag ]
          [ 'add', [ { id:1 }, { id: 2 }, { id: 3 } ], options_with_tag_no_more ]
        ]
    
    describe 'Input / Output Transactions()', ->
      input = new XS.Input_Transactions().set_tag_branches 'source', 2
      
      output_1 = new XS.Output_Transactions()
      output_2 = new XS.Output_Transactions()
      
      tid = uuid_v4()
      
      no_more = {
        _t: {
          tid: tid
          forks: [
            'top'
            'source'
          ]
        }
      }
      
      more = clone no_more
      more._t.more = true
      
      o = output_1.get_concurrent_options( input, more )
      keys = null
      
      it 'output_1 concurrent options should be returned unaltered (more)', ->
        expect( o ).to.be more
      
      it 'input transactions should have one transaction waiting for another output to terminate', ->
        expect( Object.keys input.transactions ).to.be.eql [ tid ]
        
        keys = Object.keys input.transactions[ tid ]
        
        k = if keys[ 0 ] == '_' then keys[ 1 ] else keys[ 0 ]
        
        expect( keys.length ).to.be.eql 2
        
        expect( input.transactions[ tid ]._ ).to.be.eql { count: 1, terminated_count: 0, tagged: true }
        
        expect( input.transactions[ tid ][ k ] ).to.be.eql { source: output_1, position: 0 }
      
      it 'output_1 should have one input', ->
        expect( Object.keys output_1.transactions ).to.be.eql [ tid ]
        expect( output_1.transactions[ tid ].inputs ).to.be.eql [ input ]
      
      it 'concurent options should have more even after sending no more', ->
        o = output_1.get_concurrent_options input, no_more
        
        expect( o ).to.be.eql more
      
      it 'input transactions should have one transaction waiting for another output to terminate', ->
        expect( input.transactions[ tid ]._ ).to.be.eql { count: 0, terminated_count: 1, tagged: true }
        
        keys = Object.keys input.transactions[ tid ]
        k = if keys[ 0 ] == '_' then keys[ 1 ] else keys[ 0 ]
        
        expect( input.transactions[ tid ][ k ] ).to.be null
      
      it 'output_1 should have zero inputs', ->
        expect( Object.keys output_1.transactions ).to.be.eql []
        expect( output_1.transactions[ tid ] ).to.be undefined
      
      it 'output_2 concurrent options should be returned unaltered (more)', ->
        o = output_2.get_concurrent_options( input, more )
        
        expect( o ).to.be more
      
      it 'input transactions should show ongoing progress of transaction from output_2', ->
        keys = Object.keys input.transactions[ tid ]
        
        _i = keys.indexOf( '_' );
        
        switch _i
          when 0 then _1 = 1; _2 = 2
          when 1 then _1 = 0; _2 = 1
          when 2 then _1 = 0; _2 = 1
        
        _1 = keys[ _1 ]
        _2 = keys[ _2 ]
        
        expect( keys.length ).to.be.eql 3
        
        expect( input.transactions[ tid ]._ ).to.be.eql { count: 1, terminated_count: 1, tagged: true }
        expect( input.transactions[ tid ][ _1 ] ).to.be null
        expect( input.transactions[ tid ][ _2 ] ).to.be.eql { source: output_2, position: 0 }
      
      it 'output_2 should have one input', ->
        expect( Object.keys output_2.transactions ).to.be.eql [ tid ]
        expect( output_2.transactions[ tid ].inputs ).to.be.eql [ input ]
      
      it 'concurent options for output_2 should have no more after sending no more', ->
        o = output_2.get_concurrent_options input, no_more
        
        expect( o ).to.be no_more
      
      it 'input transactions should have been deleted', ->
        expect( Object.keys input.transactions ).to.be.eql []
      
      it 'output_2 should have zero inputs', ->
        expect( Object.keys output_2.transactions ).to.be.eql []
      
      
  # XS.Transactions() and XS.Transaction()
