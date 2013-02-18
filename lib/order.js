/*  order.js

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
    XS = require( './xs.js' ).XS;
    
    require( './code.js' );
    require( './pipelet.js' );
  } else {
    XS = exports.XS;
  }
  
  var log      = XS.log
    , extend   = XS.extend
    , subclass = XS.subclass
    , Code     = XS.Code
    , Pipelet  = XS.Pipelet
    , Set      = XS.Set
  ;
  
  var push = Array.prototype.push;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs order, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Order_Organizer()
  */
  function Order_Organizer( organizer, order, options ) {
    Pipelet.call( this, options );
    
    this.order = order;
    
    return this.set_source( this.organizer = organizer );
  } // Order_Organizer()
  
  subclass( Pipelet, Order_Organizer );
  
  var p = Order_Organizer.prototype;
  
  p.add = p.remove = p.update = function() {
    var organizer = this.organizer, that = this;
    
    switch( typeof organizer ) {
      case 'function':
      return sort( organizer );
      
      case 'object':
        if ( organizer !== null ) {
          if ( typeof organizer.fetch_all === 'function' ) {
            organizer.fetch_all( generate_code_and_sort );
            
            return this;
          }
          
          if ( organizer instanceof Array ) break;
        }
      // fall-through
      
      default: throw new Error( 'Order.update_organizer(), missing organizer function or Array or Set' );
    }
    
    return generate_code_and_sort( organizer );
    
    function generate_code_and_sort( organizer ) {
      var code = new Code( 'organizer' )
        ._function( 'organizer', null, [ 'a', 'b' ] )
          ._var( 'u', 'x', 'y' );
          
          for ( var i = -1; ++i < organizer.length; ) {
            var d = organizer[ i ], inferior, superior; 
            
            if ( d.descending ) {
              inferior = ' 1';
              superior = '-1';
            } else {
              inferior = '-1';
              superior = ' 1';
            }
            
            code
              ._if( '( x = a.' + d.id + ' ) !== ( y = b.' + d.id + ' )' )
                .add( 'if ( x === u    ) return ' + inferior )
                .add( 'if ( y === u    ) return ' + superior )
                .add( 'if ( x === null ) return ' + inferior )
                .add( 'if ( y === null ) return ' + superior )
                .add( 'if ( x  <  y    ) return ' + inferior )
                .add( 'if ( x  >  y    ) return ' + superior )
              .end()
            ;
          }
          
          code.add( 'return 0' )
        .end( 'organizer()' )
      ;
      
      eval( code.get() );
      
      return sort( organizer );
    } // generate_code_and_sort()
    
    function sort( organizer ) {
      that.order.sort( organizer );
      
      return that;
    }
  }; // add / remove / update
  
  /* -------------------------------------------------------------------------------------------
     Order()
  */
  function Order( organizer, options ) {
    var a = [];
    
    //
    // ToDo: Backward Compatibility code, remove when users refactor their code
    if ( options && ( typeof options === 'function' || options instanceof Pipelet || options instanceof Array ) ) {
      a = organizer;
      organizer = options;
      options = arguments[ 2 ];
    }
    // End  Backward Compatibility
    //*/
    
    Set.call( this, a, options );
    
    this.order_organizer = new Order_Organizer( organizer, this, options );
    
    return this;
  } // Order()
  
  Set.build( 'order', Order, {
    sort: function( organizer ) {
      this.organizer = organizer;
      
      var a = this.a, l = a.length;
      
      if ( l ) {
        // Sort a and calculate updates and moves
        
        // Build array to memorize current positions
        for( var _a = [], i = -1; ++i < l; ) {
          _a.push( { v: a[ i ], from: i } );
        }
        
        // Sort array holding current positions 
        _a.sort( function( a, b ) { return organizer( a.v, b.v ) } );
        
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
            // This code is similar to this.update()
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
        updates.length && this.emit_update( updates, { moves: moves } );
      }
      
      return this;
    }, // sort()
    
    locate: function( objects, exact ) {
      var u, start = 0, stop = this.a.length, n = objects.length, step, guess = 0
        , locations = [], previous
        , that = this, options = this.options
      ;
      
      for ( var i = -1; ++i < n; guess += step ) {
        var o = objects[ i ]
          , location = { o: o, guess: Math.floor( guess ), previous: previous, start: start, stop: stop }
        ;
        
        if ( o instanceof Array ) { // updates
          location.o = o[ 0 ];
          location.update = o[ 1 ];
        }
        
        if ( previous ) previous.next = location;
        
        locations.push( previous = location );
        
        if ( i === 0 ) {
          locate( this.a, this.organizer, locations, 0, 1, exact );
          
          guess = start = location.insert ? location.insert - 1 : location.insert;
          step = ( stop - start ) / n; // could be zero is insert === stop, inserting all further objects at the end
        }
      }
      
      return locate( this.a, this.organizer, locations, 1, n, exact );
      
      function locate( a, organizer, locations, begin, end, exact ) {
        if ( begin >= end ) return locations;
        
        // de&&ug( "Order.locate(), start locations: " + log.s( locations, replacer ) );
        
        var u, some_not_located = true, count = 0, start;
        
        while( some_not_located ) {
          some_not_located = false;
          
          for ( var i = begin - 1; ++i < end; ) {
            if ( ++count > 1000000 ) throw Error( "Infinite loop, locations: " + log.s( locations, replacer ) );
            
            var location = locations[ i ];
            
            if ( location.located ) continue;
            
            var guess = location.guess, stop = location.stop;
            
            if ( guess === stop ) {
              location.located = true;
              location.insert = guess;
              
              continue;
            }
            
            var o = location.o;
            
            if ( ( location.order = organizer( a[ guess ], o ) ) === 0 ) {
              // There is at least one match at location guess
              location.located = true;
              
              var insert = guess;
              
              if ( exact ) {
                var key = that.make_key( o ), make_key = that.make_key;
              }
              
              stop = a.length; // Search for a matching key could go beyond ordered search  
              
              while ( true ) {
                if ( exact && location.found === u && key === make_key( a[ insert ] ) ) {
                  location.found = insert; // first position where there is both an organizer match and a key match
                }
                
                if ( options.insert_before ) {
                  if ( insert === 0 || organizer( a[ insert - 1 ], o ) ) break; // no previous value or previous no longer matches
                  
                  insert -= 1;
                } else {
                  // Position insert after last object equal to searched object
                  if ( ++insert >= stop || organizer( a[ insert ], o ) ) break; // no next values or next does not match
                }
              }
              // insert location either at (insert_before) or after last matching value
              
              location.insert = insert;
              
              if ( exact && location.found === u ) {
                // Still no key match and exact location requested
                
                // look the other way from first match to find an exact match
                while( true ) {
                  if ( options.insert_before ) {
                    if ( ++guess >= stop || organizer( a[ guess ], o ) ) break;
                  } else {
                    if ( guess === 0 || organizer( a[ guess - 1 ], o ) ) break;
                    
                    guess -= 1;
                  }
                  
                  if ( key === make_key( a[ guess ] ) ) {
                    location.found = guess;
                    
                    break;
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
              location.guess = Math.floor( ( start + stop ) / 2 );
              
              some_not_located = true;
            } else {
              location.located = true;
              location.insert = location.start;
            }
          }
        } // while some_not_located
        
        de&&ug( "Order.locate(), name: " + options.name + ", locations: " + log.s( locations, replacer ) );
        
        return locations;
      } // locate()
      
      function replacer( k, v ) {
        return k == 'previous' || k == 'next' ? u : v
      }
    }, // locate()
    
    add: function( objects ) {
      objects = objects.slice( 0 );
      
      objects.sort( this.organizer );
      
      var a = this.a, options = {};
      
      if ( a.length === 0 ) {
        this.a = objects;
      } else {
        var locations = this.locate( objects ) // we're not looking for exact key matches but ToDo: we might have to
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
      
      return this.emit_add( objects, options );
    }, // add()
    
    remove: function( objects ) {
      objects = objects.slice( 0 );
      
      objects.sort( this.organizer );
      
      var locations = this.locate( objects, true )
        , options = {}
        , _locations = options.locations = []
        , a = this.a, u
      ;
      
      for ( var i = locations.length; i; ) {
        var f = locations[ --i ].found;
        
        if ( f !== u ) {
          _locations.unshift( f );
          
          a.splice( f, 1 );
        } else {
          // ToDo: not found, this would be an anti-add to keep for later 
          // It could also be a conflict needing to be resolved eventually
          _locations.unshift( -1 );
        }
      }
      
      return this.emit_remove( objects, options );
    }, // remove()
    
    update: function( updates ) {
      var organizer = this.organizer;
      
      updates.sort( function( a, b ) { return organizer( a[ 0 ], b[ 0 ] ) } );
      
      var locations = this.locate( updates, true )
        , options = {}
        , moves = options.moves = []
        , a = this.a, u
      ;
      
      for ( var i = locations.length; i; ) {
        var l = locations[ --i ], f = l.found;
        
        if ( f === u ) {
          // ToDo: not found, this would be an anti-add + add to keep for later
          // It could also be a conflict needing to be resolved eventually
          moves.unshift( { from: -1 } );
        } else {
          if ( ! organizer( l.o, l.update ) ) {
            // Value did not move
            a[ f ] = l.update;
            moves.unshift( { from: f, to: f } );
          } else {
            // Updaed value is moving
            
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
              
              update( [
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
              
              2012/12/30 20:41:20.518 - xs, Order.locate(), name: books_ordered_by_descending_year, locations: [
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
      
      return this.emit_update( updates, options );
    } // update()
  } ); // Order instance methods
  
  /* -------------------------------------------------------------------------------------------
     Order class methods
  */
  extend( Order, {
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
  
  function Ordered() {
    return Set.call( this );
  } // Ordered()
  
  Set.build( 'ordered', Ordered, {
    insert_: function( at, value ) {
      this.a.splice( at, 0, value );
      
      //de&&ug( 'ordered..insert_(), ' + log.s( { at: at, v: value, a: this.a } ) );
      
      return this;
    }, // insert_()
    
    remove_: function( from, value ) {
      this.a.splice( from, 1 );
      
      //de&&ug( 'ordered..remove_(), ' + log.s( { from: from, v: value, a: this.a } ) );
      
      return this;
    }, // remove__()
    
    update_: function( at, update ) {
      this.a[ at ] = update[ 1 ];
      
      //de&&ug( 'ordered..update_(), ' + log.s( { at: at, update: update, a: this.a } ) );
      
      return this;
    }, // update_()
    
    add: function( added, options ) {
      var that = this;
      
      Order.insert_at( added, options
        , function( at, v ) { that.insert_( at, v ) }
      );
      
      Pipelet.prototype.add.call( this, added, options );
      
      return this;
    }, // add()
    
    remove: function( removed, options ) {
      var that = this;
      
      Order.remove_from( removed, options
        , function( from, v ) { that.remove_( from, v ) }
      );
      
      Pipelet.prototype.remove.call( this, removed, options );
      
      return this;
    }, // remove()
    
    update: function( updates, options ) {
      var that = this, update_;
      
      if ( that.update_ ) update_ = function( at, v ) { that.update_( at, v ) } ;
      
      Order.update_from_to( updates, options
        , function( at  , v ) { that.insert_( at  , v ) }
        , function( from, v ) { that.remove_( from, v ) }
        , update_
      );
      
      Pipelet.prototype.update.call( this, updates, options );
      
      return this;
    } // update()
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Order', 'Order_Organizer', 'Ordered' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // order.js
