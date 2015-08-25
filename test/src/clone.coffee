###
    clone.coffee

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

utils = require( './tests_utils.js' ) unless this.expect?

expect = this.expect || utils.expect
check  = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------
extend = this.rs && this.rs.RS.extend || require '../../lib/util/extend.js'

clone   = extend.clone

# ----------------------------------------------------------------------------------------------
# Test utils test suite
# ---------------------

describe 'Test utilities', ->
  describe 'clone():', ->
    # ToDo: use value_equals() because mocha eql() does not handle NaN properly
    
    foo =
      id: 10
      array: [
        0
        1
        2
        true
        false
        "a"
        "b"
        3
        undefined
        null
        # NaN
        Infinity
        +Infinity
        -Infinity
        {}
        []
        ""
        
        {
          a: 0
          b: 1
          c: 2
          d: true
          e: false
          f: "a"
          g: "b"
          h: 3
          i: undefined
          j: null
          # not_a_number: NaN
          infinity: Infinity
          plus_infinity: +Infinity
          minus_infinity: -Infinity
          empty_object: {}
          empty_array: []
          empty_string: ''
        }
      ]

    bar = clone foo
    safe_bar = extend.safe_object_clone foo
    fast_bar = extend.fast_object_clone foo
    
    it 'should deep clone foo into bar', ->
      expect( bar ).to.be.eql foo

    it 'should not be the same object foo', ->
      expect( bar ).to.not.be foo

    it 'should safely deep clone foo into safe_bar', ->
      expect( safe_bar ).to.be.eql foo

    it 'safe_bar should not be the same object foo', ->
      expect( safe_bar ).to.not.be foo

    it 'should fast deep clone foo into fast_bar', ->
      expect( fast_bar ).to.be.eql foo

    it 'fast_bar should not be the same object foo', ->
      expect( fast_bar ).to.not.be foo

  describe 'Aynchronous test check()', ->
    it 'should succeed in 50 ms', ( done ) ->
      setTimeout ( () -> check done, () -> expect( [] ).to.be.eql [] ), 50
