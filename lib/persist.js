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

/*
 *  Prologue
 */
 
var xs;
var l8;
var fs;
  
if( typeof require === "function" ){
  xs = require( "excess/lib/xs.js" ).XS;
  require( "excess/lib/fluid.js" );
  require( "excess/lib/fork.js"  );
  require( "excess/lib/tracer.js"); // debug only
  l8 = require( 'l8/lib/l8.js' );
  fs = require( 'fs' );
  
} else {
  // Client side.... ToDo: local storage? proxied file on server? other?
  xs = exports.XS;
  l8 = exports.l8;
  throw new Error( "No .file() support on the client side, yet" );
}

var log   = xs.log;
var fluid = xs.fluid;

  
/*
    de&&bug()
 */

var de = true;
  
function bug( m ){ log( "xs file, " + m ); }
  
var mand = l8.mand;

  
/* --------------------------------------------------------------------------
   .file( file_name, options )
   A File persistor will submit transactions stored in a file to its source
   and will after that log new transactions from that source in the file.
   
   file_name defaults to the source's name.
   
   options.name overrides the default name based on source's name

   ToDo: When running client side, browser's local storage is used?
     
   ToDo: options.filter tells the persistor that there is no need to replay stored
   transactions when they don't pass the filter.
        
   ToDo: options.clear when true means previous transactions are not replayed at
   all.
     
   ToDo: options.restore when set means the persistor only replays the stored
   transactions but does not log new ones.
     
   ToDo: options.sync when true means that a file system sync is required after
   each write. Slow. When not set, writes are buffered and sync happens
   every so often, as per OS's policy.
     
   ToDo: options.callback is a nodejs style callback to call when all stored
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
     
   xs.file( 'sales' )
     .aggregate( [{id:'sales'}], [{id: 'year'}] )
     .publish( 'sales_by_year' )
     .table( '#sales_by_year' );
       
*/

function File( source, name, options ){
  this.xs_super.call( this, options );
  this.name          = name || this.options.name || source.name;
  // ToDo: reuse unix "r", "w", "a", "a+" etc modes?
  this.mode          = this.options.mode || "append";
  this.truncate      = this.mode === "truncate";
  this.source        = source;
  this.read_buffer_size = this.options.read_buffer_size || (16 * 4 * 1024);
  // The set is in memory, all of it
  this.dataset       = fluid.set( null, { name: "set for File/" + this.name } );
  this.filename      = "xs_" + this.name + ".json";
  this.fd            = null;
  this.state         = "init";
  this.loading       = false;
  this.running       = false;
  this.error         = null;
  this.queue         = l8.queue();
  this.buffer        = "";
  this.version       = 0;
  this.timestamp     = 0;
  this.next_id       = 1;
  this.count_items   = 0;
  this.count_ops     = 0;
  this.count_version = 0;
  this.count_add     = 0;
  this.count_update  = 0;
  this.count_remove  = 0;
  var that           = this;
  // Let's not pretend we are sync, we're async
  l8.nextTick( function(){ that._run(); } );
  // New persistor depends on it's source and get notified of changes to it
  this.set_source( source );
  File.register( this.name, this );
  return this;
}

File.version = "0.0.1";
// Version of file format. SemVer style. http://semver.org/
// 0.0.1
//  file names are xs_xxxxx.json, in current directory
//  text files, utf8 encoding.
//  one item per line, lf separated.
//  items are json objects, JSON syntax, one liner.
//  new file starts if a versionning object:
//    {version: xxx, timestamp: ttt, next_id: iiii }
//    where version is "0.0.1", timestamp is time since Epoch in millisec,
//    next id is integer id of next operation.
//  other items are operations:
//    {id: iiii, timestamp: ttt, name: op, objects: [o1,o2,...] }
//    where iii is a monotone increasing operation id, starting with
//    the value of next_id from the last versionning object, timestamp is
//    the time since Epoch in millisec, name is "add"/"update"/"remove"/"clear"
//    and object is an array of objects with attributes in them.
//  modifified files include a new versionning object followed by operations.
//  all modification are made in "append mode", ie the file is never truncated.
//  some, yet to implement, "compress" solution will deal with files that are
//  to big, ie when ratio operations/items is too small, ie when set is small
//  compared to the number of operations.


// Manage a registry of all files, because there will be one File per filename
File.all = {};
File.lookup     = function( name      ){ return File.all[ name ];        };
File.register   = function( name, obj ){ return File.all[ name ] = obj;  };
File.deregister = function( name      ){        File.all[ name ] = null; };

