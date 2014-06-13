###
    xs_form.coffee

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
# ----------------------------------------------------------------------------------------------

Browser = require( 'zombie' )
utils   = require( './tests_utils.js' )

browser = new Browser( { silent: true } )
expect  = this.expect || utils.expect
check   = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# xs Form() unit test suite
# ----------------------------------------------------------------------------------------------

describe 'Form() Test Suite', ->
  before ( done ) ->
    browser.visit 'http://localhost:8080/test/xs_form.html', done
  
  it 'body element should have a "form" element', ->
    expect( browser.queryAll( 'form' ).length ).to.be 1
  
  it 'form should have a hidden field with name="flow" and value="user_profile"', ->
    field = browser.field( 'input[name="flow"]' )
    
    expect( field       ).to.not.be undefined
    expect( field.type  ).to.be 'hidden'
    expect( field.name  ).to.be 'flow'
    expect( field.value ).to.be 'user_profile'
  
  it 'form should have a hidden field with name="id"', ->
    field = browser.field( 'input[name="id"]' )
    
    expect( field      ).to.not.be undefined
    expect( field.type ).to.be 'hidden'
    expect( field.name ).to.be 'id'
  
  it 'form should have a field with name="name", type="text"', ->
    field = browser.field( 'input[name="name"]' )
    
    expect( field      ).to.not.be undefined
    expect( field.type ).to.be 'text'
    expect( field.name ).to.be 'name'
  
  it 'form should have a textarea with name="address", cols="30" and rows="5"', ->
    field = browser.field( 'textarea' )
    
    expect( field      ).to.not.be undefined
    expect( field.name ).to.be 'address'
    expect( field.cols ).to.be 30
    expect( field.rows ).to.be 5
  
  it 'form should have a disabled button with name="form_submit" and value="OK"', ->
    field = browser.button( 'input[type="submit"]' )
    
    expect( field          ).to.not.be undefined
    expect( field.disabled ).to.be true
    expect( field.name     ).to.be 'form_submit'
    expect( field.value    ).to.be 'OK'
  
