/*  file.js
    
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

( function( exports ) {
  var fs     = require( 'fs' )
    , path   = require( 'path' )
    
    , XS     = require( '../pipelet.js' ).XS
    , xs         = XS.xs
    , log        = XS.log
    , extend     = XS.extend
    , extend_2   = XS.extend_2
    , Pipelet    = XS.Pipelet
    , Set        = XS.Set
    
    , win32      = ( process.platform == 'win32' )
    , HOME       = process.env[ win32 ? 'USERPROFILE' : 'HOME']
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
     source.file_set( options )
     
     Base pipelet for watch() and watch_directory()
  */
  function File_Set( options ) {
    options = Set.call( this, extend_2( { key: [ 'path' ] }, options ) )._options;
    
    var base = options.base_directory;
    
    if ( base ) {
      base += '/';
    } else {
      base = '';
    }
    
    this._base_directory = base;
    
    return this;
  } // File_Set()
  
  Set.Build( 'file_set', File_Set, function( Super ) {
    return {
      _get_path: function( name ) {
        switch( name.charAt( 0 ) ) {
          case '~':
            name = HOME + name.substr( 1 );
          break;
          
          case '/':
          case '.':
          break;
          
          default:
            if ( win32 && name.indexOf( ':' ) !== -1 ) break;
            
            name = this._base_directory + name
        }
        
        return name;
      } // _get_path()
    }
  } ); // File_Set instance attributes
  
  /* -------------------------------------------------------------------------------------------
     source.watch( options )
     
     Watches the content of a source dataflow of files.
     
     The source must describe files, using a "name" attribute. If the name does not start with
     '.' or '~', the nane is prepended with './' to read from the current directory.
     
     If the path starts with '~', this character is replaced by the HOME path, as determined by
     the environement variable "USERPROFILE" on win32 and "HOME" for other platforms.
     
     Options:
       - base_directory: (string) the path of the base directory for all files
     
     Example:
       xs.set( [
           { path: 'index.html'   },
           { path: 'contact.html' }
         ] )
         .watch()
       ;
       
     ToDo: tests for watch()
  */
  function Watch( options ) {
    return File_Set.call( this, options );
  } // Watch()
  
  File_Set.Build( 'watch', Watch, function( Super ) { return {
    _add: function( files ) {
      var that = this
        , added = []
        , i = -1
        , file
        , count = files.length
      ;
      
      while ( file = files[ ++i ] ) add_file( extend_2( {}, file ) );
      
      return this;
      
      function add_file( file ) {
        var _, filepath = that._get_path( file.path ), v, previous, encoding = file.encoding;
        
        if ( encoding === _ ) {
          var extension = path.extname( filepath ).substr( 1 );
          
          // ToDo: manage more default encodings on file extension
          if ( [ 'png', 'jpg', 'jpeg', 'gif', 'ico', 'eot', 'ttf', 'woff' ].indexOf( extension ) == -1 ) {
            encoding = 'utf8';
          }
          
          de&&ug( 'watch(), filepath: ' + filepath + ', extension: ' + extension + ', encoding: ' + encoding );
        }
        
        // ToDo: do not read big files. Provide option to specify max read size
        fs.readFile( filepath, encoding, function( error, content ) {
          if ( error ) {
            log( 'watch(), unable to read file "' + filepath + '", error: ' + log.s( error ) );
          } else {
            added.push( previous = v = extend_2( {}, file ) );
            
            v.content = content;
            
            de&&ug( 'watch(), read file "' + filepath + '", length: ' + content.length + ', encoding: ' + encoding );
            
            var watcher = v.watcher = fs.watch( filepath );
            
            var read_timeout;
            
            watcher.on( 'change', function( event ) {
              de&&ug( 'watch(), file "' + filepath + '" changed, event: ' + log.s( event ) );
              
              // Multiple change events could be triggered, e.g. one to truncate file, one or more to append to it
              // and maybe another one for meta data changes on the file.
              // Check https://github.com/joyent/node/issues/2126 for more info on this.
              
              // To prevent reading more than once the same file, we wait 100 ms before attempting to read the file 
              read_timeout && clearTimeout( read_timeout );
              
              read_timeout = setTimeout( function() { fs.readFile( filepath, encoding, function( error, content ) {
                if ( error ) {
                  de&&ug( 'watch(): no longer able to read fle "' + filepath + '", content: ' + content + ', error: ' + log.s( error ) );
                  
                  return Super._remove.call( that, [ previous ] );
                }
                
                if ( content != previous.content ) {
                  v = extend_2( {}, file );
                  
                  v.content = content;
                  
                  de&&ug( 'watch(), read file "' + filepath + '", length: ' + content.length );
                  
                  Super._update.call( that, [ [ previous, v ] ] );
                  
                  previous = v;
                } else {
                  de&&ug( 'watch(), file "' + filepath + '", same content => no update' );
                }
              } ) }, 100 );
            } );
          }
          
          if ( --count ) return;
          
          added.length && Super._add.call( that, added );
        } );
      }
    }, // _add()
    
    _remove: function( files ) {
      for ( var i = -1, l = files.length, removed = []; ++i < l; ) {
        var file = files[ i ], p = this.index_of( file );
        
        if ( p === -1 ) continue;
        
        removed.push( file = this.a[ p ] );
        
        if ( file.watcher ) file.watcher.close();
      }
      
      removed.length && Super._remove.call( this, removed );
      
      return this;
    } // _remove()
  }; } ); // Watch instance methods
  
  /* -------------------------------------------------------------------------------------------
     source.watch_directories( options )
     
     Watches directories provided by source and emits directory entries that may be files or
     directories.
     
     Source dataflow must provide a 'path' attribute for the directory absolute or relative
     path.
     
     The destination dataflow contains the following attributes:
       - path (string): file path
       - depth (integer): recursion depth calculated as: ( source.depth || 0 ) + 1. It can
         be used to control the recursion depth using a filter() pipelet.
     
     This pipelet relies on Node fs.watch() which has some limitations documented here:
       http://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener
       
     Options:
       - base_directory: (string) the path of the base directory for all directories
  */
  function Watch_Directories( options ) {
    File_Set.call( this, options );
    
    this._directories = {};
    
    return this;
  } // Watch_Directories()
  
  File_Set.Build( 'watch_directories', Watch_Directories, function( Super ) {
    return {
      _add: function( directories, options ) {
        var that = this
          , name = de && this._get_name( '_add' )
          , _directories = this._directories
          , adds = [], removes = []
          , count = directories.length
        ;
        
        de&&ug( name + 'directories: ' + log.s( directories ) );
        
        directories.forEach( add_directory );
        
        return this;
        
        function done() {
          var rl = removes.length
            , al = adds.length
            , l = ( rl && 1 ) + ( al && 1 )
            , _
          ;
          
          de&&ug( name + 'done(), l: ' + l );
          
          l && that._transaction( l, options, function( t, l ) {
            if ( rl ) {
              Super._remove.call( that, removes, t.next().get_emit_options() );
              
              removes = [];
            }
            
            if ( al ) {
              Super._add   .call( that, adds   , t.next().get_emit_options() );
              
              adds = [];
            }
          } );
          
          options = _;
        } // done()
        
        function add_directory( directory ) {
          var path    = that._get_path( directory.path )
            , watcher = fs.watch( path )
            , depth = ( directory.depth || 0 ) + 1
            , previous_entries = {}
            , d = _directories[ path ]
          ;
          
          if ( d ) {
            de&&ug( name + 'directory "' + directory + '" is already watched ' + d.count + 'time(s)'  );
            
            d.count += 1;
            
            --count || done();
            
            return;
          }
          
          _directories[ path ] = {
            watcher: watcher,
            count: 1,
            entries: previous_entries
          };
          
          readdir();
          
          watcher.on( 'change', watch_handler );
          
          return;
          
          function watch_handler( event, entry ) {
            de&&ug( name
              + 'path "' + path
              + '" changed, event: ' + log.s( event )
              + ', entry: ' + entry
            );
            
            count += 1;
            
            if ( entry ) {
              stat( entry );
            } else {
              // Entry not provided by this OS or this is a deletion
              readdir();
            }
          }
          
          function readdir() {
            fs.readdir( path, function( error, entries ) {
              if ( error ) {
                de&&ug( name + 'fs.readdir() path: ' + path + ', error: ' + error );
              } else {
                count += entries.length;
                
                de&&ug( name + 'entries: ' + entries.join( ', ' ) );
                
                // Find deleted entries
                Object.keys( previous_entries ).forEach( function( entry ) {
                  if ( entries.indexOf( entry ) == -1 ) {
                    de&&ug( name + 'readdir(), entry "' + entry + '" was deleted from path: ' + path );
                    
                    removes.push( previous_entries[ entry ] );
                    
                    delete previous_entries[ entry ];
                  }
                } );
                
                entries.forEach( stat );
              }
              
              --count || done();
            } );
          } // readdir()
          
          function stat( entry ) {
            var _path = path + '/' + entry;
            
            fs.stat( _path, function( error, stats ) {
              if ( error ) {
                de&&ug( name + 'fs.stat() path: ' + _path + ', error (' + error.valueOf() + '): ' + error );
                
                var previous_entry = previous_entries[ entry ];
                
                if ( previous_entry ) {
                  de&&ug( name + 'after fs.stat() failed, remove entry ' + _path );
                  
                  removes.push( previous_entry );
                  
                  delete previous_entries[ entry ];
                }
              } else {
                var type;
                
                if ( stats.isFile() ) {
                  type = 'file';
                } else if ( stats.isDirectory() ) {
                  type = 'directory';
                } else if ( stats.isBlockDevice() ) {
                  type = 'block_device';
                } else if ( stats.isCharacterDevice() ) {
                  type = 'character_device';
                } else if ( stats.isSymbolicLink() ) {
                  type = 'symbolic_link';
                } else if ( stats.isFIFO() ) {
                  type = 'fifo';
                } else if ( stats.isSocket() ) {
                  type = 'socket';
                }
                
                stats = {
                  path : _path,
                  type : type,
                  mode : stats.mode,
                  size : stats.size,
                  mtime: stats.mtime,
                  ctime: stats.ctime,
                  depth: depth
                }
                
                de&&ug( name + 'directory entry: ' + log.s( stats ) );
                
                var previous_stats = previous_entries[ entry ];
                
                previous_entries[ entry ] = stats;
                
                if ( previous_stats ) {
                  for( var p in stats ) {
                    if ( ( stats[ p ] ).valueOf() != ( previous_stats[ p ] ).valueOf() ) {
                      // There is at least one property different between previous and current stat
                      
                      removes.push( previous_stats );
                      adds   .push( stats          );
                      
                      break;
                    }
                  }
                } else {
                  adds.push( stats );
                }
              }
              
              --count || done() 
            } );
          } // stat()
        } // add_directory()
      }, // _add()
      
      _remove: function( directories, options ) {
        var that = this
          , name = de && this._get_name( '_remove' )
          , _directories = this._directories
          , removes = []
        ;
        
        de&&ug( name + 'directories: ' + log.s( directories ) );
        
        directories.forEach( remove_directory );
        
        removes.length && Super._remove.call( this, removes, options );
        
        return this;
        
        function remove_directory( directory ) {
          var path = that._get_path( directory.path )
            , d    = _directories[ path ]
          ;
          
          if ( d ) {
            if ( --d.count ) {
              de&&ug( name + 'directory "' + path + '" is still watched ' + d.count + ' time(s)' );
            } else {
              de&&ug( name + 'directory "' + path + '" un-watched' );
              d.watcher.close();
              d.watcher = null;
              
              var entries = d.entries;
              d.entries = null;
              
              Object.keys( entries ).forEach( function( e ) { removes.push( entries[ e ] ) } );
              
              delete _directories[ path ];
            }
          } else {
            de&&ug( name + 'directory "' + path + '" not watched ' );
          }
        } // remove_directory()
      } // _remove()
    };
  } );
  
  Pipelet.Build( 'content_to_set', function( options ) {
      return Pipelet.call( this, options );
    },
    
    {
      _add: function( values, options ) {
        return this.__emit_add( values[ 0 ].content, options );
      },
      
      _remove: function( values, options ) {
        return this.__emit_remove( values[ 0 ].content, options );
      }
    }
  );
  
  /* -------------------------------------------------------------------------------------------
     configuration( [ options ] )
     
     Read (-only for now) a JSON configuration file and emits a dataflow of changes on that
     file.
     
     Parameters:
       - options: (Object) optional attributes:
         - flow: (String) configuration dataflow name
         - filepath: (String) the path of the configuration file to read, defaults to
                     ~/config.xs.json
     
     ToDo: tests for configuration()
  */
  var configurations = [];
  
  Pipelet.Compose( 'configuration', function( source, options ) {
    options = extend_2( {
      flow: 'configuration', filepath: '~/config.xs.json'
    }, options );
    
    var filepath = options.filepath
      , flow     = options.flow
      , configuration
    ;
    
    for ( var i = -1, config; config = configurations[ ++i ]; ) {
      if ( config.filepath == filepath ) return config.pipelet;
    }
    
    var input = source.flow( flow );
    
    // ToDo: allow writing configuration file
    input
      .value_to_attribute()
      .json_stringify()
      .alter( { flow: flow, path: filepath } )
      .trace( 'to configuration file: ' + filepath )
      //.file_write( filepath )
    ;
    
    var output = xs
      .set( [ { path: filepath } ] )
      .watch()
      .json_parse()
      //.attribute_to_value()
      .content_to_set()
      .set_flow( flow )
      .trace( 'parsed configuration file: ' + filepath )
    ;
    
    var that = xs.encapsulate( input, output );
    
    configurations.push( { filepath: filepath, pipelet: that } );
    
    return that;
  } ); // configuration()
  
  /* -------------------------------------------------------------------------------------------
     source.require_resolve()
     
     Resolve node_module file names and make uri for uglify() source map and
     http_server serve().
     
     ToDo: add tests
  */
  Pipelet.Compose( 'require_resolve', function( source, options ) {
    return source
      .alter( function( file ) {
        var name = file.name;
        
        file.path = require.resolve( name );
        
        file.uri = '/node_modules/' + name;
        
        de&&ug( 'require_resolve(), absolute file name: ' + name + ', uri path:' + file.uri );
      } )
    ;
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    Watch            : Watch,
    Watch_Directories: Watch_Directories
  } );
  
  de&&ug( "module loaded" );
} )( this ); // file.js
