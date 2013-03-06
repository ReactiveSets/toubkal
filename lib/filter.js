/*  filter.js

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

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( 'excess/lib/xs.js' ).XS;
    
    require( 'excess/lib/code.js' );
    require( 'excess/lib/pipelet.js' );
  } else {
    XS = exports.XS;
  }
  
  var log      = XS.log
    , Code     = XS.Code
    , Pipelet  = XS.Pipelet
  ;
  
  var push = Array.prototype.push;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs filter, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Filter()
  */
  function Filter( filter, options ) {
    this.filter = filter;
    
    return Pipelet.call( this, options );
  } // Filter()
  
  Pipelet.build( 'filter', Filter, {
    transform: function( objects ) {
      var filter = this.filter = Code.decompile( this.filter )
        , vars = [ '_out = []' ]
        , first, u, index = 'i', objects_variable = '_o'
      ;
      
      switch( typeof filter ) {
        case 'object': // { parameters: [ 'o' ], code: 'o.country === "Morocco"', condition: '' }
          var p = filter.parameters;
          
          if ( p.length ) {
            if ( p.length > 1 ) index = p[ 1 ];
            if ( p.length > 2 ) objects_variable = p[ 2 ];
            
            var o = p[ 0 ];
            
            vars.push( o );
            
            first = o + ' = ' + objects_variable + '[ ++' + index + ' ]; ' + filter.code + ' if ( ' + filter.condition + ' ) _out.push( ' + o + ' );';
            
            break;
          }
          
          filter = filter.f;
        // fall-through
        
        case 'function':
          vars.push( 'f = filter', 'o' );
          
          first = 'if ( f( o = _o[ ++i ], i, _o ) ) _out.push( o );';
        break;
      }
      
      vars.push( index + ' = -1', 'l = ' + objects_variable + '.length' );
      
      eval( new Code()
        ._function( 'this.transform', null, [ objects_variable ] )
          ._var( vars )
          
          .unrolled_while( first, u, u, { index: index } )
          
          .add( 'return _out' )
        .end( 'Filter.transform()' )
        .get()
      );
      
      return this.transform( objects );
    }, // transform()
    
    get: function() {
      return this.source ? this.transform( this.source.get() ) : [];
    }, // get()
    
    add: function( objects ) {
      var added = this.transform( objects );
      
      added.length && this.emit_add( added );
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      var removed = this.transform( objects );
      
      removed.length && this.emit_remove( removed );
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      var filter = this.filter;
      
      switch( typeof filter ) {
        case 'object':
          filter = filter.f;
        // fall-through
        
        case 'function':
          this.update = function( updates ) {
            var l = updates.length, f = filter, removed = [], updated = [], added = [];
            
            for ( var i = -1; ++i < l; ) {
              var u = updates[ i ], u0 = u[ 0 ], u1 = u[ 1 ], fu1 = f( u1 );
              
              if ( f( u0 ) ) {
                if ( fu1 ) {
                  updated.push( u );
                } else {
                  removed.push( u0 );
                }
              } else if ( fu1 ) {
                added.push( u1 );
              }
            }
            
            removed.length && this.emit_remove( removed );
            updated.length && this.emit_update( updated );
            added  .length && this.emit_add   ( added   );
            
            return this;
          };
          
          return this.update( updates );
        break;
      }
    } // update()
  } ); // Filter instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Filter' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // filter.js
