###
    html_parse.coffee

    Copyright (C) 2013, 2014, Reactive Sets

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
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
rs     = this.rs     || utils.rs

if require?
  require '../../lib/html/html_parse.js'

# ----------------------------------------------------------------------------------------------
# Test HTML_Parse()
# -----------------

source = rs.set()
tree  = source.html_parse()

describe 'html_parse():', ->
  it 'tree should be empty', ( done ) ->
    tree._fetch_all ( values ) -> check done, () ->
      expect( values ).to.be.empty
  
  it '( <p></p> ).html_parse() shouldn\'t have parents, children, attributes and siblings', ( done ) ->
    source._add [ { content: '<p></p>' } ]
    
    tree._fetch_all ( values ) -> check done, () ->
      dom = values[ 0 ].dom
      
      expect( dom[ 0 ].type     ).to.be 'tag'
      expect( dom[ 0 ].name     ).to.be 'p'
      expect( dom[ 0 ].parent   ).to.be null
      expect( dom[ 0 ].children ).to.be.empty
      expect( dom[ 0 ].attribs  ).to.be.empty
      expect( dom[ 0 ].next     ).to.be null
      expect( dom[ 0 ].prev     ).to.be null
  
  it '( <p id:myID class:my-class></p> ) should have attributes id="myID" and class="my-class"', ( done ) ->
    source
      ._remove [ { content: '<p></p>' } ]
      ._add    [ { content: '<p id="myID" class="my-class"></p>' } ]
    
    tree._fetch_all ( values ) -> check done, () ->
      dom = values[ 0 ].dom
      
      expect( dom[ 0 ].attribs  ).to.be.eql { id: 'myID', class: 'my-class' }
  
  it '( <ul><li>first</li><li>last</li></ul> ) should have 2 children', ( done ) ->
    source
      ._remove [ { content: '<p id="myID" class="my-class"></p>' } ]
      ._add    [ { content: '<ul><li>first</li><li>last</li></ul>' } ]
    
    tree._fetch_all ( values ) -> check done, () ->
      dom = values[ 0 ].dom
      
      expect( dom[ 0 ].children.length  ).to.be 2
  
  it 'first child should text content "first"', ( done ) ->
    tree._fetch_all ( values ) -> check done, () ->
      elem = values[ 0 ].dom[ 0 ].children[ 0 ].children[ 0 ]
      
      expect( elem.type  ).to.be 'text'
      expect( elem.data  ).to.be 'first'
