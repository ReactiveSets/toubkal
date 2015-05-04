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
!function( exports ) {
  "use strict";
  
  var RS = require( 'toubkal' ).RS
    , rs      = RS.rs
    , log     = RS.log
  ;
  
  require( 'toubkal/lib/order.js' );
  require( 'toubkal/lib/server/file.js' );
  require( 'toubkal/lib/server/uglify.js' );
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log.bind( null, 'client_assets.js' );
  
  // NPM Dependencies
  exports.npm_dependencies = rs.set( [
    { name: 'node-uuid/uuid.js'                           }
  ] ).require_resolve();
  
  // ES5 shims
  exports.es5_shim = rs.set( [
    { name: 'toubkal/test/javascript/es5.js'              },
    { name: 'toubkal/test/javascript/json2.js'            }
  ] ).require_resolve();
  
  // Toubkal core
  exports.core = rs.set( [
    { name: 'toubkal/lib/lazy_logger.js'                  },
    { name: 'toubkal/lib/rs.js'                           },
    { name: 'toubkal/lib/code.js'                         },
    { name: 'toubkal/lib/query.js'                        },
    { name: 'toubkal/lib/transactions.js'                 },
    { name: 'toubkal/lib/pipelet.js'                      },
    { name: 'toubkal/lib/filter.js'                       },
    { name: 'toubkal/lib/order.js'                        },
    { name: 'toubkal/lib/aggregate.js'                    },
    { name: 'toubkal/lib/join.js'                         }
  ] ).require_resolve();
  
  // Socket.io pipelets
  exports.socket_io = rs.set( [
    { name: 'toubkal/lib/socket_io_crossover.js'          },
    { name: 'toubkal/lib/client/socket_io_server.js'      }
  ] ).require_resolve();
  
  // Bootstrap pipelets
  exports.bootstrap = rs.set( [
    { name: 'toubkal/lib/client/bootstrap_carousel.js'    },
    { name: 'toubkal/lib/client/bootstrap_photo_album.js' }
  ] ).require_resolve();
  
  // Other useful client pipelets
  exports.utils = rs.set( [
    { name: 'toubkal/lib/json.js'                         },
    { name: 'toubkal/lib/uri.js'                          },
    { name: 'toubkal/lib/events.js'                       },
    { name: 'toubkal/lib/transforms.js'                   },
    { name: 'toubkal/lib/last.js'                         }
  ] ).require_resolve();
  
  // User Interface pipelets
  exports.ui = rs.set( [
    { name: 'toubkal/lib/client/selector.js'              },
    { name: 'toubkal/lib/client/animation_frames.js'      },
    { name: 'toubkal/lib/client/url.js'                   },
    { name: 'toubkal/lib/client/table.js'                 },
    { name: 'toubkal/lib/client/control.js'               },
    { name: 'toubkal/lib/form.js'                         },
    { name: 'toubkal/lib/client/load_images.js'           }
  ] ).require_resolve();
  
  // All toubkal assets
  exports.toubkal = rs.union( [
    exports.npm_dependencies,
    exports.es5_shim,
    exports.core,
    exports.utils,
    exports.socket_io,
    exports.ui,
    exports.bootstrap
  ] );
  
  // lib/toubkal-min.js
  exports.toubkal_min = exports
    .toubkal
    
    .auto_increment( { name: 'toubkal assets' } ) // will auto-increment the id attribute starting at 1
    
    // Update file contents in realtime
    .watch()
    
    // Maintain up-to-date file contents in order
    .order( [ { id: 'id' } ] )
    
    // Update minified toubkal-min.js and source map in realtime
    .uglify( 'lib/toubkal-min.js', { warnings: false } )
  ;
  
  de&&ug( "module loaded" );
} ( this );
