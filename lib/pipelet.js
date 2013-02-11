/*  pipelet.js
    
    Pipelet base classes:
      - Pipelet: the current base of all pipelet classes having one source and one
        destination
      - Fork: a Pipelet with one source and n destinations
      - Union: a Pipelet with n sources and one destination
      - Set: a stateful set implementation
    
    Also defines the 'xs' namespace for a fluid interface that acts as a singleton
    or a pseudo source.
    
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
  } else {
    XS = exports.XS;
  }
  
  var log        = XS.log
    , extend     = XS.extend
    , subclass   = XS.subclass
    , Code       = XS.Code
    , u
  ;
  
  var push = Array.prototype.push
    , slice = Array.prototype.slice
    , concat = Array.prototype.concat
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs pipelet, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Pipelet( options )
     
     A Pipelet has one upstream source and one downstream pipelet.
     
     Parameters:
       options: optional object:
         - key: unique key for values, default is [ 'id' ]
         
     This is the base class of all Pipelets, Forks and Union, providing the building block of
     all XS applications. 
     
     Pipelets process the basic Operations add, remove, and clear coming from their source set
     and producing their destination set. An update operation is an optimization that groups a
     remove and an add operation into a single operation.
     
     Operations can be combined to form atomic transactions.
     
     Pipelets can be distributed vertically, oe horizontally. Vertical distribution is when
     a individual pipelets run on different processes or servers but each pipelet is executed
     entirely within the same thread. Horizontal distribution is when a pipelet's execution
     is run over several threads and/or processes and/or servers.
     
     To allow distribution and asynchronism, an important aspect of XS operations is that these
     can be executed in any order. In other words, the final state of a set does not depend
     on the order of execution of individual operations. This means that a remove operation can
     be executed before an add.
     
     Pipelets can be stateless or stateful:
     
     Stateless Pipelet:
     -----------------
     A Stateless pipelet does not hold any state between operations and can be seen as purely
     functional.
     
     Stateless pipelets do not require memory between operations, and are therefore for the
     most part CPU-bound.
     
     The order in which operations are processed does not matter and it can therefore be
     distributed horizontally at any time.
     
     Examples of statefull pipelets are: Fork, Union, and Filter.
     
     Forks and Union can be distributed in hierarchical trees.
     
     A Fork can be distributed into a head fork, connected to many indepedent forks.
     Likewise a Union can be distributed into many independent unions connected to a tail
     union. This hierarchy can have any depth allowing scalability to billions of branches
     over as many processes and machines as required.
     
     Stateless pipelets must implement the transform( values ) method that returns values
     as transformed or filtered. This method is then used by provided add(), remove(),
     , and update() operation methods to produce the desintation set plus the fetch()
     method invoqued when a destination pipelet connects its source to a stateless pipelet.
     
     Stateful Pipelet:
     ----------------
     A Stateful pipelet maintains the state of the set either in memory or on mass storage.
     
     Stateful pipelets may be distributed horizontally if it has at least two stages: a
     map stage and a merge stage. The map stage must be able to work on a subset of the set
     accepting operations in any order. The merge stage reduces results of subsets into
     a new subset that may be further reduced in a hierachical merge until a tail merge
     produces the output set of the pipelet.
     
     Sateful pipelets must implement fetch(), add(), remove(), update(), and clear().
  */
  function Pipelet( options ) {
    this.options = options = options || {};
    
    this.key = options.key || [ 'id' ];
    
    this.source = this.destination = u; // No source or desination yet
    
    return this;
  } // Pipelet()
  
  var p = Pipelet.prototype;
  
  extend( p, {
    /* ------------------------------------------------------------------------
       get()
    
       Returns the current full state of this set, in the form of an Array of
       objects.
       
       This method should only be used for debugging and testing purposes and
       when the full state is known to be 'small' (can fit entirely in memory).
       
       For large sets, use fetch() instead that allows to retreive the content
       by smaller increments that all fit in memory.
    */
    get: function() {
      var out = [];
      
      // use fetch: if get can be used fetch will be synchronous
      this.fetch( function( values ) { out.push( values ) } );
      
      return concat.apply( [], out );
    }, // get()
    
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       Fetches the content of the source set, possibly in chunks.
       
       Parameter:
         receiver: function that will be called for each chunk of data from
           the source.
           
           Each chunk is delivered in a array of objects.
           
           After the last chunk, the receiver is called one last time with an
           empty chunk: [].
    */
    fetch: function( receiver ) {
      var that = this, s = this.source;
      
      if ( s ) {
        s.fetch( function( values ) { receiver( that.transform( values ) ) } );
      } else {
        receiver( [] ); // No source, so this is an empty set
      }
      
      return this;
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       transform( values )
       
       Transforms an array of values into an other array of values according
       to the current pipelet role.
       
       Default is to return all values unaltered. Every pipelet should either
       implement transform() if it is stateless or fetch() if it is statefull
       and/or implement add(), remove(), and update().
       
       Paraemter:
         values: Array of values (javascript objects).
    */
    transform: function( values ) {
      return values;
    }, // transform()
    
    /* ------------------------------------------------------------------------
       notify( transaction [, options ] )
       
       Executes a transaction, eventually atomically (everything succeeds or
       everything fails).
       
       Parameters:
         - transaction: Array of actions. Each action has attributes:
           - action: string 'add', or 'remove', or 'update'
           - objects: Array of objects for 'add' and 'remove' or updates. An update
             is an Array where the first item is the previous object value and the
             second item is the new object value

         - options: optional object of optional attributes
         
       ToDo: manage atomic transcations, will rollback capability
    */
    notify: function( transaction, options ) {
      var l = transaction.length;
      
      for ( var i = -1; ++i < l; ) {
        var a = transaction[ i ].action;
        
        switch( a ) {
          case 'add':
          case 'remove':
          case 'update':
            if ( this[ a ] ) break;
          // fall-through
          
          default:
            throw( new Unsuported_Action( a ) );
        }
      }
      
      for ( var i = -1; ++i < l; ) {
        var a = transaction[ i ];
        
        this[ a.action ]( a.objects, options );
      }
      
      return this;
    }, // notify()
    
    /* ------------------------------------------------------------------------
       add( added [, options ] )
       
       Add objects to this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly
       by users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_add() of
       transformed objects by transform().
       
       Parameters:
         added: Array of object values to add
         
         option: optional object
    */
    add: function( added, options ) {
      return this.emit_add( this.transform( added ), options );
    }, // add()
    
    /* ------------------------------------------------------------------------
       emit_add( added [, options ] )
       
       Notify downsteam pipelets about added objects.
       
       This method is typically called by add() after adding objects.
       
       Users should not call this method directly.
       
       Parameters:
         added: Array of added objects
         
         option: optional object
    */
    emit_add: function( added, options ) {
      var d = this.destination;
      
      de&&ug( 'emit_add(), l: ' + added.length + ', d: ' + typeof d );
      
      d && d.add( added, options );
      
      return this;
    }, // emit_add()
    
    /* ------------------------------------------------------------------------
       update( updated [, options ] )
       
       Updates objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_update() of
       transformed objects by transform(). This only works if transform
       always returns as many objects as its source. Otherwise, the
       programmer must also implement update().
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         option: optional object
    */
    update: function( updated, options ) {
      var previous = [], modified = [], out = [];
      
      for( var i = -1, l = updated.length; ++i < l; ) {
        var u = updated[ i ];
        
        previous.push( u[ 0 ] );
        modified.push( u[ 1 ] );
      }
      
      previous = this.transform( previous );
      modified = this.transform( modified );
      
      for( i = -1; ++i < l; ) {
        out.push( [ previous[ i ], modified[ i ] ] );
      }
      
      return this.emit_update( out, options );
    }, // update()
    
    /* ------------------------------------------------------------------------
       emit_update( updated [, options ] )
        
       Notify downsteam pipelets of updated object values.
       
       This method is typically called by update() after updating objects.
       
       Users should not call this method directly.
       
       Parameters:
         updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         option: optional object
    */
    emit_update: function( updated, options ) {
      var d = this.destination;
      
      d && d.update( updated, options );
      
      return this;
    }, // emit_update()
    
    /* ------------------------------------------------------------------------
       remove( removed [, options ] )
       
       Removes objects from this pipelet then notify downstream pipelets.
       
       This method should only be called by the source pipelet.
       
       Unless there is no source, this function should not be called directly by
       users.
       
       This method is often overloaded by derived classes, the default
       behavior is to notify downstream pipelets using emit_remove() of
       transformed objects by transform().
       
       Parameters:
         removed: Array of object values to remove
         
         option: optional object
    */
    remove: function( removed, options ) {
      return this.emit_remove( this.transform( removed ), options );
    }, // remove()
    
    /* ------------------------------------------------------------------------
       emit_remove( removed [, options ] )
       
       Notify downsteam pipelets of removed object.
       
       This method is typically called by remove() after removing objects.
       
       Users should not call this method directly.
       
       Parameters:
         - removed: Array of removed object values.
         
         option: optional object
    */
    emit_remove: function( removed, options ) {
      var d = this.destination;
      
      d && d.remove( removed, options );
      
      return this;
    }, // emit_remove()
    
    /* ------------------------------------------------------------------------
       clear( [ options ] )
       
       Clears the content of this Pipelet and downstream pipelets.
       
       clear() is usually called when an update requires to clear the state of all
       downstream objects. This is typically done when:
         - when a stream is no longer needed and memory can be reclaimed;
         - all or most values will change and it is more efficient to clear;
         - the state of downstream objects cannot be updated incremetally;
       .
       
       Parameters:
         option: optional object
    */
    clear: function( options ){
      return this.emit_clear( options );
    }, // clear()
    
    /* ------------------------------------------------------------------------
       emit_clear( [ options ] )
       
       Notify downsteam pipelets that all object values should be cleared.
       
       This method is typically called by clear() for clearing downstream objects.
       
       Users should not call this method directly.

       Parameters:
         option: optional object
    */
    emit_clear: function( options ) {
      var d = this.destination;
      
      d && d.clear( options );
      
      return this;
    }, // emit_clear()
    
    /* ------------------------------------------------------------------------
       set_source( source )
       
       Connect and/or disconnect from upstream source pipelet.
       
       The content of the source is then "added" to this pipelet using this.add().
       
       Parameters:
         source (optional): the source pipelet or any other object to connect to.
         
           If source is an not an instance of Pipelet, it's content is only added
           to the current pipelet using this.add(). It is typically an Array but
           could be any other object type that this.add() supports such as a
           function.
           
           If undefined, the current source pipelet is only removed from its source
           if any.
    */
    set_source: function( source ) {
      var s = this.source;
      
      if ( s ) {
        // disconnect from upstream source pipelet
        s._remove_destination && s._remove_destination( this );
        
        this._set_source();
        
        // After disconnection from its source, all downstream pipelets should be cleared
        // New content will be provided if this is attached to a new source
        this.clear();
      }
      
      if ( source && ! source.is_void ) {
        if ( source.fetch ) {
          var that = this;
          
          source.fetch( function( values ) {
            if ( values.length ) {
              that.add( values );
            } else {
              that._set_source( source );
              source._add_destination( that );
            }
          } );
        } else {
          this.add( source );
          this._set_source( source );
        }
      }
      
      return this;
    }, // set_source()
    
    /* ------------------------------------------------------------------------
       _set_source( source )
       
       Sets the source pipelet for this pipelet or remove it if source is
       undefined.
       
       This is a low-level method that should not be used by external objects
       because it does not add a destionation to the source pipelet.
       
       This method can be overloaded by derived classes to:
         - change the implementation of source
         - reject the addition by generating an exception.
         - trigger other actions on addition
       
       Paramters:
         - source: the source pipelet to add or undefined to remove the source. 
    */
    _set_source: function( source ) {
      this.source = source;
      
      return this;
    }, // _set_source()
    
    /* ------------------------------------------------------------------------
       _add_destination( destination )
       
       Adds a destination pipelet to this pipelet.
       
       This is a low-level method that should not be used by external objects
       because it does not add the source of the destination pipelet so
       added.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the addition by generating an exception.
         - trigger other actions on addition
       
       Paramters:
         - destination: the destination pipelet to add 
    */
    _add_destination: function( p ) {
      var d = this.destination;
      
      if ( d ) {
        if ( d instanceof Fork ) {
          d._add_destination( p );
        } else {
          this.destination = new Fork( this, { _implicit: true }, d, p );
        }
      } else {
        this.destination = p;
      }
      
      return this;
    }, // _add_destination()
    
    /* ------------------------------------------------------------------------
       _remove_destination( destination )
       
       Removes a destination pipelet to this pipelet.
       
       This is a low-level method that should not be used by external objects
       because it does not remove the source of the destination pipelet so
       removed.
       
       This method can be overloaded by derived classes to:
         - change the implementation of destionation(s)
         - reject the removal by generating an exception.
         - trigger other actions on removal
       
       Paramters:
         - destination: the destionation pipelet to remove 
    */
    _remove_destination: function( p ) {
      var u, d = this.destination;
      
      if ( d instanceof Fork ) {
        d._remove_destination( p );
      } else {
        this.destination = u;
      }
      
      return this;
    }, // _remove_destination()
    
    /* ------------------------------------------------------------------------
       make_key( object )
       
       Use this.key to generate code JIT to return a unique a string for an
       object based on the key coordinates concatenation separated with '#'.
       
       Parameters:
         object: an object which key is requested.
    */
    make_key: function( o ) {
      var key = this.key, l = key.length, code = [];
      
      for ( var i = -1; ++i < l; ) code.push( 'o.' + key[ i ] );
      
      eval( new Code()
        ._function( 'this.make_key', null, [ 'o' ] )
          .add( "return '' + " + code.join( " + '#' + " ) )
        .end( 'make_key()' )
        .get()
      );
      
      return this.make_key( o );
    } // make_key()
  } ); // Pipelet instance methods
  
  /* --------------------------------------------------------------------------
    The xs object is a void source Pipelet to provide a fluid interface with a
    namespace for other Pipelets.
    
    Example:
      Publish a sales dataset from a 'sales' file:
      
      xs.file( 'sales' ).publish();
      
      The xs objects acts a namespace for XS chainable pipelets. Without the xs
      object, one would have to write the following less fluid code where the
      xs namespace is not explicit and requiring the new operator on a class to
      create the fist pipelet of a chain:
      
      new File( 'sales' ).publish();
  */
  var xs = new Pipelet();
  
  // Prevent becoming a source of any downstream Pipelet, see Pipelet.prototype.set_source()
  xs.is_void = true;
  
  // Pipelet Class methods
  
  /* -------------------------------------------------------------------------------------------
     Pipelet.add( name, pipelet )
     
     Add a pipelet method to the Pipelet base class.
     
     Parameters:
       - name   : (string) the name of the pipelet
       - pipelet: (function) the method.
  */
  Pipelet.add = function( name, pipelet ) {
    return Pipelet.prototype[ name ] = pipelet;
  };
  
  /* -------------------------------------------------------------------------------------------
     Pipelet.set_default_options( source, parameters )
     
     Set default options for pipelet parameters.
     
     Returns an Array of parameters with default options as the last parameter.
     
     Parameters:
       - source     : source pipelet
       - parameters : arguments from pipelet invocation, the last of which is considered options
                      if it is an object and not an instance of Array or Pipelet
  */
  Pipelet.set_default_options = function( source, parameters ) {
    parameters = slice.call( parameters, 0 );
    
    var options = { key: source.key }
      , l = parameters.length
    ;
    
    if ( l ) {
      var last = parameters[ --l ];
      
      if ( typeof last === 'object'
        && ! ( last instanceof Array )
        && ! ( last instanceof Pipelet )
      ) {
        parameters[ l ] = extend( options, last );
      } else {
        parameters.push( options );
      }
    } else {
      parameters = [ options ];
    }
    
    return parameters;
  }; // Pipelet.set_default_options()
  
  /* --------------------------------------------------------------------------
     Pipelet.build( name, constructor [, methods [, pipelet ] ] ] )
     
     Pipelet builder:
       - Makes constructor a subclass of This class
       - defines Pipelet[ name ] using generated code or pipelet function
       - add methods to constructor's prototype, if any
     
     Parameters:
       - name (string)     : the name of the pipelet
       - constructor       : a Pipelet constructor function which signature is:
         - parameters      : 0 to n required parameters either Pipelet
                             instances or non-objects (numbers, strings,
                             functions, booleans, null, undefined)
         - options         : optional parameters in an object, will extend
                             default options
     
     Optional Parameters:
       - methods (object)  : methods for the constructor's class
       - pipelet (function): the pipelet function creating an instance
           of the constructor's class.
       
     Example: a 'from_usa' pipelet that filters values which country attribute
     is 'USA'.
     
     Programmer:
        function From_USA( options ) {
          return Pipelet.call( this, options );
        }
        
        Pipelet.build( "from_USA", From_USA,
          { transform: function( values ) {
              var usa_values = [];
              
              for ( var i = 0; i < values.length; ) {
                var v = values[ i++ ];
                
                if ( v.country === 'USA' ) usa_values.push( v );
              }
              
              return usa_values;
            }
          } // methods
        );
        
     Architect Usage, displays sales from usa in a table:
       xs.file( 'sales' ).from_USA().table( '#sales_from_usa' );
  */
  Pipelet.build = function( name, constructor, methods, pipelet ){
    subclass( this, constructor );
    
    constructor.build = Pipelet.build; // allows subclass to be used to build other pipelets
    
    methods && extend( constructor.prototype, methods );
    
    var u;
    
    if ( pipelet === u ) {
      pipelet = ( function() {
        function constructor_apply( a ) {
          // Pretend this object was created using new constructor() 
          this.constructor = constructor;
          
          // Call constructor as new would have
          var r = constructor.apply( this, a );
          
          // Return this if constructor did not return anything
          return r === u ? this: r;
        }
        
        constructor_apply.prototype = constructor.prototype;
        
        return function pipelet() {
          var a = Pipelet.set_default_options( this, arguments );
          
          return new constructor_apply( a ).set_source( this );
        } // pipelet()
      } )();
    }
    
    Pipelet.add( name, pipelet );
    
    return constructor;
  }; // Pipelet.build()
  
  /* -------------------------------------------------------------------------------------------
     Compose( name, composition [, context / constructor] )
     
     Compose a pipelet from other pipelets.
     
     Parameters:
       - name        : (string) the name of the pipelet
       
       - composition : (function) returning a output Pipelet instance and which signature is:
         - in        : (pipelet) the input Pipelet instance to this pipelet
         - parameters: optional parameters to the pipelet coming from the invocation of
                       the pipelet
         - options   : comming from the pipelet options augmented with default options
         
       - context / constructor : used to call composition, if this is a function it is used
                                 as a class constructor which instance is the context. The
                                 constructor is created using the same parameters as the
                                 composition function.
     
     Example, Compose a filter with an aggregate:     
       1/ Create the composition using source as the first mandatory parameter and options
          as the last that can be shared between all pipelets of the composition:
       
         function aggregate_from( source, from, measures, dimensions, options ) {
           return source
             .filter   ( from, options )
             .aggregate( measures, dimensions, options )
           ;
         }
       
       2/ Build the pipelet:
       
         XS.Compose( 'aggregate_from', aggregate_from );
       
       3/ Use composed aggregate_from() to aggregates sales yearly from usa:
       
         xs.model( 'sales' )
           .aggregate_from( [{ country: 'USA'}], [{ id: 'sales'}], [{ id: 'year'}] )
         ;
       
  */
  function Compose( name, composition, context ) {
    return Pipelet.add( name, function() {
      var a = Pipelet.set_default_options( this, arguments );
      
      a.unshift( this );
      
      if ( typeof context === 'function' ) context = new context( a );
      
      return composition.apply( context, a );
    } );
  } // Compose()
  
  /* -------------------------------------------------------------------------------------------
     Fork( source [, options] [, destination [, destination [, ...]]] )
     
     Forks one source into many destinations
  */
  function Fork( source, options ) {
    var implicit = Pipelet.call( this, extend( { key: source.key }, options ) ).options._implicit;
    
    this.destinations = [];
    
    for( var i = 1; ++i < arguments.length; ) {
      var p = arguments[ i ];
      
      if ( p && p instanceof Pipelet ) {
        if ( implicit ) {
          this._add_destination( p );
        } else {
          p.set_source( this );
        }
      }
    }
    
    if ( implicit ) {
      this.source = source;
    } else {
      this.set_source( source );
    }
    
    return this;
  } // Fork()
  
  Pipelet.prototype.fork = function( options ) {
    var fork = new Fork( this, options );
    
    for( var i = 0; ++i < arguments.length; ) {
      arguments[ i ].set_source( fork );
    }
    
    return fork.set_source( this );
  } // Pipelet.prototype.fork()
  
  subclass( Pipelet, Fork );
  
  extend( p = Fork.prototype, {
    /* ------------------------------------------------------------------------
       emit_add( added [, options ] )
       
       Notify downsteam pipelets about added objects.
       
       Parameters:
         - added: Array of added objects
         
         - options: optional object
    */
    emit_add: function( added, options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].add( added, options );
      
      return this;
    }, // emit_add()
    
    /* ------------------------------------------------------------------------
       emit_remove( removed [, options ] )
       
       Notify downsteam pipelets of removed object.
       
       Parameters:
         - removed: Array of removed object values.
         
         - options: optional object
    */
    emit_remove: function( removed, options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].remove( removed, options );
      
      return this;
    }, // emit_remove()
    
    /* ------------------------------------------------------------------------
       emit_update( updated [, options ] )
       
       Notify downsteam pipelets of updated object values.
       
       Parameters:
         - updated: Array of updates, each update is an Array of two objects:
           - the first is the previous object value,
           - the second is the updated object value.
         
         - options: optional object
    */
    emit_update: function( updated, options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].update( updated, options );
      
      return this;
    }, // emit_update()
    
    /* ------------------------------------------------------------------------
       emit_clear( [ options ] )
       
       Notify downsteam pipelets that all object values should be cleared.
       
       Parameters:
         - options: optional object
    */
    emit_clear: function( options ) {
      var d = this.destinations, l = d.length;
      
      for ( var i = -1; ++i < l; ) d[ i ].clear( options );
      
      return this;
    }, // emit_clear()
    
    _add_destination: function( d ) {
      if ( this.destinations.indexOf( d ) !== -1 ) throw new Error( "Fork, _add_destination(), invalid destination: already there" );
      
      this.destinations.push( d );
      
      return this;
    }, // _add_destination()
    
    _remove_destination: function( p ) {
      var d = this.destinations;
      
      if ( ( p = d.indexOf( p ) ) === -1 ) throw new Error( "Fork, _remove_destination(), destination not found in this" );
      
      d.splice( p, 1 );
      
      return this;
    } // _remove_destination()
  } ); // Fork.prototype
  
  /* -------------------------------------------------------------------------------------------
     Union( sources, options )
     
     Forwards many sources to one destination
  */
  function Union( sources, options ) {
    var implicit = Pipelet.call( this, extend( { key: source.key }, options ) ).options._implicit;
    
    this.sources = [];
    
    for( var i = 1; ++i < arguments.length; ) {
      var p = arguments[ i ];
      
      if ( p && p instanceof Pipelet ) {
        if ( implicit ) {
          this._add_source( p );
        } else {
          p.set_source( this );
        }
      }
    }
    
    if ( implicit ) {
      this.source = source;
    } else {
      this.set_source( source );
    }
    
    return this;
  } // Union()
  
  Pipelet.prototype.union = function( sources, options ) {
    if ( sources ) {
      sources.unshift( this );
    } else {
      sources = [ this ];
    }
    
    var union = new Union( sources, options );
    
    return this;
  } // Pipelet.prototype.fork()
  
  subclass( Pipelet, Union );
  
  extend( p = Union.prototype, {
    /* ------------------------------------------------------------------------
       fetch( receiver )
    */
    fetch: function( receiver ) {
      var sources = this.sources;
      
      for ( var i = -1; ++i < sources.length; ) {
        var s = sources[ i ];
        
        if ( source.fetch ) {
          source.fetch( function( values ) {
            values && values.length && receiver( values );
          } )
        } else if ( source.get ) {
          values = source.get();
          
          values && values.length && receiver( values );
        }
      }
      
      receiver( [] );
      
      return this;
    }, // fetch()
    
    _add_source: function( d ) {
      if ( this.sources.indexOf( d ) !== -1 ) throw new Error( "Union, _add_source(), invalid source: already there" );
      
      this.sources.push( d );
      
      return this;
    }, // _add_source()
    
    _remove_source: function( p ) {
      var s = this.sources;
      
      if ( ( p = s.indexOf( p ) ) === -1 ) throw new Error( "Union, _remove_source(), source not found in this" );
      
      s.splice( p, 1 );
      
      return this;
    } // _remove_source()
  } ); // Union.prototype
  
  /* -------------------------------------------------------------------------------------------
     Set( [values], [options] )
     
     Non-ordered set.
     
     Parameters:
       - values: an array of objects to set initial content.
       
       - options: optional object to provide options for Set and parent class Pipelet:
         - name: set name
         - key: unique key for each value, default is [ 'id' ]
  */
  function Set( a, options ) {
    var u;
    
    if ( options === u ) {
      options = a;
      a = u;
    }
     
    options = Pipelet.call( this, options ).options;
    
    this.a = [];
    
    a && this.add( a )
    
    de&&ug( "New Set, name: " + options.name + ", length: " + this.a.length );
    
    return this;
  } // Set()
  
  Pipelet.build( 'set', Set );
  
  /* -------------------------------------------------------------------------------------------
     Set instance methods
  */
  extend( Set.prototype, {
    /* ------------------------------------------------------------------------
       fetch( receiver )
       
       Fetches set content, possibly in several chunks.
       
       See Pipelet.fetch() receiver documentation.
    */
    fetch: function( receiver ) {
      var a = this.a;
      
      a && a.length && receiver( a );
      
      // An alternative would be to send a true sentinel object
      // - e.g. receiver( xs.no_more )
      receiver( [] );
      
      return this;
    }, // fetch()
    
    /* ------------------------------------------------------------------------
       clear()
       
       Clears content then notifes downsteam Pipelets.
    */
    clear: function() {
      this.a = [];
      
      return this.emit_clear();
    }, // get()
    
    /* ------------------------------------------------------------------------
       add( values )
       
       Add values to the set then notifies downsteam Pipelets.
    */
    add: function( values ) {
      push.apply( this.a, values );
      
      return this.emit_add( values );
    }, // add()
    
    /* ------------------------------------------------------------------------
       update( updates )
       
       Update set values using updates then notifes downsteam Pipelets.
       
       Parameter:
         updates: Array of updates, an update is an array of two values, the
           first is the previous value, the second is the updated value.
    */
    update: function( updates ) {
      for ( var i = -1, l = updates.length, updated = []; ++i < l; ) {
        var o = updates[ i ]
          , p = this.index_of( o[ 0 ] )
        ;
        
        if ( p === -1 ) continue;
        
        this.a[ p ] = o[ 1 ];
        
        updated.push( o );
      }
      
      return this.emit_update( updated );
    }, // update()
    
    /* ------------------------------------------------------------------------
       remove( values )
       
       Remove values from the set then notify downsteam Pipelets
    */
    remove: function( values ) {
      for ( var i = -1, l = values.length, removed = []; ++i < l; ) {
        var o = values[ i ]
          , p = this.index_of( o )
        ;
        
        if ( p === -1 ) continue;
        
        this.a.splice( p, 1 ); // could be faster on smaller arrays
        
        removed.push( o ); 
      }
      
      return this.emit_remove( removed );
    }, // remove()
    
    /* ------------------------------------------------------------------------
       index_of( value )
       
       Lookup the position of a vaue in the set's array of items.
       
       Generate optimized code using make_index_of() during first call.
       
       Returns:
         The position of the item in the set or -1 if not found.
    */
    index_of: function( v ) {
      return this.make_index_of().index_of( v ); 
    }, // index_of()
    
    /* ------------------------------------------------------------------------
       JIT Code Generator for index_of() from this.key
       
       Generated code is tied to current key. Uses unrolled while for maximum
       performance.
       
       Other possible further optimization:
         - split set array in smaller arrays,
         - create an object for fast access to individual keys, a naive
           implementation would be to use a single object but many benchmarcks
           have proven this technique very slow. A better option would be to
           use a tree possibly with hashed keys
    */
    make_index_of: function() {
      var key = this.key, l = key.length;
      
      var vars = [ 'a = this.a', 'l = a.length', 'i = -1' ];
      
      var first, inner, last;
      
      if ( l > 1 ) {
        vars.push( 'r' );
        
        var tests = [], field;
        
        for( var i = -1; ++i < l; ) {
          field = key[ i ];
          
          tests.push( ( i === 0 ? '( r = a[ ++i ] ).' : 'r.' ) + field + ' === _' + field );
        }
        
        first = 'if ( ' + tests.join( ' && ' ) + ' ) return i;';
      } else {
        field = key[ 0 ];
        
        var test = 'a[ ++i ].' + field + ' === _' + field;
        
        first = 'if ( ' + test;
        inner = '|| ' + test;
        last  = ') return i';
      }
      
      var code = new Code( 'index_of' )
        ._function( 'this.index_of', null, [ 'o' ] )
          ._var( vars )
          .vars_from_object( 'o', key ) // Local variables for key
          .unrolled_while( first, inner, last )
          .add( 'return -1' )
        .end( 'index_of()' )
        .get()
      ;
      
      eval( code );
      
      return this;
    } // make_index_of()
  } ); // Set instance methods
  
  /* -------------------------------------------------------------------------------------------
     PXXX(): template for Pipelet class definition.
  */
  function PXXX( source, options ) {
    Pipelet.call( this, options );
    
    return this;
  } // PXXX()
  
  subclass( Pipelet, PXXX );
  
  /* ------------------------------------------------------------------------
     Template pipelet
  */
  Pipelet.prototype.pxxx = function( options ) {
    return new PXXX( options ).set_source( this );
  }; // Pipelet.prototype.pxxx()
  
  extend( PXXX.prototype, {
    /* ------------------------------------------------------------------------
       add( values )
       
       Called when items were added to the source
    */
    add: function( values ) {
      return this.emit_add( values ); // forward added values
    }, // add()
    
    /* ------------------------------------------------------------------------
       remove( values )
       
       Called when items were removed from the source
    */
    remove: function( values ) {
      return this.emit_remove( values ); // forward removed values
    }, // remove()
    
    /* ------------------------------------------------------------------------
       update( updates )
       
       Called when items were updated inside the source
    */
    update: function( updates ) {
      return this.emit_update( updates ); // forward updated values
    }, // update()
    
    /* ------------------------------------------------------------------------
       clear()
       
       Called when all items should be cleared, when the source set
        was disconnected from its source and new data is expected.
    */
    clear: function() {
      return this.emit_clear(); // forward to downstream pipelets
    } // clear()
  } ); // PXXX instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Compose', 'Pipelet', 'Fork', 'Union', 'Set', 'xs' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // pipelet.js
