/*  mailer.js

    ----

    Copyright (c) 2013-2016, Reactive Sets

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
*/
"use strict";

var rs     = require( '../core/filter.js' )
  , mailer = require( 'nodemailer' )
  , RS     = rs.RS
  , log    = RS.log
  , Greedy = RS.Greedy
;

require( './file.js' );

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log.bind( null, 'mailer' );

/* -------------------------------------------------------------------------------------------
    @pipelet send_mail( configuration, options )
    
    @short send emails
    
    @description:
      Send emails using npm module nodemailer (http://www.nodemailer.com/). The source dataflow
      contains emails to send with the following attributes, for more information, and more
      options, check nodemailer's documentation:
        - from: The e-mail address of the sender. All e-mail addresses can be plain
            sender@server.com or formatted Sender Name <sender@server.com>
        - to: Comma separated list or an array of recipients e-mail addresses that will appear
            on the To: field
        - cc: Comma separated list or an array of recipients e-mail addresses that will appear
            on the Cc: field
        - bcc: Comma separated list or an array of recipients e-mail addresses that will appear
            on the Bcc: field
        - subject: The subject of the e-mail
        - text: The plaintext version of the message
        - html: The HTML version of the message
      
      This is an add-only greedy stateless pipelet.
    
    @parameters:
      - configuration: (Pipelet) configuration options for nodemailer. Attributes are:
        - transport: (String) defaults to 'SMTP', other valid transports are:
           - 'SES' for Amazon Simple Email Service
           - 'Sendmail'
        - transport_options: (Object) as defined in nodemailer's documentation, e.g. for
            SMTP:
              - service: e.g. "Gmail"
              - auth: (Object):
                - user: user's gmail address
                - pass: user's password
                 
      - options: (Object) optional attributes
*/
function Send_Mail( configuration, options ) {
  var that = this
    , fifo = []
  ;
  
  Greedy.call( that, options );
  
  that.transport = null;
  that.fifo = fifo;
  
  // ToDo: use greedy input for configuration
  configuration = configuration
    .filter( [ { module: 'nodemailer' } ] )
    
    .trace( 'nodemailer configuration' )
  ;
  
  that._add_input( configuration, Greedy.Input, 'nodemailer_configuration', {
    _add: function( values ) {
      configure( values );
    },
    
    _remove: function() {},
    
    _update: function( updates ) {
      configure( [ updates[ 0 ][ 1 ] ] );
    }
  } );
  
  function configure( values ) {
    if ( ! ( values && values.length ) ) return;
    
    var configuration = values[ 0 ];
    
    log( 'nodemailer transport configuration:', configuration, 'fifo:', fifo );
    
    if ( that.transport ) that.transport.close();
    
    that.transport = mailer.createTransport( configuration.transport || 'SMTP', configuration.transport_options );
    
    while( fifo.length ) that._add( fifo.shift() ); 
  }
} // Send_Mail()

Greedy.Build( 'send_mail', Send_Mail, {
  _add: function( emails, options ) {
    var that      = this
      , transport = that.transport
    ;
    
    if ( ! transport ) {
      log( 'Waiting for transport, email emission delayed:', emails );
      
      that.fifo.push( emails );
      
      return that;
    }
    
    var l     = emails.length
      , count = l
      , out   = []
    ;
    
    emails.forEach( send_email );
    
    return this;
    
    function send_email( email ) {
      transport.sendMail( email, function( error, response ) {
        var id = email.messageId;
        
        if ( error ) {
          // ToDo: send to global error dataflow
          out.push( { flow: 'email_send_error', id: id, error: '' + error } );
        } else {
          out.push( { flow: 'sent_email', id: id } );
        }
        
        --l || that.__emit_add( out, options )
      } );
    } // send_email()
  } // _add()
} ); // Send_Mail instance methods

/* --------------------------------------------------------------------------
   module exports
*/
RS.add_exports( { 'Send_Mail': Send_Mail } );

de&&ug( "module loaded" );

// mailer.js
