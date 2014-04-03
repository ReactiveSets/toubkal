###
    xs_transforms.coffee
    
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
# xs test utils
# -------------

utils  = require( './xs_tests_utils.js' ) if require?

expect = this.expect || utils.expect
clone  = this.clone  || utils.clone
check  = this.check  || utils.check
xs     = this.xs     || utils.xs

if require?
  require '../lib/filter.js'
  require '../lib/transforms.js'

# ----------------------------------------------------------------------------------------------
# Test File pipelets
# ------------------

describe 'transforms', ->
  describe 'content_to_set():', ->
    source = xs
      .set [
        { id: 1, content: { adjective: 'strong' } }
        { id: 2, content: { adjective: 'weak'   } }
      ]
    
    adjectives = source
      .content_to_set( { key: [ 'adjective' ] } )
      .trace( 'adjectives' )
      .set()
    
    it 'should provide adjectives', ( done ) ->
      adjectives._fetch_all ( adjectives ) -> check done, () ->
        expect( adjectives ).to.be.eql [
          { adjective: 'strong' }
          { adjective: 'weak'   }
        ]
    