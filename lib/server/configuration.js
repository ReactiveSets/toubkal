/*  configuration.js

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

var XS = require( '../json.js' ).XS
  , xs = XS.xs
  , extend = XS.extend
  , log = XS.log
  , Pipelet = XS.Pipelet
;

require( './file.js' );

/* -------------------------------------------------------------------------------------------
   de&&ug()
*/
var de = true;

function ug( m ) {
  log( "xs configuration, " + m );
} // ug()

/* -------------------------------------------------------------------------------------------
   xs.configuration( [ options ] )
   
   Read (-only for now) a JSON configuration file and emits a dataflow of changes on that file
   .
   
   Parameters:
     - options: (Object) optional attributes:
       - configuration_filename: (String) the name of the configuration file to read, defaults
         to ~/config.xs.json
*/
XS.Compose( 'configuration', function( source, options ) {
  // ToDo: allow writing configuration
  // source.set_to_content().to_JSON().file();
  
  return xs
    .set( [ { name: options.configuration_filename || '~/config.xs.json' } ] )
    .watch()
    .parse_JSON()
    .content_to_set()
    .trace( 'config.xs.json parsed' )
  ;
} );

Pipelet.build( 'content_to_set', function( options ) {
    return Pipelet.call( this, options );
  },
  
  {
    add: function( values, options ) {
      return this.emit_add( values[ 0 ].content, options );
    },
    
    remove: function( values, options ) {
      return this.emit_remove( values[ 0 ].content, options );
    },
    
    update: function( updates, options ) {
      var update = updates[ 0 ];
      
      return this.emit_operations( update[ 1 ].content, update[ 0 ].content, null, options ); 
    },
  }
);

/* --------------------------------------------------------------------------
   module exports
*/
eval( XS.export_code( 'XS', [] ) );

de&&ug( "module loaded" );

// configuration.js
