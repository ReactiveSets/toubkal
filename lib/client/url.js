/*  url.js
    
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
  var xs      = exports.XS.xs
    , log     = XS.log
    , extend  = XS.extend
    , Code    = XS.Code
    , Pipelet = XS.Pipelet
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = true;
  
  function ug( m ) {
    log( "xs url, " + m );
  } // ug()
  
  /* -------------------------------------------------------------------------------------------
     URL_Events( options )
  */
  
  var url_events;
  
  function URL_Events( options ) {
    if( url_events ) return url_events;
    
    options.key = [];
    
    Pipelet.call( this, options );
    
    this._output._fetch = this._fetch;
    
    var that = this;
    
    this.url = document.location.href;
    
    if( typeof exports.onhashchange !== undefined ) {
      exports.onhashchange = function() {
        hash_change( document.location.href );
      };
    } else {
      xs
        .animation_frames()
        ._on( 'add', function() {
          var url = document.location.href;
          
          if( that.url !== url ) hash_change( url );
        } )
      ;
    }
    
    return url_events = this;
    
    function hash_change( url ) {
      de&&ug( 'hash_change(), url : ' + url );
      
      that.url = url;
      
      that.__emit_add( [ { url: url } ] );
    }
  } // URL_Events()
  
  /* -------------------------------------------------------------------------------------------
     url_events( options )
  */
  Pipelet.Build( 'url_events', URL_Events, {
    _fetch: function( receiver ) {
      receiver( [ { url: this.pipelet.url } ], true );
      
      return this;
    }, // _fetch()
    
    add: function( added, options ) {
      var l = added.length;
      
      if( l === 0 ) return this;
      
      for( var i = -1, url = this.url; ++i < l; ) {
        var value = added[ i ].url;
        
        if( value && value !== url ) this.__emit_add( [ { url: this.url = value } ] );
      }
      
      return this;
    } // add()
  } ); // URL_Events instance methods
  
  /* -------------------------------------------------------------------------------------------
     URL_Parse( options )
     
     Parse the url string and return an object. The parsed URL object contain 
     the following attributes:
     
       - href     : the original full URL that was parsed                   , example : http://localhost:8080/test1/test2/index.html#/76e8c857-0c49-4aba-9af3-7e0d3dfc3e12
       - protocol : the request protocol                                    , example : http
       - host     : the host portion of the URL including port number       , example : localhost:8080
       - hostname : or the domain name                                      , example : localhost
       - port     : the port number                                         , example : 8080
       - pathname : the path section of the URL                             , example : /test1/test2/index.html
       - hash     : the anchor portion of a URL, including the hash sign '#', example : #/76e8c857-0c49-4aba-9af3-7e0d3dfc3e12
     
     
     Parameters: optional object
       - parse_query_string  : parse the query string, default: false
  */
  
  function URL_Parse( options ) {
    Pipelet.call( this, options );
    
    this.parse_query_string  = options.parse_query_string;
    
    return this;
  } // URL_Parse()
  
  /* -------------------------------------------------------------------------------------------
     url_parse( options )
  */
  
  Pipelet.Build( 'url_parse', URL_Parse, {
    __transform: function( values, options, caller ) {
      var l = values.length;
      
      if( l === 0 ) return [];
      
      var out = []
        , parse_query_string  = this.parse_query_string
      ;
      
      for( var i = -1; ++i < l; ) {
        var value = values[ i ]
          , url   = value.url
        ;
        
        if( url === undefined ) {
          de&&ug( 'add(), url not defined, value: ' + log.s( value ) );
        } else {
          out.push( this.parse( url, parse_query_string ) );
        }
      }
      
      return out;
    }, // __transform()
    
    parse: function( url, parse_query_string ) {
      var value    = { href: url }
        , rest     = url
        , protocol = ( /^([a-z0-9]+:)/ ).exec( rest )
      ;
      
      // get protocol
      if( protocol ) {
        value.protocol = protocol = protocol[ 0 ];
        
        rest = rest.substr( protocol.length );
      }
      
      // figure out if it's got a host
      // user@server is *always* interpreted as a hostname, and url
      // resolution will treat //foo/bar as host=foo,path=bar because that's
      // how the browser resolves relative URLs.
      
      // value.slashes is necessary for url stringify pipelet if needed
      if( protocol || rest.match( /^\/\/[^@\/]+@[^@\/]+/ ) ) {
        var slashes = value.slashes = rest.substr( 0, 2 ) === '//';
        
        if( slashes ) rest = rest.substr( 2 );
      }
      
      // get host
      // the first instance of /, ?, ;, or # ends the host.
      var non_host_chars = [ '/', '?', ';', '#' ]
        , host_end_index = -1 // old : firstNonHost
      ;
      
      for( var i = -1, l = non_host_chars.length; ++i < l; ) {
        var index = rest.indexOf( non_host_chars[ i ] );
        
        if( index === -1 ) continue; // continue if the non-host char is not found
        
        if( host_end_index < 0 || index < host_end_index ) host_end_index = index;
      }
      
      if( host_end_index !== -1 ) {
        value.host = rest.substr( 0, host_end_index );
        
        rest = rest.substr( host_end_index );
      } else {
        value.host = rest;
        
        rest = '';
      }
      
      // pull out the auth and port.
      var p    = parse_host( value.host )
        , keys = Object.keys( p )
      ;
      
      for( var i = -1, l = keys.length; ++i < l; ) {
        var key = keys[ i ];
        
        value[ key ] = p[ key ];
      }
      
      // we've indicated that there is a hostname,
      // so even if it's empty, it has to be present.
      // ToDo: add test for emty or undefiend value.hostname
      value.hostname = value.hostname || '';
      
      // get hash and query string
      var hash_index   = rest.indexOf( "#" )
        , hash         = hash_index !== -1 ? rest.substr(  hash_index  ) : ''
        , qs_index     = hash.indexOf( '?' )
        , query_string = qs_index   !== -1 ? hash.substr( qs_index + 1 ) : ''
      ;
      
      // parse query string into an object
      if( parse_query_string ) value.query = qs_index !== -1 ? parse_qs( query_string ) : {};
      
      if( qs_index   !== -1 ) hash = hash.substr( 0, qs_index   );
      if( hash_index !== -1 ) rest = rest.substr( 0, hash_index );
      if( hash       !== '' ) value.hash = hash;
      if( rest       !== '' ) value.pathname = rest;
      
      de&&ug( 'parse(), parsed url: ' + log.s( value ) );
      
      return value;
      
      // parse the host, return an object containing the host, hostname, authentication information (if exist), and port number
      function parse_host( host ) {
        var out = {}
          , at  = host.indexOf( '@' )
        ;
        
        if( at !== -1 ) {
          out.auth = host.substr( 0  , at );
          host     = host.substr( at + 1  ); // drop the @
        }
        
        var port = ( /:[0-9]+$/ ).exec( host );
        
        if( port ) {
          port     = port[ 0 ];
          out.port = port.substr( 1 );
          host     = host.substr( 0, host.length - port.length );
        }
        
        if( host ) out.hostname = host;
        
        return out;
      }
      
      // parse the query string
      function parse_qs( qs ) {
        var q = {}
          , a = qs.split( '&' )
        ;
        
        for( var i = -1, l = a.length; ++i < l; ) {
          var v = a[ i ].split( '=' );
          
          q[ v[ 0] ] = v[ 1 ];
        }
        
        return q;
      }
    } // parse()
  } ); // URL_Events instance methods
  
  /* --------------------------------------------------------------------------
     module exports
  */
  eval( XS.export_code( 'XS', [ 'URL_Events' ] ) );
  
  de&&ug( "module loaded" );
} ( this ); // url.js