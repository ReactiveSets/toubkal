###
    pipelet.coffee

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

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------
rs = this.rs

unless rs?
  rs = require '../../lib/core/pipelet.js'

RS      = rs.RS
Pipelet = RS.Pipelet

# ----------------------------------------------------------------------------------------------
# pipelet test suite
# ------------------

describe 'Pipelet', ->
  describe 'Lazy and Greedy Pipelet Connections', ->
    values = [ { id: 1 }, { id: 2 } ]
    
    source = new Pipelet()
    lazy   = new Pipelet()
    greedy = rs.greedy()
    
    describe 'add_source()', ->
      it 'Adding as "source" as a source to "lazy", "source" should have "lazy" input as desintations', ->
        lazy._add_source source
        
        expect( source._output.destinations ).to.be.eql [ lazy._input ]
      
      it '"lazy" should have "source._output" as its input source', ->
        expect( lazy._input.source ).to.be source._output
      
      it 'after adding "greedy", "source" should now have "lazy" and "greedy" inputs as destinations', ->
        greedy._input.add_source source._output
        
        expect( source._output.destinations ).to.be.eql [ lazy._input, greedy._input ]
      
      it '"greedy" should have "source._output" as its input source', ->
        expect( greedy._input.source ).to.be source._output
      
      it '"source" query tree should have "greedy" as the only subscriber in its top node', ->
        expect( source._output.tree.top ).to.be.eql {
          branches   : {}
          keys       : []
          subscribers: [ greedy._input ]
        }
    
      it 'Trying to add "source" as a source of "lazy" a second time should throw', ->
        expect( () -> lazy._add_source source ).to.throwException()
      
      it 'Trying to add "source" as a source of "greedy" a second time should throw', ->
        expect( () -> greedy._input.add_source source._output ).to.throwException()
      
      it 'Trying to add "lazy" as a source of "greedy" should throw', ->
        expect( () -> greedy._add_source lazy ).to.throwException()
      
    describe 'remove_source()', ->
      it 'After removing "source" as a source of "lazy", "source" should have only "greedy" as a destination', ->
        lazy._remove_source source
        
        expect( source._output.destinations ).to.be.eql [ greedy._input ]
      
      it 'Trying to remove "source" as a source of "lazy" a second time should throw', ->
        expect( () -> lazy._remove_source source ).to.throwException()
      
      it 'After removing "source" as a source of "greedy", "source" should no-longer have destinations', ->
        greedy._input.remove_source source._output
        
        expect( source._output.destinations ).to.be.eql []
      
      it 'Trying to remove "source" as a source of "greedy" a second time should throw', ->
        expect( () -> greedy._remove_source source ).to.throwException()
      
    describe 'Connections through the dot "." operator', ->
      it 'should have fetched content into a set through a stateless pipelet', ->
        s = rs.set( values ).pass_through().set()
        
        expect( s.a ).to.be.eql values
    
    describe 'add_destination()', ->
      it 'should have fetched content into a set even if stateless pipelet is pluged last into upstream pipelet', ->
        s = rs.set( values )
        
        p = rs.pass_through()
        
        s1 = p.set()
        
        s._output.add_destination( p._input )
        
        expect( s1.a ).to.be.eql values
