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

describe 'Pipelets', ->
  describe 'Pipelet Connections', ->
    values = [ { id: 1 }, { id: 2 } ]
    
    source = new Pipelet()
    lazy   = new Pipelet()
    greedy = rs.greedy()
    
    lazy._add_source source
    greedy._input.add_source source._output
    
    it 'source should have lazy and greedy inputs as outputs', ->
      expect( source._output.destinations ).to.be.eql [ lazy._input, greedy._input ]
    
    it 'lazy should have source._output as its input', ->
      expect( lazy._input.source ).to.be source._output
      
    it 'greedy should have source._output as its input', ->
      expect( greedy._input.source ).to.be source._output
      
    it 'source query tree should have greedy as a subscriber in its top node', ->
      expect( source._output.tree.top ).to.be.eql {
        branches   : {}
        keys       : []
        subscribers: [ greedy._input ]
      }
    
    it 'should have fetched content into a set through a stateless pipelet', ->
      s = rs.set( values ).pass_through().set()
      
      expect( s.a ).to.be.eql values
    
    it 'should have fetched content into a set even if stateless pipelet is pluged last into upstream pipelet', ->
      s = rs.set( values )
      
      p = rs.pass_through()
      
      s1 = p.set()
      
      s._output.add_destination( p._input )
      
      expect( s1.a ).to.be.eql values