fluid.datalet.subclass( File, {
    
  factory: function( source, name, options ) {
    // Deal with .file( {...} ) case
    if( name && typeof name !== 'string' ){
      options = name;
      name    = null;
    }
    name = name || (options && options.name) || source.name;
    de&&mand( name );
    var file = this.lookup( name );
    // For existing file, specifying options is illegal and source must be void
    de&&mand( !file || (!options && source.is_void ) );
    return file || new this( source, name, options );
  },
    
  toString: function(){ return "File/" + this.name; },
  
  // JSON encoding, subclasses may change that, ie more compact/fast format
  encode: function( o   ){ return JSON.stringify( o   ); },
  decode: function( str ){ return JSON.parse(     str ); },
  
  add: function( objects ){
    return this._do_it( { name: "add", objects: objects } );
  },
    
  update: function( objects ){
    return this._do_it( { name: "update", objects: objects } );
  },
    
  remove: function( objects ){
    return this._do_it( { name: "remove", objects: objects } );
  },
    
  _do_it: function( action, now ){
    if( this.error ) throw this.error;
    if( action.version ){
      // ToDo: version upgrading process
      // and also timestamp consistency check maybe
      return this;
    }
    // Filter out operations with no objects
    if( !action.objects.length )return this;
    // When called by file._run()
    if( now ){
      this.dataset[ action.name ].call( this.dataset, action.objects );
      // this[ "emit_" + action.name ].call( this.dataset, action.objects );
      // Update counters
      this[ "count_" + action.name ]++;
      this.count_ops++;
      return this;
    }
    // ToDo: when state is "running" I should avoid going thru the queue
    // Note to myself: no I can't, not until I check if fs.write() are queued
    // by node.js
    if( this.state !== "running" ){
      de&&bug( "operation " + action.name + " on " + this + " is queued until file is reloaded" );
    }
    // ToDo: understand why there are too much objects in some cases in smoke test
    de&&mand( action.objects.length <= 2 );
    this.queue.put( action );
    return this;
  }
    
});

var ProtoFile = File.prototype;

ProtoFile.read_line = function(){
// Reads are raw reads, buffered, that need to be split in text lines, \n sep
  var inl = this.buffer.indexOf( "\n" );
  if( inl === -1 )return null;
  //de&&bug( "About to get " + inl + " front chars from buffered '" + this.buffer + "'" );
  var line = this.buffer.substr( 0, inl );
  // ToDo: I should manage a "pos" and avoid this copy
  this.buffer = this.buffer.substr( inl + 1);
  return line;
}; // read_line()

ProtoFile.put = function( obj ){
// Write obj in file, append mode, json format, utf8 encoding. Then call cb.
// private.
  de&&mand( obj );
  // ToDo: understand why there are too much objects in some cases in smoke test
  de&&mand( !obj.name || obj.objects.length <= 2 );
  var json   = this.encode( obj ) + "\n";
  var buffer = new Buffer( json, "utf8" );
  // Help GC
  json = null;
  fs.write(
    this.fd,
    buffer,
    0,              // Position in buffer
    buffer.length,  // amout to write: whole buffer, ie whole line
    null,           // position in file, null means "current", file is "a" mode
    l8.walk
  );
};

