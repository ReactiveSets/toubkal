/*  group_by.js
    
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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'group_by', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , extend       = RS.extend
    , extend_2     = extend._2
    , log          = RS.log.bind( null, 'transforms' )
    , Pipelet      = RS.Pipelet
    , Set          = RS.Set
    , value_equals = RS.value_equals
    , Options      = RS.Transactions.Options
    , has_more     = Options.has_more
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log;
  
  /* --------------------------------------------------------------------------
      @pipelet group( f, options )
      
      @short Groups input values by f() into output content attribute.
      
      @parameters
      - f( Object ) -> Object: returns a value uniquely identifying output
        value groups.
      
      - options (optional Object):
        - key (Array of Strings): output key attributes, default is source
          key.
        
        - content (String): name of attribute which contains values, default
          is "content"
        
        - initial_groups (Array of groups): Groups initialized as empty
          groups, i.e. with their content attribute set as an empty
          Array - e.g. ```{ content: [] }```. Each group should be defined
          with the same attributes as returned by ```f()```.
      
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
          
          .group( by_country, { key: [ 'country' ], initial_groups: [ { country: 'Germany' }, { country: 'England' } ] } )
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
      This is a @@stateful, @@greedy pipelet. It is @@synchronous on
      complete, @@asynchronous otherwise.
      
      It only emits on complete, i.e. at the end of transactions.
  */
  function Group( f, options ) {
    var that = this
      , groups = {}
      , content = options.content || 'content'
    ;
    
    that._f = f;
    
    that._groups = groups;
    
    that.  _added_groups = {};
    that._removed_groups = {};
    that._updated_groups = {};
    
    that._content = content;
    
    Set.call( that, [], options );
    
    that.a =
      ( options.initial_groups || [] )
      
      .map( function( group ) {
        groups[ JSON.stringify( group ) ]
          = group
          = extend_2( {}, group )
        ;
        
        group[ content ] = [];
        
        return group;
      } )
    ;
  } // Group()
  
  Set.Build( 'group', Group, {
    _emit_on_complete: function( options ) {
      if ( has_more( options ) ) return this;
      
      var groups = this._groups
      
        ,   added_groups = this.  _added_groups
        , removed_groups = this._removed_groups
        , updated_groups = this._updated_groups
        
        ,   added = Object.keys(   added_groups )
        , removed = Object.keys( removed_groups )
        , updated = Object.keys( updated_groups )
        
        , that = this
        , a    = this.a
      ;
      
      added = added.map( function( group ) {
        group = groups[ group ];
        
        a.push( group );
        
        return group;
      } );
      
      removed = removed.map( function( group ) {
        group = removed_groups[ group ]; // previous value before removal
        
        a.splice( that._a_index_of( group ), 1 );
        
        return group;
      } );
      
      updated = updated.map( function( group ) {
        var updated_group = updated_groups[ group ]; // previous value before updates
        
        group = groups[ group ];
        
        a[ that._a_index_of( updated_group ) ] = group;
        
        return [ updated_group, group ];
      } );
      
      // Forget changes
      this.  _added_groups = {};
      this._removed_groups = {};
      this._updated_groups = {};
      
      de&&ug( this._get_name( '_emit_on_complete' ), 'added:', added.length, 'removed:', removed.length, 'updated', updated.length );
      
      return this.__emit_operations( added, removed, updated, options );
    }, // _emit_on_complete()
    
    _add: function( values, options ) {
      var f       = this._f
        , content = this._content
        , groups  = this._groups
        
        ,   added_groups = this.  _added_groups
        , updated_groups = this._updated_groups
      ;
      
      values
        .forEach( function( value ) {
          var key   = f( value )
            , k     = JSON.stringify( key )
            , group = groups[ k ]
          ;
          
          if ( group ) {
            if ( !   added_groups[ k ]
              && ! updated_groups[ k ]
            ) {
              var clone = extend_2( {}, key );
              
              clone[ content ] = group[ content ].slice();
              
              updated_groups[ k ] = clone;
            }
          } else {
            group = groups[ k ] = extend_2( {}, key )
            
            group[ content ] = [];
            
            added_groups[ k ] = true;
          }
          
          group[ content ].push( value );
        } )
      ;
      
      return this._emit_on_complete( options );
    }, // _add()
    
    _remove: function( values, options ) {
      var f       = this._f
        , content = this._content
        , groups  = this._groups
        
        , removed_groups = this._removed_groups
        , updated_groups = this._updated_groups
      ;
      
      values
        .forEach( function( value ) {
          var key   = f( value )
            , k     = JSON.stringify( key )
            , group = groups[ k ]
          ;
          
          if ( group ) {
            var _content = group[ content ]
              , l = _content.length
              , i = -1
            ;
            
            while ( ++i < l ) {
              if ( value_equals( value, _content[ i ] ) ) {
                if ( l == 1 ) {
                  // this is the last value removed in this group, remove the entire group
                  if ( updated_groups[ k ] ) {
                    removed_groups[ k ] = updated_groups[ k ];
                    
                    delete updated_groups[ k ];
                  } else if ( ! removed_groups[ k ] ) {
                    // First time a value is removed from this group
                    removed_groups[ k ] = clone();
                  }
                  
                  delete groups[ k ];
                } else if ( ! updated_groups[ k ] ) {
                  // First time a value is removed from this group
                  updated_groups[ k ] = clone();
                }
                
                _content.splice( i, 1 );
                
                return;
              }
            }
          }
          
          // ToDo: group.._remove(): implement anti-state
          log( 'group.._remove(), ignoring not found value:', value );
          
          function clone() {
            var clone = extend_2( {}, key );
            
            clone[ content ] = group[ content ].slice();
            
            return clone;
          } // clone()
        } ) // forEach value
      ;
      
      return this._emit_on_complete( options );
    }, // _remove()
    
    _update: Pipelet.prototype._update
  } ); // group()
  
  /* -------------------------------------------------------------------------------------------
      module exports
  */
  RS.add_exports( {
    'Group': Group
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} );
