/*  loggable.js
    
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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'loggable',

[      './console_logger', './subclass', './extend' ],

function( Console_Logger,     subclass,     extend ) {
  'use strict';
  
  var log   = Console_Logger().bind( null, 'loggable' )
    , debug = true
  ;
  
  /* -------------------------------------------------------------------------------------------
     Loggable( name? )
     
     Enhanced Base Class providing logging services
     
     Parameters:
     - name (Optional String): instance name for debugging purposes defaults to locally unique
       integer
     
     Interface:
     - _class_name (String): the name of this class
  */
  var loggables = 0;
  
  function Loggable( name ) {
    ++loggables;
    
    this.__options = {};
    
    this._set_options( { name: this.constructor.class_name + '( ' + ( name || ( '#' + loggables ) ) + ' )' } );
  } // Loggable()
  
  subclass( null, Loggable, {
    /* ------------------------------------------------------------------------
       _set_options( options )
       
       Sets instance options properties. Modifies only provided attributes
    */
    _set_options: function _set_options( _options ) {
      extend( this.__options, _options );
      
      return this;
    }, // _set_options()
    
    /* ------------------------------------------------------------------------
       _get_options()
       
       Returns options object, may then be alterned by caller
    */
    _get_options: function _get_options( _options ) { return this.__options },
    
    /* ------------------------------------------------------------------------
       _get_name( method_name )
       
       Returns a name of this instance, optionaly with a method name.
       
       Parameters:
       - method_name (Optional String): name of the method getting the name.
    */
    _get_name: function _get_name( method_name ) {
      return method_name
        ? this.__options.name +  '..' + method_name + '(), '
        : this.__options.name
      ;
    }, // _get_name()
    
    _is_a: function( class_name ) {
      return this.constructor.class_names[ class_name ];
    } // _is_a()
  } ) // Loggable instance prototyper
  
  // Loggable class attributes
  var Loggable_Class_Attributes = {
    class_name: 'Loggable',
    
    classes: function _classes() {
      var classes = [], parent = this;
      
      while( parent ) {
        classes.push( parent );
        
        parent = parent.parent_class;
      }
      
      return classes;
    }, // Loggable.classes()
    
    subclass: function( class_name, derived, methods ) {
      if ( typeof class_name != 'string' ) throw new Error( 'Loggable(), class_name must be a string' );
      
      subclass( this, derived, methods );
      
      extend( derived, Loggable_Class_Attributes );
      
      derived.class_name = class_name;
      
      var class_names = derived.class_names = {};
      
      derived
        .classes()
        
        .forEach( function( _class ) {
          class_names[ _class.class_name ] = true
        } )
      ;
      
      debug && log( 'class "' + class_name + '" subclassed from', Object.keys( class_names ).slice( 1 ) );
      
      return derived;
    } // Loggable.subclass()
  }; // Loggable_Class_Attributes
  
  Loggable.get_name = function( object, fn ) {
    return object && object._get_name? object._get_name( fn ) : '';
  };
  
  extend( Loggable, Loggable_Class_Attributes );
  
  debug && log( 'module loaded' );
  
  return Loggable;
} ); // loggable.js
