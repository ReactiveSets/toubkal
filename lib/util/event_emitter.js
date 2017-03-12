/*  event_emitter.js
    
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
( 'event_emitter', [ './console_logger', './loggable' ], function( Console_Logger, Loggable ) {
  "use strict";
  
  var log   = Console_Logger().bind( null, 'event_emitter' )
    , debug = false
    , slice = Array.prototype.slice
  ;
  
  /* --------------------------------------------------------------------------
      @class Event_Emitter( name )
      
      @short Basic event emitter
      
      @parameters
      - **name** (Optional String): instance name for debugging purposes
  */
  function Event_Emitter( name ) {
    Loggable.call( this, name );
    
    this._events = {};
  } // Event_Emitter()
  
  Loggable.subclass( 'Event_Emitter', Event_Emitter, function() {
    return {
      /* ----------------------------------------------------------------------
          @method Event_Emitter..on( event_name, listener, context, once )
          
          @method Event_Emitter..once( event_name, listener, context )
          
          @short Sets an event listener
          
          @parameters
          - **event_name** (String): the name of the event.
          
          - **listener** (Function): will be called with the parameters emited by
            the event emitter.
          
          - **context** (Object): optional, the context to call the listener, if
            not specified the context is this event emitter's instance.
          
          - **once** (Boolean): optional, if true, the event listener will be
            removed right before the first emit on this event.
          
          ### See Also
          - Method Event_Emitter..once()
          - Method Event_Emitter..remove_listener()
      */
      on: function( event_name, listener, context, once ) {
        var that      = this
          , events    = that._events
          , listeners = events[ event_name ] || ( events[ event_name ] = [] )
        ;
        
        listeners.push( { f: listener, context: context || that, once: once } );
        
        debug && log( 'on()', {
          event: event_name,
          name: ( that._get_name && that._get_name() || '' ),
          listeners: listeners.length,
          once: once
        } );
        
        // ToDo: throw exception if some limit exceeded in the number of listeners to prevent memory leaks
        return that;
      }, // Event_Emitter..on()
      
      /* ----------------------------------------------------------------------
          @method Event_Emitter..once( event_name, listener, context )
          
          @short Sets a one-time event listener
          
          @parameters
          - **event_name** (String): the name of the event.
          
          - **listener** (Function): will be called with the parameters emited by
            the event emitter.
          
          - **context** (Object): optional, the context to call the listener, if
            not specified the context is this event emitter's instance.
          
          ### See Also
          - Method Event_Emitter..on()
          - Method Event_Emitter..remove_listener()
      */
      once: function( event_name, listener, context ) {
        return this.on( event_name, listener, context, true );
      }, // Event_Emitter..once()
      
      /* ----------------------------------------------------------------------
          @method Event_Emitter..emit( event_name, ... )
          
          @short Emits an event
          
          @parameters
          - **event_name** (String): the name of the event.
          - all additional parameters are emitted to listeners.
          
          ### See Also
          - Method Event_Emitter..emit_apply()
      */
      emit: function( event_name ) {
        return this.emit_apply( event_name, slice.call( arguments, 1 ) );
      }, // Event_Emitter..emit()
      
      /* ----------------------------------------------------------------------
          @method Event_Emitter..emit_apply( event_name, arguments )
          
          @short Emits an event providing arguments as an Array
          
          @parameters
          - **event_name** (String): the name of the event.
          - **arguments** (Array): parameters emitted to listeners.
          
          ### See Also
          - Method Event_Emitter..emit()
      */
      emit_apply: function( event_name, a ) {
        var that      = this
          , listeners = that._events[ event_name ]
          , l         = listeners && listeners.length
          , name
        ;
        
        if ( l ) {
          if ( debug ) {
            if ( name = that._get_name && that._get_name() ) {
              name += '.';
            } else {
              name = '';
            }
            
            name += 'emit_apply( ' + event_name + ' )';
            
            log( name, { listeners_count: l } );
          }
          
          // Hijack listeners.splice to handle concurrent Event_Emitter..remove_listener()
          listeners.splice = splice;
          
          for( var i = -1, listener; listener = listeners[ ++i ]; ) {
            listener.once && splice( i );
            
            listener.f.apply( listener.context, a );
          } // for all listeners
          
          // Stop hijacking listeners.splice
          delete listeners.splice;
        }
        
        return that;
        
        function splice( position ) { // one event listener is removed
          debug && log( name + ', remove listener', position );
          
          if( position <= i ) i -= 1;
          
          [].splice.call( listeners, position, 1 );
        } // splice()
      }, // Event_Emitter..emit_apply()
      
      /* ----------------------------------------------------------------------
          @method Event_Emitter..remove_listener( event_name, listener )
          
          @short Removes ```listener``` from listeners for ```event_name```
          
          @parameters
          - **event_name** (String): the name of the event.
          - **listener** (Function): orignially passed to method Event_Emitter..on()
          
          ### See Also
          - Method Event_Emitter..once()
      */
      remove_listener: function( event_name, listener ) {
        var listeners = this._events[ event_name ] || []
          , i         = -1
          , _listener
        ;
        
        while( _listener = listeners[ ++i ] )
          if( listener === _listener.f ) {
            listeners.splice( i, 1 ); // may be hijacked by Event_Emitter..emit_apply()
            
            break;
          }
      }, // Event_Emitter..remove_listener()
      
      /* ----------------------------------------------------------------------
          @method Event_Emitter..events()
          
          @short Returns the name of all events for which there are listeners
      */
      events: function() {
        return Object.keys( this._events );
      }, // Event_Emitter..events()
      
      /* ----------------------------------------------------------------------
          @method Event_Emitter..listeners_count( event_name )
          
          @short Returns the number of listeners for event_name
          
          @parameters
          - **event_name** (String): the name of the event.
          
          ### See Also
          - Method Event_Emitter..listeners()
      */
      listeners_count: function( event_name ) {
        return ( this._events[ event_name ] || [] ).length;
      }, // Event_Emitter..listeners_count()
      
      /* ----------------------------------------------------------------------
          @method Event_Emitter..listeners( event_name )
          
          @short Returns an array of listeners for event_name
          
          @parameters
          - **event_name** (String): the name of the event.
      */
      listeners: function( event_name ) {
        return ( this._events[ event_name ] || [] ).map( function( listener ) { return listener.f } );
      } // Event_Emitter..listeners()
    } // Event_Emitter instance methods
  } ); // Event_Emitter prototyper
  
  debug && log( "module loaded" );
  
  return Event_Emitter;
} ); // event_emitter.js
