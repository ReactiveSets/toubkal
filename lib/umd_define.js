/*  umd_define.js

    The MIT License (MIT)

    Copyright (c) 2015, Reactive Sets

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
;!function( umd_define_factory ) {
  'use strict';
  
  var me = 'umd_define';
  
  // Load me using AMD define if available, allows to load my dependencies dynamically
  if ( typeof define == 'function' && define.amd ) {
    // Use AMD define
    define( me, umd_define_factory );
    
    // Must explicitly require me so that other modules can get it as a global
    require( [ me ], function() {
      console.log( me + ' loaded by AMD loader' );
    } );
  } else if ( typeof exports == 'object' ) {
    // Node
    umd_define_factory( require, exports, module );
  } else {
    // Global
    var ___;
    
    umd_define_factory( ___, ___, window );
  }
}
( function( require, exports, module ) {
  'use strict';
  
  var has_define      = typeof define == 'function' && !! define.amd
    , slice           = [].slice
    , private_modules = {}
    
    // ToDo: get configuration options from dependency
    , default_options = {
        use_name: true,
        global: true, // set to true to export all modules as globals
        add_no_conflict: true
      }
  ;
  
  if ( has_define || ! exports ) {
    // In browser, AMD or Globals
    // Module is set to the global window object
    var result = set_module( module );
    
    if ( has_define ) module.exports = result;
    
    return window[ 'umd_define' ] = result;
  }
  
  // Node
  // Requires to first set module, that of the module being defined, not to confuse with this module object
  // set_module also allows to set node base directory using __dirname
  module.exports = set_module;
  
  function set_module( module, node_require ) {
    
    return set_options;
    
    function set_options( options ) {
      // ToDo: handle circular dependencies
      // var extend = ( node_require || require_global )( './extend' );
      // ToDo: options = extend( {}, default_options, require( 'umd_define_options' ), options );
      options || ( options = default_options );
      
      return umd_define;
      
      function umd_define( name, dependencies, factory ) {
        // name and factory are required, only dependencies is an optional parameter w/ umd_define()
        
        // name is required to allow bundling without code transforms.
        if ( ! factory ) {
          factory = dependencies;
          dependencies = null;
        }
        
        // ToDo: allow factory to be an non-function
        
        // Don't require more dependencies than used by factory()
        var factory_length = factory._length || factory.length;
        
        dependencies = ( dependencies || [ 'require', 'exports', 'module' ] ).slice( 0, factory_length );
        
        if ( has_define ) {
          var parameters = [ dependencies, factory ];
          
          options.use_name && parameters.unshift( options.amd_name || name );
          
          define.apply( module, parameters );
          
          /*
             If module is to be defined as a window global, require it immediately
             This guaranties that module is executed and allows to set window
             https://github.com/umdjs/umd globals using a function wrapper does not work
             unless the module is later required, which is not guarantied if other modules
             assume global dependencies
          */
          options.amd_global && require( [ name ], function( exports ) {
            window[ name ] = exports;
          } );
        } else if ( exports ) {
          // Node
          var result = call_factory( node_require );
          
          if ( result ) module.exports = result;
        } else {
          // Globals
          set_private_module( name, call_factory( require_global ) || {}, options );
        }
        
        function call_factory( require ) {
          var specials_dependencies = {
            require: require,
            exports: {},
            module : module
          };
          
          return factory.apply( module, dependencies.map( _require ) );
          
          function _require( dependency ) {
            return specials_dependencies[ dependency ] || require( dependency );
          } // _require()
        } // call_factory()
      } // umd_define()
    } // set_options()
  } // set_module()
  
  function require_global( dependency ) {
    var name = dependency.split( '/' ).pop();
    
    console.log( 'require_global(), name:', name );
    
    // ToDo: call module factory function lazyly only upon first require
    var exports = private_modules[ name ] || window[ name ];
    
    if ( exports ) return exports;
    
    throw new ReferenceError( '"' + name + '" is not defined' );
  } // require_global()
  
  function set_private_module( name, exports, options ) {
    console.log( 'set_private_module', name, Object.prototype.toString( exports ), options );
    
    private_modules[ name ] = exports;
    
    if ( options.global ) {
      var previous = window[ name ];
      
      window[ name ] = exports;
      
      if ( options.add_no_conflict && ! exports.noConflict  ) {
        exports.noConflict = no_conflict;
      }
    }
    
    function no_conflict() {
      window[ name ] = previous;
      
      return exports;
    }
  } // set_private_module()
} ); // umd_define.js