ProtoFile._run = function(){
// Load content of file (if any) in a local set, then add set to destination.
// Once this is done, process changes to source, including changes that
// occured while loading previous content (they are queued). Processing
// such changes means adding them to the file (append mode) and to the local
// set.
// private
  
  if( this.state !== "init" ){
    throw new Error( "Cannot load, bad state: " + this.state );
  }
      
  this.state   = "loading";
  this.loading = true;
  var that     = this;
  
  // The work is done by a task, lot of async stuff
  l8.task(function(){
    
    // First, read previous content, open file in read mode
    l8.step(function(){
      that.task = l8.current;
      l8.set( "label", "xs file handler " + that.name );
      if( that.mode === "truncate" )return [ 0, 0 ]; // No err, no fd
      de&&bug( "opening " + that.filename + " to read previous content");
      fs.open(
        that.filename,
        "a+",
        this.walk
      );
    
    // Check for open(,"r",) errors
    }).step(function( e, fd ){ 
      if ( e ){
        de&&bug( "Error after open(,'r'',) on " + that, e );
        // If file does not exists, no problem
        // ToDo: ENOENT is ok
        if( e.code === "ENOENT" ){
          that.state = "loaded";
          return;
        }
        that.state = "error";
        that.error = e;
        throw new Error( "Bad file, cannot open to read, " + this.filename + ", error: " + e );
      }
      that.fd = fd;
      de&&bug( "success of open() on " + that );
    
    // If no error, process each line in file
    }).repeat(function(){
      
      if( that.state !== "loading" ) this.break;
      if( that.truncate            ) this.break;
      
      // Read big buffer of data, to speed things up
      l8.step(function(){
        var buflen = that.read_buffer_size;
        de&&bug( "About to read on " + that );
        fs.read(
          that.fd,               // fd
          new Buffer( buflen ),  // buffer where to put content
          0,                     // position in that buffer
          buflen,                // amount to try to read
          null,                  // position in file: current (auto increased)
          this.walk              // cb, moves to next step
        );
      
      // Process each line from buffered read, unless read error
      }).step(function( err, nread, buffer ){
        de&&bug( "Read done on " + that );
        if( err ){
          that.state = "error";
          that.error = err;
          throw new Error( "error for read() on " + that );
        }
        de&&bug( "Success of read on " + that + ", amount: " + nread );
        // Fill buffer with whatever was read
        if( nread ){ that.buffer += buffer.toString( "utf8", 0, nread ); }
        var line;
        while( line = that.read_line() ){
          var op = that.decode( line );
          // ToDo
          var id = op.id;
          if( id ){
            if( id >= that.next_id ){
              that.next_id = id + 1;
            }else{
              // ToDo: what should I do? file is corrupted probably
              de&&bug( "weird id, too small", id, that.next_id );
            }
          }
          that._do_it( op, true ); // true => now, don't queue
        }
        // When no more to read, close file and notify dependents about content
        if( !that.buffer ){
          // ToDo: err handling for fs.close?
          fs.close( that.fd );
          that.fd = null;
          that.emit_add( that.dataset.get() );
          that.state = "running";
        }
      });
    
    // Wait for add/update/change operations, don't consume the queued thing
    }).step(function(){
      l8.wait( that.queue );
    
    // Reopen file, in append mode (or append/truncate)
    }).step(function(){
      // if we get here it's because some write operation is required
      // ToDo: I should reuse the same fd, that's more efficient
      de&&bug( "reopen for " + that + ", mode: " + (that.truncate ? "w" : "a") );
      fs.open(
        that.filename,
        that.truncate ? "w" : "a",
        this.walk //proceed( function( e, fd ){ return [ e, fd ]; } )
      );
    
    // If ok, add some versionning info into the file
    }).step(function( e, fd ){
      if ( e ){
        that.state = "error";
        that.error = e;
        throw new Error( "Bad file, cannot open to write " + this.name + ", error: " + e );
      }
      that.fd = fd;
      
      // Make sure the file gets closed when task ends
      l8.defer( function(){
        var file = that.fd;
        if( file != fd )return;
        that.fd = null;
        // ToDo: error handling
        fs.close( file );
      });
      
      // Lets write some versioning info and timestamp
      this.version = File.version;
      this.timestamp = l8.timeNow;
      // ToDo: 
      var info = {
        version: this.version,
        count: {
          add:    that.count_add,
          update: that.count_update,
          remove: that.count_remove,
          all:    that.count_ops
        },
        timestamp: this.timestamp,
        id: that.next_id
      };
      that.next_id++;
      that.put( info );
  
    // Make sure version info were properly added to the file
    }).step(function( e, nwrite ){
      if( e ){
        de&&bug( "Error when writing version info on " + that, e );
        that.state = "error";
        that.error = e;
        throw new Error( "Bad file, cannot write version info for " + that + ", error: " + e );
      }
      that.state = "running";
      
    // From now on, if possible, all operations are pushed into the file.
    // Including so far queued operations, first.
    }).repeat(function(){
      
      // If anything goes wrong, exit. ToDo: how to signal the pb?
      if( that.state !== "running" ) this.break;
      var op;
      
      // Wait for next operation from queue
      l8.step(function(){
        that.queue.get();
      
      // Add monotone increasing id and timestamp and put into file
      }).step(function( qop ){ 
        op = qop;
        de&&mand( op );
        op.timestamp = l8.timeNow;
        op.id = that.next_id;
        that.next_id++;
        that.put( op );
      
      // When this is successfully done, update local dataset and dependents
      }).step(function( err, nwrite ){
        if( err ){
          that.state = "error";
          that.error = err;
          throw new Error( "Could not write on " + that + ", errno " + err.code );
        }
        that._do_it( op, true ); // now
        that[ "emit_" + op.name ].call( that, op.objects );
      });

    // ToDo: if message queue is empty, ie no backlog, I should from now on
    // avoid going thru the queue and write directly.
    // Note to myself: no I cannot avoid the queue, write are async, I need
    // to wait until the previous succceed before I can issue a new one,
    // unless nodejs does some internal queueing itself, but that is something
    // to check first.
    }).step( function(){
      
      if( that.queue.empty ){
        // that.state = "walking"
      }
    
    // General failure, something very wrong with the file.
    // ToDo: how to signal that to the app?
    }).failure(function( err ){
      log( "Failure on " + that + ", error: " + err );
      that.error = err;
      that.state = "error";
    });
  });
};


log( "file module loaded" );  
} )( this ); // persist.js
