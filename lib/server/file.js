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
    , path   = require( 'path' )
    
    , XS     = require( '../pipelet.js' ).XS
    , xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , Set        = XS.Set
    
    , win32      = ( process.platform == 'win32' )
    , home       = process.env[ win32 ? 'USERPROFILE' : 'HOME']
  ;
  
  require( '../json.js' );
  require( '../attribute_x_value.js' );
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs file, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     source.watch( options )
     
     Watches the content of a source dataflow of files.
     
     The source must describe files, using a "name" attribute. If the name does not start with
     '.' or '~', the nane is prepended with './' to read from the current directory.
     
     If the name starts with '~', this character is replaced by the home path, as determined by
     the environement variable "USERPROFILE" on win32 and "HOME" for other platforms.
     
     Options:
       - base_directory: (string) the name of the base directory for all files
     
     Example:
       xs.set( [
           { name: 'index.html'   },
           { name: 'contact.html' }
         ] )
         .watch()
       ;
       
     ToDo: tests for watch()
  */
  function Watch( options ) {
    Set.call( this, extend( {}, options, { key: [ 'name' ] } ) );
    
    return this;
  } // Watch()
  
  Set.build( 'watch', Watch, {
    add: function( files ) {
      var that = this
        , added = []
        , base = this.options.base_directory
      ;
      
      if ( base ) {
        base += '/';
      } else {
        base = './';
      }
      
      for ( var i = -1, l = files.length, count = l; ++i < l; ) {
        add_file( extend( {}, files[ i ] ) );
      }
      
      return this;
      
      function add_file( file ) {
        var u, filename = file.name, v, previous, encoding = file.encoding;
        
        switch( file.name.charAt( 0 ) ) {
          case '~':
            filename = home + filename.substr( 1 );
          break;
          
          case '/':
          break;
          
          default:
            if ( win32 && filename.indexOf( ':' ) !== -1 ) break;
            
            filename = base + filename
        }
        
        if ( encoding === u ) {
          var extension = path.extname( filename ).substr( 1 );
          
          if ( [ 'png', 'jpg', 'jpeg', 'gif', 'ico' ].indexOf( extension ) == -1 ) {
            encoding = 'utf8';
          }
          
          de&&ug( 'watch(), filename: ' + filename + ', extension: ' + extension + ', encoding: ' + encoding );
        }
        
        // ToDo: watch files base directories instead of files to allow for non-existant or deleted files
        // ToDo: stat file first to check for size, do not read big files. Provide option to specify max read size
        // ToDo: store file time info from stat
        fs.readFile( filename, encoding, function( error, content ) {
          if ( error ) {
            log( 'watch(), unable to read file "' + filename + '", error: ' + log.s( error ) );
          } else {
            added.push( previous = v = extend( {}, file ) );
            
            v.content = content;
            
            de&&ug( 'watch(), read file "' + filename + '", length: ' + content.length + ', encoding: ' + encoding );
            
            var watcher = v.watcher = fs.watch( filename );
            
            var read_timeout;
            
            watcher.on( 'change', function( event ) {
              de&&ug( 'watch(), file "' + filename + '" changed, event: ' + log.s( event ) );
              
              // Multiple change events could be triggered, e.g. one to truncate file, one or more to append to it
              // and maybe another one for meta data changes on the file.
              // Check https://github.com/joyent/node/issues/2126 for more info on this.
              
              // To prevent reading more than once the same file, we wait 100 ms before attempting to read the file 
              read_timeout && clearTimeout( read_timeout );
              
              read_timeout = setTimeout( function() { fs.readFile( filename, encoding, function( error, content ) {
                if ( error ) {
                  de&&ug( 'watch(): no longer able to read fle "' + filename + '", content: ' + content + ', error: ' + log.s( error ) );
                  
                  return Set.prototype.remove.call( that, [ previous ] );
                }
                
                if ( content != previous.content ) {
                  v = extend( {}, file );
                  
                  v.content = content;
                  
                  de&&ug( 'watch(), read file "' + filename + '", length: ' + content.length );
                  
                  Set.prototype.update.call( that, [ [ previous, v ] ] );
                  
                  previous = v;
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
  
  /* -------------------------------------------------------------------------------------------
     configuration( [ options ] )
     
     Read (-only for now) a JSON configuration file and emits a dataflow of changes on that file
     .
     
     Parameters:
       - options: (Object) optional attributes:
         - flow: (String) configuration dataflow name
         - filename: (String) the name of the configuration file to read, defaults to
                     ~/config.xs.json
     
     ToDo: tests for configuration()
  */
  var configurations = [];
  
  XS.Compose( 'configuration', function( source, options ) {
    options = extend( {
      flow: 'configuration', filename: '~/config.xs.json'
    }, options );
    
    var filename = options.filename
      , flow     = options.flow
      , configuration
    ;
    
    for ( var i = -1, config; config = configurations[ ++i ]; ) {
      if ( config.filename == filename ) return config.pipelet;
    }
    
    var input = source.flow( flow );
    
    // ToDo: allow writing configuration file
    input
      .value_to_attribute()
      .json_stringify()
      .alter( function( v ) {
        v.flow = flow
        v.name = filename;
        
        return v;
      } )
      .trace( 'to configuration file: ' + filename )
      //.file_write( filename )
    ;
    
    var output = xs
      .set( [ { name: filename } ] )
      .watch()
      .json_parse()
      .attribute_to_value()
      .set_flow( flow )
      .trace( 'parsed configuration file: ' + filename )
    ;
    
    var that = xs.encapsulate( input, output );
    
    configurations.push( { filename: filename, pipelet: that } );
    
    return that;
  } ); // configuration()
  
  /* -------------------------------------------------------------------------------------------
     source.require_resolve()
     
     Resolve node_module file names and make uri for uglify() source map and
     http_server serve().
     
     ToDo: add tests
  */
  XS.Compose( 'require_resolve', function( source, options ) {
    return source
      .alter( function( file ) {
        var name = file.name;
        
        file.name = require.resolve( name );
        
        file.uri = '/node_modules/' + name;
        
        de&&ug( 'require_resolve(), absolute file name: ' + log.s( file ) + ', uri path:' + file.uri );
      } )
    ;
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Watch' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // file.js
