###
    dispatch.coffee

    Copyright (c) 2013-2017, Reactive Sets

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

de = false

utils  = require( './tests_utils.js' ) unless this.expect

expect              = this.expect              || utils.expect
check               = this.check               || utils.check
Expected_Operations = this.Expected_Operations || utils.Expected_Operations
rs                  = this.rs                  || utils.rs
RS                  = rs.RS
Store               = RS.Store

# ----------------------------------------------------------------------------------------------
# dispatch test suite
# -------------------

describe 'dispatch():', ->
  input    = null
  dispatch = null
  output   = null
  expected = Expected_Operations()
  
  describe 'branch dataflow is also source dataflow, i.e. self-join', ->
    it 'should allow to dispatch set to both source and branches', ->
      input = rs
        #.set( [ { id: 1 } ] )
        .store()
      
      dispatch = input
        .trace( "input", {
          # filter_map: ( _ ) -> if _.id == 2 then _
          # counts: true
          # pick: { _id: '.id' }
        } )
        
        .dispatch(
          input.set()
          
          ( source, options ) ->
            id = this.id
            
            source
              .filter( [ { id: id } ] )
              .trace( "branch " + id )
              .set()
              .trace( "set " + id )
          
          { no_remove_fetch: true }
        )
        
        .trace( "dispatched", { all: true } )
      
      output = dispatch.store()
      
      output = output._output
    
    it 'should have emitted one operation', ->
      input._add( [ { id: 1 } ] )
      
      expected.add( 0, [ { id: 1 } ] )
      
      output._fetch expected.receiver 1
    
    it 'should allow to update input', ->
      input._update( [ [ { id: 1 }, { id: 2 } ] ] )
    
