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
        
        row.appendChild( th );
      }
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      var table = this.table, a = table.get();
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      var table = this.table, a = table.get();
      
      return this;
    } // update()
  } ); // Table Columns instance methods
  
  /* -------------------------------------------------------------------------------------------
     Table()
  */
  function Table( node, columns, options ) {
    Set.call( this, [], options );
    
    options = this.process_options( options );
    
    this.set_node( node );
    this.init();
    
    this.columns = new Table_Columns( columns, this, options );
    
    return this;
  } // Table()
  
  subclass( Set, Table );
  
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
      options = extend( {}, options );
      
      return this.options = options;
    }, // process_options
    
    init: function() {
      var table   = document.createElement( "table" )
        , header  = this.header = table.createTHead()
        , options = this.options
      ;
      
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
      Set.prototype.add.call( this, objects );
      
      return this;
    }, // add()
    
    remove: function( objects ) {
      Set.prototype.remove.call( this, objects );
      
      return this;
    }, // remove()
    
    update: function( updates ) {
      Set.prototype.update.call( this, objects );
      
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
  }
  
  de&&ug( "module loaded" );
} )( this ); // table.js
