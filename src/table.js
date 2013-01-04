// table.js

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var log        = XS.log
    , subclass   = XS.subclass
    , extend     = XS.extend
    , Code       = XS.Code
    , Connection = XS.Connection
    , Set        = XS.Set
    , Ordered_Set= XS.Ordered_Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs table, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Table_Columns()
  */
  function Table_Columns( columns, table, options ) {
    Connection.call( this, options );
    
    this.table   = table;
    this.columns = columns;
    
    if ( columns instanceof Set ) {
      columns.connect( this );
    } else {
      this.add( columns );
    }
    
    return this;
  } // Table_Colunns()
  
  subclass( Connection, Table_Columns );
  
  extend( Table_Columns.prototype, {
    add: function( objects ) {
      var table = this.table
        , a     = table.get()
        , row   = table.header.getElementsByTagName( "tr" )[ 0 ]
        , l     = objects.length
      ;
      
      for( var i = -1; ++i < l; ) {
        var c  = objects[ i ]
          , th = document.createElement( "th" )
        ;
        
        th.innerHTML = c.label;
        th.setAttribute( "column_id", c.id );
        
        row.appendChild( th );
      }
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      var table = this.table
        , a     = table.get()
        , row   = table.header.getElementsByTagName( "tr" )[ 0 ]
        , cells = row.cells
        , ul    = objects.length
        , cl    = cells.length
      ;
      
      for( var i = ul; i; ) {
        var o = objects[ --i ];
        
        for( var j = cl; j; ) {
          var c = cells[ --j ];
          
          if( c.getAttribute( "column_id" ) === o.id ) row.deleteCell( j );
        }
      }
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      var table = this.table
        , a     = table.get()
        , cells = table.header.getElementsByTagName( "tr" )[ 0 ].cells
        , ul    = updates.length
        , cl    = cells.length
      ;
      
      for( var i = ul; i; ) {
        var u  = updates[ --i ]
          , u0 = u[ 0 ]
          , u1 = u[ 1 ]
        ;
        
        for( var j = cl; j; ) {
          var c = cells[ --j ];
          
          if( c.getAttribute( "column_id" ) === u0.id ) {
            c.setAttribute( "column_id", u1.id );
            c.innerHTML = u1.label;
          }
        }
      }
      
      return this;
    } // update()
  } ); // Table Columns instance methods
  
  /* -------------------------------------------------------------------------------------------
     Table()
  */
  
  Connection.prototype.table = function( node, columns, organizer, options ) {
    var t = new Table( node, columns, organizer, extend( { key: this.key }, options ) );
    
    this.connect( t );
    
    return t;
  };
  
  function Table( node, columns, organizer, options ) {
    this.process_options( options );
    this.set_node( node );
    this.init();
    
    this.columns = new Table_Columns( columns, this, options );
    
    Ordered_Set.call( this, [], organizer, options );
    
    return this;
  } // Table()
  
  subclass( Ordered_Set, Table );
  
  extend( Table.prototype, {
    set_node: function( node ) {
      if( is_DOM( node ) ) {
        this.node = node;
      } else {
        throw( "the given node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    // process and set the default options
    process_options: function( options ) {
      this.options = options = extend( {}, options );
      
      return this;
    }, // process_options
    
    init: function() {
      var table   = document.createElement( "table" )
        , header  = this.header = table.createTHead()
        , body    = this.body   = document.createElement( "tbody" )
        , options = this.options
      ;
      
      table.appendChild( body );
      table.setAttribute( "class", "xs_table" );
      table.createCaption();
      
      header.insertRow( 0 );
      
      this.node.appendChild( table );
      
      if( options.caption ) this.set_caption( options.caption );
      
      return this;
    }, // init()
    
    // set the table caption
    set_caption: function( caption ) {
      this.node.getElementsByTagName( "table" )[ 0 ].caption.innerHTML = caption;
      
      return this;
    }, // set_caption()
    
    add: function( objects ) {
      Ordered_Set.prototype.add.call( this, objects );
      
      var body      = this.body
        , columns   = this.columns.columns.get()
        , locations = this.locate( objects )
        , l         = objects.length
        , cl        = columns.length
      ;
      
      for( var i = -1; ++i < l; ) {
        var o = objects[ i ]
          , r = body.insertRow( locations[ i ].insert - 1 )
        ;
        
        for( var j = -1; ++j < cl; ) {
          var c  = columns[ j ]
            , td = r.insertCell( -1 )
            , v = o[ c.id ]
          ;
          
          if( v !== undefined ) td.innerHTML = o[ c.id ];
        }
      }
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      Ordered_Set.prototype.remove.call( this, objects );
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      Ordered_Set.prototype.update.call( this, objects );
      
      return this;
    } // update()
  } ); // Table instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Table' ] ) );
  
  // Test if it's a DOM element    
  function is_DOM( node ){
    return (
         typeof HTMLElement === "object" ? node instanceof HTMLElement : node
      && typeof node === "object" && node.nodeType === 1 && typeof node.nodeName ==="string"
    );
  } // is_DOM()
  
  de&&ug( "module loaded" );
} )( this ); // table.js
