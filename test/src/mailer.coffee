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

transport        = null
closed_transport = null
sent_emails      = []

require '../../lib/server/file'

createTransport = ( _transport, options ) ->
  transport = {
    transport: _transport
    options: options
  }
  
  {
    sendMail: ( email, callback ) ->
      if email.error
        callback( email.error )
      else
        sent_emails.push( email )
        
        callback()
    
    close: () ->
      closed_transport = transport
  }

require( '../../lib/server/mailer' )(
  rs
  
  { # nodemailer emulator
    createTransport: createTransport
  }
)

# ----------------------------------------------------------------------------------------------
# Test File pipelets
# ------------------

describe 'send_mail():', ->
  emails = null
  configuration = null
  sent_emails_set = null
  _transport = null
  
  it 'should be initialized without a transport', ->
    emails = rs.pass_through()
    
    configuration = rs.set []
    
    sent_emails_set = emails
      .send_mail( configuration )
      .set []
    
    expect( transport ).to.be null
  
  it 'should delay emission of emails until transport is added', ->
    emails._add [
      { messageId: 1 }
      { messageId: 2 }
    ]
    
    expect( sent_emails ).to.be.eql []
  
  it 'should have emitted no email', ( done ) ->
    sent_emails_set._fetch_all ( emails ) ->
      check done, () ->
        expect( emails ).to.be.eql []
  
  it 'should intialize a transport', ->
    _transport = {
      id: 1
      module: 'nodemailer'
      transport: 'Sendmail'
      transport_options: {
        dont_send: true
      }
    }
    
    configuration._add [ _transport ]
    
    expect( transport ).to.be.eql {
      transport: 'Sendmail'
      options: _transport.transport_options
    }
  
  it 'should have sent delayed emails', ->
    expect( sent_emails ).to.be.eql [
      { messageId: 1 }
      { messageId: 2 }
    ]
  
  it 'should have emitted emails', ( done ) ->
    sent_emails_set._fetch_all ( emails ) ->
      check done, () ->
        expect( emails ).to.be.eql [
          { error: undefined, response: undefined, messageId: 1 }
          { error: undefined, response: undefined, messageId: 2 }
        ]
  
  it 'should allow to update transport to default SMTP', ->
    configuration._update [ [ _transport, {
      id: 1
      module: 'nodemailer'
      transport_options: { password: '*' }
    } ] ]
    
    expect( transport ).to.be.eql {
      transport: { password: '*' }
      options: null
    }
  
  it 'should have closed previous transport', ->
    expect( closed_transport ).to.be.eql {
      transport: 'Sendmail'
      options: { dont_send: true }
    }
    
    closed_transport = null
  
  it 'should allow to emit additional emails and have one fail', ->
    emails._add [
      { messageId: 3 }
      { messageId: 4 }
      { messageId: 5, error: "fail" }
      { messageId: 6 }
    ]
    
    expect( sent_emails ).to.be.eql [
      { messageId: 1 }
      { messageId: 2 }
      { messageId: 3 }
      { messageId: 4 }
      { messageId: 6 }
    ]
  
  it 'should have emitted two additonal emails and one error', ( done ) ->
    sent_emails_set._fetch_all ( emails ) ->
      check done, () ->
        expect( emails ).to.be.eql [
          { error: undefined, response: undefined, messageId: 1 }
          { error: undefined, response: undefined, messageId: 2 }
          { error: undefined, response: undefined, messageId: 3 }
          { error: undefined, response: undefined, messageId: 4 }
          { error: 'fail'   , response: undefined, messageId: 5 }
          { error: undefined, response: undefined, messageId: 6 }
        ]
