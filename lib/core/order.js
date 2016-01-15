/*  order.js

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
( 'order', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , log      = RS.log
    , extend   = RS.extend
    , extend_2 = extend._2
    , is_array = RS.is_array
    , Code     = RS.Code
    , Set      = RS.Set
    , Options  = RS.Transactions.Options
    
    , push     = Array.prototype.push
    , toString = Object.prototype.toString
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = log.bind( null, 'order' );
  
  /* -------------------------------------------------------------------------------------------
     source.order( organizer [, options] )
     
     Order a source set using an organizer which can be a function, an Array of attributes, or
     a Pipelet allowing for dynamic changes of the organizer.
     
     Paraneters:
       - organizer: can be:
         - a function to sort source values
         - an Array of attributes to sort source values. Each attribute refers to an attribute
           that must be present in all source values and that will be used to sort the source.
           Attributes are evaluated in the order provided by the array, the first being the
           most significant and the last being the least significant.
           
           Attributes are JavaScript Objects with the following attributes:
             - id: (String) the name of the attribute in source values
             - descending: optional (Bollean) specifying the sort order. If true the sort
                order will be descending for this attribute, if false or undefined the sort
                order will be ascending.
             
         - A JavaScript Object, such as a Pipelet, having an Output plug '_output' and with the
           same behavior as that of a Pipelet, to allow the dynamic change of sort Attributes.
           In which case the corresponding set must be a set of attributes as defined above.
           
       - options (optional Object):
         - key  (Array of Strings): list of attribute names used to uniquelly identify values
                                    default is [ 'id' ]
                                    
         - insert_before (Boolean): insert new values before matching values if true,
                                    default is false, i.e. insert after.
                                    
         - name           (String): debugging name for this instance, default is pipelet
                                    name.
         
     If the downstream pipelet is an Ordered_Set, it will be ordered by this pipelet using
     options in __emit_xxx() events.
   
  */
  function Order( organizer, options ) {
    this.sorter_waiters = [];
    
    Set.call( this, [], options );
    
    this.set_organizer( organizer );
    
    return this;
  } // Order()
  
  Set.Build( 'order', Order, {
    set_organizer: function( organizer ) {
      this.organizer = organizer;
      
      if ( organizer._output ) {
        organizer._output.on( 'complete', function( options ) {
          // There are no more updates to come: update organizer
          de&&ug( 'Order.update_organizer(), complete, re-generate code' );
          
          this.generate_code( options );
        }, this );
      }
      
      return this.generate_code();
    }, // set_organizer()
    
    generate_code: function( options ) {
      var organizer = this.organizer, that = this;
      
      switch( typeof organizer ) {
        case 'function': // organizer is the sorter
        return this.sort( organizer );
        
        case 'object':
          if ( organizer !== null ) {
            var output = organizer._output;
            
            if ( output ) {
              output.fetch_all( generate );
              
              return this;
            }
            
            if ( is_array( organizer ) ) break;
          }
        // fall-through
        
        default: throw new Error( 'Order.update_organizer(), missing organizer function or Array or Set' );
      }
      
      return generate( organizer );
      
      function generate( organizer ) {
        var sorter
          , o = that._options
          , l = organizer.length
          , code = new Code()
          ._function( 'sorter', null, [ 'a', 'b' ] )
            ._var( [ 'u', 'x', 'y' ] );
            
            for ( var i = -1; ++i < l; ) {
              var d = organizer[ i ], inferior, superior
                , no_undefined = o.no_undefined || d.no_undefined
                , no_null      = o.no_null      || d.no_null
                , id = d.id
              ;
              
              if ( d.descending ) {
                inferior = ' 1';
                superior = '-1';
              } else {
                inferior = '-1';
                superior = ' 1';
              }
              
              switch( d.type ) {
                case 'number':
                  if ( no_undefined && no_null ) {
                    if ( l == 1 ) {
                      code.add( d.descending
                        ? 'return b.' + id + ' - a.' + id
                        : 'return a.' + id + ' - b.' + id
                      )
                    } else {
                      code.add( d.descending
                        ? 'if ( x = b.' + id + ' - a.' + id + ' ) return x'
                        : 'if ( x = a.' + id + ' - b.' + id + ' ) return x'
                      )
                    }
                  } else {
                    code
                      ._if( '( x = a.' + id + ' ) !== ( y = b.' + id + ' )' );
                      
                        no_undefined || code
                        .add( 'if ( x === u    ) return ' + inferior )
                        .add( 'if ( y === u    ) return ' + superior );
                        
                        no_null || code
                        .add( 'if ( x === null ) return ' + inferior )
                        .add( 'if ( y === null ) return ' + superior );
                        
                        code
                        .add( 'return ' + ( d.descending ? 'y - x' : 'x - y'  ) )
                      .end()
                    ;
                  }
                break;
                
                default:
                  code
                    ._if( '( x = a.' + d.id + ' ) !== ( y = b.' + d.id + ' )' );
                    
                      no_undefined || code
                      .add( 'if ( x === u    ) return ' + inferior )
                      .add( 'if ( y === u    ) return ' + superior );
                      
                      no_null || code
                      .add( 'if ( x === null ) return ' + inferior )
                      .add( 'if ( y === null ) return ' + superior );
                      
                      code
                      .add( 'if ( x  <  y    ) return ' + inferior )
                      .add( 'if ( x  >  y    ) return ' + superior )
                    .end()
                  ;
              }
            }
            
            code.add( 'return 0' )
          .end( 'Order..sorter()' )
        ;
        
        eval( code.get() );
        
        return that.sort( sorter, options );
      } // generate()
    }, // generate_code()
    
    wait_for_sorter: function( handler ) {
      this.sorter_waiters.push( handler );
      
      de&&ug( 'wait_for_sorter(), sorter_waiters: ' + this.sorter_waiters.length );
      
      return this;
    }, // wait_for_sorter()
    
    sort: function( sorter, options ) {
      this.sorter = sorter;
      
      var a = this.a;
      
      if ( a ) {
        var l = a.length;
        
        if ( l ) {
          // Sort a and calculate updates and moves
          
          // Build array to memorize current positions
          for( var _a = [], i = -1; ++i < l; ) {
            _a.push( { v: a[ i ], from: i } );
          }
          
          // Sort array holding current positions 
          _a.sort( function( a, b ) { return sorter( a.v, b.v ) } );
          
          // Build resulting array and calculate updates and moves
          this.a = a = [];
          
          var updates = [], moves = [];
          
          for ( i = l; i; ) {
            var _v = _a[ --i ], v = _v.v, from = _v.from;
            
            a.unshift( v );
            
            if ( from !== i ) { // this value has moved
              moves.unshift( { from: from, to: i } );
              
              updates.unshift( [ v, v ] );
              
              // Adjust initial locations as a function of from and to (i)
              // This code is similar to this._update()
              for ( var j = -1; ++j < i; ) {
                _v = _a[ j ];
                
                var f = _v.from;
                
                if ( f < from ) {
                  // initial location (f) is before i's initial location (from)
                  if ( f >= i ) _v.from += 1; // not tested, or cannot happen - i.e. f always < i
                } else {
                  // The insertion is done on the set with one element removed
                  // So the test that must be done is f - 1 < i, which can be simplified to f <= i
                  if ( f <= i ) _v.from -= 1;
                }
              }
            }
          }
          
          // Notify downstream pipelets of moved values, if any
          updates.length && this.__emit_update( updates, extend( options, { moves: moves } ) );
        }
      } // if ( a )
      
      var waiters = this.sorter_waiters, l = waiters.length;
      
      if ( l ) {
        de&&ug( 'sort(), sorter is ready, calling ' + l + ' waiters' );
        
        for ( var i = -1; ++i < l; ) waiters[ i ].call( this );
        
        this.sorter_waiters = [];
      }
      
      return this;
    }, // sort()
    
    /* --------------------------------------------------------------------------------------------
       locate( values, options )
       
       Locates a number of values into the current state to determine for each value if it exists
       in the ordered set, where, where the new value could/should be inserted.
       
       Note: the behavior of locate() is part of the API, currently used by other pipelets such as
       join(). Supported API attributes are documented bellow in addition to unsuported attributes
       used by locate() internally.
       
       Parameters:
       - values (Array of values): sorted values to locate, if value is an Array it is assumed to
         have two elements from an update operation [ remove, add ]. Values must be sorted prior
         to calling locate() using this.sorter()
         
       - options (Object): optional parameters:
         - exact         (Boolean): true if an exact location according to the set key is
                                    also sought. Used for removal by remove and update. When
                                    an exact match is found the location attribute found is set
                                    to the position where the exact match was found.
                                    This option is ignored if option all (bellow) is true.
                                    Default is to stop at the first found location for each value.
                                    
         - all           (Boolean): return one or more found value for each value. all matching
                                    values are returned in all_matches[] attribute of returned
                                    locations.
                                    Default is to stop at the first found location for each value.
                                    This feature is used and tested by the join() pipelet
                                    
         - state (Array of values): Default uses this internal state.
                                    This feature is used and tested by the join() pipelet
         
       Returns: Array of locations for values which API supported attributes are:
       - position      (Int): Where a matching value was found in the set (there may be others)
       - insert        (Int): position where value should be inserted in current state
       - found         (Int): position where value was found with also an exact key match.
                              Requires option exact to be true.
       - all_matches (Array): When option all is true, contains all consecutive values of the
                              ordered set that matched this value. If there are no matches,
                              all_matches is undefined, so when present it is guarantied to
                              have at least one matching value.
       
       Other locations attributes used internaly by locate that are not part of the API, meaning
       that these may change without an upgrade of major version number. These should be
       considered internal documentation at this time and may be used only to help understand the
       current implementation. There are no tests designed to verify these attributes values:
       - o          (Object): Value which location was attempted
       - update     (Object): Value to add as part of an update, i.e. if value was an Array
       - located   (Boolean): true when all possible attempts to locate value have been done
       - guess         (Int): position where the value was last checked, possibly found
       - start         (Int): begining of the zone explored in the current state
       - stop          (Int): upper bound of the zone explored
       
       - order         (Int): returned by sorter indicating relative position vs last guess
                              < 0 last guess was before value
                              0 last guess matched value
                              > 0 last guess was after value
                              
       - previous   (Object): reference to the previous location
       - next       (Object): reference to the next location
    */
    locate: function( values, options ) {
      var u
        , that          = this
        , start         = 0
        , state         = this.a
        , n             = values.length
        , guess         = 0
        , locations     = []
        , _options      = this._options
        , insert_before = _options.insert_before
        , stop
        , step
        , previous
        , exact
        , all
      ;
      
      if ( options ) {
        exact = options.exact;
        all   = options.all;
        state = options.state || state;
      }
      
      stop = state.length;
      
      // Prepare locations
      for ( var i = -1; ++i < n; guess += step ) {
        var o = values[ i ]
          , location = { o: o, guess: Math.floor( guess ), previous: previous, start: start, stop: stop }
        ;
        
        if ( is_array( o ) ) { // updates
          location.o = o[ 0 ];
          location.update = o[ 1 ];
        }
        
        if ( previous ) previous.next = location;
        
        locations.push( previous = location );
        
        // locate first value to determine step, the mean distance between two located values in current state
        // locating the first value is a heuristic that hope to improve the speed of bulk inserts somewhat
        // grouped after the first inserting location
        if ( i === 0 ) {
          locate( state, this.sorter, locations, 0, 1, exact, all );
          
          guess = start = location.insert ? location.insert - 1 : location.insert;
          step = ( stop - start ) / n; // could be zero is insert === stop, inserting all further values at the end
        }
      }
      
      // Locate all values, except the first one which is already located
      return locate( state, this.sorter, locations, 1, n, exact, all, de );
      
      function locate( state, sorter, locations, begin, end, exact, all, de ) {
        if ( begin >= end ) return locations;
        
        // de&&ug( get_name() + "start locations: " + log.s( locations, replacer, ' ' ), '\n  , begin: ' + begin + ', end: ' + end + ', exact: ' + exact +  ', all: ' + all );
        
        var u, some_not_located = true, count = 0, start;
        
        while( some_not_located ) {
          some_not_located = false;
          
          for ( var i = begin - 1; ++i < end; ) {
            if ( ++count > 1000000 ) throw Error( "Infinite loop, locations: " + log.s( locations, replacer, ' ' ) );
            
            var location = locations[ i ];
            
            if ( location.located ) continue;
            
            var guess = location.guess, stop = location.stop;
            
            if ( guess === stop ) {
              location.located = true;
              location.insert = guess;
              
              continue;
            }
            
            var o = location.o;
            
            if ( ( location.order = sorter( state[ guess ], o ) ) === 0 ) {
              // There is at least one match at location guess
              location.position = guess;
              location.located = true;
              
              if ( all ) { // ToDo: add tests in order tests although this is also tested by join tests indirectly
                var first = guess, last = location.insert = guess;
                
                start = location.start;
                
                while ( --first >= start && 0 === sorter( state[ first ], o ) );
                while ( ++last  <  stop  && 0 === sorter( state[ last  ], o ) );
                
                location.all_matches = state.slice( ++first, last );
                
                continue;
              }
              
              var insert = guess;
              
              if ( exact ) {
                var key = that.make_key( o ), make_key = that.make_key;
              }
              
              if ( insert_before ) {
                while ( true ) {
                  if ( exact && location.found === u && key === make_key( state[ insert ] ) ) {
                    location.found = insert; // first position where there is both an sorter match and a key match
                  }
                  
                  if ( insert === 0 || sorter( state[ insert - 1 ], o ) ) break; // no previous value or previous no longer matches
                  
                  insert -= 1;
                }
                // insert location at first matching value
                
                location.insert = insert;
                
                if ( exact && location.found === u ) {
                  // Still no key match and exact location requested
                  
                  // look the other way from first match to find an exact match
                  while ( ++guess < stop && 0 === sorter( state[ guess ], o ) ) {
                    if ( key === make_key( state[ guess ] ) ) {
                      location.found = guess;
                      
                      break;
                    }
                  }
                }
              } else {
                // Insert after
                
                while ( true ) {
                  if ( exact && location.found === u && key === make_key( state[ insert ] ) ) {
                    location.found = insert; // first position where there is both an sorter match and a key match
                  }
                  
                  // Position insert after last object equal to searched object
                  if ( ++insert >= stop || sorter( state[ insert ], o ) ) break; // no next values or next does not match
                }
                // insert location either after last matching value
                
                location.insert = insert;
                
                if ( exact && location.found === u ) {
                  // Still no key match and exact location requested
                  
                  // look the other way from first match to find an exact match
                  while ( guess && 0 === sorter( state[ guess - 1 ], o ) ) {
                    guess -= 1;
                    
                    if ( key === make_key( state[ guess ] ) ) {
                      location.found = guess;
                      
                      break;
                    }
                  }
                }
              }
              
              // done with match
              continue;
            } // endif orginazer match
            
            if ( location.order > 0 ) {
              // guess > o, o is before guess
              stop = location.stop = guess;
              
              var previous = location.previous && location.previous.insert;
              
              // Use previous - 1 to find an exact match if any  
              start = previous !== u ? Math.max( previous - 1, location.start ) : location.start;
            } else {
              // guess < o, o is after guess
              start = location.start = guess + 1;
              
              var next = location.next && location.next.insert;
              
              // Use next + 1 to find an exact match if any: Missing test, no current test fails if 'next + 1' is replaced by 'next'
              if ( next !== u ) stop = Math.min( next + 1, stop );
            }
            
            if ( start !== stop ) {
              // set next guess in the middle of remaining space (binary search)
              location.guess = Math.floor( ( start + stop ) / 2 );
              
              some_not_located = true;
            } else {
              location.located = true;
              location.insert = location.start;
            }
          } // for all remaining values to locate
        } // while some_not_located
        
        de&&ug( get_name() + locations.length + " locations: " + log.s( locations, [ 'position', 'found', 'insert', 'all_matches' ] ) );
        
        return locations;
      } // locate()
      
      function replacer( k, v ) {
        return k == 'previous' || k == 'next' ? u : v
      }
      
      function get_name() {
        return that._get_name( 'locate' );
      }
    }, // locate()
    
    _add: function( values, options ) {
      var sorter = this.sorter, that = this;
      
      if ( ! sorter ) return this.wait_for_sorter( function() { that._add( values, options ) } );
      
      values = values.slice( 0 ); // shallow copy before sort
      
      values.sort( sorter );
      
      var a = this.a;
      
      options = Options.forward( options );
      
      if ( a.length === 0 ) {
        // shallow copy to prevent the emission of values that could be further modified by
        // splice, especially if there is a delay pipelet after order()
        // ToDo: add test to verify emitted values are not altered by subsequent operation
        this.a = values.slice( 0 );
      } else {
        var locations = this.locate( values ) // we're not looking for exact key matches but we might have to
          , _locations = options.locations = []
        ;
        
        for ( var i = locations.length; i; ) {
          var l = locations[ --i ];
          
          // ToDo: if there is an exact key match this could be an add waiting for a remove
          // This would require to test for exact matches which would slow-down locate
          
          _locations.unshift( l.insert );
          
          a.splice( l.insert, 0, l.o );
        }
      }
      
      return this.__emit_add( values, options );
    }, // _add()
    
    _remove: function( values, options ) {
      var sorter = this.sorter, that = this;
      
      if ( ! sorter ) return this.wait_for_sorter( function() { that._remove( values ) } );
      
      values = values.slice( 0 ); // shallow copy before sort
      
      values.sort( sorter );
      
      options = Options.forward( options );
      
      // de&&ug( "remove(), values: " + log.s( values ) );
      
      var locations = this.locate( values, { exact: true } )
        , _locations = options.locations = []
        , a = this.a, u
      ;
      
      // Sort again locations by position found because if "equal" values in the set are not
      // ordered in the same order as values, removal could fail
      locations.sort( function( a, b ) { return a.found > b.found ? 1 : a.found < b.found ? -1 : 0 } );
      values = []; // will be rebuilt from locations
      
      for ( var i = locations.length; i; ) {
        var l = locations[ --i ], f = l.found;
        
        values.unshift( l.o );
        
        if ( f !== u ) {
          _locations.unshift( f );
          
          a.splice( f, 1 );
        } else {
          // ToDo: not found, this would be an anti-add to keep for later 
          // It could also be a conflict needing to be resolved eventually
          de&&ug( 'remove(), value not found: ' + log.s( values[ i ] ) );
          
          _locations.unshift( -1 );
        }
      }
      
      return this.__emit_remove( values, options );
    }, // _remove()
    
    // ToDo: refactor to solve coupling issue with locations remove
    _update: function( updates, options ) {
      var sorter = this.sorter, that = this;
      
      if ( ! sorter ) return this.wait_for_sorter( function() { that._update( updates ) } );
      
      updates.sort( function( a, b ) { return sorter( a[ 0 ], b[ 0 ] ) } );
      
      options = Options.forward( options );
      
      var locations = this.locate( updates, { exact: true } )
        , moves = options.moves = []
        , a = this.a, u
      ;
      
      // Sort again locations by position found because if "equal" values in the set are not
      // ordered in the same order as updates, moves could fail
      locations.sort( function( a, b ) { return a.found > b.found ? 1 : a.found < b.found ? -1 : 0 } );
      updates = []; // will be rebuilt from locations
      
      for ( var i = locations.length; i; ) {
        var l = locations[ --i ], f = l.found;
        
        updates.unshift( [ l.o, l.update ] );
        
        if ( f === u ) {
          // ToDo: not found, this would be an anti-add + add to keep for later
          // It could also be a conflict needing to be resolved eventually
          moves.unshift( { from: -1 } );
        } else {
          if ( ! sorter( l.o, l.update ) ) {
            // Value did not move
            a[ f ] = l.update;
            moves.unshift( { from: f, to: f } );
          } else {
            // Updated value is moving
            
            var remove = f;
            
            a.splice( f, 1 ); // remove the old one
            
            l = this.locate( [ l.update ] )[ 0 ]; // locate updated object
            
            var insert = l.insert;
            
            moves.unshift( { from: f, to: insert } );
            
            a.splice( insert, 0, l.o ); // insert at new location

            /* Update other locations if affected by the move.
            
              Here is an example showing potential problems when sorting by descending years that move:
              
              [ { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
                { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
                { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
                { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
                { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
                { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
                { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
                { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
                { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
                { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien"       , year: 1954 }
                { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
                { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
                { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
                { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
                { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
                { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
              ]
              
              _update( [
                [ { id:  8, title: "The Hobbit", author: "J. R. R. Tolkien"         , year: 1937 }, // needs to move up
                  { id:  8, title: "The Hobbit Changed", author: "J. R. R. Tolkien" , year: 1937 }
                ]
                
                [ { id: 15, title: "Steps to Christ", author: "Ellen G. White", year: null      }, // needs to move up
                  { id: 15, title: "Steps to Christ", author: "Ellen G. White", year: undefined } // move to the end
                ],
                                
                [ { id: 14, title: "And Then There Were None", author: "Agatha Christie", year: undefined },
                  { id: 14, title: "And Then There Were None", author: "Agatha Christie", year: 1927      } // moves backward
                ],
                
                [ { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"             }, // last
                  { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl", year: 1970 } // moves backward
                ]
              ] )
              
              The location of the itens is correct as seen by the trace for test 76:
              
              2012/12/30 20:41:20.518 - rs, Order.locate(), name: books_ordered_by_descending_year, locations: [
                { "o":{"id":8,"title":"The Hobbit","author":"J. R. R. Tolkien","year":1937},
                  "guess":10,"start":9,"stop":12,
                  "update":{"id":8,"title":"The Hobbit Changed","author":"J. R. R. Tolkien","year":1937},
                  "order":0,"located":true,"found":10,"insert":11
                },
                
                { "o":{"id":15,"title":"Steps to Christ","author":"Ellen G. White","year":null},
                  "guess":13,"start":13,"stop":14,
                  "update":{"id":15,"title":"Steps to Christ","author":"Ellen G. White"},
                  "order":0,"located":true,"found":13,"insert":14
                },
                
                { "o":{"id":14,"title":"And Then There Were None","author":"Agatha Christie"},
                  "guess":15,"start":14,"stop":16,
                  "update":{"id":14,"title":"And Then There Were None","author":"Agatha Christie","year":1927},
                  "order":0,"located":true,"insert":16,"found":14
                },
                
                { "o":{"id":16,"title":"Charlie and the Chocolate Factory","author":"Roald Dahl"},
                  "guess":14,"start":11,"stop":16,
                  "update":{"id":16,"title":"Charlie and the Chocolate Factory","author":"Roald Dahl","year":1970},
                  "order":0,"located":true,"found":15,"insert":16
                }
              ]
            */
            
            // This code is similar to sort()
            for ( var j = -1; ++j < i; ) {
              l = locations[ j ], f = l.found;
              
              if ( f !== u ) {
                if ( f < remove ) {
                  if ( f >= insert ) f += 1;
                } else {
                  // The insertion is done on the set with one element removed
                  // So the test that must be done is f - 1 < insert, which can be simplified to f <= insert
                  if ( f <= insert ) f -= 1;
                }
                
                l.found = f;
              }
            }
          }
        }
      }
      
      return this.__emit_update( updates, options );
    } // _update()
  } ); // Order instance methods
  
  /* -------------------------------------------------------------------------------------------
     Order class methods
  */
  extend_2( Order, {
    insert_at: function( inserted, options, insert ) {
      var locations;
      
      if ( options ) locations = options.locations;
      
      for ( var i = inserted.length; i; ) {
        var v = inserted[ --i ];
        
        insert( locations ? locations[ i ] : 0, v );
      }
    }, // insert_at()
    
    remove_from: function( removed, options, remove ) {
      var locations = options.locations;
      
      for ( var i = removed.length; i; ) {
        var l = locations[ --i ];
        
        l !== -1 && remove( l, removed[ i ] );
      }
    }, // remove_from()
    
    update_from_to: function( updated, options, insert, remove, update ) {
      var moves = options.moves;
      
      for ( var i = updated.length; i; ) {
        var m = moves[ --i ], from = m.from;
        
        if ( from !== -1 ) {
          var u = updated[ i ];
          
          if ( from !== m.to || update === void 0 ) {
            remove( from, u[ 0 ] );
            insert( m.to, u[ 1 ] );
          } else {
            update( from, u );
          }
        }
      }
    } // update_from_to()
  } ); // Order class methods
  
  function Ordered( options ) {
    Set.call( this, [], options );
  } // Ordered()
  
  Set.Build( 'ordered', Ordered, {
    // ToDo: add leading underscore to trailing undersore method names 
    insert_: function( at, value ) {
      this.a.splice( at, 0, value );
      
      //de&&ug( 'ordered..insert_(), ' + log.s( { at: at, v: value, a: this.a } ) );
      
      //return this;
    }, // insert_()
    
    remove_: function( from, value ) {
      this.a.splice( from, 1 );
      
      //de&&ug( 'ordered..remove_(), ' + log.s( { from: from, v: value, a: this.a } ) );
      
      //return this;
    }, // remove__()
    
    update_: function( at, update ) {
      this.a[ at ] = update[ 1 ];
      
      //de&&ug( 'ordered..update_(), ' + log.s( { at: at, update: update, a: this.a } ) );
      
      //return this;
    }, // update_()
    
    insert_at: function( added, options ) {
      var that = this;
      
      Order.insert_at( added, options
        , function( at, v ) { that.insert_( at, v ) }
      );
      
      //return this;
    }, // insert_at()
    
    remove_from: function( removed, options ) {
      var that = this;
      
      Order.remove_from( removed, options
        , function( from, v ) { that.remove_( from, v ) }
      );
      
      //return this;
    }, // remove_from()
    
    update_from_to: function( updates, options ) {
      var that = this, update_;
      
      if ( that.update_ ) update_ = function( at, v ) { that.update_( at, v ) } ;
      
      Order.update_from_to( updates, options
        , function( at  , v ) { that.insert_( at  , v ) }
        , function( from, v ) { that.remove_( from, v ) }
        , update_
      );
      
      //return this;
    }, // update_from_to()
    
    _add: function( added, options ) {
      var that = this;
      
      that.a.length && assert_ordered_options( that, '_add', 'locations', options );
      
      that.insert_at( added, options );
      
      return that.__emit_add( added, options )
    }, // _add()
    
    _remove: function( removed, options ) {
      var that = this;
      
      assert_ordered_options( that, '_remove', 'locations', options );
      
      that.remove_from( removed, options );
      
      return that.__emit_remove( removed, options )
    }, // _remove()
    
    _update: function( updates, options ) {
      var that = this;
      
      assert_ordered_options( that, '_update', 'moves', options );
      
      that.update_from_to( updates, options );
      
      return that.__emit_update( updates, options );
    } // _update()
  } ); // ordered()
  
  function assert_ordered_options( that, method, attribute, options ) {
    if ( ! ( options && options[ attribute ] ) ) {
      var source = that._input.source;
      
      throw new Error(
          that._get_name( method )
        + 'missing ' + attribute + ' from ordered source: '
        + ( source && source._get_name ? source._get_name() : toString.call( source ) )
      );
    }
  } // assert_ordered_options()
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    Order: Order,
    Ordered: Ordered
  } );
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // order.js
