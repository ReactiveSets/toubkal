/*  http.js
    
    tests for http.js
    
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

var xs      = require( '../lib/pipelet.js' )
  , XS      = xs.XS
  , log     = XS.log
  , extend  = XS.extend
;

require( '../lib/server/http.js' )
require( '../lib/server/socket_io_clients.js' );
require( '../lib/server/file.js' );

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true;
  
function ug( m ) {
  log( "xs tests http, " + m );
} // ug()
  
/* -------------------------------------------------------------------------------------------
   Start HTTP Servers
*/
var servers = xs.set( [
    { ip_address: '0.0.0.0' },
    { port: 8080 },
    { port: 8043, key: '', cert: '' }, // https server usimg key and cert
    { port: 8044, pfx: '' }, // https server using pfx
  ] )
  .auto_increment()
  .http_servers()
;

/* -------------------------------------------------------------------------------------------
   Load and Serve Assets
*/
require( '../lib/server/uglify.js' );
require( '../lib/order.js' );

// XS Dependencies
var xs_dependencies = xs
  .set( [
    { name: 'node-uuid/uuid.js'          },
  ] )
  .require_resolve()
;

// lib/xs-min.js
var xs_min = xs
  .union( [ xs_dependencies, xs.set( [
    // IE compatibility
    { name: 'test/javascript/es5.js'       },
    { name: 'test/javascript/json2.js'     },
    
    // xs core
    { name: 'lib/xs.js'                    },
    { name: 'lib/code.js'                  },
    { name: 'lib/pipelet.js'               },
    { name: 'lib/filter.js'                },
    { name: 'lib/order.js'                 },
    { name: 'lib/aggregate.js'             },
    { name: 'lib/join.js'                  },
    
    // xs utilities
    { name: 'lib/json.js'                  },
    { name: 'lib/uri.js'                   },
    { name: 'lib/events.js'                },
    
    // xs socket.io
    { name: 'lib/socket_io_crossover.js'   },
    { name: 'lib/socket_io_server.js'      },
    
    // xs client
    { name: 'lib/selector.js'              },
    { name: 'lib/table.js'                 },
    { name: 'lib/control.js'               },
    { name: 'lib/form.js'                  },
    { name: 'lib/load_images.js'           },
    
    // bootstrap
    { name: 'lib/bootstrap_carousel.js'    },
    { name: 'lib/bootstrap_photo_album.js' },
  ] ) ] )
  
  .auto_increment( { name: 'javascript assets' } ) // will auto-increment the id attribute starting at 1
  
  // Update file contents in realtime
  .watch()
  
  // Maintain up-to-date file contents in order
  .order( [ { id: 'id' } ] )
  
  // Update minified xs-min.js and source map in realtime  
  .uglify( 'lib/xs-min.js', { warnings: false } )
;

var mocha_css = xs
  .set( [ { name: 'mocha/mocha.css' } ] )
  .require_resolve()
  .watch()
;

var mocha_expect = xs.set( [
    { name: 'mocha/mocha.js'      },
    { name: 'expect.js/expect.js' }
  ] )
  .require_resolve()
  .auto_increment() // will auto-increment the id attribute starting at 1
  .watch()
  .order( [ { id: 'id' } ] ) // order loaded files
  .uglify( 'test/javascript/mocha_expect-min.js' )
  .union( [ mocha_css ] )
;

