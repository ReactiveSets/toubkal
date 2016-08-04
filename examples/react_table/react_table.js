// react-table.js

!function( exports ) {
  "use strict";
  
  var rs  = exports.rs
    , RS  = rs.RS
    , log = RS.log
  ;
  
  rs.Compose( 'auto_increment_order', function( source, options ) {
    var input = source.namespace().auto_increment( options )
      , output = input.order( [ { id: options.attribute || 'id' } ] )
    ;
    
    return source.encapsulate( input, output, options );
  } )
  
  var de = true, ug = log.bind( null, 'react table' );
  
  var columns_array = [
        { id: 'company'   , label: 'Company'    },
        { id: 'email'     , label: 'Email'      },
        { id: 'phone'     , label: 'Phone'      }
      ]
    
    , columns = rs.set( [
        { id: 'id'        , label: '#'          },
        { id: 'first_name', label: 'First Name' },
        { id: 'last_name' , label: 'Last Name'  },
        { id: 'country'   , label: 'Country'    } 
      ] ).auto_increment_order( { attribute: 'order' } )
      
    , by_country = rs.set( [ {} ] )
    
    , add_btn    = document.querySelector( '#add-value'    )
    , delete_btn = document.querySelector( '#remove-value' )
    , count      = -1, cl = columns_array.length  
  ;
  
  rs
    .socket_io_server()
    
    .flow( 'react_table/persons' )
    
    .order( [ { id: 'id' } ] )
    
    .react_table( document.querySelector( '#react-table' ), columns, { class_name: 'table table-condensed' } )
  ;
  
  add_btn.onclick = function() {
    if( count < cl -1 ) columns._add( [ columns_array[ ++count ] ] );
  };
  
  delete_btn.onclick = function() {
    if( count >= 0 ) columns._remove( [ columns_array[ count-- ] ] );
  };
  
}( this );
