###
    to_uri.coffee

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
# to_uri test suite
# -------------------

describe 'to_uri()', ->
  input    = null
  to_uri   = null
  output   = null
  expected = Expected_Operations()
  
  it 'should be able to connect to source and destination pipelets', ->
    input  = rs.store()
    to_uri = input.to_uri()
    output = to_uri.store()
    output = output._output
  
  it 'should not emit any value if no path and no uri are provided', ->
    input._add( [ { id: 1 } ] )
    
    output._fetch expected.receiver( 0 )
  
  it 'should emit one add with uri /lib/core/pipelet,js when adding path lib/core/pipelet,js', ->
    input._add( [ { id: 2, path: 'lib/core/pipelet,js' } ] )
    
    expected.add( 0, [ { id: 2, path: 'lib/core/pipelet,js', uri: '/lib/core/pipelet,js' } ] )
    
    output._fetch expected.receiver( 1 )
  
  it 'should not change uri when provided', ->
    input._add( [ { id: 3, path: 'lib/core/pipelet,js', uri: '/pipelet.js' } ] )
    
    expected.add( 0, [ { id: 3, path: 'lib/core/pipelet,js', uri: '/pipelet.js' } ] )
    
    output._fetch expected.receiver( 2 )
  
  it 'should emit a value if uri is present even when path is not present', ->
    input._add( [ { id: 4, uri: '/pipelet.js' } ] )
    
    expected.add( 0, [ { id: 4, uri: '/pipelet.js' } ] )
    
    output._fetch expected.receiver( 3 )
  
  it 'should not emit any value if path is absolute and no uri is provided', ->
    input._add( [ { id: 5, path: '/lib/pipelet.js' } ] )
    
    output._fetch expected.receiver( 3 )
  
  it 'should emit the same when fetched directly', ->
    to_uri._output._fetch expected.receiver()
