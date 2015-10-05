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
rs     = this.rs     || utils.rs

RS           = rs.RS
extend       = RS.extend
value_equals = RS.value_equals
log          = RS.log.bind null, 'join tests'

compare_expected_values = ( expected, values ) ->
  # log 'compare_expected_values() expected: ', expected
  # log 'compare_expected_values() values:', values
  
  expect( values.length ).to.be expected.length
  
  for v in values
    # log 'value:', v
    
    expect( expected.filter( value_equals.bind this, v ).length ).to.be 1
  
# ----------------------------------------------------------------------------------------------
# join test suite
# ---------------

describe 'join() authors and books', ->
  authors = rs.set [
    { id:  1, name: "Charles Dickens"         }
    { id:  2, name: "J. R. R. Tolkien"        }
    #{ id:  3, name: "Dan Brown"               }
    { id:  4, name: "Paulo Coelho"            }
    { id:  5, name: "Stieg Larsson"           }
    { id:  6, name: "William Holmes McGuffey" }
    # { id:  7, name: "Suzanne Collins"         }
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
    #{ id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
    { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
    { id:  4, title: "The Alchemist"                           , author_id:  4 }
    { id:  5, title: "Angels and Demons"                       , author_id:  3 }
    { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5 }
    # { id:  7, title: "The McGuffey Readers"                    , author_id:  6 }
    { id:  8, title: "The Hobbit"                              , author_id:  2 }
    { id:  9, title: "The Hunger Games"                        , author_id:  7 }
    { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8 }
    # { id: 11, title: "The Dukan Diet"                          , author_id:  9 }
    { id: 12, title: "Breaking Dawn"                           , author_id: 10 }
    # { id: 13, title: "Lolita"                                  , author_id: 11 }
    { id: 14, title: "And Then There Were None"                , author_id: 12 }
    # { id: 15, title: "Steps to Christ"                         , author_id: 13 }
    { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
  ], { name: 'books' }
  
  merge_book_author = ( book, author ) ->
    return if ( author and book )
      extend {}, book, { author_name: author.name }
    else
      book or { author_id: author.id, author_name: author.name }
  
  merge_author_book = ( author, book ) ->
    return merge_book_author( book, author )
  
  # inner join
  books_authors = books.join(
    authors
    
    [ [ 'author_id', 'id' ] ]
    
    merge_book_author
    
    { key: [ 'id', 'author_id' ], name: 'books_authors' }
  )
  
  books_authors_set = books_authors.set()
  
  # left join
  books_with_authors = books.join(
    authors
    
    [ [ 'author_id', 'id' ] ]
    
    merge_book_author
    
    { key: [ 'id', 'author_id' ], left: true, name: 'books_with_authors' }
  )
  
  books_with_authors_set = books_with_authors.set()
  
  # right join
  authors_on_books = authors.join(
    books
    
    [ [ 'id', 'author_id' ] ]
    
    merge_author_book
    
    { key: [ 'id', 'author_id' ], right: true, name: 'authors_on_books' }
  )
  
  authors_on_books_set = authors_on_books.trace( 'authors_on_books trace' ).set()
  
  # full outer join
  books_or_authors = books.join(
    authors
    
    [ [ 'author_id', 'id' ] ]
    
    merge_book_author
    
    { key: [ 'id', 'author_id' ], outer: true, name: 'books_or_authors' }
  )
  
  books_or_authors_set = books_or_authors.trace( 'authors_or_books trace' ).set()
  
  expected_inner = [
    { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
    { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
    { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
    { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
    { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
    { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
    { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
  ]
  
  expected = [
    { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
    { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
    { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
    { id:  5, title: "Angels and Demons"                       , author_id:  3 }
    { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
    { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
    { id:  9, title: "The Hunger Games"                        , author_id:  7 }
    { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
    { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
    { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
    { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
  ]
  
  expected_outer = [
    { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
    { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
    { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
    { id:  5, title: "Angels and Demons"                       , author_id:  3 }
    { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
    { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
    {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
    { id:  9, title: "The Hunger Games"                        , author_id:  7 }
    { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
    {                                                            author_id:  9, author_name: "Pierre Dukan"            }
    { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
    {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
    { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
    { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
  ]
  
  describe 'joining books and authors sets', ->
    it 'should join books authors (inner join)', ( done ) ->
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should join books authors (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should join books and authors (left join)', ( done ) ->
      books_with_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should join books and authors (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should join authors on books (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should join authors on books (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should join authors or books (full outer join)', ( done ) ->
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should join authors or books (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'adding two authors', ->
    it 'should allow to add one book which author was missing (inner join)', ( done ) ->
      authors._add [
        { id: 13, name: "Ellen G. White"          }
        { id: 14, name: "Roald Dahl"              }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                                    (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should allow to add an author to a book already present without its author (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                                                         (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                                                         (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                                                         (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should allow add an author to a book and add an author with no book (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        {                                                          , author_id: 13, author_name: "Ellen G. White"          }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                                                  (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'adding a book', ->
    it 'should add a book with its author (inner join)', ( done ) ->
      books._add [
        { id: 15, title: "Steps to Christ"                         , author_id: 13 }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should add a book with its author (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should add a book to an existing author (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                      (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'adding a book for an author who already has another book listed', ->
    it 'should add an additional book for its author (inner join)', ( done ) ->
      books._add [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                           (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                           (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                           (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                           (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                           (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                           (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                           (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'adding an author of two books already listed', ->
    it 'should add two books of that author (inner join)', ( done ) ->
      authors._add [
        { id:  3, name: "Dan Brown"               }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                  (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should add the author name of two books (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                      (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                      (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                      (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                      (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                      (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'removing an author of two books already listed', ->
    it 'should remove two books of that author (inner join)', ( done ) ->
      authors._remove [
        { id:  3, name: "Dan Brown"               }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                  (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should remove the author name of two books (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                         (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                         (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                         (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                         (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                         (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
  
  describe 'removing a book for an author who has another book listed', ->
    it 'should remove only this book (inner join)', ( done ) ->
      books._remove [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same           (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same           (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same           (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same           (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same           (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same           (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        { id: 15, title: "Steps to Christ"                         , author_id: 13, author_name: "Ellen G. White"          }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same           (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
  
  describe 'removing another book for an author with a single book', ->
    it 'should remove only this book (inner join)', ( done ) ->
      books._remove [
        { id: 15, title: "Steps to Christ"                         , author_id: 13 }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same           (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same           (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same           (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same           (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same           (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should remove the book but add back its author (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14, author_name: "Roald Dahl"              }
        {                                                          , author_id: 13, author_name: "Ellen G. White"          }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                             (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'removing two authors', ->
    it 'should remove one book with its author (inner join)', ( done ) ->
      authors._remove [
        { id: 13, name: "Ellen G. White"          }
        { id: 14, name: "Roald Dahl"              }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                     (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should remove one book with author adding back the book without the author (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                                                         (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                                                         (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                                                         (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                                                         (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5, author_name: "Stieg Larsson"           }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        { id: 14, title: "And Then There Were None"                , author_id: 12, author_name: "Agatha Christie"         }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                                                         (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'removing 6 books', ->
    it 'should remove 3 books with author (inner join)', ( done ) ->
      books._remove [
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  8, title: "The Hobbit"                              , author_id:  2 }
        { id:  6, title: "The Girl with the Dragon Tattoo"         , author_id:  5 }
        { id: 14, title: "And Then There Were None"                , author_id: 12 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id: 16, title: "Charlie and the Chocolate Factory"       , author_id: 14 }
      ]
      
      expected_inner = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should remove 6 books (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same    (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same    (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same    (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same    (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1, author_name: "Charles Dickens"         }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8, author_name: "J.K. Rowling"            }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10, author_name: "Stephenie Meyer"         }
        {                                                            author_id:  6, author_name: "William Holmes McGuffey" }
        {                                                            author_id:  9, author_name: "Pierre Dukan"            }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
        {                                                            author_id:  2, author_name: "J. R. R. Tolkien"        }
        {                                                            author_id:  5, author_name: "Stieg Larsson"           }
        {                                                            author_id: 12, author_name: "Agatha Christie"         }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same    (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'removing 7 authors', ->
    it 'should remove 3 books with author (inner join)', ( done ) ->
      authors._remove [
        { id:  1, name: "Charles Dickens"         }
        { id:  5, name: "Stieg Larsson"           }
        { id:  6, name: "William Holmes McGuffey" }
        { id:  8, name: "J.K. Rowling"            }
        { id:  9, name: "Pierre Dukan"            }
        { id: 10, name: "Stephenie Meyer"         }
        { id: 12, name: "Agatha Christie"         }
      ]
      
      expected_inner = [
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should remove 3 authors from books (left join)', ( done ) ->
      expected = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8 }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10 }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                 (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                 (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                 (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should remove 3 authors from books and 4 authors without books (full outer join)', ( done ) ->
      expected_outer = [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1 }
        { id:  4, title: "The Alchemist"                           , author_id:  4, author_name: "Paulo Coelho"            }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8 }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10 }
        {                                                            author_id: 11, author_name: "Vladimir Nabokov"        }
        {                                                            author_id:  2, author_name: "J. R. R. Tolkien"        }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                                             (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'removing all (5) remaining books then all (3) remaining authors', ->
    it 'should remove the last book (inner join)', ( done ) ->
      books._remove [
        { id:  1, title: "A Tale of Two Cities"                    , author_id:  1 }
        { id:  4, title: "The Alchemist"                           , author_id:  4 }
        { id:  9, title: "The Hunger Games"                        , author_id:  7 }
        { id: 10, title: "Harry Potter and the Prisoner of Azkaban", author_id:  8 }
        { id: 12, title: "Breaking Dawn"                           , author_id: 10 }
      ]
      
      authors._remove [
        { id:  2, name: "J. R. R. Tolkien"        }
        { id:  4, name: "Paulo Coelho"            }
        { id: 11, name: "Vladimir Nabokov"        }
      ]
      
      expected_inner = []
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same          (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should remove 5 remaining books (left join)', ( done ) ->
      expected = []
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same              (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same              (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same              (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should remove all remaining books and authors (full outer join)', ( done ) ->
      expected_outer = []
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                            (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'adding back 4 books then the 2 authors of these four books (2 books per author)', ->
    it 'should add 4 books with their 2 authors (inner join)', ( done ) ->
      books._add [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  8, title: "The Hobbit"                              , author_id:  2 }
      ]
      
      authors._add [
        { id:  2, name: "J. R. R. Tolkien"        }
        { id:  3, name: "Dan Brown"               }
      ]
      
      expected_inner = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                      (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same                      (left join)', ( done ) ->
      expected = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                      (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                      (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                      (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                      (full outer join)', ( done ) ->
      expected_outer = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                      (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'removing these 2 authors of those four books (2 books per author)', ->
    it 'should remove all 4 books (inner join)', ( done ) ->
      authors._remove [
        { id:  2, name: "J. R. R. Tolkien"        }
        { id:  3, name: "Dan Brown"               }
      ]
      
      expected_inner = []
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same        (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should remove 2 authors 4 from books (left join)', ( done ) ->
      expected = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
        { id:  8, title: "The Hobbit"                              , author_id:  2 }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                   (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same                   (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                   (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same                   (full outer join)', ( done ) ->
      expected_outer = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
        { id:  8, title: "The Hobbit"                              , author_id:  2 }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                   (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'removing last four books and adding back their 2 authors (2 books per author)', ->
    it 'should still show no books (inner join)', ( done ) ->
      books._remove [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  8, title: "The Hobbit"                              , author_id:  2 }
      ]
      
      authors._add [
        { id:  2, name: "J. R. R. Tolkien"        }
        { id:  3, name: "Dan Brown"               }
      ]
      
      expected_inner = []
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same         (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should remove 4 books (left join)', ( done ) ->
      expected = []
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same    (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same    (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same    (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should remove 4 books and add back two authors (full outer join)', ( done ) ->
      expected_outer = [
        {                                                            author_id:  2, author_name: "J. R. R. Tolkien"        }
        {                                                            author_id:  3, author_name: "Dan Brown"               }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                             (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
  describe 'adding back the four books of these 2 authors (2 books per author)', ->
    it 'should add back these 4 books (inner join)', ( done ) ->
      books._add [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2 }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3 }
        { id:  5, title: "Angels and Demons"                       , author_id:  3 }
        { id:  8, title: "The Hobbit"                              , author_id:  2 }
      ]
      
      expected_inner = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
      ]
      
      books_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same            (inner join) on donwstream set', ( done ) ->
      books_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_inner, values
    
    it 'should do the same            (left join)', ( done ) ->
      expected = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
      ]
      
      books_with_authors._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same            (left join) on downstream set', ( done ) ->
      books_with_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should do the same            (right join)', ( done ) ->
      authors_on_books._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should do the same            (right join) on downstream set', ( done ) ->
      authors_on_books_set._fetch_all ( values ) -> check done, () ->
        compare_expected_values expected, values
    
    it 'should remove the two standalone authors then add 4 books back with these two authors (full outer join)', ( done ) ->
      expected_outer = [
        { id:  2, title: "The Lord of the Rings"                   , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  8, title: "The Hobbit"                              , author_id:  2, author_name: "J. R. R. Tolkien"        }
        { id:  3, title: "The Da Vinci Code"                       , author_id:  3, author_name: "Dan Brown"               }
        { id:  5, title: "Angels and Demons"                       , author_id:  3, author_name: "Dan Brown"               }
      ]
      
      books_or_authors._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
    
    it 'should do the same                                                                    (full outer join) on downstream set', ( done ) ->
      books_or_authors_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected_outer, values
  
  describe 'checking anti-state of downstream sets are empty', ->
    it 'should have nothing in its anti-state (inner join)      downstream set', () ->
      expect( books_authors_set.b.length ).to.be 0
    
    it 'should have nothing in its anti-state (left join)       downstream set', () ->
      expect( books_with_authors_set.b.length ).to.be 0
    
    it 'should have nothing in its anti-state (right join)      downstream set', () ->
      expect( authors_on_books_set.b.length ).to.be 0
    
    it 'should have nothing in its anti-state (full outer join) downstream set', () ->
      expect( books_or_authors_set.b.length ).to.be 0
    
describe 'join() users and users profile, on "id" attribute', ->
  users              = null
  profiles           = null
  merge_user_profile = null
  users_profiles     = null
  users_profiles_set = null
  expected           = null
  on_add             = null
  on_remove          = null
  on_update          = null
  
  describe 'joining users and users profile', ->
    it 'should have one user with no name', ( done ) ->
      users = rs.set [
        { id: 1, email: 'one@example.com' }
      ]
      
      profiles = rs.set [
        { id: 1, name: 'one' }
      ]
      
      merge_user_profile = ( user, profile ) -> extend {}, user, profile
      
      users_profiles = users.join(
          profiles,
          
          [ 'id' ],
          
          merge_user_profile,
          
          { left: true }
          
        ).trace 'users profiles trace'
      
      users_profiles_set = users_profiles.set()
      
      users_profiles._on 'add',    ( values, options ) -> on_add    && on_add    values, options
      users_profiles._on 'remove', ( values, options ) -> on_remove && on_remove values, options
      users_profiles._on 'update', ( values, options ) -> on_update && on_update values, options
      
      expected = [
        { id: 1, email: 'one@example.com', name: 'one' }
      ]
      
      users_profiles._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should have one user with no name on downstream set', ( done ) ->
      users_profiles_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
  
  describe 'adding a user', ->
    it 'should add a user with no name', ( done ) ->
      on_add = ( values, options )  -> check done, ->
        expect( values ).to.be.eql [ { id: 2, email: 'two@example.com' } ]
        on_add = null
      
      users._add [ { id: 2, email: 'two@example.com' } ]
      
      expected.push { id: 2, email: 'two@example.com' }
    
    it 'should now have two users, one with no name', ( done ) ->
      users_profiles._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should now have two users, one with no name on downstream set', ( done ) ->
      users_profiles_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
  
  describe 'adding a user profile for second user', ->
    it 'should update second user to add name', ( done ) ->
      on_update = ( updates, options )  -> check done, ->
        expect( updates ).to.be.eql [
          [
            { id: 2, email: 'two@example.com' }
            { id: 2, email: 'two@example.com', name: 'two' }
          ]
        ]
        
        on_update = null
      
      profiles._add [ { id: 2, name: 'two' } ]
      
      expected[ 1 ] = { id: 2, email: 'two@example.com', name: 'two' }
      
    it 'should now have two users with names', ( done ) ->
      users_profiles._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should now have two users with names on downstream set', ( done ) ->
      users_profiles_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
  
  describe 'remove user profiles of both users', ->
    it 'should update first user to remove name', ( done ) ->
      on_update = ( updates, options )  -> check done, ->
        expect( updates ).to.be.eql [
          [
            { id: 1, email: 'one@example.com', name: 'one' }
            { id: 1, email: 'one@example.com' }
          ]
          [
            { id: 2, email: 'two@example.com', name: 'two' }
            { id: 2, email: 'two@example.com' }
          ]
        ]
        
        on_update = null
      
      profiles._remove [ { id: 1, name: 'one' }, { id: 2, name: 'two' } ]
      
      expected[ 0 ] = { id: 1, email: 'one@example.com' }
      expected[ 1 ] = { id: 2, email: 'two@example.com' }
      
    it 'should now have two users with no name', ( done ) ->
      users_profiles._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should now have two users with no name on downstream set', ( done ) ->
      users_profiles_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
  
  describe 'adding back both user profiles of both users', ->
    it 'should update first user to remove name', ( done ) ->
      on_update = ( updates, options )  -> check done, ->
        expect( updates ).to.be.eql [
          [
            { id: 1, email: 'one@example.com' }
            { id: 1, email: 'one@example.com', name: 'one' }
          ]
          [
            { id: 2, email: 'two@example.com' }
            { id: 2, email: 'two@example.com', name: 'two' }
          ]
        ]
        
        on_update = null
      
      profiles._add [ { id: 1, name: 'one' }, { id: 2, name: 'two' } ]
      
      expected[ 0 ] = { id: 1, email: 'one@example.com', name: 'one' }
      expected[ 1 ] = { id: 2, email: 'two@example.com', name: 'two' }
      
    it 'should now have two users with names', ( done ) ->
      users_profiles._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should now have two users with names on downstream set', ( done ) ->
      users_profiles_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
  
  describe 'removing both users', ->
    it 'remove both users', ( done ) ->
      on_remove = ( values, options )  -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, email: 'one@example.com', name: 'one' }
          { id: 2, email: 'two@example.com', name: 'two' }
        ]
        
        on_remove = null
      
      users._remove [
        { id: 1, email: 'one@example.com' }
        { id: 2, email: 'two@example.com' }
      ]
      
      expected = []
      
    it 'should now have no user', ( done ) ->
      users_profiles._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should now have no user on downstream set', ( done ) ->
      users_profiles_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
  
  describe 'adding back both users', ->
    it 'add back both users', ( done ) ->
      on_add = ( values, options )  -> check done, ->
        expect( values ).to.be.eql [
          { id: 1, email: 'one@example.com', name: 'one' }
          { id: 2, email: 'two@example.com', name: 'two' }
        ]
        
        on_add = null
      
      users._add [
        { id: 1, email: 'one@example.com' }
        { id: 2, email: 'two@example.com' }
      ]
      
      expected = [
        { id: 1, email: 'one@example.com', name: 'one' }
        { id: 2, email: 'two@example.com', name: 'two' }
      ]
      
    it 'should now have two users with names', ( done ) ->
      users_profiles._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
    
    it 'should now have two users with names on downstream set', ( done ) ->
      users_profiles_set._fetch_all ( values ) -> check done, ->
        compare_expected_values expected, values
  
