/*  process.js
    ----
    
    Copyright (c) 2013-2017, Reactive Sets

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
'use strict';

var rs       = require( '../core/pipelet.js' )
  , RS       = rs.RS
  , extend   = RS.extend
  , extend_2 = extend._2
  , log      = RS.log.bind( null, 'process' )
  , de       = false
  , ug       = log
;

module.exports = rs;

/* ----------------------------------------------------------------------------
    @pipelet process_variables( options )
    
    @short Gets command line arguments, environment variables, and more
    
    @parameters
    - **options** (Object): pipelet set() options
    
    @emits
    - **id** (Number): 1
    - **argv** (Strings\\[]): [command line arguments](https://nodejs.org/api/process.html#process_process_argv)
    - **env** (Object): [environment variables](https://nodejs.org/api/process.html#process_process_env)
    - **pid** (Integer): [current process id](https://nodejs.org/api/process.html#process_process_pid)
    - **ppid** (Integer): [parent process id](https://nodejs.org/api/process.html#process_process_ppid)
    - **node_argv** (String\\[]): [Node.js command command-line arguments](https://nodejs.org/api/process.html#process_process_execargv)
    - **node_path** (String): [Node,js command excecution path](https://nodejs.org/api/process.html#process_process_execargv)
    - **version** (String): [Node.js version string](https://nodejs.org/api/process.html#process_process_version)
    - **versions** (Object): [Versions of node and its dependencies](https://nodejs.org/api/process.html#process_process_versions)
    - **arch** (String): [process.arch](https://nodejs.org/api/process.html#process_process_arch)
    - **platform** (String): [process.platform](https://nodejs.org/api/process.html#process_process_platform)
    - **config** (Object): [process.config](https://nodejs.org/api/process.html#process_process_config)
    - **release** (Object): [Node,js release information](https://nodejs.org/api/process.html#process_process_release)
    
    @description
    This is a @@stateful, read-only, @@singleton pipelet.
    
    This should provide all read-only variables from [Node.js process](https://nodejs.org/api/process.html).
    
    The source is only used as a @@namespace\.
*/
rs.Singleton( 'process_variables', function( source, options ) {
  return source
    
    .namespace()
    
    .set( [ {
      id: 1,
      argv     : process.argv.slice(),
      envp     : extend_2( {}, process.env ),
      node_argv: process.execArgv.slice(),
      node_path: process.execPath,
      pid      : process.pid,
      ppid     : process.ppid,
      version  : process.version,
      versions : process.versions,
      arch     : process.arch,
      platform : process.platform,
      config   : process.config,
      release  : process.release
    } ], options )
  ;
} ); // process_variables()
