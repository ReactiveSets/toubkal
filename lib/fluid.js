/*
   fluid.js
    Fluid API for Excess

    2013/01/27 by JHR
  
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

( function( exports ){
  
var XS;
 
if( typeof require === 'function' ){
  XS = require( './xs.js' ).XS;
}else{
  XS = exports.XS;
}
  
var log        = XS.log;
var EXTEND     = XS.extend;
var SUBCLASS   = XS.subclass;

var slice = Array.prototype.slice;


/* ----------------------------------------------------------------------------
 *  de&&bug()
 */
 
var de = true;
  
function bug( m ) {
  log( "xs fluid, " + m );
} // bug()

function mand( cond ){
  if( cond )return;
  log( "xs fluid, ASSERT FAILURE");
  throw new Error( "xs fluid, ASSERT FAILURE" );
}


/* ---------------------------------------------------------------------------
   class Fluid -- the hack to make the fluid API.
   
   The base class of every XS objects. Mainly provides a .subclass() to
   make subclasses. Each such subclass also provides a .subclass() method.
   This is just a helper to make it easier to implement the usual pattern for
   data flow node classes.

   Also redefines XS.subclass() and XS.extend() to monkey patch new classes.
   
   new_classA = XS.subclass( SubclassA, {members} )
   new_classA.subclass( SubclassB, {members} )
   
   XS.subclass( baseclass, subclass ) + XS.extend( subclass, {members} )
     
   Usage: -- implementers --
     function Count( source, name ) { // Counts number of items in source
       this.count = 0;
         this.name = name || source.name;
         this.set_source( source );
         return this;
       }
       xs.datalet.subclass( Count, {
         factory: function( source, name ) {
           return new this( source, name );
         },
         delta: function( d ) {
           if( !d ) return this;
           this.count += d;
           this.connections_add( [ { name: this.name, count: this.count } ] );
           return this;
         },
         add:    function( o ) { return this.delta( ((o & o.length) || 0) );},
         remove: function( o ) { return this.delta(-((o & o.length) || 0) );}
       } )
        
   Usage: -- users --
     var a_fool = set.count().trace() // trace number of items in set
     
   Benefit:
     .subclass()
     fluid.class.subclass( function MyNewClass(), {
       factory: function( source, p1, p2, p2 ){
          ... defaults to: return new this( source, p1, p2, p3 )...
       },
       ...
     }
     1/ automatic factory:
        obj.mynewclass( p1, p2, 3)
     2/ automatic chaining for class implementors
        obj.mynewclass.subclass( MyOtherClass, {...} )
     3/ access to super class
        obj.xs_super is available in all objects, via their prototype, usefull
        when implementing an instance method.
        fn.xs_super is available in all classes, usefull when implementing a
        class method.
     4/ less code. No need to calls XS.subclass() nor XS.extend(). No need
        to ever specify the lowercase name for the class, automatic. factories
        are inheritable, no need to provide one if it behave like the one in the
        base class, ie if it creates a new instance, to be connected to a
        source, ie if it does what most factories do. No need to deal with
        exports, the class is properly attached to the global XS object when
        the module is loaded.
     5/ consistency. The name of the default factory is the name of the class,
        in lowercase. Default factory's signature is a no brainer, always the
        same: f( source, p1, p2, ...), called with "this" set to the class,
        expected to return an object that can be the source in a chain. Note:
        it can be a new instance, or not, of this class, or not ; it's up to
        the factory to decide.
     6/ yet flexible. On can use new MyNewClass() if desired. One can use class
        method to define factories. If such class method exist and is named
        "factory" or is named after the class but in lowercase... it will be
        recognized as the default factory for the class.
     7/ if chaining were to start from the void, as I advice, then all objects
        have a source, ie no need to check if source is null, less code. When
        an object behaviour depends on it's source, source.is_void may be used,
        but this is often easy to avoid.
     8/ encapsulation. Because the way classes are implemented is encapsuled in
        the .subclass() code, the subclass don't need/can care about that and
        would not be impacted with that ways to implement classes where to
        change, ie encapsulation make it possible to change the implementation
        of something without changing that something's interface, that is often
        polite because it helps avoid breaking changes requiring updates in the
        broken code, ie encapsulation is future proof. Note: this is true also
        regarding the way a module that define a new xs class export it, it's
        up to .subclass() to decide that, not the job of the class implementer.
     9/ clean taxonomy, for doc purpose:
          Fluid (name to tune, Node?) has sources and destinations
          Datalet (name to tune) has one source and destinations
          Piplelet has one source and one destination (may become a Datalet)
          Sinklet has one source and no destination.
   Cost:
      1/ this requires some code that won't be amortized until enough classes
         are implemented.
      2/ the inner core of excess is more complex, go change it if you dare,
         you young new hire or contributor, because this is the danger zone.
      3/ may require a "lite" implementation if overhead is excessive on the
         client side. This will depend on the tool we use to package the code
         sent to the client side, ie what minimizer, optimizer, packager,
         asynch module loader, etc we eventually stabilize one ; so far: none.
   ToDo:
    - automatic options management. Options should probably always be provided
      as a last parameter. In factories, some code could be simplified if the
      option parameter was automatically removed from the other parameters, ie
      we could migrate to a signature for factories that would become richer:
        f( source, options, p1, p2, p3 )
    - some standard options could be handled automatically, ie "name" ; the
      other options could auto-pollutate this.options, as done today.
      
 */
  
