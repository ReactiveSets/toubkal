###
    xs_table_tests.coffee

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

# ----------------------------------------------------------------------------------------------
# parse an HTML table to a Javascript object
# ------------------------------------------

from_HTML_to_object = ( node ) ->
  rows    = node.rows
  columns = []
  data    = []
  
  for cell in rows[ 0 ].cells
    columns.push { id: cell.getAttribute( "column_id" ), label: cell.innerHTML }
  
  for i in [ 1 ... rows.length ]
    j     = 0
    o     = {}
    
    for cell in rows[ i ].cells
      v     = cell.innerHTML
      align = cell.style.textAlign
      
      if not isNaN( parseInt v )
        v = parseInt v
        
        if align isnt "right" then columns[ j ].align = align
      else
        if align? abd align isnt "left" then columns[ j ].align = align
        
      if v isnt "" then o[ columns[ j ].id ] = v
      
      j++
    
    data.push o
  
  return { columns: columns, data: data }

# ----------------------------------------------------------------------------------------------
# xs table unit test suite
# ------------------------

# include modules
XS = if require? then ( require '../../lib/xs.js' ).XS else this.XS
expect = if require? then ( require 'expect.js' ) else this.expect

if require?
  require '../../lib/code.js'
  require '../../lib/pipelet.js'
  require '../../lib/filter.js'
  require '../../lib/order.js'
  require '../../lib/aggregate.js'
  require '../../lib/table.js'

xs = XS.xs

columns   = xs.set( [ { id: "id", label: "ID" }, { id: "title", label: "Title" }, { id: "author", label: "Author" } ], { name: "Columns Set" } ).order( [ { id: "label" } ] )
organizer = xs.set [ { id: "title" } ], { name: "Organizer: by title ascending" }

