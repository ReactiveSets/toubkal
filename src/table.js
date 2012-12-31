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
    this.node    = table.node;
    this.columns = columns;
    
    if ( columns instanceof Set ) {
      columns.connect( this );
    } else {
      this.add( columns );
    }
    
    this.init();
    
    return this;
  } // Table_Colunns()
  
  subclass( Connection, Table_Columns );
  
  extend( Table_Columns.prototype, {
    init: function() {
      var table   = this.node.getElementsByTagName( "table" )[ 0 ]
        , columns = this.columns.get()
        , header  = this.header = table.appendChild( document.createElement( "thead" ) )
        , l       = columns.length
      ;
      
      for( var i = -1; ++i < l; ) {
        var c  = columns[ i ]
          , th = document.createElement( "th" )
        ;
        
        th.appendChild( document.createTextNode( c.label ) );
        
        header.appendChild( th );
      }
      
      return this;
    }, // init()
    
    add: function( objects ) {
      var table = this.table, a = table.get();
      
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
    Set.call( this, options );
    
    this.set_node( node );
    
    this.columns = new Table_Columns( columns, this, options );
    
    return this;
  } // Table()
  
  subclass( Set, Table );
  
  extend( Table.prototype, {
    set_node: function( node ) {
      if( is_DOM( node ) ) {
        this.node = node;
        
        node.appendChild( document.createElement( "table" ) );
      } else {
        throw( "the given node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
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
