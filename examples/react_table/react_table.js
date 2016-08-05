// react-table.js

!function( exports ) {
  "use strict";
  
  var rs  = exports.rs;
  
  rs.Compose( 'auto_increment_order', { union: true }, function( source, options ) {
    return source
      .auto_increment( options )
      
      .order( [ { id: options.attribute || 'id' } ] )
    ;
  } )
  
  var all_columns   = [
        { id: 'id'        , label: '#'          },
        { id: 'first_name', label: 'First Name' },
        { id: 'last_name' , label: 'Last Name'  },
        { id: 'country'   , label: 'Country'    },
        { id: 'company'   , label: 'Company'    },
        { id: 'email'     , label: 'Email'      },
        { id: 'phone'     , label: 'Phone'      }
      ]
    
    , columns_count = all_columns.length  
    , columns_shown = 4
    
    , columns       = rs
        .set( all_columns.slice( 0, columns_shown ) )
        .auto_increment_order( { attribute: 'order' } )
    
    , add_btn       = document.querySelector( '#add-value'    )
    , delete_btn    = document.querySelector( '#remove-value' )
  ;
  
  rs
    .socket_io_server()
    
    .flow( 'react_table/persons' )
    
    .order( [ { id: 'id' } ] )
    
    .react_table( document.querySelector( '#react-table' ), columns, { class_name: 'table table-condensed' } )
  ;
  
  add_btn.onclick = function() {
    columns_shown < columns_count && columns._add( [ all_columns[ columns_shown++ ] ] );
  };
  
  delete_btn.onclick = function() {
    columns_shown && columns._remove( [ all_columns[ --columns_shown ] ] );
  };
}( this );
