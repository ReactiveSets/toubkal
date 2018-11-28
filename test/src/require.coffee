###
    require.coffee

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
# rs test utils
# -------------

utils  = require './tests_utils.js'

expect = utils.expect
check  = utils.check
rs     = utils.rs
clone  = rs.RS.extend.clone

require '../../lib/server/require.js'

# ----------------------------------------------------------------------------------------------
# Test require pipelets
# ---------------------

describe 'require_resolve():', ->
  modules = rs
    .set( [
      { name: 'node-uuid/uuid.js' }
    ], { key: [ 'name' ] } )
  
  resolve = modules
    .require_resolve()
  
  resolved = resolve
    .set()
  
  it 'should resolve node-uuid/uuid.js', ( done ) ->
    resolved._fetch_all ( values ) -> check done, () ->
      expect( values.length ).to.be.eql 1
      
      uuid = values[ 0 ]
      name = uuid.name
      path = uuid.path.replace( /\\/g, '/' )
      
      expect( name ).to.be.eql 'node-uuid/uuid.js'
      expect( path.slice( path.length - name.length ) ).to.be.eql name
      expect( uuid.uri ).to.be.eql '/node_modules/node-uuid/uuid.js'
  
  it 'should allow to remove a module', ( done ) ->
    modules._remove [ { name: 'node-uuid/uuid.js' } ]
    
    resolved._fetch_all ( values ) -> check done, () ->
      expect( values.length ).to.be.eql 0
  
  it 'should allow to resolve "node-uuid/uuid", adding ".js" to uri', ( done ) ->
    modules._add [ { name: 'node-uuid/uuid' } ]
    
    resolved._fetch_all ( values ) -> check done, () ->
      expect( values.length ).to.be.eql 1
      
      uuid = values[ 0 ]
      name = uuid.name
      path = uuid.path.replace( /\\/g, '/' )
      
      expect( name     ).to.be.eql 'node-uuid/uuid'
      expect( uuid.uri ).to.be.eql '/node_modules/node-uuid/uuid.js'
  
  it 'should emit nothing when adding a module which cannot be resolved', ( done ) ->
    modules._add [ { name: 'not-exists' } ]
    
    resolved._fetch_all ( values ) -> check done, () ->
      expect( values.length ).to.be.eql 1
      
      uuid = values[ 0 ]
      name = uuid.name
      path = uuid.path.replace( /\\/g, '/' )
      
      expect( name     ).to.be.eql 'node-uuid/uuid'
