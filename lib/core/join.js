/*  join.js
    
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
    Distributable incremental joins.
    
    ---
    
    Joins are a major feature of relational databases, and a consequence of normalization.
    Most charded, and so-called NoSQL, databases try to avoid joins favoring denormalized
    schemas. The idea of building applications with no joins at all is very attractive
    and provides for simplified programming while greatly simplifying charded database
    implementations.
    
    However, some applications cannot be practically designed with no joins at all, and
    in some cases, the resulting duplication of data can become detrimental to desirable
    network performance especially over the internet between a mobile client and a server.
    
    For these reasons, Toubkal comes with joins that can be used both server-side,
    for complex applications, and client-side to optimize network performance and data
    caching.
    
    Designing efficient joins for these complex applications and allowing horizontal
    distribution aka charding is a significant challenge that this library tries to address.
    
    The other significant difficulty is that Reactive Sets are incremental, and therefore
    this implementation must update a join set incrementally and efficiently, when either
    of the joined sets changes.
    
    To simplify the implementation we split the join between two sets into two half-joins.
    Each half join maintains an ordered representation of one of the sets which is used
    as a filter to the other set. A Union of these two half-joins provides for join.
    
    Each half join is therefore stateful for one of the sets and stateless for the
    other. The stateful part destination is not used as it only serves as a dynamic
    filter for the stateless part. The only destination of the half-join is therefore
    that of the stateless part which means that the half join can be considered
    stateless and therefore easily distributed horizontally.
    
    When the filter of a half-join changes, there is no update emited. This would be
    incorrect if the other half join was not implemented simultaneously to form a
    proper join.
    
    ToDo: use filter() from one of the sets to load the other set only partially.
    Doing so would allow to to have only one of the sets to be stateful as well as
    improve network efficiency, loading only the filtered portion of the other set.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'join', [ './order' ], function( rs ) {
  'use strict';
  
  var RS      = rs.RS
    , extend  = RS.extend
    , Code    = RS.Code
    , Pipelet = RS.Pipelet
    , Greedy  = RS.Greedy
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true, ug = RS.log.bind( null, 'join' );
  
  /* -------------------------------------------------------------------------------------------
     a.join( b, on, merge, options )
     
     Parameters:
     - b (Pipelet): to join with 'a' (the source)
     
     - on (Array of conditions): the condition of the join, conditions definition bellow
     
     - merge (Function): function( a_value, b_value ) where a_value is an Object from the 'a'
       set, and b_value is an Object from the 'b' set that match the join condition.
       
       For a left join, b_value may be undefined, likewise, a_value may be undefined for
       a right join.
       
       The merge function must return an Object for the destination set and should
       alter neither a_value nor b_value. Altering a_value or b_value will produce
       side-effects on upstream dataflows.
         
     - options: (Object):
       - key (Array of Strings): Mandatory, the key for merged values
       
       - left  (Boolean): all values from a will produce at least one merged value even if
                there are no matching value in b
                
       - right (Boolean): all values from b will produce at least one merged value even if
                there are no matching value in a
                
       - outer (Boolean): means right and left join
     
     The 'on' condition is an Array of and-conditions, i.e. all conditions must be met for the
     on condition to succeed. Each condition applies to individual attributes of the source set
     or the 'b' set. A condition can be specified as:
     - A string representing the name of an attribute present in both 'a' and 'b'. The
       condition matches for all values for which the attribute name has the same value in
       'a' and 'b'.
       
     - An Array of two attribute names, where the first element is an attribute name in 'a'
       and the second an attribute name in 'b'. The condition matches for values where there
       the values of these respective attributes in 'a' and 'b' are equal.
         
     Example: add employee's first name and last name to sales from employee_id left joined on
       employee's id:
       
       sales.join( employees, [ [ 'employee_id', 'id' ] ], function( sale, employee ) {
         if ( employee ) { // may be undefined because this is a left join
           return extend( {
             employee_first_name: employee.first_name,
             employee_last_name : employee.last_name
           }, sale );
         }
         
         return sale;
       }, { key: [ 'id', 'employee_id' ], left: true } )
  */
  var direct_output = false;
  
  Pipelet.Compose( 'join', function( a, b, on, merge, options ) {
    if ( options.outer ) options = extend( { left: true, right: true }, options );
    
    var name = options.name
    
      , output = rs.set( [], options )
      
      , left  = !!options.left
      , right = !!options.right
      
      , options_a = extend( {}, options, { name: name + '_left' , all: left , other_all: right } )
      , options_b = extend( {}, options, { name: name + '_right', all: right, other_all: left  } )
      
      , _a = a.half_join( 0, b, on, merge, output, options_a )
      , _b = b.half_join( 1, a, on, merge, output, options_b )
      
      , union = rs.union( [ _a, _b ], extend( {}, options, { name: name + '_union' } ) )
    ;
    
    if ( direct_output ) {
      // ToDo: use transactional fetch()
      union._fetch_all( function( values, no_more ) {
        output._add( values );
      } );
    } else {
      output._add_source( union );
    }
    
    return union;
  } ); // join()
  
  /* -------------------------------------------------------------------------------------------
     half_join( position, filter, on, merge, output, options )
  */
  function Half_Join( position, filter, on, merge, output, options ) {
    Greedy.call( this, options );
    
    var fetch_non_matching = false;
    
    // _output._fetch should use only one of the half-joins => disable _fetch on the right half-join
    if ( position ) {
      // This is the right half
      
      if ( this._options.all ) {
        // This is a right outer join or a full outer join
        // We need to include right values which have no left match
        fetch_non_matching = true;
      } else {
        // This is an inner join or a left outer join
        // We do not need to provide any right value because all matching right values will be included from the left half-join
        this._output._fetch = function( receiver ) {
          receiver( [], true );
          
          return this;
        }
      }
    }
    
    this._position = position;
    
    this._half_join_merge = merge;
    
    this._full_join_output = output;
    
    this._make_organizer_and_transform( position, on, fetch_non_matching );
    
    this._half_join_order = filter.order( this.organizer, this._options );
    
    return this;
  } // Half_Join()
  
  Greedy.Build( 'half_join', Half_Join, {
    _make_organizer_and_transform: function( position, on, fetch_non_matching ) {
      var u
        , organizer = this.organizer = []
        , attributes = []
        , renames = 0
      ;
      
      for ( var i = -1, l = on.length; ++i < l; ) {
        var c = on[ i ], id1, id2;
        
        switch( typeof c ) {
          case 'string':
            id1 = id2 = c;
            
            c = { id: c };
          break;
          
          case 'object':
            if ( c instanceof Array ) {
              id1 = c[ position ^ 1 ];
              id2 = c[ position     ];
              
              // Providing objects allows to specify a descending order which has consequences on the order of output operations
              // Although this does not guaranty the strict order of the joined set which always remains unordered.
              // If order() organizers had other attributes in the future this feature may become useful and fully exposed
              
              // ToDo: object identifiers are not documented and not tested, should we remove this feature or document and test it?
              
              if ( typeof id2 == 'object' ) id2 = id2.id;
              
              if ( typeof id1 == 'object' ) {
                c = id1;
                
                id1 = id1.id;
              } else {
                c = { id: id1 };
              }
              
              ( id1 != id2 ) && renames++;
            } else {
              id1 = id2 = c.id;
            }
          break;
          
          default:
          throw new Error( 'Expected String or Object or Array for condition: ' + log.s( c ) );
        }
        
        this._renames = renames;
        
        organizer.push( c );
        
        attributes.push( id1 + ': v.' + id2 );
        
        // de&&ug( this._get_name( '_make_organizer_and_transform' ) + 'attribute name: ' + id1 + ', value attribute name: ' + id2 + ', organizer term:', c )
      } // for all conditions
      
      var locate = new Code( 'join._locate' )
      
        ._function( 'this._locate', u, [ 'values', 'options' ] )
          ._var( 'v', 'out', 'l', 'i', 'order = this._half_join_order' );
          
          if ( renames ) {
            var _attributes = '{ __v: v = values[ ++i ], ' + attributes.join( ', ' ) + ' }';
            
            locate
              .add( 'out = []; l = values.length; i = -1' )
              
              .unrolled_while( 'out.push( ' + _attributes, ', ' + _attributes, ')' )
            ;
          } else {
            locate.add( 'out = values.slice( 0 )' ); // Shallow copy before sort
          }
          
          locate
          .add( 'out.sort( order.sorter )' )
          
          .add( 'return order.locate( out, options )' )
        .end( 'join._locate' )
      ;
      
      eval( locate.get() );
      
      // de&&ug( 'join.._locate: ' + this._locate )
      
      var variable_v          = 'v = _l.o' + ( renames ? '.__v' : '' )
        , merge_without_match = 'merge( ' + ( position ?            'u, v' : 'v'               ) + ' )'
        , merge               = 'merge( ' + ( position ? 'matches[ j ], v' : 'v, matches[ j ]' ) + ' )'
        , merge_match_only    = 'merge( ' + ( position ? 'matches[ j ]'    : 'u, matches[ j ]' ) + ' )'
        
        , all                 = this._options.all
        , other_all           = this._options.other_all
      ;
      
      var transform = new Code( 'join..__transform(), position: ' + position + ', all: ' + all )
        ._function( 'this.__transform', u, [ 'values', 'options', 'operation' ] )
          ._var( 'u'
            , 'merge = this._half_join_merge'
            , 'out = []'
            , 'i = -1'
            , 'l'
            , 'v'
            , 'locations'
          )
          
          ._if( 'operation == "fetch"' );
          
            if ( fetch_non_matching ) {
              transform
              .add( 'locations = this._locate( values ); l = locations.length' )
              
              ._while( '++i < l' )
                ._var( '_l = locations[ i ]', variable_v )
                
                ._if( '_l.position === u' )
                  .add( 'out.push( ' + merge_without_match + ' )' )
                .end()
              .end();
              
            } else {
              transform
              .add( 'locations = this._locate( values, { all: true } ); l = locations.length' )
              
              // Merge joined values
              ._while( '++i < l' )
                ._var( '_l = locations[ i ]', variable_v, 'matches = _l.all_matches' )
                
                ._if( 'matches' )
                  ._var( 'j = -1, ml = matches.length' )
                  
                  ._while( '++j < ml' )
                    .add( 'out.push( ' + merge + ' )' )
                  .end()
                  
                ;all && transform
                ._else()
                  .add( 'out.push( merge( ' + ( position ? 'u, v' : 'v' ) + ' ) )' )
                  
                ;transform
                .end()
              .end();
            }
            
            transform
            .add( 'return out' )
          .end() // operation == "fetch"
        .end( 'Join..__transform()' )
      ;
      
      eval( transform.get() );
      
      return this;
    }, // _make_organizer_and_transform()
    
    _add: function( values, options ) {
      var u
        , output    = this._full_join_output
        , all       = this._options.all
        , other_all = this._options.other_all
        , merge     = this._half_join_merge
        , renames   = this._renames
        , position  = this._position
        , locations = this._locate( values, { all: true } )
        , l         = locations.length
        , i         = -1
      ;
      
      // Merge joined values
      while ( ++i < l ) { // all locations
        var _l      = locations[ i ]
          , v       = _l.o
          , matches = _l.all_matches
          , position
        ;
        
        if ( renames ) v = v.__v;
        
        if ( matches ) {
          var j = -1
            , ml = matches.length
          ;
          
          while ( ++j < ml ) {
            // ToDo: use update when remove + add
            if ( other_all ) {
              // try to add merge_match_only to output
              var merge_match_only = position ? merge( matches[ j ] ) : merge( u, matches[ j ] )
                , _position        = output.index_of( merge_match_only )
              ;
              
              if ( _position != -1 ) {
                direct_output && output._remove( [ merge_match_only ] );
                
                this.__emit_remove( [ merge_match_only ], options );
              }
            }
            
            var _merge = position ? merge( matches[ j ], v ) : merge( v, matches[ j ] );
            
            direct_output && output._add( [ _merge ] );
            
            this.__emit_add( [ _merge ], options )
          } // while there are matches
        } else if ( all ) { // no match
          var merge_without_match = position ? merge( u, v ) : merge( v );
          
          direct_output && output._add( [ merge_without_match ] );
          
          this.__emit_add( [ merge_without_match ], options )
        }
      } // while there are locations
      
      return this;
    }, // _add()
    
    _remove: function( values, options ) {
      var u
        , equals    = RS.value_equals
        , output    = this._full_join_output
        , all       = this._options.all
        , other_all = this._options.other_all
        , merge     = this._half_join_merge
        , renames   = this._renames
        , position  = this._position
        , locations = this._locate( values, { all: true } )
        , l         = locations.length
        , i         = -1
      ;
      
      // Merge joined values
      while ( ++i < l ) { // all locations
        var _l      = locations[ i ]
          , v       = _l.o
          , matches = _l.all_matches
          , position
        ;
        
        if ( renames ) v = v.__v;
        
        if ( matches ) {
          var j = -1
            , ml = matches.length
          ;
          
          while ( ++j < ml ) {
            var match = matches[ j ]
              , _merge = position ? merge( match, v ) : merge( v, match )
            ;
            
            direct_output && output._remove( [ _merge ] );
            de&&ug( 'removed merge:', _merge, ', result:', output.a, ', key:', output._key );
            
            // ToDo: emit update when subsequent add (bellow)
            this.__emit_remove( [ _merge ], options )
            
            if ( other_all ) {
              // try to add merge_match_only to output
              var merge_match_only = position ? merge( match ) : merge( u, match );
              
              de&&ug( 'merge_match_only: ', merge_match_only );
              
              if ( output.a.filter( is_merge_match_only_in ).length == 0 ) {
                de&&ug( this._get_name( '_remove' ) + 'adding back merge_match_only:', merge_match_only );
                
                direct_output && output._add( [ merge_match_only ] );
                
                this.__emit_add( [ merge_match_only ], options );
              }
            }
          } // while there are matches
        } else if ( all ) { // no match
          var merge_without_match = position ? merge( u, v ) : merge( v );
          
          direct_output && output._remove( [ merge_without_match ] );
          
          this.__emit_remove( [ merge_without_match ], options )
        }
      } // while there are locations
      
      return this;
      
      function is_merge_match_only_in( v ) {
        var _v = {}, p;
        
        for( p in merge_match_only )
          if ( v.hasOwnProperty( p ) )
            _v[ p ] = v[ p ];
        
        de&&ug( 'is_merge_match_only_in', _v );
        
        return equals( merge_match_only, _v )
      } // is_merge_match_only_in()
    } // _remove()
  } ); // Half_Join instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Half_Join': Half_Join
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // join.js