function Fluid(){}
Fluid.xs_class = Fluid;
Fluid.xs_super = null;
XS.fluid = { XS: XS, xs: XS.xs };
  
// Hack, so that "excess" is displayed in v8 debugger :)
var excess = EXTEND;

var saw_pipelet = false;

function bind_factory( klass, factory ){
// Attach a factory to the class. The "factory" of a class is the main method
// to create instances of that class. However, a factory can decide to return
// an existing instance (for singletons for example). After bind_factory() is
// called, one can find the factory easely in multiple places:
//   - X.fluid.xxx
//   - any_obj.xxx
// A factory has typically two very different behaviours depending on the
// source it operates for. If that source is void, then it means that the
// factory shall return an object with no source attached. This is the case
// when it is one of the parameter of the factory, typically a string, that
// will dictate how to look up for the source, when applicable. If the source
// is not void, it means that the returned object's source must be set to
// that original source by the factory.
// Please note that it is only xxx.subclass() that calls bind_factory() and it
// does after it was able to locate the proper factory for the class, or
// after it supplied a "nothing" default one (for abstract classes).
// When the factory method is called, "this" is set to the class, the first
// parameter is the source involved (void maybe), the other parameters are
// factory defined.
  var factory_name = klass.name.toLowerCase();
  (factory_name === "tee" ) && (factory_name = "fork");
  
  var bound_factory;
  if( factory ){
    bound_factory = function(){
      // Factories signature is class.f( source, p1, p2, p... ) where class is
      // the class involved, accessible using "this" inside the methd, where
      // source is the source xs object involved and where pn are paremeters.
      return factory.apply(
        klass,
        [ this ].concat( slice.call( arguments, 0 ) ) 
      );
    };
  }else{
    // Abstract classes don't have a factory, must have one returning nothing
    // because meta data are attached to the factory, see below.
    // However, when subclass don't define a factory, they are provide a
    // default factory.
    // ToDo: figure out if a class is or is not abstract...
    // ToDo: figure out how to do a new with variadic parameters...
    bound_factory = function abstract_factory(){};
  }
      
  // Ease chaining for fluid API, ie xs.xs_classX() & xs_classX.subclass()
  bound_factory.xs_class = klass;
  bound_factory.subclass = klass.subclass = Fluid[ factory_name ].subclass;
  // Actual chaining is where obj.xxx() invoke the factory for class Xxx on
  // all objects.
  Fluid.prototype[ factory_name ]
  = XS.fluid[      factory_name ]
  //= XS[      factory_name ]
  //= XS_xs[   factory_name ] // ToDo: do it?
  = klass.prototype.factory // ToDo: kass.factory?
  = klass[factory_name]
  = bound_factory;
  if( XS.Pipelet ){
    XS.Pipelet.prototype[ factory_name ] = bound_factory;
  }
  
  return bound_factory;
}

