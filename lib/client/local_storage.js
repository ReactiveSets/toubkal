/*  local_storage.js
    
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
undefine()( 'local_storage', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS  = rs.RS
    , Set = RS.Set
    , log = RS.log.bind( null, 'local storage' )
    , de  = false
    , ug  = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet local_storage( flow, options )
      
      @short A @@multiton to store values for flow using the Web Storage API
      
      @parameters
      - **flow** (String): unique flow attribute value to differentiate
        singletons and serve as a prefix to all identity values in Web
        Storage API.
      
      - **options** (Object):
        - **key** (Array of Strings): set's @@identity, used to build keys for
          the Web Storage API. Default is ```[ 'id' ]```.
          
        - **storage** (Web Storage API Object): default is ```localStorage```, the
          only other possible value is sessionStorage, providing any
          other object with throw an Error.
      
      @examples
      Store multiple dataflows in localStorage;
      ```javascript
        var dataflows = [
          { id: 'users'    },
          { id: 'profiles' },
          { id: 'groups'   }
        ]
        
        source.dispatch( dataflows, function( source, options ) {
          var flow = this.id;
          
          return source
            .flow         ( flow )
            
            .local_storage( flow, { key: this.key } )
            
            // Only allow fetching from queries with same flow
            // Therefore improving fetch performance
            .flow         ( flow )
          ;
        } )
      ```
      
      @description
      
      This is a @@synchronous, @@stateful, @@greedy @@multiton.
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
    var that         = this
      , storage      = options.storage || localStorage
      , multiton_key = get_multiton_key( flow, storage )
      , singleton    = storage_singletons[ multiton_key ]
    ;
    
    if ( singleton )
      return singleton
    ;
    
    storage_singletons[ multiton_key ] = that;
    
    if ( 0 == storage_singletons_count++ )
      add_storage_listener()
    ;
    
    that._storage = storage;
    that._flow    = flow;
    
    // Read initial state
    var values = Object
      .keys  ( storage   )
      .filter( from_flow )
      .map   ( get_value )
    ;
    
    Set.call( that, [], options );
    
    that.a = values;
    
    function from_flow( key ) {
      return flow == key.substring( 0, key.indexOf( '#' ) );
    }
    
    function get_value( key ) {
      return JSON.parse( storage.getItem( key ) );
    }
  } // Local_Storage()
  
  Set.Build( 'local_storage', Local_Storage, function( Super ) { return {
    _flow_identity: function( value ) {
      return this._flow + this._identity( value );
    }, // _flow_identity()
    
    _add: function( values, options ) {
      var that    = this
        , storage = that._storage
        , _values = []
      ;
      
      values.forEach( function( value ) {
        var id       = that._flow_identity( value )
          , existing = storage.getItem( id )
        ;
        
        if ( existing )
          // ToDo: handle duplicate identities
          log( '_add(), duplicate identity', { id: id, value: value, existing: existing } );
        
        else {
          storage.setItem( id, JSON.stringify( value ) );
          
          _values.push( value );
        }
      } );
      
      Super._add.call( that, _values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      var that    = this
        , storage = that._storage
        , _values = []
      ;
      
      values.forEach( function( value ) {
        var id = that._flow_identity( value );
        
        if ( storage.getItem( id ) ) {
          storage.removeItem( id );
          
          _values.push( value );
        } else
          // ToDo: handle not found
          log( '_remove(), id not found', { id: id, value: value } )
        ;
      } );
      
      Super._remove.call( that, _values, options );
    } // _remove()
  } } ); // local_storage() instance methods
  
  // Replicate changes comming from other pages
  function add_storage_listener() {
    addEventListener( 'storage', function storage_listener( e ) {
      var id           = e.key
        , flow         = id.substring( 0, id.indexOf( '#' ) ) // !! Assumes Pipelet.._identity() returns string starting with "#" and flow does not contain a "#" sign
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
  RS.Local_Storage = Local_Storage;
  
  return rs;
} );
