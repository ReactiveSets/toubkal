/*  table.js

    Copyright (C) 2013, 2014, Connected Sets

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
    
    require( './order.js' );
    require( './selector.js' );
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
    
    this._add_source( this.columns = columns );
  } // Table_Columns()
  
  Ordered.subclass( Table_Columns, {
    _add: function( added, options ) {
      de&&ug( "Table_Columns.._add(), added: " + log.s( added ) );
      
      if( ! added.length ) return this;

      this.lines = this.table._fetch_all();

      this.insert_at( added, options );

      return this;
    }, // add()
    
    _remove: function( removed, options ) {
      de&&ug( "Table_Columns.._remove(), removed: " + log.s( removed ) );
      
      if( ! removed.length ) return this;
      
      this.lines = this.table._fetch_all();
      
      this.remove_from( removed, options );
      
      return this;
    }, // _remove()
    
    _update: function( updates, options ) {
      de&&ug( "Table_Columns.._update(), updated: " + log.s( updates ) );
      
      if( ! updates.length ) return this;
      
      this.lines = this.table._fetch_all();
      
      this.update_from_to( updates, options );
      
      return this;
    }, // _update()
    
    insert_: function( at, v ) {
      var row   = this.table.header.getElementsByTagName( "tr" )[ 0 ]
        , th    = document.createElement( "th" )
        , lines = this.lines
        , l     = lines.length
      ;
      
      th.setAttribute( "column_id", v.id );
      th.innerHTML = v.label || v.id;
      
      row.insertBefore( th, row.cells[ at ] || null );
      
      Ordered.prototype.insert_.call( this, at, v );
      
      if( ! l ) return this;
      
      for( var i = l; i; ) {
        _add_cell( this.table.body.getElementsByTagName( "tr" )[ --i ].insertCell( at ), lines[ i ][ v.id ], v.align );
      }
      
      return this;
    }, // insert_()
    
    remove_: function( from , v ) {
      var lines = this.lines
        , l     = lines.length
      ;
      
      this.table.header.getElementsByTagName( "tr" )[ 0 ].deleteCell( from );
      
      Ordered.prototype.remove_.call( this, from, v );
      
      if( ! l ) return this;
      
      for( var i = l; i; ) {
        this.table.body.getElementsByTagName( "tr" )[ --i ].deleteCell( from );
      }
      
      return this;
    }, // remove_()
    
    update_: function( at, v ) {
      var th    = this
          .table
          .header
          .getElementsByTagName( "tr" )[ 0 ]
          .cells[ at ]
        
        , u0    = v[ 0 ]
        , u1    = v[ 1 ]
        , lines = this.lines
        , l     = lines.length
      ;
      
      if( u0.id    !== u1.id    ) th.setAttribute( "column_id", u1.id );
      if( u0.label !== u1.label ) th.innerHTML = u1.label || u1.id;
      
      Ordered.prototype.update_.call( this, at, v );
      
      if( ! l ) return this;
      
      for( var i = l; i; ) {
        if( u0.id    !== u1.id ) _add_cell( this.table.body.getElementsByTagName( "tr" )[ --i ].cells[ at ], lines[ i ][ u1.id ], u1.align );
      }
      
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
    
    Ordered.call( this, options );
    
    this.columns = new Table_Columns( columns, this, options );
    
    return this;
  } // Table()
  
  Ordered.Build( 'table', Table, {
    set_node: function( node ) {
      if( XS.is_DOM( node ) ) {
        this.node = node;
      } else {
        throw( "the node is not a DOM element" );
      }
      
      return this;
    }, // set_node()
    
    // process and set the default options
    process_options: function( options ) {
      this._options = options = extend( {}, options );
      
      return this;
    }, // process_options
    
    init: function() {
      var table   = document.createElement( "table" )
        , header  = this.header = table.createTHead()
        , body    = this.body   = document.createElement( "tbody" )
        , options = this._options
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
    
    _add: function( added, options ) {
      de&&ug( "Table.._add(), adding: " + log.s( added ) );
      
      if( ! added.length ) return this;
      
      var that = this;
       
      this.columns._fetch_all( adder );
      
      return this;
      
      function adder( columns ) {
        that.cols = columns;
        
        that.insert_at( added, options );
      }
    }, // _add()
    
    _remove: function( removed, options ) {
      de&&ug( "Table.._remove(), removing: " + log.s( removed ) );
      
      if( ! removed.length ) return this;
      
      var that = this;
       
      this.columns._fetch_all( remover );
      
      return this;
      
      function remover( columns ) {
        that.cols = columns;
        
        that.remove_from( removed, options );
      }
    }, // _remove()
    
    _update: function( updates, options ) {
      de&&ug( "Table.._update(), updating: " + log.s( updates ) );
      
      if( ! updates.length ) return this;
      
      var that = this;
      
      this.columns._fetch_all( updater );
      
      return this;
      
      function updater( columns ) {
        that.cols = columns;
        
        that.update_from_to( updates, options );
      }
    }, // updates()
    
    insert_ : function( at, v ) {
      var columns = this.cols
        , row     = this.body.insertRow( at )
      ;
      
      for( var i = -1; ++i < columns.length; ) {
        var column = columns[ i ];
        
        _add_cell( row.insertCell( i ), v[ column.id ], column.align );
      }
      
      Ordered.prototype.insert_.call( this, at, v );
      
      return this;
    }, // insert_()
    
    remove_ : function( from, v ) {
      this.body.deleteRow( from );
      
      Ordered.prototype.remove_.call( this, from, v );
      
      return this;
    }, // remove_()
    
    update_ : function( at, v ) {
      var columns = this.cols
        , u0      = v[ 0 ]
        , u1      = v[ 1 ]
        , row     = this.body.getElementsByTagName( "tr" )[ at ]
      ;
      
      for( var i = -1; ++i < columns.length; ) {
        var column = columns[ i ];
        
        _add_cell( row.cells[ i ], u1[ column.id ], column.align );
      }
      
      Ordered.prototype.update_.call( this, at, v );
      
      return this;
    } // update_()
  } ); // Table instance methods
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Table' ] ) );
  
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
