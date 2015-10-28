/*  client_assets.js
    
    ----
    
    Copyright (C) 2013-2015, Reactive Sets
    
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

var rs = require( '../core/order.js' );

require( './file.js'   );
require( './uglify.js' );

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true, ug = rs.RS.log.bind( null, 'client_assets' );

// NPM Dependencies
exports.npm_dependencies = rs.set( [
  { name: 'node-uuid/uuid.js'                           },
  { name: 'undefine'                                    }
] ).require_resolve();

// ES5 shims
// ToDo: move these shims to a third-party directory, or better, an npm dependency
exports.es5_shim = rs.set( [
  { name: 'toubkal/test/javascript/es5-shim.js'         },
  { name: 'toubkal/test/javascript/json2.js'            }
] ).require_resolve();

// Toubkal core
exports.core = rs.set( [
  { name: 'toubkal/lib/util/lap_timer.js'                    },
  { name: 'toubkal/lib/util/timestamp_string.js'             },
  { name: 'toubkal/lib/util/console_logger.js'               },
  { name: 'toubkal/lib/util/lazy_logger.js'                  },
  { name: 'toubkal/lib/util/extend.js'                       },
  { name: 'toubkal/lib/util/subclass.js'                     },
  { name: 'toubkal/lib/util/loggable.js'                     },
  { name: 'toubkal/lib/util/code.js'                         },
  { name: 'toubkal/lib/util/event_emitter.js'                },
  { name: 'toubkal/lib/util/value_equals.js'                 },
  { name: 'toubkal/lib/core/RS.js'                           },
  { name: 'toubkal/lib/core/query.js'                        },
  { name: 'toubkal/lib/core/transactions.js'                 },
  { name: 'toubkal/lib/core/pipelet.js'                      },
  { name: 'toubkal/lib/core/filter.js'                       },
  { name: 'toubkal/lib/core/order.js'                        },
  { name: 'toubkal/lib/core/aggregate.js'                    },
  { name: 'toubkal/lib/core/join.js'                         },
  { name: 'toubkal/lib/core/input_set.js'                    }
] ).require_resolve();

// Socket.io pipelets
exports.socket_io = rs.set( [
  { name: 'toubkal/lib/socket_io/socket_io_crossover.js'     },
  { name: 'toubkal/lib/socket_io/socket_io_server.js'        }
] ).require_resolve();

// Bootstrap pipelets
exports.bootstrap = rs.set( [
  { name: 'toubkal/lib/bootstrap/bootstrap_carousel.js'      },
  { name: 'toubkal/lib/bootstrap/bootstrap_photo_album.js'   }
] ).require_resolve();

// Other useful client pipelets
exports.utils = rs.set( [
  { name: 'toubkal/lib/core/json.js'                         },
  { name: 'toubkal/lib/core/uri.js'                          },
  { name: 'toubkal/lib/core/events.js'                       },
  { name: 'toubkal/lib/core/transforms.js'                   },
  { name: 'toubkal/lib/core/next.js'                         },
  { name: 'toubkal/lib/core/last.js'                         }
] ).require_resolve();

// Browser client pipelets
exports.ui = rs.set( [
  { name: 'toubkal/lib/client/selector.js'                   },
  { name: 'toubkal/lib/client/animation_frames.js'           },
  { name: 'toubkal/lib/client/url.js'                        },
  { name: 'toubkal/lib/client/table.js'                      },
  { name: 'toubkal/lib/client/control.js'                    },
  { name: 'toubkal/lib/client/form.js'                       },
  { name: 'toubkal/lib/client/local_storage.js'              },
  { name: 'toubkal/lib/client/load_images.js'                }
] ).require_resolve();

exports.react = rs.set( [
  { name: 'toubkal/lib/react/react.js'                       }
] ).require_resolve();
  
// All toubkal assets
exports.toubkal = rs.union( [
  exports.npm_dependencies,
  exports.core,
  exports.utils,
  exports.socket_io,
  exports.ui,
  exports.bootstrap
] );

var built_assets = {};

exports.build = function( name, assets ) {
  // This is a multiton factory, where instances are associated to name
  
  return built_assets[ name ] || ( built_assets[ name ] = assets
  
    .auto_increment( { name: name } ) // will auto-increment the id attribute starting at 1
    
    // Update file contents in realtime
    .watch()
    
    // Maintain up-to-date file contents in order
    .order( [ { id: 'id' } ] )
    
    // Update minified toubkal-min.js and source map in realtime
    .uglify( name, { warnings: false } )
  );
}; // exports.build()

// lib/toubkal-min.js
exports.toubkal_min = function() {
  return exports.build( 'lib/toubkal-min.js', exports.toubkal );
}; // exports.toubkal_min()

de&&ug( "module loaded" );
