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
rs     = this.rs     || utils.rs

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
      it 'Attempting to use _input.add_source() with a Pipelet instead of an Output should throw', ->
        expect( () -> greedy._input.add_source source ).to.throwException()
      
      it 'Adding as "source" as a source to "lazy", "source" should have "lazy" input as desintations', ->
        lazy._add_source source
        
        expect( source._output.destinations ).to.be.eql [ lazy._input ]
      
      it '"lazy" should have "source._output" as its input source', ->
        expect( lazy._input.source ).to.be source._output
      
      it '"source" query tree should not have "lazy" as a subscriber in its top node', ->
        expect( source._output.tree.top.subscribers ).to.be.eql []
      
      it 'after adding "greedy", "source" should now have "lazy" and "greedy" inputs as destinations', ->
        greedy._input.add_source source._output
        
        expect( source._output.destinations ).to.be.eql [ lazy._input, greedy._input ]
      
      it '"greedy" should have "source._output" as its input source', ->
        expect( greedy._input.source ).to.be source._output
      
      it '"source" query tree should have "greedy" as the only subscriber in its top node', ->
        expect( source._output.tree.top.subscribers ).to.be.eql [ greedy._input ]
      
      it 'Trying to add "source" as a source of "lazy" a second time should throw', ->
        expect( () -> lazy._add_source source ).to.throwException()
      
      it 'Trying to add "source" as a source of "greedy" a second time should throw', ->
        expect( () -> greedy._input.add_source source._output ).to.throwException()
      
      it 'Trying to add "lazy" as a source of "greedy" should throw', ->
        expect( () -> greedy._add_source lazy ).to.throwException()
      
    describe 'remove_source()', ->
      it 'Attempting to use _input.remove_source() with a Pipelet instead of an Output should throw', ->
        expect( () -> greedy._input.remove_source source ).to.throwException()
      
      it 'After removing "source" as a source of "lazy", "source" should have only "greedy" as a destination', ->
        lazy._remove_source source
        
        expect( source._output.destinations ).to.be.eql [ greedy._input ]
      
      it 'Trying to remove "source" as a source of "lazy" a second time should throw', ->
        expect( () -> lazy._remove_source source ).to.throwException()
      
      it 'After removing "source" as a source of "greedy", "source" should no-longer have destinations', ->
        greedy._input.remove_source source._output
        
        expect( source._output.destinations ).to.be.eql []
      
      it '"source" query tree should no-longer have "greedy" as a subscriber in its top node', ->
        expect( source._output.tree.top.subscribers ).to.be.eql []
      
      it 'Trying to remove "source" as a source of "greedy" a second time should throw', ->
        expect( () -> greedy._remove_source source ).to.throwException()
      
    describe 'add_destination()', ->
      it 'Attempting to use _output.add_destination() with a Pipelet instead of an Input should throw', ->
        expect( () -> source._output.add_destination greedy ).to.throwException()
      
      it 'Adding "lazy" as a destination to "source", "source" should have "lazy" input as desintations', ->
        # Reinitialize lazy because the previous operation threw an exception but left it in a greedy state
        lazy = new Pipelet()
        
        source._add_destination lazy
        
        expect( source._output.destinations ).to.be.eql [ lazy._input ]
      
      it '"lazy" should have "source._output" as its input source', ->
        expect( lazy._input.source ).to.be source._output
      
      it '"source" query tree should not have "lazy" as a subscriber in its top node', ->
        expect( source._output.tree.top.subscribers ).to.be.eql []
      
      it 'after adding "greedy", "source" should now have "lazy" and "greedy" inputs as destinations', ->
        source._output.add_destination greedy._input
        
        expect( source._output.destinations ).to.be.eql [ lazy._input, greedy._input ]
      
      it '"greedy" should have "source._output" as its input source', ->
        expect( greedy._input.source ).to.be source._output
      
      it '"source" query tree should have "greedy" as the only subscriber in its top node', ->
        expect( source._output.tree.top.subscribers ).to.be.eql [ greedy._input ]
      
      it 'Trying to add "lazy" as a destination to "source" a second time should throw', ->
        expect( () -> source._add_destination lazy ).to.throwException()
      
      it 'Trying to add "greedy" as a destination to "source" a second time should throw', ->
        expect( () -> source._output._input.add_destination greedy._input ).to.throwException()
      
      it 'Trying to add "greedy" as a destination to "greedy" should throw', ->
        expect( () -> lazy._add_destination greedy ).to.throwException()
      
    describe 'remove_destination()', ->
      it 'Attempting to use _output.remove_destination() with a Pipelet instead of an Input should throw', ->
        expect( () -> source._output.remove_destination greedy ).to.throwException()
      
      it 'After removing "lazy" as a destionation to "source", "source" should have only "greedy" as a destination', ->
        source._remove_destination lazy
        
        expect( source._output.destinations ).to.be.eql [ greedy._input ]
      
      it 'Trying to remove "lazy" as a destination to "source" a second time should throw', ->
        expect( () -> source._remove_destination lazy ).to.throwException()
      
      it 'After removing "greedy" as a destionation to "source", "source" should no-longer have destinations', ->
        source._output.remove_destination greedy._input
        
        expect( source._output.destinations ).to.be.eql []
      
      it '"source" query tree should no-longer have "greedy" as a subscriber in its top node', ->
        expect( source._output.tree.top.subscribers ).to.be.eql []
      
      it 'Trying to remove "greedy" as a destination to "source" a second time should throw', ->
        expect( () -> source._remove_destination greedy ).to.throwException()
      
    # ToDo: add / remove _ source / destination on an Array of objects
    
    describe 'Fetching contend on connections through the dot "." operator', ->
      it 'should have fetched content into a set through a stateless pipelet', ->
        s = rs.set( values ).pass_through().set()
        
        expect( s.a ).to.be.eql values
    
    describe 'Fetching content on add_destination()', ->
      it 'should have fetched content into a set even if stateless pipelet is pluged last into upstream pipelet', ->
        s = rs.set( values )
        
        p = rs.pass_through()
        
        s1 = p.set()
        
        s._output.add_destination( p._input )
        
        expect( s1.a ).to.be.eql values
