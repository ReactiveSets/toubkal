/*  persist.js

      .file( [filename] )

    2013/01/20, by JHR

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
    require( './proxy.js' )
  } else {
    XS = exports.XS;
  }

  var log = XS.log
    , xs  = XS.xs
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs proxy, " + m );
  } // ug()

  
  /* --------------------------------------------------------------------------
     .file( file_name, options )
     A File persistor will submit transactions stored in a file to its source
     and will after that log new transactions from that source in the file.
     
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
     
     xs.file( 'sales' )
     .publish( sa )
     .aggregates( s, by )
     .publish( 'sales_by_year', sbya );
     
     xs
     .file( 'sales' )
     .aggregate( [{id:'sales'}], [{id: 'year'}] )
     .publish( 'sales_by_year' )
     .table( '#sales_by_year' );
       
  */
  var fs = require( 'fs' );
  var l8 = XS.l8;
  
  function File( source, name, options ) {
    xs.pipelet.call( this, options );
    this.name = name || source.name;
    this.source  = source;
    this.set     = xs.set();
    this.file    = null;
    this.state   = "init";
    this.loading = false;
    this.running = false;
    this.error   = null;
    this.queue   = l8.queue();
    this.buffer  = "";
    var that     = this;
    XS.l8.nextTick( function(){ that.load(); } );
    // New persistor depends on it's source and get notified of changes to it
    this.set_source( source );
    return this;
  } // File()
  
  File.all = {};
  File.lookup     = function( name      ){ return File.all[ name ]; };
  File.register   = function( name, obj ){ return File.all[ name ] = obj; };
  File.deregister = function( name      ){ File.all[ name ] = null; };
  
  xs.pipelet.subclass( "file", File, {
    
    factory: function( name, options ) {
      var file = File.lookup( name );
      return file || new File( this, name, options );
    },
    
    toString: function(){ return "File/" + this.name; },
    
    load: function() {
      if( this.state !== "init" ){
        throw new Error( "Cannot load, bad state: " + this.state );
      }
      this.state   = "loading";
      this.loading = true;
      var that = this;
      l8.task( function(){
        // ToDo: https://github.com/Gagle/Node-BufferedReader/wiki/Reference
        l8.step( function(){ 
          that.task = l8.current;
          fs.open( that.name, "r", that.walk );
        } )
        .step( function( e, f ) { 
          if ( e ){
            that.state = "error";
            that.error = e;
            throw new Error( "Bad file, cannot open, " + this.name + ", error: " + e );
          }
          that.file = f; 
        } )
        .repeat( function(){
          l8.step( function(){ that.file.readFile(); } );
          l8.step( function( data ){
            this.buffer += data;
            var line;
            while( line = this.read_line() ){
              var op = JSON.parse( line );
              this.do( op, true ); // true => now, don't queue
            }
            if( !that.buffer ){
              that.file.close();
              that.file = null;
              this.notify( [ {action:"add", objects: that.set.get() } ] );
              this.break;
            }
          } );
        } )
        .step( function() { l8.wait( that.queue ); } )
        .step( function() {
          // if we get here it's because some write operation is required
          fs.open( that.name, "a", this.walk );
        })
        .step( function( e, f ) {
          if ( e ){
            that.state = "error";
            that.error = e;
            throw new Error( "Bad file, cannot open, " + this.name + ", error: " + e );
          }
          that.file = f; 
        } )
        .repeat( function(){
          this.state = "running";
          var op;
          this.repeat( function (){
            this.step( function(){ return that.queue.get() })
            .step(     function( op ) { if( !op ) this.break; } )
            .step( function(){
              var json = JSON.stringify( op );
              l8.step( function(){ that.file.write( json, this.walk ); } )
              .step( function(){ xs.set.xsclass.notify( [op] ); } );
            } );
          } );
        })
        .failure( function( err ) {
          log( "Failure on " + that + ", error: " + err );
          that.error = err;
          that.state = "error";
        } );
      } );
    },
    
    read_line: function(){
      var inl = this.buffer.indexOf( "\n" );
      if( inl === -1 )return null;
      var line = this.buffer.substr( 0, inl - 1 );
      this.buffer = this.buffer.substr( inl + 1);
      return line;
    },
    
    add: function( objects ){
      return this.do( { action: "add", objects: objects } );
    },
    
    update: function( objects ){
      return this.do( { action: "update", objects: objects } );
    },
    
    remove: function( objects ){
      return this.do( { action: "remove", objects: objects } );
    },
    
    do: function( action, now ){
      if( this.error ) throw new Error( "" + this + " is not running, " + this.state + ". Cannot do action: " + action.action );
      if( now ){
        this.set[ action.action ].call( this.set, action.objects );
        return this;
      }
      this.queue.put( action );
      return this;
    }
    
  } );


  /* --------------------------------------------------------------------------
     module exports
  */

  eval( XS.export_code( 'XS', [ 'File' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // persist.js
