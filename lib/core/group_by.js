/*  group_by.js
    
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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'group_by', [ './stateful' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , extend       = RS.extend
    , extend_2     = extend._2
    , log          = RS.log.bind( null, 'transforms' )
    , de           = false
    , ug           = log
    , get_name     = RS.get_name
    , Pipelet      = RS.Pipelet
    , Set          = RS.Set
    , value_equals = RS.value_equals
    , Options      = RS.Transactions.Options
    , has_more     = Options.has_more
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet group( by, options )
      
      @short Groups values using ```by()``` into content attribute.
      
      @parameters
      - **by** (Function( Object ) -> Object): optional, returns a
        value uniquely identifying output value groups. It defines the
        equivalent of dimensions in pipelet aggregate().
        
        Default is ```function() { return { id: 1 } }``` which groups all
        values in the set into a single group which id is 1.
      
      - **options** (Object): optional pipelet options
        - **key** (Array of Strings): output @@key attributes, default is
          ```Object.keys( by( {} ) )```. It should usually match the the keys
          of objects returned by ```by()```, or a subset of these keys.
        
        - **content** (String): name of attribute which contains values,
          default is ```"content"```
        
        - **initial_groups** (Array of groups): Optional groups initialized
          as empty groups, i.e. with their content attribute set as an empty
          Array - e.g. ```{ id: 1, content: [] }```. Each group should be
          defined with the same attributes returned by ```by()```.
          These groups are never deleted when they become empty after a
          remove operation.
      
      @examples
      ```javascript
        rs.set( [
            { country: 'England', city: 'London'      },
            { country: 'France' , city: 'Paris'       },
            { country: 'France' , city: 'Marseille'   },
            { country: 'England', city: 'Manchester'  },
            { country: 'England', city: 'Liverpool'   },
            { country: 'France' , city: 'Lille'       },
            { country: 'France' , city: 'Caen'        },
            { country: 'England', city: 'Southampton' }
          ], { key: [ 'city' ] } )
          
          .group( by_country, { initial_groups: [ { country: 'Germany' }, { country: 'England' } ] } )
        ;
        
        function by_country( city ) {
          return { country: city.country }
        }
        
        /*
        ->
        [
          {
            country: 'Germany',
            
            content: []
          },
          
          {
            country: 'England',
            
            content: [
              { country: 'England', city: 'London'      },
              { country: 'England', city: 'Manchester'  },
              { country: 'England', city: 'Liverpool'   },
              { country: 'England', city: 'Southampton' }
            ]
          },
          
          {
            country: 'France',
            
            content: [
              { country: 'France' , city: 'Paris'       },
              { country: 'France' , city: 'Marseille'   },
              { country: 'France' , city: 'Lille'       },
              { country: 'France' , city: 'Caen'        }
            ]
          }
        ]
        *\/
      ```
      
      @description
      This is a @@stateful, @@greedy pipelet. It is @@synchronous at
      the end of a @@transaction, @@asynchronous when a @@transaction
      is in progress.
      
      It therefore only emits at the end of transactions.
      
      This pipelet currently ignores removed values before mathcing
      adds, i.e. it does not implement an @@antistate\.
  */
  function Group( by, options ) {
    var that           = this
      , groups         = {}
      , initial_groups = {}
      , content        = options.content || 'content'
    ;
    
    by = by || function() { return { id: 1 } };
    
    options.key = options.key || Object.keys( by( {} ) );
    
    that._by = by;
    
    // Working state within transactions, committed state is in Set..a
    // ToDo: Set should also have this notion of working and committed states
    that._groups = groups;
    
    that._initial_groups = initial_groups;
    
    // Changes within current transaction
    // ToDo: have one set of changes per transaction id, to run concurrent transactions in isolation
    that.  _added_groups = {};
    that._removed_groups = {};
    that._updated_groups = {};
    
    that._content = content;
    
    Set.call( that, [], options );
    
    that.a =
      ( options.initial_groups || [] )
      
      .map( function( group ) {
        var k = JSON.stringify( group );
        
        initial_groups[ k ] = true;
        
        groups[ k ]
          = group
          = extend_2( {}, group )
        ;
        
        group[ content ] = [];
        
        return group;
      } )
    ;
  } // Group()
  
  function clone_group( group, content ) {
    group = extend_2( {}, group );
    
    group[ content ] = group[ content ].slice();
    
    return group;
  } // clone_group()
  
  Set.Build( 'group', Group, {
    _emit_on_complete: function( options ) {
      if ( has_more( options ) ) return this;
      
      var that    = this
        , a       = that.a
        , groups  = that._groups
        
        , removed_groups = that._removed_groups
        , updated_groups = that._updated_groups
        
        ,   added = Object.keys( that._added_groups )
        , removed = Object.keys( removed_groups )
        , updated = Object.keys( updated_groups )
      ;
      
      added = added.map( function( group ) {
        group = groups[ group ];
        
        a.push( group );
        
        return group
      } );
      
      removed = removed.map( function( group ) {
        group = removed_groups[ group ]; // previous value before removal
        
        a.splice( that._a_index_of( group ), 1 );
        
        return group
      } );
      
      updated = updated.map( function( group ) {
        var updated_group = updated_groups[ group ]; // previous value before updates
        
        group = groups[ group ];
        
        a[ that._a_index_of( updated_group ) ] = group;
        
        return [ updated_group, group ]
      } );
      
      // Forget changes
      that.  _added_groups = {};
      that._removed_groups = {};
      that._updated_groups = {};
      
      de&&ug( get_name( that, '_emit_on_complete' ), 'added:', added.length, 'removed:', removed.length, 'updated', updated.length );
      
      return that.__emit_operations( added, removed, updated, options );
    }, // Group.._emit_on_complete()
    
    _add: function( values, options ) {
      var that    = this
        , by      = that._by
        , content = that._content
        , groups  = that._groups
        
        ,   added_groups = that.  _added_groups
        , updated_groups = that._updated_groups
      ;
      
      values
        .forEach( function( value ) {
          var key   = by( value )
            , k     = JSON.stringify( key )
            , group = groups[ k ]
          ;
          
          if ( group ) {
            if ( ! added_groups[ k ] && ! updated_groups[ k ] ) {
              updated_groups[ k ] = group;
              
              // clone group before adding a value to prevent modifying previous state that may have copies downstream
              groups[ k ] = group = clone_group( group, content );
            }
          } else {
            groups[ k ] = group = extend_2( {}, key )
            
            group[ content ] = [];
            
            added_groups[ k ] = true;
          }
          
          group[ content ].push( value );
        } )
      ;
      
      return that._emit_on_complete( options );
    }, // Group.._add()
    
    _remove: function( values, options ) {
      var that    = this
        , by      = that._by
        , content = that._content
        , groups  = that._groups
        , initial_groups = that._initial_groups
        , removed_groups = that._removed_groups
        , updated_groups = that._updated_groups
      ;
      
      values
        .forEach( function( value ) {
          var key   = by( value )
            , k     = JSON.stringify( key ) // ToDo: use that._identity( key )
            , group = groups[ k ]
          ;
          
          if ( group ) {
            var _content = group[ content ]
              , l = _content.length
              , i = -1
            ;
            
            while ( ++i < l )
              if ( value_equals( value, _content[ i ] ) ) { // ToDo: use source key for faster lookups
                if ( l == 1 && ! initial_groups[ k ] ) {
                  // this is the last value removed in this group, remove the entire group unless it is an initial group
                  if ( updated_groups[ k ] ) {
                    removed_groups[ k ] = updated_groups[ k ];
                    
                    delete updated_groups[ k ];
                  } else if ( ! removed_groups[ k ] ) {
                    // First time in this transaction a value is removed from this group
                    removed_groups[ k ] = group;
                  }
                  
                  delete groups[ k ];
                } else {
                  if ( ! updated_groups[ k ] ) {
                    // First time in this transaction a value is removed from this group
                    updated_groups[ k ] = group;
                    
                    // make a copy before removing value out of content, that would alter previous state that may have copies downstream
                    groups[ k ] = group = clone_group( group, content );
                  }
                  
                  group[ content ].splice( i, 1 );
                }
                
                return; // found this value
              }
          }
          
          // ToDo: group.._remove(): implement anti-state
          log( get_name( that, '_remove' ) + 'ignoring not found value:', value );
        } ) // forEach value
      ;
      
      return that._emit_on_complete( options );
    }, // Group.._remove()
    
    _update: Pipelet.prototype._update
  } ); // group() instance methods
  
  /* --------------------------------------------------------------------------
      module exports
  */
  RS.Group = Group;
  
  return rs;
} );
