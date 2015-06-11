###
    event_emitter.coffee

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

utils  = require( './tests_utils.js' ) unless this.expect?

expect = this.expect || utils.expect
rs     = this.rs     || utils.rs
RS     = rs.RS
slice  = Array.prototype.slice

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

require '../../lib/util/event_emitter.js' unless RS.Event_Emitter?

# ----------------------------------------------------------------------------------------------
# Transactions test suite
# -----------------------

describe 'Event_Emitter test suite:', ->
  describe 'RS.Event_Emitter(): ', ->
    Event_Emitter = RS.Event_Emitter
    emitter = new Event_Emitter()
    emitter_2 = new Event_Emitter()
    data = null
    complete = null
    data_listener = () -> data = slice.call( arguments, 0 )
    
    it 'should have set two Event_Emitter instances', ->
      expect( emitter ).to.be.a Event_Emitter
      expect( emitter_2 ).to.be.a Event_Emitter
    
    it 'should allow to emit a "data" event with no exception', ->
      expect( emitter.emit( 'data', {} ) ).to.be emitter
    
    it 'should allow to set a "data" event listener', ->
      emitter.on "data", data_listener
      
      expect( emitter.events() ).to.be.eql [ "data" ]
      expect( emitter.listeners( 'data' ) ).to.be.eql [ data_listener ]
    
    it 'should allow to set a "data" event listener on the second emitter', ->
      emitter_2.on "data", data_listener
      
      expect( emitter_2.events() ).to.be.eql [ "data" ]
      expect( emitter_2.listeners( 'data' ) ).to.be.eql [ data_listener ]
    
    it 'should allow to emit a "data" event that sends values to the listener', ->
      expect( emitter.emit( 'data', { a: 1 } ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
    
    it 'should allow to set a "complete" listener once', ->
      emitter.once "complete", () -> complete = slice.call( arguments, 0 )
      
      expect( emitter.events() ).to.be.eql [ "data", "complete" ]
    
    it 'should have one listener for event complete', ->
      expect( emitter.listeners( 'complete' ).length ).to.be 1
      expect( emitter.listeners_count( 'complete' ) ).to.be 1
      
    it 'should allow to emit the "complete" event', ->
      expect( emitter._emit_event( "complete", [ { _t: { more: false } } ] ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
      expect( complete ).to.be.eql [ { _t: { more: false } } ]
    
    it 'should have removed the listener for event "complete"', ->
      expect( emitter.listeners( 'complete' ).length ).to.be 0
      expect( emitter.listeners_count( 'complete' ) ).to.be 0
      expect( emitter.listeners_count( 'data' ) ).to.be 1
      expect( emitter_2.listeners_count( 'data' ) ).to.be 1
    
    it 'should then allow to emit the "complete" event with calling the complete listener with no effect', ->
      expect( emitter._emit_event( "complete", [ { id: 1 } ] ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
      expect( complete ).to.be.eql [ { _t: { more: false } } ]
    
  # RS.Event_Emitter()
