/*  file.js
    
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
    
    ToDo: fix exception under windows:
      $ node examples/server.js > trace.out

      events.js:72
              throw er; // Unhandled 'error' event
                    ^
      Error: watch EPERM
          at errnoException (fs.js:1024:11)
          at FSEvent.FSWatcher._handle.onchange (fs.js:1042:26)

*/
'use strict';

var fs         = require( 'fs' )
  , path       = require( 'path' )
  , rs         = require( '../core/pipelet.js' )
  , RS         = rs.RS
  , log        = RS.log.bind( null, 'file' )
  , extend     = RS.extend
  , extend_2   = extend._2
  , Pipelet    = RS.Pipelet
  , Set        = RS.Set
  
  , win32      = process.platform == 'win32'
  , HOME       = process.env[ win32 ? 'USERPROFILE' : 'HOME']
  , separator  = path.sep
;

module.exports = rs;

require( '../core/json.js' );
require( '../core/transforms.js' );

/* ----------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

function path_base( name, base_directory ) {
  if( ! path.isAbsolute( name ) ) {
    name = name.charAt( 0 ) == '~'
      ? HOME + name.substr( 1 )
      : base_directory + separator + name
    ;
  }
  
  return path.normalize( name );
} // path_base()

RS.path_base = path_base;

/* ----------------------------------------------------------------------------
    @pipelet path_base( base_directory )
    
    @short Prepend base directory to relative ```"path"```, resolve ```"~"``` to home directory
    
    @examples
    
    - Prepend relative path with current working directory:
    
      ```javascript
        rs.Compose( 'prepend_cwd', function( source, options ) {
          return source
            .path_base( process.cwd() )
          ;
        } );
      ```
    
    @parameters
    - base_directory (String): directory to prepend to ```"path"``` attribute.
      Default is ```""``` which does nothing.
    
    @description
    This is a @@stateless, @@synchronous, @@greedy pipelet.
    
    Rules:
    - Absolute paths are unchanged
    - ```"~"``` as first character is replaced with absolute HOME directory
    - Relative paths are prepended with ```base_directory```
    - Finally path is normalized
*/
rs.Compose( 'path_base', function( source, base_directory, options ) {
  base_directory = base_directory ? base_directory + separator : '';
  
  return source
    .alter( function( file ) {
      file.path = path_base( file.path, base_directory );
    }, options )
  ;
} ); // path_base()

/* ----------------------------------------------------------------------------
    @pipelet path_relative( from, options )
    
    @short Alter path using node ```path.relative()```
    
    @parameters
    - from (String): if null or undefined, default is ```""``` which stands
      for the current working directory.
      
    - options (Object): pipelet alter() options
    
    @description
    See [path.relative()](https://nodejs.org/api/path.html#path_path_relative_from_to)
    for behavior.
    
    This is a @@stateless, @@synchronous, @@greedy pipelet.
*/
rs.Compose( 'path_relative', function( source, from, options ) {
  from = from || '';
  
  return source
    .alter( function( file ) {
      file.path = path.relative( from, file.path );
    }, options )
  ;
} ); // path_relative()

/* ----------------------------------------------------------------------------
   source.file_set( options )
   
   Base pipelet for watch() and watch_directory()
*/
function File_Set( options ) {
  options.key = [ 'path' ];
  
  Set.call( this, [], options );
  
  options = this._options;
  
  var base = options.base_directory;
  
  if ( base ) {
    base += separator;
  } else {
    base = '';
  }
  
  this._base_directory = base;
} // File_Set()

Set.Build( 'file_set', File_Set, function( Super ) {
  return {
    _get_path: function( name ) {
      return path_base( name, this._base_directory );
    } // _get_path()
  }
} ); // File_Set instance attributes

