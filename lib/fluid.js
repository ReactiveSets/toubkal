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
     function Count( source, name ) {
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
 */
  
function Fluid(){}
Fluid.xs_class = Fluid;
Fluid.xs_super = null;
XS.fluid = { XS: XS };
  
// Hack, so that "excess" is displayed in v8 debugger :)
var excess = EXTEND;

var saw_pipelet = false;

function bind_factory( klass, factory ){
  
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
    bound_factory = function abstract_factory(){};
  }
      
  // Ease chaining for fluid API, ie xs.xs_classX() & xs_classX.subclass()
  bound_factory.xs_class = klass;
  bound_factory.subclass = klass.subclass = Fluid[ factory_name ].subclass;
  Fluid.prototype[ factory_name ]
  = XS.fluid[      factory_name ]
  //= XS[      factory_name ]
  //= XS_xs[   factory_name ]
  = klass.prototype.factory
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
          // ToDo: until the issue with type hierachie is fixe, I need to
          // hide the datalet class and have an alias to make it's user use
          // class pipelet instead.
          de&&mand( XS.fluid.pipelet );
          XS.fluid.datalet = XS.fluid.pipelet;
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
    klass.xs_super = klass.prototype.xs_super = super_class;
    
    // Get the factory now, null maybe (versus always inheriting a bad one)
    var factory = methods && methods.factory;
      
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
    
    // Determine name of class and factory, ie "Pipelet" & "pipelet"
    var class_name   = klass.name;
    var factory_name = alias || class_name.toLowerCase();
      
    // Add info to the class dictionnary
    Fluid[ factory_name ] = {
      xs_class: klass
    , subclass: function subclass() {
        return Fluid.subclass.apply( klass, arguments );
      }
    };
    
    // Abstract classes don't have a factory, must have one returning nothing
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

// The_Void is a singleton empty datalet that is both the original source and
// sometimes the final destination of all data in the data flow.
// Note: in a multiverse there would be multiple voids, it may prove usefull
// when providing virtual hosting. Multiverse's existance is debated.
function The_Void(){
  The_Void.xs_super.call( this );
  this.is_void = true;
  this.name    = "void";
  // All objects have a source, the void included!
  this.source  = this;
  // All objects have connections. But the_void don't track them.
  this.destination = this;
  return this;
}
  
var noop     = function noop(){};
var identity = function identity(){ this.source = null; return this; };
  
// Make sure that The void implements notify/add/update/... properly.
XS.fluid.datalet.subclass(
  The_Void,
  {
    factory:             function void_factory(){ return XS.the_void; },
    toString:            function toString(){ return "XS/void"; },
    get:                 noop,
    set_source:          identity,
    _set_source:         identity,
    _add_destination:    identity,
    _remove_destination: identity,
    notify:              identity,
    add:                 identity,
    update:              identity,
    remove:              identity,
    clear:               identity,
    emit_add:            identity,
    emit_update:         identity,
    emit_remove:         identity,
    emit_clear :         identity
    
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
