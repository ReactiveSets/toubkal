#/bin/sh: aspell : commande introuvable
###
    lazy_logger.coffee

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

utils = require( './tests_utils.js' ) unless this.expect?

expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
log    = this.log    || utils.log

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------

Lazy_Logger = this.Lazy_Logger || require '../../lib/util/lazy_logger.js'

# ----------------------------------------------------------------------------------------------
# Lazy Logger test suite
# ----------------------

describe 'Lazy Logger', ->
  _log = null
  
  check_log = ( t ) ->
    expect( _log ).to.be.an 'object'
    
    expect( _log._timestamp ).to.be.a Date
    delete _log._timestamp
    
    expect( _log ).to.be.eql t
    
    _log = null
    
  logger = Lazy_Logger 'my test log domain', ( l ) ->
    log "emit log", l
    _log = l
  
  it 'should provide a function', ( done ) ->
    check done, () ->
      expect( logger ).to.be.a( "function" )
      
  it 'have a value of 6', ->
    expect( logger.valueOf() ).to.be 6

  it 'should be > 5', ->
    expect( logger > 5 ).to.be true

  it 'should not be > 6', ->
    expect( logger > 6 ).to.be false

  it 'should return true when invoked at level 3 and not set _log yet', ->
    expect( logger > 3 && logger( 3 ) ).to.be true
    expect( _log ).to.be null

  it 'should succeed when invoked with object with _get_name() method', ->
    expect( logger { _get_name: () -> 'an instance' } ).to.be true
    expect( _log ).to.be null
  
  it 'should succeed when invoked with a method name', ->
    expect( logger 'a_method' ).to.be true
    expect( _log ).to.be null
  
  it 'should succeed when invoked with objects to logger and should emit a log object', ->
    expect( logger(
      { a: 1, b: 2 }
      'a message'
      3
      [ 1, 2, 3 ]
      ( log, position ) ->
        log[ 'from_function_' + position ] = position
    ) ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 3
      _realm         : "my test log domain"
      _name          : "an instance"
      _method        : "a_method"
      a              : 1
      b              : 2
      message_1      : "a message"
      value_2        : 3
      values_3       : [ 1, 2, 3 ]
      from_function_4: 4
    }
  
  it 'should not allow logger to progress at level 6', ->
    expect( logger 6 ).to.be false
    expect( _log ).to.be null
  
  it 'should not allow any log after logger.query_clear()', ->
    logger.query_clear()
    
    expect( logger.valueOf() ).to.be 0
    
  it 'should allow to add query expression using logger.query_add(), setting sup of log level to 4', ->
    logger.query_add [
      {
        flow           : "log"
        _realm         : "my test log domain"
        _level         : 3
        _name          : "an instance"
        _method        : "_add"
      }
    ]
    
    expect( logger.valueOf() ).to.be 4
    
  it 'should ignore query expressions added using logger.query_add() to the wrong flow or realm', ->
    logger.query_add [
      {
        flow           : "not a log"
        _realm         : "my test log domain"
        _level         : 5
        _name          : "an instance"
        _method        : "_add"
      }
      
      {
        flow           : "log"
        _realm         : "not my test log domain"
        _level         : 5
        _name          : "an instance"
        _method        : "_add"
      }
    ]
    
    expect( logger.valueOf() ).to.be 4
    
  it 'should allow to add query expressions using logger.query_add(), setting sup of log level to 5', ->
    logger.query_add [
      {
        _level         : [ "<=", 4 ]
        _name          : "another instance"
        _method        : "_add"
      }
    ]
    
    expect( logger.valueOf() ).to.be 5
    
    logger.query_add [
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
    
    expect( logger.valueOf() ).to.be 5
  
  it 'should not allow logger to progress at level 5', ->
    expect( logger > 5 ).to.be false
  
  it 'should allow logger to progress at level 4', ->
    expect( logger > 4 && logger 4 ).to.be true
  
  it 'should not allow logger to further progress for "that instance"', ->
    expect( logger "that instance" ).to.be false
    expect( _log ).to.be null
  
  it 'should allow logs at level 4 for method "_add" to "another instance"', ->
    expect( logger > 4 && logger 4, "another instance" ).to.be true
    expect( _log ).to.be null
    expect( logger( "_add" ) ).to.be true
    expect( _log ).to.be null
    expect( logger "!! this is a warning" ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 4
      _realm         : "my test log domain"
      _name          : "another instance"
      _method        : "_add"
      message        : "!! this is a warning"
    }
  
  it 'should allow that logger on method _remove for "an instance" at level 4', ->
    expect( logger > 4 && logger 4, "an instance", "_remove", { a: 1 } ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 4
      _realm         : "my test log domain"
      _name          : "an instance"
      _method        : "_remove"
      a              : 1
    }
  
  it 'should allow logger to progress for "another instance" at level 4', ->
    expect( logger > 4 && logger 4, "another instance" ).to.be true
  
  it 'should not allow logger to further progress on method _remove', ->
    expect( logger "_remove" ).to.be false
  
  it 'should allow that logger on method _remove for "another instance" at level 3', ->
    expect( logger > 3 && logger 3, "another instance", "_remove", { a: 1 } ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 3
      _realm         : "my test log domain"
      _name          : "another instance"
      _method        : "_remove"
      a              : 1
    }
  
  it 'should allow logger to progress for "some instance" at level 3', ->
    expect( logger > 3 && logger 3, "some instance" ).to.be true
  
  it 'should not allow logger to further progress with method "_add"', ->
    expect( logger "_add" ).to.be false
  
  it 'should allow a log on method _remove for "some instance" at level 3', ->
    expect( logger > 3 && logger 3, "some instance", "_remove", { a: 1 } ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 3
      _realm         : "my test log domain"
      _name          : "some instance"
      _method        : "_remove"
      a              : 1
    }

  it 'should allow that logger on method _clear for "some instance" at level 2', ->
    expect( logger >= 2 && logger 2, "some instance", "_clear", { a: 1 } ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 2
      _realm         : "my test log domain"
      _name          : "some instance"
      _method        : "_clear"
      a              : 1
    }
    
  it 'should allow that logger on method "_clear" for "some instance" at level 1', ->
    expect( logger > 1 && logger 1, "some instance", "_clear", { a: 1 } ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 1
      _realm         : "my test log domain"
      _name          : "some instance"
      _method        : "_clear"
      a              : 1
    }
    
  it 'should allow to remove a query from a non-log dataflow', ->
    logger.query_remove [
      {
        flow           : "not a log"
        _realm         : "my test log domain"
        _level         : 5
        _name          : "an instance"
        _method        : "_add"
      }
    ]
    
    expect( logger.valueOf() ).to.be 5
  
  it 'should allow to remove the logger query for method "_add" at level <= 4 to "another instance"', ->
    logger.query_remove [
      {
        _level         : [ "<=", 4 ]
        _name          : "another instance"
        _method        : "_add"
      }
    ]
    
    expect( logger > 4 && logger 4 ).to.be true
    expect( logger "another instance" ).to.be false
    
    expect( logger > 3 && logger 3, "another instance" ).to.be true
    expect( logger "_add" ).to.be false
    
    expect( logger > 3 && logger 3, "another instance", "_remove" ).to.be true
    expect( logger "!!! this is an error" ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 3
      _realm         : "my test log domain"
      _name          : "another instance"
      _method        : "_remove"
      message        : "!!! this is an error"
    }
  
  it 'should allow to remove the logger query for method "_add" at level 3 to "an instance"', ->
    logger.query_remove [
      {
        flow           : "log"
        _realm         : "my test log domain"
        _level         : 3
        _name          : "an instance"
        _method        : "_add"
      }
    ]
    
    expect( logger > 4 && logger 4, "an instance", "_add", "Warning" ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 4
      _realm         : "my test log domain"
      _name          : "an instance"
      _method        : "_add"
      message        : "Warning"
    }
  
  it 'should allow to remove the logger query for any method on any instance at level <= 2', ->
    logger.query_remove [
      {
        _level         : [ "<=", 2 ]
      }
    ]
    
    expect( logger > 2 && logger 2, "some instance" ).to.be true
    expect( logger "_add" ).to.be false
    
    expect( logger > 3 && logger 3, "some instance", "_remove", "Error" ).to.be true

    check_log {
      flow           : "log"
      _level         : 3
      _realm         : "my test log domain"
      _name          : "some instance"
      _method        : "_remove"
      message        : "Error"
    }
  
  it 'should allow to remove the logger query for any method on instance "an instance" at level 4', ->
    logger.query_remove [
      {
        _name          : "an instance"
        _level         : 4
      }
    ]

    expect( logger.valueOf() ).to.be 4
    expect( logger > 3 && logger 3, "some instance" ).to.be true
    expect( logger "_add" ).to.be false
    
    expect( logger > 3 && logger 3, "some instance", "_remove" ).to.be true
    
    expect( logger "Another Error" ).to.be true
    
    check_log {
      flow           : "log"
      _level         : 3
      _realm         : "my test log domain"
      _name          : "some instance"
      _method        : "_remove"
      message        : "Another Error"
    }
  
  it 'should allow to remove the last query: method "_remove" at level 3 on any instance', ->
    logger.query_remove [
      {
        _method        : "_remove"
        _level         : 3
      }
      
      # {}
    ]
    
    expect( logger.valueOf() ).to.be 0
    expect( logger > 0 ).to.be false
    expect( logger 1 ).to.be false
