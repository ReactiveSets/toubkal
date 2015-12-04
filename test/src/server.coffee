###
    server.coffee

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

utils  = require './tests_utils.js'

expect = utils.expect
check  = utils.check
rs     = utils.rs
RS     = rs.RS
clone  = RS.extend.clone

require 'toubkal'

# ----------------------------------------------------------------------------------------------
# Test suites
# -----------

http_servers      = null
schemas           = null
database          = null
socket_io_clients = null

describe 'http_servers()', ->
  it 'should allow to create an http server on localhost port 3333', ->
    http_servers = rs
      .set( [ { port: 3333 } ] )
      .http_servers()
    
    expect( http_servers ).to.be.a RS.Pipelet

describe 'in-memory database with dispatch()', ->
  it 'should build an empty database', ( done ) ->
    schemas = rs.set [
      { id: 'users' }
      { id: 'profiles' }
    ]
    
    database = rs
      .dispatch schemas, ( source, options ) ->
        flow = this.id

        source
          .flow( flow, { key: this.key || [ 'id' ] } )
          .trace( flow + ' in' )
          .set( [] )
          .trace( flow + ' out' )
          .flow( flow )
    
    fetched = ( data ) ->
      check done, () ->
        expect( data ).to.be.eql []
    
    database._fetch_all fetched, [ { flow: 'users' }, { flow: 'profiles' } ]
  
  it 'should allow to add a user in database', ( done ) ->
    database._add [ { flow: 'users', id: 1, name: 'joe' } ]
    
    database._fetch_all ( data ) ->
      check done, () ->
        expect( data ).to.be.eql [ { flow: 'users', id: 1, name: 'joe' } ]
  
  it 'should allow to remove user from database', ( done ) ->
    database._remove [ { flow: 'users', id: 1, name: 'joe' } ]
    
    database._fetch_all ( data ) ->
      check done, () ->
        expect( data ).to.be.eql []
  
  it 'should allow to add two users, a user profile and ignore other data', ( done ) ->
    database._add [
      { flow: 'users', id: 1, name: 'joe' }
      { flow: 'profiles', id: 1, user_id: 1, age: 26 }
      { flow: 'users', id: 1, name: 'jack' }
      { flow: 'other', id: 1 }
    ]
    
    database._fetch_all ( data ) ->
      check done, () ->
        expect( data ).to.be.eql [
          { flow: 'users', id: 1, name: 'joe' }
          { flow: 'users', id: 1, name: 'jack' }
          { flow: 'profiles', id: 1, user_id: 1, age: 26 }
        ]
  
  it 'should allow to remove profiles schema', ( done ) ->
    schemas._remove [ { id: 'profiles' } ]
    
    database._fetch_all ( data ) ->
      check done, () ->
        expect( data ).to.be.eql [
          { flow: 'users', id: 1, name: 'joe' }
          { flow: 'users', id: 1, name: 'jack' }
        ]
  
  it 'should allow to update users schema without altering underlying data', ( done ) ->
    schemas._update [ [ { id: 'users' }, { id: 'users', description: 'A collection of users' } ] ]
    
    database._fetch_all ( data ) ->
      check done, () ->
        expect( data ).to.be.eql [
          { flow: 'users', id: 1, name: 'joe' }
          { flow: 'users', id: 1, name: 'jack' }
        ]

describe 'socket_io_clients()', ->
  it 'should be a Pipelet', ->
    socket_io_clients = rs.socket_io_clients()

    expect( socket_io_clients ).to.be.a RS.Pipelet


  it 'should allow to add http server to socket_io_clients', ->
    http_servers.through( socket_io_clients )

    expect( socket_io_clients._input.source ).to.be http_servers._output
      