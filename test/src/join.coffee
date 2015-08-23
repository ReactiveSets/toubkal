###
    join.coffee
    
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
# test utils
# ----------

utils  = require( './tests_utils.js' ) unless this.expect

expect = this.expect || utils.expect
check  = this.check  || utils.check

# ----------------------------------------------------------------------------------------------
# Require tested modules
# ----------------------
rs = this.rs

unless rs?
  rs = require '../../lib/core/join.js'

RS      = rs.RS
extend  = RS.extend

# ----------------------------------------------------------------------------------------------
# join test suite
# ---------------

describe 'join() authors, books, and books_sales:', ->
  authors = rs.set [
    { id:  1, name: "Charles Dickens"         }
    { id:  2, name: "J. R. R. Tolkien"        }
    { id:  3, name: "Dan Brown"               }
    { id:  4, name: "Paulo Coelho"            }
    { id:  5, name: "Stieg Larsson"           }
    { id:  6, name: "William Holmes McGuffey" }
    { id:  7, name: "Suzanne Collins"         }
    { id:  8, name: "J.K. Rowling"            }
    { id:  9, name: "Pierre Dukan"            }
    { id: 10, name: "Stephenie Meyer"         }
    { id: 11, name: "Vladimir Nabokov"        }
    { id: 12, name: "Agatha Christie"         }
    # { id: 13, name: "Ellen G. White"          }
    # { id: 14, name: "Roald Dahl"              }
  ], { name: 'authors' }
  
  books = rs.set [
    { id:  1, title: "A Tale of Two Cities"                    , author_id:  1 }
    { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
    { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
    { id:  4, title: "The Alchemist"                           , author_id:  4 }
    { id:  5, title: "Angels and Demons"                       , author_id:  3 }
    { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5 }
    { id:  7, title: "The McGuffey Readers"                    , author_id:  6 }
    { id:  8, title: "The Hobbit"                              , author_id:  2 }
    { id:  9, title: "The Hunger Games"                        , author_id:  7 }
    { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8 }
    { id: 11, title: "The Dukan Diet"                          , author_id:  9 }
    { id: 12, title: "Breaking Dawn"                           , author_id: 10 }
    { id: 13, title: "Lolita"                                  , author_id: 11 }
    { id: 14, title: "And Then There Were None"                , author_id: 12 }
    # { id: 15, title: "Steps to Christ"                         , author_id: 13 }
    { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
  ], { name: 'books' }
  
  books_with_authors = books.join(
    authors
    
    [ [ 'author_id', 'id' ] ]
    
    ( book, author ) ->
      return if author then extend {}, book, { author_name: author.name } else book
    
    { left: true, name: 'books_with_authors' }
  ).set()
  
  books_sales = rs.set [
    { book_id:  1, sales:       200, year: 1859 }
    { book_id:  2, sales:       150, year: 1955 }
    { book_id:  3, sales:        80, year: 2003 }
    { book_id:  4, sales:        65, year: 1988 }
    { book_id:  5, sales:        39, year: 2000 }
    { book_id:  6, sales:        30, year: 2005 }
    { book_id:  7, sales:       125, year: 1853 }
    { book_id:  8, sales:       100, year: 1937 }
    { book_id:  9, sales:        23, year: 2008 }
    { book_id: 10, sales: undefined, year: 1999 }
    { book_id: 11, sales:        10, year: 2000 }
    { book_id: 12, sales: undefined, year: 2008 }
    { book_id: 13, sales:        50, year: 1955 }
    { book_id: 14, sales:       100, year: undefined }
    { book_id: 15, sales:        60, year: null }
    { book_id: 16, sales:        13             }
  ], { key: ['year', 'book_id'], name: 'books_sales' }
  
  it 'should join books and authors', ( done ) ->
    books_with_authors._fetch_all ( values ) -> check done, ->
      found = true
      
      result = rs.set [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  7, title: "The McGuffey Readers"                    , author_id:  6, author_name: "William Holmes McGuffey" }
        { id:  9, title: "The Hunger Games"                        , author_id:  7, author_name: "Suzanne Collins"         }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 11, title: "The Dukan Diet"                          , author_id:  9, author_name: "Pierre Dukan"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 13, title: "Lolita"                                  , author_id: 11, author_name: "Vladimir Nabokov"        }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
      ], { key: [ 'id', 'title', 'author_id', 'author_name' ] }
      
      for v in values
        continue if result.index_of( v ) isnt -1
        
        found = false
        
        break
        
      expect( found ).to.be true
      
  it 'should add a joined author', ( done ) ->
    authors._add [
      { id: 13, name: "Ellen G. White"          }
      { id: 14, name: "Roald Dahl"              }
    ]
    
    books._add [
      { id: 15, title: "Steps to Christ"                         , author_id: 13 }
    ]
    
    books_with_authors._fetch_all ( values ) -> check done, () ->
      found = true
      
      result = rs.set [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  7, title: "The McGuffey Readers"                    , author_id:  6, author_name: "William Holmes McGuffey" }
        { id:  9, title: "The Hunger Games"                        , author_id:  7, author_name: "Suzanne Collins"         }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 11, title: "The Dukan Diet"                          , author_id:  9, author_name: "Pierre Dukan"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 13, title: "Lolita"                                  , author_id: 11, author_name: "Vladimir Nabokov"        }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ], { key: [ 'id', 'title', 'author_id', 'author_name' ] }
      
      for v in values
        continue if result.index_of( v ) isnt -1

        found = false

        break

      expect( found ).to.be true