var tests = xs
  .set( [
    // HTML test pages
    { name: 'test/index.html'                  },
    { name: 'test/index-min.html'              },
    
    { name: 'test/bootstrap_photo_album.html'  },
    { name: 'test/carousel.html'               },
    { name: 'test/control.html'                },
    { name: 'test/form.html'                   },
    { name: 'test/load_images.html'            },
    { name: 'test/load_images-min.html'        },
    { name: 'test/socketio.html'               },
    { name: 'test/table.html'                  },
    { name: 'test/table_controls.html'         },
    { name: 'test/ui.html'                     },
    
    // JavaScript for tests
    { name : 'test/javascript/jquery-1.10.2.min.js' },
    
    // Bootstrap
    { name: 'test/bootstrap/css/bootstrap.css' },
    { name: 'test/bootstrap/js/bootstrap.js'   },
    
    // CSS for tests
    { name: 'test/css/mocha.css'               },
    { name: 'test/css/table.css'               },
    { name: 'test/css/xs_tests.css'            },
    
    // Images for tests
    { name: 'test/css/images/ok.png'           },
    { name: 'test/css/images/error.png'        },
  ] )
  
  .watch( { base_directory: __dirname + '/..' } )
;

var coffee_source = xs.set( [
    { name: 'test/xs_tests_utils.coffee'       },
    { name: 'test/xs_core.coffee'              },
    { name: 'test/xs_ui_tests.coffee'          },
    { name: 'test/xs_form_tests.coffee'        },
    { name: 'test/xs_load_images_tests.coffee' },
    { name: 'test/xs_control_tests.coffee'     },
    { name: 'test/xs_table_tests.coffee'       },
  ] )
  
  .watch( { base_directory: __dirname + '/..' } )
;

var compiled_coffee = xs.set( [
    { name: 'test/xs_tests_utils.js'           },
    { name: 'test/xs_core.js'                  },
    { name: 'test/xs_ui_tests.js'              },
    { name: 'test/xs_form_tests.js'            },
    { name: 'test/xs_load_images_tests.js'     },
    { name: 'test/xs_control_tests.js'         },
    { name: 'test/xs_table_tests.js'           },
  ] )
  
  .watch( { base_directory: __dirname + '/..' } )
  
  .alter( function( v ) {
    // Fix Coffee-script sourceMappingURL
    v.content = v.content
      .replace( /\/\/@ sourceMappingURL=/, '//# sourceMappingURL=' )
    ;
  } )
;

var source_maps = xs.set( [
    { name: 'test/xs_tests_utils.map'          },
    { name: 'test/xs_core.map'                 },
    { name: 'test/xs_ui_tests.map'             },
    { name: 'test/xs_form_tests.map'           },
    { name: 'test/xs_load_images_tests.map'    },
    { name: 'test/xs_control_tests.map'        },
    { name: 'test/xs_table_tests.map'          },
  ] )
  .watch( { base_directory: __dirname + '/..' } )
  .alter( function( v ) {
    // Fix Coffee-script source map 
    v.content = v.content
      .replace( /"sourceRoot": ".."/, '"sourceRoot": ""' )
      .replace( /test\\\\/, '' )
      .replace( /test[\/]/, '' )
    ;
  } )
;

// Serve assets to http servers
xs.union( [ xs_min, mocha_expect, tests, compiled_coffee, source_maps, coffee_source ] )
  .serve( servers, { hostname: [ 'localhost', '127.0.0.1' ] } )
;

// Socket.io Server tests
var clients = servers.socket_io_clients( { remove_timeout: 10 } );

var source_set = xs.set( [ {}, {}, {}, {} ] ).auto_increment()
  , source_1 = xs.set( [ {}, {}, {}, {}, {} ] ).auto_increment()
;

xs.union( [
    source_set.set_flow( 'source' ),
    source_1.set_flow( 'source_1' )
  ] )

  .trace( 'to socket.io clients' )
  
  .dispatch( clients, function( source, options ) {
    de&&ug( 'creating socket_io client id: ' + this.id );
    
    var input  = source.plug( this.socket )
      , output = input.trace( 'from socket.io clients' )
    ;
    
    return { input: input, output: output };
  }, { no_encapsulate: true, input_output: true } )
  .set()
;

setInterval( function() {
  source_set.add( [ {} ] ); // this should add to the input of the auto_increment() pipelet of source_set
} , 10000 )
