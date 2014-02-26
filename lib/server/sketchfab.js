/*  sketchfab.js
    
    ----
    
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

!function( exports ) {
  var XS    = exports.XS
    , https = require( 'https' )
  ;
  
  if ( ! XS ) {
    // Should be under node, unless missing pipelet.js script prior to this one
    XS = require( '../pipelet.js' ).XS;
    
    // Require other xs modules
    
    require( '../code.js'    );
  }
  
  var xs      = XS.xs
    , log     = XS.log
    , extend  = XS.extend
    , Code    = XS.Code
    , Pipelet = XS.Pipelet
    , Set     = XS.Set
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs sketchfab, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     Sketchfab_Get_Models( options )
     
     Is a pipelet to get an embedded representation of a Sketchfab URL using oEmbed format.
     
     The response returned is a JSON object :
     
     {
       provider_url: "http://sketchfab.com",
       thumbnail_width: "448",
       height: "480",
       thumbnail_url: "//d3iahq3akd4kx2.cloudfront.net/urls/709bc6e7334840deb43b9f329a7c1fcb/1386283817/thumbnail_448.png",
       author_name: "Castorcad3D",
       thumbnail_height: "280",
       title: "Model Daien",
       html: "<iframe frameborder="0" width="854" height="480" webkitallowfullscreen="true" mozallowfullscreen="true" src="http://sketchfab.com/embed/709bc6e7334840deb43b9f329a7c1fcb?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe> ",
       width: "854",
       version: "1.0",
       author_url: "https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d",
       provider_name: "Sketchfab",
       type: "rich"
     }
     
     see Sketchfab documentation API : https://sketchfab.com/api
     
     Parameter : an optional object
     
  */
  
  function Sketchfab_Get_Models( options ) {
    Set.call( this, [], options );
    
    // default options
    this.model_url  = 'https://sketchfab.com/show/'
    this.max_width  = options.max_width  || 854;
    this.max_height = options.max_height || 480;
    
    return this;
  } // Sketchfab_Get_Models()
  
  /* -------------------------------------------------------------------------------------------
     .sketchfab_get_models( options )
  */
  Set.Build( 'sketchfab_get_models', Sketchfab_Get_Models, {
    _add_value: function( transaction, value ) {
      var max_width  = this.max_width
        , max_height = this.max_height
        , model_url  = this.model_url
        , model_id   = value.id
        , that       = this
      ;
      
      if( model_id === undefined ) {
        de&&ug( '_add_value(), model id not defined, value: ' + log.s( value ) );
        
        transaction.emit_nothing();
      } else {
        var url     = model_url + model_id + '&maxwidth=' + max_width + '&maxheight=' + max_height
          , options = { host: 'sketchfab.com', path: '/oembed?url=' + url, rejectUnauthorized: true }
        ;
        
        https.get( options, get_model ).on( 'error', error );
      }
      
      return this;
      
      function get_model( response ) {
        var data = '';
        
        response
          .on( 'data', function( d ) { data += d; } )
          .on( 'end' , function() {
            try {
              var v = JSON.parse( data );
              
              if( v.error ) {
                error( v );
              } else {
                de&&ug( 'model : ' + data );
                
                // add the model ID
                v.id = model_id;
                
                if( v.version ) {
                  v.api_version = v.version;
                  
                  delete v.version;
                }
                
                Set.prototype._add_value.call( that, transaction, v, true );
              }
            } catch( e ) {
              error( e );
            } // try ... catch()
          } )
        ;
      } // get_model()
      
      function error( e ) {
        de&&ug( 'error: ' + log.s( e ) );
        
        transaction.emit_nothing();
      } // error()
    }, // _add_value()
    
    _remove_value: function( transaction, value ) {
      var v = this.a[ this.index_of( value ) ];
      
      if( v === undefined ) {
        de&&ug( '_remove_value(), model with id = ' + id + ' doesn\'t exist, value : ' + log.s( value ) );
        
        transaction.emit_nothing();
      } else {
        de&&ug( '_remove_value(), value: ' + log.s( v ) );
        
        Set.prototype._remove_value.call( this, transaction, v );
      }
      
      return this;
    } // _remove_value()
  } ); // Sketchfab_Get_Models instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'Sketchfab_Get_Models' ] ) );
  
  de&&ug( "module loaded" );
} ( this ); // sketchfab.js
