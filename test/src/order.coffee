###
    order.coffee

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

###

# ----------------------------------------------------------------------------------------------
# rs test utils
# -------------

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check
log    = this.log    || utils.log
rs     = this.rs     || utils.rs

# ----------------------------------------------------------------------------------------------
# order test suite
# ----------------

describe 'order()', ->
  books = rs.set [
    { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
    { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
    { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
    { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
    { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
  ], { name: 'books' }
  
  organizer = rs.set [ { id: "year" } ], { name: 'by_year' }
  
  by_ascending_author  = ( a, b ) ->
    if ( a = a.author ) == ( b = b.author ) then return 0
    
    if a == undefined then return -1
    if b == undefined then return  1
    if a == null      then return -1
    if b == null      then return  1
    
    if a  <  b        then return -1
    if a  >  b        then return  1

    return 0
  
  by_descending_author = ( a, b ) ->
    return by_ascending_author( b, a )
  
  books_ordered_by_year = books
    .order( organizer, { name: 'books_ordered_by_year' } )
    .ordered().ordered()
  
  by_descending_year_delay = 10
  
  by_descending_year = rs
    .set( [ { id: "year", descending: true } ], { name: 'by_descending_year' } )
    #.trace( 'By Descending Year Organizer, before delay' )
    .delay( by_descending_year_delay )
    .trace( 'By Descending Year Organizer, after delay' )
  
  books_ordered_by_descending_year = books
    .order( by_descending_year, { name: 'books_ordered_by_descending_year', insert_before: true } )
    .ordered()
    .ordered()
    .delay( by_descending_year_delay + 5 ) # needs to be a bit higher to prevent race condition that would fail test 2
    .trace( 'By Descending Year, after delay' ) # trace only works if organizer is greedy
  
  books_ordered_by_ascending_author  = books
    .order( by_ascending_author , { name: 'books_ordered_by_ascending_author'  } )
    .ordered().ordered()

  books_ordered_by_descending_author = books
    .order( by_descending_author, { name: 'books_ordered_by_descending_author', insert_before: true } )
    .ordered().ordered()
  
  it 'books_ordered_by_year should be ordered by ascending year', ( done ) ->
    books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
      { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
      { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
      { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
      { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
      { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
    ]

  it 'books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
    books_ordered_by_descending_year._fetch_all ( books ) ->
      log 'books_ordered_by_descending_year delayed fetched'
      
      check done, () -> expect( books ).to.be.eql [
        { id: 3, title: "The Da Vinci Code"    , author: "Dan Brown"       , year: 2003 }
        { id: 5, title: "Angels and Demons"    , author: "Dan Brown"       , year: 2000 }
        { id: 4, title: "The Alchemist"        , author: "Paulo Coelho"    , year: 1988 }
        { id: 2, title: "The Lord of the Rings", author: "J. R. R. Tolkien", year: 1955 }
        { id: 1, title: "A Tale of Two Cities" , author: "Charles Dickens" , year: 1859 }
      ]
  
  it 'books_ordered_by_ascending_author should be ordered by ascending auhtor: organizer is a function', ( done ) ->
    books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
      { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
      { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
      { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
      { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
      { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
    ]

  it 'books_ordered_by_descending_author should be ordered by descending auhtor: organizer is a function', ( done ) ->
    books_ordered_by_descending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
      { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
      { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
      { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
      { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
      { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
    ]
  
  describe 'add()', ->
    it 'after books._add( book 6 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
      books._add [ { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", year: 2005 } ]

      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 1, title: "A Tale of Two Cities"           , author: "Charles Dickens" , year: 1859 }
        { id: 2, title: "The Lord of the Rings"          , author: "J. R. R. Tolkien", year: 1955 }
        { id: 4, title: "The Alchemist"                  , author: "Paulo Coelho"    , year: 1988 }
        { id: 5, title: "Angels and Demons"              , author: "Dan Brown"       , year: 2000 }
        { id: 3, title: "The Da Vinci Code"              , author: "Dan Brown"       , year: 2003 }
        { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson"   , year: 2005 }
      ]
    
    it 'after books._add( book 6 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
      books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 6, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson"   , year: 2005 }
        { id: 3, title: "The Da Vinci Code"              , author: "Dan Brown"       , year: 2003 }
        { id: 5, title: "Angels and Demons"              , author: "Dan Brown"       , year: 2000 }
        { id: 4, title: "The Alchemist"                  , author: "Paulo Coelho"    , year: 1988 }
        { id: 2, title: "The Lord of the Rings"          , author: "J. R. R. Tolkien", year: 1955 }
        { id: 1, title: "A Tale of Two Cities"           , author: "Charles Dickens" , year: 1859 }
      ]
    
    it 'after books._add( book 6 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
      books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
      ]

    it 'after books._add( book 6 ), books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
      books_ordered_by_descending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
      ]

    it 'after books._add( books 7, 8, 9, 10 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
      books._add [
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
      ]

      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
      ]
    
    it 'after books._add( books 7, 8, 9, 10 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
      books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
      ]
    
    it 'after books._add( books 7, 8, 9, 10 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
      books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
      ]

    it 'after books._add( books 11, 12, 13 ), whose years are already used; books_ordered_by_year should be ordered by ascending year', ( done ) ->
      books._add [
        { id: 11, title: "The Dukan Diet", author: "Pierre Dukan"    , year: 2000 }
        { id: 12, title: "Breaking Dawn" , author: "Stephenie Meyer" , year: 2008 }
        { id: 13, title: "Lolita"        , author: "Vladimir Nabokov", year: 1955 }
      ]
      
      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
      ]
    
    it 'after books._add( books 11, 12, 13 ), whose years are already used; books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
      books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
      ]
    
    it 'after books._add( books 14, 15, 16 ), the years are undefined or null; books_ordered_by_year should be ordered by ascending year', ( done ) ->
      books._add [
        { id: 14, title: "And Then There Were None"         , author: "Agatha Christie", year: undefined }
        { id: 15, title: "Steps to Christ"                  , author: "Ellen G. White" , year: null      }
        { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"                       }
      ]
      
      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
      ]
    
    it 'after books._add( books 14, 15, 16 ), the years are undefined or null; books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
      books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
      ]
    
    it '_update organizer, books_ordered_by_year should be ordered by ascending by title', ( done ) ->
      organizer._update [ [ { id: "year" }, { id: "title" } ] ]

      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
      ]
    
    it 'add a second field to organizer, books_ordered_by_year should be ordered by ascending year and title', ( done ) ->
      organizer._notify [
        { action: "update", objects: [ [ { id: "title" }, { id: "year" } ] ] }
        { action: "add"   , objects: [ { id: "title" } ] }
      ]
      
      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
      ]
    
    it 'books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
      books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
      ]

    it 'books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
      books_ordered_by_descending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
      ]
    
    it 'books_ordered_by_ascending_id should be ordered by ascending id: organizer is an objects', ( done ) ->
      books_ordered_by_ascending_id = books.order( [ { id: "id" } ] ).ordered().ordered()
      
      books_ordered_by_ascending_id._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
      ]

    it 'books_ordered_by_descending should be ordered by descending id: organizer is an objects', ( done ) ->
      books_ordered_by_ascending_id = books.order( [ { id: "id", descending: true } ] ).ordered().ordered()
      
      books_ordered_by_ascending_id._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  2, title: "The Lord of the Rings"                   , author: "J. R. R. Tolkien"       , year: 1955 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
      ]
  
  describe '_update():', ->
    it 'after books._update( object 2 ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
      books._update [ [
        { id: 2, title: "The Lord of the Rings"  , author: "J. R. R. Tolkien", year: 1955 }
        { id: 2, title: "The Lord of the Rings 1", author: "J. R. R. Tolkien", year: 1954 }
      ] ]

      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien"       , year: 1954 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
      ]
    
    it 'after books._update( object 2 ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
      books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 2008 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 2008 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 2000 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2000 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien"       , year: 1954 }
        { id:  8, title: "The Hobbit"                              , author: "J. R. R. Tolkien"       , year: 1937 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: null }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: undefined }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"                          }
      ]
    
    it 'after books._notify( 4 updates transaction ), books_ordered_by_year should be ordered by ascending year', ( done ) ->
      books._notify [
        {
          action : "update"
          objects: [
            [
              { id:  8, title: "The Hobbit", author: "J. R. R. Tolkien"         , year: 1937 }
              { id:  8, title: "The Hobbit Changed", author: "J. R. R. Tolkien 8" , year: 1937 }
            ]
            
            [
              { id: 15, title: "Steps to Christ", author: "Ellen G. White", year: null      }
              { id: 15, title: "Steps to Christ", author: "Ellen G. White", year: undefined }
            ]

            [
              { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"             }
              { id: 16, title: "Charlie and the Chocolate Factory", author: "Roald Dahl", year: 1970 }
            ]
            
            [
              { id: 14, title: "And Then There Were None", author: "Agatha Christie", year: undefined }
              { id: 14, title: "And Then There Were None", author: "Agatha Christie", year: 1927      }
            ]

            [
              { id:  2, title: "The Lord of the Rings 1", author: "J. R. R. Tolkien", year: 1954 }
              { id:  2, title: "The Lord of the Rings 1", author: "J. R. R. Tolkien 2", year: 1954 }
            ]
            
            [
              { id: 11, title: "The Dukan Diet", author: "Pierre Dukan", year: 2000 }
              { id: 11, title: "The Dukan Diet", author: "Pierre Dukan", year: 1999 }
            ]
            
            [
              { id:  5, title: "Angels and Demons", author: "Dan Brown", year: 2000 }
              { id:  5, title: "Angels and Demons", author: "Dan Brown", year: 2001 }
            ]
            
            [
              { id: 12, title: "Breaking Dawn", author: "Stephenie Meyer", year: 2008 }
              { id: 12, title: "Breaking Dawn", author: "Stephenie Meyer", year: 1875 }
            ]
            
            [
              { id:  9, title: "The Hunger Games", author: "Suzanne Collins", year: 2008 }
              { id:  9, title: "The Hunger Games", author: "Suzanne Collins", year: 1942 }
            ]
          ]
        }
      ]
      
      books_ordered_by_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: undefined }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 1875 }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
        { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
        { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
      ]
    
    it 'after books._notify( transaction ), books_ordered_by_descending_year should be ordered by descending year', ( done ) ->
      books_ordered_by_descending_year._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  3, title: "The Da Vinci Code"                       , author: "Dan Brown"              , year: 2003 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
        { id: 13, title: "Lolita"                                  , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
        { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
        { id: 12, title: "Breaking Dawn"                           , author: "Stephenie Meyer"        , year: 1875 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
        { id: 15, title: "Steps to Christ"                         , author: "Ellen G. White"         , year: undefined }
      ]
    
  describe 'remove( books 12, 13, 3, 15 ):', ->
    it 'after books._remove( objects 12, 13, 15 ), books_ordered_by_ascending_author should be ordered by ascending auhtor', ( done ) ->
      books._remove [
        { id: 12, title: "Breaking Dawn"    , author: "Stephenie Meyer" , year: 2008 }
        { id: 13, title: "Lolita"           , author: "Vladimir Nabokov", year: 1955 }
        { id:  3, title: "The Da Vinci Code", author: "Dan Brown"       , year: 2003 }
        { id: 15, title: "Steps to Christ"  , author: "Ellen G. White"  , year: undefined }
      ]
      
      books_ordered_by_ascending_author._fetch_all ( books ) -> check done, () -> expect( books ).to.be.eql [
        { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
        { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
        { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
        { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
        { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
        { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
        { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
        { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
        { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
      ]

    it 'after books._remove( objects 12, 13, 3, 15 ), books_ordered_by_descending_author should be ordered by descending auhtor', ( done ) ->
      books_ordered_by_descending_author._fetch_all ( books ) -> check done, () ->
        # books.sort ( a, b ) -> a.author < b.author
        expect( books ).to.be.eql [
          { id:  7, title: "The McGuffey Readers"                    , author: "William Holmes McGuffey", year: 1853 }
          { id:  9, title: "The Hunger Games"                        , author: "Suzanne Collins"        , year: 1942 }
          { id:  6, title: "The Girl with the Dragon Tattoo"         , author: "Stieg Larsson"          , year: 2005 }
          { id: 16, title: "Charlie and the Chocolate Factory"       , author: "Roald Dahl"             , year: 1970 }
          { id: 11, title: "The Dukan Diet"                          , author: "Pierre Dukan"           , year: 1999 }
          { id:  4, title: "The Alchemist"                           , author: "Paulo Coelho"           , year: 1988 }
          { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling"           , year: 1999 }
          { id:  8, title: "The Hobbit Changed"                      , author: "J. R. R. Tolkien 8"     , year: 1937 }
          { id:  2, title: "The Lord of the Rings 1"                 , author: "J. R. R. Tolkien 2"     , year: 1954 }
          { id:  5, title: "Angels and Demons"                       , author: "Dan Brown"              , year: 2001 }
          { id:  1, title: "A Tale of Two Cities"                    , author: "Charles Dickens"        , year: 1859 }
          { id: 14, title: "And Then There Were None"                , author: "Agatha Christie"        , year: 1927 }
        ]
