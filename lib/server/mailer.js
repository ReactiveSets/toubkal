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

module.exports = function( rs, mailer ) {
  var RS     = rs.RS
    , log    = RS.log
    , Greedy = RS.Greedy
    , extend = RS.extend
  ;
  
  if ( RS.Send_Mail ) return; // already initialized
  
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
          - messageId: unique identifier for email
          
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
        
        - options: (Object) optional Greedy attributes, plus:
          - attribute (String): name of attribute of email Object to send
      
      @emits: source attributes plus:
        - error    (Object): no error if falsy, error Object otherwise
        - response (Object): nodemailer response
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
      
      .debug( de, 'nodemailer configuration' )
    ;
    
    that._add_input( configuration, Greedy.Input, 'nodemailer_configuration', {
      _add: function( values ) {
        configure( values );
      },
      
      _remove: function() {},
      
      _update: function( updates ) {
        configure(
          updates.map(
            function( update ) { return update[ 1 ] }
          )
        );
      }
    } );
    
    function configure( values ) {
      var length = values && values.length;
      
      if ( length ) {
        if ( that.transport ) that.transport.close();
        
        var configuration = values[ length - 1 ] // take the last known configuration
          , transport = configuration.transport || 'SMTP'
          , options   = configuration.transport_options
        ;
        
        de&&ug( 'nodemailer transport configuration:', configuration, 'waiting emails fifo:', fifo );
        
        switch( transport ) {
          case 'sendmail':
            transport = require( 'nodemailer-sendmail-transport' )( options );
            
            options = null;
          break;
          
          case 'SMTP':
            transport = options;
            
            options = null;
          break;
        }
        
        that.transport = mailer.createTransport( transport, options );
        
        while( fifo.length ) that._add( fifo.shift() );
      }
    } // configure()
  } // Send_Mail()

  Greedy.Build( 'send_mail', Send_Mail, {
    _add: function( emails, options ) {
      var that      = this
        , attribute = that._options.attribute
        , transport = that.transport
        , l         = emails.length
        , out       = []
      ;
      
      if ( transport ) {
        emails.forEach( send_email );
      } else {
        log( 'Waiting for transport, email emission delayed:', emails );
        
        that.fifo.push( emails );
      }
      
      function send_email( email ) {
        transport.sendMail( ( attribute ? email[ attribute ] : email ), function( error, response ) {
          error && log( 'error:', error );
          
          out.push( extend( { error: error, response: response }, email ) );
          
          // ToDo: send errors to global error dataflow
          
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
}; // mailer.js
