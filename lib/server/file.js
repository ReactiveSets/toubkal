/*  file.js
    
    ----
    
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
  var fs     = require( 'fs' )
    
    , XS     = require( '../pipelet.js' ).XS
    , xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Set        = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs file, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Watch( options )
  */
  function Watch( options ) {
    Set.call( this, extend( {}, options, { key: [ 'name' ] } ) );
    
    return this;
  } // Watch()
  
  /* -------------------------------------------------------------------------------------------
     xs.set( [
         { name: 'index.html'   },
         { name: 'contact.html' }
       ] )
       .watch()
     ;
  */
  Set.build( 'watch', Watch, {
    add: function( files ) {
      var that = this
        , added = []
      ;
      
      for ( var i = -1, l = files.length, count = l; ++i < l; ) {
        add_file( extend( {}, files[ i ] ) );
      }
      
      return this;
      
      function add_file( file ) {
        var u, filename = './' + file.name;
        
        // ToDo: stat file first to check for size, do not read big files. Provide option to specify max read size
        // ToDo: store file time info from stat
        fs.readFile( filename, 'utf8', function( error, content ) {
          if ( error ) {
            log( 'watch(), unable to read fle "' + filename + '", error: ' + log.s( error ) );
          } else {
            file.content = content;
            
            de&&ug( 'watch(), read file "' + filename + '", length: ' + content.length );
            
            var watcher = file.watcher = fs.watch( filename );
            
            added.push( file );
            
            var read_timeout;
            
            watcher.on( 'change', function( event ) {
              de&&ug( 'watch(), file "' + filename + '" changed, event: ' + log.s( event ) );
              
              // Multiple change events could be triggered, e.g. one to truncate file, one or more to append to it
              // and maybe another one for meta data changes on the file.
              // Check https://github.com/joyent/node/issues/2126 for more info on this.
              
              // To prevent reading more than once the same file, we wait 100 ms before attempting to read the file 
              read_timeout && clearTimeout( read_timeout );
              
              read_timeout = setTimeout( function() { fs.readFile( filename, 'utf8', function( error, content ) {
                if ( error ) {
                  de&&ug( 'watch(): no longer able to read fle "' + filename + '", content: ' + content + ', error: ' + log.s( error ) );
                  
                  return Set.prototype.remove.call( that, [ file ] );
                }
                
                if ( content != file.content ) {
                  var v = extend( {}, file );
                  
                  v.content = content;
                  
                  de&&ug( 'watch(), read file "' + filename + '", length: ' + content.length );
                  
                  Set.prototype.update.call( that, [ [ file, v ] ] );
                  
                  file = v;
                } else {
                  de&&ug( 'watch(), file "' + filename + '", same content => no update' );
                }
              } ) }, 100 );
            } );
          }
          
          if ( --count ) return;
          
          added.length && Set.prototype.add.call( that, added );
        } );
      }
    }, // add()
    
    remove: function( files ) {
      for ( var u, i = -1, l = files.length, removed = []; ++i < l; ) {
        var file = files[ i ], p = this.index_of( file );
        
        if ( p === -1 ) continue;
        
        removed.push( file = this.a[ p ] );
        
        if ( file.watcher ) file.watcher.close();
      }
      
      removed.length && Set.prototype.remove.call( this, removed );
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      var l = updates.length;
      
      if ( l ) {
        var adds = [], removes = [];
        
        for ( var i = -1; ++i < l; ) {
          var update = updates[ i ];
          
          removes.push( update[ 0 ] );
          adds   .push( update[ 1 ] );
        }
        
        this.remove( removes );
        this.add   ( adds   );
      }
      
      return this;
    } // update()
  } ); // Watch instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Watch' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // file.js
