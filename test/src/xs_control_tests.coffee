###
    xs_control_tests.coffee

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
# xs control unit test suite
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
  require '../../lib/control.js'

xs = XS.xs

organizer       = [ { id: "label" } ]
options         = { label: "Charts" }

checkbox_source = xs.order organizer, { name: "Checkbox Source" }
checkbox        = checkbox_source.checkbox( document.getElementById( "checkbox_control" ), {} ).set()

checkbox_group_source = xs.order organizer, { name: "Checkbox Group Source" }
checkbox_group  = checkbox_group_source.checkbox_group( document.getElementById( "checkbox_group_control" ) ).set()

radio_source = xs.order organizer, { name: "Radio Source" }
radio        = radio_source.radio( document.getElementById( "radio_control" ) ).set()

drop_down_source = xs.order organizer, { name: "Drop Down Source" }
drop_down        = drop_down_source.drop_down( document.getElementById( "drop_down_control" ) ).set()

describe 'Checkbox():', ->
  it 'checkbox should be empty', ->
    expect( checkbox._fetch_all() ).to.be.empty
  
  it 'after checkbox_source._add( object ), checkbox_source should be equal to [ { id: true, label: "Label True" } ]', ->
    checkbox_source._add [ { id: true, label: "Label True" } ]
    
    expect( checkbox_source._fetch_all() ).to.be.eql [ { id: true, label: "Label True" } ]
  
  it 'after checkbox_source._add( object ), checkbox should be equal to [ { id: true, label: "Label True" } ]', ->
    expect( checkbox._fetch_all() ).to.be.eql [ { id: true, label: "Label True" } ]
  
  it 'after checkbox_source._add( object ), checkbox should be equal to [ { id: true, label: "Label True" } ]', ->
    checkbox_source._add [ { id: false, label: "Label False" } ]
    
    expect( checkbox._fetch_all() ).to.be.eql [ { id: true, label: "Label True" } ]
  
  it 'after checkbox_source._remove( object ), checkbox should be equal to [ { id: false, label: "Label False" } ]', ->
    checkbox_source._remove [ { id: true, label: "Label True" } ]
    
    expect( checkbox._fetch_all() ).to.be.eql [ { id: false, label: "Label False" } ]
  
  it 'after checkbox_source._remove( object ), checkbox should be empty', ->
    checkbox_source._remove [ { id: false, label: "Label False" } ]
    
    expect( checkbox._fetch_all() ).to.be.empty
  
  it 'after checkbox_source._add( objects ), checkbox should be equal to [ { id: false, label: "Label False", selected: true } ]', ->
    checkbox_source._add [ { id: true, label: "Label True" }, { id: false, label: "Label False", selected: true } ]
    
    expect( checkbox._fetch_all() ).to.be.eql [ { id: false, label: "Label False", selected: true } ]
  
  it 'after checkbox_source._update( objects ) checkbox should be equal to [ { id: true, label: "Charts", selected: true } ]', ->
    checkbox_source._update [
      [ { id: true , label: "Label True"                  }, { id: true , label: "Charts", selected: true } ]
      [ { id: false, label: "Label False", selected: true }, { id: false, label: "Charts"                 } ]
    ]
    
    expect( checkbox._fetch_all() ).to.be.eql [ { id: true, label: "Charts", selected: true } ]

describe 'Checkbox_Group():', ->
  it 'checkbox_group should be empty', ->
    
    expect( checkbox_group._fetch_all() ).to.be.empty
  
  it 'after checkbox_group_source._add( objects ), checkbox_group should be equal to result', ->
    checkbox_group_source._add [
      { id: 1, label: "Photography"            , selected: true }
      { id: 2, label: "Fishing"                                 }
      { id: 3, label: "Playing Computer Games"                  }
      { id: 4, label: "Traveling"              , selected: true }
      { id: 5, label: "Cooking"                                 }
      { id: 6, label: "Stamp / Coin Collection", selected: true }
    ]
    
    expect( checkbox_group._fetch_all() ).to.be.eql [
      { id: 1, label: "Photography"            , selected: true }
      { id: 6, label: "Stamp / Coin Collection", selected: true }
      { id: 4, label: "Traveling"              , selected: true }
    ]
  
  it 'after checkbox_group_source._remove( objects ), checkbox_group should be equal to result', ->
    checkbox_group_source._remove [
      { id: 3, label: "Playing Computer Games"                 }
      { id: 4, label: "Traveling"             , selected: true }
    ]
    
    expect( checkbox_group._fetch_all() ).to.be.eql [
      { id: 1, label: "Photography"            , selected: true }
      { id: 6, label: "Stamp / Coin Collection", selected: true }
    ]
  
  it 'after checkbox_group_source._add( object ), checkbox_group should be equal to result', ->
    checkbox_group_source._add [ { id: 7, label: "Pottery", selected: true }, { id: 8, label: "Gardening" } ]
    
    expect( checkbox_group._fetch_all() ).to.be.eql [
      { id: 1, label: "Photography"            , selected: true }
      { id: 7, label: "Pottery"                , selected: true }
      { id: 6, label: "Stamp / Coin Collection", selected: true }
    ]
  
  it 'after checkbox_group_source._update( objects ), checkbox_group should be equal to result', ->
    checkbox_group_source._update [
      [ { id: 3, label: "Playing Computer Games"  }, { id: 3, label: "Playing Video Games"                   } ]
      [ { id: 7, label: "Pottery", selected: true }, { id: 7, label: "Pottery"             , selected: false } ]
      [ { id: 8, label: "Gardening"               }, { id: 8, label: "Gardening and Plants", selected: true  } ]
    ]
    
    expect( checkbox_group._fetch_all() ).to.be.eql [
      { id: 8, label: "Gardening and Plants"   , selected: true }
      { id: 1, label: "Photography"            , selected: true }
      { id: 6, label: "Stamp / Coin Collection", selected: true }
    ]

