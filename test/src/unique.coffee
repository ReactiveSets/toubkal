###
    order.coffee

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

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check
log    = this.log    || utils.log
rs     = this.rs     || utils.rs

# ----------------------------------------------------------------------------------------------
# order test suite
# ----------------

describe 'unique()', ->
  to_value = ( _ ) -> { id: _ }
  
  data = [ 1, 2, 3, 4 ].map to_value
  
  output = rs.unique data
  
  it 'should have 4 values after initilization with 4 values', ( done ) ->
    output._fetch_all ( result ) -> check done, () -> expect( result ).to.be.eql data
  
  it 'adding the same 4 values should not update the result', ( done ) ->
    output._add data
    
    output._fetch_all ( result ) -> check done, () -> expect( result ).to.be.eql data
  
  it 'should have 2 values after removing 2 values', ( done ) ->
    output._remove [ 1, 3 ].map to_value
    
    output._fetch_all ( result ) -> check done, () -> expect( result ).to.be.eql [ 2, 4 ].map to_value
  
  it 'should have the same 2 values after attempting to remove the same 2 values and a non-existing value', ( done ) ->
    output._remove [ 1, 3, 5 ].map to_value
    
    output._fetch_all ( result ) -> check done, () -> expect( result ).to.be.eql [ 2, 4 ].map to_value
  
  it 'should have an empty anti-state', () ->
    expect( output.b ).to.be.eql []
  
  it 'should have updated values after update', ( done ) ->
    output._update [
      [ { id: 2 }, { id: 3 } ]
      [ { id: 1 }, { id: 2 } ]
      [ { id: 4 }, { id: 5 } ]
    ]
    
    output._fetch_all ( result ) -> check done, () -> expect( result ).to.be.eql [ 3, 5 ].map to_value