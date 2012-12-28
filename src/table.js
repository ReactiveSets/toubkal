// table.js

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( 'xs.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var log = XS.log
    , subclass = XS.subclass
    , extend = XS.extend
    , Code = XS.Code
    , Connection = XS.Connection
    , Set = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs table, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Table_Colunns()
  */
  function Table_Columns( columns, table, options ) {
    Connection.call( this, options );
    
    this.table = table;
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
    
    this.columns = new Table_Colunns( columns, this, options );
    
    return this;
  } // Table()
  
  subclass( Set, Table );
  
  extend( Table.prototype, {
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
  
  de&&ug( "module loaded" );
} )( this ); // table.js
