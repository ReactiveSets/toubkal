###
    xs_ui.tests.coffee

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

# include modules
# ---------------
expect  = require 'expect.js'
Zombie  = require 'zombie'

browser  = new Zombie( { debug: true } )
document = browser.document


XS = ( require '../lib/xs.js' ).XS
require '../lib/table.js'

xs = XS.xs

columns = xs.set( [
  { id: "id"    , label: "ID"     }
  { id: "title" , label: "Title"  }
  { id: "author", label: "Author" }
] ).order( [ { id: "label" } ] )

books = xs.set( [
  { id: 1, title: "A Tale of Two Cities"             , author: "Charles Dickens" , sales: 200, year: 1859, language: "English" }
  { id: 2, title: "The Lord of the Rings"            , author: "J. R. R. Tolkien", sales: 150, year: 1955, language: "English" }
  { id: 3, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"      , sales:  13            , language: "English" }
  { id: 4, title: "The Da Vinci Code"                , author: "Dan Brown"       , sales:  80, year: 2003, language: "English" }
] ).order( [ { id: "title" } ] )

describe 'XS UI Tests:', ->
  before ( done ) ->
    browser.visit 'http://localhost:8080/test/ui.html', done
  
  it 'expect ui.html to be loaded', ->
    expect( browser.success ).to.be true
  
  describe 'Table Tests:', ->
    it 'expect div#table ( table container ) to exist', ->
      expect( browser.query( "#table" ) ).to.be.ok()
    
    it 'after books.table(), expect div#table to contain a table element', ->
      books.table browser.query( "#table" ), columns, { caption: "List of the best-selling books (source: wikipedia)" }
      
      expect( browser.query( "#table table" ) ).to.be.ok()
    