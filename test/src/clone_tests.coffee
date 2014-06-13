###
    clone_tests.coffee

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

utils  = require( './tests_utils.js' ) if require?

expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# Test utils test suite
# ---------------------

describe 'Test utilities', ->
  describe 'clone():', ->
    foo =
      id: 10
      array: [ 1, 2, "a", "b", 3, { x: 10, y: undefined, z: null } ]
      obj:
        coordinate: 1
        label: "Coordinate"
        values: [ 24, null, undefined ]

    bar = clone foo

    it 'should deep clone foo into bar', ->
      expect( bar ).to.be.eql foo

    it 'should not return self', ->
      expect( bar ).to.not.be foo

  describe 'Aynchronous test check()', ->
    it 'should succeed in 50 ms', ( done ) ->
      setTimeout ( () -> check done, () -> expect( [] ).to.be.eql [] ), 50
