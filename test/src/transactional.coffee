###
    transactional.coffee

    Copyright (c) 2013-2020, Reactive Sets

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

utils   = require( './tests_utils.js' ) unless this.expect?

expect  = this.expect || utils.expect
rs      = this.rs     || utils.rs
RS      = rs.RS
log     = RS.log
pretty  = log.pretty
uuid_v4 = RS.uuid.v4
clone   = RS.extend.clone
slice   = Array.prototype.slice

# ----------------------------------------------------------------------------------------------
# Some constants
# --------------

valid_uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

# ----------------------------------------------------------------------------------------------
# Transactional test suite
# -----------------------

describe 'Transactional pipelets test suite', ->
  describe 'emit_operations() with emit_transactions()', ->
    rs.Singleton( 'to_strict_transactions', ( source, options ) ->
      return source
        
        .emit_operations()
        
        .emit_transactions()
        
        .set() # of transactions
    )
    
    rs.to_strict_transactions().api.add [ {
      adds: [
       { id: 1, v: 1 }
       { id: 3, v: 3 }
      ]
      
      removes: [
       { id: 1, v: 2 }
       { id: 2, v: 2 }
      ]
      
      updates: [
        [ { id: 3, v: 1 }, { id: 3, v: 4 } ]
        [ { id: 4, v: 4 }, { id: 5, v: 5 } ]
      ]
    } ]
    
    it 'should hold a strict transaction', ( done ) ->
      rs.to_strict_transactions().api.fetch ( transactions ) ->
        transaction = transactions[ 0 ]
        
        log( 'expected strict transaction:', pretty transaction )
        
        expect( transaction.flow ).to.be 'transactions'
        expect( transaction.id ).to.match valid_uuid_v4
        
        expect( transaction.adds ).to.be.eql [
          { id: 3, v: 3 }
          { id: 5, v: 5 }
        ]
        
        expect( transaction.removes ).to.be.eql [
          { id: 2, v: 2 }
          { id: 4, v: 4 }
        ]
        
        expect( transaction.updates ).to.be.eql [
          [ { id: 1, v: 2 }, { id: 1, v: 1 } ]
          [ { id: 3, v: 1 }, { id: 3, v: 4 } ]
        ]
        
        done()
