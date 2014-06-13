###
    xs_sketchfab_tests.coffee

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

###

mocha.setup 'bdd' if typeof mocha isnt 'undefined'

# ----------------------------------------------------------------------------------------------
# xs test utils
# ----------------------------------------------------------------------------------------------

check = ( done, test ) ->
  try
    test()
    
    setTimeout done, 0
  catch e
    done e


# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------------------------------------------------------------------------------

xs     = ( require '../../lib/pipelet.js' ).XS.xs
expect = require 'expect.js'

require '../../lib/server/sketchfab.js'

# ----------------------------------------------------------------------------------------------
# xs Sketchfab Get Models unit test suite
# ----------------------------------------------------------------------------------------------

model_ids = xs.set( [] )

sketchfab_models = model_ids.sketchfab_get_models()

describe 'sketchfab_get_models()', ->
  it 'sketchfab_models should be empty', ->
    sketchfab_models._fetch_all ( values ) ->
      expect( values ).to.be.empty()
  
  it 'after model_ids._add( 2 objects ), sketchfab_models should contain 1 object ( first model id doesn\'t exist )', ( done ) ->
    this.timeout 3000
    
    model_ids._add [
      { id: '709bc6e7334840hebd96r6s4b9f329a7' }
      { id: '24f7d8d1b135462ab662d11b9df37704' }
    ]
    
    sketchfab_models._on( 'complete', ->
      sketchfab_models._fetch_all ( values ) -> check done, ->
        expect( values.length ).to.be 1
        expect( values ).to.be.eql [
          {
            id: '24f7d8d1b135462ab662d11b9df37704'
            provider_url: 'http://sketchfab.com'
            thumbnail_width: '448'
            height: 480
            thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/24f7d8d1b135462ab662d11b9df37704/1384785471/thumbnail_448.png'
            author_name: 'Castorcad3D'
            thumbnail_height: '280'
            title: 'Villa L'
            html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/24f7d8d1b135462ab662d11b9df37704?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
            width: 854
            api_version: '1.0'
            author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
            provider_name: 'Sketchfab'
            type: 'rich' 
          }
        ]
    , this, true )
  
  it 'after model_ids._add( 3 objects ), sketchfab_models should contain 3 objects ( missing attribute "ID" in the second object )', ( done ) ->
    this.timeout 3000
    
    model_ids._add [
      { id      : 'e90cfb483eef4be98823efb70187567e' }
      { model_id: 'c9b91c4cb26f4e9cb22fcfefa2665283' }
      { id      : '2226002e030c4517bc0136f325b9fa15' }
    ]
    
    sketchfab_models._on( 'complete', ->
      sketchfab_models._fetch_all ( values ) -> check done, ->
        expect( values.length ).to.be 3
        expect( values ).to.be.eql [
          {
            id: '24f7d8d1b135462ab662d11b9df37704'
            provider_url: 'http://sketchfab.com'
            thumbnail_width: '448'
            height: 480
            thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/24f7d8d1b135462ab662d11b9df37704/1384785471/thumbnail_448.png'
            author_name: 'Castorcad3D'
            thumbnail_height: '280'
            title: 'Villa L'
            html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/24f7d8d1b135462ab662d11b9df37704?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
            width: 854
            api_version: '1.0'
            author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
            provider_name: 'Sketchfab'
            type: 'rich' 
          }
          {
            id: 'e90cfb483eef4be98823efb70187567e'
            provider_url: 'http://sketchfab.com'
            thumbnail_width: '448'
            height: 480
            thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/e90cfb483eef4be98823efb70187567e/1385328300/thumbnail_448.png'
            author_name: 'Castorcad3D'
            thumbnail_height: '280'
            title: 'Villa D'
            html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/e90cfb483eef4be98823efb70187567e?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
            width: 854
            api_version: '1.0'
            author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
            provider_name: 'Sketchfab'
            type: 'rich' 
          }
          {
            id: '2226002e030c4517bc0136f325b9fa15'
            provider_url: 'http://sketchfab.com'
            thumbnail_width: '448'
            height: 480
            thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/2226002e030c4517bc0136f325b9fa15/1387399207/thumbnail_448.png'
            author_name: 'Castorcad3D'
            thumbnail_height: '280'
            title: 'Villa L2'
            html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/2226002e030c4517bc0136f325b9fa15?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
            width: 854
            api_version: '1.0'
            author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
            provider_name: 'Sketchfab'
            type: 'rich' 
          }
        ]
    , this, true )
  
  it 'after model_ids._remove( 3 object ), sketchfab_models should contain 2 objects', ->
    model_ids._remove [
      { id      : 36                                 }
      { id      : 'e90cfb483eef4be98823efb70187567e' }
      { model_id: '2226002e030c4517bc0136f325b9fa15' }
    ]
    
    sketchfab_models._fetch_all ( values ) ->
      expect( values.length ).to.be 2
      expect( values ).to.be.eql [
        {
          id: '24f7d8d1b135462ab662d11b9df37704'
          provider_url: 'http://sketchfab.com'
          thumbnail_width: '448'
          height: 480
          thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/24f7d8d1b135462ab662d11b9df37704/1384785471/thumbnail_448.png'
          author_name: 'Castorcad3D'
          thumbnail_height: '280'
          title: 'Villa L'
          html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/24f7d8d1b135462ab662d11b9df37704?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
          width: 854
          api_version: '1.0'
          author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
          provider_name: 'Sketchfab'
          type: 'rich'
        }
        {
          id: '2226002e030c4517bc0136f325b9fa15'
          provider_url: 'http://sketchfab.com'
          thumbnail_width: '448'
          height: 480
          thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/2226002e030c4517bc0136f325b9fa15/1387399207/thumbnail_448.png'
          author_name: 'Castorcad3D'
          thumbnail_height: '280'
          title: 'Villa L2'
          html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/2226002e030c4517bc0136f325b9fa15?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
          width: 854
          api_version: '1.0'
          author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
          provider_name: 'Sketchfab'
          type: 'rich' 
        }
      ]
  
  it 'after model_ids._update( 1 object ), sketchfab_models should be equal to result', ( done ) ->
    this.timeout 3000
    
    model_ids._update [ [ { id: '24f7d8d1b135462ab662d11b9df37704' }, { id: '0ddc7728083e4f79bd87c96a54860a81' } ] ]
    
    sketchfab_models._on( 'complete', ->
      sketchfab_models._fetch_all ( values ) -> check done, ->
        expect( values.length ).to.be 2
        expect( values ).to.be.eql [
          {
            id: '2226002e030c4517bc0136f325b9fa15'
            provider_url: 'http://sketchfab.com'
            thumbnail_width: '448'
            height: 480
            thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/2226002e030c4517bc0136f325b9fa15/1387399207/thumbnail_448.png'
            author_name: 'Castorcad3D'
            thumbnail_height: '280'
            title: 'Villa L2'
            html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/2226002e030c4517bc0136f325b9fa15?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
            width: 854
            api_version: '1.0'
            author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
            provider_name: 'Sketchfab'
            type: 'rich' 
          }
          {
            id: '0ddc7728083e4f79bd87c96a54860a81'
            provider_url: 'http://sketchfab.com'
            thumbnail_width: '448'
            height: 480
            thumbnail_url: '//d35krx4ujqgbcr.cloudfront.net/urls/0ddc7728083e4f79bd87c96a54860a81/1386160522/thumbnail_448.png'
            author_name: 'Castorcad3D'
            thumbnail_height: '280'
            title: 'Villa G 2A'
            html: '<iframe frameborder="0"\n    width="854"\n    height="480" webkitallowfullscreen="true"\n    mozallowfullscreen="true"\n    src="https://sketchfab.com/embed/0ddc7728083e4f79bd87c96a54860a81?autostart=0&amp;transparent=0&amp;autospin=0&amp;controls=1&amp;watermark=0"></iframe>\n'
            width: 854
            api_version: '1.0'
            author_url: 'https://sketchfab.com/portfolio/0bb0186beac143aa9c09c4e7f341877d'
            provider_name: 'Sketchfab'
            type: 'rich'
          }
        ]
    , this, true )
  
  