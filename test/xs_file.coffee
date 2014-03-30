###
    xs_file.coffee

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

utils  = require( './xs_tests_utils.js' ) if require?

expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
xs     = this.xs     || utils.xs

if require?
  require '../lib/filter.js'
  require '../lib/server/file.js'

# ----------------------------------------------------------------------------------------------
# Test File pipelets
# ------------------

describe 'file', ->
  describe 'watch_directories():', ->
    entries = xs
      .set( [
          { path: 'test' },
          { path: 'test' },
          { path: 'test' }
        ]
        { key: [ 'path' ] }
      )
      .watch_directories()
    ;

    it 'should have one directory: "test"', ->
      expect( Object.keys( entries._directories ) ).to.be.eql [ 'test' ]
