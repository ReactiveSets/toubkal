###
    aggregate.coffee

    Copyright (C) 2013-2015, Reactive Sets

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
# rs test utils
# -------------

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check

rs = this.rs || require '../../lib/core.js'

Pipelet = rs.RS.Pipelet

# ----------------------------------------------------------------------------------------------
# aggregate() test suite
# ----------------------

describe 'aggregate()', ->
  books_sales = rs.set [
    { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , sales:       200, year: 1859 }
    { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , sales:       150, year: 1955 }
    { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , sales:        80, year: 2003 }
    { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , sales:        65, year: 1988 }
    { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , sales:        39, year: 2000 }
    { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , sales:        30, year: 2005 }
    { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", sales:       125, year: 1853 }
    { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , sales:       100, year: 1937 }
    { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , sales:        23, year: 2008 }
    { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , sales: undefined, year: 1999 }
    { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
    { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , sales: undefined, year: 2008 }
    { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , sales:        50, year: 1955 }
    { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , sales:       100, year: undefined }
    { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , sales:        60, year: null }
    { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , sales:        13             }
  ]
  
  sales  = rs.set [ { id: "sales"  } ]
  by_author = rs.set [ { id: "author" } ]
  by_year   = rs.set [ { id: "year"   } ]
  
  books_sales_by_author = books_sales.aggregate( sales, by_author ).order( by_author ).ordered()
  books_sales_by_year   = books_sales.aggregate( sales, by_year ).order( by_year ).ordered()
  
  aggregate_from = ( source, from, measures, dimensions, options ) ->
    return source
      .filter( from, options )
      .aggregate( measures, dimensions, options )
      .order( dimensions )
      .ordered()
  
  rs.Compose 'aggregate_from', aggregate_from
  
  tolkien_books = ( book, options ) ->
    return book.author is 'J. R. R. Tolkien'
  
  tolkien_sales_by_year = books_sales.through rs.aggregate_from tolkien_books, sales, by_year 
  
  it 'should group and order books_sales_by_author by author', ( done ) ->
    books_sales_by_author._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
        { author: "Agatha Christie"        , sales: 100, _count: 1 }
        { author: "Charles Dickens"        , sales: 200, _count: 1 }
        { author: "Dan Brown"              , sales: 119, _count: 2 }
        { author: "Ellen G. White"         , sales:  60, _count: 1 }
        { author: "J. R. R. Tolkien"       , sales: 250, _count: 2 }
        { author: "J.K. Rowling"           , sales:   0, _count: 1 }
        { author: "Paulo Coelho"           , sales:  65, _count: 1 }
        { author: "Pierre Dukan"           , sales:  10, _count: 1 }
        { author: "Roald Dahl"             , sales:  13, _count: 1 }
        { author: "Stephenie Meyer"        , sales:   0, _count: 1 }
        { author: "Stieg Larsson"          , sales:  30, _count: 1 }
        { author: "Suzanne Collins"        , sales:  23, _count: 1 }
        { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
        { author: "William Holmes McGuffey", sales: 125, _count: 1 }
      ]
  
  it 'should group and order books_sales_by_year by year', ( done ) ->
    books_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
    # ToDo: undefined and null groups are not supported at this time
    #  { sales:       113, year: undefined, _count: 1 }
    #  { sales:        60, year: null, _count: 1 }
      { sales:       125, year: 1853, _count: 1 }
      { sales:       200, year: 1859, _count: 1 }
      { sales:       100, year: 1937, _count: 1 }
      { sales:       200, year: 1955, _count: 2 }
      { sales:        65, year: 1988, _count: 1 }
      { sales:         0, year: 1999, _count: 1 }
      { sales:        49, year: 2000, _count: 2 }
      { sales:        80, year: 2003, _count: 1 }
      { sales:        30, year: 2005, _count: 1 }
      { sales:        23, year: 2008, _count: 2 }
    ]
  
  it 'should group and order tolkien_sales_by_year by year', ( done ) ->
    tolkien_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
      { sales:       100, year: 1937, _count: 1 }
      { sales:       150, year: 1955, _count: 1 }
    ]

  describe 'add sales for "Dan Brown" in 2004', ->
    it 'should increase books_sales_by_author for "Dan Brown"', ( done ) ->
      books_sales._add [
        { id: 17, title: "The Da Vinci Code"                       , author: "Dan Brown"              , sales:        125, year: 2004 }
      ]

      books_sales_by_author._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
        { author: "Agatha Christie"        , sales: 100, _count: 1 }
        { author: "Charles Dickens"        , sales: 200, _count: 1 }
        { author: "Dan Brown"              , sales: 244, _count: 3 }
        { author: "Ellen G. White"         , sales:  60, _count: 1 }
        { author: "J. R. R. Tolkien"       , sales: 250, _count: 2 }
        { author: "J.K. Rowling"           , sales:   0, _count: 1 }
        { author: "Paulo Coelho"           , sales:  65, _count: 1 }
        { author: "Pierre Dukan"           , sales:  10, _count: 1 }
        { author: "Roald Dahl"             , sales:  13, _count: 1 }
        { author: "Stephenie Meyer"        , sales:   0, _count: 1 }
        { author: "Stieg Larsson"          , sales:  30, _count: 1 }
        { author: "Suzanne Collins"        , sales:  23, _count: 1 }
        { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
        { author: "William Holmes McGuffey", sales: 125, _count: 1 }
      ]      
     
    it 'should add books_sales_by_year for 2004', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
        { sales:       125, year: 1853, _count: 1 }
        { sales:       200, year: 1859, _count: 1 }
        { sales:       100, year: 1937, _count: 1 }
        { sales:       200, year: 1955, _count: 2 }
        { sales:        65, year: 1988, _count: 1 }
        { sales:         0, year: 1999, _count: 1 }
        { sales:        49, year: 2000, _count: 2 }
        { sales:        80, year: 2003, _count: 1 }
        { sales:       125, year: 2004, _count: 1 }
        { sales:        30, year: 2005, _count: 1 }
        { sales:        23, year: 2008, _count: 2 }
      ]

  describe "remove Stephenie Meyer's sales in 2008 and Pierre Dukan's sales in 2000", ->
    it 'should remove Stephenie Meyer and Pierre Dukan sales from books_sales_by_author', ( done ) ->
      books_sales._remove [
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , sales: undefined, year: 2008 }
      ]

      books_sales_by_author._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
        { author: "Agatha Christie"        , sales: 100, _count: 1 }
        { author: "Charles Dickens"        , sales: 200, _count: 1 }
        { author: "Dan Brown"              , sales: 244, _count: 3 }
        { author: "Ellen G. White"         , sales:  60, _count: 1 }
        { author: "J. R. R. Tolkien"       , sales: 250, _count: 2 }
        { author: "J.K. Rowling"           , sales:   0, _count: 1 }
        { author: "Paulo Coelho"           , sales:  65, _count: 1 }
        { author: "Roald Dahl"             , sales:  13, _count: 1 }
        { author: "Stieg Larsson"          , sales:  30, _count: 1 }
        { author: "Suzanne Collins"        , sales:  23, _count: 1 }
        { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
        { author: "William Holmes McGuffey", sales: 125, _count: 1 }
      ]      
     
    it 'should remove 10 from sales in 2000 from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () -> expect( sales ).to.be.eql [
        { sales:       125, year: 1853, _count: 1 }
        { sales:       200, year: 1859, _count: 1 }
        { sales:       100, year: 1937, _count: 1 }
        { sales:       200, year: 1955, _count: 2 }
        { sales:        65, year: 1988, _count: 1 }
        { sales:         0, year: 1999, _count: 1 }
        { sales:        39, year: 2000, _count: 1 }
        { sales:        80, year: 2003, _count: 1 }
        { sales:       125, year: 2004, _count: 1 }
        { sales:        30, year: 2005, _count: 1 }
        { sales:        23, year: 2008, _count: 1 }
      ]