excess( Fluid.prototype, {
  
  xs_class: Fluid,    
  xs_super: null,
  toString:  function toString() {
    return "XS/"
    + this.xs_class.name + "/"
    + ( this.name || (this.options && this.options.name) );
  },  
  
  subclass:  function subclass( klass, methods, alias, replay ){
    
    // get the true super xs class, the one of the factory
    var super_class = this.xs_class;
    
    if( !super_class ){
      if( klass.name === "Pipelet" ){
        if( !saw_pipelet ){
          // This is the first that we detect that XS.Pipelet exists
          saw_pipelet = true;
          // Copy it's methods to the Data class, the correct base class
          // ToDo: this does not work well enough because instanceof
          // is not ok to say that all datalets are XS.Pipelet, which is
          // correct in type theory but not implemented in fork.js
          EXTEND( Fluid.Datalet.prototype, klass.prototype );
          klass.prototype.xs_class = klass;
          Fluid.datalet.subclass( klass, {}, null, true ); // replay
          // ToDo: until the issue with type hierachy is fixex, I need to
          // hide the datalet class and have an alias to make it's user use
          // class pipelet instead, transparently.
          de&&mand( XS.fluid.pipelet );
          // So, for now, let's pretend datalet/pipelet diff does not matter
          XS.fluid.datalet = XS.fluid.pipelet;
          // Idem for sinklet
          XS.fluid.sinklet = XS.fluid.datalet;
        }
        super_class = Fluid.Pipelet;
        klass   = methods;
        klass.xs_class = klass,
        methods = alias;
        alias   = (klass.name === "Tee") && "fork";
      }
    }

    // When subclassing external stuff, aka subclass( b, s ), be transparent
    if( !super_class ) return SUBCLASS( klass, methods );
      
    // Remember what is the super class, convenient in constructors
    klass.xs_class = klass.prototype.xs_class = klass;
    klass.xs_super = super_class;
    // Idem for instance methods
    klass.prototype.xs_super = super_class.prototype;
    
    // Determine name of class and factory, ie "Pipelet" & "pipelet"
    var class_name   = klass.name;
    var factory_name = alias || class_name.toLowerCase();
      
    // Get the factory now, null maybe (versus always inheriting a bad one)
    var factory = methods && methods.factory;
    
    // If there is no .factory(), let's look for xxx() method for the Xxx class
    if( !factory ){ factory = methods && methods[ factory_name ]; }
    
    // If still no factory there, look for a .factory static member
    if( !factory ){ factory = klass.factory; }
    
    // Look also for a static member named after the class but in lower case
    if( !factory ){ factory = klass[ factory_name ]; }
    
    // If no factory, then provide a default one, using constructor
    if( !factory ){
      // ToDo: handle variadic parameters in new expression, if possible!
      factory = function inherited_factory( source, p1, p2, p3, p4, p5 ){
        return new this( source, p1, p2, p3, p4, p5 );
      };
    }
      
    // Speed up virtual calls, copy the members!
    // Note: this means that redefining a method will not work as expected
    // because the derived class instances will use the original definition.
    // This is not an issue, b/c xs classes are "closed" classes, for speed.
    methods = EXTEND(
      {},
      super_class.prototype,
      klass.prototype,
      methods || {},
      { xs_class: klass }
    );
  
    // Implement the subclass/extend idiomnic pattern
    if( !replay ){ SUBCLASS( super_class, klass ); }
    EXTEND( klass.prototype, methods);
    
    // Add info to the class dictionnary
    Fluid[ factory_name ] = {
      xs_class: klass
    , subclass: function subclass() {
        return Fluid.subclass.apply( klass, arguments );
      }
    };
    
    bind_factory( klass, factory );
    Fluid.prototype[ class_name ]
    = Fluid[         class_name ]
    = XS.fluid[      class_name ]
    = XS[            class_name ]
    = klass;
    
    de&&bug( "fluid XS." + factory_name + " is ready" );
    return klass;
  } // Fluid.subclass()
    
, extend: function extend( proto, methods ){
    // If external stuff, be transparent
    var klass = proto.xs_class;
    if ( !klass ) return EXTEND.apply( this, arguments );
    if( klass.name === "Set" ){
      bind_factory( klass, function set_factory( source, a, options ){ 
        var s = new this( a, EXTEND( { key: this.key }, options ) );
        // ToDo: should ctor set s.name according to options? It does not.
        // So I do it here. I should ask Jean about that.
        (!s.name && options && options.name) && (s.name = options.name);
        s.set_source( source );
        return s;
      } );
    }else if( klass.name === "Tee" ){
      bind_factory( 
        klass,
        function fork_factory( source ){
          
          var nodes   = [];
          var options = null;
          var list    = arguments;
          var ii      = 0;
          var len     = list.length();
          var item;
          
          // Collect destinations, skipping source parameter, detect options
          for( ii = 1 ;  ii < len ; ii++ ){
            item = arguments[ ii ];
            if( !item )continue;
            if( item === The_Void )continue;
            // Duck typing to detect nodes
            // ToDo: figure out a better detection scheme
            if( item.options ){
              nodes.push( item );
            // Not a destination, should be the options
            }else{
              if( ii !== len - 1 )throw new Error( "bad parameter in fork()" );
              options = item;
              break;
            }
          }
        
          var fork = new this( source, options );
          
          len = nodes.length;
          for( ii = 0 ; ii < len ; ii++ ) {
            nodes[ ii ].set_source( fork );
          }
          return fork;
      } );
    }else if( klass.name === "Pipelet" ){
      EXTEND( Fluid.Datalet.prototype, methods );
    }
    return EXTEND( klass.prototype, methods );
  } // Fluid.extend()
    
} ); // class Fluid

