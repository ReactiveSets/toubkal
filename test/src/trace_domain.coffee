###
    trace_domain.coffee

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

utils = require( './xs_tests_utils.js' ) if require?
expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
log    = console.log

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

Trace_Domain = require '../../lib/trace.js' if require?

# ----------------------------------------------------------------------------------------------
# Trace test suite
# ------------------

describe 'Trace Domain', ->
  _trace = null
  
  trace = Trace_Domain 'my test trace domain', ( trace ) ->
    log "emit trace", trace
    _trace = trace
  
  it 'should provide a function', ( done ) ->
    check done, () ->
      expect( trace ).to.be.a( "function" )
      
  it 'have a value of 5', ->
    expect( trace.valueOf() ).to.be 5

  it 'should be >= 5', ->
    expect( trace >= 5 ).to.be true

  it 'should not be >= 6', ->
    expect( trace >= 6 ).to.be false

  it 'should return true when invoked at level 3 and not set _trace yet', ->
    expect( trace >= 3 && trace( 3 ) ).to.be true
    expect( _trace ).to.be null

  it 'should succeed when invoked with object with _get_name() method', ->
    expect( trace { _get_name: () -> 'an instance' } ).to.be true
    expect( _trace ).to.be null
  
  it 'should succeed when invoked with a method name', ->
    expect( trace 'a_method' ).to.be true
    expect( _trace ).to.be null
  
  it 'should succeed when invoked with objects to trace and should emit the trace object', ->
    expect( trace(
      { a: 1, b: 2 }
      'a message'
      3
      [ 1, 2, 3 ]
      ( trace, position ) ->
        trace[ 'from_function_' + position ] = position
    ) ).to.be true
    
    expect( _trace ).to.be.an( 'object' )
    
    expect( _trace._timestamp ).to.be.a Date
    
    delete _trace._timestamp
    
    expect( _trace ).to.be.eql {
      flow           : "trace"
      _level         : 3
      _realm         : "my test trace domain"
      _name          : "an instance"
      _method        : "a_method"
      a              : 1
      b              : 2
      message_1      : "a message"
      value_2        : 3
      values_3       : [ 1, 2, 3 ]
      from_function_4: 4
    }
    
    _trace = null
  
  it 'trace( 6 ) should return false and the trace object should be null', ->
    expect( trace 6 ).to.be false
    expect( _trace ).to.be null
  
  it 'should not allow any trace after trace.query_clear()', ->
    trace.query_clear()
    
    expect( trace.valueOf() ).to.be 0
    
  it 'should allow to add query expressions using trace.query_add(), setting trace level to 4', ->
    trace.query_add [
      {
        flow           : "trace"
        _realm         : "my test trace domain"
        _level         : 3
        _name          : "an instance"
        _method        : "_add"
      }
    ]
    
    expect( trace.valueOf() ).to.be 3
    
    trace.query_add [      
      {
        _level         : 4
        _name          : "another instance"
        _method        : "_add"
      }
      
      {
        _name          : "an instance"
        _level         : 4
      }

      {
        _method        : "_remove"
        _level         : 3
      }

      {
        _level         : 2
      }
    ]
    
    expect( trace.valueOf() ).to.be 4
  
  it 'should not allow a trace level 4 to an instance that is not "an other instance"', ->
    expect( trace >= 4 && trace 4 ).to.be true
    expect( trace "that instance" ).to.be false
    expect( _trace ).to.be null
  
  it 'should allow traces at level 4 to "an other instance"', ->
    expect( trace >= 4 && trace 4, "another instance" ).to.be true
    expect( _trace ).to.be null
    expect( trace( "_add" ) ).to.be true
    expect( _trace ).to.be null
    expect( trace "!! this is a warning" ).to.be true
    
    expect( _trace ).to.be.an( 'object' )
    expect( _trace._timestamp ).to.be.a Date
    delete _trace._timestamp
    
    expect( _trace ).to.be.eql {
      flow           : "trace"
      _level         : 4
      _realm         : "my test trace domain"
      _name          : "another instance"
      _method        : "_add"
      message        : "!! this is a warning"
    }
    