describe 'Radio():', ->
  it 'radio should be empty', ->
  
    expect( radio._fetch_all() ).to.be.empty
  
  it 'after radio_source._add( objects ), radio should be equal to [ { id: 1, label: "Islam", selected: true } ]', ->
    radio_source._add [
      { id: 1, label: "Islam"       , selected: true }
      { id: 2, label: "Christianity" }
      { id: 3, label: "Judaism"      }
      { id: 6, label: "Satanism"     }
      { id: 7, label: "Atheism"      }
      { id: 8, label: "Rastafari"    }
    ]
    
    expect( radio._fetch_all() ).to.be.eql [ { id: 1, label: "Islam", selected: true } ]
  
  it 'after radio_source._remove( objects ), radio should be empty', ->
    radio_source._remove [
      { id: 6, label: "Satanism" }
      { id: 1, label: "Islam", selected: true }
    ]
    
    expect( radio._fetch_all() ).to.be.empty
  
  it 'after radio_source._add( object ), radio should be equal to [ { id: 5, label: "Hinduism", selected: true } ]', ->
    radio_source._add [ { id: 5, label: "Hinduism", selected: true } ]
    
    expect( radio._fetch_all() ).to.be.eql [ { id: 5, label: "Hinduism", selected: true } ]
  
  it 'after radio_source._update( objects ), radio should be equal to [ { id: 4, label: "Rastafari", selected: true } ]', ->
    radio_source._update [
      [ { id: 8, label: "Rastafari" }, { id: 4, label: "Rastafari", selected: true } ]
      [ { id: 5, label: "Hinduism"  }, { id: 5, label: "Buddhism" } ]
      [ { id: 7, label: "Atheism"   }, { id: 7, label: "Islam"    } ]
    ]
    
    expect( radio._fetch_all() ).to.be.eql [ { id: 4, label: "Rastafari", selected: true } ]

describe 'Drop_Down():', ->
  it 'drop_down should be empty', ->
  
    expect( drop_down._fetch_all() ).to.be.empty
  
  it 'after drop_down_source._add( objects ), drop_down should be equal to [ { id: 3, label: "France" } ]', ->
    drop_down_source._add [
      { id: 1, label: "USA"        }
      { id: 2, label: "Morocco"    }
      { id: 3, label: "France"     }
      { id: 4, label: "Japan"      }
      { id: 5, label: "Spain"      }
      { id: 6, label: "Portugal"   }
      { id: 8, label: "Madagascar" }
    ]
    
    expect( drop_down._fetch_all() ).to.be.eql [ { id: 3, label: "France" } ]  
  
  it 'after drop_down_source._remove( objects ), drop_down should be equal to [ { id: 3, label: "France" } ]', ->
    drop_down_source._remove [
      { id: 2, label: "Morocco" }
      { id: 5, label: "Spain"   }
    ]
    
    expect( drop_down._fetch_all() ).to.be.eql [ { id: 3, label: "France" } ]
  
  it 'after drop_down_source._remove( object ), drop_down should be equal to [ { id: 4, label: "Japan" } ]: remove selected object', ->
    drop_down_source._remove [
      { id: 3, label: "France" }
    ]
    
    expect( drop_down._fetch_all() ).to.be.eql [ { id: 4, label: "Japan" } ]
  
  it 'after drop_down_source._add( object ), drop_down should be equal to [ { id: 4, label: "Japan" } ]', ->
    drop_down_source._add [ { id: 7, label: "China" } ]
  
    expect( drop_down._fetch_all() ).to.be.eql [ { id: 4, label: "Japan" } ]
  
  it 'after drop_down_source._update( objects ), drop_down should be equal to [ { id: 8, label: "Madagascar" } ]', ->
    drop_down_source._update [
      [ { id: 6, label: "Portugal"   }, { id: 5, label: "Germany" } ]
      [ { id: 8, label: "Madagascar" }, { id: 8, label: "Madagascar", selected: true } ]
      [ { id: 4, label: "Japan"      }, { id: 4, label: "Italy" } ]
    ]
    
    expect( drop_down._fetch_all() ).to.be.eql [ { id: 8, label: "Madagascar", selected: true } ]
