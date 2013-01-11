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
      v = cell.innerHTML
      
      o[ columns[ j++ ].id] = if isNaN( parseInt v ) then v else parseInt v
    
    data.push o
  
  return { columns: columns, data: data }

# ----------------------------------------------------------------------------------------------
# xs table unit test suite
# ------------------------

# include modules
XS = if require? then ( require '../src/xs.js' ).XS else this.XS

if require?
  require '../src/code.js'
  require '../src/connection.js'
  require '../src/filter.js'
  require '../src/ordered_set.js'
  require '../src/aggregator.js'
  require '../src/table.js'

chai = require 'chai' if require?
chai?.should()

Set         = XS.Set
Table       = XS.Table
Ordered_Set = XS.Ordered_Set

columns   = new Set [ { id: "id", label: "ID" }, { id: "title", label: "Title" }, { id: "author", label: "Author" } ], { name: "Columns Set" }
organizer = new Set [ { id: "title" } ], { name: "Organizer: by title ascending" }

books = new Ordered_Set [
  { id: 1, title: "A Tale of Two Cities"             , author: "Charles Dickens" , sales:       200, year: 1859, language: "English" }
  { id: 2, title: "The Lord of the Rings"            , author: "J. R. R. Tolkien", sales:       150, year: 1955, language: "English" }
  { id: 3, title: "Charlie and the Chocolate Factory", author: "Roald Dahl"      , sales:        13            , language: "English" }
  { id: 4, title: "The Da Vinci Code"                , author: "Dan Brown"       , sales:        80, year: 2003, language: "English" }
], organizer, { name: "Books" }

books.table document.getElementById( "demo" ), columns, organizer, {caption: "List of the best-selling books (source: wikipedia)" }

describe 'Columns_Set():', ->
  object = from_HTML_to_object document.getElementsByTagName( "table" )[ 0 ]
  
  it 'columns should be equal to object.columns:', ->
    columns.get().should.be.eql object.columns
  
  