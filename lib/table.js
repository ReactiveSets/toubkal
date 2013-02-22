/*  table.js

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
"use strict";

( function( exports ) {
  var XS;
  
  if ( typeof require === 'function' ) {
    XS = require( './xs.js' ).XS;
  } else {
    XS = exports.XS;
  }
  
  var log         = XS.log
    , subclass    = XS.subclass
    , extend      = XS.extend
    , Code        = XS.Code
    , Pipelet     = XS.Pipelet
    , Set         = XS.Set
    , Order       = XS.Order
    , Ordered     = XS.Ordered
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
    Ordered.call( this, options );
    
    this.table = table;
    
    return this.set_source( this.columns = columns );
  } // Table_Columns()
  
  Ordered.subclass( Table_Columns, {
    insert_: function( at, v ) {
      var row = this.table.header.getElementsByTagName( "tr" )[ 0 ]
        , th  = document.createElement( "th" )
      ;
      
      th.setAttribute( "column_id", v.id );
      th.innerText = v.label || v.id;
      
      row.insertBefore( th, row.cells[ at ] );
      
      return this;
    }, // insert_()
    
    remove_: function( from , v ) {
      this.table.header.getElementsByTagName( "tr" )[ 0 ].deleteCell( from );
      
      return this;
    }, // remove_()
    
    update_: function( at, v ) {
      var th = this
           .table
          .header
          .getElementsByTagName( "tr" )[ 0 ]
          .cells[ at ]
        
        , u0 = v[ 0 ]
        , u1 = v[ 1 ]
      ;
      
      if( u0.id    !== u1.id    ) th.setAttribute( "column_id", u1.id );
      if( u0.label !== u1.label ) th.innerText = u1.label || u1.id;
      
      return this;
    } // update_()
  } ); // Table Columns instance methods
  
  /* -------------------------------------------------------------------------------------------
     Table()
  */
  function Table( node, columns, options ) {
    this.process_options( options );
    this.set_node( node );
    this.init();
    
    this.columns = new Table_Columns( columns, this, options );
    
    Ordered.call( this, options );
    
    return this;
  } // Table()
  
  Ordered.build( 'table', Table, {
    set_node: function( node ) {
      if( is_DOM( node ) ) {
        this.node = node;
      } else {
        throw( "the node is not a DOM element" );
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
      this.node.getElementsByTagName( "table" )[ 0 ].caption.innerText = caption;
      
      return this;
    }, // set_caption()
    
    insert_ : function( at, v ) {
      var columns = this.columns.columns
        , row     = this.body.insertRow( at )
      ;
      
      if( columns instanceof Set ) columns = columns.fetch_all();
      
      for( var i = -1; ++i < columns.length; ) {
        var column = columns[ i ];
        
        _add_cell( row.insertCell( i ), v[ column.id ], column.align );
      }
      
      return this;
    }, // insert_()
    
    remove_ : function( from, v ) {
      this.body.deleteRow( from );
      
      return this;
    }, // remove_()
    
    update_ : function( at, v ) {
      var columns = this.columns.columns
        , u0      = v[ 0 ]
        , u1      = v[ 1 ]
        , row     = this.body.getElementsByTagName( "tr" )[ at ]
      ;
      
      if( columns instanceof Set ) columns = columns.fetch_all();
      
      for( var i = -1; ++i < columns.length; ) {
        var column = columns[ i ];
        
        _add_cell( row.cells[ i ], u1[ column.id ], column.align );
      }
      
      return this;
    } // update_()
  } ); // Table instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Table' ] ) );
  
  // Test if it's a DOM element    
  function is_DOM( node ){
    return (
         typeof HTMLElement === "object" ? node instanceof HTMLElement : node
      && typeof node === "object" && node.nodeType === 1 && typeof node.nodeName === "string"
    );
  } // is_DOM()
  
  // add cell
  function _add_cell( td, v, align ) {
    switch( typeof v ) {
      case "undefined":
        v = "";
      break;
      
      case "boolean":
        if( ! align ) align = "center";
      break;
      
      case "number":
        if( ! align ) align = "right";
      break;
      
      case "string":
      break;
      
      default: return;
    }
    
    if ( align ) td.style.textAlign = align;
    
    td.innerHTML = v;
  } // _add_cell()
  
  de&&ug( "module loaded" );
} )( this ); // table.js
