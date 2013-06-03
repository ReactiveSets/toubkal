###
    xs_load_images_tests.coffee

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

mocha.setup 'bdd' if typeof mocha isnt 'undefined'

# ----------------------------------------------------------------------------------------------
# Asynchrnous tests exception catcher
# -----------------------------------

check = ( done, test ) ->
  try
    test()

    done()
  catch e
    done e


# include modules
XS = if require? then ( require '../lib/xs.js' ).XS else this.XS
expect = if require? then ( require 'expect.js' ) else this.expect

if require?
  require '../lib/load_images.js'

xs = XS.xs

describe 'Load Images test suite:', ->
  dom_node       = document.getElementById 'images'
  images_dataset = xs.set [], { auto_increment: true, name: 'Images dataset' }
  images         = images_dataset.load_images document.getElementById 'images'
  
  it 'expect images.fetch_all() to be empty', ->
    expect( images.fetch_all() ).to.be.empty()
  
  it 'after images_dataset.add( objects ), expect images.fetch_all() to be equal to result', ( done ) ->
    images_dataset.add [
      { title: 'Space Station Freedom design 1991', src: 'http://upload.wikimedia.org/wikipedia/commons/9/9f/Space_Station_Freedom_design_1991.jpg' }
      { title: 'A wanderer dancing the dance of stars and space', src: 'http://upload.wikimedia.org/wikipedia/commons/5/5b/A_wanderer_dancing_the_dance_of_stars_and_space.jpg' }
      { title: 'Orion Nebula Space Galaxy', src: 'http://www.public-domain-image.com/public-domain-images-pictures-free-stock-photos/space-public-domain-images-pictures/orion-nebula-space-galaxy.jpg' }
      { title: 'Polycyclic Aromatic Hydrocarbons In Space', src: 'http://upload.wikimedia.org/wikipedia/commons/a/a2/Polycyclic_Aromatic_Hydrocarbons_In_Space.jpg' }
    ]
    
    images.fetch_all ( values ) -> check done, () ->
      expect( values ).to.be.eql [
        { id: 1, title: 'Space Station Freedom design 1991', src: 'http://upload.wikimedia.org/wikipedia/commons/9/9f/Space_Station_Freedom_design_1991.jpg' }
        { id: 2, title: 'A wanderer dancing the dance of stars and space', src: 'http://upload.wikimedia.org/wikipedia/commons/5/5b/A_wanderer_dancing_the_dance_of_stars_and_space.jpg' }
        { id: 3, title: 'Orion Nebula Space Galaxy', src: 'http://www.public-domain-image.com/public-domain-images-pictures-free-stock-photos/space-public-domain-images-pictures/orion-nebula-space-galaxy.jpg' }
        { id: 4, title: 'Polycyclic Aromatic Hydrocarbons In Space', src: 'http://upload.wikimedia.org/wikipedia/commons/a/a2/Polycyclic_Aromatic_Hydrocarbons_In_Space.jpg' }
      ]
  
  it 'after images_dataset.remove( object ), expect images.fetch_all() to be equal to result', ( done ) ->
    images_dataset.remove [
      { id: 3, title: 'Orion Nebula Space Galaxy', src: 'http://www.public-domain-image.com/public-domain-images-pictures-free-stock-photos/space-public-domain-images-pictures/orion-nebula-space-galaxy.jpg' }
    ]
    
    images.fetch_all ( values ) -> check done, () ->
      expect( values ).to.be.eql [
        { id: 1, title: 'Space Station Freedom design 1991', src: 'http://upload.wikimedia.org/wikipedia/commons/9/9f/Space_Station_Freedom_design_1991.jpg' }
        { id: 2, title: 'A wanderer dancing the dance of stars and space', src: 'http://upload.wikimedia.org/wikipedia/commons/5/5b/A_wanderer_dancing_the_dance_of_stars_and_space.jpg' }
        { id: 4, title: 'Polycyclic Aromatic Hydrocarbons In Space', src: 'http://upload.wikimedia.org/wikipedia/commons/a/a2/Polycyclic_Aromatic_Hydrocarbons_In_Space.jpg' }
      ]
  
  it 'after images_dataset.add( objects ), expect images.fetch_all() to be equal to result', ( done ) ->
    images_dataset.add [
      { title: 'Galaxy', src: 'http://images.cdn.fotopedia.com/flickr-4398655085-hd.jpg' }
      { title: 'The Moon', src: 'http://farm3.staticflickr.com/2266/2270264345_cf5c82a8c3_o.jpg' }
    ]
    
    images.fetch_all ( values ) -> check done, () ->
      expect( values ).to.be.eql [
        { id: 1, title: 'Space Station Freedom design 1991', src: 'http://upload.wikimedia.org/wikipedia/commons/9/9f/Space_Station_Freedom_design_1991.jpg' }
        { id: 2, title: 'A wanderer dancing the dance of stars and space', src: 'http://upload.wikimedia.org/wikipedia/commons/5/5b/A_wanderer_dancing_the_dance_of_stars_and_space.jpg' }
        { id: 4, title: 'Polycyclic Aromatic Hydrocarbons In Space', src: 'http://upload.wikimedia.org/wikipedia/commons/a/a2/Polycyclic_Aromatic_Hydrocarbons_In_Space.jpg' }
        { id: 5, title: 'Galaxy', src: 'http://images.cdn.fotopedia.com/flickr-4398655085-hd.jpg' }
        { id: 6, title: 'The Moon', src: 'http://farm3.staticflickr.com/2266/2270264345_cf5c82a8c3_o.jpg' }
      ]
  
  it 'after images_dataset.update( objects ), expect images.fetch_all() to be equal to result', ( done ) ->
    images_dataset.update [
      [
        { id: 5, title: 'Galaxy', src: 'http://images.cdn.fotopedia.com/flickr-4398655085-hd.jpg' }
        { 
          id         : 5
          title      : 'Galaxy'
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce sed sapien ipsum, quis sollicitudin mi. Pellentesque habitant morbi tristique fames ac turpis egestas'
          src        : 'http://images.cdn.fotopedia.com/flickr-4398655085-hd.jpg'
        }
      ]
      [
        { id: 6, title: 'The Moon', src: 'http://farm3.staticflickr.com/2266/2270264345_cf5c82a8c3_o.jpg' }
        {
          id         : 6
          title      : 'The Moon'
          description: 'Nullam bibendum, augue ac elementum commodo, nibh sapien laoreet metus, et sollicitudin arcu lectus in elit. Nam non est ipsum'
          src        : 'http://farm2.staticflickr.com/1280/1309917043_d50552d577_o.jpg'
        }
      ]
    ]
    
    images.fetch_all ( values ) -> check done, () ->
      expect( values ).to.be.eql [
        { id: 1, title: 'Space Station Freedom design 1991', src: 'http://upload.wikimedia.org/wikipedia/commons/9/9f/Space_Station_Freedom_design_1991.jpg' }
        { id: 2, title: 'A wanderer dancing the dance of stars and space', src: 'http://upload.wikimedia.org/wikipedia/commons/5/5b/A_wanderer_dancing_the_dance_of_stars_and_space.jpg' }
        { id: 4, title: 'Polycyclic Aromatic Hydrocarbons In Space', src: 'http://upload.wikimedia.org/wikipedia/commons/a/a2/Polycyclic_Aromatic_Hydrocarbons_In_Space.jpg' }
        { 
          id         : 5
          title      : 'Galaxy'
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce sed sapien ipsum, quis sollicitudin mi. Pellentesque habitant morbi tristique fames ac turpis egestas'
          src        : 'http://images.cdn.fotopedia.com/flickr-4398655085-hd.jpg'
        }
        {
          id         : 6
          title      : 'The Moon'
          description: 'Nullam bibendum, augue ac elementum commodo, nibh sapien laoreet metus, et sollicitudin arcu lectus in elit. Nam non est ipsum'
          src        : 'http://farm2.staticflickr.com/1280/1309917043_d50552d577_o.jpg'
        }
      ]
  
  