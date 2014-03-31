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
    directories_source = xs
      .set( [
          { path: 'test' }
          { path: 'test' }
          { path: 'test' }
        ]
        { key: [ 'path' ] }
      )
      .union( [] )
    
    entries = directories_source
      .watch_directories()
    
    directories_source._add_source entries.filter [ { path: 'test/bootstrap' } ]
    
    xs_file = entries
      .filter( [ { type: 'file', extension: 'coffee', path: 'test/xs_file.coffee', depth: 1 } ] )
      .trace( 'xs_file' )
      .set()
    
    javascript = entries
      .filter( [ { type: 'file', extension: 'js', depth: 1 } ] )
      .set()
      
    directories = entries
      .filter( [ { type: 'directory' } ] )
      .trace( 'directories' )
      .set()
      
    it 'should have one directory: "test"', ->
      expect( Object.keys( entries._directories ) ).to.be.eql [
        'test'
        'test/bootstrap'
      ]
      
    it '"test" directory should have a count of 3', ->
      expect( entries._directories[ 'test' ].count ).to.be.eql 3
    
    it '"test/bootstrap" directory should have a count of 1', ->
      expect( entries._directories[ 'test/bootstrap' ].count ).to.be.eql 1
    
    it 'should have one value for test/xs_file.coffee at depth 1', ( done ) ->
      xs_file._fetch_all ( values ) -> check done, () ->
        expect( values.length ).to.be.eql 1
        
    it 'should emit 5 directories at depth 1 and 3 directories at depth 2', ( done ) ->
      directories._fetch_all ( values ) -> check done, () ->
        expect(
          values
            .map( ( e ) -> { path: e.path, type: e.type, extension: e.extension, depth: e.depth } )
            .sort ( a, b ) -> if a.path < b.path then -1 else a.path > b.path
        ).to.be.eql [
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
    
    it 'should still have two directories', ->
      expect( Object.keys( entries._directories ) ).to.be.eql [
        'test'
        'test/bootstrap'
      ]

    it 'should remove both directories after removing the "test" directory', ->
      entries._remove [ { path: 'test' } ]
      
      expect( Object.keys( entries._directories ) ).to.be.eql []