// XS.Fluid = Fluid;
XS.subclass = Fluid.subclass = Fluid.prototype.subclass;
XS.extend   = Fluid.extend   = Fluid.prototype.extend;
  
// A datalet is a node in the data flow directed graph. It re-emits to it's
// destinations the operations emitted by its source.
// ToDo: .dependencies() & .dependents() to be able to walk the graph, when
// debugging for example.
Fluid.subclass( function Datalet(){} );

// A sinklet is a node in the data directed graph. It consumes all the data
// it receives but produces nothing, ie there is no destinations.
Fluid.subclass( function Sinklet(){}, {
  // Default factory returns the source not the object, because it makes no
  // sense to chain something after a sink, by definition a sink has no
  // output.
  factory: function( source, p1, p2, p3, p4, p5 ){
    new this( source, p1, p2, p3, p4, p5 );
    return source;
  }
} );

// The_Void is a singleton empty datalet that is both the original source and
// sometimes the final destination of fluid data in the data flow.
// Note: in a multiverse there would be multiple voids, it may prove usefull
// when providing virtual hosting. Multiverse's existance is debated.
function The_Void(){
  The_Void.xs_super.call( this );
  // The Void is empty
  this.is_void = true;
  this.name    = "void";
  // All objects have a source, the void included!
  this.source  = this;
  // All objects have connections. But the_void don't track them.
  this.destination = this;
  return this;
}
  
var identity = function identity(){ this.source = null; return this; };
var noop     = function noop(){};
var badop    = function badop(){ throw new Error( "invalid on the Void" ); };
  
// Make sure that The void implements notify/add/update/... properly.
XS.fluid.datalet.subclass(
  The_Void,
  {
    factory:             function void_factory(){ return XS.the_void; },
    toString:            function toString(){ return "XS/void"; },
    get:                 function(){ return []; }, // The void is empty
    set_source:          identity, // The void has no source
    _set_source:         identity, // it ignores it when one sets its source
    _add_destination:    identity, // idem when when one sets destinations
    _remove_destination: identity, // idem
    fetch:               identity, // It delivers nothing, never
    notify:              identity, // It ignores transactions
    add:                 identity, // It stays empty
    update:              identity, // ever
    remove:              identity, // and ever
    clear:               identity, // and ever again
    emit_add:            identity, // It will never emit anything
    emit_update:         identity, // because one cannot add to it nor update
    emit_remove:         identity, // nor remove anything.
    emit_clear :         identity  // nor expect that clearing it matters
    
  },
  "the_void"
);

// Make the singleton
var backlog = XS.fluid;
XS.fluid = new The_Void();
// var proto = EXTEND( {}, The_Void.prototype );
EXTEND( The_Void.prototype, backlog );

// Smoke test
XS.fluid.datalet.subclass( function Dummy(){}, {
  factory: function(){ return new this(); },
  add: function(){ log( "OLAP for the dummies" ); }
} );
var dummy = XS.fluid.dummy();
dummy.add( [ { hello: "world" } ] );

log( "fluid module loaded" );
} )( this ); // broadcaster.js
