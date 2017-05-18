###
    query_selector.coffee

    Copyright (c) 2013-2016, Reactive Sets

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

unless rs.$query_selector
  require '../../lib/html/html_parse.js'
  require '../../lib/client/query_selector.js'

html = """
       <div id="div-1" class="parent">
         <div id="div-1-1" class="child child-1"></div>
         <div id="div-1-2" class="child child-2">
           <p class="title"></p>
         </div>
       </div>
       """
source = rs
  .set( [ { content: html } ] )
  .html_parse()

describe '$query_selector():', ->
  it 'source.$query_selector( "#demo" ) should be empty', ( done ) ->
    source.$query_selector( '#demo' )._fetch_all ( values ) -> check done, () ->
      expect( values ).to.be.empty()
  
  it 'source.$query_selector( "#div-1-2" ) should find a div#div-1-1 element', ( done ) ->
    source.$query_selector( '#div-1-2' )._fetch_all ( values ) -> check done, () ->
      $node = values[ 0 ].$node
      
      expect( $node.type          ).to.be 'tag'
      expect( $node.name          ).to.be 'div'
      expect( $node.attribs.id    ).to.be 'div-1-2'
      expect( $node.attribs.class ).to.be 'child child-2'
  
  it 'source.$query_selector( "#div-1 .child" ) should find the first element with class .child', ( done ) ->
    source.$query_selector( '#div-1 .child' )._fetch_all ( values ) -> check done, () ->
      $node = values[ 0 ].$node
      
      expect( $node.type          ).to.be 'tag'
      expect( $node.name          ).to.be 'div'
      expect( $node.attribs.id    ).to.be 'div-1-1'
      expect( $node.attribs.class ).to.be 'child child-1'
  
  it 'source.$query_selector( ".title", { description: "some description" } ) should find a p.title element', ( done ) ->
    source.$query_selector( '.title', { description: 'some description' } )._fetch_all ( values ) -> check done, () ->
      value = values[ 0 ]
      $node = value.$node
      
      expect( $node.type          ).to.be 'tag'
      expect( $node.name          ).to.be 'p'
      expect( $node.attribs.class ).to.be 'title'
      expect( value.description   ).to.be 'some description'
  