/* ----------------------------------------------------------------------------
    @pipelet watch( options )
    
    @short Watches the content of a source dataflow of files.
    
    @parameters
    - options (Object): pipelet options
      - base_directory (String): path of the base directory for all
        source files. By default files are read from process.cwd().
        It can be specified as a relative directory, in which case it
        is relative to process.cwd(), or as an absolute directory.
    
    @emits
    Source attributes plus:
    - content (String): read file content
    
    @examples
    - watch files ```"index.html"``` and ```"contact.html"``` from module
      absolute directory:
      
      ```javascript
        rs
          .set( [
            { path: 'index.html'   },
            { path: 'contact.html' }
          ] )
          
          .watch( { base_directory: __dirname } )
        ;
      ```
    
    @description
    The source must describe files, using the ```"path"``` attribute. If
    the path does not start with ```"."``` or ```"~"```, the path is
    prepended with ```"./"``` to read from the current directory.
    
    If the path starts with ```"~"```, this character is replaced by the
    HOME path, as determined by the environement variable ```"USERPROFILE"```
    on win32 and ```"HOME"``` for other platforms.
    
    If the attribute ```"encoding"``` is specified, it is used to read
    the file, otherwise encoding is determined by extension.
    
    This is a @@stateful, @@asynchronous, @@greedy pipelet.
    
    Warning: if a file does not exist when added, watch() cannot set a
    file watcher and will not attempt to add one if the file later
    appears in the directory. If files not always expected to be present
    when added, one should use pipelet watch_directory() upstream of
    watch() in order to add and remove watchers reactively.
    
    ### To-Do List
    - ToDo: do not read large files, provide reader function instead
    - ToDo: add more CI tests for watch()
*/
function Watch( options ) {
  File_Set.call( this, options );
  
  // File watchers by filepath
  // ToDo: consider shared global watchers, possibly through a multiton pipelet.
  this._watchers = {};
  
  // Files to remove in transaction
  this._to_remove = [];
} // Watch()

