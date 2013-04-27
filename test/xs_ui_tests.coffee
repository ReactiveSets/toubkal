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

#mocha.setup 'bdd' if typeof mocha isnt 'undefined'

# include modules
# ---------------
expect = if require? then ( require 'expect.js' ) else this.expect
XS = if require? then ( require '../lib/xs.js' ).XS else this.XS

xs = XS.xs

columns = xs.set( [
  { id: "id"    , label: "ID"     }
  { id: "title" , label: "Title"  }
  { id: "author", label: "Author" }
] ).order( [ { id: 'id' } ] )

books = xs.set( [
  { id: 1, title: "A Tale of Two Cities"             , author: "Charles Dickens" , sales: 200, year: 1859, language: "English" }
  { id: 2, title: "The Lord of the Rings"            , author: "J. R. R. Tolkien", sales: 150, year: 1955, language: "English" }
  { id: 3, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"      , sales:  13            , language: "English" }
  { id: 4, title: "The Da Vinci Code"                , author: "Dan Brown"       , sales:  80, year: 2003, language: "English" }
] ).order( [ { id: "title" } ] )

describe 'UI Tests', ->
  describe 'Table():', ->
    table_container = document.getElementById 'table'
    
    books.table table_container, columns, { caption: "List of the best-selling books (source: wikipedia)" }
    
    table_node = document.getElementsByTagName( 'table' )[ 0 ]
    table_head = table_node.childNodes[ 1 ]
    table_body = table_node.childNodes[ 2 ]
    
    it 'expect document body to contain table element', ->
      expect( table_node ).to.be.ok()
    
    it 'expect table to have a caption', ->
      expect( table_node.caption.innerText ).to.be.ok() # 'List of the best-selling books (source: wikipedia)'
    
    it 'expect table caption to be "List of the best-selling books (source: wikipedia)"', ->
      expect( table_node.caption.innerText ).to.be 'List of the best-selling books (source: wikipedia)'
    
    it 'expect table to have a thead', ->
      expect( table_head ).to.be.ok()
    
    it 'expect table to have a tbody', ->
      expect( table_body ).to.be.ok()
    
    it 'expect table to have 3 columns', ->
      expect( table_head.childNodes[ 0 ].childNodes.length ).to.be 3
    
    it 'expect table to have 4 rows', ->
      expect( table_body.childNodes.length ).to.be 4
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorIDTitle' +
        'Charles Dickens1A Tale of Two Cities' +
        'Roald Dahl3Charlie and the Chocolate Factory' +
        'Dan Brown4The Da Vinci Code' +
        'J. R. R. Tolkien2The Lord of the Rings'
      
      expect( table_node.textContent ).to.be content
    
    it 'after columns.add( objects ), expect table to have 5 columns', ->
      columns.add [
        { id: "year"    , label: "Year"    , align: "center" }
        { id: "language", label: "Language"                  }
      ]
      
      expect( table_head.childNodes[ 0 ].childNodes.length ).to.be 5
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorIDLanguageTitleYear' +
        'Charles Dickens1EnglishA Tale of Two Cities1859' +
        'Roald Dahl3EnglishCharlie and the Chocolate Factory' +
        'Dan Brown4EnglishThe Da Vinci Code2003' +
        'J. R. R. Tolkien2EnglishThe Lord of the Rings1955'
      
      expect( table_node.textContent ).to.be content
    
    it 'after columns.remove( object ), expect table to have 4 columns', ->
      columns.remove [ { id: "id", label: "ID" } ]
      
      expect( table_head.childNodes[ 0 ].childNodes.length ).to.be 4
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorLanguageTitleYear' +
        'Charles DickensEnglishA Tale of Two Cities1859' +
        'Roald DahlEnglishCharlie and the Chocolate Factory' +
        'Dan BrownEnglishThe Da Vinci Code2003' +
        'J. R. R. TolkienEnglishThe Lord of the Rings1955'
      
      expect( table_node.textContent ).to.be content
    
    it 'after columns.update( object ), expect table to have 4 columns', ->
      columns.update [ [ { id: "language", label: "Language" }, { id: "sales", label: "Sales by millions of copies" } ] ]
      
      expect( table_head.childNodes[ 0 ].childNodes.length ).to.be 4
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorSales by millions of copiesTitleYear' +
        'Charles Dickens200A Tale of Two Cities1859' +
        'Roald Dahl13Charlie and the Chocolate Factory' +
        'Dan Brown80The Da Vinci Code2003' +
        'J. R. R. Tolkien150The Lord of the Rings1955'
      
      expect( table_node.textContent ).to.be content
