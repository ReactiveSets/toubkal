###
    tests_utils.coffee

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
# Source map support for v8 stack traces
# --------------------------------------

this.expect || require( 'source-map-support' ).install()

# ----------------------------------------------------------------------------------------------
# Setup mocha BDD, load expect
# ----------------------------

this.mocha && mocha.setup 'bdd'

expect = this.expect = this.expect || require 'expect.js'

# ----------------------------------------------------------------------------------------------
# Asynchrnous tests exception catcher
# -----------------------------------

this.check = ( done, test ) ->
  try
    test()
    
    done()
  catch e
    done e

### ---------------------------------------------------------------------------
  @class Expected_Operations()
  
  @short Expected operations to be test using fetch
  
  @internals
  - expected (Array): operations, each operation is an Array:
    - 0 (Number): position of operation in expected, starts at 0
    - 1 (Number): operation:
      - 0: add
      - 1: remove
      - 2: update
    - 2 (Array): added or removed values or updates
###

### ---------------------------------------------------------------------------
  @method Expected_Operations..add( operation, values ) ->
  
  @short Add expected operation
  
  @parameters
  - operation (Number):
    - 0: add
    - 1: remove
    - 2: update
  - values (Array): added or removed values or updates
###

### ---------------------------------------------------------------------------
  @method Expected_Operations..receiver( l ) ->
  
  @short Fetch receiver for testing expected operations
  
  @parameters
  - l (Number): optional, if provided, it is expected to equal expected.length
  
  @returns fetch reveiver, signature: ( values, no_more, operation ) ->
  
  @throws
  - l is defined and not expected.length
  - operation does not match expected operation
  - expected.length does not match the number of operations received by receiver
###

this.Expected_Operations = () ->
  that = {}
  
  expected = []
  
  that.add = ( operation, values ) ->
    expected.push( [ expected.length, operation, values ] )
  
  that.receiver = ( l ) ->
    if typeof l != 'undefined'
      expect( expected.length ).to.be l
    
    i =  -1
    ( values, no_more, operation ) ->
      ++i
      
      expect( [ i, operation, values ] ).to.be.eql expected[ i ]
      
      if no_more
        expect( i ).to.be expected.length - 1
  
  return that

# ----------------------------------------------------------------------------------------------
# rs and log
# ----------

this.rs = this.rs || require '../../lib/core.js'

this.log = this.rs.RS.log.bind( null, 'tests,' )
