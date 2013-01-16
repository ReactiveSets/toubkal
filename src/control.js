/*  control.js

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

( function( exports ) {
  var XS;

  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
  } else {
    XS = exports.XS;
  }

  var log        = XS.log
    , subclass   = XS.subclass
    , extend     = XS.extend
    , Code       = XS.Code
    , Connection = XS.Connection
    , Set        = XS.Set
    , Ordered_Set= XS.Ordered_Set
  ;

  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;

  function ug( m ) {
    log( "xs control, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Control()
  */
  
  function Control( options ) {
    Set.call( this, [], options );
    
    return this;
  } // Control()
  
  subclass( Set, Control );
  
  extend( Control.prototype, {
    add: function( objects ) {
      Set.prototype.add.call( this, objects );
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      Set.prototype.remove.call( this, objects );
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      Set.prototype.update.call( this, objects );
      
      return this;
    } // update
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Control' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // control.js