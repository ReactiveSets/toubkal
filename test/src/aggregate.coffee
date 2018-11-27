###
    aggregate.coffee

    Copyright (c) 2013-2017, Reactive Sets

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

de = false

# ----------------------------------------------------------------------------------------------
# aggregate() test suite
# ----------------------

describe 'aggregate()', ->
  books_sales                   = null
  books_sales_through           = null
  books_sales_union             = null
  all_book_sales                = null
  all_book_sales_set            = null
  sales                         = null
  by_author                     = null
  by_year                       = null
  books_sales_by_author         = null
  books_sales_by_author_set     = null
  books_sales_by_author_order   = null
  books_sales_by_author_ordered = null
  books_sales_by_year           = null
  books_sales_by_year_order     = null
  books_sales_by_year_ordered   = null
  aggregate_from                = null
  tolkien_books                 = null
  tolkien_sales_by_year         = null
  by_author_sorter              = null
  by_year_sorter                = null
  by_author_year_sorter         = null
  expected                      = null
  
  it 'should not throw during initialization of books sales set', ->
    books_sales_through = rs.pass_through()
    
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
    
    books_sales_union = books_sales.union( [ books_sales_through ] )
  
  it 'should not throw while initializing books_sales_by_author aggregates', ->
    sales     = rs.set [ { id: "author", type: "unsupported measure type" }, { id: "sales", "default": "invalid default, should be ignored" } ]
    by_author = rs.set [ { id: "author" } ]
    
    books_sales_by_author = books_sales_union.aggregate( sales, by_author ).debug( de, 'sales by author' )
  
  it 'should not throw while initializing books_sales_by_year aggregates', ->
    by_year   = rs.set [ { id: "year"   } ]
    
    books_sales_by_year   = books_sales_union.aggregate( sales, by_year   ).debug( de, 'sales by year'   )
  
  it 'should not throw while initializing ordered aggregates aggregates', ->
    books_sales_by_author_set   = books_sales_by_author.pass_through().set()
    books_sales_by_author_order = books_sales_by_author_set.order( by_author )
    books_sales_by_year_order   = books_sales_by_year        .order( by_year   )
    
    by_author_sorter = books_sales_by_author_order._sorter
    by_year_sorter   = books_sales_by_year_order._sorter
    
    books_sales_by_author_ordered = books_sales_by_author_order.ordered()
    books_sales_by_year_ordered   = books_sales_by_year_order  .ordered()
    
  it 'should not throw while initializing all_book_sales aggregates', ->
    all_book_sales = books_sales_union.aggregate( sales ).debug( de, 'all sales' )
    all_book_sales_set = all_book_sales.set()
  
  it 'should not throw while initializing aggregates from aggregate_from composition', ->
    aggregate_from = ( source, from, measures, dimensions, options ) ->
      return source
        .filter( from, options )
        .aggregate( measures, dimensions, options )
        .order( dimensions )
        .ordered()
    
    rs.Compose 'aggregate_from', { union: true }, aggregate_from
    
    tolkien_books = ( book, options ) ->
      return book.author is 'J. R. R. Tolkien'
    
    tolkien_sales_by_year = books_sales_union.through(
      rs.aggregate_from(
        tolkien_books
        
        [ { id: "Tolkien Sales", of: "sales" }, { id: "sales" } ]
        
        [ { id: "author" }, { id: "year" } ]
      )
    )
  
  it 'should not throw while initializing aggregates with injection attempts', ->
    books_sales_union.aggregate(
      # measures
      [
        { id: "measure includes a single quote \", an escape \\, and ends with another escape \\" }
        { id: "a second measure ending with an escape \\" }
      ]
      
      # dimensions
      [
        { id: "0dimension starts with zero" }
        { id: "second dimension ending with an escape \\" }
      ]
    )
  
  it 'should group and order books_sales_by_author by author', ( done ) ->
    books_sales_by_author._fetch_all ( sales ) -> check done, () ->
      sales.sort by_author_sorter
      
      expect( sales ).to.be.eql expected = [
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
  
  it 'should do the same for books_sales_by_author_ordered', ( done ) ->
    books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
      expect( sales ).to.be.eql expected
  
  it 'should group and order books_sales_by_year by year', ( done ) ->
    books_sales_by_year._fetch_all ( sales ) -> check done, () ->
      sales.sort by_year_sorter
      
      expect( sales ).to.be.eql expected = [
        { sales:       113, year: undefined, _count: 2 }
        { sales:        60, year: null, _count: 1 }
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
  
  it 'should do the same for books_sales_by_year_ordered', ( done ) ->
    books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
      expect( sales ).to.be.eql expected
  
  it 'should group and order tolkien_sales_by_year by year', ( done ) ->
    tolkien_sales_by_year._fetch_all ( sales ) -> check done, () ->
      sales.sort by_year_sorter
      
      expect( sales ).to.be.eql [
        { "Tolkien Sales": 100, sales: 100, author: "J. R. R. Tolkien", year: 1937, _count: 1 }
        { "Tolkien Sales": 150, sales: 150, author: "J. R. R. Tolkien", year: 1955, _count: 1 }
      ]
  
  it 'should add up all sales to all_book_sales', ( done ) ->
    all_book_sales._fetch_all ( sales ) -> check done, () ->
      expect( sales ).to.be.eql expected = [
        { id: 1, sales: 1045, _count: 16 }
      ]
  
  it 'should do the same all_book_sales set', ( done ) ->
    all_book_sales_set._fetch_all ( sales ) -> check done, () ->
      expect( sales ).to.be.eql expected
  
  describe 'add sales for "The Da Vinci Code" of "Dan Brown" in 2004', ->
    it 'should add sales of "The Da Vinci Code" to books_sales_by_author for "Dan Brown"', ( done ) ->
      books_sales._add [
        { id: 17, title: "The Da Vinci Code"                       , author: "Dan Brown"              , sales:        125, year: 2004 }
      ]

      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
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
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add sales of "The Da Vinci Code" to books_sales_by_year for 2004', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
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
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add sales of "The Da Vinci Code" to all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1170, _count: 17 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
  
  describe "remove Stephenie Meyer's sales in 2008 and Pierre Dukan's sales in 2000", ->
    it 'should remove Stephenie Meyer and Pierre Dukan sales from books_sales_by_author', ( done ) ->
      books_sales._remove [
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , sales: undefined, year: 2008 }
      ]

      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
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
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should remove 10 from sales in 2000 from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
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
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should remove sales off all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1160, _count: 15 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected

  describe 'update sales for "A Tale of Two Cities", adding 51 sales', ->
    it 'should update sales for "Charles Dickens", adding 51 sales from books_sales_by_author', ( done ) ->
      books_sales._update [
        [
          { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , sales:       200, year: 1859 }
          { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , sales:       251, year: 1859 }
        ]
      ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 251, _count: 1 }
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
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should update sales for years 1859, adding 51 sales from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
          { sales:       125, year: 1853, _count: 1 }
          { sales:       251, year: 1859, _count: 1 }
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
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add 51 sales to all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1211, _count: 15 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected

  describe 'update sales for "The Hobbit", adding 16 sales', ->
    it 'should update sales for "J. R. R. Tolkien", adding 16 sales from books_sales_by_author', ( done ) ->
      books_sales._update [
        [
          { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , sales:       100, year: 1937 }
          { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , sales:       116, year: 1937 }
        ]
      ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 251, _count: 1 }
          { author: "Dan Brown"              , sales: 244, _count: 3 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 266, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  23, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should update sales for years 1859, 2008, 2009, and 1937 from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
          { sales:       125, year: 1853, _count: 1 }
          { sales:       251, year: 1859, _count: 1 }
          { sales:       116, year: 1937, _count: 1 }
          { sales:       200, year: 1955, _count: 2 }
          { sales:        65, year: 1988, _count: 1 }
          { sales:         0, year: 1999, _count: 1 }
          { sales:        39, year: 2000, _count: 1 }
          { sales:        80, year: 2003, _count: 1 }
          { sales:       125, year: 2004, _count: 1 }
          { sales:        30, year: 2005, _count: 1 }
          { sales:        23, year: 2008, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add 16 sales to all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1227, _count: 15 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected

  describe 'update "The Hunger Games", removing 1 sale, changing year to 2009', ->
    it 'should update sales for "Suzanne Collins" from books_sales_by_author', ( done ) ->
      books_sales._update [
        [
          { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , sales:        23, year: 2008 }
          { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , sales:        22, year: 2009 }
        ]
      ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 251, _count: 1 }
          { author: "Dan Brown"              , sales: 244, _count: 3 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 266, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  22, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should remove sales for year 2008 and add sales for year 2009 from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
          { sales:       125, year: 1853, _count: 1 }
          { sales:       251, year: 1859, _count: 1 }
          { sales:       116, year: 1937, _count: 1 }
          { sales:       200, year: 1955, _count: 2 }
          { sales:        65, year: 1988, _count: 1 }
          { sales:         0, year: 1999, _count: 1 }
          { sales:        39, year: 2000, _count: 1 }
          { sales:        80, year: 2003, _count: 1 }
          { sales:       125, year: 2004, _count: 1 }
          { sales:        30, year: 2005, _count: 1 }
          { sales:        22, year: 2009, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should remove 1 sale to all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1226, _count: 15 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
  
  describe 'remove "sales" from measures', ->
    it 'should update all groups to remove all sales figures from books_sales_by_author', ( done ) ->
      sales._remove [ { id: "sales" } ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , _count: 1 }
          { author: "Charles Dickens"        , _count: 1 }
          { author: "Dan Brown"              , _count: 3 }
          { author: "Ellen G. White"         , _count: 1 }
          { author: "J. R. R. Tolkien"       , _count: 2 }
          { author: "J.K. Rowling"           , _count: 1 }
          { author: "Paulo Coelho"           , _count: 1 }
          { author: "Roald Dahl"             , _count: 1 }
          { author: "Stieg Larsson"          , _count: 1 }
          { author: "Suzanne Collins"        , _count: 1 }
          { author: "Vladimir Nabokov"       , _count: 1 }
          { author: "William Holmes McGuffey", _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should update all groups to remove all sales figures from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { year: undefined, _count: 2 }
          { year: null, _count: 1 }
          { year: 1853, _count: 1 }
          { year: 1859, _count: 1 }
          { year: 1937, _count: 1 }
          { year: 1955, _count: 2 }
          { year: 1988, _count: 1 }
          { year: 1999, _count: 1 }
          { year: 2000, _count: 1 }
          { year: 2003, _count: 1 }
          { year: 2004, _count: 1 }
          { year: 2005, _count: 1 }
          { year: 2009, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should remove sale figures from all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, _count: 15 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
  
  describe 'add back "sales" from measures', ->
    it 'should update all groups to add back all sales figures from books_sales_by_author', ( done ) ->
      sales._add [ { id: "sales" } ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 251, _count: 1 }
          { author: "Dan Brown"              , sales: 244, _count: 3 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 266, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  22, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should update all groups to add back all sales figures from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
          { sales:       125, year: 1853, _count: 1 }
          { sales:       251, year: 1859, _count: 1 }
          { sales:       116, year: 1937, _count: 1 }
          { sales:       200, year: 1955, _count: 2 }
          { sales:        65, year: 1988, _count: 1 }
          { sales:         0, year: 1999, _count: 1 }
          { sales:        39, year: 2000, _count: 1 }
          { sales:        80, year: 2003, _count: 1 }
          { sales:       125, year: 2004, _count: 1 }
          { sales:        30, year: 2005, _count: 1 }
          { sales:        22, year: 2009, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add back sales figures to all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1226, _count: 15 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
  
  describe "anti-remove Pierre Dukan's sales in 2000", ->
    it 'should add negatively Pierre Dukan sales from books_sales_by_author', ( done ) ->
      books_sales_through._remove [
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
      ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 251, _count: 1 }
          { author: "Dan Brown"              , sales: 244, _count: 3 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 266, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Pierre Dukan"           , sales: -10, _count: -1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  22, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add negatively Pierre Dukan sales for year 2000 from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
          { sales:       125, year: 1853, _count: 1 }
          { sales:       251, year: 1859, _count: 1 }
          { sales:       116, year: 1937, _count: 1 }
          { sales:       200, year: 1955, _count: 2 }
          { sales:        65, year: 1988, _count: 1 }
          { sales:         0, year: 1999, _count: 1 }
          { sales:        29, year: 2000, _count: 0 }
          { sales:        80, year: 2003, _count: 1 }
          { sales:       125, year: 2004, _count: 1 }
          { sales:        30, year: 2005, _count: 1 }
          { sales:        22, year: 2009, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should remove 10 sales and one count from all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1216, _count: 14 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
  
  describe "add-back Pierre Dukan's sales in 2000", ->
    it 'should cancel previous anti-remove from books_sales_by_author', ( done ) ->
      books_sales_through._add [
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , sales:        10, year: 2000 }
      ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1 }
          { author: "Charles Dickens"        , sales: 251, _count: 1 }
          { author: "Dan Brown"              , sales: 244, _count: 3 }
          { author: "Ellen G. White"         , sales:  60, _count: 1 }
          { author: "J. R. R. Tolkien"       , sales: 266, _count: 2 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1 }
          { author: "Roald Dahl"             , sales:  13, _count: 1 }
          { author: "Stieg Larsson"          , sales:  30, _count: 1 }
          { author: "Suzanne Collins"        , sales:  22, _count: 1 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_author_ordered', ( done ) ->
      books_sales_by_author_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add-back previous anti-remove sales for year 2000 from books_sales_by_year', ( done ) ->
      books_sales_by_year._fetch_all ( sales ) -> check done, () ->
        sales.sort by_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { sales:       113, year: undefined, _count: 2 }
          { sales:        60, year: null, _count: 1 }
          { sales:       125, year: 1853, _count: 1 }
          { sales:       251, year: 1859, _count: 1 }
          { sales:       116, year: 1937, _count: 1 }
          { sales:       200, year: 1955, _count: 2 }
          { sales:        65, year: 1988, _count: 1 }
          { sales:         0, year: 1999, _count: 1 }
          { sales:        39, year: 2000, _count: 1 }
          { sales:        80, year: 2003, _count: 1 }
          { sales:       125, year: 2004, _count: 1 }
          { sales:        30, year: 2005, _count: 1 }
          { sales:        22, year: 2009, _count: 1 }
        ]
    
    it 'should do the same for books_sales_by_year_ordered', ( done ) ->
      books_sales_by_year_ordered._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
    
    it 'should add-back 10 sales from all_book_sales', ( done ) ->
      all_book_sales._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected = [
          { id: 1, sales: 1226, _count: 15 }
        ]
    
    it 'should do the same all_book_sales set', ( done ) ->
      all_book_sales_set._fetch_all ( sales ) -> check done, () ->
        expect( sales ).to.be.eql expected
  
  describe 'changing by_author dimensions, adding year', ->
    it 'should update books_sales_by_author', ( done ) ->
      
      by_author._add [ { id: "year" } ]
      
      by_author_year_sorter = books_sales_by_author_order._sorter
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1, year: undefined }
          { author: "Charles Dickens"        , sales: 251, _count: 1, year: 1859 }
          { author: "Dan Brown"              , sales:  39, _count: 1, year: 2000 }
          { author: "Dan Brown"              , sales:  80, _count: 1, year: 2003 }
          { author: "Dan Brown"              , sales: 125, _count: 1, year: 2004 }
          { author: "Ellen G. White"         , sales:  60, _count: 1, year: null }
          { author: "J. R. R. Tolkien"       , sales: 116, _count: 1, year: 1937 }
          { author: "J. R. R. Tolkien"       , sales: 150, _count: 1, year: 1955 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1, year: 1999 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1, year: 1988 }
          { author: "Roald Dahl"             , sales:  13, _count: 1, year: undefined }
          { author: "Stieg Larsson"          , sales:  30, _count: 1, year: 2005 }
          { author: "Suzanne Collins"        , sales:  22, _count: 1, year: 2009 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1, year: 1955 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1, year: 1853 }
        ]
    
    it 'should do the same for books_sales_by_author_set', ( done ) ->
      books_sales_by_author_set._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_year_sorter
        
        expect( sales ).to.be.eql expected
    
    it 'should have an empty anti-state', ->
      expect( books_sales_by_author_set.b ).to.be.eql []
    
    it 'should have a key of [ "author", "year" ]', ->
      expect( books_sales_by_author_set._key ).to.be.eql [ "author", "year" ]
    
    it 'should allow to remove sales for "Dan Brown" in 2004', ( done ) ->
      books_sales._remove [
        { id: 17, title: "The Da Vinci Code"                       , author: "Dan Brown"              , sales:        125, year: 2004 }
      ]
      
      books_sales_by_author._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_year_sorter
        
        expect( sales ).to.be.eql expected = [
          { author: "Agatha Christie"        , sales: 100, _count: 1, year: undefined }
          { author: "Charles Dickens"        , sales: 251, _count: 1, year: 1859 }
          { author: "Dan Brown"              , sales:  39, _count: 1, year: 2000 }
          { author: "Dan Brown"              , sales:  80, _count: 1, year: 2003 }
          { author: "Ellen G. White"         , sales:  60, _count: 1, year: null }
          { author: "J. R. R. Tolkien"       , sales: 116, _count: 1, year: 1937 }
          { author: "J. R. R. Tolkien"       , sales: 150, _count: 1, year: 1955 }
          { author: "J.K. Rowling"           , sales:   0, _count: 1, year: 1999 }
          { author: "Paulo Coelho"           , sales:  65, _count: 1, year: 1988 }
          { author: "Roald Dahl"             , sales:  13, _count: 1, year: undefined }
          { author: "Stieg Larsson"          , sales:  30, _count: 1, year: 2005 }
          { author: "Suzanne Collins"        , sales:  22, _count: 1, year: 2009 }
          { author: "Vladimir Nabokov"       , sales:  50, _count: 1, year: 1955 }
          { author: "William Holmes McGuffey", sales: 125, _count: 1, year: 1853 }
        ]
    
    it 'should do the same for books_sales_by_author_set', ( done ) ->
      books_sales_by_author_set._fetch_all ( sales ) -> check done, () ->
        sales.sort by_author_year_sorter
        
        expect( sales ).to.be.eql expected
  
  describe 'aggregate population by state with sticky groups', ->
    population = [ { id: "population" } ]
    by_country = [ { id: 'country'    } ]
    
    # Population data from https://en.wikipedia.org/wiki/List_of_cities_proper_by_population
    cities_polulation = rs.set( [
      { country: "China"     , city: "Chongqing", population: 30165500 }
      { country: "China"     , city: "Shanghai" , population: 24183300 }
      { country: "China"     , city: "Beijing"  , population: 21707000 }
      { country: "Turkey"    , city: "Istanbul" , population: 15029231 }
      { country: "Pakistan"  , city: "Karachi"  , population: 14910352 }
      { country: "Bangladesh", city: "Dhaka"    , population: 14399000 }
      { country: "China"     , city: "Guangzhou", population: 13081000 }
      { country: "China"     , city: "Shenzhen" , population: 12528300 }
      { country: "India"     , city: "Mumbai"   , population: 12442373 }
      { country: "Russia"    , city: "Moscow"   , population: 13200000 }
      { country: "Brazil"    , city: "São Paulo", population: 12038000 }
      { country: "DRC"       , city: "Kinshasa" , population: 11462000 }
      { country: "China"     , city: "Tianjin"  , population: 11249000 }
    ], { key: [ "country", "city" ] } )
    
    population_by_country = cities_polulation
      
      .aggregate( population, by_country, { sticky_groups: [ { country: "DRC" }, { country: "Indonesia" } ] } )
      
      .debug( de, 'population_by_country' ).greedy()
    
    it 'should provide aggregates with two sticky groups', ( done ) ->
      population_by_country._fetch_all ( population ) -> check done, () ->
        expect( population ).to.be.eql [
          { country: "DRC"       , population:  11462000, _count: 1 }
          { country: "Indonesia" , population:         0, _count: 0 }
          { country: "China"     , population: 112914100, _count: 6 }
          { country: "Turkey"    , population:  15029231, _count: 1 }
          { country: "Pakistan"  , population:  14910352, _count: 1 }
          { country: "Bangladesh", population:  14399000, _count: 1 }
          { country: "India"     , population:  12442373, _count: 1 }
          { country: "Russia"    , population:  13200000, _count: 1 }
          { country: "Brazil"    , population:  12038000, _count: 1 }
        ]
    
    it 'should update aggregates when adding Lahore (Pakistan), Delhi (India), and Jakarta (Indonesia)', ( done ) ->
      cities_polulation._add [
        { country: "Pakistan"  , city: "Lahore"   , population: 11126000 }
        { country: "India"     , city: "Delhi"    , population: 11034555 }
        { country: "Indonesia" , city: "Jakarta"  , population: 10624000 }
      ]
      
      population_by_country._fetch_all ( population ) -> check done, () ->
        expect( population ).to.be.eql [
          { country: "DRC"       , population:  11462000, _count: 1 }
          { country: "Indonesia" , population:  10624000, _count: 1 }
          { country: "China"     , population: 112914100, _count: 6 }
          { country: "Turkey"    , population:  15029231, _count: 1 }
          { country: "Pakistan"  , population:  26036352, _count: 2 }
          { country: "Bangladesh", population:  14399000, _count: 1 }
          { country: "India"     , population:  23476928, _count: 2 }
          { country: "Russia"    , population:  13200000, _count: 1 }
          { country: "Brazil"    , population:  12038000, _count: 1 }
        ]
    
    it 'should update aggregates when removing 3 cities, not-removing sticky_groups', ( done ) ->
      cities_polulation._remove [
        { country: "Russia"    , city: "Moscow"   , population: 13200000 }
        { country: "Indonesia" , city: "Jakarta"  , population: 10624000 }
        { country: "Pakistan"  , city: "Lahore"   , population: 11126000 }
      ]
      
      population_by_country._fetch_all ( population ) -> check done, () ->
        expect( population ).to.be.eql [
          { country: "DRC"       , population:  11462000, _count: 1 }
          { country: "Indonesia" , population:         0, _count: 0 }
          { country: "China"     , population: 112914100, _count: 6 }
          { country: "Turkey"    , population:  15029231, _count: 1 }
          { country: "Pakistan"  , population:  14910352, _count: 1 }
          { country: "Bangladesh", population:  14399000, _count: 1 }
          { country: "India"     , population:  23476928, _count: 2 }
          { country: "Brazil"    , population:  12038000, _count: 1 }
        ]
    
    it 'should update aggregates on cities populations updates', ( done ) ->
      cities_polulation._update [
        [
          { country: "Turkey"    , city: "Istanbul" , population: 15029231 }
          { country: "Turkey"    , city: "Istanbul" , population: 15029231 + 1000 }
        ]
        [
          { country: "Bangladesh", city: "Dhaka"    , population: 14399000 }
          { country: "Bangladesh", city: "Dhaka"    , population: 14399000 - 1000 }
        ]
        [
          { country: "China"     , city: "Tianjin"  , population: 11249000 }
          { country: "China"     , city: "Tianjin"  , population: 11249000 - 325 }
        ]
      ]
      
      population_by_country._fetch_all ( population ) -> check done, () ->
        expect( population ).to.be.eql [
          { country: "DRC"       , population:  11462000, _count: 1 }
          { country: "Indonesia" , population:         0, _count: 0 }
          { country: "China"     , population: 112914100 - 325, _count: 6 }
          { country: "Turkey"    , population:  15029231 + 1000, _count: 1 }
          { country: "Pakistan"  , population:  14910352, _count: 1 }
          { country: "Bangladesh", population:  14399000 - 1000, _count: 1 }
          { country: "India"     , population:  23476928, _count: 2 }
          { country: "Brazil"    , population:  12038000, _count: 1 }
        ]
    
    it 'should remove all groups but sticky groups when removing remaining cities', ( done ) ->
      cities_polulation._remove [
        { country: "China"     , city: "Chongqing", population: 30165500 }
        { country: "China"     , city: "Shanghai" , population: 24183300 }
        { country: "China"     , city: "Beijing"  , population: 21707000 }
        { country: "Turkey"    , city: "Istanbul" , population: 15029231 }
        { country: "Pakistan"  , city: "Karachi"  , population: 14910352 }
        { country: "Bangladesh", city: "Dhaka"    , population: 14399000 }
        { country: "China"     , city: "Guangzhou", population: 13081000 }
        { country: "China"     , city: "Shenzhen" , population: 12528300 }
        { country: "India"     , city: "Mumbai"   , population: 12442373 }
        { country: "Brazil"    , city: "São Paulo", population: 12038000 }
        { country: "DRC"       , city: "Kinshasa" , population: 11462000 }
        { country: "China"     , city: "Tianjin"  , population: 11249000 }
        { country: "India"     , city: "Delhi"    , population: 11034555 }
      ]
      
      population_by_country._fetch_all ( population ) -> check done, () ->
        expect( population ).to.be.eql [
          { country: "DRC"       , population:         0, _count: 0 }
          { country: "Indonesia" , population:         0, _count: 0 }
        ]
  