/*  url_parse.js
    
    Copyright (c) 2013-2016, Reactive Sets

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
( this.undefine || require( 'undefine' )( module, require ) )()
( 'url_parse', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , extend_2 = RS.extend._2
    , log      = RS.log.bind( null, 'url_parse' )
    , de       = false
    , ug       = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet url_parse( options )
      
      @short Parse source url string
      
      @parameters
      - **options** (Object):
        - **parse_query_string** (Boolean): if true, parse the query string
          after ```"?"``` with attributes separated by ```"&"``` and values
          optionally assigned using ```"="```. default: false.
          If true a *query Object* attribute is emitted.
      
      @emits
      
      Attribute    | Description              | Example
      -------------|--------------------------|-----------------------------------------------------------------------------------
      **url**      | Original source URL      | http://localhost:8080/test1/test2/index.html#/76e8c857-0c49-4aba-9af3-7e0d3dfc3e12
      **protocol** | Protocol                 | http
      **host**     | Hostname with port number| localhost:8080
      **hostname** | Host without port number | localhost
      **port**     | Port number              | 8080
      **pathname** | Path section             | /test1/test2/index.html
      **hash**     | Anchor with hash sign    | #/76e8c857-0c49-4aba-9af3-7e0d3dfc3e12
      **query**    | Parsed query, after "?"  |
      
      @examples
      ```javascript
        rs
          .url_events()
          .url_parse()
          .last()
        ;
      ```
      
      Using:
      - Pipelet url_events()
      - Pipelet last()
      
      @description
      This is a @@stateless, @@greedy, @@synchronous @@adds-only pipelet.
      
      @license
      - parse_url() inner function modified from https://github.com/nodejs/node/blob/master/lib/url.js
        licensed under the following terms: https://github.com/nodejs/node/blob/master/LICENSE
  */
  rs.Compose( 'url_parse', function( source, options ) {
    var parse_query_string = options.parse_query_string;
    
    return source.map( url_parse, options );
    
    function url_parse( value ) {
      var rest = value.url;
      
      if ( !rest ) {
        log( 'url_parse(), url not defined in:', value );
        
        return;
      }
      
      value = extend_2( {}, value );
      
      var protocol = ( /^([a-z0-9]+:)/ ).exec( rest );
      
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
        , i    = -1
        , l    = keys.length
        , key
      ;
      
      while( ++i < l ) {
        key = keys[ i ];
        
        value[ key ] = p[ key ];
      }
      
      // we've indicated that there is a hostname,
      // so even if it's empty, it has to be present.
      // ToDo: add test for emty or undefiend value.hostname
      value.hostname = value.hostname || '';
      
      // get hash and query string
      var hash_index   = rest.indexOf( "#" )
        , hash         = hash_index != -1 ? rest.substr(  hash_index  ) : ''
        , qs_index     = hash.indexOf( '?' )
        , query_string = qs_index   != -1 ? hash.substr( qs_index + 1 ) : ''
      ;
      
      // parse query string into an object
      if( parse_query_string ) value.query = qs_index != -1 ? parse_qs( query_string ) : {};
      
      if( qs_index   != -1 ) hash = hash.substr( 0, qs_index   );
      if( hash_index != -1 ) rest = rest.substr( 0, hash_index );
      if( hash       != '' ) value.hash = hash;
      if( rest       != '' ) value.pathname = rest;
      
      de&&ug( 'parse_url(), parsed:', value );
      
      return value;
      
      // parse the host, return an object containing the host, hostname, authentication information (if exist), and port number
      function parse_host( host ) {
        var out = {}
          , at  = host.indexOf( '@' )
        ;
        
        if( at != -1 ) {
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
      } // parse_host()
      
      // parse the query string
      function parse_qs( qs ) {
        var q = {}
          , a = qs.split( '&' )
          , i = -1
          , l = a.length
          , v
        ;
        
        while( ++i < l ) {
          v = a[ i ].split( '=' );
          
          q[ v[ 0 ] ] = v.slice( 1 ).join( '=' );
        }
        
        return q;
      } // parse_qs()
    } // url_parse()
  } ); // url_parse() composition
  
  return rs;
} ); // url_parse.js
