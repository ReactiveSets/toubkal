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
  require( '../transforms.js' );
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "file, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     source.file_set( options )
     
     Base pipelet for watch() and watch_directory()
  */
  function File_Set( options ) {
    Set.call( this, [], options );
    
    this._key = [ 'path' ];
    
    options = this._options;
    
    var base = options.base_directory;
    
    if ( base ) {
      base += '/';
    } else {
      base = '';
    }
    
    this._base_directory = base;
  } // File_Set()
  
  Set.Build( 'file_set', File_Set, function( Super ) {
    return {
      _get_path: function( name ) {
        switch( name.charAt( 0 ) ) {
          case '~':
            name = HOME + name.substr( 1 );
          break;
          
          case '/':
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
    File_Set.call( this, options );
    
    // File watchers by filepath
    // ToDo: consider shared global watchers
    this._watchers = {};
    
    // Files to remove in transaction
    this._to_remove = [];
  } // Watch()
  
  File_Set.Build( 'watch', Watch, function( Super ) { return {
    _add_value: function( t, file ) {
      var that = this
        , filepath = that._get_path( file.path )
        , name = de && ( this._get_name( '_add_value' ) + 'path: ' + file.path + ', ' )
        , encoding = file.encoding
        , p = this.index_of( file )
      ;
      
      if ( this._removed( file ) ) {
        // ToDo: Need to update this file, or do nothing if this is only a non-content change
        return this;
      }
      
      if ( p != -1 ) {
        de&&ug( name + 'already added, position: ' + p + ', file: ' + log.s( this.a[ p ] ) );
        
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
      
      // ToDo: do not read big files. Provide file.get_content() method to retrieve content instead
      fs.readFile( filepath, encoding, function( error, content ) {
        if ( error ) {
          de&&ug( name + 'unable to read file, error: ' + log.s( error ) );
          
          t.emit_nothing();
          
          return;
        }
        
        var v = extend_2( {}, file )
          , previous = v
        ;
        
        v.content = content;
        
        de&&ug( name + 'length: ' + content.length + ', encoding: ' + encoding );
        
        var watcher = that._watchers[ filepath ] = fs.watch( filepath )
          , change_timeout
        ;
        
        watcher.on( 'change', on_change );
        
        Super._add_value.call( that, t, v );
        
        return;
        
        function on_change( event ) {
          de&&ug(
            ( name = that._get_name( 'on_change' ) + 'path: ' + file.path + ', ' )
            + 'event: ' + log.s( event )
          );
          
          // Multiple change events could be triggered, e.g. one to truncate file, one or more to append to it
          // and maybe another one for meta data changes on the file.
          // Check https://github.com/joyent/node/issues/2126 for more info on this.
          
          // To prevent reading more than once the same file, we wait 100 ms before attempting to read the file 
          change_timeout && clearTimeout( change_timeout );
          
          change_timeout = setTimeout( update_file, 100 );
          
          function update_file() {
            change_timeout = null;
            
            fs.readFile( filepath, encoding, function( error, content ) {
              if ( ! previous ) return;
              
              var p = that.index_of( previous );
              
              if ( p == -1 ) {
                de&&ug( name + 'already deleted' );
                
                previous = null;
                
                return;
              }
              
              if ( error ) {
                de&&ug( name + 'no longer able to read file, error: ' + log.s( error ) );
                
                Super._remove.call( that, [ previous ] );
                
                previous = null;
                
                return;
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
      var p = this.index_of( file );
      
      if ( p == -1 ) return null;
      
      file = this.a[ p ];
      
      var filepath = this._get_path( file.path )
        , watcher  = this._watchers[ filepath ]
      ;
      
      if ( watcher ) { // should always be true unless there is a bug
        de&&ug( this._get_name( '_remove_file' ) + 'removing: ' + log.s( file ) );
        
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
          de&&ug( this._get_name( '_removed' ) + 'removed: ' + log.s( removed ) );
          
          to_remove.splice( i, 1 );
          
          if ( this.index_of( removed ) == -1 ) return null; // removed before add
          
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
      _add_value: function( t, directory ) {
        var that           = this
          , _directories   = this._directories
          , directory_key  = directory.path
          , d              = _directories[ directory_key ]
          , directory_path = this._get_path( directory_key )
          , adds           = []
          , removes        = []
          , count          = 0
          , name           = de && ( this._get_name( '_add_value' ) + 'path: ' + directory_path + ', ' )
          , timeout        = null
        ;
        
        if ( d ) {
          de&&ug( name + 'is already watched ' + d.count + ' time(s)'  );
          
          d.count += 1;
          
          t.emit_nothing();
          
          return this;
        }
        
        try {
          var watcher = fs.watch( directory_path );
        } catch( e ) {
          // ToDo: send error to global error dataflow
          de&&ug( name + 'fs.watch() error: ' + e );
          
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
            + 'event: ' + log.s( event ) + ', entry: ' + entry
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
            timeout = setTimeout( readdir, 1000 );
          }
        } // on_change()
        
        function readdir() {
          timeout = null;
          
          count += 1;
          
          fs.readdir( directory_path, function( error, entries ) {
            var _name;
            
            de&&ug( ( _name = name + 'fs.readdir(), ' )
              + ( error
                ? 'error: ' + error
                : 'entries: ' + log.s( entries )
              )
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
          
          var entry_path = directory_path + '/' + entry;
          
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
              
              stats = {
                // Only add a trailing '/' to directory_key if it is not empty
                path     : directory_key.length ? directory_key + '/' + entry : entry,
                type     : type,
                extension: path.extname( entry_path ).substr( 1 ),
                inode    : stats.ino,
                mode     : stats.mode,
                size     : stats.size,
                mtime    : stats.mtime,
                ctime    : stats.ctime,
                depth    : depth
              }
              
              var previous_stats = previous_entries[ entry ];
              
              previous_entries[ entry ] = stats;
              
              if ( previous_stats ) {
                var updated = false;
                
                for( var p in stats ) {
                  if ( ( stats[ p ] ).valueOf() != ( previous_stats[ p ] ).valueOf() ) {
                    // There is at least one updated property
                    if ( de ) {
                      ug( _name + 'updated property: ' + p
                        + ', previous: ' + previous_stats[ p ]
                        + ', new: ' + stats[ p ]
                      );
                      
                      if ( updated ) continue;
                      
                      updated = true;
                    }
                    
                    removes.push( previous_stats );
                    adds   .push( stats          );
                    
                    if ( de ) continue;
                    
                    break;
                  }
                }
              } else {
                de&&ug( _name + 'added: ' + log.s( stats ) );
                
                adds.push( stats );
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
          , directory_key = directory.path
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
  
  /*
  function Update_All_On_Complete( trigger, options ) {
    this.__init( trigger, options );
  } // Update_All_On_Complete()
  
  Pipelet.Build( 'update_all_on_complete', Update_All_On_Complete, function ( Super ) {
    return {
      __init: function( trigger, options ) {
        Super.constructor.call( this, options );
        
        var previous = [];
        
        // trigger = trigger.greedy();
        
        trigger._on_complete( function( options ) {
          this._transaction( 2, options, function( t ) {
            this.__emit_remove( previous, t.next().get_emit_options() );
            
            this._output._fetch_all( function( values ) {
              this.__emit_add( previous = values, t.next().get_emit_options() );
            } );
          } );
        }, this );
        
        return this;
      }
       
      //_add: function() {},
      //_remove: function() {}
    };
  } ); // update_all_on_complete()
  
  function Cache( options ) {
    this.__init( options );
    
    this._output._fetch = this._fetch;
  }
  
  Pipelet.Build( 'cache', Cache, function( Super ) {
    return {
      __init: function( options ) {
        Super.constructor.call( this, options );
        
        this.state = [];
        
        return this;
      },
      
      _fetch: function( receiver, query ) {
        var p = this.pipelet, state = p.state;
        
        if ( query ) {
          var filter = new Query( query ).generate().filter;
          
          for( i = -1, o; o = state[ ++i ]; ) {
            var values  = filter( o[ 1 ] )
              , options = o[ 2 ]
              , t = options._t
            ;
            
            if ( values.length || ( t.id && ! t.more ) ) {
              receiver.call( p, [ [ o[ 0 ], values, options ] ], false );
            }
          }
          
          receiver.call( p, [], true );
        } else {
          receiver.call( p, state, true );
        }
      }, // _fetch()
      
      _add: function( values, options ) {
        this.state.push( [ 'add', values, options ] );
        
        return this.__emit_add( values, options );
      },
      
      _remove: function( values, options ) {
        this.state.push( [ 'remove', values, options ] );
        
        return this.__emit_remove( values, options );
      }
    };
  } ); // cache()
  */
  
  /* -------------------------------------------------------------------------------------------
     configuration( [ options ] )
     
     Read (-only for now) a JSON configuration file and emits a dataflow of changes on that
     file.
     
     This is a stateful pipelet.
     
     Parameters:
       - options: (Object) optional attributes:
         - flow: (String) configuration dataflow name
         - filepath: (String) the path of the configuration file to read, defaults to
                     ~/config.xs.json
     
     ToDo: more tests for configuration()
  */
  var configurations = [];
  
  Pipelet.Compose( 'configuration', function( source, options ) {
    options = extend_2( {
      flow: 'configuration', filepath: '~/config.xs.json'
    }, options );
    
    var filepath = options.filepath
      , flow     = options.flow
      , i = -1, config
    ;
    
    while ( config = configurations[ ++i ] ) {
      if ( config.filepath == filepath ) return config.pipelet;
    }
    
    var input = source.flow( flow );
    
    var output = xs
      .set( [ { path: filepath } ] )
      .watch( options )
      .json_parse()
      .attribute_to_values()
      .set_flow( flow )
      .trace( 'parsed configuration file: ' + filepath )
      .union( input )
      .set( [], options ) // ToDo: requires an id for configuration objects, or use of a cache
    ;
    
    // ToDo: allow writing to configuration file
    /*
    output
      //.update_all_on_complete( input )
      .alter( function( o ) { delete o.flow; } )
      //.values_to_attribute()
      .json_stringify()
      .alter( { flow: flow, path: filepath } )
      //.file_write( filepath, options )
    */
    
    var that = xs.encapsulate( input, output );
    
    configurations.push( { filepath: filepath, pipelet: that } );
    
    return that;
  } ); // configuration()
  
  /* -------------------------------------------------------------------------------------------
     source.require_resolve()
     
     Resolve node_module file names and make uri for uglify() source map and http_server serve().
     
     This is a stateless pipelet.
     
     Source attributes:
       - name (string): module name e.g. 'mocha'. If a module cannot be resolved, there is no
          output for this module. eventually an error could be sent in the global error
          dataflow.
       
     Destination attributes: all attributes from source plus:
       - path (string): absolute module file path
       - uri (string): '/node_modules/' + name
  */
  // ToDo: use alter() with option many when available
  function Require_Resolve( options ) {
    Pipelet.call( this, extend_2( { key: [ 'name' ] }, options ) );
  } // Require_Resolve()
  
  Pipelet.Build( 'require_resolve', Require_Resolve, function( Super ) {
    return {
      __transform: function( modules ) {
        var i = -1, module, files = [];
        
        while ( module = modules[ ++i ] ) {
          var name = module.name;
          
          files.push( extend_2( {
            path: require.resolve( name ),
            uri: '/node_modules/' + name
          }, module ) );
        }
        
        return files;
      } // __transform()
    };
  } ); // Require_Resolve() instance attributes
  
  /* --------------------------------------------------------------------------
     module exports
  */
  XS.add_exports( {
    File_Set         : File_Set,
    Watch            : Watch,
    Watch_Directories: Watch_Directories,
    Require_Resolve  : Require_Resolve
  } );
  
  de&&ug( "module loaded" );
} )( this ); // file.js
