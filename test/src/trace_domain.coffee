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

utils = require( './tests_utils.js' ) if require?
expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
log    = console.log

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

Trace_Domain = this.Trace_Domain || require '../../lib/trace_domain.js'

# ----------------------------------------------------------------------------------------------
# Trace test suite
# ------------------

describe 'Trace Domain', ->
  _trace = null
  
  check_trace = ( t ) ->
    expect( _trace ).to.be.an 'object'
    
    expect( _trace._timestamp ).to.be.a Date
    delete _trace._timestamp
    
    expect( _trace ).to.be.eql t
    
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
    
    check_trace {
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
  
  it 'should not allow trace to progress at level 6', ->
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
        flow           : "not a trace"
        _realm         : "my test trace domain"
        _level         : 5
        _name          : "an instance"
        _method        : "_add"
      }
      
      {
        flow           : "trace"
        _realm         : "not my test trace domain"
        _level         : 5
        _name          : "an instance"
        _method        : "_add"
      }
      
      {
        _level         : [ "<=", 4 ]
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
        _level         : [ "<=", 2 ]
      }
    ]
    
    expect( trace.valueOf() ).to.be 4
  
  it 'should not allow trace to progress at level 5', ->
    expect( trace >= 5 ).to.be false
  
  it 'should allow trace to progress at level 4', ->
    expect( trace >= 4 && trace 4 ).to.be true
  
  it 'should not allow trace to further progress for "that instance"', ->
    expect( trace "that instance" ).to.be false
    expect( _trace ).to.be null
  
  it 'should allow traces at level 4 for method "_add" to "another instance"', ->
    expect( trace >= 4 && trace 4, "another instance" ).to.be true
    expect( _trace ).to.be null
    expect( trace( "_add" ) ).to.be true
    expect( _trace ).to.be null
    expect( trace "!! this is a warning" ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 4
      _realm         : "my test trace domain"
      _name          : "another instance"
      _method        : "_add"
      message        : "!! this is a warning"
    }
  
  it 'should allow that trace on method _remove for "an instance" at level 4', ->
    expect( trace >= 4 && trace 4, "an instance", "_remove", { a: 1 } ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 4
      _realm         : "my test trace domain"
      _name          : "an instance"
      _method        : "_remove"
      a              : 1
    }
  
  it 'should allow trace to progress for "another instance" at level 4', ->
    expect( trace >= 4 && trace 4, "another instance" ).to.be true
  
  it 'should not allow trace to further progress on method _remove', ->
    expect( trace "_remove" ).to.be false
  
  it 'should allow that trace on method _remove for "another instance" at level 3', ->
    expect( trace >= 3 && trace 3, "another instance", "_remove", { a: 1 } ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 3
      _realm         : "my test trace domain"
      _name          : "another instance"
      _method        : "_remove"
      a              : 1
    }
  
  it 'should allow trace to progress for "some instance" at level 3', ->
    expect( trace >= 3 && trace 3, "some instance" ).to.be true
  
  it 'should not allow trace to further progress with method "_add"', ->
    expect( trace "_add" ).to.be false
  
  it 'should allow a trace on method _remove for "some instance" at level 3', ->
    expect( trace >= 3 && trace 3, "some instance", "_remove", { a: 1 } ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 3
      _realm         : "my test trace domain"
      _name          : "some instance"
      _method        : "_remove"
      a              : 1
    }

  it 'should allow that trace on method _clear for "some instance" at level 2', ->
    expect( trace >= 2 && trace 2, "some instance", "_clear", { a: 1 } ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 2
      _realm         : "my test trace domain"
      _name          : "some instance"
      _method        : "_clear"
      a              : 1
    }
    
  it 'should allow that trace on method "_clear" for "some instance" at level 1', ->
    expect( trace >= 1 && trace 1, "some instance", "_clear", { a: 1 } ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 1
      _realm         : "my test trace domain"
      _name          : "some instance"
      _method        : "_clear"
      a              : 1
    }
    
  it 'should allow to remove a query from a non-trace dataflow', ->
    trace.query_remove [
      {
        flow           : "not a trace"
        _realm         : "my test trace domain"
        _level         : 5
        _name          : "an instance"
        _method        : "_add"
      }
    ]
    
    expect( trace.valueOf() ).to.be 4
  
  it 'should allow to remove the trace query for method "_add" at level <= 4 to "another instance"', ->
    trace.query_remove [
      {
        _level         : [ "<=", 4 ]
        _name          : "another instance"
        _method        : "_add"
      }
    ]
    
    expect( trace >= 4 && trace 4 ).to.be true
    expect( trace "another instance" ).to.be false
    
    expect( trace >= 3 && trace 3, "another instance" ).to.be true
    expect( trace "_add" ).to.be false
    
    expect( trace >= 3 && trace 3, "another instance", "_remove" ).to.be true
    expect( trace "!!! this is an error" ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 3
      _realm         : "my test trace domain"
      _name          : "another instance"
      _method        : "_remove"
      message        : "!!! this is an error"
    }
  
  it 'should allow to remove the trace query for method "_add" at level 3 to "an instance"', ->
    trace.query_remove [
      {
        flow           : "trace"
        _realm         : "my test trace domain"
        _level         : 3
        _name          : "an instance"
        _method        : "_add"
      }
    ]
    
    expect( trace >= 4 && trace 4, "an instance", "_add", "Warning" ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 4
      _realm         : "my test trace domain"
      _name          : "an instance"
      _method        : "_add"
      message        : "Warning"
    }
  
  it 'should allow to remove the trace query for any method on any instance at level <= 2', ->
    trace.query_remove [
      {
        _level         : [ "<=", 2 ]
      }
    ]
    
    expect( trace >= 2 && trace 2, "some instance" ).to.be true
    expect( trace "_add" ).to.be false
    
    expect( trace >= 3 && trace 3, "some instance", "_remove", "Error" ).to.be true

    check_trace {
      flow           : "trace"
      _level         : 3
      _realm         : "my test trace domain"
      _name          : "some instance"
      _method        : "_remove"
      message        : "Error"
    }
  
  it 'should allow to remove the trace query for any method on instance "an instance" at level 4', ->
    trace.query_remove [
      {
        _name          : "an instance"
        _level         : 4
      }
    ]

    expect( trace.valueOf() ).to.be 3
    expect( trace >= 3 && trace 3, "some instance" ).to.be true
    expect( trace "_add" ).to.be false
    
    expect( trace >= 3 && trace 3, "some instance", "_remove" ).to.be true
    
    expect( trace "Another Error" ).to.be true
    
    check_trace {
      flow           : "trace"
      _level         : 3
      _realm         : "my test trace domain"
      _name          : "some instance"
      _method        : "_remove"
      message        : "Another Error"
    }
  
  it 'should allow to remove the last query: method "_remove" at level 3 on any instance', ->
    trace.query_remove [
      {
        _method        : "_remove"
        _level         : 3
      }
    ]
    
    expect( trace.valueOf() ).to.be 0
    expect( trace >= 0 ).to.be true
    expect( trace >= 1 ).to.be false
    expect( trace 1 ).to.be false