File_Set.Build( 'watch', Watch, function( Super ) { return {
  _add_value: function( t, file ) {
    de&&ug( this._get_name( '_add_value' ) + 'file:', file );
    
    var that     = this
      , filepath = that._get_path( file.path )
      , name     = this._get_name( '_add_value' ) + 'path: ' + file.path + ', '
      , encoding = file.encoding
      , p        = this._a_index_of( file )
    ;
    
    if ( this._removed( file ) ) {
      // ToDo: Need to update this file, or do nothing if this is only a non-content change
      return this;
    }
    
    if ( p != -1 ) {
      log( name + 'already added, position: ' + p + ', file:', this.a[ p ] );
      
      t.emit_nothing();
      
      return this;
    }
    
    if ( ! encoding ) {
      var extension = path.extname( filepath ).substr( 1 );
      
      // ToDo: manage more default encodings on file extension
      if ( [ 'png', 'jpg', 'jpeg', 'gif', 'ico', 'eot', 'ttf', 'woff' ].indexOf( extension ) == -1 ) {
        encoding = 'utf8';
      }
      
      de&&ug( name + 'extension: ' + extension + ', encoding: ' + encoding );
    }
    
    // ToDo: do not read big files. Provide provide read stream instead.
    fs.readFile( filepath, encoding, function( error, content ) {
      if ( error ) {
        // ToDo: emit notice in global notices dataflow
        log( name + 'notice, unable to read file, error:', error );
        
        t.emit_nothing();
        
        return;
      }
      
      var v = extend_2( {}, file )
        , previous = v
      ;
      
      v.content = content;
      
      de&&ug( name + 'length: ' + content.length + ', encoding: ' + encoding );
      
      // ToDo: there is a race condition if file is deleted between readFile() and watch()
      var watcher = that._watchers[ filepath ] = fs.watch( filepath )
        , change_timeout
      ;
      
      watcher.on( 'change', on_change );
      
      Super._add_value.call( that, t, v );
      
      return;
      
      function on_change( event ) {
        de&&ug(
          ( name = that._get_name( 'on_change' ) + 'path: ' + file.path + ', ' )
          + 'event:', event
        );
        
        // Multiple change events could be triggered, e.g. one to truncate file, one or more to append to it
        // and maybe another one for meta data changes on the file.
        // Check https://github.com/joyent/node/issues/2126 for more info on this.
        
        // To prevent reading more than once the same file, we wait 100 ms before attempting to read the file 
        // ToDo: watch(): expose 100 ms delay to options and documentation
        change_timeout && clearTimeout( change_timeout );
        
        change_timeout = setTimeout( update_file, 100 );
        
        function update_file() {
          change_timeout = null;
          
          fs.readFile( filepath, encoding, function( error, content ) {
            if ( ! previous ) return;
            
            var p = that._a_index_of( previous );
            
            if ( p == -1 ) {
              de&&ug( name + 'already deleted' );
              
              previous = null;
              
              return;
            }
            
            if ( error ) {
              // ToDo: emit notice in global notice dataflow
              log( name + 'notice: no longer able to read file, error:', error );
              
              // Do not remove watcher, the file might come back
              // It is the responsibility of upstream pipelet to remove watcher
              content = '';
            }
            
            if ( content != previous.content ) {
              // Use file, because v might have been altered by side-effect at downstream pipelet
              // Such as serve() which adds etag, gzip content, ...
              that.a[ p ] = v = extend_2( {}, file );
              
              v.content = content;
              
              de&&ug( name + 'updated content, length: ' + content.length );
              
              Super.__emit_update.call( that, [ [ previous, v ] ] );
              
              previous = v;
            } else {
              de&&ug( name + 'same content => no update' );
            }
          } );
        } // update_file()
      } // on_change()
    } ); // fs.readfile()
    
    return this;
  }, // _add_value()
  
  _remove_value: function( t, file ) {
    var removed, removed_file;
    
    if ( t.source_more ) {
      t.emit_nothing();
    } else {
      removed = this._remove_all_pending();
      
      removed_file = this._remove_file( file );
      
      if ( removed_file ) {
        removed.push( file );
      } else {
        this._to_remove.push( file );
      }
      
      Super._remove_values.call( this, t, removed );
    }
    
    if ( ! removed_file ) {
      de&&ug( this._get_name( '_remove_value' ) + 'to remove: ' + file );
      
      this._to_remove.push( file );
    }
    
    return this;
  }, // _remove_value()
  
  _remove_file: function( file ) {
    var p = this._a_index_of( file );
    
    if ( p == -1 ) return null;
    
    file = this.a[ p ];
    
    var filepath = this._get_path( file.path )
      , watcher  = this._watchers[ filepath ]
    ;
    
    if ( watcher ) { // should always be true unless there is a bug
      de&&ug( this._get_name( '_remove_file' ) + 'removing:', file );
      
      watcher.close();
      
      this._watchers[ filepath ] = null;
    }
    
    return file;
  }, // _remove_file()
  
  // Remove value from _to_remove returning pending remove or return null if not found
  _removed: function( file ) {
    var to_remove = this._to_remove
      , i = -1
      , removed
    ;
    
    while ( removed = to_remove[ ++i ] ) {
      if ( removed.path == file.path ) {
        de&&ug( this._get_name( '_removed' ) + 'removed:', removed );
        
        to_remove.splice( i, 1 );
        
        if ( this._a_index_of( removed ) == -1 ) return null; // removed before add
        
        return removed;
      }
    }
    
    return null;
  }, // _removed()
  
  _remove_all_pending: function() {
    var to_remove = this._to_remove
      , i = 0, file
      , removed = []
    ;
    
    while ( file = to_remove[ i ] ) {
      if ( this._remove_file( file ) ) {
        to_remove.splice( i, 1 );
        
        removed.push( file );
      } else {
        // This file cannot be removed because there is no corresponding add
        i += 1;
      }
    }
    
    return removed;
  } // _remove_all_pending()
}; } ); // Watch instance methods

/* ----------------------------------------------------------------------------
    @pipelet watch_directories( options )
    
    @short Watch source directories, emits directory entries
    
    @parameters
    - options (Object): optional pipelet options:
      - base_directory (String): the path of the base directory for all
        directories
    
    @emits
    - path (String): found entry path
    - type (String): type of entry, one of:
      - file
      - directory
      - block_device
      - character_device
      - symbolic_link
      - fifo
      - socket
    - base (String): entry basename
    - extension (String): entry extension
    - inode: stats.ino
    - mode: stats.mode
    - depth (Number): recursion depth calculated as:
      ```( source.depth || 0 ) + 1```. It can be used to control the
      recursion depth using a filter() pipelet.
    
    @description
    Watches directories provided by source and emits directory entries
    that may be files or directories.
    
    Source dataflow must provide a ```"path"``` attribute for the
    directory absolute or relative path.
    
    This pipelet relies on Node fs.watch() which has some limitations
    documented here:
    - [fs watch filename options listener](http://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener)
    
    ### See Also
    - Pipelet watch()
    
    ### To-Do List
    - Emit update operations instead of remove + add
    - ToDo: consider [chokidar](https://github.com/paulmillr/chokidar)
      as a replacement to fs.watch() to fix a number of problems
*/
function Watch_Directories( options ) {
  File_Set.call( this, options );
  
  this._directories = {};
  
  return this;
} // Watch_Directories()

