###
    xs_ui.tests.coffee

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

#mocha.setup 'bdd' if typeof mocha isnt 'undefined'

# include modules
# ---------------
expect = if require? then ( require 'expect.js' ) else this.expect
XS = if require? then ( require '../../lib/xs.js' ).XS else this.XS

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
    
    it 'expect numbers to be left aligned ( ID )', ->
      rows = table_body.childNodes
      
      for row in rows
        cell_align = row.childNodes[ 1 ].style.textAlign
        
        expect( cell_align ).to.be 'right'
    
    it 'after columns._add( objects ), expect table to have 5 columns', ->
      columns._add [
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
    
    it 'expect year column to be centred', ->
      rows = table_body.childNodes
      
      for row in rows
        cell_align = row.childNodes[ 4 ].style.textAlign
        
        expect( cell_align ).to.be 'center'
    
    it 'after columns._remove( object ), expect table to have 4 columns', ->
      columns._remove [ { id: "id", label: "ID" } ]
      
      expect( table_head.childNodes[ 0 ].childNodes.length ).to.be 4
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorLanguageTitleYear' +
        'Charles DickensEnglishA Tale of Two Cities1859' +
        'Roald DahlEnglishCharlie and the Chocolate Factory' +
        'Dan BrownEnglishThe Da Vinci Code2003' +
        'J. R. R. TolkienEnglishThe Lord of the Rings1955'
      
      expect( table_node.textContent ).to.be content
    
    it 'after columns._update( object ), expect table to have 4 columns', ->
      columns._update [ [ { id: "language", label: "Language" }, { id: "sales", label: "Sales by millions of copies" } ] ]
      
      expect( table_head.childNodes[ 0 ].childNodes.length ).to.be 4
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorSales by millions of copiesTitleYear' +
        'Charles Dickens200A Tale of Two Cities1859' +
        'Roald Dahl13Charlie and the Chocolate Factory' +
        'Dan Brown80The Da Vinci Code2003' +
        'J. R. R. Tolkien150The Lord of the Rings1955'
      
      expect( table_node.textContent ).to.be content
    
    it 'after books._add( objects ), expect table to have 15 rows', ->
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
      
      expect( table_body.childNodes.length ).to.be 15
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorSales by millions of copiesTitleYear' +
        'Charles Dickens200A Tale of Two Cities1859' +
        'Agatha Christie100And Then There Were None' +
        'Dan Brown39Angels and Demons2000Stephenie MeyerBreaking Dawn2008' +
        'Roald Dahl13Charlie and the Chocolate Factory' +
        'J.K. RowlingHarry Potter and the Prisoner of Azkaban1999' +
        'Vladimir Nabokov50Lolita1955' +
        'Ellen G. White60Steps to Christ' +
        'Dan Brown80The Da Vinci Code2003' +
        'Pierre Dukan10The Dukan Diet2000' +
        'Stieg Larsson30The Girl with the Dragon Tattoo2005' +
        'J. R. R. Tolkien100The Hobbit1937' +
        'Suzanne Collins23The Hunger Games2008' +
        'J. R. R. Tolkien150The Lord of the Rings1955' +
        'William Holmes McGuffey125The McGuffey Readers1853'
      
      expect( table_node.textContent ).to.be content
    
    it 'after books._remove( objects ), expect table to have 12 rows', ->
      books._remove [
        { id:  1, title: "A Tale of Two Cities", author: "Charles Dickens"        , year: 1859 }
        { id: 13, title: "Lolita"              , author: "Vladimir Nabokov"       , year: 1955 }
        { id:  7, title: "The McGuffey Readers", author: "William Holmes McGuffey", year: 1853 }
      ]
      
      expect( table_body.childNodes.length ).to.be 12
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorSales by millions of copiesTitleYear' +
        'Agatha Christie100And Then There Were None' +
        'Dan Brown39Angels and Demons2000Stephenie MeyerBreaking Dawn2008' +
        'Roald Dahl13Charlie and the Chocolate Factory' +
        'J.K. RowlingHarry Potter and the Prisoner of Azkaban1999' +
        'Ellen G. White60Steps to Christ' +
        'Dan Brown80The Da Vinci Code2003' +
        'Pierre Dukan10The Dukan Diet2000' +
        'Stieg Larsson30The Girl with the Dragon Tattoo2005' +
        'J. R. R. Tolkien100The Hobbit1937' +
        'Suzanne Collins23The Hunger Games2008' +
        'J. R. R. Tolkien150The Lord of the Rings1955'
      
      expect( table_node.textContent ).to.be content
    
    it 'after books._update( objects ), expect table to have 12 rows', ->
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
      
      expect( table_body.childNodes.length ).to.be 12
    
    it 'expect table content to be equal to content', ->
      content = 'List of the best-selling books (source: wikipedia)' +
        'AuthorSales by millions of copiesTitleYear' +
        'Agatha Christie100And Then There Were None' +
        'Dan Brown39Angels and Demons2000' +
        'Stephenie MeyerBreaking Dawn2008' +
        'Roald Dahl13Charlie and the Chocolate Factory' +
        'Joanne RowlingHarry Potter and the Prisoner of Azkaban1999'+
        'Ellen G. White60Steps to Christ' +
        'Dan Brown80The Da Vinci Code2003' +
        'Pierre Dukan10The Dukan Diet2000' +
        'John Ronald Reuel TolkienThe Fellowship of the Ring: LOTR 11955' +
        'Stieg Larsson30The Girl with the Dragon Tattoo2005' +
        'J. R. R. Tolkien100The Hobbit1937' +
        'Suzanne Collins23The Hunger Games2008'
      
      expect( table_node.textContent ).to.be content
    
  describe 'Control():', ->
    checkbox_node       = document.getElementById 'chart'
    radio_node          = document.getElementById 'religions'
    checkbox_group_node = document.getElementById 'hobbies'
    drop_down_node      = document.getElementById 'countries'
    
    organizer = [ { id: "label" } ]
    
    describe 'Checkbox():', ->
      chart          = xs.order organizer
      checkbox_chart = chart.checkbox( checkbox_node ).set()
      input          = checkbox_node.childNodes[ 0 ]
      label          = checkbox_node.childNodes[ 1 ]
      
      it 'expect checkbox container to have a label element', ->
        expect( label.nodeName ).to.be 'LABEL'
      
      it 'expect checkbox container to have a checkbox element', ->
        expect( input.nodeName ).to.be 'INPUT'
        expect( input.type     ).to.be 'checkbox'
      
      it 'expect checkbox label to be empty', ->
        expect( label.textContent ).to.be.empty()
      
      it 'expect checkbox be disabled', ->
        expect( input.disabled ).to.be true
      
      it 'after chart._add( object ), expect checkbox label to be equal to "Chart"', ->
        chart._add [ { id: true, label: "Chart" } ]
        
        expect( label.textContent ).to.be 'Chart'
      
      it 'expect checkbox be checked', ->
        expect( input.checked ).to.be true
      
      it 'expect checkbox be disabled', ->
        expect( input.disabled ).to.be true
      
      it 'after chart._add( object ), expect checkbox label to be equal to "Chart"', ->
        chart._add [ { id: false, label: "No-Chart" } ]
        
        expect( label.textContent ).to.be 'Chart'
      
      it 'expect checkbox be checked', ->
        expect( input.checked ).to.be true
      
      it 'expect checkbox be active', ->
        expect( input.disabled ).to.be false
      
      it 'after chart._remove( object ), expect checkbox label to be equal to "No-Chart"', ->
        chart._remove [ { id: true, label: "Chart" } ]
        
        expect( label.textContent ).to.be 'No-Chart'
      
      it 'expect checkbox be unchecked', ->
        expect( input.checked ).to.be false
      
      it 'expect checkbox be disabled', ->
        expect( input.disabled ).to.be true
      
      it 'after chart._remove( object ), expect checkbox label to be equal to be empty', ->
        chart._remove [ { id: false, label: "No-Chart" } ]
        
        expect( label.textContent ).to.be.empty()
      
      it 'expect checkbox be unchecked', ->
        expect( input.checked ).to.be false
      
      it 'expect checkbox be disabled', ->
        expect( input.disabled ).to.be true
      
      it 'after chart._add( objects ), expect checkbox label to be equal to "No-Chart"', ->
        chart._add [ { id: true, label: "Chart" }, { id: false, label: "No-Chart", selected: true } ]
        
        expect( label.textContent ).to.be 'No-Chart'
      
      it 'expect checkbox be unchecked', ->
        expect( input.checked ).to.be false
      
      it 'expect checkbox be active', ->
        expect( input.disabled ).to.be false
      
      it 'after chart._update( objects ), expect checkbox label to be equal to "Chart"', ->
        chart._update [
          [ { id: true , label: "Chart"                    }, { id: true , label: "Chart"   , selected: true } ]
          [ { id: false, label: "No-Chart", selected: true }, { id: false, label: "No-Chart"                 } ]
        ]
        
        expect( label.textContent ).to.be 'Chart'
      
      it 'expect checkbox be checked', ->
        expect( input.checked ).to.be true
      
      it 'expect checkbox be active', ->
        expect( input.disabled ).to.be false
      
    describe 'Checkbox_Group():', ->
      hobbies = xs.set(
        [
          { id: 1, label: "Photography"            , selected: true }
          { id: 2, label: "Fishing"                                 }
          { id: 3, label: "Playing Computer Games"                  }
          { id: 4, label: "Traveling"              , selected: true }
          { id: 5, label: "Cooking"                                 }
          { id: 6, label: "Stamp / Coin Collection", selected: true }
        ]
      ).order organizer
      
      checkbox_group_hobbies = hobbies.checkbox_group( checkbox_group_node ).set()
      checkbox_list          = checkbox_group_node.getElementsByTagName( 'input' )
      
      it 'expect checkbox group container to have 6 checkboxes', ->
        expect( checkbox_list.length ).to.be 6
      
      it 'expect checkbox group container to be equal to content', ->
        expect( checkbox_group_node.textContent ).to.be 'CookingFishingPhotographyPlaying Computer GamesStamp / Coin CollectionTraveling'
      
      it 'expect checked checkboxes to be: "Photography", "Stamp / Coin Collection" and "Traveling"', ->
        expect( checkbox_list[ 2 ].checked ).to.be true
        expect( checkbox_list[ 4 ].checked ).to.be true
        expect( checkbox_list[ 5 ].checked ).to.be true
      
      it 'after hobbies._remove( objects ), expect checkbox group container to have 4 checkboxes', ->
        hobbies._remove [
          { id: 3, label: "Playing Computer Games"                 }
          { id: 4, label: "Traveling"             , selected: true }
        ]
        
        expect( checkbox_list.length ).to.be 4
      
      it 'expect checkbox group container to be equal to content', ->
        expect( checkbox_group_node.textContent ).to.be 'CookingFishingPhotographyStamp / Coin Collection'
      
      it 'expect checked checkboxes to be: "Photography" and "Stamp / Coin Collection"', ->
        expect( checkbox_list[ 2 ].checked ).to.be true
        expect( checkbox_list[ 3 ].checked ).to.be true
      
      it 'after hobbies._add( objects ), expect checkbox group container to have 6 checkboxes', ->
        hobbies._add [
          { id: 7, label: "Pottery"  , selected: true }
          { id: 8, label: "Gardening"                 }
        ]
        
        expect( checkbox_list.length ).to.be 6
      
      it 'expect checkbox group container to be equal to content', ->
        expect( checkbox_group_node.textContent ).to.be 'CookingFishingGardeningPhotographyPotteryStamp / Coin Collection'
      
      it 'expect checked checkboxes to be: "Photography", "Pottery" and "Stamp / Coin Collection"', ->
        expect( checkbox_list[ 3 ].checked ).to.be true
        expect( checkbox_list[ 4 ].checked ).to.be true
        expect( checkbox_list[ 5 ].checked ).to.be true
      
      it 'after hobbies._update( objects ), expect checkbox group container to have 6 checkboxes', ->
        hobbies._update [
          [ { id: 3, label: "Playing Computer Games"  }, { id: 3, label: "Playing Video Games"                   } ]
          [ { id: 7, label: "Pottery", selected: true }, { id: 7, label: "Pottery"             , selected: false } ]
          [ { id: 8, label: "Gardening"               }, { id: 8, label: "Gardening and Plants", selected: true  } ]
        ]
        
        expect( checkbox_list.length ).to.be 6
      
      it 'expect checkbox group container to be equal to content', ->
        expect( checkbox_group_node.textContent ).to.be 'CookingFishingGardening and PlantsPhotographyPotteryStamp / Coin Collection'
      
      it 'expect checked checkboxes to be: ', ->
        expect( checkbox_list[ 2 ].checked ).to.be true
        expect( checkbox_list[ 3 ].checked ).to.be true
        expect( checkbox_list[ 5 ].checked ).to.be true
      
    describe 'Radio():', ->
      religions = xs.set(
        [
          { id: 1, label: "Islam"       , selected: true }
          { id: 2, label: "Christianity"                 }
          { id: 3, label: "Judaism"                      }
          { id: 6, label: "Satanism"                     }
          { id: 7, label: "Atheism"                      }
          { id: 8, label: "Rastafari"                    }
        ]
      ).order organizer
      
      radio_religions = religions.radio( radio_node ).set()
      radio_list      = radio_node.getElementsByTagName( 'input' )
      
      it 'expect radio container to have 6 radio inputs', ->
        expect( radio_list.length ).to.be 6
      
      it 'expect radio container to be equal to content', ->
        expect( radio_node.textContent ).to.be 'AtheismChristianityIslamJudaismRastafariSatanism'
      
      it 'expect selected radio to be: "Islam"', ->
        expect( radio_list[ 2 ].checked ).to.be true
      
      it 'after religions._remove( objects ), expect radio container to have 4 radio', ->
        religions._remove [
          { id: 6, label: "Satanism" }
          { id: 1, label: "Islam", selected: true }
        ]
        
        expect( radio_list.length ).to.be 4
      
      it 'expect radio container to be equal to content', ->
        expect( radio_node.textContent ).to.be 'AtheismChristianityJudaismRastafari'
      
      it 'expect all radio button tu be unchecked', ->
        for r in radio_list
          expect( r.checked ).to.be false
      
      it 'after religions._add( objects ), expect radio container to have 5 radio', ->
        religions._add [ { id: 5, label: "Hinduism", selected: true } ]
        
        expect( radio_list.length ).to.be 5
      
      it 'expect radio container to be equal to content', ->
        expect( radio_node.textContent ).to.be 'AtheismChristianityHinduismJudaismRastafari'
      
      it 'expect checked radio to be: "Hinduism"', ->
        expect( radio_list[ 2 ].checked ).to.be true
      
      it 'after religions._update( objects ), expect radio container to have 6 radio', ->
        religions._update [
          [ { id: 8, label: "Rastafari" }, { id: 4, label: "Rastafari", selected: true } ]
          [ { id: 5, label: "Hinduism"  }, { id: 5, label: "Buddhism" } ]
          [ { id: 7, label: "Atheism"   }, { id: 7, label: "Islam"    } ]
        ]
        
        expect( radio_list.length ).to.be 5
      
      it 'expect radio container to be equal to content', ->
        expect( radio_node.textContent ).to.be 'BuddhismChristianityIslamJudaismRastafari'
      
      it 'expect checked radio to be: "Rastafari"', ->
        expect( radio_list[ 4 ].checked ).to.be true
    
    describe 'Drop_Down():', ->
      countries = xs.set(
        [
          { id: 1, label: "USA"        }
          { id: 2, label: "Morocco"    }
          { id: 3, label: "France"     }
          { id: 4, label: "Japan"      }
          { id: 5, label: "Spain"      }
          { id: 6, label: "Portugal"   }
          { id: 8, label: "Madagascar" }
        ]
      ).order organizer
      
      drop_down_countries = countries.drop_down( drop_down_node ).set()
      select              = drop_down_node.getElementsByTagName( 'select' )[ 0 ]
      
      it 'expect drop down control to have 7 options', ->
        expect( select.length ).to.be 7
      
      it 'expect drop down control to be equal to content', ->
        expect( drop_down_node.textContent ).to.be 'FranceJapanMadagascarMoroccoPortugalSpainUSA'
      
      it 'expect selected value to be: "France"', ->
        expect( select.selectedIndex ).to.be 0
      
      it 'after countries._remove( object ), expect drop down control to have 6 options', ->
        countries._remove [ { id: 3, label: "France" } ]
        
        expect( select.length ).to.be 6
      
      it 'expect drop down control to be equal to content', ->
        expect( drop_down_node.textContent ).to.be 'JapanMadagascarMoroccoPortugalSpainUSA'
      
      it 'expect selected value to be: "Japan"', ->
        expect( select.selectedIndex ).to.be 0
      
      it 'after countries._add( object ), expect drop down control to have 7 options', ->
        countries._add [ { id: 7, label: "China" } ]
        
        expect( select.length ).to.be 7
      
      it 'expect drop down control to be equal to content', ->
        expect( drop_down_node.textContent ).to.be 'ChinaJapanMadagascarMoroccoPortugalSpainUSA'
      
      it 'expect expect selected value to be: "Japan"', ->
        expect( select.selectedIndex ).to.be 1
      
      it 'after countries._update( objects ), expect drop down control to have 7 options', ->
        countries._update [
          [ { id: 6, label: "Portugal"   }, { id: 5, label: "Germany" } ]
          [ { id: 8, label: "Madagascar" }, { id: 8, label: "Madagascar", selected: true } ]
          [ { id: 4, label: "Japan"      }, { id: 4, label: "Italy" } ]
        ]
        
        expect( select.length ).to.be 7
      
      it 'expect drop down control to be equal to content', ->
        expect( drop_down_node.textContent ).to.be 'ChinaGermanyItalyMadagascarMoroccoSpainUSA'
      
      it 'expect selected value to be: "Madagascar"', ->
        expect( select.selectedIndex ).to.be 3
