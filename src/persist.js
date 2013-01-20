/*  persist.js

    Copyright (C) 2013, Connected Sets

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

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
    require( './connection.js' )
  } else {
    XS = exports.XS;
  }

  var log        = XS.log
    , subclass   = XS.subclass
    , extend     = XS.extend
    , Connection = XS.Connection
    , Set        = XS.Set
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs proxy, " + m );
  } // ug()

  
  /* --------------------------------------------------------------------------
     .persistor( file_name, options )
     A persistor will submit transactions stored in a file to it'source and
     will after that log new transactions from that source in in the file.
     
     file_name defaults to the source's name.

     When running client side, browser's local storage is used.
     
     options.filter tells the persistor that there is no need to replay stored
     transactions when they don't pass the filter.
          
     options.clear when true means previous transactions are not replayed at
     all.
     
     options.restore when set means the persistor only replays the stored
     transactions but does not log new ones.
     
     options.sync when true means that a file system sync is required after
     each write. Slow. When not set, writes are buffered and sync happens
     every so often, as per OS's policy.
     
     options.callback is a nodejs style callback to call when all stored
     transactions were replayed. Note: transactions replay is always run
     asynchronously.
     
     Note: when using replicators (ie: remote persistors), the need for synced
     writes is reduced because chances that both the source and the replicate
     fail at once are reduced too. This is even more true when multiple
     replicators exist.
     
     Usage:
       a_set.persistor();
       a_set.persisor( null, { local: true } );
       persistor.compact()
  */
  var wrench = null
  if( XS.server ){
    wrench = require( 'wrench' );
  }
  
  function Persistor( source, name, options ) {
    Connection.call( this, options );
    this.name = name || source.name;
    // New persistor depends on it's source and get notified of changes to it
    source.connect( this );
    return this;
  } // Persistor()
  
  Connection.subclass( "persistor", Persistor, {
    
    factory: function( name, options ) {
      var factory = options && options.factory;
      return factory
      ? factory(       this, name, options )
      : new Persistor( this, name, options );
    }
    
  } );

/*
// Read lines in from a file until you hit the end
var f = new wrench.LineReader('x.txt');
while(f.hasNextLine()) {
    util.puts(x.getNextLine());
}
*/
  
  /* --------------------------------------------------------------------------
     module exports
  */

  eval( XS.export_code( 'XS', [ 'Persistor' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // persist.js
