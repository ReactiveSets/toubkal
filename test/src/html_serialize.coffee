###
    html_serialize.coffee

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
check  = this.check  || utils.check
rs     = this.rs     || utils.rs

unless rs.html_serialize?
  require '../../lib/html/html_parse.js'
  require '../../lib/html/html_serialize.js'

# ----------------------------------------------------------------------------------------------
# Test HTML_Serialize()
# -----------------

source = rs.set()
tree   = source.html_parse()
result = tree.html_serialize()

describe 'html_serialize():', ->
  it 'result should be empty', ( done ) ->
    result._fetch_all ( values ) -> check done, () ->
      expect( values ).to.be.empty
  
  it 'should return a "p" element', ( done ) ->
    source._add [ { content: '<p></p>' } ]
    
    result._fetch_all ( values ) -> check done, () ->
      expect( values[ 0 ].content ).to.be '<p></p>'
  
  it 'p element should have: id="myID" and class="my-class"', ( done ) ->
    source
      ._remove [ { content: '<p></p>' } ]
      ._add    [ { content: '<p id="myID" class="my-class"></p>' } ]
    
    result._fetch_all ( values ) -> check done, () ->
      expect( values[ 0 ].content  ).to.be.eql '<p id="myID" class="my-class"></p>'
  
  it 'should return ul li structure', ( done ) ->
    source
      ._remove [ { content: '<p id="myID" class="my-class"></p>' } ]
      ._add    [ { content: '<ul><li>first</li><li>last</li></ul>' } ]
    
    result._fetch_all ( values ) -> check done, () ->
      expect( values[ 0 ].content  ).to.be '<ul><li>first</li><li>last</li></ul>'
  