books = xs.set [
  { id: 1, title: "A Tale of Two Cities"             , author: "Charles Dickens" , sales: 200, year: 1859, language: "English" }
  { id: 2, title: "The Lord of the Rings"            , author: "J. R. R. Tolkien", sales: 150, year: 1955, language: "English" }
  { id: 3, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"      , sales:  13            , language: "English" }
  { id: 4, title: "The Da Vinci Code"                , author: "Dan Brown"       , sales:  80, year: 2003, language: "English" }
], { name: "Books" }

books_table = books.order( organizer ).table document.getElementById( "demo" ), columns, { caption: "List of the best-selling books (source: wikipedia)" }

node = document.getElementById( "demo" ).firstChild

describe 'Columns_Set():', ->
  it 'columns should be equal to object.columns', ->
    object = from_HTML_to_object node
    
    expect( columns._fetch_all() ).to.be.eql object.columns
  
  it 'after add 2 objects: columns._add( objects ) should be equal to object.columns', ->
    columns._add [ { id: "year" , label: "Year", align: "center" }, { id: "language", label: "Language" } ]
    
    object = from_HTML_to_object node
    
    expect( columns._fetch_all() ).to.be.eql object.columns
  
  it 'after columns._remove( object ), columns should be equal to object.columns', ->
    columns._remove [ { id: "id", label: "ID" } ]
    
    object = from_HTML_to_object node
    
    expect( columns._fetch_all() ).to.be.eql object.columns
  
  it 'after columns._update( object ), columns should be equal to object.columns', ->
    columns._update [ [ { id: "language", label: "Language" }, { id: "sales", label: "Sales by millions of copies" } ] ]
    
    object = from_HTML_to_object node

    expect( columns._fetch_all() ).to.be.eql object.columns

describe 'Table():', ->
  it 'books should be equal to object.data', ->
    object = from_HTML_to_object node
    
    expect( object.data ).to.be.eql [
      { title: "A Tale of Two Cities"             , author: "Charles Dickens" , year: 1859, sales:       200 }
      { title: "Charlie and the Chocolate Factory", author: "Roald Dahl"                  , sales:        13 }
      { title: "The Da Vinci Code"                , author: "Dan Brown"       , year: 2003, sales:        80 }
      { title: "The Lord of the Rings"            , author: "J. R. R. Tolkien", year: 1955, sales:       150 }
    ]
  
  it 'after books._add( objects ): books should be equal to object.data', ->
    books._add [
      { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , sales:        39, year: 2000, language: "English" }
      { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , sales:        30, year: 2005, language: "Swedish" }
      { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", sales:       125, year: 1853, language: "English" }
      { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , sales:       100, year: 1937, language: "English" }
      { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , sales:        23, year: 2008, language: "English" }
      { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , sales: undefined, year: 1999, language: "English" }
      { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000, language: "French"  }
      { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , sales: undefined, year: 2008, language: "English" }
      { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , sales:        50, year: 1955, language: "English" }
      { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , sales:       100, year: undefined, language: "English" }
      { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , sales:        60, year: null, language: "English" }
    ]
    
    object = from_HTML_to_object node
    
    expect( object.data ).to.be.eql [
      { title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859, sales:  200 }
      { title: "And Then There Were None"                , author: "Agatha Christie"                    , sales:  100 }
      { title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000, sales:   39 }
      { title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008              }
      { title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                         , sales:   13 }
      { title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999              }
      { title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955, sales:   50 }
      { title: "Steps to Christ"                         , author: "Ellen G. White"                     , sales:   60 }
      { title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003, sales:   80 }
      { title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000, sales:   10 }
      { title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005, sales:   30 }
      { title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937, sales:  100 }
      { title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008, sales:   23 }
      { title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955, sales:  150 }
      { title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853, sales:  125 }
    ]
  
  it 'after books._update( objects ): books should be equal to object.data', ->
    books._update [
      [
        { id:  2, title: "The Lord of the Rings"             , author: "J. R. R. Tolkien"         , year: 1955 }
        { id:  2, title: "The Fellowship of the Ring: LOTR 1", author: "John Ronald Reuel Tolkien", year: 1955 }
      ]
      [
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"  , year: 1999 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "Joanne Rowling", year: 1999 }
      ]
    ]
    
    object = from_HTML_to_object node
    
    expect( object.data ).to.be.eql [ 
      { author: "Charles Dickens"          , sales: 200, title: "A Tale of Two Cities"                    , year: 1859 }
      { author: "Agatha Christie"          , sales: 100, title: "And Then There Were None"                             }
      { author: "Dan Brown"                , sales:  39, title: "Angels and Demons"                       , year: 2000 }
      { author: "Stephenie Meyer"                      , title: "Breaking Dawn"                           , year: 2008 }
      { author: "Roald Dahl"               , sales:  13, title: "Charlie and the Chocolate Factory"                    }
      { author: "Joanne Rowling"                       , title: "Harry Potter and the Prisoner of Azkaban", year: 1999 }
      { author: "Vladimir Nabokov"         , sales:  50, title: "Lolita"                                  , year: 1955 }
      { author: "Ellen G. White"           , sales:  60, title: "Steps to Christ"                                      }
      { author: "Dan Brown"                , sales:  80, title: "The Da Vinci Code"                       , year: 2003 }
      { author: "Pierre Dukan"             , sales:  10, title: "The Dukan Diet"                          , year: 2000 }
      { author: "John Ronald Reuel Tolkien"            , title: "The Fellowship of the Ring: LOTR 1"      , year: 1955 }
      { author: "Stieg Larsson"            , sales:  30, title: "The Girl with the Dragon Tattoo"         , year: 2005 }
      { author: "J. R. R. Tolkien"         , sales: 100, title: "The Hobbit"                              , year: 1937 }
      { author: "Suzanne Collins"          , sales:  23, title: "The Hunger Games"                        , year: 2008 }
      { author: "William Holmes McGuffey"  , sales: 125, title: "The McGuffey Readers"                    , year: 1853 }
    ]
  
  it 'after books._remove( objects ): books should be equal to object.data', ->
    books._remove [
      { id:  1, title: "A Tale of Two Cities", author: "Charles Dickens"        , year: 1859 }
      { id: 13, title: "Lolita"              , author: "Vladimir Nabokov"       , year: 1955 }
      { id:  7, title: "The McGuffey Readers", author: "William Holmes McGuffey", year: 1853 }
    ]
    
    object = from_HTML_to_object node
    
    expect( object.data ).to.be.eql [
      { author: "Agatha Christie"          , sales: 100, title: "And Then There Were None"                             }
      { author: "Dan Brown"                , sales:  39, title: "Angels and Demons"                       , year: 2000 }
      { author: "Stephenie Meyer"                      , title: "Breaking Dawn"                           , year: 2008 }
      { author: "Roald Dahl"               , sales:  13, title: "Charlie and the Chocolate Factory"                    }
      { author: "Joanne Rowling"                       , title: "Harry Potter and the Prisoner of Azkaban", year: 1999 }
      { author: "Ellen G. White"           , sales:  60, title: "Steps to Christ"                                      }
      { author: "Dan Brown"                , sales:  80, title: "The Da Vinci Code"                       , year: 2003 }
      { author: "Pierre Dukan"             , sales:  10, title: "The Dukan Diet"                          , year: 2000 }
      { author: "John Ronald Reuel Tolkien"            , title: "The Fellowship of the Ring: LOTR 1"      , year: 1955 }
      { author: "Stieg Larsson"            , sales:  30, title: "The Girl with the Dragon Tattoo"         , year: 2005 }
      { author: "J. R. R. Tolkien"         , sales: 100, title: "The Hobbit"                              , year: 1937 }
      { author: "Suzanne Collins"          , sales:  23, title: "The Hunger Games"                        , year: 2008 }
    ]
    