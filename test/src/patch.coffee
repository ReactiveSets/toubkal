###
    patch.coffee

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

utils               = require( './tests_utils.js' ) unless this.expect

expect              = this.expect              || utils.expect
check               = this.check               || utils.check
Expected_Operations = this.Expected_Operations || utils.Expected_Operations
rs                  = this.rs                  || utils.rs
RS                  = rs.RS
Store               = RS.Store
valid_uuid_v4       = RS.valid_uuid_v4

unless this.expect
  require '../../lib/common/patch.js'

# ----------------------------------------------------------------------------------------------
# patch test suite
# ----------------

describe 'patch():', ->
  newline = "\n"
  
  add_newlines = ( _ ) -> _.map( ( _ ) -> _ + newline )
  
  x = add_newlines [
    "1"
    "2"
    "3"
    "4"
    "5"
    "6"
    "the"
    "big"
    "cat"
    "runs"
    "7"
    "8"
    "9"
    "10"
    "11"
    "12"
    "13"
    "14"
    "15"
    "16"
    "17"
    "18"
    "the"
    "big"
    "cat"
    "runs"
  ]
  
  y = add_newlines [
    "1"
    "2"
    "3"
    "4"
    "5"
    "6"
    "the"
    "small"
    "cat"
    "is"
    "hungry"
    "7"
    "8"
    "9"
    "10"
    "11"
    "12"
    "13"
    "14"
    "15"
    "16"
    "17"
    "18"
    "the"
    "small"
    "cat"
    "is"
    "hungry"
  ]
  
  a       = null
  b       = null
  patch   = null
  c       = null
  none    = null
  d       = null
  patch_e = Expected_Operations()
  c_e     = Expected_Operations()
  none_e  = Expected_Operations()
  d_e     = Expected_Operations()
  
  it 'should create a patch', ->
    a     = rs.set( [ { id: 1, path: 'test', content: x.join( '' ) } ] )
    b     = rs.trace( 'b' )
    patch = b.create_patches( a, [ 'id' ] ).store()
    c     = patch.patch( a.set(), [ 'id' ] ).store()
    none  = b.create_patches( rs.set(), [ 'id' ] ).store()
    d     = none.patch( rs.set(), [ 'id' ] ).store()
    
    b._add( [ { id: 1, path: 'new_name', content: y.join( '' ) } ] )
    
    patch_e.add 0, [ {
      "id": 1
      "path": "new_name"
      "patch": "===================================================================\n--- a/test\n+++ b/new_name\n@@ -4,11 +4,12 @@\n 4\n 5\n 6\n the\n-big\n+small\n cat\n-runs\n+is\n+hungry\n 7\n 8\n 9\n 10\n@@ -20,7 +21,8 @@\n 16\n 17\n 18\n the\n-big\n+small\n cat\n-runs\n+is\n+hungry\n"
    } ]
    
    patch._output._fetch ( values, more, operation ) ->
      expect( values.length ).to.be 1
      _ = values[ 0 ]
      expect( _.patch_time ).to.be.a Date
      delete _.patch_time
      expect( _.patch_id ).to.match( valid_uuid_v4 )
      delete _.patch_id
      
      patch_e.receiver( 1 )( values, more, operation )
