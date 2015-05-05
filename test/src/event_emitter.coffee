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

utils  = require( './tests_utils.js' ) if require?
expect = this.expect || utils.expect
rs     = this.rs     || utils.rs
RS     = rs.RS
slice  = Array.prototype.slice

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

require '../../lib/event_emitter.js' if require?

# ----------------------------------------------------------------------------------------------
# Transactions test suite
# -----------------------

describe 'Event_Emitter test suite:', ->
  describe 'RS.Event_Emitter(): ', ->
    emitter = new RS.Event_Emitter()
    data = null
    complete = null
    
    it 'should be an Event_Emitter', ->
      expect( emitter ).to.be.a RS.Event_Emitter
    
    it 'should allow to emit a "data" event with no exception', ->
      expect( emitter.emit( 'data', {} ) ).to.be emitter
    
    it 'should allow to set a "data" event listener', ->
      emitter.on "data", () -> data = slice.call( arguments, 0 )
      
      expect( Object.keys emitter._events ).to.be.eql [ "data" ]
      expect( emitter._events.data.length ).to.be 1
    
    it 'should allow to emit a "data" event that sends values to the listener', ->
      expect( emitter.emit( 'data', { a: 1 } ) ).to.be emitter
      expect( data ).to.be.eql [ { a: 1 } ]
    
    it 'should allow to set a "complete" listener once', ->
      emitter.once "complete", () -> complete = slice.call( arguments, 0 )
      
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
    
  # RS.Event_Emitter()
