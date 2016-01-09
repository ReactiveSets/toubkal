/*  local_storage.js
    
    Copyright (c) 2013-2016, Reactive Sets

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
undefine()( 'local_storage', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS  = rs.RS
    , Set = RS.Set
    , log = RS.log.bind( null, 'local storage' )
    , de  = false
    , ug  = log
  ;
  
  /* -------------------------------------------------------------------------------------------
     local_storage( flow, options )
     
     A multiton pipelet to get / set values for flow using the Web Storage API.
     
     Parameters:
     - flow    (String): unique flow attribute value to differentiate singletons and serve
       as a prefix to all key values in Web Storage API.
     
     - options (Object):
       - key (Array of Strings): attribute names uniquely identifying values the set, used
         to build keys for the Web Storage API. Default is [ 'id' ]
         
       - storage (Web Storage API Object): default is localStorage, the only other possible
         value is sessionStorage, providing any other object with throw an Error.
     
     Example: Store multiple sets in localStorage;
       var dataflows = [
         { id: 'users'    },
         { id: 'profiles' },
         { id: 'groups'   }
       ]
       
       source.dispatch( dataflows, function( source, options ) {
         var flow = this.id;
         
         return source
           .flow         ( flow )
           
           .local_storage( flow, { key: this.key, storage: this.storage } )
           
           .flow         ( flow ) // to improve fetch() performance of output union
         ;
       } )
  */
  var storage_singletons = {}, storage_singletons_count = 0; // multiton
  
  function get_multiton_key( flow, storage ) {
    switch ( storage ) {
      case localStorage:
        storage = 1;
      break;
      
      case sessionStorage:
        storage = 0;
      break;
      
      default:
      throw new Error( 'Invalid storage object, expected localStorage or sessionStorage' );
    }
    
    return flow + '#' + storage;
  } // get_multiton_key()
  
  function Local_Storage( flow, options ) {
    var storage      = options.storage || localStorage
      , multiton_key = get_multiton_key( flow, storage )
      , singleton    = storage_singletons[ multiton_key ]
    ;
    
    if ( singleton ) return singleton;
    
    storage_singletons[ multiton_key ] = this;
    
    if ( 0 == storage_singletons_count++ ) add_storage_listener();
    
    this._storage = storage;
    this._flow    = flow;
    
    // Read initial state
    var values = Object
      .keys  ( storage   )
      .filter( from_flow )
      .map   ( get_value )
    ;
    
    Set.call( this, [], options );
    
    this.a = values;
    
    function from_flow( key ) {
      return flow == key.substring( 0, key.indexOf( '#' ) );
    }
    
    function get_value( key ) {
      return JSON.parse( storage.getItem( key ) );
    }
  } // Local_Storage()
  
  Set.Build( 'local_storage', Local_Storage, function( Super ) { return {
    _make_key: function( value ) {
      return this._flow + '#' + this.make_key( value );
    }, // _make_key()
    
    _add: function( values, options ) {
      var that    = this
        , storage = this._storage
        , _values = []
      ;
      
      values.forEach( function( value ) {
        var key      = that._make_key( value )
          , existing = storage.getItem( key )
        ;
        
        if ( existing ) {
          // ToDo: handle duplicate keys
          log( '_add(), duplicate key', { key: key, value: value, existing: existing } );
        } else {
          storage.setItem( key, JSON.stringify( value ) );
          
          _values.push( value );
        }
      } );
      
      Super._add.call( this, _values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      var that    = this
        , storage = this._storage
        , _values = []
      ;
      
      values.forEach( function( value ) {
        var key      = that._make_key( value )
          , existing = storage.getItem( key )
        ;
        
        if ( existing ) {
          storage.removeItem( key );
          
          _values.push( value );
        } else {
          // ToDo: handle not found
          log( '_remove(), key not found', { key: key, value: value } );
        }
      } );
      
      Super._remove.call( this, _values, options );
    } // _remove()
  } } ); // local_storage() instance methods
  
  // Replicate changes comming from other pages
  function add_storage_listener() {
    addEventListener( 'storage', function storage_listener( e ) {
      var key          = e.key
        , flow         = key.substring( 0, key.indexOf( '#' ) )
        , multiton_key = get_multiton_key( flow, e.storageArea )
        , singleton    = storage_singletons[ multiton_key ]
      ;
      
      if ( singleton ) {
        var added, removed;
        
        if ( e.oldValue ) removed = [ JSON.parse( e.oldValue ) ];
        if ( e.newValue ) added   = [ JSON.parse( e.newValue ) ];
        
        Set.prototype.__emit_operations.call( singleton, added, removed );
      }
    } ); // storage_listener()
  } // add_storage_listener()
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Local_Storage': Local_Storage } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} );
