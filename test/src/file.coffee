###
    file.coffee

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
win32  = process.platform == 'win32'

fix_path_string = ( path ) -> if win32 then path.replace( /\//g, "\\" ) else path

fix_path = ( o ) ->
  if win32
    o.path = fix_path_string o.path
  
  return o

require '../../lib/server/file.js'

fs   = require 'fs'
path = require 'path'

de = false

# ----------------------------------------------------------------------------------------------
# Test File pipelets
# ------------------

describe 'file', ->
  describe 'configuration():', ->
    configuration = null
    configuration_greedy = null
    expected = [
      {
        flow: "configuration"
        id: "nodemailer"
        transport: "sendmail"
        transport_options: {}
      }
      
      {
        flow: "configuration"
        "id": "passport_strategy"
        "strategies": [
          {
            "id": "twitter"
            "credentials": {
              "key": "***"
              "secret": "---"
            }
          }
          
          {
            "id": "facebook"
            "credentials": {
              "key": "***"
              "secret": "---"
            }
          }
        ]
      }
    ]
    
    filepath = '../fixtures/file/config.json'
    
    it 'should read a confirugation file in fixtures/config.json', ( done ) ->
      configuration = rs
        
        .configuration( {
          filepath      : filepath
          base_directory: __dirname
          debug         : 1
        } )
      
      configuration_greedy = configuration.greedy()
      
      configuration_greedy._output.once 'complete', () ->
        receiver = ( values ) -> check done, () ->
          expect( values ).to.be.eql expected
        
        configuration._fetch_all receiver
    
    it 'should allow to add a value', ( done ) ->
      configuration._add [ { id: "new value" } ]
      
      expected.push { flow: "configuration", id: "new value" }
      
      configuration_greedy._output.once 'complete', () ->
        receiver = ( values ) -> check done, () ->
          expect( values ).to.be.eql expected
        
        configuration._fetch_all receiver
    
    it 'should have modified configuration file', ( done ) ->
      fs.readFile path.join( __dirname, filepath ), 'utf8', ( error, data ) ->
        check done, () ->
          expect( error ).to.be null
          
          expect( JSON.parse( data ) ).to.be.eql expected
    
    it 'should allow to update added value', ( done ) ->
      configuration._update [ [ { id: "new value" }, { id: "new value", test: 1 } ] ]
      
      expected[ expected.length - 1 ] = { flow: "configuration", id: "new value", test: 1 }
      
      configuration_greedy._output.once 'complete', () ->
        receiver = ( values ) -> check done, () ->
          expect( values ).to.be.eql expected
        
        configuration._fetch_all receiver
    
    it 'should have modified configuration file', ( done ) ->
      fs.readFile path.join( __dirname, filepath ), 'utf8', ( error, data ) ->
        check done, () ->
          expect( error ).to.be null
          
          expect( JSON.parse( data ) ).to.be.eql expected
    
    it 'should allow to remove added value', ( done ) ->
      configuration._remove [ { id: "new value" } ]
      
      expected.pop()
      
      test = () ->
        receiver = ( values ) -> check done, () ->
          expect( values ).to.be.eql expected
        
        configuration._fetch_all receiver
      
      setTimeout( test, 100 )
    
    it 'should have modified configuration file', ( done ) ->
      fs.readFile path.join( __dirname, filepath ), 'utf8', ( error, data ) ->
        check done, () ->
          expect( error ).to.be null
          
          expect( JSON.parse( data ) ).to.be.eql expected
  
  describe 'watch_directories():', ->
    directories_source = rs
      .set( [
          { path: 'directories' }
          { path: 'directories' }
          { path: 'directories' }
        ]
        { key: [ 'path' ] }
      )
      .union( [] )
    
    entries = directories_source.watch_directories( { base_directory: 'test/fixtures/file' } )
    
    directories = entries
      .filter [ { type: 'directory' } ]
      .debug( de, 'directories' )
    
    directories_source._add_source directories
    
    expected_directories = [
      'directories'
      'directories/css'
      'directories/html'
      'directories/lib'
      'directories/lib/client'
      'directories/lib/client/index'
      'directories/lib/server'
      'directories/lib/server/index'
    ].map fix_path_string
    
    css = entries
      .filter( [ { type: 'file', extension: 'css' } ] )  
      .debug( de, 'css files' )
      .set()
      
    html = entries
      .filter( [ { type: 'file', extension: 'html' } ] )  
      .debug( de, 'html files' )
      .set()
      
    javascript = entries
      .filter( [ { type: 'file', extension: 'js' } ] )
      .set()
    
    get_entry_static_attributes = ( e ) ->
      { path: e.path, type: e.type, extension: e.extension, depth: e.depth }
    
    entry_sorter = ( a, b ) ->
      if a.path < b.path then -1 else a.path > b.path
    
    it 'should have many directories', ->
      expect( Object.keys( entries._directories ).sort() ).to.be.eql expected_directories
    
    it '"directories" directory should have a count of 3', ->
      expect( entries._directories[ 'directories' ].count ).to.be.eql 3
    
    it '"directories/css" directory should have a count of 1', ->
      expect( entries._directories[ fix_path_string 'directories/css' ].count ).to.be.eql 1
    
    it '"directories/lib/client/index" directory should have a count of 1', ->
      expect( entries._directories[ fix_path_string 'directories/lib/client/index' ].count ).to.be.eql 1
    
    it 'should have javascript files', ( done ) ->
      javascript._fetch_all ( values ) -> check done, () ->
        expect( values.map( get_entry_static_attributes ).sort entry_sorter ).to.be.eql [
          {
            "path": "directories/lib/client/index/start.js"
            "type": "file"
            "extension": "js"
            "depth": 4
          }
          
          {
            "path": "directories/lib/server/index/models.js"
            "type": "file"
            "extension": "js"
            "depth": 4
          }
        ].map fix_path
    
    it 'should have css files', ( done ) ->
      css._fetch_all ( values ) -> check done, () ->
        expect( values.map( get_entry_static_attributes ).sort entry_sorter ).to.be.eql [
          {
            "path": "directories/css/index.css"
            "type": "file"
            "extension": "css"
            "depth": 2
          }
        ].map fix_path
    
    it 'should have an html file', ( done ) ->
      html._fetch_all ( values ) -> check done, () ->
        expect( values.map( get_entry_static_attributes ).sort entry_sorter ).to.be.eql [
          {
            "path": "directories/html/index.html"
            "type": "file"
            "extension": "html"
            "depth": 2
          }
        ].map fix_path
    
    it 'should have 11 entries', ( done ) ->
      entries._fetch_all ( values ) -> check done, () ->
        expect( values.length ).to.be 11
    
    it 'should many directories at depths 1, and 2', ( done ) ->
      directories._fetch_all ( values ) -> check done, () ->
        expect( values.map( get_entry_static_attributes ).sort entry_sorter ).to.be.eql [
          {
            "path": "directories/css"
            "type": "directory"
            "extension": ""
            "depth": 1
          }
          
          {
            "path": "directories/html"
            "type": "directory"
            "extension": ""
            "depth": 1
          }
          
          {
            path: 'directories/lib'
            type: 'directory'
            extension: ''
            depth: 1
          }
          
          {
            path: 'directories/lib/client'
            type: 'directory'
            extension: ''
            depth: 2
          }
          
          {
            path: 'directories/lib/client/index'
            type: 'directory'
            extension: ''
            depth: 3
          }
          
          {
            "path": "directories/lib/server"
            "type": "directory"
            "extension": ""
            "depth": 2
          }
          
          {
            "path": "directories/lib/server/index"
            "type": "directory"
            "extension": ""
            "depth": 3
          }
        ].map fix_path
    
    it 'should not remove "directories" directory after removing 2 extra path from directories_source', ->
      entries._remove [
          { path: 'directories' }
          { path: 'directories' }
        ]
      
      expect( entries._directories[ 'directories' ].count ).to.be.eql 1
    
    it 'should still have many directories', ->
      expect( Object.keys( entries._directories ).sort() ).to.be.eql expected_directories
    
    it 'should remove both directories after removing the "directories" directory', ->
      entries._remove [ { path: 'directories' } ]
      
      expect( Object.keys( entries._directories ) ).to.be.eql []
    
    it 'should have no directory left', ( done ) ->
      directories._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should have no css files left', ( done ) ->
      css._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should have no html files left', ( done ) ->
      html._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should have no javascript files left', ( done ) ->
      javascript._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should have no entries left', ( done ) ->
      entries._fetch_all ( values ) -> check done, () -> expect( values ).to.be.eql []
    
    it 'should not throw after attempting to remove extra directory', ->
      entries._remove [ { path: 'directories' } ]
      
      expect( Object.keys( entries._directories ) ).to.be.eql []

    it 'from_empty_directory_path should emit three entries with no leading "/"', ( done ) ->
      from_empty_directory_path = rs
        .set( [ { path: '' } ], { key: [ 'path' ] } )
        
        .watch_directories( { base_directory: 'test/fixtures/file/directories', name: 'from_empty_directory_path' } )
      
      from_empty_directory_path._output.on 'complete' , () ->
        from_empty_directory_path._fetch_all ( values ) -> check done, () ->
          expect( values.map( get_entry_static_attributes ).sort entry_sorter ).to.be.eql [
            {
              "path": "./css"
              "type": "directory"
              "extension": ""
              "depth": 1
            }
            
            {
              "path": "./html"
              "type": "directory"
              "extension": ""
              "depth": 1
            }
            
            {
              "path": "./lib"
              "type": "directory"
              "extension": ""
              "depth": 1
            }
          ].map fix_path
