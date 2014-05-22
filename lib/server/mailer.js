/*  mailer.js

    ----

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
*/

"use strict";

var XS = require( '../xs.js' ).XS
  , xs = XS.xs
  , extend = XS.extend
  , log = XS.log
  , Pipelet = XS.Pipelet
;

require( './file.js' );
require( '../filter.js' );

var mailer = require( 'nodemailer' );

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true;

function ug( m ) {
  log( "xs mailer, " + m );
} // ug()

/* -------------------------------------------------------------------------------------------
   source.send_mail( configuration, [ options ] )
   
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
   
   Parameters:
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
                
     - options: (Object) optional attributes:
*/
function Send_Mail( configuration, options ) {
  var that = this;
  
  configuration
    .filter( [ { module: 'nodemailer' } ] )
    
    .trace( 'nodemailer configuration' )
    
    // ToDo: use Input to update configuration changes instead of _on() + _fetch()
    ._on( 'change', function( operation, values, options ) {
      switch( operation ) {
        case 'add': configure( values ); break;
        
        // ignore removes, and clear
        
        case 'udpate': configure( [ updates[ 0 ][ 1 ] ] ); break;
      }
    } )
    
    ._output._fetch_all( configure )
  ;
  
  this.fifo = [];
  
  return Pipelet.call( this, options );
  
  function configure( values ) {
    if ( ! ( values && values.length ) ) return;
    
    var configuration = values[ 0 ];
    
    de&&ug( 'nodemailer transport configuration: ' + log.s( configuration ) );
    
    if ( that.transport ) that.transport.close();
    
    that.transport = mailer.createTransport( configuration.transport || 'SMTP', configuration.transport_options );
    
    var l = that.fifo.length;
    
    while( l ) that.add( fifo.shift() ); 
  }
} // Send_Mail()

Pipelet.Build( 'send_mail', Send_Mail, {
  add: function( emails, options ) {
    var transport = this.transport;
    
    if ( ! transport ) {
      this.fifo.push( emails );
      
      return this;
    }
    
    var l = emails.length, count = l, out = [], that = this;
    
    for ( var i = -1; ++i < l; ) send( emails[ i ] );
    
    return this;
    
    function send( email ) {
      var id = email.messageId;
      
      transport.sendMail( email, function( error, response ) {
        if ( error ) {
          out.push( { flow: 'email_send_error', id: id, error: '' + error } );
        } else {
          out.push( { flow: 'sent_email', id: id } );
        }
        
        if ( --l ) return;
        
        that.__emit_add( out, options )
      } );
    } // send()
  } // add()
} ); // Send_Mail instance methods

/* --------------------------------------------------------------------------
   module exports
*/
eval( XS.export_code( 'XS', [ 'Send_Mail' ] ) );

de&&ug( "module loaded" );

// mailer.js
