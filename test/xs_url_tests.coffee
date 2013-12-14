###
    xs_url_tests.coffee

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

###

# ----------------------------------------------------------------------------------------------
# xs test utils
# ----------------------------------------------------------------------------------------------

utils  = require( './xs_tests_utils.js' ) if require?
expect = this.expect || utils.expect
check  = this.check  || utils.check
xs     = this.xs     || utils.xs

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------------------------------------------------------------------------------

if require?
  require '../lib/client/animation_frames.js'
  require '../lib/client/url.js'

# ----------------------------------------------------------------------------------------------
# xs URL unit test suite
# ----------------------------------------------------------------------------------------------

urls_set = xs.set()

describe 'url_pase(): no options', ->
  parsed_urls = urls_set
    .url_parse()
    .trace( 'Parsed URL: ' )
  
  it 'parsed_urls should be empty', ( done )->
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.empty
  
  it 'after urls_set.add( { link: \'http://www.hostname.com:8080/foo/bar/#albums?id=87d3ed53v1i9\' } ), parsed_urls should be empty', ( done )->
    urls_set.add [ { link: 'http://www.hostname.com:8080/foo/bar/#albums?id=87d3ed53v1i9' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.empty
  
  it 'after urls_set.add( www.hostname.com ), parsed url should have a host and hostname atributes', ( done ) ->
    urls_set.add [ { url: 'www.hostname.com' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [ {
        href    : 'www.hostname.com'
        host    : 'www.hostname.com'
        hostname: 'www.hostname.com'
      } ]
  
  it 'after urls_set.add( http://www.hostname.com ), parsed url should have additionally a protocol and slashes atributes', ( done ) ->
    urls_set.add [ { url: 'http://www.hostname.com' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
      ]
  
  it 'after urls_set.add( http://hostname.com:8080 ), parsed url should have additionally a port attribute ( the host should have the port number)', ( done ) ->
    urls_set.add [ { url: 'http://hostname.com:8080' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://hostname.com:8080'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'hostname.com:8080'
          hostname: 'hostname.com'
        }
      ]
  
  it 'after urls_set.add( http://www.hostname.com:8080/foo/bar/index.html ), parsed url should have additionally a pathname atribute', ( done ) ->
    urls_set.add [ { url: 'http://www.hostname.com:8080/foo/bar/index.html' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://hostname.com:8080'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'hostname.com:8080'
          hostname: 'hostname.com'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/index.html'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/index.html'
        }
      ]
  
  it 'after urls_set.add( http://www.hostname.com:8080/foo/bar/#albums ), parsed url should have additionally a hash atribute', ( done ) ->
    urls_set.add [ { url: 'http://www.hostname.com:8080/foo/bar/#albums' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://hostname.com:8080'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'hostname.com:8080'
          hostname: 'hostname.com'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/index.html'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/index.html'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
        }
      ]
  
  it 'after urls_set.add( http://www.hostname.com:8080/foo/bar/#?page=sales&year=2012&month=12 ), parsed url should have an empty hash atribute, and no query string', ( done ) ->
    urls_set.add [ { url: 'http://www.hostname.com:8080/foo/bar/#?page=sales&year=2012&month=12' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://hostname.com:8080'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'hostname.com:8080'
          hostname: 'hostname.com'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/index.html'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/index.html'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#?page=sales&year=2012&month=12'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#'
        }
      ]
  
  it 'after urls_set.add( http://www.hostname.com:8080/foo/bar/#albums?id=983gd8f8-j76r-4d89-y27o-87d3ed53v1i9&display=15&order_id=date&order_type=desc ), parsed url should have a hash atribute, and no query string', ( done ) ->
    urls_set.add [ { url: 'http://www.hostname.com:8080/foo/bar/#albums?id=983gd8f8-j76r-4d89-y27o-87d3ed53v1i9&display=15&order_id=date&order_type=desc' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://hostname.com:8080'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'hostname.com:8080'
          hostname: 'hostname.com'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/index.html'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/index.html'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#?page=sales&year=2012&month=12'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums?id=983gd8f8-j76r-4d89-y27o-87d3ed53v1i9&display=15&order_id=date&order_type=desc'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
        }
      ]
  
  it 'after urls_set.add( http://www.hostname.com:8080/#albums ), parsed url should have a hash atribute, no pathname and no query string', ( done ) ->
    urls_set.add [ { url: 'http://www.hostname.com:8080/#albums' } ]
    
    parsed_urls.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
        }
        {
          href    : 'http://hostname.com:8080'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'hostname.com:8080'
          hostname: 'hostname.com'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/index.html'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/index.html'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#?page=sales&year=2012&month=12'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#'
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums?id=983gd8f8-j76r-4d89-y27o-87d3ed53v1i9&display=15&order_id=date&order_type=desc'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
        }
        {
          href    : 'http://www.hostname.com:8080/#albums'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/'
          hash    : '#albums'
        }
      ]

describe 'url_pase( parse_query_string: true ):', ->
  parsed_urls_with_quersy_string = urls_set
    .url_parse( { parse_query_string: true } )
    .trace( 'Parsed URL: ' )
  
  it 'parsed url should have a query string attribute', ( done ) ->
    parsed_urls_with_quersy_string.fetch_all ( values ) -> check done, ->
      expect( values ).to.be.eql [
        {
          href    : 'www.hostname.com'
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
          query   : {}
        }
        {
          href    : 'http://www.hostname.com'
          protocol: 'http:'
          slashes : true
          host    : 'www.hostname.com'
          hostname: 'www.hostname.com'
          query   : {}
        }
        {
          href    : 'http://hostname.com:8080'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'hostname.com:8080'
          hostname: 'hostname.com'
          query   : {}
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/index.html'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/index.html'
          query   : {}
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
          query   : {}
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#?page=sales&year=2012&month=12'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#'
          query   : { page: 'sales', year: '2012', month: '12' }
        }
        {
          href    : 'http://www.hostname.com:8080/foo/bar/#albums?id=983gd8f8-j76r-4d89-y27o-87d3ed53v1i9&display=15&order_id=date&order_type=desc'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/foo/bar/'
          hash    : '#albums'
          query   : { id: '983gd8f8-j76r-4d89-y27o-87d3ed53v1i9', display: '15', order_id: 'date', order_type: 'desc' }
        }
        {
          href    : 'http://www.hostname.com:8080/#albums'
          protocol: 'http:'
          slashes : true
          port    : 8080
          host    : 'www.hostname.com:8080'
          hostname: 'www.hostname.com'
          pathname: '/'
          hash    : '#albums'
          query   : {}
        }
      ]