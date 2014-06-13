###
    xs_load_images_tests.coffee

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
# Asynchrnous tests exception catcher
# -----------------------------------

check = ( done, test ) ->
  try
    test()

    setTimeout done, 0
  catch e
    done e


# include modules
XS = if require? then ( require '../../lib/xs.js' ).XS else this.XS
expect = if require? then ( require 'expect.js' ) else this.expect

if require?
  require '../../lib/load_images.js'

xs = XS.xs

describe 'Load Images test suite:', ->
  images_source = xs
    .set( [], { name: 'images_source' } )
    .auto_increment( { name: 'images_source_auto_increment' } )
  
  images = images_source
    .load_images( { name: 'images', loading_max: 2, display: 'visible' } )
  
  node = document.getElementById( 'xs_load_images' )
  
  it 'should have created xs_preoloaded_images div', ->
    expect( node ).to.be.ok()
    expect( node.nodeName ).to.be 'DIV'
  
  it 'expect images._fetch_all() to be empty', ->
    expect( images._fetch_all() ).to.be.empty()
  
  it 'after images_source._add( objects ), expect images._fetch_all() to be equal to result', ( done ) ->
    this.timeout 15000
    
    images_source._add [
      { title: 'Villa Marrakech 1' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/011.jpg' }
      { title: 'Villa Marrakech 2' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/02.jpg' }
      { title: 'Villa Marrakech 3' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/03.jpg' }
      { title: 'Villa Marrakech 4' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/04.jpg' }
      { title: 'Villa Marrakech 5' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/05.jpg' }
      { title: 'Villa Marrakech 6' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/06.jpg' }
      { title: 'Villa Marrakech 7' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/07.jpg' }
    ]
    
    expect( images._loading_count ).to.be 2
    
    images._on( 'complete', ->
      images._fetch_all ( values ) -> check done, ->
        values.sort ( a, b ) -> a.id > b.id

        expect( values ).to.be.eql [
          { id: 2 , title: 'Villa Marrakech 2' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/02.jpg' }
          { id: 3 , title: 'Villa Marrakech 3' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/03.jpg' }
          { id: 4 , title: 'Villa Marrakech 4' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/04.jpg' }
          { id: 5 , title: 'Villa Marrakech 5' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/05.jpg' }
          { id: 6 , title: 'Villa Marrakech 6' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/06.jpg' }
          { id: 7 , title: 'Villa Marrakech 7' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/07.jpg' }
        ]

    , this, true )
  
  it 'should no longer have any image loading', ->
    expect( images._loading_count ).to.be 0
    
  it 'should have added 6 images to the DOM', ->
     expect( node.childNodes[ 0 ].nodeName ).to.be 'IMG'
     expect( node.childNodes[ 1 ].nodeName ).to.be 'IMG'
     expect( node.childNodes[ 2 ].nodeName ).to.be 'IMG'
     expect( node.childNodes[ 3 ].nodeName ).to.be 'IMG'
     expect( node.childNodes[ 4 ].nodeName ).to.be 'IMG'
     expect( node.childNodes[ 5 ].nodeName ).to.be 'IMG'
     expect( node.childNodes[ 6 ] ).to.not.be.ok()

  it 'should set the attribute loaded to 1 for these 6 images', ( done ) ->
     images._fetch_all ( values ) -> check done, ->
       for value in values
         image = images._get_image_from_uri value.uri
         
         expect( image.nodeName              ).to.be 'IMG'
         expect( image.src                   ).to.be value.uri
         expect( image.getAttribute 'loaded' ).to.be '1'

  it 'after images_source._add( objects ), expect images._fetch_all() to be equal to result', ( done ) ->
    this.timeout 5000

    images._loading_max = 1

    images_source._add [
      { title: 'Villa Marrakech 8', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/08.jpg' }
      { title: 'Villa Marrakech 9', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/09.jpg' }
    ]
    
    expect( images._loading_count ).to.be 1

    images._on( 'complete', ->
      images._fetch_all ( values ) -> check done, ->
        values.sort ( a, b ) -> a.id > b.id

        expect( values ).to.be.eql [
          { id: 2 , title: 'Villa Marrakech 2' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/02.jpg' }
          { id: 3 , title: 'Villa Marrakech 3' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/03.jpg' }
          { id: 4 , title: 'Villa Marrakech 4' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/04.jpg' }
          { id: 5 , title: 'Villa Marrakech 5' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/05.jpg' }
          { id: 6 , title: 'Villa Marrakech 6' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/06.jpg' }
          { id: 7 , title: 'Villa Marrakech 7' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/07.jpg' }
          { id: 8 , title: 'Villa Marrakech 8' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/08.jpg' }
          { id: 9 , title: 'Villa Marrakech 9' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/09.jpg' }
        ]

    , this, true )
  
  it 'should have added 2 images to the DOM', ->
     expect( node.childNodes[ 0 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 1 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 2 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 3 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 4 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 5 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 6 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 7 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 8 ] ).to.not.be.ok()

  it 'should set the attribute loaded_count to 1 for these 6 images', ( done ) ->
     images._fetch_all ( values ) -> check done, ->
       for value in values
         image = images._get_image_from_uri value.uri
         
         expect( image.nodeName              ).to.be 'IMG'
         expect( image.src                   ).to.be value.uri
         expect( image.getAttribute 'loaded' ).to.be '1'

  it 'after images_source._remove( objects ), expect images._fetch_all() to be equal to result', ->
    images_source._remove [
      { id: 6 , title: 'Villa Marrakech 6' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/06.jpg' }
      { id: 8 , title: 'Villa Marrakech 8' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/08.jpg' }
    ]
    
    values = images._fetch_all().sort ( a, b ) -> a.id > b.id
    
    expect( values ).to.be.eql [
      { id: 2 , title: 'Villa Marrakech 2' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/02.jpg' }
      { id: 3 , title: 'Villa Marrakech 3' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/03.jpg' }
      { id: 4 , title: 'Villa Marrakech 4' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/04.jpg' }
      { id: 5 , title: 'Villa Marrakech 5' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/05.jpg' }
      { id: 7 , title: 'Villa Marrakech 7' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/07.jpg' }
      { id: 9 , title: 'Villa Marrakech 9' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/09.jpg' }
    ]
  
  it 'should have removed 2 images from the DOM', ->
     expect( node.childNodes[ 0 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 1 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 2 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 3 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 4 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 5 ].nodeName ).to.be( 'IMG' )
     expect( node.childNodes[ 6 ] ).to.not.be.ok()

  it 'after images_source._update( objects ), expect images._fetch_all() to be equal to result', ( done ) ->
    this.timeout 5000
    
    images._on( 'complete', ->
      images._fetch_all ( values ) -> check done, ->
        values.sort ( a, b ) -> a.id > b.id

        expect( values ).to.be.eql [
          { id: 2 , title: 'Villa Marrakech 2' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/02.jpg' }
          { id: 3 , title: 'Villa Marrakech 3' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/03.jpg' }
          { id: 4 , title: 'Villa Marrakech 4' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/04.jpg' }
          { id: 5 , title: 'Villa Marrakech 5' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/05.jpg' }
          { id: 7 , title: 'Villa Marrakech 7' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/07.jpg' }
          { id: 9 , title: 'Villa Marrakech 10', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/10.jpg' }
        ]
      
    , this, true )
    
    images_source._update [
      [
        { id: 9 , title: 'Villa Marrakech 9' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/09.jpg' }
        { id: 9 , title: 'Villa Marrakech 10', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/10.jpg' }
      ]
    ]
    
  it 'after images_source._add( objects ), expect images._fetch_all() to be equal to result', ( done ) ->
    this.timeout 5000
    
    images._on( 'complete', ->
      images._fetch_all ( values ) -> check done, ->
        values.sort ( a, b ) -> a.id > b.id

        expect( values ).to.be.eql [
          { id: 2 , title: 'Villa Marrakech 2' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/02.jpg' }
          { id: 3 , title: 'Villa Marrakech 3' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/03.jpg' }
          { id: 4 , title: 'Villa Marrakech 4' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/04.jpg' }
          { id: 5 , title: 'Villa Marrakech 5' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/05.jpg' }
          { id: 7 , title: 'Villa Marrakech 7' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/07.jpg' }
          { id: 9 , title: 'Villa Marrakech 10', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/10.jpg' }
          { id: 10, title: 'Villa Marrakech 11', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/11.jpg' }
          { id: 11, title: 'Villa Marrakech 12', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/12.jpg' }
        ]

    , this, true )
    
    images_source._add [
      { title: 'Villa Marrakech 11', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/11.jpg' }
      { title: 'Villa Marrakech 12', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/12.jpg' }
    ]
  
  it 'after images_source._update( objects ), expect images._fetch_all() to be equal to result', ( done ) ->
    this.timeout 5000
    
    images._on( 'complete', ->
      images._fetch_all ( values ) -> check done, () ->
        values.sort ( a, b ) -> a.id > b.id
 
        expect( values ).to.be.eql [
          { id: 2 , title: 'Villa Marrakech 2' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/02.jpg' }
          { id: 3 , title: 'Villa Marrakech 3' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/03.jpg' }
          { id: 4 , title: 'Villa Marrakech 4' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/04.jpg' }
          { id: 5 , title: 'Villa Marrakech 5' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/05.jpg' }
          { id: 7 , title: 'Villa Marrakech 7' , uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/07.jpg' }
          { id: 9 , title: 'Villa Marrakech 13', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/13.jpg' }
          { id: 10, title: 'Villa Marrakech 11', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/11.jpg' }
          { id: 11, title: 'Villa Marrakech 12', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/12.jpg' }
        ]
        
    , this, true )
    
    images_source._update [
      [
        { id: 9 , title: 'Villa Marrakech 10', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/10.jpg' }
        { id: 9 , title: 'Villa Marrakech 13', uri: 'https://raw.github.com/ConnectedSets/castorcad/master/images/13.jpg' }
      ]
    ]
    
  