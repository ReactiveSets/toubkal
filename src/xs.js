// xs.js

( function( exports ) {
  /* -------------------------------------------------------------------------------------------
     nil_function()
  */
  function nil_function() {}
  
  /* -------------------------------------------------------------------------------------------
     extend( destination, source [, source_1 ... ] )
  */
  function extend( d ) {
    var l = arguments.length;
    
    for ( var i = 0; ++i < l; ) {
      var s = arguments[ i ];

      for ( var p in s ) if ( s.hasOwnProperty( p ) ) d[ p ] = s[ p ];
    }
    
    return d;
  } // extend()
  
  /* -------------------------------------------------------------------------------------------
     log( message )
  */
  var log;
  
  if ( typeof console != "object" || typeof console.log != "function" ) {
    // Browsers that do not have a console.log()
    log = nil_function;
    log.s = nil_function;
  } else {
    log = function( message ) {
      var date = new Date
        , year     = "" + date.getFullYear()
        , month    = "" + ( date.getMonth() + 1 )
        , day      = "" + date.getDate()
        , hour     = "" + date.getHours()
        , minutes  = "" + date.getMinutes()
        , seconds  = "" + date.getSeconds()
        , ms       = "" + date.getMilliseconds()
      ;
      
      if ( month  .length < 2 ) month    = "0" + month
      if ( day    .length < 2 ) day      = "0" + day;
      if ( hour   .length < 2 ) hour     = "0" + hour;
      if ( minutes.length < 2 ) minutes  = "0" + minutes;
      if ( seconds.length < 2 ) seconds  = "0" + seconds;
      
      switch( ms.length ) {
        case 2: ms =  "0" + ms; break;
        case 1: ms = "00" + ms; break;
      }
      
      console.log( year + '/' + month + '/' + day
        + ' ' + hour + ':' + minutes + ':' + seconds + '.' + ms
        + ' - ' + message
      );
    } // log()
    
    log.s = JSON.stringify;
  }
  
  /* -------------------------------------------------------------------------------------------
     subclass( base, f )
  */
  function subclass( base, f ) {
    return ( f.prototype = Object.create( base.prototype ) ).constructor = f;
  } // subclass()
  
  /* -------------------------------------------------------------------------------------------
     export_code( namespace, exports )
     
     Generate pretty code to export public attributes
  */
  function export_code( namespace, exports ) {
    var max = Math.max.apply( Math, exports.map( function( v ) { return v.length } ) );
    
    for ( var s = '', i = -1; ++i < max; ) s += ' ';
    
    exports.unshift(
      '\n  var ' + namespace + ' = exports.' + namespace + ' = ' + namespace + ' || {};\n'
    );
    
    var export_code = exports.reduce(
      function( r, f ) {
        return r + '\n  XS.' + ( f + s ).substr( 0, max ) + " = " + f + ';'
      }
    );
    
    de&&ug( "exports:" + export_code );
    
    return export_code;
  } // export_code()
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Set( a [, options] )
  */
  function Set( a, options ) {
    this.a = a = a || [];
    this.options = options = options || {};
    this.connections = [];
    this.key = options.key || [ "id" ];
    
    de&&ug( "New Set, name: " + options.name + ", length: " + a.length );
    
    return this;
  } // Set()
  
  var push = Array.prototype.push;
  
  /* -------------------------------------------------------------------------------------------
     Pretty JavaScript code generator
  */
  function Code( name ) {
    this.name = name;
    this.code = '';
    this.indent = '  ';
    this.blocs = [];
    
    return this;
  } // Code()
  
  extend( Code.prototype, {
    get: function() {
      return this.code;
    }, // get()
    
    eval: function() {
      de&&ug( "Code.eval: name: " + this.name + ', code:\n' + this.code );
      
      return eval( this.code );
    }, // eval()
    
    line: function( line, new_lines ) {
      this.code += this.indent + line + '\n';
      
      if ( new_lines ) while( new_lines-- ) this.code += '\n';
      
      return this;
    }, // add()
    
    add: function( statement, new_lines ) {
      return this.line( statement + ';', new_lines );
    }, // add()
    
    comment: function( comment ) {
      return this.line( '// ' + comment );
    }, // comment()
    
    begin: function( code ) {
      this.line( code + ' {' );
      
      this.blocs.push( code );
      
      this.indent += '  ';
      
      return this;
    }, // begin()
    
    end: function( comment ) {
      var code = this.blocs.pop();
      
      if ( code === undefined ) throw new Code.Syntax_Error( "Missing matching opening block" );
      
      this.indent = this.indent.substr( 2 );
      
      if ( comment === true ) {
        comment = '// ' + code;
      } else if ( comment ) {
        comment = '// ' + comment;
      } else {
        comment = '';
      }
      
      return this.line( '} ' + comment, 1 );
    }, // end()
    
    function: function( lvalue, name, parameters ) {
      var code = '';
      
      if ( lvalue ) code += lvalue;
      
      code += 'function';
      
      if ( name ) code += ' ' + name;
      
      code += '( ' + parameters.join( ', ' ) + ' )';
      
      return this.begin( code );
    }, // function()
    
    vars: function( vars ) {
      return this.add( 'var ' + vars.join( ', ' ), 1 );
    }, // vars()
    
    vars_from_object: function( object, attributes ) {
      if ( typeof attributes !== "object" || ! attributes instanceof Array ) throw new Code.Error( "Missing attributes" );
      
      var l = attributes.length;
      
      if ( ! l ) return this;
      
      var vars = [];
      
      for( var i = -1; ++i < l; ) {
        var a = attributes[ i ];
        
        vars.push( '_' + a + ' = ' + object + '.' + a );
      }
      
      return this.vars( vars );
    }, // vars_from_object()
    
    loop: function( init, condition, step ) {
      return this.begin( 'for( ' + ( init || '' ) + '; ' + ( condition || '' ) + '; ' + ( step || '' ) + ' )' );
    } // loop()
  } );
  
  /* -------------------------------------------------------------------------------------------
     Set instance methods
  */
  extend( Set.prototype, {
    add: function( a, dont_notify ) {
      push.apply( this.a, a );
      
      return dont_notify? this: this.notify_connections( [ { action: "add", obejcts: a } ] );
    }, // add()
    
    index_of: function( o ) {
      return this.make_index_of().index_of( o ); 
    }, // index_of()
    
    make_index_of: function() {
      var key = this.key;
      
      var code = new Code( 'index_of' )
        .function( 'this.index_of = ', null, [ 'o' ] )
          .add( 'var a = this.a' )
          .vars_from_object( 'o', key ) // Local variables for key
          .loop( 'var i = -1, l = a.length', ' ++i < l' );
            var l = key.length;
            
            if ( l > 1 ) {
              code.vars( [ 'r = a[ i ]' ] );

              for( var i = -1; ++i < l; ) {
                var field = key[ i ];
                
                code.add( 'if ( r.' + field + ' !== _' + field + ' ) continue' );
              }
            } else {
              var field = key[ 0 ];
              
              code.add( 'if ( a[ i ].' + field + ' !== _' + field + ' ) continue' );
            }
            
            code.add( 'return i' )
          .end()
          .add( 'return -1' )
        .end( 'index_of()' )
      ;
      
      code = code.get();
      
      de&&ug( 'make_index_of(), code:\n' + code );
      
      eval( code );
      
      return this;
    }, // make_index_of()
    
    execute_transaction: function( transaction ) {
      var l = transaction.length;
      
      for ( var i = -1; ++i < l; ) {
        var a = transaction[ i ].action;
        
        if ( ! this[ a ] ) throw( new Unsuported_Method( a ) );
      }
      
      for ( var i = -1; ++i < l; ) {
        var a = transaction[ i ];
        
        this[ a.action ]( a.objects, true );
      }
      
      return this.notify_connections( transaction );
    }, // execute_transaction()
    
    notify_connections: function( transaction ) {
      var connections = this.connections, l = connections.length;
      
      for ( var i = -1; ++i < l; ) connections[ i ].notify( transaction );
      
      return this;
    } // notify_connections()
  } );
  
  /* -------------------------------------------------------------------------------------------
     Connection()
  */
  function Connection( options ) {
    this.options = options = options || {};
    
    return this;
  } // Connection()
  
  /* -------------------------------------------------------------------------------------------
     Connection instance methods
  */
  extend( Connection.prototype, {
  } );
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( export_code( 'XS', [ 'Set', 'Connection', 'Code', 'extend', 'log', 'subclass', 'export_code' ] ) );
  
  de&&ug( "module loaded" );
} )( this ); // xs.js
