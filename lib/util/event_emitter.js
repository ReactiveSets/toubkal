/*  event_emitter.js
    
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
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'event_emitter', [ './console_logger', './loggable' ], function( Console_Logger, Loggable ) {
  "use strict";
  
  var log   = Console_Logger().bind( null, 'event_emitter' )
    , debug = true
    , slice = Array.prototype.slice
  ;
  
  /* -------------------------------------------------------------------------------------------
     Event_Emitter( name? )
     
     Simple event emitter, compatible with node EventEmitter.
     
     Parameters:
     - name (Optional String): instance name for debugging purposes
     
     ToDo: implement full-featured event emiter class, or import one
  */
  function Event_Emitter( name ) {
    Loggable.call( this, name );
    
    this._events = {};
  } // Event_Emitter()
  
  Loggable.subclass( 'Event_Emitter', Event_Emitter, function() {
    return {
      /* ------------------------------------------------------------------------
         on( event_name, listener [, that] [, once] )
         
         once( event_name, listener [, that] )
         
         Sets an event listener that listens to events emited by this emitter.
         
         Parameters:
           - event_name: (String) the name of the event.
               
           - listener: (Function) will be called with the parameters emited by
               the event emitter.
             
           - that: (Object) optional, the context to call the listener, if not
               specified the context is this event emitter's instance.
             
           - once: (Boolean) optional, if true, the event listener will be
               removed right before the first emit on this event.
      */
      on: function( event_name, listener, that, once ) {
        var listeners = this._events[ event_name ] || ( this._events[ event_name ] = [] );
        
        listeners.push( { f: listener, that: that || this, once: once } );
        
        debug && log( 'on()', {
          event: event_name,
          name: ( this._get_name && this._get_name() || '' ),
          listeners: listeners.length,
          once: once
        } );
        
        // ToDo: throw exception if some limit exceeded in the number of listeners to prevent memory leaks
        
        return this;
      }, // on()
      
      once: function( event_name, listener, that ) {
        return this.on( event_name, listener, that, true );
      }, // once()
      
      /* ------------------------------------------------------------------------
         emit( event_name, ... )
         
         Parameters:
           - event_name: (String) the name of the event.
           - all additional parameters are emitted to listeners.
      */
      emit: function( event_name ) {
        return this._emit_event( event_name, slice.call( arguments, 1 ) );
      }, // emit()
      
      /* ------------------------------------------------------------------------
         _emit_event( event_name, arguments )
         
         Parameters:
           - event_name (String): the name of the event.
           - arguments   (Array): parameters emitted to listeners.
      */
      _emit_event: function( event_name, a ) {
        var listeners = this._events[ event_name ]
          , l = listeners && listeners.length
          , name
        ;
        
        if ( l ) {
          if ( debug ) {
            if ( name = this._get_name && this._get_name() ) {
              name += '.';
            } else {
              name = '';
            }
            
            name += '_emit_event( ' + event_name + ' )';
            
            log( name, { listeners_count: l } );
          }
          
          for( var i = -1, listener; listener = listeners[ ++i ]; ) {
            if ( listener.once ) {
              debug && log( name, { message: 'removing "once" event listener', position: i } );
              
              listeners.splice( i--, 1 );
              
              l -= 1;
            }
            
            try {
              listener.f.apply( listener.that, a );
            } catch( e ) {
              log( 'exception ' + name, e );
            }
          } // for all listeners
        }
        
        return this;
      }, // _emit_event()
      
      /* ------------------------------------------------------------------------
         events()
         
         Return the name of all events for which there are listeners.
      */
      events: function() {
        return Object.keys( this._events );
      }, // events()
      
      /* ------------------------------------------------------------------------
         listeners_count( event_name )
         
         Returns the number of listeners for event_name.
         
         Parameters:
         - event_name (String): the name of the event.
      */
      listeners_count: function( event_name ) {
        return this._events[ event_name ] ? this._events[ event_name ].length : 0;
      }, // listeners_count()
      
      /* ------------------------------------------------------------------------
         listeners( event_name )
         
         Returns an array of listeners for event_name, where each listener is the
         function provided to on() or once().
         
         Parameters:
         - event_name (String): the name of the event.
      */
      listeners: function( event_name ) {
        return ( this._events[ event_name ] || [] ).map( function( listener ) { return listener.f } );
      } // listeners()
    } // Event_Emitter instance methods
  } ); // Event_Emitter prototyper
  
  debug && log( "module loaded" );
  
  return Event_Emitter;
} ); // event_emitter.js
