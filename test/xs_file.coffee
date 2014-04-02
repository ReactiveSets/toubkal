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
  describe 'require_resolve():', ->
    uuid = xs
      .set( [ { name: 'node-uuid/uuid.js' } ] )
      .require_resolve()
      .trace( 'uuid.js' )
      .set()
    
    it 'should resolve node-uuid/uuid.js', ( done ) ->
      uuid._fetch_all ( values ) -> check done, () ->
        expect( values.length ).to.be.eql 1
        
        v = values[ 0 ]
        
        expect( v.name ).to.be.eql 'node-uuid/uuid.js'
        expect( v.path.length ).to.be.above 10
        expect( v.uri ).to.be.eql '/node_modules/node-uuid/uuid.js'
  
  describe 'watch_directories():', ->
    directories_source = xs
      .set( [
          { path: 'test' }
          { path: 'test' }
          { path: 'test' }
        ]
        { key: [ 'path' ] }
      )
      .union( [] )
    
    entries = directories_source.watch_directories()
    
    bootstrap = entries.filter [
      { type: 'directory', path: 'test/bootstrap' }
      { type: 'directory', path: 'test/bootstrap/css' }
    ]
    
    directories_source._add_source bootstrap
    
    coffee = entries
      .filter( [ { type: 'file', extension: 'coffee', path: 'test/xs_file.coffee', depth: 1 } ] )
      .trace( 'coffee' )
      .set()
    
    javascript = entries
      .filter( [ { type: 'file', extension: 'js', depth: 1 } ] )
      .set()
      
    directories = entries
      .filter( [ { type: 'directory' } ] )
      .trace( 'directories' )
      .set()
    
    css = entries
      .filter( [ { type: 'file', extension: 'css' } ] )  
      .trace( 'css files' )
      .set()
      
    get_entry_static_attributes = ( e ) ->
      { path: e.path, type: e.type, extension: e.extension, depth: e.depth }
    
    entry_sorter = ( a, b ) ->
      if a.path < b.path then -1 else a.path > b.path
    
    it 'should have one directory: "test"', ->
      expect( Object.keys( entries._directories ) ).to.be.eql [
        'test'
        'test/bootstrap'
        'test/bootstrap/css'
      ]
      
    it '"test" directory should have a count of 3', ->
      expect( entries._directories[ 'test' ].count ).to.be.eql 3
    
    it '"test/bootstrap" directory should have a count of 1', ->
      expect( entries._directories[ 'test/bootstrap' ].count ).to.be.eql 1
    
    it '"test/bootstrap/css" directory should have a count of 1', ->
      expect( entries._directories[ 'test/bootstrap/css' ].count ).to.be.eql 1
    
    it 'should have one value for test/xs_file.coffee at depth 1', ( done ) ->
      coffee._fetch_all ( values ) -> check done, () -> expect( values.length ).to.be.eql 1
    
    it 'should have css files', ( done ) ->
      css._fetch_all ( values ) -> check done, () -> expect( values.length ).to.be.above 3
        
    it 'should have javascript files', ( done ) ->
      javascript._fetch_all ( values ) -> check done, () -> expect( values.length ).to.be.above 5
    
    it 'should have entries', ( done ) ->
      entries._fetch_all ( values ) -> check done, () -> expect( values.length ).to.be.above 20
    
    it 'should emit 5 directories at depth 1 and 3 directories at depth 2', ( done ) ->
      directories._fetch_all ( values ) -> check done, () ->
        expect( values.map( get_entry_static_attributes ).sort entry_sorter ).to.be.eql [
          {
            "path": "test/bootstrap"
            "type": "directory"
            "extension": ""
            "depth": 1
          }
          
          {
            path: 'test/bootstrap/css'
            type: 'directory'
            extension: ''
            depth: 2
          }
          
          {
            path: 'test/bootstrap/fonts'
            type: 'directory'
            extension: ''
            depth: 2
          }
          
          {
            path: 'test/bootstrap/js'
            type: 'directory'
            extension: ''
            depth: 2
          }
          
          {
            "path": "test/css"
            "type": "directory"
            "extension": ""
            "depth": 1
          }
          
          {
            "path": "test/deprecated"
            "type": "directory"
            "extension": ""
            "depth": 1
          }
          
          {
            "path": "test/images"
            "type": "directory"
            "extension": ""
            "depth": 1
          }
          
          {
            "path": "test/javascript"
            "type": "directory"
            "extension": ""
            "depth": 1
          }
        ]
    
    it 'should not remove test directory after removing 2 extra path from directories_source', ->
      entries._remove [
          { path: 'test' }
          { path: 'test' }
        ]
      
      expect( entries._directories[ 'test' ].count ).to.be.eql 1
    
    it 'should still have three directories', ->
      expect( Object.keys( entries._directories ) ).to.be.eql [
        'test'
        'test/bootstrap'
        'test/bootstrap/css'
      ]

    it 'should remove both directories after removing the "test" directory', ->
      entries._remove [ { path: 'test' } ]
      
      expect( Object.keys( entries._directories ) ).to.be.eql []
    
    it 'should have no directory left', ( done ) ->
      directories._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should have no css files left', ( done ) ->
      css._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should have no coffee files left', ( done ) ->
      coffee._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []

    it 'should have no javascript files left', ( done ) ->
      javascript._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should have no entries left', ( done ) ->
      entries._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should not throw after attempting to remove extra directory', ->
      entries._remove [ { path: 'test' } ]
      
      expect( Object.keys( entries._directories ) ).to.be.eql []
    