File_Set.Build( 'watch_directories', Watch_Directories, function( Super ) {
  return {
    _add_value: function( t, directory ) {
      var that           = this
        , _directories   = this._directories
        , directory_key  = path.normalize( directory.path )
        , d              = _directories[ directory_key ]
        , directory_path = this._get_path( directory_key )
        , adds           = []
        , removes        = []
        , count          = 0
        , name           = de && ( this._get_name( '_add_value' ) + 'path: ' + directory_path + ', ' )
        , timeout        = null
      ;
      
      if ( d ) {
        // prevent duplicates
        de&&ug( name + 'is already watched ' + d.count + ' time(s)'  );
        
        d.count += 1;
        
        t.emit_nothing();
        
        return this;
      }
      
      try {
        var watcher = fs.watch( directory_path );
      } catch( e ) {
        // ToDo: send notice to global notice dataflow
        log( name + 'notice, cannot watch directory, error: ' + e );
        
        t.emit_nothing();
        
        return this;
      }
      
      var depth = ( directory.depth || 0 ) + 1
        , previous_entries
      ;
      
      _directories[ directory_key ] = {
        watcher: watcher,
        count: 1,
        entries: previous_entries = {}
      };
      
      readdir();
      
      watcher.on( 'change', on_change );
      
      return this;
      
      function on_change( event, entry ) {
        de&&ug(
          ( name = that._get_name( 'on_change' ) + 'path: ' + directory_path + ', ' )
          + 'event:', event, ', entry: ' + entry
        );
        
        // ToDo: split this pipelet in 2: one for the watcher, one for reading directories
        // and finding differences, processing watcher events, this will allow to use built-in
        // transactions instead of explicity creating a transaction as bellow
        // this would also allow to re-use the watcher between file watch and directory watch
        if ( t.is_closed() ) {
          // Closed transaction, allocate new transaction
          that._transaction( 1, {}, find_differences );
        } else {
          if ( timeout ) {
            clearTimeout( timeout );
          } else {
            // Timeout had already expired, but transaction is not complete
            // This will force a new readdir and a new emission on the transaction
            t.add_operations( 1 );
          }
          
          find_differences( t );
        }
        
        function find_differences( _t ) {
          t = _t;
          
          // Wait 1 second after last event on directory before reading directory to give a
          // chance for all changes to become visible
          // ToDo: expose 1 second delay to options and documentation
          timeout = setTimeout( readdir, 1000 );
        }
      } // on_change()
      
      function readdir() {
        timeout = null;
        
        count += 1;
        
        fs.readdir( directory_path, function( error, entries ) {
          var _name;
          
          de&&ug( _name = name + 'fs.readdir(),'
            , error ? 'error:' : 'entries:'
            , error ?  error   :  entries
          )
          
          if ( ! error ) {
            // Find deleted entries
            Object.keys( previous_entries ).forEach( function( entry ) {
              if ( entries.indexOf( entry ) == -1 ) {
                de&&ug( _name + 'deleted entry: ' + entry );
                
                removes.push( previous_entries[ entry ] );
                
                delete previous_entries[ entry ];
              }
            } );
            
            entries.forEach( stat );
          }
          
          check_done();
        } );
      } // readdir()
      
      function stat( entry ) {
        count += 1;
        
        var entry_path = directory_path + separator + entry;
        
        fs.stat( entry_path, function( error, stats ) {
          var _name = de && ( name + 'fs.stat(), entry: ' + entry + ', ' );
          
          if ( error ) {
            de&&ug( _name + 'error: ' + error );
            
            var previous_entry = previous_entries[ entry ];
            
            if ( previous_entry ) {
              de&&ug( _name + 'failed, remove entry ' + entry_path );
              
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
            
            var new_stats = {
              // Only add a trailing separator to directory_key if it is not empty
              path     : directory_key.length ? directory_key + separator + entry : entry,
              type     : type,
              base     : path.basename( entry_path ),
              extension: path.extname( entry_path ).substr( 1 ),
              inode    : stats.ino,
              mode     : stats.mode,
              depth    : depth
            };
            
            if ( type != 'directory' ) {
              // Only non-directories update when size and time change
              extend_2( new_stats, {
                size     : stats.size,
                mtime    : stats.mtime,
                ctime    : stats.ctime
              } );
            }
            
            var previous_stats = previous_entries[ entry ];
            
            previous_entries[ entry ] = new_stats;
            
            if ( previous_stats ) {
              var updated = false;
              
              for( var p in new_stats ) {
                if ( ( new_stats[ p ] ).valueOf() != ( previous_stats[ p ] ).valueOf() ) {
                  // There is at least one updated property
                  if ( de ) {
                    ug( _name + 'updated property: ' + p
                      + ', previous: ' + previous_stats[ p ]
                      + ', new: '      + new_stats[ p ]
                    );
                    
                    if ( updated ) continue;
                    
                    updated = true;
                  }
                  
                  removes.push( previous_stats );
                  adds   .push( new_stats      );
                  
                  if ( de ) continue;
                  
                  break;
                }
              }
            } else {
              de&&ug( _name + 'added:', new_stats );
              
              adds.push( new_stats );
            }
          }
          
          check_done()
        } );
      } // stat()
      
      function check_done() {
        if ( --count ) return;
        
        var rl = removes.length
          , al = adds.length
          , l = ( rl && 1 ) + ( al && 1 )
        ;
        
        de&&ug( name + 'check_done(), operations: ' + l
          + ', removes: ' + rl
          + ', adds: ' + al
        );
        
        switch( l ) {
          case 0:
            t.emit_nothing();
          break;
          
          case 2:
            t.add_operations( 1 );
          // fall-through
          
          case 1:
            if ( rl ) {
              Super._remove_values.call( that, t, removes );
              
              removes = [];
            }
            
            if ( al ) {
              Super._add_values.call( that, t, adds );
              
              adds = [];
            }
          break;
        }
      } // check_done()
    }, // _add_value()
    
    _remove_value: function( t, directory ) {
      var _directories  = this._directories
        , directory_key = path.normalize( directory.path )
        , d             = _directories[ directory_key ]
        , name          = de && this._get_name( '_remove_value' )
      ;
      
      if ( d ) {
        if ( --d.count ) {
          de&&ug( name + 'directory "' + directory_key + '" is still watched ' + d.count + ' time(s)' );
        } else {
          de&&ug( name + 'directory "' + directory_key + '" un-watched' );
          d.watcher.close();
          d.watcher = null;
          
          var entries = d.entries;
          d.entries = null;
          
          delete _directories[ directory_key ];
          
          entries = Object.keys( entries )
            .map( function( e ) { return entries[ e ]; } )
          ;
          
          Super._remove_values.call( this, t, entries );
          
          return this;
        }
      } else {
        de&&ug( name + 'directory "' + directory_key + '" not watched ' );
      }
      
      t.emit_nothing();
      
      return this;
    } // _remove_value()
  };
} ); // Watch_Directories() instance attributes

/* -------------------------------------------------------------------------------------------
    @pipelet make_base_directories( options )
    
    @short Create directories and their base
    
    @description
    Creates base directories for files' paths if they don't exist when a file is added. When
    a file is removed, all attributes are passed downstream with no attempt to remove the
    base directory.
    
    If the base directory matches an existing path that is not a directory, or if the
    directory cannot be created due to some error, an error is emitted, i.e. the output file
    will contain an error attribute with the error.
    
    This is an asynchronous, stateful, greedy pipelet.
    
    Source attributes:
    - path: (string) the path of file for which the base directory needs to be created if it
    does not exist.
    
    Destination attributes: all incoming attributes.
    
    ### ToDo List
    - ToDo: make_base_directories(): make it a transactional stateless pipelet
*/
function Make_Base_Directories( options ) {
  File_Set.call( this, options );
}

File_Set.Build( 'make_base_directories', Make_Base_Directories, function( Super ) {
  return {
    _add_value: function( t, file ) {
      var that = this
        , dirname = path.dirname( this._get_path( file.path ) )
      ;
      
      make_directory( dirname, function( error ) {
        if ( error ) {
          file = extend_2( {}, file );
          
          file.error = error;
        }
        
        Super._add_value.call( that, t, file );
      } );
      
      function make_directory( dirname, callback, last ) {
        fs.stat( dirname, function( error, stat ) {
          if ( ! error ) {
            // Directory exists
            if ( stat.isDirectory() ) return callback();
            
            error = not_a_directory();
          }
          
          // There is an error
          
          if ( error.code != 'ENOENT' ) {
            log( 'Path ' + dirname + ' cannot be stat-ed, error: ' + error.code );
            
            return callback( error );
          }
          
          // ENOENT, from man -S 2 stat: A component of path does not exist, or path is an empty string.
          
          // The directory must be created
          fs.mkdir( dirname, function( error ) {
            if ( ! error || error.code == 'EEXIST' ) {
              // Successfully created directory or raise condition, we just created this directory, most-likely from this same transaction
              
              callback();
            } else if ( error.code == 'ENOENT' ) {
              // A directory component in pathname does not exist or is a dangling symbolic link.
              if ( last ) return callback( error ); // We had already created base directory successfully but it is no longer valid, then emit the error
              
              // Attempt to create base directory first
              make_directory( path.dirname( dirname ), function( error ) {
                if ( error ) {
                  callback( error ); // cannot create base directory
                } else {
                  make_directory( dirname, callback, true /* last */ );
                }
              } );
            } else {
              callback( error );
            }
          } );
        } ); // stat()
        
        function not_a_directory() {
          var error = new Error( 'Path ' + dirname + ' exists but is not a directory' );
          
          error.code = 'ENOTDIR'; // POSIX: Not a directory
          
          return error;
        }
      } // make_directory()
    } // _add_value()
  };
} ); // make_base_directories()

/* ----------------------------------------------------------------------------
    @pipelet configuration( options )
    
    @short Read JSON configuration file
    
    @parameters
    - options (Object): optional attributes:
      - key  (Array of Strings): set's @@key, default is upstream key or
        [ "id" ].
                                 
      - flow (String): dataflow name, default is ```"configuration"```.
      
      - filepath (String): file path, defaults is ```"~/config.rs.json"```.
      
      - base_directory (String): If filepath is not an absolute directory,
        base_directory is prepended to filepath to determine the absolute
        location of the configuration file.
    
    @examples
    - A configuration file for toubkal pipelets @@dropbox_public_urls()
      and @@passport_strategies():
      
      ```javascript
        [
          {
            "id"         : "dropbox_public_urls",
            "pipelet"    : "dropbox_public_urls",

            "credentials": {
                "clientID"    : "***"
              , "clientSecret": "***"
              , "accessToken" : { "oauth_token": "***", "oauth_token_secret": "***", "uid": "***" }
            }
          },

          {
            "id"     : "passport_strategies#twitter",
            "pipelet": "passport_strategies",

            "credentials": {
                "consumerKey"   : "***"
              , "consumerSecret": "***"
            }
          },

          {
            "id"     : "passport_strategies#facebook",
            "pipelet": "passport_strategies",

            "module" : "passport-facebook",
            "name"   : "facebook",

            "credentials": {
                "clientID"    : "***"
              , "clientSecret": "***"
            }
          }
        ]
      ```javascript
    
    @description:
    Read (-only for now) a JSON configuration file and emits an optimized
    dataflow of changes from that file.
    
    To determine independent values, the JSON file must contain one Array
    of Objects where each object has a unique key [ "id" ] by default.
    
    Check the example above showing a valid JSON configuration file.
    
    A number of Toubkal pipelets expect a format where the following
    attributes are required for configuration objects, refer to each
    pipelet for further details:
    - "id" (String): a unique key for all configuration value. If should
      start with the name of the pipelet, e.g. ```"passport_strategies"```,
      and if there are multiple configuration values required by the
      pipelet, it should be followed by "#" and a unique string for
      each value, e.g. ```"passport_strategies#facebook"```.
    
    - "pipelet" (String): the name of the pipelet handling the
      configuration value. It may be used by pipelets handling
      multiple configuration values to subscribe to all their
      configuration values.
    
    This is an @@asynchronous, @@stateful, @@greedy @@(multiton). The
    multiton's key is the file normalized path.
    
    ### See Also
    - Pipelet passport_strategies_configuration()
    - Pipelet send_mail()
    
    ### To-Do List
    - ToDo: more CI tests for configuration()
    - ToDo: allow writing to configuration file
*/
function configuration_multiton_name( options ) {
  options = options || {};
  
  var filepath = options.filepath || '~/config.rs.json';
  
  var normalized_path = options.base_directory
    ? path.resolve( options.base_directory, filepath )
    : path.normalize( filepath )
  ;
  
  de&&ug( 'configuration_multiton_name( ' + filepath + ' ), normalized_path:', normalized_path );
  
  return normalized_path;
} // configuration_multiton_name()

rs.Multiton( 'configuration', configuration_multiton_name, function configuration( source, options ) {
  options = extend_2( { flow: 'configuration', key: [ 'id' ] }, options );
  
  var filepath      = options.filepath || '~/config.rs.json'
    , name          = options.name = 'configuration( ' + filepath + ' )'
    , watch_options = extend( {}, options, { key: [ 'path' ], filepath: filepath } )
    , flow          = options.flow
    , rs            = source.namespace()
  ;
  
  de&&ug( name + ', creating instance, options:', options );
  
  var output = rs
    .set( [ { 'path': filepath } ], watch_options )
    .watch( watch_options )
    .json_parse()
    .attribute_to_values( options )
    .set_flow( flow )
    .optimize()
    .unique()
  ;
  
  /* Possible implementation to write to configuration file
     Requires new pipelets:
     - transaction_aggregate()
     - transaction_apply( output )
     - transaction_apply_fetched()
     - file_write()
  */
  /*
  var fetched = source
    .flow( flow )
    
    // get semantically strict transactional operations
    .optimize()
    
    // get all operations for each transaction into a single atomic add operation
    .transaction_aggregate() // emits events attribute containing all operations for each transaction
    
    // Fetch current content of configuration file
    .fetch( output ) // fetch all current values
  ;
  
  fetched
    // immediatly apply transaction to output synchronously, preventing race condition if next transaction happens before file updates
    .map( function( _ ) { return { transaction: _.source } } )
    
    .transaction_apply( output ) // requires output to be changed to unique()
  ;
  
  fetched
    // Calculate new content, .transaction_apply_fetched( output )
    .map( function( fetched ) {
      var that   = output
        , source = fetched.source
        , out    = fetched.values.slice() // shallow copy fetched values
      ;
      
      // apply transaction events to fetched values
      source.events.forEach( function( operation ) {
        var name   = operation[ 0 ]
          , values = operation[ 1 ]
        ;
        
        switch( name ) {
          case 'add':
            // will allow duplicates
            push.apply( out, values );
          break;
          
          case 'remove':
            values.forEach( function( removed ) {
              var i = index_of( removed );
              
              if( i >= 0 ) out.splice( i, 1 );
            } );
          break;
          
          case 'update':
            values.forEach( function( updated ) {
              var i = index_of( updated[ 0 ] );
              
              if( i >= 0 ) out[ i ] = updated[ 1 ];
            } );
          break;
          
          function index_of( value ) {
            var id = that._make_key( value )
              , i  = -1
              , l  = out.length
            ;
            
            while( ++i < l )
              if( id == that._make_key( out[ i ] )
                return i
            ;
            
            return -1;
          }
        } // for_each_operation()
      } )
      
      // emit new file content into 'content' attribute
      return { id: source.id, content: out };
    } )
    
    .json_stringify() // JSON.stringify 'content' attribute
    
    // write 'content' attribute to file
    .file_write( filepath, options )
    
    // on error, if file cannot be written, remove values from output set 
  ;
  */
  
  return output; // source.encapsulate( input, output );
} ); // configuration()

/* --------------------------------------------------------------------------
   module exports
*/
RS.add_exports( {
  'File_Set'         : File_Set,
  'Watch'            : Watch,
  'Watch_Directories': Watch_Directories
} );

de&&ug( 'module loaded' );

// file.js
