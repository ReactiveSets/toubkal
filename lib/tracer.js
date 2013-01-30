// tracer.js
//   .trace() -- debugging tool
//
// 2013/01/29 by JHR, from previus code in proxy.js

"use strict";

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( 'excess/lib/xs.js' ).XS;
    require( "excess/lib/fluid.js" );
    require( "excess/lib/fork.js"  );
  } else {
    XS = exports.XS;
  }

var xs = XS.fluid;

  /* --------------------------------------------------------------------------
     .trace( options )
     Tracers simply display whatever happens on the object they observe. 
     Data flow: source->tracer
     option log:   log function, defaults to XS.log()
            usage: log( tracer, source, operation, objects )
     Usage:
       some_xs_object.trace(); // uses X.log()
       some_xs_object.trace( { log: function( t, src, op, objs ){ .... } );
       
    Note: A.trace().b() calls b() on A because trace() returns it's source.
    This means that one can conveniently insert a tracer without disrupting
    the data flow.
    
    ToDo: current X.log() outputs its first parameter only and makes a poor
    default. See proxy.js for the definition of a trace function that is
    useful in its context, because among other things it displays the relevant
    informations that the default display function should display too.
  */

  xs.sinklet.subclass( function Trace( source, options ) {
    
    this.xs_super.call( this, options );
    this._log  = this.options.log   || XS.log;
    this.name = this.options.label || this.options.name || source.name;
    // new tracer depends on source object and get notified of changes to it
    this.set_source( source );
    return this;
    
  }, {
    
    add: function( objects ) {
      return this._log_it( { name: 'add'  , objects: objects } );
    }, // add()
    
    remove: function( objects ) {
      return this._log_it( { name: 'remove', objects: objects } );
    }, // remove()
    
    update: function( objects ) {
      return this._log_it( { name: 'update', objects: objects } );
    }, // update()
    
    _log_it: function( operation ) {
      this._log.apply( this,
        [ this, this.source, operation.name, operation.objects ]
      );
    } // trace()

  } ); // Trace class
  
XS.log( "trace module loaded" );
} )( this );
